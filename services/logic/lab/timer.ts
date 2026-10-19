// Device timer: how full the current device probably is, and when to check it.
// Pure.
//
// Rules (same as Lab):
// - Rate = mL per hour between two consecutive events (fluid of the later event / hours).
//   Pairs with 0 hours or 0 mL are skipped. The median of the last 5 rates is used.
// - The device counts as full at 80% of capacity.
// - Hours to fill = 0.8 x capacity / rate, clamped to 0.5..maxWearHours of the device in use's type (else the last event's).
// - With no rate yet (one event, or no usable pair), labSession uses the median rate of the
//   same period day in earlier periods, else first check after 4.5 hours.
// - Capacity and max wear time come from the device in use when labSession is given one, else
//   from the LAST event (cup/disc: stored capacity, default 30; pad/tampon: product table in pbac.ts).

import type { PeriodRecord } from '../../../types';
import { diffInDays } from '../../../utils/dateUtils';
import { eventDate, periodOfDate } from './periods';
import { DEFAULT_ABSORBENCY, productCapacityMl } from './pbac';
import type { DeviceType, LabDevice, LabEvent } from './types';
import { DEFAULT_CAPACITY_ML, eventCapacityMl, eventFluidMl } from './volume';

const FULL_AT_FRACTION = 0.8;
const MIN_FILL_HOURS = 0.5;
const FIRST_CHECK_HOURS = 4.5;
const RATE_SAMPLE_SIZE = 5;
const MS_PER_HOUR = 3_600_000;

/**
 * Longest a device should stay in. Tampon 8 h: FDA, "Do not use a single tampon for more than
 * eight hours", https://www.fda.gov/medical-devices/menstrual-product-options-facts-and-safe-use/tampons
 * Cup, disc, pad 12 h: the app's own limit, not from a published source.
 */
export const maxWearHours = (deviceType: DeviceType): number => (deviceType === 'tampon' ? 8 : 12);

export interface DeviceTimer {
    /** 0 to 100 */
    percentage: number;
    hoursSinceLast: number;
    hoursToFill: number;
    fullAt: Date;
}

/**
 * 'YYYY-MM-DDTHH:mm' as LOCAL time. `new Date('2026-03-01T10:00')` is also local, but
 * the Date.parse rules for strings vary, so build it from numbers. Returns null for
 * anything that is not a real date and time (e.g. 2026-02-30T10:00 or hour 24).
 */
export const parseLocalDateTime = (at: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(at);
    if (!m) return null;
    const [y, mo, d, h, mi] = m.slice(1).map(Number);
    const date = new Date(y, mo - 1, d, h, mi);
    const ok = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
        && date.getHours() === h && date.getMinutes() === mi;
    return ok ? date : null;
};

const median = (values: number[]): number => {
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

interface Timed { e: LabEvent; t: Date }

const toTimed = (events: LabEvent[]): Timed[] =>
    events
        .map(e => ({ e, t: parseLocalDateTime(e.at) }))
        .filter((x): x is Timed => x.t !== null)
        .sort((a, b) => a.t.getTime() - b.t.getTime());

/**
 * mL per hour of each usable consecutive pair (0 hours or 0 mL are skipped). With `sessionOnly`,
 * a pair also needs a non-final earlier entry and a gap within that entry's max wear time.
 */
const pairRates = (timed: Timed[], sessionOnly = false): { rate: number; later: LabEvent }[] => {
    const out: { rate: number; later: LabEvent }[] = [];
    for (let i = 1; i < timed.length; i++) {
        const hours = (timed[i].t.getTime() - timed[i - 1].t.getTime()) / MS_PER_HOUR;
        if (sessionOnly && (timed[i - 1].e.final || hours > maxWearHours(timed[i - 1].e.deviceType))) continue;
        const fluid = eventFluidMl(timed[i].e);
        if (hours > 0 && fluid > 0) out.push({ rate: fluid / hours, later: timed[i].e });
    }
    return out;
};

/** The device in use now (a LabDevice fits). Its type and size time the card, not the newest entry's. */
export type DeviceInUse = Pick<LabDevice, 'type' | 'capacityMl' | 'absorbency'>;

const capacityOf = (d: DeviceInUse): number =>
    d.type === 'pad' || d.type === 'tampon'
        ? productCapacityMl(d.type, d.absorbency ?? DEFAULT_ABSORBENCY)
        : d.capacityMl || DEFAULT_CAPACITY_ML;

const buildTimer = (last: Timed, now: Date, rate: number | undefined, inUse?: DeviceInUse): DeviceTimer => {
    const hoursSinceLast = Math.max(0, (now.getTime() - last.t.getTime()) / MS_PER_HOUR);
    const type = inUse?.type ?? last.e.deviceType;
    const capacity = inUse ? capacityOf(inUse) : eventCapacityMl(last.e);
    const hoursToFill = rate
        ? Math.min(maxWearHours(type), Math.max(MIN_FILL_HOURS, (FULL_AT_FRACTION * capacity) / rate))
        : FIRST_CHECK_HOURS;
    return {
        percentage: Math.min(100, Math.round((hoursSinceLast / hoursToFill) * 100)),
        hoursSinceLast,
        hoursToFill,
        fullAt: new Date(last.t.getTime() + hoursToFill * MS_PER_HOUR),
    };
};

export type LabSession =
    | { state: 'none' }
    | { state: 'stopped'; last: LabEvent; lastAt: Date }
    | ({ state: 'active'; last: LabEvent; lastAt: Date; overdue: boolean } & DeviceTimer);

/** Median mL/h of pairs (that would form a session) on the same period day in EARLIER periods, or undefined. */
const sameDayRate = (timed: Timed[], newest: Timed, periods: PeriodRecord[]): number | undefined => {
    const current = periodOfDate(periods, eventDate(newest.e));
    if (!current) return undefined;
    const dayIdx = diffInDays(eventDate(newest.e), current.startDate);
    const rates: number[] = [];
    for (const p of periods) {
        if (p.startDate >= current.startDate) continue;
        const inP = timed.filter(x => periodOfDate(periods, eventDate(x.e)) === p);
        for (const r of pairRates(inP, true)) {
            if (diffInDays(eventDate(r.later), p.startDate) === dayIdx) rates.push(r.rate);
        }
    }
    return rates.length ? median(rates) : undefined;
};

/**
 * Timer state of the current device, not tied to the calendar or to a period.
 * Entries after `now` are ignored. The session is the run of entries ending at the newest
 * one, where each gap is at most maxWearHours of the earlier entry's type, and it starts
 * after the last `final` entry. `periods` (optional) feeds the first-check fallback.
 * `inUse` (optional) is the device in use now: its capacity and max wear time replace the
 * newest entry's for hours to fill. The rate still comes from the entries.
 * The timer never gives up on its own: past the max wear time it stays 'active' and overdue
 * until the user logs an entry or ticks "not putting a new one in" (a final entry), or says
 * "I'm not using one" (`stoppedAt`: entries up to that moment no longer run the timer).
 */
export const labSession = (
    events: LabEvent[], now: Date, periods: PeriodRecord[] = [], inUse?: DeviceInUse, stoppedAt?: string,
): LabSession => {
    const all = toTimed(events).filter(x => x.t.getTime() <= now.getTime());
    if (all.length === 0) return { state: 'none' };
    const newest = all[all.length - 1];
    const base = { last: newest.e, lastAt: newest.t };
    if (newest.e.final || (stoppedAt && newest.e.at < stoppedAt)) return { state: 'stopped', ...base };
    let start = all.length - 1;
    while (start > 0) {
        const prev = all[start - 1];
        const gap = (all[start].t.getTime() - prev.t.getTime()) / MS_PER_HOUR;
        if (prev.e.final || gap > maxWearHours(prev.e.deviceType)) break;
        start--;
    }
    const rates = pairRates(all.slice(start)).slice(-RATE_SAMPLE_SIZE).map(r => r.rate);
    const rate = rates.length ? median(rates) : sameDayRate(all, newest, periods);
    const timer = buildTimer(newest, now, rate, inUse);
    return { state: 'active', ...base, ...timer, overdue: now.getTime() >= timer.fullAt.getTime() };
};

// Link Lab events to Cycle periods at READ time. No period id is ever stored on an
// event, because Cycle changes period ids on split and edit (project_details/business_logic.md#lab-module).
// A period "contains" an event when the event's local date is inside the period span
// (startDate through startDate + days - 1), exactly like Cycle's isDateInPeriod.
// The span, not the bleeding days (activeDays), is used on purpose.
// Grace: a date up to 1 day before a period's start or 1 day after its last span day also
// counts toward it. Exact containment wins. In the grace of two periods, the EARLIER one wins.

import type { PeriodRecord } from '../../../types';
import { addDays } from '../../../utils/dateUtils';
import { findActivePeriod } from '../cycle';
import type { LabEvent } from './types';

/** Local day of an event: the first 10 characters of `at`. */
export const eventDate = (event: LabEvent): string => event.at.slice(0, 10);

const byAt = (a: LabEvent, b: LabEvent): number => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);

/** The period that holds `date`: exact span first, else the earliest period within 1 day. */
export const periodOfDate = (periods: PeriodRecord[], date: string): PeriodRecord | undefined =>
    findActivePeriod(periods, date)
    ?? [...periods]
        .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
        .find(p => date >= addDays(p.startDate, -1) && date <= addDays(p.startDate, p.days));

/**
 * Events held by the period (with grace), sorted oldest first. Pass `periods` so a grace-day
 * event that another period holds is not counted twice.
 */
export const eventsInPeriod = (events: LabEvent[], period: PeriodRecord, periods: PeriodRecord[] = [period]): LabEvent[] => {
    const all = periods.includes(period) ? periods : [...periods, period];
    return events.filter(e => periodOfDate(all, eventDate(e)) === period).sort(byAt);
};

/** The period that holds today (with grace), if any. */
export const currentPeriodWithGrace = (periods: PeriodRecord[], todayStr: string): PeriodRecord | undefined =>
    periodOfDate(periods, todayStr);

/** Latest period that started before today's period (or before tomorrow when none) and has entries. */
export const previousPeriodWithEntries = (
    events: LabEvent[],
    periods: PeriodRecord[],
    todayStr: string,
): PeriodRecord | undefined => {
    const current = periodOfDate(periods, todayStr);
    const limit = current ? current.startDate : addDays(todayStr, 1);
    return groupEventsByPeriod(events, periods).groups
        .map(g => g.period)
        .filter(p => p !== current && p.startDate < limit)
        .reduce<PeriodRecord | undefined>((best, p) => (!best || p.startDate > best.startDate ? p : best), undefined);
};

export interface PeriodEvents {
    period: PeriodRecord;
    events: LabEvent[];
}

/**
 * Each event goes to the period that holds its date (see periodOfDate). Only periods that
 * have events are returned, in the order of `periods`. Events in no period go to
 * `outside` (kept, shown as "not in a period"). Both lists are sorted by `at`.
 */
export const groupEventsByPeriod = (
    events: LabEvent[],
    periods: PeriodRecord[],
): { groups: PeriodEvents[]; outside: LabEvent[] } => {
    const byPeriod = new Map<PeriodRecord, LabEvent[]>();
    const outside: LabEvent[] = [];
    for (const e of events) {
        const p = periodOfDate(periods, eventDate(e));
        if (!p) {
            outside.push(e);
        } else {
            const list = byPeriod.get(p);
            if (list) list.push(e);
            else byPeriod.set(p, [e]);
        }
    }
    const groups = periods
        .filter(p => byPeriod.has(p))
        .map(p => ({ period: p, events: byPeriod.get(p)!.sort(byAt) }));
    return { groups, outside: outside.sort(byAt) };
};

import type { AppSettings, PeriodRecord } from '../../types';
import { addDays, diffInDays } from '../../utils/dateUtils';
import { computeAdaptiveLengths, getEligibleCycles, getPastCycles, isCycleOutlier, markPregnancyCycles, resolveCycleRules } from './cycle';
import type { PregnancySpan } from './cycle';
import type { CycleDayPhase } from './status';

/** The fertile window is the ovulation day and the five days before it. */
const FERTILE_DAYS_BEFORE_OVULATION = 5;
const PEAK_FERTILE_DAYS_BEFORE_OVULATION = 2;

export type CycleDayKind = 'past' | 'running' | 'predicted' | 'before_first' | 'none';

/** What is true about one date. Facts only: no display setting is applied here. */
export interface CycleDayInfo {
    date: string;
    kind: CycleDayKind;
    cycleStart: string | null;
    cycleDay: number | null;
    /** Actual length for a past cycle, the effective length otherwise. */
    cycleLength: number | null;
    periodLength: number | null;
    phase: CycleDayPhase | null;
    isFertile: boolean;
    isPeakFertile: boolean;
    isOvulation: boolean;
    isPms: boolean;
    isForecastPeriod: boolean;
    ovulationDate: string | null;
    /** Start of the next cycle: the real one for a past cycle, the expected one otherwise, the first logged start before it. */
    nextStart: string | null;
    /** Days the period is late. Only set for `today`, 0 for every other date. */
    lateDays: number;
    isStale: boolean;
    /** The date is inside a pregnancy that no period has followed: nothing is forecast. */
    awaitingPeriod: boolean;
}

export type CycleModelSettings = Pick<
    AppSettings,
    'cycleLength' | 'periodLength' | 'lutealPhaseLength' | 'pmsLength' | 'adaptivePrediction'
    | 'isOnBirthControl' | 'predictionsPaused' | 'historyArchivedDate'
>;

/**
 * One model of "which phase is this date in", built once per data change.
 * Past dates come from the real cycles. The latest cycle runs until the expected next
 * start (and through today when that is late). Later dates follow the schedule
 * latest start + k x cycle length. A stale or paused record forecasts nothing.
 * `awaitingPregnancyStart` is the start of a pregnancy no period has followed. From that
 * date on nothing is forecast, until a period starts (then the caller stops passing it).
 * `pregnancySpans` lets the adaptive average skip the cycle a pregnancy started inside.
 * Periods before `historyArchivedDate` are dropped: no past-cycle flags for those days.
 */
export const buildCycleModel = (
    periods: PeriodRecord[],
    settings: CycleModelSettings,
    today: string,
    awaitingPregnancyStart?: string,
    pregnancySpans: PregnancySpan[] = []
) => {
    if (settings.historyArchivedDate) {
        const archived = settings.historyArchivedDate;
        periods = periods.filter(p => p.startDate >= archived);
    }
    let cycleLength = settings.cycleLength;
    let periodLength = settings.periodLength;
    if (settings.adaptivePrediction && !settings.isOnBirthControl) {
        const adaptive = computeAdaptiveLengths(getEligibleCycles(markPregnancyCycles(getPastCycles(periods), pregnancySpans)));
        if (adaptive) ({ cycleLength, periodLength } = adaptive);
    }
    const rules = resolveCycleRules({
        cycleLength,
        periodLength,
        lutealPhaseLength: settings.lutealPhaseLength,
        pmsLength: settings.pmsLength,
    });

    // getPastCycles fits the user's luteal to each cycle's real length and period, and leaves
    // the ovulation out of cycles that may not have one.
    const closed = getPastCycles(periods, undefined, Math.max(1, settings.lutealPhaseLength)).map(c => ({
        start: c.startDate,
        next: addDays(c.startDate, c.length!),
        length: c.length!,
        span: c.spanDays!,
        ov: c.ovulationDate ?? null,
    }));
    const latest = periods.reduce<PeriodRecord | null>((a, p) => (!a || p.startDate > a.startDate ? p : a), null);
    const starts = latest ? [...closed.map(c => c.start), latest.startDate] : [];
    const isStale = !!latest && isCycleOutlier(diffInDays(today, latest.startDate));
    const forecasts = !!latest && !isStale && !settings.predictionsPaused;

    const lastStart = latest?.startDate ?? '';
    const expected = forecasts ? addDays(lastStart, rules.cycleLength) : null;
    const runEnd = expected ? (expected > today ? addDays(expected, -1) : today) : '';

    const blank = (date: string, kind: CycleDayKind): CycleDayInfo => ({
        date, kind, cycleStart: null, cycleDay: null, cycleLength: null, periodLength: null, phase: null,
        isFertile: false, isPeakFertile: false, isOvulation: false, isPms: false, isForecastPeriod: false,
        ovulationDate: null, nextStart: null, lateDays: 0, isStale, awaitingPeriod: false,
    });

    const info = (
        date: string, kind: CycleDayKind, start: string, length: number, period: number,
        next: string, ov: string | null, withPms: boolean, forecast: boolean, lateDays = 0,
    ): CycleDayInfo => {
        const cycleDay = diffInDays(date, start) + 1;
        const toOv = ov ? diffInDays(date, ov) : null;
        const isOvulation = toOv === 0;
        const isPms = withPms && rules.pms > 0 && date < next && date >= addDays(next, -rules.pms);
        const phase: CycleDayPhase | null =
            cycleDay <= period ? 'menstrual'
            : isOvulation ? 'ovulation'
            : isPms ? 'pms'
            : toOv === null ? null
            : toOv < 0 ? 'follicular' : 'luteal';
        return {
            date, kind, cycleStart: start, cycleDay, cycleLength: length, periodLength: period, phase,
            isFertile: toOv !== null && toOv >= -FERTILE_DAYS_BEFORE_OVULATION && toOv <= 0,
            isPeakFertile: toOv !== null && toOv >= -PEAK_FERTILE_DAYS_BEFORE_OVULATION && toOv <= 0,
            isOvulation, isPms, isForecastPeriod: forecast,
            ovulationDate: ov, nextStart: next, lateDays, isStale, awaitingPeriod: false,
        };
    };

    const at = (date: string): CycleDayInfo => {
        if (awaitingPregnancyStart && date >= awaitingPregnancyStart) return { ...blank(date, 'none'), awaitingPeriod: true };
        if (starts.length === 0) return blank(date, 'none');
        if (date < starts[0]) return { ...blank(date, 'before_first'), nextStart: starts[0] };
        // Last start on or before date.
        let lo = 0;
        let hi = starts.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (starts[mid] <= date) lo = mid; else hi = mid - 1;
        }
        if (lo < closed.length) {
            const c = closed[lo];
            return info(date, 'past', c.start, c.length, c.span, c.next, c.ov, false, false);
        }
        if (!expected) {
            // A stale or paused record forecasts nothing, but a day before today inside the newest cycle still has its cycle day.
            return date < today
                ? { ...blank(date, 'none'), cycleStart: lastStart, cycleDay: diffInDays(date, lastStart) + 1 }
                : blank(date, 'none');
        }

        if (date <= runEnd) {
            // Past the expected start the cycle is late, but its flags follow the schedule
            // (latest start + k x cycle length), the same one the predicted days after today use.
            const k = Math.floor(diffInDays(date, lastStart) / rules.cycleLength);
            const late = k >= 1;
            const next = addDays(lastStart, (k + 1) * rules.cycleLength);
            return info(date, 'running', lastStart, rules.cycleLength, latest!.days, next,
                addDays(next, -rules.luteal), true, late && date <= addDays(addDays(lastStart, k * rules.cycleLength), rules.periodLength - 1),
                date === today && today > expected ? diffInDays(today, expected) : 0);
        }
        const start = addDays(lastStart, Math.floor(diffInDays(date, lastStart) / rules.cycleLength) * rules.cycleLength);
        const next = addDays(start, rules.cycleLength);
        return info(date, 'predicted', start, rules.cycleLength, rules.periodLength, next,
            addDays(next, -rules.luteal), true, date <= addDays(start, rules.periodLength - 1));
    };

    // The next-period exports follow the same rule: nothing is expected while a pregnancy awaits a period.
    const upcoming = awaitingPregnancyStart ? null : expected;

    return {
        rules,
        at,
        nextPeriod: upcoming ? { start: upcoming, end: addDays(upcoming, rules.periodLength - 1) } : null,
        ovulationNext: upcoming ? addDays(upcoming, -rules.luteal) : null,
        fertileNext: upcoming ? { start: addDays(upcoming, -rules.luteal - FERTILE_DAYS_BEFORE_OVULATION), end: addDays(upcoming, -rules.luteal) } : null,
        pmsNext: upcoming ? { start: addDays(upcoming, -rules.pms), end: addDays(upcoming, -1) } : null,
        isStale,
    };
};

export type CycleModel = ReturnType<typeof buildCycleModel>;

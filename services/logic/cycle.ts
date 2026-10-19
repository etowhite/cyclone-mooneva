import { DailyLog, Cycle, PeriodRecord } from '../../types';

// --- Constants ---
const MIN_CYCLE_LENGTH = 18;
const MAX_CYCLE_LENGTH = 45;
/** Cycles longer than this are treated as tracking gaps (e.g. 153 days); excluded from averages, fertile hidden in UI */
const OUTLIER_THRESHOLD_DAYS = 60;
export const MIN_GAP_DAYS = 3;
/** Longest period the model accepts (days). */
export const MAX_PERIOD_DAYS = 15;
/** Longest PMS window the UI offers (days). resolveCycleRules still cuts it to luteal - 1. */
export const MAX_PMS_DAYS = 12;

// --- Date Utils ---
import { addDays, diffInDays, getTodayStr } from '../../utils/dateUtils';


// --- Predicates ---
export const isAnyFlowDay = (log: DailyLog): boolean => {
    if (!log) return false;
    if ((log as any).isPeriod) return true; // Legacy support
    return !!log.flow;
};

export const isFullFlowDay = (log: DailyLog): boolean => {
    if (!log) return false;
    if ((log as any).isPeriod) return true; // Legacy support
    const hasFlow = !!log.flow;
    const isSpotting = log.flow === 'spotting';
    return hasFlow && !isSpotting;
};

// --- Period Utils ---

/**
 * The period whose span contains this date, if any. The span is `days` long from
 * `startDate`; `activeDays` says which of those days actually bled, which is a
 * different question and deliberately not consulted here.
 *
 * This scan was copy-pasted into seven call sites across components, hooks and
 * persistence. One copy so it cannot drift.
 */
export const isDateInPeriod = (period: PeriodRecord, date: string): boolean =>
    date >= period.startDate && date <= addDays(period.startDate, period.days - 1);

/**
 * How many days of a period actually bled: the count of `activeDays`, or the whole
 * span when the record has none (legacy records). `cycle.ts` getPastCycles and
 * AverageFlowCurve ask different questions (clamped length, last bled index) and keep
 * their own rules.
 */
export const periodBleedingDays = (period: PeriodRecord): number =>
    period.activeDays?.length || period.days;

export const findActivePeriod = (
    periods: PeriodRecord[],
    date: string
): PeriodRecord | undefined => periods.find(p => isDateInPeriod(p, date));

// --- Pregnancy Spans ---

export interface PregnancySpan {
    start: string;
    /** Last day of the span, inclusive. */
    end: string;
    /** Nothing has ended the span: no period since `start` and no `pregnancyEnd` marker. */
    isOngoing: boolean;
    /** No period has started since `start`: ongoing, or ended by the marker alone. */
    awaitingPeriod: boolean;
}

/**
 * A pregnancy is a start marker (`pregnancyStart`) and an optional end marker
 * (`pregnancyEnd`, the last pregnancy day). The span ends at the earlier of the first end
 * marker on or after the start and the day before the next period: a period is the cycle
 * coming back, so it wins over a later (or missing) marker.
 *
 * An open span is closed at `todayStr` so callers can range-check without special-casing.
 * An end marker before every start, or after a span already closed, belongs to no span.
 */
export const getPregnancySpans = (
    logs: Record<string, DailyLog>,
    periods: PeriodRecord[],
    todayStr: string = getTodayStr()
): PregnancySpan[] => {
    const starts = Object.keys(logs).filter(d => logs[d]?.pregnancyStart).sort();
    const ends = Object.keys(logs).filter(d => logs[d]?.pregnancyEnd === true).sort();
    const periodStarts = periods.map(p => p.startDate).sort();

    const spans: PregnancySpan[] = [];
    for (const start of starts) {
        // A second marker inside a span that is already running is a mis-tap, not a
        // second pregnancy. Skip it rather than opening an overlapping span.
        if (spans.length > 0 && start <= spans[spans.length - 1].end) continue;

        const nextPeriod = periodStarts.find(s => s > start);
        const explicitEnd = ends.find(e => e >= start);
        const periodEnd = nextPeriod ? addDays(nextPeriod, -1) : undefined;
        const end = [explicitEnd, periodEnd].filter((d): d is string => !!d).sort()[0] ?? todayStr;
        spans.push({
            start,
            end,
            isOngoing: !nextPeriod && !explicitEnd,
            awaitingPeriod: !nextPeriod,
        });
    }
    return spans;
};

/** How far past today an ongoing pregnancy shows: the same 7-day horizon the log allows. */
const PREGNANCY_FUTURE_DAYS = 7;

/**
 * The span covering a date. An ongoing span has no end, so it runs to today plus 7 days
 * (its `end` is today). Lab callers pass today, which this does not change.
 */
export const findPregnancySpan = (
    spans: PregnancySpan[],
    date: string
): PregnancySpan | undefined =>
    spans.find(s => date >= s.start && date <= (s.isOngoing ? addDays(s.end, PREGNANCY_FUTURE_DAYS) : s.end));

/**
 * Tags the cycle a pregnancy started inside, so history and the clinical report can say
 * "pregnancy" rather than "tracking gap (not logged)". Nothing that computes a number
 * reads this flag: the span is already excluded from averages for being an outlier.
 */
export const cycleCoversDate = (cycle: Cycle, date: string): boolean =>
    !!cycle.length && date >= cycle.startDate && date <= addDays(cycle.startDate, cycle.length - 1);

export const markPregnancyCycles = (cycles: Cycle[], spans: PregnancySpan[]): Cycle[] => {
    if (spans.length === 0) return cycles;
    return cycles.map(c =>
        spans.some(s => cycleCoversDate(c, s.start)) ? { ...c, isPregnancy: true } : c
    );
};

export const findNearbyPeriod = (
    targetDate: string,
    periods: PeriodRecord[],
    maxGap: number = MIN_GAP_DAYS
): PeriodRecord | null => {
    for (const period of periods) {
        const periodEnd = addDays(period.startDate, period.days - 1);
        const gapAfterPeriod = diffInDays(targetDate, periodEnd);
        if (gapAfterPeriod > 0 && gapAfterPeriod <= maxGap + 1) {
            return period;
        }
        const gapBeforePeriod = diffInDays(period.startDate, targetDate);
        if (gapBeforePeriod > 0 && gapBeforePeriod <= maxGap + 1) {
            return period;
        }
    }
    return null;
};







// Adaptive Prediction Constants
const MIN_ADAPTIVE_CYCLES = 3;

/**
 * Generic helper to clamp and round a value within a range.
 */
const clampAndRound = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, Math.round(value)));
};

/**
 * Normalizes and clamps cycle length to medically typical ranges (18-45 days).
 */
const normalizeCycleLength = (length: number): number => clampAndRound(length, MIN_CYCLE_LENGTH, MAX_CYCLE_LENGTH);

/**
 * Normalizes and clamps period length to typical ranges (1-MAX_PERIOD_DAYS days).
 */
const normalizePeriodLength = (length: number): number => clampAndRound(length, 1, MAX_PERIOD_DAYS);



/**
 * The one place lengths are clamped and conflicts resolved. Luteal can never be longer
 * than the cycle minus the period (ovulation would land inside the period), and PMS must
 * leave at least one luteal day before it.
 */
export const resolveCycleRules = (raw: {
    cycleLength: number;
    periodLength: number;
    lutealPhaseLength: number;
    pmsLength: number;
}) => {
    const cycleLength = normalizeCycleLength(raw.cycleLength);
    const periodLength = normalizePeriodLength(raw.periodLength);
    const luteal = fitLuteal(raw.lutealPhaseLength, cycleLength, periodLength);
    const pms = Math.max(0, Math.min(raw.pmsLength, luteal - 1));
    return { cycleLength, periodLength, luteal, pms };
};

/** Luteal never exceeds the room left after the period (see resolveCycleRules), so the range shrinks with it. */
const lutealBounds = (room: number) => {
    const max = Math.max(1, Math.min(18, room));
    return { min: Math.min(10, max), max };
};

/**
 * The luteal length that fits one cycle: never longer than the cycle minus its period, at least 1.
 * resolveCycleRules (settings cycle) and getPastCycles (a real cycle) both use it.
 */
export const fitLuteal = (luteal: number, cycleLength: number, periodDays: number): number =>
    Math.max(1, Math.min(luteal, cycleLength - periodDays));

/**
 * Stepper limits for the four length settings, derived from the same rules as
 * resolveCycleRules so a stepper can never offer a value the model would cut or an
 * inverted range. The cycle minimum stays 21 (stored values below it are never blocked).
 */
export const settingBounds = (s: { cycleLength: number; periodLength: number; lutealPhaseLength: number }) => ({
    cycle: { min: 21, max: MAX_CYCLE_LENGTH },
    period: { min: 2, max: MAX_PERIOD_DAYS },
    luteal: lutealBounds(s.cycleLength - s.periodLength),
    pms: { min: 1, max: Math.max(1, Math.min(MAX_PMS_DAYS, s.lutealPhaseLength - 1)) },
});

/**
 * True if cycle length indicates a tracking gap (e.g. 153 days); exclude from averages, hide fertile in UI.
 */
export const isCycleOutlier = (length: number): boolean =>
    length > OUTLIER_THRESHOLD_DAYS;

/**
 * True if cycle is eligible for averages and fertile display (18–45 days). Matches
 * normalizeCycleLength's clamp exactly - a longer cycle that made it here would
 * otherwise be silently truncated to 45 rather than excluded.
 */
export const isCycleEligibleForAverage = (length: number): boolean =>
    length >= MIN_CYCLE_LENGTH && length <= MAX_CYCLE_LENGTH;



/**
 * Calculates past cycles based on EXPLICIT Period Records.
 * 
 * @param periods - List of PeriodRecord entities
 * @param archivedBeforeDate - Optional date to filter out old cycles
 */
export const getPastCycles = (
    periods: PeriodRecord[],
    archivedBeforeDate?: string,
    lutealPhaseLength?: number
): Cycle[] => {
    // Sort Oldest -> Newest to iterate chronologically
    const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Filter archived
    const filtered = archivedBeforeDate
        ? sorted.filter(p => p.startDate >= archivedBeforeDate)
        : sorted;

    if (filtered.length < 1) return [];

    const cycles: Cycle[] = [];
    for (let i = 0; i < filtered.length - 1; i++) {
        const current = filtered[i];
        const next = filtered[i + 1];

        const cycleLength = diffInDays(next.startDate, current.startDate);

        // Use active bleeding days count for periodLength, keep full span for display
        const periodDuration = current.activeDays
            ? current.activeDays.length
            : normalizePeriodLength(current.days);
        const spanDays = current.days;

        const isOutlier = isCycleOutlier(cycleLength);
        const isValid = isCycleEligibleForAverage(cycleLength);

        // Calculate historical fertile window (if valid/not outlier)
        let ovulationDate: string | undefined;
        let fertileStart: string | undefined;
        let fertileEnd: string | undefined;

        if (isOutlier || cycleLength < MIN_CYCLE_LENGTH) {
            // Explicitly clear prediction data for outliers and too-short cycles
            ovulationDate = undefined;
            fertileStart = undefined;
            fertileEnd = undefined;
        } else if (lutealPhaseLength) {
            // Next period start is next.startDate
            // Ovulation = Next Period Start - Luteal
            ovulationDate = addDays(next.startDate, -fitLuteal(lutealPhaseLength, cycleLength, spanDays));
            fertileStart = addDays(ovulationDate, -5);
            fertileEnd = ovulationDate; // window closes at ovulation
        }

        cycles.push({
            startDate: current.startDate,
            endDate: addDays(current.startDate, spanDays - 1),
            length: cycleLength,
            periodLength: periodDuration,
            spanDays,
            isOutlier,
            isValid,
            isWithdrawalBleed: current.isWithdrawalBleed,
            ignoreForAverages: current.ignoreForAverages,
            ovulationDate,
            fertileStart,
            fertileEnd
        });
    }

    return cycles;
};



/**
 * Filters past cycles to find "eligible" ones for adaptive prediction.
 * Criteria: length between 18 and 45 days (also excludes gap cycles > 60, via isOutlier).
 * Also excludes cycles marked as withdrawal bleeds (birth control).
 *
 * A cycle a pregnancy started inside is excluded whatever its length. Cycle length is
 * measured period start to period start, so an early loss - marked on day 10, bleeding back
 * on day 35 - produced a 35-day cycle that looked ordinary and was counted as one. The
 * luteal phase of such a cycle is not a luteal phase, and the clinical report labelled the
 * same cycle "Pregnancy" on the page where the average that counted it was printed.
 */
export const getEligibleCycles = (cycles: Cycle[]): Cycle[] => {
    return cycles.filter(c => {
        if (!c.length) return false;
        if (c.isOutlier) return false;
        if (c.isWithdrawalBleed) return false; // Exclude birth control cycles
        if (c.ignoreForAverages) return false; // Exclude manually ignored cycles
        if (c.isPregnancy) return false;
        return isCycleEligibleForAverage(c.length);
    });
};

/** Average only cycles that the prediction model considers eligible. */
export const averageCycleLength = (cycles: Cycle[]): number | null => {
    const eligible = getEligibleCycles(cycles);
    if (eligible.length === 0) return null;

    return Math.round(eligible.reduce((sum, cycle) => sum + (cycle.length || 0), 0) / eligible.length);
};

/** Average period duration using the same eligibility rules as cycle averages. */
export const averagePeriodLength = (cycles: Cycle[]): number | null => {
    const eligible = getEligibleCycles(cycles);
    if (eligible.length === 0) return null;

    return Math.round(eligible.reduce((sum, cycle) => sum + Math.min(cycle.periodLength || 0, MAX_PERIOD_DAYS), 0) / eligible.length);
};

/**
 * Computes adaptive cycle and period lengths dynamically from history.
 * Logic: requires at least MIN_ADAPTIVE_CYCLES (3) eligible cycles, then takes
 * a plain (untrimmed) mean of the last 3 eligible cycles - regardless of how
 * many more eligible cycles exist beyond that.
 */
export const computeAdaptiveLengths = (eligibleCycles: Cycle[]) => {
    // We need at least 3 cycles to be safe
    if (eligibleCycles.length < MIN_ADAPTIVE_CYCLES) return null;

    // User-Intent Model: Simple Mean of last 3 cycles
    const recent = eligibleCycles.slice(-3);

    const getSimpleMean = (values: number[]) => {
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    };

    const cycleLengths = recent.map(c => c.length || 28);
    const periodLengths = recent.map(c => Math.max(1, Math.min(MAX_PERIOD_DAYS, c.periodLength || 5)));

    const adaptiveCycle = getSimpleMean(cycleLengths);
    const adaptivePeriod = getSimpleMean(periodLengths);

    return {
        cycleLength: adaptiveCycle,
        periodLength: adaptivePeriod,
        source: 'adaptive' as const
    };
};

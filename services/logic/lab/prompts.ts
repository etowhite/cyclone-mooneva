// Which prompt Lab shows when it opens, decided from Cycle's own rules. Pure.
// The answer 'start' or 'extend' is followed (after the user says
// yes) by exactly one call to Cycle's toggleBleedingDay(today). That call is a toggle,
// so the one thing this file must get right is: never answer 'start' or 'extend'
// when toggleBleedingDay(today) would REMOVE today.
//
// What toggleBleedingDay(date) does (hooks/usePersistence.ts:378-510):
//  1. Date inside a period span (isDateInPeriod):
//     - the day is in activeDays (a bleeding day): it is REMOVED (day 0 removes the whole
//       period). This is the case we guard: 'none'.
//     - the day is not in activeDays (a skipped day inside the span): it is ADDED.
//  2. Date outside every span: findNearbyPeriod(date, periods) with maxGap MIN_GAP_DAYS (3).
//     It matches the first period that ended 1..4 days before the date (the period is
//     extended to the date) or starts 1..4 days after it (the start moves back to the
//     date). Gap limit is MIN_GAP_DAYS + 1 = 4 days.
//  3. No match: a new period of the adaptive/default length starts on the date.

import type { PeriodRecord } from '../../../types';
import { addDays, diffInDays } from '../../../utils/dateUtils';
import { findActivePeriod, findNearbyPeriod } from '../cycle';
import { eventDate, periodOfDate } from './periods';
import type { LabEvent } from './types';

export type PeriodPrompt = 'none' | 'start' | 'extend';

/**
 * - 'none': today is a bleeding day. Never call the toggle (it would remove the day).
 *   True when the caller says so, or when today is in a period's activeDays.
 * - 'extend': today is in a period span but is not a bleeding day, or the first period
 *   findNearbyPeriod matches ended before today (within 4 days).
 * - 'start': today is in no period span and there is nothing to extend backwards. When
 *   `events` is given, also needs a Lab entry dated today that no period holds (with grace).
 *   Without `events` the old rule applies.
 *
 * Not mirrored exactly: when findNearbyPeriod matches a period that STARTS within 4 days
 * after today, the toggle moves that period's start back to today. This returns 'start'
 * for it, as the toggle would do the same thing a calendar tap does.
 */
export const periodPromptFor = (
    todayStr: string,
    periods: PeriodRecord[],
    isBleedingToday: boolean,
    events?: LabEvent[],
): PeriodPrompt => {
    const containing = findActivePeriod(periods, todayStr);
    if (containing) {
        const dayIdx = diffInDays(todayStr, containing.startDate);
        const activeDays = containing.activeDays ?? Array.from({ length: containing.days }, (_, i) => i);
        return isBleedingToday || activeDays.includes(dayIdx) ? 'none' : 'extend';
    }
    const nearby = findNearbyPeriod(todayStr, periods);
    if (nearby && addDays(nearby.startDate, nearby.days - 1) < todayStr) return 'extend';
    if (events && !events.some(e => eventDate(e) === todayStr && !periodOfDate(periods, todayStr))) return 'none';
    return 'start';
};

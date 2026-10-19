import type { AppSettings, DailyLog, PeriodRecord } from '../../../types';
import { findPregnancySpan, getPregnancySpans } from '../cycle';
import { getTodayStr } from '../../../utils/dateUtils';

/**
 * Lab is visible when it is switched on, discrete mode is off and no pregnancy is active today.
 * Kid mode does not hide it (business_logic.md#lab-module). The Lab reminder and the Lab UI both use this.
 */
export const isLabVisible = (
    settings: Pick<AppSettings, 'labEnabled' | 'discreteMode'> | undefined,
    logs: Record<string, DailyLog>,
    periods: PeriodRecord[],
    today: string = getTodayStr(),
): boolean => {
    if (settings?.labEnabled !== true || settings.discreteMode) return false;
    return !findPregnancySpan(getPregnancySpans(logs, periods, today), today);
};

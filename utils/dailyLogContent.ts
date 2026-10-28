import type { DailyLog } from '../types';

export const hasDailyLogContent = (log?: DailyLog | null): boolean => {
    if (!log) return false;

    const hasMood = (log.mood?.length ?? 0) > 0;

    return Boolean(
        log.flow ||
        (typeof log.pain === 'number' && Number.isInteger(log.pain) && log.pain>=0 && log.pain<=10) ||
        log.pregnancyStart ||
        log.pregnancyEnd ||
        log.pillTakenAt ||
        (log.meds && log.meds.length > 0) ||
        log.notes ||
        hasMood ||
        log.discharge ||
        log.sexDrive ||
        log.sexType ||
        (log.symptoms && log.symptoms.length > 0)
    );
};

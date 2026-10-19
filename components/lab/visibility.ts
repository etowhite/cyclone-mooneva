import { useMemo } from 'react';
import { useMooneva } from '../../contexts/MoonevaContext';
import { isLabVisible } from '../../services/logic/lab';
import { getTodayStr } from '../../utils/dateUtils';

export { isLabVisible };

export const useLabVisible = (): boolean => {
    const { settings, logs, periods } = useMooneva();
    const today = getTodayStr();
    return useMemo(() => isLabVisible(settings, logs, periods, today), [settings, logs, periods, today]);
};

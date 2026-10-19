import { useMemo, useCallback, useEffect, useState } from 'react';
import { DailyLog, AppSettings, Cycle, DayMeta, PeriodRecord } from '../types';
import {
    getPastCycles,
    findActivePeriod,
    getPregnancySpans,
    findPregnancySpan,
    markPregnancyCycles,
} from '../services/logic';
import { periodBleedingDays } from '../services/logic/cycle';
import type { PregnancySpan } from '../services/logic/cycle';
import { toLocalISOString, addDays, diffInDays } from '../utils/dateUtils';
import { buildCycleModel } from '../services/logic/cycleModel';
import type { CycleModel } from '../services/logic/cycleModel';
import { getCycleVisibility } from '../services/logic/settingsInterlocks';
import { calculateCycleStatus } from '../services/logic/status';
import type { CycleStatusData } from '../services/logic/status';
import { useTranslation } from 'react-i18next';

/**
 * Spotting logged right after a period ends extends that period. Hoisted out of
 * getDayMeta: it captures nothing, and re-creating it per call meant one closure
 * allocation for every calendar cell on every render.
 */
const findTrailingSpottingPeriod = (
    dateStr: string,
    logs: Record<string, DailyLog>,
    periods: PeriodRecord[]
): PeriodRecord | null => {
    let checkDate = dateStr;
    let daysBack = 0;
    const maxSpottingChain = 7;

    while (daysBack < maxSpottingChain) {
        const prevDate = addDays(checkDate, -1);
        const prevLog = logs[prevDate];

        const periodEndingYesterday = periods.find(p =>
            prevDate === addDays(p.startDate, p.days - 1));
        if (periodEndingYesterday) return periodEndingYesterday;

        if (prevLog?.flow === 'spotting') {
            checkDate = prevDate;
            daysBack++;
        } else {
            break;
        }
    }
    return null;
};

export interface MoonevaModel {
    // Data
    cycles: Cycle[];
    /** Pregnancy spans, newest last, all of them (TimelineView applies the archive date). History renders the ones no cycle covers. */
    pregnancySpans: PregnancySpan[];
    /** The one cycle model, built once per data change. Reminders, the widget and Trends read it. */
    cycleModel: CycleModel;

    // Helpers
    getDayMeta: (dateStr: string) => DayMeta;
    /** Full localized status for one day. Only the dashboard header needs this;
     *  calendar cells read meta.dayOfCycle instead. */
    getDayStatus: (dateStr: string) => CycleStatusData;
}

/**
 * Unified model hook.
 * Encapsulates all domain logic by composing specialized hooks.
 */
export const useMoonevaModel = (
    logs: Record<string, DailyLog>,
    periods: PeriodRecord[],
    settings: AppSettings
): MoonevaModel => {
    const { t } = useTranslation();

    // getDayMeta reads new Date() fresh on every call, so isToday is always
    // correct *when called* - but nothing re-renders the app at midnight on
    // its own, so a screen left open overnight keeps showing yesterday's
    // isToday until some unrelated state change happens to trigger a
    // re-render. This state ticks once at the next local midnight (and
    // reschedules itself) purely to force that re-render.
    const [todayStr, setTodayStr] = useState(() => toLocalISOString(new Date()));
    useEffect(() => {
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
        const timer = setTimeout(() => {
            setTodayStr(toLocalISOString(new Date()));
        }, nextMidnight.getTime() - now.getTime());
        return () => clearTimeout(timer);
    }, [todayStr]);

    // 1. History (Past)
    const pregnancySpans = useMemo(
        () => getPregnancySpans(logs, periods, todayStr),
        [logs, periods, todayStr]
    );

    const cycles = useMemo(() => {
        const past = getPastCycles(periods, settings.historyArchivedDate, settings.lutealPhaseLength);
        return markPregnancyCycles(past, pregnancySpans);
    }, [periods, settings.historyArchivedDate, settings.lutealPhaseLength, pregnancySpans]);

    // 2. The cycle model: every forecast (next period, windows, per-day flags) comes from it.
    const {
        cycleLength,
        periodLength,
        lutealPhaseLength,
        pmsLength,
        predictionsPaused,
        isOnBirthControl,
        adaptivePrediction,
        historyArchivedDate,
    } = settings;

    // A pregnancy no period has followed forecasts nothing from its start (the latest one counts).
    const awaitingPregnancyStart = useMemo(
        () => pregnancySpans.filter(sp => sp.awaitingPeriod).pop()?.start,
        [pregnancySpans]
    );

    // The model only reads where each span starts, so a log edit that moves no start keeps the same model.
    const spanStartsKey = pregnancySpans.map(sp => sp.start).join(',');
    const modelSpans = useMemo(() => pregnancySpans, [spanStartsKey]);

    const cycleModel = useMemo(
        () => buildCycleModel(periods, {
            cycleLength, periodLength, lutealPhaseLength, pmsLength, adaptivePrediction,
            isOnBirthControl, predictionsPaused, historyArchivedDate,
        }, todayStr, awaitingPregnancyStart, modelSpans),
        [periods, cycleLength, periodLength, lutealPhaseLength, pmsLength, adaptivePrediction,
            isOnBirthControl, predictionsPaused, historyArchivedDate, todayStr, awaitingPregnancyStart, modelSpans]);


    // 3. Day Meta Factory (The single source of truth for UI data)
    const getDayMeta = useCallback((dateStr: string): DayMeta => {
        const log = logs[dateStr];
        const todayStr = toLocalISOString(new Date());

        const isCycleStart = periods.some(p => p.startDate === dateStr);

        // Explicit Period Check
        const activePeriod = findActivePeriod(periods, dateStr);

        const isInsidePeriod = !!activePeriod;
        let isBleeding = false;
        if (activePeriod) {
            if (activePeriod.activeDays) {
                const dayIdx = diffInDays(dateStr, activePeriod.startDate);
                isBleeding = activePeriod.activeDays.includes(dayIdx);
            } else {
                // If no activeDays stored, assume all days in span are bleeding (legacy/default)
                isBleeding = true;
            }
        }

        // ... inside getDayMeta ...
        // Check for trailing spotting that should extend the period
        // If spotting is logged immediately after a period ends, treat it as part of that period
        let trailingSpottingPeriod: PeriodRecord | null = null;
        if (!isInsidePeriod && log?.flow === 'spotting') {
            trailingSpottingPeriod = findTrailingSpottingPeriod(dateStr, logs, periods);
        }

        const isTrailingSpotting = !!trailingSpottingPeriod;

        const meta: DayMeta = {
            date: dateStr,
            isToday: dateStr === todayStr,
            isValidMonth: true,
            isPeriod: isInsidePeriod || isTrailingSpotting,
            isBleeding, // strict: excludes trailing spotting (isFullFlowDay excludes it too)
            isPeriodSpan: isBleeding || isTrailingSpotting,
            isCycleStart,
            isSpotting: log?.flow === 'spotting', // Show spotting indicator even for period-extension days
            isForecastPeriod: false,
            isFertile: false,
            isOvulation: false,
            isPMS: false,
            isUnavailableFuture: diffInDays(dateStr, todayStr) > 7,
            // Period tracking
            periodId: activePeriod?.id || trailingSpottingPeriod?.id,
            isWithdrawalBleed: activePeriod?.isWithdrawalBleed || trailingSpottingPeriod?.isWithdrawalBleed,
            intensity: log?.flow,
            symptoms: log?.symptoms,
            mood: log?.mood ?? []
        };

        const pregnancy = findPregnancySpan(pregnancySpans, dateStr);
        if (pregnancy) {
            meta.isPregnancy = true;
            meta.pregnancyWeek = Math.floor(diffInDays(dateStr, pregnancy.start) / 7) + 1;
        }

        // Calculate Day of Period if active
        if (meta.isPeriod) {
            if (activePeriod) {
                meta.dayOfPeriod = diffInDays(dateStr, activePeriod.startDate) + 1;
            } else if (trailingSpottingPeriod) {
                // For trailing spotting, calculate day relative to the period it extends
                const periodActiveDays = periodBleedingDays(trailingSpottingPeriod);
                const daysAfterPeriod = diffInDays(dateStr, addDays(trailingSpottingPeriod.startDate, trailingSpottingPeriod.days - 1));
                meta.dayOfPeriod = periodActiveDays + daysAfterPeriod;
            }
        }


        // The model gives the facts; the settings decide what is shown.
        const day = cycleModel.at(dateStr);
        meta.isForecastPeriod = day.isForecastPeriod;
        const vis = getCycleVisibility(settings);
        if (vis.fertile) meta.isFertile = day.isFertile;
        if (vis.ovulation) meta.isOvulation = day.isOvulation;
        if (vis.pms) meta.isPMS = day.isPms;
        if (!settings.predictionsPaused && !cycleModel.isStale) {
            meta.dayOfCycle = day.cycleDay ?? undefined;
        }

        return meta;
    }, [logs, periods, settings, cycleModel, pregnancySpans]);

    const getDayStatus = useCallback((dateStr: string): CycleStatusData => {
        return calculateCycleStatus(getDayMeta(dateStr), cycleModel.at(dateStr), cycleModel.rules.periodLength, settings, t);
    }, [getDayMeta, cycleModel, settings, t]);

    return useMemo(() => ({
        cycles,
        pregnancySpans,
        cycleModel,
        getDayMeta,
        getDayStatus,
    }), [cycles, pregnancySpans, cycleModel, getDayMeta, getDayStatus]);
};

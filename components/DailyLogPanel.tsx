
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DailyLog, FlowIntensity, MoodOptionConfig, MOOD_OPTIONS, DischargeType, SexDriveType, SexType } from '../types';
import { getTodayStr, parseLocalDate } from '../utils/dateUtils';
import { findActivePeriod, findPregnancySpan, getPregnancySpans } from '../services/logic/cycle';
import { dayMonthYear } from '../services/displayFormat';
import { getCycleVisibility } from '../services/logic/settingsInterlocks';
import { formatLocalTimeHHmm } from '../utils/timeFormat';
import { useAutoSave } from '../hooks/useAutoSave';
import { useMooneva } from '../contexts/MoonevaContext';
import CustomEntryChips from './CustomEntryChips';
import { canonicalMood, canonicalSymptom, CUSTOM_MOOD_COLORS, isCustomMood, isCustomSymptom, NameOpts } from '../services/logic/logNames';
import enLocale from '../locales/en.json';

interface DailyLogPanelProps {
    date: string;
    onClose?: () => void;
    onEditPeriod?: () => void;
}

const MAX_MOODS = 5;
// A selected symptom chip; custom symptoms use the same look.
const SYMPTOM_SELECTED = {
    className: 'bg-white scale-[0.98]',
    style: {
        borderColor: '#fb7185',
        color: '#fb7185',
        boxShadow: 'inset 2px 2px 5px rgba(163, 177, 198, 0.4), inset -2px -2px 5px rgba(255, 255, 255, 0.8)',
    } as React.CSSProperties,
};
// A selected custom mood: the mood-circle ring and glow, in the neutral custom-mood grey.
// The mood-circle classes pick up the same dark-mode rule as a selected built-in mood.
const CUSTOM_MOOD_SELECTED = {
    className: 'daily-log-mood-circle daily-log-selection-circle-selected',
    style: {
        border: `2px solid ${CUSTOM_MOOD_COLORS.color}`,
        backgroundColor: `${CUSTOM_MOOD_COLORS.color}1A`,
        color: CUSTOM_MOOD_COLORS.dark,
        boxShadow: `4px 4px 10px ${CUSTOM_MOOD_COLORS.shadow}, -3px -3px 8px rgba(255, 255, 255, 0.8)`,
        '--daily-log-selection-color': CUSTOM_MOOD_COLORS.color,
        '--daily-log-selection-bg': `${CUSTOM_MOOD_COLORS.color}2E`,
        '--daily-log-selection-glow': CUSTOM_MOOD_COLORS.shadow,
    } as React.CSSProperties,
};
const medNames = (l: DailyLog) => l.meds || [];
const symptomNames = (l: DailyLog) => (l.symptoms || []).filter(isCustomSymptom);
const moodNames = (l: DailyLog) => (Array.isArray(l.mood) ? l.mood : []).filter(isCustomMood);
const enText = (key: string): string | undefined =>
    key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], enLocale) as string | undefined;

const FLOW_INTENSITY_OPTIONS = [
    { id: 'spotting' as const, labelKey: 'log.intensity_spotting', defaultLabel: 'Spot', dot: 'w-1.5 h-1.5' },
    { id: 'light' as const, labelKey: 'log.intensity_light', defaultLabel: 'Light', dot: 'w-2.5 h-2.5' },
    { id: 'medium' as const, labelKey: 'log.intensity_medium', defaultLabel: 'Med', dot: 'w-3.5 h-3.5' },
    { id: 'heavy' as const, labelKey: 'log.intensity_heavy', defaultLabel: 'Heavy', dot: 'w-5 h-5' }
];

/**
 * DailyLog Panel.
 * Inline editable section below the calendar for the selected date.
 */
const DailyLogPanel: React.FC<DailyLogPanelProps> = ({
    date,
    onClose,
    onEditPeriod
}) => {
    const { t, i18n } = useTranslation();
    const {
        logs,
        settings,
        model,
        actions,
        periods
    } = useMooneva();

    const { getDayMeta } = model;
    const { updateLog, updatePeriodWithdrawalBleed, updatePeriodIgnoreForAverages } = actions;

    const log = logs[date];

    // Internal state
    const [flow, setFlow] = useState<FlowIntensity>(() => logs[date]?.flow || null);
    const [symptoms, setSymptoms] = useState<string[]>(() => logs[date]?.symptoms || []);
    const [notes, setNotes] = useState<string>(() => logs[date]?.notes || '');
    const [mood, setMood] = useState<string[]>(() => {
        const m = logs[date]?.mood;
        return Array.isArray(m) ? m : (m ? [m] : []);
    });
    const [discharge, setDischarge] = useState<DischargeType>(() => logs[date]?.discharge || null);
    const [sexDrive, setSexDrive] = useState<SexDriveType>(() => logs[date]?.sexDrive || null);
    const [sexType, setSexType] = useState<SexType>(() => logs[date]?.sexType || null);
    const [pillTakenAt, setPillTakenAt] = useState<string | undefined>(() => logs[date]?.pillTakenAt);
    const [meds, setMeds] = useState<string[]>(() => logs[date]?.meds || []);
    const [pregnancyStart, setPregnancyStart] = useState<boolean>(() => !!logs[date]?.pregnancyStart);
    const [pregnancyEnd, setPregnancyEnd] = useState<boolean>(() => logs[date]?.pregnancyEnd === true);

    // Keep references to current state and handlers to safely flush across date changes and unmounts
    const prevDateRef = useRef(date);
    const updateLogRef = useRef(updateLog);
    updateLogRef.current = updateLog;
    const currentStateRef = useRef({ flow, symptoms, notes, mood, discharge, sexDrive, sexType, pillTakenAt, meds, pregnancyStart, pregnancyEnd });
    currentStateRef.current = { flow, symptoms, notes, mood, discharge, sexDrive, sexType, pillTakenAt, meds, pregnancyStart, pregnancyEnd };
    const isDirtyRef = useRef(false);
    const logsRef = useRef(logs);
    logsRef.current = logs;

    // Track user edits
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        isDirtyRef.current = true;
    }, [flow, symptoms, notes, mood, discharge, sexDrive, sexType, pillTakenAt, meds, pregnancyStart, pregnancyEnd]);

    // Sync state when date changes, flushing any pending unsaved changes for the previous date
    useEffect(() => {
        if (prevDateRef.current !== date) {
            if (isDirtyRef.current) {
                updateLogRef.current(prevDateRef.current, {
                    date: prevDateRef.current,
                    ...currentStateRef.current
                });
                isDirtyRef.current = false;
            }
            prevDateRef.current = date;

            const activeLog = logsRef.current[date];
            setFlow(activeLog?.flow || null);
            setSymptoms(activeLog?.symptoms || []);
            setNotes(activeLog?.notes || '');
            setMood(activeLog?.mood ?? []);
            setDischarge(activeLog?.discharge || null);
            setSexDrive(activeLog?.sexDrive || null);
            setSexType(activeLog?.sexType || null);
            setPillTakenAt(activeLog?.pillTakenAt);
            setMeds(activeLog?.meds || []);
            setPregnancyStart(!!activeLog?.pregnancyStart);
            setPregnancyEnd(activeLog?.pregnancyEnd === true);
            isDirtyRef.current = false;
        }
    }, [date]);

    // On unmount: flush if dirty
    useEffect(() => {
        return () => {
            if (isDirtyRef.current) {
                updateLogRef.current(prevDateRef.current, {
                    date: prevDateRef.current,
                    ...currentStateRef.current
                });
                isDirtyRef.current = false;
            }
        };
    }, []);

    // Check if there is an existing period overlapping this date
    const activePeriod = useMemo(() => findActivePeriod(periods, date), [periods, date]);

    // Derived Meta for Display
    const meta = getDayMeta(date);

    const saveToLog = useCallback(() => {
        if (isDirtyRef.current) {
            updateLog(date, {
                date,
                flow,
                symptoms,
                notes,
                mood,
                discharge,
                sexDrive,
                sexType,
                pillTakenAt,
                meds,
                pregnancyStart,
                pregnancyEnd
            });
            isDirtyRef.current = false;
        }
        // This panel never touches PeriodRecords directly, but updateLog does: writing a
        // flow here can create a period, extend a nearby one, or fill a gap day. See
        // usePersistence.updateLog. The calendar toggle is the other way in, not the only one.
    }, [date, flow, symptoms, notes, mood, discharge, sexDrive, sexType, pillTakenAt, meds, pregnancyStart, pregnancyEnd, updateLog]);

    useAutoSave(saveToLog, [flow, symptoms, notes, mood, discharge, sexDrive, sexType, pillTakenAt, meds, pregnancyStart, pregnancyEnd, saveToLog]);

    const toggleSymptom = (sym: string) => {
        if (symptoms.includes(sym)) {
            setSymptoms(symptoms.filter(s => s !== sym));
        } else {
            setSymptoms([...symptoms, sym]);
        }
    };

    const visibleSymptoms = settings.symptoms.filter(s => !s.isHidden);
    const cycleVis = getCycleVisibility(settings);
    const sortedVisibleSymptoms = [...visibleSymptoms].sort((a, b) => a.label.localeCompare(b.label));
    const [showMoreSymptoms, setShowMoreSymptoms] = useState(false);
    const displayedSymptoms = showMoreSymptoms ? sortedVisibleSymptoms : sortedVisibleSymptoms.slice(0, 8);

    type TabId = 'flow' | 'mood' | 'symptoms' | 'notes' | 'pill';
    const [activeTab, setActiveTab] = useState<TabId>('flow');
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const tabItems = [
        { id: 'flow' as const, labelKey: 'log.flow_tab' },
        { id: 'mood' as const, labelKey: 'log.mood' },
        { id: 'symptoms' as const, labelKey: 'log.vitals_tab' },
        { id: 'notes' as const, labelKey: 'log.notes' },
        { id: 'pill' as const, labelKey: 'log.pill_tab' }
    ];

    useEffect(() => {
        setIsAdvancedOpen(false);
        setShowMoreSymptoms(false);
    }, [date]);

    const toggleMood = (m: string) => {
        if (mood.includes(m)) {
            setMood(mood.filter(x => x !== m));
        } else {
            setMoodCapped([...mood, m]);
        }
    };

    // Typed text counts as a built-in in the current language or in English.
    const nameOpts = useMemo<NameOpts>(() => ({
        t: key => { const v = t(key); return v === key ? undefined : v; },
        tEn: enText,
    }), [t]);
    const typedSymptom = useCallback((name: string) => canonicalSymptom(name, nameOpts) ?? name, [nameOpts]);
    const typedMood = useCallback((name: string) => canonicalMood(name, nameOpts) ?? name, [nameOpts]);

    // One cap for moods, whether the mood is a built-in circle or a custom chip.
    const setMoodCapped = (next: string[]) => {
        if (next.length <= mood.length || next.length <= MAX_MOODS) setMood(next);
    };

    const handlePregnancyToggle = () => setPregnancyStart(!pregnancyStart);

    /**
     * The end toggle needs a pregnancy to end. The span is computed with this day's own end
     * marker ignored, so the toggle can still be switched off, and with the start state
     * as edited, since it has not been saved yet.
     */
    const endState = (() => {
        const today = getTodayStr();
        const others = { ...logs, [date]: { ...logs[date], date, symptoms: logs[date]?.symptoms ?? [], pregnancyStart, pregnancyEnd: false } };
        const span = findPregnancySpan(getPregnancySpans(others, periods, today), date);
        const otherEnd = span && Object.keys(logs)
            .filter(d => d !== date && d >= span.start && logs[d]?.pregnancyEnd === true)
            .sort()[0];
        const alreadyEnds = otherEnd && otherEnd <= span.end ? otherEnd : undefined;
        return { inSpan: !!span, alreadyEnds, future: date > today };
    })();
    // A stored marker that no pregnancy span owns (a period cut the span short) shows as off.
    const endShown = pregnancyEnd && endState.inSpan;
    const canToggleEnd = endShown || (endState.inSpan && !endState.alreadyEnds && !endState.future);

    /**
     * Available on any day, with or without a period on it, because the common case is
     * entering a pregnancy that already happened. The span ends itself at the next
     * period, so there is no "end pregnancy" control to get out of sync.
     */
    const renderPregnancyToggle = () => (
        <div className="space-y-3">
            <div className="flex items-center gap-2 pl-1 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">{t('log.pregnancy', 'Pregnancy')}</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-violet-400/80 bg-violet-100/60 rounded-full px-2 py-0.5">
                    {t('log.experimental', 'Experimental, needs feedback')}
                </span>
                <div className="h-[1.5px] w-6 bg-violet-200 rounded-full" />
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={!!pregnancyStart}
                aria-labelledby="preg-start-label"
                aria-describedby="preg-start-desc"
                className="w-full text-start flex items-center justify-between gap-3 p-4 bg-[#F0F2F5] rounded-xl border border-slate-200/50 cursor-pointer transition-all active:scale-[0.99]"
                style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3)' }}
                onClick={() => handlePregnancyToggle()}
                data-testid="pregnancy-start-toggle"
            >
                <div className="flex-1">
                    <span id="preg-start-label" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none block">
                        {t('log.pregnancy_start_question', 'Pregnancy started on this day?')}
                    </span>
                    <p id="preg-start-desc" className="text-[9px] text-slate-400 mt-0.5">
                        {t('log.pregnancy_start_desc', 'Ends by itself when your next period starts')}
                    </p>
                </div>
                <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 border-2
                    ${pregnancyStart
                            ? 'bg-violet-50 border-violet-400 text-violet-600'
                            : 'bg-white border-transparent text-transparent shadow-[1px_1px_2px_rgba(163,177,198,0.4)]'}`}
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
            </button>
            <button
                type="button"
                role="switch"
                aria-checked={endShown}
                aria-labelledby="preg-end-label"
                aria-describedby="preg-end-desc"
                aria-disabled={!canToggleEnd}
                disabled={!canToggleEnd}
                className={`w-full text-start flex items-center justify-between gap-3 p-4 bg-[#F0F2F5] rounded-xl border border-slate-200/50 transition-all ${canToggleEnd ? 'cursor-pointer active:scale-[0.99]' : 'cursor-not-allowed opacity-50'}`}
                style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3)' }}
                onClick={() => { if (canToggleEnd) setPregnancyEnd(!endShown); }}
                data-testid="pregnancy-end-toggle"
            >
                <div className="flex-1">
                    <span id="preg-end-label" className="text-[11px] font-bold text-slate-700 select-none block">
                        {t('log.pregnancy_end_question', 'Pregnancy ended on this day?')}
                    </span>
                    <p id="preg-end-desc" className="text-[9px] text-slate-400 mt-0.5">
                        {endState.alreadyEnds && !endShown
                            ? t('log.pregnancy_end_already', { defaultValue: 'Already ends on {{date}}', date: dayMonthYear(parseLocalDate(endState.alreadyEnds), i18n.language) })
                            : endState.future && !endShown
                                ? t('log.pregnancy_end_future', 'Cannot end a pregnancy in the future')
                                : !canToggleEnd
                                    ? t('log.pregnancy_end_needs_span', 'Only for a day inside a pregnancy')
                                    : t('log.pregnancy_end_desc', 'The last day of the pregnancy')}
                    </p>
                </div>
                <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 border-2
                    ${endShown
                            ? 'bg-violet-50 border-violet-400 text-violet-600'
                            : 'bg-white border-transparent text-transparent shadow-[1px_1px_2px_rgba(163,177,198,0.4)]'}`}
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
            </button>
            {pregnancyStart && (
                <p className="text-[10px] text-violet-500 px-1 font-medium">
                    {t('log.pregnancy_tagged', 'This span will be shown as a pregnancy, not a tracking gap.')}
                </p>
            )}
        </div>
    );

    const renderAdvancedContent = () => {
        if (!activePeriod) {
            return (
                <section className="flex flex-col gap-4 py-2">
                    <p className="text-xs text-slate-400 text-center px-3">
                        {t('log.no_period_advanced', 'This date is not part of a period. Start or select a period day to access advanced options.')}
                    </p>

                    {cycleVis.withdrawalQuestion && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pl-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">{t('log.period_type', 'Period Type')}</span>
                                <div className="h-[1.5px] w-6 bg-indigo-100 rounded-full" />
                            </div>
                            <div
                                aria-disabled="true"
                                className="flex items-center justify-between gap-3 p-4 bg-[#F0F2F5] rounded-xl border border-slate-200/50 cursor-not-allowed opacity-50"
                                style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.25)' }}
                            >
                                <div className="flex-1">
                                    <label className="text-[11px] font-bold text-slate-600 select-none block">
                                        {t('log.withdrawal_bleed_question', 'Was this a withdrawal bleed?')}
                                    </label>
                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                        {t('log.withdrawal_bleed_desc', 'Tag if on hormonal birth control (pill, ring, patch)')}
                                    </p>
                                </div>
                                <div className="w-6 h-6 rounded-lg bg-white border-2 border-transparent shadow-[1px_1px_2px_rgba(163,177,198,0.3)]" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pl-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">{t('log.stats')}</span>
                            <div className="h-[1.5px] w-6 bg-amber-100 rounded-full" />
                        </div>
                        <div
                            aria-disabled="true"
                            className="flex items-center justify-between gap-3 p-4 bg-[#F0F2F5] rounded-xl border border-slate-200/50 cursor-not-allowed opacity-50"
                            style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.25)' }}
                        >
                            <div className="flex-1">
                                <label className="text-[11px] font-bold text-slate-600 select-none block">
                                    {t('log.ignore_averages_question', 'Exclude from averages and charts?')}
                                </label>
                                <p className="text-[9px] text-slate-400 mt-0.5">
                                    {t('log.ignore_averages_desc', 'For irregular cycles (stress, illness, etc.)')}
                                </p>
                            </div>
                            <div className="w-6 h-6 rounded-lg bg-white border-2 border-transparent shadow-[1px_1px_2px_rgba(163,177,198,0.3)]" />
                        </div>
                    </div>

                    {renderPregnancyToggle()}
                </section>
            );
        }

        return (
            <section className="flex flex-col gap-4 py-2">
                {(cycleVis.withdrawalQuestion || activePeriod.isWithdrawalBleed) && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pl-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">{t('log.period_type', 'Period Type')}</span>
                            <div className="h-[1.5px] w-6 bg-indigo-200 rounded-full" />
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={!!activePeriod.isWithdrawalBleed}
                            aria-labelledby="withdrawal-label"
                            aria-describedby="withdrawal-desc"
                            className="w-full text-start flex items-center justify-between gap-3 p-4 bg-[#F0F2F5] rounded-xl border border-slate-200/50 cursor-pointer transition-all active:scale-[0.99]"
                            style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3)' }}
                            onClick={() => updatePeriodWithdrawalBleed(activePeriod.id, !activePeriod.isWithdrawalBleed)}
                        >
                            <div className="flex-1">
                                <span id="withdrawal-label" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none block">
                                    {t('log.withdrawal_bleed_question', 'Was this a withdrawal bleed?')}
                                </span>
                                <p id="withdrawal-desc" className="text-[9px] text-slate-400 mt-0.5">
                                    {t('log.withdrawal_bleed_desc', 'Tag if on hormonal birth control (pill, ring, patch)')}
                                </p>
                            </div>
                            <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 border-2
                                ${activePeriod.isWithdrawalBleed
                                        ? 'bg-indigo-50 border-indigo-400 text-indigo-600'
                                        : 'bg-white border-transparent text-transparent shadow-[1px_1px_2px_rgba(163,177,198,0.4)]'}`}
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        </button>
                        {activePeriod.isWithdrawalBleed && (
                            <p className="text-[10px] text-indigo-500 px-1 font-medium">
                                💊 {t('log.withdrawal_tagged', 'This period is tagged as a withdrawal bleed and will be excluded from natural cycle statistics.')}
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center gap-2 pl-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">{t('log.stats')}</span>
                        <div className="h-[1.5px] w-6 bg-amber-200 rounded-full" />
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={!!activePeriod.ignoreForAverages}
                        aria-labelledby="ignore-avg-label"
                        aria-describedby="ignore-avg-desc"
                        className="w-full text-start flex items-center justify-between gap-3 p-4 bg-[#F0F2F5] rounded-xl border border-slate-200/50 cursor-pointer transition-all active:scale-[0.99]"
                        style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3)' }}
                        onClick={() => updatePeriodIgnoreForAverages(activePeriod.id, !activePeriod.ignoreForAverages)}
                    >
                        <div className="flex-1">
                            <span id="ignore-avg-label" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none block">
                                {t('log.ignore_averages_question', 'Exclude from averages and charts?')}
                            </span>
                            <p id="ignore-avg-desc" className="text-[9px] text-slate-400 mt-0.5">
                                {t('log.ignore_averages_desc', 'For irregular cycles (stress, illness, etc.)')}
                            </p>
                        </div>
                        <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 border-2
                            ${activePeriod.ignoreForAverages
                                    ? 'bg-amber-50 border-amber-400 text-amber-600'
                                    : 'bg-white border-transparent text-transparent shadow-[1px_1px_2px_rgba(163,177,198,0.4)]'}`}
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </button>
                    {activePeriod.ignoreForAverages && (
                        <p className="text-[10px] text-amber-500 px-1 font-medium">
                            ⚠️ {t('log.ignore_tagged', 'This period is excluded from your cycle averages and from the Insights charts.')}
                        </p>
                    )}
                </div>

                {renderPregnancyToggle()}
            </section>
        );
    };

    return (
        <>
            <div
                className="daily-log-panel relative z-0 w-[95%] max-w-[95%] mx-auto bg-[#F0F2F5] rounded-b-[32px] px-4 py-4 animate-fade-in space-y-4"
                style={{ boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.8)' }}
            >

                <div className="flex items-center gap-2 mb-4 mt-4">
                    {!meta.isUnavailableFuture && (
                        <div
                            className="daily-log-tabs flex-1 min-w-0 flex flex-nowrap gap-0 p-1.5 bg-[#F0F2F5] rounded-2xl overflow-x-auto no-scrollbar mt-[5px]"
                            role="tablist"
                            aria-label={t('log.daily_log_tabs', 'Daily log tabs')}
                            style={{ boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.8)' }}
                        >
                            {tabItems.map((tab) => (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`daily-log-tab flex-shrink-0 flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-semibold tracking-wide uppercase transition-all duration-200
                                    ${activeTab === tab.id ? 'daily-log-tab-active text-slate-700' : 'daily-log-tab-inactive text-slate-400 hover:text-slate-600'}`}
                                    style={activeTab === tab.id ? {
                                        backgroundColor: '#F0F2F5',
                                        boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.8)'
                                    } : {}}
                                >
                                    {t(tab.labelKey)}
                                </button>
                            ))}
                        </div>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            aria-label={t('common.close', 'Close')}
                            className="daily-log-close flex-shrink-0 p-2 text-slate-500 hover:text-slate-700 transition-colors rounded-xl mt-[5px]"
                            style={{
                                backgroundColor: '#F0F2F5',
                                boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.8)'
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {meta.isUnavailableFuture ? (
                    <div className="py-[13px] px-6 text-center">
                        <p className="text-[13px] font-medium text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                            {t('log.unavailable_future_date')}
                        </p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'flow' && (
                            <section className="flex flex-col gap-4">
                                {!activePeriod && (
                                    <p className="daily-log-hint text-[11px] text-slate-500 text-center px-4">
                                        {t('log.spotting_hint_no_period')}
                                    </p>
                                )}
                                <div className="flex flex-col items-center gap-6 py-4">
                                    <div className="flex items-center justify-center gap-4">
                                        {!activePeriod ? (
                                            <>
                                                {/* Only Spotting */}
                                                <FlowCircle
                                                    isSelected={flow === 'spotting'}
                                                    onClick={() => setFlow(flow === 'spotting' ? null : 'spotting')}
                                                    label={t('log.intensity_spotting', 'Spot')}
                                                    dotClass="w-1.5 h-1.5"
                                                />
                                                {/* Start Period Action */}
                                                <ActionCircle
                                                    onClick={onEditPeriod || (() => { })}
                                                    label={t('calendar.period_question')}
                                                    icon={
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            className="w-5 h-5"
                                                            fill="#8aacac"
                                                            style={{ filter: 'drop-shadow(0px 1px 2px rgba(138, 172, 172, 0.4))' }}
                                                        >
                                                            <path d="M12 21.5c-3.59 0-6.5-2.91-6.5-6.5 0-3.59 4-9.5 6.5-12.5 2.5 3 6.5 8.91 6.5 12.5 0 3.59-2.91 6.5-6.5 6.5z" />
                                                        </svg>
                                                    }
                                                />
                                            </>
                                        ) : (
                                            /* All Flow intensities when inside a period */
                                            FLOW_INTENSITY_OPTIONS.map((f) => (
                                                <FlowCircle
                                                    key={f.id}
                                                    isSelected={flow === f.id}
                                                    onClick={() => setFlow(flow === f.id ? null : f.id)}
                                                    label={t(f.labelKey, f.defaultLabel)}
                                                    dotClass={f.dot}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdvancedOpen(open => !open)}
                                        aria-expanded={isAdvancedOpen}
                                        className="daily-log-advanced-button mx-auto flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        <span>{t('log.advanced', 'Advanced')}</span>
                                        <svg
                                            className={`w-3.5 h-3.5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                    {isAdvancedOpen && (
                                        <div className="animate-fade-in">
                                            {renderAdvancedContent()}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === 'mood' && (
                            <section className="flex flex-col gap-3">
                                <div className="flex flex-wrap gap-x-4 gap-y-3 py-4 items-center justify-center max-w-[280px] mx-auto">
                                    {MOOD_OPTIONS.map(opt => (
                                        <MoodCircle
                                            key={opt.id}
                                            config={opt}
                                            isSelected={mood.includes(opt.id)}
                                            onClick={() => toggleMood(opt.id)}
                                        >
                                            {t(opt.labelKey)}
                                        </MoodCircle>
                                    ))}
                                </div>
                                <span className="pl-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{t('log.custom_own', 'Your own')}</span>
                                <CustomEntryChips
                                    key={date}
                                    variant="custom"
                                    selected={mood}
                                    onChange={setMoodCapped}
                                    logs={logs}
                                    namesOf={moodNames}
                                    canonicalize={typedMood}
                                    isCustom={isCustomMood}
                                    selectedLook={CUSTOM_MOOD_SELECTED}
                                    placeholder={t('log.custom_mood_add', 'Add a mood')}
                                />
                            </section>
                        )}

                        {activeTab === 'symptoms' && (
                            <section className="flex flex-col gap-4 py-2">
                                <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap gap-2">
                                    {displayedSymptoms
                                        .map(sym => {
                                            const isSelected = symptoms.includes(sym.label);
                                            return (
                                                <button
                                                    key={sym.id}
                                                    onClick={() => toggleSymptom(sym.label)}
                                                    aria-pressed={isSelected}
                                                    className={`px-3 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-all duration-200 border
                                                     ${isSelected
                                                            ? SYMPTOM_SELECTED.className
                                                            : 'bg-white border-transparent text-slate-500 hover:border-slate-200'}`}
                                                    style={isSelected ? SYMPTOM_SELECTED.style : {
                                                        boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.8)'
                                                    }}
                                                >
                                                    {t(`symptom.${sym.label.toLowerCase()}`, sym.label)}
                                                </button>
                                            );
                                        })}
                                </div>
                                {sortedVisibleSymptoms.length > 8 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowMoreSymptoms(open => !open)}
                                        className="self-center mt-1 px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-[#7598a0] transition-colors"
                                    >
                                        {showMoreSymptoms ? t('log.fewer_symptoms', 'Fewer symptoms') : t('log.more_symptoms', 'More symptoms')}
                                    </button>
                                )}
                                <span className="mt-2 pl-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{t('log.custom_own', 'Your own')}</span>
                                <CustomEntryChips
                                    key={date}
                                    variant="custom"
                                    selected={symptoms}
                                    onChange={setSymptoms}
                                    logs={logs}
                                    namesOf={symptomNames}
                                    canonicalize={typedSymptom}
                                    isCustom={isCustomSymptom}
                                    selectedLook={SYMPTOM_SELECTED}
                                    placeholder={t('log.custom_symptom_add', 'Add a symptom')}
                                />
                                </div>

                                {(cycleVis.fertile || cycleVis.ovulation) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 pl-1">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-400">{t('log.secretions', 'Secretions')}</span>
                                            <div className="h-[1.5px] w-6 bg-teal-200 rounded-full" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'dry', label: 'log.discharge_dry' },
                                                { id: 'sticky_creamy', label: 'log.discharge_sticky_creamy' },
                                                { id: 'egg_white', label: 'log.discharge_egg_white' },
                                                { id: 'unusual', label: 'log.discharge_unusual' }
                                            ].map(opt => {
                                                const isSelected = discharge === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => setDischarge(discharge === opt.id ? null : opt.id as DischargeType)}
                                                        aria-pressed={isSelected}
                                                        className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 border
                                                ${isSelected
                                                                ? 'bg-white border-[#2dd4bf] text-[#2dd4bf]'
                                                                : 'bg-white border-transparent text-slate-400 hover:border-slate-200'}`}
                                                        style={isSelected ? {
                                                            boxShadow: 'inset 2px 2px 5px rgba(163, 177, 198, 0.4), inset -2px -2px 5px rgba(255, 255, 255, 0.8)'
                                                        } : {
                                                            boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.8)'
                                                        }}
                                                    >
                                                        {t(opt.label)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {!settings.kidMode && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pl-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500">{t('log.sex_libido', 'Sex & Libido')}</span>
                                        <div className="h-[1.5px] w-6 bg-amber-200 rounded-full" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex gap-2 p-1 bg-[#F0F2F5] rounded-xl border border-slate-200/50" style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3)' }}>
                                            {[
                                                { id: 'low', label: t('log.libido_low', 'Low') },
                                                { id: 'medium', label: t('log.libido_medium', 'Medium') },
                                                { id: 'high', label: t('log.libido_high', 'High') }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setSexDrive(sexDrive === opt.id ? null : opt.id as SexDriveType)}
                                                    aria-pressed={sexDrive === opt.id}
                                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-200
                                            ${sexDrive === opt.id ? 'bg-white text-amber-600 shadow-sm border border-amber-100' : 'text-slate-400'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 p-1 bg-[#F0F2F5] rounded-xl border border-slate-200/50" style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3)' }}>
                                            {[
                                                { id: 'protected', label: t('log.sex_protected', 'Protected') },
                                                { id: 'unprotected', label: t('log.sex_unprotected', 'Unprotected') }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setSexType(sexType === opt.id ? null : opt.id as SexType)}
                                                    aria-pressed={sexType === opt.id}
                                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-200
                                            ${sexType === opt.id ? 'bg-white text-[#a855f7] shadow-sm border border-[#a855f7]/30' : 'text-slate-400'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                )}
                            </section>
                        )}

                        {activeTab === 'notes' && (
                            <section className="flex flex-col gap-3">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('log.add_note_placeholder', 'Add your notes specific to this date...')}
                                    className="w-full min-h-[100px] p-3 text-xs font-medium text-slate-700 placeholder-slate-400 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-0 focus:border-slate-300 resize-none transition-all"
                                />
                            </section>
                        )}

                        {activeTab === 'pill' && (
                            <section className="flex flex-col gap-4 py-2">
                                {(cycleVis.pillLog || pillTakenAt) && (<>
                                    <label
                                        className="daily-log-control-card flex items-center justify-between gap-3 p-4 bg-[#F0F2F5] rounded-xl border border-cyan-100/60 cursor-pointer transition-all active:scale-[0.99]"
                                        style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3)' }}
                                    >
                                        <div className="flex-1">
                                            <span className="text-[11px] font-bold text-slate-700 select-none block">
                                                {t('log.pill_taken', 'Took pill')}
                                            </span>
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                {t('log.pill_taken_hint', 'Your contraceptive pill')}
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            aria-label={t('log.pill_taken', 'Took pill')}
                                            checked={!!pillTakenAt}
                                            onChange={(event) => {
                                                setPillTakenAt(event.target.checked ? formatLocalTimeHHmm() : undefined);
                                            }}
                                            className="sr-only"
                                        />
                                        <div
                                            className={`daily-log-check w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 border-2
                                            ${pillTakenAt
                                                    ? 'daily-log-check-on bg-cyan-50 border-cyan-400 text-cyan-600'
                                                    : 'daily-log-check-off bg-white border-transparent text-transparent shadow-[1px_1px_2px_rgba(163,177,198,0.4)]'}`}
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    </label>

                                    {pillTakenAt && (
                                        <label className="daily-log-pill-time-card flex items-center justify-between gap-3 p-4 bg-white/50 rounded-xl border border-cyan-100/70">
                                            <span className="text-[11px] font-bold text-slate-600">
                                                {t('log.pill_time', 'Pill time')}
                                            </span>
                                            <input
                                                type="time"
                                                aria-label={t('log.pill_time', 'Pill time')}
                                                value={pillTakenAt}
                                                onChange={(event) => setPillTakenAt(event.target.value || undefined)}
                                                className="daily-log-pill-time-input text-[13px] font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-cyan-300/40 outline-none"
                                            />
                                        </label>
                                    )}
                                </>)}

                                <div className="daily-log-meds flex flex-col gap-2">
                                    <p className="text-[9px] text-slate-400 px-1">
                                        {t('log.meds_hint', 'Painkillers, other medication or supplements')}
                                    </p>
                                    <CustomEntryChips
                                        key={date}
                                        selected={meds}
                                        onChange={setMeds}
                                        logs={logs}
                                        namesOf={medNames}
                                        placeholder={t('log.meds_add', 'Add medication or supplement')}
                                    />
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

        </>
    );
};

interface SelectionCircleProps {
    isSelected: boolean;
    onClick: () => void;
    colorConfig: { color: string; dark: string; shadow: string };
    className?: string;
    /** Exposes isSelected as aria-pressed. Action circles are not toggles and leave it off. */
    toggle?: boolean;
    children: React.ReactNode;
}

const SelectionCircle: React.FC<SelectionCircleProps> = ({ isSelected, onClick, colorConfig, className = '', toggle = false, children }) => {
    const selectedStyle = {
            boxShadow: `8px 8px 16px ${colorConfig.shadow}, -4px -4px 12px rgba(255, 255, 255, 0.8)`,
            border: `3px solid ${colorConfig.color}`,
            backgroundColor: `${colorConfig.color}1A`,
            color: colorConfig.dark,
            '--daily-log-selection-color': colorConfig.color,
            '--daily-log-selection-bg': `${colorConfig.color}2E`,
            '--daily-log-selection-glow': colorConfig.shadow,
        } as React.CSSProperties;
    const idleStyle = {
            boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)',
            color: '#94a3b8',
            border: '1px solid transparent'
        } as React.CSSProperties;

    return (
        <button
            onClick={onClick}
            aria-pressed={toggle ? isSelected : undefined}
            className={`daily-log-selection-circle ${isSelected ? 'daily-log-selection-circle-selected z-10' : 'daily-log-selection-circle-idle bg-[#F0F2F5]'} ${className} relative flex flex-col items-center justify-center w-[58px] h-[58px] rounded-full transition-all duration-300 active:scale-95`}
            style={isSelected ? selectedStyle : idleStyle}
        >
            {children}
        </button>
    );
};

const MoodCircle: React.FC<{ config: MoodOptionConfig; isSelected: boolean; onClick: () => void; children: React.ReactNode }> = ({
    config, isSelected, onClick, children
}) => (
    <SelectionCircle isSelected={isSelected} onClick={onClick} colorConfig={config} className="daily-log-mood-circle" toggle>
        <span className="min-w-0 max-w-full px-1 text-[clamp(7px,2.5vw,9px)] font-black uppercase leading-[1.1] tracking-[0.08em] text-center [overflow-wrap:anywhere]">{children}</span>
    </SelectionCircle>
);

const FlowCircle: React.FC<{ isSelected: boolean; onClick: () => void; label: string; dotClass: string }> = ({
    isSelected, onClick, label, dotClass
}) => {
    const config = { color: '#fb7185', dark: '#9f1239', shadow: 'rgba(251, 113, 133, 0.4)' };
    return (
        <SelectionCircle isSelected={isSelected} onClick={onClick} colorConfig={config} className="daily-log-flow-circle" toggle>
            <div className="flex flex-col items-center gap-1">
                <div className={`${dotClass} rounded-full transition-colors ${isSelected ? 'bg-rose-600' : 'bg-rose-300'}`} />
                <span className="text-[9px] font-black uppercase tracking-[0.05em]">{label}</span>
            </div>
        </SelectionCircle>
    );
};

const ActionCircle: React.FC<{ onClick: () => void; label: string; icon: React.ReactNode }> = ({
    onClick, label, icon
}) => {
    const config = { color: '#fb7185', dark: '#9f1239', shadow: 'rgba(251, 113, 133, 0.3)' };
    return (
        <SelectionCircle isSelected={false} onClick={onClick} colorConfig={config} className="daily-log-action-circle">
            <div className="flex flex-col items-center gap-1">
                {icon}
                <span className="text-[9px] font-black uppercase tracking-[0.05em]">{label}</span>
            </div>
        </SelectionCircle>
    );
};

export default DailyLogPanel;

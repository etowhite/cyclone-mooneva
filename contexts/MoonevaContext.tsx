import { useCycloneAppearance } from '../services/cycloneAppearance';
import { dailySuggestions, hasCycleForSuggestions } from '../services/dailySuggestions';
import i18n from '../services/i18n';

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { App } from '@capacitor/app';
import { usePersistence } from '../hooks/usePersistence';
import { useMoonevaModel } from '../hooks/useMoonevaModel';
import type { MoonevaModel } from '../hooks/useMoonevaModel';
import { DailyLog, AppSettings, PeriodRecord } from '../types';
import Logger from '../services/logger';
import { getCycleVisibility } from '../services/logic/settingsInterlocks';
import { toLocalISOString, diffInDays, addDays } from '../utils/dateUtils';
import { PICKER_SESSION_KEY, PICKER_GRACE_PERIOD_MS } from '../utils/pickerSession';

// Define the shape of our global context
interface MoonevaContextType {
    // Data State
    logs: Record<string, DailyLog>;
    periods: PeriodRecord[];
    settings: AppSettings;
    isLoading: boolean;
    loadError: boolean;

    // Derived Logic (The Model)
    model: MoonevaModel;

    // Actions (Mutations)
    actions: {
        updateLog: (date: string, data: DailyLog) => Promise<void>;
        updateSettings: (newSettings: AppSettings) => void;
        runBackupNow: () => Promise<'written' | 'skipped' | 'failed'>;
        completeOnboarding: (newSettings: AppSettings, initialLog?: { date: string, log: DailyLog }) => Promise<void>;
        startPeriod: (startDate: string, days?: number, isWithdrawalBleed?: boolean) => Promise<void>;
        toggleBleedingDay: (date: string, effectivePeriodLength?: number) => Promise<void>;
        updatePeriodWithdrawalBleed: (id: string, isWithdrawalBleed: boolean) => Promise<void>;
        updatePeriodIgnoreForAverages: (id: string, ignoreForAverages: boolean) => Promise<void>;
        restorePeriods: (snapshot: PeriodRecord[], logsSnapshot?: Record<string, DailyLog>) => void;
    };
}

const MoonevaContext = createContext<MoonevaContextType | undefined>(undefined);

export const MoonevaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Persistence Layer (Load/Save)
    const {
        logs,
        settings,
        loading,
        loadError,
        updateLog,
        updateSettings,

        startPeriod,
        toggleBleedingDay,
        updatePeriodWithdrawalBleed,
        updatePeriodIgnoreForAverages,
        restorePeriods,
        periods
    } = usePersistence();

    // 2. Logic Layer (Derived State)
    const model = useMoonevaModel(logs, periods, settings);

    // Sync Smart Notifications (Side Effect)
    React.useEffect(() => {
        if (loading) return;

        let cancelled = false;

        // Sync notifications whenever settings or the cycle model change.
        import('../services/notifications')
            .then(({ syncReminderNotifications }) => {
                if (cancelled) return;
                return syncReminderNotifications(settings, model.cycleModel);
            })
            .catch(() => {
                if (!cancelled) Logger.warn('Failed to sync reminder notifications');
            });

        return () => {
            cancelled = true;
        };
    }, [loading, settings, model.cycleModel]);

    // Remove reminders left by the discontinued experimental feature.
    React.useEffect(() => { if (!loading) import('@capacitor/local-notifications').then(({LocalNotifications}) => LocalNotifications.cancel({notifications:[140,141,142,143].map(id=>({id}))})).catch(()=>{}); },[loading]);

    // Sync App Icon (Discrete Mode)
    React.useEffect(() => {
        import('../services/appIcon').then(({ default: AppIcon }) => {
            AppIcon.setIcon({ name: settings.discreteMode ? 'Todo' : 'Default' })
                .catch(err => Logger.warn('Failed to set app icon:', err));
        });
    }, [settings.discreteMode]);

    // Dated snapshots use the same model and suggestions as the calendar.
    const { appearance } = useCycloneAppearance();
    React.useEffect(() => {
        if (loading || loadError) return;
        const today = toLocalISOString(new Date());
        const ru = i18n.language.startsWith('ru');
        const clean = (text: string) => text.replace(/\p{Extended_Pictographic}/gu, '').trim();
        const snapshots = Array.from({length:70}, (_,offset) => {
            const date=addDays(today,offset), status=model.getDayStatus(date), meta=model.getDayMeta(date);
            const day=model.cycleModel.at(date);
            const suggestions=hasCycleForSuggestions(status) ? dailySuggestions(date,status,i18n.language,settings.predictionsPaused || settings.isOnBirthControl || !!meta.isPregnancy) : [];
            const until=day.nextStart ? diffInDays(day.nextStart,date) : -1;
            return {date, title:clean(status.dayOfCycle ? (ru?'День ':'Day ')+status.dayOfCycle : status.title),
                phase:clean(status.subtitle), forecast: clean(meta.isPregnancy ? status.title : meta.isBleeding ? (ru?'Месячные идут':'Period ongoing') : until>0 ? (ru?'Следующие месячные: через ':'Next period: ')+until+(ru?' дн.':' d') : status.title),
                work:suggestions[0]?.text??'',sport:suggestions[1]?.text??'',mood:suggestions[2]?.text??''};
        });
        import('../services/widgetSync').then(({WidgetSync})=>WidgetSync.updateWidgetData({
            cycleDay:model.getDayMeta(today).dayOfCycle??-1,cycleLength:model.cycleModel.rules.cycleLength,
            daysUntilPeriod:-1,daysUntilOvulation:-1,currentPhase:'follicular',discreteMode:false,
            snapshots:JSON.stringify(snapshots),palette:appearance.palette,mode:appearance.mode,language:ru?'ru':'en'
        })).catch(err=>Logger.warn('Widget sync unavailable:',err));
    }, [loading,loadError,settings,model,appearance.palette,appearance.mode]);

    // Automatic Encrypted Backup to the user's chosen folder
    // Backgrounding is the trigger because it is the last reliable moment before
    // Android may kill the WebView. runAutoBackup decides whether this particular
    // event is actually due - most are not.
    // A run takes seconds, during which any log edit re-runs this effect. Reading
    // the live state through a ref means the run's result is still recorded
    // afterwards - dropping it would hide a permanent failure from Settings.
    //
    // Known one-render-cycle window: the ref is refreshed after commit, so a
    // settings change made in the same tick the backup promise resolves can be
    // overwritten by the merge below. Closing it properly needs functional
    // updates (updateSettings(prev => ...)), which usePersistence does not expose.
    // The window only opens right after backgrounding, when the user is not in
    // the app, so it is left as-is deliberately.
    const backupState = React.useRef({ settings, logs, periods, updateSettings, loaded: !loading && !loadError });
    React.useEffect(() => {
        backupState.current = { settings, logs, periods, updateSettings, loaded: !loading && !loadError };
    });

    React.useEffect(() => {
        if (loading) return;

        const listener = App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) return;

            const { settings: live, logs: liveLogs, periods: livePeriods } = backupState.current;
            if (!live.autoBackupEnabled || !live.autoBackupTarget) return;

            // Opening a share sheet or file picker also backgrounds the app. Writing
            // into the destination folder while the user has a picker open on it is
            // asking for trouble, and this is not a real "user left the app" event.
            const pickerTime = Number(sessionStorage.getItem(PICKER_SESSION_KEY) || 0);
            if (pickerTime && Date.now() - pickerTime < PICKER_GRACE_PERIOD_MS) return;

            Promise.all([import('../services/autoBackup')])
                .then(async ([{ runAutoBackup }]) => runAutoBackup(live, {
                    data: liveLogs,
                    periods: livePeriods,
                    settings: live,
                    timestamp: new Date().toISOString(),
                }))
                .then(({ status, ...bookkeeping }) => {
                    // A skipped run changed nothing, so writing settings back would
                    // only churn storage on every single backgrounding.
                    if (status === 'skipped') return;
                    const current = backupState.current;
                    current.updateSettings({ ...current.settings, ...bookkeeping });
                })
                .catch(err => Logger.warn('Automatic backup failed', err));
        });

        return () => { listener.then(l => l.remove()).catch(() => {}); };
    }, [loading]);

    /**
     * "Back up now". Uses the live state, like the background trigger, so an edit still
     * inside the 1 s save delay is included. Only when the load did not finish cleanly
     * does it read from disk instead, because empty in-memory data must never be backed up.
     *
     * `force` skips the once-a-day and nothing-changed gates, not the in-flight lock.
     */
    const runBackupNow = useCallback(async (): Promise<'written' | 'skipped' | 'failed'> => {
        const { settings: live, logs: liveLogs, periods: livePeriods, loaded } = backupState.current;
        const [{ runAutoBackup }, { loadData, loadPeriods }] = await Promise.all([
            import('../services/autoBackup'),
            import('../services/logic/storage'),
        ]);
        const { status, ...bookkeeping } = await runAutoBackup(live, {
            data: loaded ? liveLogs : await loadData(),
            periods: loaded ? livePeriods : await loadPeriods(),
            settings: live,
            timestamp: new Date().toISOString(),
        }, Date.now(), true);

        if (status !== 'skipped') {
            const current = backupState.current;
            current.updateSettings({ ...current.settings, ...bookkeeping });
        }
        return status;
    }, []);

    // 3. Construct the refined context value
    const completeOnboarding = useCallback(async (
        newSettings: AppSettings,
        initialLog?: { date: string, log: DailyLog }
    ) => {
        updateSettings(newSettings);
        if (initialLog) {
            await updateLog(initialLog.date, initialLog.log);
            if (initialLog.log.flow) {
                // Pass explicit length and birth-control status to avoid a race with the state update
                await startPeriod(initialLog.date, newSettings.periodLength, newSettings.isOnBirthControl);
            }
        }
    }, [updateSettings, updateLog, startPeriod]);

    const actions = useMemo(() => ({
        updateLog,
        updateSettings,
        completeOnboarding,
        runBackupNow,
        startPeriod,
        toggleBleedingDay,
        updatePeriodWithdrawalBleed,
        updatePeriodIgnoreForAverages,
        restorePeriods
    }), [
        updateLog,
        updateSettings,
        completeOnboarding,
        runBackupNow,
        startPeriod,
        toggleBleedingDay,
        updatePeriodWithdrawalBleed,
        updatePeriodIgnoreForAverages,
        restorePeriods
    ]);

    const value: MoonevaContextType = useMemo(() => ({
        logs,
        periods,
        settings,
        isLoading: loading,
        loadError,
        model,
        actions
    }), [logs, periods, settings, loading, loadError, model, actions]);

    return (
        <MoonevaContext.Provider value={value}>
            {children}
        </MoonevaContext.Provider>
    );
};

// Hook Helper
export const useMooneva = () => {
    const context = useContext(MoonevaContext);
    if (!context) {
        throw new Error("useMooneva must be used within a MoonevaProvider");
    }
    return context;
};

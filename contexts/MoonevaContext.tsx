
import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { App } from '@capacitor/app';
import { usePersistence } from '../hooks/usePersistence';
import { useMoonevaModel } from '../hooks/useMoonevaModel';
import type { MoonevaModel } from '../hooks/useMoonevaModel';
import { DailyLog, AppSettings, PeriodRecord } from '../types';
import Logger from '../services/logger';
import { getCycleVisibility } from '../services/logic/settingsInterlocks';
import { toLocalISOString, diffInDays } from '../utils/dateUtils';
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

    // Sync the Lab reminder (seam S6). Runs only while Lab is on, so Lab-off users never load
    // Lab code. Discrete mode stays in the deps: turning it on makes the sync cancel the reminder.
    const { labEnabled, discreteMode, discreetNotifications } = settings;
    React.useEffect(() => {
        if (loading || labEnabled !== true) return;

        let cancelled = false;

        import('../services/lab')
            .then(({ syncLabReminderFromStore }) => {
                if (cancelled) return;
                return syncLabReminderFromStore(periods, logs, { labEnabled, discreteMode, discreetNotifications });
            })
            .catch(() => {
                if (!cancelled) Logger.warn('Failed to sync Lab reminder');
            });

        return () => {
            cancelled = true;
        };
    }, [loading, labEnabled, discreteMode, discreetNotifications, periods, logs]);

    // Sync App Icon (Discrete Mode)
    React.useEffect(() => {
        import('../services/appIcon').then(({ default: AppIcon }) => {
            AppIcon.setIcon({ name: settings.discreteMode ? 'Todo' : 'Default' })
                .catch(err => Logger.warn('Failed to set app icon:', err));
        });
    }, [settings.discreteMode]);

    // Sync Android Widget Data
    React.useEffect(() => {
        // Before the data has loaded (or after a failed load) every value would be "--".
        if (loading || loadError) return;
        import('../services/widgetSync').then(({ WidgetSync }) => {
            const today = toLocalISOString(new Date());
            const todayMeta = model.getDayMeta(today);
            const vis = getCycleVisibility(settings);

            // -1 = no cycle day today (stale, paused, no data): the widget shows "Day --".
            const cycleDay = todayMeta.dayOfCycle ?? -1;
            // The length the forecast really uses (adaptive and clamps applied), not the setting.
            const cycleLength = model.cycleModel.rules.cycleLength;

            // Days until the forecast period. 0 = due today or overdue, -1 = no forecast
            // (stale, paused, no data): the widget shows "P: --" (CycleBarWidgetProvider).
            const { nextPeriod, ovulationNext } = model.cycleModel;
            const daysUntilPeriod = nextPeriod ? Math.max(0, diffInDays(nextPeriod.start, today)) : -1;

            // Determine current phase
            let currentPhase: 'period' | 'fertile' | 'ovulation' | 'luteal' | 'follicular' | 'pms' = 'follicular';
            if (todayMeta.isPeriod) {
                currentPhase = 'period';
            } else if (todayMeta.isOvulation) {
                currentPhase = 'ovulation';
            } else if (todayMeta.isFertile) {
                currentPhase = 'fertile';
            } else if (todayMeta.isPMS) {
                currentPhase = 'pms';
            }

            WidgetSync.updateWidgetData({
                cycleDay,
                cycleLength,
                daysUntilPeriod,
                currentPhase,
                // -1 = hidden or unknown: the widget shows "O: --" (CycleBarWidgetProvider).
                daysUntilOvulation: vis.ovulation && ovulationNext ? diffInDays(ovulationNext, today) : -1,
                discreteMode: settings.discreteMode ?? false
            }).catch(err => Logger.warn('Failed to sync widget data:', err));
        }).catch(() => {
            // Plugin not available (e.g., web platform) - silently ignore
        });
        // ponytail: depends on the cycle model/settings, not getDayMeta's identity (which
        // changes on every log edit, including notes unrelated to the widget's phase
        // display) - getDayMeta is still called fresh above, so this only narrows how
        // often the sync runs, not what it computes when it does.
    }, [loading, loadError, settings, model.cycleModel]);

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

            Promise.all([import('../services/autoBackup'), import('../services/lab')])
                .then(async ([{ runAutoBackup }, { loadLabForBackup }]) => runAutoBackup(live, {
                    data: liveLogs,
                    periods: livePeriods,
                    settings: live,
                    timestamp: new Date().toISOString(),
                    lab: await loadLabForBackup(),
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
        const [{ runAutoBackup }, { loadData, loadPeriods }, { loadLabForBackup }] = await Promise.all([
            import('../services/autoBackup'),
            import('../services/logic/storage'),
            import('../services/lab'),
        ]);
        const { status, ...bookkeeping } = await runAutoBackup(live, {
            data: loaded ? liveLogs : await loadData(),
            periods: loaded ? livePeriods : await loadPeriods(),
            settings: live,
            timestamp: new Date().toISOString(),
            lab: await loadLabForBackup(),
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

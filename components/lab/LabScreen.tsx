// The Lab tab. One screen with internal sub-screens: home, log, history, labSettings.
// Each sub-screen except home registers pushBackInterceptor, so Android back returns to Lab home
// (or to History when an entry was opened from there) instead of leaving the tab.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../ScreenWrapper';
import BottomNav from '../BottomNav';
import { useMooneva } from '../../contexts/MoonevaContext';
import { useLab } from '../../hooks/useLabStore';
import { cancelLabReminder, syncLabReminder } from '../../services/lab/reminder';
import { pushBackInterceptor, type SubViewType, type ViewType } from '../../hooks/useAppNavigation';
import { parseLocalDateTime, type LabEvent } from '../../services/logic/lab';
import { ConfirmDialog, PrimaryButton, SecondaryButton } from './ui';
import { DevicePickerDialog } from './DevicePicker';
import { HistoryScreen } from './HistoryScreen';
import { LabHome } from './LabHome';
import { LabSettingsScreen } from './LabSettingsScreen';
import { LogScreen } from './LogScreen';

export interface LabScreenProps {
    setSubView: (view: SubViewType) => void;
    setView: (view: ViewType) => void;
    isCloaked: boolean;
}

const FUTURE_WATCH_MS = 10 * 60_000;

type Sub = 'home' | 'log' | 'history' | 'labSettings';

const LabScreen: React.FC<LabScreenProps> = ({ setSubView, setView, isCloaked }) => {
    const { t } = useTranslation();
    const { status, data, actions } = useLab();
    const { periods, settings, logs } = useMooneva();
    const [screen, setScreen] = useState<Sub>('home');
    const [editing, setEditing] = useState<LabEvent | undefined>();
    const [logReturn, setLogReturn] = useState<Sub>('home');
    const [pickingDevice, setPickingDevice] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    // The reminder is rescheduled when something it depends on changes: entries, devices, the
    // reminder settings, periods, logs (pregnancy hides Lab) and the Settings switches. Not on
    // blood-share changes. The app-level effect in MoonevaContext covers changes made while this
    // screen is not open.
    const { labEnabled, discreteMode, discreetNotifications } = settings;
    const { events, devices } = data;
    const { reminderOn, reminderLeadMin } = data.settings;
    // A future entry (the form allows up to 5 minutes ahead) only becomes the newest once its time
    // comes, so bump this counter then to sync again.
    const [clock, setClock] = useState(0);
    useEffect(() => {
        const now = Date.now();
        let next = Infinity;
        for (const e of events) {
            const at = parseLocalDateTime(e.at)?.getTime();
            if (at !== undefined && at > now && at < next) next = at;
        }
        if (next - now > FUTURE_WATCH_MS) return;
        const timer = setTimeout(() => setClock(c => c + 1), next - now + 1000);
        return () => clearTimeout(timer);
    }, [events, clock]);
    useEffect(() => {
        if (status !== 'ready') return;
        void syncLabReminder({
            labData: data, periods, logs,
            settings: { labEnabled, discreteMode, discreetNotifications },
            now: new Date(),
        });
    }, [status, events, devices, reminderOn, reminderLeadMin, periods, logs, labEnabled, discreteMode, discreetNotifications, clock]);

    const leave = useCallback(() => {
        setScreen(s => (s === 'log' ? logReturn : 'home'));
        setEditing(undefined);
    }, [logReturn]);

    useEffect(() => {
        // The log screen registers its own interceptor (it asks before discarding).
        if (screen === 'home' || screen === 'log') return;
        return pushBackInterceptor(leave);
    }, [screen, leave]);

    const openLog = (event?: LabEvent) => {
        setEditing(event);
        setLogReturn(event ? 'history' : 'home');
        setScreen('log');
    };

    const body = (() => {
        if (status === 'failed') return (
            <div className="px-6 py-10 text-center">
                <p role="alert" className="text-sm text-slate-600 mb-4">{t('lab.load_failed')}</p>
                <div className="flex flex-col gap-3">
                    <PrimaryButton onClick={() => { void actions.retryLoad(); }}>{t('lab.load_retry')}</PrimaryButton>
                    <SecondaryButton onClick={() => setConfirmReset(true)}>{t('lab.reset')}</SecondaryButton>
                </div>
            </div>
        );
        if (status !== 'ready') return null;
        switch (screen) {
            case 'log':
                return <LogScreen editing={editing} onCancel={leave} onDone={leave} />;
            case 'history':
                return <HistoryScreen onEdit={openLog} onBack={leave} />;
            case 'labSettings':
                return <LabSettingsScreen onBack={leave} />;
            default:
                return (
                    <LabHome
                        // With no device yet, the first Log tap opens the device picker.
                        onLog={() => (data.devices.length === 0 ? setPickingDevice(true) : openLog())}
                        onHistory={() => setScreen('history')}
                        onSettings={() => setScreen('labSettings')}
                    />
                );
        }
    })();

    return (
        <ScreenWrapper>
            <div className="lab-screen-scroll flex-1 overflow-y-auto pb-32 px-[max(0px,calc((100%_-_34rem)/2))]">{body}</div>
            {confirmReset && (
                <ConfirmDialog
                    title={t('lab.reset_title')}
                    message={t('lab.reset_body')}
                    confirmLabel={t('lab.reset')}
                    cancelLabel={t('common.cancel')}
                    onConfirm={() => { setConfirmReset(false); void actions.resetLabData().then(cancelLabReminder); }}
                    onCancel={() => setConfirmReset(false)}
                />
            )}
            {pickingDevice && (
                <DevicePickerDialog
                    onCancel={() => setPickingDevice(false)}
                    onAdd={device => {
                        actions.addDevice(device);
                        setPickingDevice(false);
                        openLog();
                    }}
                />
            )}
            <BottomNav
                currentView="lab"
                onViewChange={(v) => {
                    setSubView('main');
                    if (v === 'lab') setScreen('home');
                    else setView(v);
                }}
                onSettingsClick={() => {
                    setSubView('main');
                    setView('settings');
                }}
                isCloaked={isCloaked}
            />
        </ScreenWrapper>
    );
};

export default LabScreen;

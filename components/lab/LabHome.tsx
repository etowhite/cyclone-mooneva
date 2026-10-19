// Lab home: header with History and Settings icons, period prompt, device timer (or idle card), Log button, blood gauge, per-period charts.
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMooneva } from '../../contexts/MoonevaContext';
import { useLab } from '../../hooks/useLabStore';
import {
    currentPeriodWithGrace, eventsInPeriod, labSession, periodBlood, periodPromptFor, previousPeriodWithEntries,
} from '../../services/logic/lab';
import { getTodayStr } from '../../utils/dateUtils';
import { useDisplayFormat } from '../../services/displayFormat';
import { BloodGauge } from './BloodGauge';
import { DeviceSwitchDialog } from './DeviceSwitchDialog';
import { IdleCard } from './IdleCard';
import LabTrendsCards from './LabTrendsCards';
import { PeriodPromptCard } from './PeriodPromptCard';
import { localDateTime } from './labTime';
import { TimerCard } from './TimerCard';
import { Card, IconButton, Icons, LabHeader, PrimaryButton } from './ui';


interface LabHomeProps {
    onLog: () => void;
    onHistory: () => void;
    onSettings: () => void;
}

export const LabHome: React.FC<LabHomeProps> = ({ onLog, onHistory, onSettings }) => {
    const { t } = useTranslation();
    const fmt = useDisplayFormat();
    const { periods, model, actions } = useMooneva();
    const { data, actions: labActions } = useLab();
    const [switching, setSwitching] = useState(false);

    // Re-read the clock every minute and when the page becomes visible again, so the timer moves.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const tick = () => setNow(new Date());
        const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
        const id = setInterval(tick, 60_000);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    const today = getTodayStr();
    const prompt = periodPromptFor(today, periods, model.getDayMeta(today).isBleeding, data.events);
    const inUse = data.devices.find(d => d.isActive);
    const session = useMemo(() => labSession(data.events, now, periods, inUse, data.settings.stoppedAt), [data.events, now, periods, inUse, data.settings.stoppedAt]);

    const currentPeriod = currentPeriodWithGrace(periods, today);
    const lastPeriod = previousPeriodWithEntries(data.events, periods, today);
    // The "no device in use" card shows for 24 h after the last entry, or while a period runs. Then the idle card.
    const fraction = data.settings.bloodFraction;
    const current = useMemo(
        () => (currentPeriod ? periodBlood(eventsInPeriod(data.events, currentPeriod, periods), fraction) : undefined),
        [currentPeriod, data.events, periods, fraction],
    );
    const last = useMemo(
        () => (lastPeriod ? periodBlood(eventsInPeriod(data.events, lastPeriod, periods), fraction) : undefined),
        [lastPeriod, data.events, periods, fraction],
    );
    const showGauge = (current && current.eventCount > 0) || !!last;

    return (
        <>
            <LabHeader
                title={t('lab.title')}
                right={(
                    <>
                        <IconButton label={t('lab.home.history')} onClick={onHistory}><Icons.History /></IconButton>
                        <IconButton label={t('lab.home.settings')} onClick={onSettings}><Icons.Sliders /></IconButton>
                    </>
                )}
            />
            <div className="px-4 pt-2 space-y-4">
                {session.state === 'active' ? (
                    <TimerCard
                        timer={session}
                        deviceType={inUse?.type ?? session.last.deviceType}
                        deviceName={(inUse ?? data.devices.find(d => d.id === session.last.deviceId))?.name}
                        now={now}
                        onEditDevice={() => setSwitching(true)}
                        onLog={onLog}
                        onStop={() => labActions.updateLabSettings({ stoppedAt: localDateTime(now) })}
                    />
                ) : (
                    <IdleCard inPeriod={!!currentPeriod} stopped={!!currentPeriod && session.state === 'stopped' && !!current && current.eventCount > 0} />
                )}

                {prompt !== 'none' && (
                    <PeriodPromptCard
                        kind={prompt}
                        onConfirm={() => { void actions.toggleBleedingDay(today, model.cycleModel.rules.periodLength); }}
                    />
                )}

                <PrimaryButton className="w-full flex items-center justify-center gap-2 !py-4 text-base" onClick={onLog}>
                    <Icons.Plus />
                    {t('lab.home.log')}
                </PrimaryButton>

                {showGauge && <BloodGauge current={current} last={last} />}

                <LabTrendsCards periods={periods} />
            </div>
            {switching && (
                <DeviceSwitchDialog
                    devices={data.devices}
                    currentId={inUse?.id ?? (session.state === 'active' ? session.last.deviceId : undefined)}
                    onClose={() => setSwitching(false)}
                    onSelect={d => { labActions.setActiveDevice(d.id); setSwitching(false); }}
                />
            )}
        </>
    );
};

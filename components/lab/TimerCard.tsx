// Device timer card. Remaining minutes round up, so a countdown never shows less time than is left.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, useDisplayFormat } from '../../services/displayFormat';
import type { DeviceTimer, DeviceType } from '../../services/logic/lab';
import { DEVICE_ICON } from './DeviceSwitchDialog';
import { CupSVG, DiscSVG, PadSVG, TamponSVG } from './DeviceSVGs';
import { Card, FLUID_COLOR, Icons, PrimaryButton, SecondaryButton, SHADOW_INSET } from './ui';
import './drop.css';

interface TimerCardProps {
    timer: DeviceTimer & { overdue: boolean };
    deviceType: DeviceType;
    deviceName?: string;
    now: Date;
    onEditDevice: () => void;
    onLog: () => void;
    onStop: () => void;
}

const URGENT_MINUTES = 15;
/** Overdue by more than this, nobody is still wearing it: the card asks instead of shouting. It never goes away on its own. */
const STALE_OVERDUE_HOURS = 24;

export const TimerCard: React.FC<TimerCardProps> = ({ timer, deviceType, deviceName, now, onEditDevice, onLog, onStop }) => {
    const { t } = useTranslation();
    const fmt = useDisplayFormat();
    const { percentage, fullAt, overdue } = timer;

    const name = deviceName || t('lab.devices.removed');
    const remainingMs = fullAt.getTime() - now.getTime();
    const totalMinutes = Math.ceil(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const isUrgent = overdue || totalMinutes <= URGENT_MINUTES;
    const remainingText = hours > 0
        ? t('lab.home.duration_hm', { hours: formatNumber(hours), minutes: formatNumber(minutes) })
        : t('lab.home.duration_m', { minutes: formatNumber(Math.max(0, minutes)) });

    const lateMinutes = Math.max(0, Math.floor(-remainingMs / 60000));
    const lateHours = Math.floor(lateMinutes / 60);
    const stale = (overdue || totalMinutes <= 0) && lateHours >= STALE_OVERDUE_HOURS;
    const lateDays = Math.floor(lateHours / 24);
    // Past a day it reads in days: "11d 2h", not "266h 14m".
    const overdueText = lateDays > 0
        ? t('lab.home.duration_dh', { days: formatNumber(lateDays), hours: formatNumber(lateHours % 24) })
        : lateHours > 0
            ? t('lab.home.duration_hm', { hours: formatNumber(lateHours), minutes: formatNumber(lateMinutes % 60) })
            : t('lab.home.duration_m', { minutes: formatNumber(lateMinutes) });

    const DeviceIcon = DEVICE_ICON[deviceType];
    const Device = deviceType === 'cup' ? CupSVG : deviceType === 'disc' ? DiscSVG : deviceType === 'pad' ? PadSVG : TamponSVG;

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onEditDevice}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={t('lab.home.change_device_in_use', 'Change device in use')}
                    >
                        <DeviceIcon className="w-4 h-4" />
                        <span className="truncate max-w-[13rem]">{name}</span>
                        <Icons.Edit />
                    </button>
                    {stale ? null : overdue || totalMinutes <= 0 ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
                            {t('lab.home.overdue')}
                        </span>
                    ) : (
                    <span className="lab-active-pill flex items-center gap-1.5 rounded-full bg-[#8aacac]/20 px-2.5 py-1 text-xs font-semibold text-[#4a6b73]">
                        <span className="h-2 w-2 rounded-full bg-[#5b7a82]" aria-hidden="true" />
                        {t('lab.home.active')}
                    </span>
                    )}
                </div>

                <div className="relative flex flex-col items-center justify-center" style={{ minHeight: '140px', paddingTop: '20px' }}>
                    <div className="lab-drop-wrap" aria-hidden="true">
                        <svg className="lab-drop" viewBox="6 0 28 40"><path d="M20 2C20 2 6 17 6 26a14 14 0 0 0 28 0C34 17 20 2 20 2Z" fill={FLUID_COLOR} /></svg>
                    </div>
                    <div className="relative z-10">
                        <Device percent={percentage} fillColor={FLUID_COLOR} showPercentage={false} />
                    </div>
                    {!(overdue || totalMinutes <= 0) && (
                        <span className="mt-2 text-2xl font-extrabold tracking-tight text-slate-700">{formatNumber(Math.round(percentage))}%</span>
                    )}
                </div>

                {stale ? (
                    <div className="lab-paused-note rounded-2xl bg-amber-50 p-3 border border-amber-200 text-amber-700 space-y-3" role="status">
                        <div>
                            <div className="text-sm font-bold">{t('lab.home.stale_title', { time: overdueText })}</div>
                            <div className="text-xs mt-0.5">{t('lab.home.stale_body')}</div>
                        </div>
                        <div className="flex gap-2">
                            <PrimaryButton className="flex-1 !py-2.5 text-sm" onClick={onLog}>{t('lab.home.stale_log')}</PrimaryButton>
                            <SecondaryButton className="flex-1 !py-2.5 text-sm" onClick={onStop}>{t('lab.home.stale_stop')}</SecondaryButton>
                        </div>
                    </div>
                ) : isUrgent ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-3 border border-rose-200" role="status">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-400 text-white"><Icons.Alert /></div>
                        <div className="flex flex-col flex-1">
                            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">{t('lab.home.check_now')}</span>
                            <span className="text-lg font-bold text-rose-700">
                                {overdue || totalMinutes <= 0 ? t('lab.home.overdue_action') : t('lab.home.minutes_left', { minutes: formatNumber(minutes) })}
                            </span>
                            {(overdue || totalMinutes <= 0) && (
                                <span className="text-xs text-rose-700">{t('lab.home.overdue_by', { time: overdueText })}</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 rounded-2xl bg-[#F0F2F5] p-3" style={{ boxShadow: SHADOW_INSET }}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5b7a82] text-white"><Icons.Hourglass /></div>
                        <div className="flex flex-col flex-1">
                            <span className="text-xs font-medium text-slate-400">{t('lab.home.next_check')}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-slate-700">{fmt.time(fullAt)}</span>
                                <span className="text-sm text-slate-400">({t('lab.home.remaining', { time: remainingText })})</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

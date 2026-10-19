// Lab's own settings: devices, blood share, reminder.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../services/displayFormat';
import { useLab } from '../../hooks/useLabStore';
import { requestNotificationPermission } from '../../services/notifications';
import { Toggle } from '../settings/SettingsUI';
import { BLOOD_FRACTION_MAX, BLOOD_FRACTION_MIN, DEFAULT_LAB_SETTINGS, REMINDER_LEAD_MINUTES, type LabDevice } from '../../services/logic/lab';
import { DevicePickerDialog, deviceDetail } from './DevicePicker';
import { DEVICE_ICON } from './DeviceSwitchDialog';
import { Card, ConfirmDialog, Icons, LabHeader, SecondaryButton, SHADOW_SM, selectable } from './ui';


export const LabSettingsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const { data, actions } = useLab();
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<LabDevice | null>(null);
    const percent = Math.round(data.settings.bloodFraction * 100);

    return (
        <>
            <LabHeader title={t('lab.settings.title')} onBack={onBack} />
            <div className="px-4 pt-2 space-y-4">
                <Card className="!p-4 space-y-3">
                    <h2 className="text-xs font-extrabold tracking-[0.12em] text-slate-700 uppercase">{t('lab.settings.devices')}</h2>
                    {data.devices.length === 0 && <p className="text-sm text-slate-400">{t('lab.settings.no_devices')}</p>}
                    <ul className="space-y-2">
                        {data.devices.map(d => {
                            const Icon = DEVICE_ICON[d.type];
                            return (
                                <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3">
                                    <Icon className="w-7 h-7 shrink-0 text-[#4a6b73]" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-700 break-words">{d.name}</div>
                                        <div className="text-xs text-slate-400">{t(`lab.devices.type_${d.type}`)} · {deviceDetail(d, t)}</div>
                                    </div>
                                    {d.isActive ? (
                                        <span className="lab-active-pill flex items-center gap-1 rounded-full bg-[#8aacac]/20 px-2.5 py-1 text-xs font-semibold text-[#4a6b73]">
                                            <Icons.Check />{t('lab.settings.active')}
                                        </span>
                                    ) : (
                                        <button type="button" onClick={() => actions.setActiveDevice(d.id)}
                                            className="rounded-full bg-[#F0F2F5] px-3 py-1.5 text-xs font-semibold text-slate-600">
                                            {t('lab.settings.set_active')}
                                        </button>
                                    )}
                                    <button type="button" aria-label={t('lab.settings.remove_device', { name: d.name })}
                                        onClick={() => setRemoving(d)} className="p-2 text-slate-400"><Icons.Trash /></button>
                                </li>
                            );
                        })}
                    </ul>
                    <SecondaryButton className="w-full" onClick={() => setAdding(true)}>{t('lab.settings.add_device')}</SecondaryButton>
                </Card>

                <Card className="!p-4 space-y-3">
                    <h2 className="text-xs font-extrabold tracking-[0.12em] text-slate-700 uppercase">{t('lab.settings.fraction_title')}</h2>
                    <div className="flex items-center justify-between text-sm">
                        <label htmlFor="lab-fraction" className="text-slate-600">{t('lab.settings.fraction_label')}</label>
                        <span className="font-semibold text-slate-700">{formatNumber(percent)}%</span>
                    </div>
                    <input
                        id="lab-fraction"
                        type="range"
                        min={Math.round(BLOOD_FRACTION_MIN * 100)}
                        max={Math.round(BLOOD_FRACTION_MAX * 100)}
                        step={1}
                        value={percent}
                        onChange={e => actions.updateLabSettings({ bloodFraction: Number(e.target.value) / 100 })}
                        className="lab-range"
                        style={{ '--pct': `${((percent - Math.round(BLOOD_FRACTION_MIN * 100)) / (Math.round(BLOOD_FRACTION_MAX * 100) - Math.round(BLOOD_FRACTION_MIN * 100))) * 100}%` } as React.CSSProperties}
                    />
                    <p className="text-xs text-slate-400">{t('lab.settings.fraction_note', { default: formatNumber(Math.round(DEFAULT_LAB_SETTINGS.bloodFraction * 100)) })}</p>
                </Card>

                <Card className="!p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F0F2F5] flex items-center justify-center text-slate-600" style={{ boxShadow: SHADOW_SM }}><Icons.Bell /></div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-700">{t('lab.settings.reminder')}</div>
                            <div className="text-xs text-slate-400">{t('lab.settings.reminder_desc')}</div>
                        </div>
                        <Toggle label={t('lab.settings.reminder')}
                            active={data.settings.reminderOn}
                            onClick={() => {
                                const on = !data.settings.reminderOn;
                                actions.updateLabSettings({ reminderOn: on });
                                if (on) void requestNotificationPermission();
                            }}
                        />
                    </div>
                    {data.settings.reminderOn && (
                        <div role="group" aria-label={t('lab.settings.lead_title')} className="space-y-2">
                            <div className="text-xs text-slate-600">{t('lab.settings.lead_title')}</div>
                            <div className="flex gap-2">
                                {REMINDER_LEAD_MINUTES.map(min => (
                                    <button key={min} type="button" aria-pressed={data.settings.reminderLeadMin === min}
                                        onClick={() => actions.updateLabSettings({ reminderLeadMin: min })}
                                        className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold ${selectable(data.settings.reminderLeadMin === min).className}`}>
                                        {t(`lab.settings.lead_${min}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {adding && (
                <DevicePickerDialog
                    onCancel={() => setAdding(false)}
                    onAdd={device => { actions.addDevice(device); setAdding(false); }}
                />
            )}
            {removing && (
                <ConfirmDialog
                    title={t('lab.settings.remove_title', { name: removing.name })}
                    message={t('lab.settings.remove_message')}
                    confirmLabel={t('lab.settings.remove_confirm', 'Remove')}
                    cancelLabel={t('common.cancel')}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => {
                        const next = data.devices.find(d => d.id !== removing.id);
                        actions.removeDevice(removing.id);
                        // Keep one device active so Log always has a default.
                        if (removing.isActive && next) actions.setActiveDevice(next.id);
                        setRemoving(null);
                    }}
                />
            )}
        </>
    );
};

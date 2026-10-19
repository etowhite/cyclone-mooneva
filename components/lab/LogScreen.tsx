// "Empty / change device" screen.
// Device, amount and time only. Tags, leaked, experience and notes are dropped (decision D10).
// Saving writes Lab data only. It never touches Cycle's own data.
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../services/displayFormat';
import { pushBackInterceptor } from '../../hooks/useAppNavigation';
import { getTodayStr } from '../../utils/dateUtils';
import { useLab } from '../../hooks/useLabStore';
import { requestNotificationPermission } from '../../services/notifications';
import { DEFAULT_CAPACITY_ML, parseLocalDateTime, type LabDevice, type LabEvent } from '../../services/logic/lab';
import { DateTimeField } from './DateTimeField';
import { DeviceSwitchDialog, DEVICE_ICON } from './DeviceSwitchDialog';
import { FullnessInput } from './FullnessInput';
import { EMPTY_PBAC_DRAFT, PbacInput, toPbacEntry, type PbacDraft } from './PbacInput';
import { localDateTime } from './labTime';
import { Card, ConfirmDialog, Icons, LabHeader, PrimaryButton, SecondaryButton, SHADOW_SM } from './ui';

type Selected = Pick<LabDevice, 'type' | 'capacityMl' | 'absorbency'> & { id: string; name: string };

interface LogScreenProps {
    /** An existing entry to edit. Without it, a new entry is logged. */
    editing?: LabEvent;
    onDone: () => void;
    onCancel: () => void;
}

const isDisposable = (t: Selected['type']): t is 'pad' | 'tampon' => t === 'pad' || t === 'tampon';
const DEFAULT_FULLNESS = 50;
const FUTURE_SLACK_MS = 5 * 60 * 1000;

// Unsaved form of a NEW entry. Module memory only: it survives leaving the screen (tab switch,
// PIN lock, background) but not an app restart. Cleared on save and on discard.
interface Draft {
    device?: Selected; fullness: number; pbac: PbacDraft; touched: boolean; final: boolean;
    showTime: boolean; manualTime: boolean; date: string; time: string;
}
let draft: Draft | null = null;
export const clearLogDraft = () => { draft = null; };

export const LogScreen: React.FC<LogScreenProps> = ({ editing, onDone, onCancel }) => {
    const { t } = useTranslation();
    const { data, actions } = useLab();
    const { devices } = data;

    const saved = editing ? null : draft;
    const [device, setDevice] = useState<Selected | undefined>(() => {
        if (saved?.device && devices.some(d => d.id === saved.device!.id)) return saved.device;
        if (editing) {
            const known = devices.find(d => d.id === editing.deviceId);
            return {
                id: editing.deviceId,
                name: known?.name ?? t('lab.devices.removed'),
                type: editing.deviceType,
                capacityMl: editing.capacityMl,
                absorbency: editing.absorbency,
            };
        }
        return devices.find(d => d.isActive) ?? devices[0];
    });
    const [fullness, setFullness] = useState(saved?.fullness ?? editing?.fullnessPct ?? DEFAULT_FULLNESS);
    const [pbac, setPbac] = useState<PbacDraft>(() => saved?.pbac ?? (editing?.pbac ? { ...editing.pbac } : EMPTY_PBAC_DRAFT));
    // Editing keeps the saved values. A new entry must be touched once, so a default is never saved by accident.
    const [touched, setTouched] = useState(saved?.touched ?? !!editing);
    const [final, setFinal] = useState(saved?.final ?? !!editing?.final);

    const [showTime, setShowTime] = useState(saved?.showTime ?? !!editing);
    const [manualTime, setManualTime] = useState(saved?.manualTime ?? !!editing);
    const [{ date, time }, setWhen] = useState(() => {
        if (saved) return { date: saved.date, time: saved.time };
        const [d, tm] = (editing?.at ?? localDateTime(new Date())).split('T');
        return { date: d, time: tm };
    });

    const [showSwitch, setShowSwitch] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [askDiscard, setAskDiscard] = useState(false);
    const saving = useRef(false);
    const closed = useRef(false);
    // The device a fresh form would start with, so a restored draft that only switched device is still a change.
    const startId = useRef((devices.find(d => d.isActive) ?? devices[0])?.id);

    // Until the user edits the time, it is the current time, so the panel shows what Save stores.
    useEffect(() => {
        if (manualTime || !showTime) return;
        const sync = () => {
            const [d, tm] = localDateTime(new Date()).split('T');
            setWhen(w => (w.date === d && w.time === tm ? w : { date: d, time: tm }));
        };
        sync();
        const timer = setInterval(sync, 1000);
        return () => clearInterval(timer);
    }, [manualTime, showTime]);

    // The error describes the last input. Any change by the user clears it (a time edit does it in
    // the DateTimeField handler, so the clock following along does not).
    useEffect(() => { setError(null); }, [device, fullness, pbac, final]);

    const dirty = !editing && (touched || manualTime || final || device?.id !== startId.current);
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;
    const cancelRef = useRef(onCancel);
    cancelRef.current = onCancel;

    useEffect(() => {
        if (editing || closed.current) return;
        draft = dirty ? { device, fullness, pbac, touched, final, showTime, manualTime, date, time } : null;
    });

    const leave = () => {
        if (dirtyRef.current) setAskDiscard(true); else cancelRef.current();
    };
    const leaveRef = useRef(leave);
    leaveRef.current = leave;

    useEffect(() => pushBackInterceptor(() => leaveRef.current()), []);

    if (!device) {
        return (
            <>
                <LabHeader title={t('lab.log.title')} onBack={onCancel} />
                <p className="px-6 py-10 text-center text-sm text-slate-400">{t('lab.log.no_device')}</p>
            </>
        );
    }

    const Icon = DEVICE_ICON[device.type];
    const title = device.type === 'pad' ? t('lab.log.title_pad', 'Change pad')
        : device.type === 'tampon' ? t('lab.log.title_tampon', 'Change tampon')
        : t('lab.log.title');

    const save = async () => {
        if (saving.current) return;
        saving.current = true;
        try { await doSave(); } finally { saving.current = false; }
    };

    const doSave = async () => {
        // A time the user never touched means "now". While the panel is open it already shows that
        // (kept fresh above), so Save stores what is shown, to within a second.
        const at = manualTime ? `${date}T${time}` : localDateTime(new Date());
        const when = parseLocalDateTime(at);
        if (!when) { setError(t('lab.log.bad_time')); return; }
        if (when.getTime() > Date.now() + FUTURE_SLACK_MS) { setError(t('lab.log.future_time')); return; }

        let amount: Pick<LabEvent, 'fullnessPct' | 'pbac'>;
        if (isDisposable(device.type)) {
            const entry = toPbacEntry(pbac);
            if (!entry) { setError(t('lab.log.select_saturation')); return; }
            amount = { pbac: entry };
        } else {
            if (!touched) { setError(t('lab.log.adjust_fullness')); return; }
            amount = { fullnessPct: fullness };
        }

        const fields = {
            at,
            deviceId: device.id,
            deviceType: device.type,
            ...(isDisposable(device.type)
                ? { absorbency: device.absorbency ?? 'regular' as const }
                : { capacityMl: device.capacityMl }),
            ...amount,
            final: final || undefined,
        };

        if (editing) {
            // Clear what the old device type had and the new one does not.
            actions.updateEvent(editing.id, { capacityMl: undefined, absorbency: undefined, fullnessPct: undefined, pbac: undefined, ...fields });
        } else {
            // Ask for notification permission before the first save that can schedule a reminder.
            // It only prompts when permission is not decided yet, and it never rejects.
            if (data.settings.reminderOn) await requestNotificationPermission();
            if (!actions.addEvent(fields)) {
                setError(t('lab.log.save_failed'));
                return;
            }
        }
        closed.current = true;
        draft = null;
        onDone();
    };

    const pill = 'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-slate-600 bg-[#F0F2F5] active:scale-95 transition-all';

    return (
        <>
            <LabHeader title={editing ? t('lab.log.edit_title') : title} onBack={leave} />
            <div className="px-4 pt-2 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <button type="button" className={pill} style={{ boxShadow: SHADOW_SM }} onClick={() => setShowSwitch(true)}>
                        <span aria-hidden="true"><Icon className="w-4 h-4" /></span>
                        {t('lab.log.change_device')}
                    </button>
                    <button type="button" className={`${pill} ${showTime ? 'text-[#4a6b73]' : ''}`} style={{ boxShadow: SHADOW_SM }}
                        aria-expanded={showTime} onClick={() => setShowTime(v => !v)}>
                        <Icons.Clock />
                        {t('lab.log.time')}
                    </button>
                </div>

                {showTime && (
                    <Card className="!p-4">
                        <DateTimeField date={date} time={time} maxDate={getTodayStr()} onChange={(d, tm) => { setWhen({ date: d, time: tm }); setManualTime(true); setError(null); }} />
                    </Card>
                )}

                <Card className="!p-4">
                    <div className="text-center mb-3 text-sm text-slate-400">{device.name}</div>
                    {isDisposable(device.type) ? (
                        <PbacInput product={device.type} draft={pbac} onChange={next => { setPbac(next); setTouched(true); }} />
                    ) : (
                        <>
                            <FullnessInput deviceType={device.type} value={fullness} touched={touched} onTouch={() => setTouched(true)} onChange={n => { setFullness(n); setTouched(true); }} />
                            {touched && (
                                <p className="mt-3 text-center text-xs text-slate-400">
                                    {t('lab.fullness.ml', { ml: formatNumber(Math.round((fullness / 100) * (device.capacityMl || DEFAULT_CAPACITY_ML))) })}
                                </p>
                            )}
                        </>
                    )}
                </Card>

                <label className="flex items-start gap-3 px-1 cursor-pointer">
                    <input type="checkbox" checked={final} onChange={e => setFinal(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#5b7a82]" />
                    <span className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-600">{t('lab.log.final')}</span>
                        <span className="text-xs text-slate-400">{t('lab.log.final_hint')}</span>
                    </span>
                </label>

                {error && <p role="alert" className="text-center text-sm text-rose-700">{error}</p>}

                <div className="flex gap-3 pb-2">
                    <SecondaryButton className="flex-1" onClick={leave}>{t('common.cancel')}</SecondaryButton>
                    <PrimaryButton className="flex-1" onClick={() => { void save(); }}>{t('common.save')}</PrimaryButton>
                </div>
            </div>

            {showSwitch && (
                <DeviceSwitchDialog
                    devices={devices}
                    currentId={device.id}
                    onClose={() => setShowSwitch(false)}
                    onSelect={d => {
                        if (isDisposable(d.type) !== isDisposable(device.type)) setTouched(false);
                        setDevice({ id: d.id, name: d.name, type: d.type, capacityMl: d.capacityMl, absorbency: d.absorbency });
                        setShowSwitch(false);
                    }}
                />
            )}

            {askDiscard && (
                <ConfirmDialog
                    title={t('lab.log.discard_title')}
                    message={t('lab.log.discard_body')}
                    confirmLabel={t('lab.log.discard')}
                    cancelLabel={t('lab.log.keep_editing')}
                    onCancel={() => setAskDiscard(false)}
                    onConfirm={() => { closed.current = true; draft = null; onCancel(); }}
                />
            )}
        </>
    );
};

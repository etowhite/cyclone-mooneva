// A Mooneva disc preset (small or regular), or a custom device (type, name, capacity or absorbency).
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../services/displayFormat';
import { useLab } from '../../hooks/useLabStore';
import { DEFAULT_CAPACITY_ML, MOONEVA_DISCS, NEW_DEVICE_CAPACITY_ML, type MoonevaDisc, type Absorbency, type DeviceType, type LabDevice } from '../../services/logic/lab';
import type { TFunction } from 'i18next';
import { CupIcon, DiscIcon, PadIcon, TamponIcon } from './DeviceIcons';
import { Dialog, FIELD_CLASS, PrimaryButton, SecondaryButton, selectable } from './ui';

export type DeviceDraft = Omit<LabDevice, 'id' | 'isActive'>;

const TYPES: { type: DeviceType; Icon: typeof CupIcon }[] = [
    { type: 'cup', Icon: CupIcon },
    { type: 'disc', Icon: DiscIcon },
    { type: 'pad', Icon: PadIcon },
    { type: 'tampon', Icon: TamponIcon },
];
const ABSORBENCIES: Absorbency[] = ['light', 'regular', 'super', 'maxi'];
const CAP_MIN = 10;
const CAP_MAX = 100;
const capOk = (c: number) => c >= CAP_MIN && c <= CAP_MAX;
const isDisposable = (t: DeviceType) => t === 'pad' || t === 'tampon';
const inputClass = `w-full px-4 py-3 rounded-xl text-sm ${FIELD_CLASS}`;

interface DevicePickerProps {
    /** The Mooneva disc presets to offer (those not already in the device list). */
    presets?: readonly MoonevaDisc[];
    /** Called with the device the user picked or typed, or null while the form is incomplete. */
    onChange: (next: DeviceDraft | null) => void;
}

export const DevicePicker: React.FC<DevicePickerProps> = ({ onChange, presets = MOONEVA_DISCS }) => {
    const { t } = useTranslation();
    const [type, setType] = useState<DeviceType>('disc');
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState(String(NEW_DEVICE_CAPACITY_ML.disc));
    const [absorbency, setAbsorbency] = useState<Absorbency>('regular');
    const [preset, setPreset] = useState<string | null>(null);
    // Once the user types a capacity, a type change keeps it instead of using the new type's default.
    const capacityEdited = useRef(false);

    const emit = (dt: DeviceType, n: string, c: string, a: Absorbency) => {
        const brand = n.trim();
        const cap = Number(c);
        if (!brand || (!isDisposable(dt) && !capOk(cap))) return onChange(null);
        onChange(isDisposable(dt) ? { name: brand, type: dt, absorbency: a } : { name: brand, type: dt, capacityMl: cap });
    };

    const pickType = (dt: DeviceType) => {
        // The preset fills the name itself, so leaving it clears that name. A typed name stays.
        const nextName = preset ? '' : name;
        if (preset) capacityEdited.current = false;
        const nextCap = !isDisposable(dt) && !capacityEdited.current ? String(NEW_DEVICE_CAPACITY_ML[dt as 'cup' | 'disc']) : capacity;
        setType(dt);
        setPreset(null);
        setName(nextName);
        setCapacity(nextCap);
        emit(dt, nextName, nextCap, absorbency);
    };

    const pickPreset = (p: MoonevaDisc) => {
        setType('disc');
        setPreset(p.name);
        setName(p.name);
        setCapacity(String(p.capacityMl));
        onChange({ name: p.name, type: 'disc', capacityMl: p.capacityMl });
    };

    return (
        <div className="space-y-4">
            {presets.map(p => (
                <button key={p.name} type="button" onClick={() => pickPreset(p)} aria-pressed={preset === p.name}
                    className={`w-full p-4 rounded-2xl text-start ${selectable(preset === p.name).className}`}>
                    <div className={`text-sm font-bold ${preset === p.name ? '' : 'text-slate-700'}`}>{p.name}</div>
                    <div className="text-xs text-slate-400">{t('lab.devices.capacity_value', { capacity: formatNumber(p.capacityMl) })}</div>
                </button>
            ))}

            <div className="text-xs font-semibold text-slate-400">{t('lab.devices.add_own')}</div>
            <div className="flex gap-2">
                {TYPES.map(({ type: tp, Icon }) => (
                    <button key={tp} type="button" onClick={() => pickType(tp)} aria-pressed={!preset && type === tp}
                        className={`flex-1 p-3 rounded-2xl flex flex-col items-center gap-1 ${selectable(!preset && type === tp).className}`}>
                        {/* The button's text names the type, so the icon stays out of the accessible name. */}
                        <span aria-hidden="true"><Icon className="w-6 h-6" /></span>
                        <span className="text-xs font-semibold">{t(`lab.devices.type_${tp}`)}</span>
                    </button>
                ))}
            </div>

            {/* With a preset picked the fields stay, filled and read-only, so the dialog keeps its height. */}
            <div className={`space-y-3 ${preset ? 'opacity-70' : ''}`}>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block" htmlFor="lab-device-name">{t('lab.devices.name_label')}</label>
                        <input id="lab-device-name" type="text" value={name} maxLength={50} readOnly={!!preset} className={inputClass}
                            placeholder={t('lab.devices.name_placeholder')}
                            onChange={e => { setName(e.target.value); emit(type, e.target.value, capacity, absorbency); }} />
                    </div>
                    {isDisposable(type) ? (
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block" htmlFor="lab-device-absorbency">{t('lab.devices.absorbency_label')}</label>
                            <select id="lab-device-absorbency" value={absorbency} className={inputClass}
                                onChange={e => { const a = e.target.value as Absorbency; setAbsorbency(a); emit(type, name, capacity, a); }}>
                                {ABSORBENCIES.map(a => <option key={a} value={a}>{t(`lab.devices.absorbency_${a}`)}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block" htmlFor="lab-device-capacity">{t('lab.devices.capacity_label')}</label>
                            <input id="lab-device-capacity" type="number" inputMode="decimal" min={CAP_MIN} max={CAP_MAX} value={capacity} readOnly={!!preset} className={inputClass}
                                onChange={e => { capacityEdited.current = true; setCapacity(e.target.value); emit(type, name, e.target.value, absorbency); }} />
                            {capacity !== '' && !capOk(Number(capacity)) && (
                                <p role="alert" className="mt-1 text-xs text-rose-700">{t('lab.devices.capacity_range')}</p>
                            )}
                        </div>
                    )}
                </div>
        </div>
    );
};

/** Short device summary for lists: "30 mL" or the absorbency word. */
export const deviceDetail = (d: Pick<LabDevice, 'type' | 'capacityMl' | 'absorbency'>, t: TFunction): string =>
    isDisposable(d.type) ? t(`lab.devices.absorbency_${d.absorbency ?? 'regular'}`) : t('lab.devices.capacity_value', { capacity: formatNumber(d.capacityMl ?? DEFAULT_CAPACITY_ML) });

/** The picker in a dialog with Add and Cancel. */
export const DevicePickerDialog: React.FC<{ onAdd: (device: DeviceDraft) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => {
    const { t } = useTranslation();
    const { data } = useLab();
    const [draft, setDraft] = useState<DeviceDraft | null>(null);
    const presets = MOONEVA_DISCS.filter(p => !data.devices.some(d => d.name === p.name && d.type === p.type && d.capacityMl === p.capacityMl));
    return (
        <Dialog
            title={t('lab.devices.add_title')}
            onClose={onCancel}
            footer={(
                <div className="flex gap-3">
                    <SecondaryButton className="flex-1" onClick={onCancel}>{t('common.cancel')}</SecondaryButton>
                    <PrimaryButton className="flex-1" disabled={!draft} onClick={() => draft && onAdd(draft)}>{t('common.add')}</PrimaryButton>
                </div>
            )}
        >
            <DevicePicker onChange={setDraft} presets={presets} />
        </Dialog>
    );
};

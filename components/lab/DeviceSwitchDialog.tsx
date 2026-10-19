// Pick the device for a log entry or the one in use, or add a new one. Uses ui.Dialog.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LabDevice } from '../../services/logic/lab';
import { useLab } from '../../hooks/useLabStore';
import { DevicePickerDialog, deviceDetail, type DeviceDraft } from './DevicePicker';
import { CupIcon, DiscIcon, PadIcon, TamponIcon } from './DeviceIcons';
import { Dialog, PrimaryButton, SecondaryButton, selectable } from './ui';

export const DEVICE_ICON = { cup: CupIcon, disc: DiscIcon, pad: PadIcon, tampon: TamponIcon } as const;

interface DeviceSwitchDialogProps {
    devices: LabDevice[];
    currentId?: string;
    onSelect: (device: LabDevice) => void;
    onClose: () => void;
}

export const DeviceSwitchDialog: React.FC<DeviceSwitchDialogProps> = ({ devices, currentId, onSelect, onClose }) => {
    const { t } = useTranslation();
    const [picked, setPicked] = useState<string | undefined>(currentId);
    const [adding, setAdding] = useState(false);
    const { actions } = useLab();
    const device = devices.find(d => d.id === picked);

    if (adding) {
        return (
            <DevicePickerDialog
                onCancel={() => setAdding(false)}
                onAdd={(draft: DeviceDraft) => {
                    const id = actions.addDevice(draft);
                    if (id) setPicked(id);
                    setAdding(false);
                }}
            />
        );
    }

    return (
        <Dialog
            title={t('lab.switch.title')}
            onClose={onClose}
            footer={(
                <div className="flex gap-3">
                    <SecondaryButton className="flex-1" onClick={onClose}>{t('common.cancel')}</SecondaryButton>
                    <PrimaryButton className="flex-1" disabled={!device} onClick={() => device && onSelect(device)}>{t('lab.switch.select')}</PrimaryButton>
                </div>
            )}
        >
            <ul className="space-y-2 mb-4">
                {devices.map(d => {
                    const Icon = DEVICE_ICON[d.type];
                    return (
                        <li key={d.id}>
                            <button type="button" onClick={() => setPicked(d.id)} aria-pressed={picked === d.id}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-start ${selectable(picked === d.id).className}`}>
                                <span aria-hidden="true" className="shrink-0"><Icon className="w-6 h-6" /></span>
                                <span className="flex flex-col min-w-0">
                                    <span className="text-sm font-semibold truncate">{d.name}</span>
                                    <span className="text-xs text-slate-400">{deviceDetail(d, t)}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <SecondaryButton className="w-full" onClick={() => setAdding(true)}>{t('lab.switch.add_new', 'Add a new device')}</SecondaryButton>
        </Dialog>
    );
};

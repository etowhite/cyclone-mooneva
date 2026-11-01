import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Field } from '../ui/Controls';

interface NumberSettingRowProps {
    label: string;
    description: string;
    icon: string | React.ReactNode;
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    defaultValue: number;
    suffix?: string;
    isLast?: boolean;
    mergeWithPrevious?: boolean;
}

export default function NumberSettingRow({ label, description, icon, value, onChange, min, max, suffix, isLast = false, mergeWithPrevious = false }: NumberSettingRowProps) {
    const { t } = useTranslation();
    return <div className={`cyclone-number-row ${!isLast ? 'border-t border-slate-100' : ''} ${mergeWithPrevious ? 'setting-row-merge-previous' : ''}`}>
        <div className="cyclone-number-label">
            <span aria-hidden="true">{icon}</span>
            <div><span className="cyclone-setting-title">{label}</span><small>{description}</small></div>
        </div>
        <div className="cyclone-number-controls">
            <Button aria-label={`${t('common.decrease', 'Decrease')} ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</Button>
            <Field type="number" aria-label={label} min={min} max={max} value={value} onChange={e => {
                const next = parseInt(e.target.value);
                if (!Number.isNaN(next)) onChange(Math.min(max, Math.max(min, next)));
            }} />
            <Button aria-label={`${t('common.increase', 'Increase')} ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</Button>
            <span className="text-xs">{suffix ?? t('common.days', 'days')}</span>
        </div>
    </div>;
}

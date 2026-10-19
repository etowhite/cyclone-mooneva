// Fullness slider for cups and discs. It has no "leaked" box.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../services/displayFormat';
import { CupSVG, DiscSVG } from './DeviceSVGs';
import { FLUID_COLOR } from './ui';

const MAX = 150;
const OVERFULL_COLOR = '#c0506a';

interface FullnessInputProps {
    deviceType: 'cup' | 'disc';
    value: number;
    onChange: (n: number) => void;
    /** False until the user has set a value. Then no percentage is shown. */
    touched: boolean;
    /** Any pointer down or value key (arrows, Home, End, Page keys) on the slider, even if the value stays the same. */
    onTouch: () => void;
}

const VALUE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/** The word of the nearest tick mark under the slider (Empty 0, Half 50, Full 100, Overfull 150). */
export const fullnessWord = (v: number): 'empty' | 'half' | 'full' | 'overfull' =>
    v > 100 ? 'overfull' : v >= 75 ? 'full' : v >= 25 ? 'half' : 'empty';

export const FullnessInput: React.FC<FullnessInputProps> = ({ deviceType, value, onChange, touched, onTouch }) => {
    const { t } = useTranslation();
    const color = value <= 100 ? FLUID_COLOR : OVERFULL_COLOR;
    const word = t(`lab.fullness.${fullnessWord(value)}`);
    const Device = deviceType === 'cup' ? CupSVG : DiscSVG;

    return (
        <div className="space-y-3">
            <div className="flex justify-center p-2"><Device percent={touched ? value : 0} fillColor={FLUID_COLOR} /></div>
            <div className="flex justify-center">
                {touched ? (
                    <div className="px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ backgroundColor: color }}>{formatNumber(value)}% · {word}</div>
                ) : (
                    <div className="px-3 py-1.5 rounded-full text-sm font-semibold text-slate-600 bg-white border border-slate-200">{t('lab.fullness.prompt', 'Slide to set how full it was')}</div>
                )}
            </div>
            <input
                type="range"
                min={0}
                max={MAX}
                value={value}
                aria-label={t('lab.fullness.label')}
                aria-valuetext={touched ? `${formatNumber(value)}% · ${word}` : t('lab.fullness.prompt', 'Slide to set how full it was')}
                onChange={e => onChange(Number(e.target.value))}
                onPointerDown={onTouch}
                onKeyDown={e => { if (VALUE_KEYS.has(e.key)) onTouch(); }}
                className="lab-range"
                data-untouched={!touched}
                style={{ '--pct': `${(value / MAX) * 100}%` } as React.CSSProperties}
            />
            <div className="flex justify-between text-xs text-slate-400">
                <span>{t('lab.fullness.empty')}</span>
                <span>{t('lab.fullness.half')}</span>
                <span>{t('lab.fullness.full')}</span>
                <span>{t('lab.fullness.overfull')}</span>
            </div>
        </div>
    );
};

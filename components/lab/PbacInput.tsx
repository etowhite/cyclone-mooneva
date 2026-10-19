// PBAC input for pads and tampons: stain pictograms, clot counters, flooding.
// No form library.
import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../services/displayFormat';
import { ML_PER_PBAC_POINT, pbacPoints, type PbacDeviceType, type PbacEntry, type Saturation } from '../../services/logic/lab';
import { selectable } from './ui';

const SATURATIONS: Saturation[] = ['light', 'moderate', 'saturated'];

export interface PbacDraft {
    saturation: Saturation | null;
    clotsSmall: number;
    clotsLarge: number;
    flooding: boolean;
}

export const EMPTY_PBAC_DRAFT: PbacDraft = { saturation: null, clotsSmall: 0, clotsLarge: 0, flooding: false };

/** The finished entry, or null while no stain level is chosen. */
export const toPbacEntry = (d: PbacDraft): PbacEntry | null =>
    d.saturation ? { saturation: d.saturation, clotsSmall: d.clotsSmall, clotsLarge: d.clotsLarge, flooding: d.flooding } : null;

// Soak pictograms drawn in code: a pad seen from above and a tampon with its string, stained
// light (a small spot), moderate (about half) or saturated (almost all of it).
const OUTLINE = '#475569';
const STAIN = '#b4232a';
const TAMPON_STAIN_WIDTH: Record<Saturation, number> = { light: 18, moderate: 38, saturated: 72 };

const SoakPictogram: React.FC<{ product: PbacDeviceType; saturation: Saturation }> = ({ product, saturation }) => {
    const clip = useId();
    if (product === 'pad') return (
        <svg viewBox="0 0 120 60" className="w-full h-full" aria-hidden="true">
            <rect x="4" y="14" width="112" height="32" rx="16" fill="#ffffff" stroke={OUTLINE} strokeWidth="3" />
            {saturation === 'light' && <ellipse cx="60" cy="30" rx="14" ry="5" fill={STAIN} />}
            {saturation === 'moderate' && <path d="M26 30c4-7 14-9 24-7s20 1 26-1 15 1 18 8c-3 6-12 8-20 6s-18 1-28 1-17-1-20-7z" fill={STAIN} />}
            {saturation === 'saturated' && <rect x="10" y="20" width="100" height="20" rx="10" fill={STAIN} />}
        </svg>
    );
    return (
        <svg viewBox="0 0 120 60" className="w-full h-full" aria-hidden="true">
            <defs>
                <clipPath id={clip}><rect x="14" y="20" width="72" height="20" rx="10" /></clipPath>
            </defs>
            <g transform="rotate(-18 60 30)">
                <path d="M86 30c10 0 12 8 20 10s8 6 8 10" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
                <rect x="14" y="20" width="72" height="20" rx="10" fill="#ffffff" />
                <rect x="14" y="20" width={TAMPON_STAIN_WIDTH[saturation]} height="20" fill={STAIN} clipPath={`url(#${clip})`} />
                <rect x="14" y="20" width="72" height="20" rx="10" fill="none" stroke={OUTLINE} strokeWidth="3" />
            </g>
        </svg>
    );
};

const Pictogram: React.FC<{ product: PbacDeviceType; saturation: Saturation; selected: boolean; onClick: () => void }> = ({ product, saturation, selected, onClick }) => {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            aria-label={t('lab.pbac.alt', { product: t(`lab.devices.type_${product}`), saturation: t(`lab.pbac.${saturation}`) })}
            className={`relative w-full aspect-[5/6] rounded-2xl p-3 ${selectable(selected).className}`}
           
        >
            {/* The pictograms are drawn on white, so they sit on a white panel in both themes. */}
            <span className="flex w-full h-full items-center justify-center rounded-xl p-1" style={{ background: '#ffffff' }}>
                <SoakPictogram product={product} saturation={saturation} />
            </span>
            {selected && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#5b7a82] text-white flex items-center justify-center text-[11px]" aria-hidden="true">✓</span>
            )}
        </button>
    );
};

const Counter: React.FC<{ label: string; dot: string; value: number; onChange: (n: number) => void }> = ({ label, dot, value, onChange }) => {
    const { t } = useTranslation();
    const btn = 'w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold active:scale-95 transition-all';
    return (
        <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
                <span className={`rounded-full bg-rose-400 ${dot}`} aria-hidden="true" />
                <span className="text-sm font-medium text-slate-600">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <button type="button" className={btn} aria-label={t('lab.pbac.fewer', { what: label })} onClick={() => onChange(Math.max(0, value - 1))}>-</button>
                <span className="w-8 text-center font-semibold text-slate-700" data-testid={`count-${label}`}>{formatNumber(value)}</span>
                <button type="button" className={btn} aria-label={t('lab.pbac.more', { what: label })} onClick={() => onChange(value + 1)}>+</button>
            </div>
        </div>
    );
};

interface PbacInputProps {
    product: PbacDeviceType;
    draft: PbacDraft;
    onChange: (next: PbacDraft) => void;
}

export const PbacInput: React.FC<PbacInputProps> = ({ product, draft, onChange }) => {
    const { t } = useTranslation();
    const entry = toPbacEntry(draft);
    const points = entry ? pbacPoints(product, entry) : null;

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-sm font-medium text-slate-700">{t('lab.pbac.question')}</h3>
                <p className="text-xs text-slate-400">{t(`lab.pbac.tap_image_${product}`)}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {SATURATIONS.map(s => (
                    <div key={s} className="text-center">
                        <Pictogram product={product} saturation={s} selected={draft.saturation === s} onClick={() => onChange({ ...draft, saturation: s })} />
                        <div className="mt-2 text-xs font-medium text-slate-600">{t(`lab.pbac.${s}`)}</div>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">{t('lab.pbac.clots')}</div>
                <Counter label={t('lab.pbac.small_clots')} dot="w-3 h-3" value={draft.clotsSmall} onChange={n => onChange({ ...draft, clotsSmall: n })} />
                <Counter label={t('lab.pbac.large_clots')} dot="w-4 h-4" value={draft.clotsLarge} onChange={n => onChange({ ...draft, clotsLarge: n })} />
                <label className="flex items-center gap-3 py-1 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={draft.flooding}
                        onChange={e => onChange({ ...draft, flooding: e.target.checked })}
                        className="w-5 h-5 accent-[#5b7a82]"
                    />
                    <span className="text-sm font-medium text-slate-600">{t('lab.pbac.flooding')}</span>
                </label>
            </div>

            {points !== null && (
                <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center" role="status">
                    <div className="text-2xl font-bold text-[#4a6b73]">{formatNumber(points)}</div>
                    <div className="text-sm text-slate-600">
                        {t('lab.pbac.points_rough', { ml: formatNumber(Math.round(points * ML_PER_PBAC_POINT)) })}
                    </div>
                </div>
            )}
        </div>
    );
};

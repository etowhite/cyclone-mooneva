// Estimated blood this period, as a half-circle gauge with a dashed 80 mL line.
// It states an estimate and never grades the user.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../services/displayFormat';
import { REFERENCE_ML, bloodDisplayMl, type PeriodBlood } from '../../services/logic/lab';
import { Card, FLUID_COLOR, Icons } from './ui';

const MAX_SCALE = 120; // mL at the end of the gauge
const RADIUS = 80;
const CIRCUMFERENCE = Math.PI * RADIUS;

const ARC = 'M 20 100 A 80 80 0 0 1 180 100';

const Arc: React.FC<{ ml: number; stroke: string; opacity?: number }> = ({ ml, stroke, opacity }) => (
    <path
        d={ARC}
        fill="none"
        stroke={stroke}
        strokeOpacity={opacity}
        strokeLinecap="round"
        strokeWidth="18"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(ml / MAX_SCALE, 1))}
        className="transition-all duration-1000 ease-out"
    />
);

/** `current`: this period (red arc). `last`: the previous period with entries (faded gray arc behind). */
export const BloodGauge: React.FC<{ current?: PeriodBlood; last?: PeriodBlood }> = ({ current, last }) => {
    const { t } = useTranslation();
    const [showInfo, setShowInfo] = useState(false);

    const shown = bloodDisplayMl((current ?? last)!);
    const lastMl = last ? bloodDisplayMl(last).totalMl : 0;
    const total = shown.totalMl;
    // Reference line: 80 of 120 mL, measured along the half circle
    const angle = Math.PI * (1 - REFERENCE_ML / MAX_SCALE);
    const point = (r: number) => ({ x: 100 + r * Math.cos(angle), y: 100 - r * Math.sin(angle) });
    const from = point(62);
    const to = point(98);
    const label = point(106);
    const hasPbac = shown.pbacMl > 0;
    const hasCupDisc = shown.cupDiscMl > 0;

    return (
        <Card className="flex flex-col items-center">
            <div className="w-full flex items-center gap-2 mb-4">
                <h2 className="text-sm font-extrabold tracking-[0.12em] text-slate-800 uppercase flex-1">{t(current ? 'lab.gauge.title' : 'lab.gauge.last_title')}</h2>
                <button
                    type="button"
                    onClick={() => setShowInfo(v => !v)}
                    aria-expanded={showInfo}
                    aria-label={t('lab.gauge.info_label')}
                    className="text-slate-400 hover:text-slate-600"
                >
                    <Icons.Info />
                </button>
            </div>

            <div className="relative w-64 h-32 overflow-hidden" role="img" aria-label={current
                ? t('lab.gauge.aria', { ml: formatNumber(total) })
                : t('lab.gauge.aria_last', { defaultValue: 'Estimated blood last period: {{ml}} mL', ml: formatNumber(total) })}>
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 100" aria-hidden="true">
                    <path d={ARC} className="lab-gauge-track" fill="none" stroke="#E3E8EE" strokeLinecap="round" strokeWidth="18" />
                    {last && <Arc ml={lastMl} stroke="#94A3B8" opacity={0.45} />}
                    {current && <Arc ml={total} stroke={FLUID_COLOR} />}
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                    <text x={label.x} y={label.y} fontSize="11" fontWeight="600" className="lab-bar-label fill-slate-600" textAnchor="middle" dominantBaseline="middle">
                        {formatNumber(REFERENCE_ML)}
                    </text>
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-2">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-700">{formatNumber(total)}</span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('lab.gauge.ml_estimate')}</span>
                </div>
            </div>

            <p className="mt-3 text-xs text-slate-400 text-center">{t('lab.gauge.line_note', { ml: formatNumber(REFERENCE_ML) })}</p>
            {last && current && (
                <p className="mt-1 text-xs text-slate-400 text-center">{t('lab.gauge.last_legend', { ml: formatNumber(lastMl) })}</p>
            )}
            {(hasCupDisc || hasPbac) && (
                <p className="mt-1 text-xs text-slate-600 text-center">
                    {[
                        hasCupDisc && t('lab.gauge.cup_disc', { ml: formatNumber(shown.cupDiscMl) }),
                        hasPbac && t('lab.gauge.pbac', { score: formatNumber((current ?? last)!.pbacScore), ml: formatNumber(shown.pbacMl) }),
                    ].filter(Boolean).join(' · ')}
                </p>
            )}

            {showInfo && (
                <div className="mt-4 w-full rounded-2xl bg-[#F0F2F5] p-3 text-xs text-slate-600 leading-relaxed space-y-1.5" role="note"
                    style={{ boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.8)' }}>
                    <p>{t('lab.gauge.info_estimate')}</p>
                    <p>{t('lab.gauge.info_line')}</p>
                    <p>{t('lab.gauge.info_fraction')}</p>
                    <p>{t('lab.gauge.info_pbac')}</p>
                </div>
            )}
        </Card>
    );
};

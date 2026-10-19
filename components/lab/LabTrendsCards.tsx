// The two per-period charts on Lab home, under the blood gauge. Cycle card style from
// components/trends/CycleHistoryChart.tsx.
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLab } from '../../hooks/useLabStore';
import { formatNumber, useDisplayFormat } from '../../services/displayFormat';
import type { PeriodRecord } from '../../types';
import { diffInDays, getTodayStr, parseLocalDate } from '../../utils/dateUtils';
import { REFERENCE_ML, bloodDisplayMl, groupEventsByPeriod, periodBlood } from '../../services/logic/lab';
import { Card } from './ui';

/** Newest periods drawn, as in Lab's Insights. */
const MAX_PERIODS = 8;
const BLOOD_COLOR = '#d77d8d';
const DAYS_COLOR = '#5b7a82';

interface Bar { label: string; value: number }

const W = 300;
const H = 160;
const PAD = { top: 18, right: 8, bottom: 34, left: 8 };
/** Width kept free at the line's end for the reference label, so it never sits on a bar or its value. */
const LABEL_GUTTER = 40;

/** Days chart scale never goes below a week, so a 1 day period draws short instead of full height. */
export const DAYS_SCALE_FLOOR = 7;

/** Top of the value axis: the largest of the bars, the reference line and the floor, plus 10% headroom. */
export const barScale = (values: number[], reference = 0, floor = 1) => Math.max(1, floor, reference, ...values) * 1.1;

/** "26 Mar" becomes ["26", "Mar"]: the first word on top, the rest under it. */
const chartLabelLines = (label: string): string[] => {
    const [first, ...rest] = label.split(' ');
    return rest.length ? [first, rest.join(' ')] : [first];
};

/** Small SVG bar chart: each bar carries its value, an optional dashed reference line. */
const BarChart: React.FC<{ data: Bar[]; ariaOf: (b: Bar) => string; color: string; reference?: Bar; floor?: number; rtl?: boolean }> = ({ data, ariaOf, color, reference, floor, rtl }) => {
    const max = barScale(data.map(d => d.value), reference?.value, floor);
    const gutter = reference ? LABEL_GUTTER : 0;
    const plotLeft = PAD.left + (rtl ? gutter : 0);
    const plotRight = PAD.right + (rtl ? 0 : gutter);
    const slot = (W - plotLeft - plotRight) / data.length;
    const barW = Math.min(36, slot * 0.7);
    const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={data.map(ariaOf).join(', ')}>
            {data.map((d, i) => {
                const x = plotLeft + slot * i + (slot - barW) / 2;
                return (
                    <g key={`${d.label}-${i}`}>
                        <rect x={x} y={y(d.value)} width={barW} height={Math.max(0, H - PAD.bottom - y(d.value))} rx={6} fill={color} />
                        <text x={x + barW / 2} y={y(d.value) - 4} textAnchor="middle" className="lab-bar-value fill-slate-600 text-[11px] font-bold">{formatNumber(d.value)}</text>
                        <text x={x + barW / 2} y={H - 18} textAnchor="middle" className="lab-bar-label fill-slate-600 text-[11px] font-semibold">
                            {/* "26 Mar" on two lines: eight labels at 11 px do not fit side by side. */}
                            {chartLabelLines(d.label).map((part, k) => <tspan key={k} x={x + barW / 2} dy={k === 0 ? 0 : 13}>{part}</tspan>)}
                        </text>
                    </g>
                );
            })}
            {reference && (
                <g>
                    <line x1={plotLeft} x2={W - plotRight + 4} y1={y(reference.value)} y2={y(reference.value)} stroke="rgb(148, 163, 184)" strokeWidth="1.5" strokeDasharray="4 4" data-testid="lab-reference-line" />
                    <text x={rtl ? 2 : W - 2} y={y(reference.value) + 4} textAnchor={rtl ? 'start' : 'end'} className="lab-bar-label fill-slate-600 text-[11px] font-semibold">{reference.label}</text>
                </g>
            )}
        </svg>
    );
};

const LabTrendsCards: React.FC<{ periods: PeriodRecord[] }> = ({ periods }) => {
    const { t } = useTranslation();
    const fmt = useDisplayFormat();
    const { status, data } = useLab();

    // Every period with entries is shown, also ones excluded from averages. Events are matched at read time.
    const rows = useMemo(() => {
        const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
        return groupEventsByPeriod(data.events, sorted).groups.slice(-MAX_PERIODS);
    }, [periods, data.events]);

    if (status !== 'ready' || rows.length === 0) return null;

    const labelOf = (p: PeriodRecord) => {
        return fmt.dayMonth(parseLocalDate(p.startDate));
    };
    const blood = rows.map(r => ({ label: labelOf(r.period), value: bloodDisplayMl(periodBlood(r.events, data.settings.bloodFraction)).totalMl }));
    // Bleeding days, the same count the "average period" card uses (cycle.ts periodLength). A
    // record with no activeDays has no skipped days, so its stored length is the count. Days after
    // today (a running period) are not counted.
    const today = getTodayStr();
    const bleedingDays = (p: PeriodRecord) => {
        const todayIdx = diffInDays(today, p.startDate);
        const idx = p.activeDays ?? Array.from({ length: p.days }, (_, i) => i);
        return idx.filter(i => i <= todayIdx).length;
    };
    const days = rows.map(r => ({ label: labelOf(r.period), value: bleedingDays(r.period) }));
    const rtl = document.dir === 'rtl'; // set by services/i18n.ts on language change
    const hasWithdrawalBleeds = rows.some(r => r.period.isWithdrawalBleed);

    const header = (title: string) => (
        <div className="flex flex-col gap-1 mb-4">
            <h3 className="text-sm font-extrabold tracking-[0.15em] text-slate-800 uppercase">{title}</h3>
            <span className="text-xs font-medium text-slate-400">{t('trends.based_on_periods', { count: rows.length })}</span>
            {hasWithdrawalBleeds && <span className="text-[11px] font-medium text-slate-400">{t('trends.includes_withdrawal')}</span>}
        </div>
    );

    return (
        <>
            <Card>
                {header(t('lab.trends.blood_title'))}
                <BarChart
                    data={blood}
                    color={BLOOD_COLOR}
                    ariaOf={b => t('lab.trends.blood_aria', { label: b.label, value: formatNumber(b.value) })}
                    rtl={rtl}
                    reference={{ value: REFERENCE_ML, label: t('lab.trends.reference_label', { ml: formatNumber(REFERENCE_ML) }) }}
                />
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{t('lab.trends.blood_info')}</p>
            </Card>
            <Card>
                {header(t('lab.trends.days_title'))}
                <BarChart data={days} color={DAYS_COLOR} floor={DAYS_SCALE_FLOOR} ariaOf={b => t('lab.trends.days_aria', { label: b.label, value: formatNumber(b.value) })} />
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{t('lab.trends.days_info')}</p>
            </Card>
        </>
    );
};

export default LabTrendsCards;

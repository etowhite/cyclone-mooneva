// Lab entries grouped by Cycle period, no filters. A period is looked up when reading,
// so editing Cycle's periods never leaves an entry pointing at a stale period id.
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMooneva } from '../../contexts/MoonevaContext';
import { useLab } from '../../hooks/useLabStore';
import { formatNumber, useDisplayFormat } from '../../services/displayFormat';
import { parseLocalDate } from '../../utils/dateUtils';
import {
    bloodDisplayMl, eventDate, ML_PER_PBAC_POINT, eventFluidMl, groupEventsByPeriod, pbacPoints, periodBlood,
    type LabEvent, type PbacDeviceType, type PbacEntry,
} from '../../services/logic/lab';
import { DEVICE_ICON } from './DeviceSwitchDialog';
import { Card, ConfirmDialog, Icons, LabHeader } from './ui';

interface HistoryScreenProps {
    onEdit: (event: LabEvent) => void;
    onBack: () => void;
}

const newestFirst = (a: LabEvent, b: LabEvent) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);

const EntryCard: React.FC<{ event: LabEvent; onEdit: () => void; onDelete: () => void }> = ({ event, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const fmt = useDisplayFormat();
    const Icon = DEVICE_ICON[event.deviceType];
    const at = new Date(event.at);
    const pbacDetail = (e: PbacEntry, score: number) => {
        const what = [
            t(`lab.pbac.${e.saturation}`),
            e.clotsSmall > 0 && t('lab.history.clots_small', { count: e.clotsSmall }),
            e.clotsLarge > 0 && t('lab.history.clots_large', { count: e.clotsLarge }),
            e.flooding && t('lab.pbac.flooding'),
        ].filter(Boolean).join(', ');
        return `${what} \u00B7 ${t('lab.gauge.pbac', { score: formatNumber(score), ml: formatNumber(Math.round(score * ML_PER_PBAC_POINT)) })}`;
    };
    const summary = event.pbac && (event.deviceType === 'pad' || event.deviceType === 'tampon')
        ? pbacDetail(event.pbac, pbacPoints(event.deviceType as PbacDeviceType, event.pbac))
        : t('lab.history.fullness_fluid', '{{pct}}% full, about {{ml}} mL fluid', { pct: formatNumber(event.fullnessPct ?? 0), ml: formatNumber(eventFluidMl(event)) });
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-2 cursor-pointer" onClick={onEdit}>
            <div className="w-12 h-12 shrink-0 flex items-center justify-center text-[#4a6b73]"><Icon className="w-full h-full" /></div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-700">{fmt.time(at)}</div>
                <div className="text-xs text-slate-600 break-words">{summary}</div>
            </div>
            <button type="button" aria-label={t('lab.history.edit_at', 'Edit entry, {{time}}, {{date}}', { time: fmt.time(at), date: fmt.dayMonth(at) })} className="p-2 rounded text-slate-600"
                onClick={e => { e.stopPropagation(); onEdit(); }}><Icons.Edit /></button>
            <button type="button" aria-label={t('lab.history.delete_at', 'Delete entry, {{time}}, {{date}}', { time: fmt.time(at), date: fmt.dayMonth(at) })} className="p-2 rounded text-slate-600"
                onClick={e => { e.stopPropagation(); onDelete(); }}><Icons.Trash /></button>
        </div>
    );
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onEdit, onBack }) => {
    const { t } = useTranslation();
    const fmt = useDisplayFormat();
    const { periods } = useMooneva();
    const { data, actions } = useLab();
    const [deleting, setDeleting] = useState<string | null>(null);

    const { groups, outside } = useMemo(() => {
        const g = groupEventsByPeriod(data.events, periods);
        return { groups: [...g.groups].sort((a, b) => b.period.startDate.localeCompare(a.period.startDate)), outside: g.outside };
    }, [data.events, periods]);

    const dayLabel = (date: string) => fmt.dayMonthYear(parseLocalDate(date));

    // Entries of one group, newest day first, newest entry first.
    const renderDays = (events: LabEvent[]) => {
        const byDay = new Map<string, LabEvent[]>();
        [...events].sort(newestFirst).forEach(e => byDay.set(eventDate(e), [...(byDay.get(eventDate(e)) ?? []), e]));
        return [...byDay.entries()].map(([date, list]) => (
            <div key={date} className="space-y-1">
                <div className="px-1 text-xs font-medium text-slate-600">{dayLabel(date)}</div>
                {list.map(e => <EntryCard key={e.id} event={e} onEdit={() => onEdit(e)} onDelete={() => setDeleting(e.id)} />)}
            </div>
        ));
    };

    const header = (title: string, ml?: number) => (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
            <h2 className="text-xs font-extrabold tracking-[0.12em] text-slate-700 uppercase">{title}</h2>
            {ml !== undefined && <span className="text-xs font-semibold text-slate-600">{t('lab.history.blood_estimate', 'about {{ml}} mL blood, estimate', { ml: formatNumber(ml) })}</span>}
        </div>
    );

    return (
        <>
            <LabHeader title={t('lab.history.title')} onBack={onBack} />
            <div className="px-4 pt-2 space-y-5">
                {data.events.length === 0 && (
                    <Card className="text-center">
                        <h2 className="text-base font-semibold text-slate-700 mb-1">{t('lab.history.empty_title')}</h2>
                        <p className="text-sm text-slate-400">{t('lab.history.empty_body')}</p>
                    </Card>
                )}
                {groups.map(({ period, events }) => (
                    <Card key={period.id} className="!p-4 space-y-3">
                        {header(t('lab.history.period_from', { date: dayLabel(period.startDate) }),
                            bloodDisplayMl(periodBlood(events, data.settings.bloodFraction)).totalMl)}
                        {renderDays(events)}
                    </Card>
                ))}
                {outside.length > 0 && (
                    <Card className="!p-4 space-y-3">
                        {header(t('lab.history.not_in_period'))}
                        <p className="px-1 text-xs text-slate-400">{t('lab.history.outside_hint')}</p>
                        {renderDays(outside)}
                    </Card>
                )}
            </div>
            {deleting && (
                <ConfirmDialog
                    title={t('lab.history.delete_title')}
                    message={t('lab.history.delete_message')}
                    confirmLabel={t('common.delete')}
                    cancelLabel={t('common.cancel')}
                    onCancel={() => setDeleting(null)}
                    onConfirm={() => { actions.removeEvent(deleting); setDeleting(null); }}
                />
            )}
        </>
    );
};

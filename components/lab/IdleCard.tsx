// Shown when there is no period right now.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Icons } from './ui';

/** `inPeriod`: a period is running but nothing is logged yet. `stopped`: the period has entries and the last one ended the timer. */
export const IdleCard: React.FC<{ inPeriod?: boolean; stopped?: boolean }> = ({ inPeriod = false, stopped = false }) => {
    const { t } = useTranslation();
    return (
        <Card>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#8aacac]/20 text-[#4a6b73]"><Icons.Clock /></div>
                <div>
                    <div className="text-sm font-semibold text-slate-700">{stopped ? t('lab.idle.stopped_title', 'Timer stopped') : t(inPeriod ? 'lab.idle.in_period_title' : 'lab.idle.title')}</div>
                    <div className="text-xs text-slate-600">{stopped ? t('lab.idle.stopped_subtitle', 'The timer is stopped') : t(inPeriod ? 'lab.idle.in_period_subtitle' : 'lab.idle.subtitle')}</div>
                </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{stopped ? t('lab.idle.stopped_body', 'Log when you put one in.') : t(inPeriod ? 'lab.idle.in_period_body' : 'lab.idle.body')}</p>
        </Card>
    );
};

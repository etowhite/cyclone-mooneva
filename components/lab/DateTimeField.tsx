// Date and time of an entry. Uses native date and time inputs, which also give the platform's own picker on phones.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { addDays } from '../../utils/dateUtils';
import { useDisplayFormat } from '../../services/displayFormat';
import { FIELD_CLASS, Icons, selectable } from './ui';

const QUICK_HOURS = [7, 13, 18, 22];

interface DateTimeFieldProps {
    date: string;
    time: string;
    onChange: (date: string, time: string) => void;
    /** Latest selectable date (YYYY-MM-DD). */
    maxDate?: string;
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({ date, time, onChange, maxDate }) => {
    const { t } = useTranslation();
    const fmt = useDisplayFormat();
    const step = 'h-11 w-11 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600';
    // Quick times later than now (plus the 5 minutes Save allows) would be refused on save, so they are not offered.
    const latest = Date.now() + 5 * 60 * 1000;
    const input = `min-h-[44px] rounded-xl px-3 text-sm font-medium ${FIELD_CLASS}`;
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <button type="button" className={`${step} rtl:rotate-180`} aria-label={t('lab.time.previous_day')}
                    onClick={() => date && onChange(addDays(date, -1), time)}>
                    <Icons.Back />
                </button>
                <input type="date" className={`${input} flex-1 min-w-0`} value={date} aria-label={t('lab.time.date')} max={maxDate}
                    onChange={e => onChange(e.target.value, time)} />
                <button type="button" className={`${step} ltr:rotate-180`} aria-label={t('lab.time.next_day')} disabled={!!maxDate && date >= maxDate}
                    onClick={() => date && onChange(addDays(date, 1), time)}>
                    <Icons.Back />
                </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <input type="time" className={`${input} w-32`} value={time} aria-label={t('lab.time.time')}
                    onChange={e => onChange(date, e.target.value)} />
                {QUICK_HOURS.map(h => {
                    const value = `${String(h).padStart(2, '0')}:00`;
                    const at = new Date(`${date}T${value}`).getTime();
                    if (date && at > latest) return null;
                    return (
                        <button key={h} type="button" onClick={() => onChange(date, value)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold ${selectable(time === value).className}`}>
                            {fmt.time(new Date(2000, 0, 1, h))}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

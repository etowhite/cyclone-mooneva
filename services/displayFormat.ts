import i18n from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { jalaaliMonths, toJalaali } from '../utils/jalaali';

/**
 * The one place that turns a number or a date into display text.
 * The functions are pure and take the language, so services and tests can call them.
 * Components use useDisplayFormat(), which binds them to the language useTranslation reports.
 * Only formatNumber may omit the language: it falls back to the global i18next instance
 * because it is called from about twenty components and from i18next itself.
 */

const baseOf = (lng?: string) => (lng || 'en').split('-')[0].toLowerCase();

/** The calendar follows the language BASE, so fa-IR is Persian too. */
export const isPersian = (lng: string) => baseOf(lng) === 'fa';

/** Intl tag with the app's digits: Persian digits (۰-۹) for both ar and fa. The only place digits are chosen. */
const intlTag = (lng?: string) => {
    const base = baseOf(lng);
    return base === 'ar' || base === 'fa' ? `${base}-u-nu-arabext` : lng || 'en';
};

/**
 * Intl instances are costly to build and a month view asks for dozens, so one is kept per
 * (tag, options, time zone). A date formatter fixes the time zone when it is built, so the key
 * carries the device's winter and summer offsets: after travel, new formatters are built.
 */
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();
const zoneKey = () => `${new Date(2000, 0, 1).getTimezoneOffset()},${new Date(2000, 6, 1).getTimezoneOffset()}`;

const gregorian = (opts: Intl.DateTimeFormatOptions, lng?: string) => {
    const tag = intlTag(lng);
    const key = `${tag}|${zoneKey()}|${JSON.stringify(opts)}`;
    let f = dateFormats.get(key);
    if (!f) {
        f = new Intl.DateTimeFormat(tag, opts);
        dateFormats.set(key, f);
    }
    return f;
};

/** An invalid Date (a bad stored string) makes every date formatter below return '' instead of throwing. */
const invalid = (...dates: Date[]) => dates.some(d => Number.isNaN(d.getTime()));

/** Locale digits, never grouped: the app shows years, days and small counts, not thousands. */
export const formatNumber = (n: number | string, lng: string = i18n.language) => {
    const tag = intlTag(lng);
    let f = numberFormats.get(tag);
    if (!f) {
        f = new Intl.NumberFormat(tag, { useGrouping: false });
        numberFormats.set(tag, f);
    }
    return f.format(Number(n));
};

/** Year, 0-based month and day of a local date in the active calendar (Jalaali for fa, else Gregorian). */
export const calendarParts = (date: Date, lng: string) => {
    if (!isPersian(lng)) return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
    const j = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return { year: j.jy, month: j.jm - 1, day: j.jd };
};

/** Short month name. `year` and 0-based `month` are in the active calendar. */
export const monthName = (year: number, month: number, lng: string) =>
    isPersian(lng) ? jalaaliMonths[month].fa : gregorian({ month: 'short' }, lng).format(new Date(year, month, 1));

/** "Oct 2026", "مهر ۱۴۰۵". `year` and 0-based `month` are in the active calendar. */
export const monthYear = (year: number, month: number, lng: string) =>
    isPersian(lng)
        ? `${monthName(year, month, lng)} ${formatNumber(year, lng)}`
        : gregorian({ month: 'short', year: 'numeric' }, lng).format(new Date(year, month, 1));

/** "Oct 13", "13. Okt.", "۲۱ مهر". */
export const dayMonth = (date: Date, lng: string) => {
    if (invalid(date)) return '';
    if (!isPersian(lng)) return gregorian({ day: 'numeric', month: 'short' }, lng).format(date);
    const p = calendarParts(date, lng);
    return `${formatNumber(p.day, lng)} ${monthName(p.year, p.month, lng)}`;
};

/** "Oct 13, 2026", "13. Okt. 2026", "۲۱ مهر ۱۴۰۵". */
export const dayMonthYear = (date: Date, lng: string) =>
    invalid(date)
        ? ''
        : isPersian(lng)
        ? `${dayMonth(date, lng)} ${formatNumber(calendarParts(date, lng).year, lng)}`
        : gregorian({ day: 'numeric', month: 'short', year: 'numeric' }, lng).format(date);

/**
 * "Oct 3 to 7" (Intl's own dash), "Dec 28 to Jan 3", "۱۱ تا ۱۵ مهر". No year, unless `today` is given.
 * Inside one month Intl compacts the range in the locale's own order. Across months the two
 * days are joined, because Intl adds the year itself when the range crosses a year.
 * With `today`, the year is added when the range starts in another year than today or crosses
 * a year, judged in the active calendar (a Persian year turns at Nowruz). Persian prints it
 * once, at the end; Gregorian lets Intl place it.
 */
export const dateRange = (start: Date, end: Date, lng: string, today?: Date) => {
    if (invalid(start, end)) return '';
    const a = calendarParts(start, lng);
    const b = calendarParts(end, lng);
    const sameMonth = a.year === b.year && a.month === b.month;
    const withYear = !!today && (a.year !== calendarParts(today, lng).year || a.year !== b.year);
    if (isPersian(lng)) {
        if (a.year === b.year && a.month === b.month && a.day === b.day) {
            return withYear ? `${dayMonth(start, lng)} ${formatNumber(b.year, lng)}` : dayMonth(start, lng);
        }
        const days = `${sameMonth ? formatNumber(a.day, lng) : dayMonth(start, lng)} تا ${dayMonth(end, lng)}`;
        return withYear ? `${days} ${formatNumber(b.year, lng)}` : days;
    }
    if (withYear) return gregorian({ day: 'numeric', month: 'short', year: 'numeric' }, lng).formatRange(start, end);
    if (sameMonth) return gregorian({ day: 'numeric', month: 'short' }, lng).formatRange(start, end);
    return `${dayMonth(start, lng)} \u2013 ${dayMonth(end, lng)}`;
};

/** Full weekday name, "Tuesday", "سه‌شنبه". The same in every calendar. */
export const weekday = (date: Date, lng: string) => invalid(date) ? '' : gregorian({ weekday: 'long' }, lng).format(date);

/** Time of day, "2:30 PM", "14:30", "۱۴:۳۰". The 12/24 h style is the locale's default, not forced. */
export const time = (date: Date, lng: string) => invalid(date) ? '' : gregorian({ hour: 'numeric', minute: '2-digit' }, lng).format(date);

/** Date and time of day. The time part is `time`. */
export const dateTime = (date: Date, lng: string) =>
    invalid(date) ? '' : isPersian(lng) ? `${dayMonthYear(date, lng)}، ${time(date, lng)}` : `${dayMonthYear(date, lng)}, ${time(date, lng)}`;

const bind = (lng: string) => ({
    formatNumber: (n: number | string) => formatNumber(n, lng),
    calendarParts: (date: Date) => calendarParts(date, lng),
    monthName: (year: number, month: number) => monthName(year, month, lng),
    monthYear: (year: number, month: number) => monthYear(year, month, lng),
    dayMonth: (date: Date) => dayMonth(date, lng),
    dayMonthYear: (date: Date) => dayMonthYear(date, lng),
    dateRange: (start: Date, end: Date, today?: Date) => dateRange(start, end, lng, today),
    weekday: (date: Date) => weekday(date, lng),
    time: (date: Date) => time(date, lng),
    dateTime: (date: Date) => dateTime(date, lng),
});

/** The formatters above, bound to the active language. Re-renders on a language change. */
export const useDisplayFormat = () => {
    const { i18n: instance } = useTranslation();
    return useMemo(() => bind(instance.language), [instance.language]);
};

/**
 * Importers for other period trackers' export files.
 * Supported: drip (CSV), Flo (JSON data export), Clue (measurements.json),
 * SimpleInnovation Period Tracker (cyclesData/dayEntries JSON).
 * Each parser produces plain Mooneva logs + periods; merging/saving is the caller's job.
 */

import { DailyLog, FlowIntensity, PeriodRecord, DischargeType, SexDriveType, SexType } from '../../types';
import { isAnyFlowDay, isFullFlowDay, MAX_PERIOD_DAYS } from './cycle';
import { canonicalMood, canonicalSymptom, isCustomMood, mergeName } from './logNames';
import { addDays, diffInDays, getTodayStr, parseStrictLocalDate } from '../../utils/dateUtils';
import { hasDailyLogContent } from '../../utils/dailyLogContent';

export interface ExternalImportResult {
    source: 'drip' | 'flo' | 'clue' | 'SimpleInnovation';
    logs: Record<string, DailyLog>;
    periods: PeriodRecord[];
}

const emptyLog = (date: string): DailyLog => ({ date, flow: null, symptoms: [], notes: '' });

const appendNote = (log: DailyLog, note: string) => {
    log.notes = log.notes ? `${log.notes}\n${note}` : note;
};

// Symptoms are stored as built-in labels ("Cramps"), moods as ids, like the log UI does.
const addSymptom = (log: DailyLog, name: string) => {
    log.symptoms = mergeName(log.symptoms, canonicalSymptom(name) ?? '');
};

/** A source option id as a custom name: "ovulationPain" / "ovulation_pain" -> "Ovulation pain". */
const customName = (id: string): string => {
    const words = id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim().toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
};

const addMood = (log: DailyLog, name: string) => {
    log.mood = mergeName(log.mood ?? [], canonicalMood(name) ?? '');
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * Sort by start and fold any period that overlaps (or repeats the start of) the previous one
 * into it, so one imported file never saves periods that overlap each other.
 */
const mergeOverlappingPeriods = (periods: PeriodRecord[]): PeriodRecord[] => {
    const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const out: PeriodRecord[] = [];
    for (const p of sorted) {
        const last = out[out.length - 1];
        const lastEnd = last && addDays(last.startDate, Math.max(last.days, 1) - 1);
        if (!last || p.startDate > lastEnd) { out.push({ ...p }); continue; }
        const pEnd = addDays(p.startDate, Math.max(p.days, 1) - 1);
        const offset = diffInDays(p.startDate, last.startDate);
        const active = new Set([...(last.activeDays ?? []), ...(p.activeDays ?? []).map(d => d + offset)]);
        last.days = Math.max(diffInDays(pEnd, last.startDate), diffInDays(lastEnd, last.startDate)) + 1;
        last.activeDays = [...active].sort((a, b) => a - b);
    }
    return out;
};

/**
 * Group per-day bleeding logs into PeriodRecords (drip/Clue exports have no
 * period grouping). A run tolerates 1 skipped day; a new run starts beyond that.
 * Runs without at least one full-flow day (spotting only) are not periods.
 */
export const logsToPeriods = (logs: Record<string, DailyLog>): PeriodRecord[] => {
    const flowDates = Object.values(logs).filter(isAnyFlowDay).map(l => l.date).sort();
    const runs: string[][] = [];
    for (const d of flowDates) {
        const run = runs[runs.length - 1];
        if (run && diffInDays(d, run[run.length - 1]) <= 2) run.push(d);
        else runs.push([d]);
    }
    const periods: PeriodRecord[] = [];
    for (const run of runs) {
        // ponytail: period starts at first full-flow day; leading spotting stays log-only
        const start = run.find(d => isFullFlowDay(logs[d]));
        if (!start) continue;
        const days = run.filter(d => d >= start);
        const last = days[days.length - 1];
        periods.push({
            id: crypto.randomUUID(),
            startDate: start,
            days: diffInDays(last, start) + 1,
            activeDays: days.map(d => diffInDays(d, start)),
        });
    }
    return periods;
};

// ---------------------------------------------------------------------------
// drip (CSV)
// ---------------------------------------------------------------------------

/** Minimal CSV parser: handles quoted fields, escaped quotes and newlines in quotes. */
const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some(f => f !== '')) rows.push(row);
            row = [];
        } else field += c;
    }
    row.push(field);
    if (row.some(f => f !== '')) rows.push(row);
    return rows;
};

const DRIP_FLOW: FlowIntensity[] = ['spotting', 'light', 'medium', 'heavy'];
const DRIP_DESIRE: SexDriveType[] = ['low', 'medium', 'high'];
const DRIP_PAIN_SYMPTOM: Record<string, string> = {
    'pain.cramps': 'cramps',
    'pain.headache': 'headache',
    'pain.migraine': 'headache',
    'pain.backache': 'backache',
    'pain.nausea': 'nausea',
    'pain.tenderBreasts': 'tenderness',
};
const DRIP_MOOD: Record<string, string> = {
    'mood.happy': 'happy',
    'mood.sad': 'sad',
    'mood.anxious': 'anxious',
    'mood.energetic': 'energetic',
    'mood.fatigue': 'tired',
    'mood.angry': 'irritable',
    'mood.moodSwings': 'mood_swings',
    'mood.mood_swing': 'mood_swings',
    'mood.sensitive': 'sensitive',
};
const DRIP_PROTECTED = ['sex.condom', 'sex.pill', 'sex.iud', 'sex.patch', 'sex.ring', 'sex.implant', 'sex.diaphragm'];

export const parseDripCsv = (text: string): ExternalImportResult | null => {
    const rows = parseCsv(text);
    if (rows.length < 2) return null;
    const headers = rows[0].map(h => h.trim());
    if (headers[0] !== 'date' || !headers.includes('bleeding.value')) return null;

    const today = getTodayStr();
    const logs: Record<string, DailyLog> = {};
    for (const cells of rows.slice(1)) {
        const get = (col: string) => {
            const i = headers.indexOf(col);
            return i === -1 ? '' : (cells[i] ?? '').trim();
        };
        const isTrue = (col: string) => get(col).toLowerCase() === 'true';
        const date = get('date');
        if (!parseStrictLocalDate(date) || date > today) continue;
        const log = emptyLog(date);

        const bleeding = get('bleeding.value');
        if (bleeding !== '') {
            log.flow = DRIP_FLOW[Number(bleeding)] ?? null;
            if (isTrue('bleeding.exclude')) log.ignoreForAverages = true;
        }
        // Mapped columns use their built-in; any other true pain./mood. column becomes a custom name.
        for (const col of headers) {
            if (!isTrue(col)) continue;
            if (col.startsWith('pain.')) addSymptom(log, DRIP_PAIN_SYMPTOM[col] ?? customName(col.slice(5)));
            else if (col.startsWith('mood.')) addMood(log, DRIP_MOOD[col] ?? customName(col.slice(5)));
        }

        const desire = get('desire.value');
        if (desire !== '') log.sexDrive = DRIP_DESIRE[Number(desire)] ?? null;
        if (DRIP_PROTECTED.some(isTrue)) log.sexType = 'protected';
        else if (isTrue('sex.none') && (isTrue('sex.partner') || isTrue('sex.solo'))) log.sexType = 'unprotected';

        const texture = get('mucus.texture'); // 0 nothing, 1 creamy, 2 eggWhite
        if (texture === '1') log.discharge = 'sticky_creamy';
        else if (texture === '2') log.discharge = 'egg_white';
        else if (get('mucus.feeling') === '0') log.discharge = 'dry';

        if (get('note.value')) appendNote(log, get('note.value'));
        if (get('temperature.value')) appendNote(log, `BBT ${get('temperature.value')}°C${get('temperature.time') ? ' @ ' + get('temperature.time') : ''}`);
        for (const col of ['pain.note', 'mood.note', 'sex.note', 'temperature.note']) {
            if (get(col)) appendNote(log, get(col));
        }

        if (hasDailyLogContent(log)) logs[date] = log;
    }
    if (!Object.keys(logs).length) return null;
    return { source: 'drip', logs, periods: mergeOverlappingPeriods(logsToPeriods(logs)) };
};

// ---------------------------------------------------------------------------
// Flo (JSON export, operationalData.cycles)
// ---------------------------------------------------------------------------

interface FloCycle { period_start_date?: string; period_end_date?: string; }

// Flo writes one row per cycle with a start/end pair, so a single corrupt date
// expands into a log per day between them. Clamp the span: the start date drives
// every downstream cycle calculation and is worth keeping even when the end is junk.
// The clamp is the model's own longest period (MAX_PERIOD_DAYS).

export const parseFloJson = (json: unknown): ExternalImportResult | null => {
    const cycles = (json as { operationalData?: { cycles?: FloCycle[] } })?.operationalData?.cycles;
    if (!Array.isArray(cycles) || !cycles.length) return null;

    const today = getTodayStr();
    const logs: Record<string, DailyLog> = {};
    const periods: PeriodRecord[] = [];
    for (const c of cycles) {
        if (!isObject(c) || typeof c.period_start_date !== 'string') continue;
        const start = c.period_start_date.slice(0, 10);
        if (!parseStrictLocalDate(start) || start > today) continue;
        let end = typeof c.period_end_date === 'string' ? c.period_end_date.slice(0, 10) : '';
        if (!parseStrictLocalDate(end) || end < start) end = start;
        if (end > today) end = today;
        const days = Math.min(diffInDays(end, start) + 1, MAX_PERIOD_DAYS);
        for (let i = 0; i < days; i++) {
            const d = addDays(start, i);
            // Flo exports no intensity; medium is the neutral choice
            logs[d] = { ...emptyLog(d), flow: 'medium' };
        }
        periods.push({ id: crypto.randomUUID(), startDate: start, days, activeDays: Array.from({ length: days }, (_, i) => i) });
    }
    if (!periods.length) return null;
    return { source: 'flo', logs, periods: mergeOverlappingPeriods(periods) };
};

// ---------------------------------------------------------------------------
// Clue (measurements.json: flat array of { date, type, value })
// ---------------------------------------------------------------------------

interface ClueEntry { date?: string; type?: string; value?: unknown; }

const CLUE_FLOW: Record<string, FlowIntensity> = {
    light: 'light', medium: 'medium', heavy: 'heavy', very_heavy: 'heavy',
};
const CLUE_PAIN: Record<string, string> = {
    period_cramps: 'cramps', lower_back: 'backache', breast_tenderness: 'tenderness',
    headache: 'headache', migraine: 'headache', migraine_with_aura: 'headache',
};
const CLUE_FEELINGS: Record<string, string> = {
    happy: 'happy', sad: 'sad', angry: 'irritable', anxious: 'anxious',
    mood_swings: 'mood_swings', mood_swing: 'mood_swings', sensitive: 'sensitive', sensitivity: 'sensitive',
};
const CLUE_ENERGY: Record<string, string> = {
    energetic: 'energetic', fully_energized: 'energetic', tired: 'tired', exhausted: 'tired',
};
const CLUE_DISCHARGE: Record<string, DischargeType> = {
    none: 'dry', sticky: 'sticky_creamy', creamy: 'sticky_creamy', egg_white: 'egg_white',
};

const clueOptions = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(v => (v as { option?: string })?.option ?? '').filter(Boolean);
    const opt = (value as { option?: string })?.option;
    return opt ? [opt] : [];
};

export const parseClueJson = (json: unknown): ExternalImportResult | null => {
    if (!Array.isArray(json)) return null;
    const entries = json as ClueEntry[];
    if (!entries.some(e => typeof e?.date === 'string' && typeof e?.type === 'string')) return null;

    const today = getTodayStr();
    const logs: Record<string, DailyLog> = {};
    for (const entry of entries) {
        if (!isObject(entry) || typeof entry.date !== 'string' || typeof entry.type !== 'string') continue;
        const date = entry.date.slice(0, 10);
        if (!parseStrictLocalDate(date) || date > today || !entry.type) continue;
        const log = logs[date] ?? (logs[date] = emptyLog(date));
        const options = clueOptions(entry.value);

        switch (entry.type) {
            case 'period':
                // No default: Clue exports `none` for "not bleeding", and inventing a
                // flow the user never logged fabricates whole periods downstream.
                if (CLUE_FLOW[options[0]]) log.flow = CLUE_FLOW[options[0]];
                break;
            case 'spotting':
                log.flow = log.flow ?? 'spotting';
                break;
            case 'pain':
                for (const o of options) {
                    if (o === 'pain_free') continue;
                    addSymptom(log, CLUE_PAIN[o] ?? customName(o));
                }
                break;
            case 'feelings':
                for (const o of options) {
                    addMood(log, CLUE_FEELINGS[o] ?? customName(o));
                }
                break;
            case 'energy':
                for (const o of options) if (CLUE_ENERGY[o]) addMood(log, CLUE_ENERGY[o]);
                break;
            case 'sex_life':
                for (const o of options) {
                    if (o === 'protected_sex') log.sexType = 'protected';
                    else if (o === 'unprotected_sex' || o === 'withdrawal') log.sexType = 'unprotected';
                    else if (o === 'high_sex_drive') log.sexDrive = 'high';
                    else if (o === 'low_sex_drive') log.sexDrive = 'low';
                }
                break;
            case 'digestion':
                for (const o of options) addSymptom(log, o === 'nauseous' ? 'nausea' : 'digestion');
                break;
            case 'discharge':
                log.discharge = CLUE_DISCHARGE[options[0]] ?? log.discharge ?? null;
                break;
            case 'bbt': {
                const v = (entry.value as { temperature?: number })?.temperature;
                if (typeof v === 'number') appendNote(log, `BBT ${v}°C`);
                break;
            }
            case 'cravings':
                if (options.length) addSymptom(log, 'cravings');
                break;
            case 'skin':
            case 'hair':
                // "good_skin" / "good_hair" are not symptoms; acne maps to the built-in by name.
                for (const o of options) if (!o.startsWith('good_')) addSymptom(log, customName(o));
                break;
            // Other Clue categories (exercise, social, tests, ...) are not symptoms or moods.
        }
    }
    for (const [date, log] of Object.entries(logs)) {
        const isEmpty = !log.flow && !log.symptoms.length && !log.notes
            && !log.mood && !log.discharge && !log.sexDrive && !log.sexType;
        if (isEmpty) delete logs[date];
    }
    if (!Object.keys(logs).length) return null;
    return { source: 'clue', logs, periods: mergeOverlappingPeriods(logsToPeriods(logs)) };
};

// ---------------------------------------------------------------------------
// SimpleInnovation Period Tracker (cyclesData_device.json / dayEntries_device.json)
// cycleList: [{ cycleStartDate: 20260910, cycleEndDate, isUserConfirmed }]
// entryList: [{ entrydatekey: 20251201, hadIntercorse, pStartedToday, symptoms: "a,b", moods: "x", ... }]
// Either file alone or one object holding both. Dates are local YYYYMMDD integers.
// ---------------------------------------------------------------------------

// Code -> name passed to addSymptom (a built-in id becomes its label, anything else stays a custom name).
// Codes not listed here are stored as typed, never guessed.
const SI_SYMPTOM: Record<string, string> = {
    headaches: 'headache', migraines: 'headache', acne: 'acne', dizziness: 'dizziness', backaches: 'backache',
    cramps: 'cramps', acramps: 'cramps', btenderness: 'tenderness', tbreast: 'tenderness', bloating: 'bloating',
    gas: 'digestion', constipation: 'digestion', diarrhea: 'digestion', nausea: 'nausea', cravings: 'cravings',
    fatigue: 'fatigue', chills: 'chills', insomnia: 'insomnia', hflashes: 'hot flashes', lappetite: 'loss of appetite',
    itchiness: 'Itchiness', rashes: 'Rashes', nsweats: 'Night sweats', pms: 'PMS', opain: 'Ovulation pain',
    anxiety: 'Anxiety', confusion: 'Confusion', irritability: 'Irritability', moodiness: 'Moodiness', stress: 'Stress',
    wgain: 'Weight gain', tension: 'Tension', uconcentrate: 'Trouble concentrating', illness: 'Illness', hunger: 'Hunger',
    irritation: 'Irritation', watery: 'Watery discharge', green: 'Green discharge', areflux: 'Acid reflux',
    bleeding: 'Bleeding', vdryness: 'Vaginal dryness', contractions: 'Contractions', msickness: 'Morning sickness',
    smarks: 'Stretch marks', nesting: 'Nesting', babykicks: 'Baby kicks', bengorgement: 'Breast engorgement',
    lbreasts: 'Leaking breasts', lnigra: 'Linea nigra', snipples: 'Sore nipples', bmucusplug: 'Mucus plug',
    bsensitivity: 'Breast sensitivity', mpain: 'Muscle pain', baches: 'Body aches', naches: 'Neck aches',
};
const SI_DISCHARGE: Record<string, DischargeType> = {
    dry: 'dry', sticky: 'sticky_creamy', creamy: 'sticky_creamy', ewhite: 'egg_white',
};
const SI_LIBIDO: Record<string, SexDriveType> = { dlibido: 'low', nlibido: 'medium', ilibido: 'high' };
const SI_MOOD_NAME: Record<string, string> = { inlove: 'In love' };

/** 20260910 -> '2026-09-10'; null when it is not a real calendar date. */
const siDate = (n: unknown): string | null => {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 10000101 || n > 99991231) return null;
    const y = Math.floor(n / 10000), m = Math.floor(n / 100) % 100, d = n % 100;
    const str = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return parseStrictLocalDate(str) ? str : null;
};

const siCodes = (v: unknown): string[] =>
    typeof v === 'string' ? v.split(',').map(c => c.trim()).filter(Boolean) : [];

interface SiCycle { cycleStartDate?: unknown; cycleEndDate?: unknown; isUserConfirmed?: unknown }
type SiEntry = Record<string, unknown>;

export const parseSimpleInnovationJson = (json: unknown): ExternalImportResult | null => {
    const root = json as { cycleList?: unknown; entryList?: unknown } | null;
    const cycleList = root?.cycleList, entryList = root?.entryList;
    if (!Array.isArray(cycleList) && !Array.isArray(entryList)) return null;

    const today = getTodayStr();
    const periodsByStart = new Map<string, PeriodRecord>();
    const addPeriod = (start: string, end: string | null) => {
        if (periodsByStart.has(start)) return;
        const days = end && end >= start ? Math.min(diffInDays(end, start) + 1, MAX_PERIOD_DAYS) : 1;
        periodsByStart.set(start, {
            id: crypto.randomUUID(), startDate: start, days, activeDays: Array.from({ length: days }, (_, i) => i),
        });
    };

    for (const c of (Array.isArray(cycleList) ? cycleList : []) as SiCycle[]) {
        if (c?.isUserConfirmed !== true) continue;
        const start = siDate(c.cycleStartDate), end = siDate(c.cycleEndDate);
        if (start && start <= today) addPeriod(start, end && end > today ? today : end);
    }

    const logs: Record<string, DailyLog> = {};
    const starts: string[] = [], ends: string[] = [];
    for (const e of (Array.isArray(entryList) ? entryList : []) as SiEntry[]) {
        const date = siDate(e?.entrydatekey);
        if (!date || date > today) continue;
        const log = logs[date] ?? (logs[date] = emptyLog(date));
        if (e.pStartedToday === 1) starts.push(date);
        if (e.pEndedToday === 1) ends.push(date);
        if (e.hadIntercourseProtected === 1) log.sexType = 'protected';
        else if (e.hadIntercorse === 1) log.sexType = 'unprotected';
        if (e.masturbation === 1) appendNote(log, 'Masturbation');
        if (e.kissing === 1) appendNote(log, 'Kissing');
        for (const raw of siCodes(e.symptoms)) {
            const code = raw.toLowerCase();
            if (code === 'spotting') log.flow = 'spotting';
            else if (SI_DISCHARGE[code]) log.discharge = SI_DISCHARGE[code];
            else if (SI_LIBIDO[code]) log.sexDrive = SI_LIBIDO[code];
            else addSymptom(log, SI_SYMPTOM[code] ?? raw);
        }
        for (const raw of siCodes(e.moods)) {
            const code = raw.toLowerCase();
            addMood(log, isCustomMood(code)
                ? SI_MOOD_NAME[code] ?? code.charAt(0).toUpperCase() + code.slice(1)
                : code);
        }
    }

    // Pair each start with the next end before the following start; no end means a 1-day period.
    starts.sort(); ends.sort();
    starts.forEach((start, i) => {
        const next = starts[i + 1];
        const end = ends.find(d => d >= start && (!next || d < next));
        addPeriod(start, end ?? null);
    });

    // Drop empty shells (entries that only carried a period marker)
    for (const d of Object.keys(logs)) {
        const l = logs[d];
        if (!l.symptoms.length && !l.notes && !l.mood?.length && !l.flow && !l.discharge && !l.sexDrive && !l.sexType) delete logs[d];
    }

    const periods = mergeOverlappingPeriods([...periodsByStart.values()]);
    if (!periods.length && !Object.keys(logs).length) return null;
    return { source: 'SimpleInnovation', logs, periods };
};

// ---------------------------------------------------------------------------
// Entry point: detect + parse
// ---------------------------------------------------------------------------

export const parseExternalImport = (text: string): ExternalImportResult | null => {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        let json: unknown;
        try { json = JSON.parse(trimmed); } catch { return null; }
        try {
            return parseFloJson(json) ?? parseClueJson(json) ?? parseSimpleInnovationJson(json);
        } catch { return null; }
    }
    return parseDripCsv(text);
};

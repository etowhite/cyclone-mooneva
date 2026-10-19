import type { TFunction } from 'i18next';
import { INITIAL_SYMPTOMS, MOOD_OPTIONS } from '../../types';

/**
 * Stored names for symptoms and moods. A built-in is always stored the same way
 * (symptom: its label, "Cramps"; mood: its id, "happy"), whatever case or language it
 * arrived in. Anything else is a custom name and is kept as typed.
 *
 * Pure: translations come in through `opts`, so this file never imports i18n.
 * `t` looks a key up in the current language, `tEn` in English.
 */
export interface NameOpts {
    t?: (key: string) => string | undefined;
    tEn?: (key: string) => string | undefined;
}

const norm = (s: string) => s.trim().toLowerCase();

const resolve = (
    name: string,
    opts: NameOpts | undefined,
    items: { stored: string; id: string; key: string; label?: string }[],
): string | null => {
    const n = norm(name);
    if (!n) return null;
    for (const it of items) {
        const names = [it.id, it.label, opts?.t?.(it.key), opts?.tEn?.(it.key)];
        if (names.some(x => x && norm(x) === n)) return it.stored;
    }
    return name.trim();
};

const SYMPTOM_ITEMS = INITIAL_SYMPTOMS.map(s => ({ stored: s.label, id: s.id, key: `symptom.${s.id}`, label: s.label }));
const MOOD_ITEMS = MOOD_OPTIONS.map(m => ({ stored: m.id, id: m.id, key: m.labelKey }));

export const canonicalSymptom = (name: string, opts?: NameOpts): string | null =>
    resolve(name, opts, SYMPTOM_ITEMS);

export const canonicalMood = (name: string, opts?: NameOpts): string | null =>
    resolve(name, opts, MOOD_ITEMS);

const BUILT_IN_SYMPTOMS = new Set(INITIAL_SYMPTOMS.map(s => s.label));
const BUILT_IN_MOODS = new Set(MOOD_OPTIONS.map(m => m.id));

/** True for a stored name that is not a built-in in any spelling ("cramps" and "Cramps" are both built-in). */
export const isCustomSymptom = (name: string): boolean => {
    const c = canonicalSymptom(name);
    return c === name.trim() && !BUILT_IN_SYMPTOMS.has(c);
};
export const isCustomMood = (name: string): boolean => {
    const c = canonicalMood(name);
    return c === name.trim() && !BUILT_IN_MOODS.has(c);
};

/** Neutral grey a custom mood uses wherever a built-in mood would use its own colour. */
export const CUSTOM_MOOD_COLORS = { color: '#9ca3af', dark: '#4b5563', shadow: 'rgba(156, 163, 175, 0.4)' };

type Translate = TFunction;

/**
 * Display text for a stored symptom. A built-in goes through t(); a custom name is returned
 * exactly as typed and never reaches t(), where a dot or colon in it ("a.b", "x:y") would be
 * read as a key path or namespace and could land on another key.
 */
export const symptomLabel = (name: string, t: Translate): string =>
    isCustomSymptom(name) ? name : t(`symptom.${name.toLowerCase()}`, name);

/** Display text for a stored mood: the translated label of a built-in, a custom name as typed. */
export const moodLabel = (name: string, t: Translate): string => {
    const config = MOOD_OPTIONS.find(m => m.id === name);
    return config ? t(config.labelKey) : name;
};

/** Adds `name` to `list` unless the same name in another case is already there; an existing spelling wins. */
export const mergeName = (list: string[], name: string): string[] => {
    const n = name.trim();
    if (!n || list.some(x => norm(x) === n.toLowerCase())) return list;
    return [...list, n];
};

/**
 * Load-time repair for one log. Rewrites built-in symptoms to their label and built-in
 * moods to their id (exact name match, any case), and drops repeated symptoms and moods.
 * Unknown names are left exactly as stored. Returns true if anything changed.
 */
export const repairLogNames = (log: { symptoms?: unknown; mood?: unknown }): boolean => {
    let changed = false;
    // Repeats are found case-insensitively, like mergeName; the first spelling stays.
    const dedupe = (list: unknown[], fix: (s: string) => string | undefined): unknown[] => {
        const out: unknown[] = [];
        const seen = new Set<string>();
        for (const s of list) {
            const next = (typeof s === 'string' ? fix(s) : undefined) ?? s;
            if (typeof next === 'string') {
                const key = norm(next);
                if (seen.has(key)) { changed = true; continue; }
                seen.add(key);
            }
            if (next !== s) changed = true;
            out.push(next);
        }
        return out;
    };
    if (Array.isArray(log.symptoms)) {
        const out = dedupe(log.symptoms, s => SYMPTOM_ITEMS.find(i => i.id === s.toLowerCase() || i.label.toLowerCase() === s.toLowerCase())?.stored);
        if (changed) log.symptoms = out;
    }
    if (Array.isArray(log.mood)) {
        const before = changed;
        changed = false;
        const out = dedupe(log.mood, m => MOOD_ITEMS.find(i => i.id === m.toLowerCase())?.id);
        if (changed) log.mood = out;
        changed = changed || before;
    }
    return changed;
};

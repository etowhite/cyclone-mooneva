import React, { useEffect, useMemo, useState } from 'react';
import type { DailyLog } from '../types';
import { addDays, toLocalISOString } from '../utils/dateUtils';
import { mergeName } from '../services/logic/logNames';

interface CustomEntryChipsProps {
    /** The whole stored list for this day (built-ins included); only custom names get a chip here. */
    selected: string[];
    onChange: (next: string[]) => void;
    logs: Record<string, DailyLog>;
    /** Names a log holds for this field (meds, or the custom symptoms/moods only). */
    namesOf: (log: DailyLog) => string[];
    /** Typed text to its stored form. A built-in comes back in its built-in form. */
    canonicalize?: (name: string) => string;
    /** True for a stored name that is not a built-in. Default: everything is custom (meds). */
    isCustom?: (name: string) => boolean;
    placeholder: string;
    variant?: 'med' | 'custom';
    /** Look of a selected chip, so a custom entry matches the built-in ones of its tab. */
    selectedLook?: { className?: string; style?: React.CSSProperties };
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Chips for free-text names: the names used in the last 60 days, anything selected on this
 * day, a "+ name" chip and a text field. Used by medications, custom symptoms and custom moods.
 */
const CustomEntryChips: React.FC<CustomEntryChipsProps> = ({
    selected, onChange, logs, namesOf, canonicalize, isCustom = () => true, placeholder, variant = 'med', selectedLook,
}) => {
    const [input, setInput] = useState('');
    // The name an add just offered to the parent. The typed text is only cleared once the
    // parent's list holds it, so a refused add (the 6th mood) keeps what was typed.
    const [offered, setOffered] = useState<string | null>(null);
    useEffect(() => {
        if (offered === null) return;
        if (selected.some(m => same(m, offered))) setInput('');
        setOffered(null);
    }, [offered, selected]);

    // Names logged in the last 60 days, newest first. Older names come back by typing,
    // so a year of one-off entries never piles up.
    const recent = useMemo(() => {
        const cutoff = addDays(toLocalISOString(new Date()), -60);
        const seen = new Map<string, string>();
        for (const d of Object.keys(logs).sort((a, b) => b.localeCompare(a))) {
            if (d < cutoff) break;
            for (const name of namesOf(logs[d])) {
                if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
            }
        }
        return [...seen.values()];
    }, [logs, namesOf]);

    // Anything selected on this date stays visible even if it was last used long ago.
    const options = useMemo(() => {
        const out = selected.filter(isCustom);
        recent.forEach(name => {
            if (!out.some(m => same(m, name))) out.push(name);
        });
        return out;
    }, [selected, recent, isCustom]);

    const query = input.trim();
    const visible = query ? options.filter(m => m.toLowerCase().includes(query.toLowerCase())) : options;
    const canAdd = query.length > 0 && !options.some(m => same(m, query));

    const toggle = (name: string) => {
        onChange(selected.some(m => same(m, name))
            ? selected.filter(m => !same(m, name))
            : [...selected, name]);
    };

    const add = () => {
        if (!query) return;
        const stored = canonicalize ? canonicalize(query) : query;
        // Reuse the stored spelling so "iron" and "Iron" stay one entry.
        const name = isCustom(stored) ? options.find(m => same(m, stored)) || stored : stored;
        // A built-in name that is already selected stays selected: Enter adds, it never toggles off.
        if (!isCustom(stored) && selected.some(m => same(m, stored))) setInput('');
        else {
            onChange(isCustom(stored) ? mergeName(selected, name) : [...selected, stored]);
            setOffered(name);
        }
    };

    const custom = variant === 'custom';
    const size = custom ? 'px-2.5 py-1 rounded-lg text-[10px] font-semibold' : 'px-3 py-2 rounded-xl text-[11px] font-bold';

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
                {canAdd && (
                    <button
                        type="button"
                        onClick={add}
                        className={`daily-log-med-chip daily-log-med-chip-new ${size} transition-all active:scale-[0.97] ${custom ? 'bg-slate-500 text-white' : 'bg-[#5b7a82] text-white'}`}
                    >
                        + {query}
                    </button>
                )}
                {visible.map(name => {
                    const isOn = selected.some(m => same(m, name));
                    const matched = isOn && selectedLook;
                    const look = matched
                        ? `daily-log-med-chip-on border ${selectedLook.className ?? ''}`
                        : custom
                        ? (isOn ? 'daily-log-med-chip-on bg-slate-100 border-slate-400 text-slate-700'
                            : 'daily-log-med-chip-off bg-slate-100 border-transparent text-slate-500')
                        : (isOn ? 'daily-log-med-chip-on bg-cyan-50 border-cyan-400 text-cyan-700'
                            : 'daily-log-med-chip-off bg-white border-transparent text-slate-500 shadow-[1px_1px_2px_rgba(163,177,198,0.4)]');
                    return (
                        <button
                            key={name.toLowerCase()}
                            type="button"
                            aria-pressed={isOn}
                            onClick={() => toggle(name)}
                            className={`daily-log-med-chip ${size} transition-all active:scale-[0.97] ${matched ? '' : 'border-2'} ${look}`}
                            style={matched ? selectedLook.style : undefined}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>
            <input
                type="text"
                value={input}
                maxLength={40}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        add();
                    }
                }}
                placeholder={placeholder}
                aria-label={placeholder}
                className={`daily-log-med-input w-full ${custom ? 'p-2 text-[11px]' : 'p-3 text-xs'} font-medium text-slate-700 placeholder-slate-400 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-0 focus:border-slate-300 transition-all`}
            />
        </div>
    );
};

export default CustomEntryChips;

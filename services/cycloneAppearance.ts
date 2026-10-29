import { useEffect, useState } from 'react';
export type Palette = 'rose' | 'lavender' | 'sage' | 'ocean' | 'amber';
export type Mode = 'auto' | 'light' | 'dark';
export interface Appearance { palette: Palette; mode: Mode }
const key = 'cyclone.appearance.v1';
export const palettes: Palette[] = ['rose', 'lavender', 'sage', 'ocean', 'amber'];
function read(): Appearance {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '{}');
        return { palette: palettes.includes(value.palette) ? value.palette : 'rose',
            mode: ['auto','light','dark'].includes(value.mode) ? value.mode : 'auto' };
    } catch { return { palette: 'rose', mode: 'auto' }; }
}
export function useCycloneAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(read);
    const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
    useEffect(() => {
        const media = matchMedia('(prefers-color-scheme: dark)');
        const changed = () => setSystemDark(media.matches);
        const sync = () => setAppearance(read());
        media.addEventListener('change', changed);
        window.addEventListener('cyclone-appearance', sync);
        window.addEventListener('storage', sync);
        return () => { media.removeEventListener('change', changed); window.removeEventListener('cyclone-appearance', sync); window.removeEventListener('storage', sync); };
    }, []);
    const update = (next: Appearance) => {
        localStorage.setItem(key, JSON.stringify(next));
        setAppearance(next);
        window.dispatchEvent(new Event('cyclone-appearance'));
    };
    return { appearance, update, isDark: appearance.mode === 'dark' || (appearance.mode === 'auto' && systemDark) };
}

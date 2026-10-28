import i18n from 'i18next';
import type { BackendModule, ReadCallback } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { formatNumber } from './displayFormat';

// --- Translation Resources ---
// English is bundled so there is always a working fallback on first paint.
// Every other locale is a separate chunk fetched only when actually selected,
// which keeps all-but-one translation out of the boot payload and out of RAM.
import en from '../locales/en.json';

// Vite turns this into a code-split loader per file WITHOUT reading any of them,
// so the language list stays derived from locales/ instead of hand-maintained.
const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>(['../locales/en.json', '../locales/ru.json']);

const codeFromPath = (path: string) => path.slice(path.lastIndexOf('/') + 1, -'.json'.length);

const loaderByCode: Record<string, () => Promise<{ default: Record<string, unknown> }>> =
    Object.fromEntries(Object.entries(localeLoaders).map(([path, load]) => [codeFromPath(path), load]));

const lazyLocaleBackend: BackendModule = {
    type: 'backend',
    init: () => { },
    read: (language: string, _namespace: string, callback: ReadCallback) => {
        const load = loaderByCode[language];
        if (!load) {
            // Unknown language: report failure so i18next falls back to `en`.
            callback(new Error(`No locale file for "${language}"`), false);
            return;
        }
        load()
            .then((mod) => callback(null, mod.default))
            .catch((err: unknown) => callback(err instanceof Error ? err : new Error(String(err)), false));
    },
};

export const i18nReady = i18n
    .use(lazyLocaleBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: { en: { translation: en } },
        partialBundledLanguages: true,
        supportedLngs: Object.keys(loaderByCode),
        // Map regional tags (pt-BR, en-US) onto the base file we actually ship.
        load: 'languageOnly',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
            // alwaysFormat sends every {{value}} here, not only ones with a format name.
            // Numbers get the app's digits; strings (already formatted) pass through.
            alwaysFormat: true,
            format: (value, _format, lng) => (typeof value === 'number' ? formatNumber(value, lng) : value),
        },
        detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage', 'cookie']
        }
    });

const applyLocaleSettings = (lng: string) => {
    document.documentElement.lang = lng;
    // i18next knows which scripts are RTL (ar, fa, he, ur, ...), so new RTL locales
    // work without another hand-maintained list here.
    document.dir = i18n.dir(lng);
};

i18n.on('languageChanged', (lng) => {
    applyLocaleSettings(lng);
});

// Apply settings immediately if already initialized, otherwise wait for event
if (i18n.isInitialized) {
    applyLocaleSettings(i18n.language);
} else {
    i18n.on('initialized', () => {
        applyLocaleSettings(i18n.language);
    });
}

export default i18n;

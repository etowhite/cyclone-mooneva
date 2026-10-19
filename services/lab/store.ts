// Lab data store. Module-level state, no React provider, so Lab code loads only when
// something imports it (the Lab UI and the lazy backup paths). One encrypted key,
// LAB_STORAGE_KEY, written with the same device key as core data.
// See project_details/business_logic.md#lab-module.
import { App } from '@capacitor/app';
import Logger from '../logger';
import { LAB_STORAGE_KEY, encryptString, decryptString, isWiping } from '../logic/storage';
import {
    DEFAULT_LAB_SETTINGS,
    EMPTY_LAB_DATA,
    REMINDER_LEAD_MINUTES,
    clampBloodFraction,
    type LabData,
    type LabDevice,
    type LabEvent,
    type LabSettings,
} from '../logic/lab';

export type LabStatus = 'idle' | 'loading' | 'ready' | 'failed';
export interface LabState {
    status: LabStatus;
    data: LabData;
}

const SAVE_DEBOUNCE_MS = 1000;

let state: LabState = { status: 'idle', data: EMPTY_LAB_DATA };
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let writeChain: Promise<void> = Promise.resolve();
let appListenerRegistered = false;

const setState = (next: LabState) => {
    state = next;
    listeners.forEach((l) => l());
};

export const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};
export const getSnapshot = (): LabState => state;

// Log the error kind only: a JSON.parse message can quote the data it choked on.
const errName = (e: unknown): string => (e instanceof Error ? e.name : 'unknown');

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

const DEVICE_TYPES = ['cup', 'disc', 'pad', 'tampon'];
const ABSORBENCIES = ['light', 'regular', 'maxi', 'super'];
const SATURATIONS = ['light', 'moderate', 'saturated'];
const AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const okNum = (v: unknown): boolean => v === undefined || (typeof v === 'number' && Number.isFinite(v));
const okCapacity = (v: unknown): boolean => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v > 0);
const okAbsorbency = (v: unknown): boolean => v === undefined || ABSORBENCIES.includes(v as string);

const isValidDevice = (v: unknown): v is LabDevice =>
    isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string'
    && DEVICE_TYPES.includes(v.type as string) && typeof v.isActive === 'boolean'
    && okCapacity(v.capacityMl) && okAbsorbency(v.absorbency);

const isValidEvent = (v: unknown): v is LabEvent => {
    if (!isRecord(v) || typeof v.id !== 'string' || typeof v.deviceId !== 'string') return false;
    if (typeof v.at !== 'string' || !AT_RE.test(v.at)) return false;
    if (!DEVICE_TYPES.includes(v.deviceType as string)) return false;
    if (!okNum(v.fullnessPct) || !okCapacity(v.capacityMl) || !okAbsorbency(v.absorbency)) return false;
    if (v.final !== undefined && typeof v.final !== 'boolean') return false;
    if (v.pbac !== undefined) {
        const p = v.pbac;
        if (!(isRecord(p) && SATURATIONS.includes(p.saturation as string) && typeof p.flooding === 'boolean'
            && okNum(p.clotsSmall) && okNum(p.clotsLarge))) return false;
    }
    return true;
};

/**
 * Invalid devices and events found on load or restore. They are not shown, but they are written
 * back unchanged with every save, so a bad entry is never lost silently.
 */
interface Rejected { devices: unknown[]; events: unknown[] }
const NO_REJECTED: Rejected = { devices: [], events: [] };
let rejected: Rejected = NO_REJECTED;

/** Returns clean LabData plus the invalid items, or null when the shape is wrong or the version is unknown. */
const parseLabData = (raw: unknown): { data: LabData; rejected: Rejected } | null => {
    if (!isRecord(raw) || raw.v !== 1) return null;
    if (!Array.isArray(raw.devices) || !Array.isArray(raw.events)) return null;
    const devices = raw.devices.filter(isValidDevice);
    const events = raw.events.filter(isValidEvent);
    const bad: Rejected = {
        devices: raw.devices.filter((x) => !isValidDevice(x)),
        events: raw.events.filter((x) => !isValidEvent(x)),
    };
    const dropped = bad.devices.length + bad.events.length;
    if (dropped > 0) Logger.warn(`Hid ${dropped} invalid Lab entries while loading (kept in storage)`);
    if (!isRecord(raw.settings)) return null;
    const s = raw.settings;
    const settings: LabSettings = {
        bloodFraction: clampBloodFraction(typeof s.bloodFraction === 'number' ? s.bloodFraction : DEFAULT_LAB_SETTINGS.bloodFraction),
        reminderOn: typeof s.reminderOn === 'boolean' ? s.reminderOn : DEFAULT_LAB_SETTINGS.reminderOn,
        reminderLeadMin: (REMINDER_LEAD_MINUTES as readonly number[]).includes(s.reminderLeadMin as number)
            ? (s.reminderLeadMin as LabSettings['reminderLeadMin'])
            : DEFAULT_LAB_SETTINGS.reminderLeadMin,
        ...(typeof s.stoppedAt === 'string' && AT_RE.test(s.stoppedAt) ? { stoppedAt: s.stoppedAt } : {}),
    };
    return { data: { v: 1, devices, events, settings }, rejected: dropped > 0 ? bad : NO_REJECTED };
};

// --- Saving ---

/** What goes to disk: the data plus the invalid items found on load, unchanged. */
const toStored = (data: LabData): LabData => (rejected === NO_REJECTED ? data : {
    ...data,
    devices: [...data.devices, ...rejected.devices] as LabDevice[],
    events: [...data.events, ...rejected.events] as LabEvent[],
});

const writeNow = async (): Promise<void> => {
    // Same rule as Cycle's *LoadFailedRef: never overwrite data that failed to load.
    if (state.status !== 'ready') {
        Logger.warn('Skipping Lab save: Lab data is not loaded, refusing to overwrite possibly-undecrypted data');
        return;
    }
    if (isWiping()) return;
    try {
        const encrypted = await encryptString(JSON.stringify(toStored(state.data)));
        if (isWiping()) return; // a pending save must not bring Lab data back after a wipe
        localStorage.setItem(LAB_STORAGE_KEY, encrypted);
    } catch (e) {
        dirty = true;
        Logger.error('Failed to save Lab data:', errName(e));
    }
};

/** Write any pending change right now. Never rejects. */
export const flushLabNow = (): Promise<void> => {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    if (dirty) {
        dirty = false;
        writeChain = writeChain.then(writeNow);
    }
    return writeChain;
};

const scheduleSave = () => {
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void flushLabNow(); }, SAVE_DEBOUNCE_MS);
};

// --- Loading ---

const load = async (): Promise<void> => {
    let next: LabState;
    try {
        const stored = localStorage.getItem(LAB_STORAGE_KEY);
        if (!stored) {
            next = { status: 'ready', data: EMPTY_LAB_DATA };
        } else {
            const parsed = parseLabData(JSON.parse(await decryptString(stored)));
            if (parsed) {
                rejected = parsed.rejected;
                next = { status: 'ready', data: parsed.data };
            } else {
                Logger.error('Lab data has an unknown shape or version; saves are disabled');
                next = { status: 'failed', data: EMPTY_LAB_DATA };
            }
        }
    } catch (e) {
        Logger.error('Failed to load Lab data; saves are disabled', errName(e));
        next = { status: 'failed', data: EMPTY_LAB_DATA };
    }
    // A backup restore may have replaced the state while we were reading.
    if (state.status === 'loading') setState(next);
};

/** Load once. Safe to call from every mount. */
export const ensureLoaded = (): Promise<void> => {
    if (loadPromise) return loadPromise;
    if (!appListenerRegistered) {
        appListenerRegistered = true;
        // Android can kill a backgrounded WebView, so going inactive is the last safe moment to save.
        App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) void flushLabNow();
        }).catch(() => { appListenerRegistered = false; });
    }
    setState({ status: 'loading', data: state.data });
    loadPromise = load();
    return loadPromise;
};

/** Retry a failed load from disk. Does nothing unless the load failed. Saves stay refused until it succeeds. */
const retryLoad = (): Promise<void> => {
    if (state.status !== 'failed') return loadPromise ?? Promise.resolve();
    loadPromise = null;
    return ensureLoaded();
};

/** Delete only the Lab key and start from empty ready data. Cycle keys are untouched. */
const resetLabData = async (): Promise<void> => {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    dirty = false;
    await writeChain;
    localStorage.removeItem(LAB_STORAGE_KEY);
    rejected = NO_REJECTED;
    loadPromise = Promise.resolve();
    setState({ status: 'ready', data: EMPTY_LAB_DATA });
};

// --- Mutations ---

const mutate = (fn: (d: LabData) => LabData): boolean => {
    if (state.status !== 'ready') {
        Logger.warn('Lab change refused: Lab data is not loaded');
        return false;
    }
    setState({ status: 'ready', data: fn(state.data) });
    scheduleSave();
    return true;
};

export const labActions = {
    retryLoad,
    resetLabData,
    /** The new device becomes active when no other device is. Returns its id, or undefined when refused. */
    addDevice(device: Omit<LabDevice, 'id' | 'isActive'>): string | undefined {
        const id = crypto.randomUUID();
        const ok = mutate((d) => ({
            ...d,
            devices: [...d.devices, { ...device, id, isActive: !d.devices.some((x) => x.isActive) }],
        }));
        return ok ? id : undefined;
    },
    updateDevice(id: string, patch: Partial<Omit<LabDevice, 'id' | 'isActive'>>): void {
        mutate((d) => ({ ...d, devices: d.devices.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    },
    /** Past events keep their own copy of the device details, so history is untouched. */
    removeDevice(id: string): void {
        mutate((d) => ({ ...d, devices: d.devices.filter((x) => x.id !== id) }));
    },
    setActiveDevice(id: string): void {
        mutate((d) => (d.devices.some((x) => x.id === id)
            ? { ...d, devices: d.devices.map((x) => ({ ...x, isActive: x.id === id })) }
            : d));
    },
    /**
     * A new entry makes its device the one in use, unless it is final (nothing goes back in)
     * or it is backdated (an older entry than the newest one says nothing about now).
     */
    addEvent(event: Omit<LabEvent, 'id'>): string | undefined {
        const id = crypto.randomUUID();
        const ok = mutate((d) => {
            const newest = d.events.every((x) => x.at <= event.at);
            const switches = newest && !event.final && d.devices.some((x) => x.id === event.deviceId);
            return {
                ...d,
                events: [...d.events, { ...event, id }],
                devices: switches ? d.devices.map((x) => ({ ...x, isActive: x.id === event.deviceId })) : d.devices,
            };
        });
        return ok ? id : undefined;
    },
    updateEvent(id: string, patch: Partial<Omit<LabEvent, 'id'>>): void {
        mutate((d) => ({ ...d, events: d.events.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    },
    removeEvent(id: string): void {
        mutate((d) => ({ ...d, events: d.events.filter((x) => x.id !== id) }));
    },
    updateLabSettings(patch: Partial<LabSettings>): void {
        mutate((d) => {
            const settings = { ...d.settings, ...patch };
            settings.bloodFraction = clampBloodFraction(settings.bloodFraction);
            return { ...d, settings };
        });
    },
};
export type LabActions = typeof labActions;

// --- Backup seams (called by core through services/lab/index.ts) ---

/** Lab data as stored on disk, or undefined when there is none (or it cannot be read). */
export const loadLabForBackup = async (): Promise<unknown | undefined> => {
    await flushLabNow(); // a manual backup should include an edit made a moment ago
    const stored = localStorage.getItem(LAB_STORAGE_KEY);
    if (!stored) return undefined;
    try {
        return JSON.parse(await decryptString(stored));
    } catch (e) {
        // Unreadable Lab data must not block a backup of the core data.
        Logger.error('Could not read Lab data for backup', errName(e));
        return undefined;
    }
};

/** Replace Lab data from a backup. Returns false (and writes nothing) when the shape is invalid. */
export const saveLabFromBackup = async (raw: unknown): Promise<boolean> => {
    const parsed = parseLabData(raw);
    if (!parsed) {
        Logger.warn('Backup Lab data has an unknown shape or version; keeping current Lab data');
        return false;
    }
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    dirty = false;
    await writeChain;
    rejected = parsed.rejected;
    localStorage.setItem(LAB_STORAGE_KEY, await encryptString(JSON.stringify(toStored(parsed.data))));
    // A restore deliberately replaces even a Lab state that failed to load.
    setState({ status: 'ready', data: parsed.data });
    loadPromise = loadPromise ?? Promise.resolve();
    return true;
};

/** Test-only: forget everything so each test starts from a fresh module state. */
export const __resetLabStoreForTests = (): void => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    dirty = false;
    writeChain = Promise.resolve();
    loadPromise = null;
    appListenerRegistered = false;
    rejected = NO_REJECTED;
    listeners.clear();
    state = { status: 'idle', data: EMPTY_LAB_DATA };
};

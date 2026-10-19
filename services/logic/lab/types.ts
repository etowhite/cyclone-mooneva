// Lab data types. Pure types and constants, no React, no storage.
// See project_details/business_logic.md#lab-module.

export type DeviceType = 'cup' | 'disc' | 'pad' | 'tampon';
export type Absorbency = 'light' | 'regular' | 'maxi' | 'super';
export type Saturation = 'light' | 'moderate' | 'saturated';
/** Device types scored with a PBAC pictogram. */
export type PbacDeviceType = 'pad' | 'tampon';

export interface LabDevice {
    id: string;
    name: string;
    type: DeviceType;
    /** cup and disc only */
    capacityMl?: number;
    /** pad and tampon only */
    absorbency?: Absorbency;
    isActive: boolean;
}

export interface PbacEntry {
    saturation: Saturation;
    clotsSmall: number;
    clotsLarge: number;
    flooding: boolean;
}

/**
 * One emptying (cup, disc) or change (pad, tampon).
 * Device type, capacity and absorbency are copied onto the event on purpose:
 * editing or deleting a device later must never rewrite history.
 * `at` is a LOCAL date-time 'YYYY-MM-DDTHH:mm' with no timezone, so the first 10
 * characters are the same local day string Cycle uses as its date key.
 */
export interface LabEvent {
    id: string;
    at: string;
    deviceId: string;
    deviceType: DeviceType;
    capacityMl?: number;
    absorbency?: Absorbency;
    /** cup and disc, 0 to 150 */
    fullnessPct?: number;
    /** pad and tampon */
    pbac?: PbacEntry;
    /** true: the user put no new device in after this one, so the timer stops here. */
    final?: boolean;
}

/** The lead times the reminder settings offer, in minutes before the device is full. */
export const REMINDER_LEAD_MINUTES = [0, 30, 60] as const;

export interface LabSettings {
    /** Share of cup/disc fluid counted as blood. Clamped to BLOOD_FRACTION_MIN..MAX where used. */
    bloodFraction: number;
    reminderOn: boolean;
    reminderLeadMin: (typeof REMINDER_LEAD_MINUTES)[number];
    /**
     * 'YYYY-MM-DDTHH:mm', set by "I'm not using one" on an old overdue timer: entries at or before it
     * no longer run the timer. A later entry starts it again. Absent until the user does that.
     */
    stoppedAt?: string;
}

export interface LabData {
    v: 1;
    devices: LabDevice[];
    events: LabEvent[];
    settings: LabSettings;
}

/** Default 0.36 is the mean blood share in Fraser et al. 1985 (see blood.ts). */
export const DEFAULT_LAB_SETTINGS: LabSettings = {
    bloodFraction: 0.36,
    reminderOn: true,
    reminderLeadMin: 30,
};

export const BLOOD_FRACTION_MIN = 0.2;
export const BLOOD_FRACTION_MAX = 0.6;

/** The preselectable products: the Mooneva menstrual disc in its two sizes (Mooneva product sheet). */
export const MOONEVA_DISCS = [
    { name: 'Mooneva Disc - Small', type: 'disc', capacityMl: 30 },
    { name: 'Mooneva Disc - Regular', type: 'disc', capacityMl: 60 },
] as const;

export type MoonevaDisc = (typeof MOONEVA_DISCS)[number];

export const EMPTY_LAB_DATA: LabData = {
    v: 1,
    devices: [],
    events: [],
    settings: DEFAULT_LAB_SETTINGS,
};

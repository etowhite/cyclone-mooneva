// Fluid volume of one Lab event, in mL. Pure.

import type { LabEvent } from './types';
import { DEFAULT_ABSORBENCY, pbacFluidMl, productCapacityMl } from './pbac';

/** Capacity the device form starts with for a new cup or disc. */
export const NEW_DEVICE_CAPACITY_ML = { cup: 30, disc: 60 } as const;
/** Used when a cup or disc has no capacity stored. A different question from the form default, so disc stays 30 here. */
export const DEFAULT_CAPACITY_ML: number = NEW_DEVICE_CAPACITY_ML.cup;
const MAX_FULLNESS_PCT = 150;

/** What the device held, as stored on the event (so later device edits change nothing). */
export const eventCapacityMl = (event: LabEvent): number => {
    if (event.deviceType === 'pad' || event.deviceType === 'tampon') {
        return productCapacityMl(event.deviceType, event.absorbency ?? DEFAULT_ABSORBENCY);
    }
    return event.capacityMl || DEFAULT_CAPACITY_ML;
};

/**
 * Cup and disc: fullness % of capacity, rounded to whole mL (0 to 150 % allowed).
 * Pad and tampon: the saturation-share estimate from pbac.ts, 0 when there is no PBAC entry.
 */
export const eventFluidMl = (event: LabEvent): number => {
    if (event.deviceType === 'pad' || event.deviceType === 'tampon') {
        return event.pbac ? pbacFluidMl(event.deviceType, event.absorbency, event.pbac) : 0;
    }
    const pct = Math.min(MAX_FULLNESS_PCT, Math.max(0, event.fullnessPct ?? 0));
    return Math.round((pct / 100) * eventCapacityMl(event));
};

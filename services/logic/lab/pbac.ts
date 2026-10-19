// PBAC (Pictorial Blood Assessment Chart) points and the pad/tampon fluid estimate.
// Pure functions, trimmed to what the device timer and the blood estimate need.

import type { Absorbency, PbacDeviceType, PbacEntry, Saturation } from './types';

/**
 * Higham JM, O'Brien PM, Shaw RW. Br J Obstet Gynaecol 1990;97:734-9.
 * DOI 10.1111/j.1471-0528.1990.tb16249.x
 * Tampons score 1 / 5 / 10 for light / moderate / saturated, pads 1 / 5 / 20.
 */
const SATURATION_POINTS: Record<PbacDeviceType, Record<Saturation, number>> = {
    pad: { light: 1, moderate: 5, saturated: 20 },
    tampon: { light: 1, moderate: 5, saturated: 10 },
};
const CLOT_SMALL_POINTS = 1;
const CLOT_LARGE_POINTS = 5;
const FLOODING_POINTS = 5;
/** Fluid per clot point, and the extra fluid when a product flooded. Lab's own estimates, not from a paper. */
const ML_PER_CLOT_POINT = 2;
const FLOODING_ML = 5;

/**
 * Rough mL per PBAC point. It comes from the cutoff "100 points is about 80 mL" in
 * Higham 1990 (DOI 10.1111/j.1471-0528.1990.tb16249.x). That paper validated the
 * 100-point cutoff only. It is NOT a validated per-point conversion, so the UI must
 * label any mL built from it as rough.
 */
export const ML_PER_PBAC_POINT = 0.8;

export const pbacPoints = (type: PbacDeviceType, entry: PbacEntry): number =>
    SATURATION_POINTS[type][entry.saturation]
    + entry.clotsSmall * CLOT_SMALL_POINTS
    + entry.clotsLarge * CLOT_LARGE_POINTS
    + (entry.flooding ? FLOODING_POINTS : 0);

/** Used when an event has no absorbency (should not happen; keeps the math total). */
export const DEFAULT_ABSORBENCY: Absorbency = 'regular';

/**
 * Max fluid one product holds, in mL. Values from Lab's PBAC_LOOKUP_TABLE and its
 * fallback table: these are Lab's own estimates, not a published standard.
 * Lab's table has no "maxi" tampon or "super" pad; Lab fell back to 12 for them.
 */
const PRODUCT_CAPACITY_ML: Record<PbacDeviceType, Record<Absorbency, number>> = {
    pad: { light: 5, regular: 8, maxi: 12, super: 12 },
    tampon: { light: 5, regular: 9, maxi: 12, super: 12 },
};

export const productCapacityMl = (type: PbacDeviceType, absorbency: Absorbency = DEFAULT_ABSORBENCY): number =>
    PRODUCT_CAPACITY_ML[type][absorbency];

/** Share of the product's capacity that is filled, by how it looks. */
const SATURATION_SHARE: Record<Saturation, number> = { light: 0.2, moderate: 0.5, saturated: 1 };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Fluid (not blood) in one pad or tampon, in mL. Ported from Lab's
 * calculateHybridPBACVolume, fluid part only:
 *   fluid = capacity x saturation share
 *         + ML_PER_CLOT_POINT mL per clot point (small clot 2 mL, large clot 10 mL)
 *   flooding: a saturated product adds FLOODING_ML overflow; any other product is raised
 *   to full capacity first, then adds FLOODING_ML.
 * Lab's own estimates, not from a paper.
 */
export const pbacFluidMl = (type: PbacDeviceType, absorbency: Absorbency | undefined, entry: PbacEntry): number => {
    const capacity = productCapacityMl(type, absorbency);
    let fluid = capacity * SATURATION_SHARE[entry.saturation];
    fluid += (entry.clotsSmall * CLOT_SMALL_POINTS + entry.clotsLarge * CLOT_LARGE_POINTS) * ML_PER_CLOT_POINT;
    if (entry.flooding) {
        if (entry.saturation !== 'saturated') fluid = Math.max(fluid, capacity);
        fluid += FLOODING_ML;
    }
    return round2(fluid);
};

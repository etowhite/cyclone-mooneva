// Blood estimate for a set of events (normally one period). Pure.

import type { LabEvent } from './types';
import { BLOOD_FRACTION_MAX, BLOOD_FRACTION_MIN, DEFAULT_LAB_SETTINGS } from './types';
import { ML_PER_PBAC_POINT, pbacPoints } from './pbac';
import { eventFluidMl } from './volume';

/**
 * The 80 mL reference line: the "classic" research definition of heavy menstrual bleeding, per
 * Bofill Rodriguez M, Lethaby A, Jordan V. Cochrane Database Syst Rev 2020;6:CD002126,
 * DOI 10.1002/14651858.CD002126.pub4 (checked in PubMed): "classically defined as greater than or
 * equal to 80 mL of blood loss per menstrual cycle. Currently the definition is based on the
 * woman's perception". The older population study usually named as its origin, Hallberg et al. 1966
 * (Acta Obstet Gynecol Scand 45:320-51), has no PubMed abstract and is not cited in the app.
 */
export const REFERENCE_ML = 80;

/**
 * Default blood share of cup/disc fluid is 0.36: mean 36.1% (range 1.6 to 81.7%, 28 women)
 * in Fraser et al. 1985, Obstet Gynecol 65:194-8, PMID 3969232. See types.ts DEFAULT_LAB_SETTINGS.
 */
export interface PeriodBlood {
    cupDiscFluidMl: number;
    cupDiscBloodMl: number;
    pbacScore: number;
    /** Rough, see ML_PER_PBAC_POINT. */
    pbacRoughMl: number;
    totalEstimateMl: number;
    eventCount: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export const clampBloodFraction = (f: number): number =>
    Number.isFinite(f)
        ? Math.min(BLOOD_FRACTION_MAX, Math.max(BLOOD_FRACTION_MIN, f))
        : DEFAULT_LAB_SETTINGS.bloodFraction;

/**
 * Cup and disc: blood = fluid x clamp(bloodFraction, 0.20, 0.60).
 * Pad and tampon: PBAC score = sum of points, rough mL = score x 0.8 (not blood fraction).
 * Total = cup/disc blood + rough pad/tampon mL. Mls are rounded to 0.1.
 * A pad or tampon event without a PBAC entry scores 0.
 */
export const periodBlood = (events: LabEvent[], bloodFraction: number): PeriodBlood => {
    const fraction = clampBloodFraction(bloodFraction);
    let fluid = 0;
    let score = 0;
    for (const e of events) {
        if (e.deviceType === 'pad' || e.deviceType === 'tampon') {
            if (e.pbac) score += pbacPoints(e.deviceType, e.pbac);
        } else {
            fluid += eventFluidMl(e);
        }
    }
    const cupDiscBloodMl = round1(fluid * fraction);
    const pbacRoughMl = round1(score * ML_PER_PBAC_POINT);
    return {
        cupDiscFluidMl: fluid,
        cupDiscBloodMl,
        pbacScore: score,
        pbacRoughMl,
        totalEstimateMl: round1(cupDiscBloodMl + pbacRoughMl),
        eventCount: events.length,
    };
};

/**
 * Whole-mL values for display. The total is the sum of the two rounded parts, so a
 * breakdown "cup/disc + pad/tampon" always adds up to the total shown.
 */
export const bloodDisplayMl = (b: PeriodBlood): { cupDiscMl: number; pbacMl: number; totalMl: number } => {
    const cupDiscMl = Math.round(b.cupDiscBloodMl);
    const pbacMl = Math.round(b.pbacRoughMl);
    return { cupDiscMl, pbacMl, totalMl: cupDiscMl + pbacMl };
};

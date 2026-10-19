import type { TFunction } from 'i18next';
import { AppSettings, DayMeta } from '../../types';
import { addDays, diffInDays, getTodayStr } from '../../utils/dateUtils';
import { getCycleVisibility } from './settingsInterlocks';
import type { CycleDayInfo } from './cycleModel';

/** Where the cycle is today, as a stable key. Views that need to branch on the phase
 *  must read this, never match on the translated `subtitle`. */
export type CyclePhaseKey =
    | 'neutral'
    | 'birth_control'
    | 'menstrual'
    | 'follicular'
    | 'ovulation'
    | 'luteal'
    | 'pms'
    | 'late';

export type CycleDayPhase = Exclude<CyclePhaseKey, 'neutral' | 'birth_control' | 'late'>;

export interface CycleStatusData {
    title: string;
    subtitle: string;
    chance?: string;
    chanceVariant?: 'low' | 'medium' | 'high' | 'peak';
    statusVariant?: 'neutral' | 'warning' | 'primary' | 'success' | 'info' | 'secondary';
    dayOfCycle?: number;
    /** Absent when the day is past the cycle length: "Day N" then has no total. */
    cycleLength?: number;
    /** True when `title` is the "Day N" headline, so the view can render N/total
     *  through one translated template instead of gluing "/total" on the end. */
    titleIsCycleDay?: boolean;
    dayOfPeriod?: number;
    periodLength?: number;
    phaseKey: CyclePhaseKey;
}

/**
 * Pure mapping of one day's DayMeta and cycle-model facts into localized card labels.
 * Works for any date. Only today gets relative wording (late, due, expected, period in N days);
 * every other date reads "Day N/total" plus its phase.
 *
 * UX-Optimized Color Logic:
 * - Primary (Rose): Active or expected period - healthy, normal function
 * - Warning (Amber): Period late/due - requires attention
 * - Success (Teal): Fertile window - actionable for TTC users
 * - Info (Blue): Approaching period - informational
 * - Secondary (Purple): Normal cycle days
 * - Neutral (Gray): No data or paused
 */
export const calculateCycleStatus = (
    meta: DayMeta,
    day: CycleDayInfo,
    /** The forecast period length, for a logged-flow day that is not in a finished cycle. */
    forecastPeriodLength: number,
    settings: AppSettings,
    t: TFunction,
): CycleStatusData => {
    // 0. Pregnancy answers "what is my body doing" better than anything below, and the
    // forecast is already suppressed upstream while the span is open. Sits above the
    // paused notice because the two are independent: marking a pregnancy never touches
    // settings, so a user can be pregnant without having paused anything.
    if (meta.isPregnancy) {
        return {
            title: t('dashboard.pregnancy', 'Pregnancy'),
            subtitle: t('dashboard.pregnancy_week', { week: meta.pregnancyWeek ?? 1 }),
            statusVariant: 'info',
            phaseKey: 'neutral'
        };
    }

    // 1. Terminate if predictions are paused
    if (settings.predictionsPaused) {
        return {
            title: t('dashboard.tracking_paused'),
            subtitle: t('dashboard.resume_predictions', 'Resume to see predictions'),
            statusVariant: 'neutral',
            phaseKey: 'neutral'
        };
    }

    // 2. No period logged at all (a stale record or an ended pregnancy is not "no data": it has its own card below).
    const noData = day.kind === 'none' && !day.isStale && !day.awaitingPeriod;
    if (noData) {
        if (settings.isOnBirthControl) {
            return {
                title: t('dashboard.protected', 'Protected'),
                subtitle: t('dashboard.log_to_start', 'Log period to start'),
                statusVariant: 'info',
                phaseKey: 'birth_control'
            };
        }
        return {
            title: t('dashboard.hello', 'Hello'),
            subtitle: t('dashboard.log_to_start', 'Log period to start'),
            statusVariant: 'neutral',
            phaseKey: 'neutral'
        };
    }

    // 3. Before the first logged period: count down to it.
    if (day.kind === 'before_first' && meta.date < getTodayStr()) {
        return {
            title: t('dashboard.no_cycle_data', 'No cycle data for this day'),
            subtitle: '',
            statusVariant: 'neutral',
            dayOfCycle: undefined,
            phaseKey: 'neutral'
        };
    }
    if (day.kind === 'before_first') {
        return {
            title: t('dashboard.period_in', { count: diffInDays(day.nextStart!, meta.date) }),
            subtitle: t('timeline.upcoming', 'Upcoming'),
            statusVariant: 'info',
            chance: undefined,
            chanceVariant: undefined,
            dayOfCycle: undefined, // No cycle day before first period
            phaseKey: 'neutral'
        };
    }

    // 4. A forecast built on a months-old record isn't a late period, it's missing data.
    // Say so instead of printing an overdue count nobody should act on. The days after a
    // pregnancy ended, before a period, are the same: nothing to forecast from.
    // A day inside a finished cycle is real history and keeps its normal card.
    if ((day.isStale && day.kind !== 'past' && day.cycleDay === null) || day.awaitingPeriod) {
        return {
            title: t('dashboard.no_recent_data', 'No recent data'),
            subtitle: t('dashboard.log_to_resume', 'Log a period to resume predictions'),
            statusVariant: 'neutral',
            dayOfCycle: undefined,
            phaseKey: 'neutral'
        };
    }

    const isToday = !!meta.isToday;
    const dayOfCycle = day.cycleDay!;
    const cycleLength = day.cycleLength ?? Infinity;
    const flowActive = meta.isPeriod;
    const vis = getCycleVisibility(settings);

    // 5. Late. Only today can be late: the model sets lateDays for no other date.
    if (day.lateDays > 0) {
        return {
            // The real cycle length is unknown, so "Day N" has no total. The overdue text says
            // "late" in every locale, and the amber warning variant marks the state.
            title: t('dashboard.cycle_day', { day: dayOfCycle }),
            titleIsCycleDay: true,
            subtitle: t('common.days_overdue', { count: day.lateDays }),
            statusVariant: 'warning',
            chance: undefined, // Hidden
            chanceVariant: undefined,
            dayOfCycle,
            phaseKey: 'late'
        };
    }

    // Days until the expected start, for today only (0 = due today).
    const dueInDays = isToday ? diffInDays(addDays(day.cycleStart!, cycleLength), meta.date) : null;

    // Cycle phase in order: follicular -> ovulation -> luteal -> PMS. PMS is the tail
    // of the luteal phase, not a phase of its own. The model states the facts; the
    // settings decide which of them are shown. Menstrual days show the flow or
    // expected-period row instead of a phase name.
    const ovDiff = day.ovulationDate ? diffInDays(meta.date, day.ovulationDate) : null;
    const laterPhase: CycleDayPhase = ovDiff !== null && ovDiff < 0 ? 'follicular' : 'luteal';
    let phase = day.phase;
    // Ovulation is only named when the ovulation display is on (never on birth control).
    if (phase === 'ovulation' && !vis.ovulation) phase = day.isPms && settings.showPMS ? 'pms' : laterPhase;
    else if (phase === 'pms' && !settings.showPMS) phase = laterPhase;

    const phaseLabel = (): string => {
        switch (phase) {
            case 'ovulation': return t('dashboard.ovulation_day');
            case 'pms': return t('dashboard.pms_phase');
            case 'luteal': return t('dashboard.luteal_phase');
            case 'follicular': return t('dashboard.follicular_phase');
            case 'menstrual': return t('calendar.legend.logged_period');
            default: return '';
        }
    };

    // Same source as phaseLabel(), so the key and the label can never disagree.
    // Hormonal contraception suppresses the natural cycle, so it wins outright.
    const phaseKey: CyclePhaseKey = settings.isOnBirthControl ? 'birth_control'
        : flowActive ? 'menstrual'
        : phase ?? 'neutral';

    let title = t('dashboard.cycle_day', { day: dayOfCycle });
    let titleIsCycleDay = true;
    let subtitle = phaseLabel();
    let variant: CycleStatusData['statusVariant'] = 'secondary';
    let dayOfPeriod: number | undefined = undefined;
    let periodLength: number | undefined = undefined;

    if (flowActive) {
        subtitle = t('dashboard.flow_logged');
        variant = 'primary';
        dayOfPeriod = meta.dayOfPeriod;
        periodLength = day.kind === 'past' ? day.periodLength! : forecastPeriodLength;
    } else if (dueInDays === 0) {
        title = t('dashboard.period_due', 'Period Due');
        titleIsCycleDay = false;
        subtitle = t('dashboard.expected_today', 'Expected Today');
        variant = 'warning';
    } else if (dueInDays === 1) {
        title = t('dashboard.period_soon');
        titleIsCycleDay = false;
        subtitle = t('dashboard.expected_tomorrow');
        variant = 'info';
    } else if (dueInDays !== null && dueInDays >= 2 && dueInDays <= 3) {
        title = t('dashboard.period_in', { count: dueInDays });
        titleIsCycleDay = false;
    } else if (day.isForecastPeriod) {
        subtitle = t('calendar.legend.predicted_period');
        variant = 'primary';
    }

    // Fertile overlay wins over the base card. The phase stays the headline, fertility qualifies it.
    const hasFertility = vis.fertile && day.isFertile;
    if (hasFertility) {
        title = t('dashboard.cycle_day', { day: dayOfCycle });
        titleIsCycleDay = true;
        subtitle = `${subtitle} (${t('dashboard.fertile_window')})`;
        variant = 'success';
    }

    // The little "Fertility: high" tag, or "Protected" on birth control.
    let chance: string | undefined;
    let chanceVariant: CycleStatusData['chanceVariant'];
    if (settings.isOnBirthControl) {
        chance = t('dashboard.protected', 'Protected');
        chanceVariant = 'low';
    } else if (vis.fertile && day.ovulationDate) {
        chanceVariant = day.isPeakFertile ? 'peak' : day.isFertile ? 'high' : 'low';
        chance = day.isPeakFertile ? t('dashboard.chance_peak')
            : day.isFertile ? t('dashboard.chance_high')
            : t('dashboard.chance_low');
    }

    return {
        title,
        titleIsCycleDay,
        subtitle,
        chance,
        chanceVariant,
        statusVariant: variant,
        dayOfCycle,
        // Past a finished cycle's length (a past day inside a running late cycle) there is no total.
        cycleLength: dayOfCycle > cycleLength || cycleLength === Infinity ? undefined : cycleLength,
        dayOfPeriod,
        periodLength,
        phaseKey
    };
};

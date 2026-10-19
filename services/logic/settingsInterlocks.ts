import type { AppSettings } from '../../types';

/**
 * Settings that participate in the cycle-management interlocks.
 * Keeping this smaller than AppSettings also lets onboarding use the same
 * rules before the rest of the app settings have been created.
 */
export type SettingsInterlockState = Pick<
  AppSettings,
  | 'adaptivePrediction'
  | 'cycleLength'
  | 'isOnBirthControl'
  | 'predictionsPaused'
  | 'showFertileWindow'
  | 'showOvulation'
  | 'showPMS'
>;

/**
 * What the cycle UI shows. The only place these display rules live: predictions
 * and the cycle model always hold the facts, every surface asks this.
 * Fertile wording and ovulation can be shown separately; the fertile window
 * implies ovulation, and birth control hides both.
 * Birth control also decides the withdrawal question and the pill log (records already
 * saved are shown by the caller regardless).
 */
export function getCycleVisibility(
  s: Pick<AppSettings, 'isOnBirthControl' | 'showFertileWindow' | 'showOvulation' | 'showPMS'> &
    Partial<Pick<AppSettings, 'contraceptionReminder' | 'reminderPillDaily'>>
) {
  // Same source the scheduler uses: the contraception reminder wins, the legacy daily pill flag applies only without it.
  const pillReminder = s.contraceptionReminder
    ? s.contraceptionReminder.enabled && s.contraceptionReminder.method === 'pill'
    : !!s.reminderPillDaily;
  const fertile = s.showFertileWindow && !s.isOnBirthControl;
  return {
    fertile,
    ovulation: !s.isOnBirthControl && (s.showFertileWindow || s.showOvulation === true),
    pms: !!s.showPMS,
    // Daily log: the withdrawal-bleed question follows birth control; "Took pill" also follows a pill reminder.
    withdrawalQuestion: !!s.isOnBirthControl,
    pillLog: !!s.isOnBirthControl || pillReminder,
  };
}

/**
 * Apply the cycle-management rules after a settings change.
 *
 * This is intentionally pure: callers can use it for interactive Settings
 * changes, onboarding presets, and final onboarding normalization without
 * sharing UI state or persistence concerns.
 */
export function applySettingsInterlocks<T extends SettingsInterlockState>(
  state: T,
  change: Partial<T>
): T {
  const next = { ...state, ...change };

  if (next.isOnBirthControl) {
    next.showFertileWindow = false;
    next.showOvulation = false;
    next.adaptivePrediction = false;
    next.cycleLength = 28;
  }

  if (next.predictionsPaused) {
    next.adaptivePrediction = false;
    next.showFertileWindow = false;
    next.showOvulation = false;
    next.showPMS = false;
  }

  // Explicitly enabling adaptive prediction is the one transition that
  // resumes a paused prediction state. This matches the Settings toggle.
  if (change.adaptivePrediction === true && !next.isOnBirthControl) {
    next.adaptivePrediction = true;
    next.predictionsPaused = false;
  }

  return next;
}

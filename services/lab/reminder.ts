// Lab reminders: one local notification (id LAB_REMINDER_ID) shortly before the current device
// is expected to be full, and three more (LAB_OVERDUE_REMINDERS) at 1, 3 and 6 hours after it was
// due. Native only; on web every function does nothing.
// Cycle's own reminders are never touched: these ids are outside Cycle's cancel list.
import { Capacitor } from '@capacitor/core';
import type { AppSettings, DailyLog, PeriodRecord } from '../../types';
import i18n from '../i18n';
import Logger from '../logger';
import { isLabVisible, labSession, type LabData } from '../logic/lab';
import { toLocalISOString } from '../../utils/dateUtils';
import { ensureLoaded, getSnapshot } from './store';

export interface LabReminderInput {
    labData: LabData;
    periods: PeriodRecord[];
    /** Cycle's daily logs, only to see whether a pregnancy is active (Lab is hidden then). */
    logs: Record<string, DailyLog>;
    settings: Pick<AppSettings, 'labEnabled' | 'discreteMode' | 'discreetNotifications'>;
    now: Date;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** The Lab visibility rule (services/logic/lab/visibility.ts): off, discrete mode, or an active pregnancy hides Lab. */
const labHidden = (
    { periods, logs, settings, now }: Pick<LabReminderInput, 'periods' | 'logs' | 'settings' | 'now'>,
): boolean => !isLabVisible(settings, logs, periods, toLocalISOString(now));

interface PlannedReminder {
    id: number;
    at: Date;
    /** Hours past the due time; absent for the reminder before it is full. */
    overdueHours?: number;
}

/** The reminders that should exist now. Follows the device session, not the period. */
const plannedReminders = (
    input: LabReminderInput, beforeId: number, overdue: readonly { id: number; hours: number }[],
): PlannedReminder[] => {
    const { labData, periods, now } = input;
    if (labHidden(input) || !labData.settings.reminderOn) return [];
    const session = labSession(labData.events, now, periods, labData.devices.find(d => d.isActive), labData.settings.stoppedAt);
    if (session.state !== 'active') return [];
    const fullAt = session.fullAt.getTime();
    const planned: PlannedReminder[] = [];
    if (fullAt > now.getTime()) {
        const lead = fullAt - labData.settings.reminderLeadMin * MS_PER_MINUTE;
        // Lead time already past but not yet full: notify in a minute.
        planned.push({ id: beforeId, at: new Date(Math.max(now.getTime() + MS_PER_MINUTE, lead)) });
    }
    // Only the ones still ahead: a long-overdue device gets none, so old entries stay quiet.
    for (const { id, hours } of overdue) {
        const at = fullAt + hours * MS_PER_HOUR;
        if (at > now.getTime()) planned.push({ id, at: new Date(at), overdueHours: hours });
    }
    return planned;
};

// Same idea as Cycle's reminderSyncQueue: calls run one after another, so a slow older call
// cannot schedule over a newer one.
let queue: Promise<void> = Promise.resolve();
const enqueue = (job: () => Promise<void>): Promise<void> => {
    const next = queue.then(job);
    queue = next.catch(() => { });
    return next;
};

const cancelNow = async (): Promise<void> => {
    try {
        const [{ LocalNotifications }, { LAB_REMINDER_ID, LAB_OVERDUE_REMINDERS }] = await Promise.all([
            import('@capacitor/local-notifications'),
            import('../notifications'),
        ]);
        await LocalNotifications.cancel({ notifications: [LAB_REMINDER_ID, ...LAB_OVERDUE_REMINDERS.map(o => o.id)].map(id => ({ id })) });
    } catch (e) {
        Logger.warn('Lab reminder cancel failed', e);
    }
};

export const cancelLabReminder = (): Promise<void> =>
    Capacitor.isNativePlatform() ? enqueue(cancelNow) : Promise.resolve();

/** Cancel ids 140-143, then schedule again what plannedReminders allows. Never rejects. */
export const syncLabReminder = (input: LabReminderInput): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return Promise.resolve();
    return enqueue(async () => {
        await cancelNow();
        try {
            const [{ LocalNotifications }, { LAB_REMINDER_ID, LAB_OVERDUE_REMINDERS, channelFor, createReminderChannel, isDiscreetNotifications }] = await Promise.all([
                import('@capacitor/local-notifications'),
                import('../notifications'),
            ]);
            const planned = plannedReminders(input, LAB_REMINDER_ID, LAB_OVERDUE_REMINDERS);
            if (planned.length === 0) return;
            // The switch reuses the generic Period Flow reminder texts rather than new Lab keys.
            const discreet = isDiscreetNotifications(input.settings);
            await createReminderChannel(LocalNotifications, discreet);
            await LocalNotifications.schedule({
                notifications: planned.map(({ id, at, overdueHours }) => ({
                    id,
                    title: discreet
                        ? i18n.t('notifications.period_input_reminder_discrete')
                        : i18n.t(overdueHours ? 'lab.reminder_overdue_title' : 'lab.reminder_title'),
                    body: discreet
                        ? i18n.t('notifications.period_input_reminder_desc_discrete')
                        : overdueHours ? i18n.t('lab.reminder_overdue_body', { hours: overdueHours }) : i18n.t('lab.reminder_body'),
                    channelId: channelFor(discreet),
                    schedule: { at, repeats: false, allowWhileIdle: true },
                })),
            });
        } catch (e) {
            Logger.warn('Lab reminder schedule failed', e);
        }
    });
};

/**
 * For callers outside the Lab screens (the app-level effect): loads Lab data first, then syncs.
 * Skips when Lab data could not be read, so a failed load never cancels a good reminder by mistake.
 */
export const syncLabReminderFromStore = async (
    periods: PeriodRecord[],
    logs: Record<string, DailyLog>,
    settings: Pick<AppSettings, 'labEnabled' | 'discreteMode' | 'discreetNotifications'>,
): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    const now = new Date();
    // Lab hidden: cancel even when the Lab data could not be read.
    if (labHidden({ periods, logs, settings, now })) return cancelLabReminder();
    await ensureLoaded();
    const { status, data } = getSnapshot();
    if (status !== 'ready') return;
    await syncLabReminder({ labData: data, periods, logs, settings, now });
};

import { registerPlugin } from '@capacitor/core';

export interface WidgetSyncData {
    /** -1 = no cycle day today (stale, paused, no data): the widget shows "Day --". */
    cycleDay: number;
    /** The effective cycle length of the model (adaptive and clamps applied). */
    cycleLength: number;
    daysUntilPeriod: number;
    /** -1 = hidden or unknown: the widget shows "O: --". */
    daysUntilOvulation: number;
    currentPhase: 'period' | 'fertile' | 'ovulation' | 'luteal' | 'follicular' | 'pms';
    discreteMode: boolean;
}

export interface WidgetSyncResult {
    success: boolean;
    widgetsUpdated: number;
}

export interface WidgetSyncPlugin {
    updateWidgetData(data: WidgetSyncData): Promise<WidgetSyncResult>;
}

const WidgetSync = registerPlugin<WidgetSyncPlugin>('WidgetSync');

export { WidgetSync };

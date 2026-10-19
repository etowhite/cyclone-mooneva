import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DailyLog, Cycle, MOOD_OPTIONS } from '../../types';
import { useTranslation } from 'react-i18next';
import { addDays } from '../../utils/dateUtils';
import type { CycleModel } from '../../services/logic/cycleModel';
import { CUSTOM_MOOD_COLORS, isCustomMood } from '../../services/logic/logNames';


interface MoodByPhaseProps {
    logs: Record<string, DailyLog>;
    cycles: Cycle[];
    cycleModel: CycleModel;
}

interface PhaseMood {
    phase: string;
    icon: string;
    iconColor: string;
    dominantMood: string;
    percentage: number;
    color: string;
    glowColor: string;
}

/** Mood names run long in some locales (de "Ausgeglichen", tr "Enerjik hissediyorum").
 *  Shrink to fit the grid cell rather than wrapping or clipping. */
const DynamicMoodText: React.FC<{ text: string; color: string }> = ({ text, color }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const span = textRef.current;
        if (!container || !span) return;

        const updateScale = () => {
            const containerWidth = container.clientWidth;
            const textWidth = span.scrollWidth;
            setScale(containerWidth > 0 && textWidth > containerWidth
                ? Math.min(1, (containerWidth - 2) / textWidth)
                : 1);
        };

        updateScale();
        document.fonts?.ready.then(updateScale);

        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(updateScale);
        ro.observe(container);
        return () => ro.disconnect();
    }, [text]);

    return (
        <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
            <span
                ref={textRef}
                className="text-sm font-bold whitespace-nowrap inline-block ltr:origin-left rtl:origin-right"
                style={{ color, transform: scale < 1 ? `scale(${scale})` : undefined }}
            >
                {text}
            </span>
        </div>
    );
};

const MoodByPhase: React.FC<MoodByPhaseProps> = ({ logs, cycles, cycleModel }) => {
    const { t } = useTranslation();

    // Calculate mood distribution by cycle phase
    const phaseMoods = useMemo(() => {
        // The UI keeps PMS grouped with luteal because it has four cards. A past day's
        // phase is the model's, from its own real cycle (the model paints no PMS there).
        const phases = {
            menstrual: { name: t('trends.phase_menstrual'), icon: '🩸', iconColor: 'text-rose-500' },
            follicular: { name: t('trends.phase_follicular'), icon: '🌱', iconColor: 'text-lime-500' },
            ovulation: { name: t('trends.phase_ovulation'), icon: '✨', iconColor: 'text-amber-400' },
            luteal: { name: t('trends.phase_luteal'), icon: '🌙', iconColor: 'text-orange-400' },
        };

        const phaseMoodCounts: Record<string, Record<string, number>> = {
            menstrual: Object.create(null),
            follicular: Object.create(null),
            ovulation: Object.create(null),
            luteal: Object.create(null),
        };

        // Initialize counts for all moods
        Object.keys(phases).forEach(phase => {
            MOOD_OPTIONS.forEach(option => {
                phaseMoodCounts[phase][option.id] = 0;
            });
        });

        // Go through each cycle and count moods by phase
        cycles.forEach(cycle => {
            // Same reason as the trends heatmaps: a 600-day span would file almost all
            // of its days under "luteal".
            if (cycle.isOutlier || !cycle.length) return;

            for (let i = 0; i < cycle.length; i++) {
                const dateStr = addDays(cycle.startDate, i);
                const log = logs[dateStr];
                if (!log?.mood) continue;

                // No phase: the cycle is too short to have an ovulation day, so only its period is known.
                const phase = cycleModel.at(dateStr).phase;
                const phaseKey = phase === 'pms' ? 'luteal' : phase;
                if (!phaseKey || !phaseMoodCounts[phaseKey]) continue;

                log.mood.forEach(m => {
                    if (phaseMoodCounts[phaseKey][m] !== undefined) phaseMoodCounts[phaseKey][m]++;
                    else if (isCustomMood(m)) phaseMoodCounts[phaseKey][m] = 1;
                });
            }
        });

        // Calculate dominant mood for each phase
        const results: PhaseMood[] = [];

        for (const [phaseKey, phaseData] of Object.entries(phases)) {
            const counts = phaseMoodCounts[phaseKey];
            const total = Object.values(counts).reduce((a, b) => a + b, 0);

            if (total === 0) {
                results.push({
                    phase: phaseData.name,
                    icon: phaseData.icon,
                    iconColor: phaseData.iconColor,
                    dominantMood: t('trends.no_data'),
                    percentage: 0,
                    color: '#94a3b8', // slate-400 equivalent
                    glowColor: 'transparent'
                });
                continue;
            }

            // Find dominant mood
            let maxMood = MOOD_OPTIONS[0].id;
            let maxCount = -1;

            for (const [mood, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxMood = mood as any; // safe cast as we initialized from options
                    maxCount = count;
                }
            }

            const percentage = Math.round((maxCount / total) * 100);
            const moodConfig = MOOD_OPTIONS.find(opt => opt.id === maxMood) || MOOD_OPTIONS[0];
            // A custom mood has no config: its name as typed, in the neutral grey.
            const custom = !MOOD_OPTIONS.some(opt => opt.id === maxMood) && isCustomMood(maxMood);

            results.push({
                phase: phaseData.name,
                icon: phaseData.icon,
                iconColor: phaseData.iconColor,
                dominantMood: custom ? maxMood : t(moodConfig.labelKey),
                percentage,
                color: custom ? CUSTOM_MOOD_COLORS.color : moodConfig.color, // Return hex directly
                glowColor: custom ? CUSTOM_MOOD_COLORS.shadow : moodConfig.shadow
            });
        }

        return results;
    }, [logs, cycles, cycleModel]);

    if (cycles.length === 0) {
        return (
            <div className="bg-[#F0F2F5] rounded-[40px] p-8" style={{ boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.8)' }}>
                <h3 className="text-sm font-extrabold tracking-[0.15em] text-slate-800 uppercase">{t('trends.mood_by_phase')}</h3>
                <p className="text-slate-400 text-sm text-center py-8">{t('trends.need_data_mood')}</p>
            </div>
        );
    }

    return (
        <div className="bg-[#F0F2F5] rounded-[32px] p-6" style={{ boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.8)' }}>
            {/* Header - stacked for better mobile alignment */}
            <div className="flex flex-col gap-1 mb-6">
                <h2 className="text-sm font-extrabold tracking-[0.15em] text-slate-800 uppercase">
                    {t('trends.mood_by_phase')}
                </h2>
                <span className="text-xs font-medium text-slate-400">
                    {t('trends.mood_emotional_patterns')}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                    {t('trends.based_on_cycles', { count: cycles.length })}
                </span>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4">
                {phaseMoods.map((phaseData) => (
                    <div
                        key={phaseData.phase}
                        className="p-4 rounded-2xl bg-[#F0F2F5] flex flex-col gap-3"
                        style={{ boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)' }}
                    >
                        {/* Phase Icon & Label */}
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{phaseData.icon}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 min-w-0 [overflow-wrap:anywhere]">
                                {phaseData.phase}
                            </span>
                        </div>

                        <DynamicMoodText text={phaseData.dominantMood} color={phaseData.color} />

                        {phaseData.percentage > 0 && (
                            <p className="text-[10px] text-slate-400 font-medium">
                                {t('trends.percentage_of_time', { count: phaseData.percentage })}
                            </p>
                        )}

                        {/* Progress Bar */}
                        {phaseData.percentage > 0 && (
                            <div
                                className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden"
                                style={{ boxShadow: 'inset 2px 2px 4px rgba(163, 177, 198, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.7)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${phaseData.percentage}%`,
                                        backgroundColor: phaseData.color,
                                        boxShadow: `0 0 6px ${phaseData.glowColor}`
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Insight */}
            <div className="mt-8 text-center px-2">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                    {t('trends.biology_insight')}
                </p>
            </div>
        </div>
    );
};

export default MoodByPhase;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, useDisplayFormat } from '../services/displayFormat';
import { Cycle } from '../types';
import type { PregnancySpan } from '../services/logic/cycle';
import { addDays, diffInDays, getTodayStr, parseLocalDate } from '../utils/dateUtils';

interface TimelineViewProps {
  cycles: Cycle[];
  /** getCycleVisibility(settings).fertile: false on birth control or with the fertile window off. */
  showFertile: boolean;
  /** Optional: absent in tests that only care about cycles. */
  pregnancySpans?: PregnancySpan[];
  /** `settings.historyArchivedDate`: pregnancy rows that started before it are hidden, like cycle rows. */
  archivedBefore?: string;
  // No unused props
}

const TimelineView: React.FC<TimelineViewProps> = ({ cycles, showFertile: fertileOn, pregnancySpans = [], archivedBefore }) => {
  const { t } = useTranslation();
  const [showAll, setShowAll] = React.useState(false);
  const fmt = useDisplayFormat();

  const todayStr = getTodayStr();
  // Rows outside the current year, or crossing a year, show it (see dateRange).
  const formatPeriodRange = (startDateStr: string, length: number) =>
    fmt.dateRange(parseLocalDate(startDateStr), parseLocalDate(addDays(startDateStr, length - 1)), parseLocalDate(todayStr));

  // Filter cycles to only show completed/started in the past
  const historyCycles = cycles.filter(c => c.startDate <= todayStr);

  // Every pregnancy gets its own row with its own dates and length. The cycle around it
  // stays a normal cycle row and only carries an "Includes pregnancy" tag.
  const pregnancyRows = pregnancySpans.filter(sp => sp.start <= todayStr && (!archivedBefore || sp.start >= archivedBefore));

  type HistoryEntry =
    | { kind: 'cycle'; startDate: string; cycle: Cycle }
    | { kind: 'pregnancy'; startDate: string; span: PregnancySpan };

  const historyEntries: HistoryEntry[] = [
    ...historyCycles.map(c => ({ kind: 'cycle' as const, startDate: c.startDate, cycle: c })),
    ...pregnancyRows.map(sp => ({ kind: 'pregnancy' as const, startDate: sp.start, span: sp })),
  ].sort((a, b) => b.startDate.localeCompare(a.startDate));

  const displayedHistory = showAll ? historyEntries : historyEntries.slice(0, 6);

  return (
    <div className="flex flex-col">
      <div className="mt-0">

        {/* New History Visualization */}
        {historyEntries.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm font-medium">
            {t('timeline.no_cycles')}
          </div>
        ) : (
          <div className="px-1 mt-8 scroll-mt-4">
            <div
              className="bg-[#F0F2F5] rounded-[32px] p-6"
              style={{ boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.8)' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="timeline-history-heading text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 pt-[9px]">{t('common.history')}</span>
                <div className="timeline-history-divider h-px flex-1 bg-slate-300"></div>
              </div>

              <div className="flex flex-col gap-8">
                {displayedHistory.map((entry, idx) => {
                  if (entry.kind === 'pregnancy') {
                    const span = entry.span;
                    const spanDays = diffInDays(span.end, span.start) + 1;
                    return (
                      <div key={`pregnancy-${span.start}-${idx}`} className="flex flex-col">
                        <div className="flex justify-between items-end mb-[2px]">
                          <span className="timeline-date-label text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                            {formatPeriodRange(span.start, spanDays)}
                            <span className="ms-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold normal-case text-violet-700">
                              {t('settings.pregnancy')}
                            </span>
                          </span>
                          <span
                            className="timeline-cycle-length text-xs font-extrabold tabular-nums text-slate-500"
                            title={t('timeline.pregnancy_hint')}
                          >
                            {formatNumber(spanDays)}
                          </span>
                        </div>
                        {/* Same track as a cycle row so the dark-mode rules cover it, but filled
                            flat: a pregnancy has no period segment and no fertile window, and
                            segmenting it would invent structure that is not there. */}
                        <div
                          className="timeline-history-bar relative w-full h-4 bg-[#d9dde4] rounded-full overflow-hidden border border-slate-200/80"
                          style={{ boxShadow: 'inset 2px 2px 5px rgba(163, 177, 198, 0.3), inset -2px -2px 5px rgba(255, 255, 255, 0.7)' }}
                        >
                          <div className="absolute inset-0 bg-violet-200/80" />
                        </div>
                      </div>
                    );
                  }

                  const cycle = entry.cycle;
                  const cycleLenForCalc = cycle.length || 28;
                  const periodLen = cycle.periodLength || 5;
                  const spanLen = cycle.spanDays || periodLen; // Full span for date display
                  const isPregnancy = cycle.isPregnancy === true;
                  const isGap = cycle.isOutlier === true;
                  const isShort = cycleLenForCalc < 18;
                  // Still "invalid" for maths and fertile display, which is correct: a
                  // pregnancy is not a cycle. Only the words change.
                  const isInvalid = isGap || isShort;

                  // Calculate percentages for bar segments using span for width
                  const periodWidth = Math.min(100, (spanLen / cycleLenForCalc) * 100);

                  // Fertile Window (hidden for gap/short cycles – tracking gap, not used for predictions).
                  // Offsets come from the cycle's own fertileStart/fertileEnd, which getPastCycles
                  // already derived from settings.lutealPhaseLength. Never re-derive them here.
                  const fertileStartDay = cycle.fertileStart
                    ? Math.max(0, diffInDays(cycle.fertileStart, cycle.startDate))
                    : 0;
                  const fertileEndDay = cycle.fertileEnd
                    ? Math.min(cycleLenForCalc, diffInDays(cycle.fertileEnd, cycle.startDate) + 1)
                    : 0;
                  const fertileDuration = Math.max(0, fertileEndDay - fertileStartDay);
                  const fertileLeft = (fertileStartDay / cycleLenForCalc) * 100;
                  const fertileWidth = (fertileDuration / cycleLenForCalc) * 100;
                  const showFertile = !isInvalid && fertileWidth > 0 && fertileOn;

                  return (
                    <div key={`${cycle.startDate}-${idx}`} className="flex flex-col">
                      <div className="flex justify-between items-end mb-[2px]">
                        <span className="timeline-date-label text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                          {formatPeriodRange(cycle.startDate, spanLen)}
                          {isPregnancy && (
                            <span className="ms-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold normal-case text-violet-700">
                              {t('timeline.includes_pregnancy', 'Includes pregnancy')}
                            </span>
                          )}
                        </span>
                        {cycle.length != null && (
                          <span
                            className={`timeline-cycle-length text-xs font-extrabold tabular-nums ${isInvalid ? 'text-slate-500' : 'text-slate-800'}`}
                            title={isPregnancy
                              ? t('timeline.pregnancy_hint')
                              : isGap
                                ? t('timeline.gap_hint')
                                : isShort
                                  ? t('timeline.short_cycle_hint')
                                  : undefined
                            }
                          >
                            {isInvalid && !isPregnancy && <span className="mr-0.5" aria-hidden="true">⚠</span>}
                            {formatNumber(cycle.length)}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar Container - Neumorphic Inset */}
                      <div
                        className="timeline-history-bar relative w-full h-4 bg-[#d9dde4] rounded-full overflow-hidden border border-slate-200/80"
                        style={{ boxShadow: 'inset 2px 2px 5px rgba(163, 177, 198, 0.3), inset -2px -2px 5px rgba(255, 255, 255, 0.7)' }}
                      >

                        {/* Period Segment */}
                        <div
                          className="timeline-period-segment absolute top-0 left-0 h-full rounded-full flex items-center justify-center z-20 border-r border-white/20 bg-[#e11d48]"
                          style={{
                            width: `${periodWidth}%`,
                            boxShadow: '2px 0 4px rgba(251, 113, 133, 0.3)'
                          }}
                        >
                          <span className="text-[9px] font-bold text-white drop-shadow-sm">{formatNumber(periodLen)}</span>
                        </div>

                        {/* Fertile Segment – hidden for gap cycles */}
                        {showFertile && (
                          <div
                            data-testid="fertile-band"
                            className="absolute top-0 h-full bg-teal-400/30 flex items-center justify-center z-10"
                            style={{ left: `${fertileLeft}%`, width: `${fertileWidth}%` }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!showAll && historyEntries.length > 6 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full mt-10 py-3 rounded-2xl border border-slate-200/50 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
                >
                  {t('timeline.show_more_count', { count: historyEntries.length - 6 })}
                </button>
              )}
            </div>
          </div>
        )}
        {/* Extra spacer to ensure visibility above floating navbars */}
        <div className="h-12 w-full" />
      </div>
    </div>
  );
};

export default TimelineView;

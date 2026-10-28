import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, DailyLog, FirstDayOfWeek, INITIAL_SYMPTOMS } from '../types';
import { toLocalISOString } from '../utils/dateUtils';
import { formatNumber, useDisplayFormat } from '../services/displayFormat';
import { requestNotificationPermission } from '../services/notifications';
import { FIRST_DAY_OPTIONS, resolveFirstDayOfWeek } from '../utils/weekStart';
import CycleSetupStep, { CycleSetupValues } from './onboarding/CycleSetupStep';
import { settingBounds } from '../services/logic/cycle';
import { applySettingsInterlocks } from '../services/logic/settingsInterlocks';

interface OnboardingWizardProps {
  onComplete: (settings: AppSettings, initialLog?: { date: string, log: DailyLog }) => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { t, i18n } = useTranslation();
  const fmt = useDisplayFormat();
  const [step, setStep] = useState(0);

  // --- Form State ---
  const [lastPeriodDate, setLastPeriodDate] = useState<string | null>(null);
  const [dontRemember, setDontRemember] = useState(false);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<FirstDayOfWeek | undefined>(undefined);

  // Goals
  const [goal, setGoal] = useState<'track' | 'fertility' | 'pregnancy' | 'birthControl'>('fertility');

  // Cycle management, mirrored from Settings. Seeded by the goal preset on step 3.
  const [cycleSetup, setCycleSetup] = useState<CycleSetupValues>({
    adaptivePrediction: false,
    cycleLength: 28,
    periodLength: 5,
    lutealPhaseLength: 14,
    showFertileWindow: true,
    showPMS: true,
    pmsLength: 3,
    isOnBirthControl: false,
    predictionsPaused: false
  });



  // --- Helpers ---
  const handleFinish = async () => {
    // Request notification permission before finishing
    await requestNotificationPermission();

    const normalizedCycleSetup = applySettingsInterlocks(cycleSetup, {});
    const newSettings: AppSettings = {
      userName: 'User',
      discreteMode: false,
      onboardingCompleted: true,
      isOnBirthControl: normalizedCycleSetup.isOnBirthControl,
      symptoms: INITIAL_SYMPTOMS,
      predictionsPaused: normalizedCycleSetup.predictionsPaused,
      adaptivePrediction: normalizedCycleSetup.adaptivePrediction,
      pin: undefined,
      cycleLength: normalizedCycleSetup.cycleLength,
      periodLength: normalizedCycleSetup.periodLength,
      lutealPhaseLength: normalizedCycleSetup.lutealPhaseLength,
      pmsLength: normalizedCycleSetup.pmsLength,
      showPMS: normalizedCycleSetup.showPMS,
      showFertileWindow: normalizedCycleSetup.showFertileWindow,
      firstDayOfWeek
    };

    let initialLog;
    if (!dontRemember && lastPeriodDate) {
      initialLog = {
        date: lastPeriodDate,
        log: {
          date: lastPeriodDate,
          flow: 'medium',
          symptoms: [],
          notes: 'First entry from onboarding'
        } as DailyLog
      };
    }

    onComplete(newSettings, initialLog);
  };

  // Picking a focus seeds the cycle management step. The user can still adjust
  // every value there before finishing.
  const selectGoal = (id: 'track' | 'fertility' | 'pregnancy' | 'birthControl') => {
    setGoal(id);
    setCycleSetup(s => applySettingsInterlocks(s, {
      predictionsPaused: id === 'pregnancy',
      isOnBirthControl: id === 'birthControl',
      showFertileWindow: id === 'fertility',
      // Birth control and paused predictions both rule out adaptive prediction
      ...(id === 'birthControl' ? { adaptivePrediction: false, cycleLength: 28 } : {}),
      ...(id === 'pregnancy' ? { adaptivePrediction: false, showPMS: false } : {})
    }));
  };

  // --- Navigation Helpers ---
  const nextStep = () => {
    if (step === 4) {
      setStep(6); // skip spycraft, go to get started
    } else if (step === 5) {
      setStep(6); // spycraft → get started
    } else if (step === 6) {
      handleFinish();
    } else {
      setStep(s => s + 1);
    }
  };

  const prevStep = () => {
    if (step === 6) {
      setStep(4);
    } else if (step === 6) {
      setStep(5);
    } else {
      setStep(s => Math.max(0, s - 1));
    }
  };

  const dateStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step === 2 && dateStripRef.current) {
      setTimeout(() => {
        if (dateStripRef.current) {
          dateStripRef.current.scrollLeft = dateStripRef.current.scrollWidth;
        }
      }, 50);
    }
  }, [step]);

  // --- Render Steps ---
  const renderLanguage = () => {
    const languages = [{code:'en',native:'English'}, {code:'ru',native:'Русский'}];

    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col items-center py-4 px-2">
          <div className="w-40 mb-5 mt-auto">
            <span className="cyclone-onboarding-wordmark">cyclone</span>
          </div>
          <h1 className="text-xs text-slate-400 font-medium mb-6 tracking-wide">Choose your language</h1>
          <div
            className="w-full max-w-sm bg-[#F0F2F5] rounded-2xl p-4 mb-auto"
            style={{ boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.4), inset -4px -4px 8px rgba(255, 255, 255, 0.8)' }}
          >
            <div className="grid grid-cols-3 gap-2">
              {languages.map((lang) => {
                const isSelected = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${isSelected
                      ? 'bg-[#7598a0] text-white scale-[0.98]'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    style={isSelected ? {
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1)'
                    } : {
                      boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>{lang.native}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <h2 className="text-xs text-slate-400 font-medium mt-6 mb-3 tracking-wide">{t('settings.first_day_of_week')}</h2>
          <div
            className="w-full max-w-sm bg-[#F0F2F5] rounded-2xl p-2 flex gap-2"
            style={{ boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.4), inset -4px -4px 8px rgba(255, 255, 255, 0.8)' }}
          >
            {FIRST_DAY_OPTIONS.map(day => {
              const isSelected = resolveFirstDayOfWeek(i18n.language, firstDayOfWeek) === day;
              return (
                <button
                  key={day}
                  onClick={() => setFirstDayOfWeek(day)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isSelected
                    ? 'bg-[#7598a0] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  style={isSelected ? {
                    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1)'
                  } : {
                    boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.9)'
                  }}
                >
                  {t(`settings.week_start_${day}`)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-shrink-0 w-full max-w-sm mx-auto pt-4 pb-2">
          <button
            onClick={nextStep}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-[#7598a0] transition-all active:scale-[0.98]"
            style={{ boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)' }}
          >
            {t('common.continue')}
          </button>
        </div>
      </div>
    );
  };

  const renderTrust = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col items-center justify-center text-center gap-6 px-4 py-4">
        <div className="w-40 max-w-[40vw] relative">
          <span className="cyclone-onboarding-wordmark">cyclone</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
            {t('onboarding.trust.title')}
          </h1>
          <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs mx-auto">
            {t('onboarding.trust.desc')}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 space-y-3 w-full max-w-sm mx-auto pt-4 pb-2">
        <button
          onClick={nextStep}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs text-white bg-[#7598a0] transition-all active:scale-[0.98]"
          style={{ boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)' }}
        >
          {t('onboarding.trust.start')}
        </button>
        <button
          className="w-full text-[10px] font-bold uppercase tracking-widest text-[#7598a0] hover:text-[#5a767d] transition-colors"
          onClick={() => alert(t('onboarding.trust.backup_alert'))}
        >
          {t('onboarding.trust.backup_hint')}
        </button>
      </div>
    </div>
  );

  const renderCalibration = () => {
    const dates = [];
    const today = new Date();
    for (let i = 60; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d);
    }

    return (
      <div className="flex flex-col h-full min-h-0 py-2 px-2">
        <h2 className="flex-shrink-0 text-2xl font-black text-slate-800 tracking-tight text-center mb-4">{t('onboarding.calibration.title')}</h2>
        <div className="flex-1 min-h-0 space-y-6 overflow-y-auto no-scrollbar pb-2">
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-2">{t('onboarding.calibration.last_period_label')}</label>
            {!dontRemember ? (
              <div
                ref={dateStripRef}
                className="bg-[#F0F2F5] p-3 rounded-2xl overflow-x-auto no-scrollbar flex gap-3 scroll-smooth"
                style={{ boxShadow: 'inset 3px 3px 6px rgba(163, 177, 198, 0.3), inset -3px -3px 6px rgba(255, 255, 255, 0.7)' }}
              >
                {dates.map((date) => {
                  const dateStr = toLocalISOString(date);
                  const isSelected = lastPeriodDate === dateStr;
                  const parts = fmt.calendarParts(date);
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setLastPeriodDate(dateStr)}
                      className={`flex flex-col items-center justify-center min-w-[60px] h-[70px] rounded-xl transition-all flex-shrink-0 ${isSelected ? 'bg-[#7598a0] text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                    >
                      <span className="text-[10px] font-bold uppercase">{fmt.monthName(parts.year, parts.month)}</span>
                      <span className="text-xl font-black">{formatNumber(parts.day)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-[#F0F2F5] rounded-2xl border border-dashed border-slate-300 text-center">
                <span className="text-xs font-medium text-slate-400">{t('onboarding.calibration.starting_fresh')}</span>
              </div>
            )}
            <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => setDontRemember(!dontRemember)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${dontRemember ? 'bg-[#7598a0] border-[#7598a0]' : 'border-slate-300'}`}>
                {dontRemember && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-xs font-bold text-slate-500 select-none">{t('onboarding.calibration.dont_remember')}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end px-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('onboarding.calibration.cycle_length_label')}</label>
              <span className="text-[10px] text-slate-400 font-medium">{t('onboarding.calibration.cycle_length_sub')}</span>
            </div>
            <div
              className="flex items-center justify-between bg-[#F0F2F5] p-2 rounded-2xl"
              style={{ boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.6)' }}
            >
              <button
                onClick={() => setCycleSetup(s => ({ ...s, cycleLength: Math.max(21, s.cycleLength - 1) }))}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 text-xl font-bold bg-[#F0F2F5] active:scale-95 transition-all"
                style={{ boxShadow: '5px 5px 10px rgba(163, 177, 198, 0.3), -5px -5px 10px rgba(255, 255, 255, 0.8)' }}
              >-</button>
              <span className="text-2xl font-black text-slate-700">{cycleSetup.cycleLength} <span className="text-sm font-bold text-slate-400">{t('common.days')}</span></span>
              <button
                onClick={() => setCycleSetup(s => ({ ...s, cycleLength: Math.min(45, s.cycleLength + 1) }))}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 text-xl font-bold bg-[#F0F2F5] active:scale-95 transition-all"
                style={{ boxShadow: '5px 5px 10px rgba(163, 177, 198, 0.3), -5px -5px 10px rgba(255, 255, 255, 0.8)' }}
              >+</button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end px-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('onboarding.calibration.period_duration_label')}</label>
              <span className="text-[10px] text-slate-400 font-medium">{t('onboarding.calibration.period_duration_sub')}</span>
            </div>
            <div
              className="flex items-center justify-between bg-[#F0F2F5] p-2 rounded-2xl"
              style={{ boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.6)' }}
            >
              <button
                onClick={() => setCycleSetup(s => ({ ...s, periodLength: Math.max(2, s.periodLength - 1) }))}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 text-xl font-bold bg-[#F0F2F5] active:scale-95 transition-all"
                style={{ boxShadow: '5px 5px 10px rgba(163, 177, 198, 0.3), -5px -5px 10px rgba(255, 255, 255, 0.8)' }}
              >-</button>
              <span className="text-2xl font-black text-slate-700">{cycleSetup.periodLength} <span className="text-sm font-bold text-slate-400">{t('common.days')}</span></span>
              <button
                onClick={() => setCycleSetup(s => ({ ...s, periodLength: Math.min(settingBounds(s).period.max, s.periodLength + 1) }))}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 text-xl font-bold bg-[#F0F2F5] active:scale-95 transition-all"
                style={{ boxShadow: '5px 5px 10px rgba(163, 177, 198, 0.3), -5px -5px 10px rgba(255, 255, 255, 0.8)' }}
              >+</button>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 pt-3 space-y-3">
          <button
            onClick={() => {
              if (!lastPeriodDate && !dontRemember) {
                setDontRemember(true);
              }
              nextStep();
            }}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs text-white bg-[#7598a0] transition-all active:scale-[0.98]"
            style={{ boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)' }}
          >
            {t('common.next')}
          </button>
          <button onClick={prevStep} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('common.back')}</button>
          <p className="text-[9px] text-center text-slate-400">{t('onboarding.calibration.settings_hint')}</p>
        </div>
      </div>
    );
  };

  const renderGoal = () => {
    const goals = [
      { id: 'track', label: t('onboarding.goal.track_label'), sub: t('onboarding.goal.track_sub'), icon: '🌱' },
      { id: 'fertility', label: t('onboarding.goal.fertility_label'), sub: t('onboarding.goal.fertility_sub'), icon: '🥚' },
      { id: 'pregnancy', label: t('onboarding.goal.pregnancy_label'), sub: t('onboarding.goal.pregnancy_sub'), icon: '🤰' },
      { id: 'birthControl', label: t('onboarding.goal.birth_control_label'), sub: t('onboarding.goal.birth_control_sub'), icon: '💊' },
    ] as const;

    return (
      <div className="flex flex-col h-full min-h-0 py-2 px-2">
        <h2 className="flex-shrink-0 text-2xl font-black text-slate-800 tracking-tight text-center mb-4">{t('onboarding.goal.title')}</h2>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pb-2">
          {goals.map((g) => {
            const active = goal === g.id;
            return (
              <button
                key={g.id}
                onClick={() => selectGoal(g.id)}
                className={`w-full p-4 rounded-2xl text-left rtl:text-right transition-all flex items-center gap-4 group relative overflow-hidden ${active ? 'text-[#7598a0]' : 'text-slate-600'}`}
                style={active
                  ? { boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.4), inset -4px -4px 8px rgba(255, 255, 255, 0.8)', backgroundColor: '#F0F2F5' }
                  : { boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.3), -6px -6px 12px rgba(255, 255, 255, 0.7)', backgroundColor: '#F0F2F5' }
                }
              >
                <span className="text-2xl">{g.icon}</span>
                <div>
                  <div className="text-sm font-black uppercase tracking-wider">{g.label}</div>
                  <div className="text-[10px] font-medium text-slate-400 mt-0.5">{g.sub}</div>
                </div>
                {active && <div className="absolute ltr:right-4 rtl:left-4 w-2 h-2 rounded-full bg-[#7598a0] shadow-[0_0_8px_#7598a0]" />}
              </button>
            );
          })}
        </div>
        <div className="flex-shrink-0 pt-3 space-y-3">
          <button
            onClick={nextStep}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs text-white bg-[#7598a0] transition-all active:scale-[0.98]"
            style={{ boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)' }}
          >
            {t('common.continue')}
          </button>
          <button onClick={prevStep} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('common.back')}</button>
          <p className="text-[9px] text-center text-slate-400">{t('onboarding.calibration.settings_hint')}</p>
        </div>
      </div>
    );
  };

  const renderCycleSetup = () => {
    return (
      <div className="flex flex-col h-full min-h-0 py-2 px-2">
        <div className="flex-1 min-h-0">
          <CycleSetupStep values={cycleSetup} onChange={setCycleSetup} />
        </div>
        <div className="flex-shrink-0 pt-3 space-y-3">
          <button
            onClick={nextStep}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs text-white bg-[#7598a0] transition-all active:scale-[0.98]"
            style={{ boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)' }}
          >
            {t('common.continue')}
          </button>
          <button onClick={prevStep} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('common.back')}</button>
          <p className="text-[9px] text-center text-slate-400">{t('onboarding.calibration.settings_hint')}</p>
        </div>
      </div>
    );
  };

  const renderGetStarted = () => (
    <div className="flex flex-col h-full min-h-0 py-2 px-2">
      <h2 className="flex-shrink-0 text-2xl font-black text-slate-800 tracking-tight text-center mb-4">
        {t('onboarding.get_started.title')}
      </h2>
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto no-scrollbar pb-2">

        {/* Card 1: Log your period */}
        <div
          className="bg-[#F0F2F5] p-5 rounded-3xl space-y-3"
          style={{ boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.7)' }}
        >
          <p className="text-xs font-black uppercase tracking-[0.15em] text-rose-400">
            {t('onboarding.get_started.period_card_title')}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('onboarding.get_started.period_card_body')}
          </p>
          {/* Period? button replica */}
          <div className="flex justify-center pt-1">
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400"
              style={{
                backgroundColor: '#F0F2F5',
                boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)'
              }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M12 21.5c-3.59 0-6.5-2.91-6.5-6.5 0-3.59 4-9.5 6.5-12.5 2.5 3 6.5 8.91 6.5 12.5 0 3.59-2.91 6.5-6.5 6.5z" />
              </svg>
              {t('calendar.period_question', 'Period?')}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic leading-relaxed">
            {t('onboarding.get_started.period_card_tip')}
          </p>
        </div>

        {/* Card 2: Log daily symptoms */}
        <div
          className="bg-[#F0F2F5] p-5 rounded-3xl space-y-3"
          style={{ boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.7)' }}
        >
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#7598a0]">
            {t('onboarding.get_started.daily_card_title')}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('onboarding.get_started.daily_card_body')}
          </p>
          {/* Calendar day cell replica */}
          <div className="flex justify-center pt-1">
            <div className="flex items-center gap-2">
              {[14, 15, 16].map((n, i) => (
                <div
                  key={n}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i === 1
                    ? 'bg-[#7598a0]/20 ring-2 ring-[#7598a0] text-[#5a7d87]'
                    : 'bg-white text-slate-400'}`}
                  style={i !== 1 ? { boxShadow: '3px 3px 6px rgba(163, 177, 198, 0.3), -3px -3px 6px rgba(255, 255, 255, 0.9)' } : {}}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 pt-3">
        <button
          onClick={handleFinish}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs text-white bg-[#7598a0] transition-all active:scale-[0.98]"
          style={{ boxShadow: '6px 6px 12px rgba(163, 177, 198, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)' }}
        >
          {t('onboarding.get_started.cta')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#F0F2F5] z-[100] flex items-center justify-center p-4 selection:bg-[#7598a0]/20">
      <div
        className="w-full max-w-md bg-[#F0F2F5] rounded-[32px] overflow-hidden flex flex-col relative"
        style={{
          boxShadow: '12px 12px 24px rgba(163, 177, 198, 0.4), -12px -12px 24px rgba(255, 255, 255, 0.8)',
          height: 'min(800px, 100%)',
          maxHeight: '100%',
        }}
      >
        {step > 0 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-20">
            {[0, 1, 2, 3, 4, 6].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${step >= i ? 'bg-[#7598a0]' : 'bg-slate-300'}`} />
            ))}
          </div>
        )}
        <div className="flex-1 min-h-0 p-4 pt-10 relative flex flex-col">
          {step === 0 && renderLanguage()}
          {step === 1 && renderTrust()}
          {step === 2 && renderCalibration()}
          {step === 3 && renderGoal()}
          {step === 4 && renderCycleSetup()}

          {step === 6 && renderGetStarted()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMooneva } from '../contexts/MoonevaContext';
import { isLabVisible } from '../services/lab';
import { getTodayStr } from '../utils/dateUtils';

interface BottomNavProps {
    currentView: 'calendar' | 'trends' | 'settings' | 'lab';
    onViewChange: (view: 'calendar' | 'trends' | 'lab') => void;
    onSettingsClick: () => void;
    isCloaked: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, onSettingsClick, isCloaked }) => {
    const { t } = useTranslation();
    // Not useLabVisible from components/lab: that barrel imports LabRoute, which imports this file.
    const { settings, logs, periods } = useMooneva();
    const today = getTodayStr();
    const labVisible = useMemo(() => isLabVisible(settings, logs, periods, today), [settings, logs, periods, today]);

    // Every tab marks the open page with the same dot under its icon.
    const activeDot = (view: BottomNavProps['currentView']) => currentView === view && (
        <span className={`mooneva-nav-dot absolute -bottom-1 w-1 h-1 rounded-full ${isCloaked ? 'bg-white' : 'bg-gray-800'}`} aria-hidden />
    );

    const navWrapperClass = 'mooneva-bottom-nav-wrap fixed bottom-0 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50 pointer-events-auto';

    return (
        <div className={navWrapperClass} style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <nav
                className={`mooneva-bottom-nav flex justify-around items-center h-14 px-4 rounded-[28px] transition-colors ${isCloaked ? 'bg-slate-900 border border-white/10' : 'bg-[#F0F2F5]'
                    }`}
                style={!isCloaked ? {
                    boxShadow: '8px 8px 16px rgba(163, 177, 198, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.8)'
                } : {}}
                aria-label={t('common.navigation', 'Navigation')}
            >
                {/* Trends */}
                <button
                    onClick={() => onViewChange('trends')}
                    className={`relative h-11 w-11 flex items-center justify-center rounded-xl transition-all ${currentView === 'trends'
                        ? (isCloaked ? 'text-white' : 'text-slate-700')
                        : (isCloaked ? 'text-white/40' : 'text-slate-400 hover:text-slate-600')
                        }`}
                    aria-label={t('trends.header')}
                    aria-current={currentView === 'trends' ? 'page' : undefined}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3 3v18h18" />
                        <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                    {activeDot('trends')}
                </button>

                {/* Calendar */}
                <button
                    onClick={() => onViewChange('calendar')}
                    className={`relative h-11 w-11 flex items-center justify-center rounded-xl transition-all ${currentView === 'calendar'
                        ? (isCloaked ? 'text-white' : 'text-slate-700')
                        : (isCloaked ? 'text-white/40' : 'text-slate-400 hover:text-slate-600')
                        }`}
                    aria-label={t('common.calendar')}
                    aria-current={currentView === 'calendar' ? 'page' : undefined}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect width="18" height="18" x="3" y="4" rx="3" />
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <path d="M3 10h18" />
                    </svg>
                    {activeDot('calendar')}
                </button>

                {/* Lab (only when switched on in Settings) */}
                {labVisible && (
                    <button
                        onClick={() => onViewChange('lab')}
                        className={`relative h-11 w-11 flex items-center justify-center rounded-xl transition-all ${currentView === 'lab'
                            ? (isCloaked ? 'text-white' : 'text-slate-700')
                            : (isCloaked ? 'text-white/40' : 'text-slate-400 hover:text-slate-600')
                            }`}
                        aria-label={t('lab.nav')}
                        aria-current={currentView === 'lab' ? 'page' : undefined}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
                            <path d="M6.453 15h11.094" />
                            <path d="M8.5 2h7" />
                        </svg>
                        {activeDot('lab')}
                    </button>
                )}

                {/* Settings */}
                <button
                    onClick={onSettingsClick}
                    className={`relative h-11 w-11 flex items-center justify-center rounded-xl transition-all ${currentView === 'settings'
                        ? (isCloaked ? 'text-white' : 'text-slate-700')
                        : (isCloaked ? 'text-white/40' : 'text-slate-400 hover:text-slate-600')
                        }`}
                    aria-label={t('common.settings')}
                    aria-current={currentView === 'settings' ? 'page' : undefined}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    {activeDot('settings')}
                </button>
            </nav>
        </div>
    );
};

export default BottomNav;

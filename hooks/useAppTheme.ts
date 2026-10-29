import { Capacitor } from '@capacitor/core';
import AppIcon from '../services/appIcon';
import { useEffect } from 'react';
import { useCycloneAppearance } from '../services/cycloneAppearance';
import { useTranslation } from 'react-i18next';

interface UseAppThemeOptions {
    view: string;
    discreteMode: boolean;
    darkNeumorphism?: boolean;
}

export const useAppTheme = ({ view, discreteMode }: UseAppThemeOptions) => {
    const { t } = useTranslation();
    const { appearance, isDark } = useCycloneAppearance();
    const darkNeumorphism = isDark;


    useEffect(() => {
        if (Capacitor.getPlatform()==='android') {
            void AppIcon.setAppearance({palette:appearance.palette}).catch(error => console.warn('Launcher appearance update failed',error));
        }
    }, [appearance.palette]);

    useEffect(() => {
        const favicon = document.getElementById('favicon') as HTMLLinkElement;
        const appleIcon = document.getElementById('apple-touch-icon') as HTMLLinkElement;
        const body = document.body;

        // Reset all classes first
        body.className = 'transition-colors duration-500 ease-in-out';
        body.removeAttribute('data-theme');
        if (discreteMode) { delete body.dataset.cyclone; delete body.dataset.cyclonePalette; }
        else { body.dataset.cyclone = 'true'; body.dataset.cyclonePalette = appearance.palette; }

        if (discreteMode) {
            body.classList.add('bg-gray-100', 'text-gray-900', 'antialiased');
            document.title = t('discrete.title');
            const iconUrl = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📋</text></svg>';
            if (favicon) favicon.href = iconUrl;
            if (appleIcon) appleIcon.href = iconUrl;
        } else {
            if (darkNeumorphism) {
                body.dataset.theme = 'dark-neumorphism';
                body.classList.add('bg-[var(--app-bg)]', 'text-[var(--text-primary)]');
            } else if (view === 'calendar') {
                body.classList.add('bg-[#f5f4f2]');
            } else if (view === 'trends') {
                body.classList.add('bg-[#fffaf5]');
            } else {
                body.classList.add('bg-white');
            }

            if (!darkNeumorphism) {
                body.classList.add('text-gray-900');
            }
            body.classList.add('antialiased');

            document.title = 'cyclone';

            const iconUrl = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#eee0f5"/><path d="M44 19a18 18 0 1 0 4 24M43 27a10 10 0 1 0 0 14" fill="none" stroke="#76578c" stroke-width="6" stroke-linecap="round"/></svg>');
            if (favicon) favicon.href = iconUrl;
            if (appleIcon) appleIcon.href = iconUrl;
        }
    }, [view, discreteMode, darkNeumorphism, t, appearance.palette]);
};

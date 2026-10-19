import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLabVisible } from './visibility';

/** Settings Lab card: says why the tab is gone while Lab is on. The card itself is hidden in discrete mode, so here a hidden Lab means an active pregnancy. */
export const LabPausedNote: React.FC = () => {
    const { t } = useTranslation();
    if (useLabVisible()) return null;
    return (
        <p role="status" className="lab-paused-note mx-4 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            <svg className="w-4 h-4 shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M8 5v14" /><path d="M16 5v14" /></svg>
            <span>{t('lab.paused_pregnancy')}</span>
        </p>
    );
};

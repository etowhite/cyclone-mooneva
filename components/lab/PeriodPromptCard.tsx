// "Start period today?" / "Extend this period to today?" The only place Lab asks Cycle to change core data,
// and only after the user confirms (project_details/business_logic.md#lab-module). The parent never renders this for 'none'.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PeriodPrompt } from '../../services/logic/lab';
import { getTodayStr } from '../../utils/dateUtils';
import { Card, ConfirmDialog, PrimaryButton, SecondaryButton } from './ui';

interface PeriodPromptCardProps {
    kind: Exclude<PeriodPrompt, 'none'>;
    onConfirm: () => void;
}

// "Not now" lasts for the rest of the local day, across Lab screen changes. Memory only.
let dismissedOn: string | null = null;
export const clearPromptDismissal = () => { dismissedOn = null; };

export const PeriodPromptCard: React.FC<PeriodPromptCardProps> = ({ kind, onConfirm }) => {
    const { t } = useTranslation();
    const [confirming, setConfirming] = useState(false);
    const [dismissed, setDismissed] = useState(() => dismissedOn === getTodayStr());
    if (dismissed) return null;

    return (
        <Card>
            <p className="text-sm font-semibold text-slate-700">{t(`lab.prompt.${kind}`)}</p>
            <p className="text-xs text-slate-400 mt-1">{t('lab.prompt.note')}</p>
            <div className="flex gap-3 mt-4">
                <SecondaryButton className="flex-1" onClick={() => { dismissedOn = getTodayStr(); setDismissed(true); }}>{t('lab.prompt.not_now')}</SecondaryButton>
                <PrimaryButton className="flex-1" onClick={() => setConfirming(true)}>{t('lab.prompt.yes')}</PrimaryButton>
            </div>
            {confirming && (
                <ConfirmDialog
                    title={t(`lab.prompt.${kind}`)}
                    message={t(`lab.prompt.${kind}_confirm`)}
                    confirmLabel={t('lab.prompt.confirm')}
                    cancelLabel={t('common.cancel')}
                    onCancel={() => setConfirming(false)}
                    onConfirm={() => { setConfirming(false); onConfirm(); }}
                />
            )}
        </Card>
    );
};

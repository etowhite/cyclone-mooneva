import React from 'react';
import { useTranslation } from 'react-i18next';

/** Predictions card: says why nothing is forecast while a pregnancy has no period after it. The caller renders it only while that holds. */
export const PregnancyPredictionsNote: React.FC = () => {
    const { t } = useTranslation();
    return <p className="px-4 pb-3 text-xs text-slate-400">{t('settings.pregnancy_predictions_paused')}</p>;
};

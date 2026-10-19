import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../ScreenWrapper';
import BottomNav from '../BottomNav';
import { LabErrorBoundary } from './LabErrorBoundary';
import type { LabScreenProps } from './LabScreen';

// The Lab screens load only when this renders, so a user who never switches Lab on never downloads them.
const LabScreen = React.lazy(() => import('./LabScreen'));

export const LabRoute: React.FC<LabScreenProps> = (props) => {
    const { t } = useTranslation();
    // LabScreen owns the bottom nav, so a render error there would leave no way out. Keep the nav in the fallback.
    const fallback = (
        <ScreenWrapper>
            <div role="alert" className="flex-1 px-6 py-10 text-center text-sm text-slate-600">{t('lab.error')}</div>
            <BottomNav
                currentView="lab"
                onViewChange={(v) => { if (v !== 'lab') { props.setSubView('main'); props.setView(v); } }}
                onSettingsClick={() => { props.setSubView('main'); props.setView('settings'); }}
                isCloaked={props.isCloaked}
            />
        </ScreenWrapper>
    );
    return (
        <LabErrorBoundary fallbackText={t('lab.error')} fallback={fallback}>
            <Suspense fallback={<div className="fixed inset-0 bg-[#F0F2F5]" />}>
                <LabScreen {...props} />
            </Suspense>
        </LabErrorBoundary>
    );
};

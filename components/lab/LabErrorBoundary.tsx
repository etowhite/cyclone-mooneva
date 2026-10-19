import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Logger from '../../services/logger';

interface LabErrorBoundaryProps {
    fallbackText: string;
    /** Replaces the default message box, e.g. to keep the bottom nav on a full-screen route. */
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

/** Keeps a Lab render error inside Lab. It never reaches Cycle's own error screen. */
export const LabErrorBoundary: React.FC<LabErrorBoundaryProps> = ({ fallbackText, fallback, children }) => (
    <ErrorBoundary
        fallbackRender={() => fallback ?? (
            <div role="alert" className="p-4 text-center text-sm text-gray-600">
                {fallbackText}
            </div>
        )}
        onError={(error) => {
            Logger.error('Lab render error', error);
        }}
    >
        {children}
    </ErrorBoundary>
);

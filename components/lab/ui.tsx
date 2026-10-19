// Small shared pieces for the Lab screens: card styles, icons, the back header and the portal dialog.
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { pushBackInterceptor } from '../../hooks/useAppNavigation';

export const FLUID_COLOR = '#d77d8d';
export const SHADOW = '8px 8px 16px rgba(163, 177, 198, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.8)';
export const SHADOW_SM = '4px 4px 8px rgba(163, 177, 198, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.8)';
export const SHADOW_INSET = 'inset 3px 3px 6px rgba(163, 177, 198, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.8)';

/**
 * A selectable tile inside a card. Flat, like Cycle's fields and chips: the card carries the
 * shadow, the tile only a thin border. Selected: teal border, light teal fill, teal text.
 */
export const selectable = (on: boolean): { className: string } => ({
    className: `border transition-all ${on ? 'bg-[#5b7a82]/10 border-[#5b7a82] text-[#4a6b73] font-semibold' : 'bg-white border-slate-200 text-slate-600'}`,
});

/** Text, number, date and time fields: flat with a thin border, like Cycle's number fields. */
export const FIELD_CLASS = 'bg-white border border-slate-200 text-slate-700 outline-none focus-visible:outline-none focus:border-[#8aacac] focus:ring-2 focus:ring-[#7598a0]/30';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <section className={`bg-[#F0F2F5] rounded-[32px] p-6 ${className}`} style={{ boxShadow: SHADOW }}>
        {children}
    </section>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', style, ...rest }) => (
    <button
        type="button"
        {...rest}
        className={`rounded-2xl bg-[#5b7a82] px-5 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        style={{ boxShadow: SHADOW_SM, ...style }}
    />
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', style, ...rest }) => (
    <button
        type="button"
        {...rest}
        className={`rounded-2xl bg-[#F0F2F5] px-5 py-3.5 text-sm font-bold text-slate-600 transition-all active:scale-[0.98] disabled:opacity-40 ${className}`}
        style={{ boxShadow: SHADOW_SM, ...style }}
    />
);

const Svg: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

export const Icons = {
    Back: () => <Svg size={20}><path d="m15 18-6-6 6-6" /></Svg>,
    Info: () => <Svg size={16}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Svg>,
    Edit: () => <Svg size={16}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>,
    Trash: () => <Svg size={16}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Svg>,
    Clock: () => <Svg size={20}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Svg>,
    Hourglass: () => <Svg size={20}><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22" /><path d="M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2" /></Svg>,
    Alert: () => <Svg size={20}><path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></Svg>,
    Drop: () => <Svg size={20}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></Svg>,
    /** Lab history: a clock with a back arrow, so it does not look like a list or a menu. */
    History: () => <Svg><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></Svg>,
    /** Lab settings: sliders, so it is not mistaken for the app's Settings gear in the bottom bar. */
    Sliders: () => <Svg><path d="M21 4h-7" /><path d="M10 4H3" /><path d="M21 12h-9" /><path d="M8 12H3" /><path d="M21 20h-5" /><path d="M12 20H3" /><path d="M14 2v4" /><path d="M8 10v4" /><path d="M16 18v4" /></Svg>,
    Bell: () => <Svg><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Svg>,
    Check: () => <Svg size={14}><path d="M20 6 9 17l-5-5" /></Svg>,
    Star: () => <Svg size={16}><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></Svg>,
    Plus: () => <Svg size={22}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>,
};

/** Round icon button for the header, same style as the back button. */
export const IconButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="h-11 w-11 shrink-0 rounded-xl bg-[#F0F2F5] flex items-center justify-center text-slate-600"
        style={{ boxShadow: SHADOW_SM }}
    >
        {children}
    </button>
);

/** Screen header: back button, title, optional right slot. */
export const LabHeader: React.FC<{ title: string; onBack?: () => void; right?: React.ReactNode }> = ({ title, onBack, right }) => {
    const { t } = useTranslation();
    return (
        <header className="flex items-center gap-3 px-4 pt-3 pb-2">
            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    aria-label={t('common.back')}
                    className="h-11 w-11 shrink-0 rounded-xl bg-[#F0F2F5] flex items-center justify-center transition-colors text-slate-600"
                    style={{ boxShadow: SHADOW_SM }}
                >
                    <span className="text-xl rtl:rotate-180" aria-hidden="true">←</span>
                </button>
            )}
            <h1 className="flex-1 text-lg font-bold text-slate-700 truncate">{title}</h1>
            {right}
        </header>
    );
};

interface DialogProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    /** Buttons that stay in view while the body scrolls (the keyboard can leave little room). */
    footer?: React.ReactNode;
}

/**
 * Portal dialog in Cycle's pattern (Settings dialogs, CycleInsightModal): fixed overlay,
 * Escape closes it, and Android back closes it through pushBackInterceptor instead of leaving the screen.
 */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const Dialog: React.FC<DialogProps> = ({ title, onClose, children, footer }) => {
    const box = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        // Focus moves into the dialog, Tab stays inside it, and focus goes back to where it was on close.
        const before = document.activeElement as HTMLElement | null;
        const items = () => Array.from(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        (items()[0] ?? box.current)?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { closeRef.current(); return; }
            if (e.key !== 'Tab') return;
            const list = items();
            if (list.length === 0) { e.preventDefault(); return; }
            const first = list[0], last = list[list.length - 1], at = document.activeElement;
            if (e.shiftKey && (at === first || !box.current?.contains(at))) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && (at === last || !box.current?.contains(at))) { e.preventDefault(); first.focus(); }
        };
        window.addEventListener('keydown', onKeyDown);
        const releaseBack = pushBackInterceptor(() => closeRef.current());
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            releaseBack();
            before?.focus?.();
        };
    }, []);

    return createPortal((
        <>
            <div className="lab-dialog-backdrop fixed inset-0 bg-black/40 z-[301]" onClick={onClose} />
            <div
                ref={box}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="lab-dialog-box fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[302] outline-none bg-[#F0F2F5] rounded-[28px] p-5 max-w-sm mx-auto flex flex-col"
            >
                <h2 className="text-base font-bold text-slate-700 mb-3 shrink-0">{title}</h2>
                <div className="min-h-0 overflow-y-auto -mx-1 px-1 py-1 -my-1">{children}</div>
                {footer && <div className="shrink-0 pt-4">{footer}</div>}
            </div>
        </>
    ), document.body);
};

/** Yes / no confirm in the same style. */
export const ConfirmDialog: React.FC<{
    title: string;
    message?: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) => (
    <Dialog
        title={title}
        onClose={onCancel}
        footer={(
            <div className="flex gap-3">
                <SecondaryButton className="flex-1" onClick={onCancel}>{cancelLabel}</SecondaryButton>
                <PrimaryButton className="flex-1" onClick={onConfirm}>{confirmLabel}</PrimaryButton>
            </div>
        )}
    >
        {message && <p className="text-xs text-slate-600">{message}</p>}
    </Dialog>
);

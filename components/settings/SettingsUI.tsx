import React from 'react';

// Visible 40x24 track inside a 44x44 keyboard/touch target on every screen.
export const Toggle = ({ active, onClick, disabled, small = false, label }: { active: boolean; onClick: () => void; disabled?: boolean; small?: boolean; label?: string }) => (
    <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={label}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className="cyclone-toggle"
    >
        <span className="cyclone-toggle-track" aria-hidden="true"><span className="cyclone-toggle-thumb" /></span>
    </button>
);

// The title names the group for screen readers.
export const SettingCard = ({ children, title }: { children: React.ReactNode, title?: string }) => (
    <div className="space-y-3" role="group" aria-label={title}>
        <div
            className="cyclone-setting-card overflow-hidden"
        >
            {children}
        </div>
    </div>
);

// 3. Neumorphic Row
export const SettingRow = ({ label, desc, icon, children, last, mergeWithNext, onClick, onLabelClick, tooltip, rightElement }: { label: string, desc?: React.ReactNode, icon?: React.ReactNode, children?: React.ReactNode, last?: boolean, mergeWithNext?: boolean, onClick?: () => void, onLabelClick?: () => void, tooltip?: string, rightElement?: React.ReactNode }) => {
    const Root = onClick ? 'button' : 'div';
    return (
    <Root
        {...(onClick ? { type: 'button' as const, onClick } : {})}
        title={tooltip}
        className={`cyclone-setting-row py-3 px-4 ${!last ? 'border-b border-slate-200/50' : ''} ${mergeWithNext ? 'setting-row-merge-next' : ''} ${onClick ? 'block w-full text-start cursor-pointer active:bg-slate-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7598a0]' : ''}`}
    >
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {icon && (
                    <div
                        className="w-9 h-9 shrink-0 rounded-xl bg-[#F0F2F5] flex items-center justify-center text-slate-500"
                        style={{ boxShadow: 'none' }}
                    >
                        {icon}
                    </div>
                )}
                <div className="flex flex-col min-w-0">
                    {onLabelClick ? <button type="button" className="cyclone-setting-title text-start text-[14px] font-semibold" onClick={onLabelClick}>{label}</button> : <span className="text-[14px] font-semibold text-slate-700 cyclone-setting-title">{label}</span>}
                    {desc && <p className="text-[12px] text-slate-400 leading-snug mt-0.5 tracking-tight">{desc}</p>}
                </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
                {children}
                {rightElement}
            </div>
        </div>
    </Root>
    );
};

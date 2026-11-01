import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'filled' | 'outline' | 'text';
};

/** Native buttons keep keyboard, disabled and form semantics. Never apply to calendar date cells. */
export function Button({ variant = 'outline', className = '', type = 'button', ...props }: ButtonProps) {
    return <button type={type} className={`cyclone-button cyclone-button--${variant} ${className}`} {...props} />;
}

export function Choice({ selected, ...props }: ButtonProps & { selected: boolean }) {
    return <Button aria-pressed={selected} {...props} />;
}

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLElement>) {
    return <section className={`cyclone-card ${className}`} {...props} />;
}

export function Field({ className = '', ...props }: React.ComponentPropsWithRef<'input'>) {
    return <input className={`cyclone-field ${className}`} {...props} />;
}

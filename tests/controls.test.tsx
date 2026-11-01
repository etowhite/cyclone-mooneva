import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toggle } from '../components/settings/SettingsUI';
import { Field, Choice } from '../components/ui/Controls';
import { OriginalPainSlider } from '../components/calendar/OriginalPainSlider';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../services/cycloneAppearance', () => ({ useCycloneAppearance: () => ({ appearance: { palette: 'rose' }, isDark: false }) }));
afterEach(cleanup);

describe('Shared interactive controls', () => {
    it('keeps a disabled switch inert and exposes its current state', () => {
        const change = vi.fn();
        render(<Toggle active disabled onClick={change} label="Backup" />);
        const toggle = screen.getByRole('switch', { name: 'Backup' });
        expect(toggle.getAttribute('aria-checked')).toBe('true');
        fireEvent.click(toggle);
        expect(change).not.toHaveBeenCalled();
    });
    it('forwards file-input refs used by backup import', () => {
        const ref = React.createRef<HTMLInputElement>();
        render(<Field type="file" ref={ref} aria-label="Import" />);
        expect(ref.current).toBe(screen.getByLabelText('Import'));
        expect(ref.current?.type).toBe('file');
    });
    it('exposes choice selection without submitting its enclosing form', () => {
        render(<Choice selected>Theme</Choice>);
        const choice = screen.getByRole('button', { name: 'Theme' });
        expect(choice.getAttribute('aria-pressed')).toBe('true');
        expect(choice.getAttribute('type')).toBe('button');
    });
    it('keeps unrecorded pain distinct from zero until a keyboard action', () => {
        vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
        function Harness() {
            const [value, setValue] = useState<number | null>(null);
            return <OriginalPainSlider value={value} onChange={setValue} />;
        }
        render(<Harness />);
        const slider = screen.getByRole('slider');
        expect(slider.getAttribute('aria-valuetext')).toBe('log.pain_unrated');
        fireEvent.keyDown(slider, { key: 'Home' });
        expect(slider.getAttribute('aria-valuetext')).toBe('0 / 10');
        fireEvent.keyDown(slider, { key: 'End' });
        fireEvent.keyDown(slider, { key: 'ArrowRight' });
        expect(slider.getAttribute('aria-valuenow')).toBe('10');
        vi.unstubAllGlobals();
    });
});

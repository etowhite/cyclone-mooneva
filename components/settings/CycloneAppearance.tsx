import React from 'react';
import { useTranslation } from 'react-i18next';
import { palettes, useCycloneAppearance, type Mode } from '../../services/cycloneAppearance';
export default function CycloneAppearance() {
    const { i18n } = useTranslation();
    const ru = i18n.language.startsWith('ru');
    const { appearance, update } = useCycloneAppearance();
    const names = ru ? ['Роза','Лаванда','Шалфей','Океан','Янтарь'] : ['Rose','Lavender','Sage','Ocean','Amber'];
    return <section className="cyclone-appearance" aria-label={ru ? 'Оформление' : 'Appearance'}>
        <h2>{ru ? 'Оформление' : 'Appearance'}</h2>
        <div className="cyclone-choices" role="group" aria-label={ru ? 'Тема' : 'Theme'}>
            {(['auto','light','dark'] as Mode[]).map((mode, index) => <button key={mode} type="button" aria-pressed={appearance.mode === mode}
                onClick={() => update({ ...appearance, mode })}>{(ru ? ['Авто','Светлая','Тёмная'] : ['Auto','Light','Dark'])[index]}</button>)}
        </div>
        <h3>{ru ? 'Цветовая палитра' : 'Colour palette'}</h3>
        <div className="cyclone-choices" role="group" aria-label={ru ? 'Цветовая палитра' : 'Colour palette'}>
            {palettes.map((palette,index) => <button key={palette} type="button" aria-pressed={appearance.palette === palette}
                onClick={() => update({ ...appearance, palette })}>{names[index]}</button>)}
        </div>
    </section>;
}

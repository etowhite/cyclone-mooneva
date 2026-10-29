import React from 'react';
import {useTranslation} from 'react-i18next';
import type {CycleStatusData} from '../../services/logic/status';
import {dailySuggestions, hasCycleForSuggestions} from '../../services/dailySuggestions';
export function DailySuggestions({date,status,general}:{date:string;status:CycleStatusData;general:boolean}) {
 const {i18n}=useTranslation(); const ru=i18n.language.startsWith('ru');
 if (!hasCycleForSuggestions(status)) return null;
 return <section className="cyclone-day-tips" aria-label={ru?'Подсказки на выбранный день':'Suggestions for the selected day'}>
  <header><h2>{ru?'Подсказки на день':'Daily suggestions'}</h2><p>{date} · {ru?'Выбирай то, что подходит твоему самочувствию. Фаза — лишь ориентир.':'Choose what fits how you feel. The phase is only a guide.'}</p></header>
  {dailySuggestions(date,status,i18n.language,general).map(tip=><article key={tip.category}><h3>{tip.title}</h3><p>{tip.text}</p></article>)}
 </section>;
}

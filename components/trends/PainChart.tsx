import React,{useMemo,useState} from 'react';
import {useTranslation} from 'react-i18next';
import type {DailyLog} from '../../types';
import {summarizePain} from '../../services/painStats';
import {toLocalISOString,parseLocalDate} from '../../utils/dateUtils';
export default function PainChart({logs,days}:{logs:Record<string,DailyLog>;days:number}){
 const {i18n}=useTranslation();const ru=i18n.language.startsWith('ru');const today=toLocalISOString(new Date());
 const summary=useMemo(()=>summarizePain(logs,days,today),[logs,days,today]);
 const [selectedDate,setSelectedDate]=useState<string|null>(null);
 const index=Math.max(0,summary.points.findIndex(p=>p.date===selectedDate));
 const selected=summary.points[index];
 const x=(offset:number)=>32+offset/Math.max(1,days-1)*270;
 const y=(value:number)=>160-value*14;
 const dateLabel=(date:string)=>new Intl.DateTimeFormat(ru?'ru-RU':'en-GB',{day:'numeric',month:'short',year:'numeric'}).format(parseLocalDate(date));
 const chooseAt=(clientX:number,el:SVGSVGElement)=>{const r=el.getBoundingClientRect();const px=(clientX-r.left)/r.width*320;let best=summary.points[0];for(const p of summary.points)if(Math.abs(x(p.offset)-px)<Math.abs(x(best.offset)-px))best=p;setSelectedDate(best.date)};
 return <section className="cyclone-pain-chart" aria-label={ru?'График боли':'Pain chart'}>
  <h2>{ru?'Боль со временем':'Pain over time'}</h2>
  <p>{ru?'Средняя боль':'Average pain'}: <strong>{summary.average===null?'—':summary.average.toLocaleString(ru?'ru-RU':'en-GB',{maximumFractionDigits:1})+' / 10'}</strong></p>
  <p className="cyclone-pain-caption">{ru?`За ${days} дней · отметок: ${summary.count}. Дни без оценки не считаются нулём.`:`${days} days · ${summary.count} entries. Unrated days are not treated as zero.`}</p>
  {!selected?<p>{ru?'Отметь боль в самочувствии, чтобы увидеть график.':'Log pain in your daily entry to see the chart.'}</p>:<>
   <div className="cyclone-pain-selected" aria-live="polite"><button type="button" aria-label={ru?'Предыдущая отметка боли':'Previous pain entry'} disabled={index===0} onClick={()=>setSelectedDate(summary.points[index-1].date)}>←</button><span>{dateLabel(selected.date)}<strong>{ru?'Боль':'Pain'} {selected.value}/10</strong></span><button type="button" aria-label={ru?'Следующая отметка боли':'Next pain entry'} disabled={index===summary.points.length-1} onClick={()=>setSelectedDate(summary.points[index+1].date)}>→</button></div>
   <svg viewBox="0 0 320 190" role="group" aria-label={ru?'Выбери точку, чтобы узнать дату и оценку боли':'Select a point to read its date and pain score'} style={{touchAction:'pan-y'}} onPointerDown={e=>{chooseAt(e.clientX,e.currentTarget);e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(e.buttons)chooseAt(e.clientX,e.currentTarget)}}>
    {[0,2,4,6,8,10].map(n=><g key={n}><line x1="32" x2="302" y1={y(n)} y2={y(n)} stroke="var(--border-soft)" strokeOpacity=".4"/><text x="22" y={y(n)+4} textAnchor="end" fill="var(--text-secondary)" fontSize="11">{n}</text></g>)}
    {summary.average!==null&&<line x1="32" x2="302" y1={y(summary.average)} y2={y(summary.average)} stroke="var(--cyclone-primary)" strokeDasharray="4 4"/>}
    {summary.points.map((p,i)=>{const prev=summary.points[i-1];return <g key={p.date}>{prev&&p.offset-prev.offset===1&&<line x1={x(prev.offset)} y1={y(prev.value)} x2={x(p.offset)} y2={y(p.value)} stroke="var(--cyclone-primary)" strokeWidth="2"/>}<circle tabIndex={0} role="button" aria-label={`${dateLabel(p.date)}: ${p.value}/10`} cx={x(p.offset)} cy={y(p.value)} r={p.date===selected.date?6:4} fill="var(--cyclone-primary)" stroke="var(--surface)" strokeWidth="2" onFocus={()=>setSelectedDate(p.date)} onClick={()=>setSelectedDate(p.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedDate(p.date)}}}/></g>})}
    <text x="32" y="183" fill="var(--text-secondary)" fontSize="10">{dateLabel(summary.start)}</text><text x="302" y="183" textAnchor="end" fill="var(--text-secondary)" fontSize="10">{dateLabel(summary.end)}</text>
   </svg>
  </>}
 </section>;
}

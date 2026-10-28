import React,{useLayoutEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useCycloneAppearance} from '../../services/cycloneAppearance';
import {originalSliderColors} from './originalSliderColors';
import './OriginalPainSlider.css';

/** Web port of the Material3 1.3.0 Slider used by native cyclone's SymptomScreen.
 * Original call: valueRange=0f..10f, steps=9, roundToInt(). The surrounding section
 * remains inline, as requested for this fork. No native-input thumb approximation.
 */
export function OriginalPainSlider({value,onChange}:{value:number|null;onChange:(value:number)=>void}){
 const {t}=useTranslation();const {appearance,isDark}=useCycloneAppearance();
 const root=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(300);const [pressed,setPressed]=useState(false);const [focused,setFocused]=useState(false);
 useLayoutEffect(()=>{const el=root.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));observer.observe(el);return()=>observer.disconnect()},[]);
 const palette=originalSliderColors[appearance.palette][isDark?'dark':'light'];
 const selected=value??0;const thumbWidth=pressed||focused?2:4;const center=2+(width-4)*selected/10;
 const activeEnd=Math.max(0,center-thumbWidth/2-6);const inactiveStart=Math.min(width,center+thumbWidth/2+6);
 const choose=(clientX:number)=>{const r=root.current!.getBoundingClientRect();onChange(Math.max(0,Math.min(10,Math.round((clientX-r.left-2)/Math.max(1,r.width-4)*10))))};
 return <div ref={root} className="cyclone-original-pain-slider" role="slider" tabIndex={0} aria-label={t('log.pain_title')} aria-valuemin={0} aria-valuemax={10} aria-valuenow={selected} aria-valuetext={value===null?t('log.pain_unrated'):selected+' / 10'}
  onFocus={()=>setFocused(true)} onBlur={()=>{setFocused(false);setPressed(false)}}
  onKeyDown={e=>{const step=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:e.key==='PageUp'?1:e.key==='PageDown'?-1:0;if(step||e.key==='Home'||e.key==='End'){e.preventDefault();onChange(e.key==='Home'?0:e.key==='End'?10:Math.max(0,Math.min(10,selected+step)))}}}
  onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);setPressed(true);choose(e.clientX)}}
  onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))choose(e.clientX)}}
  onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){choose(e.clientX);e.currentTarget.releasePointerCapture(e.pointerId)}setPressed(false)}}
  onPointerCancel={()=>setPressed(false)}>
   <svg viewBox={`0 0 ${width} 48`} width="100%" height="48" aria-hidden="true">
    {activeEnd>0&&<path d={`M8 16 H${Math.max(8,activeEnd-2)} Q${activeEnd} 16 ${activeEnd} 18 V30 Q${activeEnd} 32 ${Math.max(8,activeEnd-2)} 32 H8 A8 8 0 0 1 8 16 Z`} fill={palette.primary}/>}
    {inactiveStart<width&&<path d={`M${inactiveStart+2} 16 H${width-8} A8 8 0 0 1 ${width-8} 32 H${inactiveStart+2} Q${inactiveStart} 32 ${inactiveStart} 30 V18 Q${inactiveStart} 16 ${inactiveStart+2} 16 Z`} fill={palette.secondaryContainer}/>}
    {Array.from({length:11},(_,n)=>{const x=8+(width-16)*n/10;return Math.abs(x-center)<=thumbWidth/2+8?null:<circle key={n} cx={x} cy="24" r="2" fill={n<=selected?palette.secondaryContainer:palette.primary}/>})}
    <rect x={center-thumbWidth/2} y="2" width={thumbWidth} height="44" rx={thumbWidth/2} fill={palette.primary}/>
   </svg>
 </div>;
}

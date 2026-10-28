import {describe,it,expect} from 'vitest';
import {dailySuggestions} from '../services/dailySuggestions';
import type {CycleStatusData} from '../services/logic/status';
const status:CycleStatusData={title:'',subtitle:'',phaseKey:'follicular',dayOfCycle:1};
describe('daily suggestions',()=>{
 it('provides three stable translated categories with no repeated full tips over 56 cycle days',()=>{
  for(const language of ['ru','en']){
   const texts=[new Set<string>(),new Set<string>(),new Set<string>()];
   for(let day=1;day<=56;day++){
    const tips=dailySuggestions('2026-10-28',{...status,dayOfCycle:day},language);
    expect(tips).toEqual(dailySuggestions('2026-10-28',{...status,dayOfCycle:day},language));
    expect(tips.map(t=>t.category)).toEqual(['work','sport','mood']);
    tips.forEach((t,i)=>texts[i].add(t.text));
   }
   texts.forEach(t=>expect(t.size).toBe(56));
  }
 });
 it('uses general wording when pregnancy, hormonal contraception or paused predictions suppress phases',()=>{
  expect(dailySuggestions('2026-10-28',{...status,phaseKey:'menstrual'},'en',true)[1].text).not.toContain('bleeding');
 });
});

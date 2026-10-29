import {describe,it,expect} from 'vitest';
import {summarizePain,isPainScore} from '../services/painStats';
import {hasDailyLogContent} from '../utils/dailyLogContent';
import type {DailyLog} from '../types';
const log=(date:string,pain?:number|null):DailyLog=>({date,pain,flow:null,symptoms:[],notes:''});
describe('pain ratings and selected date ranges',()=>{
 it('distinguishes a recorded zero from no rating',()=>{expect(hasDailyLogContent(log('2026-10-28',0))).toBe(true);expect(hasDailyLogContent(log('2026-10-28'))).toBe(false);expect(hasDailyLogContent(log('2026-10-28',null))).toBe(false)});
 it('uses exactly the selected days including today, excluding future and unrecorded dates',()=>{
  const logs=Object.fromEntries([log('2026-09-28',10),log('2026-09-29',0),log('2026-10-01',4),log('2026-10-10'),log('2026-10-28',8),log('2026-10-29',10)].map(l=>[l.date,l]));
  const thirty=summarizePain(logs,30,'2026-10-28');expect(thirty.start).toBe('2026-09-29');expect(thirty.count).toBe(3);expect(thirty.average).toBe(4);expect(thirty.points.map(p=>p.value)).toEqual([0,4,8]);
  expect(summarizePain(logs,90,'2026-10-28').average).toBe(5.5);
 });
 it('returns no average for empty ratings and rejects values outside the scale',()=>{expect(summarizePain({'2026-10-28':log('2026-10-28')},30,'2026-10-28').average).toBeNull();for(const p of [-1,11,1.5,NaN,null,undefined,'5'])expect(isPainScore(p)).toBe(false);expect(isPainScore(10)).toBe(true)});
});

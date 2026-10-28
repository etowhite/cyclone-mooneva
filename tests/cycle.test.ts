import { describe, it, expect } from 'vitest';
import { computeAdaptiveLengths, getEligibleCycles, getPastCycles, isDateInPeriod, resolveCycleRules } from '../services/logic/cycle';
import type { Cycle, PeriodRecord } from '../types';
const sample = (length: number, periodLength = 5): Cycle => ({ startDate:'2026-01-01', length, periodLength });
describe('Upstream calculation contracts retained by cyclone', () => {
 it('waits for three eligible completed cycles', () => {
  expect(computeAdaptiveLengths([sample(28),sample(30)])).toBeNull();
 });
 it('learns exactly the latest three using arithmetic means', () => {
  expect(computeAdaptiveLengths([sample(20),sample(28,4),sample(30,5),sample(32,6)])).toMatchObject({cycleLength:30,periodLength:5});
 });
 it('excludes gaps, withdrawal bleeds and pregnancy from learning', () => {
  expect(getEligibleCycles([sample(28),sample(75),{...sample(30),isPregnancy:true},{...sample(29),isWithdrawalBleed:true}])).toHaveLength(1);
 });
 it('does not replace active bleeding count with episode span', () => {
  const periods: PeriodRecord[]=[{id:'a',startDate:'2026-10-01',days:3,activeDays:[0,2]},{id:'b',startDate:'2026-10-29',days:5}];
  expect(getPastCycles(periods)[0]).toMatchObject({length:28,periodLength:2,spanDays:3});
 });
 it('has inclusive episode boundaries', () => {
  const period: PeriodRecord={id:'a',startDate:'2026-10-01',days:3};
  expect(isDateInPeriod(period,'2026-10-03')).toBe(true);
  expect(isDateInPeriod(period,'2026-10-04')).toBe(false);
 });
 it('fits phase boundaries to the available cycle length', () => {
  const rules=resolveCycleRules({cycleLength:18,periodLength:15,lutealPhaseLength:14,pmsLength:7});
  expect(rules.luteal).toBe(3);
  expect(rules.pms).toBe(2);
 });
});

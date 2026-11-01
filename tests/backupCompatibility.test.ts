import {describe,it,expect} from 'vitest';
import {DEFAULT_SETTINGS,restoreBackup,sanitizeSettingsForBackup,mergeRestoredSettings} from '../services/logic/storage';
describe('backups after removal of the experimental feature',()=>{
 it('rejects malformed JSON and invalid top-level collections before changing stored entries',async()=>{
  await expect(restoreBackup(new File(['{broken'],'broken.json'))).rejects.toThrow();
  await expect(restoreBackup(new File([JSON.stringify({data:[],settings:DEFAULT_SETTINGS})],'array.json'))).rejects.toThrow();
 });
 it('rejects malformed periods and preserves valid long records without truncation',async()=>{
  const payload={data:{},settings:DEFAULT_SETTINGS,periods:[{id:'long',startDate:'2026-09-01',days:40,activeDays:[0,39]}]};
  const file=()=>new File([JSON.stringify(payload)],'periods.json');
  expect((await restoreBackup(file())).periods).toEqual(payload.periods);
  for(const period of [null,{id:'bad',startDate:'2026-02-31',days:5},{id:'bad',startDate:'2026-10-01',days:5,activeDays:[5]},{id:'bad',startDate:'2026-10-01',days:-1}]){
   await expect(restoreBackup(new File([JSON.stringify({...payload,periods:[period]})],'bad.json'))).rejects.toThrow();
  }
 });
 it('preserves zero pain and rejects an out-of-range pain rating',async()=>{
  const entry={date:'2026-10-28',pain:0,flow:null,symptoms:[],notes:''};
  const payload={data:{'2026-10-28':entry},settings:DEFAULT_SETTINGS,timestamp:'2026-10-28T00:00:00Z'};
  const restored=await restoreBackup(new File([JSON.stringify(payload)],'pain.json'));
  expect(restored.data['2026-10-28'].pain).toBe(0);
  payload.data['2026-10-28'].pain=11;
  await expect(restoreBackup(new File([JSON.stringify(payload)],'invalid.json'))).rejects.toThrow();
 });
 it('imports core records from an older backup with an unknown optional extension',async()=>{
  const data={data:{},settings:{...DEFAULT_SETTINGS,labEnabled:true},periods:[{id:'legacy',startDate:'2026-10-01',days:5}],timestamp:'2026-10-28T00:00:00Z',lab:{legacy:'not used'}};
  const file=new File([JSON.stringify(data)],'backup.json',{type:'application/json'});
  const restored=await restoreBackup(file);
  expect(restored.periods).toEqual(data.periods);expect(restored.data).toEqual({});
 });
 it('omits the removed toggle and retains the device PIN policy on restore',()=>{
  const incoming={...DEFAULT_SETTINGS,labEnabled:true,pinHash:'untrusted',pinSalt:'untrusted'};
  const device={...DEFAULT_SETTINGS,pinHash:'device-hash',pinSalt:'device-salt'};
  expect(sanitizeSettingsForBackup(incoming).labEnabled).toBeUndefined();
  const restored=mergeRestoredSettings(incoming,device);
  expect(restored.labEnabled).toBe(false);expect(restored.pinHash).toBe('device-hash');expect(restored.pinSalt).toBe('device-salt');
 });
});

import type {DailyLog} from '../types';
import {addDays,diffInDays} from '../utils/dateUtils';
export const isPainScore = (value: unknown): value is number => typeof value==='number' && Number.isInteger(value) && value>=0 && value<=10;
export function summarizePain(logs:Record<string,DailyLog>,days:number,today:string){
 const start=addDays(today,1-days);
 const points=Object.entries(logs).filter(([date,log])=>date>=start&&date<=today&&isPainScore(log.pain)).sort(([a],[b])=>a.localeCompare(b)).map(([date,log])=>({date,value:log.pain as number,offset:diffInDays(date,start)}));
 const average=points.length?points.reduce((sum,p)=>sum+p.value,0)/points.length:null;
 return {start,end:today,points,average,count:points.length};
}

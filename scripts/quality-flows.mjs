import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='verification/update-2026-11-01';const results=[];const errors=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
const ctx=await browser.newContext({viewport:{width:360,height:915}});const p=await ctx.newPage();
p.on('pageerror',e=>errors.push(e.message));
const pass=name=>{results.push({name,status:'PASS'});console.log('PASS',name)};
try{
 await p.addInitScript(()=>localStorage.setItem('i18nextLng','ru'));
 await p.goto('http://127.0.0.1:5174');await p.waitForTimeout(1500);
 for(let n=0;n<7 && await p.locator('.cyclone-onboarding').count();n++){
   
   await p.getByRole('button',{name:/^(Продолжить|Далее|Поехали|Начать отслеживание)$/}).first().click();await p.waitForTimeout(250);
   if(n===3){await p.getByRole('button',{name:'Назад',exact:true}).click();await p.getByRole('button',{name:'Продолжить',exact:true}).click();}
 }
 await p.waitForTimeout(1200);assert.equal(await p.locator('.cyclone-onboarding').count(),0);pass('complete onboarding and cycle-settings back navigation');
 const close=p.getByRole('button',{name:'Закрыть',exact:true});if(await close.count())await close.first().click();
 await p.locator('.calendar-day-cell[aria-current=date]').click();
 await p.getByRole('tab',{name:'Заметки',exact:true}).click();
 await p.locator('textarea').fill('Synthetic QA persisted note');await p.waitForTimeout(2000);
 await p.reload();await p.waitForTimeout(1000);
 await p.locator('.calendar-day-cell[aria-current=date]').click();const edit=p.getByRole('button',{name:/Нажмите, чтобы изменить/});if(await edit.count())await edit.click();await p.getByRole('tab',{name:'Заметки',exact:true}).click();
 assert.equal(await p.locator('textarea').inputValue(),'Synthetic QA persisted note');pass('note edit persists after reload');
 await p.getByRole('button',{name:'Настройки',exact:true}).click();
 await p.getByRole('button',{name:/Блокировка PIN/}).click();
 const enable=p.getByRole('button',{name:'Включить PIN',exact:true});assert.ok(await enable.isDisabled());
 const fields=p.locator('.pin-setup-input');await fields.nth(0).fill('1234');await fields.nth(1).fill('1235');assert.ok(await enable.isDisabled());
 await fields.nth(1).fill('1234');assert.ok(await enable.isEnabled());await enable.click();await p.waitForTimeout(1000);
 await p.reload();await p.waitForTimeout(1000);
 const pin=p.locator('input[type=password]');await pin.fill('1234');await pin.press('Enter');await p.waitForTimeout(1200);
 assert.ok(await p.getByRole('button',{name:'Настройки',exact:true}).count());pass('PIN disabled for incomplete or mismatched entry; setup and unlock after reload');
 await p.screenshot({path:out+'/pin-flow.png'});assert.deepEqual(errors,[]);
}catch(e){await p.screenshot({path:out+'/flows-failure.png'});fs.writeFileSync(out+'/flows-failure.txt',await p.locator('body').innerText());throw e;}finally{fs.writeFileSync(out+'/flows-results.json',JSON.stringify({at:new Date().toISOString(),results,errors},null,2));await browser.close();}



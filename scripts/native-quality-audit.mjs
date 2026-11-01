/* Use only the isolated cyclone_design AVD (5574), after installing this build. */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const adb=path.resolve('../.toolchain/android-sdk/platform-tools/adb.exe');
const out='verification/update-2026-11-01';
const sh=(...args)=>execFileSync(adb,['-s','emulator-5574',...args],{encoding:'utf8',timeout:30000});
assert.match(sh('emu','avd','name'),/^cyclone_design/m);
const results=[],errors=[];const pass=name=>{results.push({name,status:'PASS'});console.log('PASS',name)};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const p=browser.contexts()[0].pages().find(p=>p.url().includes('localhost'));
assert.ok(p,'Native WebView not attached');
p.on('pageerror',e=>errors.push(e.message));
const shot=async name=>{await p.screenshot({path:path.join(out,'android-'+name+'.png')});};
try{
 await p.evaluate(()=>{localStorage.setItem('i18nextLng','ru');localStorage.setItem('cyclone.appearance.v1',JSON.stringify({palette:'lavender',mode:'dark'}));});
 await p.reload();await p.waitForTimeout(2500);
 await shot('first-launch');
 for(let n=0;n<8 && await p.locator('.cyclone-onboarding').count();n++){
   const btn=p.getByRole('button',{name:/^(Продолжить|Далее|Начать отслеживание|Поехали|Начать)$/});
   if(!await btn.count())throw Error('Onboarding step: '+(await p.locator('body').innerText()).slice(-600));
   await btn.first().click();await p.waitForTimeout(400);
   if(n===4){
    const back=p.getByRole('button',{name:'Назад',exact:true});
    if(await back.count()){await back.click();await p.waitForTimeout(300);await p.getByRole('button',{name:'Продолжить',exact:true}).click();}
   }
 }
 await p.waitForTimeout(2000);
 assert.equal(await p.locator('.cyclone-onboarding').count(),0);pass('native complete onboarding and back');
 const close=p.getByRole('button',{name:'Закрыть',exact:true});if(await close.count())await close.first().click();
 await shot('calendar');
 await p.getByRole('button',{name:'Настройки',exact:true}).click();await shot('settings');
 await p.getByRole('button',{name:/Управление данными/}).click();await shot('backups');
 sh('shell','input','keyevent','4');await p.waitForTimeout(500);
 assert.ok(await p.getByRole('button',{name:/Управление циклом/}).count());pass('Android back returns from backup settings');
 await p.getByRole('button',{name:'Календарь',exact:true}).click();
 await p.locator('.calendar-day-cell[aria-current=date]').click();
 await p.getByRole('tab',{name:'Тело',exact:true}).click();
 const slider=p.getByRole('slider',{name:'Боль',exact:true});
 await slider.focus();await slider.press('Home');await p.waitForTimeout(1800);
 await slider.press('End');await p.waitForTimeout(1800);
 await shot('pain');
 sh('shell','input','keyevent','3');await p.waitForTimeout(500);
 sh('shell','am','start','-n','com.cyclone.mooneva.debug/com.mooneva.app.MainActivity');await p.waitForTimeout(700);
 assert.equal(await slider.getAttribute('aria-valuenow'),'10');pass('WebView pain zero/max and return from background');
 await p.reload();await p.waitForTimeout(1800);
 await p.locator('.calendar-day-cell[aria-current=date]').click();const edit=p.getByRole('button',{name:/Нажмите, чтобы изменить/});if(await edit.count())await edit.click();await p.getByRole('tab',{name:'Тело',exact:true}).click();
 assert.equal(await p.getByRole('slider',{name:'Боль',exact:true}).getAttribute('aria-valuenow'),'10');pass('native pain survives reload');
 await p.getByRole('button',{name:'Аналитика',exact:true}).click();
 await p.locator('.cyclone-pain-chart').scrollIntoViewIfNeeded();await shot('analytics');
 assert.match(await p.locator('.cyclone-pain-chart').innerText(),/10 \/ 10/);pass('native pain analytics');
 const permission=await p.evaluate(()=>window.Capacitor.Plugins.LocalNotifications.checkPermissions());
 fs.writeFileSync(path.join(out,'android-permission.json'),JSON.stringify(permission));
 const prefs=sh('shell','run-as','com.cyclone.mooneva.debug','cat','shared_prefs/mooneva_widget_prefs.xml');
 assert.match(prefs,/snapshots/);assert.match(prefs,/lavender/);fs.writeFileSync(path.join(out,'android-widget-sync.xml'),prefs);pass('native widget data and palette sync');
 assert.deepEqual(errors,[]);pass('no WebView JavaScript exceptions');
}catch(e){results.push({name:e.message,status:'FAIL'});throw e;}finally{
 fs.writeFileSync(path.join(out,'android-results.json'),JSON.stringify({at:new Date().toISOString(),results,errors},null,2));
 await browser.close();
}

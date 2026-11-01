/* Isolated browser contexts and synthetic data only. Start pnpm dev --port 5174 first. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out = process.env.QA_OUTPUT || 'verification/update-2026-11-01';
const url = process.env.QA_URL || 'http://127.0.0.1:5174';
fs.mkdirSync(out, { recursive: true });
const results = [], errors = [];
const record = (name, details) => { results.push({ name, status: 'PASS', details }); console.log('PASS', name); };
const save = () => fs.writeFileSync(path.join(out, 'web-results.json'), JSON.stringify({ at: new Date().toISOString(), results, errors }, null, 2));

async function fixture(page) {
    await page.goto(url);
    await page.waitForTimeout(1800);
    await page.evaluate(async () => {
        localStorage.setItem('i18nextLng', 'ru');
        localStorage.setItem('cyclone.appearance.v1', JSON.stringify({ palette: 'lavender', mode: 'dark' }));
        const s = await import('/services/logic/storage.ts');
        const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
        await s.saveSettings({ ...s.DEFAULT_SETTINGS, onboardingCompleted: true, adaptivePrediction: true, userName: 'Synthetic QA' });
        await s.savePeriods([-94,-66,-36,-4].map((n,i) => ({ id: 'synthetic-'+i, startDate: day(n), days: 5, activeDays: [0,1,2,3,4] })));
        await s.saveData(Object.fromEntries([-93,-65,-35,-3].map((n,i) => [day(n), { date: day(n), flow: 'medium', symptoms: ['Cramps'], mood: ['happy'], pain: [10,0,4,8][i], notes: 'Synthetic QA note' }])));
    });
    await page.reload();
    await page.waitForTimeout(1300);
    const close = page.getByRole('button', { name: 'Закрыть', exact: true });
    if (await close.count()) await close.first().click();
}
async function screenshot(page, name) { await page.screenshot({ path: path.join(out, name+'.png') }); }
async function appearance(page, palette, mode) {
    await page.evaluate(({ palette, mode }) => {
        localStorage.setItem('cyclone.appearance.v1', JSON.stringify({ palette, mode }));
        dispatchEvent(new Event('cyclone-appearance'));
    }, { palette, mode });
    await page.waitForTimeout(220);
}
async function noOverflow(page, name) {
    const bad = await page.evaluate(() => [...document.querySelectorAll('.cyclone-card,.cyclone-setting-card,.cyclone-data-card,.daily-log-panel,.cyclone-day-tips,.cyclone-button,.cyclone-toggle')]
        .filter(e => e.getClientRects().length && (e.getBoundingClientRect().left < -1 || e.getBoundingClientRect().right > innerWidth+1))
        .map(e => ({ tag: e.tagName, class: e.className, text: e.textContent.slice(0,60) })));
    assert.deepEqual(bad, [], name+' overflows');
}
async function contrast(page) {
    return page.evaluate(() => {
        const css = getComputedStyle(document.body);
        const rgb = hex => { const s = hex.trim().slice(1); return [0,2,4].map(n => parseInt(s.slice(n,n+2),16)/255).map(c => c<=.04045?c/12.92:((c+.055)/1.055)**2.4); };
        const lum = color => { const [r,g,b] = rgb(color); return .2126*r+.7152*g+.0722*b; };
        const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
        const val = key => css.getPropertyValue(key).trim();
        return { text: ratio(val('--text-primary'),val('--surface')), secondary: ratio(val('--text-secondary'),val('--surface')), selected: ratio(val('--cyclone-primary'),val('--cyclone-on-primary')), font: css.fontFamily, loaded: document.fonts.check('16px "Cyclone Roboto"') };
    });
}

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.QA_BROWSER || 'chrome' });
    try {
        const context = await browser.newContext({ viewport: { width: 360, height: 915 }, acceptDownloads: true });
        const page = await context.newPage();
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', msg => { if (msg.type()==='error') errors.push(msg.text()); });
        await page.addInitScript(() => localStorage.setItem('i18nextLng', 'ru'));
        await page.goto(url); await page.waitForTimeout(1600);
        assert.match(await page.locator('body').innerText(), /Выбери язык/);
        assert.equal(await page.locator('.cyclone-language-choices button').count(), 2);
        await screenshot(page, 'onboarding-360');
        await page.getByRole('button',{name:'English',exact:true}).click();
        assert.match(await page.locator('body').innerText(), /Choose your language/);
        await page.getByRole('button',{name:'Русский',exact:true}).click();
        for (let i=0;i<4 && !await page.locator('.cyclone-goal-choice').count();i++) {
            await page.getByRole('button',{name:/^(Продолжить|Далее|Начать отслеживание)$/}).first().click();
            await page.waitForTimeout(250);
        }
        const selected = page.locator('.cyclone-goal-choice[aria-pressed=true]');
        assert.equal(await selected.evaluate(e => getComputedStyle(e).borderWidth), '2px');
        await screenshot(page, 'onboarding-goal-360');
        record('first launch, two languages, selected goal');
        await context.close();

        const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true });
        const p = await ctx.newPage();
        p.on('pageerror', e => errors.push(e.message));
        p.on('console', msg => { if (msg.type()==='error') errors.push(msg.text()); });
        await fixture(p);
        for (const width of [360,412,1280]) {
            await p.setViewportSize({ width, height: 915 });
            for (const mode of ['light','dark']) for (const palette of ['rose','lavender','sage','ocean','amber']) {
                await appearance(p,palette,mode);
                await p.evaluate(() => document.fonts.ready);
                const colors = await contrast(p);
                assert.ok(colors.text>=4.5 && colors.secondary>=4.5 && colors.selected>=4.5, JSON.stringify({palette,mode,colors}));
                assert.ok(colors.loaded, 'Roboto not loaded');
                await noOverflow(p, `${width}/${palette}/${mode}`);
                if (width===412 || palette==='lavender' && mode==='dark') await screenshot(p,`calendar-${width}-${palette}-${mode}`);
                record(`palette ${width}/${palette}/${mode}`,colors);
            }
        }
        await p.setViewportSize({ width:360,height:915 });
        await appearance(p,'lavender','dark');
        await p.getByRole('button',{name:'Настройки',exact:true}).click();
        await screenshot(p,'settings-360-dark');
        await p.getByRole('button',{name:/Управление циклом/}).click();
        await noOverflow(p,'cycle settings');
        const switches=await p.locator('.cyclone-toggle').evaluateAll(els=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
        assert.ok(switches.length>0 && switches.every(e=>e.w>=44 && e.h>=44));
        await screenshot(p,'cycle-settings-360');
        await p.getByRole('button',{name:'Назад',exact:true}).click();
        await p.getByRole('button',{name:/Управление данными/}).click();
        for (const width of [360,412,1280]) {
            await p.setViewportSize({width,height:915});
            await noOverflow(p,'backups '+width);
            await screenshot(p,'backups-'+width);
        }
        await p.setViewportSize({width:412,height:915});
        const protect=p.getByRole('switch',{name:'Защитить паролем',exact:true});
        if (await protect.getAttribute('aria-checked')==='true') await protect.click();
        const downloadEvent=p.waitForEvent('download');
        await p.getByRole('button',{name:'Экспорт',exact:true}).click();
        const download=await downloadEvent;
        await download.saveAs(path.join(out,'synthetic-backup.json'));
        const payload=JSON.parse(fs.readFileSync(path.join(out,'synthetic-backup.json'),'utf8'));
        assert.equal(Object.keys(payload.data).length,4);
        record('backup UI export and file-input refs', { entries:Object.keys(payload.data).length });
        let alertText='';
        p.on('dialog',async d=>{alertText=d.message();await d.accept();});
        await p.locator('input[type=file]').first().setInputFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
        await p.waitForTimeout(500);
        assert.ok(alertText.length>0,'corrupt backup needs an error');
        await p.locator('input[type=file]').first().setInputFiles(path.join(out,'synthetic-backup.json'));
        await p.waitForTimeout(2000);
        const restored=await p.evaluate(async()=>{const s=await import('/services/logic/storage.ts');return {logs:await s.loadData(),periods:await s.loadPeriods()};});
        assert.equal(Object.keys(restored.logs).length,4); assert.equal(restored.periods.length,4);
        record('corrupt backup rejected; JSON roundtrip retains entries and periods');

        await p.getByRole('button',{name:'Календарь',exact:true}).click();
        const close=p.getByRole('button',{name:'Закрыть',exact:true});if(await close.count())await close.first().click();
        await p.locator('.calendar-day-cell[aria-current=date]').click();
        await p.getByRole('tab',{name:'Тело',exact:true}).click();
        const slider=p.getByRole('slider',{name:'Боль',exact:true});
        await slider.focus(); await slider.press('Home'); await p.waitForTimeout(1800);
        await slider.press('End'); await p.waitForTimeout(1800);
        for(let i=0;i<4;i++)await slider.press('ArrowLeft');await p.waitForTimeout(1800);
        await slider.scrollIntoViewIfNeeded();await screenshot(p,'diary-pain-412');
        await p.reload();await p.waitForTimeout(1500);
        const saved=await p.evaluate(async()=>{const s=await import('/services/logic/storage.ts');return Object.values(await s.loadData()).find(l=>l.pain===6);});
        assert.ok(saved,'pain not retained after reload');
        await p.getByRole('button',{name:'Аналитика',exact:true}).click();
        const chart=p.locator('.cyclone-pain-chart');await chart.scrollIntoViewIfNeeded();
        assert.match(await chart.innerText(),/4,5 \/ 10/);
        await chart.getByRole('button',{name:/Следующая отметка боли/}).click();
        assert.match(await chart.locator('.cyclone-pain-selected').innerText(),/4\/10/);
        await p.locator('.cyclone-range-button').first().click();
        assert.match(await chart.innerText(),/7 \/ 10/);
        await chart.scrollIntoViewIfNeeded();await screenshot(p,'analytics-pain-412');
        record('pain keyboard, restart, date range averages and interactive points');

        for (const view of ['Настройки','Аналитика']) {
            await p.getByRole('button',{name:view,exact:true}).click();
            for(const mode of ['light','dark'])for(const palette of ['rose','lavender','sage','ocean','amber']){
                await appearance(p,palette,mode);await noOverflow(p,view+'/'+palette+'/'+mode);
                await screenshot(p,(view==='Настройки'?'settings':'analytics')+'-412-'+palette+'-'+mode);
            }
            record(view+' all ten theme variants');
        }
        const encrypted=await p.evaluate(async()=>{
            const s=await import('/services/logic/storage.ts');
            const payload={data:await s.loadData(),periods:await s.loadPeriods(),settings:await s.loadSettings(),timestamp:new Date().toISOString()};
            const {blob}=await s.generateBackup(payload,'Synthetic test password');
            const file=new File([blob],'synthetic.enc');
            const restored=await s.restoreBackup(file,'Synthetic test password');
            let rejected=false;try{await s.restoreBackup(file,'wrong password')}catch{rejected=true}
            return {count:Object.keys(restored.data).length,rejected};
        });
        assert.ok(encrypted.rejected && encrypted.count>=4);record('encrypted backup roundtrip and wrong password rejection');
        await p.setViewportSize({width:360,height:915});
        await p.evaluate(()=>document.documentElement.style.fontSize='200%');
        await noOverflow(p,'200% font analytics'); await screenshot(p,'analytics-font-200');
        await p.getByRole('button',{name:'Настройки',exact:true}).click();
        await noOverflow(p,'200% font settings'); await screenshot(p,'settings-font-200');
        await p.evaluate(()=>document.documentElement.style.fontSize='');
        await p.emulateMedia({colorScheme:'dark'});await appearance(p,'sage','auto');
        assert.equal(await p.locator('body').getAttribute('data-theme'),'dark-neumorphism');
        await p.emulateMedia({colorScheme:'light'});await p.waitForTimeout(350);
        assert.equal(await p.locator('body').getAttribute('data-theme'),null);
        record('auto appearance follows device preference');
        await p.route('https://**',route=>route.abort());
        await p.getByRole('button',{name:'Календарь',exact:true}).click();
        assert.ok(await p.locator('.calendar-day-cell').count()>20);
        record('local-only operation with external network blocked');
        assert.deepEqual(errors,[],'Browser errors');
        await ctx.close();
    } finally { save(); await browser.close(); }
})().catch(e=>{results.push({name:e.message,status:'FAIL'});save();console.error(e);process.exitCode=1;});

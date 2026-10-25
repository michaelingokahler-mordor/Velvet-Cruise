// Actual production renderer and Input, with disposable browser storage and virtual gamepads.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:4186/';
const out = path.resolve('output/menu-completion/browser');
fs.mkdirSync(out, { recursive: true });
const tests = [], errors = [], badResponses = [];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  async function open(mobile = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, hasTouch: mobile, isMobile: mobile, locale: 'en-US' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) badResponses.push(r.url()); });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === new URL(base).origin || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
    });
    await page.addInitScript(() => {
      window.__pads = [];
      Object.defineProperty(navigator, 'getGamepads', { value: () => window.__pads });
      localStorage.setItem('menu-qa-unrelated', 'unchanged');
      // Production source remains untouched; the scene is located through CDP below.
    });
    await page.goto(base + '#autopilot&radiotest', { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.__trackBench === 'function');
    const cdp = await context.newCDPSession(page);
    const proto = await cdp.send('Runtime.evaluate', { expression: 'Phaser.Scene.prototype' });
    const objects = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
    await cdp.send('Runtime.callFunctionOn', { objectId: objects.objects.objectId, functionDeclaration: 'function(){window.__menuQA=this.find(s=>s.input2&&s.demo)}' });
    await page.waitForFunction(() => window.__menuQA?.mode === 'title');
    return { context, page };
  }
  const { context, page } = await open();
  const state = () => page.evaluate(() => ({ mode: __menuQA.mode, selected: __menuQA.menuSel, paused: __menuQA.paused, race: !!__menuQA.race }));
  const mode = async (expected, selected) => { const s = await state(); assert.equal(s.mode, expected); if (selected !== undefined) assert.equal(s.selected, selected); };
  const press = async key => { await page.keyboard.press(key); await page.waitForTimeout(100); };
  const shot = name => page.locator('#game canvas').screenshot({ path: path.join(out, name + '.png') });
  try {
    assert.deepEqual(await page.evaluate(() => __menuQA.mainMenuItems().map(i => i.id)), ['drive', 'settings', 'map', 'records']);
    await shot('title');
    await press('ArrowDown'); await press('Enter'); await mode('settings'); await shot('settings');
    for (const [index, child] of [[0, 'garage'], [1, 'controls'], [2, 'bindings'], [3, 'radio'], [4, 'credits']]) {
      await page.evaluate(i => { __menuQA.menuSel = i; }, index);
      await press('Enter'); await mode(child); await shot(child);
      await press('Escape'); await mode('settings', index);
    }
    tests.push('all five settings children return to their selected parent');
    await page.evaluate(() => { __menuQA.menuSel = 2; }); await press('Enter');
    // Signal row, then replace; capture must not bind its activation key.
    await page.evaluate(() => { __menuQA.bindingFocus = 6; }); await press('Enter');
    assert.equal(await page.evaluate(() => __menuQA.input2.capture?.status), 'listening');
    await press('KeyW');
    assert.equal(await page.evaluate(() => __menuQA.input2.bindings.get('keyboard','signal')[0].code), 'KeyH');
    await shot('binding-conflict');
    await press('KeyQ'); await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => __menuQA.input2.bindings.get('keyboard','signal')[0].code), 'KeyQ');
    await press('Escape'); await mode('settings', 2);
    tests.push('keyboard capture rejects conflict, retries, saves without navigation leakage');
    await page.evaluate(() => { __menuQA.menuSel = 3; }); await press('Enter'); await press('ArrowDown');
    const station = await page.evaluate(() => __menuQA.station);
    assert.equal(station, 1); await press('Escape');
    assert.equal(await page.evaluate(() => Boolean(__menuQA.audio.currentSong)), false);
    await press('Escape'); await mode('title', 1);
    await press('ArrowDown'); await press('Enter'); await mode('map'); await press('Escape'); await mode('title', 2);
    await press('ArrowDown'); await press('Enter'); await mode('records'); await shot('records');
    await press('Enter'); await mode('rankings'); await press('Escape'); await mode('records', 0);
    await press('ArrowDown'); await press('Enter'); await mode('badges'); await press('Escape'); await mode('records', 1);
    await press('Escape'); await mode('title', 3);
    tests.push('Course Map, rankings and badges retain correct parents');
    await press('ArrowDown'); await press('Enter'); await mode('difficulty'); await press('Enter'); await mode('race');
    assert.equal(await page.evaluate(() => __menuQA.station), station);
    await page.evaluate(() => { window.__firstRace = __menuQA.race; __menuQA.input2.bindings.set('keyboard','pause',0,{kind:'key',code:'Enter'}); });
    await press('Enter'); assert.equal((await state()).paused, true);
    await shot('pause'); await press('Enter'); assert.equal((await state()).paused, false);
    await press('Escape'); await press('ArrowDown'); await press('Enter'); await mode('title');
    await press('Enter'); await press('Enter'); await mode('race');
    assert.equal(await page.evaluate(() => __menuQA.race !== window.__firstRace), true);
    tests.push('direct start remembers music; custom Enter pauses once; restart creates a fresh race');
    await page.evaluate(() => { __menuQA.input2.bindings.set('gamepad','signal',0,{kind:'axis',index:2,direction:-1,neutral:0}); window.__pads=[{id:'QA pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}]; });
    await page.waitForTimeout(100);
    await page.evaluate(() => { __pads[0].buttons[1] = { pressed: true, value: 1 }; }); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => __menuQA.paused), false, 'Gamepad B brakes during the race');
    assert.equal(await page.evaluate(() => __menuQA.input2.brake), 1);
    await page.evaluate(() => { __pads[0].buttons[1] = { pressed: false, value: 0 }; });
    await page.evaluate(() => { __pads[0].axes[2] = -.7; }); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => __menuQA.input2.bindings.gamepad('signal',__pads[0])), .7);
    await page.evaluate(() => { __pads=[]; }); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => __menuQA.input2.gamepadName), '');
    assert.equal(await page.evaluate(() => localStorage.getItem('menu-qa-unrelated')), 'unchanged');
    const saved = await page.evaluate(() => localStorage.getItem('sunset-coast-run.bindings.v1'));
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => typeof window.__trackBench === 'function');
    assert.equal(await page.evaluate(() => localStorage.getItem('sunset-coast-run.bindings.v1')), saved);
    tests.push('virtual axis mapping, disconnect, stored bindings and unrelated saves survive');
    await context.close();
    const mobile = await open(true), p = mobile.page;
    async function tap(x, y) { const b = await p.locator('#game canvas').boundingBox(); await p.touchscreen.tap(b.x + x / 320 * b.width, b.y + y / 180 * b.height); await p.waitForTimeout(160); }
    await tap(160, 94); await p.waitForFunction(() => __menuQA.mode === 'settings');
    await tap(160, 92); await p.waitForFunction(() => __menuQA.mode === 'bindings');
    await tap(55, 134); await p.waitForFunction(() => !!__menuQA.input2.capture);
    await tap(160, 124); await p.waitForFunction(() => !__menuQA.input2.capture);
    await tap(150, 129); await p.waitForFunction(() => !!__menuQA.input2.capture);
    await tap(160, 124); await p.waitForFunction(() => !__menuQA.input2.capture);
    await tap(230, 151); await p.waitForFunction(() => __menuQA.mode === 'settings' && __menuQA.menuSel === 2);
    await p.locator('#game canvas').screenshot({ path: path.join(out, 'mobile-settings.png') });
    tests.push('mobile taps open bindings, cancel capture and return to Settings');
    await mobile.context.close();
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify({ status: 'PASS', tests, errors, badResponses }, null, 2));
    console.log(JSON.stringify({ status: 'PASS', tests }, null, 2));
  } catch (e) {
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
    fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify({ status: 'FAIL', tests, error: e.stack, errors, badResponses }, null, 2));
    throw e;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

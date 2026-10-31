// Real game, disposable storage, no production API traffic. NODE_PATH may locate cached Playwright.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:4193/';
const out = path.resolve('output/playwright/mobile');
fs.mkdirSync(out, {recursive:true});
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const report = {measurements:[], tests:[], errors:[]};
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
    window.__permission='granted';window.__permissionGestures=[];
    Object.defineProperty(window,'DeviceOrientationEvent',{configurable:true,value:{requestPermission(){window.__permissionGestures.push(navigator.userActivation.isActive);return Promise.resolve(window.__permission);}}});
    Object.defineProperty(screen.orientation,'angle',{configurable:true,get:()=>window.__angle??90});
  });
  const page = await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin ? r.continue() : r.abort());
  await page.goto(base+'#graphicstest&radiotest',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>typeof __graphicsInfo==='function',null,{timeout:90000});
  // Locate the real scene through CDP without adding production-only test accessors.
  const cdp=await context.newCDPSession(page);
  async function attachScene() {
    const proto=await cdp.send('Runtime.evaluate',{expression:'Phaser.Scene.prototype'});
    const objects=await cdp.send('Runtime.queryObjects',{prototypeObjectId:proto.result.objectId});
    await cdp.send('Runtime.callFunctionOn',{objectId:objects.objects.objectId,functionDeclaration:'function(){window.__mobileQA=this.find(s=>s.input2&&s.demo)}'});
  }
  await attachScene();
  async function measure(name) {
    await page.waitForTimeout(650);
    const m=await page.evaluate(()=>{
      const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),p=document.querySelector('#game').getBoundingClientRect(),v=visualViewport;
      return {screen:[innerWidth,innerHeight],visible:[v.offsetLeft,v.offsetTop,v.width,v.height],parent:[p.x,p.y,p.width,p.height],canvas:[r.x,r.y,r.width,r.height],native:[c.width,c.height]};
    });
    report.measurements.push({name,...m});return m;
  }
  function fits(m) {
    const [x,y,w,h]=m.canvas,[vx,vy,vw,vh]=m.visible;
    assert.ok(x>=vx-1&&y>=vy-1&&x+w<=vx+vw+1&&y+h<=vy+vh+1,JSON.stringify(m));
    assert.ok(Math.abs(w/h-16/9)<.015);
    assert.ok(Math.abs(w-Math.min(vw,vh*16/9))<2,'must use available space immediately');
    assert.ok(Math.abs((x+w/2)-(vx+vw/2))<2,'horizontal centering');
    assert.ok(Math.abs((y+h/2)-(vy+vh/2))<2,'vertical centering');
  }
  try {
    fits(await measure('portrait'));
    await page.setViewportSize({width:844,height:390});fits(await measure('landscape'));
    await page.evaluate(async()=>{await __mobileQA.selectGraphics('plus');});fits(await measure('after-plus'));
    // Model the mobile visual viewport shrinking independently of the layout viewport.
    await page.evaluate(()=>{
      const v=visualViewport;window.__vv=v;
      window.__visual={width:844,height:300,offsetLeft:0,offsetTop:12};
      Object.defineProperty(window,'visualViewport',{configurable:true,value:Object.assign(new EventTarget(),window.__visual)});
      visualViewport.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('resize'));
    });
    fits(await measure('visual-viewport-smaller-than-layout'));
    report.tests.push('canvas fits independently changing visible viewport');
    await page.evaluate(()=>{window.__safeProbe=[...document.body.children].find(e=>e.style.visibility==='hidden');__safeProbe.style.padding='12px 18px 10px 14px';window.dispatchEvent(new Event('pageshow'));});
    const safe=await measure('safe-insets-and-page-return');
    assert.deepEqual(safe.parent,[14,24,812,278]);
    assert.ok(safe.canvas[0]>=14&&safe.canvas[1]>=24&&safe.canvas[0]+safe.canvas[2]<=826&&safe.canvas[1]+safe.canvas[3]<=303);
    await page.evaluate(()=>{__safeProbe.style.padding='';window.dispatchEvent(new Event('pageshow'));});
    fits(await measure('safe-insets-cleared'));
    report.tests.push('safe-area insets and pageshow refresh preserve complete canvas bounds');
    await page.evaluate(()=>__mobileQA.toControls());
    async function tap(x,y) { const r=await page.locator('canvas').boundingBox();await page.touchscreen.tap(r.x+x*r.width/320,r.y+y*r.height/180);await page.waitForTimeout(100); }
    await tap(160,140);
    assert.equal(await page.evaluate(()=>__mobileQA.mode),'mobile');
    report.tests.push('mobile settings reachable from device selection');
    await page.screenshot({path:path.join(out,'mobile-settings.png')});
    // Real touch activation must call the permission API inside the browser gesture.
    await tap(160,39);assert.equal(await page.evaluate(()=>__mobileQA.input2.mobile.scheme),'tilt-pedals');
    await tap(160,39);assert.equal(await page.evaluate(()=>__mobileQA.input2.mobile.scheme),'tilt-full');
    await tap(160,141);
    assert.deepEqual(await page.evaluate(()=>__permissionGestures),[true]);
    const sample=async(beta,gamma)=>page.evaluate(({beta,gamma})=>{const e=new Event('deviceorientation');Object.assign(e,{beta,gamma});window.dispatchEvent(e);},{beta,gamma});
    await sample(0,-45);await tap(160,141);
    assert.equal(await page.evaluate(()=>__mobileQA.input2.motionStatus),'ready');
    assert.equal(await page.evaluate(()=>__mobileQA.input2.tiltMode),true);
    await page.screenshot({path:path.join(out,'full-tilt-settings.png')});
    await page.evaluate(()=>{__mobileQA.input2.setPref('touch');__mobileQA.startRace();});
    // Send a stream, as real sensors do, rather than only isolated samples.
    await page.evaluate(()=>{window.__reading=[24,-21];window.__samples=setInterval(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:__reading[0],gamma:__reading[1]});window.dispatchEvent(e);},16);});
    await page.waitForTimeout(400);
    let drive=await page.evaluate(()=>({steer:__mobileQA.input2.steer,gas:__mobileQA.input2.throttle,brake:__mobileQA.input2.brake,paused:__mobileQA.paused}));
    assert.ok(drive.steer>.98&&drive.gas>.98&&drive.brake===0&&!drive.paused,JSON.stringify(drive));
    await page.screenshot({path:path.join(out,'full-tilt-race.png')});
    report.tests.push('full tilt permission is gesture-bound; calibrated steering and gas drive the real race');
    await page.evaluate(()=>{__angle=270;window.dispatchEvent(new Event('orientationchange'));__reading=[0,45];});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>__mobileQA.paused),true);
    const timer=await page.evaluate(()=>__mobileQA.race.countdown);
    await tap(160,87); // Resume must lead to calibration, not an uncalibrated race.
    assert.equal(await page.evaluate(()=>__mobileQA.mobileMenuOpen),true);
    assert.equal(await page.evaluate(()=>__mobileQA.race.countdown),timer);
    await tap(160,141);await tap(160,164);await tap(160,87);
    assert.equal(await page.evaluate(()=>__mobileQA.paused),false);
    await page.evaluate(()=>{clearInterval(__samples);});
    await page.waitForTimeout(1150);
    assert.equal(await page.evaluate(()=>__mobileQA.paused),true);
    assert.equal(await page.evaluate(()=>__mobileQA.input2.motionStatus),'unavailable');
    assert.equal(await page.evaluate(()=>__mobileQA.input2.throttle),0);
    report.tests.push('rotation pauses until recalibration; sensor timeout pauses and clears throttle');
    await tap(160,128); // pause -> mobile settings
    assert.equal(await page.evaluate(()=>__mobileQA.mobileMenuOpen),true);
    await tap(160,39); // full tilt -> buttons
    await tap(160,59);await tap(160,79); // size .8 and opacity .4
    await page.screenshot({path:path.join(out,'pause-mobile-settings.png')});
    await tap(160,164);await tap(160,87);
    assert.equal(await page.evaluate(()=>__mobileQA.paused),false);
    const r=await page.locator('canvas').boundingBox();
    const points=[{x:r.x+7*r.width/320,y:r.y+130*r.height/180},{x:r.x+270*r.width/320,y:r.y+130*r.height/180}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
    drive=await page.evaluate(()=>({steer:__mobileQA.input2.steer,gas:__mobileQA.input2.throttle}));
    assert.equal(drive.steer,-1);assert.equal(drive.gas,1);
    await page.screenshot({path:path.join(out,'buttons-race.png')});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.evaluate(()=>__mobileQA.input2.throttle),0);
    report.tests.push('pause settings preserve the run; small button visuals retain full multitouch hit areas');
    await page.evaluate(()=>{__mobileQA.input2.setMobile({scheme:'tilt-pedals'});__mobileQA.paused=true;__mobileQA.openMobile('pause');});
    await sample(0,45);await tap(160,141);await tap(160,164);await tap(160,87);
    await page.evaluate(()=>{__reading=[0,45];__samples=setInterval(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:__reading[0],gamma:__reading[1]});window.dispatchEvent(e);},16);});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+250*r.width/320,y:r.y+120*r.height/180}]});
    assert.equal(await page.evaluate(()=>__mobileQA.input2.throttle),1);
    await page.screenshot({path:path.join(out,'tilt-pedals-race.png')});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>__mobileQA.paused),true);
    report.tests.push('tilt pedals work and background interruption pauses the live run');
    await page.evaluate(()=>{clearInterval(__samples);Object.defineProperty(window,'visualViewport',{configurable:true,value:__vv});window.dispatchEvent(new Event('resize'));});
    for (const size of [{width:667,height:375},{width:852,height:393},{width:932,height:430},{width:390,height:844}]) {
      await page.setViewportSize(size);
      for(const mode of ['classic','plus']) {
        await page.evaluate(async mode=>{__mobileQA.mode='title';await __mobileQA.selectGraphics(mode);},mode);
        const m=await measure(`${mode}-${size.width}x${size.height}`);fits(m);assert.equal(m.native[0],mode==='classic'?320:640);
      }
    }
    report.tests.push('Classic and Plus fit four additional phone viewports');
    const saved=await page.evaluate(()=>localStorage.getItem('sunset-coast-run.mobile-controls.v1'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof __graphicsInfo==='function');
    assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.mobile-controls.v1')),saved);
    assert.deepEqual(await page.evaluate(()=>__permissionGestures),[],'reload must not prompt automatically');
    await attachScene();
    assert.equal(await page.evaluate(()=>__mobileQA.input2.tiltMode),false,'calibration is session-only');
    report.tests.push('mobile preferences survive reload without an automatic sensor prompt');
    await page.evaluate(()=>{__permission='denied';__mobileQA.openMobile('controls');});
    await tap(160,141);
    assert.equal(await page.evaluate(()=>__mobileQA.input2.motionStatus),'denied');
    assert.equal(await page.evaluate(()=>__mobileQA.input2.activeMobileScheme),'buttons');
    await page.evaluate(()=>{__permission='granted';});await tap(160,141);
    await sample(0,-45);await tap(160,141);
    assert.equal(await page.evaluate(()=>__mobileQA.input2.tiltMode),true);
    report.tests.push('denied permission falls back to buttons and can be retried through a new gesture');
    assert.deepEqual(report.errors,[]);
  } catch(e) {report.failure=e.stack;process.exitCode=1;}
  finally {fs.writeFileSync(path.join(out,process.argv.includes('--red')?'viewport-red.json':'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})();

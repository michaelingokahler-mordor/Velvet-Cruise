// WebKit on Windows is engine coverage, not physical iOS acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webkit}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:4193/',out=path.resolve('output/playwright/mobile');
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await webkit.launch({headless:true});
  const report={engine:'Playwright WebKit on Windows; not iOS',tests:[],measurements:[],errors:[]};
  try {
    for(const mode of ['classic','plus']) {
      const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
      await context.addInitScript(()=>{
        window.__permission='denied';window.__motionRequests=[];
        Object.defineProperty(window,'DeviceOrientationEvent',{configurable:true,value:{requestPermission(){__motionRequests.push(navigator.userActivation.isActive);return Promise.resolve(__permission);}}});
      });
      await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
      const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
      await page.goto(base+'#graphicstest'+(mode==='plus'?'&graphics=plus':''),{waitUntil:'load',timeout:60000});
      await page.waitForFunction(()=>typeof __graphicsInfo==='function');
      await page.waitForFunction(mode=>__graphicsInfo().mode===mode,mode);
      for(const size of [{width:390,height:844},{width:844,height:390},{width:667,height:375},{width:932,height:430}]) {
        await page.setViewportSize(size);await page.waitForTimeout(800);
        const m=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),v=visualViewport;return {canvas:[r.x,r.y,r.width,r.height],visible:[v.offsetLeft,v.offsetTop,v.width,v.height],native:[c.width,c.height]};});
        const[x,y,w,h]=m.canvas,[vx,vy,vw,vh]=m.visible;
        assert.ok(x>=vx-1&&y>=vy-1&&x+w<=vx+vw+1&&y+h<=vy+vh+1,JSON.stringify(m));
        assert.ok(Math.abs(w-Math.min(vw,vh*16/9))<2);
        assert.ok(Math.abs(x+w/2-vx-vw/2)<2&&Math.abs(y+h/2-vy-vh/2)<2);
        assert.equal(m.native[0],mode==='plus'?640:320);
        report.measurements.push({mode,size,...m});
      }
      // Navigate actual canvas menus with touch; no scene hooks or Chromium-only inspection.
      async function tap(x,y){const r=await page.locator('canvas').boundingBox();await page.touchscreen.tap(r.x+x*r.width/320,r.y+y*r.height/180);await page.waitForTimeout(120);}
      // Fixed keyboard navigation opens Settings, Controls; touch then enters Mobile controls.
      for(const key of ['ArrowDown','Enter','ArrowDown','Enter']) {await page.keyboard.press(key);await page.waitForTimeout(150);}
      await tap(160,140);await tap(160,39);await tap(160,141);
      assert.deepEqual(await page.evaluate(()=>__motionRequests),[true]);
      await page.screenshot({path:path.join(out,`webkit-${mode}-permission-denied.png`)});
      const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('sunset-coast-run.mobile-controls.v1')));
      assert.equal(prefs.scheme,'tilt-pedals');
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>typeof __graphicsInfo==='function');
      assert.deepEqual(await page.evaluate(()=>__motionRequests),[]);
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('sunset-coast-run.mobile-controls.v1'))),prefs);
      report.tests.push(`${mode}: four viewport transitions, touch settings, denied gesture-bound permission, saved preference and no reload prompt`);
      await context.close();
    }
    assert.deepEqual(report.errors,[]);
  } catch(e) {report.failure=e.stack;process.exitCode=1;}
  finally {fs.writeFileSync(path.join(out,'webkit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
})();

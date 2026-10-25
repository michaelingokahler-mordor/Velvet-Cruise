const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.argv[2]||'http://127.0.0.1:4191/')+'regen-v2.html',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__graphicsInfo?.().mode==='plus'&&!window.__graphicsInfo().busy,null,{timeout:15000});
  await page.keyboard.press('Enter');await page.waitForTimeout(150);await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.__graphicsInfo?.().screen==='race'&&window.__race?.stage===1&&window.__race.rain>.9&&document.getElementById('rain-version').textContent.includes('Stage 2'),null,{timeout:12000});
  const state=await page.evaluate(()=>({graphics:window.__graphicsInfo(),race:window.__race,label:document.getElementById('rain-version').textContent}));
  assert.equal(state.graphics.mode,'plus');assert.equal(state.graphics.width,640);assert.equal(state.race.roof,7);assert.match(state.label,/Stage 2/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.goal-progress.v1')),null);
  assert.deepEqual(errors,[]);fs.writeFileSync('output/plus/rain-profile/rain-entry.json',JSON.stringify({status:'PASS',state,errors,scope:'Desktop browser verifies entry URL and flags; not physical iPhone performance.'},null,2));
  await page.screenshot({path:'output/plus/rain-profile/rain-entry.png'});
  console.log('PASS simple rain URL: Drive starts real Thunder Highway rain, closed roof, native Plus 640x360 and isolated progress');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

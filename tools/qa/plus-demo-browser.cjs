const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[],loads=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/assets/plus/'))loads.push(r.url());});
  await page.addInitScript(()=>localStorage.setItem('sunset-coast-run.goal-progress.v1',JSON.stringify({version:1,masks:{easy:31,normal:31,hard:31},plusUnlocked:true})));
  await page.goto((process.argv[2]||'http://127.0.0.1:4192/')+'#graphicstest&graphics=plus',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__graphicsInfo?.().error==='locked',{timeout:15000});
  const info=await page.evaluate(()=>window.__graphicsInfo());assert.equal(info.mode,'classic');assert.equal(info.drawingWidth,320);
  assert.ok(loads.every(url=>url.endsWith('/manifest.json')),'Locked demo must never download Plus atlas pages');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.demo-a.graphics-mode.v1')),null);
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.goal-progress.v1'))).masks.normal,31);
  assert.deepEqual(errors,[]);fs.writeFileSync('output/plus/demo-browser.json',JSON.stringify({status:'PASS',info,loads,errors},null,2));
  console.log('PASS actual Demo build: Plus remains locked even with a full-edition unlock and development hash; native Classic, no Plus pages or save leakage');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

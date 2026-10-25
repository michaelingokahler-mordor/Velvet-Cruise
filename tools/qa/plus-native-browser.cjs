const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const out=path.resolve('output/plus/browser');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:640,height:360}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))missing.push(r.url());});
  await page.goto((process.argv[2]||'http://127.0.0.1:4190/')+'#graphicstest&graphics=plus&autopilot&endtest',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__graphicsInfo?.().mode==='plus',{timeout:30000});
  const info=await page.evaluate(()=>window.__graphicsInfo());
  const catalog=JSON.parse(fs.readFileSync('tools/art/plus/catalog.json'));
  assert.equal(info.nativeSprites,Object.keys(catalog.sprites).length+Object.keys(catalog.images).length);
  assert.equal(info.drawingWidth,640);assert.equal(info.drawingHeight,360);
  await page.keyboard.press('Enter');await page.waitForTimeout(120);await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.__graphicsInfo().screen==='race');await page.waitForTimeout(4700);
  await page.locator('#game canvas').screenshot({path:path.join(out,'native-plus-race.png')});
  assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.goal-progress.v1')),null,'Development pilot must never persist rewards');
  await page.evaluate(()=>window.__ending('E',3));await page.waitForTimeout(2700);
  await page.locator('#game canvas').screenshot({path:path.join(out,'native-plus-ending.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',info,errors,missing},null,2));
  console.log('PASS native Plus browser: actual package, native sprite densities, racing HUD, ending and isolated rewards');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

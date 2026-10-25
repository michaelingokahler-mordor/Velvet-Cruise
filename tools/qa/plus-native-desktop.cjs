// Attach only to the fresh review executable launched on this explicit CDP port.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const out=path.resolve('output/plus/native-desktop');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.connectOverCDP(process.argv[2]||'http://127.0.0.1:9336');
 const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('tesana-game://game-20261009-93986676/'));
 assert.ok(page,'Expected the isolated full-edition native window');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('tesana-game://game-20261009-93986676/#graphicstest&graphics=plus&autopilot&endtest&tumbletest&stage=1&at=600',{waitUntil:'load'});
  // A hash-only navigation retains the existing document and its boot flags.
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.__graphicsInfo?.().mode==='plus',{timeout:30000});
  const info=await page.evaluate(()=>window.__graphicsInfo());assert.equal(info.drawingWidth,640);assert.equal(info.drawingHeight,360);assert.equal(info.nativeSprites,715);
  const press=async key=>{await page.keyboard.press(key);await page.waitForTimeout(150);};
  await press('Enter');await press('Enter');await page.waitForFunction(()=>window.__race?.state==='race',{timeout:15000});
  await page.waitForTimeout(350);await page.screenshot({path:path.join(out,'native-plus-race.png')});
  await press('Escape');const stopped=await page.evaluate(()=>window.__race.run);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__race.run),stopped,'Pause must stop simulation');
  await press('Escape');await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>window.__race.run)>stopped,'Resume must restart simulation');
  await press('Escape');await press('ArrowDown');await press('Enter');await page.waitForFunction(()=>window.__graphicsInfo().screen==='title');
  await press('ArrowDown');await press('Enter');await press('Enter');await page.waitForFunction(()=>window.__graphicsInfo().screen==='garage');
  await page.screenshot({path:path.join(out,'native-plus-garage.png')});
  await press('Escape');await press('Escape');
  // From remembered Settings (index 1), Up selects Drive, Up selects native Exit.
  await press('ArrowUp');await press('ArrowUp');await page.screenshot({path:path.join(out,'native-exit-selected.png')});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',native:info,tests:['native custom-protocol asset loading','640x360 native drawingBuffer','715 native sprite/background sources','race keyboard/menu navigation','pause/resume simulation','native garage'],errors},null,2));
  const closed=page.waitForEvent('close',{timeout:10000});await page.keyboard.press('Enter').catch(()=>{});await closed;
  const report=JSON.parse(fs.readFileSync(path.join(out,'report.json')));report.tests.push('native Exit closes only the review window');fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS native Windows: packaged custom protocol, native Plus output, keyboard/menu, pause/resume, garage and Exit');
 }finally{await browser.close().catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});

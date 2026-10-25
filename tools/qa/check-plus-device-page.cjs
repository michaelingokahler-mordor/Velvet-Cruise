const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.argv[2]||'http://127.0.0.1:4191/')+'plus-check.html');
  await page.selectOption('#mode','plus');
  const navigation=page.waitForEvent('framenavigated',f=>f.url().includes('#graphicstest'));await page.click('#load');
  const frame=await navigation;
  await frame.waitForFunction(()=>window.__graphicsInfo?.().mode==='plus',{timeout:30000});
  await page.click('#start');await page.waitForTimeout(300);await page.click('#stop');
  const initial=JSON.parse(await page.locator('#result').innerText());
  assert.equal(initial.profile,'plus');assert.equal(initial.native.width,640);assert.equal(initial.performancePassed,false);assert.equal(initial.physicalIPhoneReported,false);assert.equal(initial.frames,0);
  await page.selectOption('#mode','classic');const downloaded=page.waitForEvent('download');await page.click('#download');
  const download=await downloaded,report=JSON.parse(fs.readFileSync(await download.path()));
  assert.equal(report.profile,'plus','Selection after stopping must not relabel the measured framebuffer');assert.equal(report.elapsedSeconds,0);
  assert.deepEqual(errors,[]);console.log('PASS device-check page: actual Plus iframe, warm-up exclusion, incomplete measurement stays failed, physical status explicit, export retains measured profile');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

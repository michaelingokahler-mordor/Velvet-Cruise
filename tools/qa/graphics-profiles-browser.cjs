const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const out=path.resolve('output/graphics-profiles/browser');fs.mkdirSync(out,{recursive:true});
const base=process.argv[2]||'http://127.0.0.1:4190/';
const atlas=JSON.parse(fs.readFileSync('assets/sprites/atlas.json'));
const images={};
for(const file of fs.readdirSync('assets/bg'))if(/^(sky_s\d+|far_s\d+|ending(?:_[abcd])?|course_map)\.png$/.test(file)){
 const name=file.startsWith('ending')?file.replace('ending','ending_bg').replace('.png',''):file.replace('.png','');
 images[name]={file,density:1,opaque:/^(sky|ending|course_map)/.test(file)};
}
const manifest={version:1,complete:true,atlases:[{image:'atlas.png',data:'atlas.json'}],images,reuse:[],requiredSprites:Object.keys(atlas.frames)};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:960,height:540},hasTouch:true}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let failAtlas=false;
 await page.route('**/assets/plus/**',route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  if(name==='manifest.json')return route.fulfill({json:manifest});
  if(name==='atlas.json')return route.fulfill({json:atlas});
  if(name==='atlas.png')return failAtlas?route.fulfill({status:404,body:'missing'}):route.fulfill({body:fs.readFileSync('assets/sprites/atlas.png'),contentType:'image/png'});
  const file=path.join('assets/bg',name);if(fs.existsSync(file))return route.fulfill({body:fs.readFileSync(file),contentType:'image/png'});
  return route.fulfill({status:404,body:'missing'});
 });
 await page.addInitScript(()=>{
  if(!localStorage.getItem('qa-graphics-seeded')){
   localStorage.setItem('sunset-coast-run.goal-progress.v1',JSON.stringify({version:1,masks:{easy:0,normal:31,hard:0},plusUnlocked:true}));
   localStorage.setItem('qa-graphics-seeded','1');
  }
 });
 const press=async key=>{await page.keyboard.press(key);await page.waitForTimeout(75);};
 const openGraphics=async()=>{
  await press('ArrowDown');await press('Enter');
  for(let i=0;i<5;i++)await press('ArrowDown');await press('Enter');
 };
 try{
  await page.goto(base+'#graphicstest',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.__graphicsInfo==='function',null,{timeout:8000});
  assert.equal((await page.evaluate(()=>window.__graphicsInfo())).width,320);
  await openGraphics();await press('ArrowDown');await press('Enter');
  await page.waitForFunction(()=>window.__graphicsInfo().mode==='plus'&&!window.__graphicsInfo().busy,{timeout:30000});
  await page.setViewportSize({width:640,height:360});await page.waitForTimeout(250);
  const native=await page.evaluate(()=>{window.__graphicsPixels(true);return window.__graphicsInfo();});
  assert.equal(native.width,640);assert.equal(native.height,360);assert.equal(native.canvasWidth,640);assert.equal(native.canvasHeight,360);
  assert.equal(native.drawingWidth,640);assert.equal(native.drawingHeight,360);
  assert.equal(native.textureWidth,640);assert.equal(native.textureHeight,360);
  await page.waitForTimeout(150);
  const shot=await page.locator('#game canvas').screenshot();fs.writeFileSync(path.join(out,'native-pixel-check.png'),shot);
  const png=PNG.sync.read(shot);assert.equal(png.width,640);
  assert.notEqual(png.data[0],png.data[4],'Adjacent native pixels must survive the final output');
  await page.evaluate(()=>window.__graphicsPixels(false));
  assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.graphics-mode.v1')),'plus');
  // Rotate the outer presentation; the native buffer and logical touch targets stay unchanged.
  await page.setViewportSize({width:360,height:640});await page.waitForTimeout(200);
  assert.equal((await page.evaluate(()=>window.__graphicsInfo())).drawingWidth,640);
  const portrait=await page.locator('#game canvas').boundingBox();
  await page.touchscreen.tap(portrait.x+portrait.width/2,portrait.y+portrait.height*111/180);await page.waitForTimeout(150);
  assert.equal((await page.evaluate(()=>window.__graphicsInfo())).screen,'settings');
  await page.setViewportSize({width:640,height:360});await press('ArrowUp');await press('Enter');
  const linkRects=()=>page.locator('a.game-link').evaluateAll(links=>{
   const c=document.querySelector('#game canvas').getBoundingClientRect();
   return links.filter(a=>getComputedStyle(a).display!=='none').map(a=>{
    const b=a.getBoundingClientRect();return [a.href,(b.x-c.x)/c.width,(b.y-c.y)/c.height,b.width/c.width,b.height/c.height];
   });
  });
  await page.waitForSelector('a.game-link:visible');const plusLinks=await linkRects();assert.equal(plusLinks.length,2);
  await press('Escape');
  await press('Escape');await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.__graphicsInfo?.().mode==='plus',{timeout:30000});
  await openGraphics();await press('ArrowUp');await press('Enter');
  await page.waitForFunction(()=>window.__graphicsInfo().mode==='classic');
  await press('Escape');await press('ArrowUp');await press('Enter');
  await page.waitForSelector('a.game-link:visible');assert.deepEqual(await linkRects(),plusLinks);
  await press('Escape');await press('ArrowDown');await press('Enter');
  await press('ArrowDown');failAtlas=true;
  // Clear the package cache through a fresh page; a failed package must keep Classic and its preference.
  await page.reload({waitUntil:'load'});await page.waitForFunction(()=>typeof window.__graphicsInfo==='function');
  await openGraphics();await press('ArrowDown');await press('Enter');
  await page.waitForFunction(()=>!window.__graphicsInfo().busy&&window.__graphicsInfo().error==='load',{timeout:30000});
  assert.equal((await page.evaluate(()=>window.__graphicsInfo())).mode,'classic');
  assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.graphics-mode.v1')),'classic');
  const lockedContext=await browser.newContext({viewport:{width:640,height:360}}),locked=await lockedContext.newPage();
  await locked.goto(base,{waitUntil:'load'});await locked.waitForSelector('#game canvas');await locked.waitForTimeout(350);
  const hit=async key=>{await locked.keyboard.press(key);await locked.waitForTimeout(70);};
  await hit('ArrowDown');await hit('Enter');for(let i=0;i<5;i++)await hit('ArrowDown');await hit('Enter');
  await hit('ArrowDown');await hit('Enter');await locked.waitForTimeout(150);
  assert.equal(await locked.locator('#game canvas').evaluate(c=>c.width),320);
  assert.equal(await locked.evaluate(()=>localStorage.getItem('sunset-coast-run.graphics-mode.v1')),null);
  await locked.locator('#game canvas').screenshot({path:path.join(out,'plus-locked-normal-zero.png')});
  await lockedContext.close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',native,errors,fixture:'Original artwork served as a complete package to test loading/presentation, not Plus art quality.'},null,2));
  console.log('PASS graphics browser: native 640x360 pixels, rotation, real touch events, matching links, lock, persistence, Classic return and failed-load recovery');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

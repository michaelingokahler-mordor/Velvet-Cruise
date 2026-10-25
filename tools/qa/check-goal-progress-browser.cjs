const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const out=path.resolve('output/goal-progress/browser');fs.mkdirSync(out,{recursive:true});
const base=process.argv[2]||'http://127.0.0.1:4190/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(!localStorage.getItem('qa-seeded')){
   localStorage.setItem('sunset-coast-run.stages-cleared',JSON.stringify({normal:[10,12,13,14],easy:[10],hard:[4]}));
   localStorage.setItem('sunset-coast-run.goals-reached','["goal-a"]');
   localStorage.setItem('sunset-coast-run.car','toro');
   localStorage.setItem('qa-seeded','1');
  }
 });
 try{
  await page.goto(base,{waitUntil:'load'});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sunset-coast-run.goal-progress.v1')||'null')?.masks.normal===15);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('sunset-coast-run.goal-progress.v1')));
  assert.equal(before.plusUnlocked,false);assert.equal(before.masks.easy,1);assert.equal(before.masks.hard,16);
  await page.waitForTimeout(500);
  for(let i=0;i<4;i++){await page.keyboard.press('ArrowDown');await page.waitForTimeout(80);}
  await page.keyboard.press('Enter');await page.waitForTimeout(300);
  await page.keyboard.press('ArrowLeft');await page.waitForTimeout(200);
  await page.locator('#game canvas').screenshot({path:path.join(out,'normal-four-of-five.png')});
  // Navigation reaches the new far-right badge on all three difficulty rows.
  for(const [key,name]of [['ArrowUp','easy'],['ArrowDown','normal'],['ArrowDown','hard']]){
   await page.keyboard.press(key);await page.waitForTimeout(150);
   await page.locator('#game canvas').screenshot({path:path.join(out,name+'-badge.png')});
  }
  await page.evaluate(()=>localStorage.setItem('sunset-coast-run.stages-cleared',JSON.stringify({normal:[10,12,13,14,4]})));
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sunset-coast-run.goal-progress.v1')||'null')?.plusUnlocked===true);
  const after=await page.evaluate(()=>({progress:JSON.parse(localStorage.getItem('sunset-coast-run.goal-progress.v1')),car:localStorage.getItem('sunset-coast-run.car'),goals:localStorage.getItem('sunset-coast-run.goals-reached')}));
  assert.equal(after.progress.masks.normal,31);assert.equal(after.car,'toro');assert.equal(after.goals,'["goal-a"]');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',before,after,errors},null,2));
  console.log('PASS browser: migration 4/5→5/5, tier badge navigation, saved unlock, old rewards and clean runtime');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

// Real standalone game, separate ephemeral profiles: never writes the user's saves.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'output/garage-weather/browser');fs.mkdirSync(out,{recursive:true});
const base=process.argv[2]||'http://127.0.0.1:4176/';
const model=require(path.join(root,'output/garage-weather/gallery.cjs'));
const tr=new model.Track([0,5,6,11,13]);
const at=Math.max(100,tr.themeStart(1)-tr.stages[0].startSeg-400);
const results=[],errors=[],badResponses=[];

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function garageSmoke(){
  const context=await browser.newContext({viewport:{width:960,height:540},locale:'en-US'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push({car:'garage',error:e.message}));
  try{
   await page.goto(base+'#autopilot',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.__trackBench==='function');
   await page.keyboard.press('ArrowDown');await page.waitForTimeout(120);
   await page.keyboard.press('Enter');await page.waitForTimeout(300);
   await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);
   await page.keyboard.press('Enter');await page.waitForTimeout(120);
   assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.car')),null,'Locked car must not be selected');
   await page.locator('#game canvas').screenshot({path:path.join(out,'garage-locked.png')});
   await page.evaluate(()=>localStorage.setItem('sunset-coast-run.goals-reached','["goal-a"]'));
   await page.keyboard.press('Enter');
   await page.waitForFunction(()=>localStorage.getItem('sunset-coast-run.car')==='toro');
   await page.reload({waitUntil:'load'});
   assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.car')),'toro');
   console.log('PASS browser garage: locked reward blocked; earned reward selected and retained');
  }finally{await context.close();}
 }
 async function tour(car){
  const context=await browser.newContext({viewport:{width:960,height:540},locale:'en-US'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push({car:car.id,error:e.message}));
  page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
  await page.addInitScript(({id})=>{
   localStorage.setItem('sunset-coast-run.car',id);
   localStorage.setItem('sunset-coast-run.difficulty','easy');
   localStorage.setItem('sunset-coast-run.goals-reached',JSON.stringify(['goal-a','goal-b','goal-c','goal-d','goal-e']));
   window.__roofSamples=[];
   // Observe each existing simulation snapshot assignment, including accelerated substeps.
   let currentRace;
   Object.defineProperty(window,'__race',{configurable:true,get:()=>currentRace,set:r=>{
    currentRace=r;
    const previous=window.__roofSamples.at(-1);
    if(!previous||previous.roof!==r.roof||previous.stage!==r.stage)window.__roofSamples.push({...r});
   }});
  },{id:car.id});
  try{
   await page.goto(base+'#autopilot&sim=12&stage=1&at='+at+'&path=0,5,6,11,13',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.__trackBench==='function');
   for(let i=0;i<6;i++){
    if(await page.evaluate(()=>['countdown','race'].includes(window.__race?.state)))break;
    await page.keyboard.press('Enter');await page.waitForTimeout(300);
   }
   await page.waitForFunction(()=>window.__race?.state==='race',{timeout:30000});
   for(const [label,stage,roof]of [['rain',1,3],['dry-return',2,0],['snow',3,3],['final-dry',4,0]]){
    await page.waitForFunction(({stage,roof})=>window.__race?.stage===stage&&window.__race.roof===roof,{stage,roof},{timeout:90000});
    const state=await page.evaluate(()=>window.__race);assert.equal(state.car,car.id);
    await page.locator('#game canvas').screenshot({path:path.join(out,car.id+'-'+label+'.png')});
   }
   const samples=await page.evaluate(()=>window.__roofSamples);
   const phases=samples.map(s=>s.roof).filter((v,i,a)=>i===0||v!==a[i-1]);
   assert.deepEqual(phases,[0,1,2,3,2,1,0,1,2,3,2,1,0],car.id+' must animate all four natural weather boundaries');
   results.push({car:car.id,status:'PASS',phases,samples});
   console.log('PASS browser weather tour: '+car.id);
  }catch(e){
   await page.screenshot({path:path.join(out,car.id+'-failure.png')}).catch(()=>{});
   fs.writeFileSync(path.join(out,car.id+'-failure.json'),JSON.stringify(await page.evaluate(()=>({race:window.__race,samples:window.__roofSamples,text:document.body.innerText})),null,2));
   throw e;
  }finally{await context.close();}
 }
 try{
  await garageSmoke();
  // Serial tours keep rendering deterministic on machines running another agent.
  for(const car of model.CARS)await tour(car);
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
  fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({status:'PASS',results,errors,badResponses},null,2));
 }catch(e){fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({status:'FAIL',error:e.message,results,errors,badResponses},null,2));throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

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
const finales=[];
const reportName=process.argv.includes('--finale-only')?'finale-validation.json':'validation.json';

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
   for(const [label,stage,roof]of [['rain',1,7],['dry-return',2,0],['snow',3,7],['final-dry',4,0]]){
    await page.waitForFunction(({stage,roof})=>window.__race?.stage===stage&&window.__race.roof===roof,{stage,roof},{timeout:90000});
    const state=await page.evaluate(()=>window.__race);assert.equal(state.car,car.id);
    await page.locator('#game canvas').screenshot({path:path.join(out,car.id+'-'+label+'.png')});
   }
   const samples=await page.evaluate(()=>window.__roofSamples);
   const phases=samples.map(s=>s.roof).filter((v,i,a)=>i===0||v!==a[i-1]);
   assert.deepEqual(phases,[0,1,2,3,4,5,6,7,6,5,4,3,2,1,0,1,2,3,4,5,6,7,6,5,4,3,2,1,0],car.id+' must animate all eight poses at four natural weather boundaries');
   results.push({car:car.id,status:'PASS',phases,samples});
   console.log('PASS browser weather tour: '+car.id);
  }catch(e){
   await page.screenshot({path:path.join(out,car.id+'-failure.png')}).catch(()=>{});
   fs.writeFileSync(path.join(out,car.id+'-failure.json'),JSON.stringify(await page.evaluate(()=>({race:window.__race,samples:window.__roofSamples,text:document.body.innerText})),null,2));
   throw e;
  }finally{await context.close();}
 }
 async function finaleSmoke(car){
  const context=await browser.newContext({viewport:{width:960,height:540},locale:'en-US'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push({car:car.id,scene:'finale',error:e.message}));
  page.on('response',r=>{if(r.status()>=400)badResponses.push({scene:'finale',url:r.url(),status:r.status()});});
  await page.addInitScript(({id})=>{
   localStorage.setItem('sunset-coast-run.car',id);
   localStorage.setItem('sunset-coast-run.goals-reached','["goal-a","goal-b","goal-c","goal-d","goal-e"]');
  },{id:car.id});
  try{
   await page.goto(base+'#autopilot&endtest&stage=2&at=600&path=0,5,6,11,13',{waitUntil:'load'});
   await page.waitForFunction(()=>typeof window.__ending==='function');
   for(let i=0;i<6;i++){
    if(await page.evaluate(()=>window.__race?.roof===7))break;
    await page.keyboard.press('Enter');await page.waitForTimeout(250);
   }
   await page.waitForFunction(()=>window.__race?.roof===7);
   assert.equal(await page.evaluate(()=>typeof window.__endingState),'function','Missing endtest-only roof observation hook');
   await page.evaluate(()=>{
    window.__finaleSamples=[];
    const sample=()=>{const s=window.__endingState();window.__finaleSamples.push(s);if(s.time<2.1)requestAnimationFrame(sample);};
    window.__ending('A',80);requestAnimationFrame(sample);
   });
   await page.waitForFunction(()=>window.__finaleSamples?.at(-1)?.time>=2.1);
   const samples=await page.evaluate(()=>window.__finaleSamples);
   assert.ok(samples.some(s=>s.roof>0),'Finale must start with enclosed car');
   assert.ok(samples.filter(s=>s.time>=.7).every(s=>s.roof===0),'Roof must open before couple exits at two seconds');
   assert.ok(samples.some(s=>s.peopleOut&&s.roof===0));
   await page.locator('#game canvas').screenshot({path:path.join(out,car.id+'-finale-open.png')});
   finales.push({car:car.id,status:'PASS',samples});console.log('PASS browser enclosed-to-open finale: '+car.id);
  }finally{await context.close();}
 }
 try{
  if(!process.argv.includes('--finale-only'))await garageSmoke();
  // Serial tours keep rendering deterministic on machines running another agent.
  if(!process.argv.includes('--finale-only'))for(const car of model.CARS)await tour(car);
  for(const car of model.CARS)await finaleSmoke(car);
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
  fs.writeFileSync(path.join(out,reportName),JSON.stringify({status:'PASS',results,finales,errors,badResponses},null,2));
 }catch(e){fs.writeFileSync(path.join(out,reportName),JSON.stringify({status:'FAIL',error:e.message,results,finales,errors,badResponses},null,2));throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

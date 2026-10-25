// Sustained, foreground desktop browser measurement. Fresh isolated profiles;
// one profile at a time. The default is ten measured minutes after warm-up.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright');
const out=path.resolve('output/plus/benchmark');fs.mkdirSync(out,{recursive:true});
const duration=Number(process.env.VELVET_BENCH_SECONDS||600),warmup=30;
const base=process.argv[2]||'http://127.0.0.1:4191/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--enable-precise-memory-info']});
 const report={status:'RUNNING',environment:{browser:browser.version(),headless:true,os:os.platform()+' '+os.release(),cpu:os.cpus()[0].model,viewport:[640,360],clock:'requestAnimationFrame callback timestamps, deduplicated per presented browser frame',memory:'JavaScript heap only; total process/device memory is not measured'},warmupSeconds:warmup,requiredSeconds:duration,profiles:[]};
 const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));save();
 try{
  for(const mode of ['classic','plus']){
   const context=await browser.newContext({viewport:{width:640,height:360}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    const raf=window.requestAnimationFrame.bind(window);
    window.__bench={record:false,times:[],last:null,start:0,hidden:0};
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&window.__bench.record)window.__bench.hidden++;});
    window.requestAnimationFrame=callback=>raf(ts=>{
     const b=window.__bench;
     if(b.record&&b.last!==ts){if(b.last!==null)b.times.push(ts-b.last);b.last=ts;}
     callback(ts);
    });
   });
   await page.goto(base+'#graphicstest&autopilot&endtest&stage=2&at=600&path=0,5,6,11,13'+(mode==='plus'?'&graphics=plus':''),{waitUntil:'load'});
   await page.waitForFunction(mode=>window.__graphicsInfo?.().mode===mode&&!window.__graphicsInfo().busy,mode,{timeout:30000});
   await page.keyboard.press('Enter');await page.waitForTimeout(150);await page.keyboard.press('Enter');
   await page.waitForFunction(()=>window.__race?.state==='race',{timeout:15000});
   console.log(`${mode}: warming for ${warmup}s, then measuring ${duration}s`);
   await page.waitForTimeout(warmup*1000);
   await page.evaluate(()=>{const b=window.__bench;b.times=[];b.last=null;b.start=performance.now();b.record=true;});
   const start=Date.now(),samples=[],scenes=[];let lastNotice=0,drivingSeconds=0,rainDrivingSeconds=0,lastMeasuredSeconds=0,lastRunTime=await page.evaluate(()=>window.__race?.run??0);
   while(Date.now()-start<duration*1000){
    await page.waitForTimeout(Math.min(5000,duration*1000-(Date.now()-start)));
    const sample=await page.evaluate(()=>({info:window.__graphicsInfo(),screen:window.__graphicsInfo().screen,race:window.__race?.state,runTime:window.__race?.run??0,rain:window.__race?.rain??0,stage:window.__race?.stage,frames:window.__bench.times.length,heap:performance.memory?.usedJSHeapSize??null,visible:document.visibilityState}));
    const elapsed=(Date.now()-start)/1000,advancing=Math.min(elapsed-lastMeasuredSeconds,Math.max(0,sample.runTime-lastRunTime));
    if(sample.screen==='race'&&sample.race==='race'&&advancing>0){drivingSeconds+=advancing;if(sample.rain>=.5)rainDrivingSeconds+=advancing;}
    lastMeasuredSeconds=elapsed;lastRunTime=sample.runTime;
    samples.push({elapsedSeconds:(Date.now()-start)/1000,...sample});
    if(scenes.at(-1)?.screen!==sample.screen||scenes.at(-1)?.stage!==sample.stage)scenes.push({elapsedSeconds:(Date.now()-start)/1000,screen:sample.screen,stage:sample.stage});
    if(sample.screen==='ending'){const s=await page.evaluate(()=>window.__endingState?.());if(s?.time>5)await page.keyboard.press('Enter');}
    else if(['title','difficulty','results','map','name'].includes(sample.screen))await page.keyboard.press(sample.screen==='name'?'Escape':'Enter');
    report.current={mode,elapsedSeconds:(Date.now()-start)/1000,frames:sample.frames,stage:sample.stage,screen:sample.screen};save();
    if(Date.now()-lastNotice>60000){console.log(`${mode}: ${Math.round((Date.now()-start)/1000)}s / ${duration}s, ${sample.frames} frames`);lastNotice=Date.now();}
   }
   const data=await page.evaluate(()=>{const b=window.__bench;b.record=false;return {times:b.times,hidden:b.hidden,elapsedMs:performance.now()-b.start,info:window.__graphicsInfo()};});
   const sorted=[...data.times].sort((a,b)=>a-b),sum=data.times.reduce((n,t)=>n+t,0);
   const runtimeModule=await page.evaluate(()=>document.querySelector('script[type="module"][src]')?.src??null);
   const result={mode,elapsedSeconds:data.elapsedMs/1000,frames:data.times.length,fps:data.times.length*1000/sum,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),hiddenEvents:data.hidden,native:data.info,runtimeModule,qualifyingGameplay:{drivingSeconds,rainDrivingSeconds,minimumDrivingSeconds:duration*.8,minimumRainSeconds:30},heapSamples:samples.map(s=>({elapsedSeconds:s.elapsedSeconds,bytes:s.heap})),scenes,errors};
   result.status=result.elapsedSeconds>=duration&&result.p95Ms<=20&&result.fps>=58&&!errors.length&&!data.hidden&&drivingSeconds>=duration*.8&&rainDrivingSeconds>=30?'PASS':'FAIL';
   assert.equal(data.info.width,mode==='plus'?640:320);assert.equal(data.info.height,mode==='plus'?360:180);
   await page.locator('#game canvas').screenshot({path:path.join(out,mode+'-final.png')});
   report.profiles.push(result);delete report.current;save();await context.close();console.log(JSON.stringify({mode,status:result.status,fps:result.fps,p95Ms:result.p95Ms,seconds:result.elapsedSeconds}));
  }
  report.status=report.profiles.every(p=>p.status==='PASS')?'PASS':'FAIL';save();if(report.status!=='PASS')process.exitCode=1;
 }catch(e){report.status='FAIL';report.error=e.stack;save();throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

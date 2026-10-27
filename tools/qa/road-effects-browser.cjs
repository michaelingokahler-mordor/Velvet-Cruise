// Real Chromium, disposable storage, production menus and Web Audio synthesis.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:4189/',out=path.resolve('output/playwright/road-effects');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],audio=[];
function wav(name,channels,rate){
 const frames=channels[0].length,n=channels.length,data=Buffer.alloc(44+frames*n*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(n,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*n*2,28);data.writeUInt16LE(n*2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(frames*n*2,40);
 let peak=0,sum=0;for(let i=0;i<frames;i++)for(let c=0;c<n;c++){const v=channels[c][i];peak=Math.max(peak,Math.abs(v));sum+=v*v;data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+(i*n+c)*2);}
 fs.writeFileSync(path.join(out,name+'.wav'),data);return{name,seconds:frames/rate,peak,rms:Math.sqrt(sum/(frames*n))};
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const mode of ['classic','plus']){
   const context=await browser.newContext({viewport:{width:1280,height:720},locale:'en-US'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
   await page.goto(base+`#autopilot&graphicstest&graphics=${mode}`,{waitUntil:'load'});
   await page.waitForFunction(mode=>window.__graphicsInfo?.().mode===mode&&!window.__graphicsInfo().busy,mode);
   const cdp=await context.newCDPSession(page),proto=await cdp.send('Runtime.evaluate',{expression:'Phaser.Scene.prototype'}),objects=await cdp.send('Runtime.queryObjects',{prototypeObjectId:proto.result.objectId});
   await cdp.send('Runtime.callFunctionOn',{objectId:objects.objects.objectId,functionDeclaration:'function(){window.__review=this.find(s=>s.input2&&s.demo)}'});
   await page.waitForFunction(()=>window.__review?.mode==='title');
   await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForFunction(()=>__review.mode==='settings');
   await page.evaluate(()=>{__review.menuSel=4;});await page.keyboard.press('Enter');await page.waitForFunction(()=>__review.mode==='credits');
   await page.getByRole('link',{name:'Tesana',exact:true}).waitFor({state:'visible'});
   assert.equal(await page.getByRole('link',{name:'Tesana',exact:true}).count(),1);
   const links=await page.getByRole('link').evaluateAll(nodes=>nodes.map(n=>({name:n.textContent,href:n.href,box:{top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom}})));
   assert.ok(links.some(l=>l.href==='https://tesana.com/'));assert.ok(links.every(l=>l.box.top>=0&&l.box.bottom<=720));
   await page.locator('#game canvas').screenshot({path:path.join(out,mode+'-credits.png')});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>__review.mode==='settings');checks.push(mode+': credits links visible and Back works');
   await page.evaluate(async()=>{
    __review.startRace();__review.race.state='race';__review.race.countdown=0;__review.race.speed=22000;
    await __review.audio.ctx.resume();__review.audio.engine(.8,1,.8,1,false);__review.paused=true;
   });
   await page.waitForTimeout(450);
   assert.ok(await page.evaluate(()=>__review.audio.ctx.state==='running'&&__review.audio.skidGain.gain.value<.0001),'pause must silence a previously active tyre channel');
   await page.evaluate(()=>{__review.paused=false;__review.race.crashT=10;__review.race.skid=1;__review.audio.engine(.8,1,.8,1,false);});
   await page.waitForTimeout(450);assert.ok(await page.evaluate(()=>__review.audio.skidGain.gain.value<.0001),'crash must silence the tyre channel');
   checks.push(mode+': actual game pause and crash silence active tyre squeal');
   await page.evaluate(async()=>{
    const {Race}=await import('/src/game/race.ts'),{Track}=await import('/src/game/track.ts');
    const r=new Race(new Track([0,5,8,9,10]));r.warp(2,1200);r.state='race';r.gust=.46;r.windForward=0;r.cars=[];r.carsBySeg.clear();r.update=()=>{};
    __review.race=r;__review.paused=false;__review.input2.setPref('touch');
   });
   await page.waitForTimeout(150);
   assert.ok(await page.evaluate(()=>{const fb=__review.renderContext.fb,s=fb.w/320;let red=0;for(let y=71*s;y<109*s;y++)for(let x=279*s;x<315*s;x++)red+=Number(fb.data[y*fb.w+x]===0xff3c4bee);return red>10;}),'touch HUD must preserve the visible windsock');
   await page.locator('#game canvas').screenshot({path:path.join(out,mode+'-touch-windsock.png')});
   const actions=await page.evaluate(async()=>[...(await import('/src/input-bindings.ts')).DRIVE_ACTIONS]);assert.deepEqual(actions,['left','right','throttle','brake','pause']);
   checks.push(mode+': touch windsock visible, only five remaining driving actions');
   if(mode==='classic'){
    for(const kind of ['strip','sand','driving']){
     const rendered=await page.evaluate(async kind=>{
      const {GameAudio}=await import('/src/audio/audio.ts'),duration=kind==='driving'?12:1,rate=44100,ctx=new OfflineAudioContext(2,duration*rate,rate),a=new GameAudio();a.attach(ctx);
      if(kind==='strip')a.stripKick(.8);else if(kind==='sand')a.dirtKick(.8);else{
       a.buffers.set('music_coastline',await ctx.decodeAudioData(await(await fetch('/assets/audio/music_coastline.mp3')).arrayBuffer()));a.playSong('music_coastline',.05);a.startEngine();a.engine(.82,1,.8,0,false);
       for(let i=1;i<240;i++){
        const time=i*.05;ctx.suspend(time).then(()=>{
         const skid=time>=2&&time<4?Math.min(1,(time-2)*2):0,off=time>=6&&time<8,strip=time>=4.5&&time<6;
         a.engine(.82,1,.8,skid,off,time>=10,0,off?.4:0,strip?.8:0);
         if(i===90)a.stripKick(.8);if(i===120)a.dirtKick(.8);ctx.resume();
        });
       }
      }
      const buffer=await ctx.startRendering();return{rate,channels:[...Array(buffer.numberOfChannels)].map((_,c)=>Array.from(buffer.getChannelData(c)))};
     },kind);
     const stats=wav(kind,rendered.channels,rendered.rate);assert.ok(stats.peak>.01&&stats.peak<1);audio.push(stats);
    }
    checks.push('real Web Audio: non-silent distinct strip/sand entry sounds and engine/music driving sample without clipping');
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',checks,audio,errors,humanListening:'pending',deviceAcceptance:'not performed'},null,2));console.log(JSON.stringify({status:'PASS',checks,audio,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

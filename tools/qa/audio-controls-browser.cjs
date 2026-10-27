// Real browser controls, persistent storage, async loading and Web Audio output.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.argv.find(a=>a.startsWith('http'))||'http://127.0.0.1:4193/';
const baseline=process.argv.includes('--baseline'),audioOnly=process.argv.includes('--audio-only'),out=path.resolve('output/audio-controls/browser');fs.mkdirSync(out,{recursive:true});
const checks=[],failures=[],errors=[];
function check(name,ok,detail){if(ok)checks.push(name);else failures.push({name,detail});}
function wav(file,channels,rate){const frames=channels[0].length,n=channels.length,b=Buffer.alloc(44+frames*n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(n,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*n*2,28);b.writeUInt16LE(n*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*n*2,40);for(let i=0;i<frames;i++)for(let c=0;c<n;c++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,channels[c][i]))*32767),44+(i*n+c)*2);fs.writeFileSync(path.join(out,file),b);}
(async()=>{
 const beforeFile=path.resolve('output/audio-controls/audio-before.mjs');
 try{
  const source=require('node:child_process').execFileSync('git',['show','632faa40cf44b4773151ea83fabb9c8a2641484e:src/audio/audio.ts'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  await require('esbuild').build({stdin:{contents:source,loader:'ts',resolveDir:path.resolve('src/audio')},bundle:true,format:'esm',outfile:beforeFile});
 }catch(e){if(baseline)throw e;}
 const beforeAvailable=fs.existsSync(beforeFile);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const context=await browser.newContext(),page=await context.newPage();
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await page.goto(base);
  const rendered=await page.evaluate(async baseline=>{
   const {GameAudio}=await import(baseline?'/output/audio-controls/audio-before.mjs':'/src/audio/audio.ts');
   const rate=44100,decode=new OfflineAudioContext(2,rate,rate),song=await decode.decodeAudioData(await(await fetch('/assets/audio/music_coastline.mp3')).arrayBuffer());
   const stats=(buffer,start=0,end=buffer.duration)=>{let sum=0,peak=0,n=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const x of buffer.getChannelData(c).subarray(Math.floor(start*rate),Math.floor(end*rate))){sum+=x*x;peak=Math.max(peak,Math.abs(x));n++;}return{peak,rms:Math.sqrt(sum/n)};};
   const tests=[];
   for(const name of ['mute-during-jingle','effects-muted','effects-live-muted','music-without-effects','music-with-silent-jingle','effects-muted-during-jingle','late-song-after-mute']){
    const ctx=new OfflineAudioContext(2,rate*1.6,rate),a=new GameAudio();if(name==='effects-muted'||name.startsWith('music-'))a.effectsVolume=0;a.attach(ctx);a.buffers.set('test_song',song);
    const j=ctx.createBuffer(1,rate*.5,rate);for(let i=0;i<j.length;i++)j.getChannelData(0)[i]=Math.sin(i/rate*220*Math.PI*2)*.2;a.buffers.set('jingle_checkpoint',j);
    if(name==='mute-during-jingle'){a.playSong('test_song',.01);a.jingle('checkpoint',()=>{});ctx.suspend(.15).then(()=>{a.musicVolume=0;ctx.resume();});}
    if(name==='effects-muted'||name==='effects-live-muted'){a.startEngine();a.engine(.8,1,.8,1,false,false,0);a.stripKick(.8);a.dirtKick(.8);a.jingle('checkpoint',()=>{});a.uiSelect();if(name==='effects-live-muted')ctx.suspend(.15).then(()=>{a.effectsVolume=0;ctx.resume();});}
    if(name==='music-without-effects'){a.effectsVolume=0;a.playSong('test_song',.01);a.startEngine();a.engine(.8,1,.8,1,false,false,0);}
    if(name==='music-with-silent-jingle'){a.playSong('test_song',.01);a.jingle('checkpoint',()=>{});}
    if(name==='effects-muted-during-jingle'){a.playSong('test_song',.01);a.jingle('checkpoint',()=>{});ctx.suspend(.15).then(()=>{a.effectsVolume=0;ctx.resume();});}
    if(name==='late-song-after-mute'){a.musicVolume=0;a.playSong('test_song',.01);a.stripKick(.8);}
    const buffer=await ctx.startRendering();tests.push({name,tail:stats(buffer,.9,1.5),first:stats(buffer,0,.3),currentSong:a.currentSong});
   }
   return tests;
  },baseline);
  for(const r of rendered){
   if(r.name==='mute-during-jingle')check('muting during jingle cannot restore music later',r.tail.rms<1e-7&&!r.currentSong,r);
   if(r.name==='effects-muted')check('effects mute includes engine, tyres, jingles and UI',r.first.rms<.0002&&r.tail.rms<1e-7,r);
   if(r.name==='effects-live-muted')check('changing effects volume also silences existing continuous sources',r.tail.rms<1e-7,r);
   if(r.name==='music-without-effects')check('music remains audible with effects muted',r.tail.rms>.01,r);
   if(r.name==='late-song-after-mute')check('late song cannot start while music is muted; tyre cue stays audible',!r.currentSong&&r.first.rms>.002&&r.tail.rms<1e-7,r);
  }
  const musicOnly=rendered.find(r=>r.name==='music-without-effects'),silentJingle=rendered.find(r=>r.name==='music-with-silent-jingle'),mutedJingle=rendered.find(r=>r.name==='effects-muted-during-jingle');
  check('inaudible jingles never duck independently enabled music',Math.abs(silentJingle.first.rms-musicOnly.first.rms)<.00001,{musicOnly:musicOnly.first,silentJingle:silentJingle.first});
  check('muting effects during a jingle restores music',Math.abs(mutedJingle.tail.rms-musicOnly.tail.rms)<.0001,{musicOnly:musicOnly.tail,mutedJingle:mutedJingle.tail});
  await context.close();
  if(!baseline&&!audioOnly){
   for(const mode of ['classic','plus']){
    const context=await browser.newContext({viewport:{width:1280,height:720},hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    let releaseMusic,requests=0;const pending=new Promise(r=>releaseMusic=r);
    await context.addInitScript(()=>{if(!localStorage.getItem('audio-test-sentinel')){localStorage.setItem('sunset-coast-run.station','4');localStorage.setItem('audio-test-sentinel','preserve');}});
    await context.route('**/*',async r=>{const url=new URL(r.request().url());if(url.origin!==new URL(base).origin)return r.abort();if(/\/music_[^/]+\.mp3$/.test(url.pathname)){requests++;await pending;}return r.continue();});
    const press=async k=>{await page.keyboard.press(k);await page.waitForTimeout(70);};
    async function attach(){await page.waitForFunction(mode=>window.__graphicsInfo?.().mode===mode&&!window.__graphicsInfo().busy,mode);const cdp=await context.newCDPSession(page),p=await cdp.send('Runtime.evaluate',{expression:'Phaser.Scene.prototype'}),q=await cdp.send('Runtime.queryObjects',{prototypeObjectId:p.result.objectId});await cdp.send('Runtime.callFunctionOn',{objectId:q.objects.objectId,functionDeclaration:'function(){window.__audioQA=this.find(s=>s.input2&&s.demo)}'});await page.waitForFunction(()=>window.__audioQA?.mode==='title');await page.evaluate(()=>__audioQA.input2.setPref('keyboard'));}
    async function openAudio(){await press('ArrowDown');await press('Enter');await page.waitForFunction(()=>__audioQA.mode==='settings');for(let i=0;i<6;i++)await press('ArrowDown');await page.locator('#game canvas').screenshot({path:path.join(out,mode+'-settings.png')});await press('Enter');await page.waitForFunction(()=>__audioQA.mode==='audio');}
    try{
     await page.goto(base+`#graphicstest&graphics=${mode}`);await attach();await openAudio();
     for(let i=0;i<6;i++)await press('ArrowLeft');
     releaseMusic();await page.waitForFunction(()=>__audioQA.songLoading.size===0);
     assert.equal(await page.evaluate(()=>__audioQA.audio.currentSong),'','late download must not undo mute');
     await press('ArrowDown');for(let i=0;i<8;i++)await press('ArrowLeft');
     assert.deepEqual(await page.evaluate(()=>({...__audioQA.audioSettings.levels})),{music:0,effects:0});
     const beforeReload=requests;await page.reload();await attach();await page.waitForTimeout(300);assert.equal(requests,beforeReload,'muted reload must not fetch music');
     assert.deepEqual(await page.evaluate(()=>({...__audioQA.audioSettings.levels})),{music:0,effects:0});assert.equal(await page.evaluate(()=>localStorage.getItem('sunset-coast-run.station')),'4');assert.equal(await page.evaluate(()=>localStorage.getItem('audio-test-sentinel')),'preserve');
     await openAudio();await press('ArrowDown');for(let i=0;i<8;i++)await press('ArrowRight');
     await page.locator('#game canvas').screenshot({path:path.join(out,mode+'-audio.png')});
     await page.evaluate(()=>__audioQA.input2.setPref('touch'));const box=await page.locator('#game canvas').boundingBox();
     await page.touchscreen.tap(box.x+237/320*box.width,box.y+69/180*box.height);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__audioQA.audioSettings.levels.music),100);
     await page.touchscreen.tap(box.x+84/320*box.width,box.y+69/180*box.height);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__audioQA.audioSettings.levels.music),0);
     await page.keyboard.press('Escape');await page.waitForFunction(()=>__audioQA.mode==='settings'&&__audioQA.menuSel===6);
     for(let i=0;i<3;i++)await press('ArrowUp');await press('Enter');await page.waitForFunction(()=>__audioQA.mode==='radio');assert.equal(await page.evaluate(()=>__audioQA.audio.currentSong),'');await page.locator('#game canvas').screenshot({path:path.join(out,mode+'-radio-off.png')});
     await press('ArrowDown');await press('Escape');await press('Escape');await press('ArrowUp');await press('Enter');await press('Enter');await page.waitForFunction(()=>__audioQA.mode==='race');
     assert.equal(await page.evaluate(()=>__audioQA.audio.currentSong),'');assert.equal(await page.evaluate(()=>__audioQA.audio.effectsVolume),.8);
     checks.push(mode+': keyboard/touch sliders, independent saved mute, delayed song, reload, radio and race');
    }finally{releaseMusic();await context.close();}
   }
   // Comparable recordings use the same cue sequence and real song, at each build's defaults.
   const c=await browser.newContext(),p=await c.newPage();await p.goto(base);
   for(const version of beforeAvailable?['before','after','effects-only']:['after','effects-only']){
    const recording=await p.evaluate(async version=>{
     const {GameAudio}=await import(version==='before'?'/output/audio-controls/audio-before.mjs':'/src/audio/audio.ts'),rate=44100,ctx=new OfflineAudioContext(2,rate*8,rate),a=new GameAudio();let seed=12345;const random=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};a.attach(ctx);Math.random=random;
     a.buffers.set('music_coastline',await ctx.decodeAudioData(await(await fetch('/assets/audio/music_coastline.mp3')).arrayBuffer()));if(version!=='effects-only')a.playSong('music_coastline',.05);a.startEngine();a.engine(.82,1,.8,0,false,false,0);
     for(let i=1;i<160;i++){const time=i*.05;ctx.suspend(time).then(()=>{a.engine(.82,1,.8,time>=1&&time<2.5?.65:0,time>=4.5&&time<6.5,false,0,time>=4.5&&time<6.5?.4:0,time>=3&&time<4?.8:0);if(i===60)a.stripKick(.8);if(i===90)a.dirtKick(.8);ctx.resume();});}
     const b=await ctx.startRendering();let peak=0,sum=0;for(const x of b.getChannelData(0)){peak=Math.max(peak,Math.abs(x));sum+=x*x;}return{channels:[...Array(b.numberOfChannels)].map((_,i)=>Array.from(b.getChannelData(i))),rate,peak,rms:Math.sqrt(sum/b.length)};
    },version);
    check(version+': review mix has headroom',recording.peak<.98,recording.peak);wav('driving-'+version+'.wav',recording.channels,recording.rate);
   }
   const maximumLevels=await p.evaluate(async()=>{
    const {GameAudio}=await import('/src/audio/audio.ts'),names=['coastline','golden','wave','twist','highway','riptide'],results=[];
    for(const name of names){
     const rate=44100,ctx=new OfflineAudioContext(2,rate*8,rate),a=new GameAudio();a.musicVolume=1;a.effectsVolume=1;a.attach(ctx);const key='music_'+name;
     a.buffers.set(key,await ctx.decodeAudioData(await(await fetch('/assets/audio/'+key+'.mp3')).arrayBuffer()));a.playSong(key,.01);a.startEngine();a.engine(1,1,1,1,false,false,1,0,1);a.weather(1,1,1);a.tunnel(1);
     for(const time of [1,3,5,7])ctx.suspend(time).then(()=>{a.stripKick(1);a.dirtKick(1);ctx.resume();});
     const b=await ctx.startRendering();let peak=0;for(let c=0;c<b.numberOfChannels;c++)for(const x of b.getChannelData(c))peak=Math.max(peak,Math.abs(x));results.push({name,peak});
    }return results;
   });
   for(const r of maximumLevels)check(r.name+': both volume controls at maximum remain unclipped',r.peak<1,r.peak);
   fs.writeFileSync(path.join(out,'maximum-levels.json'),JSON.stringify(maximumLevels,null,2));
   await c.close();
  }
  check('no browser script errors',errors.length===0,errors);
  const report={status:failures.length?'FAIL':'PASS',checks,failures,audio:rendered,errors,humanListening:'pending'};fs.writeFileSync(path.join(out,baseline?'audio-red.json':audioOnly?'audio-only.json':'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

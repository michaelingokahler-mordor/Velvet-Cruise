// Offline capture of the CURRENT game's Race, Renderer and HUD. No player storage or SDK.
// node tools/trailer/capture.mjs [--plan] [--only=palm-cove]
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url), { PNG } = require('pngjs');
const captureDate = '2026-10-24';
const root = resolve('.'), out = resolve(process.env.VELVET_CAPTURE_DIR || `output/trailer/${captureDate}`);
for (const p of ['raw', 'qa', 'cinematic', 'shorts', 'landscape', 'delivery']) mkdirSync(resolve(out,p),{recursive:true});
function sourceSnapshot() {
  const hashes = {};
  function visit(folder) {
    for (const item of readdirSync(resolve(root,folder),{withFileTypes:true})) {
      const name = `${folder}/${item.name}`;
      if(item.isDirectory())visit(name);
      else hashes[name]=createHash('sha256').update(readFileSync(resolve(root,name))).digest('hex');
    }
  }
  visit('src'); visit('assets');
  return hashes;
}
const sourceFiles = sourceSnapshot();
const sourceDigest = createHash('sha256').update(JSON.stringify(sourceFiles)).digest('hex');
writeFileSync(resolve(out,'qa/source-manifest.json'),JSON.stringify({created:captureDate,sha256:sourceDigest,files:sourceFiles,gitStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'})},null,2));
const entry = ['core/fb','core/materials','game/track','game/race','game/render','game/themes','game/routes','game/ui','game/passenger','platform/services']
  .map(p=>`export * from ${JSON.stringify(resolve(root,'src',p+'.ts'))};`).join('\n');
const bundle=resolve(out,'qa/engine.cjs');
await build({stdin:{contents:entry,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:bundle});
globalThis.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const {FB,halve,emissivePixel,Track,Race,Renderer,THEMES,COLUMN_NODES,NEXT,Hud,Passenger,drawForkPanel,t,rgb}=require(bundle);
const plan=process.argv.includes('--plan'), only=process.argv.find(x=>x.startsWith('--only='))?.slice(7);
// Same brisk driving profile as the current Extended Tour route-balance checks.
const cruise=.997;
let randomSeed=271828; Math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
const paths=[[0,5,8,9,10],[0,5,8,11,12],[0,1,6,7,13],[0,1,2,3,14],[0,1,2,3,4]];
const sprites=new Map();
if(!plan){
  // Match SpriteBank.addAtlas including emissivity and scenery mipmaps.
  const png=name=>PNG.sync.read(readFileSync(resolve(root,name)));
  const atlas=png('assets/sprites/atlas.png'), frames=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
  for(const [name,f] of Object.entries(frames)){
    const data=new Uint32Array(f.w*f.h);
    for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
      const o=((f.y+y)*atlas.width+f.x+x)*4,[r,g,b,a]=atlas.data.subarray(o,o+4);
      if(a<128)continue;
      const emi=f.emissive&&emissivePixel(name,r,g,b,x,y,f.w,f.h);
      data[y*f.w+x]=(((emi?254:255)<<24)|(b<<16)|(g<<8)|r)>>>0;
    }
    const s={w:f.w,h:f.h,data};
    if(f.w>=24&&f.h>=24&&!/^(cheer_|crash_|car_|coupe_|sports_|beetle_|pickup_|van_|truck_|trophy|icon_|wx_)/.test(name)){
      s.mip=halve(s);if(s.mip.w>=12&&s.mip.h>=12)s.mip.mip=halve(s.mip);
    } sprites.set(name,s);
  }
  for(const name of new Set(THEMES.flatMap(th=>[th.sky,th.far]))){
    const p=png(`assets/bg/${name}.png`),data=new Uint32Array(p.width*p.height);
    for(let i=0;i<data.length;i++){const o=i*4;data[i]=p.data[o+3]>=128?((255<<24)|(p.data[o+2]<<16)|(p.data[o+1]<<8)|p.data[o])>>>0:0;}
    sprites.set(name,{w:p.width,h:p.height,data});
  }
}
const bank={get:n=>sprites.get(n),has:n=>sprites.has(n)}, captured=new Set(), records=[];
for(const path of paths){
  const race=new Race(new Track(path));
  race.aiPlan=path.map((n,i)=>i?(NEXT[path[i-1]][0]===n?-1:1):0);
  const fb=plan?null:new FB(), renderer=plan?null:new Renderer(fb,bank), hud=new Hud(), lady=new Passenger();
  if(renderer)renderer.label=id=>t(id);
  let clean=0,rough=0,record=null,encoder=null,encoderExit=null,frames=0,telemetry=[],simTime=0;
  race.events={
    gate(g){if(g.kind==='checkpoint')hud.push(t('msg.checkpoint'),undefined,1.8);},
    crash(hard,car,tumble){lady.feel(tumble?-35:hard?-14:-7);lady.say('scared',true);},
    closePass(){lady.feel(1);}
  };
  const close=async()=>{
    if(!record)return;
    if(encoder){encoder.stdin.end();const code=await encoderExit;if(code!==0)throw Error('FFmpeg capture failed '+code);}
    record.frames=frames;record.duration=frames/30;record.endState=race.state;record.endNode=race.node;
    record.telemetry=telemetry;
    records.push(record);captured.add(record.node);
    console.log(JSON.stringify({stage:record.name,seconds:record.duration,endState:record.endState,endNode:record.endNode}));
    if(!plan)writeFileSync(resolve(out,`qa/${record.id}.json`),JSON.stringify(record,null,2));
    record=null;encoder=null;
  };
  for(let frame=0;frame<30*900;frame++){
    const node=race.node;
    if(record&&node!==record.node)await close();
    if(!record&&!captured.has(node)&&(!only||THEMES[node].id===only)){
      const th=THEMES[node];frames=0;telemetry=[];
      const stage=race.track.stages[race.stage];
      record={node,id:th.id,name:t(th.nameKey),column:race.stage+1,path:path.slice(),startSeg:stage.startSeg,endSeg:stage.endSeg,startTime:simTime,startPosition:race.position,source:`Race.autopilot(1/60, ${cruise}), normal difficulty, unmodified physics`,fps:30};
      if(!plan){
        const raw=resolve(out,`raw/${th.id}.mkv`);record.raw=raw;
        encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','320x180','-framerate','30','-i','pipe:0','-an','-c:v','ffv1','-level','3','-pix_fmt','bgra',raw],{stdio:['pipe','ignore','inherit'],windowsHide:true});
        encoderExit=new Promise((res,rej)=>{encoder.on('error',rej);encoder.on('close',res);});
      }
    }
    for(let step=0;step<2;step++){
      race.update(1/60,race.autopilot(1/60,cruise));hud.update(1/60);lady.update(1/60);simTime+=1/60;
      if(race.state==='race'){
        const fast=race.kmh>255&&!race.offroad&&race.crashT<=0;
        clean=fast?clean+1/60:Math.max(0,clean-2/60);
        if(clean>9){lady.say('love');clean=0;}
        rough=race.offroad&&race.kmh>90?rough+1/60:0;
        if(rough>.7){lady.say('scared');rough=0;}
        if(race.offroad&&race.kmh>90)lady.feel(-4/60);
        else if(race.scraping>0)lady.feel(-6/60);
        else if(race.kmh>180)lady.feel(.9/60);
      }
    }
    if(record){
      if(frames%30===0)telemetry.push({frame:frames,simTime,position:race.position,node:race.node,kmh:race.kmh,state:race.state,crash:race.crashT,tumble:race.tumbleT});
      if(!plan){
        renderer.time=simTime;renderer.render(race);
        if(race.fade>0)fb.rectA(0,0,320,180,rgb(0x120a1c),race.fade);
        hud.draw(fb,race,false,simTime);drawForkPanel(fb,bank,race,simTime);
        if(race.tumbleT<0)lady.draw(fb,race.carScreenX()+12,race.carScreenY()-42);
        else {const head=race.ladyHead();if(head)lady.draw(fb,head.x,head.y);}
        lady.drawMeter(fb,313,24);
        if(frames===300){const p=new PNG({width:320,height:180});p.data=Buffer.from(fb.img.data);writeFileSync(resolve(out,`qa/${record.id}.png`),PNG.sync.write(p));}
        if(!encoder.stdin.write(Buffer.from(fb.img.data)))await once(encoder.stdin,'drain');
      }
      frames++;
    }
    if(race.state==='goal'||race.state==='over'){await close();break;}
  }
  if(record)await close();
  if(race.state!=='goal')throw Error(`Route ${path} ended in ${race.state} at ${race.node}`);
}
if(JSON.stringify(sourceSnapshot())!==JSON.stringify(sourceFiles))throw Error('Runtime sources/assets changed during capture; repeat from a stable source state');
const manifest={created:captureDate,sourceDigest,sourceStableDuringCapture:true,revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),nativeResolution:[320,180],captureResolution:[320,180],captureFps:30,physicsHz:60,stages:records.map(({telemetry,...r})=>r),audio:'Game soundtrack added in edit; isolated engine capture contains no live browser audio.',boundaries:'Isolated current Race/Renderer/Hud capture with automated driver; no human live gameplay, no SDK, no player saves. Scene orchestration of passenger and message events is reduced; physics, traffic, artwork and road renderer are unmodified.'};
writeFileSync(resolve(out,plan?'qa/plan.json':only?`qa/capture-${only}.json`:'capture.json'),JSON.stringify(manifest,null,2));
if(!only&&records.length!==15)throw Error('Expected all fifteen stages');

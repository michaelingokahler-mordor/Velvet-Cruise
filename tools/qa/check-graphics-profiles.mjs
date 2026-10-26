import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out=resolve('output/graphics-profiles');mkdirSync(out,{recursive:true});
globalThis.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const file=resolve(out,'model.mjs');
await build({stdin:{contents:['core/fb','game/graphics','game/track','game/race','game/render','game/config','game/navigation-art'].map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'esm'});
const m=await import(pathToFileURL(file));
const {Renderer,Track,Race,createRenderContext}=m;
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
const carArt={w:88,h:48,data:new Uint32Array(88*48).fill(m.rgb(0xd03028))};
const carName=name=>/^(player|car_|coupe_|sports_|beetle_|pickup_|van_|truck_)/.test(name);
const bank={get:name=>carName(name)?carArt:undefined,has:carName};
const up=s=>{const data=new Uint32Array(s.w*s.h*4);for(let y=0;y<s.h*2;y++)for(let x=0;x<s.w*2;x++)data[y*s.w*2+x]=s.data[(y>>1)*s.w+(x>>1)];return {w:s.w*2,h:s.h*2,density:2,data};};
test('trafficGeometryDoesNotDependOnSourceDensity',()=>{
 const a=createRenderContext('plus'),b=createRenderContext('plus'),highCar=up(carArt);
 const highBank={get:name=>carName(name)?highCar:undefined,has:carName};
 const ra=new Race(new Track()),rb=new Race(new Track());ra.warp(0,600);rb.warp(0,600);
 for(const r of [ra,rb]){r.cars.length=0;assert.equal(r.spawnAhead(2,.5),true);r.carsBySeg.clear();r.carsBySeg.set(Math.floor(r.cars[0].z/m.SEG_LEN),[r.cars[0]]);}
 for(const r of [ra,rb]){r.cars[0].turnDir=1;r.cars[0].turnTime=.1;r.cars[0].targetX=r.cars[0].x+.5;}
 assert.ok(bank.has(ra.cars[0].sprite),'Missing fixture for '+ra.cars[0].sprite);
 const pa=new Renderer(a,bank),pb=new Renderer(b,highBank);pa.render(ra);pb.render(rb);
 assert.equal(ra.cars[0].seen,1);assert.equal(rb.cars[0].seen,1);
 a.fb.clear(0);b.fb.clear(0);
 for(const [p,r]of [[pa,ra],[pb,rb]])p.car(r.cars[0],r.track.seg(r.cars[0].z),r.camWorldX,r.playerY+m.CAM_H,r.position,[1,1,1],0,0);
 const mismatch=a.fb.data.findIndex((p,i)=>p!==b.fb.data[i]);assert.equal(mismatch,-1,'Density changed geometry at native pixel '+mismatch);
});
test('derivedGateAndNavigationArtRetainDensity',()=>{
 const gate={w:256,h:64,data:new Uint32Array(256*64)};
 const high=up(gate),lowPainter=new Renderer(createRenderContext('classic'),{get:()=>gate}),highPainter=new Renderer(createRenderContext('plus'),{get:()=>high});
 lowPainter.label=highPainter.label=()=> 'PALM COVE';
 const a=lowPainter.gateSprite('gate','stage.1'),b=highPainter.gateSprite('gate','stage.1');
 assert.equal(b.density,2);
 for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++)assert.equal(b.data[y*2*b.w+x*2],a.data[y*a.w+x]);
 const sign={w:64,h:48,data:new Uint32Array(64*48)};
 assert.equal(m.navigationArt(up(sign),'route').density,2);
});
test('nativeProjectionKeepsWorldCoordinates',()=>{
 const a=createRenderContext('classic'),b=createRenderContext('plus');
 const ta=new Track(),tb=new Track(),ra=new Race(ta),rb=new Race(tb);
 ra.warp(0,600);rb.warp(0,600);
 const pa=new Renderer(a,bank),pb=new Renderer(b,bank);pa.render(ra);pb.render(rb);
 let compared=0;
 for(let i=0;i<ta.segs.length;i++)if(ta.segs[i].S1>0&&tb.segs[i].S1>0){
  for(const field of ['X1','Y1','W1','S1'])assert.equal(tb.segs[i][field],ta.segs[i][field]*2,field+' at '+i);
  compared++;
 }
 assert.ok(compared>10);assert.equal(a.fb.data.length,320*180);assert.equal(b.fb.data.length,640*360);
 assert.equal(m.SPR_S,1522/140);assert.equal(m.CAR_W,80*(1522/140));
});
const state=r=>({seed:r.seed,position:r.position,speed:r.speed,x:r.playerX,crash:r.crashT,score:r.score,
 cars:r.cars.map(c=>({z:c.z,x:c.x,speed:c.speed,target:c.targetX,sx:c.sx,sy:c.sy}))});
for(const kind of ['straight','offroad','shake','crash','tumble'])test('simulationParity-'+kind,()=>{
 const a=new Race(new Track()),b=new Race(new Track());
 for(const r of [a,b]){r.warp(0,600);r.state='race';r.countdown=0;r.speed=m.MAX_SPEED*.8;
  if(kind==='offroad')r.playerX=1.3;if(kind==='shake')r.shake=.7;if(kind==='crash')r.crashT=.3;
  if(kind==='tumble')r.forceTumble();}
 const pa=new Renderer(createRenderContext('classic'),bank),pb=new Renderer(createRenderContext('plus'),bank);
 for(let i=0;i<12;i++){
  const ctl={steer:.1,throttle:1,brake:0};a.update(1/60,ctl);b.update(1/60,ctl);
  pa.time=pb.time=i/60;pa.render(a);pb.render(b);assert.deepEqual(state(b),state(a));
 }
});
test('weatherUsesTheSameLogicalPositionsAtBothResolutions',()=>{
 const ra=new Race(new Track()),a=new Renderer(createRenderContext('classic'),bank),b=new Renderer(createRenderContext('plus'),bank);
 const random=Math.random;Math.random=()=>.4;
 try{
  a.rain(1,ra,.1,.5);b.rain(1,ra,.1,.5);assert.deepEqual(b.drops,a.drops);
  a.snow(1,ra,.1,.5);b.snow(1,ra,.1,.5);assert.deepEqual(b.flakes,a.flakes);
  a.sandstorm(1,ra,.1,.5,m.rgb(0x887766));b.sandstorm(1,ra,.1,.5,m.rgb(0x887766));assert.deepEqual(b.dust,a.dust);
 }finally{Math.random=random;}
});
async function asyncTest(name,fn){await fn();passed++;console.log('PASS '+name);}
await asyncTest('selectionLoadsBeforeApplyingAndRemembering',async()=>{
 const order=[],selection=new m.GraphicsSelection(async mode=>{order.push('load');return mode;},()=>order.push('apply'),()=>order.push('save'));
 assert.equal(await selection.select('plus',true),true);assert.equal(selection.mode,'plus');assert.deepEqual(order,['load','apply','save']);
});
await asyncTest('lockedAndFailedPackagesKeepClassic',async()=>{
 let applied=0,saved=0;
 const selection=new m.GraphicsSelection(async()=>{throw Error('missing');},()=>applied++,()=>saved++);
 assert.equal(await selection.select('plus',false),false);assert.equal(selection.error,'locked');
 assert.equal(await selection.select('plus',true),false);assert.equal(selection.error,'load');
 assert.equal(selection.mode,'classic');assert.equal(applied,0);assert.equal(saved,0);
});
await asyncTest('supersededPackageCannotReplaceNewerChoice',async()=>{
 let resolve;const applied=[];
 const selection=new m.GraphicsSelection(mode=>mode==='plus'?new Promise(r=>resolve=r):Promise.resolve('classic'),mode=>applied.push(mode));
 const pending=selection.select('plus',true);await selection.select('classic',true);resolve('plus');
 assert.equal(await pending,false);assert.equal(selection.mode,'classic');assert.deepEqual(applied,['classic']);
});
// Exercise the production ending and presentation transaction, without booting Phaser.
const sceneFile=resolve(out,'scene.mjs');
await build({stdin:{contents:readFileSync('src/main.ts','utf8').replace(/boot\(\);\s*$/, 'export { MainScene };'),resolveDir:resolve('src'),loader:'ts'},outfile:sceneFile,bundle:true,platform:'node',format:'esm',
 define:{'import.meta.env.VITE_LOCAL_SERVICES':'"true"'},plugins:[{name:'headless',setup(b){
  b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'headless'}));
  b.onLoad({filter:/.*/,namespace:'headless'},()=>({contents:'export default {Scene:class{}};',loader:'js'}));
 }}]});
globalThis.document={createElement:()=>({getContext:()=>({})})};
globalThis.location={hash:''};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const {MainScene}=await import(pathToFileURL(sceneFile));
test('endingAnchorsUseLogicalSpriteHeights',()=>{
 const calls=density=>{
  const scene=new MainScene(),draws=[];
  scene.bank={get:name=>({w:32*density,h:40*density,density,data:new Uint32Array(32*40*density*density)})};
  scene.fb=new Proxy({},{get:(_,name)=>(...args)=>{if(name==='blit')draws.push(args.slice(1));}});
  scene.fin={entry:'rise',clip:130,rest:100,trophy:'trophy',bg:'bg',glow:'glow',cols:[0xffffff]};
  scene.modeT=scene.time2=2.6;scene.nextRocket=Infinity;scene.endStep=2;
  scene.finaleScene=()=>{};scene.input2={hit:()=>false};
  scene.lady={update:()=>{},draw:(_,x,y)=>draws.push(['head',x,y])};
  scene.ending(0,[]);return draws;
 };
 assert.deepEqual(calls(2),calls(1));
});
test('failedTextureUploadReleasesCandidateAndKeepsActiveContext',()=>{
 const scene=new MainScene(),previous=scene.renderContext,removed=[];
 scene.demo=new Race(new Track());scene.screenTex={key:'old'};
 scene.textures={createCanvas:()=>({getContext:()=>({putImageData:()=>{throw Error('upload');}})}),remove:key=>removed.push(key)};
 assert.throws(()=>scene.applyGraphics('plus',bank),/upload/);
 assert.equal(scene.renderContext,previous);assert.deepEqual(removed,['screen-1']);
});
console.log(`PASS ${passed} graphics-profile checks`);

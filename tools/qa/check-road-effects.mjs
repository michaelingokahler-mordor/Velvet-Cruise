// Behavioral regressions: real traffic/handling and both native framebuffers.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {rendererModule,loadBanks} from './plus-render-support.mjs';
const out=resolve('output/road-effects');mkdirSync(out,{recursive:true});
const m=await rendererModule(out),banks=loadBanks(m);
await build({stdin:{contents:"export {drawWindIndicator} from './src/game/ui';",resolveDir:process.cwd(),loader:'ts'},define:{'import.meta.env.VITE_LOCAL_SERVICES':'"true"'},bundle:true,format:'cjs',platform:'node',outfile:resolve(out,'hud.cjs')});
const {drawWindIndicator}=createRequire(import.meta.url)(resolve(out,'hud.cjs'));
const checks=[],failures=[];
function test(name,fn){try{fn();checks.push(name);}catch(e){failures.push({name,message:e.message});}}
const tr=new m.Track([0,1,2,3,4]);
function setup(x=-.25){
 const r=new m.Race(tr);r.warp(0,1200);r.state='race';r.timer=10000;r.playerX=-.75;r.speed=m.MAX_SPEED*.8;
 r.density=()=>0;r.rand=()=>.999;r.cars=[];
 const c=r.makeCar(r.playerZ+6000);Object.assign(c,{x,targetX:x,laneX:x});r.cars=[c];return {r,c};
}
function normal(r){const values=[0,.9];r.rand=()=>values.shift()??.999;r.updateTraffic(1/60);r.rand=()=>.999;}
function amber(renderer,fb,r,c,time){
 renderer.race=r;renderer.time=time;fb.clear(m.rgb(0));renderer.car(c,tr.seg(c.z),0,r.playerY+m.CAM_H,r.position,[1,1,1],0,m.rgb(0));
 const xs=[];for(let y=0;y<fb.h;y++)for(let x=0;x<fb.w;x++)if(fb.data[y*fb.w+x]===m.rgb(0xffb52e))xs.push(x);
 return xs;
}
test('normal lane change signals before lateral movement',()=>{
 const {r,c}=setup();normal(r);assert.ok(c.targetX>0);assert.equal(c.x,-.25);assert.equal(c.turnDir,1);
 for(let i=0;i<9;i++)r.updateTraffic(1/60);assert.equal(c.x,-.25);
 for(let i=0;i<200;i++)r.updateTraffic(1/60);assert.ok(c.x>.15);assert.equal(c.turnDir,0);
});
test('bad-weather keep-right signals and passive wind drift does not',()=>{
 const {r,c}=setup(-.75);r.localWeather=()=>({rain:1,snow:0,fog:0,sand:0,dark:0});r.updateTraffic(1/60);
 assert.equal(c.turnDir,1);assert.equal(c.laneX,-.75);
 const b=setup();b.r.windAt=()=>({side:1,forward:0});b.r.updateTraffic(1/60);assert.ok(b.c.x>-.25);assert.equal(b.c.turnDir??0,0);
});
test('unsafe cancelled change stops its indicator before moving',()=>{
 const {r,c}=setup();normal(r);const blocker={...c,x:.25,targetX:.25,laneX:.25,turnDir:0};r.cars.push(blocker);
 r.updateTraffic(1/60);assert.equal(c.x,-.25);assert.equal(c.turnDir,0);
});
test('indicator stays on until the actual car settles, but not indefinitely in crosswind',()=>{
 for(const wind of [0,1]){
  const {r,c}=setup();normal(r);r.windAt=()=>({side:wind,forward:0});let finished=false;
  for(let i=0;i<300;i++){r.updateTraffic(1/60);if(!c.turnDir){finished=true;if(!wind)assert.ok(Math.abs(c.x-c.targetX)<.025,'actual car must finish moving before cancelling its indicator');break;}}
  assert.ok(finished,'weather drift must not hold an indicator indefinitely');
 }
});
for(const mode of ['classic','plus'])test(`${mode}: all 13 NPC models signal both sides in daylight and at night`,()=>{
 const context=m.createRenderContext(mode),renderer=new m.Renderer(context,banks[mode]);
 const names=banks[mode].names().filter(n=>/^(coupe_|sports_|beetle_|pickup_|van_|truck_)/.test(n));assert.equal(names.length,13);
 for(const night of [false,true])for(const name of names)for(const dir of [-1,1]){
  const {r,c}=setup();r.carLightsOn=()=>night;Object.assign(c,{sprite:name,turnDir:dir,turnTime:.1});
  const lit=amber(renderer,context.fb,r,c,.1);assert.ok(lit.length>0,`${name}/${dir}/${night}`);
  assert.ok((lit.reduce((a,b)=>a+b,0)/lit.length-c.sx*(context.fb.w/320))*dir>0,`${name}: correct side`);
  c.turnTime=.45;assert.equal(amber(renderer,context.fb,r,c,.45).length,0,`${name}: dark phase`);
 }
});
test('gusts last 4–6 seconds without reducing peak force',()=>{
 const r=new m.Race(new m.Track([0,5,8,9,10]));r.warp(2,1200);r.gustT=0;r.gustDur=0;r.updateWeather(1/60);
 assert.ok(r.gustDur>=4&&r.gustDur<=6);r.gustAngle=Math.PI/2;r.gustT=r.gustDur/2;r.updateWeather(0);assert.ok(Math.abs(r.gust-.46)<1e-8);
});
test('windsock shows all wind directions, calm, and hides outside wind/tunnels',()=>{
 assert.equal(typeof drawWindIndicator,'function');
 const fb=new m.FB(),r=setup().r;r.weatherAmt=k=>k==='sand'?1:0;r.tunnelAmt=0;
 const shots=[];for(const [side,forward]of [[0,0],[.46,0],[-.46,0],[0,1],[0,-1],[.32,.7]]){
  r.gust=side;r.windForward=forward;fb.clear(m.rgb(0));drawWindIndicator(fb,r,.1);shots.push([...fb.data].join(','));
 }
 assert.equal(new Set(shots).size,6);
 for(const tunnel of [false,true]){r.tunnelAmt=tunnel?1:0;r.weatherAmt=()=>tunnel?1:0;fb.clear(m.rgb(0));drawWindIndicator(fb,r,.1);assert.ok(fb.data.every(p=>p===m.rgb(0)));}
});
function steerRun(seconds,speed=.8,steer=1,state='race',crash=0){
 const {r}=setup();r.state=state;r.updateTraffic=()=>{};r.updateWeather=()=>{};r.updateBlend=()=>{};r.collide=()=>{};r.effects=()=>{};
 const s=r.playerSeg,curve=s.curve;s.curve=0;const pos=r.position;
 for(let i=0;i<seconds*60;i++){r.position=pos;r.playerX=0;r.speed=m.MAX_SPEED*speed;r.crashT=crash;r.update(1/60,{steer,throttle:1,brake:0});}
 s.curve=curve;return r;
}
test('sustained steering squeals after 0.5 s, short/slow steering stays quiet',()=>{
 assert.ok(steerRun(.45).skid<.05);assert.ok(steerRun(1.1).skid>.5);
 assert.ok(steerRun(1.1,.2).skid<.05);assert.ok(steerRun(1.1,.8,1,'race',1).skid<.05);
 assert.ok(steerRun(1.1,.8,1,'over').skid<.05);
});
test('strip and sand emit different entry events without boundary chatter',()=>{
 const {r}=setup();r.updateTraffic=()=>{};r.updateWeather=()=>{};r.collide=()=>{};r.effects=()=>{};
 const events=[];r.events.surface=(kind)=>events.push(kind);const pos=r.position;
 const step=x=>{r.position=pos;r.playerX=x;r.speed=m.MAX_SPEED*.6;r.update(1/60,{steer:0,throttle:1,brake:0});};
 step(.8);step(1);step(1.2);assert.deepEqual(events,['strip','sand']);
 for(let i=0;i<6;i++){step(1.1);step(1.13);}assert.equal(events.filter(x=>x==='sand').length,1);
 for(let i=0;i<30;i++)step(.8);step(1);step(1.2);assert.deepEqual(events,['strip','sand','strip','sand']);
});
for(const mode of ['classic','plus'])test(`${mode}: water moves outside sunlight and stays clipped to the shore`,()=>{
 const fb=m.createRenderContext(mode).fb,p=new m.Renderer(fb,banks[mode]),scale=fb.w/320,th=m.THEMES[0],sent=m.rgb(0x193b25),frames=[];
 for(const time of [0,1,2]){p.time=time;fb.clear(sent);p.seaTrap(90*scale,210*scale,130*scale,260*scale,th.seaA,th.glitter,th.glitter2,20*scale,0,0);frames.push([...fb.data].join(','));
  for(let y=0;y<fb.h;y++)for(let x=0;x<fb.w;x++)if(y<90*scale||y>=130*scale||x<210*scale)assert.equal(fb.data[y*fb.w+x],sent);
 }assert.equal(new Set(frames).size,3,'water must animate without sun glints');
});
test('animated sailboat stays visible throughout its near-distance fade',()=>{
 const r=new m.Race(new m.Track([0,1,2,3,4])),p=new m.Renderer(m.createRenderContext('classic'),banks.classic);
 const anchor=r.track.stages[0].startSeg+450;p.time=Math.PI/(2*.12);
 r.position=(anchor-54)*m.SEG_LEN;r.playerY=r.roadY(r.playerZ);p.render(r);
 assert.ok(p.boatZ>r.position+55*m.SEG_LEN,'positive animated offset must remain in the view during its fade');
});
const report={status:failures.length?'FAIL':'PASS',checks,failures};writeFileSync(resolve(out,process.argv.includes('--red')?'red.json':'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;

import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const out=resolve('output/grade-horn-2026-10-25');mkdirSync(out,{recursive:true});
await build({stdin:{contents:['game/race','game/track','game/config','game/difficulty','game/render','core/fb'].map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:resolve(out,'current.cjs')});
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
const {Race,Track,DIFFS,MAX_SPEED,SEG_LEN,Renderer,FB,rgb}=createRequire(import.meta.url)(resolve(out,'current.cjs'));
const checks=[],failures=[],measurements={};
function test(name,fn){try{fn();checks.push(name);}catch(e){failures.push({name,message:e.message});}}
function near(a,b,label,tolerance=1e-5){assert.ok(Math.abs(a-b)<tolerance,`${label}: ${a} != ${b}`);}
function setup(grade=0,diff=DIFFS[1],snow=false){
 const r=new Race(new Track(snow?[0,5,6,11,13]:[0,1,2,3,4]),false,0,diff);
 r.warp(snow?3:0,1200);r.state='race';r.timer=10000;r.playerX=-.25;r.speed=MAX_SPEED*.8;
 r.stageBlend={from:snow?11:0,to:snow?11:0,t:1};r.updateBlend=()=>{};r.updateWeather=()=>{};r.effects=()=>{};r.collide=()=>{};r.density=()=>0;r.rand=()=>.999;r.cars=[];
 for(const s of r.track.segs){s.curve=0;s.ice=0;s.y1=s.i*SEG_LEN*grade;s.y2=(s.i+1)*SEG_LEN*grade;}
 return r;
}
function playerRun(grade,{speed=.8,seconds=8,throttle=1,brake=0,wind=0}={}){
 const r=setup(grade),position=r.position;r.updateTraffic=()=>{};r.speed=MAX_SPEED*speed;r.windForward=wind;
 for(let i=0;i<seconds*60;i++){r.position=position;r.update(1/60,{steer:0,throttle,brake});}
 return r.speed/MAX_SPEED;
}
test('flat full-throttle physics remains identical',()=>near(playerRun(0),1,'flat max'));
test('uphill and downhill change attainable speed in real Race updates',()=>{
 const up=playerRun(.04),flat=playerRun(0),down=playerRun(-.04);measurements.player={up,flat,down,kmh:[up,flat,down].map(v=>+(v*293).toFixed(1))};
 near(up,.9,'4% uphill');near(down,1.1,'4% downhill');
});
test('grade strength grows with actual slope and is bounded',()=>{
 const gentle=playerRun(.02),steep=playerRun(.08),extreme=playerRun(.5);assert.ok(gentle>steep+.1);near(steep,.8,'8% uphill');near(extreme,.8,'bounded uphill');near(playerRun(-.5),1.2,'bounded downhill');
});
test('grade changes acceleration and coasting before reaching the speed cap',()=>{
 const runs=[.04,0,-.04].map(grade=>playerRun(grade,{speed:.3,seconds:.5}));assert.ok(runs[0]<runs[1]&&runs[1]<runs[2]);
 const coast=[.04,0,-.04].map(grade=>playerRun(grade,{speed:.7,seconds:1,throttle:0}));assert.ok(coast[0]<coast[1]-.04&&coast[2]>coast[1]+.04);measurements.acceleration=runs;measurements.coasting=coast;
});
test('grade combines multiplicatively with the selected wind cap',()=>{
 near(playerRun(.04,{wind:1}),.99,'uphill with tailwind');near(playerRun(-.04,{wind:-1}),.99,'downhill with headwind');near(playerRun(-.08,{wind:1,seconds:15}),1.32,'bounded downhill with tailwind');
});
test('stopped uphill does not roll backwards and downhill brakes still stop',()=>{
 near(playerRun(.08,{speed:0,throttle:0,seconds:1}),0,'no rollback');near(playerRun(-.08,{speed:1,throttle:0,brake:1,seconds:3}),0,'downhill stop');
});
function car(r,z=r.playerZ+8000,x=-.25){return{...r.makeCar(z),z,x,targetX:x,base:MAX_SPEED*.65,speed:MAX_SPEED*.65};}
function npcRun(grade,diff=DIFFS[1],local=false){
 const r=setup(local?0:grade,diff),c=car(r);r.cars=[c];
 if(local){for(let k=-6;k<80;k++){const s=r.track.seg(c.z+k*SEG_LEN);s.y1=k*SEG_LEN*grade;s.y2=(k+1)*SEG_LEN*grade;}}
 const z=c.z;for(let i=0;i<360;i++){c.z=z;r.updateTraffic(1/60);}return c.speed/MAX_SPEED;
}
test('NPCs use the local slope on every difficulty',()=>{
 measurements.npc=DIFFS.map(d=>({difficulty:d.id,up:npcRun(.04,d,true),flat:npcRun(0,d),down:npcRun(-.04,d,true)}));
 for(const m of measurements.npc){near(m.up,.65*.9,'NPC uphill',.00002);near(m.down,.65*1.1,'NPC downhill',.00002);}
});
function hornRun({snow=false,blocked=false,release=Infinity,repeat=false,seconds=3}={}){
 const r=setup(0,DIFFS[1],snow),c=car(r),z=c.z;r.cars=[c];
 const blockers=blocked?[car(r,z,.25),car(r,z,-.75)]:[];r.cars.push(...blockers);
 const kind=r.signal(),accepted={until:c.yieldUntil,lane:c.yieldLane};let firstMove=null;const samples=[];
 for(let i=0;i<seconds*60;i++){
  if(i/60>=release)r.cars=[c];
  if(repeat&&i===48){r.signalCooldown=0;r.signal();}
  for(const o of r.cars)o.z=z;
  r.updateTraffic(1/60);if(firstMove===null&&Math.abs(c.x+.25)>.03)firstMove=(i+1)/60;
  if(i%30===29)samples.push({t:(i+1)/60,x:c.x,target:c.targetX});
 }
 return{r,c,kind,accepted,firstMove,samples};
}
test('a signalled NPC visibly starts moving within 0.6 seconds and clears the lane promptly',()=>{
 const h=hornRun();assert.equal(h.kind,'horn');assert.ok(h.firstMove<=.6,'reaction starts within 0.6 s');assert.ok(h.samples[2].x>.17,'lane cleared within 1.5 s');measurements.hornDry=h.samples;
});
test('snow retains a slower but perceptible signalled lane change',()=>{
 const dry=hornRun(),snow=hornRun({snow:true});assert.ok(snow.samples[4].x>.17,'snow clears lane within 2.5 s');assert.ok(snow.samples[1].x<dry.samples[1].x);measurements.hornSnow=snow.samples;
});
test('a request waits for a safe gap that opens after the horn',()=>{
 const h=hornRun({blocked:true,release:.7,seconds:3});assert.ok(h.accepted.until>0,'blocked driver remembers request');assert.ok(h.c.x>.17,'takes the later gap');measurements.laterGap=h.samples;
});
test('a permanently blocked NPC stays in its lane and expires the request',()=>{
 const h=hornRun({blocked:true,seconds:7});near(h.c.x,-.25,'blocked car');assert.equal(h.c.yieldUntil,0);
});
test('a delayed request does not merge into a player who entered the target lane',()=>{
 for(const playerX of [.25,0,-.1]){
  const r=setup(),c=car(r,r.playerZ+3500),right=car(r,c.z,.25),left=car(r,c.z,-.75);r.cars=[c,right,left];r.signal();
  r.playerX=playerX;r.cars=[c,left];const z=c.z;
  for(let i=0;i<60;i++){c.z=z;left.z=z;r.updateTraffic(1/60);}
  near(c.targetX,-.25,`player occupies swept path at ${playerX}`);near(c.x,-.25,'no movement across player');
 }
});
test('repeated honking does not restart a lane change',()=>{
 const normal=hornRun(),repeat=hornRun({repeat:true});near(repeat.c.x,normal.c.x,'repeated signal movement');
});
test('fork approach keeps the signal lane-change exclusion',()=>{
 const r=setup(),f=r.fork;r.position=(f.start-50)*SEG_LEN-1522;const c=car(r);r.cars=[c];r.signal();assert.ok(!c.yieldUntil);
});
test('accepted NPC lane changes have a visible amber indicator',()=>{
 const r=setup(),c=car(r,r.playerZ+5000),fb=new FB(),sprite={w:72,h:36,data:new Uint32Array(72*36).fill(rgb(0x3050c0))};r.cars=[c];
 const renderer=new Renderer(fb,{get:()=>sprite,has:()=>true});renderer.race=r;renderer.time=.1;const s=r.track.seg(c.z);
 const draw=()=>{fb.clear(rgb(0));renderer.car(c,s,0,1000,r.position,[1,1,1],0,rgb(0));return Uint32Array.from(fb.data);};
 const before=draw();r.signal();const after=draw();let changed=0;for(let i=0;i<after.length;i++)if(before[i]!==after[i])changed++;
 assert.ok(changed>=2,'the real car renderer must show the signal');measurements.indicatorChangedPixels=changed;
});
const report={status:failures.length?'FAIL':'PASS',checks,failures,measurements};
writeFileSync(resolve(out,process.argv.includes('--baseline')?'red-tests.json':'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;

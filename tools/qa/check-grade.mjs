import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const out=resolve('output/grade-2026-10-26');mkdirSync(out,{recursive:true});
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
const report={status:failures.length?'FAIL':'PASS',checks,failures,measurements};
writeFileSync(resolve(out,process.argv.includes('--baseline')?'red-tests.json':'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;

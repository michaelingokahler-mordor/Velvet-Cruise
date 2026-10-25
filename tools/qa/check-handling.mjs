import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve('output/route-balance');mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url);
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
const {Track,Race,DIFFS,MAX_SPEED}=require(resolve(out,'after.cjs'));
const track=new Track();
function measure(diff,weather,curve=2.2,braking=false,ticks=1){
 const r=new Race(track,false,0,diff);r.warp(0,500);r.state='race';r.speed=MAX_SPEED*.8;r.playerX=0;
 r.updateTraffic=()=>{};r.updateBlend=()=>{};r.updateWeather=()=>{};r.collide=()=>{};
 r.weatherAmt=k=>k===weather?1:0;r.gust=weather==='wind'?.3:0;
 const s=r.playerSeg,saved={curve:s.curve,ice:s.ice,iceL:s.iceL,iceR:s.iceR};
 s.curve=curve;s.ice=weather==='ice'?1:0;s.iceL=-1.15;s.iceR=1.15;r.iceAmt=s.ice;
 const before=r.speed,position=r.position;
 for(let i=0;i<ticks;i++){
  r.position=position;r.playerX=0;r.speed=before;
  r.update(1/60,{steer:0,throttle:braking?0:1,brake:braking?1:0});
 }
 const result={x:r.playerX,speed:r.speed,speedLoss:before-r.speed};Object.assign(s,saved);return result;
}
const results={};
for(const weather of ['dry','rain','snow','ice','wind']){
 results[weather]=DIFFS.map(d=>({difficulty:d.id,...measure(d,weather,weather==='wind'?0:2.2,false,weather==='ice'?180:1)}));
 for(let i=1;i<3;i++)assert.ok(Math.abs(results[weather][i].x)>Math.abs(results[weather][i-1].x),weather+' progressively stronger');
}
for(const weather of ['rain','snow','ice'])for(let i=0;i<3;i++)assert.ok(Math.abs(results[weather][i].x)>Math.abs(results.dry[i].x));
const brake=DIFFS.map(d=>measure(d,'ice',0,true).speedLoss);
assert.ok(brake[0]>brake[1]&&brake[1]>brake[2]&&brake[2]>0,'ice reduces braking progressively without removing the brakes');
const dryBrakes=DIFFS.map(d=>measure(d,'dry',0,true).speedLoss);
assert.equal(dryBrakes[0],dryBrakes[1]);assert.equal(dryBrakes[1],dryBrakes[2]);
const acceleration=DIFFS.map(d=>measure(d,'dry',0).speed);assert.equal(acceleration[0],acceleration[1]);assert.equal(acceleration[1],acceleration[2]);

await build({stdin:{contents:"export * from './src/game/arcade';export * from './src/game/rules';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:resolve(out,'records.cjs')});
const records=require(resolve(out,'records.cjs'));
const legacy={
 'sunset-coast-run.arcade':JSON.stringify({normal:[{n:'OLD DRIVER',s:1234567,c:'red',d:1}]}),
 'sunset-coast-run.stage-bests':JSON.stringify({normal:[71000,73000]}),
 'sunset-coast-run.local-bests':JSON.stringify({'score-normal':1234567,'run-normal':400000}),
 'sunset-coast-run.local-badges':JSON.stringify({earned:['first-drive'],counts:{}}),
 'sunset-coast-run.name':'OLD DRIVER',
 'sunset-coast-run.car':'red',
};
const storage=new Map(Object.entries(legacy));globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
assert.equal(records.lastName(),'OLD DRIVER');assert.deepEqual(records.arcadeTable('normal'),[]);
records.arcadeInsert('normal',{n:'NEW DRIVER',s:100,c:'red',d:2});assert.equal(records.arcadeTable('normal')[0].n,'NEW DRIVER');
for(const [k,v]of Object.entries(legacy))assert.equal(storage.get(k),v,'legacy data is retained: '+k);
assert.notEqual(records.STAGE_BEST_KEY,'sunset-coast-run.stage-bests');
const boards=JSON.parse(readFileSync('assets/ui/boards.json','utf8')).boards;
for(const d of DIFFS)for(const kind of ['score','run']){assert.ok(boards.some(b=>b.board===records.boardId(kind,d.id)));assert.ok(boards.some(b=>b.board===`${kind}-${d.id}`));}
const report={status:'PASS',handling:results,iceBrakeSpeedLoss:brake,dryAcceleration:'identical',dryBraking:'identical',records:'old scores, times, name, car and badges retained; separate extended-tour records'};
writeFileSync(resolve(out,'handling-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'PASS',physics:'progressive; dry engine/brakes identical',records:'PASS'}));

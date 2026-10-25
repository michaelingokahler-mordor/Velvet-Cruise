import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
const m=require('../../output/stage-depth/after/renderer.cjs');
const old=require('../../output/stage-depth/before/renderer.cjs');
const {Track,Race,Renderer,FB,SEG_LEN,MAX_SPEED,ROAD_W,lampPose}=m;
const runs=[[0,1,2,3,4],[0,5,6,11,12],[0,1,6,7,13],[0,1,2,7,14],[0,5,8,9,10]];
const evidence=[];
for(const path of runs){
  const t=new Track(path),previous=new old.Track(path);
  for(const node of path.filter(n=>[3,4,6,7,9,11,12,13,14].includes(n))){
    if(evidence.some(e=>e.node===node))continue;
    const stats=track=>{
      const ss=track.segs.filter(s=>s.theme===node),start=ss[0].i,end=ss.at(-1).i;
      const middle=ss.flatMap(s=>s.sprites.filter(p=>p.hit===0&&p.y>50&&Math.abs(p.x)*ROAD_W>(p.x>0?s.landscape?.right:s.landscape?.left)?.points[2].x));
      const homes=ss.flatMap(s=>[s.landscape?.left,s.landscape?.right].filter(g=>g?.plot?.houseSegment===s.i));
      return{middleObjects:middle.length,plots:homes.length,raisedPlots:homes.filter(g=>g.plotBand===3).length,
        passSegments:ss.filter(s=>Math.max(s.landscape?.left.cutting??0,s.landscape?.right?.cutting??0)>.5).length,
        openPassSegments:ss.filter(s=>Math.max(s.landscape?.left.cutting??0,s.landscape?.right?.cutting??0)<.12).length,
        maxRidge:Math.max(...ss.map(s=>s.landscape?.left.points[4].h??0)),start,end};
    };
    const before=stats(previous),after=stats(t);
    if(node!==12)assert.ok(after.middleObjects>before.middleObjects+15,'middle ground is populated: '+node);
    if([4,6].includes(node))assert.ok(after.plots>before.plots*1.5,'settlements have more real plots: '+node);
    if([7,11].includes(node)){assert.ok(after.passSegments>500);assert.ok(after.openPassSegments>1000,'passes also have open stretches');}
    if([3,4,13,14].includes(node))assert.ok(after.maxRidge>before.maxRidge*1.3);
    if(node===12){const finish=t.stages.find(s=>s.node===12).endSeg;for(const side of ['left','right']){
      const street=t.segs.slice(finish-2200,finish).filter(s=>s.landscape?.[side]?.plot?.houseSegment===s.i);
      assert.ok(street.length>=12,'western main street on '+side);
    }}
    evidence.push({node,before,after});
  }
}

const r=new Race(new Track());r.warp(0,500);r.state='race';r.speed=MAX_SPEED*.8;r.playerX=-.25;
const sample={...r.cars[0],z:r.playerZ+8000,x:-.25,targetX:-.25,speed:MAX_SPEED*.45,base:MAX_SPEED*.45,br:undefined,yieldLane:undefined,yieldUntil:0};
const reset=(cars=[{...sample}])=>{r.cars=cars;r.signalCooldown=0;r.signalT=0;r.stageBlend={from:0,to:0,t:1};r.state='race';return cars[0];};
let car=reset();assert.equal(r.signal(),'horn');assert.equal(car.yieldLane,.25);assert.equal(r.signal(),undefined,'cooldown prevents repeat');
const firstX=car.x;r.updateTraffic(.1);assert.equal(car.x,firstX,'driver reacts after a delay');
for(let i=0;i<150;i++)r.updateTraffic(1/60);
assert.ok(car.x>.22,'driver changes lane gradually');
assert.ok(car.x<=.25,'driver stays on the road');
car=reset([{...sample},{...sample,x:.25,targetX:.25,z:sample.z+500},{...sample,x:-.75,targetX:-.75,z:sample.z-300}]);
r.signal();assert.equal(car.yieldLane,undefined,'occupied lanes prevent an unsafe request');
car=reset([{...sample},{...sample,x:.25,targetX:.25,z:sample.z-9000,speed:MAX_SPEED}]);
r.signal();assert.equal(car.yieldLane,-.75,'fast approaching traffic blocks the preferred lane');
car=reset();r.signal();r.cars.push({...sample,x:.25,targetX:.25,z:sample.z+400,yieldUntil:10});for(let i=0;i<105;i++)r.updateTraffic(1/60);
assert.equal(car.targetX,-.25,'driver cancels when the requested lane becomes blocked');
car=reset();r.stageBlend={from:4,to:4,t:1};assert.equal(r.signal(),'flash');assert.equal(r.signalFlash,true);
r.signalT=.46;assert.equal(r.signalFlash,false);r.signalT=.34;assert.equal(r.signalFlash,true);r.signalT=0;assert.equal(r.signalFlash,false);
reset();r.state='goal';assert.equal(r.signal(),undefined,'no signal after finish');
reset();r.stageBlend={from:5,to:5,t:1};assert.equal(r.signal(),'horn','daylight storm keeps the horn');
reset();r.crashT=1;assert.equal(r.signal(),undefined,'no signal during a crash');r.crashT=0;
r.warp(0,r.track.forks[0].start-70);r.state='race';car=reset([{...sample,z:r.playerZ+8000}]);r.signal();assert.equal(car.yieldLane,undefined,'no lane changes across forks');

for(const name of ['lamp_lit','hwy_lamp_lit','city_lamp_lit'])for(const x of [-1.6,1.6]){
 const p=lampPose(name,x);assert.ok(Math.sign(p.head*(p.flip?-1:1))===-Math.sign(x),'lamp head points over road: '+name);
}
const track=new Track([0,1,2,3,4]),race=new Race(track);race.warp(4,1200);race.stageBlend={from:4,to:4,t:1};race.state='race';
const renderer=new Renderer(new FB(),{get:()=>undefined,has:()=>false});renderer.render(race);
const axis={...renderer.headSources[0]};assert.ok(axis);
const i=Math.floor(race.playerZ/SEG_LEN);
for(let k=i+10;k<i+48;k++)track.segs[k].curve+=12;
renderer.render(race);assert.deepEqual(renderer.headSources[0],axis,'future bends cannot steer the headlight axis');
const far=track.segs[i+44];const beamX=axis.x+axis.slope*(far.i*SEG_LEN-axis.z);
assert.ok(Math.abs(beamX-(far.cx1+race.playerX*ROAD_W))>ROAD_W,'beam remains straight when road curves away');

writeFileSync('output/stage-depth/after/depth-validation.json',JSON.stringify({status:'PASS',stages:evidence,
  signals:'delay, cooldown, safe gaps including fast rear traffic, blocked-lane cancellation, fork/crash/goal guards, day/night double flash',
  lighting:'lamp arms point inward; headlight axis independent of future road curvature'},null,2));
console.log(JSON.stringify({status:'PASS',stages:evidence.length,signals:'PASS',lighting:'PASS'}));

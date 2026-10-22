import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url);
const before=resolve('output/coral-bluffs/before'), after=resolve('output/coral-bluffs/after');
const old=require(resolve(before,'renderer.cjs')), now=require(resolve(after,'renderer.cjs'));
const frames=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const road=t=>t.segs.map(s=>[s.i,s.y1,s.y2,s.curve,s.theme,s.fo,s.fork,s.wallH,s.wallOff,s.wallRH,s.wallROff,s.soft,s.rail,s.beach,s.gate,s.ice,s.iceL,s.iceR]);
// Match race.ts: elevated objects (y>50) never take part in roadside collisions.
const collisions=t=>t.segs.flatMap(s=>s.sprites.filter(p=>p.hit>0 && p.y<=50).map(p=>[s.i,p]));
const routes=[];
function visit(p) { const next=now.NEXT[p.at(-1)]; if(!next.length) routes.push(p); else for(const n of next) visit([...p,n]); }
visit([0]);
let plots=0,props=0,cuttings=0,minClearance=Infinity;
for(const path of routes) {
  const a=new old.Track(path), b=new now.Track(path);
  assert.equal(hash(road(a)),hash(road(b)),`road: ${path}`);
  assert.equal(hash(collisions(a)),hash(collisions(b)),`collisions: ${path}`);
  assert.deepEqual(a.stages,b.stages); assert.equal(a.startTime,b.startTime);
  assert.equal(hash(a.segs.filter(s=>s.theme!==1).map(s=>[s.cove,s.sprites])),hash(b.segs.filter(s=>s.theme!==1).map(s=>[s.cove,s.sprites])),`other stages: ${path}`);
  const land=b.segs.filter(s=>s.theme===1);
  if(!land.length) {assert.ok(b.segs.every(s=>!s.bluffs));continue;}
  assert.ok(land.every(s=>s.bluffs),'whole stage including fork must have closed land');
  for(const s of land) {
    const c=s.bluffs, p=c.points;
    assert.equal(p.length,7);
    assert.ok(p.every((v,k)=>Number.isFinite(v.x)&&Number.isFinite(v.h)&&v.h>=0&&(!k||v.x>p[k-1].x)),`mesh ${s.i}`);
    assert.equal(p[0].x,s.wallOff*2900); assert.equal(p[0].h,0);assert.equal(p.at(-1).h,0);
    if(c.spur>0) { assert.ok(s.curve<-.75 && s.fork<0);cuttings++; }
    // The broken crest can vary laterally by 75 units; the rock foot stays fixed.
    if(c.spur>.8) {assert.ok(p[1].x-p[0].x<930);assert.ok(p[1].h<3700);}
    assert.equal(hash(a.segs[s.i].sprites.filter(p=>p.x>=0)),hash(s.sprites.filter(p=>p.x>=0)),'sea and fork props unchanged');
    if(c.plot) {
      assert.ok(Math.abs(s.y1+p[1].h-c.plot.worldY)<1e-6,`front ground not level: ${s.i}`);
      assert.ok(Math.abs(s.y1+p[2].h-c.plot.worldY)<1e-6,`back ground not level: ${s.i}`);
      if(c.plot.houseSegment===s.i) {
        const home=s.sprites.find(v=>/^cove_(cottage|villa|cube|row|chapel)/.test(v.name)||v.name==='lighthouse');
        assert.ok(home);plots++;
        assert.ok(Math.abs(home.y+s.y1-c.plot.worldY)<1e-6,'floating house');
        const half=frames[home.name].w*home.scale*(1522/140)*.5, x=-home.x*2900;
        assert.ok(x-half>=p[1].x && x+half<=p[2].x,'building wider than its ground');
      }
    }
    const previous=new Set(a.segs[s.i].sprites.map(p=>JSON.stringify(p)));
    for(const prop of s.sprites.filter(p=>!previous.has(JSON.stringify(p)))) {
      assert.ok(frames[prop.name]);assert.equal(prop.hit,0);assert.ok(s.fork<0 && !s.gate);
      const x=-prop.x*2900, half=frames[prop.name].w*prop.scale*(1522/140)*.5;
      const clearance=x-half-p[0].x;
      assert.ok(clearance>=499.999,`runoff ${s.i} ${prop.name}: ${clearance}`);
      minClearance=Math.min(minClearance,clearance);props++;
      const k=p.findIndex(v=>v.x>=x);assert.ok(k>0);
      const h=p[k-1].h+(p[k].h-p[k-1].h)*(x-p[k-1].x)/(p[k].x-p[k-1].x);
      assert.ok(Math.abs(h-prop.y)<1e-6,`prop not grounded: ${s.i}`);
    }
  }
  assert.equal(land.flatMap(s=>s.sprites.filter(p=>p.name==='lighthouse')).length,1,'one visible lighthouse');
}
assert.ok(plots>0 && props>0 && cuttings>0);
const baseline=JSON.parse(readFileSync(resolve(before,'autopilot.json'))), current=JSON.parse(readFileSync(resolve(after,'autopilot.json')));
assert.deepEqual(current,baseline,'full coast run must stay identical');assert.equal(current.state,'goal');
// The legacy decorator consumes a different RNG tail for fork median props on
// lazy builds. Check our whole mesh and non-fork decoration for stability, and
// compare the rebuilt fork against an identically rebuilt baseline as well.
const tr=new now.Track(), ref=new old.Track();
const stage=t=>hash(t.segs.filter(s=>s.theme===1).map(s=>[s.bluffs,s.fork<0?s.sprites:[]]));
const stable=stage(tr);
for(const t of [tr,ref]) {t.choose(1,5);for(let i=0;i<5;i++)t.step();t.choose(1,1);for(let i=0;i<5;i++)t.step();}
assert.equal(stage(tr),stable,'changing route away and back must rebuild the same scenery');
assert.equal(hash(road(tr)),hash(road(ref)));assert.equal(hash(collisions(tr)),hash(collisions(ref)),'rebuilt collision regression');
const result={status:'PASS',routes:routes.length,plotsChecked:plots,newPropsChecked:props,minClearance:Math.round(minClearance),leftBendSegmentsChecked:cuttings,roadAndActiveCollisions:'unchanged',otherStages:'unchanged',coastAutopilot:'identical, five stages, goal',forkRebuild:'stable'};
writeFileSync(resolve(after,'validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

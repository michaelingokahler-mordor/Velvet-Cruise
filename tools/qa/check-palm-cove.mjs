import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const before = resolve(process.argv[2] || 'output/palm-cove/before');
const after = resolve(process.argv[3] || 'output/palm-cove/after');
const old = require(resolve(before,'renderer.cjs')), now = require(resolve(after,'renderer.cjs'));
const openLand = require(resolve(process.argv[4] || 'output/palm-cove/vegetation-before','renderer.cjs'));
const frames = JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const routes=[];
function visit(p) { const ns=now.NEXT[p.at(-1)]; if(!ns.length) routes.push(p); else for(const n of ns) visit([...p,n]); }
visit([0]);
const road = tr => tr.segs.map(s=>[s.i,s.y1,s.y2,s.curve,s.theme,s.fo,s.fork,s.wallH,s.wallOff,s.wallRH,s.wallROff,s.soft,s.rail,s.beach,s.gate,s.ice,s.iceL,s.iceR]);
// Match the simulation: props raised above y=50 are decorative.
const solid = tr => tr.segs.flatMap(s=>s.sprites.filter(p=>p.hit>0 && p.y<=50).map(p=>[s.i,p]));
let plots=0, details=0, minClearance=Infinity;
for(const path of routes) {
  const a=new old.Track(path), b=new now.Track(path);
  const open=new openLand.Track(path);
  assert.equal(hash(road(a)),hash(road(b)),`road changed: ${path}`);
  assert.equal(hash(solid(a)),hash(solid(b)),`collision props changed: ${path}`);
  // The other stages are intentionally refreshed; check-stage-refresh covers
  // their full geometry, collision and decorative-ground contracts.
  assert.deepEqual(a.stages,b.stages); assert.equal(a.startTime,b.startTime);
  assert.equal(hash(open.segs.map(s=>s.cove)),hash(b.segs.map(s=>s.cove)),`open land geometry changed: ${path}`);
  assert.ok(b.segs.slice(0,260).every(s=>s.cove),'start lead-in must also have closed land');
  for(const s of b.segs) if(s.cove) {
    const previous=open.segs[s.i].sprites;
    assert.deepEqual(s.sprites.slice(0,previous.length),previous,'existing scenery must stay intact');
    for(const prop of s.sprites.slice(previous.length)) {
      const frame=frames[prop.name];
      assert.ok(frame,`missing new sprite: ${prop.name}`);
      assert.equal(prop.hit,0,'new scenery must not introduce a collision');
      const x=-prop.x*2900, half=frame.w*prop.scale*(1522/140)*.5;
      const clearance=x-half-s.wallOff*2900;
      assert.ok(clearance>=550-.001,`sprite overlaps clear verge: ${s.i}, ${prop.name}`);
      minClearance=Math.min(minClearance,clearance);
      assert.ok(!s.cove.plot && s.fork<0 && !s.gate,'keep plots and gates open');
      const points=s.cove.points;
      const j=points.findIndex(p=>p.x>=x);
      assert.ok(j>0,'sprite must stand on the land mesh');
      const left=points[j-1], right=points[j];
      const surface=left.h+(right.h-left.h)*(x-left.x)/(right.x-left.x);
      assert.ok(Math.abs(prop.y-surface)<.001,'sprite must meet the ground');
      if(path===routes[0]) details++;
    }
    const points=s.cove.points;
    assert.ok(points.every((p,i)=>Number.isFinite(p.x)&&Number.isFinite(p.h)&&p.h>=0&&(!i||p.x>points[i-1].x)),`bad mesh: ${s.i}`);
    assert.equal(points.at(-1).h,0,'land must close behind the ridge');
    const p=s.cove.plot;
    if(p) {
      assert.ok(Math.abs(s.y1+points[1].h-p.worldY)<.001,`unlevel plot front: ${s.i}`);
      assert.ok(Math.abs(s.y1+points[2].h-p.worldY)<.001,`unlevel plot back: ${s.i}`);
      if(p.houseSegment===s.i) {
        plots++;
        const home=s.sprites.find(q=>/^cove_(villa|cottage|cube|chapel)/.test(q.name));
        assert.ok(home,`missing house: ${s.i}`);
        assert.ok(Math.abs(s.y1+home.y-p.worldY)<.001,'house must stand on its plot');
        assert.ok(-home.x*2900>points[1].x && -home.x*2900<points[2].x);
      }
    }
  }
}
const baseline=JSON.parse(readFileSync(resolve(before,'autopilot.json')));
const current=JSON.parse(readFileSync(resolve(after,'autopilot.json')));
assert.equal(current.state,'goal'); assert.equal(current.stageTimes.length,5);
assert.deepEqual(current,baseline,'full coast run must have identical results');
// Rebuilding after a fork must neither duplicate Palm Cove decoration nor move it.
const tr=new now.Track(); const stable=hash(tr.segs.filter(s=>s.theme===0).map(s=>[s.cove,s.sprites]));
tr.choose(1,5); for(let i=0;i<5;i++) tr.step();
assert.equal(hash(tr.segs.filter(s=>s.theme===0).map(s=>[s.cove,s.sprites])),stable);
assert.ok(details>0,'new scenery must be present');
const result={status:'PASS',routes:routes.length,plotsChecked:plots,startLeadIn:'closed',openLandGeometry:'unchanged',newSceneryPerPalmCove:details,minimumSpriteClearanceBeyondRunoff:Math.round(minClearance),roadAndCollisions:'unchanged',otherStageScenery:'covered by all-stage refresh checks',coastAutopilot:'identical, five stages, goal',forkRebuild:'stable'};
writeFileSync(resolve(after,'validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));

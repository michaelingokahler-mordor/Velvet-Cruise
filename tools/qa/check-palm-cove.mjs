import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const before = resolve(process.argv[2] || 'output/palm-cove/before');
const after = resolve(process.argv[3] || 'output/palm-cove/after');
const old = require(resolve(before,'renderer.cjs')), now = require(resolve(after,'renderer.cjs'));
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const routes=[];
function visit(p) { const ns=now.NEXT[p.at(-1)]; if(!ns.length) routes.push(p); else for(const n of ns) visit([...p,n]); }
visit([0]);
const road = tr => tr.segs.map(s=>[s.i,s.y1,s.y2,s.curve,s.theme,s.fo,s.fork,s.wallH,s.wallOff,s.wallRH,s.wallROff,s.soft,s.rail,s.beach,s.gate,s.ice,s.iceL,s.iceR]);
const solid = tr => tr.segs.flatMap(s=>s.sprites.filter(p=>p.hit>0).map(p=>[s.i,p]));
let plots=0;
for(const path of routes) {
  const a=new old.Track(path), b=new now.Track(path);
  assert.equal(hash(road(a)),hash(road(b)),`road changed: ${path}`);
  assert.equal(hash(solid(a)),hash(solid(b)),`collision props changed: ${path}`);
  assert.equal(hash(a.segs.filter(s=>s.theme!==0).map(s=>s.sprites)),hash(b.segs.filter(s=>s.theme!==0).map(s=>s.sprites)),`other scenery changed: ${path}`);
  assert.deepEqual(a.stages,b.stages); assert.equal(a.startTime,b.startTime);
  assert.ok(b.segs.slice(0,260).every(s=>s.cove),'start lead-in must also have closed land');
  for(const s of b.segs) if(s.cove) {
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
const result={status:'PASS',routes:routes.length,plotsChecked:plots,startLeadIn:'closed',roadAndCollisions:'unchanged',otherStageScenery:'unchanged',coastAutopilot:'identical, five stages, goal',forkRebuild:'stable'};
writeFileSync(resolve(after,'validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));

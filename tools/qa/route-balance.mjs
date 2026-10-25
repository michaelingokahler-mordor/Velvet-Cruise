import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const out=resolve('output/route-balance');mkdirSync(out,{recursive:true});
const exports=['core/fb','core/materials','game/track','game/race','game/config','game/difficulty','game/routes','game/themes','game/render','game/ui','game/stage-extension'];
await build({stdin:{contents:exports.map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:resolve(out,'after.cjs')});
globalThis.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const require=createRequire(import.meta.url),m=require(resolve(out,'after.cjs')),old=require(resolve(out,'before.cjs'));
const routes=[];function visit(path){const next=m.NEXT[path.at(-1)];if(next.length)next.forEach(n=>visit([...path,n]));else routes.push(path);}visit([0]);
assert.equal(routes.length,16);
const signature=t=>({start:t.startTime,gates:t.segs.filter(s=>s.gate).map(s=>s.gate)});
const stageEvidence=new Map();
const frames=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
let groundSections=0,fullHouses=0;
for(const path of routes){
 const a=new old.Track(path),b=new m.Track(path);
 assert.deepEqual(signature(b),signature(a),'Normal keeps every original time award: '+path);
 const signs=b.segs.flatMap(s=>s.sprites.filter(p=>p.destinations).map(p=>({s,p})));
 assert.equal(signs.length,4);
 for(const {s,p}of signs)assert.ok(b.forks.some(f=>s.i<f.start&&p.destinations[0]===f.left&&p.destinations[1]===f.right));
 for(const s of b.segs)for(const side of ['left','right']){
  const g=s.landscape?.[side];if(!g)continue;groundSections++;
  assert.ok(g.points.every((p,k)=>Number.isFinite(p.x)&&Number.isFinite(p.h)&&p.h>=0&&(!k||p.x>g.points[k-1].x)));
  if(g.plot){
   const band=g.plotBand??1;assert.ok(Math.abs(s.y1+g.points[band].h-g.plot.worldY)<1e-6);assert.ok(Math.abs(s.y1+g.points[band+1].h-g.plot.worldY)<1e-6);
   if(g.plot.houseSegment===s.i){
    const p=s.sprites.find(p=>p.hit===0&&(side==='right'?p.x>0:p.x<0)&&/^(house_lit|cove_villa|winery|shack|cabin|saloon|store|observatory|radio_dish|gas_station)/.test(p.name));assert.ok(p);
    const center=Math.abs(p.x)*m.ROAD_W,half=frames[p.name].w*p.scale*m.SPR_S*.5;
    assert.ok(center-half>=g.points[band].x&&center+half<=g.points[band+1].x);fullHouses++;
   }
  }
 }
 const base=b.segs.filter(s=>!b.stages.some(st=>s.i>=st.extension.start&&s.i<st.extension.end));
 assert.equal(base.length,a.segs.length);
 for(let i=0;i<base.length;i++)for(const key of ['curve','y1','y2','tunnel'])assert.equal(base[i][key],a.segs[i][key],`original ${key} preserved at ${i}`);
 for(const st of b.stages){
  const x=st.extension,e=m.STAGE_EXTENSIONS[st.node];
  assert.equal(x.start,st.timedEndSeg);assert.equal(x.end,st.endSeg);
  assert.equal(x.bendEnd-x.start,e.enter+e.hold+e.leave);assert.equal(x.end-x.bendEnd,e.straight);
  assert.ok(e.straight>=160);
  assert.ok(b.segs.slice(x.start+1,x.bendEnd).every(s=>Math.sign(s.curve)===Math.sign(e.curve)));
  assert.ok(b.segs.slice(x.bendEnd,x.end).every(s=>s.curve===0));
  for(let i=x.start;i<x.end;i++){const s=b.segs[i];assert.equal(s.y1,b.segs[i-1].y2);assert.ok(Number.isFinite(s.y2));assert.ok(!s.gate);}
  stageEvidence.set(st.node,{node:st.node,id:m.THEMES[st.node].id,description:e.description,addedSegments:x.end-x.start,minimumAddedSeconds:+((x.end-x.start)/92).toFixed(2),curve:e.curve});
 }
}
// A branch rebuilt lazily must produce exactly the same roads and clocks.
const reroute=new m.Track(),pristine=JSON.stringify(reroute.stages);
reroute.choose(1,5);for(let i=0;i<5;i++)reroute.step();reroute.choose(1,1);for(let i=0;i<5;i++)reroute.step();
assert.equal(JSON.stringify(reroute.stages),pristine);
const structure={status:'PASS',routes:routes.length,stages:stageEvidence.size,groundSections,fullHouses,normalClocks:'identical',originalGeometry:'identical after removing the additions',lazyReroute:'identical'};
writeFileSync(resolve(out,'structure-validation.json'),JSON.stringify(structure,null,2));
if(process.argv.includes('--structure-only')){console.log(JSON.stringify(structure));process.exit(0);}

function drive(path,diff,cruise=.997){
 const r=new m.Race(new m.Track(path),false,0,diff);
 r.aiPlan=path.map((n,c)=>c===0?0:m.NEXT[path[c-1]][0]===n?-1:1);
 let crashes=0,offroad=0;const gates=[];
 r.events.crash=()=>crashes++;
 r.events.gate=g=>gates.push({kind:g.kind,stage:g.stage,remaining:+r.timer.toFixed(2),bonus:r.bonusFor(g),time:+r.runTime.toFixed(2)});
 for(let tick=0;tick<60*900&&r.state!=='goal'&&r.state!=='over';tick++){
  r.update(1/60,r.autopilot(1/60,cruise));if(r.offroad)offroad++;
 }
 return {path,difficulty:diff.id,state:r.state,stage:r.stage,remaining:+r.timer.toFixed(2),runTime:+r.runTime.toFixed(2),crashes,offroadSeconds:+(offroad/60).toFixed(2),gates};
}
const runs=[];
for(const diff of m.DIFFS.filter(d=>!process.argv.some(a=>a.startsWith('--difficulty='))||process.argv.includes('--difficulty='+d.id))){
 for(const path of routes)runs.push(drive(path,diff));
 const group=runs.filter(r=>r.difficulty===diff.id),finished=group.filter(r=>r.state==='goal');
 console.log(JSON.stringify({difficulty:diff.id,finished:finished.length,total:group.length,minRemaining:Math.min(...finished.map(r=>r.remaining)),maxRemaining:Math.max(...finished.map(r=>r.remaining)),failures:group.filter(r=>r.state!=='goal').map(r=>({path:r.path,stage:r.stage,crashes:r.crashes,offroad:r.offroadSeconds}))}));
}
const report={status:runs.length===48&&runs.every(r=>r.state==='goal')?'PASS':'TUNING',normalClocks:'all start/checkpoint/end awards identical to pre-extension build',routes:routes.length,groundSections,fullHouses,stages:[...stageEvidence.values()].sort((a,b)=>a.node-b.node),difficulty:m.DIFFS,runs};
writeFileSync(resolve(out,'balance-validation.json'),JSON.stringify(report,null,2));
if(!process.argv.includes('--probe'))assert.equal(report.status,'PASS','Every route must be demonstrably finishable on all difficulties');

import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const out=resolve('output/demo-a');mkdirSync(out,{recursive:true});
const modules=['core/fb','game/edition','game/routes','game/track','game/race','game/difficulty','game/coursemap','game/rules','game/arcade','platform/services'];
const contents=modules.map(p=>`export * from './src/${p}';`).join('\n');
for(const demo of [false,true])await build({stdin:{contents,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',define:{__DEMO_A__:String(demo)},outfile:resolve(out,demo?'demo.cjs':'full.cjs')});
globalThis.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const require=createRequire(import.meta.url),demo=require(resolve(out,'demo.cjs')),full=require(resolve(out,'full.cjs'));
assert.equal(demo.DEMO_A,true);assert.equal(full.DEMO_A,false);
const expected=[0,5,8,9,10],locked=new demo.Track(),reference=new full.Track(expected);
const clocks=t=>({start:t.startTime,gates:t.segs.filter(s=>s.gate).map(s=>s.gate)});
assert.deepEqual(locked.path,expected);assert.deepEqual(clocks(locked),clocks(reference));
assert.equal(locked.goalSeg,reference.goalSeg);assert.deepEqual(locked.stages,reference.stages);
assert.ok(locked.segs.every(s=>expected.includes(s.theme)&&s.fork===-1&&s.fo===0));
assert.equal(locked.forks.length,0);
assert.equal(locked.segs.flatMap(s=>s.sprites).filter(s=>s.destinations||s.name==='fork_sign').length,0);
for(let i=0;i<locked.segs.length;i++)for(const key of ['curve','y1','y2','tunnel'])assert.equal(locked.segs[i][key],reference.segs[i][key],`road ${key} at ${i}`);
for(const path of [[0,1,2,3,4],[0,5,6,11,12],[],[999]]){
 const t=new demo.Track(path);assert.deepEqual(t.path,expected);
 for(let col=1;col<5;col++)for(const node of full.COLUMN_NODES[col])t.choose(col,node);
 for(let i=0;i<5;i++)t.step();assert.deepEqual(t.path,expected);assert.equal(t.forks.length,0);
}
const fullPaths=[];function visit(p){const next=full.NEXT[p.at(-1)];if(next.length)next.forEach(n=>visit([...p,n]));else fullPaths.push(p);}visit([0]);
assert.equal(fullPaths.length,16);
for(const p of fullPaths){const t=new full.Track(p);assert.deepEqual(t.path,p);assert.equal(t.forks.length,4);}
const map=new demo.CourseMap();
for(let i=0;i<20;i++){map.move(1,0);assert.ok(expected.includes(map.sel));}
assert.equal(map.sel,10);
for(let i=0;i<20;i++){map.move(0,-1);assert.ok(expected.includes(map.sel));}
assert.equal(map.sel,0);
for(const n of expected){const [x,y]=map.node(n);assert.equal(map.hit(x,y),n);}

// A demo on the same host cannot read or overwrite the full edition's records.
const storage=new Map([
 ['sunset-coast-run.local-bests',JSON.stringify({'run-normal-tour2':1000})],
 ['sunset-coast-run.arcade.tour2',JSON.stringify({normal:[{n:'FULL',s:999999,c:'red',d:1}]})],
 ['sunset-coast-run.name','FULL'],
 ['sunset-coast-run.local-badges',JSON.stringify({earned:['full-only'],counts:{}})],
]);
const originals=new Map(storage);
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
assert.equal(await demo.myBest('run-normal-tour2'),null);assert.equal(demo.arcadeTable('normal').length,0);assert.equal(demo.lastName(),'');
await demo.submitScore('run-normal-tour2',5000);await demo.submitScore('run-normal-tour2',6000);
assert.equal(await demo.myBest('run-normal-tour2'),5000,'lower run time stays best');
demo.arcadeInsert('normal',{n:'DEMO',s:1234,c:'red',d:2});demo.saveName('DEMO');
assert.equal(demo.arcadeTable('normal')[0].n,'DEMO');assert.equal(demo.lastName(),'DEMO');
assert.equal(demo.servicesOnline(),false);
for(const [key,value]of originals)assert.equal(storage.get(key),value,`full save preserved: ${key}`);
assert.ok([...storage.keys()].filter(k=>!originals.has(k)).every(k=>k.startsWith('sunset-coast-run.demo-a.')));

const runs=[];
for(const diff of demo.DIFFS){
 const r=new demo.Race(new demo.Track([0,1,2,3,4]),false,0,diff),gates=[];
 r.events.gate=g=>gates.push({kind:g.kind,stage:g.stage,remaining:+r.timer.toFixed(2)});
 for(let tick=0;tick<60*900&&r.state!=='goal'&&r.state!=='over';tick++)r.update(1/60,r.autopilot(1/60,.997));
 assert.equal(r.state,'goal',diff.id+' completes demo');assert.deepEqual(r.track.path,expected);
 runs.push({difficulty:diff.id,state:r.state,path:r.track.path,runTime:+r.runTime.toFixed(2),remaining:+r.timer.toFixed(2),gates});
}
const report={status:'PASS',edition:'demo-a',path:expected,goal:'A',branchCount:locked.forks.length,fullEditionRoutes:fullPaths.length,geometry:'curves, heights, tunnels and distance preserved',clocks:'identical to full route A',saves:'separate keys; existing full edition records preserved',map:'only five demo stages selectable',runs};
writeFileSync(resolve(out,'demo-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

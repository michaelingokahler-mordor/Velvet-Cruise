import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve('output/traffic-fixes');mkdirSync(out,{recursive:true});
const file=resolve(out,'routes.cjs');await build({stdin:{contents:['game/race','game/track','game/routes','game/difficulty'].map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'cjs',platform:'node',outfile:file});
const m=createRequire(import.meta.url)(file),routes=[],results=[];
function visit(path){const next=m.NEXT[path.at(-1)];if(next.length)next.forEach(n=>visit([...path,n]));else routes.push(path);}visit([0]);
for(const diff of m.DIFFS)for(const path of routes){
 const r=new m.Race(new m.Track(path),false,0,diff);r.aiPlan=path.map((node,i)=>i===0?0:m.NEXT[path[i-1]][0]===node&&m.NEXT[path[i-1]].length>1?-1:1);
 let bumps=0,crashes=0;r.events.bump=()=>bumps++;r.events.crash=()=>crashes++;let emptyFrames=0;for(let i=0;i<60*900&&r.state!=='goal'&&r.state!=='over';i++){r.update(1/60,r.autopilot(1/60,.997));if(r.cars.length&&![...r.carsBySeg.values()].some(c=>c.length))emptyFrames++;}
 results.push({path,difficulty:diff.id,state:r.state,time:r.runTime,emptyTrafficFrames:emptyFrames,bumps,crashes,timer:r.timer,stage:r.stage});

}
const failures=results.filter(r=>r.state!=='goal'||r.emptyTrafficFrames);writeFileSync(resolve(out,'all-routes.json'),JSON.stringify({status:failures.length?'FAIL':'PASS',results},null,2));assert.equal(failures.length,0,JSON.stringify(failures));console.log(`PASS ${results.length} route/difficulty runs, every goal reached, no empty traffic frames`);

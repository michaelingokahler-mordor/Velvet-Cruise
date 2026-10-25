// Portable regression contract for the approved pre-Plus game, independent of
// ignored artifacts from the earlier landscape migration.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const require=createRequire(import.meta.url),root=process.cwd(),fixture='tools/qa/fixtures/palm-cove-pre-plus.json';
const record=process.argv.indexOf('--record-base'),ref=record>=0?process.argv[record+1]:null;
let m;
if(ref){
 const file=resolve('output/plus/baseline/contract.cjs');mkdirSync(resolve('output/plus/baseline'),{recursive:true});
 await build({stdin:{contents:['game/track','game/race','game/routes'].map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:root,loader:'ts'},bundle:true,format:'cjs',platform:'node',outfile:file,
  plugins:[{name:'committed-baseline',setup(b){b.onLoad({filter:/\.ts$/},args=>({contents:execFileSync('git',['show',`${ref}:${relative(root,args.path).replaceAll('\\','/')}`],{encoding:'utf8'}),loader:'ts'}));}}]});
 m=require(file);
}else m=require(resolve(process.argv.includes('--renderer')?process.argv[process.argv.indexOf('--renderer')+1]:'output/palm-cove/after/renderer.cjs'));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const routes=[];function visit(path){const next=m.NEXT[path.at(-1)];if(!next.length)routes.push(path);else for(const node of next)visit([...path,node]);}visit([0]);
const contracts=routes.map(path=>{
 const t=new m.Track(path);return {path,stages:t.stages,startTime:t.startTime,
  road:hash(t.segs.map(s=>[s.i,s.y1,s.y2,s.curve,s.theme,s.fo,s.fork,s.wallH,s.wallOff,s.wallRH,s.wallROff,s.soft,s.rail,s.beach,s.gate,s.ice,s.iceL,s.iceR])),
  scenery:hash(t.segs.map(s=>[s.sprites,s.cove,s.bluffs,s.landscape]))};
});
const race=new m.Race(new m.Track(m.COAST_PATH));race.aiPlan=[0,1,1,1,1];
for(let i=0;i<60*600&&race.state!=='goal'&&race.state!=='over';i++)race.update(1/60,race.autopilot(1/60,.97));
const run={state:race.state,stage:race.stage,stageTimes:race.stageTimes,runTime:race.runTime,score:race.score,path:race.track.path};
if(ref){writeFileSync(fixture,JSON.stringify({baseline:execFileSync('git',['rev-parse',ref],{encoding:'utf8'}).trim(),contracts,run},null,2));console.log('Recorded committed baseline '+ref);}
else{
 const expected=JSON.parse(readFileSync(fixture));assert.deepEqual(contracts,expected.contracts,'Pre-Plus road, clocks, scenery and collisions must stay identical');
 assert.equal(run.state,'goal');assert.deepEqual(run,expected.run,'Full coast run result');
 console.log(`PASS Palm Cove pre-Plus contract: ${routes.length} routes, all road/scenery/collision data, clocks and complete coast run unchanged`);
}

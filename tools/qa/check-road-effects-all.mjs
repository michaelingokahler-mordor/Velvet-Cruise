import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve('output/road-effects');mkdirSync(out,{recursive:true});
const checks=[
 ['types',['node_modules/typescript/bin/tsc','--noEmit']],
 ['road-effects',['tools/qa/check-road-effects.mjs']],
 ['grade',['tools/qa/check-grade.mjs']],
 ['weather',['tools/qa/check-weather.mjs']],
 ['directional-weather',['tools/qa/check-directional-weather.mjs']],
 ['input-bindings',['tools/qa/check-input-bindings.mjs']],
 ['traffic-fixes',['tools/qa/check-traffic-fixes.mjs']],
 ['menus',['tools/qa/check-menu-settings.mjs']],
 ['graphics-profiles',['tools/qa/check-graphics-profiles.mjs']],
 ['palm-gallery',['tools/qa/palm-cove.mjs','.','output/palm-cove/after']],
 ['palm-contract',['tools/qa/check-palm-cove-contract.mjs']],
 ['water',['tools/qa/check-water.mjs']],
 ['depth-gallery',['tools/qa/stage-refresh.mjs','.','output/stage-depth/after']],
 ['depth-contract',['tools/qa/check-palm-cove-contract.mjs','--renderer','output/stage-depth/after/renderer.cjs']],
 ['stage-refresh',['tools/qa/check-stage-refresh.mjs','output/stage-depth','--graphics-only']],
 ['stage-depth',['tools/qa/check-stage-depth.mjs','--graphics-only']],
 ['plus-assets',['tools/qa/check-plus-assets.mjs','--release']],
 ['plus-stages',['tools/qa/plus-stage-audit.mjs']],
 ['web-build',['node_modules/vite/bin/vite.js','build','--mode','standalone']],
];
const results=[];
for(const[name,args]of checks){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:8*1024*1024}),log=(r.stdout||'')+(r.stderr||'');writeFileSync(resolve(out,'suite-'+name+'.log'),log);
 results.push({name,exitCode:r.status});console.log(`${r.status===0?'PASS':'FAIL'} ${name}`);
 if(r.status!==0){console.error(log.slice(-4500));writeFileSync(resolve(out,'suite.json'),JSON.stringify({status:'FAIL',results},null,2));process.exit(1);}
}
writeFileSync(resolve(out,'suite.json'),JSON.stringify({status:'PASS',results},null,2));console.log(`PASS ${results.length} checks`);

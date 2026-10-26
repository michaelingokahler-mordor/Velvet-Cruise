import {build} from 'esbuild';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadBanks} from './plus-render-support.mjs';
const compare=process.argv[2]==='--compare',out=resolve('output/road-effects');mkdirSync(out,{recursive:true});
const sources=compare?[{root:resolve(process.argv[3]),label:'before'},{root:process.cwd(),label:'after'}]:[{root:resolve(process.argv[2]||'.'),label:process.argv[3]||'after'}];
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};globalThis.document={createElement:()=>({getContext:()=>({})})};
for(const source of sources){
 if(!/^[a-z-]+$/.test(source.label))throw Error('Invalid output label');
 const bundle=resolve(out,'benchmark-'+source.label+'.mjs');
 await build({stdin:{contents:['core/fb','core/draw-surface','core/assets','core/materials','game/graphics','game/track','game/race','game/render','game/lights','game/themes','game/config'].map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:source.root,loader:'ts'},outfile:bundle,bundle:true,format:'esm',platform:'node'});
 source.m=await import(pathToFileURL(bundle));source.banks=loadBanks(source.m);source.results=[];
}
for(const profile of ['classic','plus'])for(const scene of ['coast','sand']){
 const fixtures=sources.map(source=>{const {m,banks}=source;
 const r=new m.Race(new m.Track(scene==='coast'?[0,1,2,3,4]:[0,5,8,9,10]));r.warp(scene==='coast'?0:2,scene==='coast'?301:1200);r.state='race';r.cars=[];r.carsBySeg.clear();r.speed=m.MAX_SPEED*.8;r.gust=.4;r.windForward=.4;
 return{source,r,p:new m.Renderer(m.createRenderContext(profile),banks[profile]),times:[]};});
 // Alternating versions in one process avoids attributing thermal/load drift to the patch.
 for(let i=0;i<600;i++)for(const f of i%2?[...fixtures].reverse():fixtures){f.p.time=i/60;const before=performance.now();f.p.render(f.r);if(i>=240)f.times.push(performance.now()-before);}
 for(const f of fixtures){f.times.sort((a,b)=>a-b);f.source.results.push({profile,scene,medianMs:f.times[180],p95Ms:f.times[342]});}
}
for(const source of sources){const report={source:source.root,method:'600 render-only frames per scene, 240 warmup, actual assets, versions alternate in one process when using --compare; no frame pacing or physical-device claim',results:source.results};writeFileSync(resolve(out,'benchmark-'+source.label+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({label:source.label,...report},null,2));}

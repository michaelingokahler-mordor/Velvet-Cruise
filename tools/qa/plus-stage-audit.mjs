import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {rendererModule,loadBanks,saveFrame} from './plus-render-support.mjs';
const output=resolve('output/plus/stages'),m=await rendererModule(output),banks=loadBanks(m);
const routes=[];function visit(p){const ns=m.NEXT[p.at(-1)];if(!ns.length)routes.push(p);else ns.forEach(n=>visit([...p,n]));}visit([0]);
const report={status:'PASS',themes:[],missing:[],renderOnly:'Physical iPhone and sustained browser measurements are separate.'};
for(let node=0;node<m.THEMES.length;node++){
 const path=routes.find(p=>p.includes(node)),dir=resolve(output,String(node+1).padStart(2,'0')+'-'+m.THEMES[node].id);mkdirSync(dir,{recursive:true});
 const entry={node,id:m.THEMES[node].id,weather:m.THEMES[node].weather??'clear',shots:[],timing:{}};
 for(const mode of ['classic','plus']){
  const r=new m.Race(new m.Track(path)),context=m.createRenderContext(mode),painter=new m.Renderer(context,banks[mode]);
  const stage=r.track.stages.find(s=>s.node===node),length=stage.endSeg-stage.startSeg;
  const offsets=[.08,.2,.32,.44,.56,.68,.8,.92].map(f=>Math.round(length*f));
  const tunnel=r.track.segs.slice(stage.startSeg,stage.endSeg).find(s=>s.tunnel);
  if(tunnel)offsets.push(Math.max(0,tunnel.i-stage.startSeg-12),tunnel.i-stage.startSeg+8);
  const fork=r.track.forks.find(f=>f.col===stage.index);if(fork)offsets.push(fork.start-stage.startSeg-70);
  const random=Math.random;let seed=9876;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const timings=[];
  try{
   for(let i=0;i<offsets.length;i++){
    r.warp(stage.index,offsets[i]);r.state='race';r.countdown=0;r.speed=m.MAX_SPEED*.72;painter.time=i/60;
    const simSeed=r.seed,start=performance.now();painter.render(r);timings.push(performance.now()-start);assert.equal(r.seed,simSeed,'Static render must not consume Race RNG');
    saveFrame(context.fb,resolve(dir,`${mode}-${String(i+1).padStart(2,'0')}.png`));
    if(mode==='plus'){
     for(const s of r.track.segs.slice(stage.startSeg,stage.endSeg))for(const p of s.sprites){
      if(p.name==='portal'){assert.equal(p.scale,0,'Tunnel sides are procedural collision markers');continue;}
      const spr=banks.plus.get(p.name);assert.ok(spr,'Missing '+p.name);assert.equal(spr.density,2,'Unexpected fallback '+p.name);
     }
     entry.shots.push({index:i+1,offset:offsets[i],native:[context.fb.w,context.fb.h]});
    }
   }
  }finally{Math.random=random;}
  timings.sort((a,b)=>a-b);entry.timing[mode]={medianMs:timings[Math.floor(timings.length*.5)],maxMs:timings.at(-1)};
 }
 assert.ok(entry.shots.length>=8);report.themes.push(entry);
 console.log(`PASS ${entry.id}: ${entry.shots.length} paired native views, ${entry.weather}`);
}
writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2));
console.log(`PASS Plus stage audit: ${report.themes.length} themes, ${report.themes.reduce((n,t)=>n+t.shots.length,0)} Classic/Plus pairs`);

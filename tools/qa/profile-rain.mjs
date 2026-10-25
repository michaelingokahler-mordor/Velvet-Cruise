import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {rendererModule,loadBanks} from './plus-render-support.mjs';
const output=resolve('output/plus/rain-profile'),m=await rendererModule(output),banks=loadBanks(m),report=[];
for(const mode of ['classic','plus']){
 const r=new m.Race(new m.Track([0,5,6,11,13]));r.warp(1,1000);r.state='race';r.speed=m.MAX_SPEED*.8;
 const context=m.createRenderContext(mode),painter=new m.Renderer(context,banks[mode]),calls={};
 for(const key of ['background','prepareLights','groundLights','segSprites','weather','rain']){
  const original=painter[key];painter[key]=function(...args){const start=performance.now();const value=original.apply(this,args);const row=calls[key]??(calls[key]={ms:0,count:0});row.ms+=performance.now()-start;row.count++;return value;};
 }
 const frames=[];
 for(let frame=0;frame<180;frame++){
  r.update(1/60,r.autopilot(1/60,.8));painter.time=frame/60;const start=performance.now();painter.render(r);frames.push(performance.now()-start);
 }
 const sorted=frames.slice(30).sort((a,b)=>a-b);
 report.push({mode,coldFrames:frames.slice(0,16),warmMedian:sorted[75],warmP95:sorted[142],methods:calls,visibleLamps:painter.lampSources.length,visibleHeadlights:painter.headSources.length});
}
writeFileSync(resolve(output,'render-rain.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

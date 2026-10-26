import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {rendererModule,loadBanks,saveFrame} from './plus-render-support.mjs';
const out=resolve('output/road-effects/gallery'),m=await rendererModule(out),banks=loadBanks(m);
const {drawWindIndicator}=createRequire(import.meta.url)(resolve('output/road-effects/hud.cjs'));
const scenes={coast:{path:[0,1,2,3,4],stage:0,at:301},lake:{path:[0,5,6,7,13],stage:4,at:900},inland:{path:[0,5,8,9,10],stage:2,at:900}};
const report=[];
for(const mode of ['classic','plus']){
 const context=m.createRenderContext(mode),p=new m.Renderer(context,banks[mode]);
 for(const [name,scene]of Object.entries(scenes)){
  const r=new m.Race(new m.Track(scene.path));r.warp(scene.stage,scene.at);r.state='race';r.cars=[];r.carsBySeg.clear();
  const draw=p.sailboat.bind(p);let calls=0;p.sailboat=(...args)=>{calls++;draw(...args);};
  for(const time of [0,2,4]){
   calls=0;p.time=time;const seed=r.seed;p.render(r);assert.equal(r.seed,seed);assert.ok(calls<=1);if(name!=='coast')assert.equal(calls,0);
   saveFrame(context.fb,resolve(out,`${mode}-${name}-${time}.png`));
   if(name==='coast'){
    const before=context.fb.data.slice();p.sailboat=()=>{};p.render(r);let changed=0;for(let i=0;i<before.length;i++)if(before[i]!==context.fb.data[i])changed++;
    assert.ok(changed>3,'the depth pass must actually display the boat');report.push({mode,time,visibleBoatPixels:changed});
    p.sailboat=(...args)=>{calls++;draw(...args);};
   }
  }
  p.sailboat=draw;
 }
 const wind=new m.Race(new m.Track([0,5,8,9,10]));wind.warp(2,1200);wind.state='race';wind.cars=[];wind.carsBySeg.clear();
 for(const [name,side,forward]of [['calm',0,0],['right',.46,0],['left',-.46,0],['tail',0,1],['head',0,-1],['diagonal',.32,.7]]){
  wind.gust=side;wind.windForward=forward;p.time=.1;p.render(wind);drawWindIndicator(context.logical,wind,.1);saveFrame(context.fb,resolve(out,`${mode}-wind-${name}.png`));
 }
}
writeFileSync(resolve(out,'report.json'),JSON.stringify({status:'PASS',boat:report,lake:'calm water, no boat',inland:'no boat',rng:'unchanged'},null,2));console.log('PASS gallery: both profiles, waves/boat motion, calm lake, inland and six wind directions');

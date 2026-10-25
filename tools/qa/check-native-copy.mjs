import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {rendererModule} from './plus-render-support.mjs';
const out=resolve('output/plus/rain-profile'),m=await rendererModule(out);
const context=m.createRenderContext('plus'),painter=new m.Renderer(context,{get:()=>undefined});
let lightCalls=0;context.fb.lightTrap=()=>lightCalls++;
painter.headSources=[{z:0,x:0,slope:0,br:0,from:2,to:10,gain:1}];
painter.lampSources=[{z:1500,x:0,slope:0,br:0,radius:3300,gain:1}];
painter.camX=0;
painter.groundLights({i:5,Y1:160.7,Y2:160.55,S1:.01,S2:.009,W1:29,W2:26,cx1:0,cx2:0,oC1:0,oC2:0});
assert.equal(lightCalls,0,'A segment containing no native pixel row must not prepare any light trapezoids');
const source={w:1280,h:160,density:2,data:Uint32Array.from({length:1280*160},(_,i)=>i%9?m.rgb((i*7919)&0xffffff):0)};
function legacy(target,source,offX,dstY,opaque){
 const top=Math.round(dstY*2),bottom=Math.ceil(top+source.h),off=Math.floor(offX)*2;
 for(let y=Math.max(0,top);y<Math.min(target.h,bottom);y++)for(let x=0;x<target.w;x++){
  const sx=((x+off)%source.w+source.w)%source.w,p=source.data[(y-top)*source.w+sx];
  if(opaque||(p>>>24))target.data[y*target.w+x]=p;
 }
}
for(const opaque of [true,false])for(const offset of [-641.3,-2.2,0,31.8,1291])for(const y of [-6.7,0,82.25]){
 const a=new m.FB(640,360),b=new m.FB(640,360);a.clear(m.rgb(0x124352));b.clear(m.rgb(0x124352));
 legacy(a,source,offset,y,opaque);new m.ScaledSurface(b,2).layer(source,offset,y,opaque);assert.deepEqual(a.data,b.data,'Native layer pixels/wrap/clipping');
}
const a=new m.FB(640,360),b=new m.FB(640,360),surface=new m.ScaledSurface(b,2);
const candidate=()=>surface.layer(source,160,0,true),reference=()=>legacy(a,source,160,0,true);
for(let i=0;i<3;i++){candidate();reference();}
const time=fn=>{const start=performance.now();for(let i=0;i<100;i++)fn();return performance.now()-start;};
const referenceMs=time(reference),candidateMs=time(candidate),speedup=referenceMs/candidateMs;
const report={samples:100,source:[1280,160],referenceMs,candidateMs,speedup,lightCalls};
writeFileSync(resolve(out,'native-copy.json'),JSON.stringify(report,null,2));console.log(report);
assert.ok(speedup>=2,'Native opaque layers must avoid the per-pixel resampling cost');
console.log('PASS native layer raster equivalence, copy performance and subpixel light culling');

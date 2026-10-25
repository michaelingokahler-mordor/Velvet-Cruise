import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {rendererModule,loadBanks} from './plus-render-support.mjs';
const out=resolve('output/plus/rain-profile'),m=await rendererModule(out),banks=loadBanks(m);
const lens=[0x3c0a1e,0x5e1226,0x7e1c30,0xb33a48].map(h=>m.rgb(h)&0xffffff),on=[0xb0182a,0xe8302a,0xff6040,0xffb890].map(m.rgb),halo=[0x5a160e,0x3a0c08,0x1c0604].map(m.rgb);
// Frozen pre-optimization oracle: exact old Chebyshev halo and source anchor.
function legacy(s){
 const{w,h}=s,density=s.density??1,radius=3*density,gw=w+2*radius,tail=new Uint32Array(w*h),mask=new Uint8Array(w*h),glow=new Uint32Array(gw*h);let n=0;
 for(let i=0;i<w*h;i++){if(!(s.data[i]>>>24))continue;const k=lens.indexOf(s.data[i]&0xffffff);if(k>=0){tail[i]=on[k];mask[i]=1;n++;}}
 if(!n)return null;
 for(let y=0;y<h;y++)for(let x=0;x<gw;x++){
  let best=99;
  for(let dy=-radius;dy<=radius&&best>0;dy++){
   const yy=y+dy;if(yy<0||yy>=h)continue;
   for(let dx=-radius;dx<=radius;dx++){
    const xx=x-radius+dx;if(xx<0||xx>=w||!mask[yy*w+xx])continue;
    best=Math.min(best,Math.max(Math.abs(dx),Math.abs(dy)));
   }
  }
  if(best===0)glow[y*gw+x]=halo[0];else if(best<=radius)glow[y*gw+x]=halo[Math.floor((best-1)/density)];
 }
 return {tail:{w,h,density,data:tail},glow:{w:gw,h,density,data:glow}};
}
const names=['player_straight_0','player_roof3_left_1','player_closed_right_0','truck_white'];
for(const mode of ['classic','plus'])for(const name of names){
 const s=banks[mode].get(name);assert.ok(s,name);const actual=m.carLights({get:()=>s},name),expected=legacy(s);assert.deepEqual(actual,expected,mode+' '+name);
}
const s=banks.plus.get('player_straight_0');assert.ok(legacy(s));
// Compare on the same device, with fresh cache owners for every cold pose.
const candidate=()=>m.carLights({get:()=>s},'fresh'),reference=()=>legacy(s);
for(let i=0;i<4;i++){candidate();reference();}
const measure=fn=>{const start=performance.now();for(let i=0;i<16;i++)fn();return performance.now()-start;};
const referenceMs=measure(reference),candidateMs=measure(candidate),speedup=referenceMs/candidateMs;
const report={source:[s.w,s.h],samples:16,referenceMs,candidateMs,speedup,oracle:'exact tail/glow pixels, size, density and anchor for both profiles'};
writeFileSync(resolve(out,'cold-lights.json'),JSON.stringify(report,null,2));console.log(report);
assert.ok(speedup>=2,'Cold native light construction must be at least twice as fast as the brute-force oracle');
console.log('PASS exact light-generation pixels and cold-pose performance');

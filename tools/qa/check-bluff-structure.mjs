import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require=createRequire(import.meta.url);
const old=require('../../output/coral-bluffs/structure-before/renderer.cjs');
const now=require('../../output/coral-bluffs/after/renderer.cjs');
const textured=require('../../output/coral-bluffs/mountains-before/renderer.cjs');
// esbuild may rename the local width variable after unrelated helpers are added.
const localNames=fn=>fn.toString().replace(/\bwidth\d*\b/g,'width');
assert.equal(localNames(now.Renderer.prototype.coveLand),localNames(textured.Renderer.prototype.coveLand),'keep the new near-cliff texture');
const a=new old.Track(),b=new now.Track();
let roughened=0,plots=0;
for(const s of b.segs) {
  const previous=a.segs[s.i];
  if(!s.bluffs) {assert.deepEqual(s.cove,previous.cove);continue;}
  const c=s.bluffs,p=previous.bluffs;
  assert.deepEqual(c.plot,p.plot,'house ground must not change');
  if(c.plot) {plots++;assert.deepEqual(c.points,p.points);}
  c.points.forEach((point,i)=>{
    if(i!==1 || c.spur<=.18) assert.deepEqual(point,p.points[i],'only the exposed cutting crest may change');
    else {assert.ok(Math.abs(point.x-p.points[i].x)<=75);assert.ok(Math.abs(point.h-p.points[i].h)<=200);roughened++;}
  });
}
globalThis.ImageData=class {constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
const fb=new now.FB(),target=new now.FB(),renderer=new now.Renderer(fb,{get:()=>undefined});
const sentinel=now.rgb(0x193b25);fb.clear(sentinel);target.clear(sentinel);
renderer.bluffsBackdrop(target,37);
const first=target.data.slice();
assert.ok(fb.data.every(p=>p===sentinel),'backdrop must use the transition buffer');
assert.ok(target.data.slice(80*320).every(p=>p===sentinel),'mountains must not write below the horizon');
renderer.time=27;target.clear(sentinel);renderer.bluffsBackdrop(target,37);
assert.deepEqual(target.data,first,'stationary texture must not sparkle over time');
target.clear(sentinel);renderer.bluffsBackdrop(target,37+640);
assert.deepEqual(target.data,first,'panorama wrap must be seamless');
const previousTarget=new old.FB(),previousRenderer=new old.Renderer(new old.FB(),{get:()=>undefined});
const offsets=[-220.5,0,37,195,639.7,677];
for(const offset of offsets) {
  target.clear(sentinel);previousTarget.clear(sentinel);
  renderer.bluffsBackdrop(target,offset);previousRenderer.bluffsBackdrop(previousTarget,offset);
  assert.deepEqual(target.data,previousTarget.data,'distant mountains must exactly match the first Coral redesign');
}
const result={status:'PASS',roughenedCrestSegments:roughened,unchangedPlotSegments:plots,rockFoot:'unchanged',openHills:'unchanged',nearCliffTexture:'unchanged',backdrop:'original restored pixel-exactly, stable, seamless, transition-buffer isolated',comparedBackdropOffsets:offsets};
writeFileSync('output/coral-bluffs/after/structure-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

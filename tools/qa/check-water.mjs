import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url);
const output=resolve(process.argv[2] || 'output/palm-cove/after');
globalThis.ImageData=class { constructor(w,h) { this.data=new Uint8ClampedArray(w*h*4); } };
const {FB,Renderer,THEMES,rgb}=require(resolve(output,'renderer.cjs'));
const fb=new FB(), scratch=new FB(), renderer=new Renderer(fb,{get:()=>undefined});
const th=THEMES[0], sentinel=rgb(0x193b25);
const reflected=c=>c===th.glitter || c===th.glitter2;
fb.clear(sentinel);
renderer.background(scratch,th,160,160,235);
assert.ok(fb.data.every(c=>c===sentinel),'drawing a transition background must not write into the main frame');
assert.ok(scratch.data.some(reflected),'reflection must be present in the requested background');
assert.ok(!scratch.data.slice(0,80*320).some(reflected),'reflection must remain below the horizon');
renderer.background(scratch,{...th,side:'land'},160,160,235);
assert.ok(!scratch.data.some(reflected),'inland background must not receive sea reflections');

// A sun column entirely behind the shore must be fully hidden. It must not
// be translated onto the first visible water pixel when clipping the dashes.
fb.clear(sentinel);
renderer.seaTrap(80,290,115,290,th.seaA,th.glitter,th.glitter2,100,0,0);
const wavesWithoutReflection = fb.data.slice();
renderer.seaTrap(80,290,115,290,th.seaA,th.glitter,th.glitter2,100,1,0);
for(let y=80;y<115;y++) for(let x=0;x<320;x++)
  assert.equal(fb.data[y*320+x],wavesWithoutReflection[y*320+x],'hidden reflection leaked onto the shore');

let clippingCases=0;
for(const sun of [-10,235,325]) for(const time of [0,3,7]) {
  fb.clear(sentinel);
  renderer.glints(fb,94,sun,38,1,th.glitter,th.glitter2,time,14,0);
  const full=fb.data.slice();
  for(const edge of [0,210,250,320]) {
    fb.clear(sentinel);
    renderer.glints(fb,94,sun,38,1,th.glitter,th.glitter2,time,14,edge);
    for(let i=0;i<fb.data.length;i++)
      assert.equal(fb.data[i],i>=94*320+edge && i<95*320 ? full[i] : sentinel,'reflection clipping changed its position or wrote outside the row');
    clippingCases++;
  }
}
const samples=JSON.parse(readFileSync(resolve(output,'water-reflections.json')));
assert.ok(samples.every(s=>s.visibleReflectionPixels>=12),'sunlit water must show reflections throughout the sampled cycle');
assert.ok(new Set(samples.map(s=>s.visibleReflectionPixels)).size>3,'reflections must change over time');
const result={status:'PASS',transitionTarget:'isolated',inland:'no sea glints',shoreClipping:'no relocated glints',clippingCases,animatedFrames:samples.length,visibleReflectionPixels:{min:Math.min(...samples.map(s=>s.visibleReflectionPixels)),max:Math.max(...samples.map(s=>s.visibleReflectionPixels))}};
writeFileSync(resolve(output,'water-validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));

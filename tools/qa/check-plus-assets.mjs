import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PNG}=require('pngjs');
const release=process.argv.includes('--release');
const manifest=JSON.parse(readFileSync('assets/plus/manifest.json'));
const classic=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
assert.equal(manifest.version,1);
assert.ok(manifest.atlases.length>0,'Pilot needs real native Plus art');
const frames=new Map();
for(const page of manifest.atlases){
 const atlas=JSON.parse(readFileSync('assets/plus/'+page.data)),png=PNG.sync.read(readFileSync('assets/plus/'+page.image));
 assert.ok(png.width<=2048&&png.height<=2048,'Atlas pages must bound decoding memory');
 for(const[name,f]of Object.entries(atlas.frames)){
  assert.ok(!frames.has(name),'Duplicate '+name);assert.equal(f.density,2,name+' density');
  assert.equal(f.anchor,'bottom-center',name+' anchor');
  assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=png.width&&f.y+f.h<=png.height,name+' bounds');
  if(classic[name]){assert.equal(f.w,classic[name].w*2,name+' width');assert.equal(f.h,classic[name].h*2,name+' height');}
  const pixels=new Uint32Array(f.w*f.h);let fine=0,opaque=0;
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
   const i=((f.y+y)*png.width+f.x+x)*4,a=png.data[i+3];
   assert.ok(a===0||a===255,name+' binary alpha');
   const p=png.data.readUInt32LE(i);pixels[y*f.w+x]=p;if(a)opaque++;
   if(a&&(x%2||y%2)&&p!==pixels[(y&~1)*f.w+(x&~1)])fine++;
  }
  if(!/(_brake_|roof_mask)/.test(name))assert.ok(fine>0,name+' must contain native detail');
  assert.ok(opaque>0,name+' empty');frames.set(name,{...f,pixels});
 }
}
const pilotNames=['player_straight_0','player_left_1','player_right_0','player_empty','player_closed_straight_0','player_roof6_straight_1','palm_a','palm_h','bush_a','cove_villa_a','cove_rock_a','cove_tuft_a'];
for(const name of pilotNames)assert.ok(frames.has(name),'Missing pilot art '+name);
const protectedRects=JSON.parse(readFileSync('tools/qa/fixtures/garage-roof-protected.json')).cars;
for(const prefix of Object.keys(protectedRects))for(const view of ['straight','left','right'])for(const frame of [0,1]){
 const open=frames.get(`${prefix}_${view}_${frame}`);if(!open)continue;
 for(const suffix of ['roof1','roof2','roof3','roof4','roof5','roof6','closed']){
  const name=`${prefix}_${suffix}_${view}_${frame}`,closed=frames.get(name);assert.ok(closed,'Missing roof '+name);
  for(const[x0,y0,x1,y1]of protectedRects[prefix][view])for(let y=y0*2;y<(y1+1)*2;y++)for(let x=x0*2;x<(x1+1)*2;x++){
   assert.equal(closed.pixels[y*closed.w+x],open.pixels[y*open.w+x],name+' protected body '+x+','+y);
  }
 }
}
for(const[name,entry]of Object.entries(manifest.images)){
 assert.equal(entry.density,2,name+' image density');assert.ok(existsSync('assets/plus/'+entry.file));
 const image=PNG.sync.read(readFileSync('assets/plus/'+entry.file));
 const baseName=name.startsWith('ending_bg')?name.replace('ending_bg','ending'):name;
 const old=PNG.sync.read(readFileSync('assets/bg/'+baseName+'.png'));
 assert.equal(image.width,old.width*2,name+' width');assert.equal(image.height,old.height*2,name+' height');
}
assert.ok(manifest.images.sky_s1&&manifest.images.far_s1,'Native Palm Cove backgrounds');
for(const name of Object.keys(classic))assert.ok(frames.has(name)||manifest.reuse.includes(name),'Uncovered '+name);
assert.deepEqual([...manifest.requiredSprites].sort(),Object.keys(classic).sort(),'Complete inventory');
for(const name of manifest.reuse){assert.ok(!frames.has(name),'Duplicate replacement '+name);if(release)assert.match(name,/^(icon_|wx_)/,'Unexpected release fallback '+name);}
if(release){assert.equal(manifest.complete,true);assert.equal(Object.keys(manifest.images).length,36);}
else assert.equal(manifest.complete,false,'Pilot must stay development-only');
console.log(`PASS Plus ${release?'release':'pilot'} assets: ${frames.size} native sprites, ${Object.keys(manifest.images).length} backgrounds, ${manifest.reuse.length} declared replacements`);

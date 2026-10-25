// Pixel checks through the actual game renderer and the packed shipping atlas.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('output/garage-weather'); mkdirSync(out,{recursive:true});
await build({stdin:{contents:['core/fb','core/materials','game/track','game/race','game/render','game/cars','game/config'].map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:resolve(out,'gallery.cjs'),define:{__DEMO_A__:'false','import.meta.env.VITE_LOCAL_SERVICES':'"false"'}});
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
const require=createRequire(import.meta.url),{PNG}=require('pngjs');
const m=require(resolve(out,'gallery.cjs'));
const png=p=>PNG.sync.read(readFileSync(p));
const atlas=png('assets/sprites/atlas.png'),frames=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
const sprites=new Map();
for(const [name,f] of Object.entries(frames)){
  const data=new Uint32Array(f.w*f.h);
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
    const o=((f.y+y)*atlas.width+f.x+x)*4,[r,g,b,a]=atlas.data.subarray(o,o+4);
    if(a>=128)data[y*f.w+x]=(((f.emissive&&m.emissivePixel(name,r,g,b,x,y,f.w,f.h)?254:255)<<24)|(b<<16)|(g<<8)|r)>>>0;
  }
  sprites.set(name,{w:f.w,h:f.h,data});
}
for(const file of ['sky_s1','far_s1','sky_s6','far_s6','sky_s12','far_s12','sky_s7','far_s7','sky_s14','far_s14']){
  const p=png('assets/bg/'+file+'.png'),data=new Uint32Array(p.width*p.height);
  for(let i=0;i<data.length;i++){const o=i*4;if(p.data[o+3]>=128)data[i]=((255<<24)|(p.data[o+2]<<16)|(p.data[o+1]<<8)|p.data[o])>>>0;}
  sprites.set(file,{w:p.width,h:p.height,data});
}
const bank={get:name=>sprites.get(name),has:name=>sprites.has(name)};
function save(fb,name){const p=new PNG({width:320,height:180});p.data=Buffer.from(fb.img.data);writeFileSync(resolve(out,name),PNG.sync.write(p));return p;}
function copy(source,dest,dx,dy){for(let y=0;y<source.height;y++)source.data.copy(dest.data,((dy+y)*dest.width+dx)*4,y*source.width*4,(y+1)*source.width*4);}
const track=new m.Track([0,5,6,11,13]);
const protection=JSON.parse(readFileSync('tools/qa/fixtures/garage-roof-protected.json')).cars;
let comparisons=0,bodyPixelDifferences=0,protectedPixelDifferences=0;
for(const car of m.CARS)for(const [view,steer]of [['straight',0],['left',-1],['right',1]])for(const frame of [0,1])for(const brake of [false,true])for(const night of [false,true]){
  const race=new m.Race(track);race.skin=car.skin;race.steer=steer;race.hairT=frame;race.braking=brake;
  race.stageBlend={from:night?5:0,to:night?5:0,t:0};
  const nativeMask=sprites.get(car.skin+'_roof_mask_'+view);
  assert.ok(nativeMask,'Mask must be in shipping atlas');
  const capture=position=>{race.roof.position=position;const fb=new m.FB();fb.clear(m.rgb(0x757585));race.drawPlayer(fb,bank,[.8,.8,.8]);return fb;};
  const original=capture(0),cx=race.carScreenX(),by=race.carScreenY();
  const x0=Math.ceil(cx-44-.5),y0=Math.ceil(by-48-.5);
  for(const position of [1/7,2/7,3/7,4/7,5/7,6/7,1]){
    const other=capture(position);
    for(let y=0;y<180;y++)for(let x=0;x<320;x++){
      const sx=x-x0,sy=y-y0;
      const allowed=sx>=0&&sx<88&&sy>=0&&sy<48&&(nativeMask.data[sy*88+sx]>>>24)>0;
      if(!allowed&&original.data[y*320+x]!==other.data[y*320+x])bodyPixelDifferences++;
      const protectedPixel=protection[car.skin][view].some(([l,t,r,b])=>sx>=l&&sx<=r&&sy>=t&&sy<=b);
      if(protectedPixel&&original.data[y*320+x]!==other.data[y*320+x])protectedPixelDifferences++;
    }
    comparisons++;
  }
}
assert.equal(bodyPixelDifferences,0,'Actual renderer moved or recolored pixels outside the cockpit');
assert.equal(protectedPixelDifferences,0,'Actual renderer erased independently protected chassis/mirror pixels');
const sceneGallery=new PNG({width:320*4,height:180*6});
const scenes=[];
for(let row=0;row<m.CARS.length;row++)for(const [col,stage,closed]of [[0,0,false],[1,1,true],[2,3,true],[3,4,false]]){
  const car=m.CARS[row],r=new m.Race(track);r.skin=car.skin;r.warp(stage,600);r.speed=12000;r.hairT=1;
  assert.equal(r.roof.phase,closed?7:0);
  const fb=new m.FB(),renderer=new m.Renderer(fb,bank);renderer.time=12;renderer.render(r);
  const file=car.id+'-'+['dry','rain','snow','dry-return'][col]+'.png';
  copy(save(fb,file),sceneGallery,col*320,row*180);scenes.push({car:car.id,stage,roof:r.roof.phase,file});
}
writeFileSync(resolve(out,'in-game-gallery.png'),PNG.sync.write(sceneGallery));
// Drive the real simulation across each incoming/outgoing weather blend.
const boundaries=[];
for(const car of m.CARS)for(const col of [1,2,3,4]){
  const boundaryTrack=new m.Track([0,5,6,11,13]);
  const r=new m.Race(boundaryTrack);r.skin=car.skin;r.warp(col-1,200);r.state='race';r.timer=1000;
  const expectedClose=col===1||col===3;
  r.roof.reset(expectedClose?0:1);
  const samples=[];
  const boundary=boundaryTrack.themeStart(col)-1;
  for(let i=-25;i<=300;i++){
    r.position=(boundary+i)*m.SEG_LEN-m.PLAYER_Z;r.speed=0;r.playerX=[-.5,.5,-.5,.5][col-1];
    r.update(1/60,{steer:0,throttle:0,brake:0});
    if(samples.at(-1)?.phase!==r.roof.phase)samples.push({i,phase:r.roof.phase,position:r.roof.position,x:r.carScreenX(),y:r.carScreenY()});
  }
  assert.equal(r.roof.phase,expectedClose?7:0);
  assert.deepEqual(samples.map(s=>s.phase),expectedClose?[0,1,2,3,4,5,6,7]:[7,6,5,4,3,2,1,0]);
  boundaries.push({car:car.id,column:col,samples});
}
// Actual crash event must retain the couple under a closed roof.
for(const car of m.CARS)for(const phase of [0,1,2,3,4,5,6,7]){
  const closed=phase>0;
  const r=new m.Race(track);r.skin=car.skin;r.warp(closed?1:2,500);r.state='race';r.timer=1000;
  r.roof.position=phase/7;
  const frozen=r.roof.position;
  const land=[];r.events.tumbleLand=who=>land.push(who);r.forceTumble();
  for(let i=0;i<100;i++)r.update(1/60,{steer:0,throttle:0,brake:0});
  assert.equal(r.roof.position,frozen,'Tumble must freeze current folding pose');
  assert.equal(land.includes('people'),!closed,'People must not eject through closed canvas');
  assert.equal(r.ladyHead()===null,closed);
  const fb=new m.FB();new m.Renderer(fb,bank).render(r);save(fb,car.id+'-crash-phase'+phase+'.png');
}
const report={status:'PASS',renderComparisons:comparisons,bodyPixelDifferences,protectedPixelDifferences,scenes,boundaries,crash:'all 48 car/pose combinations: frozen pose; open ejection retained; enclosed occupants stay inside'};
writeFileSync(resolve(out,'render-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:'PASS',renderComparisons:comparisons,bodyPixelDifferences,protectedPixelDifferences,boundaries:boundaries.length,scenes:scenes.length}));

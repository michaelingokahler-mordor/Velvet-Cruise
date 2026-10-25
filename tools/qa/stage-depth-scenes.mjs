// Paired detail views at identical world positions, plus the two headlight pulses.
import {createRequire} from 'node:module';
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{resolve}from'node:path';
const require=createRequire(import.meta.url),{PNG}=require('pngjs');
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
const root=resolve('output/stage-depth'),current=require(resolve(root,'after/renderer.cjs'));
const previous=require(resolve(root,'before/renderer.cjs'));
const frames=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
function bankFor(mod,folder){
 const map=new Map(),atlas=PNG.sync.read(readFileSync(resolve(folder,'assets/sprites/atlas.png')));
 for(const[name,f]of Object.entries(frames)){
  const data=new Uint32Array(f.w*f.h);
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
   const o=((f.y+y)*atlas.width+f.x+x)*4,[r,g,b,a]=atlas.data.subarray(o,o+4);
   if(a>=128)data[y*f.w+x]=((f.emissive&&mod.emissivePixel(name,r,g,b,x,y,f.w,f.h)?254:255)<<24|b<<16|g<<8|r)>>>0;
  }
  const s={w:f.w,h:f.h,data};if(f.w>=24&&f.h>=24&&!/^(car_|player|coupe_|sports_|beetle_|pickup_|van_|truck_|icon_)/.test(name)){s.mip=mod.halve(s);if(s.mip.w>=12&&s.mip.h>=12)s.mip.mip=mod.halve(s.mip);}map.set(name,s);
 }
 for(const name of new Set(mod.THEMES.flatMap(t=>[t.sky,t.far]))){
  const p=PNG.sync.read(readFileSync(resolve(folder,`assets/bg/${name}.png`)));
  map.set(name,{w:p.width,h:p.height,data:new Uint32Array(p.data.buffer.slice(p.data.byteOffset,p.data.byteOffset+p.data.byteLength))});
 }
 return{get:n=>map.get(n),has:n=>map.has(n)};
}
const banks={before:bankFor(previous,resolve(root,'source-before')),after:bankFor(current,'.')};
const data=JSON.parse(readFileSync(resolve(root,'after/audit-data.json'))),specs=[];
for(const node of [4,6,12]){
 const rec=data.stages.find(s=>s.node===node),track=new current.Track(rec.path),st=track.stages.find(s=>s.node===node);
 const plots=track.segs.filter(s=>s.theme===node&&s.landscape?.left.plot?.houseSegment===s.i&&
  (node===12?s.i<st.endSeg&&s.i>st.endSeg-1700:(s.landscape.left.plotBand??1)>1));
 for(const s of plots.filter((_,i)=>i%Math.max(1,Math.floor(plots.length/4))===0).slice(0,4))
  specs.push({node,path:rec.path,at:s.i-st.startSeg-95,tag:`settlement-${s.i}`});
}
for(const[node,fraction]of [[3,.84],[3,.94],[7,.25],[11,.28],[13,.70],[14,.94],[12,.98]]){
 const r=data.stages.find(s=>s.node===node);specs.push({node,path:r.path,at:Math.round((r.endSeg-r.startSeg)*fraction),tag:`detail-${fraction}`});
}
const shots=[];
for(const spec of specs){
 const file=`${current.THEMES[spec.node].id}-${spec.tag}.png`;
 for(const[version,mod]of [['before',previous],['after',current]]){
  const t=new mod.Track(spec.path),r=new mod.Race(t),fb=new mod.FB(),renderer=new mod.Renderer(fb,banks[version]);
  r.warp(spec.path.indexOf(spec.node),spec.at);r.state='race';r.speed=mod.MAX_SPEED*.78;r.stageBlend={from:spec.node,to:spec.node,t:1};
  renderer.time=30;renderer.render(r);
  const out=resolve(root,version,'details');mkdirSync(out,{recursive:true});const p=new PNG({width:320,height:180});p.data=Buffer.from(fb.img.data);writeFileSync(resolve(out,file),PNG.sync.write(p));
 }
 shots.push({...spec,file});
}
const rec=data.stages.find(s=>s.node===4),t=new current.Track(rec.path),r=new current.Race(t),fb=new current.FB(),ren=new current.Renderer(fb,banks.after);
r.warp(4,rec.shots.find(p=>p.tag==='view-07').segment-rec.startSeg);r.state='race';r.stageBlend={from:4,to:4,t:1};r.cars=[];
r.signal();for(const[label,time]of [['normal',0],['pulse-1',.65],['gap',.46],['pulse-2',.34]]){
 r.signalT=time;ren.time=30;ren.render(r);const p=new PNG({width:320,height:180});p.data=Buffer.from(fb.img.data);writeFileSync(resolve(root,'after/details',`headlights-${label}.png`),PNG.sync.write(p));
}
writeFileSync(resolve(root,'details.json'),JSON.stringify(shots,null,2));
console.log(JSON.stringify({pairedDetails:shots.length,headlightFrames:4}));

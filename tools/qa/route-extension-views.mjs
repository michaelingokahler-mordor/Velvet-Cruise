// Actual 320x180 game rendering at the approach, bend and exit of all additions.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{PNG}=require('pngjs');
globalThis.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const out=resolve('output/route-balance'),m=require(resolve(out,'after.cjs'));
const frames=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
const sprites=new Map(),atlas=PNG.sync.read(readFileSync('assets/sprites/atlas.png'));
for(const [name,f] of Object.entries(frames)){
 const data=new Uint32Array(f.w*f.h);
 for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
  const o=((f.y+y)*atlas.width+f.x+x)*4,[r,g,b,a]=atlas.data.subarray(o,o+4);
  if(a>=128)data[y*f.w+x]=((f.emissive&&m.emissivePixel(name,r,g,b,x,y,f.w,f.h)?254:255)<<24|b<<16|g<<8|r)>>>0;
 }
 const spr={w:f.w,h:f.h,data};
 if(f.w>=24&&f.h>=24&&!/^(car_|player|coupe_|sports_|beetle_|pickup_|van_|truck_|icon_)/.test(name)){spr.mip=m.halve(spr);if(spr.mip.w>=12&&spr.mip.h>=12)spr.mip.mip=m.halve(spr.mip);}
 sprites.set(name,spr);
}
for(const name of new Set(m.THEMES.flatMap(t=>[t.sky,t.far]))){
 const p=PNG.sync.read(readFileSync(`assets/bg/${name}.png`));sprites.set(name,{w:p.width,h:p.height,data:new Uint32Array(p.data.buffer.slice(p.data.byteOffset,p.data.byteOffset+p.data.byteLength))});
}
const bank={get:n=>sprites.get(n),has:n=>sprites.has(n)};
const strings=JSON.parse(readFileSync('assets/ui/strings.json')).strings;
const label=id=>strings.find(s=>s.id===id)?.text??id;
const paths=[];function visit(p){const n=m.NEXT[p.at(-1)];if(n.length)n.forEach(x=>visit([...p,x]));else paths.push(p);}visit([0]);
const folder=resolve(out,'views');mkdirSync(folder,{recursive:true});
const shots=[],sheets=[0,1,2].map(()=>new PNG({width:960,height:900}));
for(let node=0;node<15;node++){
 const path=paths.find(p=>p.includes(node)),track=new m.Track(path),stage=track.stages.find(s=>s.node===node),x=stage.extension,e=m.STAGE_EXTENSIONS[node];
 const points=[['approach',x.start-90],['bend',x.start+e.enter+Math.round(e.hold*.35)],['exit',x.bendEnd+30]];
 for(let col=0;col<points.length;col++){
  const[tag,position]=points[col],race=new m.Race(track),fb=new m.FB(),renderer=new m.Renderer(fb,bank);
  race.warp(stage.index,position-stage.startSeg);race.state='race';race.speed=m.MAX_SPEED*.9;race.cars=[];race.carsBySeg.clear();race.stageBlend={from:node,to:node,t:1};
  renderer.label=label;renderer.time=35;renderer.render(race);
  const png=new PNG({width:320,height:180});png.data=Buffer.from(fb.img.data);
  const file=`${String(node+1).padStart(2,'0')}-${m.THEMES[node].id}-${tag}.png`;writeFileSync(resolve(folder,file),PNG.sync.write(png));
  const sheet=sheets[Math.floor(node/5)],row=node%5;
  PNG.bitblt(png,sheet,0,0,320,180,col*320,row*180);
  shots.push({node,stage:label(m.THEMES[node].nameKey),tag,file,position,path});
 }
}
for(let i=0;i<sheets.length;i++)writeFileSync(resolve(out,`extension-sheet-${i+1}.png`),PNG.sync.write(sheets[i]));
const html=`<!doctype html><html lang="de"><meta charset="utf-8"><title>Velvet Cruise – Streckenergänzungen</title><style>body{background:#120c24;color:#fff;font:16px system-ui;margin:30px}section{margin:30px 0}article{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0}img{width:480px;image-rendering:pixelated;max-width:95vw}figcaption{color:#d7c5e3}</style><h1>Streckenergänzungen</h1><p>Je Stage eine neue Kurve und Gerade. Anfahrt, Kurvenmitte und Ausfahrt aus der tatsächlichen Spielausgabe.</p>${Array.from({length:15},(_,node)=>`<section><h2>${shots.find(s=>s.node===node).stage}</h2><p>${m.STAGE_EXTENSIONS[node].description}</p><article>${shots.filter(s=>s.node===node).map(s=>`<figure><img src="views/${s.file}"><figcaption>${s.tag}</figcaption></figure>`).join('')}</article></section>`).join('')}</html>`;
writeFileSync(resolve(out,'Streckenergänzungen.html'),html);writeFileSync(resolve(out,'views-validation.json'),JSON.stringify({status:'PASS',stages:15,images:shots.length,shots},null,2));
console.log(JSON.stringify({status:'PASS',stages:15,images:shots.length}));

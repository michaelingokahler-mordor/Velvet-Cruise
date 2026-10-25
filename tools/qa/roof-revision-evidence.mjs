// Reproducible visual evidence from the actual renderer, with the old atlas from Git.
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{PNG}=require('pngjs');
globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
const m=require(resolve('output/garage-weather/gallery.cjs'));
const out=resolve('output/roof-revision');mkdirSync(out,{recursive:true});
const baseline='206260c';
const oldPng=PNG.sync.read(execFileSync('git',['show',baseline+':assets/sprites/atlas.png'],{maxBuffer:8e6}));
const oldFrames=JSON.parse(execFileSync('git',['show',baseline+':assets/sprites/atlas.json'])).frames;
function load(png,frames){
 const sprites=new Map();
 for(const[name,f]of Object.entries(frames)){
  const data=new Uint32Array(f.w*f.h);
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
   const i=((f.y+y)*png.width+f.x+x)*4,[r,g,b,a]=png.data.subarray(i,i+4);
   if(a>=128)data[y*f.w+x]=(((f.emissive&&m.emissivePixel(name,r,g,b,x,y,f.w,f.h)?254:255)<<24)|(b<<16)|(g<<8)|r)>>>0;
  }sprites.set(name,{w:f.w,h:f.h,data});
 }
 for(const name of ['sky_s6','far_s6']){
  const png=PNG.sync.read(readFileSync('assets/bg/'+name+'.png')),data=new Uint32Array(png.width*png.height);
  for(let i=0;i<data.length;i++){const k=i*4;data[i]=((255<<24)|(png.data[k+2]<<16)|(png.data[k+1]<<8)|png.data[k])>>>0;}
  sprites.set(name,{w:png.width,h:png.height,data});
 }return sprites;
}
const current=load(PNG.sync.read(readFileSync('assets/sprites/atlas.png')),JSON.parse(readFileSync('assets/sprites/atlas.json')).frames);
const old=load(oldPng,oldFrames);
const oldName=name=>name.replace(/_roof([1-6])(?=_)/,(_,n)=>['','_roof1','_roof2','_closed'][Math.round(Number(n)*3/7)]);
const bank=(sprites,legacy=false)=>({get:n=>sprites.get(legacy?oldName(n):n),has:n=>sprites.has(legacy?oldName(n):n)});
const banks=[bank(old,true),bank(current)];
function race(car){const r=new m.Race(new m.Track([0,5,6,11,13]));r.skin=car.skin;r.warp(1,600);r.speed=12000;r.cars=[];return r;}
function render(r,b,time){const fb=new m.FB(),renderer=new m.Renderer(fb,b);renderer.time=time;renderer.render(r);return Buffer.from(fb.img.data);}
function copy(src,dst,dx,dy,w=320,h=180){for(let y=0;y<h;y++)src.copy(dst.data,((dy+y)*dst.width+dx)*4,y*w*4,(y+1)*w*4);}
const gallery=new PNG({width:640,height:180*6});
for(let row=0;row<m.CARS.length;row++){
 const r=race(m.CARS[row]);r.hairT=1;
 for(let col=0;col<2;col++)copy(render(r,banks[col],12),gallery,col*320,row*180);
}writeFileSync(resolve(out,'game-before-after.png'),PNG.sync.write(gallery));
const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','640x360','-r','30','-i','pipe:0','-an','-vf','scale=1280:720:flags=neighbor','-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',resolve(out,'roof-before-after.mp4')],{stdio:['pipe','inherit','inherit'],windowsHide:true});
const cars=[m.CARS.find(c=>c.id==='rosso'),m.CARS.find(c=>c.id==='stallion')],races=cars.map(race);
for(let frame=0;frame<120;frame++){
 const canvas=new PNG({width:640,height:360});
 const position=frame<15?0:frame<35?(frame-15)/19:frame<65?1:frame<85?1-(frame-65)/19:0;
 for(let row=0;row<2;row++){
  const r=races[row];r.roof.position=position;r.hairT=frame/6;
  for(let col=0;col<2;col++)copy(render(r,banks[col],frame/30),canvas,col*320,row*180);
 }
 if(!ff.stdin.write(canvas.data))await once(ff.stdin,'drain');
}ff.stdin.end();const[code]=await once(ff,'exit');if(code)throw Error('ffmpeg failed: '+code);
writeFileSync(resolve(out,'evidence.json'),JSON.stringify({baseline,columns:['before','after'],videoRows:cars.map(c=>c.id),video:'roof-before-after.mp4',kind:'actual renderer study at fixed rain-stage position; browser tours separately verify natural weather transitions',fps:30,seconds:4},null,2));
console.log('PASS evidence: six before/after rain scenes; four-second folding comparison video');

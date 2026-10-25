// Moving samples from the actual software renderer, with original game assets.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const out = resolve('output/directional-weather-2026-10-25/gallery'); mkdirSync(out, { recursive: true });
await build({ stdin: { contents: ['core/fb','core/materials','game/race','game/track','game/render','game/themes','game/difficulty'].map(p => `export * from './src/${p}';`).join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: resolve(out, 'renderer.cjs') });
globalThis.ImageData = class { constructor(w,h) { this.data = new Uint8ClampedArray(w*h*4); } };
const require = createRequire(import.meta.url), { PNG } = require('pngjs');
const m = require(resolve(out, 'renderer.cjs')), sprites = new Map();
const frames = JSON.parse(readFileSync('assets/sprites/atlas.json')).frames, atlas = PNG.sync.read(readFileSync('assets/sprites/atlas.png'));
for (const [name,f] of Object.entries(frames)) {
  const data = new Uint32Array(f.w*f.h);
  for (let y=0;y<f.h;y++) for (let x=0;x<f.w;x++) {
    const i=((f.y+y)*atlas.width+f.x+x)*4,[r,g,b,a]=atlas.data.subarray(i,i+4);
    if(a>=128)data[y*f.w+x]=(((f.emissive&&m.emissivePixel(name,r,g,b,x,y,f.w,f.h)?254:255)<<24)|(b<<16)|(g<<8)|r)>>>0;
  }
  sprites.set(name,{w:f.w,h:f.h,data});
}
for(const name of new Set(m.THEMES.flatMap(t=>[t.sky,t.far]))) {
  const p=PNG.sync.read(readFileSync(`assets/bg/${name}.png`)),data=new Uint32Array(p.width*p.height);
  for(let i=0;i<data.length;i++){const k=i*4;if(p.data[k+3]>=128)data[i]=((255<<24)|(p.data[k+2]<<16)|(p.data[k+1]<<8)|p.data[k])>>>0;}
  sprites.set(name,{w:p.width,h:p.height,data});
}
const bank={get:n=>sprites.get(n),has:n=>sprites.has(n)};
const tr=new m.Track([0,5,8,9,10]),r=new m.Race(tr,false,0,m.DIFFS[1]);r.warp(2,1600);r.state='race';r.speed=27600*.8;r.playerX=0;r.cars=[];
const shots=[['ruhig',null,'Böenpause'],['gegenwind',Math.PI,'Gegenwind'],['rueckenwind',0,'Rückenwind'],['rechts',Math.PI/2,'Wind nach rechts'],['links',-Math.PI/2,'Wind nach links'],['diagonal',Math.PI/4,'Schräger Rückenwind']];
for(const [id,angle] of shots) {
  const dir=resolve(out,id);mkdirSync(dir,{recursive:true});const fb=new m.FB(),renderer=new m.Renderer(fb,bank);
  for(let i=0;i<36;i++) {
    renderer.time=(i+1)/12;
    const strength=angle===null?0:Math.sin(Math.PI*i/35);
    r.gust=angle===null?0:.46*Math.sin(angle)*strength;r.windForward=angle===null?0:Math.cos(angle)*strength;
    renderer.render(r);r.drawPlayer(fb,bank,[1,1,1]);
    const p=new PNG({width:320,height:180});p.data=Buffer.from(fb.img.data);
    writeFileSync(resolve(dir,`${String(i).padStart(3,'0')}.png`),PNG.sync.write(p));
  }
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','12','-i',resolve(dir,'%03d.png'),'-vf','scale=960:540:flags=neighbor','-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',resolve(out,`${id}.mp4`)]);
}
writeFileSync(resolve(out,'index.html'),`<!doctype html><html lang="de"><meta charset="utf-8"><title>Windrichtungen · Velvet Cruise</title><style>body{margin:32px;background:#171322;color:#eee;font:17px system-ui}main{display:grid;grid-template-columns:repeat(2,minmax(300px,1fr));gap:24px;max-width:1300px}video{width:100%;image-rendering:pixelated}h2{font-size:20px}p{max-width:1100px;line-height:1.5}</style><h1>Windrichtungen im echten Spielzeichner</h1><p>Jeder Clip zeigt eine weich auf- und abklingende Böe bei festgehaltener Fahrposition. Richtung und Stärke entsprechen dem Windvektor der Fahrphysik. Keine menschliche Fahrprobe.</p><main>${shots.map(([id,,name])=>`<section><h2>${name}</h2><video src="${id}.mp4" autoplay muted loop controls playsinline></video></section>`).join('')}</main></html>`);
console.log(JSON.stringify({status:'PASS',clips:shots.length,gallery:resolve(out,'index.html')}));

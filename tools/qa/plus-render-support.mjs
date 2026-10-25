import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
export const {PNG}=require('pngjs');
export async function rendererModule(output){
 mkdirSync(output,{recursive:true});
 const file=resolve(output,'native-renderer.mjs');
 await build({stdin:{contents:['core/fb','core/assets','core/materials','game/graphics','game/track','game/race','game/render','game/themes','game/routes','game/config'].map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,format:'esm',platform:'node'});
 globalThis.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
 globalThis.document={createElement:()=>({getContext:()=>({})})};
 return import(pathToFileURL(file));
}
export function loadBanks(m){
 const classic=new m.SpriteBank(),plus=new m.SpriteBank();
 function slice(bank,png,name,f){
  const data=new Uint32Array(f.w*f.h),density=f.density??1;
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
   const i=((f.y+y)*png.width+f.x+x)*4,[r,g,b,a]=png.data.subarray(i,i+4);if(a<128)continue;
   const alpha=f.emissive&&m.emissivePixel(name,r,g,b,x/density,y/density,f.w/density,f.h/density)?254:255;
   data[y*f.w+x]=((alpha<<24)|(b<<16)|(g<<8)|r)>>>0;
  }
  const s={w:f.w,h:f.h,data,density};
  if(f.w>=24&&f.h>=24&&!/^(cheer_|crash_|car_|coupe_|sports_|beetle_|pickup_|van_|truck_|trophy|icon_|wx_)/.test(name)){
   s.mip=m.halve(s);if(s.mip.w>=12&&s.mip.h>=12)s.mip.mip=m.halve(s.mip);
  }
  bank.set(name,s);
 }
 function atlas(bank,base,page){const png=PNG.sync.read(readFileSync(base+page.image)),json=JSON.parse(readFileSync(base+page.data));for(const[name,f]of Object.entries(json.frames))slice(bank,png,name,f);}
 atlas(classic,'assets/sprites/',{image:'atlas.png',data:'atlas.json'});
 const backgrounds=[...new Set(m.THEMES.flatMap(t=>[t.sky,t.far])),'ending_bg',...'abcd'.split('').map(x=>'ending_bg_'+x),'course_map'];
 for(const name of backgrounds){
  const file=name.startsWith('ending_bg')?name.replace('ending_bg','ending'):name;
  const png=PNG.sync.read(readFileSync('assets/bg/'+file+'.png'));slice(classic,png,name,{x:0,y:0,w:png.width,h:png.height});
 }
 const manifest=JSON.parse(readFileSync('assets/plus/manifest.json'));
 for(const name of manifest.reuse)plus.set(name,classic.get(name));
 for(const page of manifest.atlases)atlas(plus,'assets/plus/',page);
 for(const[name,entry]of Object.entries(manifest.images)){
  const png=PNG.sync.read(readFileSync('assets/plus/'+entry.file));slice(plus,png,name,{x:0,y:0,w:png.width,h:png.height,density:entry.density});
 }
 return {classic,plus};
}
export function saveFrame(fb,file){const png=new PNG({width:fb.w,height:fb.h});png.data=Buffer.from(fb.img.data);writeFileSync(file,PNG.sync.write(png));}

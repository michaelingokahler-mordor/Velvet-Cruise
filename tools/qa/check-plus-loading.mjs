import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const out=resolve('output/plus/loading');mkdirSync(out,{recursive:true});const file=resolve(out,'loader.mjs');
await build({stdin:{contents:"export * from './src/core/plus-assets';export * from './src/game/graphics';",resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'esm'});
const m=await import(pathToFileURL(file));
const original={manifest:{version:1,complete:true,atlases:[{image:'atlas.png',data:'atlas.json'}],images:{sky_s1:{file:'sky.png',density:2,opaque:true}},reuse:[],requiredSprites:['player_straight_0']},
 atlas:{frames:{player_straight_0:{x:0,y:0,w:4,h:4,density:2}}},images:{'atlas.png':{width:4,height:4},'sky.png':{width:8,height:4}}};
let state;
globalThis.fetch=async url=>({ok:true,json:async()=>url.endsWith('manifest.json')?state.manifest:state.atlas});
globalThis.Image=class{
 set src(url){if(!url)return;Object.assign(this,state.images[url.split('/').at(-1)]);queueMicrotask(()=>this.onload?.());}
};
globalThis.document={createElement:()=>{
 const canvas={width:4,height:4},ctx={canvas,clearRect(){},drawImage(img){this.image=img;},getImageData(_,__,w,h){
  const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<data.length;i+=4){data[i]=110;data[i+1]=90;data[i+2]=70;data[i+3]=this.image.blank?0:255;}return {data};
 }};canvas.getContext=()=>ctx;return canvas;
}};
const sprites=new Map([['player_straight_0',{w:2,h:2,data:new Uint32Array(4).fill(0xff102030)}],['sky_s1',{w:4,h:2,data:new Uint32Array(8).fill(0xff102030)}]]);
const classic={get:name=>sprites.get(name),names:()=>[...sprites.keys()]};let passed=0;
async function attempt(name,change,rejected=true){
 state=structuredClone(original);change(state);let applied=0,saved=0;
 const selection=new m.GraphicsSelection(()=>m.loadPlusBank(classic),()=>applied++,()=>saved++);
 const ok=await selection.select('plus',true);assert.equal(ok,!rejected,name);
 assert.equal(selection.mode,rejected?'classic':'plus',name);assert.equal(applied,rejected?0:1,name);assert.equal(saved,rejected?0:1,name);
 console.log('PASS '+name);passed++;
}
await attempt('decodedAtlasMismatchDoesNotApplyOrPersist',s=>s.images['atlas.png']={width:1,height:1});
await attempt('negativeFrameBounds',s=>s.atlas.frames.player_straight_0.x=-1);
await attempt('fractionalFrameBounds',s=>s.atlas.frames.player_straight_0.w=3.5);
await attempt('invalidDensity',s=>s.atlas.frames.player_straight_0.density=3);
await attempt('wrongLogicalCarSize',s=>{s.images['atlas.png'].width=8;s.atlas.frames.player_straight_0.w=8;});
await attempt('emptyRequiredSprite',s=>s.images['atlas.png'].blank=true);
await attempt('duplicateAtlasSprite',s=>s.manifest.atlases.push({...s.manifest.atlases[0]}));
await attempt('wrongBackdropDimensions',s=>s.images['sky.png'].width=1);
await attempt('wrongBackdropDensity',s=>s.manifest.images.sky_s1.density=3);
await attempt('validNativePackage',()=>{},false);
console.log(`PASS ${passed} delivered Plus-package validation cases`);

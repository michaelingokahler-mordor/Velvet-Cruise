import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const out=resolve('output/graphics-surfaces');mkdirSync(out,{recursive:true});
globalThis.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}};
const baseline=process.argv.includes('--record-baseline');
const entries=['core/fb','core/font',...(baseline?[]:['core/draw-surface','core/assets','game/graphics','game/lights'])];
const file=resolve(out,baseline?'baseline.mjs':'model.mjs');
await build({stdin:{contents:entries.map(p=>`export * from './src/${p}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},outfile:file,bundle:true,platform:'node',format:'esm'});
const m=await import(pathToFileURL(file));
const {FB,rgb,drawText}=m;
const spr={w:3,h:3,data:new Uint32Array([0,rgb(0xff0000),0,rgb(0x00ff00),0,rgb(0x0000ff),0,rgb(0xffff00),0])};
function paint(fb){
 fb.clear(rgb(0x123456));fb.rect(10,11,30,9,rgb(0xaabbcc));fb.rectA(15,15,20,10,rgb(0x442200),.43);
 fb.trap(21,2,54,43,7,76,rgb(0x234567));fb.poly([70,10,100,13,98,40,65,31],rgb(0xabcdef));
 fb.blit(spr,115,28,4,{flip:true});fb.blitRot(spr,130,36,.4,5);fb.blitAdd(spr,150,35,4,.5);
 fb.lightTrap(41,4,50,65,2,84,rgb(0xffa080),.15,.6);drawText(fb,'CLASSIC 123',100,64,rgb(0xffffff),{outline:rgb(0x111111),shadow:rgb(0x505050),scale:2});
}
const classic=new FB();paint(classic);
const digest=createHash('sha256').update(classic.img.data).digest('hex');
if(baseline){writeFileSync(resolve(out,'classic-baseline.json'),JSON.stringify({digest}));console.log('Recorded Classic pixel baseline '+digest);process.exit(0);}
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('classicPixelParity',()=>assert.equal(digest,'8c7a7c6f4f44713f6229de3a6b7b32af5cf1c0933acf808bdcdcb4bccc527a3a'));
test('classicLogicalAdapterPixelParity',()=>{
 const fb=new FB();paint(new m.ScaledSurface(fb,1));assert.deepEqual(fb.data,classic.data);
});
test('nativeDimensionsAndClipping',()=>{
 const fb=new FB(640,360);assert.equal(fb.w,640);assert.equal(fb.h,360);assert.equal(fb.data.length,640*360);
 fb.rect(635,355,20,20,rgb(0xabcdef));assert.equal(fb.data.at(-1),rgb(0xabcdef));assert.equal(fb.data[354*640+639],0);
 fb.poly([630,350,660,350,660,380,630,380],rgb(0x123456));assert.equal(fb.data.at(-1),rgb(0x123456));
});
test('scaledPrimitivesAndNativeBlending',()=>{
 const fb=new FB(640,360),ui=new m.ScaledSurface(fb,2);
 assert.equal(ui.w,320);assert.equal(ui.h,180);
 fb.pset(20,20,rgb(0xff0000));fb.pset(21,20,rgb(0x0000ff));
 ui.rectA(10,10,1,1,rgb(0x00ff00),.5);
 assert.notEqual(fb.data[20*640+20],fb.data[20*640+21]);
 ui.pset(319,179,rgb(0xabcdef));assert.equal(fb.data.at(-1),rgb(0xabcdef));
});
test('fontUsesLogicalPixelsWithoutLosingNativeBackground',()=>{
 const fb=new FB(640,360),ui=new m.ScaledSurface(fb,2);drawText(ui,'A',0,0,rgb(0xffffff));
 for(let y=0;y<14;y+=2)for(let x=0;x<10;x+=2)assert.equal(fb.data[y*640+x],fb.data[(y+1)*640+x+1]);
});
test('fontUsesTheActualSurfaceBounds',()=>{
 const fb=new FB(640,360);drawText(fb,'A',600,330,rgb(0xffffff));
 assert.ok(fb.data.slice(330*640).some(p=>p!==0));
});
test('atlasRetainsDensityAndDefaultCompatibility',()=>{
 const data=new Uint8ClampedArray(6*6*4);for(let i=0;i<data.length;i+=4){data[i]=200;data[i+3]=255;}
 globalThis.document={createElement:()=>{
  const canvas={width:0,height:0};
  canvas.getContext=()=>({canvas,clearRect(){},drawImage(){},getImageData:()=>({data})});return canvas;
 }};
 const bank=new m.SpriteBank(),texture={getSourceImage:()=>({width:6,height:6})};
 bank.addAtlas(texture,{frames:{high:{x:0,y:0,w:6,h:6,density:2},legacy:{x:0,y:0,w:3,h:3}}});
 assert.equal(bank.get('high').density,2);assert.equal(bank.get('legacy').density??1,1);
 bank.addImage('background',texture,true,2);assert.equal(bank.get('background').density,2);
});
test('spriteDensityPreservesFootprintAndAnchor',()=>{
 const a=new FB(640,360),b=new FB(640,360),ua=new m.ScaledSurface(a,2),ub=new m.ScaledSurface(b,2);
 const hi={w:6,h:6,density:2,data:new Uint32Array(36)};
 for(let y=0;y<6;y++)for(let x=0;x<6;x++)hi.data[y*6+x]=spr.data[(y>>1)*3+(x>>1)];
 ua.blit(spr,40,40,2,{flip:true});ub.blit(hi,40,40,2,{flip:true});assert.deepEqual(a.data,b.data);
 a.clear(0);b.clear(0);ua.blitRot(spr,40,40,.4,2);ub.blitRot(hi,40,40,.4,2);assert.deepEqual(a.data,b.data);
 a.clear(0);b.clear(0);ua.blitAdd(spr,40,40,2);ub.blitAdd(hi,40,40,2);assert.deepEqual(a.data,b.data);
 a.clear(0);b.clear(0);ua.layer(spr,-2,10,false);ub.layer(hi,-2,10,false);assert.deepEqual(a.data,b.data);
 assert.equal(m.halve(hi).density,2);
});
test('profilesAreExactNativePairs',()=>{
 assert.deepEqual(m.GRAPHICS_PROFILES.classic,{id:'classic',width:320,height:180,scale:1});
 assert.deepEqual(m.GRAPHICS_PROFILES.plus,{id:'plus',width:640,height:360,scale:2});
});
test('lightsRetainDensityAndNeverReuseAnotherBanksPixels',()=>{
 const a={w:3,h:3,data:new Uint32Array(9).fill(rgb(0x3c0a1e))};
 const b={w:6,h:6,density:2,data:new Uint32Array(36).fill(rgb(0x3c0a1e))};
 const lightA=m.carLights({get:()=>a},'same-name'),lightB=m.carLights({get:()=>b},'same-name');
 assert.equal(lightA.tail.w,3);assert.equal(lightB.tail.w,6);
 assert.equal(lightB.tail.density,2);assert.equal(lightB.glow.density,2);
 assert.equal(lightB.glow.w,lightA.glow.w*2);
});
test('emissiveWindowsUseLogicalMaterialCoordinates',()=>{
 const width=192,height=160,data=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<data.length;i+=4){data[i]=200;data[i+1]=150;data[i+2]=30;data[i+3]=255;}
 globalThis.document={createElement:()=>{const canvas={width:0,height:0};canvas.getContext=()=>({canvas,clearRect(){},drawImage(){},getImageData:()=>({data})});return canvas;}};
 const bank=new m.SpriteBank();bank.addAtlas({getSourceImage:()=>({width,height})},{frames:{house_lit:{x:0,y:0,w:width,h:height,density:2,emissive:true}}});
 const s=bank.get('house_lit');assert.equal(s.data[80*width+36]>>>24,254);assert.equal(s.data[0]>>>24,255);
});
console.log(`PASS ${passed} graphics-surface checks`);

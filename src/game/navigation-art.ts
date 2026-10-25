import { FB, rgb, type Spr } from '../core/fb';
import { drawText } from '../core/font';

/** Retain original posts/trusses; replace only the semantic panel. */
export function navigationArt(base:Spr,kind:'route'|'reflector'|'lanes'|'s-left'|'s-right'):Spr {
  const fb=new FB();fb.clear(0);
  for(let y=0;y<base.h;y++)fb.data.set(base.data.subarray(y*base.w,(y+1)*base.w),y*320);
  const white=rgb(0xf3f0d9),green=rgb(0x236440),dark=rgb(0x343531);
  if(kind==='route') {
    fb.rect(1,0,62,39,white);fb.rect(3,2,58,35,green);
    drawText(fb,'HWY',23,7,white);drawText(fb,'01',27,20,white);
    fb.rect(8,29,10,2,white);fb.rect(46,29,10,2,white);
  } else if(kind==='reflector') {
    fb.rect(0,0,64,40,0);fb.rect(1,29,62,13,rgb(0x5e6971));fb.rect(2,30,60,2,rgb(0xa4afb3));
    fb.rect(5,34,11,4,white);fb.rect(48,34,11,4,white);fb.rect(28,34,8,4,rgb(0xe2b46a));
  } else if(kind==='lanes') {
    fb.rect(165,13,60,40,green);
    fb.rect(190,19,7,17,white);fb.poly([184,34,203,34,193,45],white);
  } else {
    const flip=kind==='s-right',X=(x:number)=>flip?31-x:x;
    fb.rect(0,0,32,25,0);fb.poly([16,0,31,12,16,25,0,12],dark);
    fb.poly([16,2,29,12,16,23,2,12],rgb(0xffd35a));
    const points=[[12,20],[12,17],[21,14],[21,11],[12,8],[12,6]];
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],steps=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
      for(let j=0;j<=steps;j++)fb.rect(Math.round(X(a[0]+(b[0]-a[0])*j/steps))-1,Math.round(a[1]+(b[1]-a[1])*j/steps),3,2,dark);
    }
    fb.poly([X(12),3,X(7),9,X(17),9],dark);
  }
  const data=new Uint32Array(base.w*base.h);
  for(let y=0;y<base.h;y++)data.set(fb.data.subarray(y*320,y*320+base.w),y*base.w);
  return {w:base.w,h:base.h,data};
}

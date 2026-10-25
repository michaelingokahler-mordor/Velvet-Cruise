import type { FB, Spr, Col, BlitOpts } from './fb';

/** Drawing coordinates and sprite sizes are logical; the target owns native pixels. */
export interface DrawSurface {
  readonly w: number;
  readonly h: number;
  clear(c: Col): void;
  hline(y: number, x0: number, x1: number, c: Col): void;
  rect(x: number, y: number, w: number, h: number, c: Col): void;
  rectA(x: number, y: number, w: number, h: number, c: Col, a: number): void;
  frame(x: number, y: number, w: number, h: number, c: Col): void;
  pset(x: number, y: number, c: Col): void;
  trap(yT: number, lT: number, rT: number, yB: number, lB: number, rB: number, c: Col, clipY?: number): void;
  poly(pts: number[], c: Col, clipY?: number): void;
  blit(s: Spr, cx: number, by: number, scale: number, o?: BlitOpts): void;
  blitAdd(s: Spr, cx: number, by: number, scale: number, k?: number, flip?: boolean): void;
  lightTrap(yT: number, lT: number, rT: number, yB: number, lB: number, rB: number, col: Col, kT: number, kB: number, clipY?: number): void;
  blitRot(s: Spr, cx: number, cy: number, ang: number, scale?: number, o?: BlitOpts): void;
  layer(s: Spr, offX: number, dstY: number, opaque: boolean): void;
}

export class ScaledSurface implements DrawSurface {
  readonly w: number;
  readonly h: number;
  constructor(readonly target: FB, readonly scale: 1 | 2) {
    this.w = target.w / scale;
    this.h = target.h / scale;
  }
  private options(o: BlitOpts): BlitOpts { return o.clipY === undefined ? o : { ...o, clipY: o.clipY * this.scale }; }
  clear(c: Col): void { this.target.clear(c); }
  hline(y: number, x0: number, x1: number, c: Col): void { this.rect(x0, y, x1 - x0, 1, c); }
  rect(x: number, y: number, w: number, h: number, c: Col): void {
    const s = this.scale; this.target.rect(x*s, y*s, w*s, h*s, c);
  }
  rectA(x: number, y: number, w: number, h: number, c: Col, a: number): void {
    const s = this.scale; this.target.rectA(x*s, y*s, w*s, h*s, c, a);
  }
  frame(x: number, y: number, w: number, h: number, c: Col): void {
    this.rect(x,y,w,1,c); this.rect(x,y+h-1,w,1,c); this.rect(x,y,1,h,c); this.rect(x+w-1,y,1,h,c);
  }
  pset(x: number, y: number, c: Col): void { this.rect(x|0, y|0, 1, 1, c); }
  trap(yT: number, lT: number, rT: number, yB: number, lB: number, rB: number, c: Col, clipY = this.h): void {
    const s = this.scale; this.target.trap(yT*s,lT*s,rT*s,yB*s,lB*s,rB*s,c,clipY*s);
  }
  poly(pts: number[], c: Col, clipY = this.h): void { this.target.poly(pts.map(v=>v*this.scale), c, clipY*this.scale); }
  blit(s: Spr, cx: number, by: number, scale: number, o: BlitOpts = {}): void {
    this.target.blit(s, cx*this.scale, by*this.scale, scale*this.scale/(s.density??1), this.options(o));
  }
  blitAdd(s: Spr, cx: number, by: number, scale: number, k = 1, flip = false): void {
    this.target.blitAdd(s, cx*this.scale, by*this.scale, scale*this.scale/(s.density??1), k, flip);
  }
  lightTrap(yT: number, lT: number, rT: number, yB: number, lB: number, rB: number, col: Col, kT: number, kB: number, clipY = this.h): void {
    const s=this.scale; this.target.lightTrap(yT*s,lT*s,rT*s,yB*s,lB*s,rB*s,col,kT,kB,clipY*s);
  }
  blitRot(s: Spr, cx: number, cy: number, ang: number, scale = 1, o: BlitOpts = {}): void {
    this.target.blitRot(s,cx*this.scale,cy*this.scale,ang,scale*this.scale/(s.density??1),this.options(o));
  }
  layer(s: Spr, offX: number, dstY: number, opaque: boolean): void {
    if(this.scale===1&&(s.density??1)===1){this.target.layer(s,offX,dstY,opaque);return;}
    if(this.scale===(s.density??1)){
      this.target.layer(s,Math.floor(offX)*this.scale,Math.round(dstY*this.scale),opaque);return;
    }
    const density=s.density??1, top=Math.round(dstY*this.scale), bottom=Math.ceil(top+s.h*this.scale/density);
    const off=Math.floor(offX)*density;
    for(let y=Math.max(0,top);y<Math.min(this.target.h,bottom);y++){
      const sy=Math.floor((y-top)*density/this.scale);
      for(let x=0;x<this.target.w;x++){
        const sx=((Math.floor(x*density/this.scale)+off)%s.w+s.w)%s.w;
        const p=s.data[sy*s.w+sx];
        if(opaque||(p>>>24))this.target.data[y*this.target.w+x]=p;
      }
    }
  }
}

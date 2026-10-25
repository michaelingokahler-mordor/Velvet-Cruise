// Software framebuffer: every pixel of the game (road, sprites, HUD, menus)
// is drawn here at 320x180 and shown upscaled with crisp nearest-neighbour.

export const W = 320;
export const H = 180;

/** Packed colour in the framebuffer's native byte order (ABGR on little-endian). */
export type Col = number;

export function rgb(hex: number): Col {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
export function rgbc(r: number, g: number, b: number): Col {
  return ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}
export function colR(c: Col): number { return c & 255; }
export function colG(c: Col): number { return (c >> 8) & 255; }
export function colB(c: Col): number { return (c >> 16) & 255; }

/** Linear blend between two packed colours, t in 0..1. */
export function mix(a: Col, b: Col, t: number): Col {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const r = (a & 255) + (((b & 255) - (a & 255)) * t);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  return rgbc(r | 0, g | 0, bl | 0);
}
export function mul(c: Col, tr: number, tg: number, tb: number): Col {
  return rgbc(Math.min(255, (c & 255) * tr) | 0, Math.min(255, ((c >> 8) & 255) * tg) | 0, Math.min(255, ((c >> 16) & 255) * tb) | 0);
}

export interface Spr {
  w: number;
  h: number;
  /** Source-art pixel density; mip levels retain this and compensate their sampling scale. */
  density?: 1 | 2;
  data: Uint32Array; // alpha 0 = transparent, 254 = emissive (ignores tint), 255 = solid
  /** Half-size copy (area-averaged, thin details kept): used when the sprite is drawn small, so its
   *  rings, blades and window bars keep their tone instead of flickering as pixels are skipped. */
  mip?: Spr;
}

/** Halve a sprite: each 2x2 block becomes the average of its opaque pixels (a lone pixel survives on a checker). */
export function halve(s: Spr): Spr {
  const w = Math.max(1, (s.w + 1) >> 1), h = Math.max(1, (s.h + 1) >> 1);
  const out = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0, r = 0, g = 0, b = 0, emi = false;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const sx = x * 2 + dx, sy = y * 2 + dy;
          if (sx >= s.w || sy >= s.h) continue;
          const p = s.data[sy * s.w + sx];
          const a = p >>> 24;
          if (a === 0) continue;
          n++; r += p & 255; g += (p >> 8) & 255; b += (p >> 16) & 255;
          if (a === 254) emi = true;
        }
      }
      if (n === 0 || (n === 1 && ((x + y) & 1))) continue;
      out[y * w + x] = (((emi ? 254 : 255) << 24) | (((b / n) | 0) << 16) | (((g / n) | 0) << 8) | ((r / n) | 0)) >>> 0;
    }
  }
  return { w, h, data: out, ...(s.density === undefined ? {} : { density: s.density }) };
}

export interface BlitOpts {
  flip?: boolean;
  /** Multiplicative tint, 0..1+ per channel. */
  tr?: number; tg?: number; tb?: number;
  /** Fog amount 0..1 toward fogCol. */
  fog?: number;
  fogCol?: Col;
  /** Rows at or below this y are not drawn (hill occlusion). */
  clipY?: number;
  /** Draw every opaque pixel in this single colour (shadows, silhouettes). */
  solid?: Col;
}

export class FB {
  readonly w: number;
  readonly h: number;
  readonly img: ImageData;
  readonly data: Uint32Array;
  // scratch for convex polygon fill
  private readonly colMap: Int32Array;
  private readonly spanL: Float32Array;
  private readonly spanR: Float32Array;

  constructor(width = W, height = H) {
    this.w = width;
    this.h = height;
    this.colMap = new Int32Array(width);
    this.spanL = new Float32Array(height);
    this.spanR = new Float32Array(height);
    this.img = new ImageData(width, height);
    this.data = new Uint32Array(this.img.data.buffer);
  }

  clear(c: Col): void { this.data.fill(c); }

  /** Fill pixels [x0, x1) on row y. */
  hline(y: number, x0: number, x1: number, c: Col): void {
    if (y < 0 || y >= this.h) return;
    if (x0 < 0) x0 = 0;
    if (x1 > this.w) x1 = this.w;
    if (x1 <= x0) return;
    const o = y * this.w;
    this.data.fill(c, o + x0, o + x1);
  }

  rect(x: number, y: number, w: number, h: number, c: Col): void {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const y0 = Math.max(0, y), y1 = Math.min(this.h, y + h);
    for (let r = y0; r < y1; r++) this.hline(r, x, x + w, c);
  }

  /** Alpha-blended rectangle (a 0..1). */
  rectA(x: number, y: number, w: number, h: number, c: Col, a: number): void {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const x0 = Math.max(0, x), x1 = Math.min(this.w, x + w);
    const y0 = Math.max(0, y), y1 = Math.min(this.h, y + h);
    const d = this.data;
    const cr = c & 255, cg = (c >> 8) & 255, cb = (c >> 16) & 255;
    const ia = 1 - a;
    for (let r = y0; r < y1; r++) {
      let o = r * this.w + x0;
      for (let q = x0; q < x1; q++, o++) {
        const p = d[o];
        d[o] = rgbc((p & 255) * ia + cr * a, ((p >> 8) & 255) * ia + cg * a, ((p >> 16) & 255) * ia + cb * a);
      }
    }
  }

  frame(x: number, y: number, w: number, h: number, c: Col): void {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }

  pset(x: number, y: number, c: Col): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  /**
   * Trapezoid with horizontal top (far) and bottom (near) edges.
   * yT < yB. Pixel centres inside are filled. Rows >= clipY are skipped.
   */
  trap(yT: number, lT: number, rT: number, yB: number, lB: number, rB: number, c: Col, clipY = this.h): void {
    if (yB <= yT) return;
    let r0 = Math.ceil(yT - 0.5);
    let r1 = Math.ceil(yB - 0.5);
    if (r0 < 0) r0 = 0;
    if (r1 > clipY) r1 = Math.ceil(clipY);
    if (r1 > this.h) r1 = this.h;
    const inv = 1 / (yB - yT);
    const d = this.data;
    for (let r = r0; r < r1; r++) {
      const t = (r + 0.5 - yT) * inv;
      let x0 = Math.ceil(lT + (lB - lT) * t - 0.5);
      let x1 = Math.ceil(rT + (rB - rT) * t - 0.5);
      if (x0 < 0) x0 = 0;
      if (x1 > this.w) x1 = this.w;
      if (x1 > x0) d.fill(c, r * this.w + x0, r * this.w + x1);
    }
  }

  /** Convex polygon fill (vertices as flat x,y pairs). */
  poly(pts: number[], c: Col, clipY = this.h): void {
    const n = pts.length >> 1;
    let ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < n; i++) {
      const y = pts[i * 2 + 1];
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    let r0 = Math.ceil(ymin - 0.5), r1 = Math.ceil(ymax - 0.5);
    if (r0 < 0) r0 = 0;
    if (r1 > this.h) r1 = this.h;
    if (r1 > clipY) r1 = Math.ceil(clipY);
    if (r1 <= r0) return;
    const L = this.spanL, R = this.spanR;
    for (let r = r0; r < r1; r++) { L[r] = Infinity; R[r] = -Infinity; }
    for (let i = 0; i < n; i++) {
      const ax = pts[i * 2], ay = pts[i * 2 + 1];
      const j = (i + 1) % n;
      const bx = pts[j * 2], by = pts[j * 2 + 1];
      if (ay === by) continue;
      const lo = Math.min(ay, by), hi = Math.max(ay, by);
      let e0 = Math.ceil(lo - 0.5), e1 = Math.ceil(hi - 0.5);
      if (e0 < r0) e0 = r0;
      if (e1 > r1) e1 = r1;
      const k = (bx - ax) / (by - ay);
      for (let r = e0; r < e1; r++) {
        const x = ax + (r + 0.5 - ay) * k;
        if (x < L[r]) L[r] = x;
        if (x > R[r]) R[r] = x;
      }
    }
    const d = this.data;
    for (let r = r0; r < r1; r++) {
      if (L[r] > R[r]) continue;
      let x0 = Math.ceil(L[r] - 0.5), x1 = Math.ceil(R[r] - 0.5);
      if (x0 < 0) x0 = 0;
      if (x1 > this.w) x1 = this.w;
      if (x1 > x0) d.fill(c, r * this.w + x0, r * this.w + x1);
    }
  }

  /**
   * Draw a sprite scaled about its bottom-centre anchor (cx, by).
   */
  blit(s: Spr, cx: number, by: number, scale: number, o: BlitOpts = {}): void {
    const dw = s.w * scale, dh = s.h * scale;
    if (dw < 0.5 || dh < 0.5) return;
    const x0 = cx - dw / 2, y0 = by - dh;
    let c0 = Math.ceil(x0 - 0.5), c1 = Math.ceil(x0 + dw - 0.5);
    let r0 = Math.ceil(y0 - 0.5), r1 = Math.ceil(by - 0.5);
    if (c0 < 0) c0 = 0;
    if (c1 > this.w) c1 = this.w;
    if (r0 < 0) r0 = 0;
    if (r1 > this.h) r1 = this.h;
    if (o.clipY !== undefined && r1 > o.clipY) r1 = Math.ceil(o.clipY);
    if (c1 <= c0 || r1 <= r0) return;
    const inv = 1 / scale;
    const sw = s.w, sh = s.h;
    const flip = !!o.flip;
    for (let q = c0; q < c1; q++) {
      let sx = ((q + 0.5 - x0) * inv) | 0;
      if (sx >= sw) sx = sw - 1;
      this.colMap[q - c0] = flip ? sw - 1 - sx : sx;
    }
    const src = s.data, d = this.data;
    const tr = o.tr ?? 1, tg = o.tg ?? 1, tb = o.tb ?? 1;
    const fog = o.fog ?? 0;
    const tinted = tr !== 1 || tg !== 1 || tb !== 1;
    const fr = o.fogCol !== undefined ? o.fogCol & 255 : 0;
    const fgc = o.fogCol !== undefined ? (o.fogCol >> 8) & 255 : 0;
    const fb = o.fogCol !== undefined ? (o.fogCol >> 16) & 255 : 0;
    const fogged = fog > 0.01 && o.fogCol !== undefined;
    const ifog = 1 - fog;
    const solid = o.solid;
    for (let r = r0; r < r1; r++) {
      let sy = ((r + 0.5 - y0) * inv) | 0;
      if (sy >= sh) sy = sh - 1;
      const so = sy * sw;
      let o2 = r * this.w + c0;
      for (let q = c0; q < c1; q++, o2++) {
        const p = src[so + this.colMap[q - c0]];
        const a = p >>> 24;
        if (a === 0) continue;
        if (solid !== undefined) { d[o2] = solid; continue; }
        if (!tinted && !fogged) { d[o2] = p | 0xff000000; continue; }
        let pr = p & 255, pg = (p >> 8) & 255, pb = (p >> 16) & 255;
        if (tinted && a !== 254) { pr *= tr; pg *= tg; pb *= tb; if (pr > 255) pr = 255; if (pg > 255) pg = 255; if (pb > 255) pb = 255; }
        if (fogged) { pr = pr * ifog + fr * fog; pg = pg * ifog + fgc * fog; pb = pb * ifog + fb * fog; }
        d[o2] = ((255 << 24) | ((pb & 255) << 16) | ((pg & 255) << 8) | (pr & 255)) >>> 0;
      }
    }
  }

  /**
   * Add a sprite's colours onto the frame (light glows), scaled about its bottom-centre
   * anchor like `blit`; `k` dims or boosts the light.
   */
  blitAdd(s: Spr, cx: number, by: number, scale: number, k = 1, flip = false): void {
    const dw = s.w * scale, dh = s.h * scale;
    if (dw < 0.5 || dh < 0.5 || k <= 0.01) return;
    const x0 = cx - dw / 2, y0 = by - dh;
    let c0 = Math.ceil(x0 - 0.5), c1 = Math.ceil(x0 + dw - 0.5);
    let r0 = Math.ceil(y0 - 0.5), r1 = Math.ceil(by - 0.5);
    if (c0 < 0) c0 = 0;
    if (c1 > this.w) c1 = this.w;
    if (r0 < 0) r0 = 0;
    if (r1 > this.h) r1 = this.h;
    if (c1 <= c0 || r1 <= r0) return;
    const inv = 1 / scale, sw = s.w, sh = s.h;
    for (let q = c0; q < c1; q++) {
      let sx = ((q + 0.5 - x0) * inv) | 0;
      if (sx >= sw) sx = sw - 1;
      this.colMap[q - c0] = flip ? sw - 1 - sx : sx;
    }
    const src = s.data, d = this.data;
    for (let r = r0; r < r1; r++) {
      let sy = ((r + 0.5 - y0) * inv) | 0;
      if (sy >= sh) sy = sh - 1;
      const so = sy * sw;
      let o2 = r * this.w + c0;
      for (let q = c0; q < c1; q++, o2++) {
        const p = src[so + this.colMap[q - c0]];
        if ((p >>> 24) === 0) continue;
        const t = d[o2];
        let pr = (t & 255) + (p & 255) * k, pg = ((t >> 8) & 255) + ((p >> 8) & 255) * k, pb = ((t >> 16) & 255) + ((p >> 16) & 255) * k;
        if (pr > 255) pr = 255; if (pg > 255) pg = 255; if (pb > 255) pb = 255;
        d[o2] = ((255 << 24) | ((pb & 255) << 16) | ((pg & 255) << 8) | (pr & 255)) >>> 0;
      }
    }
  }

  /**
   * Add light over a trapezoid between rows yT (top) and yB (bottom), with edges lT..rT at the
   * top and lB..rB at the bottom. Brightness runs from kT at the top to kB at the bottom in
   * chunky steps and is strongest down the middle (a headlight pool on the road).
   * Rows at or below clipY are skipped (road hidden behind a crest).
   */
  lightTrap(yT: number, lT: number, rT: number, yB: number, lB: number, rB: number, col: Col, kT: number, kB: number, clipY = this.h): void {
    if (yB <= yT) return;
    const cr = col & 255, cg = (col >> 8) & 255, cb = (col >> 16) & 255;
    let r0 = Math.ceil(yT - 0.5), r1 = Math.ceil(yB - 0.5);
    if (r0 < 0) r0 = 0;
    if (r1 > this.h) r1 = this.h;
    if (r1 > clipY) r1 = Math.ceil(clipY - 0.5);
    const d = this.data, inv = 1 / (yB - yT);
    for (let r = r0; r < r1; r++) {
      const t = (r + 0.5 - yT) * inv;
      // four brightness steps keep the pool looking like pixel art rather than a smooth gradient
      const k = Math.round((kT + (kB - kT) * t) * 40) / 40;
      if (k <= 0) continue;
      const l = lT + (lB - lT) * t, rr = rT + (rB - rT) * t;
      const mid = (l + rr) / 2, half = (rr - l) / 2;
      if (half < 0.5) continue;
      let x0 = Math.ceil(l - 0.5), x1 = Math.ceil(rr - 0.5);
      if (x0 < 0) x0 = 0;
      if (x1 > this.w) x1 = this.w;
      const o = r * this.w;
      for (let x = x0; x < x1; x++) {
        const u = Math.abs(x + 0.5 - mid) / half;
        const kk = u < 0.45 ? k : u < 0.75 ? k * 0.62 : k * 0.3;
        const p = d[o + x];
        let pr = (p & 255) + cr * kk, pg = ((p >> 8) & 255) + cg * kk, pb = ((p >> 16) & 255) + cb * kk;
        if (pr > 255) pr = 255; if (pg > 255) pg = 255; if (pb > 255) pb = 255;
        d[o + x] = ((255 << 24) | ((pb & 255) << 16) | ((pg & 255) << 8) | (pr & 255)) >>> 0;
      }
    }
  }

  /**
   * Draw a sprite rotated by `ang` radians (clockwise on screen) about its centre,
   * which lands at (cx, cy). Nearest-neighbour, so pixels stay chunky.
   */
  blitRot(s: Spr, cx: number, cy: number, ang: number, scale = 1, o: BlitOpts = {}): void {
    const hw = s.w / 2, hh = s.h / 2;
    const rad = Math.sqrt(hw * hw + hh * hh) * scale + 1;
    const c0 = Math.max(0, Math.floor(cx - rad)), c1 = Math.min(this.w, Math.ceil(cx + rad));
    const r0 = Math.max(0, Math.floor(cy - rad)), r1 = Math.min(this.h, Math.ceil(cy + rad));
    if (c1 <= c0 || r1 <= r0) return;
    const cs = Math.cos(ang) / scale, sn = Math.sin(ang) / scale;
    const src = s.data, d = this.data, sw = s.w, sh = s.h;
    const tr = o.tr ?? 1, tg = o.tg ?? 1, tb = o.tb ?? 1;
    const tinted = tr !== 1 || tg !== 1 || tb !== 1;
    const flip = !!o.flip, solid = o.solid;
    for (let r = r0; r < r1; r++) {
      const dy = r + 0.5 - cy;
      let o2 = r * this.w + c0;
      for (let q = c0; q < c1; q++, o2++) {
        const dx = q + 0.5 - cx;
        const fx = dx * cs + dy * sn + hw;
        const fy = -dx * sn + dy * cs + hh;
        if (fx < 0 || fy < 0 || fx >= sw || fy >= sh) continue;
        const sx = flip ? sw - 1 - (fx | 0) : fx | 0;
        const p = src[(fy | 0) * sw + sx];
        const a = p >>> 24;
        if (a === 0) continue;
        if (solid !== undefined) { d[o2] = solid; continue; }
        if (!tinted || a === 254) { d[o2] = p | 0xff000000; continue; }
        let pr = (p & 255) * tr, pg = ((p >> 8) & 255) * tg, pb = ((p >> 16) & 255) * tb;
        if (pr > 255) pr = 255; if (pg > 255) pg = 255; if (pb > 255) pb = 255;
        d[o2] = ((255 << 24) | ((pb & 255) << 16) | ((pg & 255) << 8) | (pr & 255)) >>> 0;
      }
    }
  }

  /** Unscaled copy of a horizontal strip of a wide tiling layer, with wrap. */
  layer(s: Spr, offX: number, dstY: number, opaque: boolean): void {
    const sw = s.w;
    let ox = Math.floor(offX) % sw;
    if (ox < 0) ox += sw;
    const src = s.data, d = this.data;
    for (let r = 0; r < s.h; r++) {
      const y = dstY + r;
      if (y < 0 || y >= this.h) continue;
      const so = r * sw;
      const o = y * this.w;
      if (opaque) {
        // copy in up to two runs
        let x = 0, sx = ox;
        while (x < this.w) {
          const run = Math.min(this.w - x, sw - sx);
          d.set(src.subarray(so + sx, so + sx + run), o + x);
          x += run; sx = 0;
        }
      } else {
        let sx = ox;
        for (let x = 0; x < this.w; x++) {
          const p = src[so + sx];
          if (p >>> 24) d[o + x] = p;
          if (++sx >= sw) sx = 0;
        }
      }
    }
  }
}

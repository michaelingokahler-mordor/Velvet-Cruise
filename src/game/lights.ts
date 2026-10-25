// Night lights: every car's taillight lenses (the shared unlit lens colours in
// the art) switched on as glowing running lights, plus a chunky additive halo
// around them. Built once per sprite from the art itself and cached.
import { Spr, rgb } from "../core/fb";
import { SpriteBank } from "../core/assets";

/** Unlit lens shades in the art (dark → bright) and what each becomes when switched on. */
const LENS = [0x3c0a1e, 0x5e1226, 0x7e1c30, 0xb33a48].map((h) => rgb(h) & 0xffffff);
const ON = [0xb0182a, 0xe8302a, 0xff6040, 0xffb890].map((h) => rgb(h));
/** Halo strength by distance from a lit lens pixel (added onto whatever is behind). */
const HALO = [rgb(0x5a160e), rgb(0x3a0c08), rgb(0x1c0604)];
const R = HALO.length;

export interface CarLights {
  /** Lit lenses, same size and anchor as the car sprite. */
  tail: Spr;
  /** Additive glow, R px wider on each side (same bottom-centre anchor). */
  glow: Spr;
}

const caches = new WeakMap<SpriteBank, Map<string, CarLights | null>>();

/** The running lights for a car sprite (null when it has no lenses or isn't loaded). */
export function carLights(bank: SpriteBank, name: string): CarLights | null {
  let cache = caches.get(bank);
  if (!cache) { cache = new Map(); caches.set(bank, cache); }
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const s = bank.get(name);
  if (!s) return null;
  const { w, h } = s;
  const density = s.density ?? 1, radius = R * density;
  const gw = w + radius * 2;
  const tail = new Uint32Array(w * h);
  // Eight-neighbour distance transform: exact square rings in two linear passes.
  // Searching a whole radius square at every output pixel stalls new Plus poses.
  const distance = new Uint8Array(gw * h);
  distance.fill(radius + 1);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    const p = s.data[i];
    if ((p >>> 24) === 0) continue;
    const k = LENS.indexOf(p & 0xffffff);
    if (k < 0) continue;
    tail[i] = ON[k];
    const y = (i / w) | 0, x = i - y * w;
    distance[y * gw + x + radius] = 0;
    n++;
  }
  if (!n) { cache.set(name, null); return null; }
  const glow = new Uint32Array(gw * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < gw; x++) {
      const at = y * gw + x;
      let best = distance[at], v: number;
      if (x > 0 && (v = distance[at - 1] + 1) < best) best = v;
      if (y > 0) {
        if ((v = distance[at - gw] + 1) < best) best = v;
        if (x > 0 && (v = distance[at - gw - 1] + 1) < best) best = v;
        if (x + 1 < gw && (v = distance[at - gw + 1] + 1) < best) best = v;
      }
      distance[at] = best;
    }
  }
  for (let y = h - 1; y >= 0; y--) for (let x = gw - 1; x >= 0; x--) {
    const at = y * gw + x;
    let best = distance[at], v: number;
    if (x + 1 < gw && (v = distance[at + 1] + 1) < best) best = v;
    if (y + 1 < h) {
      if ((v = distance[at + gw] + 1) < best) best = v;
      if (x > 0 && (v = distance[at + gw - 1] + 1) < best) best = v;
      if (x + 1 < gw && (v = distance[at + gw + 1] + 1) < best) best = v;
    }
    distance[at] = best;
    if (best === 0) glow[at] = HALO[0];
    else if (best <= radius) glow[at] = HALO[((best - 1) / density) | 0];
  }
  const out: CarLights = { tail: { w, h, data: tail, density }, glow: { w: gw, h, data: glow, density } };
  cache.set(name, out);
  return out;
}

/** Warm headlight colour for the pools of light on the road. */
export const HEADLIGHT = rgb(0xffe2a0);

/** Original lamp art points left; the highway/city davits point right. */
export function lampPose(name:string,x:number):{flip:boolean;size:number;head:number}|undefined {
  if(!/^(lamp_lit|hwy_lamp_lit|city_lamp_lit|gas_lamp_lit|lantern_lit)$/.test(name))return;
  const leftArt=name==='lamp_lit',davit=/^(hwy|city)_/.test(name);
  return {flip:leftArt?x<0:davit?x>0:false,size:leftArt?1.3:name==='city_lamp_lit'?1.12:1,
    head:leftArt?-.34:davit?.32:0};
}

/** A light keeps the source car's tangent. Future road curvature cannot steer it. */
export function lightAxis(near:number,far:number,pct:number,lateral:number,length:number):{x:number;slope:number} {
  return {x:near+(far-near)*pct+lateral,slope:(far-near)/length};
}

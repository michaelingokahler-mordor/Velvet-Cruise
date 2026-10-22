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

const cache = new Map<string, CarLights | null>();

/** The running lights for a car sprite (null when it has no lenses or isn't loaded). */
export function carLights(bank: SpriteBank, name: string): CarLights | null {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const s = bank.get(name);
  if (!s) return null;
  const { w, h } = s;
  const tail = new Uint32Array(w * h);
  const mask = new Uint8Array(w * h);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    const p = s.data[i];
    if ((p >>> 24) === 0) continue;
    const k = LENS.indexOf(p & 0xffffff);
    if (k < 0) continue;
    tail[i] = ON[k];
    mask[i] = 1;
    n++;
  }
  if (!n) { cache.set(name, null); return null; }
  const gw = w + R * 2;
  const glow = new Uint32Array(gw * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < gw; x++) {
      // distance (in rings) to the nearest lit pixel
      let best = 99;
      for (let dy = -R; dy <= R && best > 0; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x - R + dx;
          if (xx < 0 || xx >= w || !mask[yy * w + xx]) continue;
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          if (d < best) best = d;
        }
      }
      if (best === 0) glow[y * gw + x] = HALO[0];
      else if (best <= R) glow[y * gw + x] = HALO[best - 1];
    }
  }
  const out: CarLights = { tail: { w, h, data: tail }, glow: { w: gw, h, data: glow } };
  cache.set(name, out);
  return out;
}

/** Warm headlight colour for the pools of light on the road. */
export const HEADLIGHT = rgb(0xffe2a0);

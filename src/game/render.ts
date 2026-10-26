// The pseudo-3D scaling road: sky and coast backdrops, the ocean with its
// sun glitter, cliffs, guardrails, scenery, traffic and the player's car,
// all painted back-to-front into the 320x180 framebuffer.
import { FB, W, H, Col, Spr, mix, rgb, colR, colG, colB, rgbc } from "../core/fb";
import { SpriteBank } from "../core/assets";
import { drawText, textWidth } from "../core/font";
import { HORIZON, FOCAL, CAM_H, PLAYER_Z, SPR_S, SEG_LEN, ROAD_W, DRAW_DIST, FOG_START, LANES, RAIL_X, MAX_SPEED } from "./config";
import { THEMES, Theme, OVERHEAD } from "./themes";
import type { Seg, SprInst } from "./track";
import { TUN_H, TUN_W, PORTAL_W, PORTAL_H } from "./track";
import type { Race, Car } from "./race";
import type { CovePoint } from "./cove";
import { LANDSCAPES } from './landscape';
import { navigationArt } from './navigation-art';
import { ScaledSurface, type DrawSurface } from '../core/draw-surface';
import type { RenderContext } from './graphics';
import { carLights, HEADLIGHT, lampPose, lightAxis } from "./lights";
import { slopeForms, leanOf, plotSpan, cellRand, vnoise, NF, F_LOW, F_HIGH, F_L0, F_L1, F_L20, F_L21, F_H0, F_H1, F_H20, F_H21, F_R0, F_R1, F_RS, F_T, F_TH, F_P, F_PH, F_D0, F_D1, F_O0, F_O1, F_HG, F_HGW, F_PA, F_PAW, F_V0, F_V1 } from "./terrain";

const WHITE = rgb(0xffffff);
/** How far a slope ribbon reaches past its far edge (fraction of its own length). */
const SEAM = 0.06;
/** Test hook (URL hash #oldslopes): draw the banded walls of before, to compare speed. */
const LEGACY_SLOPES = typeof location !== "undefined" && location.hash.includes("oldslopes");
const SHADOWED = /^(palm|bush|cove_|house|rock|cypress|cyp_|stone_pine|pine|night_pine|snow_|bluff_|point_|summit_|dead_tree|shack|lifeguard|umbrella|redwood|olive|winery|saloon|store|mesa_rock|saguaro|cactus|lake_|birch|cabin|observatory|radio_dish|wagon|water_tower|gas_station|fern|log)/;
const SHADOW_COL = rgb(0x1c2a18);
const DECKED = /^(shack|lifeguard)$/;
const DECK_TOP = rgb(0xc89a62), DECK_FRONT = rgb(0x8a5e3c);
const LAMP_GLOW = rgb(0xffd890), FIRE_GLOW = rgb(0xffa040), CRYSTAL_GLOW = rgb(0x90c8ff);
const ICE_COL = rgb(0xa8d4f0);
const ICE_GLINT = rgb(0xf0faff);
/** Empty icon squares on the fork sign (top-left corners), where the destinations' icons go. */
export const FORK_ICON_L = [9, 17], FORK_ICON_R = [104, 17];

interface Streak { x: number; y: number; v: number; len: number; near: boolean; col: Col }

function hash(x: number, y: number, t: number): number {
  let h = (x * 374761393 + y * 668265263 + t * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Stable 0..1 value per (window column, floor, tower). */
function hashI(a: number, b: number, c: number): number {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b + 0x165667b1, 0x85ebca6b) ^ c;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

// city towers and tunnels
const FLOOR_H = 900, INV_FLOOR = 1 / FLOOR_H, WIN_COL = 650;
const TUN_DARK = rgb(0x120e22);
const TUN_CEIL = rgb(0x221c36), TUN_UPPER = rgb(0x2e2846), TUN_KERB = rgb(0x3a3452);
const TUN_TILE_A = rgb(0x4e4870), TUN_TILE_B = rgb(0x4a4468), TUN_LAMP = rgb(0xffd890), TUN_LAMP_GLOW = rgb(0x8a6a5a);
const NEON_DEF = [rgb(0xff3ab0), rgb(0x3af0ff)];

/** Colours of the tower being drawn (already hazed for its distance). */
interface TowerCols { body: Col; far: Col; litA: Col; litB: Col; shop: Col; dark: Col; trim: Col; litP: number }

export class Renderer {
  private fb: FB;
  private bank: SpriteBank;
  private scratch: FB;
  private logical: DrawSurface;
  private scale: 1 | 2;
  private horizon: number;
  private focal: number;
  private gateCache = new Map<string, Spr>();
  private visible: Seg[] = [];
  /** Localised banner text resolver, set by the scene. */
  label: (id: string) => string = (id) => id;
  time = 0;
  /** Incremented every render; cars drawn this frame carry it in `seen`. */
  frame = 0;
  /** Dusk (0..1) of the race being drawn: cars switch their lights on as it rises. */
  private night = 0;
  private camX = 0;
  private race: Race | null = null;
  private rainAmt = 0;
  private drops: Streak[] = [];
  private flakes: { x: number; y: number; v: number; ph: number; big: boolean }[] = [];
  private lastT = 0;
  private boatZ = -1;
  private row: Uint32Array;
  private tc: TowerCols = { body: 0, far: 0, litA: 0, litB: 0, shop: 0, dark: 0, trim: 0, litP: 0.4 };
  private headSources:{z:number;x:number;slope:number;br:number;from:number;to:number;gain:number}[]=[];
  private lampSources:{z:number;x:number;slope:number;radius:number;gain:number;br:number}[]=[];

  constructor(context: FB | RenderContext, bank: SpriteBank) {
    this.fb = 'profile' in context ? context.fb : context;
    this.scale = (this.fb.w / W) as 1 | 2;
    this.horizon = HORIZON * this.scale;
    this.focal = FOCAL * this.scale;
    this.logical = new ScaledSurface(this.fb, this.scale);
    this.scratch = new FB(this.fb.w, this.fb.h);
    this.row = new Uint32Array(this.fb.w);
    this.bank = bank;
  }

  clearGateCache(): void { this.gateCache.clear(); }

  // ---------------------------------------------------------------- backdrop
  private background(fb: FB, th: Theme, skyOff: number, farOff: number, sunScreenX: number): void {
    const sky = this.bank.get(th.sky);
    if (sky) new ScaledSurface(fb, this.scale).layer(sky, skyOff, 0, true);
    else {
      const g = th.skyGrad;
      for (let y = 0; y < this.horizon; y++) {
        const t = (y / this.horizon) * (g.length - 1);
        const i = Math.min(g.length - 2, Math.floor(t));
        fb.hline(y, 0, this.fb.w, mix(g[i], g[i + 1], t - i));
      }
    }
    // background sea (or land, inland) below the horizon
    const land = th.side === "land";
    const bh = land ? th.landH ?? th.seaH : th.seaH, bn = land ? th.landN ?? th.seaN : th.seaN;
    for (let y = this.horizon; y < this.fb.h; y++) {
      const t = Math.min(1, Math.pow((y - this.horizon) / (40*this.scale), 0.7));
      fb.hline(y, 0, this.fb.w, mix(bh, bn, t));
    }
    // horizon glitter under the sun: short horizontal dashes in a column that widens towards the viewer,
    // drifting slowly (not a speckle of single pixels)
    const tt = Math.floor(this.time * 6);
    for (let y = this.horizon; !land && y < this.horizon + 26*this.scale; y++) {
      const half = 8*this.scale + (y - this.horizon) * 2.1;
      this.glints(fb, y, sunScreenX, half, th.sunGlow*(th.id==='crystal-lake'?.48:1), th.glitter, th.glitter2, tt, y - this.horizon, 0);
    }
    if (th.id === 'coral-bluffs') this.bluffsBackdrop(new ScaledSurface(fb,this.scale), farOff);
    else {
      const far = this.bank.get(th.far);
      if (far) new ScaledSurface(fb,this.scale).layer(far,farOff,HORIZON-far.h/(far.density??1),false);
    }
  }

  /** Separate, hazed sandstone headlands with sky and sea between them.
   * Draw into the supplied buffer so stage cross-fades use the same scenery. */
  private bluffsBackdrop(fb: DrawSurface, offset: number): void {
    const period=640, shift=((offset%period)+period)%period;
    const massive=(x:number,w:number,h:number,back:boolean) => {
      const y=HORIZON, body=rgb(back?0xc1aaa0:0xb49a87), shade=rgb(back?0xb4a1a0:0xa08b80), lit=rgb(back?0xd1b8a7:0xcab091);
      fb.poly([x,y,x+w*.06,y-h*.18,x+w*.1,y-h*.2,x+w*.16,y-h*.44,x+w*.22,y-h*.46,x+w*.26,y-h*.82,x+w*.29,y-h*.93,x+w*.34,y-h*.93,x+w*.36,y-h,x+w*.43,y-h,x+w*.46,y-h*.96,x+w*.5,y-h*.96,x+w*.57,y-h*.79,x+w*.64,y-h*.76,x+w*.67,y-h*.7,x+w*.74,y-h*.7,x+w*.78,y-h*.54,x+w*.84,y-h*.5,x+w*.88,y-h*.23,x+w*.92,y-h*.2,x+w,y],body);
      fb.poly([x+w*.2,y-h*.43,x+w*.29,y-h*.93,x+w*.36,y-h*.95,x+w*.31,y-h*.3,x+w*.58,y,x+w*.13,y],shade);
      fb.poly([x+w*.36,y-h*.95,x+w*.5,y-h,x+w*.62,y-h*.76,x+w*.74,y-h*.7,x+w*.67,y-h*.65,x+w*.48,y-h*.88],lit);
      fb.poly([x+w*.62,y-h*.76,x+w*.67,y-h*.65,x+w*.6,y-h*.2,x+w*.83,y,x+w*.54,y],shade);
      // Broken strata and vertical erosion, large enough to read at one pixel.
      fb.poly([x+w*.22,y-h*.44,x+w*.49,y-h*.46,x+w*.55,y-h*.38,x+w*.25,y-h*.37],lit);
      fb.poly([x+w*.46,y-h*.94,x+w*.5,y-h*.94,x+w*.48,y-h*.62,x+w*.44,y-h*.48],shade);
      fb.poly([x+w*.68,y-h*.57,x+w*.78,y-h*.51,x+w*.82,y-h*.38,x+w*.69,y-h*.44],lit);
      fb.poly([x+w*.34,y-h*.18,x+w*.58,y-h*.22,x+w*.63,y-h*.12,x+w*.39,y-h*.1],mix(body,lit,.35));
    };
    for(let repeat=-1;repeat<=1;repeat++) {
      const x=repeat*period-shift;
      massive(x+25,170,25,true);
      massive(x+290,125,18,true);
      massive(x-40,210,31,false);
      massive(x+465,125,21,false);
    }
  }

  /**
   * Sun reflection on the water in row `y`: a few short dashes inside the column of half-width `half`
   * around `sunX`. Dashes grow with the depth below the horizon, fade towards the column's edges and
   * keep their place for a few frames, so the water reads as ripples catching the light and not as noise.
   */
  private glints(fb: FB, y: number, sunX: number, half: number, k: number, colA: Col, colB: Col, tt: number, depth: number, minX: number): void {
    if (k <= 0.02 || y < this.horizon || y >= this.fb.h) return;
    const d = fb.data, o = y * this.fb.w;
    const n = depth < 5 ? 3 : depth < 14 ? 5 : 9;
    for (let j = 0; j < n; j++) {
      const h1 = hash(y * 3 + j, 17, 31), h2 = hash(y, j + 5, 47);
      const phase = (tt + Math.floor(h2 * 11)) % 11;
      if (h1 > .3 + .65 * k || phase < 2) continue;
      // Fixed ripple positions, changing light: avoid resampling the entire
      // reflection into noise on each frame. Independent lanes cover both sides.
      const len = 2 + Math.floor(h2 * (2 + Math.min(depth,40) * .18));
      const cx = sunX + ((j + .18 + h2 * .64) / n * 2 - 1) * half;
      const edge = Math.abs(cx - sunX) / half;
      const left = Math.floor(cx - len / 2);
      // Clip, never move a hidden glint onto the shoreline or the screen edge.
      const x0 = Math.max(0, minX, left), x1 = Math.min(this.fb.w, left + len);
      const color = edge < .65 && phase >= 3 && phase <= 7 ? colA : colB;
      for (let x = x0; x < x1; x++) d[o + x] = color;
    }
  }

  // ------------------------------------------------------------- sea ground
  private seaTrap(yT: number, lT: number, yB: number, lB: number, c: Col, glA: Col, glB: Col, sunX: number, glow: number, fogT: number, lake = false): void {
    if (yB <= yT) return;
    const fb = this.fb, d = fb.data;
    let r0 = Math.ceil(yT - 0.5), r1 = Math.ceil(yB - 0.5);
    if (r0 < 0) r0 = 0;
    if (r1 > this.fb.h) r1 = this.fb.h;
    const inv = 1 / (yB - yT);
    const tt = Math.floor(this.time * 6);
    const gl = glow * (1 - fogT * 0.5);
    for (let r = r0; r < r1; r++) {
      const t = (r + 0.5 - yT) * inv;
      let x0 = Math.ceil(lT + (lB - lT) * t - 0.5);
      if (x0 < 0) x0 = 0;
      if (x0 >= this.fb.w) continue;
      const o = r * this.fb.w;
      d.fill(c, o + x0, o + this.fb.w);
      // Sparse broken crests, independent of sunlight, clipped to this water row.
      const depth = (r - this.horizon) / this.scale;
      const row = Math.floor(depth / (lake ? 8 : 5));
      const phase = depth + Math.sin(this.time * (lake ? .5 : 1.3) + row * .7) * (lake ? .6 : 1.8);
      if (Math.floor(phase) % (lake ? 8 : 5) === 0) {
        const spacing = Math.round((lake ? 31 : 22) * this.scale);
        const drift = Math.floor(this.time * (lake ? 1 : 4) * this.scale + row * 13 * this.scale);
        const crest = mix(c, glA, (lake ? .10 : .24) * (1 - fogT * .75));
        const width = Math.max(this.scale, Math.round((2 + Math.max(0, depth) * .05) * this.scale));
        for (let xx = -spacing + drift % spacing; xx < this.fb.w; xx += spacing) {
          const a = Math.max(x0, xx), b = Math.min(this.fb.w, xx + width);
          if (b > a) d.fill(crest, o + a, o + b);
        }
      }
      if (gl <= 0) continue;
      const half = (8 + depth * 2.1) * this.scale;
      this.glints(fb, r, sunX, half, gl, glA, glB, tt, depth * this.scale, x0);
    }
  }

  // ------------------------------------------------------------------ walls
  /** Vertical-ish face along the road at lateral offset `off` (world units). */
  private wallQuad(s: Seg, n: Seg, off: number, off2: number, f0: number, f1: number, slope: number, c: Col, camX: number, camY: number, right = false): void {
    const h1 = right ? s.wallRH : s.wallH, h2 = right ? n.wallRH : n.wallH;
    const a1 = off - slope * h1 * f0, b1 = off - slope * h1 * f1;
    const a2 = off2 - slope * h2 * f0, b2 = off2 - slope * h2 * f1;
    const n0x = this.fb.w / 2 + (s.cx1 + a1 - camX) * s.S1, n0y = this.horizon + (camY - s.y1 - h1 * f0) * s.S1;
    const f0x = this.fb.w / 2 + (s.cx2 + a2 - camX) * s.S2, f0y = this.horizon + (camY - s.y2 - h2 * f0) * s.S2;
    const f1x = this.fb.w / 2 + (s.cx2 + b2 - camX) * s.S2, f1y = this.horizon + (camY - s.y2 - h2 * f1) * s.S2;
    const n1x = this.fb.w / 2 + (s.cx1 + b1 - camX) * s.S1, n1y = this.horizon + (camY - s.y1 - h1 * f1) * s.S1;
    // (the far edge reaches a hair further so no one-pixel holes open between segments)
    this.fb.poly([n0x, n0y, f0x + (f0x - n0x) * SEAM, f0y + (f0y - n0y) * SEAM, f1x + (f1x - n1x) * SEAM, f1y + (f1y - n1y) * SEAM, n1x, n1y], c);
  }

  private rail(s: Seg, off: number, off2: number, th: Theme, fogT: number, haze: Col, camX: number, camY: number): void {
    const fb = this.fb;
    const hTop = 420, hMid = 250;
    const X1 = this.fb.w / 2 + (s.cx1 + off - camX) * s.S1, X2 = this.fb.w / 2 + (s.cx2 + off2 - camX) * s.S2;
    const beam = mix(th.railBeam, haze, fogT), shade = mix(th.railShade, haze, fogT), post = mix(th.railPost, haze, fogT);
    // post every 3rd segment
    if (s.i % 3 === 0 && s.S1 * 70 > 0.35) {
      const pw = Math.max(1, 70 * s.S1);
      fb.rect(X1 - pw / 2, this.horizon + (camY - s.y1 - hTop) * s.S1, pw, (hTop) * s.S1, post);
    }
    const yT1 = this.horizon + (camY - s.y1 - hTop) * s.S1, yM1 = this.horizon + (camY - s.y1 - hMid) * s.S1;
    const yT2 = this.horizon + (camY - s.y2 - hTop) * s.S2, yM2 = this.horizon + (camY - s.y2 - hMid) * s.S2;
    const yB1 = yM1 + (yM1 - yT1) * 0.35, yB2 = yM2 + (yM2 - yT2) * 0.35;
    fb.poly([X1, yT1, X2, yT2, X2, yM2, X1, yM1], beam);
    fb.poly([X1, yM1, X2, yM2, X2, yB2, X1, yB1], shade);
    // the rail stands in the sand: a darker strip at its foot, thrown a little towards the road (sun ahead-right)
    const sh1 = (yB1 - yM1) * 0.55, sh2 = (yB2 - yM2) * 0.55;
    if (sh1 >= 0.6) {
      const sd = mix(th.sandA, rgb(0x4a3a30), 0.42), off1 = Math.max(0.6, 0.11 * ROAD_W * s.S1), off2 = Math.max(0.6, 0.11 * ROAD_W * s.S2);
      fb.poly([X1 - off1, yB1, X2 - off2, yB2, X2 - off2 * 0.6, yB2 + sh2, X1 - off1 * 0.6, yB1 + sh1], mix(sd, haze, fogT));
    }
  }

  // ---------------------------------------------------------------- sprites
  private gateSprite(name: string, labelId: string): Spr | undefined {
    const key = name + "|" + labelId;
    let s = this.gateCache.get(key);
    if (s) return s;
    const base = this.bank.get(name);
    if (!base) return undefined;
    // draw the banner words onto a copy of the gate (text is never baked into art)
    const density = base.density ?? 1;
    const tmp = new FB(W*density,H*density);
    tmp.clear(0);
    const text = this.label(labelId);
    const bw = 228, bh = 24;
    let scale = 3;
    while (scale > 1 && textWidth(text, scale) > bw - 8) scale--;
    const red = rgb(0xc8302a), dark = rgb(0x5a1010);
    drawText(new ScaledSurface(tmp,density), text, bw / 2 + 2, 2 + (bh - 7 * scale) / 2, red, { scale, align: "center", shadow: dark });
    const data = base.data.slice();
    for (let y = 0; y < bh*density; y++) for (let x = 0; x < bw*density; x++) {
      const p = tmp.data[y * tmp.w + x];
      if (p >>> 24) data[(8*density + y) * base.w + 14*density + x] = p;
    }
    s = { w: base.w, h: base.h, data, density };
    this.gateCache.set(key, s);
    return s;
  }

  /** The fork sign with the two destinations' icons painted into its empty squares. */
  private forkSign(left: number, right: number): Spr | undefined {
    const key = `fork|${left}|${right}`;
    let s = this.gateCache.get(key);
    if (s) return s;
    const base = this.bank.get("fork_sign");
    if (!base) return undefined;
    const data = base.data.slice();
    const paste = (icon: string | undefined, ox: number, oy: number) => {
      const ic = icon ? this.bank.get(icon) : undefined;
      if (!ic) return;
      const density=base.density??1, sourceDensity=ic.density??1;
      const width=ic.w*density/sourceDensity,height=ic.h*density/sourceDensity;
      const dx=ox*density+((18*density-width)>>1),dy=oy*density+((18*density-height)>>1);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const p = ic.data[Math.floor(y*sourceDensity/density)*ic.w+Math.floor(x*sourceDensity/density)];
        const tx = dx + x, ty = dy + y;
        if ((p >>> 24) && tx >= 0 && ty >= 0 && tx < base.w && ty < base.h) data[ty * base.w + tx] = p;
      }
    };
    paste(THEMES[left]?.icon ?? 'icon_coast', FORK_ICON_L[0], FORK_ICON_L[1]);
    paste(THEMES[right]?.icon ?? 'icon_coast', FORK_ICON_R[0], FORK_ICON_R[1]);
    s = { w: base.w, h: base.h, data, density: base.density??1 };
    this.gateCache.set(key, s);
    return s;
  }

  /** World offset of the road a prop or car belongs to (-1 left road, 1 right road, else the centre line). */
  private off(s: Seg, br: number | undefined, far = false): number {
    return br === -1 ? (far ? s.oL2 : s.oL1) : br === 1 ? (far ? s.oR2 : s.oR1) : far ? s.oC2 : s.oC1;
  }

  private sprite(inst: SprInst, s: Seg, camX: number, camY: number, tint: number[], fogT: number, haze: Col, gateLabel?: string): void {
    if (inst.name === "portal") return; // the tunnel mouth's solid sides (drawn as the building face)
    let spr: Spr | undefined;
    let semantic=false;
    if(inst.destinations)spr=this.forkSign(...inst.destinations);
    else if (gateLabel) spr = this.gateSprite(inst.name, gateLabel);
    else if (inst.name === "fork_sign" && s.fork >= 0 && this.race) {
      const f = this.race.track.forks[s.fork];
      spr = f ? this.forkSign(f.left, f.right) : this.bank.get(inst.name);
    } else spr = this.bank.get(inst.name);
    if(spr) {
      const sCurve=(inst.name==='sign_left'&&s.curve>.2)||(inst.name==='sign_right'&&s.curve<-.2);
      const kind=inst.name==='hwy_sign'?(s.i%400<65?'route':'reflector'):inst.name==='gantry'?'lanes':sCurve?(inst.name==='sign_left'?'s-left':'s-right'):undefined;
      if(kind) {
        const key=`navigation|${kind}`;
        let art=this.gateCache.get(key);if(!art){art=navigationArt(spr,kind);this.gateCache.set(key,art);}
        spr=art;semantic=true;
      }
    }
    const lamp=lampPose(inst.name,inst.x);
    const scale = inst.scale * (lamp?.size??1) * SPR_S * s.S1 / (spr?.density??1);
    const x = this.fb.w / 2 + (s.cx1 + this.off(s, inst.br) + inst.x * ROAD_W - camX) * s.S1;
    const y = this.horizon + (camY - s.y1 - inst.y) * s.S1;
    if (!spr) {
      // placeholder while art loads
      const w = 30 * scale, h = 50 * scale;
      if (w > 0.5) this.fb.rect(x - w / 2, y - h, w, h, mix(rgb(0x4a8a3a), haze, fogT));
      return;
    }
    const dw = spr.w * scale;
    if (x + dw / 2 < 0 || x - dw / 2 > this.fb.w) return;
    // props perched on cliffs turn into speckle noise when tiny
    if (inst.y > 0 && dw < 5) return;
    if (dw < 10 && inst.name.startsWith("cove_tuft")) return;   // grass groups are details: they vanish before they turn into specks
    // a soft contact shadow ties vegetation, rocks and houses to the ground (the sun is ahead-right, so it falls left)
    if (dw > 7 && SHADOWED.test(inst.name) && !inst.name.startsWith("cove_village")) {
      const sw = dw * (inst.name.startsWith("palm") ? 0.34 : 0.66), sh = Math.max(1, Math.round(dw * 0.05));
      this.fb.rectA(x - sw * 0.62, y - sh + 1, sw, sh, SHADOW_COL, 0.3 * (1 - fogT));
      if (sh > 1) this.fb.rectA(x - sw * 0.45, y - sh, sw * 0.7, 1, SHADOW_COL, 0.2 * (1 - fogT));
    }
    // beach shacks and lifeguard towers stand on a boardwalk deck that overlaps their base (houses already carry their own plinth)
    if (dw > 12 && DECKED.test(inst.name)) {
      const dh = Math.max(2, Math.round(dw * 0.06)), x0 = x - dw * 0.56, ww = dw * 1.12;
      this.fb.rectA(x0 - 1, y, ww + 3, Math.max(1, dh * 0.5), SHADOW_COL, 0.28 * (1 - fogT));
      this.fb.rect(x0, y - dh, ww, dh, mix(DECK_FRONT, haze, fogT));
      this.fb.rect(x0, y - dh, ww, Math.max(1, dh * 0.45), mix(DECK_TOP, haze, fogT));
    }
    if (this.night > 0.3 && dw > 3 && inst.name.endsWith("_lit")&&!lamp) this.lightPool(inst.name, x, y, dw, s.S1, fogT);
    // small on screen: draw the half-size copy (twice if smaller still) so thin detail keeps its tone
    let sp = spr, sc = scale;
    while (sp.mip && sc < 0.6) { sp = sp.mip; sc *= 2; }
    const shrub=s.theme===14&&inst.name.startsWith('bush');
    this.fb.blit(sp, x, y, sc, { flip: semantic?false:lamp?.flip??inst.flip, tr: tint[0]*(shrub ? .7 : 1), tg: tint[1]*(shrub ? .65 : 1), tb: tint[2], fog: fogT, fogCol: haze });
  }

  /**
   * After dark a lit lamp, window or fire leaves a soft pool of its own colour on the ground at its foot, so the light
   * on the road and verge has a visible source (three stacked flat ellipses, no gradient noise).
   */
  private lightPool(name: string, x: number, y: number, dw: number, S: number, fogT: number): void {
    let col: Col, rw: number, a: number;
    if (/lamp|lantern/.test(name)) { col = LAMP_GLOW; rw = 520 * S; a = 0.2; }
    else if (/campfire/.test(name)) { col = FIRE_GLOW; rw = 420 * S; a = 0.24; }
    else if (/crystal/.test(name)) { col = CRYSTAL_GLOW; rw = dw * 1.0; a = 0.2; }
    else if (/neon|signal|billboard/.test(name)) return;
    else { col = LAMP_GLOW; rw = dw * 0.7; a = 0.13; }                       // cabins, tents, houses: a spill from the doorway
    const k = a * this.night * (1 - fogT);
    if (rw < 3 || k < 0.02) return;
    for (let i = 0; i < 3; i++) {
      const r = rw * (1 - i * 0.3), h = Math.max(1, r * 0.17);
      this.fb.rectA(x - r, y - h * 0.5, r * 2, h, col, k * (i === 0 ? 0.6 : 0.9));
    }
  }

  private car(c: Car, s: Seg, camX: number, camY: number, camZ: number, tint: number[], fogT: number, haze: Col): void {
    const spr = this.bank.get(c.sprite);
    const pct = (c.z - s.i * SEG_LEN) / SEG_LEN;
    const z = c.z - camZ;
    // cars we've already passed vanish before they balloon over the HUD
    if (z < PLAYER_Z * 0.62) return;
    const S = this.focal / z;
    const cx = s.cx1 + (s.cx2 - s.cx1) * pct;
    const wy = s.y1 + (s.y2 - s.y1) * pct;
    const lo = this.race ? this.race.laneOff(c.z / SEG_LEN, c.br ?? 0) : 0;
    const x = this.fb.w / 2 + (cx + lo + c.x * ROAD_W - camX) * S;
    const y = this.horizon + (camY - wy) * S;
    const nativeScale = SPR_S * S;
    const scale = nativeScale / (spr?.density??1);
    // shadow
    const sw = (spr ? spr.w : 70) * scale;
    if (sw > 3) this.fb.rectA(x - sw * 0.5, y - Math.max(1, 3 * nativeScale), sw, Math.max(1, 4 * nativeScale), rgb(0x10081a), 0.35);
    if (!spr) { this.fb.rect(x - 35 * scale, y - 36 * scale, 70 * scale, 36 * scale, rgb(0x3050c0)); return; }
    const by = y + (c.bounce > 0 ? -Math.round(c.bounce)*this.scale : 0);
    const lit = this.race ? this.race.carLightsOn(c) : this.night > 0 && this.night >= c.lightAt;
    // after dark: a pool of headlight on the road ahead of the car (drawn first, the car covers its near end)
    this.fb.blit(spr, x, by, scale, { tr: tint[0], tg: tint[1], tb: tint[2], fog: fogT, fogCol: haze });
    // on a wet road every car trails a veil of spray
    if (this.rainAmt > 0.05 && sw > 6) {
      const k = this.rainAmt * (1 - fogT);
      this.fb.rectA(x - sw * 0.56, y - 9 * nativeScale, sw * 1.12, 10 * nativeScale, rgb(0xc4ccd8), 0.2 * k);
      this.fb.rectA(x - sw * 0.44, y - 15 * nativeScale, sw * 0.88, 7 * nativeScale, rgb(0xc4ccd8), 0.12 * k);
    }
    if (lit) {
      const l = carLights(this.bank, c.sprite);
      if (l) {
        // lights cut through the evening haze better than paint does
        this.fb.blit(l.tail, x, by, scale, { fog: fogT * 0.35, fogCol: haze });
        this.fb.blitAdd(l.glow, x, by, scale, 0.95 * (1 - fogT * 0.5));
      }
    }
    // Every intentional lane change signals; drifting across the lane does not.
    const turn = c.turnDir ?? 0;
    if(turn && sw>4 && Math.floor((c.turnTime ?? 0)*3)%2===0) {
      const bw=Math.max(1,4*nativeScale),bh=Math.max(1,2*nativeScale);
      const bx=x+Math.sign(turn)*sw*.39-bw*.5,by=y-spr.h*scale*.22;
      this.fb.rectA(bx-bw,by-bh,bw*3,bh*3,rgb(0xffac28),.32*(1-fogT*.5));
      this.fb.rect(bx,by,bw,bh,rgb(0xffb52e));
    }
    c.sx = x / this.scale;
    c.sy = (y - spr.h * scale) / this.scale;
    c.seen = this.frame;
  }

  // ----------------------------------------------------------------- main
  render(race: Race): void {
    this.frame++;
    this.night = race.night;
    this.race = race;
    const fb = this.fb;
    const track = race.track;
    const segs = track.segs;
    const camZ = race.position;
    this.boatZ = -1;
    // World anchors are 900 segments apart: at most one can enter a 270-segment view.
    for (const stage of track.stages) {
      const theme = THEMES[stage.node];
      if (!theme || theme.side === 'land' || theme.id === 'crystal-lake') continue;
      const first = stage.startSeg + 450;
      const travel = Math.sin(this.time * .12) * 18;
      const anchor = first + Math.ceil((camZ / SEG_LEN + 55 - first - travel) / 900) * 900;
      const z = (anchor + travel) * SEG_LEN;
      if (anchor < first || anchor >= stage.endSeg - 80 || z < camZ + 55 * SEG_LEN || z > camZ + (DRAW_DIST-15) * SEG_LEN) continue;
      if (this.boatZ < 0 || z < this.boatZ) this.boatZ = z;
    }
    const camX = race.camWorldX;
    this.camX = camX;
    const rain = race.weatherAmt("rain"), fogW = race.weatherAmt("fog"), sandW = race.weatherAmt("sand"), snowW = race.weatherAmt("snow");
    this.rainAmt = rain;
    // fog and dust swallow the distance
    const thick = Math.max(fogW, sandW * 0.85, rain * 0.3, snowW * 0.26);
    const camY = race.playerY + CAM_H;
    const st = race.stageBlend;
    const thA = THEMES[st.from], thB = THEMES[st.to];
    const blendT = st.t;
    const th = blendT >= 0.5 ? thB : thA;
    const tint = [
      thA.tint[0] + (thB.tint[0] - thA.tint[0]) * blendT,
      thA.tint[1] + (thB.tint[1] - thA.tint[1]) * blendT,
      thA.tint[2] + (thB.tint[2] - thA.tint[2]) * blendT,
    ];
    // the sky turns with the view (bends, and the turn into a road at a split)
    const heading = race.bgHeading + race.viewTurn;
    const skyOff = 160 + heading * 0.45;
    const farOff = 160 + heading * 1.0;
    const sunXA = wrapNear(thA.sunX + 160 - skyOff, 640)*this.scale;
    const sunXB = wrapNear(thB.sunX + 160 - skyOff, 640)*this.scale;
    const sunX = sunXA + (sunXB - sunXA) * blendT;

    // backdrop (cross-faded across stage changes)
    this.background(fb, thA, skyOff, farOff, sunXA);
    if (blendT > 0.001 && st.from !== st.to) {
      this.background(this.scratch, thB, skyOff, farOff, sunXB);
      blendInto(fb, this.scratch, blendT);
    }
    if (thick > 0.01) fb.rectA(0, 0, this.fb.w, this.fb.h, mix(thA.haze, thB.haze, blendT), 0.62 * thick);
    // Heat distorts the distant backdrop before roads, signs and sprites exist.
    // Near silhouettes therefore stay stable throughout the shimmer cycle.
    const heat=race.weatherAmt('heat')*(1-race.tunnelAmt);
    if(heat>.01)this.shimmer(heat*(th.id==='gold-rush-town'?.6:1));

    // project visible segments
    const base = track.seg(camZ);
    const basePct = (camZ - base.i * SEG_LEN) / SEG_LEN;
    let dx = -(base.curve * basePct);
    let x = 0;
    const vis = this.visible;
    vis.length = 0;
    for (let n = 0; n < DRAW_DIST; n++) {
      const s = segs[base.i + n];
      if (!s) break;
      const z1 = s.i * SEG_LEN - camZ, z2 = z1 + SEG_LEN;
      s.cx1 = x; s.cx2 = x + dx;
      s.cz1 = z1; s.cz2 = z2;
      x += dx; dx += s.curve;
      if (z1 <= 20) continue;
      s.S1 = this.focal / z1; s.S2 = this.focal / z2;
      // where each road of a split runs this frame (all three coincide on a plain road)
      s.oL1 = race.segOff(s, -1, false); s.oL2 = race.segOff(s, -1, true);
      s.oR1 = race.segOff(s, 1, false); s.oR2 = race.segOff(s, 1, true);
      s.oC1 = race.segOff(s, 0, false); s.oC2 = race.segOff(s, 0, true);
      const po1 = race.forkSide ? (race.forkSide < 0 ? s.oL1 : s.oR1) : s.oC1, po2 = race.forkSide ? (race.forkSide < 0 ? s.oL2 : s.oR2) : s.oC2;
      s.X1 = this.fb.w / 2 + (s.cx1 + po1 - camX) * s.S1; s.X2 = this.fb.w / 2 + (s.cx2 + po2 - camX) * s.S2;
      s.Y1 = this.horizon + (camY - s.y1) * s.S1; s.Y2 = this.horizon + (camY - s.y2) * s.S2;
      s.W1 = ROAD_W * s.S1; s.W2 = ROAD_W * s.S2;
      vis.push(s);
    }

    this.prepareLights(race);
    const nearList: Seg[] = [];
    const carsBySeg = race.carsBySeg;
    for (let k = vis.length - 1; k >= 0; k--) {
      const s = vis[k];
      const n = segs[s.i + 1] ?? s;
      const sth = THEMES[s.theme];
      const d = s.cz1 / (DRAW_DIST * SEG_LEN);
      const fd = Math.max(0, (d - FOG_START) / (1 - FOG_START));
      let fogT = Math.min(1, fd * fd * 1.1);
      if (thick > 0.01) fogT = Math.max(fogT, thick * Math.min(1, 1 - Math.exp(-d * 7.5)));
      // deep in a tunnel things fade into the dark, not into the evening haze
      const haze = s.tunnel ? mix(sth.haze, TUN_DARK, 0.6) : mix(sth.haze, th.haze, 0.5);
      this.segment(s, n, sth, fogT, haze, camX, camY, sunX, th);
      if (s.cz1 > PLAYER_Z - SEG_LEN * 0.5) this.segSprites(s, carsBySeg.get(s.i), camX, camY, camZ, tint, fogT, haze);
      else nearList.push(s);
    }
    // in a tunnel the car flashes under each ceiling lamp as it passes
    let ptint = tint;
    const tun = race.tunnelAmt;
    if (tun > 0.01) {
      const ph = (race.playerZ / SEG_LEN / 4) % 1;
      const k = 0.88 + 0.34 * (0.5 + 0.5 * Math.cos(ph * Math.PI * 2));
      ptint = [tint[0] + (1.08 * k - tint[0]) * tun, tint[1] + (0.95 * k - tint[1]) * tun, tint[2] + (0.84 * k - tint[2]) * tun];
    }
    race.drawPlayer(this.logical, this.bank, ptint);
    // during a tumble crash, roadside props between the camera and the car would hide the scene
    const propsNear = race.tumbleT < 0;
    for (const s of nearList) {
      const sth = THEMES[s.theme];
      this.segSprites(s, carsBySeg.get(s.i), camX, camY, camZ, tint, 0, sth.haze, propsNear);
    }
    this.weather(race, mix(thA.haze, thB.haze, blendT));
  }

  // --------------------------------------------------------------- weather
  private weather(race: Race, haze: Col): void {
    const dt = Math.max(0, Math.min(0.05, this.time - this.lastT));
    this.lastT = this.time;
    const dry = 1 - race.tunnelAmt; // no rain, dust or fog inside a tunnel
    const rain = race.weatherAmt("rain") * dry, fog = race.weatherAmt("fog") * dry, sand = race.weatherAmt("sand") * dry, heat = race.weatherAmt("heat") * dry;
    const sp = race.speed / MAX_SPEED;
    if (fog > 0.01) this.fogBanks(fog, haze);
    if (sand > 0.01) this.sandstorm(sand, haze);
    if (rain > 0.01) this.rain(rain, race, dt, sp);
    else this.drops.length = 0;
    const snow = race.weatherAmt("snow") * dry;
    if (snow > 0.01) this.snow(snow, race, dt, sp);
    else this.flakes.length = 0;
  }

  /** Rows near the horizon wobble in the heat. */
  private shimmer(k: number): void {
    const d = this.fb.data, row = this.row;
    for (let y = this.horizon - 9*this.scale; y < this.horizon + 9*this.scale; y++) {
      const a = Math.max(0, 1 - Math.abs(y/this.scale - (HORIZON + 1)) / 10) * k;
      const sh = Math.round(Math.sin(this.time * 2.2 + y/this.scale * .45) * 1.15 * a)*this.scale;
      if (!sh) continue;
      const o = y * this.fb.w;
      row.set(d.subarray(o, o + this.fb.w));
      for (let x = 0; x < this.fb.w; x++) d[o + x] = row[Math.max(0, Math.min(this.fb.w - 1, x - sh))];
    }
  }

  /** Blend each native pixel so a weather mark retains the finer world detail beneath it. */
  private mixLogicalPixel(x: number, y: number, c: Col, amount: number): void {
    const left=(x|0)*this.scale,top=(y|0)*this.scale;
    for(let dy=0;dy<this.scale;dy++)for(let dx=0;dx<this.scale;dx++){
      const xx=left+dx,yy=top+dy;
      if(xx<0||xx>=this.fb.w||yy<0||yy>=this.fb.h)continue;
      const at=yy*this.fb.w+xx;
      this.fb.data[at]=mix(this.fb.data[at],c,amount);
    }
  }

  /** Banks of fog drifting across the road. */
  private fogBanks(k: number, haze: Col): void {
    const fb = this.logical, t = this.time;
    for (let y = HORIZON - 26; y < H; y += 2) {
      const band = y < HORIZON ? 0.55 : y < 130 ? 1 : Math.max(0.25, 1 - (y - 130) / 60);
      for (let x = 0; x < W; x += 8) {
        const v = 0.5 + 0.5 * Math.sin(x * 0.021 + t * 0.32 + Math.sin(y * 0.06 + t * 0.1) * 2.2) * Math.sin(x * 0.007 - t * 0.21 + y * 0.03);
        const a = k * band * 0.3 * v;
        if (a > 0.02) fb.rectA(x, y, 8, 2, haze, a);
      }
    }
  }

  /** Sand haze stays cheap; the HUD windsock carries direction and strength. */
  private sandstorm(k: number, haze: Col): void {
    this.logical.rectA(0, 0, W, H, mix(haze, rgb(0xc07840), .4), .1 * k);
  }

  /** Snowfall: big soft flakes close by, small ones far off, all swaying and drifting with the steering. */
  private snow(k: number, race: Race, dt: number, sp: number): void {
    const fb = this.logical;
    fb.rectA(0, 0, W, H, rgb(0xdce6f6), 0.05 * k);
    const want = Math.round(125 * k);
    while (this.flakes.length < want) this.flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 16 + Math.random() * 30, ph: Math.random() * 6.28, big: Math.random() < 0.28 });
    if (this.flakes.length > want) this.flakes.length = want;
    const steer = race.steer || 0;
    const white = rgb(0xffffff), blue = rgb(0xc4d4f0);
    for (const p of this.flakes) {
      p.y += (p.v * (p.big ? 1.7 : 1) + sp * (p.big ? 70 : 24)) * dt;
      p.x += (Math.sin(this.time * 1.7 + p.ph) * (p.big ? 16 : 9) - 9 - steer * (p.big ? 46 : 22)) * dt;
      if (p.y >= H) { p.y = -2; p.x = Math.random() * (W + 20) - 10; }
      if (p.x < -3) p.x = W + 2;
      else if (p.x > W + 3) p.x = -2;
      const xx = p.x | 0, yy = p.y | 0;
      if (xx < 0 || xx >= W - 1 || yy < 0 || yy >= H - 1) continue;
      const o = yy * W + xx;
      if (p.big) {
        this.mixLogicalPixel(xx,yy,white,0.92);
        this.mixLogicalPixel(xx+1,yy,white,0.7);
        this.mixLogicalPixel(xx,yy+1,blue,0.6);
        this.mixLogicalPixel(xx+1,yy+1,blue,0.4);
      } else {
        this.mixLogicalPixel(xx,yy,white,0.72);
      }
    }
  }

  /** Rain streaks, splashes on the road and the odd flash of lightning. */
  private rain(k: number, race: Race, dt: number, sp: number): void {
    const fb = this.logical;
    const want = Math.round(170 * k);
    while (this.drops.length < want) {
      const near = Math.random() < 0.35;
      this.drops.push({ x: Math.random() * (W + 40) - 20, y: Math.random() * H, v: near ? 380 + Math.random() * 120 : 250 + Math.random() * 90, len: near ? 7 + Math.random() * 4 : 3 + Math.random() * 3, near, col: near ? rgb(0xdce6f4) : rgb(0xa8b6cc) });
    }
    if (this.drops.length > want) this.drops.length = want;
    const slant = -0.16 - (race.steer || 0) * 0.12;
    for (const p of this.drops) {
      p.y += p.v * (1 + sp * 0.4) * dt;
      p.x += p.v * slant * dt;
      if (p.y > H || p.x < -20) { p.y = -Math.random() * 20; p.x = Math.random() * (W + 60) - 10; }
      const len = Math.round(p.len);
      for (let q = 0; q < len; q++) {
        const yy = (p.y - q) | 0, xx = (p.x - q * slant) | 0;
        if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
        const o = yy * W + xx;
        this.mixLogicalPixel(xx,yy,p.col,p.near ? 0.55 : 0.32);
      }
    }
    // splashes dancing on the tarmac
    const n = Math.round(13 * k);
    for (let i = 0; i < n; i++) {
      const y = 112 + Math.floor(Math.random() * 64);
      const road=this.visible.find(s=>s.Y2/this.scale<y&&s.Y1/this.scale>=y);
      if(!road)continue;
      const u=(y*this.scale-road.Y2)/(road.Y1-road.Y2),cx=(road.X2+(road.X1-road.X2)*u)/this.scale;
      const half=(road.W2+(road.W1-road.W2)*u)/this.scale;
      const x = Math.floor(cx + (Math.random() - 0.5) * half * 1.7);
      if (x < 1 || x >= W - 1) continue;
      const c = rgb(0xe4ecf6);
      fb.pset(x, y, c);
      if (y > 140) { this.mixLogicalPixel(x-1,y-1,c,0.5); this.mixLogicalPixel(x+1,y-1,c,0.5); }
    }
    // spray thrown up by our own rear tyres
    if (sp > 0.25 && race.tumbleT < 0) {
      const cx = race.carScreenX(), cy = race.carScreenY();
      const a = 0.32 * k * Math.min(1, (sp - 0.25) * 2.5);
      for (const side of [-1, 1]) {
        const jx = (Math.random() - 0.5) * 4;
        for(let puff=0;puff<3;puff++) {
          const px=cx+side*(26+puff*3)+jx,py=cy-7-puff*4;
          fb.rectA(px-4,py,8-puff,3,rgb(0xd0d8e4),a*(1-puff*.22));
          fb.rectA(px-2,py-2,4,2,rgb(0xd0d8e4),a*.4);
        }
      }
    }
    // lightning: a jagged bolt and a white flash
    const fl = race.flash;
    if (fl > 0.72) this.bolt(race.boltX, race.boltSeed);
    if ((fl > 0.62) || (fl > 0.3 && fl < 0.45)) fb.rectA(0, 0, W, H, rgb(0xeef0ff), (fl > 0.62 ? 0.42 : 0.22) * k);
  }

  private bolt(x0: number, seed: number): void {
    let h = seed >>> 0;
    const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return h / 4294967296; };
    const core = rgb(0xffffff), glow = rgb(0xb8a8ff);
    const strand = (x: number, y: number, yEnd: number, w: number) => {
      while (y < yEnd) {
        const nx = x + (rnd() - 0.5) * 7, ny = y + 2 + rnd() * 4;
        const steps = Math.ceil(ny - y);
        for (let k = 0; k <= steps; k++) {
          const px = Math.round(x + ((nx - x) * k) / steps), py = Math.round(y + k);
          this.logical.pset(px - 1, py, glow); this.logical.pset(px + 1, py, glow);
          this.logical.pset(px, py, core);
          if (w > 1) this.logical.pset(px + 1, py, core);
        }
        if (w > 1 && rnd() < 0.12) strand(nx, ny, Math.min(yEnd, ny + 14 + rnd() * 16), 1);
        x = nx; y = ny;
      }
    };
    strand(x0, 0, HORIZON - 4 - rnd() * 14, 2);
  }

  private prepareLights(race:Race):void {
    this.headSources.length=0;this.lampSources.length=0;
    const axis=(z:number,x:number,br:number)=>{
      const s=race.track.seg(z),t=(z-s.i*SEG_LEN)/SEG_LEN;
      return lightAxis(s.cx1+this.off(s,br),s.cx2+this.off(s,br,true),t,x*ROAD_W,SEG_LEN);
    };
    const head=(z:number,x:number,br:number,from:number,to:number,gain:number)=>{
      if(z<race.position+SEG_LEN||z>race.position+(DRAW_DIST-to-1)*SEG_LEN)return;
      const a=axis(z,x,br);this.headSources.push({z,x:a.x,slope:a.slope,br,from,to,gain});
    };
    if(race.lightsOn&&race.tumbleT<0)head(race.playerZ,race.playerX,race.forkSide,
      race.signalFlash?2:3,race.signalFlash?78:48,race.signalFlash?1.05:.29);
    for(const c of race.cars)if(race.carLightsOn(c))head(c.z,c.x,c.br??0,2,27,.19);
    if(this.night<.25)return;
    for(const s of this.visible)for(const p of s.sprites) {
      const pose=lampPose(p.name,p.x);if(!pose||p.y>50)continue;
      const a=axis(s.i*SEG_LEN,p.x,p.br??0),spr=this.bank.get(p.name);
      const dx=(spr?spr.w/(spr.density??1):16)*p.scale*pose.size*SPR_S*pose.head*(pose.flip?-1:1);
      this.lampSources.push({z:s.i*SEG_LEN,x:a.x+dx,slope:a.slope,br:p.br??0,
        radius:p.name==='gas_lamp_lit'?2300:3300,gain:Math.min(1,this.night*1.25)});
    }
  }

  /** Ground light is drawn with the road, before scenery can occlude it. */
  private groundLights(s:Seg):void {
    if(s.Y2>=s.Y1)return;
    // All light strips share this row interval. Far slices often cover no pixel.
    if(Math.min(this.fb.h,Math.ceil(s.Y1-.5))<=Math.max(0,Math.ceil(s.Y2-.5)))return;
    const strip=(x0:number,x1:number,w0:number,w1:number,k0:number,k1:number,br:number,verge:number)=>{
      const center0=this.fb.w/2+(s.cx1+this.off(s,br)-this.camX)*s.S1;
      const center1=this.fb.w/2+(s.cx2+this.off(s,br,true)-this.camX)*s.S2;
      const n=this.fb.w/2+(x0-this.camX)*s.S1,f=this.fb.w/2+(x1-this.camX)*s.S2;
      this.fb.lightTrap(s.Y2,Math.max(f-w1*s.S2,center1-verge*s.W2),Math.min(f+w1*s.S2,center1+verge*s.W2),
        s.Y1,Math.max(n-w0*s.S1,center0-verge*s.W1),Math.min(n+w0*s.S1,center0+verge*s.W1),HEADLIGHT,k1,k0);
    };
    for(const h of this.headSources) {
      const dz=s.i*SEG_LEN-h.z,t=(dz/SEG_LEN-h.from)/(h.to-h.from);
      if(t<0||t>1)continue;
      const t1=Math.min(1,t+1/(h.to-h.from)),x0=h.x+h.slope*dz,x1=h.x+h.slope*(dz+SEG_LEN);
      strip(x0,x1,(.18+t*.39)*ROAD_W,(.18+t1*.39)*ROAD_W,h.gain*(.05+.95*(1-t)**2),h.gain*(.05+.95*(1-t1)**2),h.br,1.48);
    }
    for(const p of this.lampSources) {
      const dz=s.i*SEG_LEN-p.z;if(Math.abs(dz)>p.radius+SEG_LEN)continue;
      for(const ring of [1,.78,.53,.27]) {
        const r=p.radius*ring,w0=Math.sqrt(Math.max(0,r*r-dz*dz)),w1=Math.sqrt(Math.max(0,r*r-(dz+SEG_LEN)**2));
        if(w0+w1<1)continue;
        strip(p.x+p.slope*dz,p.x+p.slope*(dz+SEG_LEN),w0,w1,.07*p.gain,.07*p.gain,p.br,1.95);
      }
    }
  }

  /** A world-space boat is painted in the same depth pass as roadside scenery. */
  private sailboat(s: Seg, camX: number, camY: number, camZ: number, fogT: number, haze: Col): void {
    const th = THEMES[s.theme];
    if (th.side === 'land' || th.id === 'crystal-lake') return;
    const z = this.boatZ - camZ, S = this.focal / z;
    const pct = (this.boatZ / SEG_LEN) - s.i;
    const cx = s.cx1 + (s.cx2 - s.cx1) * pct, wy = s.y1 + (s.y2 - s.y1) * pct;
    const off = this.race?.laneOff(this.boatZ / SEG_LEN, 1) ?? 0;
    const lateral = (1.14 + s.beach + 4 + Math.sin(this.time * .18) * .7) * ROAD_W;
    const x = this.fb.w/2 + (cx + off + lateral - camX) * S;
    const u = 300 * S, y = this.horizon + (camY - wy) * S + Math.sin(this.time * 1.8) * u * .18;
    const fade = Math.min(1, Math.max(0, (z/SEG_LEN-55)/25), Math.max(0, (DRAW_DIST-15-z/SEG_LEN)/25));
    const fog = Math.max(fogT, 1-fade), col = (c:Col) => mix(c, haze, fog);
    if (u < .3 || x < -12*u || x > this.fb.w+12*u || fade < .03) return;
    const lean = Math.sin(this.time * 1.3) * .35;
    const poly = (pts:number[], c:Col) => this.fb.poly(pts.map((v,i)=>i%2 ? y+v*u : x+(v+lean)*u),col(c));
    // A broken wake behind the hull rather than a bright solid platform.
    this.fb.rectA(x-9*u,y+.5*u,8*u,Math.max(1,this.scale),th.foam,.3*fade*(1-fogT));
    this.fb.rectA(x-12*u,y+1.3*u,5*u,Math.max(1,this.scale),th.foam,.18*fade*(1-fogT));
    poly([-4,0,4.5,0,3,1.2,-2.5,1.2],mix(rgb(0x98543a),th.seaN,.35));
    this.fb.rect(x+lean*u,y-10*u,Math.max(1,.4*u),10*u,col(rgb(0x6a5044)));
    poly([-.4,-9.7,-.4,-.7,-4,-.7],mix(rgb(0xfff4d0),th.haze,.2+(th.dark??0)*.5));
    poly([.6,-8.7,.6,-.7,4.3,-.7],mix(rgb(0xf49759),th.haze,.22+(th.dark??0)*.5));
  }

  private segSprites(s: Seg, cars: Car[] | undefined, camX: number, camY: number, camZ: number, tint: number[], fogT: number, haze: Col, props = true): void {
    if (this.boatZ >= s.i * SEG_LEN && this.boatZ < (s.i + 1) * SEG_LEN && !s.tunnel) this.sailboat(s, camX, camY, camZ, fogT, haze);
    const sp = s.sprites;
    let over = false;
    for (let i = 0; i < (props ? sp.length : 0); i++) {
      const inst = sp[i];
      if (OVERHEAD.has(inst.name)) { over = true; continue; }
      this.sprite(inst, s, camX, camY, tint, fogT, haze);
    }
    if (cars) for (const c of cars) this.car(c, s, camX, camY, camZ, tint, fogT, haze);
    // banners and sign bridges span the road above the cars
    if (over) {
      for (const inst of sp) {
        if (!OVERHEAD.has(inst.name)) continue;
        const lbl = inst.name.startsWith("gate") ? inst.label ?? s.gate?.label : undefined;
        this.sprite(inst, s, camX, camY, tint, fogT, haze, lbl);
      }
    }
  }

  private segment(s: Seg, n: Seg, th: Theme, fogT: number, haze: Col, camX: number, camY: number, sunX: number, cur: Theme): void {
    const fb = this.fb;
    const { Y1, W1, Y2, W2 } = s;
    const front = Y2 < Y1; // facing the camera (not hidden behind a crest)
    const alt = (s.i >> 2) & 1;
    const stripe = (s.i >> 3) & 1;
    const f = (c: Col) => (fogT > 0.003 ? mix(c, haze, fogT) : c);
    const land = th.side === "land";
    // a split draws two roads (left & right); a plain road is drawn once
    const two = s.fork >= 0 && s.oR1 - s.oL1 > 1;
    const xL1 = this.fb.w / 2 + (s.cx1 + s.oL1 - camX) * s.S1, xL2 = this.fb.w / 2 + (s.cx2 + s.oL2 - camX) * s.S2;
    const xR1 = this.fb.w / 2 + (s.cx1 + s.oR1 - camX) * s.S1, xR2 = this.fb.w / 2 + (s.cx2 + s.oR2 - camX) * s.S2;
    const xC1 = this.fb.w / 2 + (s.cx1 + s.oC1 - camX) * s.S1, xC2 = this.fb.w / 2 + (s.cx2 + s.oC2 - camX) * s.S2;
    if (front) {
      const ground = f(LANDSCAPES[s.theme]?.colors[1] ?? (stripe ? th.groundA : th.groundB));
      const shoulder = f(stripe ? th.sandA : th.sandB);
      if (land) {
        // inland: ground on both sides
        fb.trap(Y2, 0, this.fb.w, Y1, 0, this.fb.w, ground);
      } else {
        // land side ground (and the median of a split) and sea side water
        fb.trap(Y2, 0, xR2, Y1, 0, xR1, ground);
        const sea = mix(((s.i / 5) | 0) & 1 ? th.seaA : th.seaB, th.seaH, Math.min(1, fogT * 1.2 + 0.08 * fogT));
        const beachOut = 1.12 + 0.02 + s.beach;
        this.seaTrap(Y2, xR2 + W2 * beachOut, Y1, xR1 + W1 * beachOut, sea, cur.glitter, cur.glitter2, sunX, cur.sunGlow*(cur.id==='crystal-lake'?.48:1), fogT, th.id==='crystal-lake');
        // beach / shoulder on the sea side, foam at the water's edge
        fb.trap(Y2, xR2, xR2 + W2 * beachOut, Y1, xR1, xR1 + W1 * beachOut, shoulder);
        const lake=th.id==='crystal-lake';
        const foamW = lake ? .008+.004*Math.sin(s.i*.07+this.time*.7) : 0.05 + 0.03 * Math.sin(s.i * 0.15 + this.time * 2.2);
        fb.trap(Y2, xR2 + W2 * beachOut, xR2 + W2 * (beachOut + foamW), Y1, xR1 + W1 * beachOut, xR1 + W1 * (beachOut + foamW), f(th.foam));
        if (!lake) {
          const wash = .5 + .5 * Math.sin(s.i * .055 - this.time * 1.7);
          const crest = beachOut + .06 + wash * .13;
          if (((s.i / 9) | 0) % 4 !== 0) fb.trap(Y2, xR2 + W2 * crest, xR2 + W2 * (crest + .012 + wash * .018), Y1, xR1 + W1 * crest, xR1 + W1 * (crest + .012 + wash * .018), f(mix(th.seaA, th.foam, .35 + wash * .35)));
        }
      }
      const roads: [number, number][] = two ? [[xL1, xL2], [xR1, xR2]] : [[xC1, xC2]];
      // shoulders: the land side of every road, both sides inland and along the median
      roads.forEach(([a1, a2], k) => {
        fb.trap(Y2, a2 - W2 * 1.42, a2, Y1, a1 - W1 * 1.42, a1, shoulder);
        if (land || (two && k === 0)) fb.trap(Y2, a2, a2 + W2 * 1.42, Y1, a1, a1 + W1 * 1.42, shoulder);
      });
      // rumble strips, then tarmac over them (where two roads overlap the tarmac merges)
      const rum = f(alt ? th.rumbleA : th.rumbleB);
      for (const [a1, a2] of roads) fb.trap(Y2, a2 - W2 * 1.12, a2 + W2 * 1.12, Y1, a1 - W1 * 1.12, a1 + W1 * 1.12, rum);
      let tar = f(stripe ? th.asphaltA : th.asphaltB);
      if (s.tunnel && s.i % 4 < 2) tar = f(mix(stripe ? th.asphaltA : th.asphaltB, TUN_LAMP, 0.1)); // pools of lamp light
      for (const [a1, a2] of roads) fb.trap(Y2, a2 - W2, a2 + W2, Y1, a1 - W1, a1 + W1, tar);
      // glazed ice: a pale blue-white sheen over the tarmac, with a glint stripe running down it
      if (s.ice > 0 && !two) {
        const l = s.iceL, r = s.iceR;
        const sheen = f(mix(stripe ? th.asphaltA : th.asphaltB, ICE_COL, 0.42 + 0.4 * s.ice));
        fb.trap(Y2, xC2 + W2 * l, xC2 + W2 * r, Y1, xC1 + W1 * l, xC1 + W1 * r, sheen);
        if (W1 > 5) {
          const g0 = l + (r - l) * (0.2 + 0.1 * Math.sin(s.i * 0.07)), gw = 0.07 + 0.05 * s.ice;
          const glint = f(mix(sheen, ICE_GLINT, ((s.i >> 1) & 1) ? 0.75 : 0.45));
          fb.trap(Y2, xC2 + W2 * g0, xC2 + W2 * (g0 + gw), Y1, xC1 + W1 * g0, xC1 + W1 * (g0 + gw), glint);
          const g1 = r - (r - l) * 0.25;
          fb.trap(Y2, xC2 + W2 * g1, xC2 + W2 * (g1 + gw * 0.6), Y1, xC1 + W1 * g1, xC1 + W1 * (g1 + gw * 0.6), f(mix(sheen, ICE_GLINT, 0.35)));
        }
      }
      // edge lines and lane dashes (in a split, each road only paints its own side of the old centre line)
      const ln = f(th.lane);
      const mid1 = two ? this.fb.w / 2 + (s.cx1 + s.oC1 - camX) * s.S1 : 0;
      const keep = (k: number, a1: number, lx: number) => !two || (k === 0 ? a1 + W1 * lx < mid1 : a1 + W1 * lx > mid1);
      roads.forEach(([a1, a2], k) => {
        if (W1 > 8) {
          if (keep(k, a1, -0.94)) fb.trap(Y2, a2 - W2 * 0.96, a2 - W2 * 0.92, Y1, a1 - W1 * 0.96, a1 - W1 * 0.92, ln);
          if (keep(k, a1, 0.94)) fb.trap(Y2, a2 + W2 * 0.92, a2 + W2 * 0.96, Y1, a1 + W1 * 0.92, a1 + W1 * 0.96, ln);
        }
        if (s.i % 16 < 6 && W1 > 6) {
          const lw = 0.026;
          for (let l = 1; l < LANES; l++) {
            const lx = -1 + (2 * l) / LANES;
            if (!keep(k, a1, lx)) continue;
            fb.trap(Y2, a2 + W2 * (lx - lw), a2 + W2 * (lx + lw), Y1, a1 + W1 * (lx - lw), a1 + W1 * (lx + lw), ln);
          }
        }
      });
      // start / goal line
      if (s.chequer) {
        const cells = 16;
        for (let k = 0; k < cells; k++) {
          const a = -1 + (2 * k) / cells, b = a + 2 / cells;
          fb.trap(Y2, xC2 + W2 * a, xC2 + W2 * b, Y1, xC1 + W1 * a, xC1 + W1 * b, (k & 1) ? WHITE : rgb(0x202028));
        }
      }
    }
    // a tunnel mouth just beyond this segment: the building face around the opening
    // (in front of the tunnel, behind this segment's own towers)
    if (n.tunnel && !s.tunnel && n !== s) this.portal(s, n, th, fogT, haze, camX, camY);
    if (s.tunnel) { this.tunnelBox(s, th, fogT, haze, camX, camY); return; }
    this.groundLights(s);
    // sea-side guardrail (beside the right road)
    if (!land && s.rail && n.rail) this.rail(s, s.oR1 + ROAD_W * RAIL_X, s.oR2 + ROAD_W * RAIL_X, th, fogT, haze, camX, camY);
    // land-side wall (cliff / hill / forest / sea wall / sound wall / towers), beside the left road
    if(s.landscape) this.paintedLand(s,n,th,f,camX,camY,false);
    else if(th.wall==='sound') this.soundWall(s,n,th,f,camX,camY,false);
    else if (s.cove || s.bluffs) this.coveLand(s, n, th, f, camX, camY);
    else if (th.wall === "city") this.cityWall(s, n, th, false, fogT, haze, camX, camY);
    else if (s.wallH > 0 && n.wallH > 0) this.wall(s, n, th, th.wall, s.oL1 - s.wallOff * ROAD_W, s.oL2 - s.wallOff * ROAD_W, f, camX, camY, false);
    // right-hand wall of an inland road
    if(s.landscape?.right)this.paintedLand(s,n,th,f,camX,camY,true);
    else if(land&&th.wallR==='sound')this.soundWall(s,n,th,f,camX,camY,true);
    else if (land && th.wallR === "city") this.cityWall(s, n, th, true, fogT, haze, camX, camY);
    else if (land && s.wallRH > 0 && n.wallRH > 0) this.wall(s, n, th, th.wallR ?? "none", s.oR1 + s.wallROff * ROAD_W, s.oR2 + s.wallROff * ROAD_W, f, camX, camY, true);
  }

  // ------------------------------------------------------------ city & tunnels
  /** Pick (and haze) the colours of tower `seed`. */
  private towerCols(th: Theme, seed: number, fogT: number, haze: Col): TowerCols {
    const tc = this.tc;
    const bands = th.wallBands, wins = th.windows ?? [rgb(0xffd890)];
    const lf = fogT * 0.75; // lit windows cut through the haze a little better
    tc.body = mix(bands[seed % bands.length][(seed >> 4) & 1], haze, fogT);
    tc.litA = mix(wins[(seed >> 3) % wins.length], haze, lf);
    tc.litB = mix(wins[(seed >> 7) % wins.length], haze, lf);
    tc.shop = mix(wins[(seed >> 5) & 1 ? 0 : 3 % wins.length], haze, lf);
    tc.dark = mix(th.windowDark ?? rgb(0x161830), haze, fogT);
    tc.litP = 0.20 + ((seed >> 9) % 100) * 0.0026;
    tc.trim = (seed >> 11) % 3 === 0 ? mix(th.wallTop[(seed >> 13) & 1], haze, fogT * 0.6) : 0;
    tc.far = mix(tc.body, tc.litA, 0.16 + tc.litP * 0.2);
    return tc;
  }

  /** One side of a city street: the tower beside this segment, and the front of a taller one behind it. */
  private cityWall(s: Seg, n: Seg, th: Theme, right: boolean, fogT: number, haze: Col, camX: number, camY: number): void {
    const seed = right ? s.bR : s.bL, nseed = right ? n.bR : n.bL;
    const h1 = right ? s.wallRH : s.wallH, hn = right ? n.wallRH : n.wallH;
    const dir = right ? 1 : -1;
    const off = dir * (right ? s.wallROff : s.wallOff) * ROAD_W;
    const o1 = (right ? s.oR1 : s.oL1) + off, o2 = (right ? s.oR2 : s.oL2) + off;
    // the next tower is taller (or this is an alley): its front shows above / beside this one
    if (nseed && nseed !== seed && hn > h1 && !n.tunnel) this.towerFront(s, th, nseed, o2, dir, seed ? h1 : 0, hn, fogT, haze, camX, camY);
    if (!seed || h1 <= 0) return;
    this.towerSide(s, th, seed, o1, o2, h1, nseed === seed ? hn : h1, fogT, haze, camX, camY);
  }

  /** A tower's face along the road: storeys of lit and dark windows, shops at street level, maybe a neon roof line. */
  private towerSide(s: Seg, th: Theme, seed: number, o1: number, o2: number, h1: number, h2: number, fogT: number, haze: Col, camX: number, camY: number): void {
    const S1 = s.S1, S2 = s.S2;
    const xa = this.fb.w / 2 + (s.cx1 + o1 - camX) * S1, xb = this.fb.w / 2 + (s.cx2 + o2 - camX) * S2;
    const yBa = this.horizon + (camY - s.y1) * S1, yBb = this.horizon + (camY - s.y2) * S2;
    const yTa = yBa - h1 * S1, yTb = yBb - h2 * S2;
    const tc = this.towerCols(th, seed, fogT, haze);
    if (FLOOR_H * S2 < 2.2) {
      // far away the windows blur into the wall
      this.fb.poly([xa, yBa, xb, yBb, xb, yTb, xa, yTa], tc.far);
      if (tc.trim && 300 * S2 > 0.5) this.fb.poly([xa, yTa + 300 * S1, xb, yTb + 300 * S2, xb, yTb, xa, yTa], tc.trim);
      return;
    }
    const dx = xb - xa;
    if (Math.abs(dx) < 0.2) return;
    const d = this.fb.data;
    let c0 = Math.ceil(Math.min(xa, xb) - 0.5), c1 = Math.ceil(Math.max(xa, xb) - 0.5);
    if (c0 < 0) c0 = 0;
    if (c1 > this.fb.w) c1 = this.fb.w;
    const trim = tc.trim, body = tc.body, dark = tc.dark, litP = tc.litP, litH = litP * 0.5;
    for (let x = c0; x < c1; x++) {
      const t = (x + 0.5 - xa) / dx;
      if (t < 0 || t > 1) continue;
      const u = (t * S2) / ((1 - t) * S1 + t * S2); // perspective-correct position along the segment
      const yB = yBa + (yBb - yBa) * t, yT = yTa + (yTb - yTa) * t;
      let r0 = Math.ceil(yT - 0.5), r1 = Math.ceil(yB - 0.5);
      if (r0 < 0) r0 = 0;
      if (r1 > this.fb.h) r1 = this.fb.h;
      if (r1 <= r0) continue;
      const hh = h1 + (h2 - h1) * u;
      const perPx = hh / (yB - yT);
      const cu = u * 2, ci = cu | 0, cf = cu - ci;
      const winCol = cf > 0.17 && cf < 0.83;
      const col = s.i * 2 + ci;
      let o = r0 * this.fb.w + x;
      for (let r = r0; r < r1; r++, o += this.fb.w) {
        const h = (yB - r - 0.5) * perPx;
        let c = body;
        if (trim && h > hh - 300) c = trim;
        else if (winCol) {
          const fl = h * INV_FLOOR, f = fl | 0, fy = fl - f;
          if (f === 0) { if (fy > 0.1 && fy < 0.72) c = hashI(col >> 1, 0, seed) < 0.7 ? tc.shop : dark; }
          else if (fy > 0.3 && fy < 0.78) { const hv = hashI(col >> 1, f >> 1, seed); c = hv < litP ? (hv < litH ? tc.litA : tc.litB) : dark; }
        }
        d[o] = c;
      }
    }
  }

  /** The face of a taller tower turned toward the camera, at the far edge of segment `s`, from height hLo up to hHi. */
  private towerFront(s: Seg, th: Theme, seed: number, o2: number, dir: number, hLo: number, hHi: number, fogT: number, haze: Col, camX: number, camY: number): void {
    const S = s.S2;
    const xIn = this.fb.w / 2 + (s.cx2 + o2 - camX) * S;
    const xOut = xIn + dir * 3.5 * ROAD_W * S;
    const yb = this.horizon + (camY - s.y2) * S;
    const yLo = yb - hLo * S, yHi = yb - hHi * S;
    const tc = this.towerCols(th, seed, fogT, haze);
    const shade = mix(tc.body, rgb(0x0c0a18), 0.25); // this side faces away from the light
    let c0 = Math.ceil(Math.min(xIn, xOut) - 0.5), c1 = Math.ceil(Math.max(xIn, xOut) - 0.5);
    let r0 = Math.ceil(yHi - 0.5), r1 = Math.ceil(yLo - 0.5);
    if (c0 < 0) c0 = 0;
    if (c1 > this.fb.w) c1 = this.fb.w;
    if (r0 < 0) r0 = 0;
    if (r1 > this.fb.h) r1 = this.fb.h;
    if (c1 <= c0 || r1 <= r0) return;
    const d = this.fb.data;
    if (FLOOR_H * S < 2.2) {
      const c = mix(shade, tc.litA, 0.12);
      for (let r = r0; r < r1; r++) d.fill(c, r * this.fb.w + c0, r * this.fb.w + c1);
      return;
    }
    const inv = 1 / S;
    for (let x = c0; x < c1; x++) {
      const lat = Math.abs(x + 0.5 - xIn) * inv / WIN_COL;
      const ci = lat | 0, cf = lat - ci;
      const winCol = cf > 0.2 && cf < 0.8;
      let o = r0 * this.fb.w + x;
      for (let r = r0; r < r1; r++, o += this.fb.w) {
        const h = (yb - r - 0.5) * inv;
        let c = shade;
        if (tc.trim && h > hHi - 300) c = tc.trim;
        else if (winCol) {
          const fl = h * INV_FLOOR, f = fl | 0, fy = fl - f;
          if (f > 0 && fy > 0.3 && fy < 0.78) { const hv = hashI(ci + 7777, f, seed); c = hv < tc.litP ? (hv < tc.litP * 0.5 ? tc.litA : tc.litB) : tc.dark; }
        }
        d[o] = c;
      }
    }
  }

  /** The tunnel mouth: a wide block of building across the road with the opening framed in neon. */
  private portal(s: Seg, n: Seg, th: Theme, fogT: number, haze: Col, camX: number, camY: number): void {
    const S = s.S2;
    if (S <= 0) return;
    const xc = this.fb.w / 2 + (s.cx2 + s.oC2 - camX) * S, yb = this.horizon + (camY - s.y2) * S;
    const tw = TUN_W * ROAD_W * S, oh = TUN_H * S, pw = PORTAL_W * ROAD_W * S, ph = PORTAL_H * S;
    const tc = this.towerCols(th, (0x5a17 + n.i * 97) | 1, fogT, haze);
    const oxL = xc - tw, oxR = xc + tw, oyT = yb - oh;
    const c0 = Math.max(0, Math.ceil(xc - pw - 0.5)), c1 = Math.min(this.fb.w, Math.ceil(xc + pw - 0.5));
    const r0 = Math.max(0, Math.ceil(yb - ph - 0.5)), r1 = Math.min(this.fb.h, Math.ceil(yb - 0.5));
    if (c1 <= c0 || r1 <= r0) return;
    const d = this.fb.data;
    const fine = FLOOR_H * S >= 2.2;
    const inv = 1 / S, seed = n.i * 131;
    const concrete = mix(tc.body, rgb(0x6a6488), 0.25);
    for (let r = r0; r < r1; r++) {
      const h = (yb - r - 0.5) * inv;
      const open = r + 0.5 > oyT;
      let o = r * this.fb.w + c0;
      const fl = h * INV_FLOOR, f = fl | 0, fy = fl - f;
      const winRow = fine && h > TUN_H + 700 && fy > 0.3 && fy < 0.78;
      for (let x = c0; x < c1; x++, o++) {
        if (open && x + 0.5 > oxL && x + 0.5 < oxR) continue;
        let c = h < TUN_H + 700 ? concrete : fine ? tc.body : tc.far;
        if (winRow) {
          const lat = (x + 0.5 - xc) * inv / WIN_COL + 1000;
          const ci = lat | 0, cf = lat - ci;
          if (cf > 0.2 && cf < 0.8) { const hv = hashI(ci, f, seed); c = hv < tc.litP ? (hv < tc.litP * 0.5 ? tc.litA : tc.litB) : tc.dark; }
        }
        d[o] = c;
      }
    }
    // neon frame round the opening and along the roof line
    const nk = th.neon ?? NEON_DEF;
    const a = mix(nk[0], haze, fogT * 0.55), b = mix(nk[1 % nk.length], haze, fogT * 0.55);
    const t = Math.max(1, 150 * S), g = Math.max(1, 90 * S);
    const fb = this.fb;
    fb.rect(oxL - t, oyT - t, t, oh + t, a);
    fb.rect(oxR, oyT - t, t, oh + t, a);
    fb.rect(oxL - t, oyT - t, oxR - oxL + 2 * t, t, a);
    fb.rect(oxL - t - g - t, oyT - t - g - t, t, oh + t + g + t, b);
    fb.rect(oxR + t + g, oyT - t - g - t, t, oh + t + g + t, b);
    fb.rect(oxL - t - g - t, oyT - t - g - t, oxR - oxL + 4 * t + 2 * g, t, b);
    fb.rect(xc - pw, yb - ph, 2 * pw, t, b);
  }

  /** Inside a tunnel: tiled walls with a neon strip down each side, a dark ceiling with a lamp every 4 segments. */
  private tunnelBox(s: Seg, th: Theme, fogT: number, haze: Col, camX: number, camY: number): void {
    const fb = this.fb;
    const TW = TUN_W * ROAD_W;
    const S1 = s.S1, S2 = s.S2;
    const c1 = this.fb.w / 2 + (s.cx1 + s.oC1 - camX) * S1, c2 = this.fb.w / 2 + (s.cx2 + s.oC2 - camX) * S2;
    const xl1 = c1 - TW * S1, xr1 = c1 + TW * S1, xl2 = c2 - TW * S2, xr2 = c2 + TW * S2;
    const yb1 = this.horizon + (camY - s.y1) * S1, yb2 = this.horizon + (camY - s.y2) * S2;
    const H1 = TUN_H * S1, H2 = TUN_H * S2;
    const f = (c: Col, k = 1) => (fogT > 0.003 ? mix(c, haze, Math.min(1, fogT * k)) : c);
    fb.poly([xl1, yb1 - H1, xl2, yb2 - H2, xr2, yb2 - H2, xr1, yb1 - H1], f(TUN_CEIL));
    const nk = th.neon ?? NEON_DEF;
    const panel = (s.i >> 1) & 1 ? TUN_TILE_A : TUN_TILE_B;
    const band = (a0: number, a1: number, cl: Col, cr: Col) => {
      fb.poly([xl1, yb1 - H1 * a0, xl2, yb2 - H2 * a0, xl2, yb2 - H2 * a1, xl1, yb1 - H1 * a1], cl);
      fb.poly([xr1, yb1 - H1 * a0, xr2, yb2 - H2 * a0, xr2, yb2 - H2 * a1, xr1, yb1 - H1 * a1], cr);
    };
    band(0, 0.12, f(TUN_KERB), f(TUN_KERB));
    band(0.12, 0.57, f(panel), f(panel));
    band(0.57, 0.62, f(nk[1 % nk.length], 0.45), f(nk[0], 0.45));
    band(0.62, 1, f(TUN_UPPER), f(TUN_UPPER));
    if (s.i % 4 === 0) {
      // lamps over the first half of the segment: a bar across the ceiling and one high on each wall
      const zm = s.cz1 + SEG_LEN * 0.5;
      if (zm <= 20) return;
      const Sm = this.focal / zm;
      const cm = this.fb.w / 2 + ((s.cx1 + s.cx2) / 2 + (s.oC1 + s.oC2) / 2 - camX) * Sm;
      const ybm = this.horizon + (camY - (s.y1 + s.y2) / 2) * Sm, Hm = TUN_H * Sm;
      const yt1 = yb1 - H1, ym = ybm - Hm;
      const lw = TW * 0.22, gw = TW * 0.34;
      fb.poly([c1 - gw * S1, yt1, cm - gw * Sm, ym, cm + gw * Sm, ym, c1 + gw * S1, yt1], f(mix(TUN_CEIL, TUN_LAMP_GLOW, 0.7), 0.6));
      fb.poly([c1 - lw * S1, yt1, cm - lw * Sm, ym, cm + lw * Sm, ym, c1 + lw * S1, yt1], f(TUN_LAMP, 0.4));
      const lamp = f(TUN_LAMP, 0.4), glow = f(mix(TUN_UPPER, TUN_LAMP_GLOW, 0.8), 0.6);
      const xlm = cm - TW * Sm, xrm = cm + TW * Sm;
      for (const [a0, a1, c] of [[0.71, 0.83, glow], [0.74, 0.8, lamp]] as [number, number, Col][]) {
        fb.poly([xl1, yb1 - H1 * a0, xlm, ybm - Hm * a0, xlm, ybm - Hm * a1, xl1, yb1 - H1 * a1], c);
        fb.poly([xr1, yb1 - H1 * a0, xrm, ybm - Hm * a0, xrm, ybm - Hm * a1, xr1, yb1 - H1 * a1], c);
      }
    }
  }

  // --------------------------------------------------------- painted slopes
  private q8 = [0, 0, 0, 0, 0, 0, 0, 0];

  /** Closed banks, shelves and distant ridges; both sides use the same ground
   * coordinates as the scenery placement, including level building plots. */
  private paintedLand(s:Seg,n:Seg,th:Theme,f:(c:Col)=>Col,camX:number,camY:number,right:boolean):void {
    const a=(right?s.landscape?.right:s.landscape?.left)!;
    const b=(right?n.landscape?.right:n.landscape?.left)??a;
    const st=LANDSCAPES[s.theme],dir=right?1:-1,fb=this.fb,q=this.q8;
    const point=(p:CovePoint,far:boolean):[number,number]=>{
      const S=far?s.S2:s.S1,off=right?(far?s.oR2:s.oR1):(far?s.oL2:s.oL1);
      return [this.fb.w/2+((far?s.cx2:s.cx1)+off+dir*p.x-camX)*S,this.horizon+(camY-(far?s.y2:s.y1)-p.h)*S];
    };
    const at=(p:CovePoint,r:CovePoint,t:number):CovePoint=>({x:p.x+(r.x-p.x)*t,h:p.h+(r.h-p.h)*t});
    const band=(k:number,u0:number,u1:number,v0:number,v1:number,c:Col)=>{
      const A=point(at(a.points[k],a.points[k+1],u0),false),B=point(at(b.points[k],b.points[k+1],v0),true);
      const C=point(at(b.points[k],b.points[k+1],v1),true),D=point(at(a.points[k],a.points[k+1],u1),false);
      if(Math.max(A[0],B[0],C[0],D[0])<0||Math.min(A[0],B[0],C[0],D[0])>=this.fb.w||Math.min(A[1],B[1],C[1],D[1])>=this.fb.h||Math.max(A[1],B[1],C[1],D[1])<0)return;
      q[0]=A[0];q[1]=A[1];q[2]=B[0]+(B[0]-A[0])*SEAM;q[3]=B[1]+(B[1]-A[1])*SEAM;
      q[4]=C[0]+(C[0]-D[0])*SEAM;q[5]=C[1]+(C[1]-D[1])*SEAM;q[6]=D[0];q[7]=D[1];fb.poly(q,f(c));
    };
    for(let k=5;k>=0;k--) {
      const face=k===0&&(a.cutting>.1||b.cutting>.1);
      band(k,0,1,0,1,face?st.rock[1]:st.colors[k]);
      // Large irregular patches, with long quiet intervals between them.
      if(k>0&&k<5) {
        const seed=s.theme*17+k*7+(right?211:0),cell=Math.floor(s.i/44),t=s.i-cell*44;
        const center=15+cellRand(cell,seed)*15,radius=8+cellRand(cell,seed+1)*12;
        const size=(x:number)=>Math.max(0,1-Math.abs(x-center)/radius)*.17;
        const u=.3+cellRand(cell,seed+2)*.35,wa=size(t),wb=size(t+1);
        if((wa+wb)*(a.points[k+1].x-a.points[k].x)*s.S1>2) {
          band(k,u-wa,u+wa,u-wb,u+wb,mix(st.colors[k],st.colors[4],.28));
          band(k,u-wa*.4,u+wa*.6,u-wb*.4,u+wb*.6,mix(st.colors[k],st.colors[2],.38));
        }
      }
      if(face) {
        const cell=Math.floor(s.i/67),t=s.i-cell*67,center=.39+cellRand(cell,s.theme+852)*.17;
        const swell=(x:number)=>Math.max(0,1-Math.abs(x-32)/29),wa=swell(t),wb=swell(t+1);
        const chipA=(vnoise(s.i/6,853)-.5)*.12,chipB=(vnoise((s.i+1)/6,853)-.5)*.12;
        band(0,center-wa*(.23+chipA),center+wa*.24,center-wb*(.23+chipB),center+wb*.24,st.rock[0]);
        band(0,.59,.59+wa*(.14+chipA),.59,.59+wb*(.14+chipB),st.rock[2]);
        if(s.S1*a.points[1].h>14) {
          // Isolated rectangular inclusions have their own start/end within a
          // segment; no long cream seams or alternating per-segment stripes.
          const c=Math.floor(s.i/7),at=s.i-c*7;
          for(let vein=0;vein<5;vein++) {
            const seed=s.theme*19+vein*9+870,mid=1+cellRand(c,seed)*5,rad=.4+cellRand(c,seed+1)*.6;
            const t0=Math.max(0,mid-rad-at),t1=Math.min(1,mid+rad-at);
            if(t1<=t0)continue;
            const u=.14+vein*.14+cellRand(c,seed+2)*.06,size=.022+cellRand(c,seed+3)*.035;
            const along=(t:number,h:number)=>{
              const p=point(atPoint(a.points[0],a.points[1],h),false),r=point(atPoint(b.points[0],b.points[1],h),true);
              const z=t*s.S1/((1-t)*s.S2+t*s.S1);return [p[0]+(r[0]-p[0])*z,p[1]+(r[1]-p[1])*z];
            };
            const atPoint=(p:CovePoint,r:CovePoint,h:number)=>({x:p.x+(r.x-p.x)*h,h:p.h+(r.h-p.h)*h});
            fb.poly([...along(t0,u),...along(t1,u),...along(t1,u+size),...along(t0,u+size)],f(cellRand(c,seed+4)>.4?st.rock[2]:st.rock[0]));
          }
        }
      }
      if(st.kind==='snow'&&k!==1&&k!==5) {
        const snowA=.61+.17*vnoise(s.i/28,k+861),snowB=.61+.17*vnoise((s.i+1)/28,k+861);
        band(k,snowA,1,snowB,1,st.colors[2]);
      }
    }
    if(a.plot&&a.plot===b.plot) {
      const plotBand=a.plotBand??1;
      const plot=a.plot,t0=Math.max(0,1-Math.abs(s.i-plot.houseSegment)/17),t1=Math.max(0,1-Math.abs(s.i+1-plot.houseSegment)/17);
      const paving=s.theme===12?rgb(0x86674f):st.kind==='snow'?st.colors[3]:mix(st.colors[1],st.rock[2],.27);
      band(plotBand,.5-t0*.4,.5+t0*.4,.5-t1*.4,.5+t1*.4,paving);
      // A small foundation lip joins the full level shelf, rather than a
      // cream band extending for the entire length of a settlement.
      if(plotBand===1&&t0>.4&&s.S1*400>1)band(0,.92,1,.92,1,mix(st.colors[0],paving,.55));
    }
  }

  /** Technical sound barriers have straight panels and posts, not rock teeth. */
  private soundWall(s:Seg,n:Seg,th:Theme,f:(c:Col)=>Col,camX:number,camY:number,right:boolean):void {
    const dir=right?1:-1,h0=1350+vnoise(s.i/180,901)*450,h1=1350+vnoise((s.i+1)/180,901)*450;
    const off0=right?s.wallROff:s.wallOff,off1=right?n.wallROff:n.wallOff;
    const x0=this.fb.w/2+((s.cx1+(right?s.oR1:s.oL1))-camX+dir*off0*ROAD_W)*s.S1;
    const x1=this.fb.w/2+((s.cx2+(right?s.oR2:s.oL2))-camX+dir*off1*ROAD_W)*s.S2;
    const y0=this.horizon+(camY-s.y1)*s.S1,y1=this.horizon+(camY-s.y2)*s.S2;
    const panel=(a:number,b:number,c:Col)=>this.fb.poly([x0,y0-h0*s.S1*a,x1,y1-h1*s.S2*a,x1,y1-h1*s.S2*b,x0,y0-h0*s.S1*b],f(c));
    panel(0,1,th.wallBands[0][0]);panel(.4,.92,th.wallBands[1][0]);panel(.92,1,th.wallTop[0]);
    if(s.i%22===0&&h0*s.S1>3)this.fb.rect(x0-1,y0-h0*s.S1,Math.max(1,120*s.S1),h0*s.S1,f(th.wallTop[0]));
  }

  /** Closed land cross-sections: bank, level shelf, distant rolling hills and
   * their back slope. Buildings use the very same shelf coordinates. */
  private coveLand(s: Seg, n: Seg, th: Theme, f: (c: Col) => Col, camX: number, camY: number): void {
    const a = (s.cove ?? s.bluffs)!, b = (s.cove ? n.cove : n.bluffs) ?? a, st = th.terrain!;
    const dry = !!s.bluffs, spurA=s.bluffs?.spur ?? 0, spurB=n.bluffs?.spur ?? spurA;
    const fb = this.fb, q = this.q8;
    const point = (p: CovePoint, far: boolean): [number, number] => {
      const scale = far ? s.S2 : s.S1;
      return [this.fb.w/2 + ((far ? s.cx2+s.oL2 : s.cx1+s.oL1)-p.x-camX)*scale,
        this.horizon + (camY-(far ? s.y2 : s.y1)-p.h)*scale];
    };
    const strip = (a0: CovePoint, a1: CovePoint, b0: CovePoint, b1: CovePoint, col: Col) => {
      const [x0,y0] = point(a0,false), [x1,y1] = point(a1,false);
      const [x2,y2] = point(b0,true), [x3,y3] = point(b1,true);
      if (Math.max(x0,x1,x2,x3)<0 || Math.min(y0,y1,y2,y3)>=this.fb.h || Math.max(y0,y1,y2,y3)<0) return;
      q[0]=x0; q[1]=y0; q[2]=x2+(x2-x0)*SEAM; q[3]=y2+(y2-y0)*SEAM;
      q[4]=x3+(x3-x1)*SEAM; q[5]=y3+(y3-y1)*SEAM; q[6]=x1; q[7]=y1;
      fb.poly(q,f(col));
    };
    const between = (p: CovePoint, q: CovePoint, u: number): CovePoint => ({x:p.x+(q.x-p.x)*u,h:p.h+(q.h-p.h)*u});
    const band = (k: number, u0: number, u1: number, v0: number, v1: number, col: Col) =>
      strip(between(a.points[k],a.points[k+1],u0), between(a.points[k],a.points[k+1],u1),
        between(b.points[k],b.points[k+1],v0), between(b.points[k],b.points[k+1],v1),col);
    // A short patch may start/end inside a slice. Clip its longitudinal extent
    // instead of stretching a small inclusion into a pointed full-slice ribbon.
    const fleck = (t0:number,t1:number,lo:number,hi:number,fa:number,fb_:number,col:Col) => {
      const at=(t:number,u:number) => {
        const p0=point(between(a.points[0],a.points[1],u*fa),false);
        const p1=point(between(b.points[0],b.points[1],u*fb_),true);
        const q=t*s.S1/((1-t)*s.S2+t*s.S1);
        return [p0[0]+(p1[0]-p0[0])*q,p0[1]+(p1[1]-p0[1])*q];
      };
      fb.poly([...at(t0,lo),...at(t1,lo),...at(t1,hi),...at(t0,hi)],f(col));
    };
    const colors = [dry ? mix(st.low,st.rock[1],spurA) : st.low, st.mid, st.light, st.high, st.shade, st.low];
    // Far side first. Rendering the back and top is what prevents the open
    // cardboard edge that used to be visible beside the starting grid.
    for (let k=a.points.length-2;k>=0;k--) {
      band(k,0,1,0,1,colors[k]);
      if (k===2 && a.meadow>.45 && b.meadow>.45) {
        const u=.24+(a.meadow-.45)*.6, v=.24+(b.meadow-.45)*.6;
        band(k,u,u+(a.meadow-.45)*.7,v,v+(b.meadow-.45)*.7,st.high);
      }
      if (k===2 && a.rock>.64 && b.rock>.64) {
        const u=(a.rock-.64)*.8, v=(b.rock-.64)*.8;
        band(k,.12,.12+u,.12,.12+v,st.rock[2]);
        band(k,.12,.12+u*.24,.12,.12+v*.24,st.rock[1]);
      }
      if (k===1 && !a.plot && !b.plot && a.meadow>.5 && b.meadow>.5) {
        // One broad olive patch; no screen-space noise or alternating stripes.
        band(k,.15,.15+(a.meadow-.5)*1.3,.15,.15+(b.meadow-.5)*1.3,mix(st.mid,st.high,.4));
      }
      if (k===1 || k===2) {
        if(this.scale===2 && th.id==='palm-cove') {
          // Close grass has a few smaller leaf clusters on the native grid.
          // Cell identity and shape depend only on world distance, never time.
          const cell=Math.floor(s.i/13), at=s.i-cell*13;
          for(let detail=0;detail<3;detail++) {
            const seed=731+k*29+detail*7;
            const center=3+cellRand(cell,seed)*7,radius=1.6+cellRand(cell,seed+1)*2.8;
            const width=.012+cellRand(cell,seed+2)*.017;
            const shape=(t:number)=>Math.max(0,1-Math.abs(t-center)/radius);
            const wa=shape(at)*width,wb=shape(at+1)*width,u=.12+cellRand(cell,seed+3)*.75;
            const projected=Math.abs(a.points[k+1].x-a.points[k].x)*s.S1;
            if(Math.max(wa,wb)*projected>1.3) {
              band(k,u-wa,u+wa,u-wb,u+wb,mix(colors[k],st.shade,.24));
              band(k,u-wa*.3,u+wa*.65,u-wb*.3,u+wb*.65,mix(colors[k],st.light2,.3));
            }
          }
        }
        // Broad angular grass clusters, with a cool base and a warm lit edge.
        // World-space patches span several slices and taper at both ends;
        // they never continue as a stripe along the whole roadside.
        const cell=Math.floor(s.i/32), at=s.i-cell*32;
        for (let patch=0;patch<2;patch++) {
          const seed=350+k*13+patch*5;
          const center=8+cellRand(cell,seed)*15, radius=4+cellRand(cell,seed+1)*7;
          const size=(i:number)=>Math.max(0,Math.min(1,(1-Math.abs(i-center)/radius)*1.6));
          const width=.09+cellRand(cell,seed+2)*.08;
          const wa=size(at)*width, wb=size(at+1)*width;
          const u=.21+cellRand(cell,seed+3)*.58;
          if (Math.max(wa,wb)*(a.points[k+1].x-a.points[k].x)*s.S1>3) {
            band(k,u-wa,u+wa,u-wb,u+wb,mix(colors[k],st.shade,.42));
            band(k,u-wa*.55,u+wa*.65,u-wb*.55,u+wb*.65,mix(colors[k],st.light2,.38));
            // A single darker notch reads as a tuft, without fine speckling.
            if (wa*(a.points[k+1].x-a.points[k].x)*s.S1>7)
              band(k,u-wa*.8,u-wa*.4,u-wb*.8,u-wb*.4,mix(colors[k],st.shade2,.3));
          }
        }
      }
      if (k===0) {
        // Gardens meet a grassy bank, not a continuous cream retaining wall.
        // Only short natural limestone pockets show through away from houses.
        const u=Math.max(0,(a.rock-.65)*2), v=Math.max(0,(b.rock-.65)*2);
        if (!a.plot && !b.plot && (!dry || Math.max(spurA,spurB)<.04) && (u>0 || v>0)) band(0,.25,.25+u,.25,.25+v,st.rock[2]);
        const lipA=.76+vnoise(s.i/9,389)*.13, lipB=.76+vnoise((s.i+1)/9,389)*.13;
        band(0,lipA,1,lipB,1,st.mid);
        if (dry && (spurA>.04 || spurB>.04)) {
          // Broad sandstone facets follow the cutting's height. Short seams
          // have staggered ends; no continuous cream stripe or surface noise.
          const faceA=Math.min(1,spurA*2), faceB=Math.min(1,spurB*2);
          band(0,.04*faceA,.88*faceA,.04*faceB,.88*faceB,st.rock[1]);
          const cell=Math.floor(s.i/58), u=s.i-cell*58;
          const swell=(t:number)=>Math.max(0,Math.min(1,(1-Math.abs(t-29)/27)*1.4));
          const wa=swell(u), wb=swell(u+1), center=.4+cellRand(cell,530)*.2;
          const chipA=(vnoise(s.i/3,548)-.5)*.1, chipB=(vnoise((s.i+1)/3,548)-.5)*.1;
          band(0,(center-wa*(.3+chipA))*faceA,(center+wa*(.25+chipA))*faceA,(center-wb*(.3+chipB))*faceB,(center+wb*(.25+chipB))*faceB,st.rock[2]);
          band(0,(center+wa*(.14+chipA))*faceA,(center+wa*(.22+chipA))*faceA,(center+wb*(.14+chipB))*faceB,(center+wb*(.22+chipB))*faceB,mix(st.rock[2],st.rock[3],.3));
          const seam=(t:number)=>Math.max(0,1-Math.abs(t-12)/9)*.12;
          band(0,.17*faceA,(.17+seam(u))*faceA,.17*faceB,(.17+seam(u+1))*faceB,mix(st.rock[0],st.rock[1],.4));
          const height=Math.max(a.points[1].h*s.S1,b.points[1].h*s.S2);
          if(height>8) {
            // Independent drifts of chunky mineral inclusions. Their
            // outlines occupy several world slices; they never resample with
            // time or camera position. Quiet rock remains between the drifts.
            const cell=Math.floor(s.i/7), at=s.i-cell*7;
            for(let vein=0;vein<6;vein++) {
              const seed=560+vein*11;
              if(cellRand(cell,seed)<.19) continue;
              const middle=1.5+cellRand(cell,seed+1)*4, radius=.35+cellRand(cell,seed+2)*.55;
              const t0=Math.max(0,middle-radius-at), t1=Math.min(1,middle+radius-at);
              const center=.12+vein*.12+cellRand(cell,seed+3)*.09;
              const size=.023+cellRand(cell,seed+4)*.026;
              if(t1<=t0 || size*height<.7) continue;
              const light=cellRand(cell,seed+5)>.32;
              const col=light?mix(st.rock[2],st.rock[3],.7):mix(st.rock[0],st.rock[1],.42);
              fleck(t0,t1,center-size*.45,center+size,faceA,faceB,col);
              if(light && size*height>2.2)
                fleck(t0,t1,center-size*.7,center-size*.3,faceA,faceB,st.rock[1]);
            }
            // Occasional narrow, kinked vertical fissures interrupt the broad
            // facets. They stop inside the rock, clear of the grass and verge.
            const crackCell=Math.floor(s.i/37), atCrack=s.i-crackCell*37;
            const start=8+Math.floor(cellRand(crackCell,601)*18);
            if(atCrack===start && cellRand(crackCell,602)>.3 && height>25) {
              const base=.22+cellRand(crackCell,603)*.19;
              band(0,base*faceA,(base+.23)*faceA,(base+.035)*faceB,(base+.25)*faceB,mix(st.rock[0],st.rock[1],.5));
            }
          }
        }
      }
    }
    if (a.plot && a.plot===b.plot) {
      // A compact worn patch at the house, with tapered, irregular edges.
      // The rest of the level plot stays grassy and joins the surrounding meadow.
      const m=a.plot.houseSegment;
      const width=(i:number)=>Math.max(0,1-Math.abs(i-m)/6)*(.26+vnoise(i/3,390)*.04);
      const wa=width(s.i), wb=width(s.i+1);
      if (wa>0 || wb>0) {
        band(1,.5-wa,.5+wa,.5-wb,.5+wb,mix(st.mid,st.high,.55));
        band(1,.5-wa*.8,.5+wa*.82,.5-wb*.8,.5+wb*.82,mix(st.mid,st.stone[1],.55));
      }
    }
    // Restrained clumps at the foot: broad marks at close range only, anchored
    // to the world, and close in value to the surrounding grass.
    if (!a.plot && s.i%9<2 && s.S1*700>4 && cellRand(Math.floor(s.i/9),340)<.25) {
      const u=.12+cellRand(Math.floor(s.i/9),341)*.62;
      band(1,u,u+.08,u,u+.08,st.light);
    }
  }

  /** The slope forms of a segment (computed once, kept on the segment). */
  private forms(s: Seg, th: Theme, right: boolean): Float32Array {
    let tf = right ? s.tfR : s.tf;
    if (!tf) {
      tf = new Float32Array(NF);
      const plot = !right && s.plotF > 0 ? { i0: s.plotI0, i1: s.plotI1, hp: s.plotF } : null;
      const path = !right && s.pathT > 0 ? { t: s.pathT, q: s.pathQ } : null;
      slopeForms(s.i, s.theme * 7 + (right ? 3 : 0), th.terrain!, plot, path, tf, 0);
      if (right) s.tfR = tf; else s.tf = tf;
    }
    return tf;
  }

  /**
   * One slope face beside the road, painted as connected ribbons (see terrain.ts). Points on the face
   * are (xb - kx*f, yb - ky*f) for the fraction f of the slope height, at the near end (1) and far end (2).
   */
  private slope(s: Seg, n: Seg, th: Theme, kind: Theme["wall"], off1: number, off2: number, f: (c: Col) => Col, camX: number, camY: number, right: boolean): void {
    const st = th.terrain!;
    const lean = leanOf(kind, st);
    const slope = right ? -lean : lean;
    const h1 = right ? s.wallRH : s.wallH, h2 = right ? n.wallRH : n.wallH;
    const S1 = s.S1, S2 = s.S2;
    const xb1 = this.fb.w / 2 + (s.cx1 + off1 - camX) * S1, yb1 = this.horizon + (camY - s.y1) * S1;
    const xb2 = this.fb.w / 2 + (s.cx2 + off2 - camX) * S2, yb2 = this.horizon + (camY - s.y2) * S2;
    const kx1 = slope * h1 * S1, ky1 = h1 * S1, kx2 = slope * h2 * S2, ky2 = h2 * S2;
    const fb = this.fb, q = this.q8;
    const a = this.forms(s, th, right), b = this.forms(n, th, right);
    // a ribbon between the heights (a0..a1 at the near end, b0..b1 at the far end)
    const rib = (a0: number, a1: number, b0: number, b1: number, c: Col) => {
      // the far edge reaches a hair into the next segment, so the seams between segments never open
      // into single sky-coloured pixels (neighbouring edges are computed from different end points)
      const nx0 = xb1 - kx1 * a0, ny0 = yb1 - ky1 * a0, nx1 = xb1 - kx1 * a1, ny1 = yb1 - ky1 * a1;
      const fx0 = xb2 - kx2 * b0, fy0 = yb2 - ky2 * b0, fx1 = xb2 - kx2 * b1, fy1 = yb2 - ky2 * b1;
      q[0] = nx0; q[1] = ny0;
      q[2] = fx0 + (fx0 - nx0) * SEAM; q[3] = fy0 + (fy0 - ny0) * SEAM;
      q[4] = fx1 + (fx1 - nx1) * SEAM; q[5] = fy1 + (fy1 - ny1) * SEAM;
      q[6] = nx1; q[7] = ny1;
      fb.poly(q, c);
    };
    // a form that exists at one end or both (it tapers to a point at the other end)
    const form = (i0: number, i1: number, c: Col) => {
      const a0 = a[i0], a1 = a[i1], b0 = b[i0], b1 = b[i1];
      const ea = a1 > a0, eb = b1 > b0;
      if (!ea && !eb) return;
      if (!ea) { const m = (b0 + b1) * 0.5; rib(m, m, b0, b1, c); }
      else if (!eb) { const m = (a0 + a1) * 0.5; rib(a0, a1, m, m, c); }
      else rib(a0, a1, b0, b1, c);
    };
    rib(0, 1, 0, 1, f(st.mid));
    // the tones change in two steps (a half-tone between them), so a band edge reads as a painted transition, not a ruler line
    rib(0, a[F_LOW] + 0.05, 0, b[F_LOW] + 0.05, f(mix(st.low, st.mid, 0.5)));
    rib(0, a[F_LOW], 0, b[F_LOW], f(st.low));
    rib(a[F_HIGH] - 0.06, 1, b[F_HIGH] - 0.06, 1, f(mix(st.high, st.mid, 0.5)));
    rib(a[F_HIGH], 1, b[F_HIGH], 1, f(st.high));
    // far away the slope is just its calm tones: no room for forms that would turn into speckle
    const detail = Math.min(ky1, ky2) > 5;
    if (detail) {
      if (st.dry) form(F_D0, F_D1, f(st.dry));
      if (st.olive) form(F_O0, F_O1, f(st.olive));
      form(F_L0, F_L1, f(st.light));
      form(F_L20, F_L21, f(st.light2));
      // brush strokes: short contour-following dabs of grass in light and shadow, gathered in loose drifts, so the large
      // surfaces have a hand-painted grain. Each belongs to one road segment, so it never crawls or flickers.
      if (Math.min(ky1, ky2) > 14) {
        const sd = s.theme * 7 + (right ? 3 : 0), drift = vnoise(s.i / 23, sd + 80);
        const pf = a[F_P] > 0 ? plotSpan(a[F_P], h1, lean, 1) : null;
        for (let k = 0; k < 4; k++) {
          const u = cellRand(s.i * 4 + k, sd + 81);
          if (u > 0.2 + 0.55 * drift) continue;
          const v = 0.05 + 0.86 * cellRand(s.i * 4 + k, sd + 82);
          if (pf && v > pf.q - 0.1 && v < pf.r + 0.04) continue;
          const w = 0.008 + 0.012 * cellRand(s.i * 4 + k, sd + 83);
          const lit = cellRand(s.i * 4 + k, sd + 84) < 0.55;
          const inLight = v > a[F_L0] && v < a[F_L1];
          const c = lit ? (inLight ? st.light2 : st.light) : (v < a[F_LOW] + 0.05 ? st.shade2 : st.shade);
          rib(v, v + w, v + 0.004, v + w + 0.004, f(c));
        }
      }
      form(F_H0, F_H1, f(st.shade));
      form(F_H20, F_H21, f(st.shade2));
      // rock outcrop: shadowed underside, lit face, bright top edge, two strata lines
      const r0 = a[F_R0], r1 = a[F_R1], t0 = b[F_R0], t1 = b[F_R1];
      if (r1 > r0 || t1 > t0) {
        // scree and grass tuft the rock's edges so it grows out of the slope instead of sitting on it
        const sa = r1 > r0 ? [r0, r1] : [(t0 + t1) * 0.5, (t0 + t1) * 0.5], sb = t1 > t0 ? [t0, t1] : [(r0 + r1) * 0.5, (r0 + r1) * 0.5];
        rib(sa[0] - 0.035, sa[0], sb[0] - 0.035, sb[0], f(mix(st.mid, st.rock[1], 0.45)));
        rib(sa[1], sa[1] + 0.03, sb[1], sb[1] + 0.03, f(mix(st.mid, st.rock[2], 0.4)));
        form(F_R0, F_R1, f(st.rock[1]));
        const lo1 = r1 > r0 ? r0 : (t0 + t1) * 0.5, hi1 = r1 > r0 ? r1 : (t0 + t1) * 0.5;
        const lo2 = t1 > t0 ? t0 : (r0 + r1) * 0.5, hi2 = t1 > t0 ? t1 : (r0 + r1) * 0.5;
        const at1 = (k: number) => lo1 + (hi1 - lo1) * k, at2 = (k: number) => lo2 + (hi2 - lo2) * k;
        if (ky1 > 12) {
          // close up: the rock breaks into facets, one per road segment (sunlit, half-lit or in its own shadow), each
          // with a ragged top, so it reads as weathered stone blocks rather than one flat plate
          const sd = s.theme * 7 + (right ? 3 : 0);
          const u = cellRand(s.i, sd + 95), top = 0.25 + 0.5 * cellRand(s.i, sd + 96);
          if (u < 0.45) rib(at1(top), hi1, at2(top + 0.06), hi2, f(st.rock[2]));
          else if (u < 0.8) rib(at1(top + 0.15), hi1, at2(top + 0.1), hi2, f(mix(st.rock[1], st.rock[2], 0.5)));
          if (u < 0.8) rib(at1(top), at1(top) + 0.008, at2(top + 0.06), at2(top + 0.06) + 0.008, f(st.rock[3]));
          const ph = a[F_RS] * 0.12;
          for (const k of [0.34 + ph, 0.7 - ph]) rib(at1(k), at1(k) + 0.008, at2(k + 0.04), at2(k + 0.04) + 0.008, f(st.rock[0]));
          // grass clinging to the ledges
          if (cellRand(s.i, sd + 97) < 0.35) rib(at1(0.55), at1(0.55) + 0.016, at2(0.58), at2(0.58) + 0.016, f(st.light));
        } else {
          rib(at1(0.52), hi1, at2(0.52), hi2, f(st.rock[2]));
        }
        rib(hi1 - 0.012, hi1, hi2 - 0.012, hi2, f(st.rock[3]));
        rib(lo1, at1(0.1), lo2, at2(0.1), f(mix(st.rock[0], st.low, 0.4)));
      }
      // dry-stone terrace wall: body, lit coping, shadow at its foot
      const t = a[F_T], tn = b[F_T];
      if (t > 0 || tn > 0) {
        const ta = t > 0 ? t : tn, tb = tn > 0 ? tn : t;
        const wa = t > 0 ? a[F_TH] : 0, wb = tn > 0 ? b[F_TH] : 0;
        rib(ta - wa - 0.014, ta - wa, tb - wb - 0.014, tb - wb, f(st.shade2));
        rib(ta - wa, ta, tb - wb, tb, f(st.stone[1]));
        rib(ta - wa, ta - wa * 0.7, tb - wb, tb - wb * 0.7, f(st.stone[0]));
        rib(ta, ta + 0.008, tb, tb + 0.008, f(st.stone[2]));
      }
      // hedge row: dark body, sunlit top, shadow on the grass below it
      const hg = a[F_HG], hgn = b[F_HG];
      if (st.hedge && (hg > 0 || hgn > 0)) {
        const ha = hg > 0 ? hg : hgn, hb = hgn > 0 ? hgn : hg;
        const wa = hg > 0 ? a[F_HGW] : 0, wb = hgn > 0 ? b[F_HGW] : 0;
        rib(ha - wa - 0.012, ha - wa, hb - wb - 0.012, hb - wb, f(st.shade2));
        rib(ha - wa, ha, hb - wb, hb, f(st.hedge[0]));
        rib(ha - wa * 0.4, ha, hb - wb * 0.4, hb, f(st.hedge[1]));
      }
      // footpath: a pale ribbon with a shaded lower edge
      const pp = a[F_PA], pn = b[F_PA];
      if (st.path && pp > 0 && pn > 0) {
        const w = a[F_PAW];
        rib(pp - w, pp + w, pn - w, pn + w, f(st.path[0]));
        rib(pp + w * 0.35, pp + w, pn + w * 0.35, pn + w, f(st.path[1]));
      }
    }
    // building terrace: a level shelf cut into the slope. Its front is held by a retaining wall that stands on the
    // slope (its foot follows the face), its back is a low cut bank, so a house on it is standing on ground.
    const pa = a[F_P], pb = b[F_P];
    if (pa > 0 || pb > 0) {
      const hp = pa > 0 ? pa : pb;
      const A = plotSpan(hp, h1, lean, pa > 0 ? a[F_PH] : 0), B = plotSpan(hp, h2, lean, pb > 0 ? b[F_PH] : 0);
      const X1 = (v: number) => xb1 - kx1 * v, Y1 = (v: number) => yb1 - ky1 * v;
      const X2 = (v: number) => xb2 - kx2 * v, Y2 = (v: number) => yb2 - ky2 * v;
      const yN = Y1(A.p), yF = Y2(B.p);
      // a strip from a near edge (n0 -> n1) to a far edge (f0 -> f1); the far edge reaches a hair further so seams never open
      const strip = (n0x: number, n0y: number, n1x: number, n1y: number, f0x: number, f0y: number, f1x: number, f1y: number, c: Col) => {
        q[0] = n0x; q[1] = n0y;
        q[2] = f0x + (f0x - n0x) * SEAM; q[3] = f0y + (f0y - n0y) * SEAM;
        q[4] = f1x + (f1x - n1x) * SEAM; q[5] = f1y + (f1y - n1y) * SEAM;
        q[6] = n1x; q[7] = n1y;
        fb.poly(q, c);
      };
      const wall = mix(st.stone[1], st.light, 0.1), paving = mix(st.stone[1], st.light, 0.55);
      // shadow the wall casts on the slope below it
      rib(A.q - 0.07, A.q, B.q - 0.07, B.q, f(st.shade2));
      // cut bank behind the shelf: dark stone, grassy top
      strip(X1(A.r), yN, X1(A.r), Y1(A.r), X2(B.r), yF, X2(B.r), Y2(B.r), f(mix(st.stone[0], st.shade, 0.5)));
      rib(A.r, A.r + 0.02, B.r, B.r + 0.02, f(st.light));
      // the shelf itself, with a pale kerb along its front edge
      strip(X1(A.q), yN, X1(A.r), yN, X2(B.q), yF, X2(B.r), yF, f(paving));
      const kw = 0.16;
      strip(X1(A.q), yN, X1(A.q + (A.r - A.q) * kw), yN, X2(B.q), yF, X2(B.q + (B.r - B.q) * kw), yF, f(st.stone[2]));
      // retaining wall: body, shaded foot, coping line on top
      // masonry: courses that darken towards the foot, a lit coping, a few darker joints (anchored to the segment index)
      const wy = (t: number) => [yN + (Y1(A.q) - yN) * t, yF + (Y2(B.q) - yF) * t];
      const band = (t0: number, t1: number, c: Col) => {
        const [n0, f0] = wy(t0), [n1, f1] = wy(t1);
        strip(X1(A.q), n0, X1(A.q), n1, X2(B.q), f0, X2(B.q), f1, c);
      };
      band(0, 1, f(wall));
      band(0.34, 0.66, f(mix(wall, st.stone[0], 0.35)));
      band(0.66, 1, f(st.stone[0]));
      if (Math.min(ky1, ky2) > 6) {
        band(0.34, 0.345, f(mix(st.stone[0], st.shade2, 0.4)));
        band(0.66, 0.665, f(mix(st.stone[0], st.shade2, 0.5)));
        if ((s.i % 4) === 0) { band(0.1, 0.34, f(mix(wall, st.stone[0], 0.55))); }
        if ((s.i % 5) === 2) { band(0.4, 0.66, f(mix(wall, st.stone[0], 0.1))); }
      }
      band(0, 0.09, f(st.stone[2]));
    }
    rib(a[F_V0], 1, b[F_V0], 1, f(st.rim));
  }

  private wall(s: Seg, n: Seg, th: Theme, kind: Theme["wall"], off1: number, off2: number, f: (c: Col) => Col, camX: number, camY: number, right: boolean): void {
    if (th.terrain && !LEGACY_SLOPES && (kind === "hill" || kind === "cliff" || kind === "forest")) { this.slope(s, n, th, kind, off1, off2, f, camX, camY, right); return; }
    const k = kind === "cliff" ? 0.12 : kind === "hill" ? 0.55 : kind === "forest" ? 0.3 : 0.05;
    const slope = right ? -k : k; // both lean away from the road
    const bands = th.wallBands;
    const nb = bands.length;
    const h = right ? s.wallRH : s.wallH;
    const rock = ((s.i * 7) % 5 < 2 ? 1 : 0) ^ ((s.i >> 3) & 1);
    for (let b = 0; b < nb; b++) {
      const f0 = (b / nb) * 0.9, f1 = ((b + 1) / nb) * 0.9;
      this.wallQuad(s, n, off1, off2, f0, f1, slope, f(bands[b][rock]), camX, camY, right);
    }
    this.wallQuad(s, n, off1, off2, 0.9, 1.0, slope, f(th.wallTop[(s.i >> 1) & 1]), camX, camY, right);
    if (kind === "cliff" && s.S1 * h > 14) {
      // darker strata lines between the rock bands
      const dark = f(mix(bands[0][0], rgb(0x3a1a20), 0.35));
      for (let b = 1; b < nb; b++) {
        const fb0 = (b / nb) * 0.9;
        const wob = 0.012 * Math.sin(s.i * 0.21 + b * 2);
        this.wallQuad(s, n, off1, off2, fb0 + wob - 0.008, fb0 + wob + 0.008, slope, dark, camX, camY, right);
      }
    }
  }
}

function wrapNear(x: number, period: number): number {
  let v = x % period;
  if (v < -period / 2) v += period;
  if (v > period / 2) v -= period;
  // keep it near the visible window
  if (v < -100) v += period;
  return v;
}

function blendInto(dst: FB, src: FB, t: number): void {
  const a = dst.data, b = src.data;
  const it = 1 - t;
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = b[i];
    if (p === q) continue;
    a[i] = rgbc(colR(p) * it + colR(q) * t, colG(p) * it + colG(q) * t, colB(p) * it + colB(q) * t);
  }
}

export const _unused = { CAM_H };

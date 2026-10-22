// Painted landscape forms for the slopes beside the road.
//
// The old slopes were a stack of flat bands whose colours alternated every few segments, which made
// rhythmic diagonal stripes and a saw-toothed ridge. Here a slope is described by a handful of
// *forms* (sunlit meadows, shaded hollows, rock outcrops, dry-stone terraces, a plot with a
// retaining wall for a house) that are smooth functions of the distance along the road. Each form is
// a ribbon between two heights (fractions of the slope) that swells and fades with the distance, so
// its outline is one connected, stable contour while the car drives past, and it never depends on
// the frame or the screen position.
//
// Everything here is cosmetic: it never touches the road, the wall limit or the props' hit boxes.
import { Col } from "../core/fb";

/** Colours and amounts for one stage's slopes (see tools/art/STAGE_LOOK.md for how to pick them). */
export interface TerrainStyle {
  /** Slope tones: lower (cool, shaded), middle (the calm main surface), upper (sun-baked). */
  low: Col; mid: Col; high: Col;
  /** Sunlit meadow patch and its brightest core, shaded hollow and its deepest core. */
  light: Col; light2: Col; shade: Col; shade2: Col;
  /** Rock outcrops: dark crack/underside, body, lit face, top highlight. */
  rock: [Col, Col, Col, Col];
  /** Dry-stone terrace walls and retaining walls: shadow, body, coping (lit top). */
  stone: [Col, Col, Col];
  /** Light rim along the crest. */
  rim: Col;
  /** Optional patchwork: dry golden grass, olive-grey grove, hedge rows, footpaths (drawn only when given). */
  dry?: Col; olive?: Col; hedge?: [Col, Col]; path?: [Col, Col];
  /** Hill lean override (lateral world units per unit of height; default 0.55). A gentler lean leaves room for building terraces. */
  lean?: number;
  /** 0..1 amounts. */
  meadows: number; hollows: number; outcrops: number; terraces: number;
  /** What stands on and beside the slope (weighted names; see make_cove.py / make_stage_variants.py). */
  scene: {
    trees: [string, number][];      // on meadows and along the crest
    shrubs: [string, number][];     // in hollows, on meadows, at the foot
    roadside: [string, number][];   // groves beside the road (solid ones keep their hit boxes)
    rocks: string[];                // on the outcrops
    tufts: string[];                // grass groups
    modules?: string[];             // house-and-terrace modules for the plots
    villages?: string[];            // distant village modules behind the crest
    /** Cumulative chances of the stretch kinds: open, grove, village (the rest is rocky). */
    zones?: [number, number, number];
  };
}

/** How far the face leans away from the road per unit of height (the painter and the scenery share it). */
export function leanOf(kind: string | undefined, st?: TerrainStyle): number {
  return kind === "cliff" ? 0.12 : kind === "forest" ? 0.3 : st?.lean ?? 0.55;
}

/** Lateral width (world units) of a building terrace. */
export const PLOT_W = 2700;

/**
 * Where a level terrace of world height `hp` sits on a slope of height `h` and lean `lean`: the face fractions of
 * its front (retaining wall foot, q), its middle (p) and its back (top of the cut bank, r). `e` (0..1) tapers the
 * width at the ends of a plot.
 */
export function plotSpan(hp: number, h: number, lean: number, e: number): { p: number; q: number; r: number; c: number } {
  const tot = Math.min(0.8, (PLOT_W * e) / (lean * Math.max(h, 1)));
  // more cut into the hill than built out in front of it: the retaining wall stays low
  const p = Math.min(0.96 - tot * 0.64, Math.max(tot * 0.36 + 0.04, hp / Math.max(h, 1)));
  return { p, q: p - tot * 0.36, r: p + tot * 0.64, c: p + tot * 0.14 };
}

/** Floats per segment in the form table. */
export const NF = 32;
// indices into a segment's form record
export const F_LOW = 0, F_HIGH = 1;                 // base band edges (fractions)
export const F_L0 = 2, F_L1 = 3, F_L20 = 4, F_L21 = 5;   // meadow and its core
export const F_H0 = 6, F_H1 = 7, F_H20 = 8, F_H21 = 9;   // hollow and its core
export const F_R0 = 10, F_R1 = 11, F_RS = 12;       // outcrop range and strata phase
export const F_T = 13, F_TH = 14;                   // terrace wall: height fraction (0 = none) and wall thickness
export const F_P = 15, F_PH = 16, F_PW = 17;        // building terrace: world height (0 = none), end taper, first segment
export const F_V0 = 18, F_V1 = 19;                  // crest rim
export const F_SH = 20;                             // 1 when this stretch of slope has a plot cast shadow
export const F_D0 = 21, F_D1 = 22;                  // dry-grass patch
export const F_O0 = 23, F_O1 = 24;                  // olive-grey patch
export const F_HG = 25, F_HGW = 26;                 // hedge row: height fraction (0 = none), thickness
export const F_PA = 27, F_PAW = 28;                 // footpath up to a terrace: height fraction (0 = none), half width

function hash(n: number): number {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

/** Smooth 1-D value noise in 0..1; `x` is in lattice units. */
export function vnoise(x: number, seed: number): number {
  const i = Math.floor(x), f = x - i;
  const a = hash(Math.imul(i, 374761393) + Math.imul(seed, 668265263));
  const b = hash(Math.imul(i + 1, 374761393) + Math.imul(seed, 668265263));
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/** A hash of an integer cell, 0..1 (for zone-based decisions). */
export function cellRand(cell: number, seed: number): number {
  return hash(Math.imul(cell, 0x9e3779b1) ^ Math.imul(seed + 17, 0x85ebca6b));
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Length (in segments) of the stretches the plots and terraces are laid out in. */
export const ZONE = 40;

/**
 * The slope's forms at road segment `i` for a stage look `seed`, written into out[o .. o+NF).
 * `style` only scales the amounts; `plots` are the segment ranges [i0, i1] of building plots with the
 * fraction of the slope height each one sits at.
 */
export function slopeForms(i: number, seed: number, style: TerrainStyle, plot: { i0: number; i1: number; hp: number } | null, path: { t: number; q: number } | null, out: Float32Array, o: number): void {
  out.fill(0, o, o + NF);
  out[o + F_LOW] = 0.2 + 0.14 * vnoise(i / 70, seed + 1) + 0.07 * (vnoise(i / 17, seed + 16) - 0.5);
  out[o + F_HIGH] = 0.64 + 0.16 * vnoise(i / 90, seed + 2) + 0.06 * (vnoise(i / 21, seed + 17) - 0.5);

  // sunlit meadows: broad swells, 40-120 segments long
  const nl = vnoise(i / 48, seed + 3);
  const tl = Math.max(0, nl - (0.62 - 0.22 * style.meadows)) * 1.9;
  if (tl > 0.02) {
    const c = 0.3 + 0.46 * vnoise(i / 85, seed + 4);
    out[o + F_L0] = clamp(c - tl * 0.5, 0.03, 0.96);
    out[o + F_L1] = clamp(c + tl * 0.5, 0.05, 0.97);
    const t2 = Math.max(0, tl - 0.28);
    if (t2 > 0.02) {
      out[o + F_L20] = clamp(c - t2 * 0.18, 0.04, 0.95);
      out[o + F_L21] = clamp(c + t2 * 0.55, 0.06, 0.96);
    }
  }

  // shaded hollows (gullies): rarer, narrower, with a deeper core
  const nh = vnoise(i / 38 + 11.7, seed + 5);
  const th = Math.max(0, nh - (0.7 - 0.2 * style.hollows)) * 2.1;
  if (th > 0.02) {
    const c = 0.18 + 0.5 * vnoise(i / 62, seed + 6);
    out[o + F_H0] = clamp(c - th * 0.5, 0.02, 0.9);
    out[o + F_H1] = clamp(c + th * 0.5, 0.04, 0.96);
    const t2 = Math.max(0, th - 0.2);
    if (t2 > 0.02) {
      out[o + F_H20] = clamp(c - t2 * 0.3, 0.03, 0.9);
      out[o + F_H21] = clamp(c + t2 * 0.2, 0.05, 0.95);
    }
  }

  // rock outcrops: occasional and chunky, 15-35 segments long, never a long slab
  const nr = vnoise(i / 17 + 3.1, seed + 7);
  const tr = Math.max(0, nr - (0.84 - 0.16 * style.outcrops)) * 2.2;
  if (tr > 0.02) {
    const c = 0.3 + 0.42 * vnoise(i / 44, seed + 8);
    out[o + F_R0] = clamp(c - tr * 0.3, 0.04, 0.9);
    out[o + F_R1] = clamp(c + tr * 0.28, 0.07, 0.95);
    out[o + F_RS] = vnoise(i / 30, seed + 9);
  }

  // patchwork: dry golden grass low on the slope, an olive-grey grove higher up
  if (style.dry) {
    const nd = vnoise(i / 52 + 7.7, seed + 12), td = Math.max(0, nd - 0.58) * 2.2;
    if (td > 0.02) {
      const c = 0.18 + 0.32 * vnoise(i / 75, seed + 13);
      out[o + F_D0] = clamp(c - td * 0.32, 0.03, 0.9);
      out[o + F_D1] = clamp(c + td * 0.3, 0.05, 0.92);
    }
  }
  if (style.olive) {
    const no = vnoise(i / 46 + 21.3, seed + 14), to = Math.max(0, no - 0.6) * 2.2;
    if (to > 0.02) {
      const c = 0.42 + 0.3 * vnoise(i / 66, seed + 15);
      out[o + F_O0] = clamp(c - to * 0.3, 0.05, 0.92);
      out[o + F_O1] = clamp(c + to * 0.3, 0.07, 0.94);
    }
  }

  // dry-stone terrace: one long wall per zone at its own height, with gaps at the ends
  const zone = Math.floor(i / ZONE), zi = (i - zone * ZONE) / ZONE;
  if (cellRand(zone, seed + 30) < 0.62 * style.terraces && zi > 0.12 && zi < 0.88) {
    const edge = Math.min(zi - 0.12, 0.88 - zi) / 0.12;
    if (style.hedge && cellRand(zone, seed + 32) < 0.5) {
      out[o + F_HG] = 0.2 + 0.55 * cellRand(zone, seed + 31);          // a hedge instead of a wall
      out[o + F_HGW] = 0.02 * clamp(edge, 0.25, 1);
    } else {
      out[o + F_T] = 0.26 + 0.5 * cellRand(zone, seed + 31);
      out[o + F_TH] = 0.03 * clamp(edge, 0.25, 1);
    }
  }
  // a footpath rising across the slope to the terrace: gently meandering, ending at the wall's foot
  if (path && style.path) {
    const t = path.t, e = t * t * (3 - 2 * t);
    out[o + F_PA] = 0.07 + (path.q - 0.07) * e + 0.035 * Math.sin(t * 11) * (1 - t);
    out[o + F_PAW] = 0.011;
  }

  // crest rim
  out[o + F_V0] = 0.93;
  out[o + F_V1] = 1;
}

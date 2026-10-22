// Palm Cove's land is a volume: low roadside bank, a broad shelf, then hills
// set well back from the road. All coordinates are cosmetic. Collision walls,
// solid roadside props, road seeds and the race simulation remain unchanged.
import { ROAD_W, SPR_S } from './config';
import { cellRand, vnoise } from './terrain';
import type { Seg } from './track';

export interface CovePoint { x: number; h: number }
export interface CovePlot {
  first: number; last: number; houseSegment: number;
  x: number; width: number; worldY: number;
}
export interface CoveSection {
  points: CovePoint[];
  plot?: CovePlot;
  /** Smooth material variations, sampled in world space, never per frame. */
  meadow: number; rock: number;
}

const smooth = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** Cross-section distances are measured leftwards from the road centre. */
function section(s: Seg): CoveSection {
  const i = s.i, foot = s.wallOff * ROAD_W;
  const rise = smooth((i - 30) / 230);
  const shelf = 170 + rise * (300 + 180 * vnoise(i / 170, 301));
  const width = 4800 + 2300 * vnoise(i / 200, 302);
  const hill = shelf + 1500 + 1900 * vnoise(i / 290, 303);
  return { points: [
    { x: foot, h: 0 },
    { x: foot + 950, h: shelf },
    { x: foot + width, h: shelf },
    { x: foot + width + 3300 + 900 * vnoise(i / 130, 306), h: hill * .67 },
    { x: foot + width + 6900 + 1800 * vnoise(i / 170, 307), h: hill },
    { x: foot + width + 14500, h: hill * .48 },
    // The far side closes the hill. There is no exposed sheet edge at the start.
    { x: foot + 100000, h: 0 },
  ], meadow: vnoise(i / 95, 304), rock: vnoise(i / 61, 305) };
}

/** Height on the exact mesh used by the painter (also used for every new prop). */
export function coveHeight(c: CoveSection, x: number): number {
  const p = c.points;
  if (x <= p[0].x) return p[0].h;
  for (let k = 1; k < p.length; k++) if (x <= p[k].x) {
    const u = (x - p[k-1].x) / (p[k].x - p[k-1].x);
    return p[k-1].h + (p[k].h - p[k-1].h) * u;
  }
  return p[p.length-1].h;
}

/** Applied after legacy decoration so its random sequence and all hit boxes stay intact. */
export function dressCove(segs: Seg[], from: number): void {
  let end = from;
  while (end < segs.length && segs[end].theme === 0) end++;
  if (end === from) return;
  for (let i = from; i < end; i++) {
    const s = segs[i];
    s.cove = section(s);
    // Retain every solid object and all sea-side scenery. Replace the old hillside
    // decoration as a separate pass, without consuming the gameplay RNG.
    s.sprites = s.sprites.filter(p => p.hit > 0 || p.x >= 0 || !(p.y > 0 || p.name.startsWith('cove_tuft')));
  }
  const add = (s: Seg, name: string, x: number, scale: number, flip = false) => {
    s.sprites.push({ name, x: -x / ROAD_W, y: coveHeight(s.cove!, x), scale, flip, hit: 0, br: s.fork >= 0 ? -1 : undefined });
  };
  // A small welcoming grove behind the spectators frames the start without
  // hiding the coast or reintroducing a tall roadside wall.
  for (const [i, name, offset, scale] of [
    [68, 'palm_g', 1100, 1.9], [78, 'palm_e', 2100, 1.65],
    [89, 'palm_d', 1300, 1.8], [73, 'bush_f', 700, 1.35],
    [94, 'bush_c', 1800, 1.3],
  ] as const) {
    if (i >= from && i < end && segs[i].cove) add(segs[i],name,segs[i].cove!.points[1].x+offset,scale);
  }
  const houses = ['cove_cottage', 'cove_villa_a', 'cove_cube', 'cove_villa_b', 'cove_chapel'];
  // A few settlements separated by open meadows. The opening has one cottage
  // and a second house further along, rather than a row stuck high on a cliff.
  for (let group = 0; group < 18; group++) {
    const base = 190 + group * 340 + Math.floor(cellRand(group, 320) * 60);
    const count = group % 3 === 2 ? 1 : 2;
    for (let house = 0; house < count; house++) {
      let m = base + house * 40;
      // Avoid steep road crests, checkpoints and the fork. A plot is level in
      // world height, not just at a constant height above a sloping road.
      while (m < base + house * 40 + 28 && m + 18 < end) {
        const s = segs[m], a = segs[m-16], b = segs[m+16];
        if (a && s.cove && s.fork < 0 && Math.abs(b.y1-a.y1) < 260 &&
          !segs.slice(m-20,m+21).some(t => t.gate || t.fork >= 0)) break;
        m++;
      }
      if (m < from + 18 || m + 18 >= end || m >= base + house * 40 + 28) continue;
      const s = segs[m], c = s.cove!;
      const front = c.points[1].x + 240, width = 4400;
      const plot: CovePlot = { first: m-16, last: m+16, houseSegment: m, x: front + width*.5, width, worldY: s.y1 + c.points[1].h };
      for (let j = plot.first-6; j <= plot.last+6; j++) {
        const t = segs[j];
        if (!t?.cove || t.fork >= 0) continue;
        const e = smooth(Math.min(j-(plot.first-6), plot.last+6-j) / 6);
        const points = t.cove.points, h = plot.worldY-t.y1;
        points[1] = { x: points[1].x + (front-points[1].x)*e, h: points[1].h+(h-points[1].h)*e };
        points[2] = { x: points[2].x + (front+width-points[2].x)*e, h: points[2].h+(h-points[2].h)*e };
        if (j >= plot.first && j <= plot.last) t.cove.plot = plot;
      }
      add(s, houses[(group+house)%houses.length], plot.x, 1.65);
      add(segs[m-7], 'bush_f', front+600, 1.3);
      add(segs[m+7], 'bush_c', front+1100, 1.25);
      add(segs[m+10], group%2 ? 'palm_e' : 'palm_g', front+width-450, 1.7);
    }
  }
  // Coherent small groves and rocky pockets, with long quiet stretches.
  for (let i = Math.max(from, 65); i < end-1; i++) {
    const s = segs[i], c = s.cove!;
    if (s.fork >= 0 || s.gate || c.plot) continue;
    const zone = Math.floor(i/95), u = cellRand(zone, 330), local = i%95;
    if (u < .5 && local > 24 && local < 54 && i%9 === 0) {
      const x = c.points[1].x + 1300 + cellRand(i,331)*2300;
      add(s, i%3 ? 'palm_e' : 'palm_g', x, 1.65, cellRand(i,332)>.5);
      if (i%18===0) add(s, 'bush_f', x-600, 1.2);
    }
    if (u > .72 && local > 30 && local < 60 && i%11 === 0) {
      const x = c.points[2].x + 600 + cellRand(i,333)*1800;
      add(s, ['cove_rock_a','cove_rock_c','cove_rock_d'][zone%3], x, 1.8);
      add(s, 'bush_e', x+650, 1.15);
    }
    if (i%27===0 && cellRand(i,334)<.45) add(s, 'bush_f', c.points[1].x+450, 1.1);
    if (u < .4 && local > 28 && local < 60 && i%17===0) {
      add(s, 'stone_pine', c.points[2].x+1200+cellRand(i,335)*1800, 1.55);
    }
  }
  // Low, separated scrub islands: broad bushes and squat boulders retain a
  // clear silhouette at 320x180. Keep the whole sprite beyond the run-off,
  // including its overhanging leaves, not just its ground anchor.
  const widths = { bush_a: 48, bush_c: 64, bush_e: 60,
    cove_rock_a: 92, cove_rock_c: 80, cove_rock_d: 100 };
  const scatter = (i: number, name: keyof typeof widths, offset: number, scale: number, flip: boolean) => {
    if (i < from || i >= end-1) return;
    const s = segs[i], c = s.cove!;
    if (c.plot || segs.slice(Math.max(from,i-12),Math.min(end,i+13)).some(t => t.gate || t.fork >= 0)) return;
    const half = widths[name] * scale * SPR_S * .5;
    const x = Math.max(c.points[1].x + offset, c.points[0].x + 550 + half);
    add(s, name, x, scale, flip);
  };
  for (let group = 0; group * 72 + 32 < end; group++) {
    const base = 45 + group * 72 + Math.floor(cellRand(group,370)*18);
    const rock = group%3 === 0 ? 'cove_rock_d' : group%3 === 1 ? 'cove_rock_a' : 'cove_rock_c';
    const drift = cellRand(group,371)*900;
    const flip = cellRand(group,372)>.5;
    // Clusters occupy about half an interval; open grass separates them.
    scatter(base-15, 'bush_c', 600+drift, 3.0, flip);
    scatter(base-8, rock, 1200+drift, group%3 === 0 ? 3.2 : 3.7, flip);
    scatter(base-3, 'bush_a', 550+drift, 3.4, !flip);
    scatter(base+6, 'bush_c', 1900+drift, 2.7, !flip);
    scatter(base+14, 'bush_a', 650+drift, 2.9, flip);
    if (group%3 !== 2) scatter(base+23, 'bush_e', 3100+drift, 2.6, !flip);
    if (group%3 === 0) scatter(base+3, 'cove_rock_c', 3400+drift, 2.2, !flip);
  }
}

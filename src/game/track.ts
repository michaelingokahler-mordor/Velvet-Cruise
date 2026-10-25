// Builds the run as one continuous road through five columns of stages, each
// with a midpoint checkpoint and an end gate. Where a stage's road forks, the
// last straight splits into two roads (one per destination) — the chosen
// destination's road is built ahead, and rebuilt the moment the player picks
// the other one. Layouts come from fixed seeds per stage, so every player
// races exactly the same roads (the coast stages keep their original shape).
import { SEG_LEN, ROAD_W, SPR_S } from "./config";
import { THEMES, PROP_INFO, Theme, themeShape } from "./themes";
import { vnoise, cellRand, slopeForms, leanOf, plotSpan, ZONE, NF, F_L0, F_L1, F_H0, F_H1, F_R0, F_R1 } from "./terrain";
import { COLS, NEXT, COAST_PATH, GOAL_A_PATH, completePath, forks as nodeForks } from "./routes";
import { DEMO_A } from "./edition";
import { dressCove, type CoveSection } from "./cove";
import { dressBluffs, type BluffSection } from "./bluffs";
import { dressLandscape, type Landscape } from "./landscape";
import { STAGE_EXTENSIONS } from "./stage-extension";

export interface SprInst {
  name: string;
  x: number;      // lateral centre, in road half-widths (from the centre of its road)
  y: number;      // world height of the base
  scale: number;
  flip: boolean;
  hit: number;    // collision half width (road half-widths), 0 = passable
  /** In a fork: which road it stands beside (-1 left, 1 right); 0/undefined = the old centre line. */
  br?: number;
  /** Banner text id for gates (overrides the gate's own label). */
  label?: string;
  /** Cosmetic advance sign; the destinations come directly from its fork. */
  destinations?: [number,number];
}

export type GateKind = "start" | "check" | "stage" | "goal";
export interface Gate { kind: GateKind; stage: number; bonus: number; label: string }

export interface Seg {
  i: number;
  y1: number; y2: number;
  curve: number;
  /** Column (stage number - 1): switches at the end gates. */
  stage: number;
  /** Which stage's look (THEMES index) the segment is painted with. */
  theme: number;
  /** Fork split at the near edge (world units): the two roads' centres sit at ±fo. */
  fo: number;
  /** Index of the fork this segment belongs to (into Track.forks), or -1. */
  fork: number;
  sprites: SprInst[];
  /** Ice on the road (0 = none .. 1 = glare ice) between the lateral limits iceL..iceR (road half-widths). */
  ice: number; iceL: number; iceR: number;
  /** Building plot on the slope beside this segment: height fraction of the slope (0 = none) and its first / last segment. */
  pathT: number; pathQ: number;   // footpath up to a building terrace: progress 0..1 (0 = none) and the wall foot it ends at
  soft: boolean;     // decorative wall only (the start line's lead-in): the car is not stopped by it
  plotF: number; plotI0: number; plotI1: number;   // building terrace: world height (0 = none), first and last segment
  /** Cached painted slope forms (render only). */
  tf?: Float32Array; tfR?: Float32Array;
  /** Palm Cove's visual land volume; independent of collision wall geometry. */
  cove?: CoveSection;
  /** Coral Bluffs' cosmetic hills and inside-bend rock cuttings. */
  bluffs?: BluffSection;
  /** Cosmetic closed ground for the remaining natural stages. */
  landscape?: Landscape;
  wallH: number;     // land-side (left) wall height at the near edge
  wallOff: number;   // land-side wall distance (road half-widths)
  wallRH: number;    // right-hand wall (land stages), 0 = none
  wallROff: number;
  rail: number;      // 1 = sea-side guardrail
  beach: number;     // sea-side sand width (road half-widths)
  gate: Gate | null;
  chequer: boolean;  // painted start / finish line
  /** Inside a tunnel (walls + ceiling; the first one has the tunnel mouth in front of it). */
  tunnel: boolean;
  /** City stages: which tower stands beside the road here (left / right; 0 = alley or none). */
  bL: number; bR: number;
  // projection scratch
  X1: number; Y1: number; W1: number; S1: number;
  X2: number; Y2: number; W2: number; S2: number;
  cx1: number; cx2: number; // curve offset (world) at near/far edge
  cz1: number; cz2: number;
  /** Lateral offset (world) of the left road / right road / old centre line this frame, near & far edge. */
  oL1: number; oL2: number; oR1: number; oR2: number; oC1: number; oC2: number;
}

const EMPTY: SprInst[] = [];
const OVERHEAD_GATES = new Set(["gate", "gate_goal"]);

/** Seedable random numbers (mulberry32) whose state can be read back. */
class Rng {
  constructor(public state: number) { this.state >>>= 0; }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

const easeIn = (a: number, b: number, p: number) => a + (b - a) * Math.pow(p, 2);
const easeInOut = (a: number, b: number, p: number) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

export interface StageInfo {
  index: number;      // column
  node: number;       // which stage (THEMES index)
  startSeg: number;   // first segment of the stage's own road (after the previous gate / fork)
  midSeg: number;     // checkpoint gate
  endSeg: number;     // end gate
  /** Original end before the added bend/straight; preserves the Normal clock. */
  timedEndSeg: number;
  extension?: {start: number; bendEnd: number; end: number};
}

/** A split in the road at the end of a stage. */
export interface Fork {
  col: number;       // the column whose end splits
  start: number;     // first segment of the split (the two roads still coincide)
  nose: number;      // the median begins: the choice is made here
  gate: number;      // checkpoint gates over both roads (= that stage's end gate)
  end: number;       // split complete: the chosen road is the only road from here
  left: number;      // destination stage of the left road
  right: number;     // destination stage of the right road
}

export const FORK_PRE = 110;    // the split starts this many segments before the stage gate
export const FORK_LEN = 340;    // longer than the view distance after the nose, so only one future is ever visible
export const FORK_NOSE = 50;
/** Extra run-off (road half-widths) beside the road, and the share of roadside obstacles that are laid out. */
export const RUNOFF_PLUS = 0.22;
export const PROP_DENSITY = 0.8;
/** Gap kept between the road's edge strip and any roadside prop's near side (road half-widths). */
export const PROP_GAP = 0.22;
export const FORK_W = 70000;    // final distance of each road's centre from the old centre line (world units)
/** Split of a fork (world units) at fraction u of its length. */
export function forkSplit(u: number): number {
  const v = Math.max(0, Math.min(1, u));
  return FORK_W * v * v * (3 - 2 * v);
}

/** Tunnels: ceiling height (world) and wall distance (road half-widths); the mouth's building face. */
export const TUN_H = 3400, TUN_W = 1.62, PORTAL_W = 9, PORTAL_H = TUN_H + 7400;
/** City stages: distance of the tower fronts from the road centre (road half-widths). */
export const CITY_OFF = 2.35;

const LENGTHS = [6000, 6300, 6600, 6900, 7200];
const F_TIME = [0.8, 0.83, 0.86, 0.88, 0.9];
const VMAX_SEG = 92;
const START_GATE = 24; // banner far enough ahead to read over the grid
const COAST_SEED = 0x5c0a57;

let coastSeeds: number[] | null = null;

export class Track {
  segs: Seg[] = [];
  stages: StageInfo[] = [];
  forks: Fork[] = [];
  /** The stage driven in each column (columns not reached yet hold the planned continuation). */
  path: number[];
  startSeg = 6;       // segment the race starts on (camera)
  goalSeg = 0;
  startTime = 0;
  /** Bumped whenever the road ahead is rebuilt. */
  version = 0;
  private lastY = 0;
  private col = 0;
  private node = 0;
  private r = new Rng(1);
  /** Recording run: one random sequence through all stages (the original coast road). */
  private sequential = false;
  /** First column not built yet (a re-route builds the next stage at once, the rest a column per frame). */
  private pendingCol = 0;

  get length(): number { return this.segs.length * SEG_LEN; }

  constructor(path: number[] = COAST_PATH, record = false) {
    this.path = DEMO_A && !record ? GOAL_A_PATH.slice() : completePath(path);
    this.sequential = record;
    if (!record && !coastSeeds) coastSeeds = new Track(COAST_PATH, true).recorded;
    this.build(0);
  }

  /** rng state at the start of each coast stage in the original single-sequence layout. */
  private recorded: number[] = [];

  seg(z: number): Seg {
    let i = Math.floor(z / SEG_LEN);
    if (i < 0) i = 0;
    if (i >= this.segs.length) i = this.segs.length - 1;
    return this.segs[i];
  }

  /** The fork at the end of a column (if that stage's road splits). */
  forkAt(col: number): Fork | undefined { return this.forks[col]; }

  /** First segment painted with column `c`'s stage. */
  themeStart(c: number): number {
    if (c <= 0) return 0;
    if (c >= COLS) return this.segs.length;
    const f = this.forks[c - 1];
    return f ? f.end : this.stages[c - 1].endSeg + 1;
  }

  /** The fork at the end of column col-1 was taken toward `node`: rebuild the road from there on
   *  (the next stage right away, later ones through `step`). */
  choose(col: number, node: number): void {
    if (DEMO_A) return;
    while (this.pendingCol < COLS) this.step();
    if (col <= 0 || col >= COLS || this.path[col] === node) return;
    if (!(NEXT[this.path[col - 1]] ?? []).includes(node)) return;
    this.path = completePath([...this.path.slice(0, col), node]);
    this.build(col, true);
  }

  /** Build the next missing stage, if any (call once per frame). */
  step(): void {
    if (this.pendingCol < COLS) this.extend(this.pendingCol + 1);
  }

  private add(curve: number, y: number): void {
    const i = this.segs.length;
    this.segs.push({
      i, y1: this.lastY, y2: y, curve, stage: this.col, theme: this.node, fo: 0, fork: -1, sprites: EMPTY,
      ice: 0, iceL: 0, iceR: 0,
      pathT: 0, pathQ: 0, soft: false, plotF: 0, plotI0: 0, plotI1: 0,
      wallH: 0, wallOff: 1.9, wallRH: 0, wallROff: 2, rail: 1, beach: 0.35, gate: null, chequer: false, tunnel: false, bL: 0, bR: 0,
      X1: 0, Y1: 0, W1: 0, S1: 0, X2: 0, Y2: 0, W2: 0, S2: 0, cx1: 0, cx2: 0, cz1: 0, cz2: 0,
      oL1: 0, oL2: 0, oR1: 0, oR2: 0, oC1: 0, oC2: 0,
    });
    this.lastY = y;
  }

  private road(enter: number, hold: number, leave: number, curve: number, height: number): void {
    const startY = this.lastY;
    const endY = startY + height;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++) this.add(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    for (let n = 0; n < hold; n++) this.add(curve, easeInOut(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++) this.add(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
  }

  /** Add road sections until the stage reaches roughly `len` segments (ends on a long straight). */
  private stagePieces(len: number, shape: { twist: number; hills: number; straights: number }): void {
    const r = () => this.r.next();
    const difficulty = shape.twist;
    const target = this.segs.length + len;
    let heading = 0; // keeps the coast on the right: curves are balanced
    while (this.segs.length < target - 200) {
      const left = target - this.segs.length;
      const k = r();
      const hill = () => {
        const h = r();
        if (h < 0.35) return 0;
        const amp = (1200 + r() * (2500 + difficulty * 900)) * (r() < 0.5 ? -1 : 1) * shape.hills;
        // keep the road near sea level overall
        const y = this.lastY;
        if (y + amp > 9000 || y + amp < -6000) return -amp * 0.6;
        return amp;
      };
      const dirPick = () => {
        // steer the cumulative heading back toward zero so the backdrop coast stays put
        const bias = Math.max(-0.8, Math.min(0.8, -heading / 2200));
        return r() < 0.5 + bias / 2 ? 1 : -1;
      };
      const mag = () => {
        const m = r();
        const hard = 0.15 + difficulty * 0.09;
        if (m < hard) return 4.6;
        if (m < hard + 0.45) return 3.1;
        return 1.7;
      };
      if (k < shape.straights || left < 500) {
        const n = Math.min(left - 100, 120 + Math.floor(r() * 220));
        this.road(40, Math.max(10, n - 80), 40, 0, hill());
      } else if (k < 0.72) {
        const d = dirPick(), c = mag() * d;
        const hold = 140 + Math.floor(r() * (260 - difficulty * 25));
        const e = 70 + Math.floor(r() * 50);
        this.road(e, hold, e, c, hill());
        heading += c * (hold + e);
      } else {
        // S-bend
        const d = dirPick(), c = mag();
        const hold = 90 + Math.floor(r() * 120);
        this.road(60, hold, 60, c * d, hill());
        this.road(60, hold, 60, -c * d * (0.8 + r() * 0.3), hill());
        heading += c * d * (hold + 60) * 0.1;
      }
    }
    // level out and straighten before the gate (always >= 160 straight segments)
    this.road(60, Math.max(40, target - this.segs.length - 120), 60, 0, -this.lastY * 0.9);
  }

  private seedFor(node: number, col: number): number {
    if (node < 5 && node === col && coastSeeds) return coastSeeds[col];
    return (0x9e3779b9 ^ Math.imul(node + 1, 0x85ebca6b) ^ Math.imul(col + 7, 0xc2b2ae35)) >>> 0;
  }

  private buildStage(c: number): void {
    const node = this.path[c];
    this.node = node;
    this.col = c;
    if (this.sequential) this.recorded.push(this.r.state);
    else this.r = new Rng(this.seedFor(node, c));
    const startSeg = this.segs.length;
    if (c === 0) this.road(20, 120, 20, 0, 0);
    const shape = themeShape(THEMES[node], c);
    this.stagePieces(LENGTHS[c] / 2 - (c === 0 ? 160 : 0), shape);
    const midSeg = this.segs.length;
    this.road(30, 60, 30, 0, 0);
    this.stagePieces(LENGTHS[c] / 2 - 120, shape);
    const timedEndSeg = this.segs.length;
    let extension: StageInfo['extension'];
    // The recording pass only discovers the old coast RNG states. Added road
    // consumes no RNG and returns to the same height before the next stage.
    if (!this.sequential) {
      const e = STAGE_EXTENSIONS[node], y = this.lastY, start = this.segs.length;
      this.road(e.enter, e.hold, e.leave, e.curve, e.rise);
      const bendEnd = this.segs.length;
      this.road(30, e.straight - 60, 30, 0, y - this.lastY);
      this.lastY = this.segs[this.segs.length - 1].y2 = y;
      extension = {start, bendEnd, end:this.segs.length};
    }
    const endSeg = this.segs.length;
    this.stages[c] = { index: c, node, startSeg, midSeg, endSeg, timedEndSeg, extension };
    // tunnels: clear of the checkpoints and of each other
    const tun = THEMES[node].tunnels;
    if (tun && !this.sequential) {
      const g = new Rng((this.seedFor(node, c) ^ 0x7a11e1) >>> 0);
      const lo = startSeg + 300, hi = timedEndSeg - 260;
      const spans: [number, number][] = [];
      for (let tries = 0; spans.length < tun.count && tries < 60; tries++) {
        const len = tun.min + Math.floor(g.next() * (tun.max - tun.min));
        const a = lo + Math.floor(g.next() * Math.max(1, hi - lo - len));
        const b = a + len;
        if (b > hi || (a < midSeg + 90 && b > midSeg - 90)) continue;
        if (spans.some(([x, y]) => a < y + 260 && b > x - 260)) continue;
        spans.push([a, b]);
      }
      for (const [a, b] of spans) for (let i = a; i < b; i++) this.segs[i].tunnel = true;
    }
    if (c < COLS - 1) {
      const split = nodeForks(node) && (!DEMO_A || this.sequential);
      // straight run after the gate (next column; it keeps this stage's look through a split);
      // a fork needs it long enough to finish splitting
      this.col = c + 1;
      if (!split) this.node = this.path[c + 1];
      // Keep the full route's distance and checkpoint clock in the demo.
      this.road(30, nodeForks(node) ? 170 : 90, 30, 0, -this.lastY);
      if (split) {
        const [left, right] = NEXT[node];
        const start = endSeg - FORK_PRE;
        this.forks[c] = { col: c, start, nose: start + FORK_NOSE, gate: endSeg, end: start + FORK_LEN, left, right };
      }
    }
  }

  private build(fromCol: number, lazy = false): void {
    if (fromCol === 0) {
      this.segs = [];
      this.stages = [];
      this.forks = [];
      this.lastY = 0;
      this.col = 0;
      this.node = this.path[0];
      if (this.sequential) this.r = new Rng(COAST_SEED);
      for (let n = 0; n < 40; n++) this.add(0, 0);
    } else {
      const from = this.stages[fromCol].startSeg;
      this.segs.length = from;
      this.stages.length = fromCol;
      this.forks.length = Math.min(this.forks.length, fromCol);
      this.lastY = this.segs[from - 1].y2;
    }
    this.pendingCol = fromCol;
    this.extend(lazy ? fromCol + 1 : COLS);
  }

  /** Build columns up to (not including) `upto`; the victory road once every column exists. */
  private extend(upto: number): void {
    const c0 = this.pendingCol;
    const c1 = Math.min(Math.max(upto, c0), COLS);
    const firstSeg = this.segs.length;
    for (let c = c0; c < c1; c++) this.buildStage(c);
    this.pendingCol = c1;
    const done = c1 >= COLS;
    if (done) {
      this.col = COLS - 1;
      this.node = this.path[COLS - 1];
      this.road(50, 900, 50, 0, -this.lastY); // victory lap road beyond the goal
    }
    if (this.sequential) return;

    const segs = this.segs, st = this.stages;
    // fork splits
    for (const f of this.forks) {
      if (!f || f.col < c0) continue;
      for (let i = f.start; i < f.end; i++) { segs[i].fo = forkSplit((i - f.start) / FORK_LEN); segs[i].fork = f.col; }
    }
    // gates and time bonuses (a stage's end gate needs the next stage's checkpoint, so it waits for it)
    if (c0 === 0) {
      this.startTime = Math.round((st[0].midSeg - START_GATE) / (VMAX_SEG * 0.62)) + 4;
      segs[START_GATE].gate = { kind: "start", stage: 0, bonus: 0, label: "gate.start" };
      segs[this.startSeg + 7].chequer = true;
    }
    for (let c = Math.max(0, c0 - 1); c < c1; c++) {
      const a = st[c];
      if (c >= c0) {
        const toEnd = a.timedEndSeg - a.midSeg;
        segs[a.midSeg].gate = { kind: "check", stage: c, bonus: Math.round(toEnd / (VMAX_SEG * F_TIME[c])), label: "gate.checkpoint" };
      }
      if (c === COLS - 1) {
        segs[a.endSeg].gate = { kind: "goal", stage: c, bonus: 0, label: "gate.goal" };
        segs[a.endSeg].chequer = true;
      } else if (c + 1 < c1) {
        const toMid = st[c + 1].midSeg - a.endSeg;
        segs[a.endSeg].gate = { kind: "stage", stage: c, bonus: Math.round(toMid / (VMAX_SEG * F_TIME[c + 1])), label: "gate.checkpoint" };
      }
    }
    if (done) this.goalSeg = st[COLS - 1].endSeg;
    else if (!this.goalSeg) this.goalSeg = segs.length + 99999;
    this.decorate(firstSeg, c0 === 0);
    dressCove(segs, c0 === 0 ? 0 : firstSeg);
    dressBluffs(segs, firstSeg);
    dressLandscape(segs, firstSeg);
    for(const fork of this.forks) {
      if(!fork)continue;
      let i=fork.start-125;
      while(i>=firstSeg&&(segs[i]?.cove?.plot||segs[i]?.bluffs?.plot||segs[i]?.landscape?.left.plot||segs[i]?.gate))i-=12;
      if(i<firstSeg||!segs[i]||segs[i].tunnel)continue;
      const s=segs[i],g=s.cove??s.bluffs??s.landscape?.left;
      const x=Math.max(3.2,s.wallOff+1.2)*ROAD_W;
      let y=0;
      if(g)for(let k=1;k<g.points.length;k++)if(x<=g.points[k].x){const a=g.points[k-1],b=g.points[k];y=a.h+(b.h-a.h)*(x-a.x)/(b.x-a.x);break;}
      // Empty segments share EMPTY; never append cosmetic signs to that array.
      s.sprites=[...s.sprites,{name:'fork_sign',x:-x/ROAD_W,y,scale:3.2,flip:false,hit:0,destinations:[fork.left,fork.right]}];
    }
    // the previous stage's end gate was waiting for this stage: dress it now (unless it already is)
    if (c0 > 0) this.dressGate(segs[st[c0 - 1].endSeg], firstSeg);
    this.version++;
  }

  private put(seg: Seg, s: SprInst): void {
    if (seg.sprites === EMPTY) seg.sprites = [];
    seg.sprites.push(s);
  }

  private prop(seg: Seg, name: string, x: number, y = 0, flip = false, br?: number): void {
    const info = PROP_INFO[name] ?? { scale: 1.6, solid: false, hit: 0 };
    this.put(seg, { name, x, y, scale: info.scale, flip, hit: info.solid ? info.hit : 0, br });
  }

  private pick(list: [string, number][], r: () => number): string {
    let tot = 0;
    for (const [, w] of list) tot += w;
    let k = r() * tot;
    for (const [n, w] of list) { k -= w; if (k <= 0) return n; }
    return list[0][0];
  }

  /** Nearest |x| (road half-widths from the centre) a prop may stand at so its near side clears the edge strip. */
  private clearance(name: string, roadEdge: number): number {
    const info = PROP_INFO[name];
    const half = info && info.solid ? info.hit : 0.3; // soft props (bushes, umbrellas) still have a body
    return roadEdge + PROP_GAP + half;
  }

  /**
   * Icy patches on Snowcap Pass: every few hundred segments a stretch of the road glazes over, across
   * the whole road or only part of it (so a line round it exists), with a warning sign ahead of it.
   * Kept clear of forks, gates and the stage's ends.
   */
  private icePatches(from: number, n: number): void {
    const segs = this.segs;
    for (let i = from; i < n; i++) segs[i].ice = 0;
    let i = from;
    while (i < n) {
      if (THEMES[segs[i].theme].id !== "snowcap-pass") { i++; continue; }
      // a run of this stage's own road
      let j = i;
      while (j < n && segs[j].theme === segs[i].theme && segs[j].stage === segs[i].stage) j++;
      const end = j - 400;                                  // nothing near the end gate / fork
      const g = new Rng((0x1ce5 ^ Math.imul(segs[i].stage + 3, 0x9e3779b1)) >>> 0);
      let k = i + 420;
      while (k + 60 < end) {
        const len = 70 + Math.floor(g.next() * 50);
        const mode = g.next();
        const [lo, hi] = mode < 0.3 ? [-1.15, 1.15] : mode < 0.52 ? [-1.15, 0.2] : mode < 0.74 ? [-0.2, 1.15] : [-0.55, 0.55];
        let ok = true;
        for (let q = k - 100; q < k + len; q++) if (!segs[q] || segs[q].fork >= 0 || segs[q].gate || segs[q].tunnel) { ok = false; break; }
        if (ok) {
          for (let q = 0; q < len; q++) {
            const s = segs[k + q];
            s.ice = Math.min(1, Math.min(q, len - 1 - q) / 10 + 0.15);
            s.iceL = lo; s.iceR = hi;
          }
          // a pair of warning signs (one each side) well ahead, and another on the right just before it
          for (const [back, sd] of [[110, 1], [110, -1], [55, 1]] as const) {
            const warn = segs[k - back];
            if (warn && warn.i >= from && !warn.tunnel) this.prop(warn, "ice_sign", sd * Math.min(this.clearance("ice_sign", 1.18), sd < 0 ? Math.max(1.3, warn.wallOff - 0.3) : 9), 0, sd < 0, this.side(warn, sd));
          }
        }
        k += len + 260 + Math.floor(g.next() * 300);
      }
      i = j;
    }
  }

  // ------------------------------------------------------------ painted-slope scenery
  // Stages with a `terrain` look lay their roadside out in ZONE-segment stretches: open landscape, a grove
  // beside the road, a village on building plots, or rocky ground. Objects come in groups with real gaps
  // between them, and everything on a slope sits where the painted forms put it (outcrops, meadows,
  // hollows, plots). Hit boxes and the clearance from the road are exactly the old rules.
  private formTmp = new Float32Array(NF);
  private modules = new Map<number, { name: string; hp: number }>();

  private zoneKind(zone: number, seed: number, th: Theme): number {
    const sc = th.terrain!.scene;
    const z = sc.zones ?? [0.28, 0.58, 0.8];
    const village = sc.modules?.length ? z[2] : z[1];
    const u = cellRand(zone, seed + 50);
    return u < z[0] ? 0 : u < z[1] ? 1 : u < village ? 2 : 3;      // open / grove / village / rocky
  }

  /** Building plots (a flat shelf with a retaining wall) for the village stretches. */
  private planPlots(from: number, n: number): void {
    const segs = this.segs;
    this.modules.clear();
    for (let zone = Math.floor(from / ZONE); zone * ZONE < n; zone++) {
      const zs = zone * ZONE;
      const mid = segs[Math.min(n - 1, zs + (ZONE >> 1))];
      const th = mid && THEMES[mid.theme];
      if (!th || !th.terrain?.scene.modules?.length || th.wall === "none") continue;
      const names = th.terrain.scene.modules;
      const seed = mid.theme * 7;
      if (this.zoneKind(zone, seed, th) !== 2) continue;
      const count = 1 + Math.floor(cellRand(zone, seed + 51) * 3);
      for (let k = 0; k < count; k++) {
        const p0 = zs + 3 + k * 13 + Math.floor(cellRand(zone * 5 + k, seed + 52) * 4), p1 = p0 + 11, pm = p0 + 6;
        if (p0 < Math.max(140, from) || p1 >= n) continue;
        const m = segs[pm];
        let ok = m.wallH > 4400;
        for (let q = p0; q <= p1 && ok; q++) {
          const t = segs[q];
          ok = t.theme === m.theme && t.fork < 0 && !t.gate && !t.tunnel && t.wallH > 4000;
        }
        if (!ok) continue;
        // one level shelf at about half the slope's height, wherever the slope is tall enough to hold it
        const hp = m.wallH * (0.46 + 0.1 * cellRand(zone * 5 + k, seed + 53));
        for (let q = p0; q <= p1; q++) { segs[q].plotF = hp; segs[q].plotI0 = p0; segs[q].plotI1 = p1; }
        // a footpath winds up to the terrace's wall from the foot of the slope
        const Lh = leanOf(th.wall, th.terrain), qf = plotSpan(hp, segs[p0].wallH, Lh, 1).q;
        for (let q = p0 - 40; q < p0; q++) {
          const t = segs[q];
          if (!t || t.plotF > 0 || t.fork >= 0 || t.gate || t.tunnel || t.theme !== m.theme || t.wallH < 3000) continue;
          t.pathT = (q - (p0 - 40) + 1) / 40; t.pathQ = qf;
        }
        this.modules.set(pm, { name: names[Math.floor(cellRand(zone * 5 + k, seed + 54) * names.length)], hp });
      }
    }
  }

  private slopeScenery(i: number, s: Seg, th: Theme, r: () => number, right: boolean): void {
    const sc = th.terrain!.scene;
    const sg = right ? 1 : -1;
    const seed = s.theme * 7 + (right ? 3 : 0), zone = Math.floor(i / ZONE), zs = zone * ZONE;
    const kind = this.zoneKind(zone, seed, th);
    const wallH = right ? s.wallRH : s.wallH, wallOff = right ? s.wallROff : s.wallOff;
    const hiX = wallOff - 0.12;
    const roadEdge = 1.18;
    const tmp = this.formTmp;
    const L = leanOf(right ? th.wallR : th.wall, th.terrain);
    const sx = (f: number) => sg * (wallOff + (L * wallH * f) / ROAD_W);
    const onSlope = (name: string, f: number, flip = r() < 0.5) =>
      this.put(s, { name, x: sx(f), y: wallH * f, scale: PROP_INFO[name].scale, flip, hit: 0, br: this.side(s, sg) });
    // a house module on its plot
    const mod = right ? undefined : this.modules.get(i);
    if (mod) {
      const sp = plotSpan(mod.hp, wallH, L, 1);
      this.put(s, { name: mod.name, x: sx(sp.c), y: wallH * sp.p, scale: PROP_INFO[mod.name].scale, flip: false, hit: 0, br: this.side(s, sg) });
      // garden: shrubs on the front edge of the shelf and a tree at its back
      const gx = (v: number) => sg * (wallOff + (L * wallH * v) / ROAD_W);
      const shelf = [[-4, sp.q + 0.025, false], [4, sp.q + 0.025, false], [-3, sp.r - 0.04, true]] as [number, number, boolean][];
      for (const [dk, v, tree] of shelf) {
        const t2 = this.segs[i + dk];
        if (!t2 || t2.plotF <= 0 || r() < 0.15) continue;
        const nm = tree ? this.pick(sc.trees, r) : this.pick(sc.shrubs, r);
        this.put(t2, { name: nm, x: gx(v), y: wallH * sp.p, scale: PROP_INFO[nm].scale, flip: r() < 0.5, hit: 0, br: this.side(t2, sg) });
      }
    }
    // roadside groves (trees and shrubs; same hit boxes and clearance as before) -- one or two per stretch
    if (kind !== 0 && s.fork < 0 && wallH > 0) {
      const groves = kind === 1 ? 2 : 1;
      for (let g = 0; g < groves; g++) {
        const c = zs + 6 + Math.floor(cellRand(zone * 3 + g, seed + 60) * 28);
        const d = Math.abs(i - c);
        if (d <= 5 && r() < (kind === 1 ? 0.62 : 0.4) * (1 - d / 8)) {
          const name = this.pick(sc.roadside, r);
          const lo = this.clearance(name, roadEdge);
          if (hiX > lo) {
            // a grove hugs one lateral line (a tree row or hedge) with some scatter
            const anchor = cellRand(zone * 3 + g, seed + 61);
            const x = sg * (lo + (hiX - lo) * Math.min(1, Math.max(0, anchor + (r() - 0.5) * 0.5)));
            this.prop(s, name, x, 0, r() < 0.35 && (name.startsWith("palm") || name.startsWith("cyp")), this.side(s, x));
          }
        }
      }
    }
    // a lone shrub or grass group at the foot of the slope, now and then
    if (s.fork < 0 && wallH > 0 && i % 6 === 0 && r() < (kind === 0 ? 0.5 : 0.28)) {
      const name = sc.tufts.length && r() < 0.55 ? sc.tufts[Math.floor(r() * sc.tufts.length)] : this.pick(sc.shrubs, r);
      const lo = Math.max(this.clearance(name, roadEdge), hiX - 0.7);
      if (hiX > lo) this.prop(s, name, sg * (lo + r() * (hiX - lo)), 0, r() < 0.5, this.side(s, sg));
    }
    // the slope itself
    if (wallH <= 1500 || s.fork >= 0) return;
    slopeForms(i, seed, th.terrain!, null, null, tmp, 0);
    const inPlot = (f: number) => {
      if (s.plotF <= 0 || right) return false;
      const sp = plotSpan(s.plotF, wallH, L, 1);
      return f > sp.q - 0.08 && f < sp.r + 0.04;
    };
    // rock on the outcrops
    if (tmp[F_R1] > tmp[F_R0] + 0.05 && i % 6 === 0 && sc.rocks.length) {
      const f = tmp[F_R0] + (tmp[F_R1] - tmp[F_R0]) * 0.32;
      if (!inPlot(f)) onSlope(sc.rocks[Math.floor(r() * sc.rocks.length)], f);
    }
    // shrubs in the hollows
    if (tmp[F_H1] > tmp[F_H0] + 0.05 && i % 4 === 1 && r() < 0.7) {
      const f = tmp[F_H0] + (tmp[F_H1] - tmp[F_H0]) * (0.2 + 0.6 * r());
      if (!inPlot(f)) onSlope(this.pick(sc.shrubs, r), f);
    }
    // trees and shrubs on the sunlit meadows
    if (tmp[F_L1] > tmp[F_L0] + 0.08 && i % 5 === 3 && r() < (kind === 1 ? 0.6 : 0.3)) {
      const f = tmp[F_L0] + (tmp[F_L1] - tmp[F_L0]) * (0.15 + 0.7 * r());
      if (!inPlot(f)) onSlope(r() < 0.55 ? this.pick(sc.trees, r) : this.pick(sc.shrubs, r), f);
    }
    // a skyline of trees along the crest, in groups
    if ((kind === 1 || kind === 2) && i % 2 === 0) {
      const g = Math.floor(i / 9);
      if (cellRand(g, seed + 70) < 0.42 && r() < 0.6) onSlope(this.pick(sc.trees, r), 0.9 + r() * 0.07);
    }
    // grass groups here and there
    if (sc.tufts.length && i % 2 === 0 && r() < 0.55) {
      const f = 0.06 + r() * 0.8;
      if (!inPlot(f)) onSlope(sc.tufts[Math.floor(r() * sc.tufts.length)], f);
    }
    // (no village behind the crest: with nothing but sky behind the ridge it read as floating; villages stand on terraces)
  }

  /** Which fork road a prop at lateral x stands beside (only inside a split). */
  private side(s: Seg, x: number): number | undefined { return s.fork >= 0 ? (x < 0 ? -1 : 1) : undefined; }

  /** Walls, rails, beaches and scenery for every segment from `from` on. */
  private decorate(from: number, startLine: boolean): void {
    const segs = this.segs;
    const n = segs.length;
    let r = () => 0.5;
    let region = -1;
    const reseed = (i: number) => {
      const s = segs[i];
      const key = s.theme * 16 + s.stage;
      if (key === region) return;
      region = key;
      const g = new Rng((0xc0a57 ^ Math.imul(key + 3, 0x27d4eb2d)) >>> 0);
      r = () => g.next();
    };
    // --- per-segment environment (smoothly varying) ---
    for (let i = from; i < n; i++) {
      const s = segs[i];
      const th = THEMES[s.theme];
      s.sprites = EMPTY;
      s.bL = s.bR = 0;
      const wallPhase = 0.004 * i + (0.002 / 0.0013) * (1 - Math.cos(i * 0.0013));
      const wave = 0.5 + 0.5 * Math.sin(wallPhase);
      const wave2 = 0.5 + 0.5 * Math.sin(i * 0.0021 + 1.3);
      // painted slopes keep one smooth ridge line (the old per-segment jitter made a saw-toothed crest)
      const jit = th.terrain ? 0.94 + 0.12 * vnoise(i / 53, s.theme + 40) : 0.9 + 0.2 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const [h, off] = wallShape(th.wall, wave, wave2);
      s.wallH = h * jit;
      s.wallOff = off;
      if (th.side === "land") {
        const waveR = 0.5 + 0.5 * Math.sin(wallPhase * 0.9 + 2.1);
        const [hr, offR] = wallShape(th.wallR ?? "none", waveR, 1 - wave2);
        const jitR = th.terrain ? 0.94 + 0.12 * vnoise(i / 57, s.theme + 41) : 0.9 + 0.2 * ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1;
        s.wallRH = hr * jitR;
        s.wallROff = offR;
        s.rail = 0;
        s.beach = 0;
      } else {
        s.wallRH = 0;
        // sea side: guardrail on cliffs, open beach in town
        s.rail = th.noRail ? 0 : th.wall === "town" ? (wave2 > 0.45 ? 0 : 1) : 1;
        s.beach = RUNOFF_PLUS * 0.7 + (th.wall === "town" ? 0.9 + wave * 1.2 : 0.45 + wave2 * 0.3) + (th.noRail ? 0.55 : 0);
      }
      // a split opens onto flatter, wider ground
      if (s.fork >= 0) {
        s.wallH = Math.min(s.wallH, 2600); s.wallOff = Math.max(s.wallOff, 2.1);
        if (s.wallRH) { s.wallRH = Math.min(s.wallRH, 2600); s.wallROff = Math.max(s.wallROff, 2.1); }
      }
    }
    // city towers (with alleys between them) on both sides, then tunnels through them
    this.cityBlocks(from, n, false);
    this.cityBlocks(from, n, true);
    for (let i = from; i < n; i++) {
      const s = segs[i];
      if (!s.tunnel) continue;
      s.wallH = s.wallRH = TUN_H;
      s.wallOff = s.wallROff = TUN_W;
      s.bL = s.bR = 0;
      s.rail = 0;
    }
    // near the start line keep it open and flat
    if (startLine) {
      // the start line stays open and low; the hill grows out of it smoothly (no step, and no gap behind the crowd)
      const ref = segs[Math.min(from, n - 1)];
      const natural = THEMES[ref.theme].terrain ? ref.wallH : 2600;
      for (let i = 0; i < 260 && i < n; i++) {
        const s = segs[i];
        const t = Math.min(1, i / 260), grow = t * t * (3 - 2 * t);
        const cap = 1300 + 6700 * grow;
        if (i < from) { s.wallH = Math.min(natural, cap); s.wallOff = Math.max(ref.wallOff, 2.2); s.soft = THEMES[ref.theme].terrain !== undefined; if (!s.soft) s.wallH = 0; }
        else s.wallH = Math.min(s.wallH, cap);
        if (i < 120 && !(i < from)) s.wallOff = Math.max(s.wallOff, 2.2);
      }
    }

    // --- scenery ---
    this.planPlots(from, n);
    const roadEdge = 1.18;
    for (let i = Math.max(10, from); i < n; i++) {
      const s = segs[i];
      const th = THEMES[s.theme];
      reseed(i);
      if (s.tunnel) continue; // nothing but walls and lights in a tunnel
      // land side, between the road and the wall
      const look = !!th.terrain;
      // stages with grouped scenery: buildings and palms gather in small clusters with free stretches between them
      const grp = th.groups ? vnoise(i / 26, s.theme + 60) : 1;
      if (!look && (i % 5 === 0 || (th.wall === "town" && i % 4 === 0))) {
        if (r() < 0.8 * PROP_DENSITY * (th.groups ? (grp < 0.42 ? 0 : 0.7 + grp) : 1) && th.landProps.length) {
          const name = this.pick(th.landProps, r);
          const lo = this.clearance(name, roadEdge), hi = s.wallOff - 0.12;
          if (hi > lo) {
            const x = -(lo + r() * (hi - lo));
            this.prop(s, name, x, 0, r() < 0.3 && name.startsWith("palm"), this.side(s, x));
          }
        }
      }
      // on the wall slope / top (city: neon signs hanging off the tower fronts)
      if (look) {
        this.slopeScenery(i, s, th, r, false);
        if (th.side === "land") this.slopeScenery(i, s, th, r, true);
      } else if (th.wall === "city") {
        if (s.bL && s.wallH > 4800 && i % 9 === 0 && th.topProps.length && r() < 0.8) {
          const name = this.pick(th.topProps, r);
          const y = Math.min(s.wallH - 2600, s.wallH * (0.18 + r() * 0.4));
          this.put(s, { name, x: -(s.wallOff - 0.3), y, scale: PROP_INFO[name]?.scale ?? 2.6, flip: false, hit: 0, br: this.side(s, -1) });
        }
      } else if (s.wallH > 1500 && i % 7 === 0 && th.topProps.length) {
        const f = 0.35 + r() * 0.65;
        const name = this.pick(th.topProps, r);
        const slope = th.wall === "cliff" ? 0.12 : 0.5;
        const x = -(s.wallOff + (slope * s.wallH * f) / ROAD_W);
        this.put(s, { name, x, y: s.wallH * f, scale: PROP_INFO[name]?.scale ?? 2, flip: r() < 0.5, hit: 0, br: this.side(s, -1) });
      }
      if (th.side === "land") {
        // right-hand side of an inland road
        if (!look && i % 5 === 2 && th.rightProps?.length) {
          const lim = s.wallRH > 0 ? s.wallROff : 3.2;
          if (r() < 0.8 * PROP_DENSITY) {
            const name = this.pick(th.rightProps, r);
            const lo = this.clearance(name, roadEdge), hi = lim - 0.12;
            if (hi > lo) {
              const x = lo + r() * (hi - lo);
              this.prop(s, name, x, 0, r() < 0.5, this.side(s, x));
            }
          }
        }
        if (th.wallR === "city") {
          if (s.bR && s.wallRH > 4800 && i % 9 === 4 && th.topProps.length && r() < 0.8) {
            const name = this.pick(th.topProps, r);
            const y = Math.min(s.wallRH - 2600, s.wallRH * (0.18 + r() * 0.4));
            this.put(s, { name, x: s.wallROff - 0.3, y, scale: PROP_INFO[name]?.scale ?? 2.6, flip: false, hit: 0, br: this.side(s, 1) });
          }
        } else if (!look && s.wallRH > 1500 && i % 7 === 3 && th.topProps.length) {
          const f = 0.35 + r() * 0.65;
          const name = this.pick(th.topProps, r);
          const slope = (th.wallR ?? "none") === "cliff" ? 0.12 : 0.5;
          const x = s.wallROff + (slope * s.wallRH * f) / ROAD_W;
          this.put(s, { name, x, y: s.wallRH * f, scale: PROP_INFO[name]?.scale ?? 2, flip: r() < 0.5, hit: 0, br: this.side(s, 1) });
        }
      } else if (i % 6 === 3 && th.seaProps.length) {
        // sea side
        if (s.rail) {
          if (r() < 0.35 * PROP_DENSITY * (th.groups ? (grp < 0.42 ? 0 : 1.4) : 1)) {
            const name = this.pick(th.seaProps, r);
            this.prop(s, name, Math.max(1.62, this.clearance(name, roadEdge)) + r() * 0.3, 0, false, this.side(s, 1));
          }
        } else if (r() < 0.75 * PROP_DENSITY * (th.groups ? (grp < 0.42 ? 0 : 0.7 + grp) : 1)) {
          const name = this.pick(th.seaProps, r);
          const lo = this.clearance(name, roadEdge), hi = 1.14 + s.beach - 0.05;
          if (hi > lo) this.prop(s, name, lo + r() * (hi - lo), 0, false, this.side(s, 1));
        }
        // out on the water: lily pads and reed beds beyond the shore
        if (!s.rail && th.waterProps?.length && r() < 0.5 * PROP_DENSITY) {
          this.prop(s, this.pick(th.waterProps, r), 1.14 + s.beach + 0.35 + r() * 2.6, 0, r() < 0.5, this.side(s, 1));
        }
      }
      // props at a steady rhythm (lamp posts, telephone poles, vine rows)
      if (th.rhythm) for (const rh of th.rhythm) {
        if (i % rh.every !== 0) continue;
        for (const x0 of rh.x) {
          // rows (vines) are thinned like the other roadside props; nothing stands on the edge strip
          if (rh.name === "vines" && r() > PROP_DENSITY) continue;
          const min = this.clearance(rh.name, roadEdge);
          const x = Math.sign(x0) * Math.max(Math.abs(x0), min) + (rh.jitter ? (r() - 0.5) * rh.jitter : 0);
          if (x < 0 && s.wallH > 0 && -x > s.wallOff - 0.2) continue;
          if (x > 0 && s.wallRH > 0 && x > s.wallROff - 0.2) continue;
          this.prop(s, rh.name, x, 0, !!rh.flipRight && x > 0, this.side(s, x));
        }
      }
      // sea stacks out in the water
      if (th.side !== "land" && i % 61 === 0 && r() < 0.6 && th.wall !== "town") {
        this.put(s, { name: "sea_stack", x: 3.5 + r() * 9, y: -60, scale: PROP_INFO.sea_stack.scale * (0.7 + r() * 0.8), flip: r() < 0.5, hit: 0, br: this.side(s, 1) });
      }
      // overhead sign gantries on highways (neon arches downtown)
      if (th.gantry && i % th.gantry === th.gantry >> 1 && s.fork < 0 && !s.gate && !this.nearTunnel(i, 16)) this.overhead(s, th.gantryName ?? "gantry");
    }
    this.icePatches(from, n);
    // curve warning chevrons before sharper bends
    for (let i = Math.max(200, from); i < n - 200; i++) {
      const c = segs[i].curve;
      if (Math.abs(c) > 2.8 && Math.abs(segs[i - 1].curve) <= 2.8) {
        for (let k = 1; k <= 3; k++) {
          const s = segs[i - 40 * k + 20];
          if (!s || s.i < from || s.tunnel) continue;
          if (c < 0) this.prop(s, "sign_left", this.clearance("sign_left", roadEdge));
          else this.prop(s, "sign_right", -this.clearance("sign_right", roadEdge));
        }
      }
    }
    // a tunnel mouth is solid building either side of the opening
    for (let i = Math.max(1, from); i < n; i++) {
      if (!segs[i].tunnel || segs[i - 1].tunnel) continue;
      this.put(segs[i], { name: "portal", x: -(TUN_W + 2.5), y: 0, scale: 0, flip: false, hit: 2.5 });
      this.put(segs[i], { name: "portal", x: TUN_W + 2.5, y: 0, scale: 0, flip: false, hit: 2.5 });
    }
    // lighthouse landmark in Coral Bluffs
    const cb = this.stages[1];
    if (cb && cb.node === 1 && cb.startSeg + 900 >= from) {
      const s = segs[cb.startSeg + 900];
      this.prop(s, "lighthouse", -(s.wallOff + 0.2), s.wallH * 0.2);
    }
    // the split: a sign on the nose, scenery down the median, a gate over each road
    for (const f of this.forks) {
      if (!f || f.end < from || f.start < from) continue;
      this.prop(segs[f.nose - 2], "fork_sign", 0);
      for (let i = f.nose + 14; i < f.end; i += 9) {
        const s = segs[i];
        const th = THEMES[s.theme];
        const room = s.fo / ROAD_W - roadEdge - 0.3;
        if (room < 0.4) continue;
        const list = th.side === "land" ? (th.rightProps ?? th.landProps) : th.landProps;
        if (!list.length || r() > 0.7 * PROP_DENSITY) continue;
        this.prop(segs[i], this.pick(list, r), (r() - 0.5) * Math.min(room, 3), 0, r() < 0.5, 0);
      }
    }
    // start line crowd & gates
    if (startLine) {
      const sg = START_GATE;
      for (let k = 0; k < 8; k++) {
        this.prop(segs[sg - 14 + k * 2], "crowd", -1.45 - (k % 2) * 0.35);
        this.prop(segs[sg - 13 + k * 2], "crowd", 1.45 + (k % 2) * 0.35, 0, true);
      }
    }
    for (let i = Math.max(0, from - 4); i < n; i++) if (segs[i].gate) this.dressGate(segs[i], from);
  }

  private nearTunnel(i: number, d: number): boolean {
    for (let k = -d; k <= d; k++) if (this.segs[i + k]?.tunnel) return true;
    return false;
  }

  /** City stages: towers of varied height along one side, with the odd alley between them.
   *  Laid out from the start of the city (so every route sees the same streets), low at both ends. */
  private cityBlocks(from: number, n: number, right: boolean): void {
    const segs = this.segs;
    const isCity = (s: Seg) => (right ? THEMES[s.theme].wallR : THEMES[s.theme].wall) === "city";
    let i = from;
    while (i < n) {
      if (!isCity(segs[i])) { i++; continue; }
      let j = i;
      while (j < n && isCity(segs[j])) j++;
      const g = new Rng((0x51ab7 ^ Math.imul(segs[i].theme + 1, 0x2c1b3c6d) ^ (right ? 0x9e3779 : 0)) >>> 0);
      const r = () => g.next();
      for (let k = i; k < j;) {
        const len = 14 + Math.floor(r() * 30);
        const gap = r() < 0.4 ? 2 + Math.floor(r() * 3) : 0;
        const ramp = Math.max(0, Math.min(1, (k - i) / 260, (j - k) / 260));
        const tall = r();
        const h = (3200 + tall * tall * 12000) * (0.3 + 0.7 * ramp);
        const seed = 1 + Math.floor(r() * 0x7ffffe);
        for (let q = k; q < Math.min(j, k + len + gap); q++) {
          const s = segs[q], on = q < k + len;
          if (right) { s.wallRH = on ? h : 0; s.wallROff = CITY_OFF; s.bR = on ? seed : 0; }
          else { s.wallH = on ? h : 0; s.wallOff = CITY_OFF; s.bL = on ? seed : 0; }
        }
        k += len + gap;
      }
      i = j;
    }
  }

  /** Banner(s) over a gate, a little crowd, and no clutter right around it. */
  private dressGate(seg: Seg, _from: number): void {
    if (!seg.gate || seg.sprites.some((p) => OVERHEAD_GATES.has(p.name))) return;
    const segs = this.segs;
    for (let j = -3; j <= 3; j++) {
      const s2 = segs[seg.i + j];
      if (s2 && s2.sprites !== EMPTY) s2.sprites = s2.sprites.filter((p) => Math.abs(p.x) > 2.2 || p.name === "crowd");
    }
    const name = seg.gate.kind === "goal" ? "gate_goal" : "gate";
    const fk = seg.fork >= 0 ? this.forks[seg.fork] : undefined;
    if (fk && fk.gate === seg.i) {
      // one checkpoint over each road, naming where it leads
      this.overhead(seg, name, -1, THEMES[fk.left].nameKey);
      this.overhead(seg, name, 1, THEMES[fk.right].nameKey);
      this.prop(segs[seg.i - 2], "crowd", -1.5, 0, false, -1);
      this.prop(segs[seg.i - 2], "crowd", 1.5, 0, true, 1);
      return;
    }
    this.overhead(seg, name);
    if (seg.gate.kind !== "start") {
      this.prop(segs[seg.i - 2], "crowd", -1.5);
      this.prop(segs[seg.i - 2], "crowd", 1.5, 0, true);
    }
  }

  /** A banner / sign bridge spanning the road: poles just outside the rumble strips. */
  private overhead(seg: Seg, name: string, br?: number, label?: string): void {
    const scale = (ROAD_W * 2 * 1.32) / (256 * SPR_S);
    this.put(seg, { name, x: 0, y: 0, scale, flip: false, hit: 0, br, label });
  }
}

/** Height (world) and distance (road half-widths) of a roadside wall. */
function wallShape(kind: Theme["wall"], wave: number, wave2: number): [number, number] {
  switch (kind) {
    // (every run-off is a touch wider than it used to be: RUNOFF_PLUS)
    case "cliff": return [5200 + wave * 7800 + wave2 * 2000, 1.55 + RUNOFF_PLUS + (1 - wave) * 0.5];
    case "hill": return [2600 + wave * 5200, 1.75 + RUNOFF_PLUS + (1 - wave) * 0.9];
    case "forest": return [3600 + wave * 3600, 1.9 + RUNOFF_PLUS + (1 - wave) * 0.6];
    case "town": return [wave2 > 0.6 ? 0 : 1200 + wave * 1500, 2.4 + RUNOFF_PLUS + wave2 * 0.8];
    case "sound": return [1500 + wave * 500, 2.0 + RUNOFF_PLUS + wave2 * 0.15];
    default: return [0, 1.9 + RUNOFF_PLUS];
  }
}

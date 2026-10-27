import type { DrawSurface } from "../core/draw-surface";
// Race simulation: the red convertible, rival traffic, checkpoints and the
// clock. Pure game state — rendering, sound and UI listen to its events.
import { FB, W, rgb, Spr } from "../core/fb";
import { SpriteBank } from "../core/assets";
import {
  HORIZON, FOCAL, CAM_H, PLAYER_Z, SPR_S, SEG_LEN, ROAD_W, DRAW_DIST, MAX_SPEED, KMH_AT_MAX,
  BRAKE, DECEL, OFFROAD_DECEL, OFFROAD_LIMIT, CENTRIFUGAL, STEER, STAGE_COUNT, RAIL_X,
} from "./config";
import { THEMES, Theme, Weather } from "./themes";
import { Track, Gate, Seg, Fork, SprInst, FORK_LEN, FORK_W, forkSplit } from "./track";
import { COLS, colOf } from "./routes";
import { Difficulty, DIFFS, NORMAL, weatherBend } from "./difficulty";
import { carLights } from "./lights";
import { WeatherRoof } from "./roof";
import { gradePhysics } from './grade';
import { blendWeather, npcKeepRight, npcSpeedFactor, windBendFactor, windSpeedFactor, type RoadWeather, type WindVector } from './weather';

export interface Car {
  z: number; x: number; speed: number; sprite: string; hw: number;
  targetX: number; bounce: number; passed: boolean; base: number;
  /** Screen anchor (top-centre of the sprite) written by the renderer; seen = frame it was drawn. */
  sx: number; sy: number; seen: number;
  /** How dark it must get (0..1, see `Race.night`) before this driver switches the lights on. */
  lightAt: number;
  /** Inside a fork: which of the two roads the car drives on (-1 left, 1 right). */
  br?: number;
  /** Smoothed lane intent and lateral ice momentum; all NPC weather uses Easy. */
  laneX?: number; lateralV?: number; iceAmt?: number;
  /** Intentional lane changes only; weather drift never changes the signal side. */
  turnDir?: number; turnTime?: number; turnTarget?: number; turnSettle?: number;
}

export interface Controls { steer: number; throttle: number; brake: number }

export interface RaceEvents {
  surface?(kind: 'strip' | 'sand', speedPct: number): void;
  gate?(g: Gate, race: Race): void;
  /** `tumble` = a big roadside crash that flips the car and throws the couple onto the sand. */
  crash?(hard: boolean, car?: Car, tumble?: boolean): void;
  /** During a tumble: the car comes down, then the couple land on the sand. */
  tumbleLand?(what: "car" | "people"): void;
  bump?(car: Car): void;
  closePass?(bonus: number, car: Car): void;
  scrape?(): void;
  timeUp?(): void;
  over?(): void;
  goal?(): void;
  /** The road split and the player picked a side (-1 left, 1 right) leading to stage `node`. */
  fork?(f: Fork, side: number, node: number): void;
  /** Lightning struck: thunder follows after `delay` seconds. */
  thunder?(delay: number, strength: number): void;
  /** The car drove into (true) or out of (false) a tunnel. */
  tunnel?(enter: boolean): void;
  /** The car slid onto (true) or off (false) an icy patch of road. */
  ice?(enter: boolean): void;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: number; size: number; /** puffs swell by this factor over their life */ grow?: number; /** gravity multiplier (default 1; dust floats) */ g?: number }

const CAR_TYPES = [
  "coupe_blue", "coupe_green", "coupe_white", "coupe_yellow", "sports_black", "sports_silver",
  "beetle_yellow", "beetle_teal", "pickup_white", "pickup_brown", "van_orange", "van_blue", "truck_white",
];
const CAR_WEIGHTS = [3, 3, 2, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.2];
const LANE_X = [-0.75, -0.25, 0.25, 0.75];
const PLAYER_HW = 0.145;
const CAR_LEN = 1750;
// tumble crashes: hitting something at the roadside faster than this share of top speed flips the car
const TUMBLE_SPEED = 0.42;
/** Through a split the view turns to look down the road the car is on: how far off the
 *  centre (road half-widths) it fully counts as "on that road", and how fast the view turns (1/s). */
const LOCK_BAND = 0.15;
const LOCK_RATE = 2.6;
const TUMBLE_DUR = 3.8;       // whole sequence, including the fade back onto the road
const T_EJECT = 0.12;         // the couple leave their seats
const T_CAR_LAND = 1.05;      // the car comes down
const T_PEOPLE_LAND = 1.2;    // the couple hit the sand
const FADE_OUT = 0.4, FADE_IN = 0.35;
const LAND_UP = 26;           // the couple land a little further up the beach (clear of the gauges)...
const SIT_S = 0.78;           // ...so they are drawn a bit smaller
const TUMBLE_TRAVEL = PLAYER_Z * 2.1; // the wreck rolls at least this far, so whatever it hit ends up behind the camera
const PLAYER_LIGHTS_AT = 0.3;  // the player's lights come on this far into dusk (see Race.night)

export type RaceState = "countdown" | "race" | "timeup" | "over" | "goal" | "demo";

export class Race {
  readonly track: Track;
  state: RaceState = "countdown";
  position = 0;
  speed = 0;
  playerX = -0.25;
  playerY = 0;
  steer = 0;
  bgHeading = 0;
  timer = 0;
  score = 0;
  stage = 0;
  stageTime = 0;
  stageTimes: number[] = [];
  runTime = 0;
  countdown = 3.6;
  cars: Car[] = [];
  carsBySeg = new Map<number, Car[]>();
  stageBlend = { from: 0, to: 0, t: 0 };
  braking = false;
  offroad = false;
  /** 0..1: how far the wheels are onto the red/white strip at the road's edge (1 = at the grass/sand). */
  edge = 0;
  /** How deep in the sand/earth beside the road (0 = on the road; ~1 = 0.6 road half-widths out). */
  offDepth = 0;
  skid = 0;          // 0..1 slip intensity used by the existing tyre smoke
  /** Earlier audible warning; never feeds tyre-smoke randomness or traffic. */
  tyreSqueal = 0;
  private steerHeld = 0;
  private steerSign = 0;
  private tyreSurface: 'road' | 'strip' | 'sand' = 'road';
  private stripSoundT = 0;
  private sandSoundT = 0;
  /** 0..1: how much of the car is on glazed road right now (eases in and out). */
  iceAmt = 0;
  private iceV = 0;      // sideways velocity the car keeps while the tyres have no grip
  private onIce = false;
  scraping = 0;
  crashT = 0;        // >0 while spinning out after a crash
  crashHard = false;
  /** Seconds into a tumble crash, or -1. */
  tumbleT = -1;
  private tumbleSide = 1;
  private tumbleSpin = 1;
  private tumbleDecel = 0;
  private fadeT = 0;
  shake = 0;
  overT = 0;
  goalT = 0;
  hairT = 0;
  gear = 0;
  rpm = 0;
  throttle = 0;
  events: RaceEvents = {};
  private parts: Particle[] = [];
  private seed = 12345;
  private aiLane = 1;
  private aiThink = 0;
  private aiTrafficCruise = Infinity;
  /** The fork ahead / being driven through (index into track.forks, -1 = none left). */
  forkI = -1;
  /** The road picked at that fork's nose: -1 left, 1 right, 0 = not picked yet. */
  forkSide = 0;
  /**
   * The view through a split: which road it looks down (-1 left, 1 right) and how far it has
   * turned to it (0 = straight down the old road, 1 = that road dead ahead). The car is carried
   * along the same heading, so the road it sees ahead is the road it follows.
   */
  viewSide = 0;
  private viewLock = 0;
  /** Which way the driver AI takes the next forks (-1/1), 0 = whichever lane it is in. */
  aiSide = 0;
  /** Planned AI choices per column (test hook), overriding aiSide. */
  aiPlan: number[] | null = null;
  // weather
  /** Sideways push of a sandstorm gust (road half-widths per second). */
  gust = 0;
  /** Signed longitudinal component; positive is tailwind, -1..1. */
  windForward = 0;
  private gustT = 3;
  private gustDur = 0;
  private gustAngle = Math.PI / 2;
  private windSide = 0;
  private windLong = 0;
  private windSeed = 12345;
  /** Lightning flash brightness (0..1) and where the bolt hit the sky. */
  flash = 0;
  boltX = 160;
  boltSeed = 1;
  private lightningT = 4;
  /** How far the camera is inside a tunnel (0..1, eases in and out): lamps, echo, no weather. */
  tunnelAmt = 0;
  private inTunnel = false;
  private laneChangeSafe(car:Car,target:number):boolean {
    // Moving out of the player's lane is allowed; merging across the player must wait.
    const sameRoad=car.br===undefined || car.br===(this.forkSide||this.viewSide);
    const fromPlayer=car.x-this.playerX,toPlayer=target-this.playerX;
    // Near-aligned cars can leave the current lane despite normal spawn jitter.
    const acrossPlayer=fromPlayer*toPlayer<0 && Math.abs(fromPlayer)>.06;
    const intoPlayer=acrossPlayer || (Math.abs(toPlayer)<car.hw+PLAYER_HW+.06 &&
      Math.abs(toPlayer)<Math.abs(fromPlayer)-.02);
    if(sameRoad && intoPlayer) {
      const dz=car.z-this.playerZ,predicted=dz+(car.speed-this.speed)*1.8;
      if(Math.min(dz,predicted)<CAR_LEN*3 && Math.max(dz,predicted)>-CAR_LEN*2)return false;
    }
    return this.cars.every(o=>{
      if(o===car||(o.br!==undefined&&car.br!==undefined&&o.br!==car.br))return true;
      // Reserve the whole swept path of an intentional lane change.
      const lo = Math.min(car.x, target) - car.hw - .06, hi = Math.max(car.x, target) + car.hw + .06;
      const otherLo = Math.min(o.x, o.targetX) - o.hw - .06;
      const otherHi = Math.max(o.x, o.targetX) + o.hw + .06;
      if(hi < otherLo || lo > otherHi)return true;
      const dz=o.z-car.z,predicted=dz+(o.speed-car.speed)*1.8;
      return Math.min(dz,predicted)>CAR_LEN*4||Math.max(dz,predicted)<-CAR_LEN*3;
    });
  }

  readonly diff: Difficulty;
  /** Which car the player drives: the sprite name prefix ("player", "player_yellow", ...). */
  skin = "player";
  readonly roof = new WeatherRoof();
  private tumbleEnclosed = false;
  /** Roof pose shares the body's dimensions, bottom-centre anchor and light pixels. */
  get visualSkin(): string { return this.skin + this.roof.suffix; }
  private get roofWet(): number { return Math.max(this.weatherAmt("rain"), this.weatherAmt("snow")); }

  constructor(track: Track, demo = false, startStage = 0, diff: Difficulty = NORMAL) {
    this.track = track;
    this.diff = diff;
    if (demo) {
      this.state = "demo";
      const st = track.stages[startStage];
      this.position = (st.startSeg + 40) * SEG_LEN;
      this.speed = MAX_SPEED * 0.7;
      this.stage = startStage;
    } else {
      this.position = track.startSeg * SEG_LEN;
      this.timer = Math.round(track.startTime * diff.clock);
    }
    this.playerY = this.roadY(this.position + PLAYER_Z);
    this.pickFork();
    this.spawnInitial();
    this.updateBlend();
    this.roof.reset(this.roofWet);
  }

  /** The stage being driven (THEMES index). */
  get node(): number { return this.track.path[this.stage]; }
  get theme(): Theme { return THEMES[this.node]; }
  /** The fork ahead (or being driven through). */
  get fork(): Fork | undefined { return this.forkI >= 0 ? this.track.forks[this.forkI] : undefined; }

  /** Point at the first fork the camera has not finished driving through. */
  private pickFork(): void {
    const cam = Math.floor(this.position / SEG_LEN);
    this.forkI = this.track.forks.findIndex((f) => !!f && f.end > cam);
    this.forkSide = 0;
  }

  /** Test hook: what the split is doing right now. */
  forkProbe(): Record<string, number> {
    const f = this.fork;
    const pz = this.playerZ / SEG_LEN;
    const br = this.forkSide || this.viewSide || 1;
    return {
      seg: Math.floor(pz), rel: f ? Math.round(pz - f.start) : -1, x: Math.round(this.playerX * 100) / 100,
      side: this.forkSide, view: this.viewSide, lock: Math.round(this.lockK * 100) / 100,
      kmh: this.kmh, crash: Math.round(this.crashT * 10) / 10, off: this.offroad ? 1 : 0,
      // where the car's road runs 60 segments ahead, relative to under the car (road half-widths, as drawn)
      road: Math.round(((this.laneOff(pz + 60, br) - this.laneOff(pz, br)) / ROAD_W) * 100) / 100,
    };
  }

  /** Split (road half-widths) of the active fork at segment position i (fractional), 0 outside it. */
  private splitAt(i: number): number {
    const f = this.fork;
    if (!f || i < f.start || i >= f.end) return 0;
    return forkSplit((i - f.start) / FORK_LEN) / ROAD_W;
  }

  /**
   * Lateral offset (world units, in the frame the camera uses) of road `br` (-1 left, 1 right,
   * 0 = the old centre line) at segment position i. Past a fork whose side is picked, the chosen
   * road continues alone at its side.
   */
  laneOff(i: number, br: number): number {
    const f = this.fork;
    if (!f || i < f.start) return 0;
    if (i >= f.end) return this.forkSide * FORK_W - this.viewOff(i);
    return br * forkSplit((i - f.start) / FORK_LEN) - this.viewOff(i);
  }

  /** Same, for a segment's near or far edge (keeps a fork's last segment on its own curve). */
  segOff(s: Seg, br: number, far: boolean): number {
    const f = this.fork;
    const i = s.i + (far ? 1 : 0);
    if (f && s.fork === this.forkI && s.fork >= 0) return br * forkSplit((i - f.start) / FORK_LEN) - this.viewOff(i);
    return this.laneOff(i, br);
  }

  /** Split (world units) of the active fork at segment position i: 0 before it, full past its end. */
  private rawSplit(i: number): number {
    const f = this.fork;
    return f ? forkSplit((i - f.start) / FORK_LEN) : 0;
  }

  /** How far the view has turned toward its road (eased 0..1). */
  private get lockK(): number { const v = this.viewLock; return v * v * (3 - 2 * v); }

  /**
   * Sideways shift (world units) of segment position i in the turned view: the road the view
   * looks down is drawn straight ahead of the car, everything else keeps its place beside it.
   * Zero at the car itself.
   */
  private viewOff(i: number): number {
    const k = this.lockK;
    if (!k || !this.viewSide || !this.fork) return 0;
    return k * this.viewSide * (this.rawSplit(i) - this.rawSplit(this.playerZ / SEG_LEN));
  }

  /** How far the turned view looks off the old road's heading (for the sky; px-ish, like bgHeading). */
  get viewTurn(): number {
    const f = this.fork, k = this.lockK;
    if (!f || !k || !this.viewSide) return 0;
    const u = (this.playerZ / SEG_LEN - f.start) / FORK_LEN;
    if (u <= 0 || u >= 1) return 0;
    const slope = (FORK_W * 6 * u * (1 - u)) / (FORK_LEN * SEG_LEN); // sideways per forward
    return k * this.viewSide * slope * SEG_LEN * 0.1;
  }

  /** Turn the view toward the road the car is on (or has taken), never snapping across sides. */
  private updateView(dt: number): void {
    let side: number, target: number;
    if (this.forkSide) { side = this.forkSide; target = 1; }
    else {
      side = this.playerX < 0 ? -1 : 1;
      const a = Math.min(1, Math.abs(this.playerX) / LOCK_BAND);
      target = this.fork ? a * a * (3 - 2 * a) : 0;
    }
    if (this.viewSide !== side) {
      if (this.viewLock > 0) target = 0;
      else this.viewSide = side;
    }
    const step = LOCK_RATE * dt;
    this.viewLock += Math.max(-step, Math.min(step, target - this.viewLock));
  }

  /** Camera position across the road (world units, renderer frame). */
  get camWorldX(): number {
    return (this.forkSide ? this.laneOff(this.playerZ / SEG_LEN, this.forkSide) : 0) + this.playerX * ROAD_W;
  }

  /** A roadside prop's x in the player's frame (road half-widths). */
  propX(p: SprInst, s: Seg): number {
    if (s.fork < 0 || s.fork !== this.forkI) return p.x;
    const o = this.splitAt(s.i);
    const br = p.br ?? 0;
    return p.x + br * o - this.forkSide * o;
  }

  /** A rival's x in the player's frame, or null when it drives on the other road of a fork. */
  carX(c: Car): number | null {
    const f = this.fork;
    if (!f || c.br === undefined) return c.x;
    if (this.forkSide) return c.br === this.forkSide ? c.x : null;
    return c.x + c.br * this.splitAt(c.z / SEG_LEN);
  }

  /** Distance (road half-widths) from the player to the centre of the nearest road. */
  private roadDist(): number { return Math.abs(this.roadSigned()); }

  /** Signed distance (road half-widths) from the centre of the nearest road: positive = to its right. */
  private roadSigned(): number {
    const o = this.forkSide ? 0 : this.splitAt(this.playerZ / SEG_LEN);
    if (!o) return this.playerX;
    const a = this.playerX - o, b = this.playerX + o;
    return Math.abs(a) < Math.abs(b) ? a : b;
  }

  /** How strongly a kind of weather is falling here (0..1, eases across stage changes). */
  weatherAmt(w: Weather): number {
    const b = this.stageBlend;
    const a = (THEMES[b.from].weather ?? "clear") === w ? 1 : 0, z = (THEMES[b.to].weather ?? "clear") === w ? 1 : 0;
    return a + (z - a) * b.t;
  }

  /** NPC weather is sampled at its own road position, including stage transitions. */
  localWeather(z: number): RoadWeather {
    const s = this.track.seg(z), c = colOf(s.theme);
    if (c > 0) {
      const t = Math.max(0, Math.min(1, (s.i - (this.track.themeStart(c) - 1)) / 230));
      if (t < 1) return blendWeather(THEMES[this.track.path[c - 1]], THEMES[s.theme], t * t * (3 - 2 * t));
    }
    return blendWeather(THEMES[s.theme], THEMES[s.theme], 0);
  }

  windAt(z: number, sand = this.localWeather(z).sand): WindVector {
    const k = this.track.seg(z).tunnel ? 0 : sand;
    return { side: this.windSide * k, forward: this.windLong * k };
  }

  /** Shared switch for headlights and rear lights, based on the NPC's own location. */
  carLightsOn(c: Car): boolean {
    const w = this.localWeather(c.z);
    return Math.max(w.rain, w.snow, w.fog, w.sand) >= .15 || w.dark > 0 && w.dark >= c.lightAt;
  }

  /** The sea beside the road (0..1): inland stages have none. */
  get seaAmt(): number {
    const b = this.stageBlend;
    const a = THEMES[b.from].side === "land" ? 0 : 1, z = THEMES[b.to].side === "land" ? 0 : 1;
    return a + (z - a) * b.t;
  }

  /** Test hook: jump to the start of a stage. */
  warp(stage: number, extraSegs = 60): void {
    const st = this.track.stages[Math.max(0, Math.min(STAGE_COUNT - 1, stage))];
    this.position = (st.startSeg + extraSegs) * SEG_LEN;
    this.stage = st.index;
    this.timer = Math.max(this.timer, 60);
    this.cars.length = 0;
    this.playerY = this.roadY(this.playerZ);
    this.viewLock = 0;
    this.viewSide = 0;
    this.pickFork();
    this.spawnInitial();
    this.updateBlend();
    this.roof.reset(this.roofWet);
  }

  private rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  get playerZ(): number { return this.position + PLAYER_Z; }
  get kmh(): number { return Math.round((this.speed / MAX_SPEED) * KMH_AT_MAX); }
  get playerSeg(): Seg { return this.track.seg(this.playerZ); }
  get progress(): number {
    const t = this.track;
    const first = t.stages[0].startSeg, last = t.goalSeg;
    return Math.max(0, Math.min(1, (this.playerZ / SEG_LEN - first) / (last - first)));
  }

  roadY(z: number): number {
    const s = this.track.seg(z);
    const p = (z - s.i * SEG_LEN) / SEG_LEN;
    return s.y1 + (s.y2 - s.y1) * p;
  }

  /** Smooth only eight segments (about 0.09 s at full speed), across crests too. */
  roadGrade(z: number): number {
    const from=Math.max(0,z-4*SEG_LEN),to=Math.min(this.track.length-1,z+4*SEG_LEN);
    return to>from ? (this.roadY(to)-this.roadY(from))/(to-from) : 0;
  }

  // ------------------------------------------------------------- traffic
  private pickCar(): string {
    let tot = 0;
    for (const w of CAR_WEIGHTS) tot += w;
    let k = this.rand() * tot;
    for (let i = 0; i < CAR_TYPES.length; i++) { k -= CAR_WEIGHTS[i]; if (k <= 0) return CAR_TYPES[i]; }
    return CAR_TYPES[0];
  }

  private makeCar(z: number): Car | null {
    const seg = this.track.seg(z);
    if (seg.i >= this.track.goalSeg - 5) return null;
    const th = THEMES[seg.theme];
    const firstLane = npcKeepRight(this.localWeather(z)) ? 1 : 0;
    const lane = firstLane + Math.floor(this.rand() * (4 - firstLane));
    const x = LANE_X[lane] + (this.rand() - 0.5) * 0.08;
    // inside a fork every car keeps to one road (only the picked one once the player chose)
    const f = this.fork;
    const br = f && seg.i >= f.start && seg.i < f.end ? (this.forkSide || (x < 0 ? -1 : 1)) : undefined;
    for (const c of this.cars) if (Math.abs(c.z - z) < CAR_LEN * 2.2 && Math.abs(c.x - x) < 0.4 && c.br === br) return null;
    const sprite = this.pickCar();
    const big = sprite.startsWith("truck");
    const base = MAX_SPEED * (th.carSpeed[0] + this.rand() * (th.carSpeed[1] - th.carSpeed[0])) * (big ? 0.85 : 1);
    const pxW = sprite.startsWith("truck") ? 96 : sprite.startsWith("beetle") ? 60 : sprite.startsWith("pickup") ? 76 : sprite.startsWith("van") ? 74 : 72;
    // every driver switches the lights on at a slightly different moment as dusk falls
    const lightAt = 0.12 + (((Math.sin(z * 0.0137) * 43758.5453) % 1) + 1) % 1 * 0.5;
    return { z, x, speed: base, base, sprite, hw: (pxW * SPR_S) / 2 / ROAD_W, targetX: x, bounce: 0, passed: false, sx: 0, sy: 0, seen: -1, lightAt, br };
  }

  private density(): number { return THEMES[this.playerSeg.theme].traffic * this.diff.traffic; }

  /** Seconds a checkpoint gate gives back on this difficulty. */
  bonusFor(g: Gate): number { return Math.round(g.bonus * this.diff.clock); }

  private spawnInitial(): void {
    const from = this.playerZ + 70 * SEG_LEN;
    const to = this.playerZ + DRAW_DIST * SEG_LEN;
    const n = Math.round(((to - from) / SEG_LEN / 100) * this.density());
    for (let i = 0; i < n * 3 && this.cars.length < n; i++) {
      const c = this.makeCar(from + this.rand() * (to - from));
      if (c) this.cars.push(c);
    }
  }

  private updateTraffic(dt: number): void {
    const pz = this.playerZ;
    const ahead = DRAW_DIST * SEG_LEN;
    // recycle cars that fell far behind or drifted too far ahead
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      if (c.z < pz - 25 * SEG_LEN || c.z > pz + ahead * 1.6) this.cars.splice(i, 1);
    }
    const want = Math.round(((ahead + 25 * SEG_LEN) / SEG_LEN / 100) * this.density());
    let tries = 0;
    while (this.cars.length < want && tries++ < 4) {
      const z = pz + ahead - 20 * SEG_LEN + this.rand() * 50 * SEG_LEN;
      const c = this.makeCar(z);
      if (c) this.cars.push(c);
    }
    const f = this.fork;
    for (const c of this.cars) {
      const seg = this.track.seg(c.z), th = THEMES[seg.theme], w = this.localWeather(c.z);
      const wind = this.windAt(c.z, w.sand), easy = DIFFS[0];
      const grade = gradePhysics(this.roadGrade(c.z));
      const keepRight = npcKeepRight(w);
      const iceHere = seg.ice > 0 && c.x > seg.iceL - .08 && c.x < seg.iceR + .08 ? seg.ice : 0;
      c.iceAmt = (c.iceAmt ?? 0) + (iceHere - (c.iceAmt ?? 0)) * Math.min(1, dt * (iceHere > (c.iceAmt ?? 0) ? 9 : 5));
      const ice = c.iceAmt, iceScale = 1 + (easy.weather - 1) * .5;
      const hazard = Math.max(w.rain, w.snow, w.fog, w.sand, ice, Math.hypot(wind.side, wind.forward));
      // cars driving into a split keep to the road on their side
      if (f && c.br === undefined && c.z >= f.start * SEG_LEN && c.z < f.end * SEG_LEN) c.br = this.forkSide || (c.x < 0 ? -1 : 1);
      const nearFork = !!f && c.z > (f.start - 80) * SEG_LEN && c.z < f.end * SEG_LEN;
      // follow the car ahead in the same lane
      let speed = c.base * npcSpeedFactor(w, ice) * windSpeedFactor(wind.forward) * grade.speedFactor;
      // Brake before a wet/icy bend; NPCs keep their own Easy force level on every difficulty.
      for (let k = 0; k <= 40; k += 8) {
        const aheadSeg = this.track.seg(c.z + k * SEG_LEN);
        const aheadIce = c.targetX > aheadSeg.iceL - .08 && c.targetX < aheadSeg.iceR + .08 ? aheadSeg.ice : 0;
        const factor = weatherBend(easy, w.rain, w.snow, Math.max(ice, aheadIce)) * windBendFactor(wind.forward);
        const force = Math.abs(aheadSeg.curve) * CENTRIFUGAL * easy.cornering * factor;
        if (force > 0) speed = Math.min(speed, MAX_SPEED * Math.sqrt(STEER * .65 / force));
        speed = Math.min(speed, c.base * npcSpeedFactor(w, Math.max(ice, aheadIce)) * windSpeedFactor(wind.forward) * grade.speedFactor);
      }
      for (const o of this.cars) {
        if (o === c) continue;
        const dz = o.z - c.z;
        if (dz > 0 && dz < CAR_LEN * (3 + hazard * 3) && Math.abs(o.x - c.x) < .4 && (o.br === undefined || c.br === undefined || o.br === c.br)) {
          speed = Math.min(speed, o.speed * .98);
          // Closing gaps cannot be consumed while the ice-limited brakes respond.
          c.speed = Math.min(c.speed, Math.max(0, o.speed + (dz - CAR_LEN * 1.6) / Math.max(dt, .001)));
        }
      }
      // occasional lane changes (never across the middle while the road splits)
      if (!nearFork && this.rand() < th.lanesChange * this.diff.lanes * (1 - .8 * hazard) * dt) {
        const lane = LANE_X.reduce((best, lx, i) => (Math.abs(lx - c.targetX) < Math.abs(LANE_X[best] - c.targetX) ? i : best), 0);
        const nl = Math.max(keepRight ? 1 : 0, Math.min(3, lane + (this.rand() < 0.5 ? -1 : 1)));
        if (this.laneChangeSafe(c, LANE_X[nl])) c.targetX = LANE_X[nl];
      }
      if (keepRight && !nearFork && c.targetX < -.5 && this.laneChangeSafe(c, LANE_X[1])) c.targetX = LANE_X[1];
      if (Math.abs(c.targetX - (c.laneX ?? c.x)) > .02 && !this.laneChangeSafe(c, c.targetX)) {
        c.targetX = LANE_X.reduce((best, lane) => Math.abs(lane - c.x) < Math.abs(best - c.x) ? lane : best);
      }
      // Move the intended lane slowly; a separate bounded driver corrects weather drift.
      c.laneX ??= c.x;
      const laneDelta = c.targetX - c.laneX;
      const turnTarget = c.targetX;
      const turnDelta = turnTarget - c.laneX;
      const laneRate = .28 * (1 - .5 * hazard);
      if (Math.abs(turnDelta) > 1e-6) {
        const dir = Math.sign(turnDelta);
        if (c.turnTarget !== turnTarget || c.turnDir !== dir) { c.turnDir = dir; c.turnTime = 0; c.turnTarget = turnTarget; c.turnSettle = 0; }
        c.turnTime = (c.turnTime ?? 0) + dt;
        if (c.turnTime >= .18) c.laneX += dir * Math.min(Math.abs(laneDelta), laneRate * dt);
      } else {
        c.laneX = c.targetX;
        c.turnSettle = (c.turnSettle ?? 0) + dt;
        c.turnTime = (c.turnTime ?? 0) + dt;
        // Keep signalling while the car catches its steering target. Persistent
        // weather drift cannot hold a completed intentional signal forever.
        if (c.turnTarget !== c.targetX || Math.abs(c.x-c.targetX) < .02 || c.turnSettle >= .65) {
          c.turnDir = 0; c.turnTime = 0; c.turnTarget = c.targetX;
        }
      }
      const sp = c.speed / MAX_SPEED;
      const dryPull = sp * sp * seg.curve * CENTRIFUGAL * easy.cornering;
      const steerLimit = STEER * Math.min(1, sp * 2.2);
      const steering = Math.max(-steerLimit, Math.min(steerLimit, dryPull + (c.laneX - c.x) * 4));
      const factor = weatherBend(easy, w.rain, w.snow, ice) * windBendFactor(wind.forward);
      const push = steering - dryPull * factor + wind.side * .46 * easy.wind * Math.min(1, sp * 2.5);
      c.lateralV = (c.lateralV ?? 0) + (push - (c.lateralV ?? 0)) * Math.min(1, dt * (16 * (1 - ice) + 1.4 * ice / iceScale));
      const motion = ice > .02 ? push * (1 - ice) + c.lateralV * ice : push;
      const bound = 1 - c.hw - .03;
      const nextX = c.x + motion * dt;
      c.x = Math.max(-bound, Math.min(bound, nextX));
      if (c.x !== nextX) c.lateralV = 0;
      const speedDelta = (speed - c.speed) * Math.min(1, dt * 2);
      // The automatic driver compensates gravity at cruise, but shares its force limits.
      c.speed += Math.max((BRAKE * (1 - .55 * ice * iceScale) + grade.acceleration) * dt, Math.min((MAX_SPEED * .34 + grade.acceleration) * dt, speedDelta));
      c.speed = Math.max(0, c.speed);
      // The player is a lead vehicle too. Do not let a rear NPC consume the
      // remaining gap while the player brakes, even on an icy road.
      const playerGap = this.playerZ - c.z, playerLaneX = this.carX(c);
      const wasBehind = c.z < this.playerZ - this.speed * dt - CAR_LEN * .4;
      if (wasBehind && playerLaneX !== null && playerGap > 0 && playerGap < CAR_LEN * (3 + hazard * 3) &&
        Math.abs(playerLaneX - this.playerX) < c.hw + PLAYER_HW + .06) {
        c.speed = Math.min(c.speed, Math.max(0, this.speed * .98), Math.max(0, (playerGap - CAR_LEN * 1.6) / Math.max(dt, .001)));
      }
      c.z += c.speed * dt;
      if (c.bounce > 0) c.bounce = Math.max(0, c.bounce - dt * 12);
    }
    // Clear stale keys before inserting current cars, never after filling the map.
    if (this.carsBySeg.size > 400) this.carsBySeg.clear();
    // bucket by segment for the renderer
    for (const arr of this.carsBySeg.values()) arr.length = 0;
    for (const c of this.cars) {
      const i = Math.floor(c.z / SEG_LEN);
      let arr = this.carsBySeg.get(i);
      if (!arr) { arr = []; this.carsBySeg.set(i, arr); }
      arr.push(c);
    }
  }

  // -------------------------------------------------------------- driver AI
  /** Driver AI used by attract mode, the victory lap and the test autopilot. */
  autopilot(dt: number, cruise = 0.86): Controls { return this.ai(dt, cruise); }

  private ai(dt: number, cruiseSpeed = 0.86): Controls {
    this.aiThink -= dt;
    const pz = this.playerZ;
    const f = this.fork;
    const plannedSide = this.forkSide || (f ? this.aiPlan?.[f.col + 1] : 0) || this.aiSide || (this.aiLane < 2 ? -1 : 1);
    // A car farther into a fork has a different road-centre offset. Compare lanes
    // on the intended branch, rather than letting that screen offset hide traffic.
    const laneCarX = (c: Car): number | null => {
      if (!f || c.br === undefined) return this.carX(c);
      if (c.br !== plannedSide) return null;
      return c.x + (this.forkSide ? 0 : plannedSide * this.splitAt(pz / SEG_LEN));
    };
    if (this.aiThink <= 0) {
      this.aiThink = 0.12;
      this.aiTrafficCruise = Infinity;
      // The attract/test driver looks far enough ahead to finish a lane change,
      // and checks approaching rear traffic instead of jumping into its path.
      const gap = (lane:number) => this.cars.reduce((best,c) => {
        const cx=laneCarX(c),dz=c.z-pz;
        return cx!==null&&dz>=0&&Math.abs(cx-LANE_X[lane])<0.4?Math.min(best,dz):best;
      },Infinity);
      const safe = (lane:number) => !this.cars.some(c=>{
        const cx=laneCarX(c),dz=c.z-pz;
        const nextX = cx === null ? null : cx + c.targetX - c.x;
        const crossTime = .45 + Math.abs(LANE_X[lane] - this.playerX) / STEER;
        const crossingSpeed = Math.min(MAX_SPEED * windSpeedFactor(this.windForward), this.speed + MAX_SPEED * .17 * crossTime);
        const predicted = dz + (c.speed - crossingSpeed) * crossTime;
        return cx!==null&&nextX!==null&&Math.min(cx,nextX)-.4<LANE_X[lane]&&Math.max(cx,nextX)+.4>LANE_X[lane]&&
          Math.min(dz,predicted)<CAR_LEN*1.6&&Math.max(dz,predicted)>-CAR_LEN*1.4;
      });
      const currentGap=gap(this.aiLane);
      // With no horn-assisted clearing, plan the pass before reaching slow traffic.
      if (currentGap < 90*SEG_LEN) {
        const currentLane = LANE_X.reduce((best, x, i) => Math.abs(x - this.playerX) < Math.abs(LANE_X[best] - this.playerX) ? i : best, 0);
        const opts = [0,1,2,3].filter(l=>l!==this.aiLane&&gap(l)>currentGap+10*SEG_LEN&&
          [0,1,2,3].every(k=>k===currentLane||k<Math.min(currentLane,l)||k>Math.max(currentLane,l)||safe(k)));
        opts.sort((a,b)=>gap(b)-gap(a));
        if(opts.length)this.aiLane=opts[0];
        else {
          // Let an adjacent parallel car get ahead, then cross behind it into a clear lane.
          for (const c of this.cars) {
            const x = laneCarX(c), dz = c.z - pz;
            if (currentGap < 35 * SEG_LEN && x !== null && dz > -CAR_LEN * 1.4 && dz < 35 * SEG_LEN && Math.abs(x - this.playerX) > .35 && Math.abs(x - this.playerX) < .9)
              this.aiTrafficCruise = Math.min(this.aiTrafficCruise, Math.max(.2, c.speed / MAX_SPEED - .12));
          }
        }
      }
    }
    const seg = this.playerSeg;
    const sp = this.speed / MAX_SPEED;
    let target = LANE_X[this.aiLane];
    // at a split, head for the planned road
    if (f && !this.forkSide && seg.i >= f.start - 160) {
      const side = this.aiPlan?.[f.col + 1] ?? (this.aiSide || (this.aiLane < 2 ? -1 : 1));
      // (the car is carried along its road through the split, so aim at where that road is now)
      target = side * this.splitAt(pz / SEG_LEN) + LANE_X[side < 0 ? Math.min(this.aiLane, 1) : Math.max(this.aiLane, 2)];
    }
    const grip = (ice:number) => this.diff.cornering * weatherBend(this.diff, this.weatherAmt("rain"), this.weatherAmt("snow"), ice) * windBendFactor(this.windForward);
    const steer = Math.max(-1, Math.min(1, (target - this.playerX) * 4 +
      seg.curve * sp * sp * CENTRIFUGAL * grip(this.iceAmt) / STEER - this.gust * this.diff.wind * Math.min(1, sp * 2.5) / (STEER * Math.min(1, sp * 2.2) || 1)));
    let cruise = Math.min(this.aiTrafficCruise, this.state === "goal" ? 0.45 : cruiseSpeed * windSpeedFactor(this.windForward));
    // A capable driver brakes for a wet/icy bend before reaching it. This is
    // only the attract/test AI; player inputs are never assisted.
    for (let k = 0; k <= 44; k += 4) {
      const ahead = this.track.seg(pz + k * SEG_LEN);
      const ice = target > ahead.iceL && target < ahead.iceR ? ahead.ice : 0;
      const force = Math.abs(ahead.curve) * CENTRIFUGAL * grip(Math.max(this.iceAmt, ice));
      if (force > 0) cruise = Math.min(cruise, Math.sqrt(STEER * 0.99 / force));
    }
    for (const car of this.cars) {
      const x = laneCarX(car), dz = car.z - pz;
      const closing = Math.max(0, this.speed - car.speed);
      const iceScale = 1 + (this.diff.weather - 1) * .5;
      const deceleration = -BRAKE * .8 * (1 - .55 * this.iceAmt * iceScale);
      const stopAhead = CAR_LEN * 2 + closing * .2 + closing * closing / (2 * deceleration);
      if (x !== null && dz > 0 && dz < Math.max(28 * SEG_LEN, stopAhead) && Math.abs(x - this.playerX) < car.hw + 0.25)
        cruise = Math.min(cruise, Math.max(0.2, car.speed / MAX_SPEED - 0.04));
    }
    return { steer, throttle: sp < cruise ? 1 : 0, brake: sp > cruise + 0.018 ? 0.8 : 0 };
  }

  // ------------------------------------------------------------- update
  update(dt: number, input: Controls): void {
    dt = Math.min(dt, 1 / 20);
    if (this.tumbleT < 0) this.roof.update(this.roofWet, dt);
    const track = this.track;
    track.step(); // after a re-route, the rest of the road is laid a stage per frame
    let ctl = input;
    if (this.state === "demo" || this.state === "goal") ctl = this.ai(dt);
    if (this.state === "countdown") {
      this.countdown -= dt;
      this.throttle = input.throttle;
      this.rpm += ((input.throttle ? 0.85 : 0.12) - this.rpm) * Math.min(1, dt * 5);
      if (this.countdown <= 0.6) { this.state = "race"; }
      this.updateTraffic(dt);
      this.hairT += dt * 2;
      return;
    }
    if (this.state === "timeup" || this.state === "over") ctl = { steer: input.steer * 0.5, throttle: 0, brake: this.state === "over" ? 1 : 0.3 };
    if (this.crashT > 0) ctl = { steer: 0, throttle: 0, brake: 0 };

    const prevSegI = Math.floor(this.playerZ / SEG_LEN);
    const seg = this.playerSeg;
    const sp = this.speed / MAX_SPEED;

    // steering (needs some speed) and the curve pulling the car outward
    const steerPow = STEER * Math.min(1, sp * 2.2);
    // ice: only the part of the road that is glazed counts, and the tyres take a moment to bite again
    const iceHere = this.crashT <= 0 && seg.ice > 0 && this.playerX > seg.iceL - 0.08 && this.playerX < seg.iceR + 0.08 ? seg.ice : 0;
    this.iceAmt += (iceHere - this.iceAmt) * Math.min(1, dt * (iceHere > this.iceAmt ? 9 : 5));
    const iceScale = 1 + (this.diff.weather - 1) * 0.5;
    const wetBend = weatherBend(this.diff, this.weatherAmt("rain"), this.weatherAmt("snow"), this.iceAmt) * windBendFactor(this.windForward);
    // a wet road lets the car slide out a little more in bends
    const push = ctl.steer * steerPow - sp * sp * seg.curve * CENTRIFUGAL * this.diff.cornering * wetBend;
    this.iceV += (push - this.iceV) * Math.min(1, dt * (16 * (1 - this.iceAmt) + 1.4 * this.iceAmt / iceScale));
    this.playerX += (this.iceAmt > 0.02 ? push * (1 - this.iceAmt) + this.iceV * this.iceAmt : push) * dt;
    if ((this.iceAmt > 0.3) !== this.onIce && this.state !== "demo") { this.onIce = this.iceAmt > 0.3; this.events.ice?.(this.onIce); }
    // sandstorm gusts shove the car sideways
    if (this.state === "race" && this.crashT <= 0) this.playerX += this.gust * this.diff.wind * Math.min(1, sp * 2.5) * dt;
    this.steer += (ctl.steer - this.steer) * Math.min(1, dt * 10);

    // throttle / brake
    this.throttle = ctl.throttle;
    this.braking = ctl.brake > 0.1;
    if (ctl.throttle > 0) this.speed += MAX_SPEED * 0.34 * (1.25 - sp) * ctl.throttle * dt;
    else if (this.braking) this.speed += BRAKE * ctl.brake * (1 - 0.55 * this.iceAmt * iceScale) * dt;
    else this.speed += DECEL * dt;
    if (this.braking && ctl.throttle > 0) this.speed += BRAKE * 0.6 * dt;
    const grade = gradePhysics(this.roadGrade(this.playerZ));
    this.speed += grade.acceleration * dt;

    // the road's edge: the red/white strip drags at the wheels, and the sand or earth beyond it
    // drags harder the deeper the car goes (and caps its top speed lower and lower)
    const dist = this.roadDist();
    this.offroad = dist > 1.12;
    this.edge = this.offroad ? 1 : Math.max(0, Math.min(1, (dist - 0.9) / 0.22));
    this.offDepth = this.offroad ? (dist - 1.12) / 0.6 : 0;
    if (this.edge > 0 && !this.offroad && this.crashT <= 0) {
      this.speed += OFFROAD_DECEL * 0.7 * this.edge * Math.min(1, (this.speed / MAX_SPEED) * 3) * dt;
    }
    if (this.offroad) {
      const d = Math.min(1.6, this.offDepth);
      const limit = OFFROAD_LIMIT * (1 - 0.48 * Math.min(1, d));
      if (this.speed > limit) this.speed += OFFROAD_DECEL * (1 + d * 1.1) * dt;
      else this.speed -= MAX_SPEED * 0.12 * d * dt; // soft ground slows even a crawling car a little
    }

    // walls and rails (in a split: the outer sides of the two roads; the median is open ground)
    this.scraping = Math.max(0, this.scraping - dt);
    const fk = this.fork;
    const inFork = !!fk && seg.i >= fk.start && seg.i < fk.end;
    const o = inFork && !this.forkSide ? this.splitAt(this.playerZ / SEG_LEN) : 0;
    const leftOuter = !inFork || this.forkSide <= 0, rightOuter = !inFork || this.forkSide >= 0;
    const land = THEMES[seg.theme].side === "land";
    if (leftOuter) {
      const landLimit = -o - seg.wallOff + 0.17;
      if (this.playerX < landLimit && seg.wallH > 0 && !seg.soft) { this.playerX = landLimit; this.hitWall(dt); }
      else if (this.playerX < -o - 3.2) { this.playerX = -o - 3.2; this.hitWall(dt); }
    } else if (this.playerX < -3.2) { this.playerX = -3.2; this.hitWall(dt); }
    if (rightOuter) {
      const seaLimit = o + (land ? (seg.wallRH > 0 ? seg.wallROff - 0.17 : 3.2) : seg.rail ? RAIL_X - 0.17 : 1.14 + seg.beach - 0.1);
      if (this.playerX > seaLimit) { this.playerX = seaLimit; this.hitWall(dt); }
    } else if (this.playerX > 3.2) { this.playerX = 3.2; this.hitWall(dt); }

    // the coast road runs out past the goal: roll gently to a stop
    if (this.position > this.track.length - (DRAW_DIST + 30) * SEG_LEN) this.speed -= MAX_SPEED * 0.6 * dt;
    this.speed = Math.max(0, Math.min(MAX_SPEED * windSpeedFactor(this.windForward) * grade.speedFactor, this.speed));
    if (this.crashT > 0) {
      this.crashT -= dt;
      this.speed = Math.max(0, this.speed - (this.tumbleT >= 0 ? this.tumbleDecel : MAX_SPEED * 1.1) * dt);
      if (this.tumbleT >= 0) this.updateTumble(dt);
      if (this.crashT <= 0) {
        this.speed = 0;
        this.playerX = Math.max(-0.75, Math.min(0.75, this.playerX * 0.3));
        // the couple are back in their seats: fade the road back in
        if (this.tumbleT >= 0) { this.tumbleT = -1; this.fadeT = FADE_IN; }
      }
    }
    if (this.fadeT > 0) this.fadeT = Math.max(0, this.fadeT - dt);

    const dz = this.speed * dt;
    const pz0 = this.playerZ / SEG_LEN;
    this.position += dz;
    this.bgHeading += seg.curve * (dz / SEG_LEN) * 0.1;
    // through a split the car keeps to the heading the view looks down (on the road it is on, that
    // is the road itself), so the road ahead on screen is the road the car follows
    this.updateView(dt);
    if (this.fork) {
      const dSplit = this.rawSplit(this.playerZ / SEG_LEN) - this.rawSplit(pz0);
      if (dSplit) this.playerX += ((this.lockK * this.viewSide - this.forkSide) * dSplit) / ROAD_W;
    }
    this.playerY = this.roadY(this.playerZ);

    // tyres: squeal when cornering hard at speed
    const corner = Math.abs(seg.curve) * sp * sp + Math.abs(ctl.steer) * sp * 0.6;
    const driving = this.state === 'race' && this.crashT <= 0 && sp >= .35;
    const steerSign = Math.sign(ctl.steer);
    if (driving && !this.offroad && Math.abs(ctl.steer) >= .55) {
      this.steerHeld = this.steerSign === steerSign ? this.steerHeld + dt : dt;
    } else this.steerHeld = 0;
    this.steerSign = steerSign;
    const heldSqueal = this.steerHeld >= .5 ? Math.min(1, .55 + (this.steerHeld - .5) * .9) : 0;
    const cornerSqueal = corner > 2.2 || (this.braking && sp > .5) ? Math.min(1, corner / 3.5 + (this.braking ? .5 : 0)) : 0;
    this.skid += ((driving ? Math.max(heldSqueal, cornerSqueal) : 0) - this.skid) * Math.min(1, dt * 6);
    if (this.iceAmt > 0.1 && sp > 0.25) this.skid = Math.max(this.skid, this.iceAmt * 0.8 * Math.min(1, Math.abs(this.iceV) / 0.3 + Math.abs(ctl.steer)));
    if (this.offroad) this.skid *= 0.5;
    if (this.crashT > 0 || this.state === 'over' || sp < .02) this.skid = 0;
    // Full lock reaches sand in under half a second. Warn earlier, but preserve
    // the existing skid/smoke RNG so an audio change cannot alter future traffic.
    const steerThreshold = .5 - Math.min(1, Math.max(0, (Math.abs(ctl.steer) - .55) / .45)) * .22;
    const heldWarning = this.steerHeld >= steerThreshold ? Math.min(1, .65 + (this.steerHeld - steerThreshold) * 1.2) : 0;
    this.tyreSqueal += ((driving && !this.offroad ? heldWarning : 0) - this.tyreSqueal) * Math.min(1, dt * 6);
    this.tyreSqueal = Math.max(this.tyreSqueal, this.skid);
    if (this.crashT > 0 || this.state === 'over' || sp < .02) this.tyreSqueal = 0;
    this.stripSoundT = Math.max(0, this.stripSoundT - dt);
    this.sandSoundT = Math.max(0, this.sandSoundT - dt);
    const surface = this.offroad ? 'sand' : this.edge > (this.tyreSurface === 'strip' ? .03 : .08) ? 'strip' : 'road';
    if (surface !== this.tyreSurface && this.state === 'race' && this.crashT <= 0 && sp > .08) {
      if (surface === 'strip' && !this.stripSoundT) { this.events.surface?.('strip', sp); this.stripSoundT = .35; }
      if (surface === 'sand' && !this.sandSoundT) { this.events.surface?.('sand', sp); this.sandSoundT = .35; }
    }
    this.tyreSurface = surface;

    // engine: automatic two-speed box like the arcade original
    if (this.gear === 0 && sp > 0.5) this.gear = 1;
    if (this.gear === 1 && sp < 0.38) this.gear = 0;
    const targetRpm = this.gear === 0 ? 0.25 + sp / 0.5 * 0.7 : 0.45 + (sp - 0.4) / 0.6 * 0.5;
    this.rpm += (targetRpm + (ctl.throttle ? 0.05 : -0.05) - this.rpm) * Math.min(1, dt * 8);

    this.hairT += dt * (1.5 + sp * 9);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);

    // tunnels: the camera's share of being inside, and the moment the car drives in or out
    this.tunnelAmt += ((track.seg(this.position).tunnel ? 1 : 0) - this.tunnelAmt) * Math.min(1, dt * 7);
    const carIn = this.playerSeg.tunnel;
    if (carIn !== this.inTunnel) {
      this.inTunnel = carIn;
      if (this.state !== "demo") this.events.tunnel?.(carIn);
    }

    this.updateFork();
    this.updateWeather(dt);
    this.updateTraffic(dt);
    if (this.state !== "demo") this.collide(dt, sp);
    this.effects(dt, sp);

    // gates
    const curSegI = Math.floor(this.playerZ / SEG_LEN);
    if (this.state !== "demo") {
      for (let i = prevSegI + 1; i <= curSegI; i++) {
        const g = track.segs[i]?.gate;
        if (g) this.passGate(g);
      }
    }

    // clocks
    if (this.state === "race") {
      this.timer -= dt;
      this.stageTime += dt;
      this.runTime += dt;
      this.score += this.kmh * dt * 11 * this.diff.score;
      if (this.timer <= 0) {
        this.timer = 0;
        this.state = "timeup";
        this.events.timeUp?.();
      }
    } else if (this.state === "timeup") {
      if (this.speed < 30) {
        this.overT += dt;
        if (this.overT > 1.2) { this.state = "over"; this.events.over?.(); }
      }
    } else if (this.state === "goal") {
      this.goalT += dt;
    }
    this.updateBlend();
  }

  private hitWall(dt: number): void {
    if (this.speed > MAX_SPEED * 0.15) {
      this.speed -= MAX_SPEED * 0.9 * dt;
      this.scraping = 0.15;
      this.shake = Math.max(this.shake, 0.4);
      this.events.scrape?.();
    }
  }

  private collide(dt: number, sp: number): void {
    if (this.crashT > 0) return;
    const pz = this.playerZ;
    // roadside obstacles (and the sign on the nose of a split)
    if (this.roadDist() > 1.08 || (this.fork && !this.forkSide && this.splitAt(pz / SEG_LEN) > 0.5)) {
      const si = Math.floor(pz / SEG_LEN);
      for (let i = si; i < si + 6; i++) {
        const s = this.track.segs[i];
        if (!s) break;
        for (const p of s.sprites) {
          if (p.hit <= 0 || p.y > 50) continue;
          const px = this.propX(p, s);
          if (Math.abs(px - this.playerX) < p.hit + PLAYER_HW * 0.8) {
            if (sp > 0.18) this.crash(true);
            else { this.speed = 0; this.playerX += this.playerX > px ? 0.05 : -0.05; }
            return;
          }
        }
      }
    }
    // traffic
    for (const c of this.cars) {
      const dz = c.z - pz;
      const cx = this.carX(c);
      if (cx === null) continue;
      if (dz < -CAR_LEN * 0.4 || dz > CAR_LEN) {
        if (!c.passed && dz < -CAR_LEN * 0.4 && dz > -CAR_LEN * 2 && this.state === "race") {
          c.passed = true;
          if (Math.abs(cx - this.playerX) < c.hw + PLAYER_HW + 0.14 && this.speed > c.speed * 1.15) {
            const bonus = Math.round(2000 * this.diff.score);
            this.score += bonus;
            this.events.closePass?.(bonus, c);
          }
        }
        continue;
      }
      if (Math.abs(cx - this.playerX) < (c.hw + PLAYER_HW) * 0.9) {
        if (this.speed > c.speed) {
          const diff = (this.speed - c.speed) / MAX_SPEED;
          c.bounce = 3;
          c.passed = true;
          if (diff > 0.5) {
            this.crash(false, c);
            this.speed = c.speed * 0.4;
          } else {
            this.speed = c.speed * 0.72;
            this.position = c.z - PLAYER_Z - CAR_LEN * 1.02;
            this.playerX += this.playerX > cx ? 0.06 : -0.06;
            this.shake = 0.7;
            this.events.bump?.(c);
          }
          c.speed = Math.min(MAX_SPEED * 0.8, c.speed * 1.08);
        } else if (c.speed > this.speed) {
          // A lateral merge can contact a faster vehicle already alongside.
          // Rear following prevents normal tailgating; this resolves contact
          // from the other closing direction instead of silently ghosting.
          if (dz >= 0) this.position = c.z - PLAYER_Z - CAR_LEN * 1.02;
          else {
            this.position = c.z - PLAYER_Z + CAR_LEN * .42;
            c.speed = this.speed * .72;
          }
          c.passed = true;
          if (c.bounce <= 0) {
            this.shake = .7;
            this.events.bump?.(c);
          }
          c.bounce = 3;
        }
      }
    }
  }

  private crash(hard: boolean, car?: Car): void {
    const sp = this.speed / MAX_SPEED;
    const tumble = hard && !car && sp >= TUMBLE_SPEED && this.state !== "demo";
    this.crashT = tumble ? TUMBLE_DUR : hard ? 2.1 : 1.1;
    this.crashHard = hard;
    this.shake = 1;
    if (tumble) {
      this.tumbleEnclosed = this.roof.position > 0;
      this.tumbleT = 0;
      this.tumbleSpin = sp > 0.8 ? 2 : 1;           // flat out = a double roll
      this.tumbleSide = this.playerX < 0 ? -1 : 1;  // rolls away from the road
      this.tumbleDecel = Math.min(MAX_SPEED * 1.5, (this.speed * this.speed) / (2 * TUMBLE_TRAVEL));
    }
    this.events.crash?.(hard, car, tumble);
    for (let i = 0; i < 26; i++) this.emit(W / 2 + (this.rand() - 0.5) * 60, 165, (this.rand() - 0.5) * 120, -this.rand() * 90 - 20, 0.9, hard ? 0x9a8a7a : 0xb0b0b8, 3);
  }

  private passGate(g: Gate): void {
    if (this.state !== "race" && this.state !== "timeup") return;
    if (g.kind === "start") return;
    if (this.state === "timeup") return;
    if (g.kind === "check") {
      this.timer = Math.min(99, this.timer + this.bonusFor(g));
    } else if (g.kind === "stage") {
      this.stageTimes.push(this.stageTime);
      this.stageTime = 0;
      this.stage = Math.min(STAGE_COUNT - 1, g.stage + 1);
      this.timer = Math.min(99, this.timer + this.bonusFor(g));
    } else if (g.kind === "goal") {
      this.stageTimes.push(this.stageTime);
      this.state = "goal";
      this.goalT = 0;
      this.events.goal?.();
    }
    this.events.gate?.(g, this);
  }

  private updateBlend(): void {
    const s = this.playerSeg;
    const b = this.stageBlend;
    const tr = this.track;
    const c = colOf(s.theme);
    if (c > 0) {
      const boundary = tr.themeStart(c) - 1;
      const t = Math.max(0, Math.min(1, (s.i - boundary) / 230));
      if (t < 1) { b.from = tr.path[c - 1]; b.to = s.theme; b.t = t * t * (3 - 2 * t); return; }
    }
    b.from = b.to = s.theme;
    b.t = 0;
  }

  // ---------------------------------------------------------------- forks
  private updateFork(): void {
    const f = this.fork;
    if (!f) return;
    if (!this.forkSide && this.playerZ >= f.nose * SEG_LEN) {
      // the median starts: whichever side of it the car is on is the road taken
      const o = this.splitAt(this.playerZ / SEG_LEN);
      const side = this.playerX < 0 ? -1 : 1;
      this.forkSide = side;
      this.playerX -= side * o;
      const node = side < 0 ? f.left : f.right;
      this.track.choose(f.col + 1, node);
      for (const c of this.cars) if (c.z >= f.end * SEG_LEN) c.br = undefined;
      this.events.fork?.(f, side, node);
    }
    if (this.forkSide && this.position >= f.end * SEG_LEN) {
      // the split is behind the camera: the chosen road becomes the only road
      const side = this.forkSide;
      this.cars = this.cars.filter((c) => c.br === undefined || c.br === side);
      for (const c of this.cars) c.br = undefined;
      this.pickFork();
    }
  }

  // -------------------------------------------------------------- weather
  private updateWeather(dt: number): void {
    // Independent wind RNG: lane changes and cosmetic particles cannot change a gust.
    const windRand = () => {
      this.windSeed = (this.windSeed * 1103515245 + 12345) & 0x7fffffff;
      return this.windSeed / 0x7fffffff;
    };
    this.gustT -= dt;
    if (this.gustT <= 0) {
      if (this.gustDur > 0) { this.gustDur = 0; this.gustT = 2.4 + windRand() * 3.2; }
      else { this.gustDur = 4 + windRand() * 2; this.gustT = this.gustDur; this.gustAngle = windRand() * Math.PI * 2; }
    }
    const env = this.gustDur > 0 ? Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - this.gustT / this.gustDur))) : 0;
    this.windSide = Math.sin(this.gustAngle) * env;
    this.windLong = Math.cos(this.gustAngle) * env;
    const wind = this.windAt(this.playerZ);
    this.gust = .46 * wind.side;
    this.windForward = wind.forward;
    // thunderstorm: lightning every few seconds, thunder rolls in after it
    const rain = this.weatherAmt("rain");
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (rain > 0.5) {
      this.lightningT -= dt;
      if (this.lightningT <= 0) {
        this.lightningT = 5 + this.rand() * 7;
        this.flash = 1;
        this.boltX = 30 + this.rand() * 260;
        this.boltSeed = Math.floor(this.rand() * 1e6);
        this.events.thunder?.(0.3 + this.rand() * 1.1, 0.6 + this.rand() * 0.4);
      }
    } else this.lightningT = 2.5;
  }

  /** Envelope strength for wind sound and dust, including pure head/tail winds. */
  get gustAmt(): number { return Math.min(1, Math.hypot(this.gust / .46, this.windForward)); }

  // ----------------------------------------------------------- particles
  private emit(x: number, y: number, vx: number, vy: number, life: number, col: number, size: number, grow = 0, g = 1): void {
    if (this.parts.length > 300) return;
    this.parts.push({ x, y, vx, vy, life, max: life, col, size, grow, g });
  }

  private effects(dt: number, sp: number): void {
    const carY = this.carScreenY();
    const cx = this.carScreenX();
    if ((this.offroad || this.edge > 0.25) && sp > 0.08 && this.crashT <= 0) {
      // the rear wheels throw up the ground they run on: a fountain of dust with grit flying out of it
      const th = THEMES[this.playerSeg.theme];
      const sand = th.dust ?? th.sandA;
      const base = [sand & 255, (sand >> 8) & 255, (sand >> 16) & 255];
      const tone = (k: number) => {
        const m = k < 0 ? 0 : 255, a = Math.abs(k);
        const c = base.map((v) => Math.max(0, Math.min(255, Math.round(v + (m - v) * a))));
        return (c[0] << 16) | (c[1] << 8) | c[2];
      };
      const d = Math.min(1.6, this.offDepth);
      const rate = this.offroad ? 210 * sp * (0.7 + 0.7 * Math.min(1, d)) : 55 * sp * this.edge; // puffs per second
      const outer = this.roadSigned() < 0 ? -1 : 1;
      let n = rate * dt;
      while (n > 0 && (n >= 1 || this.rand() < n)) {
        n -= 1;
        const side = this.rand() < 0.68 ? outer : -outer;
        const wx = cx + side * (31 + this.rand() * 7);
        const sc = this.offroad ? 1 : 0.55;
        if (this.rand() < 0.28) {
          // grit: dark flecks that fly high and fast
          this.emit(wx, carY - 3, side * (20 + this.rand() * 80) + (this.rand() - 0.5) * 30, -(50 + this.rand() * 100) * (0.5 + sp) * sc, 0.3 + this.rand() * 0.35, tone(-0.4), 1, 0, 1.4);
        } else {
          // a puff of dust: big, pale against the ground, swelling as it rises and drifts outward
          const big = (this.offroad ? 6 : 3) + ((this.rand() * (this.offroad ? 6 : 3)) | 0);
          this.emit(wx, carY - 4 - this.rand() * 6, side * (14 + this.rand() * 55) * sc, -(22 + this.rand() * 50) * (0.5 + sp) * sc, 0.6 + this.rand() * 0.5, tone(this.rand() < 0.7 ? 0.32 + this.rand() * 0.25 : -0.22), big, 1.1, 0.2);
        }
      }
    }
    if (this.skid > 0.5 && sp > 0.4 && this.rand() < this.skid * 0.9) {
      const side = this.rand() < 0.5 ? -1 : 1;
      this.emit(cx + side * 28, carY - 1, side * 8, -8 - this.rand() * 10, 0.45, 0xd8d8e0, 2);
    }
    if (this.scraping > 0) {
      for (let k = 0; k < 3; k++) {
        const side = this.playerX < 0 ? -1 : 1;
        this.emit(cx + side * 38, carY - 10 - this.rand() * 8, -side * (20 + this.rand() * 60), -30 - this.rand() * 50, 0.3, this.rand() < 0.5 ? 0xffe070 : 0xffffff, 1);
      }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 40 * (p.g ?? 1) * dt;
      if (p.grow) p.vx *= 1 - Math.min(1, 1.6 * dt); // dust clouds slow as they spread
    }
  }

  carScreenX(): number { return W / 2 + this.steer * 5 + (this.crashT > 0 && this.tumbleT < 0 ? Math.sin(this.crashT * 30) * 4 : 0); }

  /** Test hook: put a rival `segs` segments ahead of the player in lane position x, matching speed. */
  spawnAhead(segs: number, x = 0.25): boolean {
    const c = this.makeCar(this.playerZ + segs * SEG_LEN);
    if (!c) return false;
    c.x = c.targetX = x;
    c.speed = c.base = Math.max(this.speed * 0.97, MAX_SPEED * 0.3);
    this.cars.push(c);
    return true;
  }

  /** Test hook: slam into the roadside flat out. */
  forceTumble(): void {
    if (this.crashT > 0 || this.state !== "race") return;
    this.playerX = 1.3;
    this.speed = Math.max(this.speed, MAX_SPEED * 0.9);
    this.crash(true);
  }

  // ------------------------------------------------------------- tumble crash
  private sandCol(): number {
    const th = THEMES[this.playerSeg.theme];
    const sand = th.dust ?? th.sandA;
    return ((sand & 255) << 16) | (((sand >> 8) & 255) << 8) | ((sand >> 16) & 255);
  }

  private tumbleBaseX(): number { return W / 2 + this.steer * 5; }
  private tumbleCarX(): number { return this.tumbleBaseX() + this.tumbleSide * 16 * Math.min(1, this.tumbleT / T_CAR_LAND); }
  // he lands on one side of the car, she on the other, both on the shoulder
  private tumbleDriverX(): number { return Math.round(this.tumbleBaseX() + this.tumbleSide * 16 - 60); }
  private tumbleLadyX(): number { return Math.round(this.tumbleBaseX() + this.tumbleSide * 16 + 60); }

  /** Her head while she sits on the sand after a tumble (null while flying, or no tumble). */
  ladyHead(): { x: number; y: number } | null {
    if (this.tumbleEnclosed || this.tumbleT < T_PEOPLE_LAND) return null;
    return { x: this.tumbleLadyX() + 2, y: this.carScreenY() - LAND_UP - 22 };
  }

  /** Darkness over the road while the couple climb back in after a tumble (0..1). */
  get fade(): number {
    if (this.tumbleT >= 0 && this.crashT < FADE_OUT) return Math.min(1, 1 - Math.max(0, this.crashT) / FADE_OUT);
    return this.fadeT / FADE_IN;
  }

  private updateTumble(dt: number): void {
    const t0 = this.tumbleT;
    this.tumbleT += dt;
    const t = this.tumbleT;
    const gy = this.carScreenY();
    const sand = this.sandCol();
    if (t0 < T_CAR_LAND && t >= T_CAR_LAND) {
      this.shake = 1;
      this.events.tumbleLand?.("car");
      const cx = this.tumbleCarX();
      for (let i = 0; i < 30; i++) {
        this.emit(cx + (this.rand() - 0.5) * 80, gy - 2, (this.rand() - 0.5) * 90, -this.rand() * 60 - 10,
          0.6 + this.rand() * 0.4, this.rand() < 0.65 ? sand : 0xb0a898, 2 + ((this.rand() * 3) | 0));
      }
    }
    if (!this.tumbleEnclosed && t0 < T_PEOPLE_LAND && t >= T_PEOPLE_LAND) {
      this.events.tumbleLand?.("people");
      for (const x of [this.tumbleDriverX(), this.tumbleLadyX()]) {
        for (let i = 0; i < 12; i++) this.emit(x + (this.rand() - 0.5) * 20, gy - LAND_UP - 2, (this.rand() - 0.5) * 44, -this.rand() * 30 - 5, 0.5, sand, 2);
      }
    }
    // smoke curling up from the wreck
    if (t > T_CAR_LAND && t < TUMBLE_DUR - 0.7 && this.rand() < 0.45) {
      const cx = this.tumbleCarX();
      this.emit(cx + (this.rand() - 0.5) * 34, gy - 28 - this.rand() * 6, (this.rand() - 0.5) * 10, -26 - this.rand() * 14,
        0.9, this.rand() < 0.5 ? 0x8a8090 : 0xbab2c4, 3);
    }
  }

  private drawTumble(fb: DrawSurface, bank: SpriteBank, tint: number[]): void {
    const t = this.tumbleT, side = this.tumbleSide;
    const gy = this.carScreenY();
    const opt = { tr: tint[0], tg: tint[1], tb: tint[2] };
    const shadow = (x: number, y: number, w: number, lift: number) => {
      const k = Math.max(0.35, 1 - lift / 70);
      fb.rectA(x - (w * k) / 2, y - 3, w * k, 4, rgb(0x120a1c), 0.42 * k);
    };
    // the couple, thrown clear: who, seat offset, landing x, spin direction
    const people: [string, number, number, number][] = [
      ["driver", -14, this.tumbleDriverX(), -1],
      ["lady", 14, this.tumbleLadyX(), 1],
    ];
    const landY = gy - LAND_UP;
    const sitting = t >= T_PEOPLE_LAND;
    // once they have landed they are further away than the car, so they go behind it
    if (sitting && !this.tumbleEnclosed) {
      const v = t - T_PEOPLE_LAND;
      const hop = v < 0.2 ? Math.round(Math.sin((v / 0.2) * Math.PI) * 3) : 0;
      for (const [who, , landX] of people) {
        // he rubs his sore head now and then; she shakes her fist at him
        const frame = who === "driver"
          ? (v > 0.9 && Math.floor(v * 2) % 2 === 0 ? 1 : 0)
          : (v > 0.35 && v < 2.0 && Math.floor(v * 5) % 2 === 0 ? 1 : 0);
        shadow(landX, landY, 22, 0);
        const spr = bank.get(`crash_${who}_sit_${frame}`);
        // he sits facing right, she faces left: both look back at the car
        if (spr) fb.blit(spr, landX, landY - hop, SIT_S, { ...opt, flip: who === "lady" });
        if (who === "driver") this.dazedStars(fb, landX - 3, landY - 25 - hop, v);
      }
    }
    // the car: one or two barrel rolls through the air, a bounce, then it rocks to rest
    const cx = this.tumbleCarX();
    let lift: number, ang: number;
    if (t < T_CAR_LAND) {
      const u = t / T_CAR_LAND;
      lift = 4 * 40 * u * (1 - u);
      ang = side * Math.PI * 2 * this.tumbleSpin * (u * u * (3 - 2 * u));
    } else {
      const v = t - T_CAR_LAND;
      const b = v / 0.34;
      lift = b < 1 ? 4 * 8 * b * (1 - b) : 0;
      ang = side * Math.sin(v * 13) * 0.14 * Math.max(0, 1 - v / 0.8);
    }
    shadow(cx, gy, 80, lift);
    const sk = this.visualSkin;
    const car = (t < T_EJECT || this.tumbleEnclosed ? bank.get(`${sk}_straight_0`) : bank.get(`${sk}_empty`)) ?? bank.get(`${sk}_straight_0`) ?? bank.get("player_straight_0");
    if (car) fb.blitRot(car, cx, gy - car.h / (car.density ?? 1) / 2 - lift, ang, 1, opt);
    if (this.tumbleEnclosed || t < T_EJECT || sitting) return;
    // in flight: spinning through the air above the car
    const u = (t - T_EJECT) / (T_PEOPLE_LAND - T_EJECT);
    for (const [who, seat, landX, dir] of people) {
      const x0 = this.tumbleBaseX() + seat, y0 = gy - 40;
      const x = x0 + (landX - x0) * u;
      const peak = who === "lady" ? 70 : 58;
      const y = y0 + (landY - 10 - y0) * u - 4 * peak * u * (1 - u);
      shadow(x, gy + (landY - gy) * u, 16, landY - y);
      const spr = bank.get(`crash_${who}_fly`);
      if (spr) fb.blitRot(spr, x, y, dir * u * Math.PI * (who === "lady" ? 3 : 2.5), 1 + (SIT_S - 1) * u, opt);
    }
  }

  private dazedStars(fb: DrawSurface, x: number, y: number, v: number): void {
    for (let i = 0; i < 3; i++) {
      const a = v * 5 + (i * Math.PI * 2) / 3;
      const sx = Math.round(x + Math.cos(a) * 8), sy = Math.round(y + Math.sin(a) * 2.5);
      const c = rgb(Math.sin(a) > 0 ? 0xfff27a : 0xffb030);
      fb.pset(sx, sy, rgb(0xffffff));
      fb.pset(sx - 1, sy, c); fb.pset(sx + 1, sy, c); fb.pset(sx, sy - 1, c); fb.pset(sx, sy + 1, c);
    }
  }

  private drawParts(fb: DrawSurface): void {
    for (const p of this.parts) {
      const a = Math.min(1, p.life / p.max * 1.5);
      const c = rgb(p.col);
      if (p.size <= 1) fb.pset(p.x, p.y, c);
      else {
        // puffs swell and thin out as they drift
        const sz = p.size * (1 + (p.grow ?? 0) * (1 - p.life / p.max));
        fb.rectA(p.x - sz / 2, p.y - sz / 2, sz, sz, c, a * (p.grow ? 0.7 : 0.8));
      }
    }
  }
  carScreenY(): number { return HORIZON + (CAM_H * FOCAL) / PLAYER_Z; }

  /** How dark it is: 0 by day, 1 at Twilight Bay (the last stage); storms, fog and dust dim the light too. */
  get night(): number {
    const b = this.stageBlend;
    const a = THEMES[b.from].dark ?? 0, z = THEMES[b.to].dark ?? 0;
    return a + (z - a) * b.t;
  }

  /** The player's headlights and taillights are on. */
  get lightsOn(): boolean { return this.night >= PLAYER_LIGHTS_AT; }

  // ----------------------------------------------------------- the hero car
  drawPlayer(fb: DrawSurface, bank: SpriteBank, tint: number[]): void {
    if (this.tumbleT >= 0) { this.drawTumble(fb, bank, tint); this.drawParts(fb); return; }
    const sp = this.speed / MAX_SPEED;
    let x = this.carScreenX();
    let y = this.carScreenY();
    if ((this.offroad || this.edge > 0.2) && sp > 0.05) y -= this.rand() < 0.5 ? 1 : 0;
    else if (sp > 0.6 && Math.floor(this.hairT * 1.3) % 7 === 0) y -= 1;
    if (this.shake > 0) x += Math.round((this.rand() - 0.5) * 4 * this.shake);
    let dir = this.steer < -0.3 ? "left" : this.steer > 0.3 ? "right" : "straight";
    let flip = false;
    if (this.crashT > 0) {
      const ph = Math.floor(this.crashT * (this.crashHard ? 14 : 10)) % 4;
      dir = ph === 0 ? "straight" : ph === 1 ? "right" : ph === 2 ? "straight" : "left";
      flip = ph === 2;
      if (this.crashHard) y -= Math.abs(Math.sin(this.crashT * 3)) * 6;
    }
    const frame = Math.floor(this.hairT) & 1;
    const sk = bank.has(`${this.visualSkin}_straight_0`) ? this.visualSkin : bank.has(`${this.skin}_straight_0`) ? this.skin : "player";
    const name = `${sk}_${dir}_${frame}`;
    const spr: Spr | undefined = bank.get(name) ?? bank.get(`${sk}_straight_0`);
    // soft shadow under the car
    fb.rectA(x - 41, this.carScreenY() - 4, 82, 5, rgb(0x120a1c), 0.45);
    fb.rectA(x - 37, this.carScreenY() - 2, 74, 3, rgb(0x120a1c), 0.35);
    if (spr) {
      fb.blit(spr, x, y, 1, { tr: tint[0], tg: tint[1], tb: tint[2], flip });
      const braking = this.braking && this.crashT <= 0;
      // after dark the taillights glow, and the brake lights glow brighter still
      const lights = this.lightsOn ? carLights(bank, bank.has(name) ? name : `${sk}_straight_0`) : null;
      if (lights) fb.blit(lights.tail, x, y, 1, { flip });
      if (braking) {
        const b = bank.get(`${sk}_brake_${dir}`);
        if (b) fb.blit(b, x, y, 1, { flip });
      }
      if (lights) fb.blitAdd(lights.glow, x, y, 1, braking ? 1.7 : 0.9, flip);
    } else {
      fb.rect(x - 40, y - 40, 80, 40, rgb(0xd03028));
      fb.rect(x - 30, y - 30, 60, 6, rgb(0x301010));
    }
    this.drawParts(fb);
  }
}

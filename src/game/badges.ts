// Road-trip badges: what they are, the pixel medals that show them, the
// "Badge earned!" pop-up, and the (failure-proof) reporting to the player's
// account. Plain badges are unlocked directly; counted ones report a total at a
// checkpoint and the server decides when the target is reached.
// Every badge exists once per difficulty: Easy (bronze), Normal (silver), Hard (gold).
import { FB, W, Col, rgb, mix } from "../core/fb";
import { drawText, textWidth } from "../core/font";
import { t, track, listBadges, unlockBadge, badgeProgress } from "../platform/tesana";
import { fit } from "./ui";
import { goalCount, type GoalProgress } from './goal-progress';

export type Tier = "easy" | "normal" | "hard";
export const TIERS: Tier[] = ["easy", "normal", "hard"];

/** One kind of badge (earned separately on each difficulty). */
export interface BadgeType {
  base: string;
  /** 11x11 pixel icon, '#' = drawn. */
  icon: string[];
  /** Medal face colour. */
  col: Col;
  stat?: string;
  target?: number;
}

/** Which medal rim a badge wears: a difficulty's metal, or "goal" for the one-off goal badges. */
export type Rim = Tier | "goal";

/** A badge: the thing that is actually unlocked (one per difficulty, or a tier-less goal badge). */
export interface BadgeDef extends BadgeType { id: string; tier: Rim }

const CLEAN = rgb(0x2aa87a), NEAR = rgb(0x2a7ad8), COAST = rgb(0xe8602a), LOVE = rgb(0xe0408a);

const I = {
  road: ["....#.#....", "....#.#....", "...#...#...", "...#.#.#...", "..#.....#..", "..#..#..#..", ".#.......#.", ".#...#...#.", "#.........#", "#....#....#", "#.........#"],
  shield: [".#########.", ".#.......#.", ".#......##.", ".#.....#.#.", ".##...#..#.", ".#.#.#...#.", ".#..#....#.", "..#.....#..", "...#...#...", "....#.#....", ".....#....."],
  wheel: ["...#####...", ".##.....##.", ".#.......#.", "#.........#", "####...####", "#...###...#", "#...###...#", ".#...#...#.", ".##..#..##.", "...#####...", "..........."],
  sparkle: ["....#......", "....#....#.", "...###..###", "..#####..#.", "#########..", "..#####....", "...###...#.", "....#...###", "....#....#.", "...........", "..........."],
  speed: ["...........", "....#######", "...........", "##########.", "...........", "..#########", "...........", "#######....", "...........", "...######..", "..........."],
  bolt: ["......####.", ".....####..", "....####...", "...####....", "..########.", "......###..", ".....###...", "....###....", "...##......", "..#........", "..........."],
  ghost: ["...#####...", "..#######..", ".#########.", ".##.###.##.", ".##.###.##.", ".#########.", ".#########.", ".#########.", ".#########.", ".#########.", ".#.#.#.#.#."],
  forward: ["...........", "#....#.....", "##...##....", "###..###...", "####.####..", "##########.", "####.####..", "###..###...", "##...##....", "#....#.....", "..........."],
  moon: ["...####....", "..###......", ".###.....#.", ".##.....###", "##.......#.", "##.........", "##.........", "###......#.", ".###...###.", "..#######..", "...####...."],
  flag: ["###..##..##", "###..##..##", "#..##..##..", "#..##..##..", "###..##..##", "###..##..##", "#..........", "#..........", "#..........", "#..........", "#.........."],
  palm: [".###...###.", "#...#.#...#", ".....#.....", "...##.##...", "..#..#..#..", ".#...#...#.", ".....#.....", "......#....", "......#....", "......#....", "....#####.."],
  flame: [".....#.....", ".....##....", "....###....", "...####..#.", "..#####.##.", ".#########.", ".####.####.", ".###...###.", ".###...###.", "..##...##..", "...#####..."],
  heart: ["...........", ".###...###.", "#####.#####", "###########", "###########", ".#########.", "..#######..", "...#####...", "....###....", ".....#.....", "..........."],
  watch: ["....###....", ".....#.....", "...#####...", "..#.....#..", ".#...#...#.", ".#...#...#.", ".#...##..#.", ".#.......#.", "..#.....#..", "...#####...", "..........."],
  fork: ["#.........#", "##.......##", ".##.....##.", "..##...##..", "...##.##...", "....###....", ".....#.....", ".....#.....", ".....#.....", ".....#.....", "....###...."],
};

const GOAL_ICONS = {
  // A: a night skyline with an aerial
  city: ["....#......", "....#...#..", "...###..#..", "...###.###.", "##.###.###.", "##.#.#.#.#.", "##.###.###.", "##.#.#.#.#.", "##.###.###.", "##########.", "..........."],
  // B: a sheriff's star
  sheriff: [".....#.....", ".....#.....", "....###....", "###########", ".#########.", "..#######..", "...#####...", "..#######..", "..###.###..", ".###...###.", ".#.......#."],
  // C: a peak above the lake
  lake: ["...........", ".....#.....", "....###..#.", "...########", "..#########", ".##########", "...........", "##..##..##.", ".##..##..##", "...........", "#..##..##.."],
  // D: a domed observatory under the stars
  dome: ["#.....#..#.", "...#.......", "....###....", "..#######..", ".#########.", ".####.####.", "###########", "#####.#####", "###########", "...........", "..........."],
  // E: the sun going down over the water
  sunset: ["#....#....#", ".#...#...#.", "..#.###.#..", "....###....", "..#######..", ".#########.", "...........", "##..##..##.", "..##..##..#", "...........", "..........."],
  // all five: a trophy
  trophy: ["#.#######.#", "#.#######.#", "#.#######.#", ".#.#####.#.", "..#######..", "...#####...", "....###....", ".....#.....", ".....#.....", "...#####...", "..#######.."],
};

/** The goal badges: reaching each of the five goals (one-off, whichever difficulty), and all of them.
 *  Same ids and order as the last six entries of assets/ui/achievements.json. */
export const GOAL_BASES = ["goal-a", "goal-b", "goal-c", "goal-d", "goal-e"];
const GOAL_TYPES: BadgeType[] = [
  { base: "goal-a", icon: GOAL_ICONS.city, col: rgb(0xd83ab8) },
  { base: "goal-b", icon: GOAL_ICONS.sheriff, col: rgb(0xd08a1c) },
  { base: "goal-c", icon: GOAL_ICONS.lake, col: rgb(0x2a9ec0) },
  { base: "goal-d", icon: GOAL_ICONS.dome, col: rgb(0x5a4ad0) },
  { base: "goal-e", icon: GOAL_ICONS.sunset, col: rgb(0xe8583a) },
  { base: "goal-all", icon: GOAL_ICONS.trophy, col: rgb(0xc89a10) },
];

/** The badge kinds, in the order the badges screen shows them. */
export const BADGE_TYPES: BadgeType[] = [
  { base: "stage-clear", icon: I.road, col: COAST },
  { base: "clean-stage", icon: I.shield, col: CLEAN },
  { base: "clean-stages-10", icon: I.wheel, col: CLEAN, stat: "clean-stages", target: 10 },
  { base: "clean-coast", icon: I.sparkle, col: CLEAN },
  { base: "near-miss-1", icon: I.speed, col: NEAR, stat: "near-misses", target: 1 },
  { base: "near-miss-50", icon: I.bolt, col: NEAR, stat: "near-misses", target: 50 },
  { base: "near-miss-250", icon: I.ghost, col: NEAR, stat: "near-misses", target: 250 },
  { base: "near-miss-run", icon: I.forward, col: NEAR },
  { base: "reach-twilight", icon: I.moon, col: rgb(0x6a4ac8) },
  { base: "coast-complete", icon: I.flag, col: COAST },
  { base: "coast-finishes-5", icon: I.palm, col: COAST, stat: "coast-finishes", target: 5 },
  { base: "coast-love", icon: I.heart, col: LOVE },
  { base: "photo-finish", icon: I.watch, col: rgb(0xc89a10) },
  { base: "every-road", icon: I.fork, col: rgb(0x2a9ab8) },
  { base: "all-goals", icon: GOAL_ICONS.trophy, col: rgb(0xc89a10), target: 5 },
];

/** Badge id for a kind on a difficulty. The original badges are the Normal set (their ids never
 *  change, so nothing already earned is lost); "Finish on Hard" already existed as coast-hard. */
export function badgeId(base: string, tier: Tier): string {
  if (tier === "normal") return base;
  if (tier === "hard" && base === "coast-complete") return "coast-hard";
  return `${base}-${tier}`;
}

/** Counter name for a difficulty (Normal keeps the original counters). */
export function statId(stat: string, tier: Tier): string { return tier === "normal" ? stat : `${stat}-${tier}`; }

/** Same ids, order, stats and targets as assets/ui/achievements.json. */
export const BADGES: BadgeDef[] = [
  ...TIERS.flatMap((tier) => BADGE_TYPES.map((b): BadgeDef => ({
    ...b, id: badgeId(b.base, tier), tier, stat: b.stat ? statId(b.stat, tier) : undefined,
  }))),
  ...GOAL_TYPES.map((b): BadgeDef => ({ ...b, id: b.base, tier: "goal" })),
];
/** Badges per row on the badges screen: one row per difficulty, then the goals. */
export const BADGE_ROWS: number[] = [...TIERS.map(() => BADGE_TYPES.length), GOAL_TYPES.length];

export function badgeDef(id: string): BadgeDef | undefined { return BADGES.find((b) => b.id === id); }

/** Near misses in one run for the "Slipstream Show" badge. */
export const NEAR_MISS_RUN = 20;

export function badgeName(def: BadgeType): string { return t(`badge.${def.base.replace(/-/g, "_")}`); }
export function badgeDesc(def: BadgeType): string { return t(`badge.${def.base.replace(/-/g, "_")}_desc`); }
export function tierName(tier: Rim): string { return tier === "goal" ? t("badge.tier_goal") : t(`diff.${tier}`); }
/** "Name (Easy)" for a difficulty badge, plain "Name" for a goal badge. */
export function badgeTitle(def: BadgeDef): string { return def.tier === "goal" ? badgeName(def) : `${badgeName(def)} (${tierName(def.tier)})`; }

const INK = rgb(0x1a0e26);
const GOLD = rgb(0xffd040);
/** Rim colours (base, highlight, shade): bronze for Easy, silver for Normal, gold for Hard. */
export const TIER_RIM: Record<Rim, [Col, Col, Col]> = {
  goal: [rgb(0xc070ff), rgb(0xf4d8ff), rgb(0x6a2aa8)],
  easy: [rgb(0xd88a48), rgb(0xffc890), rgb(0x8e4a22)],
  normal: [rgb(0xc8cad8), rgb(0xffffff), rgb(0x7e809e)],
  hard: [rgb(0xffd040), rgb(0xfff0a0), rgb(0xc07a18)],
};
const LOCK_RING = rgb(0x4a3a62), LOCK_FACE = rgb(0x24163a), LOCK_ICON = rgb(0x5e4e7a);

/** A round medal centred at (cx, cy). Earned medals get their tier's rim and colour; locked ones are dark. */
export function drawMedal(fb: FB, cx: number, cy: number, def: BadgeType, earned: boolean, r = 11, glint = -1, tier: Rim = "hard"): void {
  const r2 = r * r, inner = (r - 2) * (r - 2);
  const [RIM, RIM_HI, RIM_LO] = TIER_RIM[tier];
  // locked medals keep a faint hint of their tier's metal so each difficulty's row reads at a glance
  const lockRing = mix(LOCK_RING, RIM_LO, 0.4);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = dx * dx + dy * dy;
      if (d > r2 + r * 0.6) continue;
      let c: Col;
      if (d > r2 - r * 1.2) c = INK;
      else if (d > inner) c = earned ? (dy < -dx * 0.3 ? RIM_HI : dy > r * 0.35 ? RIM_LO : RIM) : lockRing;
      else c = earned ? mix(def.col, rgb(0x000000), Math.max(0, dy / r) * 0.35) : LOCK_FACE;
      fb.pset(cx + dx, cy + dy, c);
    }
  }
  const ico = earned ? rgb(0xfffaf0) : LOCK_ICON;
  if (r < 7) {
    // too small for the icon: a little sparkle instead
    fb.rect(cx, cy - 2, 1, 5, ico);
    fb.rect(cx - 2, cy, 5, 1, ico);
    return;
  }
  const ox = cx - 5, oy = cy - 5;
  const shade = earned ? mix(def.col, rgb(0x000000), 0.55) : -1;
  for (let y = 0; y < 11; y++) {
    const row = def.icon[y];
    for (let x = 0; x < 11; x++) {
      if (row[x] !== "#") continue;
      if (shade !== -1) fb.pset(ox + x + 1, oy + y + 1, shade);
    }
  }
  for (let y = 0; y < 11; y++) {
    const row = def.icon[y];
    for (let x = 0; x < 11; x++) if (row[x] === "#") fb.pset(ox + x, oy + y, ico);
  }
  // a sweep of light across a freshly earned medal
  if (earned && glint >= 0 && glint < 1) {
    const gx = Math.round(-r + glint * r * 2);
    for (let dy = -r + 2; dy <= r - 2; dy++) {
      const x = gx - Math.round(dy * 0.5);
      for (const k of [0, 1]) if ((x + k) * (x + k) + dy * dy < inner) fb.rectA(cx + x + k, cy + dy, 1, 1, rgb(0xffffff), 0.55);
    }
  }
}

interface Toast { id: string; t: number; dur: number }

/** Keeps what the player has earned, reports new progress and queues the pop-ups. */
export class Badges {
  /** Off while test hooks drive the car (a bot run must never earn the player anything). */
  enabled = true;
  /** "ok" once the account's badges were read; "failed" when they could not be. */
  state: "idle" | "loading" | "ok" | "failed" = "idle";
  private earned = new Set<string>();
  private pending = new Set<string>();
  private counts = new Map<string, number>();
  private toasts: Toast[] = [];
  /** Called the moment a pop-up starts (for the chime). */
  onShow: ((id: string) => void) | null = null;
  /** Distinct goals are counted locally, without additive server statistics. */
  goalProgress: (() => GoalProgress) | null = null;
  onChange: (() => void) | null = null;

  has(id: string): boolean { return this.earned.has(id); }
  get count(): number { return BADGES.filter((b) => this.earned.has(b.id)).length; }
  /** Progress towards a counted badge (capped at its target). */
  progressOf(def: BadgeDef): number {
    if (def.base === 'all-goals' && def.tier !== 'goal') {
      return this.has(def.id) ? 5 : this.goalProgress ? goalCount(this.goalProgress(), def.tier) : 0;
    }
    return def.stat && def.target ? Math.min(def.target, this.counts.get(def.stat) ?? 0) : 0;
  }

  /** Read the account's badges (for the badges screen, and so earned ones aren't re-sent). */
  refresh(): void {
    if (this.state === "loading") return;
    this.state = "loading";
    listBadges().then((items) => {
      if (!items || !items.length) { this.state = "failed"; return; }
      for (const a of items) {
        if (a.unlocked) this.earned.add(a.id);
        const def = badgeDef(a.id);
        if (def?.stat && typeof a.progress === "number") this.counts.set(def.stat, Math.max(this.counts.get(def.stat) ?? 0, a.progress));
      }
      this.state = "ok";
      this.onChange?.();
    });
  }

  unlock(id: string): void {
    if (!this.enabled || this.earned.has(id) || this.pending.has(id)) return;
    this.pending.add(id);
    unlockBadge(id).then((r) => {
      this.pending.delete(id);
      if (r === "new") this.earn(id);
      else if (r === "had") { this.earned.add(id); this.onChange?.(); }
    });
  }

  /** Add `n` to a counter, once per checkpoint (never per event). */
  progress(stat: string, n: number): void {
    if (!this.enabled || n <= 0) return;
    const watchers = BADGES.filter((b) => b.stat === stat);
    if (watchers.length && watchers.every((b) => this.earned.has(b.id))) return; // nothing left to win
    badgeProgress(stat, n).then((r) => {
      if (!r) return;
      if (r.value !== null) this.counts.set(stat, r.value);
      for (const id of r.unlocked) this.earn(id);
    });
  }

  private earn(id: string): void {
    if (this.earned.has(id) || !badgeDef(id)) return;
    this.earned.add(id);
    this.onChange?.();
    this.toasts.push({ id, t: 0, dur: TOAST_DUR });
    track.event("badge_earned", { name: id });
  }

  /** Advance the pop-up queue; `free` is false while something more important owns the screen. */
  update(dt: number, free: boolean): void {
    const h = this.toasts[0];
    if (!h) return;
    if (h.t === 0 && !free) return;
    if (h.t === 0) { this.onShow?.(h.id); h.dur = this.toasts.length > 1 ? TOAST_DUR - 0.8 : TOAST_DUR; }
    h.t += dt;
    if (h.t > h.dur) this.toasts.shift();
  }

  /** "Badge earned!" pop-up sliding down to `y` (only when it is showing). */
  drawToast(fb: FB, y: number): void {
    const h = this.toasts[0];
    if (!h || h.t === 0) return;
    const def = badgeDef(h.id)!;
    const head = t("badge.earned"), name = badgeTitle(def);
    const rim = TIER_RIM[def.tier][0];
    const tw = Math.min(W - 50, Math.max(textWidth(head), textWidth(name)));
    const w = tw + 34, hgt = 25;
    const x = Math.round(W / 2 - w / 2);
    const k = h.t < 0.25 ? h.t / 0.25 : h.t > h.dur - 0.3 ? Math.max(0, (h.dur - h.t) / 0.3) : 1;
    const yy = Math.round(y - (1 - k) * (y + hgt + 2));
    fb.rect(x - 1, yy - 1, w + 2, hgt + 2, INK);
    fb.rectA(x, yy, w, hgt, rgb(0x2a1440), 0.94);
    fb.frame(x, yy, w, hgt, rim);
    fb.rect(x + 1, yy + hgt - 2, w - 2, 1, def.col);
    drawMedal(fb, x + 13, yy + 12, def, true, 10, (h.t - 0.3) / 0.6, def.tier);
    drawText(fb, fit(head, tw), x + 27, yy + 4, def.tier === "hard" ? GOLD : rim, { outline: INK });
    drawText(fb, fit(name, tw), x + 27, yy + 14, rgb(0xffffff), { outline: INK });
  }
}

const TOAST_DUR = 3.4;

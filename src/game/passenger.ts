import type { DrawSurface } from "../core/draw-surface";
// The blonde passenger reacts to your driving with speech bubbles: sweet
// lines and floating hearts when you drive well, frightened ones when you hit
// something.
import { W, Col, rgb } from "../core/fb";
import { drawText, textWidth } from "../core/font";
import { t } from "../platform/services";

export type Mood = "love" | "scared" | "hurry" | "sad";

const LINES: Record<Mood, string[]> = {
  love: ["pass.love1", "pass.love2", "pass.love3", "pass.love4", "pass.love5", "pass.love6"],
  scared: ["pass.scared1", "pass.scared2", "pass.scared3", "pass.scared4", "pass.scared5"],
  hurry: ["pass.hurry"],
  sad: ["pass.sad"],
};

const HEART = [".#.#.", "#####", "#####", ".###.", "..#.."];
const MOOD_KEYS = ["mood.terrified", "mood.nervous", "mood.happy", "mood.love"];
const MOOD_COLS = [rgb(0x5aa8ff), rgb(0xffd040), rgb(0x7cf06a), rgb(0xff5a9a)];

interface Heart { x: number; y: number; vx: number; life: number }

const INK = rgb(0x2a1238);
const PAPER = rgb(0xfff8f0);
const PINK = rgb(0xff5a9a);
const PINK2 = rgb(0xff9ac4);
const BLUE = rgb(0x5aa8ff);
const RED = rgb(0xe8303a);

export class Passenger {
  private id = "";
  private talk: Mood = "love";
  private t = 0;
  private dur = 0;
  private cool = 0;
  private hearts: Heart[] = [];
  private last: Record<string, string> = {};
  /** Called with the mood whenever she starts a new line (for her voice blip). */
  onSpeak: ((m: Mood) => void) | null = null;

  /** Say something. `force` interrupts whatever she is saying. */
  say(mood: Mood, force = false, lineId?: string): void {
    if (!force && (this.cool > 0 || this.t < this.dur)) return;
    const pool = LINES[mood];
    let id = lineId ?? pool[Math.floor(Math.random() * pool.length)];
    if (!lineId && pool.length > 1 && id === this.last[mood]) id = pool[(pool.indexOf(id) + 1) % pool.length];
    this.last[mood] = id;
    this.id = id;
    this.talk = mood;
    this.t = 0;
    this.dur = mood === "love" ? 2.0 : 1.6;
    this.cool = mood === "scared" ? 1.2 : 2.5;
    if (mood === "love") this.burst(4);
    this.onSpeak?.(mood);
  }

  burst(n: number): void {
    for (let i = 0; i < n; i++) this.hearts.push({ x: (Math.random() - 0.5) * 10, y: 0, vx: (Math.random() - 0.5) * 14, life: 1.1 + Math.random() * 0.5 });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.t >= this.dur) this.cool = Math.max(0, this.cool - dt);
    for (const h of this.hearts) { h.life -= dt; h.y -= 18 * dt; h.x += h.vx * dt; }
    this.hearts = this.hearts.filter((h) => h.life > 0);
  }

  get speaking(): boolean { return this.t < this.dur; }

  // ------------------------------------------------------------ mood meter
  /** 0..100: terrified < 30 ≤ nervous < 55 ≤ happy < 80 ≤ in love. */
  mood = 65;
  private shown = 65;
  private flash = 0;
  private flashDir = 0;
  /** Called when her mood crosses into a new level (0 terrified … 3 in love). */
  onLevel: ((level: number, prev: number) => void) | null = null;

  get level(): number { return this.mood >= 80 ? 3 : this.mood >= 55 ? 2 : this.mood >= 30 ? 1 : 0; }
  get levelKey(): string { return MOOD_KEYS[this.level]; }
  get levelCol(): Col { return MOOD_COLS[this.level]; }

  /** Nudge her mood (positive = happier). Small continuous changes don't flash the meter. */
  feel(delta: number): void {
    const prev = this.level;
    this.mood = Math.max(0, Math.min(100, this.mood + delta));
    if (Math.abs(delta) >= 2) { this.flash = 0.7; this.flashDir = Math.sign(delta); }
    const lv = this.level;
    if (lv !== prev) this.onLevel?.(lv, prev);
  }

  /** Points for keeping her happy: `share` 1 = the finish (up to 500,000), 0.2 = a stage clear. */
  bonus(scoreMul: number, share: number): number {
    return Math.round(((this.mood / 100) * 500000 * scoreMul * share) / 10) * 10;
  }

  /** HUD meter: her face with a bar to its left, right-aligned at (right, y). */
  drawMeter(fb: DrawSurface, right: number, y: number): void {
    this.shown += (this.mood - this.shown) * 0.12;
    const lv = this.mood >= 80 ? 3 : this.mood >= 55 ? 2 : this.mood >= 30 ? 1 : 0;
    const shake = this.flash > 0.35 && this.flashDir < 0 ? (Math.floor(this.flash * 40) % 2 ? 1 : -1) : 0;
    const fx = right - 11 + shake;
    face(fb, fx, y, lv, this.flash > 0 && this.flashDir > 0);
    const bw = 44, bx = right - 15 - bw, by = y + 3;
    fb.rect(bx - 1, by - 1, bw + 2, 7, INK);
    fb.rect(bx, by, bw, 5, rgb(0x3a2a50));
    const fill = Math.round((this.shown / 100) * bw);
    const col = this.flash > 0.35 && this.flashDir < 0 && Math.floor(this.flash * 20) % 2 ? RED : MOOD_COLS[lv];
    fb.rect(bx, by, fill, 5, col);
    fb.rect(bx, by, fill, 1, rgb(0xffffff));
    // level notches
    for (const n of [30, 55, 80]) fb.rect(bx + Math.round((n / 100) * bw), by, 1, 5, INK);
    if (this.flash > 0 && this.flashDir > 0) heart(fb, fx + 10, y + 1 - Math.round((0.7 - this.flash) * 6), PINK);
    this.flash = Math.max(0, this.flash - 1 / 60);
  }

  /** Where her bubble was drawn last frame (so other bubbles can keep clear). */
  box: { x: number; y: number; w: number; h: number } | null = null;

  /** Draw the bubble above the passenger. headX/headY = her head in screen pixels. */
  draw(fb: DrawSurface, headX: number, headY: number): void {
    for (const h of this.hearts) {
      if (h.life < 0.3 && Math.floor(h.life * 20) % 2) continue;
      heart(fb, Math.round(headX + h.x), Math.round(headY - 6 + h.y), h.life > 0.6 ? PINK : PINK2);
    }
    this.box = null;
    if (!this.speaking || !this.id) return;
    const text = t(this.id);
    const icon = this.talk === "love" ? 7 : this.talk === "scared" ? 5 : 0;
    const tw = Math.min(W - 24, textWidth(text));
    const bw = tw + 10 + icon, bh = 13;
    const pop = this.t < 0.12 ? Math.round((0.12 - this.t) * 30) : 0;
    let bx = Math.round(headX + 4);
    if (bx + bw > W - 3) bx = W - 3 - bw;
    if (bx < 3) bx = 3;
    const by = Math.round(headY - 30 + pop);
    const edge: Col = this.talk === "love" ? PINK : this.talk === "scared" ? BLUE : this.talk === "hurry" ? RED : rgb(0x8a7aa8);
    // shake when frightened
    const sx = this.talk === "scared" && this.t < 0.5 ? (Math.floor(this.t * 40) % 2 ? 1 : -1) : 0;
    const x0 = bx + sx;
    this.box = { x: x0, y: by, w: bw, h: bh + 4 };
    fb.rect(x0 + 1, by - 1, bw - 2, bh + 2, INK);
    fb.rect(x0 - 1, by + 1, bw + 2, bh - 2, INK);
    fb.rect(x0, by, bw, bh, INK);
    fb.rect(x0 + 1, by + 1, bw - 2, bh - 2, PAPER);
    fb.rect(x0 + 1, by + bh - 2, bw - 2, 1, edge);
    // tail down to her head
    const tx = Math.max(x0 + 3, Math.min(x0 + bw - 6, Math.round(headX)));
    for (let i = 0; i < 4; i++) {
      fb.rect(tx + i - 1, by + bh + i - 1, 4 - i + 1, 1, INK);
      if (i < 3) fb.rect(tx + i, by + bh + i - 1, 3 - i, 1, PAPER);
    }
    let cx = x0 + 5;
    if (this.talk === "love") { heart(fb, cx, by + 4, PINK); cx += icon; }
    else if (this.talk === "scared") { fb.rect(cx, by + 3, 1, 5, BLUE); fb.rect(cx, by + 9, 1, 1, BLUE); fb.rect(cx + 2, by + 3, 1, 5, BLUE); fb.rect(cx + 2, by + 9, 1, 1, BLUE); cx += icon; }
    drawText(fb, fitTo(text, tw), cx, by + 3, this.talk === "love" ? rgb(0xc8286a) : this.talk === "scared" ? rgb(0x2a5ab8) : INK);
  }
}

/** Her little 11x11 portrait: blonde hair, and an expression for each mood level. */
export function face(fb: DrawSurface, x: number, y: number, level: number, beaming = false): void {
  const HAIR = rgb(0xffd040), HAIR2 = rgb(0xc88a20), SKIN = rgb(0xffd8b8), EYE = rgb(0x2a1238), BLUSH = rgb(0xff8aa8);
  // hair halo
  for (let r = 0; r < 11; r++) for (let q = 0; q < 11; q++) {
    const dx = q - 5, dy = r - 5;
    const d = dx * dx + dy * dy;
    if (d <= 30 && (r < 6 || Math.abs(dx) >= 4)) fb.pset(x + q, y + r, d >= 22 ? HAIR2 : HAIR);
  }
  // face
  for (let r = 3; r < 11; r++) for (let q = 2; q < 9; q++) {
    const dx = q - 5, dy = r - 6.5;
    if (dx * dx + dy * dy * 1.2 <= 12) fb.pset(x + q, y + r, SKIN);
  }
  fb.rect(x + 2, y + 3, 7, 1, HAIR); // fringe
  const p = (q: number, r: number, c: Col) => fb.pset(x + q, y + r, c);
  if (level === 0) {
    // terrified: wide eyes, open mouth, sweat
    p(3, 5, EYE); p(3, 6, EYE); p(7, 5, EYE); p(7, 6, EYE);
    p(4, 8, EYE); p(5, 8, EYE); p(6, 8, EYE); p(4, 9, EYE); p(6, 9, EYE); p(5, 9, rgb(0xc83050)); p(4, 10, EYE); p(5, 10, EYE); p(6, 10, EYE);
    p(9, 4, rgb(0x8ad0ff)); p(9, 5, rgb(0x5aa8ff));
  } else if (level === 1) {
    // nervous: flat mouth and a bead of sweat
    p(3, 6, EYE); p(7, 6, EYE); p(2, 5, EYE); p(8, 5, EYE);
    p(4, 9, EYE); p(5, 9, EYE); p(6, 9, EYE);
    p(9, 5, rgb(0x8ad0ff));
  } else {
    // happy / in love: smile, blush when in love or beaming
    if (level === 3) { p(3, 6, PINK); p(7, 6, PINK); p(3, 5, PINK); p(7, 5, PINK); }
    else { p(3, 6, EYE); p(7, 6, EYE); }
    p(3, 8, EYE); p(4, 9, EYE); p(5, 9, EYE); p(6, 9, EYE); p(7, 8, EYE);
    if (level === 3 || beaming) { p(2, 7, BLUSH); p(8, 7, BLUSH); }
  }
}

function heart(fb: DrawSurface, x: number, y: number, c: Col): void {
  for (let r = 0; r < HEART.length; r++) for (let q = 0; q < 5; q++) if (HEART[r][q] === "#") fb.pset(x + q - 2, y + r, c);
}

function fitTo(s: string, w: number): string {
  if (textWidth(s) <= w) return s;
  const ch = Array.from(s);
  while (ch.length > 1 && textWidth(ch.join("") + "…") > w) ch.pop();
  return ch.join("") + "…";
}

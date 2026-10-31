import type { DrawSurface } from "../core/draw-surface";
// Rival drivers yell at you: angry when you ram them, grumpy when you blast
// past too close. The bubble rides on top of their car while it is on screen,
// and hangs at the screen edge beside you once you have overtaken them.
import { W, Col, rgb } from "../core/fb";
import { drawText, textWidth } from "../core/font";
import { t } from "../platform/services";
import type { Car } from "./race";

export type ShoutKind = "hit" | "pass";

const LINES: Record<ShoutKind, string[]> = {
  hit: ["rival.hit1", "rival.hit2", "rival.hit3", "rival.hit4", "rival.hit5", "rival.hit6"],
  pass: ["rival.pass1", "rival.pass2", "rival.pass3", "rival.pass4", "rival.pass5", "rival.pass6"],
};

interface Shout { car: Car; id: string; kind: ShoutKind; side: number; t: number; dur: number }

export interface Box { x: number; y: number; w: number; h: number }

const INK = rgb(0x1a0e10);
const PAPER = rgb(0xfff4c8);
const RED = rgb(0xe8302a);
const TXT = rgb(0x8a1010);

export class Shouts {
  private list: Shout[] = [];
  private cool = 0;
  private last = "";

  /** A driver yells. `force` = always (collisions); otherwise respects a cooldown. Returns true if shown. */
  say(car: Car, kind: ShoutKind, playerX: number, force = false): boolean {
    if (!force && this.cool > 0) return false;
    if (this.list.some((s) => s.car === car && s.t < s.dur * 0.6)) return false;
    const pool = LINES[kind];
    let id = pool[Math.floor(Math.random() * pool.length)];
    if (id === this.last) id = pool[(pool.indexOf(id) + 1) % pool.length];
    this.last = id;
    this.list = this.list.filter((s) => s.car !== car).slice(-1); // at most two on screen
    this.list.push({ car, id, kind, side: car.x < playerX ? -1 : 1, t: 0, dur: kind === "hit" ? 2.0 : 1.7 });
    this.cool = kind === "hit" ? 1.0 : 2.2;
    return true;
  }

  update(dt: number): void {
    this.cool = Math.max(0, this.cool - dt);
    for (const s of this.list) s.t += dt;
    this.list = this.list.filter((s) => s.t < s.dur);
  }

  /** frame = the renderer's frame number (a car drawn this frame has seen === frame). */
  draw(fb: DrawSurface, frame: number, avoid: Box | null, touch: boolean): void {
    for (const s of this.list) {
      const text = t(s.id);
      const tw = Math.min(W - 30, textWidth(text));
      const bw = tw + 14, bh = 13;
      const onScreen = s.car.seen === frame && s.car.sy > 8;
      let bx: number, by: number, tailX: number, tailDown = true;
      if (onScreen) {
        bx = Math.round(s.car.sx - bw / 2);
        by = Math.round(s.car.sy - bh - 5);
        tailX = Math.round(s.car.sx);
      } else {
        // overtaken: they shout from beside you
        by = touch ? 62 : 110;
        bx = s.side < 0 ? 4 : W - 4 - bw;
        tailX = s.side < 0 ? bx + 4 : bx + bw - 7;
      }
      if (bx < 3) bx = 3;
      if (bx + bw > W - 3) bx = W - 3 - bw;
      if (by < 22) by = 22;
      // keep clear of the passenger's bubble
      if (avoid && bx < avoid.x + avoid.w + 2 && bx + bw > avoid.x - 2 && by < avoid.y + avoid.h + 6 && by + bh > avoid.y - 2) {
        by = avoid.y - bh - 8;
        tailDown = false;
      }
      const pop = s.t < 0.1 ? Math.round((0.1 - s.t) * 30) : 0;
      const shake = s.t < 0.45 ? (Math.floor(s.t * 36) % 2 ? 1 : -1) : 0;
      this.bubble(fb, bx + shake, by + pop, bw, bh, tailDown ? tailX + shake : -1, text, tw);
    }
  }

  private bubble(fb: DrawSurface, x: number, y: number, w: number, h: number, tailX: number, text: string, tw: number): void {
    // jagged "shouting" corners
    fb.rect(x - 1, y - 1, w + 2, h + 2, INK);
    fb.rect(x + 1, y - 2, 3, 1, INK); fb.rect(x + w - 4, y - 2, 3, 1, INK);
    fb.rect(x + 1, y + h + 1, 3, 1, INK); fb.rect(x + w - 4, y + h + 1, 3, 1, INK);
    fb.rect(x, y, w, h, PAPER);
    fb.rect(x, y, w, 1, RED);
    fb.rect(x, y + h - 1, w, 1, RED);
    if (tailX >= 0) {
      const tx = Math.max(x + 2, Math.min(x + w - 6, tailX - 2));
      for (let i = 0; i < 4; i++) {
        fb.rect(tx + i - 1, y + h + i, 5 - i, 1, INK);
        if (i < 3) fb.rect(tx + i, y + h + i - 1, 3 - i, 1, i === 0 ? RED : PAPER);
      }
    }
    // little anger mark
    const ax = x + 3, ay = y + 3;
    const c: Col = RED;
    fb.pset(ax, ay, c); fb.pset(ax + 2, ay, c); fb.pset(ax + 1, ay + 1, c); fb.pset(ax, ay + 2, c); fb.pset(ax + 2, ay + 2, c);
    fb.pset(ax + 1, ay + 4, c); fb.pset(ax + 1, ay + 5, c);
    drawText(fb, fitTo(text, tw), x + 9, y + 3, TXT);
  }
}

function fitTo(s: string, w: number): string {
  if (textWidth(s) <= w) return s;
  const ch = Array.from(s);
  while (ch.length > 1 && textWidth(ch.join("") + "…") > w) ch.pop();
  return ch.join("") + "…";
}

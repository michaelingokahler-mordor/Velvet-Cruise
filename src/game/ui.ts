import type { DrawSurface } from "../core/draw-surface";
// Arcade HUD and menu drawing helpers (everything is pixel text in the framebuffer).
import { W, H, Col, rgb } from "../core/fb";
import { drawText, textWidth } from "../core/font";
import { t, fmtNum } from "../platform/tesana";
import { MAX_SPEED, STAGE_COUNT, SEG_LEN } from "./config";
import type { Race } from "./race";
import type { SpriteBank } from "../core/assets";
import { THEMES, Weather } from "./themes";
import { weatherIcon } from './stage-info';
import { TOUCH, TOUCH_TILT, Rect } from "../input";

/**
 * Approaching a split: both destinations (icon, name, weather), the one the car is heading for lit up.
 * Stays a moment after the choice, flashing the road taken.
 */
export function drawForkPanel(fb: DrawSurface, bank: SpriteBank, race: Race, time: number): void {
  const f = race.fork;
  if (!f || race.state !== "race") return;
  const seg = race.playerZ / SEG_LEN;
  if (seg < f.start - 240 || seg > f.nose + 36) return;
  const picked = race.forkSide;
  const lean = picked || (race.playerX < -0.02 ? -1 : race.playerX > 0.02 ? 1 : 0);
  if (!picked) para(fb, t("fork.choose"), W / 2, 37, C.yellow, W - 10);
  const boxes: [number, number, Rect][] = [[-1, f.left, { x: 6, y: 47, w: 152, h: 20 }], [1, f.right, { x: 162, y: 47, w: 152, h: 20 }]];
  for (const [side, node, r] of boxes) {
    const on = lean === side;
    if (picked && !on) continue;
    if (picked && Math.floor(time * 8) % 2 === 0) continue;
    fb.rectA(r.x, r.y, r.w, r.h, on ? rgb(0xff7a30) : rgb(0x2a1840), on ? 0.92 : 0.72);
    fb.frame(r.x, r.y, r.w, r.h, on ? rgb(0xfff0a0) : rgb(0x8a6aa8));
    const th = THEMES[node];
    const ic = bank.get(th.icon ?? "icon_coast");
    const wx = bank.get(weatherIcon(th));
    // left box: ← icon NAME weather; right box: weather NAME icon →
    const arrowX = side < 0 ? r.x + 4 : r.x + r.w - 12;
    drawText(fb, side < 0 ? "←" : "→", arrowX, r.y + 7, C.white, { outline: C.ink });
    const icX = side < 0 ? r.x + 22 : r.x + r.w - 22;
    if (ic) fb.blit(ic, icX, r.y + 18, 1);
    const wxX = side < 0 ? r.x + r.w - 10 : r.x + 10;
    if (wx) fb.blit(wx, wxX, r.y + 16, 1);
    const name = fit(t(th.nameKey), r.w - 56);
    drawText(fb, name, side < 0 ? r.x + 32 : r.x + r.w - 32, r.y + 7, on ? C.white : C.grey, { align: side < 0 ? "left" : "right", outline: C.ink });
  }
}

export const C = {
  white: rgb(0xffffff), black: rgb(0x000000), ink: rgb(0x1a0e26), shadow: rgb(0x2a1238),
  yellow: rgb(0xffe860), orange: rgb(0xff9a3c), red: rgb(0xff4a3a), pink: rgb(0xff7ab0), cyan: rgb(0x7ae8ff),
  green: rgb(0x7cf06a), grey: rgb(0xb8b0c8), dim: rgb(0x0c0818), panel: rgb(0x1c1030), panel2: rgb(0x2c1a48),
};
export const GRAD_SUN = [0xfff6a0, 0xffe860, 0xffd040, 0xffb830, 0xff9a20, 0xff7a18, 0xf05a10].map(rgb);
export const GRAD_RED = [0xffd0c0, 0xffa090, 0xff7060, 0xff4a3a, 0xe83028, 0xc01818, 0x900c14].map(rgb);
export const GRAD_PINK = [0xfff0ff, 0xffd0f0, 0xffa8e0, 0xff80c8, 0xf060b0, 0xd04898, 0xa83080].map(rgb);
export const GRAD_CYAN = [0xf0ffff, 0xc0f8ff, 0x90ecff, 0x60d8ff, 0x40b8f0, 0x3090d8, 0x2870b8].map(rgb);

export function fmtTime(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const h = Math.floor((s * 100) % 100);
  return `${m}'${r < 10 ? "0" : ""}${r}"${h < 10 ? "0" : ""}${h}`;
}

export function label(fb: DrawSurface, s: string, x: number, y: number, col: Col = C.orange, align: "left" | "center" | "right" = "left", maxW?: number): number {
  return drawText(fb, s, x, y, col, { align, outline: C.ink, maxW });
}

export function big(fb: DrawSurface, s: string, x: number, y: number, scale: number, grad: Col[] = GRAD_SUN, align: "left" | "center" | "right" = "center", maxW = W - 8): void {
  drawText(fb, s, x, y, grad[3], { scale, grad, outline: C.ink, align, maxW, shadow: C.shadow });
}

export interface Msg { text: string; sub?: string; t: number; dur: number; grad: Col[]; y: number; scale: number }

export class Hud {
  msgs: Msg[] = [];
  flash = 0;

  push(text: string, sub: string | undefined, dur: number, grad: Col[] = GRAD_SUN, y = 52, scale = 3): void {
    // one message per band: a new one replaces anything overlapping it
    this.msgs = this.msgs.filter((m) => m.y + 7 * m.scale + (m.sub ? 12 : 0) < y || y + 7 * scale + (sub ? 12 : 0) < m.y);
    this.msgs.push({ text, sub, t: 0, dur, grad, y, scale });
  }

  update(dt: number): void {
    for (const m of this.msgs) m.t += dt;
    this.msgs = this.msgs.filter((m) => m.t < m.dur);
    this.flash += dt;
  }

  draw(fb: DrawSurface, race: Race, touch: boolean, time: number, tilt = false): void {
    // TIME
    label(fb, t("hud.time"), 7, 4, C.orange);
    const secs = Math.ceil(race.timer);
    const hurry = race.state === "race" && race.timer < 10;
    if (!hurry || Math.floor(time * 4) % 2 === 0) big(fb, String(secs), 7, 13, 3, hurry ? GRAD_RED : GRAD_SUN, "left");
    // SCORE
    label(fb, t("hud.score"), W / 2, 4, C.orange, "center");
    drawText(fb, fmtNum(race.score), W / 2, 13, C.white, { align: "center", outline: C.ink });
    // LAP (stage time)
    label(fb, t("hud.lap"), W - 7, 4, C.orange, "right");
    drawText(fb, fmtTime(race.stageTime), W - 7, 13, C.cyan, { align: "right", outline: C.ink });

    // speed + tacho
    const sp = race.speed / MAX_SPEED;
    const by = touch ? 104 : H - 9;
    const bx = touch ? 6 : 7;
    big(fb, String(race.kmh), bx + 36, by - 13, 2, GRAD_SUN, "right");
    label(fb, t("hud.kmh"), bx + 40, by - 6, C.orange);
    const segs = 14;
    const lit = Math.round(race.rpm * segs);
    for (let i = 0; i < segs; i++) {
      const col = i < 8 ? rgb(0x6cf05a) : i < 11 ? rgb(0xffe050) : rgb(0xff4a3a);
      const h = 2 + Math.floor(i / 2);
      fb.rect(bx + i * 5 - 1, by - 17 - h - 1, 6, h + 2, C.ink);
      fb.rect(bx + i * 5, by - 17 - h, 4, h, i < lit ? col : rgb(0x3a2a50));
    }
    label(fb, race.gear ? t("hud.high") : t("hud.low"), bx + 74, by - 25, race.gear ? C.yellow : C.cyan);

    // stage + course map
    const mx = W - 7, my = touch ? 40 : H - 18;
    const stw = label(fb, t("hud.stage", { n: race.stage + 1 }), mx, my, C.yellow, "right");
    if (race.diff.id !== "normal") drawText(fb, t(race.diff.nameKey), mx - stw - 6, my, race.diff.col, { align: "right", outline: C.ink });
    const mw = 60, x0 = mx - mw;
    fb.rect(x0 - 1, my + 10, mw + 2, 5, C.ink);
    for (let s = 0; s < STAGE_COUNT; s++) {
      const a = x0 + (s * mw) / STAGE_COUNT, b = x0 + ((s + 1) * mw) / STAGE_COUNT;
      fb.rect(a, my + 11, b - a - 1, 3, s < race.stage ? rgb(0xffa040) : s === race.stage ? rgb(0x8a6aa8) : rgb(0x3a2a50));
    }
    const p = x0 + race.progress * mw;
    fb.rect(p - 1, my + 9, 3, 7, C.white);
    fb.rect(p, my + 10, 1, 5, C.red);

    // messages
    for (const m of this.msgs) {
      const blink = m.t < 0.35 ? Math.floor(m.t * 16) % 2 === 0 : true;
      if (!blink) continue;
      big(fb, m.text, W / 2, m.y, m.scale, m.grad);
      if (m.sub) para(fb, m.sub, W / 2, m.y + 7 * m.scale + 4, C.white, W - 10);
    }

    drawSignalIndicator(fb, race);
    drawWindIndicator(fb, race, time);
    if (touch) drawTouch(fb, tilt, race.steer,race.nightSignal);
  }
}

/** Winds travel relative to the car: right is right, up is tailwind. */
export function drawWindIndicator(fb: DrawSurface, race: Race, time: number): void {
  const weather = race.weatherAmt('sand');
  if (weather < .02 || race.tunnelAmt > .95 || race.playerSeg.tunnel || (race.state !== 'race' && race.state !== 'countdown')) return;
  const side = race.gust / .46, forward = race.windForward;
  const strength = Math.min(1, Math.hypot(side, forward));
  const px = W - 22, py = 85;
  fb.rectA(W - 41, 71, 36, 38, C.ink, .48 * weather);
  fb.rect(px - 1, py - 4, 2, 26, rgb(0xc8ccd0));
  fb.rect(px - 5, py + 21, 10, 2, rgb(0x7a7c8c));
  const len = 4 + 12 * strength, inv = strength > .02 ? 1 / Math.hypot(side, forward) : 0;
  const dx = side * inv, dy = strength > .02 ? -forward * inv : 1;
  const wave = Math.sin(time * 12) * 1.2 * strength;
  for (let band = 0; band < 5; band++) {
    const a = band / 5, b = (band + 1) / 5;
    const ax = px + dx * len * a + wave * a * dy, ay = py + dy * len * a - wave * a * dx;
    const bx = px + dx * len * b + wave * b * dy, by = py + dy * len * b - wave * b * dx;
    const aw = 3 - a * 1.7, bw = 3 - b * 1.7;
    fb.poly([ax-dy*aw,ay+dx*aw,ax+dy*aw,ay-dx*aw,bx+dy*bw,by-dx*bw,bx-dy*bw,by+dx*bw],band%2 ? C.white : rgb(0xee4b3c));
  }
  if (Math.abs(forward) > .08) drawText(fb, forward > 0 ? '↑' : '↓', W-11, forward > 0 ? 73 : 99, C.yellow, {outline:C.ink,align:'center'});
}

/** A persistent H hint, with a bright confirmation even when no car can yield. */
export function drawSignalIndicator(fb: DrawSurface, race: Race): void {
  if (race.state !== "race" && race.state !== "countdown") return;
  const x = W - 39, y = 41, active = race.signalT > 0;
  const flash = active ? race.signalKind === "flash" : race.nightSignal;
  const lit = active && (!flash || race.signalFlash);
  const col = lit ? flash ? C.cyan : C.yellow : rgb(0x8a7a98);
  fb.rectA(x, y, 32, 13, lit ? rgb(0x24304a) : C.ink, active ? 0.9 : 0.5);
  fb.frame(x, y, 32, 13, active ? flash ? C.cyan : C.yellow : rgb(0x554560));
  const ix = x + 4, iy = y + 3;
  if (flash) {
    fb.rect(ix, iy + 1, 1, 5, col);
    fb.rect(ix + 1, iy, 4, 7, col);
    fb.rect(ix + 2, iy + 1, 2, 5, C.ink);
    for (let row = 0; row < 3; row++) fb.rect(ix + 7, iy + row * 3, lit ? 6 : 3, 1, col);
  } else {
    fb.rect(ix, iy + 2, 3, 3, col);
    fb.rect(ix + 3, iy + 1, 2, 5, col);
    fb.rect(ix + 5, iy, 1, 7, col);
    fb.rect(ix + 8, iy + 2, 1, 3, col);
    if (lit) { fb.rect(ix + 10, iy, 1, 2, col); fb.rect(ix + 11, iy + 2, 1, 3, col); fb.rect(ix + 10, iy + 5, 1, 2, col); }
  }
  drawText(fb, "H", x + 23, y + 3, col, { outline: C.ink });
}

function pad(fb: DrawSurface, r: Rect, glyph: string, text?: string): void {
  fb.rectA(r.x, r.y, r.w, r.h, rgb(0x100820), 0.38);
  fb.frame(r.x, r.y, r.w, r.h, rgb(0xfff0d0));
  drawText(fb, glyph, r.x + r.w / 2, r.y + r.h / 2 - (text ? 9 : 7), C.white, { align: "center", scale: 2, outline: C.ink });
  if (text) drawText(fb, text, r.x + r.w / 2, r.y + r.h - 11, C.yellow, { align: "center", outline: C.ink, maxW: r.w - 2 });
}

export function drawTouch(fb: DrawSurface, tilt = false, steer = 0,night=false): void {
  if (tilt) {
    pad(fb, TOUCH_TILT.brake, "↓", t("ctl.brake"));
    pad(fb, TOUCH_TILT.gas, "↑", t("ctl.gas"));
    // little steering-wheel gauge showing the current tilt
    const cx = W / 2, cy = 46;
    fb.rectA(cx - 26, cy - 2, 52, 5, rgb(0x100820), 0.45);
    fb.rect(cx, cy - 3, 1, 7, rgb(0xfff0d0));
    const k = Math.round(cx + steer * 24);
    fb.rect(k - 2, cy - 1, 5, 3, C.yellow);
  } else {
    pad(fb, TOUCH.left, "←");
    pad(fb, TOUCH.right, "→");
    pad(fb, TOUCH.brake, "↓", t("ctl.brake"));
    pad(fb, TOUCH.gas, "↑", t("ctl.gas"));
  }
  const r = TOUCH.pause;
  fb.rectA(r.x, r.y, r.w, r.h, rgb(0x100820), 0.38);
  fb.rect(r.x + 6, r.y + 4, 2, 8, C.white);
  fb.rect(r.x + 10, r.y + 4, 2, 8, C.white);
  const h=TOUCH.signal;
  fb.rectA(h.x,h.y,h.w,h.h,rgb(0x100820),.5);fb.frame(h.x,h.y,h.w,h.h,C.white);
  drawText(fb,night?'L':'H',h.x+14,h.y+6,night?C.cyan:C.yellow,{align:'center',outline:C.ink});
}

export function panel(fb: DrawSurface, x: number, y: number, w: number, h: number): void {
  fb.rectA(x, y, w, h, rgb(0x140a26), 0.78);
  fb.frame(x, y, w, h, rgb(0xff9a3c));
  fb.frame(x + 1, y + 1, w - 2, h - 2, rgb(0x5a2a5a));
}

export function button(fb: DrawSurface, r: Rect, text: string, active: boolean): void {
  fb.rectA(r.x, r.y, r.w, r.h, active ? rgb(0xff7a30) : rgb(0x2a1840), active ? 0.95 : 0.8);
  fb.frame(r.x, r.y, r.w, r.h, active ? rgb(0xfff0a0) : rgb(0x8a6aa8));
  drawText(fb, fit(text, r.w - 6), r.x + r.w / 2, r.y + (r.h - 7) / 2, active ? C.white : C.grey, { align: "center", outline: C.ink });
}

export function centerW(s: string, scale = 1): number { return textWidth(s, scale); }

const STAR = ["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", "##...##"];
/** A little 7x7 pixel star with a dark outline (top-left at x, y): marks a new personal best. */
export function star(fb: DrawSurface, x: number, y: number, col: Col): void {
  STAR.forEach((row, ry) => { for (let q = 0; q < 7; q++) if (row[q] === "#") fb.rect(x + q - 1, y + ry - 1, 3, 3, C.ink); });
  STAR.forEach((row, ry) => { for (let q = 0; q < 7; q++) if (row[q] === "#") fb.pset(x + q, y + ry, col); });
}

/** Trim a string with an ellipsis so it fits in maxW pixels at scale 1. */
export function fit(s: string, maxW: number): string {
  if (textWidth(s) <= maxW) return s;
  const chars = Array.from(s);
  while (chars.length > 1 && textWidth(chars.join("") + "…") > maxW) chars.pop();
  return chars.join("") + "…";
}

/** Word-wrapped centred text (falls back to per-character wrapping for scripts without spaces).
 *  When `fromBottom` is set, y is the top of the LAST line and extra lines grow upward. */
export function para(fb: DrawSurface, s: string, x: number, y: number, col: Col, maxW: number, fromBottom = false): number {
  const lines: string[] = [];
  const words = s.includes(" ") ? s.split(" ") : Array.from(s);
  const sep = s.includes(" ") ? " " : "";
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + sep + w : w;
    if (textWidth(next) > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  const y0 = fromBottom ? y - (lines.length - 1) * 9 : y;
  lines.forEach((ln, i) => drawText(fb, fit(ln, maxW), x, y0 + i * 9, col, { align: "center", outline: C.ink }));
  return lines.length;
}

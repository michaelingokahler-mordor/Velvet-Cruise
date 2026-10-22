// The course map: the fifteen stages as a painted patchwork with the roads
// between them. Browsed from the title screen, and shown after every run with
// the route that was driven drawn on in red, Out Run style.
import { FB, W, H, Col, rgb, mix } from "../core/fb";
import { SpriteBank } from "../core/assets";
import { drawText } from "../core/font";
import { t } from "../platform/tesana";
import { THEMES, Weather } from "./themes";
import { COLUMN_NODES, NEXT, NODE_COUNT, goalLetter } from "./routes";
import { C, big, fit, fmtTime, GRAD_SUN } from "./ui";

export interface MapData { w: number; h: number; nodes: Record<string, [number, number]>; edges: Record<string, [number, number][]> }

/** Where stage `k` of column `c` sits on the map (the painted map uses the same grid): the coast
 *  runs straight along the bottom, every row inland is one step up and a little to the left (leaning with the tiles). */
export function gridPos(c: number, k: number): [number, number] {
  const r = c - k;
  return [34 + 58 * c - 7 * r, 130 - 26 * r];
}

/** Fallback layout (used until / unless the painted map's coordinates load). */
function fallback(): MapData {
  const nodes: Record<string, [number, number]> = {};
  COLUMN_NODES.forEach((list, c) => list.forEach((n, k) => { nodes[n] = gridPos(c, k); }));
  const edges: Record<string, [number, number][]> = {};
  for (const [a, list] of Object.entries(NEXT)) for (const b of list) edges[`${a}-${b}`] = [nodes[a], nodes[String(b)]];
  return { w: W, h: H, nodes, edges };
}

export const WEATHER_ICON: Record<Weather, string> = { clear: "wx_sun", rain: "wx_rain", fog: "wx_fog", sand: "wx_sand", heat: "wx_heat", night: "wx_moon", snow: "wx_snow" };
export const WEATHER_KEY: Record<Weather, string> = { clear: "wx.clear", rain: "wx.rain", fog: "wx.fog", sand: "wx.sand", heat: "wx.heat", night: "wx.night", snow: "wx.snow" };

const RED = rgb(0xff3a2a), RED_D = rgb(0x8a1010), RED_L = rgb(0xffb0a0);

export class CourseMap {
  data: MapData = fallback();
  /** Selected stage (browsing) */
  sel = 0;

  load(json: unknown): void {
    const d = json as MapData | undefined;
    if (d && d.nodes && d.edges && Object.keys(d.nodes).length === NODE_COUNT) this.data = d;
  }

  node(n: number): [number, number] { return this.data.nodes[String(n)] ?? fallback().nodes[String(n)]; }

  private edge(a: number, b: number): [number, number][] {
    return this.data.edges[`${a}-${b}`] ?? [this.node(a), this.node(b)];
  }

  /** Thick red line along a polyline, up to fraction `upto` of its length. Returns the end point. */
  private route(fb: FB, pts: [number, number][], upto: number): [number, number] {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let left = total * Math.max(0, Math.min(1, upto));
    let end: [number, number] = pts[0];
    const dot = (x: number, y: number) => {
      fb.rect(x - 2, y - 2, 5, 5, RED_D);
    };
    const dot2 = (x: number, y: number) => {
      fb.rect(x - 1, y - 1, 3, 3, RED);
      fb.pset(x, y - 1, RED_L);
    };
    const passes: ((x: number, y: number) => void)[] = [dot, dot2];
    for (const pass of passes) {
      left = total * Math.max(0, Math.min(1, upto));
      for (let i = 1; i < pts.length && left > 0; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const len = Math.hypot(bx - ax, by - ay);
        const use = Math.min(len, left);
        const steps = Math.max(1, Math.ceil(use));
        for (let k = 0; k <= steps; k++) {
          const u = len ? (use * k) / steps / len : 0;
          const x = Math.round(ax + (bx - ax) * u), y = Math.round(ay + (by - ay) * u);
          pass(x, y);
          end = [x, y];
        }
        left -= use;
      }
    }
    return end;
  }

  /**
   * Draw the map. `path` = the stages driven (the route), `progress` = how much of it is drawn
   * (in edges, fractional), `hi` = the stage to highlight (blinking marker), or -1.
   */
  draw(fb: FB, bank: SpriteBank, time: number, path: number[], progress: number, hi: number): void {
    const bg = bank.get("course_map");
    if (bg) fb.layer(bg, 0, 0, true);
    else {
      fb.clear(rgb(0xd8b888));
      for (const [k, pts] of Object.entries(this.data.edges)) {
        void k;
        for (let i = 1; i < pts.length; i++) this.line(fb, pts[i - 1], pts[i], rgb(0x6a6a74));
      }
      for (let n = 0; n < NODE_COUNT; n++) {
        const [x, y] = this.node(n);
        const ic = bank.get(THEMES[n].icon ?? "icon_coast");
        if (ic) fb.blit(ic, x, y + 8, 1);
        else fb.rect(x - 6, y - 6, 12, 12, rgb(0x4a8a3a));
      }
    }
    // the route driven so far
    let car: [number, number] | null = path.length ? this.node(path[0]) : null;
    for (let i = 1; i < path.length; i++) {
      const u = progress - (i - 1);
      if (u <= 0) break;
      car = this.route(fb, this.edge(path[i - 1], path[i]), u);
    }
    // checkpoints on every stage, the driven ones in red
    for (let n = 0; n < NODE_COUNT; n++) {
      const [x, y] = this.node(n);
      const k = path.indexOf(n);
      const done = k >= 0 && k <= Math.floor(progress + 0.001);
      fb.rect(x - 3, y - 3, 7, 7, C.ink);
      fb.rect(x - 2, y - 2, 5, 5, done ? RED : rgb(0xf4f0e8));
      fb.rect(x - 1, y - 1, 3, 3, done ? RED_L : rgb(0xc8c0b8));
    }
    // the five goals: a chequered flag on each (the painted map has its own) and its letter A-E
    for (const g of COLUMN_NODES[COLUMN_NODES.length - 1]) {
      const [x, y] = this.node(g);
      if (!bg) {
        fb.rect(x + 3, y - 15, 1, 13, C.ink);
        for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) fb.pset(x + 4 + q, y - 15 + r, (r + q) & 1 ? C.ink : C.white);
      }
      this.letter(fb, goalLetter(g), x + 27, y - 5, path[path.length - 1] === g && progress >= COLUMN_NODES.length - 1.001);
    }
    if (hi >= 0) {
      const [x, y] = this.node(hi);
      if (Math.floor(time * 4) % 2 === 0) {
        fb.frame(x - 6, y - 6, 13, 13, C.yellow);
        fb.frame(x - 5, y - 5, 11, 11, C.ink);
      }
    }
    if (car) {
      // the little red car at the head of the route
      const [x, y] = car;
      const bob = Math.round(Math.sin(time * 10));
      fb.rect(x - 4, y - 6 + bob, 9, 4, C.ink);
      fb.rect(x - 3, y - 5 + bob, 7, 2, rgb(0xe8302a));
      fb.rect(x - 2, y - 7 + bob, 5, 2, C.ink);
      fb.rect(x - 1, y - 6 + bob, 3, 1, rgb(0xff8a6a));
    }
    big(fb, t("map.title"), W / 2, 4, 2, GRAD_SUN);
  }

  /** A goal letter in a little white sign (red when it is the goal this run reached). */
  private letter(fb: FB, ch: string, x: number, y: number, hit: boolean): void {
    fb.rect(x - 1, y, 12, 11, C.ink);
    fb.rect(x, y - 1, 10, 13, C.ink);
    fb.rect(x, y, 10, 11, hit ? RED : rgb(0xf4f0e8));
    fb.rect(x + 1, y + 9, 8, 1, hit ? RED_D : rgb(0xc8c0b8));
    drawText(fb, ch, x + 5, y + 2, hit ? C.white : rgb(0x2a5ad8), { align: "center" });
  }

  private line(fb: FB, a: [number, number], b: [number, number], c: Col): void {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let k = 0; k <= n; k++) fb.rect(Math.round(a[0] + ((b[0] - a[0]) * k) / n) - 1, Math.round(a[1] + ((b[1] - a[1]) * k) / n) - 1, 3, 3, c);
  }

  /** Caption box at the bottom: a stage's icon, name and weather (and the best time on it). */
  caption(fb: FB, bank: SpriteBank, node: number, bestMs: number, extra?: string): void {
    const y0 = H - 21;
    fb.rectA(4, y0, W - 8, 18, rgb(0x140a26), 0.82);
    fb.frame(4, y0, W - 8, 18, rgb(0xff9a3c));
    const th = THEMES[node];
    const ic = bank.get(th.icon ?? "icon_coast");
    if (ic) fb.blit(ic, 16, y0 + 17, 1);
    drawText(fb, fit(t(th.nameKey), 118), 28, y0 + 6, C.yellow, { outline: C.ink });
    const wx = th.weather ?? "clear";
    const wi = bank.get(WEATHER_ICON[wx]);
    if (wi) fb.blit(wi, 156, y0 + 15, 1);
    drawText(fb, fit(t(WEATHER_KEY[wx]), 74), 164, y0 + 6, C.cyan, { outline: C.ink });
    const right = extra ?? (bestMs > 0 ? fmtTime(bestMs / 1000) : "--'--\"--");
    drawText(fb, right, W - 10, y0 + 6, extra ? C.white : bestMs > 0 ? C.cyan : rgb(0x8a7aa8), { align: "right", outline: C.ink });
  }

  /** Browsing: move the selection with the arrow keys (columns left/right, stages up/down). */
  move(dx: number, dy: number): void {
    const col = COLUMN_NODES.findIndex((c) => c.includes(this.sel));
    if (dx) {
      const nc = Math.max(0, Math.min(COLUMN_NODES.length - 1, col + dx));
      if (nc !== col) {
        // nearest stage (on the map) in the next column
        const [sx, sy] = this.node(this.sel);
        let best = COLUMN_NODES[nc][0], bd = 1e9;
        for (const n of COLUMN_NODES[nc]) { const [x, y] = this.node(n); const d = Math.abs(y - sy) + Math.abs(x - sx) * 0.2; if (d < bd) { bd = d; best = n; } }
        this.sel = best;
      }
    }
    if (dy) {
      const list = COLUMN_NODES[col].slice().sort((a, b) => this.node(a)[1] - this.node(b)[1]);
      const i = list.indexOf(this.sel);
      this.sel = list[Math.max(0, Math.min(list.length - 1, i + dy))];
    }
  }

  /** The stage marker nearest a tap (within reach), or -1. */
  hit(x: number, y: number): number {
    let best = -1, bd = 18 * 18;
    for (let n = 0; n < NODE_COUNT; n++) {
      const [nx, ny] = this.node(n);
      const d = (nx - x) ** 2 + (ny - y) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
}

export const _mix = mix;

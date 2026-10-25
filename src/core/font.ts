import type { DrawSurface } from "./draw-surface";
// 5x7 arcade bitmap font drawn straight into the framebuffer. Characters the
// font does not cover (Cyrillic, CJK, symbols in player names) are rasterised
// once through the browser's own fonts and cached as 1-bit glyphs, so every
// language still renders in the same chunky pixel style.
import { Col } from "./fb";

const G: Record<string, string> = {
  A: ".###.#...##...#######...##...##...#", B: "####.#...##...#####.#...##...#####.",
  C: ".###.#...##....#....#....#...#.###.", D: "####.#...##...##...##...##...#####.",
  E: "######....#....####.#....#....#####", F: "######....#....####.#....#....#....",
  G: ".###.#...##....#.####...##...#.####", H: "#...##...##...#######...##...##...#",
  I: ".###...#....#....#....#....#...###.", J: "..###...#....#....#....##..#..##...",
  K: "#...##..#.#.#..##...#.#..#..#.#...#", L: "#....#....#....#....#....#....#####",
  M: "#...###.###.#.##.#.##...##...##...#", N: "#...##...###..##.#.##..###...##...#",
  O: ".###.#...##...##...##...##...#.###.", P: "####.#...##...#####.#....#....#....",
  Q: ".###.#...##...##...##.#.##..#..##.#", R: "####.#...##...#####.#.#..#..#.#...#",
  S: ".#####....#.....###.....#....#####.", T: "#####..#....#....#....#....#....#..",
  U: "#...##...##...##...##...##...#.###.", V: "#...##...##...##...##...#.#.#...#..",
  W: "#...##...##...##.#.##.#.##.#.#.#.#.", X: "#...##...#.#.#...#...#.#.#...##...#",
  Y: "#...##...#.#.#...#....#....#....#..", Z: "#####....#...#...#...#...#....#####",
  "0": ".###.#...##..###.#.###..##...#.###.", "1": "..#...##....#....#....#....#...###.",
  "2": ".###.#...#....#...#...#...#...#####", "3": "#####...#...#.....#.....##...#.###.",
  "4": "...#...##..#.#.#..#.#####...#....#.", "5": "######....####.....#....##...#.###.",
  "6": "..##..#...#....####.#...##...#.###.", "7": "#####....#...#...#...#....#....#...",
  "8": ".###.#...##...#.###.#...##...#.###.", "9": ".###.#...##...#.####....#...#..##..",
  "!": "..#....#....#....#....#.........#..", ".": "................................#..",
  ",": "...........................#...#...", "'": "..#....#...........................",
  '"': ".#.#..#.#..........................", ":": ".......#..............#............",
  ";": ".......#..............#...#........", "-": "...............###.................",
  "+": "......#....#..#####..#....#........", "/": "....#....#...#...#...#...#....#....",
  "?": ".###.#...#....#...#...#.........#..", "(": "...#...#...#....#....#.....#.....#.",
  ")": ".#.....#.....#....#....#...#...#...", "%": "##..###..#...#...#...#...#..###..##",
  "&": ".##..#..#.#.#...#...#.#.##..#..##.#", "*": "......#.#.#.###.#####.###.#.#.#....",
  "#": ".#.#..#.#.#####.#.#.#####.#.#..#.#.", "=": "..........#####.....#####..........",
  "<": "...#...#...#...#.....#.....#.....#.", ">": ".#.....#.....#.....#...#...#...#...",
  _: "..............................#####", "←": ".......#...#...#####.#.....#.......",
  "→": ".......#.....#.#####...#...#.......", "↑": "..#...###.#.#.#..#....#....#.......",
  "↓": ".......#....#....#..#.#.#.###...#..", "¡": "..#.........#....#....#....#....#..",
  "¿": "..#.........#...#...#....#...#.###.", "·": "...............#...................",
  "[": ".###..#....#....#....#....#....###.", "]": ".###....#....#....#....#....#..###.",
  "×": ".....#...#.#.#...#...#.#.#...#.....", "°": ".##..#..#..##......................",
  "@": ".###.#...##.###.#.###.##....#.###..", $: "..#...####.#....###....#.####...#..",
  "…": "..............................#.#.#",
};
// accent marks drawn above the cap height (2 rows, 5 wide)
const ACC: Record<string, string> = {
  acute: "...#...#..", grave: ".#.....#..", circ: "..#...#.#.", uml: "......#.#.",
  tilde: ".##.##..#.", ring: "..#...#.#.", macron: ".###......",
};
const ACCENTED: Record<string, [string, string]> = {
  "À": ["A", "grave"], "Á": ["A", "acute"], "Â": ["A", "circ"], "Ã": ["A", "tilde"], "Ä": ["A", "uml"], "Å": ["A", "ring"],
  "È": ["E", "grave"], "É": ["E", "acute"], "Ê": ["E", "circ"], "Ë": ["E", "uml"],
  "Ì": ["I", "grave"], "Í": ["I", "acute"], "Î": ["I", "circ"], "Ï": ["I", "uml"],
  "Ò": ["O", "grave"], "Ó": ["O", "acute"], "Ô": ["O", "circ"], "Õ": ["O", "tilde"], "Ö": ["O", "uml"],
  "Ù": ["U", "grave"], "Ú": ["U", "acute"], "Û": ["U", "circ"], "Ü": ["U", "uml"],
  "Ñ": ["N", "tilde"], "Ý": ["Y", "acute"], "Ÿ": ["Y", "uml"],
  "Ā": ["A", "macron"], "Ē": ["E", "macron"], "Ī": ["I", "macron"], "Ō": ["O", "macron"], "Ū": ["U", "macron"],
};

interface Glyph { w: number; h: number; top: number; bits: Uint8Array; }

const cache = new Map<string, Glyph>();

function fromRows(s: string, trim: boolean): Glyph {
  const rows = 7;
  let minC = 5, maxC = -1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < 5; c++) if (s[r * 5 + c] === "#") { minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
  if (!trim || maxC < 0) { minC = 0; maxC = 4; }
  const w = maxC - minC + 1;
  const bits = new Uint8Array(w * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < w; c++) bits[r * w + c] = s[r * 5 + c + minC] === "#" ? 1 : 0;
  return { w, h: rows, top: 0, bits };
}

let rasterCanvas: HTMLCanvasElement | null = null;
let cjk = false;
export function setFontLocale(locale: string): void {
  const next = /^(ja|ko|zh)/i.test(locale);
  if (next !== cjk) { cjk = next; for (const k of [...cache.keys()]) if (!G[k] && !ACCENTED[k]) cache.delete(k); }
}

function raster(ch: string): Glyph {
  if (!rasterCanvas) { rasterCanvas = document.createElement("canvas"); rasterCanvas.width = 24; rasterCanvas.height = 16; }
  const ctx = rasterCanvas.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, 24, 16);
  ctx.font = cjk ? 'bold 11px "Noto Sans CJK JP", "Noto Sans CJK SC", "PingFang SC", "Hiragino Sans", "Microsoft YaHei", sans-serif' : "bold 10px Verdana, Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  ctx.fillText(ch, 1, 11);
  const m = ctx.measureText(ch);
  const img = ctx.getImageData(0, 0, 24, 16).data;
  let minC = 24, maxC = -1, minR = 16, maxR = -1;
  for (let r = 0; r < 16; r++) for (let c = 0; c < 24; c++) if (img[(r * 24 + c) * 4 + 3] > 110) { minC = Math.min(minC, c); maxC = Math.max(maxC, c); minR = Math.min(minR, r); maxR = Math.max(maxR, r); }
  if (maxC < 0) return { w: Math.max(2, Math.round(m.width)), h: 1, top: 0, bits: new Uint8Array(Math.max(2, Math.round(m.width))) };
  const w = maxC - minC + 1, h = maxR - minR + 1;
  const bits = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) bits[r * w + c] = img[((r + minR) * 24 + c + minC) * 4 + 3] > 110 ? 1 : 0;
  // baseline at canvas row 11 maps to font row 7
  return { w, h, top: minR - 4, bits };
}

function glyph(ch: string): Glyph {
  let g = cache.get(ch);
  if (g) return g;
  if (ch === " ") g = { w: 3, h: 7, top: 0, bits: new Uint8Array(21) };
  else if (G[ch]) g = fromRows(G[ch], !/[0-9]/.test(ch));
  else if (ACCENTED[ch]) {
    const [base, acc] = ACCENTED[ch];
    const b = fromRows(G[base], false);
    const a = ACC[acc];
    const bits = new Uint8Array(5 * 9);
    for (let i = 0; i < 10; i++) bits[i] = a[i] === "#" ? 1 : 0;
    bits.set(b.bits, 10);
    g = { w: 5, h: 9, top: -2, bits };
  } else if (ch === "Ç") {
    const b = fromRows(G.C, false);
    const bits = new Uint8Array(5 * 9);
    bits.set(b.bits, 0);
    bits[7 * 5 + 2] = 1; bits[8 * 5 + 1] = 1;
    g = { w: 5, h: 9, top: 0, bits };
  } else g = raster(ch);
  cache.set(ch, g);
  return g;
}

export function prep(s: string): string[] {
  return Array.from(s.toUpperCase().replace(/ß/g, "SS"));
}

export function textWidth(s: string, scale = 1): number {
  const chars = prep(s);
  let w = 0;
  for (const ch of chars) w += glyph(ch).w + 1;
  return Math.max(0, w - 1) * scale;
}

export interface TextOpts {
  scale?: number;
  align?: "left" | "center" | "right";
  /** Per-row colours for a vertical gradient (indexed by glyph row 0..6). */
  grad?: Col[];
  outline?: Col;
  shadow?: Col;
  /** Max width in pixels: the scale shrinks (down to 1) to fit. */
  maxW?: number;
}

const masks = new WeakMap<DrawSurface, Uint8Array>();

/** Draw text with top-left (or aligned) at x, y (y = top of cap height). Returns width drawn. */
export function drawText(fb: DrawSurface, s: string, x: number, y: number, col: Col, o: TextOpts = {}): number {
  const W = fb.w, H = fb.h;
  let mask = masks.get(fb);
  if (!mask) { mask = new Uint8Array(W * H); masks.set(fb, mask); }
  let scale = o.scale ?? 1;
  let tw = textWidth(s, scale);
  if (o.maxW && tw > o.maxW) {
    while (scale > 1 && textWidth(s, scale) > o.maxW) scale--;
    tw = textWidth(s, scale);
  }
  if (o.align === "center") x -= tw / 2;
  else if (o.align === "right") x -= tw;
  x = Math.round(x); y = Math.round(y);
  const chars = prep(s);
  // rasterise into mask: 1 = glyph, row index stored for gradient
  let minX = W, maxX = -1, minY = H, maxY = -1;
  let cx = x;
  const cells: { x: number; y: number; row: number }[] = [];
  for (const ch of chars) {
    const g = glyph(ch);
    for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) {
      if (!g.bits[r * g.w + c]) continue;
      const gy = r + g.top;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const px = cx + c * scale + sx, py = y + gy * scale + sy;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        cells.push({ x: px, y: py, row: Math.max(0, Math.min(6, gy)) });
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
    cx += (g.w + 1) * scale;
  }
  if (!cells.length) return tw;

  if (o.shadow !== undefined) {
    for (const p of cells) { const sx = p.x + 1, sy = p.y + 1; if (sx < W && sy < H) fb.pset(sx, sy, o.shadow); }
  }
  if (o.outline !== undefined) {
    for (const p of cells) mask[p.y * W + p.x] = 1;
    const oc = o.outline;
    for (const p of cells) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const qx = p.x + dx, qy = p.y + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        if (!mask[qy * W + qx]) fb.pset(qx, qy, oc);
      }
    }
    for (const p of cells) mask[p.y * W + p.x] = 0;
  }
  const grad = o.grad;
  for (const p of cells) fb.pset(p.x, p.y, grad ? grad[p.row] ?? col : col);
  return tw;
}

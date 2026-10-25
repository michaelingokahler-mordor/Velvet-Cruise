// Real software-renderer samples; no SDK, player profile or browser storage.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildBaseline } from './helpers/baseline.mjs';

const out = resolve('output/elevation/gallery'); mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url), { PNG } = require('pngjs');
const contents = ['core/fb', 'core/materials', 'core/font', 'game/track', 'game/race', 'game/render', 'game/themes', 'game/coursemap', 'game/ui'].map(p => `export * from './src/${p}';`).join('\n');
await build({ stdin: { contents, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: resolve(out, 'current.cjs'), define: { __DEMO_A__: 'false', 'import.meta.env.VITE_LOCAL_SERVICES': '"false"' } });
await buildBaseline('4536338', contents, resolve(out, 'baseline.cjs'));
globalThis.ImageData = class { constructor(w, h) { this.data = new Uint8ClampedArray(w * h * 4); } };
const current = require(resolve(out, 'current.cjs')), baseline = require(resolve(out, 'baseline.cjs'));
const png = name => PNG.sync.read(readFileSync(name));
const atlas = png('assets/sprites/atlas.png'), frames = JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
const sprites = new Map();
for (const [name, f] of Object.entries(frames)) {
  const data = new Uint32Array(f.w * f.h);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const i = ((f.y + y) * atlas.width + f.x + x) * 4, [r, g, b, alpha] = atlas.data.subarray(i, i + 4);
    if (alpha < 128) continue;
    const a = f.emissive && current.emissivePixel(name, r, g, b, x, y, f.w, f.h) ? 254 : 255;
    data[y * f.w + x] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  const spr = { w: f.w, h: f.h, data };
  if (f.w >= 24 && f.h >= 24 && !/^(cheer_|crash_|car_|coupe_|sports_|beetle_|pickup_|van_|truck_|trophy|icon_|wx_)/.test(name)) {
    spr.mip = current.halve(spr); if (spr.mip.w >= 12 && spr.mip.h >= 12) spr.mip.mip = current.halve(spr.mip);
  }
  sprites.set(name, spr);
}
for (const key of new Set([...current.THEMES.flatMap(t => [t.sky, t.far]), 'course_map'])) {
  const p = png(`assets/bg/${key}.png`), data = new Uint32Array(p.width * p.height);
  for (let i = 0; i < data.length; i++) { const o = i * 4; if (p.data[o + 3] >= 128) data[i] = ((255 << 24) | (p.data[o + 2] << 16) | (p.data[o + 1] << 8) | p.data[o]) >>> 0; }
  sprites.set(key, { w: p.width, h: p.height, data });
}
const bank = { get: name => sprites.get(name), has: name => sprites.has(name) };
const oldMap = PNG.sync.read(execFileSync('git', ['show', '4536338:assets/bg/course_map.png']));
const oldMapSprite = { w: oldMap.width, h: oldMap.height, data: Uint32Array.from({ length: oldMap.width * oldMap.height }, (_, i) => {
  const o = i * 4; return ((oldMap.data[o + 3] << 24) | (oldMap.data[o + 2] << 16) | (oldMap.data[o + 1] << 8) | oldMap.data[o]) >>> 0;
}) };
const baselineBank = { get: name => name === 'course_map' ? oldMapSprite : bank.get(name), has: bank.has };
const save = (fb, name) => { const p = new PNG({ width: fb.w, height: fb.h }); p.data = Buffer.from(fb.img.data); writeFileSync(resolve(out, name), PNG.sync.write(p)); return p; };
function copy(source, dest, x0, y0, scale = 1) {
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
    const from = (y * source.width + x) * 4, to = ((y0 + y * scale + dy) * dest.width + x0 + x * scale + dx) * 4;
    source.data.copy(dest.data, to, from, from + 4);
  }
}
const cases = [
  [6, [0, 1, 6, 7, 14], .12], [3, [0, 1, 2, 3, 4], .12],
  [7, [0, 1, 6, 7, 14], .24], [7, [0, 1, 6, 7, 14], .50], [7, [0, 1, 6, 7, 14], .78],
  [11, [0, 5, 6, 11, 13], .24], [11, [0, 5, 6, 11, 13], .50], [11, [0, 5, 6, 11, 13], .78],
  [14, [0, 1, 6, 7, 14], .72], [14, [0, 1, 6, 7, 14], .97],
];
const overview = new PNG({ width: 640, height: cases.length * 194 }); overview.data.fill(255);
const evidence = [];
for (let row = 0; row < cases.length; row++) {
  const [node, path, progress] = cases[row];
  for (const [column, model] of [[0, baseline], [1, current]]) {
    const track = new model.Track(path), col = path.indexOf(node), stage = track.stages[col], race = new model.Race(track);
    race.warp(col, Math.floor((stage.endSeg - stage.startSeg) * progress)); race.state = 'race'; race.speed = 14000;
    const fb = new model.FB(), renderer = new model.Renderer(fb, bank); renderer.time = 12; renderer.render(race);
    const name = `${model.THEMES[node].id}-${progress}-${column ? 'after' : 'before'}.png`, p = save(fb, name);
    copy(p, overview, column * 320, row * 194 + 14);
    const title = new current.FB(); current.drawText(title, `${column ? 'AFTER' : 'BEFORE'} ${model.THEMES[node].id} ${Math.round(progress * 100)}%`, 2, 2, current.rgb(0xffffff));
    const line = new PNG({ width: 320, height: 14 }); line.data = Buffer.from(title.img.data.slice(0, 320 * 14 * 4)); copy(line, overview, column * 320, row * 194);
    if (column) evidence.push({ node, progress, file: name, roadHeight: race.playerY });
  }
}
writeFileSync(resolve(out, 'before-after.png'), PNG.sync.write(overview));
const mapGallery = new PNG({ width: 640, height: 4 * 180 });
for (let row = 0; row < 4; row++) {
  const node = [12, 13, 4, 14][row];
  for (let col = 0; col < 2; col++) {
    const model = col ? current : baseline, fb = new model.FB(), map = new model.CourseMap();
    const mapBank = col ? bank : baselineBank;
    map.load(JSON.parse(readFileSync('assets/bg/course_map.json'))); map.draw(fb, mapBank, 0, [], 0, node); map.caption(fb, mapBank, node, 73456);
    copy(save(fb, `map-${node}-${col ? 'after' : 'before'}.png`), mapGallery, col * 320, row * 180);
  }
}
writeFileSync(resolve(out, 'course-map-before-after.png'), PNG.sync.write(mapGallery));
writeFileSync(resolve(out, 'samples.json'), JSON.stringify(evidence, null, 2));
console.log(`PASS: ${cases.length} road comparisons and four caption comparisons rendered to ${out}`);

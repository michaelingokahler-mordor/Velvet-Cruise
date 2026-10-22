// Run with Node. PNGJS may also be supplied through NODE_PATH.
// Renders the real software renderer without a browser or any player storage.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const source = resolve(process.argv[2] || '.');
const dest = resolve(process.argv[3] || 'output/palm-cove');
mkdirSync(dest, { recursive: true });
const entry = ['core/fb', 'game/track', 'game/race', 'game/render', 'game/themes', 'game/routes']
  .map(p => `export * from ${JSON.stringify(resolve(source, 'src', p + '.ts'))};`).join('\n');
const bundle = resolve(dest, 'renderer.cjs');
if (!process.argv.includes('--reuse')) await build({ stdin: { contents: entry, resolveDir: source, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
globalThis.ImageData = class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
const { FB, halve, Track, Race, Renderer, THEMES, COAST_PATH } = require(bundle);
const sprites = new Map();
const png = name => PNG.sync.read(readFileSync(resolve(source, name)));
const atlas = png('assets/sprites/atlas.png');
const frames = JSON.parse(readFileSync(resolve(source, 'assets/sprites/atlas.json'))).frames;
for (const [name, f] of Object.entries(frames)) {
  const data = new Uint32Array(f.w * f.h);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const o = ((f.y + y) * atlas.width + f.x + x) * 4;
    const [r, g, b, alpha] = atlas.data.subarray(o, o + 4);
    if (alpha < 128) continue;
    const neon = name.startsWith('neon_');
    const a = f.emissive && (r * .3 + g * .59 + b * .11 > 200 || neon && Math.max(r,g,b) >= 220 && Math.max(r,g,b)-Math.min(r,g,b) >= 90) ? 254 : 255;
    data[y * f.w + x] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  const s = { w: f.w, h: f.h, data };
  if (f.w >= 24 && f.h >= 24 && !/^(cheer_|crash_|car_|coupe_|sports_|beetle_|pickup_|van_|truck_|trophy|icon_|wx_)/.test(name)) {
    s.mip = halve(s); if (s.mip.w >= 12 && s.mip.h >= 12) s.mip.mip = halve(s.mip);
  }
  sprites.set(name, s);
}
for (const key of new Set(THEMES.flatMap(t => [t.sky, t.far]))) {
  const p = png(`assets/bg/${key}.png`), data = new Uint32Array(p.width * p.height);
  for (let i = 0; i < data.length; i++) { const o = i * 4; data[i] = p.data[o+3] >= 128 ? ((255 << 24) | (p.data[o+2] << 16) | (p.data[o+1] << 8) | p.data[o]) >>> 0 : 0; }
  sprites.set(key, { w: p.width, h: p.height, data });
}
const bank = { get: name => sprites.get(name), has: name => sprites.has(name) };
const tr = new Track(COAST_PATH), race = new Race(tr);
const fb = new FB(), renderer = new Renderer(fb, bank);
const strings = JSON.parse(readFileSync(resolve(source, 'assets/ui/strings.json'))).strings;
renderer.label = id => strings.find(s => s.id === id)?.text ?? id;
const save = name => { const p = new PNG({ width: 320, height: 180 }); p.data = Buffer.from(fb.img.data); writeFileSync(resolve(dest, name + '.png'), PNG.sync.write(p)); };
const shots = [6, 40, 100, 160, 240, 360, 560, 780, 1150, 1700, 2600, 4000, 5600];
for (const pos of shots) {
  race.position = pos * 300; race.playerX = -.25; race.playerY = race.roadY(race.playerZ); race.cars.length = 0; race.carsBySeg.clear();
  renderer.time = 0; renderer.render(race); save(`stage1-${pos}`);
}
for (const pos of [6, 40, 160]) for (const side of [-1, 1]) {
  race.position = pos * 300; race.playerX = side * 1.5; race.playerY = race.roadY(race.playerZ); renderer.render(race); save(`stage1-${pos}-edge${side}`);
}
// Freeze the camera and animate only the water, to inspect the sparkle cycle.
// Compare against the same final frame with glints disabled: terrain, beach,
// rocks and the guardrail still occlude the reflection through normal drawing.
const water=[];
const drawGlints=renderer.glints;
for (const pos of [2600,4000]) for(let frame=0;frame<12;frame++) {
  race.position=pos*300; race.playerX=-.25; race.playerY=race.roadY(race.playerZ);
  renderer.time=frame/6; renderer.render(race);
  const lit=fb.data.slice(); save(`water-${pos}-${frame}`);
  renderer.glints=()=>{};
  try { renderer.render(race); } finally { renderer.glints=drawGlints; }
  let pixels=0;
  for(let i=0;i<lit.length;i++) if(lit[i]!==fb.data[i]) pixels++;
  water.push({pos,frame,visibleReflectionPixels:pixels});
}
writeFileSync(resolve(dest,'water-reflections.json'),JSON.stringify(water,null,2));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const contracts = tr.stages.map(st => ({ node: st.node,
  road: hash(tr.segs.slice(st.startSeg,st.endSeg+1).map(s => [s.i,s.y1,s.y2,s.curve,s.fo,s.fork,s.wallH,s.wallOff,s.wallRH,s.wallROff,s.soft,s.rail,s.beach,s.gate,s.ice])),
  collisions: hash(tr.segs.slice(st.startSeg,st.endSeg+1).flatMap(s => s.sprites.filter(p=>p.hit>0).map(p=>[s.i,p.name,p.x,p.y,p.hit,p.br]))) }));
const plots = tr.segs.filter(s=>s.cove?.plot?.houseSegment===s.i).map(s=>({i:s.i,...s.cove.plot}));
writeFileSync(resolve(dest,'contracts.json'),JSON.stringify({stages:tr.stages,startTime:tr.startTime,contracts,plots},null,2));
// Deterministic physics regression: every coast checkpoint and the goal must remain reachable.
const bot = new Race(new Track(COAST_PATH)); bot.aiPlan = [0,1,1,1,1];
for (let i=0; i<60*600 && bot.state!=='goal' && bot.state!=='over'; i++) bot.update(1/60, bot.autopilot(1/60,.97));
const result = {state:bot.state,stage:bot.stage,stageTimes:bot.stageTimes,runTime:bot.runTime,score:bot.score,path:bot.track.path};
writeFileSync(resolve(dest,'autopilot.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({screenshots:shots.length+6,waterFrames:water.length,plots:plots.length,autopilot:result},null,2));
const timings=[];
for(let i=0;i<160;i++) {
  race.position=(160+i*9)*300; race.playerY=race.roadY(race.playerZ);
  const t=performance.now(); renderer.render(race); const ms=performance.now()-t;
  if(i>=30) timings.push(ms);
}
timings.sort((a,b)=>a-b);
const timing={environment:'Node software renderer, no browser presentation',frames:timings.length,medianMs:timings[Math.floor(timings.length*.5)],p95Ms:timings[Math.floor(timings.length*.95)]};
writeFileSync(resolve(dest,'timing.json'),JSON.stringify(timing,null,2));
console.log(JSON.stringify(timing,null,2));

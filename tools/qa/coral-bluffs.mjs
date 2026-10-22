// Run with Node. PNGJS may also be supplied through NODE_PATH.
// Renders the real software renderer without a browser or any player storage.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const source = resolve(process.argv[2] || '.');
const dest = resolve(process.argv[3] || 'output/coral-bluffs/after');
mkdirSync(dest, { recursive: true });
const entry = ['core/fb', 'game/track', 'game/race', 'game/render', 'game/themes', 'game/routes', 'game/terrain', 'game/bluffs']
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


// Identical simulation cameras before and after the look pass, including heading.
race.aiPlan=[0,1,1,1,1];
const st=tr.stages[1], samples=[], framesToCheck=new Map();
let nextShot=0;
const referenceHomes=[6570,7818,8731,9566,10589,11520,7297];
for(const i of referenceHomes) framesToCheck.set(i-55,`village-${i}`);
const timings=[];
for(let tick=0;tick<60*600 && race.state!=='goal' && race.state!=='over';tick++) {
  race.update(1/60,race.autopilot(1/60,.97));
  if(race.stage===1) {
    const seg=tr.seg(race.position);
    let name=null;
    if(race.stageTime>=nextShot) {
      name=`coral-${String(samples.length).padStart(2,'0')}`;
      samples.push({file:name+'.png',seconds:Math.round(race.stageTime*10)/10,segment:seg.i,curve:seg.curve});
      nextShot+=5;
    }
    for(const [i,file] of framesToCheck) if(seg.i>=i) {framesToCheck.delete(i); renderer.time=race.runTime;renderer.render(race);save(file);}
    if(name || tick%30===0) {
      renderer.time=race.runTime;const start=performance.now();renderer.render(race);timings.push(performance.now()-start);
      if(name) save(name);
    }
    // Inspect clearance from both edges at the strongest left bends.
    if(name && [2,3,13].includes(samples.length-1)) {
      const x=race.playerX;
      for(const side of [-1,1]) {race.playerX=side*1.5;renderer.render(race);save(`${name}-edge${side}`);}
      race.playerX=x;
    }
  }
}
const result={state:race.state,stage:race.stage,stageTimes:race.stageTimes,runTime:race.runTime,score:race.score,path:race.track.path};
writeFileSync(resolve(dest,'autopilot.json'),JSON.stringify(result,null,2));
timings.sort((a,b)=>a-b);
const plots=tr.segs.filter(s=>s.bluffs?.plot?.houseSegment===s.i).map(s=>({i:s.i,worldY:s.bluffs.plot.worldY}));
const summary={samples,plots,homes:plots.length,autopilot:result,timing:{environment:'Node software renderer, not Windows FPS',frames:timings.length,medianMs:timings[Math.floor(timings.length*.5)],p95Ms:timings[Math.floor(timings.length*.95)]}};
writeFileSync(resolve(dest,'review.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({samples:samples.length,plots:plots.length,autopilot:result,timing:summary.timing},null,2));

// Run with Node. PNGJS may also be supplied through NODE_PATH.
// Renders the real software renderer without a browser or any player storage.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const source = resolve(process.argv[2] || '.');
const dest = resolve(process.argv[3] || 'output/stage-refresh/after');
mkdirSync(dest, { recursive: true });
const entry = ['core/fb', 'game/track', 'game/race', 'game/render', 'game/themes', 'game/routes', 'game/terrain', 'game/bluffs', 'game/config', 'game/landscape', 'game/lights', 'core/materials']
  .map(p => `export * from ${JSON.stringify(resolve(source, 'src', p + '.ts'))};`).join('\n');
const bundle = resolve(dest, 'renderer.cjs');
if (!process.argv.includes('--reuse')) await build({ stdin: { contents: entry, resolveDir: source, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
globalThis.ImageData = class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
const mod = require(bundle);
const { FB, halve, Track, Race, Renderer, THEMES, COAST_PATH } = mod;
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
    const a = f.emissive && mod.emissivePixel(name,r,g,b,x,y,f.w,f.h) ? 254 : 255;
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
const views=resolve(dest,'views');mkdirSync(views,{recursive:true});
const strings=JSON.parse(readFileSync(resolve(source,'assets/ui/strings.json'))).strings;
const routes=[[0,5,8,9,10],[0,5,6,11,12],[0,1,6,7,13],[0,1,2,7,14],[0,1,2,3,4]];
const visited=new Set(),stages=[],runs=[],renderTimes=new Map();
const fractions=[.02,.13,.26,.40,.55,.70,.84,.94];
const makeSave=(fb,file)=>{const p=new PNG({width:320,height:180});p.data=Buffer.from(fb.img.data);writeFileSync(resolve(views,file),PNG.sync.write(p));};
for(const path of routes) {
  const tr=new Track(path),race=new Race(tr),fb=new FB(),renderer=new Renderer(fb,bank);
  renderer.label=id=>strings.find(s=>s.id===id)?.text??id;
  race.aiPlan=path.map((n,c)=>c===0?0:mod.NEXT[path[c-1]][0]===n?-1:1);
  const fresh=new Set(path.filter(n=>!visited.has(n))),records=new Map();
  let tick=0;
  for(;tick<60*720&&race.state!=='goal'&&race.state!=='over';tick++) {
    race.update(1/60,race.autopilot(1/60,.97));
    const node=race.node;
    if(!fresh.has(node)) continue;
    const st=tr.stages[race.stage],seg=tr.seg(race.position);
    const progress=(seg.i-st.startSeg)/(st.endSeg-st.startSeg);
    if(!records.has(node)) {
      const th=THEMES[node],ss=tr.segs.filter(s=>s.theme===node);
      records.set(node,{node,id:th.id,name:renderer.label(th.nameKey),column:race.stage+1,path,weather:th.weather??'clear',dark:th.dark??null,terrain:!!th.terrain,wall:th.wall,wallR:th.wallR??null,shape:mod.themeShape(th,race.stage),startSeg:st.startSeg,endSeg:st.endSeg,segments:ss.length,props:ss.reduce((n,s)=>n+s.sprites.length,0),solidProps:ss.reduce((n,s)=>n+s.sprites.filter(p=>p.hit>0&&p.y<=50).length,0),tunnelSegments:ss.filter(s=>s.tunnel).length,iceSegments:ss.filter(s=>s.ice>0).length,shots:[],features:new Set(),next:0});
    }
    const rec=records.get(node);let tag=null;
    if(rec.next<fractions.length&&progress>=fractions[rec.next]) tag='view-'+String(++rec.next).padStart(2,'0');
    const upcoming=tr.segs.slice(seg.i+15,seg.i+75);
    for(const [key,condition] of [
      ['left-bend',seg.curve < -2.8&&progress>.06&&progress<.88],
      ['right-bend',seg.curve > 2.8&&progress>.06&&progress<.88],
      ['tunnel',seg.tunnel],['ice',upcoming.some(s=>s.ice>.2)],
      ['sign',upcoming.some(s=>s.sprites.some(p=>p.name==='hwy_sign'))],
      ['fork',seg.fork>=0],
    ]) if(!tag&&condition&&!rec.features.has(key)) {tag=key;rec.features.add(key);}
    if(tick%12===0||tag) {
      renderer.time=race.runTime;const t=performance.now();renderer.render(race);
      if(!renderTimes.has(node))renderTimes.set(node,[]);renderTimes.get(node).push(performance.now()-t);
    }
    if(tag) {
      const file=`${String(node+1).padStart(2,'0')}-${THEMES[node].id}-${tag}.png`;
      makeSave(fb,file);
      rec.shots.push({tag,file,segment:seg.i,progress:+progress.toFixed(4),seconds:+race.stageTime.toFixed(2),curve:+seg.curve.toFixed(4),kmh:race.kmh,weather:{rain:race.weatherAmt('rain'),snow:race.weatherAmt('snow'),sand:race.weatherAmt('sand')},ice:race.iceAmt,tunnel:race.tunnelAmt});
    }
  }
  for(const rec of records.values()) {delete rec.features;delete rec.next;stages.push(rec);visited.add(rec.node);}
  const result={path:race.track.path,state:race.state,stage:race.stage,node:race.node,stageTimes:race.stageTimes,runTime:race.runTime,score:race.score,ticks:tick};runs.push(result);console.log(JSON.stringify(result));
}
stages.sort((a,b)=>a.node-b.node);
for(const s of stages){const ts=renderTimes.get(s.node).sort((a,b)=>a-b);s.renderTiming={environment:'Node software drawing, excludes browser/HUD/presentation',frames:ts.length,medianMs:ts[Math.floor(ts.length*.5)],p95Ms:ts[Math.floor(ts.length*.95)]};}
writeFileSync(resolve(dest,'audit-data.json'),JSON.stringify({capturedAt:new Date().toISOString(),method:'Actual software renderer, five full autopilot routes at 60 Hz simulation; scene captures without HUD. Weather renders every 12 simulation ticks. Particle randomness is not seeded.',stages,runs},null,2));
console.log(JSON.stringify({stages:stages.length,images:stages.reduce((n,s)=>n+s.shots.length,0),missing:THEMES.filter((_,i)=>!visited.has(i)).map(t=>t.id)}));

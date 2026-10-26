import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('output/directional-weather-2026-10-25');
mkdirSync(out, { recursive: true });
await build({ stdin: { contents: ['core/fb', 'game/race', 'game/track', 'game/difficulty', 'game/config', 'game/render'].map(p => `export * from './src/${p}';`).join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: resolve(out, 'current.cjs') });
globalThis.ImageData = class { constructor(w, h) { this.data = new Uint8ClampedArray(w * h * 4); } };
const require = createRequire(import.meta.url);
const { Race, Track, DIFFS, MAX_SPEED, SEG_LEN, PLAYER_Z, Renderer, FB, rgb } = require(resolve(out, 'current.cjs'));
const tracks = new Map();
function track(path) { const key = path.join(','); if (!tracks.has(key)) tracks.set(key, new Track(path)); return tracks.get(key); }
const paths = { clear: [0, 1, 2, 3, 4], rain: [0, 5, 6, 11, 13], snow: [0, 5, 6, 11, 13], fog: [0, 1, 6, 7, 13], sand: [0, 5, 8, 9, 10], night: [0, 1, 2, 3, 4] };
const nodes = { clear: 0, rain: 5, snow: 11, fog: 7, sand: 8, night: 4 };
const checks = [], failures = [], measurements = {};
function test(name, fn) { try { fn(); checks.push(name); } catch (e) { failures.push({ name, message: e.message }); } }
function near(a, b, note, tolerance = 1e-6) { assert.ok(Math.abs(a - b) < tolerance, `${note}: ${a} != ${b}`); }
function setup(kind = 'clear', diff = DIFFS[1]) {
  const tr = track(paths[kind]), r = new Race(tr, false, 0, diff);
  r.warp(paths[kind].indexOf(nodes[kind]), 1200); r.stageBlend = { from: nodes[kind], to: nodes[kind], t: 1 };
  r.state = 'race'; r.timer = 100000; r.playerX = 0; r.speed = MAX_SPEED * .8;
  r.updateBlend = () => {}; r.effects = () => {}; r.collide = () => {}; r.density = () => 0; r.cars = [];
  return r;
}
function playerStep(forward, speed, curve = 0) {
  const r = setup(); r.updateTraffic = () => {}; r.updateWeather = () => {};
  r.windForward = forward; r.gust = 0; r.speed = MAX_SPEED * speed;
  // This probe isolates wind; grade/wind combinations have their own regression suite.
  const local = Array.from({length:12},(_,k)=>r.track.seg(r.playerZ+(k-6)*SEG_LEN));
  const heights = local.map(s=>({y1:s.y1,y2:s.y2}));
  for(const s of local)s.y1=s.y2=0;
  const s = r.playerSeg, saved = s.curve; s.curve = curve;
  r.update(1 / 60, { steer: 0, throttle: 1, brake: 0 });
  s.curve = saved; local.forEach((s,k)=>Object.assign(s,heights[k])); return { speed: r.speed / MAX_SPEED, x: r.playerX };
}
test('headwind imposes the selected 90% top speed', () => near(playerStep(-1, .95).speed, .9, 'headwind speed cap'));
test('tailwind permits speeds above the former cap', () => assert.ok(playerStep(1, 1.09).speed > 1.09));
test('tailwind never exceeds 110% and calm restores 100%', () => {
  near(playerStep(1, 1.2).speed, 1.1, 'tailwind cap'); near(playerStep(0, 1.2).speed, 1, 'calm cap');
});
test('tailwind adds exactly 25% curve pull at equal speed', () => near(playerStep(1, .6, 1.8).x / playerStep(0, .6, 1.8).x, 1.25, 'tailwind curve pull'));
test('headwind does not add a separate curve penalty', () => near(playerStep(-1, .6, 1.8).x / playerStep(0, .6, 1.8).x, 1, 'headwind curve pull'));

test('gust directions cover all quadrants and use a separate random stream', () => {
  const a = setup('sand'), b = setup('sand');
  const quadrants = new Set();
  for (let i = 0; i < 60 * 180; i++) {
    a.updateWeather(1 / 60); b.rand(); b.rand(); b.updateWeather(1 / 60);
    near(a.gust, b.gust, 'traffic RNG must not alter wind');
    near(a.windForward, b.windForward, 'traffic RNG must not alter forward wind');
    if (Math.abs(a.gust) + Math.abs(a.windForward) > .05) quadrants.add(`${Math.sign(a.gust)},${Math.sign(a.windForward)}`);
  }
  assert.equal(quadrants.size, 4); measurements.quadrants = [...quadrants];
});
test('wind expires to zero and does not act on a tunnel road', () => {
  const r = setup('sand'); r.gustT = .001; r.gustDur = 1.7; r.gustAngle = .4;
  r.updateWeather(1 / 60); near(r.gust, 0, 'expired side wind'); near(r.windForward, 0, 'expired forward wind');
  const s = r.playerSeg, saved = s.tunnel; s.tunnel = true;
  r.gustT = 1; r.gustDur = 2; r.updateWeather(0);
  near(r.gust, 0, 'tunnel side wind'); near(r.windForward, 0, 'tunnel forward wind'); s.tunnel = saved;
});
 test('sand haze remains visible without moving particles across the road', () => {
  const fb = new FB(), renderer = new Renderer(fb, { get: () => undefined, has: () => false });
  fb.clear(rgb(0)); renderer.sandstorm(1, rgb(0xc07840)); const first = [...fb.data];
  renderer.time = 2; fb.clear(rgb(0)); renderer.sandstorm(1, rgb(0xc07840));
  assert.ok(first.every(p => p !== rgb(0))); assert.deepEqual([...fb.data], first);
  measurements.hazePixels = first.length;
 });
function npcTrial(kind, diff = DIFFS[1], { ice = false, wind = false, curve = 0, ticks = 120, startX = .25 } = {}) {
  const r = setup(kind, diff), z = r.playerZ + 20 * SEG_LEN;
  const c = { ...r.makeCar(z), z, x: startX, targetX: startX, base: MAX_SPEED * .65, speed: MAX_SPEED * .65 };
  r.cars = [c]; r.rand = () => .999;
  const nearby = Array.from({ length: 50 }, (_, i) => r.track.seg(z + i * SEG_LEN));
  const saved = nearby.map(s => ({ curve: s.curve, ice: s.ice, iceL: s.iceL, iceR: s.iceR }));
  for (const s of nearby) { s.curve = curve; s.ice = ice ? 1 : 0; s.iceL = -1.15; s.iceR = 1.15; }
  if (wind) { r.gustT = 1; r.gustDur = 2; r.gustAngle = Math.PI / 2; r.updateWeather(0); }
  let maxX = 0;
  for (let i = 0; i < ticks; i++) { c.z = z; r.updateTraffic(1 / 60); maxX = Math.max(maxX, Math.abs(c.x)); }
  nearby.forEach((s, i) => Object.assign(s, saved[i]));
  return { speed: c.speed / MAX_SPEED, x: c.x, maxX };
}
test('NPCs slow down for rain, snow, fog, sand and darkness', () => {
  const dry = npcTrial('clear'); measurements.npc = { dry };
  for (const kind of ['rain', 'snow', 'fog', 'sand', 'night']) {
    const wet = npcTrial(kind); measurements.npc[kind] = wet;
    assert.ok(wet.speed < dry.speed * .95, kind + ' must lower target speed');
  }
});
test('NPCs respond to rain curves, local ice and crosswind', () => {
  const dry = npcTrial('clear', DIFFS[1], { curve: 2 });
  const rain = npcTrial('rain', DIFFS[1], { curve: 2 });
  const snow = npcTrial('snow', DIFFS[1], { curve: 2 });
  const ice = npcTrial('snow', DIFFS[1], { curve: 2, ice: true });
  const wind = npcTrial('sand', DIFFS[1], { wind: true });
  assert.ok(rain.x < dry.x - .005, 'rain changes curve movement');
  assert.ok(ice.x < snow.x - .005, 'local ice changes curve movement');
  assert.ok(wind.x > .255, 'crosswind moves the NPC');
  assert.ok(ice.speed < snow.speed, 'ice lowers target speed');
  measurements.npcForces = { dry, rain, snow, ice, wind };
});
test('NPC weather response is Easy on all three difficulties', () => {
  for (const [kind, options] of [['rain', { curve: 2 }], ['snow', { curve: 2, ice: true }], ['sand', { wind: true }]]) {
    const runs = DIFFS.map(d => npcTrial(kind, d, options));
    for (const run of runs.slice(1)) { near(run.speed, runs[0].speed, kind + ' speed'); near(run.x, runs[0].x, kind + ' drift'); }
  }
});
test('NPC road bounds hold on prolonged ice and wind in an outer lane', () => {
  for (const [kind, options] of [['snow', { curve: -5, ice: true, ticks: 1800, startX: .75 }], ['sand', { wind: true, ticks: 1800, startX: .75 }]]) {
    const result = npcTrial(kind, DIFFS[2], options);
    assert.ok(result.maxX < .9, kind + ' stays on the road');
  }
});
test('NPC light decisions include bad weather at the NPC position', () => {
  for (const kind of ['rain', 'snow', 'fog', 'sand', 'night']) {
    const r = setup(kind), c = { ...r.makeCar(r.playerZ + 6000), lightAt: .619 };
    assert.equal(typeof r.carLightsOn, 'function', 'one shared front/rear light decision');
    assert.equal(r.carLightsOn(c), true, kind);
  }
});

test('cautious bad-weather traffic leaves the left passing lane available', () => {
  for (const kind of ['rain', 'snow', 'fog', 'sand', 'night']) {
    const r = setup(kind);
    for (let i = 0; i < 40; i++) {
      r.cars = [];
      const c = r.makeCar(r.playerZ + 6000 + i * 300);
      assert.ok(c && c.x > -.5, kind + ' must prefer the three right-hand lanes');
    }
  }
});

test('NPC weather comes from its own position beyond a stage transition', () => {
  const r = setup('rain'), boundary = r.track.themeStart(2);
  r.position = (boundary - 20) * SEG_LEN - PLAYER_Z;
  r.stageBlend = { from: 5, to: 5, t: 1 }; r.rand = () => .999;
  const make = z => ({ ...r.makeCar(z), z, x: .25, targetX: .25, base: MAX_SPEED * .6, speed: MAX_SPEED * .6 });
  const wet = make((boundary - 10) * SEG_LEN), dry = make((boundary + 250) * SEG_LEN);
  const start = [wet.z, dry.z]; r.cars = [wet, dry];
  for (let i = 0; i < 180; i++) { wet.z = start[0]; dry.z = start[1]; r.updateTraffic(1 / 60); }
  assert.ok(dry.speed > wet.speed * 1.04, 'clear NPC must not inherit the player rain penalty');
  assert.equal(r.carLightsOn({ ...dry, lightAt: .619 }), false, 'clear car keeps its own daylight');
  assert.equal(r.carLightsOn({ ...wet, lightAt: .619 }), true, 'wet car uses rain lights');
});

test('slower traffic is followed without NPC overlap in ice and fog', () => {
  for (const kind of ['snow', 'fog']) {
    const r = setup(kind); r.rand = () => .999;
    const z = r.playerZ + 6000;
    const rear = { ...r.makeCar(z), z, x: .25, targetX: .25, base: MAX_SPEED * .75, speed: MAX_SPEED * .75 };
    const front = { ...rear, z: z + 14000, base: MAX_SPEED * .25, speed: MAX_SPEED * .25 };
    r.cars = [rear, front];
    let minGap = Infinity;
    for (let i = 0; i < 360; i++) {
      r.position = rear.z - PLAYER_Z - 6000;
      r.updateTraffic(1 / 60);
      minGap = Math.min(minGap, front.z - rear.z);
      assert.ok(Math.abs(rear.x) < .9 && Math.abs(front.x) < .9, 'traffic stays on road');
    }
    assert.ok(minGap >= 1750 * 1.5, kind + ': cars keep a vehicle-length gap');
  }
});

test('simultaneous truck merges reserve their lane and never overlap in fog', () => {
  const r = setup('fog'), z = r.playerZ + 6000;
  const hw = 96 * (1522 / 140) / 2 / 2900;
  const make = x => ({ ...r.makeCar(z), z, x, targetX: x, hw, sprite: 'truck_white', base: MAX_SPEED * .2, speed: MAX_SPEED * .2 });
  const a = make(-.75), b = make(.25); r.cars = [a, b];
  const decisions = [0, .75, 0, .25]; r.rand = () => decisions.shift() ?? .999;
  const ss = Array.from({ length: 300 }, (_, i) => r.track.seg(z + i * SEG_LEN));
  const saved = ss.map(s => ({ curve: s.curve, ice: s.ice }));
  for (const s of ss) { s.curve = 0; s.ice = 0; }
  try {
    for (let tick = 0; tick < 600; tick++) {
      r.position = a.z - PLAYER_Z - 6000; r.updateTraffic(1 / 60);
      assert.ok(Math.abs(a.x - b.x) >= a.hw + b.hw || Math.abs(a.z - b.z) >= 1750, 'trucks physically overlap at tick ' + tick);
    }
  } finally { ss.forEach((s, i) => Object.assign(s, saved[i])); }
});

test('the attract/test driver creates a safe gap to pass parallel slow traffic', () => {
  const r = setup('rain', DIFFS[2]); r.playerX = -.75; r.aiLane = 0; r.speed = MAX_SPEED * .5;
  r.updateTraffic = () => {};
  r.cars = [
    { ...r.makeCar(r.playerZ + 28 * SEG_LEN), z: r.playerZ + 28 * SEG_LEN, x: -.75, targetX: -.75, hw: .13, speed: MAX_SPEED * .5 },
    { ...r.makeCar(r.playerZ + 3 * SEG_LEN), z: r.playerZ + 3 * SEG_LEN, x: -.25, targetX: -.25, hw: .13, speed: MAX_SPEED * .5 },
  ];
  let minClearance = Infinity;
  for (let i = 0; i < 600; i++) {
    r.update(1 / 60, r.autopilot(1 / 60, .997));
    for (const c of r.cars) {
      c.z += c.speed / 60;
      if (Math.abs(c.z - r.playerZ) < 1750) minClearance = Math.min(minClearance, Math.abs(c.x - r.playerX));
    }
  }
  assert.ok(r.aiLane >= 2 && r.playerX > .1, 'driver must find the clear right-hand lanes');
  assert.ok(r.speed > MAX_SPEED * .8, 'driver must resume cruising');
  assert.ok(minClearance > .28, 'overtake must leave room beside each car');
});

test('the test driver predicts closing speed before crossing an occupied lane', () => {
  const r = setup('rain'); r.playerX = -.75; r.aiLane = 0; r.speed = MAX_SPEED * .97;
  r.updateTraffic = () => {}; r.collide = Race.prototype.collide;
  r.cars = [
    { ...r.makeCar(r.playerZ + 24 * SEG_LEN), z: r.playerZ + 24 * SEG_LEN, x: -.75, targetX: -.75, hw: .13, speed: MAX_SPEED * .4 },
    { ...r.makeCar(r.playerZ + 18 * SEG_LEN), z: r.playerZ + 18 * SEG_LEN, x: -.25, targetX: -.25, hw: .13, speed: MAX_SPEED * .4 },
  ];
  let crashes = 0; r.events.crash = () => crashes++;
  for (let i = 0; i < 180; i++) {
    r.update(1 / 60, r.autopilot(1 / 60, .997));
    for (const c of r.cars) c.z += c.speed / 60;
  }
  assert.equal(crashes, 0, 'a lane clear now may be occupied when the player crosses it');
});

test('the test driver passes seeded rain and sand traffic without crossing into a car', () => {
  const r = new Race(new Track([0, 5, 8, 9, 10]), false, 0, DIFFS[1]);
  r.aiPlan = [0, -1, -1, -1, -1]; let crashes = 0;
  r.events.crash = () => crashes++;
  for (let i = 0; i < 60 * 242 && r.state !== 'over'; i++) r.update(1 / 60, r.autopilot(1 / 60, .997));
  assert.equal(crashes, 0, 'seeded overtake must allow for closing speed and the swept lanes');
});

test('the test driver brakes by closing distance when every passing lane is blocked', () => {
  const r = setup('clear'); r.playerX = -.25; r.aiLane = 1; r.speed = MAX_SPEED * .97;
  r.updateTraffic = () => {}; r.collide = Race.prototype.collide;
  const make = (x, distance) => ({ ...r.makeCar(r.playerZ + distance * SEG_LEN), z: r.playerZ + distance * SEG_LEN, x, targetX: x, hw: .13, speed: MAX_SPEED * .28 });
  r.cars = [make(-.25, 60), make(-.75, 3), make(.25, 3), make(.75, 3)];
  let crashes = 0; r.events.crash = () => crashes++;
  for (let i = 0; i < 180; i++) {
    r.update(1 / 60, r.autopilot(1 / 60, .997));
    for (const c of r.cars) c.z += c.speed / 60;
  }
  assert.equal(crashes, 0, 'braking preview must include relative stopping distance');
});

test('the test driver finishes the seeded slow-fog route before time expires', () => {
  const r = new Race(new Track([0, 5, 6, 7, 13]), false, 0, DIFFS[2]);
  r.aiPlan = [0, -1, 1, 1, -1];
  for (let i = 0; i < 60 * 600 && r.state !== 'goal' && r.state !== 'over'; i++) r.update(1 / 60, r.autopilot(1 / 60, .997));
  assert.equal(r.state, 'goal', 'slow fog traffic must remain passable with the unchanged clock');
});

const report = { status: failures.length ? 'FAIL' : 'PASS', checks, failures, measurements };
writeFileSync(resolve(out, 'validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;

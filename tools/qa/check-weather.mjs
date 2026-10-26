// Real Race.update wind/handling probes and NPC light rendering with the shipped atlas.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('output/weather-2026-10-25');
mkdirSync(out, { recursive: true });
const label = process.argv.find(a => a.startsWith('--label='))?.slice(8) ?? 'after';
assert.match(label, /^[a-z-]+$/);
const measureOnly = process.argv.includes('--measure-only');
const modules = ['core/fb', 'game/track', 'game/race', 'game/render', 'game/config', 'game/difficulty', 'game/themes', 'game/lights'];
const bundle = resolve(out, `${label}.cjs`);
await build({ stdin: { contents: modules.map(p => `export * from './src/${p}';`).join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
globalThis.ImageData = class { constructor(w, h) { this.data = new Uint8ClampedArray(w * h * 4); } };
const require = createRequire(import.meta.url);
const { Track, Race, Renderer, FB, DIFFS, THEMES, MAX_SPEED, SEG_LEN, CAM_H, carLights, rgb } = require(bundle);
const { PNG } = require('pngjs');
const failures = [], checks = [];
function check(name, fn) { try { fn(); checks.push(name); } catch (e) { failures.push({ name, error: e.message }); } }
function near(actual, expected, message, tolerance = 1e-6) { assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual} != ${expected}`); }
const coast = new Track([0, 1, 2, 3, 4]);
const desert = new Track([0, 5, 8, 9, 10]);
function raceAt(diff, track = coast, stage = 0) {
  const r = new Race(track, false, 0, diff);
  r.warp(stage, 1200); r.state = 'race'; r.timer = 100000; r.playerX = 0; r.speed = MAX_SPEED * .8;
  // Isolate handling from traffic collisions, stage changes and cosmetic particle RNG.
  r.updateTraffic = () => {}; r.updateBlend = () => {}; r.collide = () => {}; r.effects = () => {};
  return r;
}
function bend(diff, weather, ice = false) {
  const r = raceAt(diff), s = r.playerSeg;
  const saved = { curve: s.curve, ice: s.ice, iceL: s.iceL, iceR: s.iceR };
  r.weatherAmt = kind => kind === weather ? 1 : 0; r.updateWeather = () => {};
  s.curve = 2.2; s.ice = ice ? 1 : 0; s.iceL = -1.15; s.iceR = 1.15; r.iceAmt = s.ice;
  const position = r.position;
  // Let actual ice inertia settle; report the steady lateral movement per frame.
  for (let i = 0; i < (ice ? 1800 : 1); i++) {
    r.position = position; r.playerX = 0; r.speed = MAX_SPEED * .8;
    r.update(1 / 60, { steer: 0, throttle: 1, brake: 0 });
  }
  const result = r.playerX; Object.assign(s, saved); return result;
}
const handling = DIFFS.map(d => {
  const dry = bend(d, 'clear');
  return { difficulty: d.id, rainExtraPercent: (bend(d, 'rain') / dry - 1) * 100, snowExtraPercent: (bend(d, 'snow') / dry - 1) * 100, iceAndSnowFactor: bend(d, 'snow', true) / dry };
});
if (!measureOnly) for (const [i, want] of [[0, [15, 10, 2.2]], [1, [21, 15, 2.415]], [2, [25, 20, 2.64]]]) {
  check(`${DIFFS[i].id}: requested rain/snow/full-ice movement`, () => {
    near(handling[i].rainExtraPercent, want[0], 'rain drift');
    near(handling[i].snowExtraPercent, want[1], 'snow drift');
    near(handling[i].iceAndSnowFactor, want[2], 'full ice including snow');
  });
}

function windPulse(diff, speed = .8, countersteer = false) {
  const r = raceAt(diff, desert, 2), s = r.playerSeg, curve = s.curve;
  s.curve = 0; r.stageBlend = { from: 8, to: 8, t: 1 };
  const position = r.position; r.seed = r.windSeed = 123456; r.gustT = 0; r.gustDur = 0;
  r.updateWeather(1 / 60);
  r.gustAngle = Math.PI / 2; r.updateWeather(0); // same duration, a pure crosswind
  const duration = r.gustDur, direction = Math.sign(Math.sin(r.gustAngle));
  let peakLanesPerSecond = 0, elapsed = 0, drift = 0;
  while (r.gustDur > 0 && elapsed < 7) {
    r.position = position; r.speed = MAX_SPEED * speed;
    r.playerX = 0; const before = r.playerX;
    const ctl = countersteer ? r.autopilot(1 / 60, speed) : { steer: 0, throttle: 1, brake: 0 };
    r.update(1 / 60, ctl); elapsed += 1 / 60; drift += r.playerX - before;
    peakLanesPerSecond = Math.max(peakLanesPerSecond, Math.abs(r.playerX - before) * 120);
  }
  const result = { difficulty: diff.id, kmh: Math.round(speed * 293), duration, direction, driftLanes: drift * 2, peakLanesPerSecond, countersteer };
  s.curve = curve; return result;
}
const wind = DIFFS.flatMap(d => [windPulse(d), windPulse(d, .2)]);
for (let i = 0; i < 3; i++) check(`${DIFFS[i].id}: real wind pulse and low-speed attenuation`, () => {
  const [fast, slow] = wind.slice(i * 2, i * 2 + 2);
  assert.ok(fast.duration >= 4 && fast.duration <= 6);
  assert.ok(Math.abs(fast.driftLanes) > .55, 'pulse must move the unsteered car appreciably');
  near(slow.driftLanes / fast.driftLanes, .5, 'half force at 20% of top speed');
  assert.ok(Math.abs(fast.driftLanes) > 2.3 * [1,1.45,1.85][i] && Math.abs(fast.driftLanes) < 3.6 * [1,1.45,1.85][i], 'longer gust adds displacement');
  near(fast.peakLanesPerSecond, [.92,1.334,1.702][i], 'unchanged peak force', .003);
});

// Load the same RGBA pixels as the game. A present light switch is insufficient
// if an NPC sprite has no usable rear-light lenses.
const atlas = PNG.sync.read(readFileSync('assets/sprites/atlas.png'));
const frames = JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
const sprites = new Map();
for (const [name, f] of Object.entries(frames)) {
  const data = new Uint32Array(f.w * f.h);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const p = ((f.y + y) * atlas.width + f.x + x) * 4;
    if (atlas.data[p + 3] >= 128) data[y * f.w + x] = rgb((atlas.data[p] << 16) | (atlas.data[p + 1] << 8) | atlas.data[p + 2]);
  }
  sprites.set(name, { w: f.w, h: f.h, data });
}
const bank = { get: name => sprites.get(name), has: name => sprites.has(name) };
const carNames = Object.keys(frames).filter(n => /^(coupe_|sports_|beetle_|pickup_|van_|truck_)/.test(n));
check('every NPC model has drawable rear-light lenses', () => {
  assert.equal(carNames.length, 13);
  for (const name of carNames) assert.ok(carLights(bank, name)?.tail.data.some(p => p !== 0), name);
});
const visualWind = 'windsock directions covered by check-road-effects.mjs';

const lighting = [];
const lightingPaths = [[0, 1, 2, 3, 4], [0, 5, 8, 9, 10], [0, 5, 6, 11, 12], [0, 1, 6, 7, 13], [0, 1, 2, 7, 14]];
const lightingTracks = lightingPaths.map(path => new Track(path));
for (const [condition, node] of [['day', 0], ['night', 10], ['dusk', 12], ['fog', 7], ['snow', 11], ['rain', 5], ['twilight', 4], ['lake', 13], ['summit', 14]]) {
  const track = lightingTracks.find(t => t.path.includes(node));
  const r = raceAt(DIFFS[1], track, track.path.indexOf(node)); r.stageBlend = { from: node, to: node, t: 1 };
  const fb = new FB(), renderer = new Renderer(fb, bank); renderer.night = r.night; renderer.race = r;
  const sample = r.makeCar(r.playerZ + 3000), s = { ...r.playerSeg, cx1: 0, cx2: 0, y1: 0, y2: 0 };
  // Probe the real renderer for the complete driver switch-on range, not only
  // the average driver. Keep projection flat so neither hills nor scenery hide it.
  let rearOn = 0, frontOn = 0;
  const total = 200;
  for (let i = 0; i < total; i++) {
    const car = { ...sample, z: r.playerZ + 3000, x: 0, sprite: carNames[i % carNames.length], lightAt: .12 + (i + .5) / total * .5 };
    const light = carLights(bank, car.sprite), blit = fb.blit;
    let tailDrawn = false;
    fb.blit = function(sprite, ...args) { if (sprite === light.tail) tailDrawn = true; return blit.call(this, sprite, ...args); };
    fb.clear(rgb(0x302d42));
    renderer.car(car, s, 0, CAM_H, r.position, [1, 1, 1], .4, rgb(0xa0a0a0));
    fb.blit = blit;
    if (tailDrawn) rearOn++;
    r.cars = [car]; renderer.prepareLights(r);
    if (renderer.headSources.length === 2) frontOn++; // player + NPC
  }
  lighting.push({ condition, stage: THEMES[node].id, darkness: r.night, testedDrivers: total, rearOn, frontOn, rearPercent: rearOn / total * 100 });
  const image = new PNG({ width: 320, height: 180 }); image.data = Buffer.from(fb.img.data);
  writeFileSync(resolve(out, `${label}-npc-${condition}.png`), PNG.sync.write(image));
}
check('all NPC headlights and rear lights render at night and in rain/fog/snow', () => {
  for (const item of lighting.filter(x => ['night', 'rain', 'fog', 'snow', 'twilight', 'lake', 'summit'].includes(x.condition))) {
    assert.equal(item.rearOn, item.testedDrivers, item.condition + ' rear');
    assert.equal(item.frontOn, item.testedDrivers, item.condition + ' front');
  }
});
check('clear daylight keeps NPC driving lights off', () => assert.equal(lighting[0].rearOn, 0));

// NPC force, following and local-weather behavior is covered by check-directional-weather.mjs.
const report = { status: failures.length ? 'FAIL' : measureOnly ? 'MEASURED' : 'PASS', method: 'Current source bundled afresh; real Race.update at 60 Hz; isolated straight-road gusts without countersteering, fixed sampling position and speed; actual sprite atlas and NPC rendering. No physical controller or human feel test.', handling, wind, visualWind, lighting, checks, failures };
writeFileSync(resolve(out, `${label}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;

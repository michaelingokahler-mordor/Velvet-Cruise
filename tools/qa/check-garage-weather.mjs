import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('output/garage-weather'); mkdirSync(out, { recursive: true });
await build({ stdin: { contents: "export * from './src/game/race';export * from './src/game/track';export * from './src/game/cars';export * from './src/core/fb';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: resolve(out, 'model.cjs'), define: { __DEMO_A__: 'false', 'import.meta.env.VITE_LOCAL_SERVICES': '"false"' } });
const model = createRequire(import.meta.url)(resolve(out, 'model.cjs'));
const { Race, Track, CARS } = model;
const tests = [], failures = [];
function test(name, fn) { try { fn(); tests.push(name); } catch (e) { failures.push({ name, error: e.message }); } }
const track = new Track([0, 5, 6, 11, 13]);
test('account goal unlock survives reload before account badges load', () => {
  assert.equal(typeof model.rememberCarGoals,'function','Missing persistent account goal cache');
  const values=new Map([['car','comet'],['scores','untouched']]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const first=model.rememberCarGoals(['goal-d'],storage,'goals');
  assert.equal(model.carUnlocked(model.carById('comet'),first),true);
  const offline=model.rememberCarGoals([],storage,'goals');
  assert.equal(model.carUnlocked(model.carById('comet'),offline),true);
  assert.equal(values.get('car'),'comet');assert.equal(values.get('scores'),'untouched');
  values.set('goals','["goal-a","unknown"]');
  assert.deepEqual([...model.rememberCarGoals(['goal-e'],storage,'goals')].sort(),['goal-a','goal-e']);
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.deepEqual([...model.rememberCarGoals(['goal-b'],blocked,'goals')],['goal-b']);
});
test('rain and snow use aligned closed skins while dry stages remain open', () => {
  for (const car of CARS) {
    const race = new Race(track); race.skin = car.skin;
    assert.ok(race.roof, 'Missing weather roof state');
    race.warp(1, 500); assert.equal(race.visualSkin, car.skin + '_closed');
    race.warp(2, 500); assert.equal(race.visualSkin, car.skin);
    race.warp(3, 500); assert.equal(race.visualSkin, car.skin + '_closed');
    race.warp(4, 500); assert.equal(race.visualSkin, car.skin);
    assert.equal(race.skin, car.skin, 'Saved/analytics identity must not become a roof variant');
  }
});
test('roof moves through intermediate frames, with hysteresis and no tunnel reopening', () => {
  const r = new Race(track); assert.ok(r.roof, 'Missing weather roof state');
  const roof = r.roof; roof.reset(0);
  const phases = new Set([roof.phase]);
  for (let i = 0; i < 45; i++) { roof.update(1, 1/60); phases.add(roof.phase); }
  assert.deepEqual([...phases], [0, 1, 2, 3]);
  roof.update(.10, 1); assert.equal(roof.phase, 3, 'weak remaining rain must not flap the roof');
  roof.update(.03, 1); assert.equal(roof.phase, 0);
  r.warp(1, 500); r.state = 'race'; r.timer = 200; r.tunnelAmt = 1;
  for (let i=0;i<45;i++) r.update(1/60, { steer:0, throttle:0, brake:0 });
  assert.equal(r.roof.phase, 3);
});
test('weather roof changes neither car position nor handling', () => {
  const a = new Race(track), b = new Race(track); assert.ok(a.roof, 'Missing weather roof state');
  for (const r of [a,b]) { r.warp(2,500); r.state='race'; r.timer=200; r.speed=12000; }
  b.roof.reset(1);
  for (let i=0;i<30;i++) for (const r of [a,b]) r.update(1/60,{steer:.2,throttle:1,brake:0});
  for (const key of ['position','playerX','playerY','speed','score','timer']) assert.equal(a[key],b[key],key);
  assert.equal(a.carScreenX(),b.carScreenX()); assert.equal(a.carScreenY(),b.carScreenY());
});
test('six stable car identities follow the approved first-goal unlock mapping', () => {
  assert.equal(CARS.length,6,'Missing two new native cars');
  assert.equal(typeof model.carUnlocked,'function');
  const available = goals => CARS.filter(c=>model.carUnlocked(c,new Set(goals))).map(c=>c.id);
  assert.deepEqual(available([]),['rosso']);
  for (const [goal,id] of [['a','toro'],['b','stallion'],['c','speedster'],['d','comet'],['e','azure']])
    assert.deepEqual(available(['goal-'+goal]).sort(), ['rosso',id].sort());
  assert.equal(available(['goal-a','goal-b','goal-c','goal-d','goal-e']).length,6);
  for(const id of ['rosso','toro','speedster','stallion']) assert.equal(model.carById(id).id,id);
});
const report = { status: failures.length ? 'FAIL' : 'PASS', tests, failures };
writeFileSync(resolve(out,'runtime-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2)); assert.deepEqual(failures,[]);

import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildBaseline } from './helpers/baseline.mjs';

const out = resolve('output/elevation');
mkdirSync(out, { recursive: true });
const contents = "export * from './src/game/track'; export * from './src/game/themes'; export * from './src/game/routes';";
await build({ stdin: { contents, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: resolve(out, 'current.cjs'), define: { __DEMO__: 'false' } });
await buildBaseline('4536338', contents, resolve(out, 'baseline.cjs'));
const require = createRequire(import.meta.url), now = require(resolve(out, 'current.cjs')), old = require(resolve(out, 'baseline.cjs'));
const tests = [], failures = [];
function test(name, fn) { try { fn(); tests.push(name); } catch (error) { failures.push({ name, message: error.message.slice(0, 500) }); } }
const changed = new Set([3, 6, 7, 11, 14]);
const routes = [];
function visit(path) { const next = now.NEXT[path.at(-1)]; if (next.length) next.forEach(n => visit([...path, n])); else routes.push(path); }
visit([0]);
const examples = new Map();
const clocks = t => ({ start: t.startTime, gates: t.segs.filter(s => s.gate).map(s => [s.i, s.gate]) });
const heights = t => t.segs.map(s => [s.y1, s.y2]);
const collisions = t => {
  const hash = createHash('sha256');
  for (const s of t.segs) for (const p of s.sprites) if (p.hit > 0) hash.update(JSON.stringify([s.i, p.name, p.x, p.y, p.scale, p.hit, p.br]));
  return hash.digest('hex');
};
for (const path of routes) {
  const a = new old.Track(path), b = new now.Track(path);
  test('same distance, curves, tunnels, collisions and clocks: ' + path, () => {
    assert.equal(b.segs.length, a.segs.length); assert.deepEqual(clocks(b), clocks(a)); assert.deepEqual(b.stages, a.stages);
    assert.equal(collisions(b), collisions(a), 'active obstacles are unchanged');
    for (let i = 0; i < a.segs.length; i++) {
      assert.equal(b.segs[i].curve, a.segs[i].curve); assert.equal(b.segs[i].tunnel, a.segs[i].tunnel);
      if (!changed.has(b.segs[i].theme)) assert.deepEqual([b.segs[i].y1, b.segs[i].y2], [a.segs[i].y1, a.segs[i].y2]);
    }
  });
  test('continuous bounded grades: ' + path, () => {
    for (let i = 1; i < b.segs.length; i++) {
      const s = b.segs[i], previous = b.segs[i - 1];
      assert.equal(s.y1, previous.y2, 'height step at ' + i);
      assert.ok(Number.isFinite(s.y2));
      if (changed.has(s.theme)) assert.ok(Math.abs(s.y2 - s.y1) < 120, 'unsafe grade at ' + i);
    }
  });
  for (const st of b.stages) if (changed.has(st.node) && !examples.has(st.node)) examples.set(st.node, { stage: st, samples: b.segs.slice(st.startSeg, st.endSeg).map(s => [s.y1, s.y2]), checkpoint: b.segs.slice(st.midSeg, st.midSeg + 120).map(s => s.y2 - s.y1), afterGoal: st.node === 14 ? b.segs.slice(st.endSeg).map(s => [s.y1, s.y2]) : [] });
}
const sample = (node, p) => { const { samples } = examples.get(node); return samples[Math.min(samples.length - 1, Math.floor(samples.length * p))][0]; };
const stats = node => {
  const ss = examples.get(node).samples;
  return { id: now.THEMES[node].id, rise: ss.at(-1)[1] - ss[0][0], range: Math.max(...ss.map(s => s[1])) - Math.min(...ss.map(s => s[0])), uphill: ss.filter(s => s[1] - s[0] > .1).length / ss.length };
};
test('Starlight Summit climbs for most of the stage and keeps its raised finish', () => {
  const s = stats(14); assert.ok(s.rise >= 25000, 'summit needs a substantial net climb'); assert.ok(s.uphill >= .7, 'summit should be mostly uphill');
  const { afterGoal } = examples.get(14), height = afterGoal[0][0];
  assert.ok(afterGoal.every(s => s[0] === height && s[1] === height), 'post-goal road stays on summit plateau');
});
for (const node of [7, 11]) test(now.THEMES[node].id + ' climbs, crosses a flat middle, then descends', () => {
  const center = sample(node, .5);
  assert.ok(center - sample(node, .05) > 17000, 'pass needs an extended ascent');
  for (const p of [.43, .47, .53, .57]) assert.ok(Math.abs(sample(node, p) - center) < .001, 'central pass section must be flat');
  assert.ok(center - sample(node, .95) > 17000, 'pass needs an extended descent');
  assert.ok(Math.abs(stats(node).rise) < .001, 'pass returns to its entrance elevation');
});
test('Snowcap has a larger height difference than Redwood', () => assert.ok(stats(11).range > stats(7).range * 1.2));
for (const [node, height] of [[6, 15000], [3, 10000]]) test(now.THEMES[node].id + ' has deliberate repeated hills', () => {
  const peaks = [.15, .37, .62, .83], valleys = [.05, .25, .5, .72, .99];
  assert.ok(stats(node).range >= height, 'rolling hills need stronger height differences');
  assert.ok(peaks.filter(p => sample(node, p) > 6000).length >= 3, 'three clearly raised crests');
  assert.ok(valleys.filter(p => sample(node, p) < 5000).length >= 3, 'separate valleys between crests');
});
test('checkpoint platforms remain flat on every authored stage', () => {
  for (const node of changed) assert.ok(examples.get(node).checkpoint.every(dy => Math.abs(dy) < .001), now.THEMES[node].id);
});
test('late fork choices reproduce the same elevations without new scenery differences', () => {
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const lazy = (model, path) => { const t = new model.Track(); for (let c = 1; c < path.length; c++) t.choose(c, path[c]); for (let i = 0; i < 5; i++) t.step(); return t; };
  const sceneryDifferences = (a, b) => a.segs.flatMap((s, i) => JSON.stringify(s.sprites) === JSON.stringify(b.segs[i].sprites) ? [] : [i]);
  for (const path of [[0, 5, 6, 11, 13], [0, 1, 6, 7, 14], [0, 1, 2, 3, 4]]) {
    assert.ok(now.validPath(path));
    const t = lazy(now, path);
    const fresh = new now.Track(path); assert.equal(hash(heights(t)), hash(heights(fresh)), 'same heights'); assert.deepEqual(clocks(t), clocks(fresh));
    // The original engine keeps already-dressed fork approach props after a
    // choice. The height profiles must not add any further rebuild mismatch.
    assert.deepEqual(sceneryDifferences(t, fresh), sceneryDifferences(lazy(old, path), new old.Track(path)));
  }
});
const report = { status: failures.length ? 'FAIL' : 'PASS', routes: routes.length, tests, failures, stages: [...changed].map(stats) };
writeFileSync(resolve(out, 'validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
assert.deepEqual(failures, []);

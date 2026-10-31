import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { testDatabase } from './online-test-db.mjs';

mkdirSync('output/online-tests', { recursive: true });
await build({ entryPoints: ['server/worker.ts'], outfile: 'output/online-tests/client-worker.mjs', bundle: true, platform: 'node', format: 'esm' });
const worker = (await import(pathToFileURL(resolve('output/online-tests/client-worker.mjs')))).default;
const DB = testDatabase(readFileSync('server/migrations/0001_rankings.sql', 'utf8') + readFileSync('server/migrations/0003_driver_tags.sql', 'utf8'));
const env = { DB, ALLOWED_ORIGINS: 'http://127.0.0.1:4187' };
const originals = new Map([
  ['sunset-coast-run.arcade.tour2', JSON.stringify({ normal: [{ n: 'LOCAL', s: 98765, c: 'red', d: 1 }] })],
  ['sunset-coast-run.stage-bests.tour2', '{"normal":{"0":12345}}'],
  ['sunset-coast-run.local-badges', '{"earned":["existing"],"counts":{}}'],
]);
let storage = new Map([...originals, ['sunset-coast-run.name', 'ALICE']]);
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
globalThis.document = { baseURI: 'http://127.0.0.1:4187/', getElementById: () => null };
globalThis.location = { hash: '' };
globalThis.window = { addEventListener() {} };
let offline = false, malformed = false, requests = 0;
globalThis.fetch = async (input, options = {}) => {
  requests++;
  const url = new URL(String(input), document.baseURI);
  if (url.pathname === '/online.json') return Response.json({ apiBase: 'https://rankings.test' });
  if (offline) throw new TypeError('offline');
  if (malformed && url.pathname.startsWith('/scores')) return Response.json({ improved: true, best: 'garbage', entries: [{ rank: -1, score: '<script>', displayName: 'BAD' }] });
  return worker.fetch(new Request(url, { ...options, headers: { ...options.headers, Origin: 'http://127.0.0.1:4187', 'CF-Connecting-IP': '192.0.2.2' } }), env);
};
async function load(name, local = true, demo = false) {
  const outfile = resolve(`output/online-tests/${name}.mjs`);
  await build({ stdin: { contents: "export * from './src/platform/services'; export * from './src/platform/online-scores'; export * from './src/game/arcade';", resolveDir: process.cwd(), loader: 'ts' }, outfile, bundle: true, platform: 'node', format: 'esm', define: { __DEMO__: String(demo), 'import.meta.env.VITE_LOCAL_SERVICES': JSON.stringify(String(local)) } });
  const api = await import(pathToFileURL(outfile));
  await api.initServices();
  return api;
}
// Bundle only the existing platform for the initial RED observation.
const initialFile = resolve('output/online-tests/initial-client.mjs');
await build({ entryPoints: ['src/platform/services.ts'], outfile: initialFile, bundle: true, platform: 'node', format: 'esm', define: { __DEMO__: 'false', 'import.meta.env.VITE_LOCAL_SERVICES': '"true"' } });
const initial = await import(pathToFileURL(initialFile));
await initial.initServices();
assert.equal(initial.servicesOnline(), true, 'A configured standalone website must use the Cloudflare ranking service');

const alice = await load('alice');
await Promise.all([alice.submitScore('score-normal-tour2', 1200), alice.submitScore('run-normal-tour2', 350000)]);
await alice.flushOnlineScores();
assert.equal((await alice.topScores('score-normal-tour2'))[0].displayName, 'ALICE');
assert.equal((await alice.topScores('score-normal-tour2'))[0].you, true);
assert.equal((await DB.prepare('SELECT count(*) AS n FROM profiles').first()).n, 1, 'Concurrent score/time submissions use one profile');
for (const [key, value] of originals) assert.equal(storage.get(key), value, `Existing local save preserved: ${key}`);
assert.equal(await alice.myBest('score-normal-tour2'), 1200);
offline = true;
await alice.submitScore('score-normal-tour2', 1800);
await alice.submitScore('score-normal-tour2', 1600);
await alice.flushOnlineScores();
assert.equal(await alice.myBest('score-normal-tour2'), 1800);
assert.equal(JSON.parse(storage.get('sunset-coast-run.online-pending'))['score-normal-tour2'], 1800);
assert.equal(alice.servicesOnline(), false);
alice.saveName('ALICE NEW');
offline = false;
await alice.flushOnlineScores();
assert.equal((await alice.topScores('score-normal-tour2'))[0].displayName, 'ALICE NEW');
assert.equal((await alice.topScores('score-normal-tour2'))[0].score, 1800);
assert.deepEqual(JSON.parse(storage.get('sunset-coast-run.online-pending')), {});
malformed = true;
await alice.submitScore('score-hard-tour2', 5000);
await alice.flushOnlineScores();
assert.equal(JSON.parse(storage.get('sunset-coast-run.online-pending'))['score-hard-tour2'], 5000, 'Malformed success cannot discard pending score');
assert.deepEqual(await alice.topScores('score-normal-tour2'), []);
malformed = false;
await alice.flushOnlineScores();
const aliceSave = storage;
storage = new Map([['sunset-coast-run.name', 'BOB']]);
const bob = await load('bob');
await bob.submitScore('score-normal-tour2', 2200);
await bob.flushOnlineScores();
assert.deepEqual((await bob.topScores('score-normal-tour2')).map(e => e.displayName), ['BOB', 'ALICE NEW']);
assert.equal((await bob.topScores('score-normal-tour2'))[0].you, true);
assert.equal(aliceSave.get('sunset-coast-run.arcade.tour2'), originals.get('sunset-coast-run.arcade.tour2'));

// A fresh page reads its pending queue, but does not upload historical locals.
storage = new Map([['sunset-coast-run.name', 'RELOAD'], ['sunset-coast-run.online-pending', '{"score-easy-tour2":3200}'], ['sunset-coast-run.local-bests', '{"score-hard-tour2":99999}']]);
const restored = await load('restored');
await restored.flushOnlineScores();
assert.equal((await restored.topScores('score-easy-tour2'))[0].score, 3200);
assert.equal((await restored.topScores('score-hard-tour2')).some(e => e.score === 99999), false);

// Node's real Web Locks implementation exercises the same cross-tab lock API.
const { locks } = await import('node:worker_threads');
Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
storage = new Map([['sunset-coast-run.name', 'TWO TABS']]);
const tabA = await load('tab-a'), tabB = await load('tab-b');
const countBeforeTabs = (await DB.prepare('SELECT count(*) AS n FROM profiles').first()).n;
await Promise.all([tabA.submitScore('score-easy-tour2', 4200), tabB.submitScore('score-hard-tour2', 4300)]);
await Promise.all([tabA.flushOnlineScores(), tabB.flushOnlineScores()]);
assert.equal((await DB.prepare('SELECT count(*) AS n FROM profiles').first()).n, countBeforeTabs + 1, 'Two tabs share one identity even on simultaneous first submissions');
const tabProfile = JSON.parse(storage.get('sunset-coast-run.online-profile'));
await DB.prepare('DELETE FROM scores WHERE profile_id=?').bind(tabProfile.id).run();
await DB.prepare('DELETE FROM profiles WHERE id=?').bind(tabProfile.id).run();
assert.equal((await tabB.topScores('score-normal-tour2')).length, 2, 'Invalid credentials must not block public ranking reads');
assert.equal(tabB.servicesOnline(), true);
assert.equal(JSON.parse(storage.get('sunset-coast-run.online-profile')), null);
await tabA.submitScore('score-hard-tour2', 4400);
await tabA.flushOnlineScores();
assert.notEqual(JSON.parse(storage.get('sunset-coast-run.online-profile')).id, tabProfile.id);
for (const kind of ['demo', 'test-hook']) {
  storage = new Map();
  window.VelvetDesktop = kind === 'desktop' ? {embedded:true} : undefined;
  location.hash = kind === 'test-hook' ? '#autopilot' : '';
  const before = requests;
  const api = await load(kind, true, kind === 'demo');
  await api.submitScore('score-normal-tour2', 7777);
  api.saveName('TEST');
  assert.equal(requests, before, `${kind} must not contact Cloudflare`);
}
DB.close();
console.log('PASS: standalone online boards, two profiles, concurrent submissions, local-save preservation, offline queue/reload/retry, names, malformed responses and demo/desktop/Former platform/test isolation');

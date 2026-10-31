import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { testDatabase } from './online-test-db.mjs';

mkdirSync('output/online-tests', { recursive: true });
let worker = { fetch: async () => new Response('{}', { status: 501 }) };
let DB;
if (existsSync('server/worker.ts')) {
  await build({ entryPoints: ['server/worker.ts'], outfile: 'output/online-tests/worker.mjs', bundle: true, platform: 'node', format: 'esm' });
  worker = (await import(pathToFileURL(resolve('output/online-tests/worker.mjs')))).default;
  DB = testDatabase(readFileSync('server/migrations/0001_rankings.sql', 'utf8') + readFileSync('server/migrations/0003_driver_tags.sql', 'utf8'));
}
const env = { DB, ALLOWED_ORIGINS: 'https://sabnockworks.com,http://127.0.0.1:4187' };
const call = (path, body, profile, origin = 'https://sabnockworks.com', extra = {}) => worker.fetch(new Request('https://rankings.test' + path, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(profile ? { Authorization: `Bearer ${profile.id}.${profile.token}` } : {}), ...extra },
  body: body === undefined ? undefined : JSON.stringify(body),
}), env);
const json = async (...args) => { const r = await call(...args); assert.ok(r.ok, `HTTP ${r.status} for ${args[0]}`); return r.json(); };

assert.equal((await call('/health')).status, 200, 'The dedicated rankings API must answer health');
const a = await json('/profiles', { displayName: 'ALICE' });
const b = await json('/profiles', { displayName: 'BOB' });
assert.notEqual(a.id, b.id);
assert.equal(a.token.length, 64);
assert.deepEqual(await json('/scores/score-normal-tour2', { score: 1200 }, a), { improved: true, best: 1200 });
assert.deepEqual(await json('/scores/score-normal-tour2', { score: 1100 }, a), { improved: false, best: 1200 });
await json('/scores/score-normal-tour2', { score: 2000 }, b);
let board = await json('/scores/score-normal-tour2?limit=7', undefined, a);
assert.deepEqual(board.entries.map(e => [e.rank, e.score, e.displayName, e.you]), [[1, 2000, 'BOB', false], [2, 1200, 'ALICE', true]]);
await json('/scores/run-normal-tour2', { score: 400000 }, a);
await json('/scores/run-normal-tour2', { score: 350000 }, a);
assert.deepEqual(await json('/scores/run-normal-tour2', { score: 450000 }, a), { improved: false, best: 350000 });
await json('/scores/run-normal-tour2', { score: 360000 }, b);
assert.deepEqual((await json('/scores/run-normal-tour2')).entries.map(e => e.score), [350000, 360000]);
assert.deepEqual((await json('/scores/score-hard-tour2')).entries, []);
assert.deepEqual((await json('/scores/score-normal')).entries, [], 'Rulesets stay separate');
await json('/profile', { displayName: 'NEW NAME' }, a);
assert.equal((await json('/scores/score-normal-tour2')).entries[1].displayName, 'NEW NAME');
await Promise.all([json('/scores/score-easy-tour2', { score: 5000 }, a), json('/scores/score-easy-tour2', { score: 4000 }, a)]);
assert.equal((await json('/scores/score-easy-tour2')).entries[0].score, 5000);
assert.equal((await call('/scores/score-normal-tour2', { score: 3000 })).status, 401);
assert.equal((await call('/scores/score-normal-tour2', { score: 3000 }, { ...a, token: '0'.repeat(64) })).status, 401);
for (const score of [-1, 1.5, null, '3000', 100000001]) assert.equal((await call('/scores/score-normal-tour2', { score }, a)).status, 400);
assert.equal((await call('/scores/run-normal-tour2', { score: 199999 }, a)).status, 400);
assert.equal((await call('/scores/no-such-board', { score: 100 }, a)).status, 404);
assert.equal((await call('/scores/score-normal-tour2?limit=1000')).status, 400);
assert.equal((await call('/profiles', { displayName: ' '.repeat(20) })).status, 400);
assert.equal((await call('/profiles', { displayName: 'X'.repeat(100) })).status, 400);
assert.equal((await call('/health', undefined, undefined, 'https://attacker.test')).status, 403);
const preflight = await worker.fetch(new Request('https://rankings.test/scores/score-normal-tour2', { method: 'OPTIONS', headers: { Origin: 'https://sabnockworks.com' } }), env);
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://sabnockworks.com');
assert.equal((await call('/profiles', { displayName: 'X'.repeat(5000) })).status, 413);
const broken = await worker.fetch(new Request('https://rankings.test/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), env);
assert.equal(broken.status, 400);
assert.equal((await call('/profiles', { displayName: 'VALID' }, undefined, 'https://sabnockworks.com', { 'Content-Type': 'text/plain' })).status, 415);
let quota;
for (let i = 0; i < 35; i++) { quota = await call('/profiles', { displayName: 'DRIVER' }); if (quota.status === 429) break; }
assert.equal(quota.status, 429);
assert.equal((await call('/health')).headers.get('Cache-Control'), 'no-store');
DB.close();
console.log('PASS: real SQLite persistence, two players, points/time order, rulesets, concurrent bests, auth, names, bounds, CORS, body limits and quotas');

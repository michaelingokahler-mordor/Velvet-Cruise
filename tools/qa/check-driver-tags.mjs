import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { testDatabase } from './online-test-db.mjs';

const out = path.resolve('output/windows-online-rankings/tests');
fs.mkdirSync(out, { recursive: true });
const migrationPath = 'server/migrations/0003_driver_tags.sql';
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
const initial = fs.readFileSync('server/migrations/0001_rankings.sql', 'utf8');
await build({ entryPoints: ['server/worker.ts'], outfile: path.join(out, 'tag-worker.mjs'), bundle: true, platform: 'node', format: 'esm' });
const worker = (await import(pathToFileURL(path.join(out, 'tag-worker.mjs')))).default;
const DB = testDatabase(initial + migration);
const env = { DB, ALLOWED_ORIGINS: 'https://sabnockworks.com' };
const call = async (endpoint, data, player) => {
  const response = await worker.fetch(new Request('https://rankings.test' + endpoint, { method: data === undefined ? 'GET' : 'POST', headers: { Origin: 'https://sabnockworks.com', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(player ? { Authorization: `Bearer ${player.id}.${player.token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) }), env);
  assert.ok(response.ok, `${endpoint}: HTTP ${response.status}`);
  return response.json();
};
try {
  const first = await call('/profiles', { displayName: 'SAME NAME' });
  assert.match(first.driverTag ?? '', /^[A-F0-9]{8}$/, 'An online profile receives a short public driver tag');
  const originalCrypto = globalThis.crypto;
  let collisions = 0;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
    randomUUID: () => originalCrypto.randomUUID(), subtle: originalCrypto.subtle,
    getRandomValues: array => {
      if (array.length === 4 && collisions++ === 0) { array.set(first.driverTag.match(/../g).map(n => parseInt(n, 16))); return array; }
      return originalCrypto.getRandomValues(array);
    },
  } });
  let second;
  try { second = await call('/profiles', { displayName: 'SAME NAME' }); }
  finally { Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto }); }
  assert.notEqual(second.driverTag, first.driverTag, 'A tag collision retries instead of merging drivers');
  assert.ok(collisions >= 2, 'The colliding allocation was retried');
  await call('/scores/score-normal-tour2', { score: 2000 }, first);
  await call('/scores/score-normal-tour2', { score: 3000 }, second);
  await call('/scores/score-normal-tour2', { score: 2500 }, second);
  const entries = (await call('/scores/score-normal-tour2')).entries;
  assert.equal(entries.length, 2, 'Equal names are different profiles; repeated games do not duplicate a profile');
  assert.deepEqual(entries.map(e => [e.displayName, e.driverTag, e.score]), [['SAME NAME', second.driverTag, 3000], ['SAME NAME', first.driverTag, 2000]]);
  assert.equal('token' in entries[0], false, 'Public tags do not reveal private credentials');
  let queries = 0;
  const countedEnv = { ...env, DB: { prepare(sql) { queries++; return DB.prepare(sql); } } };
  const counted = await worker.fetch(new Request('https://rankings.test/scores/score-normal-tour2?limit=100', { headers: { Origin: 'https://sabnockworks.com' } }), countedEnv);
  assert.equal(counted.status, 200);
  assert.equal(queries, 1, 'Existing tags are read in the leaderboard query, independent of requested row count');
  await call('/profile', { displayName: 'RENAMED' }, first);
  assert.equal((await call('/scores/score-normal-tour2')).entries[1].driverTag, first.driverTag, 'Renaming preserves the driver identifier');

  // An old published Worker can still create profiles between migration and deployment.
  await DB.prepare('INSERT INTO profiles(id,display_name,token_hash,created_at) VALUES(?,?,?,?)').bind('11111111-1111-4111-8111-111111111111', 'LEGACY', 'hash', 1).run();
  await DB.prepare('INSERT INTO scores(profile_id,board,score,achieved_at) VALUES(?,?,?,?)').bind('11111111-1111-4111-8111-111111111111', 'score-hard-tour2', 1500, 1).run();
  const legacy = (await call('/scores/score-hard-tour2')).entries[0];
  assert.match(legacy.driverTag, /^[A-F0-9]{8}$/);
  assert.equal((await call('/scores/score-hard-tour2')).entries[0].driverTag, legacy.driverTag);

  const old = new DatabaseSync(':memory:');
  try {
    old.exec(initial);
    old.exec("INSERT INTO profiles VALUES('aaaaaaaa-0000-4000-8000-000000000001','OLD ONE','hash',1),('aaaaaaaa-0000-4000-8000-000000000002','OLD TWO','hash',2); INSERT INTO scores VALUES('aaaaaaaa-0000-4000-8000-000000000001','score-normal-tour2',1234,1);");
    old.exec(migration);
    assert.equal(old.prepare('SELECT count(DISTINCT tag) AS n FROM driver_tags').get().n, 2, 'Migration handles equal UUID prefixes');
    assert.equal(old.prepare('SELECT score FROM scores').get().score, 1234, 'Migration preserves scores');
    assert.equal(old.prepare('SELECT token_hash FROM profiles LIMIT 1').get().token_hash, 'hash', 'Migration preserves credentials');
  } finally { old.close(); }
  const contract = await build({ entryPoints: ['src/platform/ranking-contract.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} };
  new Function('module', contract.outputFiles[0].text)(module);
  assert.equal(module.exports.rankingDisplayName({ displayName: 'DRIVER', driverTag: 'AB12CD34' }), 'DRIVER#AB12CD34');
  assert.equal(module.exports.rankingDisplayName({ displayName: 'LOCAL' }), 'LOCAL');
  assert.equal(module.exports.rankingDisplayName({ displayName: 'OLD SERVER', driverTag: '<BAD>' }), 'OLD SERVER');
  console.log('PASS: unique persistent driver tags, forced collisions, equal names, old-Worker compatibility and non-destructive migration');
} finally { DB.close(); }

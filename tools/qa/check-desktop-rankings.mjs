import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { testDatabase } from './online-test-db.mjs';

const out = path.resolve('output/windows-online-rankings/tests');
fs.mkdirSync(out, { recursive: true });
await build({ entryPoints: ['server/worker.ts'], outfile: path.join(out, 'worker.mjs'), bundle: true, platform: 'node', format: 'esm' });
const worker = (await import(pathToFileURL(path.join(out, 'worker.mjs')))).default;
const schema = ['0001_rankings.sql', '0002_statistics.sql', '0003_driver_tags.sql'].filter(n => fs.existsSync('server/migrations/' + n)).map(n => fs.readFileSync('server/migrations/' + n, 'utf8')).join('\n');
const DB = testDatabase(schema);
const nativeOrigin = 'velvet-game://game-20261009-93986676';
const env = { DB, ALLOWED_ORIGINS: nativeOrigin + ',https://sabnockworks.com', STATS_ALLOWED_ORIGIN: 'https://sabnockworks.com' };
const bundles = new Map();
async function client({ desktop = true, demo = false, automation = false, debugNative = false, href = nativeOrigin + '/', production = true, values = new Map(), offline = false, stall = false } = {}) {
  const key = [desktop, demo, production].join('-');
  if (!bundles.has(key)) {
    const built = await build({ stdin: { contents: "export * from './src/platform/services'; export * from './src/platform/online-scores'; export * from './src/game/arcade';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, define: { __DEMO__: String(demo), 'import.meta.env.PROD': String(production), 'import.meta.env.VITE_DESKTOP_BUILD': JSON.stringify(String(desktop)), 'import.meta.env.VITE_DESKTOP_RANKINGS': JSON.stringify(String(desktop && !demo)) } });
    bundles.set(key, built.outputFiles[0].text);
  }
  const events = new EventTarget(), timers = new Map(), requests = [];
  const state = { offline, stall, values, requests };
  let timerId = 0;
  const location = new URL(href);
  const context = vm.createContext({ module: { exports: {} }, console, URL, Response, Request, AbortSignal, crypto, TextEncoder, Intl,
    navigator: { webdriver: automation, onLine: !offline, language: 'en-US' }, location,
    document: { baseURI: href, getElementById: () => null },
    window: { ...(desktop ? { VelvetDesktop: { embedded: true, automation: debugNative } } : {}), addEventListener: events.addEventListener.bind(events) },
    localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)) },
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id),
    fetch: async (input, options = {}) => {
      const url = new URL(String(input), href);
      requests.push({ url: url.href, options });
      if (url.pathname.endsWith('/online.json')) return Response.json({ apiBase: 'https://velvet-cruise-api.emerald-hollows.workers.dev' });
      assert.equal(url.origin, 'https://velvet-cruise-api.emerald-hollows.workers.dev', 'No unexpected external request');
      if (state.offline) throw new TypeError('offline');
      if (state.stall) return new Promise(() => {});
      const response = await worker.fetch(new Request(url, { ...options, headers: { ...options.headers, Origin: desktop ? nativeOrigin : location.origin, 'CF-Connecting-IP': '192.0.2.10' } }), env);
      if (state.holdNextScore && options.method === 'POST' && url.pathname.startsWith('/scores/')) {
        state.holdNextScore = false;
        return new Promise(resolve => { state.releaseScore = () => resolve(response); });
      }
      return response;
    },
  });
  vm.runInContext(bundles.get(key), context);
  const api = context.module.exports;
  await api.initServices();
  return { ...state, state, api, events, timers, async retry() { const first = timers.entries().next().value; assert.ok(first, 'A pending upload has an automatic retry'); timers.delete(first[0]); await first[1].fn(); await api.flushOnlineScores(); } };
}

try {
  const localTable = '{"normal":[{"n":"LOCAL ONE","s":12345,"c":"red","d":1}]}';
  const values = new Map([['sunset-coast-run.name', 'DRIVER'], ['sunset-coast-run.arcade.tour2', localTable]]);
  const windows = await client({ values });
  assert.equal(windows.api.servicesOnline(), true, 'Full Windows edition must reach the shared ranking service');
  await windows.api.submitScore('score-normal-tour2', 3200);
  await windows.api.flushOnlineScores();
  assert.equal((await windows.api.topScores('score-normal-tour2'))[0].score, 3200);
  const identity = JSON.parse(values.get('sunset-coast-run.online-profile'));
  assert.equal(values.get('sunset-coast-run.arcade.tour2'), localTable, 'Online submission preserves the local arcade table');
  windows.state.holdNextScore = true;
  await windows.api.submitScore('score-normal-tour2', 3500);
  for (let i = 0; i < 20 && !windows.state.releaseScore; i++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(windows.state.releaseScore);
  await windows.api.submitScore('score-normal-tour2', 3600);
  windows.state.releaseScore();
  await windows.api.flushOnlineScores();
  assert.equal((await windows.api.topScores('score-normal-tour2'))[0].score, 3600, 'Older acknowledgement cannot discard a stronger queued score');
  windows.api.arcadeInsert('normal', { n: 'LOCAL TWO', s: 23456, c: 'red', d: 2 });
  assert.deepEqual(Array.from(windows.api.arcadeTable('normal'), e => e.n), ['LOCAL TWO', 'LOCAL ONE']);

  windows.state.stall = true;
  const result = await Promise.race([windows.api.submitScore('score-normal-tour2', 4100), new Promise((_, reject) => setTimeout(() => reject(new Error('Local results waited for the network')), 200))]);
  assert.equal(result.best, 4100);
  assert.equal(JSON.parse(values.get('sunset-coast-run.online-pending'))['score-normal-tour2'], 4100);
  // Restart with the exact saved profile and queue; no actual user data is involved.
  const restarted = await client({ values, offline: true });
  await restarted.api.submitScore('score-normal-tour2', 5100);
  await restarted.api.submitScore('score-normal-tour2', 4500);
  assert.equal(await restarted.api.myBest('score-normal-tour2'), 5100);
  assert.equal(JSON.parse(values.get('sunset-coast-run.online-pending'))['score-normal-tour2'], 5100);
  restarted.state.offline = false;
  await restarted.retry();
  assert.equal((await restarted.api.topScores('score-normal-tour2'))[0].score, 5100);
  assert.equal(JSON.parse(values.get('sunset-coast-run.online-profile')).id, identity.id);
  assert.equal(Object.keys(JSON.parse(values.get('sunset-coast-run.online-pending'))).length, 0);

  const freshOffline = await client({ offline: true });
  await freshOffline.api.submitScore('score-easy-tour2', 7000);
  freshOffline.state.offline = false;
  freshOffline.events.dispatchEvent(new Event('online'));
  await new Promise(resolve => setTimeout(resolve, 30));
  await freshOffline.api.flushOnlineScores();
  assert.equal((await freshOffline.api.topScores('score-easy-tour2'))[0].score, 7000, 'Connection return uploads without restart');

  const web = await client({ desktop: false, href: 'https://sabnockworks.com/games/more-projects/velvet-cruise/' });
  assert.equal((await web.api.topScores('score-normal-tour2'))[0].score, 5100, 'Web and Windows read the same board');
  for (const options of [{ demo: true }, { automation: true }, { debugNative: true }, { href: nativeOrigin + '/#autopilot' }, { production: false }, { desktop: false, href: 'http://127.0.0.1:5173/' }]) {
    const isolated = await client(options);
    await isolated.api.submitScore('score-normal-tour2', 9999);
    assert.equal(isolated.requests.some(r => r.url.startsWith('https:')), false, 'Excluded runtime cannot reach production');
  }
  assert.equal(windows.requests.some(r => r.url.includes('/stats/')), false, 'Windows rankings do not enable web counters');
  fs.writeFileSync(path.join(out, 'desktop-client.json'), JSON.stringify({ status: 'PASS', checks: ['shared web/native ranking', 'nonblocking local persistence', 'durable best-only offline queue', 'automatic retry and online event', 'profile retention', 'separate local arcade names', 'production exclusions', 'no desktop counters'] }, null, 2));
  console.log('PASS: native/web shared rankings, nonblocking persistence, offline relaunch/retry, stable identity and separate local tables');
} finally { DB.close(); }

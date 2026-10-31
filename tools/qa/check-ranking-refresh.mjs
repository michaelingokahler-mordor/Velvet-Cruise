import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { build } from 'esbuild';

const source = fs.readFileSync('src/main.ts', 'utf8').split('async function boot():')[0];
const built = await build({ stdin: { contents: source + '\nexport {MainScene}; export * from "./platform/services"; export * from "./platform/online-scores";', resolveDir: path.resolve('src'), loader: 'ts' }, write: false, bundle: true, platform: 'node', format: 'cjs', define: { __DEMO_A__: 'false', 'import.meta.env.PROD': 'false' }, plugins: [{ name: 'scene-without-renderer', setup(b) { b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'fixture' })); b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default {Scene:class{}};' })); } }] });
const storage = new Map([['sunset-coast-run.name', 'DRIVER'], ['sunset-coast-run.online-profile', JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', token: 'a'.repeat(64), displayName: 'DRIVER' })]]);
let remote = 3200, acknowledge, delayedRead;
const readQueue = [];
const context = vm.createContext({ module: { exports: {} }, console, URL, Response, AbortSignal, crypto, TextEncoder, setTimeout, clearTimeout,
  ImageData: class { constructor(w, h) { this.data = new Uint8ClampedArray(w * h * 4); } },
  document: { baseURI: 'http://127.0.0.1:4187/', getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) }, window: { addEventListener() {} }, navigator: { language: 'en', webdriver: false }, location: { href: 'http://127.0.0.1:4187/', hash: '', search: '' },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
  fetch: async (input, options = {}) => {
    const url = new URL(String(input), 'http://127.0.0.1:4187/');
    if (url.pathname === '/online.json') return Response.json({ apiBase: 'https://rankings.test' });
    if (url.pathname === '/health') return Response.json({ ok: true, service: 'velvet-cruise' });
    if (options.method === 'POST') return new Promise(resolve => { acknowledge = () => { remote = JSON.parse(options.body).score; resolve(Response.json({ improved: true, best: remote })); }; });
    const payload = { entries: [{ rank: 1, score: remote, displayName: 'DRIVER', driverTag: 'AABBCCDD', you: true }] };
    if (delayedRead) { delayedRead = false; return new Promise(resolve => readQueue.push(() => resolve(Response.json(payload)))); }
    return Response.json(payload);
  },
});
vm.runInContext(built.outputFiles[0].text, context);
const api = context.module.exports;
await api.initServices();
const scene = new api.MainScene();
scene.mode = 'rankings'; scene.rankDiff = 1; scene.rankSel = 0;
api.onServicesReady(() => scene.refreshRankingViews());
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(scene.rankCache.get('score-normal-tour2')[0].score, 3200);
await api.submitScore('score-normal-tour2', 5100);
await new Promise(resolve => setTimeout(resolve, 0));
acknowledge(); await api.flushOnlineScores();
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(scene.rankCache.get('score-normal-tour2')[0].score, 5100, 'Successful background upload refreshes the open board');

// Exercise real scene refresh methods; stale earlier GETs must not replace a newer view.
scene.mode = 'results'; scene.result.score = 6100; scene.result.diff = 'normal';
delayedRead = true; scene.refreshResultRankings();
await new Promise(resolve => setTimeout(resolve, 0));
await api.submitScore('score-normal-tour2', 6100);
await new Promise(resolve => setTimeout(resolve, 0));
acknowledge(); await api.flushOnlineScores();
scene.refreshRankingViews();
await new Promise(resolve => setTimeout(resolve, 0));
readQueue.shift()();
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(scene.result.top[0].score, 6100, 'Late old GET cannot overwrite refreshed results');
scene.mode = 'rankings'; scene.rankCache.clear(); delayedRead = true; scene.fetchBoard();
await new Promise(resolve => setTimeout(resolve, 0)); remote = 7100; scene.refreshRankingViews();
await new Promise(resolve => setTimeout(resolve, 0)); readQueue.shift()();
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(scene.rankCache.get('score-normal-tour2')[0].score, 7100, 'Late old GET cannot overwrite the refreshed board');
console.log('PASS: upload-completion refresh and stale-response guards for online boards and results');

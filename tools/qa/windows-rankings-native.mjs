// Test the real packaged renderer/custom protocol against a loopback-only API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { testDatabase } from './online-test-db.mjs';

const candidate = path.resolve(process.argv[2] || 'output/windows-online-rankings/windows-candidate');
const updateIndex = process.argv.indexOf('--update-from');
const updateFrom = updateIndex < 0 ? null : path.resolve(process.argv[updateIndex + 1]);
const mac = candidate.endsWith('.app');
const resources = mac ? path.join(candidate, 'Contents/Resources') : path.join(candidate, 'resources');
const out = path.resolve((mac ? 'output/macos-release' : 'output/windows-online-rankings') + '/native-' + Date.now());
fs.mkdirSync(out, { recursive: true });
const game = path.join(out, 'game');
fs.cpSync(path.join(resources, 'game'), game, { recursive: true });
await build({ entryPoints: ['server/worker.ts'], outfile: path.join(out, 'worker.mjs'), bundle: true, platform: 'node', format: 'esm' });
const worker = (await import(pathToFileURL(path.join(out, 'worker.mjs')))).default;
const DB = testDatabase(['0001_rankings.sql', '0002_statistics.sql', '0003_driver_tags.sql'].map(n => fs.readFileSync('server/migrations/' + n, 'utf8')).join('\n'));
const origin = 'velvet-game://game-20261009-93986676';
const env = { DB, ALLOWED_ORIGINS: origin + ',https://sabnockworks.com', STATS_ALLOWED_ORIGIN: 'https://sabnockworks.com' };
let offline = true;
const calls = [], errors = [];
const server = http.createServer(async (req, res) => {
  try {
    calls.push({ path: req.url, method: req.method, origin: req.headers.origin });
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const response = offline ? new Response('{}', { status: 503, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } }) : await worker.fetch(new Request('http://127.0.0.1' + req.url, { method: req.method, headers: req.headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) }), env);
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { errors.push(String(error)); res.writeHead(500); res.end('{}'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const apiBase = `http://127.0.0.1:${server.address().port}`;
fs.writeFileSync(path.join(game, 'online.json'), JSON.stringify({ apiBase }));
await build({ stdin: { contents: "export * from './src/platform/services'; export * from './src/platform/online-scores';", resolveDir: process.cwd(), loader: 'ts' }, outfile: path.join(game, 'qa-api.js'), bundle: true, platform: 'browser', format: 'esm', define: { __DEMO__: 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_DESKTOP_BUILD': '"true"', 'import.meta.env.VITE_DESKTOP_RANKINGS': '"true"' } });
let initialGame = game;
if (updateFrom) {
  initialGame = path.join(out, 'previous-game');
  const previousResources = updateFrom.endsWith('.app') ? path.join(updateFrom, 'Contents/Resources') : path.join(updateFrom, 'resources');
  fs.cpSync(path.join(previousResources, 'game'), initialGame, { recursive: true });
  for (const name of ['online.json', 'qa-api.js']) fs.copyFileSync(path.join(game, name), path.join(initialGame, name));
}
const profile = path.join(out, 'profile');
const previous = path.join(out, 'empty-legacy-root'); fs.mkdirSync(previous);
async function launch(application = candidate, payload = game) {
  const executable = application.endsWith('.app') ? path.join(application, 'Contents/MacOS/Velvet Cruise') : path.join(application, 'Velvet Cruise.exe');
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(executable, ['--game', payload, '--user-data-dir', profile, '--legacy-profile-root', previous, '--remote-debugging-port=' + port], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = ''; child.stderr.on('data', bytes => { stderr += bytes; });
  let page;
  for (let i = 0; i < 200; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p => p.type === 'page' && p.url === origin + '/'); if (page) break; } catch {}
    if (child.exitCode !== null) throw Error('Native process exited: ' + stderr);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(page, 'Native page loads: ' + stderr);
  const socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = event => {
    const value = JSON.parse(event.data);
    if (value.id) { const handler = pending.get(value.id); pending.delete(value.id); value.error ? handler.reject(Error(value.error.message)) : handler.resolve(value.result); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(Error('Native CDP timeout: ' + method)); }, 12000); pending.set(key, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id: key, method, params })); });
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); assert.equal(response.exceptionDetails, undefined, JSON.stringify(response.exceptionDetails)); return response.result.value; };
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*', 'http://*.workers.dev/*'] });
  const press = async key => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: ({ Enter: 13, Escape: 27, ArrowDown: 40, ArrowRight: 39 })[key] }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: ({ Enter: 13, Escape: 27, ArrowDown: 40, ArrowRight: 39 })[key] }); await new Promise(resolve => setTimeout(resolve, 200)); };
  const quit = async () => { const ended = new Promise(resolve => child.once('exit', resolve)); await evaluate('window.VelvetDesktop.quit()').catch(() => {}); await Promise.race([ended, new Promise((_, reject) => setTimeout(() => { child.kill(); reject(Error('Native quit timeout')); }, 10000))]); socket.close(); };
  return { evaluate, send, press, quit };
}
let app;
try {
  app = await launch(updateFrom || candidate, initialGame);
  await new Promise(resolve => setTimeout(resolve, 3000));
  assert.equal(await app.evaluate('window.VelvetDesktop.automation'), true, 'Native CDP launch declares automation even without webdriver');
  assert.equal(await app.evaluate('!!document.querySelector("canvas")'), true, 'Offline game renders');
  await app.evaluate(`(async()=>{localStorage.setItem('sunset-coast-run.name','NATIVE');localStorage.setItem('sunset-coast-run.arcade.tour2','{"normal":[{"n":"LOCAL","s":12345,"c":"red","d":1}]}');window.rankingFixture=await import('./qa-api.js');await rankingFixture.initServices();await rankingFixture.submitScore('score-normal-tour2',87654);return true})()`);
  assert.equal(await app.evaluate("JSON.parse(localStorage.getItem('sunset-coast-run.online-pending'))['score-normal-tour2']"), 87654);
  const shot = await app.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, 'offline-title.png'), Buffer.from(shot.data, 'base64'));
  await app.quit(); app = null;
  offline = false;
  // The actual game's own initialization uploads the persisted queue on relaunch.
  app = await launch();
  for (let i = 0; i < 120; i++) {
    const stored = (await DB.prepare('SELECT score FROM scores WHERE board=?').bind('score-normal-tour2').first())?.score;
    const pending = await app.evaluate("Object.keys(JSON.parse(localStorage.getItem('sunset-coast-run.online-pending') || '{}')).length");
    if (stored === 87654 && pending === 0) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal((await DB.prepare('SELECT score FROM scores WHERE board=?').bind('score-normal-tour2').first())?.score, 87654);
  assert.equal(await app.evaluate("Object.keys(JSON.parse(localStorage.getItem('sunset-coast-run.online-pending'))).length"), 0);
  assert.equal(await app.evaluate("JSON.parse(localStorage.getItem('sunset-coast-run.arcade.tour2')).normal[0].n"), 'LOCAL');
  await new Promise(resolve => setTimeout(resolve, 2500));
  for (let i = 0; i < 3; i++) await app.press('ArrowDown'); await app.press('Enter'); await app.press('Enter');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const rankingShot = await app.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, 'online-ranking.png'), Buffer.from(rankingShot.data, 'base64'));
  await app.press('ArrowRight');
  const localShot = await app.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, 'local-ranking.png'), Buffer.from(localShot.data, 'base64'));
  assert.ok(calls.some(c => c.method === 'OPTIONS' && c.origin === origin), 'Real custom-origin CORS preflight');
  assert.ok(calls.some(c => c.method === 'POST' && c.path.includes('/scores/') && c.origin === origin), 'Real native score submission');
  assert.equal(calls.some(c => c.path.includes('/stats/')), false);
  assert.deepEqual(errors, []);
  const response = await worker.fetch(new Request('https://rankings.test/scores/score-normal-tour2', { headers: { Origin: 'https://sabnockworks.com' } }), env);
  const shared = (await response.json()).entries[0]; assert.equal(shared.score, 87654); assert.match(shared.driverTag, /^[0-9A-F]{8}$/);
  await app.quit(); app = null;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ status: 'PASS', productionForwarding: false, updateFrom, candidate, checks: ['actual Electron custom origin', 'offline canvas', 'local-first score', 'queue across real Chromium relaunch', 'actual game auto-upload', 'native preflight and submission', 'shared web/native result', 'retained local arcade table', 'no statistics'], calls, screenshots: ['offline-title.png', 'online-ranking.png', 'local-ranking.png'] }, null, 2));
  console.log('PASS: actual native offline/relaunch/CORS/shared ranking/local records: ' + out);
} finally { if (app) await app.quit().catch(() => {}); await new Promise(resolve => server.close(resolve)); DB.close(); }

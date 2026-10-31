import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { snapshotProfile } from '../../desktop/storage-migration.mjs';
assert.equal(process.platform, 'darwin', 'Run native migration acceptance on macOS');
const app = path.resolve(process.argv[2]);
const root = fs.mkdtempSync(path.resolve('output/macos-release/migration-'));
const seedApp = path.join(root, 'Seed.app');
execFileSync('/usr/bin/ditto', [app, seedApp]);
fs.copyFileSync('tools/qa/independent-native-seed.mjs', path.join(seedApp, 'Contents/Resources/app/main.mjs'));
execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', seedApp], { stdio: 'ignore' });
const legacyRoot = path.join(root, 'legacy'), profile = path.join(legacyRoot, 'Prior Game/profile');
const ready = path.join(root, 'ready'), release = path.join(root, 'release'), config = path.join(root, 'seed.json');
const entries = { 'sunset-coast-run.name': 'MAC DRIVER', 'sunset-coast-run.local-bests': '{"score-normal-tour2":12345}', 'sunset-coast-run.arcade.tour2': '{"normal":[{"n":"LOCAL","s":12345,"c":"red","d":1}]}', 'sunset-coast-run.audio': '{"music":0.3,"effects":0.6}' };
fs.writeFileSync(config, JSON.stringify({ profile, entries, hold: true, ready, release }));
const seed = spawn(path.join(seedApp, 'Contents/MacOS/Velvet Cruise'), ['--seed-config', config], { stdio: 'ignore' });
for (let i = 0; i < 150 && !fs.existsSync(ready); i++) { if (seed.exitCode !== null) throw Error('Seed app exited: ' + seed.exitCode); await new Promise(resolve => setTimeout(resolve, 100)); }
assert.ok(fs.existsSync(ready), 'Legacy application opens a real Chromium database');
try { assert.throws(() => snapshotProfile(profile, path.join(root, 'active-copy')), /active|unavailable/i); }
finally { const stopped = new Promise(resolve => seed.once('exit', resolve)); fs.writeFileSync(release, 'release'); await stopped; }
const db = path.join(profile, 'Local Storage/leveldb');
const hashes = () => Object.fromEntries(fs.readdirSync(db).filter(n => fs.statSync(path.join(db, n)).isFile()).map(n => [n, createHash('sha256').update(fs.readFileSync(path.join(db, n))).digest('hex')]));
const before = hashes(); snapshotProfile(profile, path.join(root, 'closed-copy')); assert.deepEqual(hashes(), before);
const game = path.join(root, 'game'); fs.cpSync(path.join(app, 'Contents/Resources/game'), game, { recursive: true });
fs.writeFileSync(path.join(game, 'online.json'), '{"apiBase":"http://127.0.0.1:9"}');
const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const current = spawn(path.join(app, 'Contents/MacOS/Velvet Cruise'), ['--game', game, '--user-data-dir', path.join(root, 'current'), '--legacy-profile-root', legacyRoot, '--remote-debugging-port=' + port], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = ''; current.stderr.on('data', bytes => { stderr += bytes; });
let page;
for (let i = 0; i < 200; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(p => p.type === 'page' && p.url === 'velvet-game://game-20261009-93986676/'); if (page) break; } catch {} if (current.exitCode !== null) throw Error('Current app exited: ' + stderr); await new Promise(resolve => setTimeout(resolve, 100)); }
assert.ok(page, 'Owned Mac runtime completes saved-data import: ' + stderr);
const socket = new WebSocket(page.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0; const pending = new Map();
socket.onmessage = event => { const data = JSON.parse(event.data); if (data.id) { const p = pending.get(data.id); pending.delete(data.id); data.error ? p.reject(Error(data.error.message)) : p.resolve(data.result); } };
const evaluate = expression => new Promise((resolve, reject) => { const key = ++id; const timeout = setTimeout(() => reject(Error('Mac evaluation timeout')), 10000); pending.set(key, { resolve: value => { clearTimeout(timeout); value.exceptionDetails ? reject(Error(JSON.stringify(value.exceptionDetails))) : resolve(value.result.value); }, reject }); socket.send(JSON.stringify({ id: key, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } })); });
try {
  const actual = await evaluate('Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith("sunset-coast-run")).map(k=>[k,localStorage.getItem(k)]))');
  for (const [key, value] of Object.entries(entries)) assert.equal(actual[key], value, key);
  assert.deepEqual(hashes(), before, 'Original Mac profile is unchanged after migration');
  assert.equal(await evaluate('window.VelvetDesktop.automation'), true);
  const ended = new Promise(resolve => current.once('exit', resolve)); await evaluate('window.VelvetDesktop.quit()').catch(() => {}); await ended;
  fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify({ status: 'PASS', arch: process.arch, originalRetained: true, importedKeys: Object.keys(entries).length, activeSourceRejected: true, nativeRuntimeImport: true, productionRequests: 0 }, null, 2));
  console.log('PASS: real Mac active-profile rejection, stable snapshot and saved-data import: ' + root);
} finally { socket.close(); if (current.exitCode === null) current.kill(); }

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const output = resolve('output/local-services');
mkdirSync(output, { recursive: true });
const values = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
};
const boards = JSON.parse(readFileSync('assets/ui/boards.json')).boards;
const achievements = JSON.parse(readFileSync('assets/ui/achievements.json')).achievements;

for (const local of [false, true]) {
  const outfile = resolve(output, `services-${local}.mjs`);
  await build({ entryPoints: ['src/platform/tesana.ts'], outfile, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.VITE_LOCAL_SERVICES': JSON.stringify(String(local)) } });
  const api = await import(pathToFileURL(outfile));
  await api.initTesana();
  assert.equal(api.servicesOnline(), false);
  assert.equal(api.usesLocalServices(), local);
  if (!local) {
    assert.equal(await api.submitScore(boards[0].board, 123), null);
    assert.equal(await api.listBadges(), null);
    assert.equal(values.size, 0, 'The normal web export must retain its existing behavior');
    window.TesanaDesktop = {};
    assert.equal(api.usesLocalServices(), true, 'Desktop local saves remain supported');
    delete window.TesanaDesktop;
    continue;
  }
  for (const order of ['asc', 'desc']) {
    const { board } = boards.find(item => item.order === order);
    const better = order === 'asc' ? 80 : 120;
    assert.deepEqual(await api.submitScore(board, 100), { improved: true, best: 100 });
    assert.deepEqual(await api.submitScore(board, better), { improved: true, best: better });
    assert.deepEqual(await api.submitScore(board, 100), { improved: false, best: better });
    assert.equal(await api.myBest(board), better);
  }
  const badge = achievements.find(item => !item.stat);
  assert.equal(await api.unlockBadge(badge.id), 'new');
  assert.equal(await api.unlockBadge(badge.id), 'had');
  const counted = achievements.find(item => item.stat && item.target > 1);
  const progress = await api.badgeProgress(counted.stat, counted.target);
  assert.ok(progress.unlocked.includes(counted.id));
  // A fresh module must read the browser's saved state rather than rely on module memory.
  const restored = await import(pathToFileURL(resolve(output, 'services-true.mjs')) + '?reload');
  assert.ok((await restored.listBadges()).find(item => item.id === badge.id).unlocked);
  assert.ok((await restored.listBadges()).find(item => item.id === counted.id).unlocked);
  assert.deepEqual(await restored.topScores(boards[0].board), [], 'No remote ranking is fabricated');
}
console.log('PASS: self-hosted scores, score ordering, badges, counters, persistence, and existing export behavior');

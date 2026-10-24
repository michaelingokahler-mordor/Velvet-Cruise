// Capture the actual browser game for the Sabnock Works gallery.
// Requires Chromium and Playwright available through Node's module search path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const base = (process.argv[2] || 'http://127.0.0.1:8080/games/more-projects/velvet-cruise/').replace(/\/$/, '');
const destination = path.resolve(process.argv[3] || path.join(root, 'output/website-images'));
const output = path.join(root, 'output/website-capture');
fs.mkdirSync(destination, { recursive: true });
fs.mkdirSync(output, { recursive: true });
const model = path.join(output, 'model.cjs');
buildSync({ stdin: { contents: 'export { THEMES } from "./src/game/themes"; export { COLUMN_NODES, NEXT } from "./src/game/routes";', resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: model });
const { THEMES, COLUMN_NODES, NEXT } = require(model);
const strings = JSON.parse(fs.readFileSync(path.join(root, 'assets/ui/strings.json'))).strings;
const paths = [[0]];
for (let i = 0; i < paths.length; i++) for (const next of NEXT[paths[i].at(-1)]) paths.push([...paths[i], next]);
const stages = COLUMN_NODES.flatMap((nodes, column) => nodes.map(node => ({
  node, column, id: THEMES[node].id,
  name: strings.find(item => item.id === THEMES[node].nameKey).text,
  path: paths.find(route => route.at(-1) === node),
  file: `velvet-cruise-${THEMES[node].id}.png`,
})));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const errors = [], badResponses = [], external = new Set(), captures = [];
  async function open(hash) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-US' });
    const page = await context.newPage();
    if (!hash) await page.addInitScript(() => { Math.random = () => .5; });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() }); });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === new URL(base).origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
      external.add(url.hostname);
      return route.abort('blockedbyclient');
    });
    await page.goto(base + '/#autopilot&' + hash, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.__trackBench === 'function', { timeout: 30000 });
    return { page, context };
  }
  try {
    const { page, context } = await open('');
    await page.locator('#game canvas').screenshot({ path: path.join(destination, 'velvet-cruise-title.png') });
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.locator('#game canvas').screenshot({ path: path.join(destination, 'velvet-cruise-garage.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.locator('#game canvas').screenshot({ path: path.join(destination, 'velvet-cruise-course-map.png') });
    await context.close();
    if (process.argv.includes('--menus-only')) {
      assert.deepEqual(errors, []);
      assert.deepEqual(badResponses, []);
      assert.deepEqual([...external], []);
      console.log('PASS: refreshed title, garage and course map');
      return;
    }

    const queue = [...stages];
    async function worker() {
      while (queue.length) {
        const stage = queue.shift();
        const offset = stage.id === 'neon-city' ? 2600 : 1000;
        const { page, context } = await open(`sim=2&stage=${stage.column + 1}&at=${offset}&path=${stage.path.join(',')}`);
        try {
          for (let i = 0; i < 4; i++) {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(250);
          }
          await page.waitForFunction(column => window.__race?.state === 'race' && window.__race.stage === column && window.__race.run > 8, stage.column, { timeout: 30000 });
          const state = await page.evaluate(() => ({ race: window.__race, path: window.__trk.path }));
          assert.equal(state.path[state.race.stage], stage.node);
          assert.ok(state.race.z > 0);
          await page.locator('#game canvas').screenshot({ path: path.join(destination, stage.file) });
          captures.push({ ...stage, state });
          console.log(`Captured ${stage.name}`);
        } finally { await context.close(); }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    assert.equal(captures.length, 15);
    assert.deepEqual(errors, [], 'All stages must render without JavaScript errors');
    assert.deepEqual(badResponses, [], 'All game assets must load');
    assert.deepEqual([...external], [], 'The self-hosted game must make no external service requests');
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ base, stages: captures.sort((a, b) => a.node - b.node), errors, badResponses, external: [...external] }, null, 2));
    console.log('PASS: title, garage, course map and all 15 stages captured from the self-hosted game');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const out = resolve('output/course-map'); mkdirSync(out, { recursive: true });
await build({ stdin: { contents: "export * from './src/core/fb'; export * from './src/core/font'; export * from './src/game/themes'; export * from './src/game/coursemap'; export {C} from './src/game/ui';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: resolve(out, 'caption.cjs'), define: { __DEMO__: 'false', 'import.meta.env.VITE_LOCAL_SERVICES': '"false"' } });
globalThis.ImageData = class { constructor(w, h) { this.data = new Uint8ClampedArray(w * h * 4); } };
const { FB, THEMES, CourseMap, drawText, C } = createRequire(import.meta.url)(resolve(out, 'caption.cjs'));
const failures = [], tests = [];
function test(name, fn) { try { fn(); tests.push(name); } catch (error) { failures.push({ name, message: error.message }); } }
const render = node => { const icons = [], fb = new FB(); new CourseMap().caption(fb, { get(name) { icons.push(name); return undefined; } }, node, 73456); return { fb, icons }; };
function containsText(fb, text, x, y, color) {
  const expected = new FB(); drawText(expected, text, x, y, color);
  let pixels = 0;
  for (let i = 0; i < expected.data.length; i++) if (expected.data[i] === color) { pixels++; assert.equal(fb.data[i], color, 'missing visible text: ' + text); }
  assert.ok(pixels > 5);
}
for (const [node, time] of [[12, 'Sunset'], [13, 'Dusk'], [4, 'Night']]) test(THEMES[node].id + ' shows its real time of day', () => {
  const { fb, icons } = render(node); containsText(fb, time, 164, 155, C.cyan);
  if (node !== 12) assert.ok(!icons.includes('wx_sun'), 'dark clear skies must not show a daytime sun');
});
test('Gold Rush retains heat haze as a separate condition', () => containsText(render(12).fb, 'Heat haze', 164, 166, C.cyan));
for (const [node, feature] of [[6, 'Rolling hills'], [3, 'Rolling hills'], [14, 'Uphill'], [7, 'Mountain pass'], [11, 'Mountain pass']]) test(THEMES[node].id + ' names its road feature', () => containsText(render(node).fb, feature, 28, 166, C.white));
test('caption preserves its best-time display', () => {
  const { fb } = render(14); const expected = new FB(); drawText(expected, "1'13\"45", 310, 155, C.cyan, { align: 'right', outline: C.ink });
  for (let i = 0; i < expected.data.length; i++) if (expected.data[i] === C.cyan) assert.equal(fb.data[i], C.cyan);
});
// Execute the real post-run map method without booting Phaser or a user profile.
// TypeScript's parser keeps this tied to the production method, not a copy.
const source = ts.createSourceFile('main.ts', readFileSync('src/main.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const sceneClass = source.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'MainScene');
const method = sceneClass.members.find(n => n.name?.getText(source) === 'mapScreen');
await build({ stdin: { contents: `import {W,H} from './src/core/fb'; import {C,para,fmtTime} from './src/game/ui'; import {t} from './src/platform/services'; export function run(scene){return (function(dt,taps) ${method.body.getText(source)}).call(scene,0,[]);}`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: resolve(out, 'post-run.cjs'), define: { __DEMO__: 'false', 'import.meta.env.VITE_LOCAL_SERVICES': '"false"' } });
const { run } = createRequire(import.meta.url)(resolve(out, 'post-run.cjs'));
test('blinking Continue leaves the post-run time and weather labels intact', () => {
  for (const touchMode of [false, true]) {
    const fb = new FB();
    run({ fb, bank: { get: () => undefined }, courseMap: new CourseMap(), mapRun: true, mapProg: 4, modeT: 1, time2: 0,
      input2: { touchMode, hit: () => false }, result: { path: [0, 5, 6, 11, 12], stageTimes: [73.456, 73.456, 73.456, 73.456, 73.456], goal: true } });
    containsText(fb, 'Sunset', 164, 155, C.cyan); containsText(fb, 'Heat haze', 164, 166, C.cyan);
  }
});
const report = { status: failures.length ? 'FAIL' : 'PASS', tests, failures };
writeFileSync(resolve(out, 'validation.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); assert.deepEqual(failures, []);

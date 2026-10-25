// Input regressions for the Windows horn/headlight request, including reconnects.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('output/signal-fix');
mkdirSync(out, { recursive: true });
const bundle = resolve(out, 'signals.cjs');
await build({ stdin: { contents: `export {Input} from './src/input'; export {Race} from './src/game/race'; export {Track} from './src/game/track'; export {FB} from './src/core/fb'; export {drawSignalIndicator} from './src/game/ui';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
class Target {
  handlers = new Map();
  addEventListener(name, callback) { const a = this.handlers.get(name) ?? []; a.push(callback); this.handlers.set(name, a); }
  emit(name, fields = {}) { const event = { preventDefault() {}, ...fields }; for (const callback of this.handlers.get(name) ?? []) callback(event); }
}
globalThis.window = new Target();
globalThis.localStorage = { getItem: () => null };
globalThis.ImageData = class { constructor(w, h) { this.data = new Uint8ClampedArray(w * h * 4); } };
let pads = [];
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
const { Input, Race, Track, FB, drawSignalIndicator } = createRequire(import.meta.url)(bundle);
const input = new Input(new Target(), (x, y) => ({ x, y }));
const down = (code = 'KeyH', key = 'h') => window.emit('keydown', { code, key });
const up = (code = 'KeyH', key = 'h') => window.emit('keyup', { code, key });
const tests = [];
down(); input.poll(); assert.equal(input.hit('signal'), true); assert.equal(input.hit('signal'), false);
input.endFrame(); down(); assert.equal(input.hit('signal'), false, 'a held H does not repeat');
up(); down(); assert.equal(input.hit('signal'), true); up(); input.endFrame();
tests.push('H press/release; held key and consumed press do not repeat');
for (const code of ['', 'Unidentified']) {
  down(code, 'H'); assert.equal(input.hit('signal'), true); input.endFrame();
  down(code, 'H'); assert.equal(input.hit('signal'), false); up(code, 'H');
  down(code); assert.equal(input.hit('signal'), true); up(code); input.endFrame();
}
tests.push('H fallback for missing/Unidentified native key codes');
input.textMode = true; down(); assert.equal(input.hit('signal'), false); assert.deepEqual(input.takeTyped(), ['h']); up(); input.textMode = false;
tests.push('name entry keeps H as text');
const pad = id => ({ id, index: 0, connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
let gamepad = pad('standard'); pads = [gamepad]; input.poll();
for (const index of [3, 10]) {
  gamepad.buttons[index].pressed = true; input.poll(); assert.equal(input.hit('signal'), true);
  input.endFrame(); input.poll(); assert.equal(input.hit('signal'), false);
  gamepad.buttons[index].pressed = false; input.poll(); input.endFrame();
}
tests.push('standard Y/Triangle and L3; one request per press');
gamepad.buttons[3].pressed = true; input.poll(); assert.equal(input.hit('signal'), true); input.endFrame();
pads = []; input.poll(); pads = [gamepad]; input.poll(); assert.equal(input.hit('signal'), true); input.endFrame();
gamepad = pad('replacement'); gamepad.buttons[3].pressed = true; pads = [gamepad]; input.poll(); assert.equal(input.hit('signal'), true); input.endFrame();
tests.push('disconnect/reconnect and controller replacement clear stale held buttons');
pads = []; input.poll();

const race = new Race(new Track()); race.warp(0, 500); race.state = 'race'; race.playerX = -.25;
const sample = { ...race.cars[0], z: race.playerZ + 8000, x: -.25, targetX: -.25, br: undefined, yieldUntil: 0 };
race.cars = [{ ...sample }];
down(); const kind = input.hit('signal') ? race.signal() : undefined; up(); input.endFrame();
assert.equal(kind, 'horn'); assert.equal(race.cars[0].yieldLane, .25);
tests.push('keyboard to Race.signal to safe lane request');
race.signalCooldown = 0; race.stageBlend = { from: 4, to: 4, t: 1 };
gamepad.buttons[3].pressed = false; gamepad.buttons[10].pressed = true; pads = [gamepad]; input.poll();
assert.equal(input.hit('signal') ? race.signal() : undefined, 'flash'); input.endFrame();
for (const [remaining, expected] of [[.7, true], [.46, false], [.30, true], [.05, false], [0, false]]) {
  race.signalT = remaining; assert.equal(race.signalFlash, expected);
}
tests.push('gamepad to night signal and both flash pulses with a dark interval');
const fb = new FB(), idle = new FB(); race.signalT = 0; drawSignalIndicator(idle, race);
race.signalT = .30; drawSignalIndicator(fb, race);
let changed = 0; for (let i = 0; i < fb.data.length; i++) if (fb.data[i] !== idle.data[i]) changed++;
assert.ok(changed > 100, 'visible HUD confirmation for accepted flash');
tests.push('HUD confirms an accepted signal even without a yielding car');
const report = { status: 'PASS', tests, hudChangedPixels: changed };
writeFileSync(resolve(out, 'input-validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

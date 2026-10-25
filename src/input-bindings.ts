import { SAVE_PREFIX } from './game/edition';

export const DRIVE_ACTIONS = ['left', 'right', 'throttle', 'brake', 'pause', 'signal'] as const;
export type DriveAction = typeof DRIVE_ACTIONS[number];
export type BindingDevice = 'keyboard' | 'gamepad';
export type Binding = { kind: 'key'; code: string } | { kind: 'button'; index: number } |
  { kind: 'axis'; index: number; direction: -1 | 1; neutral: number };
export type BindingResult = { ok: true } | { ok: false; reason: 'conflict' | 'invalid' | 'last'; action?: DriveAction };
type Layout = Record<DriveAction, Binding[]>;
type Config = Record<BindingDevice, Layout>;
const KEY = `${SAVE_PREFIX}.bindings.v1`;
const key = (...codes: string[]): Binding[] => codes.map(code => ({ kind: 'key', code }));
const buttons = (...indices: number[]): Binding[] => indices.map(index => ({ kind: 'button', index }));
const axis = (index: number, direction: -1 | 1): Binding => ({ kind: 'axis', index, direction, neutral: 0 });
function defaults(): Config {
  return {
    keyboard: { left: key('ArrowLeft', 'KeyA'), right: key('ArrowRight', 'KeyD'), throttle: key('ArrowUp', 'KeyW', 'Space', 'KeyX', 'ShiftLeft'), brake: key('ArrowDown', 'KeyS', 'KeyZ'), pause: key('KeyP'), signal: key('KeyH') },
    gamepad: { left: [axis(0, -1), ...buttons(14)], right: [axis(0, 1), ...buttons(15)], throttle: buttons(0, 7), brake: buttons(1, 6), pause: buttons(9), signal: buttons(3, 10) },
  };
}
function valid(device: BindingDevice, binding: Binding): boolean {
  if (!binding || typeof binding !== 'object') return false;
  if (device === 'keyboard') return binding.kind === 'key' && typeof binding.code === 'string' && /^[A-Za-z][A-Za-z0-9]{1,30}$/.test(binding.code) && binding.code !== 'Escape';
  return (binding.kind === 'button' || binding.kind === 'axis') && Number.isInteger(binding.index) && binding.index >= 0 && binding.index < 64 &&
    (binding.kind !== 'axis' || (binding.direction === -1 || binding.direction === 1) && [-1, 0, 1].includes(binding.neutral));
}
const identity = (b: Binding): string => b.kind === 'key' ? b.code : `${b.kind}:${b.index}:${b.kind === 'axis' ? b.direction : ''}`;
export function bindingLabel(binding: Binding): string {
  if (binding.kind === 'key') return ({ ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', Space: 'SPACE', ShiftLeft: 'L SHIFT', ShiftRight: 'R SHIFT' } as Record<string, string>)[binding.code] ?? binding.code.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'NUM ');
  return binding.kind === 'button' ? `BUTTON ${binding.index + 1}` : `AXIS ${binding.index + 1} ${binding.direction < 0 ? '-' : '+'}`;
}
export function buttonValue(g: Gamepad | null, index: number): number {
  const b = g?.buttons[index];
  return b ? Math.max(0, Math.min(1, Number.isFinite(b.value) && b.value > 0 ? b.value : b.pressed ? 1 : 0)) : 0;
}
export function padValue(g: Gamepad | null, b: Binding): number {
  if (b.kind === 'button') { const value = buttonValue(g, b.index); return value > .2 ? value : 0; }
  if (b.kind !== 'axis' || !g || !Number.isFinite(g.axes[b.index])) return 0;
  const value = Math.max(0, Math.min(1, (g.axes[b.index] - b.neutral) * b.direction / Math.max(.1, 1 - b.neutral * b.direction)));
  return value > .15 ? value : 0;
}

/** Only driving bindings live here; menu navigation never depends on this data. */
export class InputBindings {
  private config = defaults();
  constructor() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Config;
      for (const device of ['keyboard', 'gamepad'] as const) {
        const seen = new Set<string>();
        if (!data?.[device] || !DRIVE_ACTIONS.every(action => Array.isArray(data[device][action]) && data[device][action].length > 0 && data[device][action].length <= 16 && data[device][action].every(b => {
          if (!valid(device, b) || seen.has(identity(b))) return false;
          seen.add(identity(b)); return true;
        }))) continue;
        this.config[device] = structuredClone(data[device]);
      }
    } catch { /* missing, blocked or malformed storage keeps the defaults */ }
  }
  get(device: BindingDevice, action: DriveAction): Binding[] { return this.config[device][action].map(b => ({ ...b })); }
  set(device: BindingDevice, action: DriveAction, index: number | null, binding: Binding): BindingResult {
    const row = this.config[device][action];
    if (!valid(device, binding) || index !== null && (!Number.isInteger(index) || index < 0 || index >= row.length) || index === null && row.length >= 16) return { ok: false, reason: 'invalid' };
    for (const other of DRIVE_ACTIONS) if (this.config[device][other].some((b, i) => !(other === action && i === index) && identity(b) === identity(binding))) return { ok: false, reason: 'conflict', action: other };
    if (index === null) row.push({ ...binding }); else row[index] = { ...binding };
    this.save(); return { ok: true };
  }
  remove(device: BindingDevice, action: DriveAction, index: number): BindingResult {
    const row = this.config[device][action];
    if (row.length === 1) return { ok: false, reason: 'last' };
    if (!Number.isInteger(index) || index < 0 || index >= row.length) return { ok: false, reason: 'invalid' };
    row.splice(index, 1); this.save(); return { ok: true };
  }
  reset(device: BindingDevice): void { this.config[device] = defaults()[device]; this.save(); }
  keyboard(action: DriveAction, held: Set<string>): number { return this.config.keyboard[action].some(b => b.kind === 'key' && held.has(b.code)) ? 1 : 0; }
  gamepad(action: DriveAction, g: Gamepad | null): number { return Math.max(0, ...this.config.gamepad[action].map(b => padValue(g, b))); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.config)); } catch { /* remains usable this session */ } }
}

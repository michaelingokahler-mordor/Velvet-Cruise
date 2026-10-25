// Keyboard, touch and gamepad folded into one set of driving controls plus
// edge-triggered menu presses. Coordinates are framebuffer pixels (320x180).
import { W, H } from "./core/fb";
import { SAVE_PREFIX } from "./game/edition";
import { InputBindings, DRIVE_ACTIONS, buttonValue, type Binding, type BindingDevice, type DriveAction, type BindingResult } from './input-bindings';
export { DRIVE_ACTIONS, bindingLabel } from './input-bindings';
export type { Binding, BindingDevice, DriveAction } from './input-bindings';

export interface Rect { x: number; y: number; w: number; h: number }

export const TOUCH = {
  left: { x: 5, y: 128, w: 42, h: 46 },
  right: { x: 51, y: 128, w: 42, h: 46 },
  brake: { x: W - 97, y: 128, w: 42, h: 46 },
  gas: { x: W - 51, y: 128, w: 46, h: 46 },
  pause: { x: W / 2 - 9, y: 24, w: 18, h: 16 },
  signal: { x: W - 34, y: 82, w: 28, h: 20 },
};

/** Pads used while steering by tilting the device: brake under the left thumb, gas under the right. */
export const TOUCH_TILT = {
  brake: { x: 5, y: 116, w: 66, h: 58 },
  gas: { x: W - 71, y: 116, w: 66, h: 58 },
};

const TILT_KEY = `${SAVE_PREFIX}.tilt`;
const CONTROLS_KEY = `${SAVE_PREFIX}.controls`;

/** How the player drives: picked on the "Choose your controls" screen. */
export type ControlPref = "auto" | "keyboard" | "touch";
export const CONTROL_PREFS: ControlPref[] = ["auto", "touch", "keyboard"];
const TILT_DEAD = 3;   // degrees of free play around level
const TILT_FULL = 24;  // degrees for full steering lock

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

type Btn = "left" | "right" | "up" | "down" | "confirm" | "back" | "pause" | "signal";

const KEYMAP: Record<string, Btn> = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  Enter: "confirm", NumpadEnter: "confirm", Space: "confirm",
  Escape: "back", Backspace: "back", KeyX: "confirm",
};

/** Driving keys that count as "using the keyboard" for auto-detect. */
const DRIVE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyX", "KeyZ", "ShiftLeft"];

export class Input {
  readonly bindings = new InputBindings();
  capture: { device: BindingDevice; action: DriveAction; index: number | null; status: 'release' | 'listening' | 'saved' | 'conflict'; result?: BindingResult; neutral: number[]; padId: string } | null = null;
  private releaseGate = false;
  private padNeutral: number[] = [];
  private drivePrev = { pause: false, signal: false };
  private held = new Set<string>();
  private pressed = new Set<Btn>();
  private taps: { x: number; y: number }[] = [];
  private pointers = new Map<number, { x: number; y: number }>();
  private padPrev: boolean[] = [];
  private padId = "";
  /** Auto, keyboard or touch (remembered). */
  pref: ControlPref = "auto";
  /** What auto-detect currently thinks: a touch device (or the last thing used was the screen). */
  autoTouch = false;
  /** While on, printable keys type text (read with `takeTyped`) instead of steering or moving
   *  through menus; Backspace deletes. Arrows, Enter and Escape keep working as usual. */
  textMode = false;
  private typedQ: string[] = [];
  /** Touch pads and tap hints are shown (and the pads drive the car). */
  get touchMode(): boolean { return this.pref === "touch" || (this.pref === "auto" && this.autoTouch); }
  lastInput = 0;
  // ---- tilt (motion) steering
  readonly tiltSupported = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
  tiltWanted = false;
  tiltDenied = false;
  /** Toggle button drawn this frame (hit-tested inside the tap itself, so iOS grants motion access). */
  tiltRect: Rect | null = null;
  /** Set when a tap flipped the tilt setting (the scene plays a click and clears it). */
  tiltToggled = false;
  private tiltActive = false;
  private tiltPending = false;
  private tiltSeen = false;
  private tiltListening = false;
  private tiltSteer = 0;
  private tiltTapId = -1;
  /** Set by the scene so the first gesture can unlock audio. */
  onGesture: (() => void) | null = null;
  private toGame: (cx: number, cy: number) => { x: number; y: number } = (x, y) => ({ x, y });

  constructor(canvas: HTMLCanvasElement, toGame: (cx: number, cy: number) => { x: number; y: number }) {
    this.toGame = toGame;
    try { this.tiltWanted = localStorage.getItem(TILT_KEY) === "1"; } catch { /* storage blocked */ }
    if (this.tiltWanted && this.tiltSupported) this.requestTilt(false);
    try { const p = localStorage.getItem(CONTROLS_KEY) as ControlPref | null; if (p && CONTROL_PREFS.includes(p)) this.pref = p; } catch { /* storage blocked */ }
    // auto-detect: phones and tablets (coarse pointer, no hover) start on touch, computers on the keyboard
    if (typeof matchMedia === "function" && (matchMedia("(pointer: coarse)").matches || matchMedia("(hover: none)").matches)) this.autoTouch = true;
    window.addEventListener("keydown", (e) => {
      if (this.textMode && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || e.key === "Backspace")) {
        e.preventDefault();
        this.typedQ.push(e.key === "Backspace" ? "\b" : e.key);
        this.lastInput = performance.now();
        this.onGesture?.();
        return;
      }
      // Some embedded keyboard backends omit `code`; keep H usable there too.
      const code = e.code && e.code !== "Unidentified" ? e.code : e.key?.toLowerCase() === "h" ? "KeyH" : e.key;
      if (this.capture) {
        e.preventDefault();
        if (code === 'Escape') { this.held.add(code); this.cancelCapture(); return; }
        this.held.add(code);
        if (this.capture.device === 'keyboard' && this.capture.status === 'listening') this.acceptCapture({ kind: 'key', code });
        return;
      }
      const b = KEYMAP[code];
      const fresh = !this.held.has(code);
      const driving = DRIVE_ACTIONS.some(a => this.bindings.get('keyboard', a).some(k => k.kind === 'key' && k.code === code));
      // auto-detect follows what is actually being used: a key press means keyboard
      if (b || driving || DRIVE_KEYS.includes(e.code)) this.autoTouch = false;
      if (b || driving) e.preventDefault();
      if (!this.releaseGate && fresh && b) this.pressed.add(b);
      if (!this.releaseGate && fresh && code === 'Escape') this.pressed.add('pause');
      this.held.add(code);
      if (!this.releaseGate && fresh) for (const a of ['pause', 'signal'] as const) if (this.bindings.keyboard(a, new Set([code]))) this.pressed.add(a);
      this.lastInput = performance.now();
      this.onGesture?.();
    });
    window.addEventListener("keyup", (e) => {
      this.held.delete(e.code);
      if (!e.code || e.code === "Unidentified") this.held.delete(e.key?.toLowerCase() === "h" ? "KeyH" : e.key);
    });
    window.addEventListener("blur", () => { this.held.clear(); this.pointers.clear(); });
    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch") this.autoTouch = true;
      const p = this.toGame(e.clientX, e.clientY);
      // the tilt switch flips when the finger lifts: iOS only grants motion access from that gesture
      if (this.tiltRect && inRect(this.tiltRect, p.x, p.y)) this.tiltTapId = e.pointerId;
      this.pointers.set(e.pointerId, p);
      this.taps.push(p);
      this.lastInput = performance.now();
      this.onGesture?.();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      // keep keyboard focus inside the game frame; only touches suppress the default
      try { window.focus(); } catch { /* cross-origin parent */ }
      if (e.pointerType === "touch") e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, this.toGame(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (e.type !== "pointerup") { if (this.tiltTapId === e.pointerId) this.tiltTapId = -1; return; }
      if (this.tiltTapId === e.pointerId) {
        this.tiltTapId = -1;
        this.setTilt(!this.tiltWanted);
        this.tiltToggled = true;
      } else if (this.tiltWanted && !this.tiltActive && !this.tiltDenied) this.requestTilt(true);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /** Characters typed since the last call ("\b" = delete one). */
  takeTyped(): string[] {
    const q = this.typedQ;
    this.typedQ = [];
    return q;
  }

  setPref(p: ControlPref): void {
    this.pref = p;
    try { localStorage.setItem(CONTROLS_KEY, p); } catch { /* storage blocked */ }
  }

  startCapture(device: BindingDevice, action: DriveAction, index: number | null): void {
    const g = this.pad();
    const id = g ? `${g.index}:${g.id}` : '';
    const neutral = g ? id === this.padId ? [...this.padNeutral] : g.axes.map(v => g.mapping === 'standard' ? 0 : Math.abs(v) > .85 ? Math.sign(v) : 0) : [];
    this.pressed.clear();
    this.capture = { device, action, index, status: 'release', neutral, padId: id };
  }
  cancelCapture(): void { this.capture = null; this.releaseGate = true; this.pressed.clear(); }
  private acceptCapture(binding: Binding): void {
    const c = this.capture;
    if (!c) return;
    c.result = this.bindings.set(c.device, c.action, c.index, binding);
    c.status = c.result.ok ? 'saved' : 'conflict';
    this.pressed.clear();
  }
  private neutral(g: Gamepad | null, axes = this.padNeutral): boolean {
    return !this.held.size && !this.pointers.size && (!g || g.buttons.every((_b, i) => buttonValue(g, i) < .2) && g.axes.every((v, i) => Math.abs(v - (axes[i] ?? 0)) < .25));
  }
  private get blocked(): boolean { return this.textMode || !!this.capture || this.releaseGate; }

  private key(...codes: string[]): boolean {
    for (const c of codes) if (this.held.has(c)) return true;
    return false;
  }

  /** True once the device is actually reporting its tilt and the player switched it on. */
  get tiltMode(): boolean { return this.tiltWanted && this.tiltActive && this.tiltSeen; }

  setTilt(on: boolean): void {
    this.tiltWanted = on;
    this.tiltDenied = false;
    try { localStorage.setItem(TILT_KEY, on ? "1" : "0"); } catch { /* storage blocked */ }
    if (on) this.requestTilt(true);
  }

  private requestTilt(fromGesture: boolean): void {
    if (!this.tiltSupported || this.tiltActive || this.tiltPending) return;
    const DOE = (window as unknown as { DeviceOrientationEvent: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    const start = () => {
      this.tiltActive = true;
      if (!this.tiltListening) { window.addEventListener("deviceorientation", this.onOrient); this.tiltListening = true; }
    };
    if (typeof DOE.requestPermission === "function") {
      if (!fromGesture) return; // iOS: wait for the player's next tap
      this.tiltPending = true;
      DOE.requestPermission()
        .then((r) => { if (r === "granted") start(); else { this.tiltDenied = true; this.tiltWanted = false; } })
        .catch(() => { this.tiltDenied = true; this.tiltWanted = false; })
        .finally(() => { this.tiltPending = false; });
    } else start();
  }

  /** Device tilt → steering, holding the screen like a steering wheel (works upright or tipped back). */
  private onOrient = (e: DeviceOrientationEvent): void => {
    if (e.beta === null || e.gamma === null || e.beta === undefined || e.gamma === undefined) return;
    this.tiltSeen = true;
    const d = Math.PI / 180;
    const b = e.beta * d, g = e.gamma * d;
    // world "up" in device coordinates
    const ux = -Math.sin(g) * Math.cos(b), uy = Math.sin(b);
    let ang = 0;
    const so = (screen as unknown as { orientation?: { angle?: number } }).orientation;
    const th = ((so && typeof so.angle === "number" ? so.angle : Number((window as unknown as { orientation?: number }).orientation) || 0) * d);
    const sx = ux * Math.cos(th) - uy * Math.sin(th);
    const sy = ux * Math.sin(th) + uy * Math.cos(th);
    if (Math.hypot(sx, sy) > 0.35) ang = Math.atan2(-sx, Math.abs(sy)) / d;   // held up: wheel angle
    else ang = Math.asin(Math.max(-1, Math.min(1, -sx))) / d;                  // lying flat: edge tilt
    const mag = Math.max(0, Math.abs(ang) - TILT_DEAD) / (TILT_FULL - TILT_DEAD);
    const target = Math.sign(ang) * Math.min(1, mag);
    this.tiltSteer += (target - this.tiltSteer) * 0.45;
  };

  private touchHeld(r: Rect): boolean {
    if (!this.touchMode) return false;
    for (const p of this.pointers.values()) if (inRect(r, p.x, p.y)) return true;
    return false;
  }

  private pad(): Gamepad | null {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
    try {
      for (const g of navigator.getGamepads()) if (g && g.connected) return g;
    } catch { /* blocked by permissions policy */ }
    return null;
  }

  get gamepadName(): string { return this.pad()?.id ?? ''; }

  /** Call once per frame before reading presses. */
  poll(): void {
    const g = this.pad();
    const id = g ? `${g.index}:${g.id}` : '';
    if (this.padId !== id) { this.padPrev = []; this.padId = id; this.drivePrev = { pause: false, signal: false }; this.padNeutral = g ? g.axes.map(v => g.mapping === 'standard' ? 0 : Math.abs(v) > .85 ? Math.sign(v) : 0) : []; }
    const c = this.capture;
    if (c) {
      this.pressed.clear();
      if (c.device === 'gamepad' && id !== c.padId) { c.padId = id; c.neutral = [...this.padNeutral]; c.status = 'release'; }
      if (c.status === 'release' || c.status === 'conflict') { if ((c.device === 'keyboard' || g) && this.neutral(g, c.neutral)) c.status = 'listening'; }
      else if (c.status === 'listening' && c.device === 'gamepad' && g) {
        const bi = g.buttons.findIndex((_b, i) => buttonValue(g, i) > .6);
        const ai = g.axes.findIndex((v, i) => Math.abs(v - (c.neutral[i] ?? 0)) > .65);
        if (bi >= 0) this.acceptCapture({ kind: 'button', index: bi });
        else if (ai >= 0) this.acceptCapture({ kind: 'axis', index: ai, direction: g.axes[ai] > (c.neutral[ai] ?? 0) ? 1 : -1, neutral: c.neutral[ai] ?? 0 });
      }
      return;
    }
    if (this.releaseGate) { this.pressed.clear(); if (this.neutral(g)) { this.releaseGate = false; this.padPrev = []; this.drivePrev = { pause: false, signal: false }; } else return; }
    if (!g) return;
    const b = (i: number) => !!g.buttons[i]?.pressed;
    const now = [b(0), b(1), b(12), b(13), b(14), b(15), (g.axes[0] ?? 0) < -0.6, (g.axes[0] ?? 0) > 0.6, (g.axes[1] ?? 0) < -0.6, (g.axes[1] ?? 0) > 0.6];
    const map: Btn[] = ["confirm", "back", "up", "down", "left", "right", "left", "right", "up", "down"];
    for (let i = 0; i < now.length; i++) {
      if (now[i] && !this.padPrev[i]) { this.pressed.add(map[i]); this.lastInput = performance.now(); this.onGesture?.(); }
    }
    this.padPrev = now;
    for (const action of ['pause', 'signal'] as const) {
      const value = this.bindings.gamepad(action, g), active = value > (this.drivePrev[action] ? .35 : .55);
      if (!this.textMode && active && !this.drivePrev[action]) this.pressed.add(action);
      this.drivePrev[action] = active;
    }
    if (DRIVE_ACTIONS.some(a => this.bindings.gamepad(a, g) > .2) || now.some(Boolean)) { this.autoTouch = false; this.lastInput = performance.now(); this.onGesture?.(); }
  }

  get steer(): number {
    if (this.blocked) return 0;
    let s = this.bindings.keyboard('right', this.held) - this.bindings.keyboard('left', this.held);
    const tilt = this.tiltMode;
    if (!tilt && this.touchHeld(TOUCH.left)) s -= 1;
    if (!tilt && this.touchHeld(TOUCH.right)) s += 1;
    if (tilt) s += this.tiltSteer;
    const g = this.pad();
    s += this.bindings.gamepad('right', g) - this.bindings.gamepad('left', g);
    return Math.max(-1, Math.min(1, s));
  }

  get throttle(): number {
    if (this.blocked) return 0;
    return Math.max(this.bindings.keyboard('throttle', this.held), this.touchHeld(this.tiltMode ? TOUCH_TILT.gas : TOUCH.gas) ? 1 : 0, this.bindings.gamepad('throttle', this.pad()));
  }

  get brake(): number {
    if (this.blocked) return 0;
    return Math.max(this.bindings.keyboard('brake', this.held), this.touchHeld(this.tiltMode ? TOUCH_TILT.brake : TOUCH.brake) ? 1 : 0, this.bindings.gamepad('brake', this.pad()));
  }

  /** Edge-triggered press, consumed on read. */
  hit(b: Btn): boolean {
    if (this.capture || this.releaseGate || this.textMode && (b === 'pause' || b === 'signal')) return false;
    if (this.pressed.has(b)) { this.pressed.delete(b); return true; }
    return false;
  }

  /** Taps since the last frame (consumed). */
  takeTaps(): { x: number; y: number }[] {
    const t = this.taps;
    this.taps = [];
    return t;
  }

  endFrame(): void {
    this.pressed.clear();
    this.taps.length = 0;
  }

  get anyHeld(): boolean { return this.held.size > 0 || this.pointers.size > 0; }
}

export const SCREEN = { W, H };

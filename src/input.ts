// Keyboard, touch and gamepad folded into one set of driving controls plus
// edge-triggered menu presses. Coordinates are framebuffer pixels (320x180).
import { W, H } from "./core/fb";
import { SAVE_PREFIX } from "./game/edition";
import { loadMobile, normalizeMobile, MOBILE_KEY, TiltDrive, type MobileScheme, type MobileSettings } from './mobile-controls';
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
};

/** Pads used while steering by tilting the device: brake under the left thumb, gas under the right. */
export const TOUCH_TILT = {
  brake: { x: 5, y: 116, w: 66, h: 58 },
  gas: { x: W - 71, y: 116, w: 66, h: 58 },
};

const CONTROLS_KEY = `${SAVE_PREFIX}.controls`;

/** How the player drives: picked on the "Choose your controls" screen. */
export type ControlPref = "auto" | "keyboard" | "touch";
export const CONTROL_PREFS: ControlPref[] = ["auto", "touch", "keyboard"];

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

type Btn = "left" | "right" | "up" | "down" | "confirm" | "back" | "pause";

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
  private drivePrev = { pause: false };
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
  mobile = loadMobile();
  private motion = new TiltDrive();
  private motionState: 'off' | 'permission' | 'waiting' | 'calibrate' | 'ready' | 'denied' | 'unavailable' = 'off';
  private motionRequestedAt = 0;
  private mobileSuspended = false;
  private mobilePause = false;
  motionDriving = false;
  /** Toggle button drawn this frame (hit-tested inside the tap itself, so iOS grants motion access). */
  tiltRect: Rect | null = null;
  /** Permission and calibration are handled synchronously in the release gesture on iOS. */
  motionActionRect: Rect | null = null;
  /** Set when a tap flipped the tilt setting (the scene plays a click and clears it). */
  tiltToggled = false;
  private tiltActive = false;
  private tiltPending = false;
  private tiltListening = false;
  private tiltTapId = -1;
  /** Set by the scene so the first gesture can unlock audio. */
  onGesture: (() => void) | null = null;
  private toGame: (cx: number, cy: number) => { x: number; y: number } = (x, y) => ({ x, y });

  constructor(canvas: HTMLCanvasElement, toGame: (cx: number, cy: number) => { x: number; y: number }) {
    this.toGame = toGame;
    if (this.tiltWanted) this.motionState = 'calibrate';
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
      // Embedded keyboard backends can omit code.
      const code = e.code && e.code !== "Unidentified" ? e.code : e.key;
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
      if (!this.releaseGate && fresh) for (const a of ['pause'] as const) if (this.bindings.keyboard(a, new Set([code]))) this.pressed.add(a);
      this.lastInput = performance.now();
      this.onGesture?.();
    });
    window.addEventListener("keyup", (e) => {
      this.held.delete(e.code);
      if (!e.code || e.code === "Unidentified") this.held.delete(e.key);
    });
    window.addEventListener('blur', () => { this.held.clear(); this.interruptMobile(false); });
    if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', () => { if (document.hidden) { this.held.clear(); this.interruptMobile(false); } });
    window.addEventListener('orientationchange', () => this.interruptMobile(true));
    if (typeof screen !== 'undefined') screen.orientation?.addEventListener?.('change', () => this.interruptMobile(true));
    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch") this.autoTouch = true;
      const p = this.toGame(e.clientX, e.clientY);
      // the tilt switch flips when the finger lifts: iOS only grants motion access from that gesture
      if (this.tiltRect && inRect(this.tiltRect, p.x, p.y)) this.tiltTapId = e.pointerId;
      if (this.motionActionRect && inRect(this.motionActionRect, p.x, p.y)) this.tiltTapId = e.pointerId;
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
        const p = this.toGame(e.clientX,e.clientY);
        if (this.motionActionRect && inRect(this.motionActionRect,p.x,p.y)) {
          this.performMotionAction();
        } else if (this.tiltRect && inRect(this.tiltRect,p.x,p.y)) this.setTilt(!this.tiltWanted);
        this.tiltToggled = true;
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    // iOS can still show its loupe for tap-and-hold despite touch-action / user-select.
    // Cancel native TouchEvent defaults while PointerEvents continue to drive the game.
    const preventNativeTouch = (e: Event) => { if (e.cancelable) e.preventDefault(); };
    for (const event of ['touchstart', 'touchmove', 'touchend']) {
      canvas.addEventListener(event, preventNativeTouch, { passive: false });
    }
    canvas.addEventListener('selectstart', preventNativeTouch);
    canvas.addEventListener('dragstart', preventNativeTouch);
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

  get tiltWanted(): boolean { return this.mobile.scheme !== 'buttons'; }
  get canCalibrateMotion(): boolean { return this.tiltActive && performance.now() - this.motion.lastSample <= 1000; }
  performMotionAction(): void {
    if(this.canCalibrateMotion) this.calibrateMotion();
    else this.activateMotion();
  }
  get tiltDenied(): boolean { return this.motionState === 'denied'; }
  get motionStatus(): string {
    if (!this.tiltWanted) return 'off';
    if (!this.tiltSupported) return 'unavailable';
    return this.motionState;
  }
  get tiltMode(): boolean {
    return this.touchMode && this.tiltWanted && this.motionState === 'ready' && this.motion.calibrated && !this.mobileSuspended && performance.now() - this.motion.lastSample <= 1000;
  }
  get activeMobileScheme(): MobileScheme { return this.tiltMode ? this.mobile.scheme : 'buttons'; }
  setMobile(value: Partial<MobileSettings>): void {
    const old = this.mobile.scheme;
    this.mobile = normalizeMobile({...this.mobile,...value});
    try { localStorage.setItem(MOBILE_KEY,JSON.stringify(this.mobile)); } catch { /* storage blocked */ }
    if (old !== this.mobile.scheme) {
      this.pointers.clear();
      this.motion.clear(true);
      this.motionState = this.tiltWanted ? 'calibrate' : 'off';
    }
  }
  setTilt(on: boolean): void {
    this.setMobile({scheme:on ? 'tilt-pedals' : 'buttons'});
    if (on) this.activateMotion();
  }
  activateMotion(): void {
    if (!this.tiltWanted || !this.tiltSupported || this.tiltPending) return;
    const DOE = (window as unknown as {DeviceOrientationEvent:{requestPermission?:()=>Promise<string>}}).DeviceOrientationEvent;
    const start = () => {
      this.tiltActive = true;
      this.motionRequestedAt = performance.now();
      this.motionState = 'waiting';
      if (!this.tiltListening) { window.addEventListener('deviceorientation',this.onOrient); this.tiltListening = true; }
    };
    if (this.tiltActive) { start(); return; }
    if (typeof DOE.requestPermission === 'function') {
      this.tiltPending = true; this.motionState = 'permission';
      try {
        DOE.requestPermission().then(result => {
          if (result === 'granted') start(); else this.motionState = 'denied';
        }).catch(() => { this.motionState = 'denied'; }).finally(() => { this.tiltPending = false; });
      } catch { this.tiltPending = false; this.motionState = 'denied'; }
    } else start();
  }
  calibrateMotion(): boolean {
    if (!this.tiltActive || !this.motion.calibrate(performance.now())) return false;
    this.motionState = 'ready';
    // A paused race still needs its explicit Resume action.
    if (!this.motionDriving) this.mobileSuspended = false;
    return true;
  }
  resumeMobile(): boolean {
    if (this.touchMode && this.tiltWanted && !['denied','unavailable'].includes(this.motionStatus) && !this.motion.calibrated) return false;
    this.pointers.clear();
    this.mobileSuspended = false;
    return true;
  }
  consumeMobilePause(): boolean { const pause = this.mobilePause; this.mobilePause = false; return pause; }
  interruptMobile(rotation: boolean): void {
    this.pointers.clear(); this.taps.length = 0; this.tiltTapId = -1;
    this.motion.clear(rotation);
    if (rotation && this.tiltWanted) this.motionState = 'calibrate';
    if (this.touchMode && this.tiltWanted && this.motionDriving) { this.mobileSuspended = true; this.mobilePause = true; }
  }
  private onOrient = (e: DeviceOrientationEvent): void => {
    if (!this.tiltWanted || !this.tiltActive) return;
    const angle = typeof screen !== 'undefined' && typeof screen.orientation?.angle === 'number'
      ? screen.orientation.angle : Number((window as unknown as {orientation?:number}).orientation) || 0;
    if (this.motion.sample(e.beta,e.gamma,angle,performance.now(),this.mobile.sensitivity)) {
      if (!this.motion.calibrated) this.motionState = 'calibrate';
    }
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
    if (this.tiltActive && this.tiltWanted && this.touchMode) {
      const last = Math.max(this.motion.lastSample,this.motionRequestedAt);
      if (performance.now() - last > 1000 && this.motionState !== 'unavailable') {
        this.interruptMobile(true); this.motionState = 'unavailable';
      }
    }
    const g = this.pad();
    const id = g ? `${g.index}:${g.id}` : '';
    if (this.padId !== id) { this.padPrev = []; this.padId = id; this.drivePrev = { pause: false }; this.padNeutral = g ? g.axes.map(v => g.mapping === 'standard' ? 0 : Math.abs(v) > .85 ? Math.sign(v) : 0) : []; }
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
    if (this.releaseGate) { this.pressed.clear(); if (this.neutral(g)) { this.releaseGate = false; this.padPrev = []; this.drivePrev = { pause: false }; } else return; }
    if (!g) return;
    const b = (i: number) => !!g.buttons[i]?.pressed;
    const now = [b(0), b(1), b(12), b(13), b(14), b(15), (g.axes[0] ?? 0) < -0.6, (g.axes[0] ?? 0) > 0.6, (g.axes[1] ?? 0) < -0.6, (g.axes[1] ?? 0) > 0.6];
    const map: Btn[] = ["confirm", "back", "up", "down", "left", "right", "left", "right", "up", "down"];
    for (let i = 0; i < now.length; i++) {
      if (now[i] && !this.padPrev[i]) { this.pressed.add(map[i]); this.lastInput = performance.now(); this.onGesture?.(); }
    }
    this.padPrev = now;
    for (const action of ['pause'] as const) {
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
    if (!this.mobileSuspended && !tilt && this.touchHeld(TOUCH.left)) s -= 1;
    if (!this.mobileSuspended && !tilt && this.touchHeld(TOUCH.right)) s += 1;
    if (tilt) s += this.motion.steer;
    const g = this.pad();
    s += this.bindings.gamepad('right', g) - this.bindings.gamepad('left', g);
    return Math.max(-1, Math.min(1, s));
  }

  get throttle(): number {
    if (this.blocked) return 0;
    const mobile = this.mobileSuspended ? 0 : this.activeMobileScheme === 'tilt-full' ? Math.max(0,this.motion.pedal) : this.touchHeld(this.tiltMode ? TOUCH_TILT.gas : TOUCH.gas) ? 1 : 0;
    return Math.max(this.bindings.keyboard('throttle', this.held),mobile,this.bindings.gamepad('throttle',this.pad()));
  }

  get brake(): number {
    if (this.blocked) return 0;
    const mobile = this.mobileSuspended ? 0 : this.activeMobileScheme === 'tilt-full' ? Math.max(0,-this.motion.pedal) : this.touchHeld(this.tiltMode ? TOUCH_TILT.brake : TOUCH.brake) ? 1 : 0;
    return Math.max(this.bindings.keyboard('brake', this.held),mobile,this.bindings.gamepad('brake',this.pad()));
  }

  /** Edge-triggered press, consumed on read. */
  hit(b: Btn): boolean {
    if (this.capture || this.releaseGate || this.textMode && b === 'pause') return false;
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

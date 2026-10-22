// Keyboard, touch and gamepad folded into one set of driving controls plus
// edge-triggered menu presses. Coordinates are framebuffer pixels (320x180).
import { W, H } from "./core/fb";

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

const TILT_KEY = "sunset-coast-run.tilt";
const CONTROLS_KEY = "sunset-coast-run.controls";

/** How the player drives: picked on the "Choose your controls" screen. */
export type ControlPref = "auto" | "keyboard" | "touch";
export const CONTROL_PREFS: ControlPref[] = ["auto", "keyboard", "touch"];
const TILT_DEAD = 3;   // degrees of free play around level
const TILT_FULL = 24;  // degrees for full steering lock

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

type Btn = "left" | "right" | "up" | "down" | "confirm" | "back" | "pause";

const KEYMAP: Record<string, Btn> = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  Enter: "confirm", NumpadEnter: "confirm", Space: "confirm",
  Escape: "back", Backspace: "back", KeyP: "pause",
};

/** Driving keys that count as "using the keyboard" for auto-detect. */
const DRIVE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyX", "KeyZ", "ShiftLeft"];

export class Input {
  private held = new Set<string>();
  private pressed = new Set<Btn>();
  private taps: { x: number; y: number }[] = [];
  private pointers = new Map<number, { x: number; y: number }>();
  private padPrev: boolean[] = [];
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
      const b = KEYMAP[e.code];
      // auto-detect follows what is actually being used: a key press means keyboard
      if (b || DRIVE_KEYS.includes(e.code)) this.autoTouch = false;
      if (b || e.code === "KeyX" || e.code === "KeyZ") e.preventDefault();
      if (!this.held.has(e.code) && b) this.pressed.add(b);
      if (e.code === "KeyX") this.pressed.add("confirm");
      this.held.add(e.code);
      this.lastInput = performance.now();
      this.onGesture?.();
    });
    window.addEventListener("keyup", (e) => { this.held.delete(e.code); });
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

  /** Call once per frame before reading presses. */
  poll(): void {
    const g = this.pad();
    if (!g) return;
    const b = (i: number) => !!g.buttons[i]?.pressed;
    const now = [b(0), b(1), b(9), b(12), b(13), b(14), b(15), (g.axes[0] ?? 0) < -0.6, (g.axes[0] ?? 0) > 0.6, (g.axes[1] ?? 0) < -0.6, (g.axes[1] ?? 0) > 0.6];
    const map: Btn[] = ["confirm", "back", "pause", "up", "down", "left", "right", "left", "right", "up", "down"];
    for (let i = 0; i < now.length; i++) {
      if (now[i] && !this.padPrev[i]) { this.pressed.add(map[i]); this.lastInput = performance.now(); this.onGesture?.(); }
    }
    this.padPrev = now;
  }

  get steer(): number {
    let s = 0;
    const tilt = this.tiltMode;
    if (this.key("ArrowLeft", "KeyA") || (!tilt && this.touchHeld(TOUCH.left))) s -= 1;
    if (this.key("ArrowRight", "KeyD") || (!tilt && this.touchHeld(TOUCH.right))) s += 1;
    if (tilt) s += this.tiltSteer;
    const g = this.pad();
    if (g) {
      const ax = g.axes[0] ?? 0;
      if (Math.abs(ax) > 0.15) s += ax;
      if (g.buttons[14]?.pressed) s -= 1;
      if (g.buttons[15]?.pressed) s += 1;
    }
    return Math.max(-1, Math.min(1, s));
  }

  get throttle(): number {
    if (this.key("ArrowUp", "KeyW", "Space", "KeyX", "ShiftLeft") || this.touchHeld(this.tiltMode ? TOUCH_TILT.gas : TOUCH.gas)) return 1;
    const g = this.pad();
    if (g) {
      const rt = g.buttons[7]?.value ?? 0;
      if (g.buttons[0]?.pressed || rt > 0.2) return Math.max(rt, g.buttons[0]?.pressed ? 1 : 0);
    }
    return 0;
  }

  get brake(): number {
    if (this.key("ArrowDown", "KeyS", "KeyZ") || this.touchHeld(this.tiltMode ? TOUCH_TILT.brake : TOUCH.brake)) return 1;
    const g = this.pad();
    if (g) {
      const lt = g.buttons[6]?.value ?? 0;
      if (g.buttons[1]?.pressed || lt > 0.2) return Math.max(lt, g.buttons[1]?.pressed ? 1 : 0);
    }
    return 0;
  }

  /** Edge-triggered press, consumed on read. */
  hit(b: Btn): boolean {
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

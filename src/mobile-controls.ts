import { SAVE_PREFIX } from './game/edition';

export type MobileScheme = 'buttons' | 'tilt-pedals' | 'tilt-full';
export interface MobileSettings {
  version: 1;
  scheme: MobileScheme;
  size: .6 | .8 | 1;
  opacity: .2 | .4 | .6;
  sensitivity: 30 | 24 | 18;
}
export const MOBILE_KEY = `${SAVE_PREFIX}.mobile-controls.v1`;
export const MOBILE_SCHEMES: MobileScheme[] = ['buttons', 'tilt-pedals', 'tilt-full'];
export const MOBILE_DEFAULTS: MobileSettings = {version:1,scheme:'buttons',size:.6,opacity:.2,sensitivity:24};

export function normalizeMobile(value: Partial<MobileSettings>): MobileSettings {
  return {
    version:1,
    scheme:MOBILE_SCHEMES.includes(value.scheme!) ? value.scheme! : 'buttons',
    size:[.6,.8,1].includes(value.size!) ? value.size! : .6,
    opacity:[.2,.4,.6].includes(value.opacity!) ? value.opacity! : .2,
    sensitivity:[30,24,18].includes(value.sensitivity!) ? value.sensitivity! : 24,
  };
}
export function loadMobile(): MobileSettings {
  try {
    const raw = localStorage.getItem(MOBILE_KEY);
    if (raw !== null) {
      const value = JSON.parse(raw);
      return value?.version === 1 ? normalizeMobile(value) : {...MOBILE_DEFAULTS};
    }
    return {...MOBILE_DEFAULTS,scheme:localStorage.getItem(`${SAVE_PREFIX}.tilt`) === '1' ? 'tilt-pedals' : 'buttons'};
  } catch { return {...MOBILE_DEFAULTS}; }
}

const DEG = Math.PI / 180;
const wrap = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;
const axis = (angle: number, full: number) => Math.sign(angle) * Math.min(1, Math.max(0, Math.abs(angle) - 3) / (full - 3));

/** Sensor math is independent of permission/UI. No compass heading is required. */
export class TiltDrive {
  lastSample = -Infinity;
  calibrated = false;
  steer = 0;
  pedal = 0;
  private angles: {roll:number;pitch:number} | null = null;
  private neutral: {roll:number;pitch:number} | null = null;
  sample(beta: number | null, gamma: number | null, screenAngle: number, now: number, full: number): boolean {
    if (beta === null || gamma === null || !Number.isFinite(beta) || !Number.isFinite(gamma)) return false;
    const b = beta * DEG, g = gamma * DEG, th = screenAngle * DEG;
    const ux = -Math.sin(g) * Math.cos(b), uy = Math.sin(b), uz = Math.cos(g) * Math.cos(b);
    const sx = ux * Math.cos(th) - uy * Math.sin(th), sy = ux * Math.sin(th) + uy * Math.cos(th);
    this.angles = {roll:Math.atan2(-sx,Math.hypot(sy,uz))/DEG,pitch:Math.atan2(sy,uz)/DEG};
    const dt = Math.max(0, Math.min(100, now - this.lastSample));
    this.lastSample = now;
    if (this.calibrated && this.neutral) {
      const smooth = 1 - Math.exp(-dt / 65);
      this.steer += (axis(wrap(this.angles.roll - this.neutral.roll),full) - this.steer) * smooth;
      this.pedal += (axis(wrap(this.neutral.pitch - this.angles.pitch),full) - this.pedal) * smooth;
      if (Math.abs(this.steer) < .0001) this.steer = 0;
      if (Math.abs(this.pedal) < .0001) this.pedal = 0;
    }
    return true;
  }
  calibrate(now: number): boolean {
    if (!this.angles || now - this.lastSample > 1000) return false;
    this.neutral = {...this.angles};
    this.calibrated = true;
    this.steer = this.pedal = 0;
    return true;
  }
  clear(invalidate = false): void {
    this.steer = this.pedal = 0;
    if (invalidate) { this.calibrated = false; this.neutral = this.angles = null; this.lastSample = -Infinity; }
  }
}

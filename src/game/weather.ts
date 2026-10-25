import type { Theme } from './themes';

export interface RoadWeather { rain: number; snow: number; fog: number; sand: number; dark: number }
export interface WindVector { side: number; forward: number }

const clamp = (x: number, low: number, high: number): number => Math.max(low, Math.min(high, x));

/** Positive longitudinal wind blows in the driving direction. */
export const windSpeedFactor = (forward: number): number => 1 + .10 * clamp(forward, -1, 1);
export const windBendFactor = (forward: number): number => 1 + .25 * clamp(forward, 0, 1);

/** Samples the same smooth stage transition for a car at any road position. */
export function blendWeather(a: Theme, b: Theme, t: number): RoadWeather {
  const amount = (kind: string) => Number(a.weather === kind) * (1 - t) + Number(b.weather === kind) * t;
  return { rain: amount('rain'), snow: amount('snow'), fog: amount('fog'), sand: amount('sand'), dark: (a.dark ?? 0) * (1 - t) + (b.dark ?? 0) * t };
}

/** Visibility penalties do not stack; local ice can be the dominant hazard. */
export function npcSpeedFactor(w: RoadWeather, ice: number): number {
  return 1 - Math.max(.08 * w.rain, .12 * w.snow, .20 * w.fog, .15 * w.sand, .10 * w.dark, .25 * ice);
}

/** Cautious traffic keeps a passing lane open instead of forming a rolling wall. */
export function npcKeepRight(w: RoadWeather): boolean {
  return Math.max(w.rain, w.snow, w.fog, w.sand, w.dark) >= .15;
}

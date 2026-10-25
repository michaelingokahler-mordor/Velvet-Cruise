// Easy / Normal / Hard: how generous the clock is, how heavy the traffic gets,
// and how much each run's points are worth. Each has its own rankings and badges.
import { Col, rgb } from "../core/fb";

export type DiffId = "easy" | "normal" | "hard";

export interface Difficulty {
  id: DiffId;
  nameKey: string;
  descKey: string;
  /** Multiplies the starting time and every checkpoint bonus. */
  clock: number;
  /** Multiplies how many rival cars share the road. */
  traffic: number;
  /** Multiplies how often rivals swerve between lanes. */
  lanes: number;
  /** Multiplies every point earned. */
  score: number;
  /** Dry-bend centrifugal pull; engine and steering response stay arcade-like. */
  cornering: number;
  /** Ice steering/braking response. */
  weather: number;
  /** Crosswind force relative to the reference one-lane gust. */
  wind: number;
  /** Additional outward curve pull at full rain or snow intensity. */
  rainBend: number;
  snowBend: number;
  /** Multiplies the snowy curve force on full ice. */
  iceBend: number;
  col: Col;
}

export const DIFFS: Difficulty[] = [
  { id: "easy", nameKey: "diff.easy", descKey: "diff.easy_desc", clock: 1.18, traffic: 0.65, lanes: 0.6, score: 0.5, cornering:1, weather:0.85, wind:1, rainBend:.15, snowBend:.10, iceBend:2, col: rgb(0x7cf06a) },
  { id: "normal", nameKey: "diff.normal", descKey: "diff.normal_desc", clock: 1, traffic: 1, lanes: 1, score: 1, cornering:1.04, weather:1.2, wind:1.45, rainBend:.21, snowBend:.15, iceBend:2.1, col: rgb(0xffe860) },
  { id: "hard", nameKey: "diff.hard", descKey: "diff.hard_desc", clock: 1, traffic: 1.1, lanes: 1.15, score: 1.5, cornering:1.08, weather:1.45, wind:1.85, rainBend:.25, snowBend:.20, iceBend:2.2, col: rgb(0xff4a3a) },
];

export const NORMAL = DIFFS[1];

/** Ice multiplies the current snow/wet force, with smooth entry and exit. */
export function weatherBend(diff: Difficulty, rain: number, snow: number, ice: number): number {
  return (1 + diff.rainBend * rain + diff.snowBend * snow) * (1 + (diff.iceBend - 1) * ice);
}

export function diffById(id: string | null | undefined): Difficulty {
  return DIFFS.find((d) => d.id === id) ?? NORMAL;
}

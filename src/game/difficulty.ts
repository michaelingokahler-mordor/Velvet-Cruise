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
  /** Strength of the existing rain/snow/ice/wind effects. */
  weather: number;
  col: Col;
}

export const DIFFS: Difficulty[] = [
  { id: "easy", nameKey: "diff.easy", descKey: "diff.easy_desc", clock: 1.18, traffic: 0.65, lanes: 0.6, score: 0.5, cornering:1, weather:0.85, col: rgb(0x7cf06a) },
  { id: "normal", nameKey: "diff.normal", descKey: "diff.normal_desc", clock: 1, traffic: 1, lanes: 1, score: 1, cornering:1.04, weather:1.2, col: rgb(0xffe860) },
  { id: "hard", nameKey: "diff.hard", descKey: "diff.hard_desc", clock: 1, traffic: 1.1, lanes: 1.15, score: 1.5, cornering:1.08, weather:1.45, col: rgb(0xff4a3a) },
];

export const NORMAL = DIFFS[1];

export function diffById(id: string | null | undefined): Difficulty {
  return DIFFS.find((d) => d.id === id) ?? NORMAL;
}

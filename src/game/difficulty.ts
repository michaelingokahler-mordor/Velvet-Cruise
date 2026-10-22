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
  col: Col;
}

export const DIFFS: Difficulty[] = [
  { id: "easy", nameKey: "diff.easy", descKey: "diff.easy_desc", clock: 1.3, traffic: 0.55, lanes: 0.5, score: 0.5, col: rgb(0x7cf06a) },
  { id: "normal", nameKey: "diff.normal", descKey: "diff.normal_desc", clock: 1, traffic: 1, lanes: 1, score: 1, col: rgb(0xffe860) },
  { id: "hard", nameKey: "diff.hard", descKey: "diff.hard_desc", clock: 0.85, traffic: 1.5, lanes: 1.7, score: 1.5, col: rgb(0xff4a3a) },
];

export const NORMAL = DIFFS[1];

export function diffById(id: string | null | undefined): Difficulty {
  return DIFFS.find((d) => d.id === id) ?? NORMAL;
}

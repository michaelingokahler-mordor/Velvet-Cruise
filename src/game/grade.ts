import { MAX_SPEED } from './config';

/** World height and road distance share a scale; positive grade means uphill. */
export function gradePhysics(grade: number): { speedFactor: number; acceleration: number } {
  // Bound artistic terrain spikes while preserving the actual gentle gradients.
  const slope = Math.max(-.08, Math.min(.08, grade));
  return { speedFactor: 1 - 2.5 * slope, acceleration: -MAX_SPEED * 1.8 * slope };
}

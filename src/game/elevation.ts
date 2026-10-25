import type { Seg, StageInfo } from './track';

export type RoadFeature = 'hills' | 'uphill' | 'pass';
interface ElevationProfile {
  feature: RoadFeature;
  /** Progress along the existing stage and height above its entrance. */
  points: readonly (readonly [number, number])[];
}

const hills = (height: number): ElevationProfile => ({
  feature: 'hills',
  points: [[0, 0], [.05, 0], [.15, height * .82], [.25, height * .10],
    [.37, height], [.44, height * .25], [.56, height * .25],
    [.62, height * .94], [.72, height * .04], [.83, height * .75], [.94, 0], [1, 0]],
});
const pass = (height: number): ElevationProfile => ({
  feature: 'pass', points: [[0, 0], [.03, 0], [.40, height], [.60, height], [.94, 0], [1, 0]],
});

export const ELEVATION_PROFILES: Readonly<Record<number, ElevationProfile | undefined>> = {
  3: hills(11000),
  6: hills(16000),
  7: pass(22000),
  11: pass(31000),
  14: { feature: 'uphill', points: [[0, 0], [.02, 0], [.40, 15000], [.55, 15000], [.92, 34000], [1, 34000]] },
};

function heightAt(profile: ElevationProfile, progress: number): number {
  const points = profile.points;
  for (let k = 1; k < points.length; k++) {
    const [to, high] = points[k], [from, low] = points[k - 1];
    if (progress <= to) {
      const t = Math.max(0, Math.min(1, (progress - from) / (to - from)));
      // Zero grade at every crest, valley and plateau; no sharp road kinks.
      return low + (high - low) * t * t * (3 - 2 * t);
    }
  }
  return points[points.length - 1][1];
}

/** Elevation consumes no RNG and is applied before terrain, plots and lamps. */
export function applyStageElevation(segs: Seg[], stage: StageInfo): void {
  const profile = ELEVATION_PROFILES[stage.node];
  if (!profile) return;
  const { startSeg, endSeg } = stage, entrance = segs[startSeg].y1, length = endSeg - startSeg;
  for (let i = startSeg; i < endSeg; i++) {
    segs[i].y1 = entrance + heightAt(profile, (i - startSeg) / length);
    segs[i].y2 = entrance + heightAt(profile, (i + 1 - startSeg) / length);
  }
}

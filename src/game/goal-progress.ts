import type { DiffId } from './difficulty';
import { SAVE_PREFIX } from './edition';

export type GoalLetter = 'A' | 'B' | 'C' | 'D' | 'E';
export interface GoalProgress {
  version: 1;
  masks: Record<DiffId, number>;
  plusUnlocked: boolean;
}
export const GOAL_PROGRESS_KEY = `${SAVE_PREFIX}.goal-progress.v1`;
export const GOAL_LETTERS: readonly GoalLetter[] = ['A', 'B', 'C', 'D', 'E'];
const TIERS: readonly DiffId[] = ['easy', 'normal', 'hard'];
const GOAL_NODES = [10, 12, 13, 14, 4];
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Unknown versions and malformed masks never grant goals. The saved unlock is sticky. */
export function normalizeGoalProgress(raw: unknown): GoalProgress {
  const state: GoalProgress = { version: 1, masks: { easy: 0, normal: 0, hard: 0 }, plusUnlocked: false };
  if (!object(raw) || raw.version !== 1) return state;
  if (object(raw.masks)) for (const tier of TIERS) {
    const n = raw.masks[tier];
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 31) state.masks[tier] = n;
  }
  state.plusUnlocked = raw.plusUnlocked === true || state.masks.normal === 31;
  return state;
}

export function recordGoal(state: GoalProgress, tier: DiffId, goal: GoalLetter): GoalProgress {
  const next = normalizeGoalProgress(state), index = GOAL_LETTERS.indexOf(goal);
  if (TIERS.includes(tier) && index >= 0) next.masks[tier] |= 1 << index;
  next.plusUnlocked ||= next.masks.normal === 31;
  return next;
}

/** Only completed final-column stages and the NEW difficulty-specific badges qualify. */
export function mergeCompletedGoals(state: GoalProgress,
  cleared: Partial<Record<DiffId, readonly number[]>>,
  completedTiers: ReadonlySet<DiffId>): GoalProgress {
  let next = normalizeGoalProgress(state);
  for (const tier of TIERS) {
    if (completedTiers.has(tier)) next.masks[tier] = 31;
    const nodes = cleared?.[tier];
    if (Array.isArray(nodes)) for (const node of nodes) {
      const index = GOAL_NODES.indexOf(node);
      if (index >= 0) next = recordGoal(next, tier, GOAL_LETTERS[index]);
    }
  }
  next.plusUnlocked ||= next.masks.normal === 31;
  return next;
}

export function goalCount(state: GoalProgress, tier: DiffId): number {
  const mask = normalizeGoalProgress(state).masks[tier] ?? 0;
  return GOAL_LETTERS.reduce((count, _, index) => count + ((mask >>> index) & 1), 0);
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}

/** Persistence failure keeps session rewards usable. Disabled test sessions are read-only. */
export class GoalProgressStore {
  private state: GoalProgress;
  private readable = true;
  constructor(private storage = defaultStorage(), private key = GOAL_PROGRESS_KEY, public enabled = true) {
    let raw: unknown, text: string | null | undefined;
    try { text = storage?.getItem(key); } catch { this.readable = false; }
    try { raw = JSON.parse(text ?? 'null'); } catch { /* malformed progress */ }
    this.state = normalizeGoalProgress(raw);
  }
  get current(): GoalProgress { return normalizeGoalProgress(this.state); }
  record(tier: DiffId, goal: GoalLetter): void { this.update(recordGoal(this.state, tier, goal)); }
  merge(cleared: Partial<Record<DiffId, readonly number[]>>, completedTiers: ReadonlySet<DiffId>): void {
    this.update(mergeCompletedGoals(this.state, cleared, completedTiers));
  }
  private update(next: GoalProgress): void {
    if (!this.enabled || JSON.stringify(next) === JSON.stringify(this.state)) return;
    this.state = next;
    if (!this.readable) return; // do not replace a save whose contents could not be read
    try { this.storage?.setItem(this.key, JSON.stringify(next)); } catch { /* retain session progress */ }
  }
}

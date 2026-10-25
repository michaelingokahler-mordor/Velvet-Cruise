// The route network: fifteen stages in five columns (1 → 2 → 3 → 4 → 5), the
// Out Run triangle. A run drives one stage per column and picks LEFT or RIGHT
// where the road forks at the end of a stage; every stage leads on to the two
// stages next to it in the next column, so most stages can be reached two ways,
// and each of the five stages in the last column is a different goal (A-E).
// The five coast stages are the triangle's bottom edge along the sea: always
// keep RIGHT to stay on the coast (goal E, Twilight Bay). Always keep LEFT for
// the inland highway route: Thunder Highway → Painted Desert → Death Valley →
// Neon City (goal A).

/** Number of columns a run drives through (= stages per run). */
export const COLS = 5;

/** Stages of each column, ordered from inland (top of the map, the LEFT road) to the coast (bottom, RIGHT). */
export const COLUMN_NODES: number[][] = [[0], [5, 1], [8, 6, 2], [9, 11, 7, 3], [10, 12, 13, 14, 4]];

/** Where each stage's fork leads: [left, right] = the two neighbours in the next column; [] = a goal. */
export const NEXT: Record<number, number[]> = (() => {
  const next: Record<number, number[]> = {};
  COLUMN_NODES.forEach((list, c) => list.forEach((n, k) => {
    next[n] = c + 1 < COLUMN_NODES.length ? [COLUMN_NODES[c + 1][k], COLUMN_NODES[c + 1][k + 1]] : [];
  }));
  return next;
})();

/** The goal letter of a last-column stage (A = inland top … E = the coast), or "". */
export function goalLetter(node: number): string {
  const k = COLUMN_NODES[COLUMN_NODES.length - 1].indexOf(node);
  return k >= 0 ? "ABCDE"[k] : "";
}

/** The coast road: right at every fork. */
export const COAST_PATH = [0, 1, 2, 3, 4];
/** The inland edge, ending in Neon City (goal A). */
export const GOAL_A_PATH = [0, 5, 8, 9, 10];
export const NODE_COUNT = 15;

export function colOf(node: number): number {
  for (let c = 0; c < COLUMN_NODES.length; c++) if (COLUMN_NODES[c].includes(node)) return c;
  return 0;
}

/** True when the stage at the end of `node` splits into two roads. */
export function forks(node: number): boolean { return (NEXT[node]?.length ?? 0) === 2; }

/** Complete a path prefix with the planned continuation (keep right). */
export function completePath(prefix: number[]): number[] {
  const p = prefix.length ? prefix.slice(0, COLS) : [0];
  while (p.length < COLS) {
    const nx = NEXT[p[p.length - 1]];
    p.push(nx[nx.length - 1]);
  }
  return p;
}

/** Is this a legal path through the network (one stage per column, following the roads)? */
export function validPath(p: number[]): boolean {
  if (p.length !== COLS || p[0] !== 0) return false;
  for (let i = 1; i < COLS; i++) if (!(NEXT[p[i - 1]] ?? []).includes(p[i])) return false;
  return true;
}

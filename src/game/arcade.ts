// The arcade top 10: a classic "enter your name" high-score table for each
// difficulty, kept on this device (the online rankings always show the
// player's account name, which a game cannot change).
import type { DiffId } from "./difficulty";
import {ARCADE_KEY} from './rules';
import {SAVE_PREFIX} from './edition';
import { renameOnlinePlayer } from '../platform/online-scores';

export interface ArcadeEntry {
  /** Name as entered (upper case). */
  n: string;
  /** Score. */
  s: number;
  /** Car id it was driven in. */
  c: string;
  /** When (ms since 1970). */
  d: number;
}

const KEY = ARCADE_KEY;
const NAME_KEY = `${SAVE_PREFIX}.name`;
export const ARCADE_SIZE = 10;
export const NAME_MAX = 10;
/** Characters a name may use (all drawn by the pixel font). */
const ALLOWED = /^[A-Z0-9 \-.!?&'ÄÖÜÉÈÀÑÇ]$/;

function loadAll(): Record<string, ArcadeEntry[]> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}

/** The table for a difficulty, best first. */
export function arcadeTable(diff: DiffId): ArcadeEntry[] {
  const rows = loadAll()[diff];
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((e) => e && typeof e.n === "string" && typeof e.s === "number" && e.s > 0)
    .sort((a, b) => b.s - a.s || a.d - b.d)
    .slice(0, ARCADE_SIZE);
}

/** Where a score would land (0 = top), or -1 when it doesn't make the table. Ties go below. */
export function arcadeRank(diff: DiffId, score: number): number {
  if (!(score > 0)) return -1;
  const rows = arcadeTable(diff);
  const i = rows.findIndex((e) => score > e.s);
  const at = i < 0 ? rows.length : i;
  return at < ARCADE_SIZE ? at : -1;
}

/** Put an entry in its place; returns where it landed (or -1 if storage is blocked). */
export function arcadeInsert(diff: DiffId, e: ArcadeEntry): number {
  const rows = arcadeTable(diff);
  const i = rows.findIndex((r) => e.s > r.s);
  const at = i < 0 ? rows.length : i;
  if (at >= ARCADE_SIZE) return -1;
  rows.splice(at, 0, e);
  try {
    const all = loadAll();
    all[diff] = rows.slice(0, ARCADE_SIZE);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { return -1; }
  return at;
}

/** Upper-cases one typed character and returns it if a name may contain it. */
export function nameChar(ch: string): string | null {
  const u = ch.toUpperCase();
  return u.length === 1 && ALLOWED.test(u) ? u : null;
}

export function cleanName(s: string): string {
  return Array.from(s).map((c) => nameChar(c) ?? "").join("").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

/** The name entered last time (offered again so a repeat driver only presses OK). */
export function lastName(): string {
  try { return cleanName(localStorage.getItem(NAME_KEY) || ""); } catch { return ""; }
}

export function saveName(n: string): void {
  try { localStorage.setItem(NAME_KEY, n); } catch { /* storage blocked */ }
  void renameOnlinePlayer();
}

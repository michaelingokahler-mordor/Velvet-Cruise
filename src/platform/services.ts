/** Game-owned language, local records and badges, with optional shared rankings. */
import strings from '../../assets/ui/strings.json';
import achievementsJson from '../../assets/ui/achievements.json';
import boardsJson from '../../assets/ui/boards.json';
import { DEMO, SAVE_PREFIX } from '../game/edition';
import { initOnlineScores, onlineScoresConfigured, onlineScoresReachable, onlineTopScores, queueOnlineScore } from './online-scores';
import { isDesktopBuild, isAutomationRun } from './runtime';
import type { RankingEntry } from './ranking-contract';
export { isDesktopBuild } from './runtime';

type Params = Record<string, string | number>;
const SOURCE = Object.fromEntries(strings.strings.map(s => [s.id, s.text]));
const readyFns: (() => void)[] = [], localeFns: (() => void)[] = [];
let ready = false, initialized = false;
function notify(list: (() => void)[]): void { for (const fn of list) { try { fn(); } catch { /* isolate listeners */ } } }
export function onServicesReady(fn: () => void): void { readyFns.push(fn); if (ready) { try { fn(); } catch { /* isolate listeners */ } } }
export async function initServices(): Promise<void> {
  if (initialized) return;
  initialized = true;
  ready = true;
  notify(readyFns);
  window.addEventListener?.('languagechange', () => notify(localeFns));
  if (!DEMO && !isAutomationRun()) await initOnlineScores(() => notify(readyFns)).catch(() => {});
}
export function onLocaleChange(fn: () => void): void { localeFns.push(fn); }
export function t(id: string, params?: Params): string {
  const text = id === 'rank.offline' && DEMO ? 'Online rankings are not available in the demo. Local records stay on this device.' : SOURCE[id] ?? id;
  return params ? text.replace(/\{(\w+)\}/g, (match, key) => key in params ? String(params[key]) : match) : text;
}
export function locale(): string { try { return navigator.language || 'en'; } catch { return 'en'; } }
export function fmtNum(value: number): string { try { return Math.round(value).toLocaleString(locale()); } catch { return String(Math.round(value)); } }
/** Local records are always authoritative on this device, including offline play. */
export function usesLocalServices(): boolean { return true; }
export function servicesOnline(): boolean { return !DEMO && onlineScoresReachable(); }

// Keep the established keys and ranking order for every existing edition.
const LOCAL_BESTS = `${SAVE_PREFIX}.local-bests`, LOCAL_BADGES = `${SAVE_PREFIX}.local-badges`;
const BOARD_ORDER = Object.fromEntries(boardsJson.boards.map(b => [b.board, b.order]));
interface AchDef { id: string; name?: string; stat?: string; target?: number }
const ACH: AchDef[] = achievementsJson.achievements;
function loadJson<T>(key: string, empty: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value && typeof value === 'object' ? value as T : empty; } catch { return empty; }
}
function saveJson(key: string, value: unknown): void { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be blocked */ } }
interface LocalBadges { earned: string[]; counts: Record<string, number> }
function localBadges(): LocalBadges {
  const saved = loadJson<LocalBadges>(LOCAL_BADGES, { earned: [], counts: {} });
  return { earned: Array.isArray(saved.earned) ? saved.earned.filter(id => typeof id === 'string') : [], counts: saved.counts && typeof saved.counts === 'object' ? saved.counts : {} };
}
export type BoardEntry = RankingEntry;
export async function submitScore(board: string, score: number): Promise<{ improved: boolean; best: number }> {
  const rounded = Math.round(score), all = loadJson<Record<string, number>>(LOCAL_BESTS, {});
  const previous = typeof all[board] === 'number' ? all[board] : null;
  const improved = previous === null || (BOARD_ORDER[board] === 'asc' ? rounded < previous : rounded > previous);
  if (improved) { all[board] = rounded; saveJson(LOCAL_BESTS, all); }
  if (!DEMO && !isAutomationRun()) void queueOnlineScore(board, rounded).catch(() => {});
  return { improved, best: improved ? rounded : previous! };
}
export async function topScores(board: string, limit = 8): Promise<BoardEntry[]> {
  return !DEMO && onlineScoresConfigured() ? onlineTopScores(board, limit) : [];
}
export async function myBest(board: string): Promise<number | null> {
  const value = loadJson<Record<string, number>>(LOCAL_BESTS, {})[board];
  return typeof value === 'number' ? value : null;
}
export interface BadgeItem { id: string; name?: string; target?: number; unlocked: boolean; progress?: number }
export async function listBadges(): Promise<BadgeItem[]> {
  const saved = localBadges(), earned = new Set(saved.earned);
  return ACH.map(a => ({ id: a.id, name: a.name, target: a.target, unlocked: earned.has(a.id), progress: a.stat ? saved.counts[a.stat] ?? 0 : undefined }));
}
export async function unlockBadge(id: string): Promise<'new' | 'had' | null> {
  if (!ACH.some(a => a.id === id)) return null;
  const saved = localBadges();
  if (saved.earned.includes(id)) return 'had';
  saved.earned.push(id); saveJson(LOCAL_BADGES, saved); return 'new';
}
export async function badgeProgress(stat: string, amount: number): Promise<{ value: number; unlocked: string[] }> {
  const saved = localBadges(), value = Math.max(0, (Number(saved.counts[stat]) || 0) + Math.max(0, amount));
  saved.counts[stat] = value;
  const unlocked = ACH.filter(a => a.stat === stat && a.target && value >= a.target && !saved.earned.includes(a.id)).map(a => a.id);
  saved.earned.push(...unlocked); saveJson(LOCAL_BADGES, saved); return { value, unlocked };
}

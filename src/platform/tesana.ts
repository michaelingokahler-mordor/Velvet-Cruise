// Thin, failure-proof access to the Tesana play SDK (translations,
// leaderboards, gameplay analytics). The game runs fine without it.
//
// Desktop (Steam) builds run with no online service at all: there the
// leaderboard and badge calls are never sent (they would only ask the game's
// own files for addresses that do not exist). Instead the player's personal
// bests and badges are kept on this computer, so the title's best score, the
// "new best" stars and the badges screen still work. Nothing here ever waits
// for the SDK before the game draws.
import strings from "../../assets/ui/strings.json";
import achievementsJson from "../../assets/ui/achievements.json";
import boardsJson from "../../assets/ui/boards.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Params = Record<string, string | number>;

const SOURCE: Record<string, string> = {};
for (const s of (strings as { strings: { id: string; text: string }[] }).strings) SOURCE[s.id] = s.text;

let sdk: any = null;
const listeners: (() => void)[] = [];
const readyFns: (() => void)[] = [];
let readyFired = false;

function run(fns: (() => void)[]): void {
  for (const f of fns) { try { f(); } catch { /* one listener must not stop the rest */ } }
}

/** The SDK answered (or it is clear it will not): run the ready callbacks. */
function fireReady(): void {
  readyFired = true;
  run(readyFns);
}

/**
 * Run `f` once the play SDK has answered, or once it is clear it will not (not on the page, or the
 * timeout passed); and again if it turns up late. Callbacks must be safe to run twice.
 */
export function onTesanaReady(f: () => void): void {
  readyFns.push(f);
  if (readyFired) { try { f(); } catch { /* */ } }
}

/** Connect to the SDK in the background (the game starts drawing without waiting for this). */
export async function initTesana(timeoutMs = 2500): Promise<void> {
  const w = window as any;
  const ready: Promise<any> | undefined = w.__TESANA_READY__;
  if (!ready || typeof ready.then !== "function") { fireReady(); return; }
  try {
    sdk = await Promise.race([ready, new Promise((r) => setTimeout(() => r(null), timeoutMs))]);
    if (!sdk) {
      // keep listening: if it arrives late, switch over
      ready.then((s: any) => { if (!s) return; sdk = s; hookLocale(); run(listeners); run(readyFns); }).catch(() => {});
      fireReady();
      return;
    }
    hookLocale();
    run(listeners); // the game is already running: switch its text to the player's language
  } catch {
    sdk = null;
  }
  fireReady();
}

function hookLocale(): void {
  try { sdk?.l10n?.onChange?.(() => listeners.forEach((f) => f())); } catch { /* ignore */ }
}

export function onLocaleChange(f: () => void): void { listeners.push(f); }

function fill(s: string, p?: Params): string {
  if (!p) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m));
}

/** Localised text for a declared string id. */
export function t(id: string, p?: Params): string {
  try {
    const f = sdk?.l10n?.t;
    if (typeof f === "function") {
      const out = f(id, p);
      if (typeof out === "string" && out && out !== id) return out;
    }
  } catch { /* fall through */ }
  return fill(SOURCE[id] ?? id, p);
}

export function locale(): string {
  try { return sdk?.l10n?.locale?.() || navigator.language || "en"; } catch { return "en"; }
}

export function fmtNum(n: number): string {
  try { return Math.round(n).toLocaleString(locale()); } catch { return String(Math.round(n)); }
}

// ------------------------------------------------------------ analytics
export const track = {
  levelStart(levelId: string, levelIndex: number): void { try { sdk?.gameplay?.levelStart?.({ levelId, levelIndex }); } catch { /* */ } },
  checkpoint(levelId: string, name: string): void { try { sdk?.gameplay?.checkpoint?.({ levelId, name }); } catch { /* */ } },
  levelComplete(levelId: string, time: number): void { try { sdk?.gameplay?.levelComplete?.({ levelId, value: time }); } catch { /* */ } },
  death(levelId: string, x: number, y: number): void { try { sdk?.gameplay?.death?.({ levelId, x, y }); } catch { /* */ } },
  score(value: number): void { try { sdk?.gameplay?.score?.({ value }); } catch { /* */ } },
  event(name: string, props: Record<string, string | number>): void { try { sdk?.track?.(name, props); } catch { /* */ } },
};

// ------------------------------------------------------- online or not
/** A desktop (Steam) build: it runs with no online service, by design. */
export function isDesktopBuild(): boolean {
  try {
    const w = window as any;
    if (w.TesanaDesktop) return true;
    if (w.__TESANA__ && w.__TESANA__.rail === "steam") return true;
    const meta = document.getElementById("tesana-meta");
    if (meta && /"target"\s*:\s*"desktop"/.test(meta.textContent || "")) return true;
  } catch { /* not a desktop build */ }
  return false;
}

/** Whether online leaderboards and account badges can be asked for at all. */
export function servicesOnline(): boolean {
  if (!sdk) return false;
  if (sdk.__testFake) return true;
  if (isDesktopBuild()) return false;
  try {
    // a page with no service address answers reads empty, but would still send writes nowhere
    if (typeof sdk._canReach === "function" && !sdk._canReach()) return false;
  } catch { /* assume reachable */ }
  return true;
}

// ---------------------------------------------- kept on this computer (desktop)
const LOCAL_BESTS = "sunset-coast-run.local-bests";
const LOCAL_BADGES = "sunset-coast-run.local-badges";
const BOARD_ORDER: Record<string, string> = {};
for (const b of (boardsJson as { boards: { board: string; order: string }[] }).boards) BOARD_ORDER[b.board] = b.order;
interface AchDef { id: string; name?: string; stat?: string; target?: number }
const ACH: AchDef[] = (achievementsJson as { achievements: AchDef[] }).achievements;

function loadJson<T>(key: string, empty: T): T {
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v && typeof v === "object" ? (v as T) : empty; } catch { return empty; }
}
function saveJson(key: string, v: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ }
}

/** This player's own best on a board, kept on this computer (desktop builds). */
function localSubmit(board: string, score: number): { improved: boolean; best: number } {
  const all = loadJson<Record<string, number>>(LOCAL_BESTS, {});
  const had = typeof all[board] === "number" ? all[board] : null;
  const asc = BOARD_ORDER[board] === "asc";
  const improved = had === null || (asc ? score < had : score > had);
  if (improved) { all[board] = score; saveJson(LOCAL_BESTS, all); }
  return { improved, best: improved ? score : (had as number) };
}

interface LocalBadges { earned: string[]; counts: Record<string, number> }
function localBadges(): LocalBadges {
  const b = loadJson<LocalBadges>(LOCAL_BADGES, { earned: [], counts: {} });
  return { earned: Array.isArray(b.earned) ? b.earned.filter((x) => typeof x === "string") : [], counts: b.counts && typeof b.counts === "object" ? b.counts : {} };
}

// ---------------------------------------------------------- leaderboards
export interface BoardEntry { rank: number; score: number; displayName: string; you?: boolean }

export async function submitScore(board: string, score: number): Promise<{ improved: boolean; best: number } | null> {
  if (isDesktopBuild()) return localSubmit(board, Math.round(score));
  try {
    if (!servicesOnline() || !sdk?.scores?.submit) return null;
    const r = await sdk.scores.submit(board, Math.round(score));
    return { improved: !!r?.improved, best: Number(r?.best ?? score) };
  } catch (err) {
    console.warn("score not sent", err);
    return null;
  }
}

export async function topScores(board: string, limit = 8): Promise<BoardEntry[]> {
  try {
    if (!servicesOnline() || !sdk?.scores?.top) return [];
    const r = await sdk.scores.top(board, { limit });
    return (r?.entries ?? []) as BoardEntry[];
  } catch {
    return [];
  }
}

export async function myBest(board: string): Promise<number | null> {
  if (isDesktopBuild()) {
    const v = loadJson<Record<string, number>>(LOCAL_BESTS, {})[board];
    return typeof v === "number" ? v : null;
  }
  try {
    if (!servicesOnline() || !sdk?.scores?.best) return null;
    const r = await sdk.scores.best(board);
    return r ? Number(r.score) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- badges
export interface BadgeItem { id: string; name?: string; target?: number; unlocked: boolean; progress?: number }

/** True when the page runs the test stand-in SDK (test hooks may then report badges to it). */
export function isTestSdk(): boolean { return !!sdk?.__testFake; }

/** Every declared badge with this player's state, or null when badges can't be reached. */
export async function listBadges(): Promise<BadgeItem[] | null> {
  if (isDesktopBuild()) {
    const b = localBadges(), got = new Set(b.earned);
    return ACH.map((a) => ({ id: a.id, name: a.name, target: a.target, unlocked: got.has(a.id), progress: a.stat ? b.counts[a.stat] ?? 0 : undefined }));
  }
  try {
    if (!servicesOnline() || !sdk?.achievements?.list) return null;
    const items = await sdk.achievements.list();
    return Array.isArray(items) ? (items as BadgeItem[]) : null;
  } catch (err) {
    console.warn("badges not loaded", err);
    return null;
  }
}

/** Unlock a plain badge: "new" the first time, "had" if already earned, null on failure. */
export async function unlockBadge(id: string): Promise<"new" | "had" | null> {
  if (isDesktopBuild()) {
    if (!ACH.some((a) => a.id === id)) return null;
    const b = localBadges();
    if (b.earned.includes(id)) return "had";
    b.earned.push(id);
    saveJson(LOCAL_BADGES, b);
    return "new";
  }
  try {
    if (!servicesOnline() || !sdk?.achievements?.unlock) return null;
    const r = await sdk.achievements.unlock(id);
    if (r?.unlocked) return "new";
    if (r?.alreadyUnlocked) return "had";
    return null;
  } catch (err) {
    console.warn("badge not sent", err);
    return null;
  }
}

/** Add to a badge counter; returns the new total and any badges it unlocked, or null on failure. */
export async function badgeProgress(stat: string, n: number): Promise<{ value: number | null; unlocked: string[] } | null> {
  if (isDesktopBuild()) {
    const b = localBadges();
    const value = Math.max(0, (Number(b.counts[stat]) || 0) + Math.max(0, n));
    b.counts[stat] = value;
    const unlocked = ACH.filter((a) => a.stat === stat && a.target && value >= a.target && !b.earned.includes(a.id)).map((a) => a.id);
    b.earned.push(...unlocked);
    saveJson(LOCAL_BADGES, b);
    return { value, unlocked };
  }
  try {
    if (!servicesOnline() || !sdk?.achievements?.progress) return null;
    const r = await sdk.achievements.progress(stat, n);
    return { value: typeof r?.value === "number" ? r.value : null, unlocked: Array.isArray(r?.unlocked) ? r.unlocked.map(String) : [] };
  } catch (err) {
    console.warn("badge progress not sent", err);
    return null;
  }
}

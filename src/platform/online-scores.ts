import { isDesktopBuild, isAutomationRun, isDesktopAutomation } from './runtime';
import { SAVE_PREFIX } from '../game/edition';
import { rankingBoard, rankingName, validRankingScore, type RankingEntry, type RankingProfile } from './ranking-contract';
import { productionRankingsAllowed } from './ranking-access';

const PROFILE_KEY = `${SAVE_PREFIX}.online-profile`;
const PENDING_KEY = `${SAVE_PREFIX}.online-pending`;
const NAME_KEY = `${SAVE_PREFIX}.name`;
let enabled = false, base = '', reachable = false, listening = false;
let profile: RankingProfile | null | undefined;
let profileRequest: Promise<RankingProfile> | null = null;
let syncing: Promise<void> | null = null;
let notify: () => void = () => {};
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRetry(): void {
  const p = player();
  const needed = enabled && (!reachable || Object.keys(pending()).length > 0 || (p && p.displayName !== currentName()));
  if (!needed) { clearTimeout(retryTimer); retryTimer = undefined; return; }
  if (retryTimer !== undefined) return;
  retryTimer = setTimeout(async () => {
    retryTimer = undefined;
    await initOnlineScores(notify);
  }, 15000);
  // Browser timers are numeric; Node-based local verification must be able to exit.
  (retryTimer as unknown as { unref?: () => void }).unref?.();
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Local storage may be disabled. */ }
}
function currentName(): string {
  try { return rankingName(localStorage.getItem(NAME_KEY)) || 'DRIVER'; } catch { return 'DRIVER'; }
}
function validProfile(value: unknown): value is RankingProfile {
  const p = value as RankingProfile | null;
  return !!p && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(p.id) && /^[0-9a-f]{64}$/.test(p.token) && typeof p.displayName === 'string';
}
function player(): RankingProfile | null {
  // Another tab may have created or replaced the credentials since our last call.
  const stored = read<unknown>(PROFILE_KEY, profile ?? null);
  profile = validProfile(stored) ? stored : null;
  return profile;
}
function pending(): Record<string, number> {
  const stored = read<unknown>(PENDING_KEY, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  return Object.fromEntries(Object.entries(stored).filter(([id, value]) => {
    const board = rankingBoard(id);
    return board && validRankingScore(board, value);
  }));
}
function connection(value: boolean): void {
  if (reachable === value) return;
  reachable = value;
  notify();
}
class ApiError extends Error {
  constructor(readonly status: number, readonly profileToken?: string) { super('Rankings request failed'); }
}
function forgetRejectedProfile(error: ApiError): void {
  if (error.profileToken && player()?.token === error.profileToken) {
    profile = null;
    save(PROFILE_KEY, null);
  }
}
async function request(path: string, data?: unknown, authenticated = false): Promise<any> {
  const p = authenticated ? player() : null;
  const response = await fetch(base + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(p ? { Authorization: `Bearer ${p.id}.${p.token}` } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new ApiError(response.status, p?.token);
  return response.json();
}
async function ensureProfile(): Promise<RankingProfile> {
  if (profileRequest) return profileRequest;
  const connect = async () => {
    let p = player();
    if (!p) {
      const created = await request('/profiles', { displayName: currentName() });
      if (!validProfile(created)) throw new Error('Invalid ranking profile');
      p = created;
      profile = p;
      save(PROFILE_KEY, p);
    }
    const name = currentName();
    if (p.displayName !== name) {
      const updated = await request('/profile', { displayName: name }, true);
      if (updated.displayName !== name) throw new Error('Invalid ranking name');
      p.displayName = name;
      save(PROFILE_KEY, p);
    }
    return p;
  };
  // Web Locks serialize first-time profile creation across tabs on this origin.
  const active = typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(PROFILE_KEY, connect).then(value => value)
    : connect();
  profileRequest = active;
  try { return await active; } finally { profileRequest = null; }
}

/** Full web/native editions share the service; production access is checked separately. */
export async function initOnlineScores(changed: () => void = () => {}): Promise<void> {
  enabled = true;
  notify = changed;
  if (!listening) {
    listening = true;
    const reconnect = () => { void initOnlineScores(notify); };
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', reconnect);
  }
  try {
    const config = await (await fetch(new URL('online.json', document.baseURI).href, { cache: 'no-store', signal: AbortSignal.timeout(5000) })).json();
    const url = new URL(config.apiBase);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) || url.username || url.password || url.search || url.hash || url.pathname !== '/') return;
    // A preview or automated test can use fixtures, but never the live service.
    if (url.origin === 'https://velvet-cruise-api.emerald-hollows.workers.dev' && !productionRankingsAllowed({
      production: import.meta.env.PROD === true, href: location.href,
      automation: isAutomationRun() || isDesktopAutomation(), desktop: isDesktopBuild(), desktopEnabled: import.meta.env.VITE_DESKTOP_RANKINGS === 'true',
    })) { enabled = false; return; }
    base = url.origin;
    const health = await request('/health');
    if (health.ok !== true || health.service !== 'velvet-cruise') throw new Error('Invalid ranking service');
    connection(true);
    await flushOnlineScores();
  } catch { connection(false); }
  finally { scheduleRetry(); }
}
export function onlineScoresConfigured(): boolean { return enabled && !!base; }
export function onlineScoresReachable(): boolean { return enabled && reachable; }

/** Keep the best new result per board until the server acknowledges that value. */
export async function queueOnlineScore(id: string, score: number): Promise<void> {
  const board = rankingBoard(id);
  if (!enabled || !board || !validRankingScore(board, score)) return;
  const queue = pending(), old = queue[id];
  if (old === undefined || (board.order === 'asc' ? score < old : score > old)) queue[id] = score;
  save(PENDING_KEY, queue);
  scheduleRetry();
  await flushOnlineScores();
}
export async function flushOnlineScores(): Promise<void> {
  if (!enabled || !base) return;
  if (syncing) {
    await syncing;
    // A name or a stronger result can arrive while the earlier request is failing.
    if (Object.keys(pending()).length || (player() && player()!.displayName !== currentName())) return flushOnlineScores();
    return;
  }
  syncing = (async () => {
    let uploaded = false;
    try {
      if (!Object.keys(pending()).length && !player()) return;
      await ensureProfile();
      for (let pass = 0; pass < 24; pass++) {
        const entries = Object.entries(pending());
        if (!entries.length) break;
        for (const [id, score] of entries) {
          const result = await request(`/scores/${id}`, { score }, true);
          const board = rankingBoard(id)!;
          if (typeof result.improved !== 'boolean' || !validRankingScore(board, result.best) || (board.order === 'asc' ? result.best > score : result.best < score)) throw new Error('Invalid ranking acknowledgement');
          uploaded = true;
          const queue = pending();
          if (queue[id] === score) { delete queue[id]; save(PENDING_KEY, queue); }
        }
      }
      // The name may have changed while score requests were in flight.
      await ensureProfile();
      connection(true);
      if (uploaded) notify();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        forgetRejectedProfile(error);
      }
      connection(false);
    }
  })();
  try { await syncing; } finally { syncing = null; scheduleRetry(); }
}
export async function onlineTopScores(id: string, limit: number): Promise<RankingEntry[]> {
  if (!base || !rankingBoard(id)) return [];
  try {
    const path = `/scores/${id}?limit=${Math.max(1, Math.min(100, Math.floor(limit)))}`;
    let result;
    try { result = await request(path, undefined, !!player()); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      forgetRejectedProfile(error);
      result = await request(path); // Public tables remain readable without a profile.
    }
    const board = rankingBoard(id)!;
    if (!Array.isArray(result.entries) || result.entries.length > 100 || result.entries.some((e: RankingEntry) => !e || !Number.isSafeInteger(e.rank) || e.rank < 1 || !validRankingScore(board, e.score) || typeof e.displayName !== 'string' || !rankingName(e.displayName) || e.displayName.length > 10 || typeof e.you !== 'boolean')) throw new Error('Invalid ranking entries');
    connection(true);
    return result.entries;
  } catch { connection(false); return []; }
}
/** Called after the existing arcade name entry has saved the driver's choice. */
export async function renameOnlinePlayer(): Promise<void> { await flushOnlineScores(); }

import { rankingBoard, rankingName, validRankingScore } from '../src/platform/ranking-contract';

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Env {
  DB: { prepare(sql: string): Statement };
  ALLOWED_ORIGINS: string;
}
interface Player { id: string; display_name: string }
const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const fail = (status: number, error: string): never => { throw json({ error }, status); };
const sha = async (value: string): Promise<string> => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');

async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') fail(415, 'content_type');
  const reader = request.body?.getReader();
  if (!reader) return fail(400, 'body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > 4096) { await reader.cancel(); return fail(413, 'body_size'); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { return fail(400, 'json'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(400, 'body');
  return value;
}
function displayName(data: Record<string, unknown>): string {
  const raw = data.displayName;
  const name = rankingName(raw);
  if (typeof raw !== 'string' || raw.length > 80 || !name) return fail(400, 'name');
  return name;
}
async function identify(request: Request, env: Env): Promise<Player> {
  const match = /^Bearer ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-f]{64})$/.exec(request.headers.get('Authorization') ?? '');
  if (!match) return fail(401, 'profile');
  const player = await env.DB.prepare('SELECT id,display_name FROM profiles WHERE id=? AND token_hash=?').bind(match[1], await sha(match[2])).first<Player>();
  return player ?? fail(401, 'profile');
}
async function quota(env: Env, group: string, maximum: number): Promise<void> {
  const hour = Math.floor(Date.now() / 3600000);
  const result = await env.DB.prepare('INSERT INTO limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(`${group}:${hour}`, (hour + 2) * 3600000).first<{ count: number }>();
  if (!result || result.count > maximum) return fail(429, 'rate_limit');
  await env.DB.prepare('DELETE FROM limits WHERE expires_at<?').bind(Date.now()).run();
}
async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), path = url.pathname;
  if (request.method === 'GET' && path === '/health') {
    await env.DB.prepare('SELECT 1 AS ok').first();
    return json({ ok: true, service: 'velvet-cruise', version: 1 });
  }
  if (request.method === 'POST' && path === '/profiles') {
    const name = displayName(await body(request));
    const ipHash = await sha(request.headers.get('CF-Connecting-IP') ?? 'local');
    await quota(env, `profiles:${ipHash}`, 30);
    await quota(env, 'profiles', 1000);
    const id = crypto.randomUUID();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    await env.DB.prepare('INSERT INTO profiles(id,display_name,token_hash,created_at) VALUES(?,?,?,?)').bind(id, name, await sha(token), Date.now()).run();
    return json({ id, token, displayName: name }, 201);
  }
  if (request.method === 'POST' && path === '/profile') {
    const player = await identify(request, env), name = displayName(await body(request));
    await quota(env, `rename:${player.id}`, 20);
    await env.DB.prepare('UPDATE profiles SET display_name=? WHERE id=?').bind(name, player.id).run();
    return json({ displayName: name });
  }
  const match = /^\/scores\/([a-z0-9-]+)$/.exec(path);
  const board = match ? rankingBoard(match[1]) : undefined;
  if (!board) return json({ error: 'not_found' }, 404);
  if (request.method === 'GET') {
    const rawLimit = url.searchParams.get('limit') ?? '8';
    if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100) return fail(400, 'limit');
    const player = request.headers.has('Authorization') ? await identify(request, env) : null;
    const direction = board.order === 'asc' ? 'ASC' : 'DESC';
    const { results } = await env.DB.prepare(`SELECT s.profile_id,s.score,p.display_name,RANK() OVER (ORDER BY s.score ${direction}) AS rank FROM scores s JOIN profiles p ON p.id=s.profile_id WHERE s.board=? ORDER BY s.score ${direction},s.achieved_at,s.profile_id LIMIT ?`).bind(board.board, Number(rawLimit)).all<{ profile_id: string; score: number; display_name: string; rank: number }>();
    return json({ entries: results.map(e => ({ rank: e.rank, score: e.score, displayName: e.display_name, you: e.profile_id === player?.id })) });
  }
  if (request.method === 'POST') {
    const player = await identify(request, env), data = await body(request);
    if (!validRankingScore(board, data.score)) return fail(400, 'score');
    await quota(env, `scores:${player.id}`, 120);
    await quota(env, 'scores', 30000);
    const comparison = board.order === 'asc' ? '<' : '>';
    const updated = await env.DB.prepare(`INSERT INTO scores(profile_id,board,score,achieved_at) VALUES(?,?,?,?) ON CONFLICT(profile_id,board) DO UPDATE SET score=excluded.score,achieved_at=excluded.achieved_at WHERE excluded.score${comparison}scores.score RETURNING score`).bind(player.id, board.board, data.score, Date.now()).first<{ score: number }>();
    const best = updated ?? await env.DB.prepare('SELECT score FROM scores WHERE profile_id=? AND board=?').bind(player.id, board.board).first<{ score: number }>();
    return json({ improved: !!updated, best: best!.score });
  }
  return json({ error: 'method' }, 405);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (origin && !env.ALLOWED_ORIGINS.split(',').includes(origin)) return json({ error: 'origin' }, 403);
    let response: Response;
    try { response = request.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await handle(request, env); }
    catch (error) { response = error instanceof Response ? error : json({ error: 'temporarily_unavailable' }, 503); }
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Vary', 'Origin');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    return response;
  },
};

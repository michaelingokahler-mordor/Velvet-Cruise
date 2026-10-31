import { isDesktopBuild } from './runtime';
/** Anonymous, best-effort event counters. No storage, profile, or gameplay wait. */
type EventType = 'game_loaded' | 'run_start';
interface Gate { production: boolean; href: string; webdriver: boolean; desktop: boolean; testHooks: boolean }
export function statisticsAllowed(gate: Gate): boolean {
  if (!gate.production || gate.webdriver || gate.desktop || gate.testHooks) return false;
  try {
    const url = new URL(gate.href);
    return url.origin === 'https://sabnockworks.com' &&
      url.pathname.startsWith('/games/more-projects/velvet-cruise/') &&
      !/autopilot|stage=|sim=|yelltest|radiotest|tumbletest|nametest|endtest|path=|maptest|graphicstest|graphics=|oldslopes|qa|test/i.test(url.hash + url.search);
  } catch { return false; }
}
interface Options {
  enabled: () => boolean;
  endpoint: string;
  fetch?: typeof fetch;
  delay?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}
export function createStatisticsClient(options: Options): { record(type: EventType): void } {
  const queue: string[] = [];
  const request = options.fetch ?? globalThis.fetch;
  const delay = options.delay ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  let running = false, loaded = false;
  async function send(body: string): Promise<void> {
    for (let attempt = 0; attempt < 3 && options.enabled(); attempt++) {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const response = await Promise.race([
          request(options.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
            credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: controller.signal }),
          new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, options.timeoutMs ?? 4000); }),
        ]);
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) return;
      } catch { /* Offline/timeout: retry this same event, then discard. */ }
      finally { clearTimeout(timer); }
      if (attempt < 2) await delay(attempt === 0 ? 250 : 1000);
    }
  }
  async function flush(): Promise<void> {
    if (running) return;
    running = true;
    try { while (queue.length) { await send(queue[0]); queue.shift(); } }
    finally { running = false; }
  }
  return { record(type) {
    try {
      if (!options.enabled() || (type === 'game_loaded' && loaded)) return;
      if (type === 'game_loaded') loaded = true;
      if (queue.length >= 32) return;
      queue.push(JSON.stringify({ id: crypto.randomUUID(), type, timestamp: Date.now() }));
      void flush().catch(() => { queue.length = 0; });
    } catch { /* Statistics must never interrupt the game. */ }
  } };
}
const client = createStatisticsClient({
  endpoint: 'https://velvet-cruise-api.emerald-hollows.workers.dev/stats/events',
  enabled: () => {
    try {
      const w = window as unknown as Record<string, any>;
      return statisticsAllowed({ production: import.meta.env.VITE_STATISTICS_PRODUCTION === 'true', href: location.href,
        webdriver: navigator.webdriver === true,
        desktop: isDesktopBuild(),
        testHooks: !!w.__VELVET_TEST__ || Object.keys(w).some(key => /^__(trackBench|graphicsInfo|ending|edge|fork|props|tunnels|map|name|tumble|spawn)/.test(key)),
      });
    } catch { return false; }
  },
});
export const recordStatistic = (type: EventType): void => client.record(type);

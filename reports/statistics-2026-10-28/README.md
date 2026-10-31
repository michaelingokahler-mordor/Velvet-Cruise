# Velvet Cruise statistics candidate — 2026-10-28

Status: implemented and tested locally. No source push, website publication, Worker deployment, remote migration, or remote secret change occurred.

The candidate adds **Ladevorgänge** and **Rennstarts** to the existing Velvet Cruise API. The private German report supports inclusive date ranges, daily rows, zero days, sums, and JSON export. One query supports about ten years. Separate queries cover longer history.

## Source and behavior

The branch is `codex/velvet-statistics` in `C:/Users/micha/.codex/worktrees/velvet-statistics/Code`. Its game baseline is `89571ad307a6c1936426a60661be778f68ac57ae`.

The port copies only online adapter, contract, configuration, server, documentation, and related tests from `a829312`. It applies the relevant Former platform adapter and arcade name-sync changes. It keeps the current game, Coast Drive audio, Classic/Plus graphics, `tour2` rules, and save keys.

`game_loaded` fires at the end of the real scene `create()` lifecycle. The module counts it once per document. `run_start` uses the existing event inside `startRace()`. Every new attempt counts, including a retry after Game Over. Pause, resume, menus, difficulty selection, route choices, and blocked starts do not create a start event.

Each request contains only a random event UUID, event type, and millisecond timestamp. The client stores events in memory only. It keeps at most 32 events and sends one request at a time. Each event has at most three attempts, a four-second timeout, and unchanged identity and time across retries. Requests omit credentials and referrer. Gameplay never waits for statistics.

Production counting requires an explicitly enabled standalone build and the HTTPS SabnockWorks game path. Default builds, desktop indicators, Demo A, webdriver, test SDKs, and all current QA/hash modes prevent requests. Local previews also prevent production requests. The online ranking adapter keeps local fixtures usable while it blocks the production API outside the production game context.

The Worker accepts a strict payload from the exact production origin. It accepts event ages up to 24 hours and future clock differences up to five minutes. A single SQLite insert triggers the daily increment atomically. Duplicate UUIDs do not trigger increments. Deduplication records expire after 48 hours; an unchanged event is already stale before its record can expire. The daily date comes from event time in `Europe/Berlin`, including DST.

Statistics use separate `statistics_events` and `statistics_daily` tables. They store no names, player/profile/device IDs, cookies, or IP addresses. Existing ranking tables and ranking identity remain separate.

## Report and example

The Worker serves the report shell at `/stats/`. Data requires `GET /stats/report?from=YYYY-MM-DD&to=YYYY-MM-DD` with the dedicated Bearer secret. An absent or short secret disables data access. The shell contains neither data nor a secret. The key stays in page memory and never enters a URL or browser storage. The clear button removes the key and report, including protection against a late pending response. Both responses disable caching.

Start the local example:

```powershell
node tools/qa/statistics-example-server.mjs
```

Open `http://127.0.0.1:4194/stats/`. Enter the synthetic key `synthetic-example-key-only-0123456789`. Choose `2026-10-22` through `2026-10-28`. The page explicitly marks these values as synthetic. The example uses the real report shell and protected Worker route with a local SQLite fixture. It never contacts production.

| Date | Ladevorgänge | Rennstarts |
| --- | ---: | ---: |
| 2026-10-22 | 52 | 89 |
| 2026-10-23 | 64 | 112 |
| 2026-10-24 | 81 | 146 |
| 2026-10-25 | 104 | 191 |
| 2026-10-26 | 72 | 125 |
| 2026-10-27 | 93 | 164 |
| 2026-10-28 | 41 | 68 |
| **Total** | **507** | **895** |

Root verified authentication, the selected dates, seven rows, and both sums in the actual browser UI. The screenshot is `output/statistics/example-report.png`.

## Verification

The first statistics test run failed in all nine initial groups because the feature was absent. The missing scene hook also failed the lifecycle mutation check. The review found an array-type payload error: it returned 503 instead of 400. A new regression reproduced that error before the strict string guard fixed it. The runtime matrix found the `oldslopes` QA mode still enabled statistics; its test failed before the gate correction.

Final local checks passed:

| Check | Result |
| --- | --- |
| `npm test` | All eight suites passed: statistics, lifecycle, isolation, concurrency, ranking Worker, ranking client, local services, menu/settings |
| Statistics behavior | 11 groups: strict validation, auth, dates/zeros, event-time bucketing, expiry, retries, timeout, bounded queue, lifecycle semantics, production gate, DST |
| Actual scene lifecycle | One load across two `create()` calls; two fresh starts; pause/menu/blocked starts add none |
| Actual scene/config isolation | 24 scenarios plus dev-server configuration; normal release sends two intercepted fixture events; all 23 exclusion scenarios send zero |
| SQLite concurrent delivery | Eight independent connections; 160 deliveries; 120 deliveries of one load event and 40 unique starts; totals 1/40 |
| Ranking/local regression | Ordering, profiles, tokens, concurrent bests, pending queue, offline/reload, rename, malformed replies, save preservation, SDK/demo/desktop isolation |
| Menu/settings regression | 16 checks passed |
| Game typecheck | `npm run check` passed |
| Worker typecheck | Strict TypeScript with ES2022, DOM, bundler resolution, and JSON imports passed |
| Standalone build | `VELVET_PRODUCTION_STATISTICS=1 npm run build:web -- --outDir output/statistics/web` passed |
| Default desktop build | `npm run build -- --outDir output/statistics/desktop-default` passed; statistics disabled |
| Real local D1 migrations | Wrangler applied `0001_rankings.sql` and `0002_statistics.sql` under `output/statistics/local-d1` |
| Real local D1 SQL | Two inserts of one load UUID plus one start UUID produced totals 1/1; ranking tables remained present |
| Worker bundle | `wrangler deploy --dry-run` passed; 19.16 KiB upload before compression; no deployment |
| Independent review | No unresolved Critical or Important finding; minor payload issue and historical documentation corrected |

Machine evidence is in `output/statistics/tests/`. Local D1 results are in `output/statistics/local-d1/check.json`. Copies of the core result files accompany this report. Read [initial inspection](initial-inspection.md) and [independent review](review.md) for their scope.

Vite reports the existing large-chunk warning. Node reports its experimental SQLite warning. Neither warning failed a check. These tests do not constitute human driving/listening acceptance or physical phone/gamepad tests.

## Prepared artifacts

- `output/statistics/web/`: standalone production candidate, including current game assets and online adapter.
- `output/statistics/desktop-default/`: default build with statistics disabled.
- `output/statistics/worker/worker.js`: final dry-run Worker bundle.
- `server/migrations/0002_statistics.sql`: additive statistics migration.
- `output/statistics/site/games/more-projects/velvet-cruise/`: immutable website candidate after the release preparation script runs.
- `output/statistics/site-manifest.json`: candidate file hashes and exact source commit after preparation.

After the reviewed source commit is clean, run `node tools/prepare-statistics-release.mjs`. The script creates a new release directory once and rejects an existing destination. It writes matching `build-info.json`, the wrapper index, and file hashes. It never writes to the website checkout.

## Deployment procedure — only after user approval

These instructions describe future actions. None occurred during this task.

1. Review the committed source, migration, test evidence, and candidate manifest.
2. Record the current Worker version and website commit before deployment. The inspected Worker version is `f4b0bae9-ee80-4523-9099-adce5cf71c1d`. The inspected website commit is `a852cbb`.
3. Export a D1 backup to a private location. Keep the existing database ID in `server/wrangler.jsonc`.
4. Set `STATS_REPORT_SECRET` with `wrangler secret put STATS_REPORT_SECRET --config server/wrangler.jsonc`. Use a new random secret of at least 32 characters. Keep it in a password manager. Do not place it in source, shell command text, public assets, or logs.
5. Apply the additive migration with `wrangler d1 migrations apply velvet-cruise --remote --config server/wrangler.jsonc`. Review the migration list first; an existing installation already has `0001_rankings.sql`.
6. Deploy the reviewed bundle with `wrangler deploy --config server/wrangler.jsonc`.
7. Open the production `/stats/` shell. Enter the private report key. Verify authorized and rejected requests, date selection, and zero-filled results. Verify ranking health and public reads.
8. Copy the prepared release directory into the website checkout. Update its wrapper index to that release. Keep older release directories for open sessions. Commit and publish the reviewed candidate only.
9. Verify the published bytes against the candidate hashes and `build-info.json`. Open the normal game once and create one fresh attempt. Expect one load and one start for that controlled manual action. Record its date because it contributes to the real counters. Keep automated checks blocked by webdriver or QA mode.

The report becomes available only after secret configuration, migration, and Worker deployment. No report secret belongs in the game build.

## Rollback and limits

Restore the previous website wrapper index to return players to the prior immutable release. Roll back the Worker to the recorded version with Wrangler's rollback command. For the inspected version, use `wrangler rollback f4b0bae9-ee80-4523-9099-adce5cf71c1d --config server/wrangler.jsonc`. Confirm the version again at deployment time. Leave the added statistics tables intact; no destructive migration is needed. Existing ranking data remains usable. Remove or rotate the report secret only as an explicit operator action.

The counters are best-effort totals, not unique visitors or verified human usage. Closing the page, blocked requests, network failures, queue saturation, and unsuitable clocks can lose events. Origin checks do not prevent a separate client from fabricating requests. Cloudflare platform request processing/logging remains separate from these tables. Production behavior after deployment remains unverified because publication is intentionally pending approval.

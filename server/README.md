# Velvet Cruise API

The standalone game uses Worker `velvet-cruise-api` and D1 `velvet-cruise`. The API address is `https://velvet-cruise-api.emerald-hollows.workers.dev`. This service is separate from Emerald Hollows despite the account subdomain.

The current candidate starts from game source `89571ad` (Coast Drive, Classic/Plus, current tour2 rules). It adds the existing online adapter from `a829312` and anonymous statistics. Build the current source directly. The historical baseline-preserving builder does not apply to this release.

**The statistics candidate is prepared for review. Do not publish, deploy, set a remote secret, or run remote migrations before user approval.** Deployment and rollback instructions, build locations, and test evidence are in [the statistics report](../reports/statistics-2026-10-28/README.md).

## Local verification

Use Node 24 (the tests use `node:sqlite`), the game dependencies, and Wrangler 4.151.1 or compatible. Wrangler is not required by game builds. The validation machine uses the existing Wrangler executable in the online-highscores worktree.

```powershell
npm run check
npm test
wrangler d1 migrations apply velvet-cruise --local --config server/wrangler.jsonc --persist-to output/statistics/local-d1
wrangler deploy --dry-run --config server/wrangler.jsonc --outdir output/statistics/worker
node tools/qa/statistics-example-server.mjs
```

The example runs on loopback port 4194 and contains clearly marked synthetic totals. It never contacts the production API. `.dev.vars`, `.wrangler`, build output, and credentials are ignored by Git.

## Separate data contracts

`0001_rankings.sql` defines profiles, scores, and ranking rate limits. The game preserves local storage keys, board ordering, `tour2` separation, offline score delivery and local badges. The online profile is browser-local; clearing storage creates a new ranking identity. Historical local scores are not uploaded. Rankings validate score values but do not verify driving replays.

`0002_statistics.sql` adds event deduplication and daily totals. No ranking tables are changed. The SQLite trigger counts an event in the same transaction as its insert; duplicate event UUIDs never increment the aggregate. Event IDs expire after 48 hours. Ingest accepts at most 24-hour-old events, so expired deduplication records cannot make a permitted retry count again. Cleanup happens on ingest; daily totals remain until an operator chooses to remove them.

`POST /stats/events` accepts only `id` (random event UUID), `type` (`game_loaded` or `run_start`), and integer millisecond `timestamp`. Origin must match `STATS_ALLOWED_ORIGIN` exactly. This production-only origin list is separate from ranking development origins. Event timestamps may be at most 24 hours old or 5 minutes ahead. This is a best-effort counter, not a count of unique people or a fraud-resistant measurement.

`GET /stats/` serves the German report shell. It contains no statistics or secret. `GET /stats/report?from=YYYY-MM-DD&to=YYYY-MM-DD` requires `Authorization: Bearer <STATS_REPORT_SECRET>`. Data access fails closed when the secret is missing or shorter than 32 characters. The report returns inclusive Europe/Berlin dates, zero rows for quiet days, daily counts and sums. Date ranges can cover up to 3661 inclusive days (about 10 years). Use multiple ranges for longer history.

The dedicated report secret must never appear in the game, URL, public configuration, browser storage, logs, or commits. Enter it in the report password field; it remains in page memory. Use the clear button before leaving a shared computer. The shell and JSON disable caching. The report permits same-origin browser requests only. It requires no Cloudflare account token in the browser.

Statistics store no names, player/profile/device IDs, IP addresses, or cookies. The event queue exists only in memory: 32 events maximum, one active request, 4-second timeout, and at most three attempts with unchanged UUID and timestamp. Navigating away or exhausting retries may lose counts; gameplay never waits for delivery. Cloudflare's own platform logging and request processing remain separate from these statistics tables.

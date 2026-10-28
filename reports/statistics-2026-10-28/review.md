# Independent statistics review — 2026-10-28

Reviewed the working tree on `codex/velvet-statistics`, based on `89571ad`, against `docs/superpowers/specs/2026-10-28-statistics-design.md` and implementation plan Task 1. The implementer was still completing tests, documentation and release artifacts during this review. No production requests or writes were made by this reviewer. Application sources were not edited.

## Assessment

No unresolved Critical, Important or Minor code defect found in the reviewed implementation. The statistics design is suitable for the requested best-effort counters. The findings below were corrected and independently rechecked. Finish final build verification and the delivery report before presenting a deployment candidate; this report does not authorize publication.

## Resolved minor finding

The original `server/worker.ts:39` coerced the event type with `String(data.type)` before validating it. As a result, `type: ["run_start"]` passed validation and reached the database as an array. A focused local reproduction using the Worker and an in-memory SQLite database returned HTTP 503 with `temporarily_unavailable`, whereas malformed event fields should return HTTP 400. It did not increment a counter. The implementer added an explicit string guard and an array regression case. An independent focused recheck of the updated source returned HTTP 400 with `event` and confirmed the database was not touched. Resolved.

## Resolved documentation correction

The initially imported `server/README.md` still described the old `466be89` web baseline and recommended `tools/build-web-preserving-baseline.mjs`, which is absent from this checkout. Its deployment commands also referenced npm scripts absent at that review point. Those instructions conflicted with preserving the current `tour2` release. The rewritten README now identifies `89571ad`, explicitly rejects the historical builder for this release, and supplies local-only verification commands. `docs/ONLINE_HIGHSCORES.md` now starts with a clear historical/superseded notice and links to the current instructions. Both corrections were independently reread. The final delivery/deployment report linked by these documents was still being authored and is outside this targeted recheck.

## Review evidence

- `game_loaded` is called at the end of scene creation and deduplicated by the module-level client. `run_start` is attached to the existing fresh-attempt event in `startRace`; the other analytics events do not increment it. The graphics-loading guard returns before a new attempt is created. The ordinary Game Over flow returns through the title/difficulty path to this same fresh-attempt method.
- The client retains only per-event UUID, event type and timestamp in memory. Queue length, request timeout and retry count are bounded. Requests omit credentials and referrer. Delivery is not awaited by gameplay.
- Production counting requires an explicitly enabled standalone build, the HTTPS game origin/path, no webdriver, no desktop indicators, and no recognized test mode/hooks. The final gate inspected also excludes `oldslopes`. Imported rankings reuse the safe origin/test gate for their production endpoint.
- `statistics_events` has a primary key on the event UUID. Its AFTER INSERT trigger updates `statistics_daily` in the same SQLite statement transaction. Ignored duplicates do not trigger increments. Separate expiry cleanup does not compromise counting atomicity.
- A permitted event can be at most 24 hours old or five minutes ahead. Deduplication IDs expire 48 hours after initial acceptance, so an unchanged retry is already stale before its ID can expire. Berlin day calculation uses the event timestamp and an explicit Europe/Berlin timezone.
- Statistics tables contain no names, persistent profile identifiers, IP addresses or cookies. Ranking identity and quota tables remain separate. SHA-256 comparison confirmed `0001_rankings.sql` and `ranking-contract.ts` are byte-identical to the supplied online-highscores worktree. The existing ranking handler was unchanged in the source comparison.
- Report data requires the separate configured Bearer secret. It fails closed without a sufficiently long secret. The public report shell contains no report data or secret; same-origin requests place the key in a header, not in a URL or persistent storage. CSP restricts scripts to the nonce and connections to the same origin. Rendering uses textContent; request generations prevent a late response from restoring a cleared report.
- Reports include the requested endpoint dates, zero-fill missing days, and sum the returned daily counters. The implementation limits an individual query to 3660 days; this limit is shown by the report UI.
- Inspected the existing PASS evidence for nine statistics test groups and the independent eight-connection concurrency test: 160 deliveries, 120 deliveries of the same load event, 119 repeated deliveries excluded, exactly one load and 40 starts. Inspected the lifecycle/isolation test implementations. Existing green suites were not redundantly rerun by this reviewer.

## Limits

This was a source review with a focused malformed-payload reproduction, not a fresh full QA run. Final packaging, production Workerd/D1 behavior, deployment, real-device behavior and human gameplay acceptance were not independently verified here. Tests use local SQLite and mocks for the Phaser lifecycle. The production endpoint is unauthenticated event ingestion with origin filtering, so these best-effort usage counts are not tamper-proof. Network failure, blocked requests, closing the page, queue saturation and unsuitable client clocks can lose events by design. The local example contains synthetic data only.

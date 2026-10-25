# Online Highscores Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Implement inline, with one final independent review.

**Goal:** Publish Cloudflare online rankings while preserving local progress.
**Architecture:** Dedicated Worker/D1 API and a queued browser adapter behind the existing platform functions.
**Tech Stack:** TypeScript, Vite, Cloudflare Workers/D1, Wrangler, Node tests with real SQLite.
**Spec:** `docs/superpowers/specs/2026-10-25-online-highscores-design.md`

## Global Constraints

- Work only in the dedicated worktree; leave other agents' current edits untouched.
- Keep all existing save keys and the original Tesana and desktop/demo paths.
- Separate every board by existing difficulty/ruleset ID; points descending, times ascending.
- No automatic historical-score upload. No secrets in public configuration.

## Review Focus

- Concurrent submissions must retain the better result.
- Offline, malformed responses, and transient failures must retain queued scores.
- Name changes and simultaneous score/run submissions must share one profile.
- Desktop/demo/test-hook runs must not reach production rankings.
- Publication must not include other agents' pending edits or stale hashed entry references.

### Task 1: API and persistent storage

Files: `server/worker.ts`, `server/wrangler.jsonc`, `server/migrations/0001_rankings.sql`, `src/platform/ranking-contract.ts`, `tools/qa/check-online-worker.mjs`, package scripts.
Interfaces: health; POST `/profiles` -> `{id,token,displayName}`; POST `/profile` with bearer token; GET `/scores/:board?limit=8` -> `{entries}`; POST `/scores/:board` with `{score}` and bearer token -> `{improved,best}`.
- [x] Write tests for two profiles, auth, ordering, bounds, malformed bodies, CORS, quotas, and better-only upserts.
- [x] Run tests and observe missing API behavior fail.
- [x] Implement schema, contract, and Worker; run `npm run qa:online-worker` (expected PASS).
- [x] Commit with Task 2 after the integrated save-compatibility checks.

### Task 2: Browser adapter and compatibility

Files: `src/platform/online-scores.ts`, `src/platform/tesana.ts`, `src/game/arcade.ts`, `public/online.json`, `assets/ui/strings.json`, `tools/qa/check-online-client.mjs`, docs.
Interfaces: existing `submitScore`, `topScores`, `myBest`, and `servicesOnline`; new `initOnlineScores`, `queueOnlineScore`, `onlineTopScores`, `renameOnlinePlayer`.
- [x] Add integration tests against Task 1 with persistent local storage, concurrent boards, offline retry, profile rename, malformed responses, and no desktop/demo network calls.
- [x] Observe standalone `servicesOnline()` fail before implementation.
- [x] Implement local-first queue and adapter; run online tests plus `check`, `qa:local-services`, `qa:demo`, `build:web` (expected PASS).
- [x] Commit reviewed implementation and tests together.

### Task 3: Deployment and website verification

- [x] Review the whole branch independently and address substantive findings with tests.
- [x] Create the dedicated D1 database, apply migration, and deploy Worker.
- [x] Verify health, CORS, two-profile shared results, offline/local persistence and ranking display in browser contexts; remove exact QA profiles/results.
- [x] Publish the named website game subtree from this worktree; check live build metadata, chunks, API configuration and health.
- [x] Report source commit, live URLs, verification, local-save compatibility, and remaining replay-verification limitation in `docs/ONLINE_HIGHSCORES.md`.

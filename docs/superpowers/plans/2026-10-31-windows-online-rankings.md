# Windows Online Rankings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Connect Windows to the shared rankings while preserving offline play and local arcade tables.

**Architecture:** Reuse the existing client, Worker and D1. Separate ranking access from statistics policy, persist scores before starting requests, and add backward-compatible public driver tags.

**Tech Stack:** TypeScript, Electron, Cloudflare Worker/D1, Node 24, SQLite and esbuild.

**Spec:** `docs/superpowers/specs/2026-10-31-windows-online-rankings-design.md`

## Global Constraints

- Preserve save keys, game rules, installed files and actual player profiles.
- Demos, development, debug and automation cannot contact production rankings or counters.
- No historical-score import, login requirement or synthetic production writes.
- New API fields remain compatible with the published web client.

## Review Focus

- Offline startup followed by connectivity return without an application restart.
- Requests stall while a player continues local play and records results.
- A stronger queued score arrives while an older acknowledgement is in flight.
- Equal display names, migrated profiles and random-tag collisions retain separate identities.
- Native custom-origin requests work without broadening statistics access.

### Task 1: Desktop access and durable asynchronous delivery

**Files:** `src/platform/services.ts`, `src/platform/online-scores.ts`, `src/platform/ranking-access.ts`, `vite.config.ts`, client/access tests.

**Interfaces:** Existing service exports remain; `rankingsAllowed` evaluates production origin/build policy independently of statistics. `submitScore` resolves from local persistence. Existing queue/flush functions retain their public signatures.

- [x] Add and run failing tests for full native access, prohibited runtime modes, nonblocking offline submissions and automatic reconnect/retry.
- [x] Implement minimal access policy, local-first delivery and retry behavior.
- [x] Run client/access tests and the complete existing test command.

### Task 2: Driver tags and visible online/local separation

**Files:** `server/migrations/0003_driver_tags.sql`, `server/worker.ts`, `src/platform/ranking-contract.ts`, `src/main.ts`, `src/game/arcade.ts`, strings and Worker/client fixtures.

**Interfaces:** Add optional `driverTag` to public ranking entries; existing display names and credentials remain unchanged. `rankingDisplayName` appends a validated tag only for online entries. Migration assigns unique tags to existing profiles; new profiles use a unique indexed tag with collision retry.

- [x] Add and run failing migration, collision, equal-name and label tests.
- [x] Implement migration, backwards-compatible responses and online labels; keep local arcade names unchanged.
- [x] Verify same-profile best-only updates, identity preservation, queue races and local table persistence.

### Task 3: Native package, review and release evidence

**Files:** native integration QA, `server/wrangler.jsonc`, documentation and `reports/windows-online-rankings-2026-10-31/`.

**Interfaces:** Production configuration allows only the owned full desktop origin in addition to existing ranking origins. Existing statistics origin stays unchanged.

- [x] Verify native custom-origin preflight/read/write against an isolated local Worker/database, including offline queue across relaunch and local records.
- [x] Run TypeScript, full tests, web/full-desktop/demo builds and package checks.
- [x] Obtain a fresh whole-change review; fix important findings with regression tests.
- [x] Prepare the Windows ZIP, migration/deployment instructions, hashes and explicit activation boundary.

Work proceeds in the existing checkout on `codex/windows-online-rankings`; no extra worktree is needed. Progress and test evidence live under ignored `output/windows-online-rankings/`. Leave final changes reviewable without publishing or replacing the installed package.

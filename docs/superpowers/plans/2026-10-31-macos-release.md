# macOS Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver ad-hoc signed Intel and Apple Silicon Mac ZIPs with shared/offline/local ranking support.
**Architecture:** Reuse the approved desktop payload and runtime. Package with pinned Electron/Packager versions; run native acceptance on standard GitHub macOS runners.
**Tech Stack:** TypeScript, Electron, Node 24, Cloudflare-compatible local Worker/SQLite, GitHub Actions, macOS codesign/ditto.
**Spec:** `docs/superpowers/specs/2026-10-31-macos-release-design.md`

## Global Constraints

- Retain game IDs, save keys, rankings and installed Windows files.
- No paid Apple membership, paid runner or production test writes.
- Signing status is ad-hoc; notarization is unavailable.
- Preserve original profiles; reject active or changing snapshot sources.

## Review Focus

- Imported legacy storage must not overwrite newer values or be copied while active.
- arm64 bundles must have valid local signatures after branding/resources are finalized.
- ZIP extraction must preserve executable permissions and framework symlinks.
- Native automation must remain isolated from production.
- A cold offline launch and later reconnect must retain and upload the best pending result.

### Task 1: Mac packaging

**Files:** `tools/package-macos.mjs`, `tools/qa/check-macos-package.mjs`, package metadata/lockfile.
**Interfaces:** `--game`, `--out`, `--arch`, `--prepare-only`; fresh staging produces game-owned runtime plus a sibling game resource directory.

- [x] Add a failing real-script test for packaging preparation, full-edition validation and overwrite rejection.
- [x] Implement staging and Mac packaging with pinned runtime, icon, bundle identity and ad-hoc signature.
- [x] Verify preparation and existing Windows tests.

### Task 2: Mac runtime and native acceptance

**Files:** `desktop/storage-migration.mjs`, `desktop/main.mjs`, Mac snapshot/native QA scripts.
**Interfaces:** Keep `snapshotProfile(source,target)` and the existing native bridge. Add a Mac implementation that checks open LOCK handles and unchanged source hashes around a snapshot.

- [x] Add regression coverage for Mac snapshot behavior and old-profile preservation.
- [x] Add native Mac menus and real-runtime offline/relaunch/ranking/local-table tests.
- [x] Verify old-source active rejection and normal relaunch without affecting Windows behavior.

### Task 3: Native CI and artifacts

**Files:** `.github/workflows/macos-release.yml`, release documentation/reports.
**Interfaces:** Push on the dedicated development branch starts standard `macos-15` arm64 and `macos-15-intel` x64 jobs. Artifacts contain `.app` ZIPs, hashes, native test reports and screenshots.

- [x] Run local TypeScript/full tests and native Mac build/test jobs.
- [x] Verify re-extracted bundles/signatures and retrieve the exact tested ZIPs.
- [x] Obtain a fresh whole-change code review, address important findings with regressions and record actual verification limits.
- [x] Deliver both downloads and the Gatekeeper instructions.

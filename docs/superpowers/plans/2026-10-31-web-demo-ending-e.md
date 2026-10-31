# Web Demo Ending E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the latest Windows Full ZIP and a tested browser demo ending at E, with matching local/remote source refs.

**Architecture:** Keep the Full build unchanged. Replace route-A demo selection with a compile-time route-E edition and a separate save prefix.

**Tech Stack:** TypeScript, Vite, esbuild, Electron, local Worker/SQLite fixtures.

**Spec:** `docs/superpowers/specs/2026-10-31-web-demo-ending-e-design.md`

## Global Constraints

- Demo route: `[0,1,2,3,4]`, destination E, three difficulties.
- Full IDs, saves, routes and online rankings stay unchanged.
- No synthetic production scores/statistics, live website replacement or downloaded executable demos.
- Preserve installed Windows files and the two unrelated untracked documents.

## Review Focus

- Alternate path hashes, ending previews and map selection must remain within route E.
- Stage-record mode must not bypass the demo restriction.
- Route-A demo records must not become route-E records.
- Full builds must retain all 16 paths and their existing storage keys.
- Browser packaging must declare demo-e and retain required local assets.

### Task 1: Current Windows Full archive and source comparison

**Files:** generated package and reports under `output/windows-full-2026-10-31`.
**Interfaces:** `tools/build-desktop.mjs`, `tools/package-desktop.mjs`, `tools/qa/windows-rankings-native.mjs`.

- [ ] Fetch and compare local/remote refs and report `main` separately.
- [ ] Build current Full desktop files and owned Windows runtime into a fresh package.
- [ ] Run native acceptance and artifact inspection. Preserve installed file hashes.
- [ ] Create a ZIP, verify every archived file and deliver it under `D:/Velvet Cruise/Windows`.

### Task 2: Route-E browser demo

**Files:** edition consumers in `src`, `vite.config.ts`, package scripts, browser/demo QA scripts.
**Interfaces:** `DEMO` build flag, edition `demo-e`, save prefix `sunset-coast-run.demo-e`, `npm run build:demo`, `npm run qa:demo`.

- [ ] Update real route tests to expect `[0,1,2,3,4]`, ending E, blocked alternate paths/stages and isolated saves. Run and observe failure.
- [ ] Implement the compile-time identity, route restrictions, labels and browser build command.
- [ ] Run demo races on all difficulties, Full route regressions, TypeScript and the full test command.
- [ ] Build browser files and inspect them in a real browser, including hostile hashes, map selection, Plus lock and absence of API writes.
- [ ] Obtain one fresh code review, fix important findings, commit and push.
- [ ] Recheck local/remote refs and record the exact verification limits.

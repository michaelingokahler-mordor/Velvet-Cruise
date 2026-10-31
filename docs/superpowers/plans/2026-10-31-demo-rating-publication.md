# Demo Rating and Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Show the approved notice before every browser-demo launch and publish that demo with corrected website wording.

**Architecture:** Await an HTML confirmation dialog in demo-web startup. Publish a new immutable release through the existing static website repository.

**Tech Stack:** TypeScript, HTML/CSS, Vite, browser acceptance, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-31-demo-rating-publication-design.md`

## Global Constraints

- Exact approved age/content text, with no online-leaderboard line in Demo.
- Full startup, IDs, saves and online features remain unchanged.
- No synthetic production scores/statistics and no unrelated local document changes.
- Keep existing game URLs and cached releases. Website publication is authorized.

## Review Focus

- Direct URLs, hash parameters and reloads must display the notice.
- The game must not start before confirmation or consume held confirmation twice.
- Keyboard, touch and gamepad confirmation must work and remove listeners/polling.
- The dialog must fit small/mobile screens and remain accessible.
- Website descriptions must distinguish the demo from the Full product.

### Task 1: Demo startup notice

**Files:** `src/demo-start.ts`, `src/demo-start.css`, `src/main.ts`, browser QA fixtures.
**Interfaces:** `waitForDemoStart(): Promise<void>` resolves only after confirmation and cleanup.

- [x] Write and run browser acceptance against the current build; observe missing-notice failure.
- [x] Add the dialog, input cleanup and conditional startup await.
- [x] Run keyboard/touch/gamepad/reload/viewport checks and existing route-E browser acceptance.
- [x] Run TypeScript, the complete test command and the demo build. Record the known untracked-document scan separately.
- [x] Obtain independent code review and correct important findings.

### Task 2: Website publication

**Files:** SabnockWorks `index.html`, `games/velvet-cruise/index.html`, `games/more-projects/index.html`, `llms.txt`, README and the new immutable game release.
**Interfaces:** Existing browser game URL selects a fresh `demo-e` release; metadata records its exact source commit and hashes.

- [x] Update the website copy and relevant metadata without changing other games' availability.
- [x] Stage the new release and wrapper, then verify local information pages and direct game launch.
- [x] Commit and push both repositories, publish through GitHub Pages and verify the live pages and start dialog.
- [x] Record exact release, checks and remaining shop-link work.

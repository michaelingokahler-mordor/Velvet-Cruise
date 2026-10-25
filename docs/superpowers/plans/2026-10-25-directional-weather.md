# Directional Weather Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for implementation, test-driven-development for each behavior, and requesting-code-review for the final review.

**Goal:** Deliver the clarified ice multipliers, stronger directional gusts and cautious NPC weather responses.

**Architecture:** Reuse the TypeScript arcade simulation. Shared weather helpers calculate wind components, speed and curve factors; Race owns the gust clock and samples local road weather. The renderer consumes the same vector and NPCs use Easy forces through a bounded lane controller.

**Tech Stack:** TypeScript, Vite, Node/esbuild/pngjs QA and the existing Electron wrapper.

**Spec:** `docs/superpowers/specs/2026-10-25-directional-weather-design.md`

## Constraints and review focus

- Preserve all existing uncommitted work, roof/garage behavior, roads, clocks, saves and unlocks. Work in the selected current checkout; do not commit or publish.
- Full snow × full ice must be 2.20 / 2.415 / 2.64 relative to dry, with smooth partial intensity.
- Wind force, drawing and sound must agree; head/tail/diagonal winds and calm must work.
- Tailwind speeds above the old cap must really be reachable, and the higher curve factor must apply only during the gust.
- NPC samples must be local, use Easy in every difficulty, remain in road bounds and preserve fork and following safety.
- Full-route tests must exercise both ice and wind; record validation boundaries honestly.

## Task 1: Player weather and directional rendering

Files: `src/game/difficulty.ts`, new `src/game/weather.ts`, `src/game/race.ts`, `src/game/render.ts`; tests in `tools/qa/check-weather.mjs` and new `tools/qa/check-directional-weather.mjs`.

- [x] Write and run failing real-motion tests for multiplicative ice, 1 / 1.45 / 1.85-lane reference gust, ±10 % maximum speed and +25 % tailwind curve force.
- [x] Implement the shared helpers, 360-degree gust clock, local sampling and vector-based dust rendering. Adapt the attract/test AI to the same rules.
- [x] Verify calm, head, tail and diagonal particle movement; smooth expiry; tunnel suppression; low-speed attenuation and unrelated RNG independence.
- [x] Run focused QA and TypeScript checks; save measured JSON and visual samples.

## Task 2: Cautious NPC traffic and delivery

Files: `src/game/race.ts`, `src/game/render.ts`, `src/game/weather.ts`; the same focused QA plus existing balance/signal suites; `WETTERPRUEFUNG.md`.

- [x] Write and run failing tests for slower wet/low-visibility NPCs, local ice and wind movement, Easy weather forces in every mode, light activation, safe road limits and following/fork behavior.
- [x] Implement bounded steering with smoothed ice momentum, slower local target speeds, longer headway and safe lane changes. Use one NPC light decision for front/rear rendering.
- [x] Run focused QA, `npm run check`, `npm run qa:balance`, relevant garage/roof checks and a fresh build.
- [x] Obtain a fresh code review, address important findings, then validate the compiled game in Windows with an isolated profile.
- [x] Document measured values and provide a separate playable Windows artifact; retain earlier builds.

## Execution ledger

- Pre-flight: Task 2 consumes the wind vector and local weather sampling from Task 1; both use `weatherBend`. No interface conflict.
- Ruling: Keep the current checkout and leave changes uncommitted so the user's existing elevation/map/garage work remains available. Risk: the final review must distinguish this change from unrelated local edits.
- Ruling: Treat NPC speed reductions as initial tuning choices from the implementation, not as user-specified numbers. Risk: human driving may warrant a second adjustment.
- Ruling: Add right-lane discipline in poor visibility after whole-route runs exposed rolling blockades. Risk: the free passing lane changes traffic difficulty; human feel remains open. Weather values and original clocks stay unchanged.
- Task 1: requested values and directional behavior verified by red-to-green movement tests; original sprite/backdrop rendering sampled in six moving clips.
- Task 2: 22 focused tests, weather/light rendering checks, garage/roof checks, TypeScript and all 48 full routes pass. Native compiled bundle reaches all five goals and verifies sidewind, top-speed changes, curve factor and NPC snow lights.
- Final review: one Important NPC simultaneous-merge finding reproduced at tick 159 and fixed with swept-path/destination reservations. Regression passes. No minor findings were deferred.
- Final review boundaries: manual feel/controller/audiovisual review remains open; unrelated elevation/map changes are excluded. Route-balance and subsequent test-driver adaptations were verified by focused regressions and the full suite.
- Delivery: `output/windows/Velvet-Cruise-Windows-2026-10-25-Wetter-NPC.zip`; 167 entries pass CRC, 84 unchanged runtime files and 80 game files verified, SHA-256 `1edc0c33b29896891a76a270d6a57ab5955912e849d9c0c65af85842f63df18e`. Three additional Hard-route traffic stress probes record zero NPC overlap or off-road frames.

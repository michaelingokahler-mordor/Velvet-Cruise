# Garage Weather Sprites Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. User already authorized implementation of the design in this conversation.

**Goal:** Six native-pixel cars with aligned animated weather roofs, approved goal unlocks, and repeatable runtime verification.
**Architecture:** One fixed body per steering/occupant pose, generated roof variants within an explicit mask. Race selects an animated visual skin independently of the stable saved car ID and handling.
**Tech Stack:** Python/Pillow/numpy art generators, TypeScript renderer, Node/esbuild/PNG QA, browser smoke tests.
**Spec:** ../specs/2026-10-25-garage-weather-sprites-design.md

## Global Constraints
- All car frames 88x48, binary alpha, bottom-centre anchor; old open sprites unchanged.
- Do not overwrite concurrent map/terrain changes. Work in the managed isolated checkout, then transfer only owned changes into the user's checkout and validate together.
- Do not publish or push. Keep generated sources and evidence reproducible.

## Review Focus
- A roof phase must never alter chassis, tyres or light alignment.
- Rain-to-snow and tunnels must not reopen the roof.
- Closed roof crash/finale must not eject people through canvas.
- Old goal badges and saved car IDs must remain readable.
- Game/browser captures must use loaded atlas pixels, not concept renders.

### Task 1: Native art
- [x] Record old-sprite hashes; add and run failing Python frame/alignment tests.
- [x] Add tools/art/vehicles/make_garage_cars.py for two new cars and six masked roof sets.
- [x] Generate frames, review sheet, run asset tests; pack atlas without copying unrelated backgrounds.

### Task 2: Runtime
- [x] Add and run failing Node tests for real Race weather selection, no movement/physics changes, tunnels, phases, crash visuals, goal unlocks.
- [x] Add roof state module, integrate Race rendering and finale, registry and garage unlocks.
- [x] Pass tests and TypeScript/build checks. Preserve original IDs and records.

### Task 3: Runtime evidence and integration
- [x] Render actual in-game rain/snow entrance and exit, all six cars, steering/braking/night/crash states; compare body pixels and anchors.
- [x] Run browser smoke test and inspect screenshots. Independent final code review.
- [x] Transfer owned files only to original checkout, merge string additions, rebuild sprite atlas and rerun checks on combined state.

## Execution ledger
- Baseline: isolated checkout at 4536338; npm run check passes. Existing shared checkout contains other agent's map/terrain work.
- Ruling: run inline, with final independent review; no extra approval round because user explicitly approved this implementation.
- Task 1 complete: four pixel-contract tests pass; 40 legacy input sprites retain their SHA-256 values.
- Task 2 complete: five runtime contracts pass, including offline account-reward persistence; TypeScript and standalone build pass.
- Review: fixed account-goal persistence with a failing-then-passing regression; browser observations now intercept each simulation snapshot assignment so accelerated tours cannot skip animation phases between browser frames.
- Integration: merged five shared files by three-way comparison with unchanged-current hashes checked before writing; copied only new garage files; regenerated the atlas from the combined current art sources. Concurrent map/elevation/weather changes retained.
- Combined checks: 432 actual-renderer comparisons, zero outside-mask pixel differences; 24 weather boundaries and 24 scene captures; balance, weather, demo and local-service suites pass. Final combined browser tours pass for all six cars, including every opening/closing phase; garage lock/earned-selection/reload smoke test passes. No browser errors or failed asset loads. Screenshots inspected.

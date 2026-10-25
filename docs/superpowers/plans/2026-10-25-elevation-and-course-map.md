# Elevation and Course Map Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current session. The user approved direct implementation; further design and execution-method questions are waived.

**Goal:** Give five stages recognizable road elevation profiles and make the Course Map show the actual evening conditions of the final stages.

**Architecture:** Generate the existing roads unchanged, then apply deterministic stage-specific elevations before placing scenery. Keep time of day separate from weather; use the same theme metadata in the Course Map caption and its painted tiles.

**Tech Stack:** TypeScript, Vite, esbuild/Node assertions, the existing Python/Pillow map generator.

**Spec:** User-approved proposal in this chat: Vineyard Valley has broad rolling hills; Cypress Point has gentler hills; Starlight Summit climbs to a raised finish plateau; Redwood Pass and Snowcap Pass climb, cross a flat central section, and descend. Snowcap has the larger elevation difference. Correct Gold Rush Town, Crystal Lake and Twilight Bay on the map.

## Global Constraints

- Do not update the deployed website or its repository during today's intermediate changes.
- Preserve segment counts, curves, gates, time awards, tunnels, route IDs and the Route A demo.
- Keep the existing save keys, badges and separate tour2 records. Do not change driving acceleration, braking or weather physics.
- Keep stage and fork transitions continuous, including lazy route rebuilding and the road after the summit finish.
- Reuse the existing asset pipeline. Do not add dependencies.
- Work in the clean current checkout, as requested for this direct iteration. Leave the changes reviewable; do not push this intermediate feature automatically.

## Review Focus

- A late route choice must produce the same heights and scenery as constructing that route initially.
- The summit finish must remain on the mountain, including the post-goal road.
- Checkpoints and fork approaches need readable flat sections and smooth grade changes.
- Clear weather in a dark stage must not display a daytime sun; heat haze must remain visible alongside sunset.
- Caption text must fit the 320 by 180 framebuffer without covering the route or records.

### Task 1: Authored road profiles

**Files:** `src/game/elevation.ts`, `src/game/track.ts`, `tools/qa/check-elevation.mjs`, `tools/qa/route-balance.mjs`, `package.json`.

- [x] Write and run regression tests against the current roads: assert a predominantly uphill summit with a raised flat finish, a central plateau between the two pass slopes, and repeated rolling hills.
- [x] Add smooth normalized elevation profiles and apply them before decoration without consuming the track RNG. Protect checkpoint flats and carry the summit height past the goal.
- [x] Compare all 16 routes against commit 4536338: only authored elevations change; lengths, curves, clocks and tunnels remain identical. Check continuity and lazy rebuilds.
- [x] Update the older balancing assertions to allow the deliberately changed elevations while retaining all other geometry checks.

### Task 2: Course Map time and features

**Files:** `src/game/themes.ts`, `src/game/coursemap.ts`, `assets/ui/strings.json`, `tools/art/map/make_map.py`, generated map assets, `tools/qa/check-course-map.mjs`.

- [x] Write and run failing tests for the actual caption rendering: late-stage time labels/icons, separate weather labels, road features and records.
- [x] Add explicit time-of-day metadata, render two compact caption rows, and derive feature labels from the elevation profiles.
- [x] Recolour the affected painted map tiles and decorations for sunset, dusk and night while keeping roads and lit windows legible.
- [x] Render and inspect the full map and captions for the affected stages.

### Task 3: Integrated verification

- [x] Run typecheck, elevation/map tests, all 48 route drives, handling/signal/save tests, local-service tests and demo tests.
- [x] Build regular, standalone web and demo editions locally; do not publish.
- [x] Inspect representative gameplay frames at climbs, crests, pass plateaus and the summit finish.
- [x] Request a fresh review of the complete working diff, address material findings, and summarize validation limits.

## Progress and Rulings

- Baseline: main at 4536338, clean working tree; existing checks passed in the preceding commit-and-push turn.
- Ruling: elevation changes affect road geometry only; existing speed and scoring rules remain. Existing records are retained under tour2 because distance, timing and handling stay unchanged.
- Ruling: direct implementation continues in the current checkout; no additional worktree or approval round is needed for this requested iteration.
- Ruling: keep time-of-day data in assets/ui/stage-times.json, consumed by TypeScript captions and the existing Python artwork generator, instead of duplicating it in theme code and Python.
- Ruling: preserve the original tiny eased entrance height of following stages by rebuilding only the connecting grade; unauthored stage geometry remains byte-for-byte numerically unchanged.
- Test correction: the first new lazy-route test accidentally specified an illegal Snowcap-to-Starlight edge. It now validates each route first and checks three legal alternatives. Large array assertion diffs were replaced with compact hashes to bound test memory.
- Baseline finding: already-dressed fork approach props differ after route switching in the original engine. The new test proves identical heights and no additional scenery mismatches compared with 4536338; changing the old prop behavior is outside this feature.
- Verification: check-elevation has 40 passing cases across all 16 routes, including unchanged active collisions; check-course-map has 11 rendered-caption and post-run integration cases. All 48 drive outcomes and timings remain identical to the preceding baseline. Typecheck, demo, local-service, handling and signal checks pass. Regular, standalone and demo builds pass with the existing bundle-size warning.
- Visual QA: ten road before/after samples and four actual Course Map caption comparisons inspected under output/elevation/gallery. This is technical and sampled visual verification; continuous human play-feel, real gamepad and hearing checks were not performed.
- Fresh review: one P2 issue found in the post-run screen: its blinking Continue prompt overlapped the expanded caption. A regression test executes the production mapScreen method with keyboard and touch input contexts; it failed before moving the prompt from y149 to y139. The corrected integration test passes. No other material findings were reported.

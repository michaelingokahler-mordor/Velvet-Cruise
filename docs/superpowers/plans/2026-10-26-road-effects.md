# Velvet Cruise: road effects implementation

Approved specification: user's implementation request, 2026-10-26.

- [x] NPC indicators for every intentional safe lane change, 0.18 s warning, both profiles.
- [x] Animated ocean waves/foam and at most one moving sailboat, calm lake, correct depth.
- [x] Windsock replaces airborne sand; gusts 4–6 s with unchanged peak and intervals.
- [x] Sustained steering squeal, distinct strip/sand entry sounds with cooldown.
- [x] Programming: OpenAI ChatGPT; Game Prototype: Former platform; usable Classic credits layout.
- [x] Regression tests, real-browser audio samples, visual review, performance comparison, fresh independent review.

No storage/API migration, publication or iPhone acceptance. Existing software framebuffer and audio synthesis, no new runtime dependency.

## Execution ledger

Baseline: main 4b4e3ba; clean. TypeScript, grade/horn, weather and directional-weather tests passed. Existing Palm Cove renderer benchmark: Classic median 0.8345/p95 1.083 ms, Plus 1.113/1.3267 ms.

Workspace: worktree road-effects created through the app; registration rejected ownership. Added one narrowly scoped safe.directory entry for this checkout. Attachment retry reported an unmanaged checkout; used its explicit path. Main checkout remained untouched during implementation.

Pre-flight: traffic and wind share Race/Renderer; audio consumes Race skid/surface events; wind HUD uses the same physical vector. Cosmetic water must not mutate simulation RNG or terrain.

Tasks 1–5: complete. New behavioral tests first failed against original source; implementation made them pass. Existing grade/horn and weather safety checks passed.

Ruling: Keep the historical pre-Plus track/scenery/collision/clock fixture and add a separate exact coast-run fixture for the intentional 0.18 s NPC warning delay. Exact original autopilot time/score is no longer an invariant; road and save compatibility remain independently checked. Future traffic changes require explicit review of the new driving fixture.

Task 6: complete. Final `npm run qa:road-effects`: 17/17 checks passed, including standalone Web build. Real Chromium checks passed for both profiles, credits/Back, actual pause/crash silence. Three unclipped Web Audio WAV samples, graphics gallery and alternating-source render benchmark saved under output. No human acoustic/device approval claimed.

Final review: fresh independent reviewer; no Critical/Important findings. Two reported Minor items were promoted to acceptance fixes because the approved plan explicitly requires continuous boat fading and indicators through the actual maneuver. Both new reproductions failed first, then passed after fixes; the full 17-check suite and browser/audio checks passed again. No deferred code findings.

Ruling: Preserve the existing steering trajectory while adding blink warning and a bounded settling phase (0.02 positional tolerance, maximum 0.65 s) so passive weather drift cannot hold an indicator forever. Cosmetic boat selection includes its animated position. These changes do not alter storage or track data.

Human listening, subjective wind handling, physical device review and publication remain open as specified. See reports/road-effects-2026-10-26/README.md for commands, samples and measured limits.

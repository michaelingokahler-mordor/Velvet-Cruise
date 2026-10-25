# Roof contours and folding animation

Approved plan: the complete implementation plan in this chat (2026-10-25).

## Contract
- Six complete 88x48 cars, binary alpha and fixed ground contact. All existing open PNGs immutable.
- Independently specified protected body/mirror/spoiler fixtures; no rectangular cockpit deletion.
- Per-model contours and exact original steering geometry; eight reversible poses over 0.65 seconds.
- Existing weather, saves, goal unlocks, handling, crash containment and finale behavior retained.
- Inline implementation, one independent final review; no commit/push or publication requested.

## Tasks and ledger
- [x] 1. Failing pixel/phase regressions, independent protection fixtures, open-file hashes and before captures.
- [x] 2. Layered generator: Rosso/Blue visual reference first, then all six model profiles and eight poses.
- [x] 3. Runtime/QA eight phases; actual renderer comparisons, transition/reversal/tunnel/crash/finale checks.
- [x] 4. Web build, browser tours, comparison images/clips, sprite ZIP, integrate only owned changes, final review.

Baseline: 206260c; original checkout clean; npm run check passes in isolated checkout.
Workspace: native create_worktree produced roof-contours/Code; attachment retried but host reports not managed. Continue explicitly at returned path without creating another checkout.
Ruling: preserve all 60 open/brake/empty input PNGs (not only the original 40) and read them as immutable inputs, including Silver/Azure.
Ruling: source-native Pillow pixel art is the approved medium; avoid AI raster editing because exact source pixels and layered generator behavior are required.

Task 1: RED independent body regression, missing eight poses, windblown-hair, windshield-header and floating-interior-mirror regressions recorded before fixes.
Task 2: GREEN nine Python contracts; all 60 open hashes retained; all three pose sheets visually inspected. Layered source art replaces cabin ink and restores protected foreground; right mirror hair overlap distinguished from actual stem.
Task 3: GREEN six runtime contracts, 1008 renderer comparisons (zero outside-mask and zero independently protected differences), all 24 transitions and all 48 rollover/phase cases.
Ruling: accelerated browser snapshots must be emitted inside each SIM substep; the previous once-per-frame observation skipped intermediate poses at sim=12. Moved only the existing test hook; normal simulation unchanged.
Review: independent reviewer found no critical/important issues; confirmed immutable hashes, native/atlas parity, unrelated sprite preservation and visual contours. Minor finale error-listener coverage added before final verification. Browser rerun PASS: six tours and six enclosed-to-open finales, including error listeners on finale pages.

Task 4: Integrated 399 owned files with normalized three-way merge and unchanged-current guards. Other agent input/settings changes preserved. Repacked original combined atlas; TypeScript/build, ten pixel tests, six runtime tests, 1008 renderer comparisons and all six combined browser tours/finales pass. ZIP CRC and SHA256 verified; delivery metadata output/roof-revision/delivery.json. No commit, push or public deployment performed.
Operational note: the host suspended the Python art process; resumed only the exact owned generator PID. No asset/source workaround or environment change needed.

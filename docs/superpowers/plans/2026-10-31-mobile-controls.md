# Mobile presentation and controls

Approved scope: the implementation plan supplied in this chat on 2026-10-31.

- [x] Reproduce and measure viewport fitting; implement one safe-area-aware presentation refresh path.
- [x] Implement versioned mobile preferences, calibrated steering/pitch, permissions and lifecycle safety.
- [x] Add the three-mode mobile settings screen, pause access and discreet controls.
- [x] Run unit, regression, browser and build checks; review and document limits.

## Constraints

No publication or Windows installation. Preserve existing saves, ranking contracts, physics and internal Classic/Plus resolutions. Work in the current clean checkout on codex/mobile-viewport-controls. Tests use disposable storage and block external traffic.

## Acceptance

Canvas fits the visible viewport after load, rotation, browser-bar changes, graphics changes and background return. Maintain 16:9 and correct pointer mapping. Modes are buttons, tilt with pedals, full tilt; default small (60%) at 20% opacity, fixed original hit areas. Calibrated neutral coasts; 3-degree dead zone, full input at 30/24/18 degrees. Denied/unavailable sensors fall back to buttons. Interruptions pause tilt driving and clear mobile input; rotation requires recalibration. Settings survive reload, calibration does not.

## Execution ledger

Ruling: reuse the current checkout on a feature branch, as required by the desktop workspace instructions; no additional worktree.
Ruling: desktop emulation cannot establish the exact iPhone-only trigger. Record normal orientation measurements and controlled visual-viewport regression separately; do not claim physical iPhone verification.
Ruling: the existing game's text catalog is English; new labels follow that catalog and existing font/layout conventions.

Viewport: baseline measurements captured stale 390-pixel canvas width after landscape rotation. A controlled visual-viewport reduction also failed before the correction. Both pass after the correction; exact physical iPhone behavior remains unverified.
Controls: 14 initial red scenarios passed after implementation. A fifteenth regression proves the sensor retry action restarts waiting after a missing stream.
Menus: touch and keyboard access, pause access, sensor gesture and persistent preferences pass in browser checks. Radio-return preview regression failed before correction and now passes.
Review: independent read-only review found radio-return and sensor-retry defects. Both have regression tests and corrections.
Verification: final TypeScript check, all 14 npm test suites, standalone build, Chromium production browser run and WebKit production browser run passed. Details: docs/MOBILE_CONTROLS_2026-10-31.md.
Ruling: Pause keeps at least 60% opacity even when driving controls use 20%; the emergency menu entry must remain visible.
Remaining acceptance: physical iPhone Safari/Chrome and human tilt feel. No deployment or Windows update.

Publication follow-up: the user explicitly authorized committing, pushing and publishing the web edition after implementation. Source f7dfdb5 was pushed to main and the feature branch. SabnockWorks publication 9a1e9ec is live. All 126 files, Chromium mobile flows and WebKit flows passed live checks. The initial no-publication constraint was superseded for the web edition. No Windows installation occurred. See reports/mobile-controls-2026-10-31/deployment.md.

# Mobile controls publication — 2026-10-31

The user explicitly authorized the commits, pushes and SabnockWorks web publication after local validation.

- Game implementation: `f7dfdb55572c61292354dee6bd1e48fc95209f6e`, pushed to `main` and `codex/mobile-viewport-controls`.
- Website publication: `9a1e9ec2690620261bd4343efa57866e7260c3af` in `michaelingokahler-mordor/sabnockworks`.
- Immutable release: `2026-10-31-f7dfdb5-mobile-controls`.
- Game URL: https://sabnockworks.com/games/more-projects/velvet-cruise/
- GitHub Pages: `built`, with the expected website commit.
- Deployment workflow: https://github.com/michaelingokahler-mordor/sabnockworks/actions/runs/41212809084

## Verification

Fresh TypeScript and all 14 test suites passed before the source commit.
The production build retains the existing statistics setting.
The complete candidate passed the mobile Chromium scenarios with its actual release wrapper and relative asset paths.

All 126 live files match the release manifest by SHA-256.
Text checks allow Git line-ending normalization for HTML, JSON and Markdown.
The executable game bundle matches byte for byte.
The canonical wrapper and metadata both select the new release.
The API health check returned HTTP 200 with the `velvet-cruise` service identity.

The actual live URL passed ten grouped Chromium mobile scenarios without JavaScript errors.
These cover display changes, settings, permissions, calibration, combined input, timeout, rotation, pause and saved settings.
WebKit on Windows passed both graphics modes and eight viewport cases without JavaScript errors.
It also passed touch navigation, denied permission and saved-settings checks.

The browser checks used disposable storage and explicit graphics-test hashes.
Requests outside the game origin were blocked.
No synthetic scores or statistics were submitted to production.

See [deployment-validation.json](deployment-validation.json) for measured results and the bundle hash.
Detailed local manifests, logs and baseline failures remain under `output/mobile-publication/` and `output/playwright/mobile/`.

## Compatibility and rollback

The game URL, browser save origin, existing save keys, ranking ruleset and API URL remain unchanged.
The new mobile settings use a separate versioned key.
No Worker deployment or database migration occurred. The installed Windows edition remains unchanged.

The previous release `2026-10-31-2f73c2f-independent-runtime` remains available and returned HTTP 200.
For rollback, restore the preceding wrapper and root build metadata while retaining both immutable release directories.
Do not delete browser storage or newer progress.

## Device acceptance

No physical iPhone test occurred.
WebKit on Windows does not establish iOS acceptance.
The user can now test the published edition in Safari and Chrome on the affected iPhone.

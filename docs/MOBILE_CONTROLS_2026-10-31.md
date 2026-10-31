# Mobile presentation and controls — 2026-10-31

The implementation commit is `f7dfdb55572c61292354dee6bd1e48fc95209f6e`, based on `1523e54`.
The user subsequently authorized web publication. The release is live on SabnockWorks.
See [the deployment record](../reports/mobile-controls-2026-10-31/deployment.md) for revisions and live checks.
The installed Windows edition remains unchanged.

## Display correction

The old layout combined CSS flex centering with Phaser centering.
The game also lacked a dedicated refresh path for changes to the visible viewport.

The baseline browser measurement started at 390 × 844 and rotated to 844 × 390.
The canvas retained its old 390 × 219.375 display size after rotation.
The Classic/Plus change then produced a 693.328 × 390 canvas, with incorrect horizontal centering.
This reproduces stale size and position. It does not establish the exact oversized-image trigger on the reported iPhone.

A separate regression reduced the visible viewport to 844 × 300, with a 12-pixel top offset.
The old canvas remained 390 pixels high and extended outside that area.
The corrected canvas measures 533.328 × 300 at position 155,12.

`GameViewport` sizes the Phaser parent from the visible viewport and the CSS safe-area insets.
Phaser remains responsible for the proportional canvas size and centering.
Resize, orientation, page return, focus, visibility, container changes and visual viewport changes request an update.
Updates share one animation frame and recheck dimensions for 700 milliseconds after each request.
The Classic/Plus path requests the same update. Neither mode changes its native rendering resolution.

## Controls

Open **Settings → Controls → Mobile controls**.
The race pause menu also opens this screen without replacing the current race.
The radio screen retains a shortcut and restores its music preview on return.

| Mode | Steering | Speed |
|---|---|---|
| Buttons | Left and right touch areas | Up for gas; down for brake |
| Tilt + pedals | Tilt left and right | Left touch area for brake; right for gas |
| Full tilt | Tilt left and right | Tilt forward for gas; tilt back for brake; neutral coasts |

The displayed button sizes are 60%, 80% and 100% of their old dimensions.
The opacity choices are 20%, 40% and 60%.
The defaults are 60% size and 20% opacity. The original touch areas remain unchanged.
Pause retains at least 60% opacity so that the player can find it.
Full tilt shows small input indicators instead of driving buttons.

Sensor access requires a deliberate activation gesture.
After sensor data arrives, **Calibrate holding position** captures the current comfortable position.
Calibration applies to the current session only.
The neutral range is three degrees. Gentle, Normal and Direct reach full input at 30, 24 and 18 degrees.
The default is Normal. Input smoothing uses elapsed time between samples.

Rotation invalidates calibration and clears mobile input.
During tilt driving, rotation, background interruption or a sensor timeout pauses the race.
The timeout is more than one second without valid samples.
Resume requires calibration when sensor data is available but calibration is missing.
Denied or unavailable sensors provide a button fallback. A new activation gesture can retry sensor access.

Mobile settings use the separate versioned `${SAVE_PREFIX}.mobile-controls.v1` key.
The old tilt setting selects Tilt + pedals when the new key does not exist.
Existing saves, records, device preferences, bindings, physics and ranking contracts remain unchanged.

## Verification

| Check | Result |
|---|---|
| `npm run check` | Passed |
| `npm test` | All 14 suites passed |
| Mobile input scenarios | 15 passed |
| Existing input binding scenarios | 16 passed |
| Menu scenarios, including radio return | 17 passed |
| `npm run build:web` | Passed; Vite reports the existing large-bundle warning |
| Chromium against the built web edition | 10 scenario groups passed; no JavaScript errors |
| WebKit against the built web edition | Both graphics modes passed; eight viewport cases; no JavaScript errors |
| Independent code review | Radio-return and sensor-retry findings corrected with regression tests |
| `git diff --check` | Passed |

The browser tests use disposable browser storage and block requests outside the local test server.
They do not submit scores or statistics to production services.

Chromium covers portrait, direct landscape, rotation, visible viewport changes, safe insets, page return and both rendering resolutions.
Its sensor scenarios cover real touch activation, calibration, combined steering and gas, rotation, timeout, pedal input and background pause.
It also covers small-button multitouch, saved settings, calibration reset, permission denial and permission retry.
WebKit covers four viewport sizes per graphics mode, touch navigation, permission denial and settings after reload.

The test tools are `check-mobile-controls.mjs`, `mobile-browser.cjs` and `mobile-webkit.cjs` under `tools/qa/`.
The browser tools require Playwright. WebKit also requires its Playwright browser installation.
Use `npm run qa:mobile`, `npm run qa:mobile:browser -- <local-url>` and `npm run qa:mobile:webkit -- <local-url>`.
The browser defaults use `http://127.0.0.1:4193/`.

The logs, measured dimensions, regression failures and screenshots are under `output/playwright/mobile/`.
The final build logs are `web-build.log`, `browser-production.log`, `webkit-production.log` and `all-tests.log`.

## Remaining device acceptance

WebKit on Windows is not an iPhone browser session.
No physical iPhone test occurred.
Actual sensor direction, comfortable movement range, dynamic Safari safe areas and finger control remain unverified on the user's device.

On the affected iPhone, open the candidate in Safari and Chrome.
Check direct landscape load and both rotation directions before any Classic/Plus change.
Allow motion access, calibrate a comfortable position and try all three modes.
Check the forward/back speed direction, combined steering, pause access and return from the background.
The published web edition is available for this physical device acceptance test.

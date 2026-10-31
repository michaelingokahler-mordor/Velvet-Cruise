# Native runtime validation

The Windows candidate uses an owned Electron application and preload. The game origin is `velvet-game://game-20261009-93986676/`; its stable profile is `%APPDATA%/Velvet Cruise/profiles/game-20261009-93986676`. Demo identity appends `-demo-a`. The exposed bridge is `window.VelvetDesktop` with `embedded: true` and a Promise-returning `quit()`.

## Compatibility and migration

The previous application stored localStorage under its game-specific custom origin in an application profile below the roaming app-data directory. The importer discovers origins by the existing exact game identity and `sunset-coast-run` storage prefix; it does not depend on any publisher identifier or previous application code. Bounded discovery reads LevelDB logs and both uncompressed and Snappy-compressed SST keys, including reconstructed shared prefixes. Profiles are considered in newest-database order.

Before snapshotting, Windows PowerShell opens the existing source LOCK with a read-only, FileShare.None lease held across the complete flat database copy. An actual active Electron fixture demonstrated that ordinary CopyFile incorrectly accepts a hot LevelDB database; the exclusive lease rejects it. The original profile is never opened by Chromium, changed, or removed. A separate hidden Electron process opens only a temporary snapshot. It returns only game-owned localStorage entries; the snapshot and reader output are removed afterward.

Imports are staged before writes. If a higher-priority source is unavailable, older sources do not populate the destination. The game does not start or initialize new defaults until retry succeeds or the player explicitly continues. Destination values always take priority. Completion markers are written in destination localStorage only after a source's entries were processed; failed reads or writes can retry. Quota failures show the same recovery screen, and explicit continuation leaves their marker unset.

## Build and package

`tools/build-desktop.mjs [fresh-output] [version] --source <desktop-vite-output> [--demo-a]` adds only the owned runtime JSON metadata and retains the built game files. With no explicit output it creates a new timestamp directory.

`tools/package-desktop.mjs --game <assembled-game> --out <fresh-candidate>` copies the Electron distribution but excludes the entire original resources directory. It installs only `desktop/` as `resources/app` and the new game payload as `resources/game`. Without `--game`, the latest generated payload manifest is selected; without `--out`, a fresh timestamp candidate is created. Explicit existing outputs are refused. The source executable version resource identifies GitHub, Inc. and Velvet Cruise; Chromium/Electron license files remain. There is no Steam integration or claim of Steam achievements.

The installed package at `D:/Velvet Cruise/WinExe` remains untouched. No publication or push was performed.

## Evidence

- `node tools/qa/independent-native-unit.mjs`: passed storage-key ownership, bounded generic discovery, no overwrite, custom-origin host separation, media ranges and Snappy back-reference/error checks.
- `node tools/qa/independent-native-integration.mjs`: actual executable tests cover 21 storage families, including local bests/badges/stage records, controls/audio/car/difficulty/graphics/progress and ranking credentials/queue. Tests force real Chromium SST compaction and remove old logs, verify active-profile rejection, higher-priority failure staging, retry, native bridge/Exit, no unrelated-key import and persistence across relaunch. An explicitly injected QuotaExceededError in the test-owned Chromium application verifies destination-write recovery and explicit Continue. The published runtime contains no fixture flag or injected failure branch.
- `node tools/qa/independent-native-smoke.mjs <candidate>` checks game-owned application presence and absence of the old application archive/unpacked modules.
- Full repository `npm test`: passed on the shared source tree. Node emitted its existing SQLite experimental warnings.
- A full-game executable was launched using an isolated profile; a real canvas and the native bridge were verified and native Exit shut down the process. The inspected screenshot `output/independent-runtime/native-qa-1793446487506/native-game.png` shows the title menu including EXIT.

The final candidate is `output/independent-runtime/windows-final`, assembled from the final desktop game source. Final integration evidence is `output/independent-runtime/native-qa-1793446487506/summary.json`. Origin discovery also passed a 512-KiB repeated opaque-value performance regression after replacing a quadratic regular expression with a linear exact-identity search.

The native window starts fullscreen, matching the previous application. Actual keyboard fullscreen acceptance uses Alt+Enter. Escape remains available to the game for menu/Pause. CDP synthetic F11 dispatch did not establish native fullscreen behavior and is not reported as acceptance; root performs the CUA keyboard check separately. No human gameplay/device/release acceptance is inferred from these runtime checks.

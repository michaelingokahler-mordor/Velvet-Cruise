# Mac release — 2026-10-31

The full game has separate downloads for Apple Silicon (arm64) and Intel (x64). Both versions use the approved desktop ranking client, offline queue and local arcade tables. They retain the game ID, rules and custom origin. The existing live service accepts this origin.

## Build and native verification

- Source: `bcb7343a9e2ff555885b14b42eed39fc0d8409da` on `codex/macos-release`.
- Native run: https://github.com/michaelingokahler-mordor/Velvet-Cruise/actions/runs/41225385048.
- Standard runners: `macos-15` arm64 and `macos-15-intel` x64.
- Runtime: Electron 45.2.1, Packager 20.3.0, bundle ID `com.sabnockworks.velvetcruise`.
- Both runners passed TypeScript and all 21 test suites from fresh checkouts.
- Both applications passed strict recursive signature verification after packaging and after re-extraction of the exact delivery ZIP.
- Native tests verified offline rendering and retained queued bests across an actual application restart.
- The game uploaded the queued result automatically. Web and native clients read the same result with a unique driver tag.
- Native CORS requests succeeded. The separate local arcade table retained its entry.
- Migration tests rejected an active Chromium source. They copied an idle database and imported its saved values through the actual runtime.
- Source fingerprints stayed identical before and after migration.
- Test profiles and score submissions used local Worker/SQLite fixtures. These tests sent no production scores or statistics.
- Archive checks verified CPU architecture, executable permissions, framework symlinks, ZIP integrity and nonempty Electron/Chromium notices.

The initial CI run exposed a local-service test that imported a stale build filename before creating it. A fresh local run reproduced the error. The corrected test reads its current output and passed on both clean Mac runners.

Independent code review requested bounded child-process exits in the migration tests. Regression tests cover normal, already-ended and hung children. The native runs include this correction.

Archive inspection found missing runtime notices in the first successful build. The final packager includes both notices outside the signed app. Both Mac runners repeated the complete build and native tests with this correction.

The local distribution scan also reads untracked documentation. An unrelated age-rating draft triggers its former-platform-name assertion. That draft remains unchanged. Both clean Mac checkouts pass the full suite.

## Signing and first launch

These packages have ad-hoc signatures. They have no Developer ID signature or Apple notarization. This build needs no Apple enrollment. Downloaded apps can require approval in macOS Privacy & Security. The [start instructions](../../docs/MACOS_START.md) describe this process.

CI startup does not cover the first launch of a quarantined download on a customer's Mac. Human gameplay, listening and physical-controller acceptance remain untested. The screenshots and reports establish the stated technical behavior.

## Compatibility and preservation

All 202 installed Windows files match the approved Windows manifest. The live service remains unchanged. Mac storage uses `~/Library/Application Support/Velvet Cruise/profiles/<gameId>`.

Legacy snapshots use macOS `lsof` checks and source fingerprints before and after copying. Active or changed sources use the existing retry/continue flow. The original profile remains intact. Newer destination values take priority.

Both bundles require macOS 13 or newer. The Apple Silicon version needs no Rosetta. `package-validation.json` records the final download hashes and archive checks. The local ZIP copies must match their native build manifests exactly.

The public GitHub repository uses standard hosted runners. GitHub documents these runners as free for public repositories: https://docs.github.com/en/actions/reference/runners/github-hosted-runners.

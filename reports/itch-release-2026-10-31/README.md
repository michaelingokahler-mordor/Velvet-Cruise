# itch.io Full 1.0.0 release preparation

Status: three delivery ZIP files are prepared and checked. No itch.io upload occurred.
The proposed Full project is `sabnockworks/velvet-cruise`; the existing demo remains a separate project.

## Delivery

Folder: `D:/Velvet Cruise/Itch/1.0.0`.
`release.json` records the three channel names, archive sizes and SHA-256 hashes.
`SHA256SUMS.txt` contains the same hashes. `START-HERE.md` explains first setup and later updates.

Version 1.0.0 comes from `package.json` for the runtime packages, game build metadata,
Windows PE file/product versions, Mac bundle/build versions and archive names.
Each archive contains a top-level `.itch.toml` launch action.
Both Mac archives retain their original signed bundle bytes and framework symlinks.
They are ad-hoc signed, not Apple-notarized.

Package-producing source commit: `c9b93747618d19ec1c574ca889300d312deffb51`.
Later commits fix a version test and add update acceptance/documentation; they do not change shipped game/runtime bytes.

## Verification

- TypeScript check passed.
- New packaging tests exercise real PE version resources, Full metadata, source preservation and overwrite rejection.
- Collection tests reject missing builds, wrong CPUs, demo payloads and corrupt uploads before any Butler invocation.
- A simulated version bump to 1.0.1 reproduced the review finding, then passed after the test correction.
- The complete `npm test` suite passed in a clean snapshot of tracked source at `ff54760`.
- The working checkout has a pre-existing content-scan failure: untracked `docs/ALTERSEINSTUFUNG_2026-10-31.md` mentions a former platform.
  The user document remains untouched. The test and its coverage were not weakened.
- Both native Mac jobs passed their complete suite, package build, ZIP extraction, strict signature verification, migration and ranking checks.
- Official Butler validation passed for Windows and both native Mac launch manifests.
- Native Windows checks passed offline rendering, local records, queued records across restart, real CORS and automatic shared ranking upload.
- Butler generated a local patch from the previous Windows installation to the new build and applied it to a separate directory.
  All 204 resulting files match the new build byte-for-byte.
- The update acceptance test started the previous executable/payload offline, then started the Butler-patched version with the same disposable profile.
  Its queued best performance uploaded automatically; the local arcade table survived.
- Synthetic tests used a loopback service and disposable profiles. They wrote no production scores or statistics.

Native CI: [run 41232382167](https://github.com/michaelingokahler-mordor/Velvet-Cruise/actions/runs/41232382167).
Per-architecture archive, ranking and migration reports are included here.

## Butler and future updates

The local Windows Butler is v15.32.0. The setup script installs into ignored `output/itch-tools/butler`.
Authentication is not configured. No credentials are stored in the repository or delivery.

The prepared upload plan uses these stable channels:

- `windows-x64`
- `macos-arm64`
- `macos-x64`

The helper checks all three archive checksums before starting the first upload.
Its default mode prints commands without contacting itch.io.
`npm run itch:push -- --release <delivery> --project <account/game>` explicitly uploads.
Each command includes `--userversion 1.0.0` from the delivery manifest.
Future releases reuse the same product and channel names.

## Remaining account and practical acceptance

Create the separate Full product, configure its seller details and price, and authenticate Butler once.
Use a restricted project for the first real itch app installation/update check on Windows and both Mac processor variants.
Mac first-open approval, physical gamepad behavior, gameplay feel and listening remain human/device acceptance work.
The prepared files and local patch test do not prove a completed store purchase or itch app update.

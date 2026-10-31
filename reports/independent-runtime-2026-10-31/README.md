# Independent runtime candidate — 2026-10-31

Status: prepared and tested locally. No push, publication, production API write, database migration or installed-package replacement occurred.

## Changes

The game owns its language, local records and badges through `src/platform/services.ts`. The old SDK adapter, external bootstrap, telemetry forwarding and embedded desktop service scripts are removed. Credits retain their original name and link. Current tooling, documentation and provenance metadata contain no other publisher identifier. Historical Git commits and the original installed/exported packages remain intact.

The web, default development, demo and desktop builds are independent. Their local storage keys, full/demo separation, score ordering, badge definitions, audio controls, input bindings, cars and graphics progress remain unchanged. Existing ranking credentials and the pending-score queue retain their keys. The Cloudflare Worker, D1 schema, report secret and service endpoints are unchanged.

The existing scene-ready load event remains once per document. Each newly created race attempt calls the statistics module directly. Pause, resume, menus and route changes do not count as starts. Production origin/build/automation gates and bounded event retry remain in place.

## Windows data retention

The owned Electron runtime exposes only the native bridge required by the game. It starts fullscreen, uses Alt+Enter to toggle fullscreen, leaves Escape with the game and supports the native Exit item. Renderer Node access is disabled; sandbox and context isolation are enabled. Electron license files remain in the package.

Its stable origin is `velvet-game://game-20261009-93986676/`. The new profile is below `%APPDATA%/Velvet Cruise/profiles/`. A generic importer discovers a prior game origin from the exact existing game identity and storage-key prefix. It reads compressed SST files as well as logs. It does not embed or encode a previous publisher's scheme or profile name.

The importer obtains an exclusive read lease before copying a source database. Chromium opens only the snapshot. Reads are staged in newest-source order before destination writes. It copies only game-owned localStorage keys and never replaces an existing destination value. A locked or failed source presents Retry/Continue before game defaults can initialize silently. The source profile stays intact. Completion markers prevent repeated imports; failed imports can retry.

See [native details](native.md) and [independent review](review.md). The runtime does not claim Steam achievements or Steam Cloud integration; the supplied original package has no configured Steam application ID.

## Verification

| Check | Result |
| --- | --- |
| Game TypeScript check | Passed |
| `npm test` | 12 suites passed, including seven build-mode combinations, local data retention, statistics/API/client regressions, menus, source scan and native units |
| Statistics | 11 groups, actual scene load/start hooks, 23 runtime exclusions/production scenarios, eight-connection SQLite duplicate delivery |
| Ranking integration | Local SQLite Worker and client: ordering, credentials, rename, offline queue, reload, rejected credentials, concurrent submissions and save retention |
| Audio | 11 checks passed, including saved music/effects levels and blocked storage |
| Input bindings | 16 checks passed, including remapping persistence and keyboard/gamepad behavior |
| Progress/unlocks | 18 checks passed, including old records, non-destructive migration and full/demo separation |
| Demo driving | Easy, Normal and Hard automated runs completed the demo; full-edition records were preserved |
| Repeat builds | `npm run build:desktop` twice and `npm run build:demo` twice passed with fresh generated outputs |
| Native executable migration | 21 saved-data families; real compacted/compressed Chromium profile; actual active-source rejection; newer-source retry priority; relaunch; retained destination and original data |
| Native write-error recovery | Explicitly injected browser storage exception exercised Retry/Continue and completion-marker behavior in the test-owned application |
| Native discovery performance | A 512-KiB opaque-value regression passes after replacing a quadratic search with a linear search |
| Native UI | Actual keyboard checks: fullscreen startup, Alt+Enter both ways, Escape ownership, Normal race start, Pause and native Exit |
| Web browser UI | Rendered title and real ranking screen through a loopback-only Worker fixture; no browser errors; no production forwarding |
| Source removal scan | Passed; includes extensionless dotfiles; Credits attribution preserved |
| Artifact scan | Web 123 files and Windows 201 files passed before release metadata; three literal Credits references in each |
| Independent review | No unresolved important finding; five discovered issues corrected and rechecked |

The final native integration evidence is `output/independent-runtime/native-qa-1793446487506/summary.json`. Browser screenshots and local API observations are under `output/independent-runtime/browser/`. Copies of concise machine results accompany this report.

Chromium locale resources contain ordinary translated words whose spelling coincidentally includes the same substring as the former identifier. The artifact scan checks identifier boundaries and retains those upstream resources unchanged. Vite's large-chunk and Node's SQLite experimental warnings remain; they did not fail verification.

Automated checks and UI operation do not establish human driving/listening acceptance or physical phone/gamepad acceptance. Damaged historical profiles can still require the explicit Retry/Continue flow. The original profiles are retained.

## Reviewable artifacts

- `output/independent-runtime/web-final/`
- `output/independent-runtime/windows-final/Velvet Cruise.exe`
- `output/independent-runtime/Velvet-Cruise-Web-2026-10-31.zip`
- `output/independent-runtime/Velvet-Cruise-Windows-2026-10-31.zip`
- `output/independent-runtime/release-manifest.json` and `SHA256SUMS.txt`

Only the final directories and archives are delivery candidates. Earlier numbered directories are test iterations. After the reviewed source commit is clean, `node tools/prepare-independent-release.mjs` records that exact revision, creates both archives and verifies ZIP integrity.

## Publication boundary

Wait for further user approval. The existing site and `D:/Velvet Cruise/WinExe` remain unchanged.

After approval, publish the new web directory as an immutable release and update the website wrapper and metadata. Keep the existing game URL, save keys, API configuration and previous release directories. This frontend/runtime change requires no Worker deployment, secret change or D1 migration. Replace the Windows distribution only after preserving its previous package. Keep both storage profiles if rollback is needed; do not delete newer progress while returning to an older launcher.

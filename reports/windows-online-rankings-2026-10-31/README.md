# Windows shared rankings candidate — 2026-10-31

Status: activated with the user's approval on 2026-10-31. Migration 0003 is applied, the reviewed Worker is live, and the reviewed Windows package is installed in `D:/Velvet Cruise/WinExe`. All 15 existing local game entries were retained with identical values. See [deployment.md](deployment.md) and [deployment-validation.json](deployment-validation.json). The web game was not republished.

## Behavior

- The full Windows client uses the existing shared web ranking service.
- Each installation keeps an anonymous profile. Online rows show `NAME#DRIVERTAG`; tags are unique in D1 and survive name changes. Each profile keeps one best result per board. No email/password account is required.
- Local arcade top 10 tables and stage records stay on the device and retain their original names. Existing historical records are not imported into the online ranking.
- Results resolve from local storage before network delivery. Pending bests survive application restarts. Startup, online/focus events and a 15-second background retry resume delivery. A late acknowledgement cannot remove a stronger pending result.
- Successful uploads refresh open online/result views. Generation guards prevent old replies from overwriting newer data.
- Demos, development, test hashes and native CDP/headless launches cannot use the production ranking service. Native tests use copied game assets with loopback configuration. Desktop rankings do not enable production counters.

## Data change and compatibility

`server/migrations/0003_driver_tags.sql` adds `driver_tags(profile_id,tag)` with a unique tag constraint. Existing profiles receive distinct tags without changing their IDs, tokens or scores. New random tags retry on collision. Profiles created by an old Worker between migration and deployment receive a tag on their first read by the new Worker.

The API keeps existing fields and adds `driverTag`. The currently published web client remains compatible. New clients tolerate responses from an older server without this field. Normal leaderboard reads retrieve tags in the same SQL query.

Clearing an installation's saved profile creates a new online identity. Cross-device linking, account recovery and replay-based cheat detection remain outside this change.

## Candidate files

- Windows directory: `output/windows-online-rankings/windows-final/`
- Windows executable: `output/windows-online-rankings/windows-final/Velvet Cruise.exe`
- Reviewed ZIP: `output/windows-online-rankings/Velvet-Cruise-Windows-Online-Rankings-2026-10-31-reviewed.zip`
- Release manifest: `output/windows-online-rankings/release-manifest.json`
- Verification logs and isolated native profiles: `output/windows-online-rankings/`

The native acceptance test copies game assets and replaces only that copy's API address with a loopback endpoint. It blocks external HTTPS requests. It does not launch the installed package or touch its saved profile.

## Verification

- `npm run check`: passed.
- `npm test`: all 17 suites passed after the final code changes.
- Full web, full desktop and desktop-demo builds: passed in fresh output directories.
- Driver-tag tests: equal names, forced random collision, stable rename, legacy UUID-prefix collision, preserved scores/tokens and the staged old-Worker deployment window passed.
- Offline delivery tests: local results do not wait for a stalled request; queue survives restart; reconnect/timer resumes upload; a late acknowledgement retains a stronger pending result.
- Scene regressions: upload completion refreshes online/results views; late old replies cannot replace newer values.
- Actual Windows acceptance: `output/windows-online-rankings/native-1793463209738/report.json` passed. The real game rendered offline and uploaded its persisted result after relaunch. Real native-origin preflight, writes and shared web reads passed against local SQLite/Worker. Local arcade entries remained present. No statistics requests occurred.
- Native automation: the actual CDP-launched package exposes its automation indicator. The production-policy regression blocks that indicator even when `navigator.webdriver` is false.
- Artifact scan: 202 Windows files and 123 web files passed; Credits retained. A final source/distribution scan also runs as part of `npm test`.
- Worker deployment dry-run: passed with Wrangler 4.151.1. The subsequent approved activation applied migration 0003 and passed native-origin production preflight, shared native/web reads and saved-data verification. See the deployment record.
- ZIP integrity and file hashes are recorded in the release manifest and `SHA256SUMS.txt`.

Independent whole-change review found one important stale-ranking display issue. A failing regression reproduced it before the fix. The complete suite and native acceptance then passed again. Existing-tag reads were also reduced to a single leaderboard query and verified with a query-count regression.

The initial web build encountered an access error in the pre-existing `dist/assets/audio` directory. All release builds then used fresh output directories and passed. Existing Vite large-chunk and Node SQLite experimental warnings remain. Automated native checks establish these technical behaviors, not human driving/listening acceptance.

## Activation after approval

1. Record the current Worker version and retain a D1 backup. Confirm the installed Windows profile/package remain available for rollback.
2. Run `wrangler d1 migrations list velvet-cruise --remote --config server/wrangler.jsonc`. The read-only preflight on 2026-10-31 lists only `0003_driver_tags.sql` as pending.
3. Apply migrations with `wrangler d1 migrations apply velvet-cruise --remote --config server/wrangler.jsonc`.
4. Deploy the reviewed source with `wrangler deploy --config server/wrangler.jsonc`. The exact native origin is added to ranking origins. Keep `STATS_ALLOWED_ORIGIN` and all secrets unchanged.
5. Check health, native-origin preflight and public board reads without creating synthetic production profiles or scores.
6. Install/distribute the reviewed Windows candidate while keeping the previous executable package and current player profile. Keep the stable game identity and storage origin.

No web-game publication is required for Windows/web sharing. Publishing the new web build later also displays driver tags in its ranking UI.

Rollback: redeploy the recorded previous Worker version and restore the retained Windows package. Leave the additive tag table and original player profiles intact. The old Worker ignores the extra table.

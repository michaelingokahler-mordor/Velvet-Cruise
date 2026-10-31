# Approved activation — 2026-10-31

The user approved activating the prepared ranking service changes and installing the reviewed Windows package.

## Server

- Previous Worker version: `b36981d9-e09b-42b8-a890-559619a72b73`.
- Active Worker version: `2c3f1054-9755-49c6-a95b-43ccad835252`.
- Migration `0003_driver_tags.sql` applied successfully. No pending migrations remain.
- The D1 export and before/after data snapshots are retained in a private local backup folder outside the repository.
- Both existing profiles, all six scores, and the statistics totals remained identical across activation. Both profiles have distinct public tags.
- Live native-origin health returned 200; score-submission preflight returned 204. Native and web origins read the same shared entries with valid tags.
- Native statistics access and unrelated origins remain blocked. The statistics report still requires authorization.
- No synthetic production profiles, scores or statistics events were submitted.

## Windows

- Installed executable: `D:/Velvet Cruise/WinExe/Velvet Cruise.exe`.
- Previous package retained: `D:/Velvet Cruise/WinExe.backup-before-online-20261031-173616`.
- Reviewed ZIP SHA-256: `07c9ec7c0074ade4e4feadd5ed8103ee8b98aac46ac5fd02795486b232b5d768`.
- All 202 reviewed package files matched their hashes before staging and after installation. A separate `INSTALLATION-INFO.json` records activation; the reviewed archive is unchanged.
- The stable game origin and saved-profile location remain unchanged. A private exclusive snapshot was taken before replacement.
- The installed application started normally with the title `Velvet Cruise` and closed normally after the smoke check. No debugging/automation flags were used for this launch.
- A second private profile snapshot confirmed all 15 existing game-owned local-storage values remained identical: zero missing keys and zero changed values.

The prior isolated native acceptance verified offline play, persisted queue recovery and automatic upload after a real Chromium relaunch against a loopback-only Worker/database. The production checks verify deployment, CORS and shared reads without injecting test results into live rankings. These are technical checks, not human play-feel acceptance.

## Rollback

Deploy the recorded previous Worker version and restore the retained Windows package if necessary. Leave the additive tag table and both original/private saved profiles intact. The previous Worker ignores the extra table.

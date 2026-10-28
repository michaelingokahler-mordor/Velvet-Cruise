# Statistics publication — 2026-10-28

Published after the user's explicit approval to commit, push and publish.

- Game implementation: `e07bc1564aa5f9b982fbacd7e51cb1c7fe8dca9b`, pushed to `main` and `codex/velvet-statistics`.
- Website publication: `ef394aacdf918a0733bbb59281b9af5b4c75051f` in `michaelingokahler-mordor/sabnockworks`.
- Immutable release: `2026-10-28-e07bc15-statistics`.
- Active Worker version: `b36981d9-e09b-42b8-a890-559619a72b73`.
- D1 migration: `0002_statistics.sql` applied successfully; no migrations remain pending.
- A D1 backup was exported to a private local directory before the migration.
- The report secret was generated with a cryptographic random generator, installed as a Worker secret, and saved outside both repositories in a directory restricted to the current Windows user. No secret was included in source, URLs, public assets or this report.

## Verification

The complete eight-suite `npm test` command and game typecheck passed again before publication. All 125 candidate hashes matched before copying. All 124 non-metadata website candidate files matched after copying; release metadata was updated deliberately for publication.

GitHub Pages reported `built` for website commit `ef394aa`; its `pages build and deployment` action completed successfully. The canonical public game wrapper selects the new release. The live JavaScript and sprite atlas are byte-identical to the checked files. The wrapper, JSON metadata, music manifest and Plus manifest match after Git CRLF/LF normalization. Online configuration is byte-identical. See [live file verification](live-verification.json).

The deployed API passes health and existing public ranking reads. The protected report returns 401 without a key and 200 with the private key. It returns the expected Europe/Berlin day and totals. A localhost-origin ingest request returns 403. The report's real browser UI authenticated successfully and displayed its daily row and totals.

The published game loaded its title and started a Normal Palm Cove attempt in a browser at `#graphicstest`, with no browser errors. This excluded automation mode produced no production counts: the report remained at zero loads and zero starts before and after. No synthetic example events or ranking profiles were inserted in production. Existing ranking table counts remained zero, matching the pre-migration snapshot.

The report starts with actual new events after publication; the earlier 507/895 example remains synthetic and was never imported. These checks do not represent human gameplay/listening acceptance or phone/gamepad testing.

## URLs

- [Play Velvet Cruise](https://sabnockworks.com/games/more-projects/velvet-cruise/)
- [Private report](https://velvet-cruise-api.emerald-hollows.workers.dev/stats/)

The earlier candidate README is the preparation snapshot. Its deployment-pending statements describe the state before this approved publication.

## Recovery

The prior website commit is `a852cbb2643942e80ca5fac2cdc6e5596f1ef087`. Its immutable game release remains present. The prior Worker version is `f4b0bae9-ee80-4523-9099-adce5cf71c1d`. Restore the previous wrapper and roll back to that Worker version if required. Keep the additive statistics tables; rollback requires no deletion of ranking or save data.

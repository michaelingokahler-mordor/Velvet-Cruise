# Approved deployment, 2026-10-31

The user approved committing, pushing, publishing the web edition and updating the installed Windows edition while preserving existing data.

## Revisions and packages

- Reviewed game source: `2f73c2f624f84f27ccdb9c760143b9c2c7386d74`.
- Website publication: `68cca8197293a34de87cc31a5de6f3a149f51d5b`.
- Web release: `2026-10-31-2f73c2f-independent-runtime`.
- Public URL: https://sabnockworks.com/games/more-projects/velvet-cruise/
- Installed executable: `D:/Velvet Cruise/WinExe/Velvet Cruise.exe`.
- Previous Windows package retained at `D:/Velvet Cruise/WinExe.backup-20261031-previous`.
- Reviewed web ZIP SHA-256: `4edc1f840b9e5c5fb6268b8c106b7d42b56464e7a8d046db5873429e2aa94e53`.
- Reviewed Windows ZIP SHA-256: `0900e6e16ccae2a638c425bbd899362ce7bbda25959618215782b37f3f844697`.

The reviewed ZIPs remain unchanged. Deployment metadata is recorded separately. Website HTML line endings are normalized; executable JavaScript and binary assets are unchanged. The installed `RELEASE-INFO.json` records the installation timestamp.

## Existing data

A private snapshot of the actual previous Windows profile was secured before installation. The installed game started normally under its owned origin and displayed the existing personal best. It was closed through its Exit menu before comparing copied profiles.

All 15 existing game-owned local-storage entries were retained with identical values: zero missing keys and zero changed existing values. Hashes of all original profile database files remained unchanged. The private snapshots and comparison data stay outside both repositories.

Web URL, browser storage keys, extended-tour ruleset, API URL, ranking profiles and queued uploads are unchanged. Earlier immutable web releases remain available for cached pages and rollback. The Worker, secrets and D1 schema/data were not redeployed or migrated.

## Verification

Fresh `npm run check` and all 12 `npm test` suites passed after approval. Before installation/publication, all 326 package files and both ZIP hashes matched the reviewed manifest. The installed package also passed the artifact reference scan; permitted Credits are retained.

Live delivery and API verification are recorded in `deployment-validation.json`. Browser smoke testing uses the explicit graphics-test URL so it cannot create production statistics. No synthetic events or scores are submitted to the production API.

Rollback: restore the previous website wrapper/build metadata or select its earlier immutable release. Restore the retained Windows package if needed. Keep both old and new Windows profiles; do not delete progress written after the upgrade.

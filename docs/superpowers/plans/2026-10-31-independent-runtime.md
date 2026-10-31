# Independent runtime implementation plan

> Execute with the relevant implementation and independent review skills. Do not publish.

Goal: remove the former platform dependencies while preserving game data, web services and native behavior.
Spec: ../specs/2026-10-31-independent-runtime-design.md

## Constraints and review focus

Keep existing storage keys, Cloudflare service contracts and statistics/report behavior. Credits retain the attribution. Web/desktop data survives reload and native origin migration; testing never sends production events. No live deployment or installed-package replacement. Review migration identity, once-only import, native Exit, SDK removal and environment gating.

## Task 1: Native runtime and package
- [ ] Inspect old native origin/profile behavior and record compatibility facts without exposing save contents.
- [ ] Write failing native storage/bridge/packaging tests.
- [ ] Implement owned Electron runtime, generic legacy-profile import and fresh Windows candidate.
- [ ] Verify isolated Chromium persistence, upgrade import, fullscreen/Exit, native start and package contents.

## Task 2: Game services and web independence
- [ ] Write failing tests for SDK-free services, old-save retention and environment isolation.
- [ ] Replace platform adapter and SDK bootstrap, rename compatibility symbols, retain Cloudflare integration and all storage keys.
- [ ] Update current tools/docs/metadata and prepare web/demo/desktop game builds.
- [ ] Run regression suites and scan tracked files and deliverables; only Credits may retain the attribution.

## Task 3: Integration and delivery
- [ ] Build final web/Windows candidates from the same reviewed source.
- [ ] Independently review removal, data retention and release boundaries; fix findings and reverify.
- [ ] Commit locally, present changes/artifacts/tests and await approval to publish.

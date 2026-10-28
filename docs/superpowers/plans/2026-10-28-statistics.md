# Velvet Cruise statistics implementation plan

> Use superpowers:subagent-driven-development for implementation and independent review.

Goal: prepare anonymous load/start counters and a protected date-range report without publishing.
Architecture: existing Worker/D1, isolated statistics schema, memory-only client delivery.
Spec: ../specs/2026-10-28-statistics-design.md

Global constraints: preserve current saves, settings and online rankings; Europe/Berlin; no production writes or deployments before user approval; no player names/IDs/IP/cookies in statistics.

Review focus: duplicate concurrent delivery; midnight/DST; bounded offline retry; automation/desktop isolation; report authentication and secret exclusion.

## Task 1: Complete statistics implementation
- [x] Synchronize only the existing online adapter and server from a829312 without reverting newer game code. Baseline typecheck and existing online/local-services QA.
- [x] Write failing client/lifecycle and Worker/SQLite tests for the specification. Observe failure before implementing.
- [x] Implement strict ingest, atomic dedup/count migration, protected report and production-gated bounded background client.
- [x] Run tests, typecheck, standalone and desktop builds, dry-run Worker deployment. Add example report and deployment/rollback instructions.
- [x] Prepare changes for commit on isolated codex/velvet-statistics; report verification evidence and limitations.

## Task 2: Independent review and prepared delivery
- [ ] Review diff against user specification; fix important findings and verify.
- [ ] Prepare immutable web release and example report, show changes and test evidence. No publication.

# Velvet Cruise statistics

User specification: prepare a complete reviewable implementation and build; publish only after approval.

Reuse the existing velvet-cruise-api Worker and velvet-cruise D1 database. Add separate statistics tables without changing rankings tables. Synchronize the web-only online adapter from a829312 onto current 89571ad in an isolated branch; preserve tour2 and current save keys. Alternative standalone Worker adds unnecessary operations; external analytics adds unnecessary identifiers.

game_loaded fires once per document when the scene is ready. The existing run_start in startRace marks each newly created attempt, including post-Game-Over retries, never pause/resume/menu/route changes. Client sends only random per-event UUID, event type and timestamp. No user/profile/device ID, name, cookie or IP in statistics tables. Events remain in memory only, with bounded queue, timeout and at most three attempts. Production requires an explicit standalone build flag, exact HTTPS SabnockWorks host/path, no automation/test hooks or desktop bridge. Development and automated QA use local fixtures only.

Worker validates a strict small payload, permitted production origin, event UUID/type/time bounds. Deduplication and daily counting must be atomic under concurrent delivery. Day comes from event time in Europe/Berlin including DST. Retain dedup IDs long enough to reject every permitted retry; reject stale events before expiration can double-count.

Report: /stats/report protected by a separate Worker secret (Bearer), date inputs, inclusive daily rows and sums, JSON and HTML as appropriate. No secrets in public build, URLs or persistent browser storage. Accessible local example with clearly marked synthetic data. Production report remains unavailable until the secret and deployment are approved. No changes to production infrastructure in this task.

Verify event lifecycle, parallel and duplicate messages, validation, retries/timeouts, credentials, Berlin midnight/DST, production gating, rankings and local services. Prepare dry-run Worker bundle, migration and immutable web release directory. Record deployment and rollback instructions.

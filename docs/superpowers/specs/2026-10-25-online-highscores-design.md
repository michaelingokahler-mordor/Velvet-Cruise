# Cloudflare online rankings

Requested: shared website rankings through Cloudflare, following Emerald Hollows, while retaining all local scores and avoiding other agents' work.

Use a dedicated `velvet-cruise-api` Worker and `velvet-cruise` D1 database. Keep Emerald Hollows' service and data unchanged. Preserve the existing score/run boards, difficulties, and `tour2` ruleset identifiers. Retain the Tesana path for the original export and local-only behavior for desktop/demo editions.

The standalone website keeps writing personal bests locally first. A separate online adapter reads `online.json`, stores an anonymous per-browser profile, and queues the best new result per board until acknowledged. It uses the existing driver-name entry. Existing local tables, stage times, badges, preferences, and storage keys remain intact; historical local scores are not uploaded automatically.

The API provides health, profile creation/rename, ranked reads, and authenticated best-score submissions. Tokens are random and hashed in D1. Validate boards, finite integer scores, declared bounds, request sizes, names, origins, and quotas. Keep SQL parameterized. Equal/worse submissions cannot replace a best; run times sort ascending and points descending. Return controlled errors and no cached private responses.

Approach: adapt the existing lightweight SDK boundary rather than add accounts or replace the game menus. Worker plus D1 matches the requested infrastructure; re-enabling Tesana would retain the unwanted dependency. Full server replay verification is outside this change: these are community rankings with validation and spam protection, not cheat-proof competition.

Isolation: implement on `codex/online-highscores` in a dedicated worktree. Do not edit the shared checkout's active game work. Publish only the named game subtree and reviewed source changes. Test records must be removed by their exact test profile IDs after live verification.

Acceptance: two profiles see the same board; names and score order are correct; offline play and reconnect preserve results; existing local records and demo isolation remain intact; deployment health and published assets match the reviewed build.

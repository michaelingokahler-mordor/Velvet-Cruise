# Online rankings — 2026-10-25

The standalone web edition uses the dedicated Cloudflare Worker `velvet-cruise-api` and D1 database `velvet-cruise`. Emerald Hollows' service and database remain unchanged.

The API was deployed as Worker version `f4b0bae9-ee80-4523-9099-adce5cf71c1d`. `/health` returned HTTP 200 with the expected service identity; CORS returned `https://sabnockworks.com` for the website origin.

Validation completed:

- TypeScript checks for both the game and Worker.
- API tests against real SQLite: two players, board/ruleset separation, score/time ordering, atomic better-only writes, tokens, names, bounds, CORS, body limits, and quotas.
- Client integration: local saves, persisted retry queue, malformed acknowledgements, profile rename, concurrent submissions, multiple tabs using Web Locks, and recovery from rejected credentials.
- Existing local-services and Demo A checks, including all three difficulty runs and full/demo save separation.
- Standalone production build.
- Microsoft Edge browser tests against both local Workerd/D1 and the deployed Cloudflare API: two separate browser profiles shared results; an offline result survived and uploaded after reload; seeded arcade scores and stage times were preserved; the real game rendered the shared rankings without JavaScript exceptions.
- Production QA profiles `7eb427e5-cca8-4df3-89ad-0bb0609b2cc7` and `9ec06231-5609-4d98-b64a-1a6207da3d6d`, and their scores, were deleted by exact ID after the live test. The verification query returned zero remaining QA profiles.

The website previously ran `466be89`, whose local tables use `sunset-coast-run.arcade` and `sunset-coast-run.stage-bests`. The newer development baseline uses separate `tour2` keys. The web delivery therefore uses `tools/build-web-preserving-baseline.mjs`: the previous web game, assets, driving rules, and local keys plus the new online adapter. It records both source revisions. This avoids introducing the unrelated driving-rule change or hiding existing local tables during the highscore update. The baseline-specific live browser test also passed and read the seeded legacy arcade table through the game's real `arcadeTable()` function.

The final website publication is SabnockWorks commit `40d47d39a23ce08533d55d4d81fa561783f7c818`; GitHub Pages reported `built`. Its metadata identifies online source `80bda527a2e4c4882310b8529b6f5aaf40b88991`, web baseline `466be89`, and entry `index-DSOhqHke.js`. Published JavaScript, online configuration, and both checked artwork files match the delivered bytes. Strings match after CRLF/LF normalization. The actual website passed a further Edge check: Worker health/CORS, public ranking read, legacy local arcade table display, no Tesana SDK requests, and no JavaScript exceptions. Screenshots and machine-readable results are in the worktree's ignored `output/online-tests/` directory.

The baseline test's production profiles `866113d5-afd1-4fa8-890a-ed9c304bfc50` and `dc4415d4-8574-4207-95f1-832caf79248e` and their scores were also removed by exact ID; verification returned zero remaining QA profiles. The public normal board is empty after cleanup, ready for real players.

The independent review found two profile-recovery cases. Regression tests reproduced both before the fixes and passed afterward: simultaneous tabs now coordinate profile creation, and a rejected token no longer prevents anonymous public reads.

All local storage keys for arcade tables, stage times, personal bests, badges, preferences, and unlocks are unchanged. Only online-profile and pending-score keys are added. Existing local scores are not uploaded retrospectively. Desktop/demo builds remain local-only, while the original Tesana build retains its SDK path.

Known limits: these community rankings validate submitted values but do not independently replay driving inputs. They are not cheat-proof. Human driving feel, physical-phone behavior, and gamepad behavior were not tested by this change. The build retains its existing large-chunk warning. Node's test SQLite API reports an experimental-feature warning.

The implementation is isolated on `codex/online-highscores`, starting at source commit `4536338`. Other agents' active elevation/course-map changes in `D:\Velvet Cruise\Code` are not included or modified.

Deployment instructions and API/storage details are in [server/README.md](../server/README.md).

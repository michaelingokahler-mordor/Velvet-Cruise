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

The independent review found two profile-recovery cases. Regression tests reproduced both before the fixes and passed afterward: simultaneous tabs now coordinate profile creation, and a rejected token no longer prevents anonymous public reads.

All local storage keys for arcade tables, stage times, personal bests, badges, preferences, and unlocks are unchanged. Only online-profile and pending-score keys are added. Existing local scores are not uploaded retrospectively. Desktop/demo builds remain local-only, while the original Tesana build retains its SDK path.

Known limits: these community rankings validate submitted values but do not independently replay driving inputs. They are not cheat-proof. Human driving feel, physical-phone behavior, and gamepad behavior were not tested by this change. The build retains its existing large-chunk warning. Node's test SQLite API reports an experimental-feature warning.

The implementation is isolated on `codex/online-highscores`, starting at source commit `4536338`. Other agents' active elevation/course-map changes in `D:\Velvet Cruise\Code` are not included or modified.

Deployment instructions and API/storage details are in [server/README.md](../server/README.md).

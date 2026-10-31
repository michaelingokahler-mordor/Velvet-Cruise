# Independent game runtime

Implement the user's approved request: remove the former platform SDK, branding references and runtime dependencies except the explicit Credits attribution. Prepare web and Windows builds. Do not publish, push or replace the installed Windows package before approval.

The current baseline is 194950f. Existing local saves, difficulty boards, settings, cars, graphics unlocks, ranking credentials/queue and statistics must remain compatible. Keep all existing game storage keys, API paths, report secret and production D1 data unchanged.

Use a small game-owned services adapter for local translations, local records/badges and existing Cloudflare rankings. Remove SDK bootstrap and SDK branches completely. All builds use local-first services; only a normal approved self-hosted production page connects to production APIs. Statistics retain their existing three-attempt, deduplication and environment rules. No production test counts.

Use a game-owned Electron runtime with window.VelvetDesktop = {embedded:true, quit():Promise<unknown>} and a JSON script #velvet-runtime containing target:'desktop' and existing gameId. Define import.meta.env.VITE_DESKTOP_BUILD as 'true' only for --mode desktop. Web must not expose a native Exit without that native capability. Preserve native fullscreen and safe external links. New desktop origin and profile must be stable across launches and upgrades. Old storage must be copied, never erased or overwritten blindly. A generic legacy-origin importer may discover a previous profile by the existing gameId and saved-key prefix, without retaining the old vendor identifier or hiding it through encoded strings. Import only game-owned localStorage entries and record completion; never replace newer destination values. Back up/retain old data and test a real Chromium profile across relaunch.

Ship only owned runtime files, not the prior shell/SDK. Keep Chromium/Electron and third-party licenses. Remove old vendor references from current tracked code, tools, docs and generated release metadata except Credits. Git history and original installed/exported packages remain intact. Tests use neutral fixture names; anti-regression scanning can construct the prohibited token from the actual Credits text, not hard-code additional references.

Prepare outputs separately under output/independent-runtime/. Preserve the live site, Worker, D1 database and existing D:/Velvet Cruise/WinExe. Show test evidence, limitations and reviewable artifacts before requesting publication approval.

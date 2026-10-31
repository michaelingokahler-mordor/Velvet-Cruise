# Web demo ending E

The user requested a current Windows Full ZIP, a local/GitHub comparison, and a browser demo limited to ending E.

The browser demo uses the five coastal stages `[0,1,2,3,4]` and ends at Twilight Bay (E). Route selection, map navigation, development hashes and alternate starting paths must not expose another route. Keep the existing road geometry and checkpoint clocks for this coastal route. All three difficulties remain available. Demo records remain local and separate from Full and the previous route-A demo. Online ranking uploads and Plus graphics remain disabled in the demo.

Use a compile-time `DEMO` flag and a new `demo-e` identity. Keep normal Full game IDs, storage keys, routes, online rankings and installed Windows files unchanged. `npm run build:demo` produces browser files, not a downloadable demo executable.

Alternatives: retain route A (does not match the user's request), choose routes through URL parameters (allows unintended routes), or fix route E at build time. The user selected route E. The implementation uses the fixed route with a separate save prefix.

Build a fresh Windows Full package from source commit `1c19906`, using the installed unmodified Electron binaries and the current owned runtime. Run native offline/restart/upload/local-ranking acceptance with disposable profiles and a loopback service. Archive the tested package without player data or installation logs.

Compare remote refs after fetching and after the final push. Report the current branch and any difference from `main`. Preserve the two unrelated untracked age-rating documents. Building the demo does not publish it or replace the live Web Full.

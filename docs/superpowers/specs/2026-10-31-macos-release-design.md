# macOS release

Build the user's requested full Mac game with the same shared ranking service, persistent anonymous driver identity, automatic offline upload queue and separate local arcade tables as the approved Windows edition. Retain the current game ID, rules, assets, save keys and custom origin. No server migration or service change is needed.

Create separate native arm64 and x64 applications using a pinned supported Electron runtime. Use standard macOS GitHub Actions runners in the existing public repository for native acceptance. No paid runner or Apple enrollment is authorized. The user asked whether execution without a paid certificate is possible; prepare an ad-hoc signed, non-notarized build with accurate Gatekeeper instructions. Do not claim Apple verification or friction-free downloaded-app acceptance.

Use the game-owned runtime and official Electron binaries. Do not reuse the obsolete demo shell. The Mac bundle has its own stable reverse-domain identifier, game icon and standard Quit/fullscreen menu. macOS data lives under Application Support/Velvet Cruise/profiles/<gameId>. Add safe, read-only legacy-profile snapshots for macOS; retain original files and retry if the source is active or changes during copying.

Native tests use disposable profiles and a loopback API/database. They verify initial offline play, retained local tables, queued records over app restart, successful automatic upload, shared web reads, public driver tags, real CORS, normal rendering and persisted settings. Never create synthetic production results or statistics. Re-extract the delivered ZIP on a Mac and verify signatures, permissions and startup. Preserve the installed Windows version and existing live service.

Approach: keep one cross-platform game/runtime and a dedicated Mac packager. A separate native game rewrite is unnecessary. Separate Intel/Apple Silicon downloads are easier to test than an initially unverified universal merge.

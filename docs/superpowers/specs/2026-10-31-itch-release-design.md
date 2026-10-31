# Velvet Cruise 1.0.0 for itch.io

The user authorized Windows and both Mac Full editions at version 1.0.0,
with repeatable uploads and updates through Butler. Use package.json as the
single version source. Apply it to the runtime package, Windows executable
version resources, Mac bundle versions, game build metadata and release archives.
Keep the stable game ID, origin, bundle ID and external profile paths.

Ship an explicit top-level .itch.toml launch action in each build. Mac archives
are built and ad-hoc signed on the existing native Mac runners; never rewrite
their app bundles or symlinks on Windows. Preserve Electron/Chromium notices.
No paid signing, store publication or production ranking writes are needed.

Use stable channels windows-x64, macos-arm64 and macos-x64. Collect the three
versioned ZIPs into one release directory with SHA-256 hashes and a manifest.
The upload helper validates the entire release before the first upload and
prints its commands by default; --push explicitly enables uploads. Uploads
always use the release manifest's version and the same channels.

The user has only sabnockworks.itch.io/velvet-cruise-demo. Prepare a separate
Full project target sabnockworks/velvet-cruise, clearly marked as not yet created.
Authentication and a real store update test depend on that project/account.
Prepare files, validation and documentation without claiming a published store.

Approach: extend the existing packagers and native checks, and add a small
release collector/upload helper. A custom updater and itch API integration
are unnecessary. An automated publishing workflow would add credentials and
publication side effects; keep uploading an explicit local command.

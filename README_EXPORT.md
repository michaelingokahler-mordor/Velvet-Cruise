# Velvet Cruise

The game uses TypeScript, Phaser and its own pixel renderer. All editions load their scripts, artwork and audio from their package.

## Development and web builds

Run npm ci, npm run dev, npm run check, npm test and npm run build:web as required. The web build writes dist/. Serve this folder with a static web server. Keep the full asset directory with the JavaScript entry.

All editions save records, badges, settings and unlocks locally. The existing full and demo storage keys remain unchanged. Clearing browser storage removes local records.

The normal self-hosted production page and full Windows edition can use the existing Cloudflare ranking service. They save local results and pending bests before networking. Pending results retry on startup, connectivity/focus return and a 15-second retry while work remains. Local arcade tables remain separate. Demo editions stay local. Development and automated runs cannot contact the production ranking endpoint.

Online entries show a saved driver name and a unique public driver tag. Profiles need no email/password registration. Clearing the application profile loses its anonymous credentials. See reports/windows-online-rankings-2026-10-31/README.md for validation and activation status.

## Statistics

Only an explicitly enabled standalone production build counts loads and starts. Set VELVET_PRODUCTION_STATISTICS=1 when building the approved web release. Development, debug runs, automated browsers, demo and desktop builds do not send production counters.

The private report and its access key are independent of the game package. Never copy the report secret into source or public assets.

## Windows builds

Build the game with --mode desktop, then run the desktop assembler and native packager. The owned runtime source lives in desktop/. Its bridge exposes native Exit and fullscreen behavior. It does not load a third-party game service or SDK.

The runtime has a stable game origin and a game-specific profile. Its upgrade importer copies existing game data from a discovered previous profile without replacing newer destination values. It retains the original profile. Test imports with isolated profiles before distributing an upgrade.

Use fresh output folders. Do not overwrite an installed package or publish a candidate without approval. See docs/superpowers/specs/2026-10-31-independent-runtime-design.md and the matching verification report for the current candidate.

## Credits

The in-game Credits attribution remains part of the game.

# game-20261009-93986676

Exported from Tesana on 2026-10-22 (game id `game-20261009-93986676`).

This is a complete, standalone TypeScript web game — plain Three.js /
Phaser / Rapier code, with `package.json`, `vite.config.ts` and `tsconfig.json`
in this zip pinned to the same library versions the game was built with.

It is also wired to Tesana's play service so your saves and shop keep working.

## What's inside

- `index.html` — the page that boots the game.
- `src/` — the game's TypeScript source (`src/main.ts` is the entry).
- `assets/` — every model, texture, sprite, sound and font the game uses.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

The build output is plain HTML/JS/assets — drop the `dist/` folder on any
static host (itch.io, GitHub Pages, Cloudflare Pages, S3). If the game
loads Draco-compressed models it expects the decoder files under
`public/decoders/` (copied by `npm run build` via the Vite config).

## Tesana services

This export is wired to Tesana's play service, so the game's cloud saves,
leaderboards, achievements and shop keep working when you run it yourself.
`index.html` loads the play SDK and sets `window.__TESANA__` to this game's id
(`game-20261009-93986676`); the game code is unchanged and already awaits the SDK.

- Saves follow whoever is signed in on that device; with nobody signed in the
  game gets a guest identity and still plays.
- Nothing here is secret. The SDK mints its own per-player credential at
  runtime, so there is no key to rotate or leak.
- The SDK is loaded from a pinned URL, so a fix we publish does not silently
  change this copy. Nothing breaks if you are offline — every call resolves.

Offline is a supported state, not an error: with no network the game plays.

## Self-hosted web edition

Run `npm ci`, then `npm run build:web`. Serve `dist/` from a static web server.
This build uses relative asset paths and includes all game assets.
It does not load the Tesana SDK or contact player services.
Personal bests, arcade scores, preferences, and badges stay in browser storage.
Clearing site data removes these local records. Shared online rankings are unavailable.

Run `npm run check` and `npm run qa:local-services` before exporting this edition.
The regular `npm run build` command keeps the Tesana export behavior.

The Sabnock Works website stores this edition at
`games/more-projects/velvet-cruise/`. Its `tools/update-velvet-cruise.mjs` script
builds and copies this checkout. See the website README for the full procedure.

To capture current website images, install Playwright in your tooling environment
and make it available to Node. Start the website's local HTTP server, then run:

```bash
node tools/art/capture-web.cjs http://127.0.0.1:8080/games/more-projects/velvet-cruise/ ../sabnockworks/assets/media
```

The script uses `/usr/bin/chromium`, or the executable at `CHROMIUM_PATH`.
It captures the title, garage, course map, and all fifteen stages at 1280 × 720.
It checks stage identities, asset responses, and JavaScript errors.
Capture records are saved under `output/website-capture/`.

## Not included

- Tesana's session history, snapshots, internal metadata, and the
  Studio-only loading/watermark shell that Tesana injects at publish time.

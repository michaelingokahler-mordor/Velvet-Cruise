# Garage vehicles and weather roofs

Six native 88×48-pixel vehicles now share a fixed body across their open, closing and closed roof poses. The four original open cars remain byte-for-byte unchanged. Silver Comet and Azure Coast are native redraws based on the approved Runway designs; the large concept PNGs are not used at runtime.

| Car | Unlock | Roof |
| --- | --- | --- |
| Rosso Spider | Starter | Anthracite |
| Giallo Toro | Goal A | Black |
| Blue Stallion | Goal B | Ivory |
| Emerald Speedster | Goal C | Sand beige |
| Silver Comet | Goal D | Charcoal |
| Azure Coast | Goal E | Ivory |

Each model has three steering views and two occupant frames for each of four roof positions, plus brake overlays and empty-car frames. There are 144 occupied frames, 72 brake overlays, 24 empty-car frames and 18 explicit roof masks. All game frames use binary alpha and the same bottom-centre anchor.

Rain and snow close the roof over 0.65 seconds. Weather blending uses separate closing/opening thresholds to prevent flicker. Tunnels do not reopen the roof. Occupants remain inside during closed-roof rollovers; the original open-roof comic ejection remains. The finale opens the roof before occupants exit.

Saved car IDs, goals, difficulty settings and score/leaderboard keys retain their identities. Confirmed account goal badges are cached in the existing goal-progress key so an unlocked selection also works after an offline reload. Existing goals count immediately on any difficulty.

## Rebuild and verify

```powershell
python tools/art/vehicles/make_garage_cars.py
python tools/pack_assets.py --sprites-only
python tools/qa/check-garage-sprites.py
node tools/qa/check-garage-weather.mjs
node tools/qa/garage-weather-gallery.mjs
npm run check
npm run build:web -- --outDir output/garage-weather/site
```

The art generator consumes the original four open sprite sets. When rebuilding all original vehicle art from scratch, run the original vehicle, hero-car and tumble generators first.

`--sprites-only` updates the packed atlas without copying unrelated backgrounds or the course map. Browser verification uses `tools/qa/garage-weather-browser.cjs`, a running standalone preview URL, and the host's installed Playwright/Chromium. `CHROMIUM_PATH` overrides the browser executable.

Evidence lives in `output/garage-weather/`: runtime-validation.json, render-validation.json, in-game-gallery.png, and browser/validation.json with real per-simulation-step roof histories and screenshots for all six cars. Pixel comparison covers steering, occupant frames, all roof states, braking and night lights; it requires zero changed pixels outside the roof mask. Browser tests use separate temporary profiles and do not touch the user's saves.

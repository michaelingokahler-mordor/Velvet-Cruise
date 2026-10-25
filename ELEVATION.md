# Road elevation and Course Map times

25 October 2026

The full game now has authored elevation profiles on five stages:

| Stage | Road character |
| --- | --- |
| Vineyard Valley | Four broad hills, separated by valleys |
| Cypress Point | The same rolling rhythm at a gentler height |
| Redwood Pass | Ascent, a flat central pass, then descent |
| Snowcap Pass | A larger ascent and descent around a flat central pass |
| Starlight Summit | About 75% uphill; a raised final plateau continues past the finish |

The profiles change the existing segments' heights before scenery is placed. They do not consume random numbers. Segment counts, curves, tunnels, active obstacles, checkpoints and time bonuses stay the same. Checkpoint platforms remain flat. Route changes rebuild the same elevations.

The Course Map shows road character, time of day and weather separately. Gold Rush Town shows Sunset and Heat haze; Crystal Lake shows Dusk and Clear skies; Twilight Bay shows Night and Clear skies. Clear dark stages use a moon icon. The fork panel uses the same icon rule. Painted ground and decorations on these three map tiles now use evening light as well.

Time data is in `assets/ui/stage-times.json`; both runtime captions and the map art generator read it. Profile data is in `src/game/elevation.ts`.

## Compatibility and verification

Existing save keys, badges, names and records are retained. The original elevation-only iteration kept acceleration and braking unchanged. The subsequent grade/horn iteration now couples speed and longitudinal force to the existing elevation on every stage; see `STEIGUNG_UND_HUPE.md`. The tour2 save and record keys remain in place, so old records are retained but reflect earlier physics. Route A Demo contains none of the five newly authored profiles and remains isolated from full-game saves; its existing gradients also affect driving speed when rebuilt from the new source.

The elevation-only checks passed: typecheck; 40 elevation/geometry cases across all 16 routes; 11 rendered-caption and post-run integration cases; all 48 route drives on Easy, Normal and Hard; handling, signal, local-service and demo checks. The blinking Continue prompt sits above the enlarged caption. Active obstacles are identical on all 16 routes. That iteration retained its previous route times. With grade physics, route times change; current verification is recorded in `STEIGUNG_UND_HUPE.md`.

Ten real-renderer road comparisons and four Course Map comparisons were inspected in `output/elevation/gallery/`. These samples do not replace continuous human play-feel, hearing or physical-gamepad checks.

The website has not been updated. Elevation-only evidence is under `output/elevation/`; the following grade/horn build and its separate Windows package are documented in `STEIGUNG_UND_HUPE.md`.

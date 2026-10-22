# Stage look rules — "painted slopes" (Palm Cove is the model)

Goal: every stage reads as hand-finished 16-bit pixel art (Amiga feel). The scenery near the road is as
carefully built as the car and the houses: no schematic slopes, no pasted plates, no noise.
Gameplay (physics, collisions, route, timers, scores, unlocks, saves) is never touched by a look pass.

## The recipe for one stage (work in this order, check each step in a driving screenshot)

1. **Slopes** — give the theme a `terrain` style in `themes.ts` (see `TerrainStyle` in `terrain.ts`).
   Pick the stage's own low / mid / high tones, a meadow, a shade and a rock set, and the 0..1 amounts.
   Rules: broad irregular forms, calm areas allowed, no stripes, no rhythmic teeth, no random light pixels.
   The crest must be one smooth line (heights use `vnoise`, never a per-segment random).
   Both walls of a land-side stage need this (left `jit` and right `jitR` in `track.ts`).
2. **Scene config** (`terrain.scene`) — weighted names for trees, shrubs, roadside groves, rocks, grass tufts,
   and for villages the house modules. `zones` sets how often a stretch is open / grove / village / rocky.
   Groups with real gaps; never an even row of identical objects.
3. **Anchoring** — every building stands on a flat plot or a deck: a retaining wall / foundation that overlaps
   its base, ground vegetation covering the corners, a contact shadow. A sprite's bottom row is the ground contact.
4. **Sprites** — make new silhouettes, not only recolours: 4-6 building modules (with terrace built in), several
   rock modules, 3+ variants per tree/bush type. Same light (sun ahead-right), same pixel size, alpha 0/255,
   selective dark outline, palette from the stage. Scripts live in `tools/art/scenery/` (`make_cove.py`,
   `make_stage_variants.py`); run `python3 -B tools/pack_assets.py` afterwards. No third-party art.
5. **Depth** — near = more contrast and detail; far = calmer and tinted towards the haze colour (`far_sN`).
   Sky bands wander left to right (`make_cove_backdrops.py`, `wave=` in `gradient_sky`): no ruled stripes,
   dither only one row wide, stars in loose groups.
6. **Surroundings** — sea: flat wave bands and a few directional glints (`glints()` in `render.ts`); guardrail feet
   cast a shadow; verge vegetation varies. Night stages: lamps/fires/windows (`*_lit`) leave a soft light pool on
   the ground (`lightPool()`); emissive colours stay at or under luma 200.
7. **Pixels** — one logical pixel grid, nearest-neighbour only, scenery under 0.6 scale uses the half-size mip.
   No blurred shapes, no mixed sprite resolutions.

## Rendering and placement rules already in the engine (do not re-invent)

- `slope()` paints ribbons between height fractions; the far edge overlaps by `SEAM` so no 1-px holes open.
- Detail forms are skipped when a slope is under ~5 px tall.
- `sprite()` adds the contact shadow for names matching `SHADOWED`, the boardwalk deck for `DECKED`, the light
  pool for `*_lit` after dark, and picks the mip level.
- `groups: true` on a theme (Surfside) gathers buildings and palms in clusters with free stretches (placement only).
- Solid props keep their `PROP_INFO` hit boxes and `clearance()`; new sprites need an entry there.
- Test hooks (URL hash): `#autopilot&stage=N&at=M&path=0,1,2,3,14` (N = column 1..5), `#oldslopes` for an A/B check.

## Lessons from the second Palm Cove pass (apply everywhere)

- **No floating buildings.** A house only stands on a level terrace cut into the slope (`plotSpan()` in `terrain.ts`):
  a cut bank behind, paving, a low retaining wall in front whose foot follows the slope. The terrace keeps one world
  height along its length. Never place anything behind the crest; with only sky behind the ridge, it floats.
- **Gentle hills hold terraces.** A stage with villages uses a gentler lean (`terrain.lean`, Palm Cove 0.9).
- **Grain without noise.** Close slopes get short brush-stroke dabs (one per road segment, gathered in drifts), a
  half-tone between the tone bands, dry-grass / olive patches, hedges and footpaths. Rock faces break into facets.
- **Start line.** The hill rises smoothly out of the start straight, so there is never a gap to look behind.

## Check list before calling a stage done

- Driving screenshots at normal speed: no stripes, specks, floating objects, plates; contour stable between frames.
- Painter time stays within budget (`window.__render_ms` with `#autopilot`; Palm Cove: about 2.3 ms).
- Build with `qa_gates.failures == []`; a full autopilot run still finishes every stage.

## Status

| Stage | Look |
|---|---|
| Palm Cove | done (model, second pass: terraces, grain, facets, start) |
| Coral Bluffs | slopes + rock variants done |
| Surfside | grouped buildings, decks done; keeps its sunset |
| Cypress Point | tree groups + rock variants done |
| Starlight Summit | slopes, firs, calm sky, light pools done; keeps its cool night palette |
| Twilight Bay, Thunder Highway, Vineyard Valley, Redwood Pass, Painted Desert, Death Valley, Neon City, Snowcap Pass, Gold Rush Town, Crystal Lake | next, one at a time, same recipe |

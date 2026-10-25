# Plus art sources

The approved Palm Cove concept and Lotus references define the style. The game
keeps its own vehicles, buildings and scenery. No reference-game graphics are
included.

## Generate the pilot

```powershell
python tools/art/plus/native_art.py
python tools/pack_plus_assets.py
node tools/qa/check-plus-assets.mjs --pilot
node tools/qa/plus-palm-cove.mjs --video
```

`inventory.json` records all 697 Classic atlas frames and their logical motifs
and states. `catalog.json` identifies the authored Plus sources. The pilot has
150 native sprites and two native backgrounds. Other assets are explicit
development replacements. `complete` stays false; ordinary player profiles
cannot select the pilot.

Cars retain the established silhouette and material masks as structural
templates. Native lens grids, grille slats, trim, exhausts, tyre tread, hair and
roof seams use the 176×96 source grid. Independent protection rectangles keep
the same body across all roof phases. The generator draws the eight palm
variants, the native sky and the three landscape layers. Building tile seams,
stone courses, foliage clusters and rock facets use the native grid. Material
ramps remain small; no blur or photographic shading is applied.

The packer writes only `assets/plus/`. Atlas pages are at most 2048×2048.
Each frame specifies density 2 and a bottom-centre anchor. The loader decodes
pages sequentially and validates every required logical name before switching.
The source images use alpha 0/255; internal emission markers belong to runtime
decoding.

## Review evidence

`output/plus/palm-cove/` contains six identical-position Classic/Plus pairs,
three five-second full-speed clips per profile, and sampled motion frames.
The Classic clips use nearest-neighbour scaling to the same 640×360 display.
The frames use the real renderer and simulation; they are not concept images.
`output/plus/browser/` contains real-browser native output with HUD and finale.
The pilot finale still uses its declared Classic replacement art.

Checks cover native detail, binary alpha, dimensions, anchors, roof body
protection, complete inventory, native browser output and isolated test rewards.
The visual pass inspected all six static positions and motion samples for
anchors, disappearance, clipping and mip transitions. Continuous human motion
review and physical iPhone review remain required for release.

`qa:palm-cove` now compares against the committed pre-Plus state `a5f9377`.
Its portable fixture covers all 16 route graphs, road/scenery/collision data,
clocks and a complete coast run. The older landscape-migration checker remains
available as `qa:palm-cove:legacy`; its ignored fixtures predate the current
fork and stage lengths and cannot validate Plus changes.

The Node render measurements are short technical samples. They do not measure
browser presentation, sustained performance or iPhone behaviour.

## Complete artwork package

```powershell
python tools/art/plus/native_art.py --all
python tools/pack_plus_assets.py --release
node tools/qa/check-plus-assets.mjs --release
node tools/qa/plus-stage-audit.mjs
python tools/qa/plus-contact-sheet.py
```

The complete package contains 679 native sprites and 36 backgrounds, across
four atlas pages. The 18 deliberate Classic replacements are small `icon_`
and `wx_` graphics. Native detail, dimensions, binary sprite alpha and shared
occupied/empty car bodies are checked for all six vehicles and eight roof
positions. Braking lenses have native prism rows. All 15 themes retain their
own original composition and material palette, with finer foliage, masonry,
rock seams, stars and finale paving. The runtime still draws roads, tunnels,
guardrails and lighting procedurally. The scale-zero `portal` objects mark
tunnel collisions and do not refer to texture files.

`output/plus/stages/` contains 132 paired views, including tunnel and fork
approaches, plus a stage overview and the six-car/eight-roof source sheet.
`output/plus/weather-browser/coverage.json` combines six complete wet/dry roof
tours with the corrected finale run: six closed-roof tumbles and all five
goals for each car. Screenshots include the roof opening before occupants exit.

`qa:depth` uses the portable pre-Plus physical/scenery contract and the existing
absolute closed-ground, building-footprint, light and signal checks. The older
relative landscape-population comparison remains `qa:depth:legacy`; its
fixtures refer to the previous stage and fork lengths. This distinction does
not permit changed collision data or scenery placement in Plus.

`complete: true` confirms artwork coverage. Sustained performance, physical
iPhone controls and device review remain separate release checks.

# Velvet Cruise — pixel art style guide (shared by all art generators)

Game: an Outrun-style pseudo-3D arcade racer down a Pacific coast highway at
golden hour. Everything is rendered into a **320x180** framebuffer and upscaled
with nearest-neighbour, so every sprite pixel is a visible chunky pixel.

Look target:
- `/var/games/game-20261009-93986676/.dream-loop/reference-1.png` — the game's
  own key art (sunset coastal highway, 16-bit pixel art). Match its palette
  warmth, its chunky clean clusters, its shading.
- `reference-2.png`, `reference-3.png`, `reference-4.png` — screenshots of the
  1986 arcade original. Use ONLY for proportions/readability. Never copy them.

## Rules

- Hand-crafted-looking 16-bit arcade pixel art (Sega System 16 / Outrun /
  Super Hang-On era). Clean pixel clusters, deliberate shapes, no noise
  speckle, no gradients that look like blurred digital painting.
- Alpha is 0 or 255 only. No semi-transparent pixels, no anti-aliasing
  against transparency.
- Limited palette per sprite (about 8–24 colours). 3–5 step shade ramps per
  material with hue shifting: shadows cooler (toward purple/blue), highlights
  warmer (toward yellow).
- Selective dark outline on the silhouette, using a very dark tinted colour
  (e.g. `#2a1a2e`, or the darkest shade of the material) — never pure black
  everywhere.
- Lighting: warm sun ahead of the viewer, slightly to the right and high.
  Top surfaces and right-facing edges catch warm highlights.
- Viewpoint: seen from behind and slightly above (camera ~4 m up, behind the
  player's car), so you see the back of objects and a sliver of their tops.
- Draw in neutral warm daylight. The engine tints sprites per stage
  (afternoon → sunset → dusk), so do not bake heavy orange/purple lighting in.
- Transparent background. Anchor = bottom-centre: the bottom row of the PNG is
  the ground-contact line (no empty rows below the object), and the object is
  horizontally centred on its base.
- Silhouettes must stay readable when the engine shrinks the sprite to a
  quarter of its size — bold shapes, strong value contrast.
- **No text, letters, numbers or logos anywhere** (the game is translated at
  runtime; text is drawn by the engine). No real brands (no Ferrari horse, no
  company names).

## Tooling

Python 3 with Pillow + numpy (no network, no pip installs). Write a
generator script so the art can be regenerated and tweaked later. Check your
work by rendering preview sheets at 4x nearest-neighbour zoom and viewing them
with the Read tool (it displays PNGs). Iterate until it genuinely looks good.

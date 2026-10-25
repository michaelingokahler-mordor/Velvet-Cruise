#!/usr/bin/env python3
"""Pack the generated pixel art into the game's assets.

- tools/art/{vehicles,scenery,ending}/out/*.png -> assets/sprites/atlas.png + atlas.json
- tools/art/ending/out/ending_bg.png -> assets/bg/ending.png (+ ending_bg_a..d.png -> ending_a..d.png)
- tools/art/backdrops/out/{sky,far}_s*.png -> assets/bg/   (s1..s11: one per stage)
- tools/art/map/out/course_map.{png,json} -> assets/bg/
Run after any of the art generators.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIRS = [ROOT / "tools/art/vehicles/out", ROOT / "tools/art/scenery/out", ROOT / "tools/art/ending/out"]
ENDING_BG = ROOT / "tools/art/ending/out/ending_bg.png"  # full-screen picture, copied to assets/bg (not packed)
OUT = ROOT / "assets/sprites"
BG_SRC = ROOT / "tools/art/backdrops/out"
BG_OUT = ROOT / "assets/bg"
MAP_SRC = ROOT / "tools/art/map/out"
ATLAS_W = 1024
PAD = 1


def main() -> None:
    items = []
    for d in SRC_DIRS:
        for p in sorted(d.glob("*.png")):
            if p == ENDING_BG or p.stem.startswith("ending_bg"):   # full-screen pictures are not sprites
                continue
            im = Image.open(p).convert("RGBA")
            # snap alpha to 0/255
            a = im.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
            im.putalpha(a)
            items.append((p.stem, im))
    # tallest first shelf packing
    items.sort(key=lambda t: (-t[1].height, -t[1].width))
    x = y = shelf_h = 0
    placed = {}
    for name, im in items:
        if x + im.width > ATLAS_W:
            x = 0
            y += shelf_h + PAD
            shelf_h = 0
        placed[name] = (x, y, im)
        x += im.width + PAD
        shelf_h = max(shelf_h, im.height)
    total_h = y + shelf_h
    h = 1
    while h < total_h:
        h *= 2
    atlas = Image.new("RGBA", (ATLAS_W, h), (0, 0, 0, 0))
    frames = {}
    for name, (px, py, im) in placed.items():
        atlas.paste(im, (px, py))
        f = {"x": px, "y": py, "w": im.width, "h": im.height}
        if name.endswith("_lit") or "_brake_" in name or name in ("lighthouse",):
            f["emissive"] = True
        frames[name] = f
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / "atlas.png", optimize=True)
    (OUT / "atlas.json").write_text(json.dumps({"frames": frames}, indent=0))
    print(f"atlas {ATLAS_W}x{h}, {len(frames)} sprites")

    if '--sprites-only' in sys.argv:
        return

    BG_OUT.mkdir(parents=True, exist_ok=True)
    for p in sorted(BG_SRC.glob("*.png")):
        if not re.fullmatch(r"(sky|far)_s\d+\.png", p.name):
            continue
        shutil.copy(p, BG_OUT / p.name)
        print("bg", p.name)
    for name in ("course_map.png", "course_map.json"):
        if (MAP_SRC / name).exists():
            shutil.copy(MAP_SRC / name, BG_OUT / name)
            print("bg", name)
    if ENDING_BG.exists():
        shutil.copy(ENDING_BG, BG_OUT / "ending.png")
        print("bg ending.png")
    for k in "abcd":                       # the finale scenes of goals A-D
        src = ENDING_BG.parent / f"ending_bg_{k}.png"
        if src.exists():
            shutil.copy(src, BG_OUT / f"ending_{k}.png")
            print(f"bg ending_{k}.png")


if __name__ == "__main__":
    main()

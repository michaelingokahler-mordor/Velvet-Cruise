#!/usr/bin/env python3
"""Provisional art for the four stages added with the Out Run triangle (nodes 11-14).

Until each stage gets its own painted backdrop, its sky and far layer are
recoloured copies of existing ones, and each gets a 16x16 destination icon in
the style of the others (dark outline, light from the upper right).

  node 11 Snowcap Pass       (own backdrops now)  icon_snow
  node 12 Gold Rush Town     sky_s13 / far_s13   icon_western
  node 13 Crystal Lake       (own backdrops now)  icon_lake
  node 14 Starlight Summit   sky_s15 / far_s15   icon_star

Writes into tools/art/backdrops/out and tools/art/scenery/out; then run
tools/pack_assets.py.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
BG = ROOT / "tools/art/backdrops/out"
SC = ROOT / "tools/art/scenery/out"


def C(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def load(name):
    return np.array(Image.open(BG / f"{name}.png").convert("RGBA"), float)


def save(a, name):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").save(BG / f"{name}.png")


def lum(a):
    return (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]) / 255.0


def ramp(a, cols, lo=None, hi=None):
    """map luminance onto a colour ramp (keeps alpha); hard steps like the pixel art"""
    L = lum(a)
    m = a[..., 3] > 0
    lo = np.percentile(L[m], 3) if lo is None else lo
    hi = np.percentile(L[m], 97) if hi is None else hi
    t = np.clip((L - lo) / max(1e-6, hi - lo), 0, 0.9999)
    idx = (t * len(cols)).astype(int)
    out = a.copy()
    pal = np.stack([C(c) for c in cols])
    out[..., :3] = pal[idx]
    return out


def tint(a, mul, add=(0, 0, 0)):
    out = a.copy()
    out[..., :3] = a[..., :3] * np.array(mul) + np.array(add)
    return out


def stars(a, seed, n=70, top=0.7):
    rng = np.random.default_rng(seed)
    h, w = a.shape[:2]
    for _ in range(n):
        x, y = rng.integers(0, w), rng.integers(0, int(h * top))
        a[y, x, :3] = (255, 250, 230) if rng.random() < 0.3 else (190, 190, 230)
    return a


def backdrops():
    # all four backdrop pairs are painted now: tools/art/backdrops/make_snow_lake_backdrops.py
    # (sky_s12/far_s12 Snowcap Pass, sky_s13/far_s13 Gold Rush Town, sky_s14/far_s14 Crystal Lake,
    # sky_s15/far_s15 Starlight Summit)
    pass


# ---------------------------------------------------------------- icons (16x16)
K = "#2a1a2e"
ICONS = {
    "icon_snow": ([
        "................",
        "................",
        ".......kk.......",
        "......kWWk......",
        ".....kWWWsk.....",
        "....kWWsWssk....",
        "....kbWbsbbk..k.",
        "...kbbbbbbbbkkWk",
        "..kbbbBbbbbbbWsk",
        "..kbbBBbbbbbbbbk",
        ".kbbBBbbbbbBbbbk",
        ".kbBBbbbbbBBbbbk",
        "kbBBbbbbbBBbbbbk",
        "kBBbbbbbBBbbbbbk",
        "kkkkkkkkkkkkkkkk",
        "................",
    ], {"k": K, "W": "#f8fbff", "s": "#c4d4ec", "b": "#7a8cb8", "B": "#56648e"}),
    "icon_western": ([
        "................",
        ".......kk.......",
        ".......kYk......",
        "......kYYk......",
        "kkkkkkYYYYkkkkkk",
        "kYYYYYYyYYYYYYyk",
        ".kYYYYyyyYYYYyk.",
        "..kkYYyOOyYYkk..",
        "...kYYyOOyYYk...",
        "...kYYYyyYYYk...",
        "..kYYYkkkkYYYk..",
        "..kYYk....kYYk..",
        ".kYyk......kyYk.",
        ".kyk........kyk.",
        ".kk..........kk.",
        "................",
    ], {"k": K, "Y": "#ffd84a", "y": "#d89a2a", "O": "#fff4b0"}),
    "icon_lake": ([
        "................",
        "...........k....",
        "..........kGk...",
        "..kk.....kGGgk..",
        ".kMMk....kGGGk..",
        ".kMmk...kGGGggk.",
        "..kk....kGGGGgk.",
        ".......kGGGGGggk",
        "........kkkTkkk.",
        ".kkkkkkkkkkTkkkk",
        "kLLLLwwLLLLLLwLk",
        "kLLwwLLLLwwLLLLk",
        "kDDLLDDDLLLDDLDk",
        ".kDDDDDDDDDDDDk.",
        "..kkkkkkkkkkkk..",
        "................",
    ], {"k": K, "G": "#3e8a5a", "g": "#245e44", "T": "#7a4a2e", "M": "#fff4c4", "m": "#e4cc84",
        "L": "#4ab8d8", "w": "#c8f0fa", "D": "#2a78b0"}),
    "icon_star": ([
        "..........k.....",
        ".........kYk....",
        "......kkkYYYkkk.",
        "......kYYYOYYYk.",
        ".......kYYYYYk..",
        "........kYkYk...",
        ".....kkkkk.kk...",
        "...kkGGGGsskk...",
        "..kGGGGGkssssk..",
        ".kGGGGGGkdssssk.",
        ".kGGGGGGkddssk..",
        ".kkkkkkkkkkkkkk.",
        ".kSSSSSSSSSSSSk.",
        ".kSssSSSSwSSssk.",
        ".kkkkkkkkkkkkkk.",
        "................",
    ], {"k": K, "Y": "#ffe070", "O": "#fffbe0", "G": "#c8cce0", "s": "#9ea4c4", "d": "#3a3e66",
        "S": "#6a6e94", "w": "#ffd860"}),
}


def icons():
    for name, (rows, leg) in ICONS.items():
        im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        for y, row in enumerate(rows):
            assert len(row) == 16, (name, y, len(row))
            for x, ch in enumerate(row):
                if ch != ".":
                    im.putpixel((x, y), tuple(int(v) for v in C(leg[ch])) + (255,))
        im.save(SC / f"{name}.png")


if __name__ == "__main__":
    backdrops()
    icons()
    print("ok")

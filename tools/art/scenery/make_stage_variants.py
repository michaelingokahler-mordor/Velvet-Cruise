#!/usr/bin/env python3
"""Velvet Cruise -- silhouette and rock variants for the other stages that follow the Palm Cove look rules.

Rather than painting every tree again, new silhouettes are made from the existing, approved sprites with
transforms that keep their pixel detail and pixel size: a band of rows cut out (a shorter tree), columns
dropped (a slimmer tree), a shear (a bent tree), clusters of several heights on one base.  The rocks are
the Palm Cove outcrops re-coloured with each stage's own stone and turf.

  CYPRESS POINT   cyp_c (three columns)  cyp_d (wind-bent Monterey cypress)  cyp_e (young cypress)
                  stone_pine (umbrella pine on a long trunk)
                  point_rock_a..d  (pink-grey granite)
  CORAL BLUFFS    bluff_rock_a..d  (layered sandstone, rust and cream)
  STARLIGHT SUMMIT night_pine_b (slim)  night_pine_c (short, broad)  night_pine_d (twins)  night_pine_e (wind-bent)
                  summit_rock_a..d (cold slate)

Needs out/cove_rock_*.png (make_cove.py), pine / cypress / night_pine sprites in ./out.
Run:  python3 -B make_stage_variants.py     (then tools/pack_assets.py)
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_scenery as ms  # noqa: E402
from make_scenery import Spr, ramp, hx, foliage, selout, remove_orphans, bottom_fix, add_layer, CYP, BARK  # noqa: E402
import make_cove as mc  # noqa: E402

OUT = ms.OUT


def load(name):
    im = np.array(Image.open(os.path.join(OUT, name + ".png")).convert("RGBA"))
    s = Spr(im.shape[1], im.shape[0])
    s.a = im.copy()
    return s


def trim(s):
    op = s.a[..., 3] > 0
    ys, xs = np.nonzero(op)
    out = Spr(xs.max() - xs.min() + 1, ys.max() - ys.min() + 1)
    out.a = s.a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    return out


def cut_band(s, y0, y1):
    """Remove rows y0..y1 (a band of tiers): a shorter tree with the same detail."""
    out = Spr(s.w, s.h - (y1 - y0 + 1))
    out.a = np.concatenate([s.a[:y0], s.a[y1 + 1:]], axis=0)
    return out


def drop_cols(s, every, phase=1):
    keep = [x for x in range(s.w) if (x % every) != phase]
    out = Spr(len(keep), s.h)
    out.a = s.a[:, keep].copy()
    return out


def shear(s, k, extra=24):
    """Bend: row y moves right by k * (distance from the bottom)."""
    out = Spr(s.w + extra, s.h)
    for y in range(s.h):
        dx = int(round(k * (s.h - 1 - y) ** 1.25 / max(1.0, s.h ** 0.25)))
        for x in range(s.w):
            if s.a[y, x, 3]:
                nx = x + dx
                if 0 <= nx < out.w:
                    out.a[y, nx] = s.a[y, x]
    return trim(out)


def mirror(s):
    out = Spr(s.w, s.h)
    out.a = s.a[:, ::-1].copy()
    return out


def stack(canvas_w, canvas_h, parts):
    """Paste (sprite, x_centre_offset) bottom-aligned, back-to-front."""
    s = Spr(canvas_w, canvas_h)
    for spr, cx in parts:
        x0 = int(cx - spr.w // 2)
        for y in range(spr.h):
            for x in range(spr.w):
                if spr.a[y, x, 3]:
                    X, Y = x0 + x, canvas_h - spr.h + y
                    if 0 <= X < canvas_w and 0 <= Y < canvas_h:
                        s.a[Y, X] = spr.a[y, x]
    return s


# ---------------------------------------------------------------- Cypress Point
def cyp_c():
    t = load("cypress_tall")
    a, b, c = t, cut_band(t, 40, 57), cut_band(t, 30, 66)
    s = stack(64, a.h, [(c, 52), (b, 14), (a, 30)])
    return trim(s)


def cyp_d():
    c = load("cypress")
    s = shear(c, 0.07)
    return s


def cyp_e():
    c = load("cypress")
    small = cut_band(c, 18, 40)                       # fewer canopy layers
    small = drop_cols(small, 4, 2)
    return trim(small)


def stone_pine():
    s = Spr(84, 108)
    # a long, leaning trunk, then a broad flat-bottomed dome of needles
    for y in range(107, 38, -1):
        t = (107 - y) / 69.0
        cx = 40 + 7 * math.sin(t * 1.6) * (t ** 0.8) - 3 * t
        w = 5.6 - 2.4 * t + (2.2 * max(0, 1 - (107 - y) / 6.0))
        for x in range(int(cx - w / 2), int(cx + w / 2) + 1):
            u = (x - (cx - w / 2)) / max(1.0, w)
            s.puti(x, y, BARK[1 if u < 0.2 else 2 if u < 0.55 else 3 if u < 0.85 else 4])
        if (y % 5) == 0:
            s.puti(int(cx - w / 2), y, BARK[0])
    for (x0, y0, x1, y1) in ((44, 50, 66, 40), (38, 56, 20, 46)):
        for k in range(14):
            t = k / 13.0
            s.puti(int(x0 + (x1 - x0) * t), int(y0 + (y1 - y0) * t), BARK[2])
            s.puti(int(x0 + (x1 - x0) * t) + 1, int(y0 + (y1 - y0) * t), BARK[3])
    lay = Spr(84, 108)
    foliage(lay, [(42, 30, 30, 11), (22, 36, 17, 8), (63, 35, 18, 8), (34, 22, 19, 9), (54, 22, 20, 9), (42, 14, 14, 7)],
            CYP, seed=77, bias=-0.05, dabs=True)
    add_layer(s, lay)
    selout(s, [CYP, BARK], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return trim(s)


# ---------------------------------------------------------------- Starlight Summit
def night_pine_b():
    p = load("night_pine")
    return trim(drop_cols(p, 3, 1))


def night_pine_c():
    p = load("night_pine")
    return trim(cut_band(p, 38, 82))


def night_pine_d():
    p = load("night_pine")
    a = trim(drop_cols(p, 3, 2))
    b = trim(cut_band(p, 30, 70))
    return trim(stack(84, a.h, [(b, 56), (a, 26)]))


def night_pine_e():
    p = trim(drop_cols(load("night_pine"), 4, 3))
    return shear(p, 0.06)


# ---------------------------------------------------------------- re-coloured rocks
def recolour(src, ramps_from, ramps_to):
    s = load(src)
    for rf, rt in zip(ramps_from, ramps_to):
        for i, c in enumerate(rf):
            m = (s.a[..., 3] > 0) & np.all(s.a[..., :3] == np.array(c, np.uint8), axis=-1)
            s.a[m, :3] = rt[min(i, len(rt) - 1)]
    return s


BLUFF_ROCK = ramp("#3a1c22", "#6e3a2e", "#a05e3a", "#c88450", "#e0a86c", "#f2cc94", "#fdebc0")
POINT_ROCK = ramp("#2a2230", "#4a3c48", "#6e5c66", "#948086", "#b8a2a2", "#d8c6c0", "#f0e4de")
SUMMIT_ROCK = ramp("#10162a", "#1e2742", "#324064", "#4c5c88", "#6e80ac", "#98a8cc", "#c8d4ee")
TURF = {
    "bluff": ramp("#5a6a30", "#6e8238", "#869a40", "#a4b450", "#c6cc6c"),
    "point": ramp("#1e3a2a", "#2a4e34", "#3a6a3c", "#5a8a48", "#86a85a"),
    "summit": ramp("#1e2c4a", "#2c3e64", "#40548a", "#5a72a8", "#84a0cc"),
}
ROCK_SETS = {"bluff": BLUFF_ROCK, "point": POINT_ROCK, "summit": SUMMIT_ROCK}
SHRUB = {
    "bluff": ms.OLIVE if hasattr(ms, "OLIVE") else mc.OLIVE,
    "point": ramp("#0a1c14", "#12301f", "#1c4428", "#2a5c32", "#3e7440", "#5a8c4c", "#80a860"),
    "summit": ramp("#0c1624", "#142234", "#1e3248", "#2c465e", "#40607a", "#5a7c94", "#84a0b4"),
}


def rocks(kind, letter):
    return lambda: recolour(f"cove_rock_{letter}", [mc.ROCK, mc.SLOPE_G, ms.LEAF], [ROCK_SETS[kind], TURF[kind], SHRUB[kind]])


SPRITES = {
    "cyp_c": cyp_c, "cyp_d": cyp_d, "cyp_e": cyp_e, "stone_pine": stone_pine,
    "night_pine_b": night_pine_b, "night_pine_c": night_pine_c, "night_pine_d": night_pine_d, "night_pine_e": night_pine_e,
}
for _k in ("bluff", "point", "summit"):
    for _l in "abcd":
        SPRITES[f"{_k}_rock_{_l}"] = rocks(_k, _l)


def main():
    names = sys.argv[1:] or list(SPRITES)
    made = []
    for n in names:
        s = SPRITES[n]()
        assert set(np.unique(s.a[..., 3])) <= {0, 255}, n
        assert (s.a[-1, :, 3] > 0).any(), f"{n}: bottom row must touch the ground"
        s.save(n)
        made.append((n, s))
        print(f"{n} {s.w}x{s.h}")
    Wd = sum(s.w + 8 for _, s in made) + 8
    Hd = max(s.h for _, s in made) + 8
    sheet = Image.new("RGBA", (Wd, Hd), (110, 130, 170, 255))
    x = 8
    for _, s in made:
        im = Image.fromarray(s.a, "RGBA")
        sheet.paste(im, (x, Hd - 4 - s.h), im)
        x += s.w + 8
    sheet.resize((Wd * 2, Hd * 2), Image.NEAREST).save(os.path.join(HERE, "preview_variants.png"))


if __name__ == "__main__":
    main()

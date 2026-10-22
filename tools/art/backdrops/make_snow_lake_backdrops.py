#!/usr/bin/env python3
"""
Velvet Cruise -- parallax backdrops for SNOWCAP PASS (sky_s12 / far_s12) and CRYSTAL LAKE
(sky_s14 / far_s14).  Reuses the dithering helpers of make_backdrops.py (imported, not modified)
and writes to ./out/:
    sky_s{N}.png   640x80, opaque.
    far_s{N}.png   640x56, RGBA (alpha 0/255).  Bottom row = horizon (screen y 79).

  12 Snowcap Pass   late-afternoon alpenglow: a low pale sun setting in a notch of the snowy peaks,
                    ice-blue sky fading to peach and rose, thin cirrus streaks.  Three layers of
                    peaks (far lavender, mid massif with snowfields and sun-lit faces, a dark fir
                    belt) over a snow meadow whose bottom row is exactly the stage's horizon colour
                    (themes.ts landH) so it joins the engine's ground fill.
  14 Crystal Lake   deep twilight, a big pale moon and many stars; jagged blue ranges with
                    moonlit snow caps and a fir-covered shore, a few cabin lights, and the lake in
                    front: the mountains mirrored in dark dithered water, a glittering moon path.
                    The bottom row is exactly the lake colour at the horizon (themes.ts seaH).

Previews (next to this script): preview_snow_s{N}.png  = game window (tile x 160..479) at 3x.

Usage:  python3 -B make_snow_lake_backdrops.py          (both)
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_backdrops as mb  # noqa: E402

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

C, mix, wrapdx, quantize = mb.C, mb.mix, mb.wrapdx, mb.quantize
pnoise = mb.periodic_noise
W, SKY_H, FAR_H, WIN0 = mb.W, mb.SKY_H, mb.FAR_H, mb.WIN0
OUT = os.path.join(HERE, "out")

SY, SX = np.mgrid[0:SKY_H, 0:W]
XS = np.arange(W)

LAND_12 = "#c8d0e4"        # themes.ts landH of Snowcap Pass
LAKE_14 = "#5a6a9a"        # themes.ts seaH of Crystal Lake


def hexrgb(h):
    return tuple(int(v) for v in C(h))


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def hash01(x, y, s=0):
    h = (int(x) * 374761393 + int(y) * 668265263 + s * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296.0


# ----------------------------------------------------------------------------
# sky helpers
# ----------------------------------------------------------------------------
def gradient_sky(stops, glows=(), seed_k=1.7, wave=0.0):
    """stops = [(row, colour)], glows = [dict(x, y, rx, ry, steps)] extra palette steps toward the
    last colours.  Returns an RGB image with 16-bit style dithered bands."""
    ys = [r for r, _ in stops]
    pal = [hexrgb(c) for _, c in stops]
    n = len(pal)
    u_row = np.interp(np.arange(SKY_H), ys, np.arange(n))
    u = np.repeat(u_row[:, None], W, 1).astype(float)
    for g in glows:
        dx = wrapdx(SX, g["x"])
        d = np.sqrt((dx / g["rx"]) ** 2 + ((SY - g["y"]) / g["ry"]) ** 2)
        u = np.minimum(u + g["steps"] * np.clip(1 - d, 0, 1) ** g.get("p", 1.4), n - 1)
    if wave:
        # band edges wander left to right instead of running as ruled stripes
        wv = pnoise(int(seed_k * 10) + 3, 7)[None, :] * 0.34 + pnoise(int(seed_k * 10) + 9, 19)[None, :] * 0.12
        u = np.clip(u + wave * wv, 0, n - 1)
    k = np.full(u.shape, seed_k)
    idx = quantize(u, k, SX, SY, n - 1)
    return np.array(pal, dtype=np.uint8)[idx]


def disk(img, cx, cy, r, col, rim=None, x_scale=1.0):
    dx = wrapdx(SX, cx) / x_scale
    dy = SY - cy
    dd = dx * dx + dy * dy
    m = dd <= r * r + r * 0.8
    img[m] = hexrgb(col)
    if rim:
        inner = dd <= (r - 1) * (r - 1) + (r - 1) * 0.8
        img[m & ~inner] = hexrgb(rim)
    return m


def streak(img, cx, cy, length, col, alpha_cols=None, thick=1):
    """a thin cirrus wisp: a lens-shaped streak with a ragged end"""
    for i in range(length):
        t = i / max(1, length - 1)
        x = (cx + i) % W
        th = thick if 0.15 < t < 0.8 else 0
        for k in range(-th, th + 1):
            y = cy + k + (1 if (i // 9) % 2 else 0)
            if 0 <= y < SKY_H and hash01(x, y, 5) < 0.88:
                img[y, x] = hexrgb(col)


# ----------------------------------------------------------------------------
# far helpers
# ----------------------------------------------------------------------------
def ridge(seed, lo, hi, knots=(4, 9, 19, 41), amps=(1.0, 0.55, 0.3, 0.16), ridged=True, sharp=1.0):
    v = np.zeros(W)
    for i, (k, a) in enumerate(zip(knots, amps)):
        n = pnoise(seed + i * 7, k)
        v += a * ((1 - np.abs(n)) if ridged else (n * 0.5 + 0.5))
    v = (v - v.min()) / (v.max() - v.min())
    v = v ** sharp
    return np.rint(lo + (hi - lo) * v).astype(int)


def new_far():
    return np.zeros((FAR_H, W, 4), np.uint8)


def fill_range(img, h, shade):
    """paint columns from the ridge height h[x] (rows above the bottom row) down to the bottom"""
    for x in range(W):
        top = max(0, FAR_H - int(h[x]))
        for y in range(top, FAR_H):
            c = shade(x, y, top)
            img[y, x, :3] = c
            img[y, x, 3] = 255


def lit_face(h, x, sunx, k=2):
    """is the slope at x turned toward the sun / moon? (height falls toward it)"""
    d = wrapdx(x, sunx)
    sl = int(h[(x + k) % W]) - int(h[(x - k) % W])
    return d * sl < 0 and abs(sl) >= 1


SNOWLINE_N = pnoise(91, 23)


def face_lit(h, x, depth, sunx):
    """lit or shaded face at column x, `depth` rows under the crest: the face borders slant down
    to the left, so the peaks read as faceted mass rather than as vertical bars"""
    return lit_face(h, (x + int(depth * 0.45)) % W, sunx, k=3)


def mountain_pixel(h, x, y, top, sunx, pal, snow_base, snow_var):
    depth = y - top
    lit = face_lit(h, x, depth, sunx)
    sl = abs(int(h[(x + 3) % W]) - int(h[(x - 3) % W]))
    snow_line = snow_base + snow_var * (SNOWLINE_N[(x + depth) % W] * 0.5 + 0.5)
    couloir = hash01((x + depth // 2) // 2, 9, 5) < 0.22 and depth > 4
    if depth < snow_line and not (sl >= 5 and depth > 4 and couloir):
        c = pal["snow_lit"] if lit else pal["snow_sh"]
        if depth < 2:
            c = pal["snow_top"] if lit else pal["snow_sh"]
        elif depth > snow_line - 2.5:
            c = pal["snow_edge"] if lit else pal["snow_edge_sh"]
    else:
        c = pal["rock_lit"] if lit else pal["rock_sh"]
        if (x * 5 + y * 3) % 9 == 0 or couloir:
            c = lerp(c, pal["rock_dark"], 0.55)
        if lit and hash01(x, y, 4) < 0.28:
            c = lerp(c, pal["rock_warm"], 0.5)
        k = min(1.0, depth / 26.0)
        c = lerp(c, pal["rock_dark"], 0.28 * k)
    return c


def notch(h, cx, depth, width):
    xs = np.arange(W)
    d = wrapdx(xs, cx)
    return np.rint(h * (1 - depth * np.exp(-(d / width) ** 2))).astype(int)


# ----------------------------------------------------------------------------
# 12  SNOWCAP PASS
# ----------------------------------------------------------------------------
SUN12 = WIN0 + 218


def sky_12():
    stops = [(0, "#26367a"), (12, "#34498f"), (24, "#4c63a8"), (36, "#7480bc"), (46, "#a08cc0"),
             (55, "#cc98b8"), (63, "#eaa8a8"), (70, "#f8b8a0"), (76, "#ffcc9c"), (79, "#ffdcae")]
    img = gradient_sky(stops, glows=[dict(x=SUN12, y=70, rx=120, ry=36, steps=4.5, p=1.1)])
    disk(img, SUN12, 63, 9, "#fff6d6", rim="#ffe2a0")
    # cirrus wisps catching the low sun
    for (cx, cy, ln, col) in ((60, 20, 70, "#6a7cb8"), (200, 30, 54, "#8c90c4"), (300, 17, 80, "#5c70b0"),
                              (420, 36, 66, "#c4a0c0"), (520, 24, 74, "#7488c0"), (610, 40, 46, "#b8a0c4"),
                              (140, 46, 40, "#c8a0bc"), (470, 49, 50, "#e4aab4")):
        streak(img, cx, cy, ln, col)
    return img


def far_12():
    img = new_far()
    land = hexrgb(LAND_12)
    haze = hexrgb("#e2b4b0")

    # 1. far peaks: lavender, hazed by the sunset; a notch of low ground where the sun sets
    h1 = notch(ridge(21, 18, 46, sharp=1.5), SUN12, 0.7, 34)
    pal1 = dict(snow_lit="#fff0f0", snow_top="#fff6f0", snow_sh="#bcb8e0", snow_edge="#e8c8d8", snow_edge_sh="#9a9cd0",
                rock_lit="#a08ab4", rock_sh="#6c78ac", rock_dark="#54609a", rock_warm="#f0b0a8")
    pal1 = {k: hexrgb(v) for k, v in pal1.items()}

    def shade1(x, y, top):
        return lerp(mountain_pixel(h1, x, y, top, SUN12, pal1, 9, 5), haze, 0.22)
    fill_range(img, h1, shade1)

    # 2. the big massif: rugged ridged peaks, snowfields, rock ribs, warm sun-lit faces
    h2 = notch(ridge(5, 12, 38, knots=(5, 11, 23, 53), sharp=1.35), SUN12, 0.55, 26)
    pal2 = dict(snow_lit="#fdfcff", snow_top="#ffeedd", snow_sh="#aeb8e0", snow_edge="#ccd0f0", snow_edge_sh="#8c98cc",
                rock_lit="#7c84b0", rock_sh="#3c4878", rock_dark="#262e56", rock_warm="#e8b4a4")
    pal2 = {k: hexrgb(v) for k, v in pal2.items()}

    def shade2(x, y, top):
        return lerp(mountain_pixel(h2, x, y, top, SUN12, pal2, 7, 6), haze, 0.07)
    fill_range(img, h2, shade2)

    # 3. a belt of dark firs along the foot of the massif, white-tipped
    base = ridge(33, 7, 14, knots=(7, 17, 37), amps=(1, 0.5, 0.3), ridged=False)
    h3 = base.copy()
    for x in range(W):
        tooth = (x * 5) % 6
        h3[x] = base[x] + (3 - abs(tooth - 3)) + int(2 * hash01(x // 6, 1, 9))

    def shade3(x, y, top):
        depth = y - top
        c = hexrgb("#16283a") if depth > 1 else hexrgb("#1e3a4c")
        if depth == 0 and hash01(x, 3, 3) < 0.8:
            c = hexrgb("#dfe8f8") if wrapdx(x, SUN12) < 0 else hexrgb("#f4f6ff")
        elif depth == 1 and hash01(x, 4, 3) < 0.35:
            c = hexrgb("#9aaccc")
        elif depth > 2 and hash01(x // 2, y, 6) < 0.18:
            c = hexrgb("#20404c")
        return c
    fill_range(img, h3, shade3)

    # 4. the snow meadow: its lowest rows are exactly the engine's horizon ground colour
    base = np.rint(3 + 1.6 * pnoise(61, 13) + 0.8 * pnoise(62, 29)).astype(int)

    def shade4(x, y, top):
        depth = y - top
        yb = FAR_H - 1 - y
        if yb == 0:
            return land
        if yb == 1:
            return lerp(land, hexrgb("#e4eaf8"), 0.5)
        c = hexrgb("#e8eefa") if depth == 0 else hexrgb("#dae2f4")
        if depth >= 1 and wrapdx(x, SUN12) < 0 and hash01(x, y, 2) < 0.15:
            c = hexrgb("#b4c0e0")
        return c
    fill_range(img, base, shade4)
    return img


# ----------------------------------------------------------------------------
# 14  CRYSTAL LAKE
# ----------------------------------------------------------------------------
MOON14 = WIN0 + 205
MOON_Y = 34


def sky_14():
    stops = [(0, "#070b24"), (12, "#0e1638"), (24, "#182450"), (36, "#27346a"), (46, "#3d4880"),
             (56, "#5e5a92"), (65, "#8c6a9c"), (72, "#b87a9c"), (79, "#d88aa0")]
    img = gradient_sky(stops, glows=[dict(x=MOON14, y=MOON_Y, rx=70, ry=36, steps=2.2, p=1.5),
                                     dict(x=MOON14, y=82, rx=150, ry=30, steps=1.6, p=1.2)])
    # stars: many small, a few bright crosses, thinning toward the horizon glow
    rng = np.random.default_rng(14)
    for _ in range(150):
        x, y = int(rng.integers(0, W)), int(rng.integers(0, 56))
        if wrapdx(x, MOON14) ** 2 + (y - MOON_Y) ** 2 < 15 ** 2:
            continue
        a = 1.0 - y / 62.0
        if rng.random() < a:
            img[y, x] = hexrgb("#fffbe8") if rng.random() < 0.35 else hexrgb("#b4bce8")
    for _ in range(14):
        x, y = int(rng.integers(0, W)), int(rng.integers(2, 42))
        if wrapdx(x, MOON14) ** 2 + (y - MOON_Y) ** 2 < 18 ** 2:
            continue
        img[y, x] = hexrgb("#ffffff")
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= y + dy < SKY_H:
                img[y + dy, (x + dx) % W] = hexrgb("#8890d0")
    # the moon: pale disc with a few maria, a soft dithered halo ring
    for r, col in ((16, "#2c3a74"),):
        dx = wrapdx(SX, MOON14)
        dd = np.sqrt(dx * dx + (SY - MOON_Y) ** 2)
        ring = (dd > 10.5) & (dd <= r) & (((SX + SY) & 1) == 0)
        img[ring] = hexrgb(col)
    m = disk(img, MOON14, MOON_Y, 9, "#fff6d0", rim="#f0dc9c")
    for (ox, oy, rr) in ((-3, -2, 2), (2, 2, 2), (3, -3, 1), (-2, 4, 1)):
        mm = ((wrapdx(SX, MOON14 + ox) ** 2 + (SY - (MOON_Y + oy)) ** 2) <= rr * rr + 0.4) & m
        img[mm] = hexrgb("#e4d08c")
    # thin cloud ribbons lit by the moon
    for (cx, cy, ln, col) in ((70, 26, 60, "#3a4880"), (250, 44, 70, "#4a5890"), (360, 20, 50, "#4a5a98"),
                              (470, 48, 64, "#5a5c98"), (580, 30, 56, "#35457c")):
        streak(img, cx, cy, ln, col)
    return img


def far_14():
    img = new_far()
    lake = hexrgb(LAKE_14)
    water_rows = 12                      # the lake occupies the bottom rows of the far layer
    shore = FAR_H - water_rows           # first water row
    sky_horizon = hexrgb("#b86a98")

    # 1. the great range: tall jagged peaks, moonlit snow caps, mist at their feet
    h1 = ridge(41, 22, 52, knots=(5, 11, 25, 57), sharp=1.35)
    h1 = notch(h1, MOON14 + 36, 0.22, 60)
    pal = dict(snow_lit="#f4f6ff", snow_top="#ffffff", snow_sh="#8e9cd0", snow_edge="#bcc8ec", snow_edge_sh="#6a7ab8",
               rock_lit="#4c5e98", rock_sh="#222e5a", rock_dark="#121a3c", rock_warm="#7084b8")
    pal = {k: hexrgb(v) for k, v in pal.items()}

    def shade1(x, y, top):
        c = mountain_pixel(h1, x, y, top, MOON14, pal, 9, 6)
        foot = (FAR_H - y)                      # mist near the foot of the range
        if foot < 28:
            c = lerp(c, hexrgb("#6a6aa4"), 0.4 * (1 - foot / 28.0))
        return c
    fill_range(img, h1, shade1)

    # 2. foothills covered in firs, with the odd cabin light
    base = ridge(55, 14, 24, knots=(7, 15, 33), amps=(1, 0.5, 0.3), ridged=False)
    h2 = base.copy()
    for x in range(W):
        tooth = (x * 5) % 7
        h2[x] = base[x] + (3 - abs(tooth - 3)) * 1 + int(2 * hash01(x // 7, 2, 4))

    def shade2(x, y, top):
        depth = y - top
        c = hexrgb("#10243a") if depth > 1 else hexrgb("#1a3a52")
        if depth == 0 and wrapdx(x, MOON14) * 1 < 0 and hash01(x, 7, 7) < 0.6:
            c = hexrgb("#6a8ab8")
        elif depth > 2 and hash01(x // 2, y, 6) < 0.2:
            c = hexrgb("#1a3448")
        return c
    fill_range(img, h2, shade2)

    # 3. the near shore: dark firs right at the water line, low and dense
    base = ridge(77, 9, 13, knots=(9, 21, 47), amps=(1, 0.5, 0.3), ridged=False)
    h3 = base.copy()
    for x in range(W):
        tooth = (x * 3) % 5
        h3[x] = base[x] + (2 - abs(tooth - 2)) + int(2 * hash01(x // 5, 5, 4))

    def shade3(x, y, top):
        depth = y - top
        c = hexrgb("#0a1a2c") if depth > 0 else hexrgb("#142a40")
        if depth > 1 and hash01(x // 2, y, 8) < 0.16:
            c = hexrgb("#12304a")
        return c
    fill_range(img, h3, shade3)
    # cabin windows on the shore (a few warm lights between the firs)
    for x0 in (96, 182, 268, 407, 494, 585):
        top = FAR_H - int(h3[x0])
        y = top + 3
        for dx in (0, 1):
            if y < FAR_H - water_rows - 1:
                img[y, x0 + dx, :3] = hexrgb("#ffd880")
                img[y + 1, x0 + dx, :3] = hexrgb("#e8a850")

    # 4. the lake: carve it out of the bottom rows and paint the water
    water_tab = {}
    for x in range(W):
        for y in range(shore, FAR_H):
            yb = FAR_H - 1 - y                    # 0 at the bottom row
            depth = y - shore                     # 0 at the shore line
            # the mirrored mountains: pick the colour that sits `depth` rows above the shore line
            ys = shore - 1 - depth * 2
            src = None
            if 0 <= ys < FAR_H and img[ys, x, 3]:
                src = img[ys, x, :3].astype(float)
            base_c = np.array(lerp(hexrgb("#1c2a52"), lake, min(1.0, depth / (water_rows - 1))), float)
            if src is not None and depth < water_rows - 1:
                k = 0.55 * (1 - depth / (water_rows - 1))
                c = base_c * (1 - k) + src * k
            else:
                c = base_c
            if (x + 2 * y) % 4 == 0 and depth % 2 == 1:
                c = c * 0.92 + np.array(hexrgb("#8a9ad0")) * 0.08       # ripples
            img[y, x, :3] = np.clip(c, 0, 255).astype(np.uint8)
            img[y, x, 3] = 255
    # the moon's glitter path: short bright dashes widening toward the viewer
    for yb in range(1, water_rows):
        y = FAR_H - 1 - yb
        half = 3 + (water_rows - yb) * 1.3
        for x in range(W):
            dxm = abs(wrapdx(x, MOON14))
            if dxm < half and hash01(x // 2, y, 11) < 0.55 * (1 - dxm / half) + 0.1:
                img[y, x, :3] = hexrgb("#fff2c0") if hash01(x, y, 12) < 0.4 else hexrgb("#c8c8e8")
    img[FAR_H - 1, :, :3] = lake              # exactly the engine's lake colour at the horizon
    return img


# ----------------------------------------------------------------------------
# 13  GOLD RUSH TOWN  (theme node 12; sky_s13 / far_s13)
# ----------------------------------------------------------------------------
LAND_13 = "#c88a5a"        # themes.ts landH of Gold Rush Town
SUN13 = WIN0 + 214


def sky_13():
    stops = [(0, "#1a1250"), (10, "#2e1a68"), (20, "#4c2478"), (30, "#74307e"), (40, "#a43e78"),
             (50, "#d05468"), (58, "#ea7050"), (65, "#f88c46"), (72, "#ffa850"), (79, "#ffc468")]
    img = gradient_sky(stops, glows=[dict(x=SUN13, y=68, rx=130, ry=40, steps=4.2, p=1.15)])
    rng = np.random.default_rng(13)
    for _ in range(40):                               # the first stars, high up
        x, y = int(rng.integers(0, W)), int(rng.integers(0, 22))
        if rng.random() < 1.0 - y / 26.0:
            img[y, x] = hexrgb("#d8c8ff") if rng.random() < 0.5 else hexrgb("#9c88d8")
    disk(img, SUN13, 66, 12, "#fff2c0", rim="#ffd070")
    # long dusk clouds, hot on their undersides
    for (cx, cy, ln, col, th) in ((30, 28, 90, "#b84a78", 1), (170, 40, 110, "#e06a58", 1), (300, 33, 80, "#c8507a", 1),
                                  (420, 46, 120, "#f48a54", 1), (560, 30, 90, "#a04080", 1), (90, 54, 70, "#f89050", 0),
                                  (330, 55, 60, "#ffb060", 0), (500, 58, 80, "#ffa05a", 0)):
        streak(img, cx, cy, ln, col, thick=th)
    return img


def mesa_heights(seed, n, hlo, hhi, wlo, whi, base, slope):
    rng = np.random.default_rng(seed)
    h = np.full(W, float(base))
    for _ in range(n):
        cx, H, w = rng.uniform(0, W), rng.uniform(hlo, hhi), rng.uniform(wlo, whi)
        d = np.abs(wrapdx(XS, cx))
        prof = np.where(d <= w, H, H - (d - w) * slope * (0.8 + 0.4 * rng.random()))
        h = np.maximum(h, np.maximum(prof, base))
    return np.rint(h).astype(int)


def rock_strata(x, y, top, pal, lit, shift):
    """layered sandstone: soft horizontal bands, lighter on top, a bright rim on the crest"""
    depth = y - top
    band = ((depth + shift + int(hash01(x // 5, 1, 3) * 2)) // 3) % 3
    c = pal[band + (3 if lit else 0)]
    if depth == 0:
        c = pal[6]
    return c


def far_13():
    img = new_far()
    land = hexrgb(LAND_13)
    haze = hexrgb("#e8905a")
    # 1. a far line of mesas, mauve in the dusk haze; the sun sets between two of them
    h1 = mesa_heights(5, 9, 26, 46, 12, 26, 10, 1.9)
    h1 = notch(h1, SUN13, 0.7, 22)
    pal1 = [hexrgb(c) for c in ("#7a4a74", "#8a5278", "#6a4068", "#b2688a", "#c4748a", "#a65c82", "#ffc8a0")]

    def shade1(x, y, top):
        lit = lit_face(h1, (x + (y - top) // 2) % W, SUN13, 3)
        return lerp(rock_strata(x, y, top, pal1, lit, 0), haze, 0.3)
    fill_range(img, h1, shade1)
    # 2. big red-rock mesas and buttes in front, strongly banded
    h2 = mesa_heights(9, 7, 20, 38, 9, 22, 8, 1.35)
    h2 = notch(h2, SUN13, 0.45, 18)
    pal2 = [hexrgb(c) for c in ("#6a2a3a", "#7e3440", "#58263a", "#c4583c", "#d8704a", "#b04a3c", "#ffb27a")]

    def shade2(x, y, top):
        lit = lit_face(h2, (x + (y - top) // 2) % W, SUN13, 3)
        c = rock_strata(x, y, top, pal2, lit, 1)
        if not lit and hash01(x, y, 5) < 0.12:
            c = lerp(c, hexrgb("#3a1a30"), 0.6)
        return lerp(c, haze, 0.1)
    fill_range(img, h2, shade2)
    # 3. the town on the flat: false-front buildings, a church spire, a water tower, poles
    base = np.full(W, 4)
    hh = base.copy()
    rng = np.random.default_rng(31)
    lit_windows = []
    x = 0
    while x < W:
        gap = int(rng.integers(3, 12))
        x += gap
        bw = int(rng.integers(8, 16))
        kind = rng.random()
        height = int(rng.integers(12, 22))
        for xx in range(x, min(W, x + bw)):
            u = xx - x
            top = height
            if kind < 0.55:                      # false front: stepped parapet
                top = height + (2 if (u in (0, bw - 1)) else (1 if u in (1, bw - 2) else 0))
                if u == bw // 2:
                    top += 2
            elif kind < 0.8:                     # pitched roof
                top = height - 3 + min(u, bw - 1 - u) // 2 + 1
            else:                                # a lean-to shed
                top = height - 4 + (u * 3) // bw
            hh[xx % W] = max(hh[xx % W], top)
        if kind < 0.55 and bw >= 8:
            lit_windows.append((x + 2, height - 6))
            lit_windows.append((x + bw - 4, height - 6))
            lit_windows.append((x + 2, height - 11))
            lit_windows.append((x + bw - 4, height - 11))
        x += bw
    for cx_, ph in ((140, 36), (352, 34), (545, 35)):            # church spires
        for dy in range(ph):
            w_ = max(0, (ph - dy) // 7)
            for dx in range(-w_, w_ + 1):
                hh[(cx_ + dx) % W] = max(hh[(cx_ + dx) % W], dy + 4 if dy > 10 else 12)
    for cx_ in (75, 255, 440, 600):                              # water towers on legs
        for dx in range(-3, 4):
            hh[(cx_ + dx) % W] = max(hh[(cx_ + dx) % W], 26 + (1 if abs(dx) < 3 else 0))
    for xx in range(0, W, 23):                                   # telegraph poles
        hh[xx] = max(hh[xx], 22)

    def shade3(x, y, top):
        depth = y - top
        c = hexrgb("#2a1426") if depth > 0 else hexrgb("#5a2c3c")
        if depth == 0 and wrapdx(x, SUN13) * 1 < 0:
            c = hexrgb("#a05058")
        return c
    fill_range(img, hh, shade3)
    for (wx, wh) in lit_windows:                                 # lamplit windows
        y = FAR_H - 1 - wh
        if 0 <= y < FAR_H - 4 and rng.random() < 0.8:
            img[y, wx % W, :3] = hexrgb("#ffd070")
            img[y, (wx + 1) % W, :3] = hexrgb("#ffb050")
    # 4. the desert floor with scrub; the lowest rows are exactly the engine's horizon ground colour
    base = np.rint(3 + 1.2 * pnoise(71, 17) + 0.6 * pnoise(72, 41)).astype(int)

    def shade4(x, y, top):
        depth = y - top
        yb = FAR_H - 1 - y
        if yb == 0:
            return land
        if yb == 1:
            return lerp(land, hexrgb("#d8a070"), 0.5)
        c = hexrgb("#d49a62") if depth == 0 else hexrgb("#c88a5a")
        if hash01(x, y, 4) < 0.08:
            c = hexrgb("#a86a46")
        return c
    fill_range(img, base, shade4)
    for xx in range(5, W, 17):                                    # sagebrush dots
        if hash01(xx, 0, 6) < 0.7:
            y = FAR_H - 1 - int(base[xx]) - 1
            img[y, xx, :3] = hexrgb("#6a4a3a")
            img[y, xx, 3] = 255
    return img


# ----------------------------------------------------------------------------
# 15  STARLIGHT SUMMIT  (theme node 14; sky_s15 / far_s15)
# ----------------------------------------------------------------------------
LAND_15 = "#30365a"        # themes.ts landH of Starlight Summit
OBS15 = WIN0 + 245         # the observatory dome on its peak (tile x)


def sky_15():
    stops = [(0, "#03041a"), (12, "#080c2c"), (24, "#10163c"), (36, "#1c2254"), (48, "#2c2c6c"),
             (58, "#40388a"), (68, "#5a4698"), (79, "#7a56a0")]
    # calmer than before: wider, single-row dither transitions that wander across the sky, no ruled stripes
    img = gradient_sky(stops, glows=[dict(x=OBS15, y=84, rx=170, ry=26, steps=1.6, p=1.2)], seed_k=6.0, wave=1.0)
    rng = np.random.default_rng(15)
    # the Milky Way: a wide, softly lit band arching over the whole tile with a dense star cloud
    cy = 30 + 11 * np.sin(2 * np.pi * XS / W * 1.0 + 0.8)
    dist = np.abs(SY - cy[None, :])
    band = np.clip(1 - dist / 13.0, 0, 1)
    u_add = band ** 1.4 * 2.3
    pal, ys = None, None
    # the band in three flat tones (no checkerboard dither): a faint halo, a body and a bright core
    halo = (u_add > 0.5) & (u_add <= 1.15)
    body = (u_add > 1.15) & (u_add <= 1.7)
    core = u_add > 1.7
    img[halo] = (img[halo].astype(float) * 0.78 + np.array(hexrgb("#6a72c0")) * 0.22).astype(np.uint8)
    img[body] = (img[body].astype(float) * 0.6 + np.array(hexrgb("#7a82d0")) * 0.4).astype(np.uint8)
    img[core] = (img[core].astype(float) * 0.5 + np.array(hexrgb("#98a0e0")) * 0.5).astype(np.uint8)
    clump = pnoise(41, 23)                              # stars gather in loose groups with real gaps between
    for _ in range(300):
        x, y = int(rng.integers(0, W)), int(rng.integers(0, 62))
        inband = abs(y - cy[x]) < 12
        if clump[x] < -0.15:
            continue
        if rng.random() < (0.6 if inband else 0.22) * (1.0 - y / 70.0) + 0.02:
            r = rng.random()
            img[y, x] = hexrgb("#ffffff") if r < 0.18 else (hexrgb("#d8dcff") if r < 0.5 else hexrgb("#8a92d8"))
    for _ in range(22):                                       # bright stars with a cross
        x, y = int(rng.integers(0, W)), int(rng.integers(2, 46))
        img[y, x] = hexrgb("#ffffff")
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            img[y + dy, (x + dx) % W] = hexrgb("#98a0e0")
    # a shooting star with a fading tail, and a bright planet low in the glow
    sx0, sy0 = 330, 10
    for i in range(22):
        x, y = sx0 - i * 2, sy0 + i // 1
        if y < SKY_H:
            col = hexrgb("#ffffff") if i < 3 else (hexrgb("#c0c8ff") if i < 9 else hexrgb("#6a74c0"))
            if i < 14 or i % 2 == 0:
                img[y, x % W] = col
    for dx, dy, c in ((0, 0, "#fff8e0"), (1, 0, "#ffe8b0"), (-1, 0, "#ffe8b0"), (0, 1, "#ffe8b0"), (0, -1, "#ffe8b0")):
        img[58 + dy, (130 + dx) % W] = hexrgb(c)
    return img


def far_15():
    img = new_far()
    land = hexrgb(LAND_15)
    # 1. far peaks: navy, rimmed by the glow of the sky behind them
    h1 = ridge(81, 18, 44, knots=(5, 11, 25, 57), sharp=1.45)
    pal = dict(snow_lit="#8a96d0", snow_top="#b4bef0", snow_sh="#4a548c", snow_edge="#6874b0", snow_edge_sh="#3a4478",
               rock_lit="#2c3468", rock_sh="#161c44", rock_dark="#0c1030", rock_warm="#4a4c90")
    pal = {k: hexrgb(v) for k, v in pal.items()}

    def shade1(x, y, top):
        c = mountain_pixel(h1, x, y, top, OBS15, pal, 5, 4)
        return lerp(c, hexrgb("#5a4a98"), 0.12)
    fill_range(img, h1, shade1)
    # 2. the summit ridge: bigger, darker, with the observatory on its crown
    h2 = ridge(87, 13, 36, knots=(4, 9, 21, 47), sharp=1.3)
    h2 = notch(h2, OBS15, -0.0, 10)
    # flatten a pad for the observatory
    for dx in range(-14, 15):
        h2[(OBS15 + dx) % W] = max(h2[(OBS15 + dx) % W], 30)
    pal2 = dict(snow_lit="#a4b0e0", snow_top="#d0d8ff", snow_sh="#5a6498", snow_edge="#8490c8", snow_edge_sh="#444e84",
                rock_lit="#323c72", rock_sh="#121838", rock_dark="#080c24", rock_warm="#565aa0")
    pal2 = {k: hexrgb(v) for k, v in pal2.items()}

    def shade2(x, y, top):
        return mountain_pixel(h2, x, y, top, OBS15, pal2, 3, 4)
    fill_range(img, h2, shade2)
    # the observatory: a domed building with a lit slit, and a pale beam searching the sky
    def put(x, y, col):
        if 0 <= y < FAR_H:
            img[y, x % W, :3] = hexrgb(col)
            img[y, x % W, 3] = 255
    ytop = FAR_H - 30                                         # the pad height (row of the ridge crown)
    for dx in range(-9, 10):                                  # drum
        for yy in range(ytop - 7, ytop):
            put(OBS15 + dx, yy, "#9aa6cc" if dx > 1 else ("#6e7aa8" if dx > -5 else "#505c88"))
        put(OBS15 + dx, ytop - 7, "#2a3258")
    for dx in range(-8, 9):                                   # dome
        hgt = int(round(math.sqrt(max(0.0, 1 - (dx / 8.5) ** 2)) * 8))
        for k in range(hgt):
            yy = ytop - 8 - k
            put(OBS15 + dx, yy, "#e0e8ff" if (dx > 1 and k > hgt - 4) else ("#b4c0e0" if dx > -3 else "#7c88b8"))
    for yy in range(ytop - 16, ytop - 8):                     # the open slit with a warm light inside
        put(OBS15 + 1, yy, "#ffd878")
        put(OBS15 + 2, yy, "#ffe8a8" if yy % 2 else "#ffc860")
    for dx in (-6, -3, 4, 7):
        put(OBS15 + dx, ytop - 4, "#ffd070")
    for k in range(1, 26):                                    # beam: a dithered pale shaft to the upper left
        bx, by = OBS15 + 2 - k // 2, ytop - 17 - k
        if by < 0:
            break
        for w_ in (0, 1):
            if (bx + w_ + by) % 2 == 0 and (k < 14 or k % 3 != 0):
                put(bx + w_, by, "#b8c4ff")
    # 3. a dark rocky slope with frost; its lowest row is exactly the engine's horizon ground colour
    base = np.rint(4 + 1.4 * pnoise(91, 15) + 0.8 * pnoise(92, 37)).astype(int)

    def shade3(x, y, top):
        depth = y - top
        yb = FAR_H - 1 - y
        if yb == 0:
            return land
        if yb == 1:
            return lerp(land, hexrgb("#1c2244"), 0.5)
        c = hexrgb("#222a52") if depth == 0 else hexrgb("#161c40")
        if depth == 0 and hash01(x, 2, 3) < 0.5:
            c = hexrgb("#7a88c8")
        elif hash01(x, y, 4) < 0.1:
            c = hexrgb("#262e5c")
        return c
    fill_range(img, base, shade3)
    return img


STAGES = {
    13: dict(name="Gold Rush Town", sky=sky_13, far=far_13, land=LAND_13),
    15: dict(name="Starlight Summit", sky=sky_15, far=far_15, land=LAND_15),
    12: dict(name="Snowcap Pass", sky=sky_12, far=far_12, land=LAND_12),
    14: dict(name="Crystal Lake", sky=sky_14, far=far_14, land=LAKE_14),
}


def check_far(far, land):
    a = far[..., 3]
    assert set(np.unique(a)) <= {0, 255}, "alpha must be 0/255"
    assert (a[-4:] == 255).all(), "land must cover the horizon rows across the whole tile"
    assert (far[-1, :, :3] == hexrgb(land)).all(), "bottom row must be the horizon colour"
    for x in range(W):       # solid up from the horizon (a few floating light pixels above it are fine)
        assert (a[-6:, x] == 255).all(), f"gap at x={x}"
        run = 0
        while run < FAR_H and a[FAR_H - 1 - run, x] == 255:
            run += 1
        assert run >= 6, f"gap at x={x}"


def build(sn):
    st = STAGES[sn]
    sky = st["sky"]()
    far = st["far"]()
    check_far(far, st["land"])
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(sky, "RGB").save(os.path.join(OUT, f"sky_s{sn}.png"))
    Image.fromarray(far, "RGBA").save(os.path.join(OUT, f"far_s{sn}.png"))
    win = mb.composite(sky, far, (st["land"], st["land"]), WIN0, mb.SCREEN_W)
    Image.fromarray(mb.zoom(win)).save(os.path.join(HERE, f"preview_snow_s{sn}.png"))
    print(f"stage {sn} {st['name']}: sky colours={len(np.unique(sky.reshape(-1, 3), axis=0))} "
          f"far colours={len(np.unique(far[far[..., 3] > 0][:, :3], axis=0))}")


if __name__ == "__main__":
    for s in ([int(a) for a in sys.argv[1:]] or [12, 13, 14, 15]):
        build(s)

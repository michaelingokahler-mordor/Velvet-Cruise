#!/usr/bin/env python3
"""Velvet Cruise -- the four extra finale scenes (goals A-D; goal E keeps the sunset-bay scene).

Writes into tools/art/ending/out/ (then run tools/pack_assets.py):
  ending_bg_a.png .. ending_bg_d.png   320x180 opaque, the same stage set as ending_bg.png
        (road runs out at a striped barrier; the couple jump out in front, the trophy shows up
        behind it) but each in its own world, built from that stage's own painted sky / far layer:
        A Neon City       a rain-dark waterfront below the skyline, neon blades, searchlight sky
        B Gold Rush Town  a dusty main street, saloon and store, hitching rail, a wagon
        C Crystal Lake    the moonlit lake and its reflection, spruces, lanterns, a rowboat
        D Starlight Summit  a stone terrace above a sea of cloud, the observatory, a telescope
  trophy_a.png .. trophy_d.png          the trophy in each scene's own metal
  trophy_glow_a.png .. trophy_glow_d    its additive halo, in a matching colour

Geometry is shared with ending_bg.png so the code that places the trophy, the car and the couple
works for all of them: horizon / water line at y=96, wall and barrier at y=132..146, plaza and the
last of the road below.  Pillow + numpy only; run make_ending.py first (it writes the base scene
this file recolours for the road and plaza).

Run:  python3 -B make_finales.py
"""
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
BD = os.path.join(HERE, "..", "backdrops", "out")
SC = os.path.join(HERE, "..", "scenery", "out")
sys.path.insert(0, HERE)
import make_ending as me  # noqa: E402  (hexc, rng_hash, trophy + glow helpers)
from make_ending import hexc, rng_hash, W, H, HOR  # noqa: E402

BAR_X0, BAR_X1 = 126, 194


# ------------------------------------------------------------------ helpers
def rgb(h):
    return hexc(h).astype(float)


def sprite(name):
    return Image.open(os.path.join(SC, name + ".png")).convert("RGBA")


def paste(img, name, cx, base, flip=False, dim=None):
    """Alpha-paste a scenery sprite centred on cx with its bottom row on `base` (image is a uint8 array)."""
    s = sprite(name)
    if flip:
        s = s.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.array(s)
    h, w = a.shape[:2]
    x0, y0 = int(cx - w // 2), int(base - h + 1)
    for y in range(h):
        for x in range(w):
            if a[y, x, 3] == 0:
                continue
            X, Y = x0 + x, y0 + y
            if 0 <= X < W and 0 <= Y < H:
                c = a[y, x, :3].astype(float)
                if dim is not None:
                    c = c * dim
                img[Y, X] = np.clip(c, 0, 255).astype(np.uint8)


def px(img, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        img[y, x] = hexc(c) if isinstance(c, str) else c


def hline(img, x0, x1, y, c):
    c = hexc(c) if isinstance(c, str) else c
    img[y, max(0, x0):min(W, x1)] = c


def block(img, x0, y0, x1, y1, c):
    c = hexc(c) if isinstance(c, str) else c
    img[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] = c


def lum(c):
    return (0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]) / 255.0


# ------------------------------------------------------------------ the sky + far layer from the stage itself
def stage_top(n, cropx):
    """Sky (stretched to the horizon) with the stage's far layer standing on y=96."""
    sky = Image.open(os.path.join(BD, f"sky_s{n}.png")).convert("RGB").crop((cropx, 0, cropx + W, 80))
    sky = sky.resize((W, HOR), Image.NEAREST)
    far = Image.open(os.path.join(BD, f"far_s{n}.png")).convert("RGBA").crop((cropx, 0, cropx + W, 56))
    top = sky.convert("RGBA")
    top.alpha_composite(far, (0, HOR - 56))
    img = np.zeros((H, W, 3), np.uint8)
    img[:HOR] = np.array(top.convert("RGB"))
    ground = np.array(far)[-1, :, :3].astype(float).mean(axis=0)     # the far layer's bottom row = the land colour
    return img, ground


def reflect(img, y0, y1, tint, k0, k1, ripple=1.6, sparkle=None):
    """Mirror the scene above the water line into rows y0..y1, darkened towards `tint`."""
    T = rgb(tint)
    for y in range(y0, y1):
        v = (y - y0) / max(1, y1 - y0 - 1)
        sy = 2 * y0 - 1 - y
        sy = max(0, sy)
        shift = int(round(math.sin(y * 0.9 + (y // 3) * 1.7) * ripple * (0.4 + v)))
        k = k0 + (k1 - k0) * v
        for x in range(W):
            src = img[sy, min(W - 1, max(0, x + shift))].astype(float)
            c = src * (1 - k) + T * k
            if rng_hash(x, y, 31) < 0.05 + 0.1 * v:       # broken ripples
                c = c * 0.6 + T * 0.4
            img[y, x] = np.clip(c, 0, 255).astype(np.uint8)
    if sparkle:
        for y in range(y0 + 1, y1):
            for x in range(W):
                if rng_hash(x, y, 77) < 0.012:
                    px(img, x, y, sparkle)


# ------------------------------------------------------------------ the shared road end
def recolour_road(img, ramp, keep_dim=1.0):
    """Take the plaza / road / chequered end (rows 146..179) of ending_bg.png and move its sunset purple onto
    the scene's own ramp (a list of hex colours, dark -> light).  The red/white kerbs and the lane lines stay."""
    base = np.array(Image.open(os.path.join(OUT, "ending_bg.png")).convert("RGB"))
    R = np.array([rgb(c) for c in ramp])
    for y in range(146, H):
        for x in range(W):
            c = base[y, x].astype(float)
            mx, mn = c.max(), c.min()
            if (c[0] > 200 and c[1] < 110 and c[2] < 130) or mn > 215:          # kerb red / white / lines
                img[y, x] = np.clip(c * keep_dim, 0, 255).astype(np.uint8)
                continue
            if mx < 70 and mn < 60 and c[0] < 50:                               # the black chequer squares
                img[y, x] = np.clip(c * keep_dim, 0, 255).astype(np.uint8)
                continue
            t = float(np.clip((lum(c) - 0.18) / 0.34, 0, 0.999)) * (len(R) - 1)
            i = int(t)
            f = t - i
            img[y, x] = np.clip(R[i] * (1 - f) + R[min(len(R) - 1, i + 1)] * f, 0, 255).astype(np.uint8)


def barrier(img, edge="#2a1a34"):
    """The striped road-end barrier, as in ending_bg.png."""
    bx0, bx1 = BAR_X0, BAR_X1
    block(img, bx0 + 4, 136, bx0 + 6, 146, edge)
    block(img, bx1 - 6, 136, bx1 - 4, 146, edge)
    for y in range(134, 140):
        for x in range(bx0, bx1):
            red = ((x - y) // 5) % 2 == 0
            px(img, x, y, "#e83848" if red else "#fff2f4")
    hline(img, bx0, bx1, 133, edge)
    hline(img, bx0, bx1, 140, edge)
    block(img, bx0, 134, bx0 + 1, 140, edge)
    block(img, bx1 - 1, 134, bx1, 140, edge)


def lamp(img, x, post="#2e1c3e", post_hi="#5a3a62", head="#ffe8a0", core="#fffbe0", halo=(60, 36, 10)):
    block(img, x, 110, x + 2, 146, post)
    block(img, x + 1, 110, x + 2, 146, post_hi)
    block(img, x - 3, 108, x + 5, 110, post)
    block(img, x - 2, 103, x + 4, 108, head)
    block(img, x - 1, 104, x + 3, 107, core)
    for yy in range(98, 114):
        for xx in range(x - 8, x + 10):
            dd = math.hypot((xx - x - 0.5) / 1.1, yy - 105.5)
            if 3.5 < dd < 8 and rng_hash(xx, yy, 21) < (1 - dd / 8) * 0.9 and yy < 108:
                img[yy, xx] = np.minimum(255, img[yy, xx].astype(int) + np.array(halo)).astype(np.uint8)
    block(img, x - 2, 144, x + 4, 146, post)


def wall_rows(img):
    """Clear rows 132..145 first (the scene paints its own wall there)."""
    img[132:146] = img[131]


# ------------------------------------------------------------------ scene A: Neon City
def scene_a():
    img, ground = stage_top(11, 160)
    # a rain-dark waterfront: the skyline's neon in the wet
    reflect(img, HOR, 132, "#0a0820", 0.38, 0.8, ripple=1.8, sparkle="#8ae8ff")
    wall_rows(img)
    # embankment: a neon-edged rail and a dark stone face
    hline(img, 0, W, 132, "#4adcf4")
    hline(img, 0, W, 133, "#10102a")
    block(img, 0, 134, W, 139, "#161230")
    for x in range(4, W, 14):
        block(img, x, 134, x + 2, 139, "#3a2e5e")
    hline(img, 0, W, 135, "#ff4ad0")
    hline(img, 0, W, 138, "#2a2050")
    hline(img, 0, W, 139, "#6a5aa0")
    block(img, 0, 140, W, 146, "#221a44")
    hline(img, 0, W, 140, "#3a2e66")
    for x in range(8, W, 26):
        block(img, x, 141, x + 4, 145, "#2e2458")
        hline(img, x, x + 4, 141, "#ff4ad0" if (x // 26) % 2 else "#4adcf4")
    hline(img, 0, W, 145, "#120c28")
    recolour_road(img, ["#0c0a1e", "#16122e", "#221c40", "#322a58", "#4c4274"], 0.85)
    barrier(img, "#140e24")
    # neon blades and a billboard at the sides, palms in the plaza
    paste(img, "neon_blade_a_lit", 18, 146)
    paste(img, "neon_blade_c_lit", 50, 146)
    paste(img, "neon_blade_d_lit", 306, 146)
    paste(img, "neon_palm_lit", 282, 150)
    lamp(img, 104, "#1c1636", "#4a3a78", "#8af0ff", "#f0ffff", (20, 50, 70))
    lamp(img, 214, "#1c1636", "#4a3a78", "#ff8ae0", "#fff0fa", (70, 20, 60))
    return img


# ------------------------------------------------------------------ scene B: Gold Rush Town
def scene_b():
    img, ground = stage_top(13, 160)
    # dusty ground out to the wall: the far layer's land colour fades to trodden earth, with ruts and stones
    A, B = ground, rgb("#6e4a2a")
    for y in range(HOR, 132):
        v = (y - HOR) / 35.0
        for x in range(W):
            c = A * (1 - v * 0.55) + B * v * 0.55
            r = rng_hash(x // 2, y, 5)
            if r < 0.08:
                c = c * 0.82
            elif r > 0.95:
                c = c * 1.14
            img[y, x] = np.clip(c, 0, 255).astype(np.uint8)
    for y in range(106, 132, 5):                         # wagon ruts running to the horizon
        for x in range(W):
            if (x + y * 3) % 17 < 9 and rng_hash(x, y, 9) < 0.7:
                px(img, x, y, "#6a4426")
    # the main street's buildings across the horizon (they stand on y=118 so the street runs to the wall)
    paste(img, "saloon_lit", 66, 124)
    paste(img, "store_lit", 262, 124)
    wall_rows(img)
    # wooden fence along the boardwalk edge
    hline(img, 0, W, 132, "#c8a068")
    block(img, 0, 133, W, 146, "#7a5230")
    for y in (136, 141):
        hline(img, 0, W, y, "#b4824a")
        hline(img, 0, W, y + 1, "#8a5e34")
        hline(img, 0, W, y + 2, "#4a2e1a")
    for x in range(3, W, 16):
        block(img, x, 132, x + 4, 146, "#a8743e")
        block(img, x + 3, 132, x + 4, 146, "#6a4224")
        hline(img, x, x + 3, 132, "#d8a868")
    hline(img, 0, W, 145, "#3a2414")
    recolour_road(img, ["#3a2418", "#563622", "#74502e", "#946c3c", "#b8905a"], 1.0)
    barrier(img, "#3a2414")
    paste(img, "hitch_rail", 40, 148)
    paste(img, "barrels", 292, 148)
    paste(img, "cactus", 18, 146)
    lamp(img, 104, "#3a2616", "#7a5230", "#ffd890", "#fff4d0", (70, 40, 8))
    lamp(img, 214, "#3a2616", "#7a5230", "#ffd890", "#fff4d0", (70, 40, 8))
    return img


# ------------------------------------------------------------------ scene C: Crystal Lake
def scene_c():
    img, ground = stage_top(14, 160)
    reflect(img, HOR, 132, "#0e2038", 0.2, 0.62, ripple=1.4, sparkle="#e8f8ff")
    # a boat out on the water and lily pads near the shore
    paste(img, "rowboat", 246, 118)
    for (x, y) in ((70, 126), (92, 121), (222, 128), (36, 118)):
        paste(img, "lily", x, y)
    wall_rows(img)
    # reeds along the water's edge, then a mossy fieldstone wall
    hline(img, 0, W, 132, "#bfe4f0")
    block(img, 0, 133, W, 139, "#1a3040")
    for x in range(0, W, 24):
        paste(img, "reeds", x + 8 + int(rng_hash(x, 3) * 8), 140)
    block(img, 0, 139, W, 146, "#56687a")
    hline(img, 0, W, 139, "#8ea6b4")
    for y, off in ((142, 0), (145, 8)):
        hline(img, 0, W, y, "#2e3e50")
    for y in (140, 143):
        for x in range(0 if y == 140 else 7, W, 15):
            block(img, x, y, x + 1, y + 3, "#2e3e50")
    for x in range(W):
        if rng_hash(x, 139, 3) < 0.35:
            px(img, x, 139, "#5a8a58")
            if rng_hash(x, 140, 4) < 0.4:
                px(img, x, 140, "#3c6a46")
    recolour_road(img, ["#0a1424", "#14243a", "#223a56", "#355574", "#52789a"], 0.9)
    barrier(img, "#10202e")
    paste(img, "lake_spruce", 28, 150)
    paste(img, "lake_spruce", 300, 150, flip=True)
    paste(img, "birch", 58, 146)
    paste(img, "campfire_lit", 280, 150)
    lamp(img, 104, "#1c2c3a", "#3e5a70", "#ffd080", "#fff4c8", (60, 44, 12))
    lamp(img, 214, "#1c2c3a", "#3e5a70", "#ffd080", "#fff4c8", (60, 44, 12))
    return img


# ------------------------------------------------------------------ scene D: Starlight Summit
def scene_d():
    img, ground = stage_top(15, 160)
    # a sea of cloud below the terrace, lit from above by the stars
    pal = ["#16164a", "#20205c", "#2c2c72", "#3a3a8a", "#5050a4", "#7470bc", "#a09ad4"]
    P = np.array([rgb(c) for c in pal])
    for y in range(HOR, 132):
        v = (y - HOR) / 35.0
        for x in range(W):
            n = (math.sin(x * 0.045 + y * 0.18) + math.sin(x * 0.11 - y * 0.35 + 1.3) * 0.6 + math.sin(x * 0.021 + 2.0)) / 2.6
            t = 0.35 + 0.35 * n + (1 - v) * 0.12 + (rng_hash(x // 2, y // 2, 4) - 0.5) * 0.12
            i = float(np.clip(t * (len(P) - 1), 0, len(P) - 1.001))
            k = int(i)
            f = i - k
            if f > me.BAYER[y % 4, x % 4]:
                k += 1
            img[y, x] = P[min(k, len(P) - 1)].astype(np.uint8)
    for y in range(HOR + 2, 132, 6):               # wispy streaks
        for x in range(W):
            if (x * 7 + y * 13) % 41 < 4 and rng_hash(x, y, 8) < 0.5:
                px(img, x, y, "#b4aee0")
    # a few stars shining on the cloud tops
    for y in range(HOR, 132):
        for x in range(W):
            if rng_hash(x, y, 91) < 0.0015:
                px(img, x, y, "#fff4d0")
    wall_rows(img)
    # a stone parapet with a balustrade
    hline(img, 0, W, 132, "#8a88c8")
    for x in range(2, W, 12):
        block(img, x, 133, x + 4, 139, "#b8b4e0")
        block(img, x + 3, 133, x + 4, 139, "#7a76b4")
        hline(img, x, x + 4, 133, "#e0dcf8")
    hline(img, 0, W, 139, "#d4d0f0")
    hline(img, 0, W, 140, "#8e8ac4")
    block(img, 0, 141, W, 146, "#4c4a86")
    for y in (143, 145):
        hline(img, 0, W, y, "#363468")
    for y, off in ((141, 0), (144, 12)):
        for x in range(off, W, 24):
            block(img, x, y, x + 1, y + 3 if y == 141 else y + 2, "#363468")
    recolour_road(img, ["#10103a", "#1a1a50", "#2a2a68", "#40408a", "#60609e"], 0.9)
    barrier(img, "#14123a")
    paste(img, "telescope", 30, 150)
    paste(img, "tent_lit", 280, 152)
    lamp(img, 104, "#1e1e46", "#4a4a88", "#ffe488", "#fffbe0", (50, 40, 14))
    lamp(img, 214, "#1e1e46", "#4a4a88", "#ffe488", "#fffbe0", (50, 40, 14))
    return img


# ------------------------------------------------------------------ the trophies
def remap_trophy(spr, ramp, accent, rim=None):
    """Recolour the golden trophy: its gold shades go onto `ramp` (dark -> light), the sun emblem onto `accent`."""
    a = np.array(spr.image()).astype(float)
    R = np.array([rgb(c) for c in ramp])
    out = a.copy()
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3] == 0:
                continue
            c = a[y, x, :3]
            r, g, b = c
            # the sun emblem (orange-ish: strong red, mid green, low blue) and the plinth (purple) are told apart from the gold
            plinth = b > g * 1.15 and b > 60
            sunish = (r > 220 and 90 < g < 190 and b < 90) and not plinth
            if plinth:
                out[y, x, :3] = c * 0.9 + rgb(ramp[0]) * 0.1
                continue
            L = float(lum(c))
            t = float(np.clip((L - 0.08) / 0.8, 0, 0.999)) * (len(R) - 1)
            i = int(t)
            f = t - i
            col = R[i] * (1 - f) + R[min(len(R) - 1, i + 1)] * f
            if sunish:
                col = rgb(accent) * (0.75 + 0.5 * (L - 0.5))
            out[y, x, :3] = np.clip(col, 0, 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def tint_glow(glow_img, rings):
    """The halo has flat rings (dark additive colours); re-colour them."""
    a = np.array(glow_img.convert("RGBA"))
    cols = {}
    out = a.copy()
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3] == 0:
                continue
            key = tuple(a[y, x, :3])
            cols.setdefault(key, None)
    order = sorted(cols, key=lambda k: -sum(int(v) for v in k))          # brightest ring first
    for i, key in enumerate(order):
        cols[key] = hexc(rings[min(i, len(rings) - 1)])
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y, x, 3]:
                out[y, x, :3] = cols[tuple(a[y, x, :3])]
    return Image.fromarray(out, "RGBA")


TROPHIES = {
    # neon: electric blue-white metal with a hot magenta emblem
    "a": (["#10204a", "#1c3c80", "#2c64c0", "#48a0ee", "#8cd8ff", "#d8f6ff", "#ffffff"], "#ff3ad0",
          ["#4a1a60", "#34124a", "#240c36", "#180826", "#0e0418"]),
    # the old gold, with a sheriff-red emblem
    "b": (["#3c1a08", "#6a340c", "#a8601a", "#dc9428", "#ffbe3c", "#ffe27c", "#fffbe0"], "#d83020",
          ["#6a4010", "#4a2c0a", "#341e08", "#221406", "#140a04"]),
    # crystal: ice-blue facets, a moon-pale emblem
    "c": (["#0e2a3c", "#1a4a64", "#2e7a9c", "#58b4d0", "#98e0ee", "#d4f6fa", "#ffffff"], "#fff2b0",
          ["#1a4a6a", "#12344c", "#0c2438", "#08182a", "#040e1a"]),
    # starlight: silvery violet, a gold star emblem
    "d": (["#1a1448", "#2c2478", "#4a40ac", "#7a6ee0", "#aea4f4", "#dcd6ff", "#ffffff"], "#ffd848",
          ["#3a2e7a", "#2a2058", "#1c1640", "#120e2c", "#0a081c"]),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    if not os.path.exists(os.path.join(OUT, "ending_bg.png")):
        raise SystemExit("run make_ending.py first (it writes ending_bg.png)")
    for key, fn in (("a", scene_a), ("b", scene_b), ("c", scene_c), ("d", scene_d)):
        img = fn()
        Image.fromarray(img, "RGB").save(os.path.join(OUT, f"ending_bg_{key}.png"))
        print(f"ending_bg_{key} {img.shape[1]}x{img.shape[0]}")
    trophy = Image.open(os.path.join(OUT, "trophy.png")).convert("RGBA")
    glow = Image.open(os.path.join(OUT, "trophy_glow.png")).convert("RGBA")

    class Wrap:                      # remap_trophy wants something with .image()
        def __init__(self, im):
            self.im = im

        def image(self):
            return self.im

    for key, (ramp, accent, rings) in TROPHIES.items():
        remap_trophy(Wrap(trophy), ramp, accent).save(os.path.join(OUT, f"trophy_{key}.png"))
        tint_glow(glow, rings).save(os.path.join(OUT, f"trophy_glow_{key}.png"))
        print(f"trophy_{key}")
    # contact sheet for a quick look (3x): the four scenes with their trophy dropped in
    sheet = Image.new("RGB", (W * 2, H * 2))
    for i, key in enumerate("abcd"):
        bg = Image.open(os.path.join(OUT, f"ending_bg_{key}.png")).convert("RGBA")
        t = Image.open(os.path.join(OUT, f"trophy_{key}.png"))
        bg.alpha_composite(t, (W // 2 - t.width // 2, 56))
        sheet.paste(bg.convert("RGB"), ((i % 2) * W, (i // 2) * H))
    sheet.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(HERE, "preview_finales.png"))


if __name__ == "__main__":
    main()

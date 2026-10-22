#!/usr/bin/env python3
"""Velvet Cruise -- roadside scenery for Snowcap Pass (node 11) and Crystal Lake (node 13).

SNOWCAP PASS   snow_pine, snow_fir, snow_rock, snow_drift, snowman, snow_dead_tree, snow_log,
               cabin_snow_lit, snow_pole, ice_sign
CRYSTAL LAKE   lake_spruce, birch, lake_rock, reeds, lily, rowboat, campfire_lit, lantern_lit

Pillow + numpy only; reuses the helpers of make_scenery.py / make_routes_a.py (imported, never
modified); writes PNGs into ./out/ (STYLE.md rules: alpha 0/255, bottom row = ground contact,
object centred on its base, sun ahead/right/high, neutral daylight colours, selective dark outline,
no text).  `_lit` sprites: only the light pixels have luma > 200 (the engine makes exactly those
emissive), so their snow stays below that.

Run:  python3 -B make_snow_lake.py            (all sprites + preview_snow_lake.png)
      python3 -B make_snow_lake.py snowman .. (only these)
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
import make_routes_a as ra  # noqa: E402
from make_scenery import Spr, ramp, hx, ball, selout, remove_orphans, bottom_fix, add_layer, leaf_dabs, \
    lit_outline, foliage, clampi, GREYROCK, BARK, WOOD, OUTLINE  # noqa: E402

OUT = ms.OUT

# ---------------------------------------------------------------- palettes
SNOW = ramp("#55648e", "#8294bc", "#b4c4e0", "#dce6f4", "#f8fbff")
SNOW_LIT = ramp("#4a5880", "#7484ac", "#98a8c8", "#aebcd6", "#b8c6dc")     # luma <= 198: never glows
FROST = ramp("#0a1c1e", "#10282a", "#183a36", "#224c44", "#305f52", "#437262", "#5c8a76")  # snowy-mountain fir
SPRUCE = ramp("#06141c", "#0a2028", "#10303a", "#184250", "#20565e", "#2e6c6a", "#468478")  # moonlit lake spruce
SPR_RIM = hx("#7ac4b8")
LAKEROCK = ramp("#1a1e2a", "#2c3242", "#434a5e", "#5e6678", "#7c8496", "#9ca4b4")
BIRCH_L = ramp("#2a3a14", "#44581c", "#68801f", "#8ea626", "#b4c43a", "#d8de62")
BIRCH_B = ramp("#3a3640", "#6a6670", "#9c98a0", "#c8c4c4", "#e8e4dc", "#faf8f0")
REED = ramp("#1a2e14", "#2c4a1c", "#44662a", "#628a36", "#86ac44", "#aac85a")
CATT = ramp("#2a1810", "#4a2c1c", "#6c4228", "#8a5a34")
PAD = ramp("#0e2a1e", "#1a4a2c", "#2c6a36", "#46883e", "#68a64a")
BOAT = ramp("#2a1812", "#4a2a1e", "#6e4430", "#936042", "#b8825a", "#d8a878")
BOATIN = ramp("#1a0e0c", "#2c1a16", "#42281e")
POLE_O = hx("#e86a2a")
POLE_W = hx("#f4eee0")
POLE_K = ramp("#1a1820", "#2e2c36", "#46444e")


# ---------------------------------------------------------------- snow helpers
def snow_cap(s, depth=3, rmp=SNOW, seed=0, lit_from_right=True, drip=0.28):
    """Lay snow on every upward-facing run of the sprite: a band `depth` rows thick that follows the
    top edge of each column run (lit on the right, blue shade on the left, hanging clumps below)."""
    rng = random.Random(seed)
    op = s.opaque().copy()
    H, W = op.shape
    snow = np.zeros_like(op)
    n = len(rmp)
    for x in range(W):
        y = 0
        while y < H:
            if op[y, x] and (y == 0 or not op[y - 1, x]):
                d = depth + (1 if rng.random() < 0.35 else 0) - (1 if rng.random() < 0.2 else 0)
                d = max(1, d)
                end = y
                while end + 1 < H and op[end + 1, x]:
                    end += 1
                for k in range(min(d, end - y + 1)):
                    snow[y + k, x] = True
                    u = x / max(1, W - 1)
                    base = 3 if (u > 0.4 or not lit_from_right) else 2
                    idx = base + (1 if k == 0 and u > 0.35 else 0) - (1 if k == d - 1 and d > 1 else 0)
                    s.puti(x, y + k, rmp[clampi(idx, 1, n - 1)])
                if rng.random() < drip and y + d <= end and d > 1:
                    s.puti(x, y + d, rmp[1])
                y = end + 1
            else:
                y += 1


def snow_tier(lay, top, bot, C, hb, seed):
    """Snow lying on one conifer tier: a white rind along both sloping flanks (blue shade on the left,
    bright on the sunward right) with a ragged inner border, and the tier's crown fully white."""
    rng = random.Random(seed)
    op = lay.opaque().copy()
    H, W = op.shape
    noise = [rng.random() for _ in range(H * 3)]
    for y in range(H):
        f = (y - top) / max(1.0, bot - top)
        if f < 0 or f > 0.93:
            continue
        half = 0.6 + hb * max(0.0, min(1.0, f)) ** 0.8
        for x in range(W):
            if not op[y, x]:
                continue
            dx = x + 0.5 - C
            e = half - abs(dx)
            rind = 2.6 + 2.6 * noise[(y * 3 + (x > C)) % len(noise)] + 1.4 * (1 - f)
            if e < rind or f < 0.16:
                u = dx / max(hb, 1)
                idx = 4 if (u > 0.1 and e < rind * 0.5) else (3 if u > -0.3 else 2)
                if e > rind - 1.2 and f >= 0.16:
                    idx = max(1, idx - 1)
                lay.puti(x, y, SNOW[idx])


def load(name):
    im = np.array(Image.open(os.path.join(OUT, name + ".png")).convert("RGBA"))
    s = Spr(im.shape[1], im.shape[0])
    s.a = im.copy()
    return s


def luma(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


# ---------------------------------------------------------------- conifers
def conifer(w, h, tiers, P, snow, seed, trunk_top, rim=None):
    """Stacked drooping conical tiers (see make_routes_a.pine); `snow` lays a cap on each tier."""
    s = Spr(w, h)
    C = w / 2.0
    for y in range(trunk_top, h):
        f = max(0.0, (y - (h - 6)) / 5.0)
        half = 2.3 + 1.4 * f
        xl = int(math.floor(C - half + 0.5))
        xr = int(math.floor(C + half + 0.5)) - 1
        for x in range(xl, xr + 1):
            u = (x + 0.5 - C) / half
            b = 1 if u < -0.4 else (2 if u < 0.3 else 3)
            if x == xl:
                b = 0
            s.puti(x, y, BARK[b])
    n = len(P)
    rng = random.Random(seed)
    for k, (top, bot, hb) in enumerate(tiers):
        lay = Spr(w, h)
        teeth = [rng.choice((1, 2, 2, 3)) for _ in range(w)]
        for y in range(top - 1, bot + 4):
            f = clampi((y - top) / (bot - top), 0.0, 1.0)
            half = 0.6 + hb * f ** 0.8
            for x in range(int(C - half) - 1, int(C + half) + 2):
                dx = x + 0.5 - C
                if abs(dx) > half:
                    continue
                q = abs(dx) / max(hb, 1)
                ybot = bot - 3.0 * q * q + 1.5 * q ** 3
                tooth = teeth[x] if (x % 3) != 1 else 0
                if y > ybot + tooth or y < top:
                    continue
                u = dx / max(half, 1)
                t = 0.52 + 0.34 * u + 0.18 * (1 - f) - 0.1 * (y > ybot - 1)
                b = clampi(int(t * (n - 1)) + 1, 1, n - 1)
                if y > ybot:
                    b = clampi(b - 1, 1, n - 1)
                lay.puti(x, y, P[b])
        leaf_dabs(lay, P, seed=40 + k, step=4, hi_min=2, prob=0.9)
        if snow:
            snow_tier(lay, top, bot, C, hb, seed + k)
        ra.cast_shadow(s, lay, [P, BARK], rows=3, sh=2)
        add_layer(s, lay)
    selout(s, [P, BARK, SNOW], dirs=((0, 1), (-1, 0)))
    if rim is not None:
        lit_outline(s, [P], idx=3)
    remove_orphans(s)
    bottom_fix(s)
    return s


def snow_pine():
    tiers = [(80, 112, 27), (65, 97, 24), (50, 81, 21), (36, 65, 17), (23, 50, 13), (11, 34, 9), (2, 20, 5.5)]
    return conifer(58, 124, tiers, FROST, True, 5, 104)


def snow_fir():
    tiers = [(46, 66, 17), (34, 54, 14), (22, 42, 11), (11, 30, 8), (2, 18, 5)]
    return conifer(40, 74, tiers, FROST, True, 9, 64)


def lake_spruce():
    tiers = [(82, 114, 28), (66, 98, 25), (51, 82, 22), (37, 66, 18), (24, 51, 14), (12, 35, 10), (2, 21, 6)]
    s = conifer(60, 126, tiers, SPRUCE, False, 7, 106)
    # moonlit rim: a pale teal edge on the sunward (right/top) silhouette
    op = s.opaque()
    up = np.zeros_like(op); up[1:, :] = op[:-1, :]
    rt = np.zeros_like(op); rt[:, :-1] = op[:, 1:]
    edge = op & (~rt | ~up)
    for y, x in zip(*np.nonzero(edge)):
        c = tuple(int(v) for v in s.a[y, x, :3])
        if c in SPRUCE and SPRUCE.index(c) >= 3 and (x + y) % 2 == 0:
            s.puti(x, y, SPR_RIM)
    return s


# ---------------------------------------------------------------- snowy things
def snow_rock():
    s = load("rock_dark")
    big = Spr(s.w + 6, s.h + 4)
    big.paste(s, 3, 4)
    snow_cap(big, depth=7, seed=2, drip=0.3)
    selout(big, [SNOW, GREYROCK], dirs=((0, 1), (-1, 0)))
    remove_orphans(big)
    bottom_fix(big)
    return big


def snow_dead_tree():
    s = load("dead_tree")
    snow_cap(s, depth=2, seed=3, drip=0.15)
    remove_orphans(s)
    return s


def snow_log():
    s = load("log")
    snow_cap(s, depth=3, seed=4, drip=0.25)
    return s


def cabin_snow_lit():
    s = load("cabin_lit")
    big = Spr(s.w, s.h + 4)
    big.paste(s, 0, 4)
    # snow only where it lies on a roof: skip anything below the eaves (the porch floor etc.)
    snow_cap(big, depth=6, rmp=SNOW_LIT, seed=5, drip=0.2)
    bottom_fix(big)
    return big


def snow_drift():
    w, h = 54, 20
    s = Spr(w, h)
    rng = random.Random(8)
    ph = rng.uniform(0, 6)
    prof = []
    for x in range(w):
        u = (x + 0.5) / w * 2 - 1
        hh = h * (1 - abs(u) ** 2.6) ** 0.8 * (0.94 + 0.06 * math.sin(x * 0.3 + ph))
        prof.append(max(0, int(round(hh))))
    for x in range(w):
        for k in range(prof[x]):
            y = h - 1 - k
            top = prof[x] - 1 - k   # 0 at the crest
            u = x / (w - 1)
            slope = (prof[min(w - 1, x + 1)] - prof[max(0, x - 1)]) * 0.5   # >0: rising to the right (left flank)
            idx = 3 - (1 if slope > 1.6 else 0) + (1 if slope < -1.6 and top < 2 else 0)
            if top == 0:
                idx = 4 if u > 0.3 else 3
            if k < 2:
                idx = min(idx, 2)
            if (x + 2 * y) % 9 == 0 and top > 2 and top < 6:
                idx = max(1, idx - 1)          # wind ripples
            s.puti(x, y, SNOW[clampi(idx, 1, 4)])
    selout(s, [SNOW], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return s


def snowman():
    w, h = 30, 44
    s = Spr(w, h)
    cx = 15
    ball(s, cx, 36, 11, 8.5, SNOW, bias=0.05)
    ball(s, cx, 24, 8.2, 7, SNOW, bias=0.05)
    ball(s, cx, 13.5, 6, 5.5, SNOW, bias=0.05)
    for (x, y) in ((cx - 2, 11.5), (cx + 2, 11.5)):
        s.put(x, y, hx("#1a1620"))
    for i, x in enumerate(range(cx, cx + 5)):
        s.put(x, 14 + (i > 2), hx("#e8742a"))
    for dy in range(1, 3):
        for x in range(cx - 7, cx + 8):
            if s.op(x, 19 + dy):
                s.puti(x, 19 + dy, hx("#c8283a") if (x + dy) % 4 else hx("#8a1a2a"))
    for x in range(cx + 3, cx + 8):
        s.puti(x, 21 + (x - cx - 3) // 2, hx("#c8283a"))
    for (x, y) in ((cx, 25), (cx, 29), (cx, 33)):
        s.put(x, y, hx("#1a1620"))
    s.line(cx - 8, 24, cx - 13, 18, BARK[3])
    s.line(cx + 8, 24, cx + 13, 19, BARK[3])
    # a little hat
    s.rect(cx - 4, 7, cx + 4, 8, hx("#2a2634"))
    s.rect(cx - 3, 2, cx + 3, 6, hx("#3a3646"))
    s.rect(cx - 3, 5, cx + 3, 5, hx("#c8283a"))
    selout(s, [SNOW, BARK], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def snow_pole():
    w, h = 10, 60
    s = Spr(w, h)
    for y in range(h):
        for x in range(3, 7):
            u = (x - 3) / 3.0
            c = POLE_K[0 if u < 0.2 else (1 if u < 0.7 else 2)]
            if 8 <= y <= 17 or 26 <= y <= 31:
                c = POLE_O if u > 0.2 else hx("#a8441c")
            s.puti(x, y, c)
    s.rect(4, 36, 5, 40, POLE_W)           # reflector strip
    s.rect(3, 0, 6, 2, SNOW[3])
    s.rect(4, 0, 6, 0, SNOW[4])
    s.rect(2, 57, 7, 59, SNOW[3])           # a small snow heap at the foot
    s.rect(3, 56, 6, 56, SNOW[4])
    s.rect(2, 59, 7, 59, SNOW[2])
    selout(s, [POLE_K, SNOW], dirs=((0, 1), (-1, 0)))
    return s


def ice_sign():
    """Warning triangle on a post: red rim, pale face, a blue snowflake -- 'icy patch ahead'."""
    w, h = 24, 52
    s = Spr(w, h)
    cx = 11
    for y in range(26, h):                       # post
        for x in range(cx - 1, cx + 2):
            u = x - (cx - 1)
            s.puti(x, y, POLE_K[0 if u == 0 else (1 if u == 1 else 2)])
    s.rect(cx - 3, h - 3, cx + 3, h - 1, SNOW[3])   # snow heap at the foot
    s.rect(cx - 2, h - 4, cx + 2, h - 4, SNOW[4])
    top, bot = 2, 29                               # triangle rows
    for y in range(top, bot + 1):
        half = int(round(0.5 + (y - top) * 10.5 / (bot - top)))
        for x in range(cx - half, cx + half + 1):
            edge = (x - (cx - half)) < 2 or ((cx + half) - x) < 2 or y > bot - 3
            s.puti(x, y, hx("#c8283a") if edge else hx("#eef2fa"))
            if edge and x > cx:
                s.puti(x, y, hx("#e8483c"))
    fl = hx("#3a68b8")                             # snowflake
    cy = 18
    for d in range(-5, 6):
        s.puti(cx + d, cy, fl)
        s.puti(cx, cy + d, fl)
    for d in range(-3, 4):
        s.puti(cx + d, cy + d, fl)
        s.puti(cx + d, cy - d, fl)
    s.puti(cx, cy, hx("#8cb4f0"))
    selout(s, [POLE_K], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


# ---------------------------------------------------------------- crystal lake
def lake_rock():
    w, h = 44, 30
    s = Spr(w, h)
    ball(s, 22, 19, 19, 10.5, LAKEROCK, bias=0.04, gamma=1.1)
    ball(s, 12, 18, 9, 8, LAKEROCK, bias=-0.02)
    ball(s, 31, 21, 8, 6.5, LAKEROCK, bias=0.08)
    rng = random.Random(11)
    for x in range(8, 36):          # moss on top, a dithered lower edge
        top = None
        for y in range(h):
            if s.op(x, y):
                top = y
                break
        if top is None:
            continue
        for k in range(rng.choice((2, 3, 3))):
            if s.op(x, top + k):
                s.puti(x, top + k, ra.MOSS[3 if x > 20 else 2] if k < 2 else ra.MOSS[1])
    for (x, y) in ((16, 20), (27, 23), (22, 25)):
        s.puti(x, y, LAKEROCK[1])       # cracks
    selout(s, [LAKEROCK, ra.MOSS], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def reeds():
    w, h = 34, 46
    s = Spr(w, h)
    rng = random.Random(13)
    blades = [(8, 30, -5), (12, 38, -2), (16, 44, 0), (20, 40, 2), (24, 34, 5), (27, 24, 7), (5, 22, -7), (14, 30, -3), (22, 28, 3)]
    for (bx, ln, lean) in blades:
        pts = []
        for i in range(ln):
            t = i / ln
            pts.append((bx + lean * t * t * 1.4, h - 1 - i))
        for i, (x, y) in enumerate(pts):
            t = i / ln
            c = REED[clampi(int(1 + 4 * (0.3 + 0.7 * t) * (0.6 + 0.4 * (bx % 3) / 2)), 1, 5)]
            s.put(x, y, c)
            if i < ln * 0.6:
                s.put(x + 1, y, REED[clampi(int(2 + 3 * t), 1, 5)])
    for (hx_, hy) in ((16, 4), (24, 12), (8, 18)):    # cattail heads
        for k in range(7):
            s.rect(hx_, hy + k, hx_ + 1, hy + k, CATT[1 + (k % 3 == 0) + (hx_ > 14)])
        s.puti(hx_, hy - 1, CATT[0])
        s.puti(hx_ + 1, hy + 7, CATT[0])
    selout(s, [REED, CATT], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def lily():
    w, h = 46, 12
    s = Spr(w, h)
    rng = random.Random(15)
    pads = [(9, 6, 8, 3.4), (23, 4.5, 7, 3), (36, 7, 8, 3.4), (28, 9, 5, 2.4), (14, 9.5, 5, 2.2)]
    for (cx, cy, rx, ry) in pads:
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                nx, ny = (x - cx) / rx, (y - cy) / ry
                if nx * nx + ny * ny > 1:
                    continue
                if abs(ny) < 0.18 and nx > 0.1:      # the notch
                    continue
                b = 3 if (nx + (-ny) * 0.6) > 0.1 else 2
                if ny > 0.55:
                    b = 1
                s.puti(x, y, PAD[b + (1 if (nx > 0.3 and ny < -0.2) else 0)])
    for (fx, fy) in ((23, 4), (36, 6)):
        s.puti(fx, fy, hx("#fff0f4"))
        s.puti(fx - 1, fy, hx("#f4a0c0"))
        s.puti(fx + 1, fy, hx("#f4a0c0"))
        s.puti(fx, fy - 1, hx("#f4a0c0"))
    selout(s, [PAD], dirs=((0, 1), (-1, 0)))
    bottom_fix(s)
    return s


def rowboat():
    w, h = 58, 26
    s = Spr(w, h)
    cx = 29
    # hull seen from behind and above: an elliptical rim, a darker inside, a tapering body under it
    for y in range(h):
        for x in range(w):
            nx = (x + 0.5 - cx) / 25.0
            if y < 12:
                ny = (y - 6.0) / 6.0
                d = nx * nx + ny * ny
                if d <= 1.0:
                    if d > 0.72:
                        s.puti(x, y, BOAT[4 if nx > 0 else 3])       # rim
                    else:
                        s.puti(x, y, BOATIN[1 if y < 8 else 2])
            else:
                depth = (y - 12) / 9.0
                half = 25.0 * (1 - depth ** 1.5 * 0.5)
                if abs(x + 0.5 - cx) <= half and y < 22:
                    u = (x + 0.5 - cx) / max(half, 1)
                    b = 4 if u > 0.45 else (3 if u > -0.2 else 2)
                    if y in (16, 17) or y in (21,):
                        b = max(1, b - 2)         # planking seams
                    s.puti(x, y, BOAT[b])
    s.rect(cx - 17, 4, cx + 17, 5, BOAT[3])       # thwart
    s.rect(cx - 17, 5, cx + 17, 5, BOAT[2])
    s.line(cx + 14, 7, cx + 27, 1, BOAT[4])       # an oar resting across
    s.line(cx + 14, 8, cx + 27, 2, BOAT[2])
    s.rect(cx + 26, 0, cx + 28, 3, BOAT[5])
    selout(s, [BOAT, BOATIN], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def campfire_lit():
    w, h = 30, 28
    s = Spr(w, h)
    cx = 15
    for i in range(9):                              # ring of stones
        a = math.pi * (0.1 + 0.8 * i / 8)
        x, y = cx + math.cos(a) * 11, 22 + math.sin(a) * 3.2
        ball(s, x, y, 3.2, 2.4, GREYROCK, bias=0.05)
    s.line(cx - 8, 25, cx + 5, 20, WOOD[2])         # two crossed logs
    s.line(cx - 8, 24, cx + 5, 19, WOOD[3])
    s.line(cx + 8, 25, cx - 5, 20, WOOD[1])
    s.line(cx + 8, 24, cx - 5, 19, WOOD[2])
    for (fx, fy, hh, hw) in ((cx, 19, 14, 5.0), (cx - 4, 20, 9, 3.2), (cx + 4, 20, 10, 3.4)):
        for dy in range(hh):
            t = dy / hh
            half = hw * (1 - t) ** 0.7 * (0.5 + 0.5 * math.sin(math.pi * min(1, t * 1.5 + 0.2)))
            for x in range(int(fx - half), int(fx + half) + 1):
                u = abs(x - fx) / max(half, 0.8)
                col = hx("#ff8a30") if t > 0.45 or u > 0.55 else (hx("#ffd060") if u > 0.25 else hx("#fff2b0"))
                if t > 0.8:
                    col = hx("#ff6a28")
                s.puti(x, fy - dy, col)
    selout(s, [GREYROCK, WOOD], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def lantern_lit():
    w, h = 18, 84
    s = Spr(w, h)
    for y in range(14, h):
        for x in range(7, 11):
            u = (x - 7) / 3.0
            s.puti(x, y, BARK[1 if u < 0.3 else (2 if u < 0.7 else 3)])
    s.rect(5, 78, 12, 83, BARK[2])                  # a stone footing
    s.rect(5, 78, 12, 78, BARK[4])
    s.rect(2, 20, 15, 20, BARK[2])                  # cross arm with the lantern hanging from it
    s.rect(2, 21, 15, 21, BARK[0])
    s.rect(3, 13, 14, 14, BARK[1])                  # roof
    s.rect(4, 12, 13, 12, BARK[3])
    for y in range(15, 20):
        for x in range(4, 14):
            s.puti(x, y, hx("#ffe488") if 5 <= x <= 12 else BARK[1])
    s.rect(7, 16, 10, 18, hx("#fff4c0"))
    s.rect(4, 19, 13, 19, BARK[1])
    selout(s, [BARK], dirs=((0, 1), (-1, 0)))
    bottom_fix(s)
    return s


def birch():
    w, h = 60, 104
    s = Spr(w, h)
    cx = 30
    rng = random.Random(17)
    # trunk: a slim, slightly leaning white stem with dark bands
    def tx(y):
        return cx + 2.2 * math.sin(y * 0.07) + (h - y) * 0.015
    for y in range(26, h):
        half = 3.1 + 1.8 * max(0.0, (y - 92) / 12.0)
        c = tx(y)
        for x in range(int(math.floor(c - half)), int(math.ceil(c + half))):
            u = (x + 0.5 - c) / half
            b = 2 if u < -0.4 else (4 if u < 0.35 else 5)
            if x == int(math.floor(c - half)):
                b = 1
            s.puti(x, y, BIRCH_B[b])
    for y in range(40, h - 6, 7):                   # the dark bark marks
        c = tx(y)
        x0 = int(c - 2 + rng.randint(-1, 1))
        s.rect(x0, y, x0 + rng.randint(1, 3), y, BIRCH_B[0])
        if rng.random() < 0.5:
            s.puti(x0 + 1, y + 1, BIRCH_B[1])
    # boughs
    for (ox, oy, ex, ey) in ((0, 52, -13, 38), (0, 44, 13, 31), (0, 62, 10, 52), (0, 36, -5, 22)):
        s.line(tx(oy), oy, tx(oy) + ex, ey, BIRCH_B[3])
        s.line(tx(oy) + 1, oy, tx(oy) + ex + 1, ey, BIRCH_B[2])
    # canopy: airy clusters of yellow-green leaves
    blobs = [(cx - 14, 36, 9, 6.5), (cx + 15, 29, 10, 7), (cx - 4, 22, 11, 8.5), (cx + 11, 46, 8, 5.5),
             (cx - 15, 51, 7, 5), (cx + 2, 12, 8.5, 7.5), (cx + 7, 36, 9, 6.5, 0.05), (cx - 9, 27, 8, 6)]
    foliage(s, blobs, BIRCH_L, seed=3, bias=0.0, lobes=9, lobe_amp=0.2, ao=0.18)
    selout(s, [BIRCH_L, BIRCH_B], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def wx_snow():
    """12x12 weather icon for the course map / HUD: a snowflake on a dark disc (like the other wx_ icons)"""
    rows = [
        "....aaaa....",
        "..aabbbbaa..",
        ".abbbcbbbba.",
        "abbcbbcbbcba",
        "abbbcccccbba",
        "abcbcdddcbca",
        "abbbcccccbba",
        "abbcbbcbbcba",
        ".abbbcbbbba.",
        "..aabbbbaa..",
        "....aaaa....",
        "............",
    ]
    leg = {"a": "#2a1a2e", "b": "#5a78c8", "c": "#e8f0ff", "d": "#ffffff"}
    s = Spr(12, 12)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                s.puti(x, y, hx(leg[ch]))
    return s


SPRITES = {
    "snow_pine": snow_pine, "snow_fir": snow_fir, "snow_rock": snow_rock, "snow_drift": snow_drift,
    "snowman": snowman, "snow_dead_tree": snow_dead_tree, "snow_log": snow_log,
    "cabin_snow_lit": cabin_snow_lit, "snow_pole": snow_pole, "ice_sign": ice_sign,
    "lake_spruce": lake_spruce, "birch": birch, "lake_rock": lake_rock, "reeds": reeds, "lily": lily,
    "rowboat": rowboat, "campfire_lit": campfire_lit, "lantern_lit": lantern_lit,
    "wx_snow": wx_snow,
}


def check(name, s):
    a = s.a
    if name.startswith('wx_'):
        return
    assert set(np.unique(a[..., 3])) <= {0, 255}, f"{name}: alpha must be 0/255"
    assert (a[-1, :, 3] > 0).any(), f"{name}: bottom row must touch the ground"
    if name.endswith("_lit"):
        # nothing but the light itself may glow (luma > 200)
        for c in {tuple(int(v) for v in a[y, x, :3]) for y, x in zip(*np.nonzero(a[..., 3]))}:
            if luma(c) > 200 and c not in ((255, 228, 136), (255, 244, 192), (255, 208, 96), (255, 242, 176), (255, 138, 48)):
                print(f"  note: {name}: bright colour {c} will glow")


def main():
    names = sys.argv[1:] or list(SPRITES)
    made = []
    for n in names:
        s = SPRITES[n]()
        check(n, s)
        s.save(n)
        made.append((n, s))
        print(f"{n} {s.w}x{s.h}")
    # preview sheet: 3x on a snowy blue-grey and a dark lake-night background
    for tag, bgc in (("snow", (178, 190, 214)), ("lake", (30, 44, 70))):
        sel = [m for m in made if (m[0] in SPRITES) and ((m[0].startswith(("snow", "cabin")) or m[0] == "snowman") == (tag == "snow"))]
        if not sel:
            continue
        Wd = sum(s.w + 8 for _, s in sel) + 8
        Hd = max(s.h for _, s in sel) + 8
        sheet = Image.new("RGBA", (Wd, Hd), bgc + (255,))
        x = 8
        for _, s in sel:
            im = Image.fromarray(s.a, "RGBA")
            sheet.paste(im, (x, Hd - 4 - s.h), im)
            x += s.w + 8
        sheet.resize((Wd * 3, Hd * 3), Image.NEAREST).save(os.path.join(HERE, f"preview_{tag}.png"))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Finish-line ending scene for Velvet Cruise (style: tools/art/STYLE.md).

Writes into tools/art/ending/out/ (then run tools/pack_assets.py):
  ending_bg.png        320x180 opaque: the very end of the coast road at sunset - a huge sun
                       sinking into the sea, headlands, a seawall plaza, palms, lamps, bunting,
                       and a striped road-end barrier where the road runs out.
  trophy.png           the golden sunset trophy (sun emblem, no text)
  trophy_glow.png      additive halo around it (drawn with an additive blit)
  cheer_driver_0/1     the driver seen from behind, arms up (two waving frames)
  cheer_lady_0/1       the blonde passenger seen from behind, arms up, hair swinging

Run:  python3 make_ending.py
"""
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
sys.path.insert(0, os.path.join(HERE, "..", "vehicles"))
import make_vehicles as mv  # noqa: E402
import make_tumble as mt     # noqa: E402
from make_vehicles import Canvas, C  # noqa: E402

W, H = 320, 180
HOR = 96          # sea horizon row
SUN = (160, 95, 41)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)], np.uint8)


def banded(img, mask, u, pal):
    """Paint pixels in mask from palette by continuous index u (dithered between bands)."""
    ys, xs = np.nonzero(mask)
    uu = np.clip(u[ys, xs], 0, len(pal) - 1.0001)
    i = np.floor(uu).astype(int)
    f = uu - i
    i = np.where(f > BAYER[ys % 4, xs % 4], i + 1, i)
    i = np.clip(i, 0, len(pal) - 1)
    P = np.array([hexc(p) for p in pal])
    img[ys, xs] = P[i]


def rng_hash(x, y, s=0):
    h = (x * 374761393 + y * 668265263 + s * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296.0


def make_bg():
    img = np.zeros((H, W, 3), np.uint8)
    Y, X = np.mgrid[0:H, 0:W]
    sx, sy, sr = SUN
    # ---------------------------------------------------------------- sky
    sky_pal = ["#1c0f3c", "#2a1354", "#431767", "#661d72", "#8e246e", "#ba3268", "#de4a5e",
               "#f56c50", "#ff9248", "#ffb44e", "#ffd264"]
    d = np.sqrt(((X - sx) / 1.7) ** 2 + ((Y - sy) * 1.15) ** 2)
    u = (Y / HOR) ** 1.05 * 8.2 + 2.6 * np.clip(1 - d / 95, 0, 1) ** 1.6
    banded(img, Y < HOR, u, sky_pal)
    # stars in the dark top of the sky
    for y in range(0, 34):
        for x in range(W):
            r = rng_hash(x, y, 7)
            if r < 0.006 * (1 - y / 34):
                img[y, x] = hexc("#fff4ff" if r < 0.002 else "#c8a8f0")
    # ---------------------------------------------------------------- sun (synthwave slices)
    sun_pal = ["#fffbd0", "#fff09a", "#ffdc68", "#ffc24a", "#ffa040", "#ff7e3c", "#ff6040"]
    disk = ((X - sx) ** 2 + (Y - sy) ** 2 <= sr * sr) & (Y < HOR)
    gaps = np.zeros_like(disk)
    for gy, gh in ((72, 1), (78, 1), (83, 2), (88, 2), (93, 3)):
        gaps |= (Y >= gy) & (Y < gy + gh)
    ring = ((X - sx) ** 2 + (Y - sy) ** 2 <= (sr + 2) ** 2) & ~disk & (Y < HOR)
    banded(img, ring & (rng_hash(1, 1) >= 0), np.full((H, W), 9.4), sky_pal)
    banded(img, disk & ~gaps, (Y - (sy - sr)) / (sr + 3) * (len(sun_pal) - 1), sun_pal)
    # ---------------------------------------------------------------- thin clouds
    def streak(y0, xa, xb, top, lit, thick=2):
        for x in range(xa, xb):
            k = (x - xa) / max(1, xb - xa)
            t = thick if 0.12 < k < 0.88 else 1
            off = int(round(math.sin(x * 0.07 + y0) * 0.6))
            for j in range(t):
                img[y0 + off + j, x] = hexc(top if j < t - 1 or t == 1 else lit)
            if rng_hash(x, y0, 3) < 0.25:
                img[y0 + off + t, x] = hexc(lit)
    streak(30, 18, 120, "#5a1c6e", "#a43468")
    streak(44, 196, 306, "#6a1e70", "#c4406a", 2)
    streak(57, 60, 150, "#8a2468", "#f06a58")
    streak(66, 178, 262, "#a02e66", "#ff8a54", 2)
    streak(76, 112, 214, "#c63c62", "#ffb860", 1)
    # ---------------------------------------------------------------- headlands
    def land(x0, x1, peak_x, peak_h, seed, col, rim):
        for x in range(x0, x1):
            k = abs(x - peak_x) / max(1, (x1 - x0) / 2)
            h = peak_h * max(0.0, 1 - k ** 1.4) + (rng_hash(x // 3, seed) - 0.5) * 2.2
            top = int(HOR - max(0, h))
            if top < HOR:
                img[top:HOR, x] = hexc(col)
                img[top, x] = hexc(rim)
    land(-40, 118, 4, 30, 1, "#2a1242", "#8a2e66")
    land(-10, 70, 20, 21, 2, "#1e0e34", "#6a2460")
    land(250, 316, 286, 9, 3, "#2e1446", "#b0406a")
    # tiny lighthouse on the far headland
    img[79:86, 36:39] = hexc("#f0d8e0")
    img[81, 36:39] = hexc("#c03050")
    img[77:79, 36:39] = hexc("#ffe890")
    # ---------------------------------------------------------------- sea
    sea_pal = ["#2a1a50", "#3a1e5e", "#542468", "#78306e", "#a8406c", "#d65a64", "#f88058", "#ffa858"]
    sea = (Y >= HOR) & (Y < 132)
    u = np.clip(1 - (Y - HOR) / 36.0, 0, 1) ** 1.6 * 7.0
    banded(img, sea, u, sea_pal)
    # sun reflection: broken horizontal dashes under the sun
    for y in range(HOR, 132):
        hw = 12 + (y - HOR) * 1.25
        x = int(sx - hw)
        while x < sx + hw:
            r = rng_hash(x, y, 11)
            ln = 2 + int(r * 6)
            dd = abs(x + ln / 2 - sx) / hw
            if r < 0.62 * (1 - dd * 0.8):
                c = "#fff2a8" if dd < 0.25 and r < 0.3 else "#ffc860" if dd < 0.55 else "#ff9050"
                img[y, max(0, x):min(W, x + ln)] = hexc(c)
            x += ln + 1 + int(rng_hash(x, y, 12) * 4)
    # ---------------------------------------------------------------- shore + seawall
    for x in range(W):
        img[132, x] = hexc("#ffe0d0" if rng_hash(x // 3, 132) < 0.7 else "#d07a80")
    img[133:135] = hexc("#8a4a66")
    img[135:139] = hexc("#b86a6e")
    img[135, ::5] = hexc("#c87a74")
    wall_top, wall_face = hexc("#f6cdb6"), hexc("#a8667e")
    img[139] = wall_top
    img[140:146] = wall_face
    img[140] = hexc("#c88092")
    img[145] = hexc("#6e3a62")
    for x in range(6, W, 26):
        img[137:146, x:x + 4] = hexc("#e0aab0")
        img[137, x:x + 4] = hexc("#fff0e0")
        img[145, x:x + 4] = hexc("#7a4466")
    # ---------------------------------------------------------------- plaza + the last of the road
    pave_a, pave_b = hexc("#7e5c72"), hexc("#77566b")
    for y in range(146, H):
        for x in range(W):
            img[y, x] = pave_a if ((x // 10) + (y // 5)) % 2 else pave_b
    img[146] = hexc("#5e3a5a")
    road_l = lambda y: 132 - (y - 146) * (132 - 52) / (H - 146)
    road_r = lambda y: 188 + (y - 146) * (268 - 188) / (H - 146)
    for y in range(146, H):
        xl, xr = road_l(y), road_r(y)
        rw = (xr - xl) * 0.06
        for x in range(int(xl - rw), int(xr + rw) + 1):
            if x < 0 or x >= W:
                continue
            if x < xl or x > xr:
                band = (y // 3) % 2
                img[y, x] = hexc("#e8404a" if band else "#f6e6ea")
            else:
                img[y, x] = hexc("#4c3e60" if (y // 4) % 2 else "#48395a")
        for lx in (xl + (xr - xl) * 0.04, xr - (xr - xl) * 0.04):
            img[y, int(lx)] = hexc("#f0d8e6")
        if (y // 5) % 2 == 0:
            cx = int((xl + xr) / 2)
            img[y, cx - 1:cx + 1] = hexc("#f0d8e6")
    # chequered line at the very end of the road
    for y in range(147, 151):
        xl, xr = road_l(y), road_r(y)
        n = 12
        for k in range(n):
            a = int(xl + (xr - xl) * k / n)
            b = int(xl + (xr - xl) * (k + 1) / n)
            img[y, a:b] = hexc("#f6f0f4" if (k + y) % 2 else "#2a2238")
    # ---------------------------------------------------------------- lamps, palms, bunting, barrier
    def lamp(x):
        img[110:146, x:x + 2] = hexc("#2e1c3e")
        img[110:146, x + 1] = hexc("#5a3a62")
        img[108:110, x - 3:x + 5] = hexc("#2e1c3e")
        img[103:108, x - 2:x + 4] = hexc("#ffe8a0")
        img[104:107, x - 1:x + 3] = hexc("#fffbe0")
        for yy in range(98, 114):
            for xx in range(x - 8, x + 10):
                dd = math.hypot((xx - x - 0.5) / 1.1, yy - 105.5)
                if 3.5 < dd < 8 and rng_hash(xx, yy, 21) < (1 - dd / 8) * 0.9 and yy < 108:
                    img[yy, xx] = np.minimum(255, img[yy, xx].astype(int) + np.array([60, 36, 10])).astype(np.uint8)
        img[144:146, x - 2:x + 4] = hexc("#2e1c3e")
    lamp(104)
    lamp(214)

    def palm(base_x, base_y, top_x, top_y, size, lit_side):
        trunk_d, trunk_l, frond_d, frond_l = hexc("#1e0e2c"), hexc("#4a2648"), hexc("#160a24"), hexc("#3a1c44")
        rim = hexc("#ff8a5a")
        n = int(math.hypot(top_x - base_x, top_y - base_y))
        for i in range(n + 1):
            t = i / max(1, n)
            # gentle curve
            x = base_x + (top_x - base_x) * t + math.sin(t * math.pi) * (top_x - base_x) * 0.35
            y = base_y + (top_y - base_y) * t
            w = size * (1.0 - 0.45 * t)
            for xx in range(int(x - w), int(x + w) + 1):
                if 0 <= xx < W and 0 <= int(y) < H:
                    side = (xx - x) * lit_side
                    img[int(y), xx] = rim if side > w - 1.2 else trunk_l if side > 0 else trunk_d
            if i % 4 == 0:
                for xx in range(int(x - w), int(x + w) + 1):
                    if 0 <= xx < W and 0 <= int(y) < H:
                        img[int(y), xx] = trunk_d
        cx, cy = top_x, top_y

        def put(xx, yy, c):
            xx, yy = int(round(xx)), int(round(yy))
            if 0 <= xx < W and 0 <= yy < H:
                img[yy, xx] = c

        # fronds: a curved spine with leaflets hanging from it, rim-lit on the sun side
        angs = [-2.75, -2.25, -1.75, -1.3, -0.85, -0.38, 0.12, 2.95, 0.55]
        for k, ang in enumerate(angs):
            L = size * (10.5 + (k % 3) * 1.8)
            droop = 0.75 if abs(math.cos(ang)) > 0.5 else 0.35
            steps = int(L * 1.6)
            dirx = math.cos(ang)
            for i in range(steps):
                t = i / steps
                x = cx + dirx * L * t
                y = cy + math.sin(ang) * L * t * 0.6 + (t ** 2) * L * droop
                sunny = dirx * lit_side > 0.15
                # leaflets: hang down and back toward the trunk
                ll = size * (3.4 * (1 - t * 0.55)) + 1
                if i % 2 == 0:
                    for j in range(int(ll)):
                        q = j / max(1, ll)
                        put(x - dirx * j * 0.45, y + 1 + j * 0.85, frond_d if q > 0.2 or not sunny else frond_l)
                put(x, y, frond_l)
                put(x, y + 1, frond_d)
                if sunny and t > 0.08:
                    put(x, y - 1, rim if t > 0.3 else frond_l)
        for i in range(-2, 3):
            for j in range(-1, 3):
                put(cx + i, cy + j, hexc("#2a1430"))
        put(cx - 1, cy + 3, hexc("#3a2030"))
        put(cx + 1, cy + 3, hexc("#3a2030"))
    palm(64, 146, 58, 104, 1.6, 1)
    palm(258, 146, 264, 106, 1.6, -1)
    palm(18, 182, 40, 40, 3.2, 1)
    palm(304, 182, 282, 46, 3.2, -1)

    def bunting(x0, y0, x1, y1, sag, seed):
        cols = ["#ff4a5a", "#ffd040", "#4ad0ff", "#ff7ac8", "#7cf06a"]
        n = int(abs(x1 - x0))
        for i in range(n):
            t = i / n
            x = int(x0 + (x1 - x0) * t)
            y = int(y0 + (y1 - y0) * t + math.sin(t * math.pi) * sag)
            img[y, x] = hexc("#2a1a34")
            if i % 7 == 3:
                c = hexc(cols[(i // 7 + seed) % len(cols)])
                for j in range(4):
                    for q in range(-(3 - j) // 2, (3 - j) // 2 + 1):
                        if 0 <= x + q < W:
                            img[y + 1 + j, x + q] = c
    bunting(44, 62, 104, 101, 10, 0)
    bunting(216, 101, 278, 66, 10, 2)
    # striped barrier where the road runs out, in front of the wall
    bx0, bx1 = 126, 194
    img[136:146, bx0 + 4:bx0 + 6] = hexc("#2a1a34")
    img[136:146, bx1 - 6:bx1 - 4] = hexc("#2a1a34")
    for y in range(134, 140):
        for x in range(bx0, bx1):
            red = ((x - y) // 5) % 2 == 0
            img[y, x] = hexc("#e83848" if red else "#fff2f4")
    img[133, bx0:bx1] = hexc("#2a1a34")
    img[140, bx0:bx1] = hexc("#2a1a34")
    img[134:140, bx0] = hexc("#2a1a34")
    img[134:140, bx1 - 1] = hexc("#2a1a34")
    for x in (bx0 + 2, bx1 - 4):
        img[131:133, x:x + 2] = hexc("#ffb030")
        img[131, x] = hexc("#fff0a0")
    return Image.fromarray(img, "RGB")


# --------------------------------------------------------------------------- trophy
GOLD = [C("#4a2008"), C("#7a3e0e"), C("#b06a16"), C("#e09a24"), C("#ffc838"), C("#ffe88a"), C("#fffbe0")]
OUTL = C("#3a1606")


def make_trophy():
    cv = Canvas(34, 46)
    G = GOLD
    cx = 17
    # handles
    for side in (-1, 1):
        for a in range(0, 181, 6):
            r = math.radians(a)
            x = cx + side * (11 + math.sin(r) * 6)
            y = 4 + (1 - math.cos(r)) * 5
            mt.disc(cv, x, y, 1.3, G[3] if side > 0 else G[2])
        mt.disc(cv, cx + side * 15.5, 9, 0.9, G[5] if side > 0 else G[3])
    # bowl
    for y in range(2, 21):
        t = (y - 2) / 18.0
        hw = 12.5 * (1 - t ** 2.2) + 2.2
        for x in range(int(cx - hw), int(cx + hw) + 1):
            u = (x + 0.5 - cx) / hw
            k = 3 + (u > 0.15) + (u > 0.5) - (u < -0.55)
            if u > 0.62:
                k = 4
            cv.px(x, y, G[max(1, min(6, k))])
        cv.px(int(cx + hw * 0.45), y, G[6] if 4 < y < 15 else G[5])
    # rim + dark inside
    cv.ellipse(cx, 2.5, 12.5, 2.2, G[5])
    cv.ellipse(cx, 2.6, 10.5, 1.4, G[1])
    cv.hl(cx + 3, cx + 9, 1, G[6])
    # sun emblem
    mt.disc(cv, cx, 10.5, 3.6, C("#ff7a2c"))
    mt.disc(cv, cx + 0.6, 9.8, 2.2, C("#ffb040"))
    cv.px(cx + 1, 9, C("#fff0a0"))
    for a in range(0, 360, 45):
        r = math.radians(a)
        cv.px(int(round(cx + math.cos(r) * 5.6)), int(round(10.5 + math.sin(r) * 5.6)), C("#ff9a30"))
    # stem with a knot
    for y in range(21, 30):
        hw = 2.4 if y not in (24, 25) else 4
        for x in range(int(cx - hw), int(cx + hw) + 1):
            u = (x + 0.5 - cx) / hw
            cv.px(x, y, G[2] if u < -0.3 else G[5] if u > 0.4 else G[3])
    # base: gold collar, dark plinth, gold plate
    cv.rect(cx - 8, 30, cx + 8, 31, G[3])
    cv.hl(cx - 8, cx + 8, 30, G[5])
    cv.hl(cx + 3, cx + 7, 30, G[6])
    pl0, pl1 = C("#2e1638"), C("#4a2658")
    cv.rect(cx - 10, 32, cx + 10, 44, pl0)
    cv.rect(cx - 9, 32, cx + 9, 43, pl1)
    cv.vl(cx + 9, 32, 43, C("#6a3a78"))
    cv.rect(cx - 5, 35, cx + 5, 40, G[3])
    cv.hl(cx - 5, cx + 5, 35, G[5])
    cv.rect(cx - 4, 36, cx + 4, 39, G[4])
    cv.rect(cx - 11, 44, cx + 11, 45, pl0)
    cv.outline(OUTL)
    return cv


def glow_of(cv, rings):
    """Additive halo sprite: rings of colour around the sprite's silhouette (same anchor)."""
    R = len(rings)
    m = cv.a[:, :, 3] > 0
    h, w = m.shape
    out = Canvas(w + 2 * R, h + R)
    big = np.zeros((h + R, w + 2 * R), bool)
    big[R:, R:R + w] = m
    dist = np.full(big.shape, 99)
    dist[big] = 0
    for k in range(1, R + 1):
        grown = np.zeros_like(big)
        src = dist <= k - 1
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                grown |= np.roll(np.roll(src, dy, 0), dx, 1)
        dist[grown & (dist > k)] = k
    for k in range(1, R + 1):
        out.a[dist == k] = rings[k - 1]
    out.a[dist == 0] = rings[0]
    return out


# --------------------------------------------------------------------------- the couple, cheering
def cheer_driver(frame):
    cv = Canvas(36, 46)
    ox, oy = 18, 14
    J = lambda x, y: (ox + x, oy + y)
    JE, SH, SK = mt.JEANS, mt.SHIRT, mt.SKIN
    # legs, a little apart
    mt.limb(cv, J(-2, 10), J(-3, 20), J(-4, 29), mt.tri(JE), mt.tri(JE), 2.0, 1.8)
    mt.limb(cv, J(2, 10), J(3, 20), J(4, 29), mt.tri(JE[1:]), mt.tri(JE[1:]), 2.0, 1.8)
    mt.disc(cv, *J(-4.5, 30.5), 1.7, mt.SHOE[1])
    mt.disc(cv, *J(4.5, 30.5), 1.7, mt.SHOE[0])
    # torso (back of the shirt)
    cv.poly([J(-5, -1), J(5, -1), J(4, 11), J(-4, 11)], SH[1])
    cv.poly([J(1, -1), J(5, -1), J(4, 11), J(1.5, 11)], SH[2])
    cv.vl(ox + 4, oy, oy + 9, SH[3])
    cv.poly([J(-5, -1), J(-3.5, -1), J(-3, 11), J(-4, 11)], SH[0])
    cv.hl(ox - 4, ox + 3, oy + 11, JE[2])
    # arms up in a V; frame 1 waves the right one wider
    rx = (9, -9) if frame == 0 else (12, -6)
    mt.limb(cv, J(-4.5, 0), J(-8, -6), J(-10, -13), mt.tri(SH), mt.tri(SK), 1.7, 1.3)
    mt.limb(cv, J(4.5, 0), J(8, -6 + (0 if frame == 0 else 2)), J(rx[0], -13 + (0 if frame == 0 else 4)), mt.tri(SH[1:]), mt.tri(SK), 1.7, 1.3)
    mt.disc(cv, *J(-10.4, -13.6), 1.5, SK[1])
    mt.disc(cv, *J(rx[0] + 0.4, -13.6 + (0 if frame == 0 else 4)), 1.5, SK[2])
    mt.head_back(cv, ox, oy - 5, mt.HAIR_D)
    cv.px(ox - 5, oy - 5, SK[1])
    cv.px(ox + 5, oy - 5, SK[2])
    return cv


def cheer_lady(frame):
    cv = Canvas(36, 48)
    ox, oy = 18, 15
    J = lambda x, y: (ox + x, oy + y)
    SK, TOP, SHO = mt.SKIN, mt.TOP, mt.SHORTS
    mt.limb(cv, J(-2, 10), J(-2.5, 20), J(-3, 29), mt.tri(SK), mt.tri(SK), 1.8, 1.5)
    mt.limb(cv, J(2, 10), J(2.5, 20), J(3, 29), mt.tri(SK), mt.tri(SK), 1.8, 1.5)
    cv.hl(ox - 5, ox - 2, oy + 30, mt.SANDAL[0])
    cv.hl(ox + 2, ox + 5, oy + 30, mt.SANDAL[1])
    cv.poly([J(-4.5, 7), J(4.5, 7), J(5.5, 13), J(0.5, 13), J(0, 11), J(-0.5, 13), J(-5.5, 13)], SHO[1])
    cv.poly([J(1, 7), J(4.5, 7), J(5.5, 13), J(2, 13)], SHO[2])
    cv.poly([J(-4.5, -1), J(4.5, -1), J(4.5, 7), J(-4.5, 7)], TOP[2])
    cv.poly([J(1, -1), J(4.5, -1), J(4.5, 7), J(1.5, 7)], TOP[3])
    cv.poly([J(-4.5, -1), J(-3.5, -1), J(-3.5, 7), J(-4.5, 7)], TOP[1])
    lx = (-9, -11) if frame == 0 else (-12, -9)
    mt.limb(cv, J(-4, 0), J(-7.5, -6), J(lx[0], -12), mt.tri(SK), mt.tri(SK), 1.4, 1.2)
    mt.limb(cv, J(4, 0), J(7.5, -6), J(-lx[1], -12 + (0 if frame == 0 else 2)), mt.tri(SK), mt.tri(SK), 1.4, 1.2)
    d, m, l, hl, w = mt.HAIR_L
    mt.head_back(cv, ox, oy - 6, (d, m, l, hl))
    # long hair down her back, swinging
    sway = 0 if frame == 0 else 1.2
    for k in range(13):
        yy = oy - 4 + k
        xx = ox + math.sin(k * 0.35) * sway
        wdt = 4.2 - k * 0.12
        mt.disc(cv, xx, yy, max(1.2, wdt * 0.9), m)
        cv.px(int(xx + wdt * 0.5), yy, l)
        cv.px(int(xx - wdt * 0.6), yy, d)
    cv.px(ox + 1, oy - 9, w)
    cv.px(ox + 2, oy - 9, hl)
    return cv


def finish(cv, name):
    cv.outline(mt.OUTL)
    x0, y0, x1, y1 = cv.bbox()
    return mt.crop(cv, x0, y0, x1, y1, name=name)


def main():
    os.makedirs(OUT, exist_ok=True)
    bg = make_bg()
    bg.save(os.path.join(OUT, "ending_bg.png"))
    trophy = make_trophy()
    x0, y0, x1, y1 = trophy.bbox()
    trophy = mt.crop(trophy, x0, y0, x1, y1, name="trophy")
    glow = glow_of(trophy, [C("#6a3a10"), C("#4a280a"), C("#341c08"), C("#221206"), C("#140a04")])
    sprites = [("trophy", trophy), ("trophy_glow", glow)]
    # cheer frames share a box per person so they don't jump between frames
    for who, fn in (("driver", cheer_driver), ("lady", cheer_lady)):
        a, b = fn(0), fn(1)
        a.outline(mt.OUTL)
        b.outline(mt.OUTL)
        ca, cb = mt.crop_pair(a, b)
        sprites += [("cheer_%s_0" % who, ca), ("cheer_%s_1" % who, cb)]
    for name, cv in sprites:
        cv.image().save(os.path.join(OUT, name + ".png"))
        print(name, cv.w, "x", cv.h)
    # preview: background with the trophy and the couple dropped in, 3x
    pv = bg.convert("RGBA")
    pv.alpha_composite(trophy.image(), (160 - trophy.w // 2, 50))
    pv.alpha_composite(sprites[2][1].image(), (96, 128))
    pv.alpha_composite(sprites[4][1].image(), (206, 126))
    pv.resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(HERE, "preview_ending.png"))


if __name__ == "__main__":
    main()

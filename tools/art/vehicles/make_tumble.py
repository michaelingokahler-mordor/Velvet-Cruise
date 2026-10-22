#!/usr/bin/env python3
"""Tumble-crash art for Velvet Cruise (same style as make_vehicles.py).

Writes into tools/art/vehicles/out/ (then run tools/pack_assets.py):
  player_empty         the red convertible with nobody in it (it barrel-rolls in a big crash)
  crash_driver_fly     driver thrown through the air (seen from behind, limbs flailing)
  crash_lady_fly       blonde passenger thrown through the air
  crash_driver_sit_0/1 driver sitting dazed on the sand, side view facing right (1 = rubbing his head)
  crash_lady_sit_0/1   passenger sitting on the sand, side view facing right (1 = shaking her fist)

Figures are posed from joint positions: limbs are thick strokes, shaded light on
the sun side, with a selective dark outline added at the end.
"""
import math
import os

import numpy as np
from PIL import Image

import make_vehicles as mv
from make_vehicles import Canvas, C, CLEAR

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

OUTL = C("#2a1a2e")
# driver
HAIR_D = (mv.HB0, mv.HB1, mv.HB2, mv.HB3)
SKIN = (mv.SK0, mv.SK1, mv.SK2)
SHIRT = (mv.SH0, mv.SH1, mv.SH2, mv.SH3)
JEANS = (C("#1c1c3e"), C("#2c3468"), C("#3e5292"), C("#6078b8"))
SHOE = (C("#3a2420"), C("#5c3a2c"), C("#f0e8e0"))
# passenger
HAIR_L = (mv.YH0, mv.YH1, mv.YH2, mv.YH3, mv.YH4)
TOP = (C("#8c8cae"), mv.PT0, mv.PT1, C("#ffffff"))
SHORTS = (C("#6a1440"), C("#a82060"), C("#e04a84"), C("#ff8ab4"))
SANDAL = (C("#6a3a1c"), C("#a8642a"))


# ---------------------------------------------------------------------------
# stroke helpers
# ---------------------------------------------------------------------------
def disc(cv, x, y, r, c):
    for yy in range(int(math.floor(y - r - 1)), int(math.ceil(y + r + 1)) + 1):
        for xx in range(int(math.floor(x - r - 1)), int(math.ceil(x + r + 1)) + 1):
            if (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r:
                cv.px(xx, yy, c)


def stroke(cv, a, b, r, dark, mid, light, lit=(0.35, -1.0)):
    """Thick limb from a to b: a body colour with a lighter stripe on the sun side
    (up / right) and a darker one on the shade side."""
    ax, ay = a
    bx, by = b
    L = max(1e-6, math.hypot(bx - ax, by - ay))
    n = int(L * 3) + 1
    # normal pointing toward the light
    nx, ny = -(by - ay) / L, (bx - ax) / L
    if nx * lit[0] + ny * lit[1] < 0:
        nx, ny = -nx, -ny
    for i in range(n + 1):
        t = i / n
        x, y = ax + (bx - ax) * t, ay + (by - ay) * t
        disc(cv, x, y, r, mid)
    if r >= 1.0:
        for i in range(n + 1):
            t = i / n
            x, y = ax + (bx - ax) * t, ay + (by - ay) * t
            cv.px(int(x - nx * r * 0.9), int(y - ny * r * 0.9), dark)
        for i in range(n + 1):
            t = i / n
            x, y = ax + (bx - ax) * t, ay + (by - ay) * t
            cv.px(int(x + nx * r * 0.7), int(y + ny * r * 0.7), light)


def limb(cv, j0, j1, j2, upper, lower, r_up, r_lo):
    """Two-segment limb: (dark, mid, light) colour triples for each segment."""
    stroke(cv, j1, j2, r_lo, *lower)
    stroke(cv, j0, j1, r_up, *upper)


def finish(cv, name, raw=False):
    cv.outline(OUTL)
    if raw:
        return cv
    return crop(cv, *cv.bbox(), name=name)


def crop(cv, x0, y0, x1, y1, name=""):
    out = Canvas(x1 - x0 + 1, y1 - y0 + 1)
    out.a[:, :] = cv.a[y0:y1 + 1, x0:x1 + 1]
    a = out.a[:, :, 3]
    assert set(np.unique(a)) <= {0, 255}, name
    return out


def crop_pair(a, b):
    """Crop two frames of one pose to their shared box, so the body never jumps
    between frames; the shared bottom row is the ground line."""
    ax0, ay0, ax1, ay1 = a.bbox()
    bx0, by0, bx1, by1 = b.bbox()
    box = (min(ax0, bx0), min(ay0, by0), max(ax1, bx1), max(ay1, by1))
    return crop(a, *box), crop(b, *box)


def shift(j, dx, dy):
    return (j[0] + dx, j[1] + dy)


# ---------------------------------------------------------------------------
# heads
# ---------------------------------------------------------------------------
def head_back(cv, x, y, hair):
    """Back of a head (all hair), r ~ 4.5."""
    d, m, l, hl = hair[:4]
    cv.ellipse(x, y, 4.6, 4.8, m)
    cv.ellipse(x + 0.8, y - 1.2, 3.0, 2.8, l)
    cv.ellipse(x + 1.6, y - 2.0, 1.4, 1.2, hl)
    cv.ellipse(x - 1.8, y + 2.0, 2.0, 1.6, d)


def head_side(cv, x, y, hair, facing=1, long_hair=False):
    """Profile head facing right: hair at the back/top, face on the right."""
    sd, sm, sl = SKIN
    cv.ellipse(x, y, 4.4, 4.6, sm)
    cv.ellipse(x + 1.6 * facing, y - 0.6, 2.4, 2.8, sl)
    # nose + chin
    cv.px(int(x + 4.4 * facing), int(y), sm)
    cv.px(int(x + 3.4 * facing), int(y + 3), sm)
    # eye (closed / dazed line)
    cv.px(int(x + 2 * facing), int(y - 1), OUTL)
    if long_hair:
        d, m, l, hl, w = hair
        cv.ellipse(x - 1.4 * facing, y - 1.6, 4.4, 3.6, m)
        cv.ellipse(x - 0.4 * facing, y - 3.0, 3.4, 1.8, l)
        cv.px(int(x + 0.6 * facing), int(y - 4), hl)
        cv.px(int(x - 0.6 * facing), int(y - 4), w)
        # long hair down the back
        for k in range(10):
            yy = y + k * 1.0
            xx = x - 3.2 * facing - k * 0.25 * facing
            disc(cv, xx, yy, 2.3 - k * 0.12, m)
            cv.px(int(xx + 0.8 * facing), int(yy), l)
            cv.px(int(xx - 1.4 * facing), int(yy), d)
    else:
        d, m, l, hl = hair
        cv.ellipse(x - 1.2 * facing, y - 1.8, 4.2, 3.4, m)
        cv.ellipse(x - 0.2 * facing, y - 3.0, 3.0, 1.6, l)
        cv.px(int(x + 0.8 * facing), int(y - 4), hl)
        cv.ellipse(x - 2.6 * facing, y + 0.6, 1.8, 2.2, d)
        # ear
        cv.px(int(x - 0.4 * facing), int(y + 0.4), sd)


# ---------------------------------------------------------------------------
# figures
# ---------------------------------------------------------------------------
def tri(c):
    return (c[0], c[1], c[2])


def driver_fly():
    cv = Canvas(40, 40)
    ox, oy = 20, 12
    J = lambda x, y: (ox + x, oy + y)
    hip = J(0, 9)
    # legs (spread, kicking)
    limb(cv, J(-2, 9), J(-6, 15), J(-10, 19), tri(JEANS), tri(JEANS), 1.9, 1.7)
    limb(cv, J(2, 9), J(7, 14), J(9, 20), tri(JEANS[1:]), tri(JEANS[1:]), 1.9, 1.7)
    disc(cv, *J(-11, 20), 1.6, SHOE[1])
    disc(cv, *J(9.5, 21), 1.6, SHOE[0])
    cv.px(*J(-12, 21), SHOE[2])
    cv.px(*J(10, 22), SHOE[2])
    # torso (back of the blue shirt)
    cv.poly([J(-4.5, -2), J(4.5, -2), J(3.5, 9), J(-3.5, 9)], SHIRT[1])
    cv.poly([J(1, -2), J(4.5, -2), J(3.5, 9), J(1.5, 9)], SHIRT[2])
    cv.vl(ox + 4, oy - 1, oy + 7, SHIRT[3])
    cv.poly([J(-4.5, -2), J(-3, -2), J(-2.5, 9), J(-3.5, 9)], SHIRT[0])
    cv.hl(ox - 3, ox + 3, oy + 9, JEANS[2])          # belt line
    # arms flung up and out
    limb(cv, J(-4, -1), J(-9, -5), J(-12, -10), tri(SHIRT), tri(SKIN), 1.6, 1.3)
    limb(cv, J(4, -1), J(9, -4), J(13, -8), tri(SHIRT[1:]), tri(SKIN), 1.6, 1.3)
    disc(cv, *J(-12.5, -10.5), 1.4, SKIN[1])
    disc(cv, *J(13.5, -8.5), 1.4, SKIN[2])
    head_back(cv, ox, oy - 6, HAIR_D)
    cv.px(ox - 5, oy - 6, SKIN[1])                    # ears
    cv.px(ox + 5, oy - 6, SKIN[2])
    return finish(cv, "crash_driver_fly")


def lady_fly():
    cv = Canvas(44, 44)
    ox, oy = 22, 15
    J = lambda x, y: (ox + x, oy + y)
    # legs
    limb(cv, J(-2, 9), J(-7, 13), J(-9, 20), tri(SKIN), tri(SKIN), 1.7, 1.5)
    limb(cv, J(2, 9), J(6, 15), J(11, 18), tri(SKIN), tri(SKIN), 1.7, 1.5)
    disc(cv, *J(-9.5, 21), 1.3, SANDAL[0])
    disc(cv, *J(12, 18.5), 1.3, SANDAL[1])
    # shorts
    cv.poly([J(-4, 6), J(4, 6), J(5, 11), J(0.5, 11), J(0, 9), J(-0.5, 11), J(-5, 11)], SHORTS[1])
    cv.poly([J(1, 6), J(4, 6), J(5, 11), J(2, 11)], SHORTS[2])
    cv.px(*J(4, 7), SHORTS[3])
    # white top
    cv.poly([J(-4, -2), J(4, -2), J(4, 6), J(-4, 6)], TOP[2])
    cv.poly([J(1, -2), J(4, -2), J(4, 6), J(1.5, 6)], TOP[3])
    cv.poly([J(-4, -2), J(-3, -2), J(-3, 6), J(-4, 6)], TOP[1])
    # arms
    limb(cv, J(-4, -1), J(-9, -3), J(-13, -7), tri(SKIN), tri(SKIN), 1.4, 1.2)
    limb(cv, J(4, -1), J(8, -6), J(10, -11), tri(SKIN), tri(SKIN), 1.4, 1.2)
    # hair: a golden mane flying up and out
    d, m, l, hl, w = HAIR_L
    head_back(cv, ox, oy - 6, (d, m, l, hl))
    for k, (dx, dy) in enumerate([(-6, -10), (-2, -13), (3, -12), (7, -9), (-8, -5), (8, -4)]):
        x0, y0 = ox, oy - 7
        for i in range(8):
            t = i / 7
            disc(cv, x0 + dx * t, y0 + dy * t, 2.0 - 1.4 * t, m if k % 2 else l)
        cv.px(int(x0 + dx * 0.6), int(y0 + dy * 0.6), hl)
    for k in range(7):                                 # hair over the shoulders
        disc(cv, ox - 3 + k, oy - 2 + abs(k - 3) * 0.3, 1.6, m)
    cv.px(ox + 1, oy - 9, w)
    return finish(cv, "crash_lady_fly")


def driver_sit(frame):
    """Side view facing right: leaning back on one arm, legs out on the sand."""
    cv = Canvas(44, 34)
    gy = 30                       # ground line
    hip = (12, gy - 4)
    sh = (11, gy - 15)
    # far leg (darker), knees up a bit
    limb(cv, shift(hip, 1, -1), (20, gy - 8), (27, gy - 2), tri(JEANS), tri(JEANS), 2.0, 1.8)
    disc(cv, 28.5, gy - 2, 1.8, SHOE[0])
    cv.hl(27, 30, gy - 1, SHOE[0])
    # far arm resting on the far knee
    limb(cv, shift(sh, 2, 1), (17, gy - 11), (20, gy - 9), tri(SHIRT), tri(SKIN), 1.6, 1.3)
    # near leg straight out
    limb(cv, hip, (21, gy - 3), (30, gy - 2), tri(JEANS[1:]), tri(JEANS[1:]), 2.1, 1.9)
    disc(cv, 31.5, gy - 3, 2.0, SHOE[1])
    cv.hl(30, 33, gy - 1, SHOE[1])
    cv.vl(33, gy - 4, gy - 2, SHOE[2])
    # torso
    cv.poly([(sh[0] - 3.5, sh[1] - 1), (sh[0] + 3.5, sh[1] - 1), (hip[0] + 3.5, hip[1] + 1),
             (hip[0] - 4, hip[1] + 1)], SHIRT[1])
    cv.poly([(sh[0] + 1, sh[1] - 1), (sh[0] + 3.5, sh[1] - 1), (hip[0] + 3.5, hip[1] + 1),
             (hip[0] + 1.5, hip[1] + 1)], SHIRT[2])
    cv.poly([(sh[0] - 3.5, sh[1] - 1), (sh[0] - 2, sh[1] - 1), (hip[0] - 3, hip[1] + 1),
             (hip[0] - 4, hip[1] + 1)], SHIRT[0])
    cv.vl(int(sh[0] + 3), sh[1], hip[1] - 2, SHIRT[3])
    # near arm: propping behind on the sand, or rubbing his sore head
    if frame == 0:
        limb(cv, sh, (6, gy - 9), (3, gy - 2), tri(SHIRT[1:]), tri(SKIN), 1.7, 1.3)
        disc(cv, 3, gy - 1.5, 1.5, SKIN[1])
        head_side(cv, 13.5, gy - 21.5, HAIR_D)
    else:
        head_side(cv, 13.5, gy - 21, HAIR_D)
        limb(cv, sh, (17, gy - 15), (14, gy - 24), tri(SHIRT[1:]), tri(SKIN), 1.7, 1.3)
        disc(cv, 14, gy - 25, 1.6, SKIN[2])
    return finish(cv, "crash_driver_sit_%d" % frame, raw=True)


def lady_sit(frame):
    """Side view facing right, knees drawn up; frame 1 shakes a fist."""
    cv = Canvas(44, 40)
    gy = 36
    hip = (12, gy - 4)
    sh = (12, gy - 14)
    # far leg, knee up
    limb(cv, shift(hip, 1, -1), (20, gy - 10), (25, gy - 2), tri(SKIN), tri(SKIN), 1.8, 1.5)
    cv.hl(24, 27, gy - 1, SANDAL[0])
    # far arm hugging the knee
    limb(cv, shift(sh, 2, 1), (16, gy - 8), (20, gy - 9), tri(SKIN), tri(SKIN), 1.3, 1.1)
    # near leg
    limb(cv, hip, (21, gy - 6), (28, gy - 2), tri(SKIN), tri(SKIN), 1.9, 1.6)
    cv.hl(27, 30, gy - 1, SANDAL[1])
    cv.px(30, gy - 2, SANDAL[0])
    # shorts over the hips
    cv.poly([(hip[0] - 4, hip[1] - 4), (hip[0] + 5, hip[1] - 4), (hip[0] + 8, hip[1] - 1),
             (hip[0] + 7, hip[1] + 2), (hip[0] - 4, hip[1] + 2)], SHORTS[1])
    cv.poly([(hip[0] + 1, hip[1] - 4), (hip[0] + 5, hip[1] - 4), (hip[0] + 8, hip[1] - 1),
             (hip[0] + 6, hip[1] - 1)], SHORTS[2])
    cv.px(hip[0] + 6, hip[1] - 2, SHORTS[3])
    # white top
    cv.poly([(sh[0] - 3.5, sh[1] - 1), (sh[0] + 3.5, sh[1] - 1), (hip[0] + 4, hip[1] - 4),
             (hip[0] - 4, hip[1] - 4)], TOP[2])
    cv.poly([(sh[0] + 1, sh[1] - 1), (sh[0] + 3.5, sh[1] - 1), (hip[0] + 4, hip[1] - 4),
             (hip[0] + 1.5, hip[1] - 4)], TOP[3])
    cv.poly([(sh[0] - 3.5, sh[1] - 1), (sh[0] - 2.5, sh[1] - 1), (hip[0] - 3, hip[1] - 4),
             (hip[0] - 4, hip[1] - 4)], TOP[1])
    if frame == 0:
        head_side(cv, 14, gy - 20, HAIR_L, long_hair=True)
        limb(cv, sh, (8, gy - 8), (6, gy - 2), tri(SKIN), tri(SKIN), 1.4, 1.2)
    else:
        head_side(cv, 14, gy - 20, HAIR_L, long_hair=True)
        limb(cv, sh, (18, gy - 18), (20, gy - 27), tri(SKIN), tri(SKIN), 1.4, 1.2)
        disc(cv, 20.5, gy - 28.5, 1.9, SKIN[1])            # fist
        cv.px(21, gy - 29, SKIN[2])
    return finish(cv, "crash_lady_sit_%d" % frame, raw=True)


def player_empty():
    """The convertible with the occupants left out (seats and cockpit still drawn)."""
    keep = (mv.draw_driver, mv.draw_passenger)
    mv.draw_driver = lambda *a, **k: None
    mv.draw_passenger = lambda *a, **k: None
    try:
        body, _ = mv.draw_player("straight", 0)
    finally:
        mv.draw_driver, mv.draw_passenger = keep
    return body


# ---------------------------------------------------------------------------
def main():
    os.makedirs(OUT, exist_ok=True)
    d0, d1 = crop_pair(driver_sit(0), driver_sit(1))
    l0, l1 = crop_pair(lady_sit(0), lady_sit(1))
    sprites = [("player_empty", player_empty()),
               ("crash_driver_fly", driver_fly()),
               ("crash_lady_fly", lady_fly()),
               ("crash_driver_sit_0", d0),
               ("crash_driver_sit_1", d1),
               ("crash_lady_sit_0", l0),
               ("crash_lady_sit_1", l1)]
    for name, cv in sprites:
        cv.image().save(os.path.join(OUT, name + ".png"))
        print(name, cv.w, "x", cv.h)
    # preview: everything over sand, plus the occupied car for scale
    full, _ = mv.draw_player("straight", 0)
    items = [("player_straight_0", full)] + sprites
    pad = 4
    cw = sum(cv.w + pad * 2 for _, cv in items)
    chh = max(cv.h for _, cv in items) + pad * 2
    sheet = Image.new("RGBA", (cw, chh * 2), (40, 30, 50, 255))
    x = 0
    for name, cv in items:
        for row, bg in enumerate([(0xe8, 0xd0, 0xa0, 255), (0x70, 0x70, 0x78, 255)]):
            cell = Image.new("RGBA", (cv.w + pad * 2, chh), bg)
            cell.alpha_composite(cv.image(), (pad, chh - pad - cv.h))
            sheet.paste(cell, (x, row * chh))
        x += cv.w + pad * 2
    sheet = sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)
    sheet.save(os.path.join(HERE, "preview_tumble.png"))


if __name__ == "__main__":
    main()

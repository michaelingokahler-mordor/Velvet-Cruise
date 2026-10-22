#!/usr/bin/env python3
"""Velvet Cruise -- roadside scenery for Gold Rush Town (node 12) and Starlight Summit (node 14).

GOLD RUSH TOWN     saloon_lit, store_lit, water_tower, wagon, mine_cart, hitch_rail, red_rock, gas_lamp_lit
STARLIGHT SUMMIT   observatory_lit, radio_dish, antenna_lit, night_pine, crystal_lit, tent_lit, telescope

Pillow + numpy only; reuses make_scenery.py / make_routes_a.py / make_snow_lake.py (imported, never
modified); writes PNGs into ./out/.  STYLE.md rules apply: alpha 0/255, bottom row = ground contact,
object centred on its base, sun ahead/right/high, neutral daylight colours, selective dark outline,
no text.  `_lit` sprites: only the light pixels have luma > 200 (the engine makes exactly those
emissive), so every other colour in them stays below that.

Run:  python3 -B make_town_summit.py            (all sprites + preview_town.png / preview_summit.png)
      python3 -B make_town_summit.py wagon ..   (only these)
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
import make_snow_lake as sl  # noqa: E402
from make_scenery import Spr, ramp, hx, ball, selout, remove_orphans, bottom_fix, clampi, BARK, WOOD, GREYROCK  # noqa: E402

OUT = ms.OUT

# ---------------------------------------------------------------- palettes
PLANK = ramp("#2c1a14", "#4c2e20", "#704630", "#946040", "#b4805a", "#cfa070")
PLANK_D = ramp("#1e1210", "#34201a", "#4e3226", "#684234", "#845a46")        # weathered shade side
BARNRED = ramp("#2e1014", "#561a1e", "#7e2a28", "#a43e34", "#c85c42", "#e08058")
CANVAS = ramp("#6a5a48", "#9a8668", "#c4ae88", "#dcc9a4", "#ece0c0")
IRON = ramp("#14121a", "#26242e", "#3c3a46", "#58566a", "#7a7890")
ORE = ramp("#3a2a1a", "#6a4a22", "#a87a30", "#d8a838", "#f4cc50")
REDROCK = ramp("#2e1220", "#561e2c", "#84342e", "#aa4c34", "#cc6c42", "#e8905a", "#f6b47c")
TIN = ramp("#2c3446", "#4a5670", "#6c7a98", "#8a9ab8", "#a8b6cc", "#bdc9da")    # luma <= 198
DOME = ramp("#2c3658", "#46547c", "#667aa0", "#8a9cbc", "#a8b8d0", "#bac8da")   # luma <= 198
OBSW = ramp("#2a3250", "#404c76", "#5a6a98", "#7686b0", "#92a2c4", "#aebcd4")
GLASS_L = hx("#ffd878")        # luma 214 -> emissive window light
GLASS_H = hx("#fff0b8")
GLASS_M = hx("#ffb860")        # luma ~176: warm glow that is not emissive
NIGHTP = ramp("#04081a", "#0a1228", "#101c3a", "#182a4e", "#223e60", "#325670", "#4a7088")
CRYS = ramp("#1c1a5c", "#2e2c92", "#4444c8", "#6264ec", "#8c8cf8", "#b0b8ff")
CRYS_TIP = hx("#e8f4ff")
TENT_A = ramp("#2a3a5a", "#3e5682", "#5674a8", "#7494c8")
TENT_B = ramp("#7a2a2a", "#a63e34", "#c85c40", "#e07c52")
DISH = ramp("#2c3446", "#4a5670", "#707e9c", "#98a6c0", "#bcc8da", "#d4dded")


def luma(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


# ---------------------------------------------------------------- helpers
def planks(s, x0, y0, x1, y1, rmp, seam=4, seed=0, lit_right=True):
    """vertical boards with dark seams; each board lit on its right half, a few knots"""
    rng = random.Random(seed)
    for x in range(x0, x1 + 1):
        k = (x - x0) % seam
        for y in range(y0, y1 + 1):
            b = 3 if k < seam - 1 else 2
            if k == 0:
                b = 1
            if lit_right and x > (x0 + x1) * 0.62:
                b = min(len(rmp) - 1, b + 1)
            s.puti(x, y, rmp[b])
    for _ in range(max(2, (x1 - x0) // 9) if y1 - y0 >= 6 and x1 - x0 >= 4 else 0):
        kx, ky = rng.randint(x0 + 1, x1 - 1), rng.randint(y0 + 2, y1 - 2)
        s.puti(kx, ky, rmp[1])
        s.puti(kx, ky + 1, rmp[2])


def lit_window(s, x0, y0, w, h, frame=PLANK, mullion=True):
    s.rect(x0 - 1, y0 - 1, x0 + w, y0 + h, frame[1])
    s.rect(x0, y0, x0 + w - 1, y0 + h - 1, GLASS_L)
    s.rect(x0, y0 + h - 2, x0 + w - 1, y0 + h - 1, GLASS_M)
    if mullion:
        s.rect(x0 + w // 2, y0, x0 + w // 2, y0 + h - 1, frame[2])
        s.rect(x0, y0 + h // 2, x0 + w - 1, y0 + h // 2, frame[2])
    s.rect(x0 - 1, y0 - 1, x0 + w, y0 - 1, frame[4])


def cap_outline(s, rmps):
    selout(s, rmps, dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)


# ---------------------------------------------------------------- gold rush town
def saloon_lit():
    w, h = 104, 100
    s = Spr(w, h)
    # boardwalk
    for y in range(94, 100):
        for x in range(2, 102):
            s.puti(x, y, PLANK[3 if (x // 7 + y) % 2 else 4] if y > 94 else PLANK[5])
    # side wall (right), darker, with the roof edge slanting back
    for x in range(88, 99):
        for y in range(40 + (x - 88) // 3, 94):
            s.puti(x, y, PLANK_D[2 if (x - 88) % 3 else 1])
    # main facade
    planks(s, 12, 36, 87, 93, PLANK, seam=5, seed=1)
    # tall false front (stepped parapet) with a round window
    for y in range(12, 36):
        half = 30 - max(0, (y - 12)) // 1 * 0 - (0 if y > 22 else (22 - y) * 1.2)
        x0, x1 = int(49.5 - half), int(49.5 + half)
        planks(s, x0, y, x1, y, PLANK, seam=5, seed=2)
    for x in range(17, 83):                                 # parapet cap
        top = 12 if 31 < x < 68 else (16 if 24 < x < 76 else 22)
        s.puti(x, top, PLANK[5])
        s.puti(x, top + 1, PLANK[4])
    for y in range(8, 14):
        for x in range(40, 60):
            if (x - 49.5) ** 2 / 100 + (y - 11) ** 2 / 9 <= 1.0 and y >= 8 + abs(x - 49.5) // 4:
                s.puti(x, y, PLANK[5])
    for dy in range(-4, 5):                                 # round lit window in the parapet
        for dx in range(-4, 5):
            if dx * dx + dy * dy <= 16:
                s.puti(50 + dx, 24 + dy, GLASS_L if dx * dx + dy * dy <= 9 else PLANK[1])
    s.rect(50, 20, 50, 28, PLANK[2])
    s.rect(46, 24, 54, 24, PLANK[2])
    # painted sign band: red with a gold star and gold trim (no letters)
    s.rect(14, 38, 85, 47, BARNRED[3])
    s.rect(14, 38, 85, 38, BARNRED[5])
    s.rect(14, 47, 85, 47, BARNRED[1])
    s.rect(14, 40, 85, 40, hx("#e6b84a"))
    s.rect(14, 45, 85, 45, hx("#a8801e"))
    for (cx, cy) in ((24, 43), (50, 43), (76, 43)):
        for (dx, dy) in ((0, -2), (0, 2), (-2, 0), (2, 0), (0, 0), (-1, -1), (1, -1), (-1, 1), (1, 1)):
            s.puti(cx + dx, cy + dy, hx("#dcb040"))
    # upper floor: two lit windows with shutters
    for x0 in (24, 62):
        lit_window(s, x0, 52, 14, 16)
        s.rect(x0 - 5, 51, x0 - 2, 68, BARNRED[2])
        s.rect(x0 + 16, 51, x0 + 19, 68, BARNRED[2])
        s.rect(x0 - 5, 51, x0 - 5, 68, BARNRED[1])
    # balcony: a roof over the boardwalk on posts, with a railing
    for x in range(6, 94):
        s.puti(x, 72, PLANK[5])
        s.rect(x, 73, x, 75, PLANK[2] if x > 60 else PLANK[1])
        s.puti(x, 76, PLANK[0])
    for px_ in (8, 30, 70, 91):
        s.rect(px_, 76, px_ + 2, 93, PLANK[3])
        s.rect(px_, 76, px_, 93, PLANK[1])
    s.rect(8, 64, 91, 64, PLANK[4])
    for x in range(10, 92, 4):
        s.rect(x, 65, x, 71, PLANK[3])
    # ground floor: two lit windows and the swinging doors
    for x0 in (18, 71):
        lit_window(s, x0, 80, 12, 11)
    s.rect(42, 78, 59, 93, PLANK[0])
    for (xa, xb) in ((43, 50), (51, 58)):                   # the two half doors
        s.rect(xa, 82, xb, 93, PLANK[2])
        for x in range(xa, xb + 1, 2):
            s.rect(x, 82, x, 93, PLANK[4] if xa == 51 else PLANK[3])
        s.rect(xa, 82, xb, 82, PLANK[5])
    s.rect(42, 78, 59, 79, PLANK[4])
    s.rect(44, 80, 57, 80, GLASS_M)                         # light spilling over the doors
    cap_outline(s, [PLANK, PLANK_D, BARNRED])
    return s


def store_lit():
    w, h = 84, 74
    s = Spr(w, h)
    for y in range(68, 74):
        for x in range(2, 82):
            s.puti(x, y, PLANK[3 if (x // 7 + y) % 2 else 4] if y > 68 else PLANK[5])
    for x in range(70, 80):
        for y in range(30 + (x - 70) // 3, 69):
            s.puti(x, y, PLANK_D[2 if (x - 70) % 3 else 1])
    planks(s, 8, 24, 69, 67, PLANK, seam=4, seed=4)
    # a low gable front with a ridge board
    for y in range(8, 24):
        half = 31 - (23 - y) * 1.8
        x0, x1 = int(38.5 - half), int(38.5 + half)
        planks(s, max(8, x0), y, min(69, x1), y, PLANK, seam=4, seed=5)
    for k in range(0, 17):                                   # the roof edge
        s.puti(int(38.5 - 31 + k * 1.8), 23 - k, PLANK[5])
        s.puti(int(38.5 + 31 - k * 1.8), 23 - k, PLANK[5])
    s.rect(36, 6, 41, 8, PLANK[5])
    for dy in range(-3, 4):                                  # a round vent window
        for dx in range(-3, 4):
            if dx * dx + dy * dy <= 9:
                s.puti(39 + dx, 16 + dy, GLASS_L if dx * dx + dy * dy <= 5 else PLANK[1])
    # striped awning over the whole front
    for y in range(34, 42):
        for x in range(4, 74):
            k = (x // 5) % 2
            c = BARNRED[4 - (y > 37)] if k else CANVAS[2 - (y > 37)]
            s.puti(x, y, c)
    for x in range(4, 74):                                   # scalloped lower edge
        if (x // 5) % 2 == 0 or True:
            e = 42 + (1 if (x % 5) in (1, 2, 3) else 0)
            s.puti(x, 42, BARNRED[2] if (x // 5) % 2 else CANVAS[2])
            if e == 43:
                s.puti(x, 43, BARNRED[1] if (x // 5) % 2 else CANVAS[1])
    # big display windows and a door
    lit_window(s, 14, 48, 15, 14, mullion=True)
    lit_window(s, 49, 48, 15, 14, mullion=True)
    s.rect(34, 46, 44, 67, PLANK[0])
    s.rect(35, 47, 43, 67, PLANK[2])
    for x in range(35, 44, 3):
        s.rect(x, 47, x, 67, PLANK[3])
    s.rect(36, 50, 42, 56, GLASS_M)
    for px_ in (6, 31, 46, 71):
        s.rect(px_, 43, px_ + 1, 67, PLANK[3])
    # barrels and a crate on the boardwalk
    for (cx, base) in ((8, 67), (74, 67)):
        for y in range(base - 9, base + 1):
            for x in range(cx - 4, cx + 4):
                s.puti(x, y, PLANK[2 if x < cx else 4] if (y - base) % 4 else IRON[2])
    cap_outline(s, [PLANK, PLANK_D, BARNRED, CANVAS])
    return s


def water_tower():
    w, h = 56, 120
    s = Spr(w, h)
    cx = 28
    # legs and cross braces
    for lx in (10, 20, 36, 46):
        s.rect(lx, 56, lx + 2, 119, PLANK[2 if lx < cx else 3])
        s.rect(lx, 56, lx, 119, PLANK[1])
    for yb in (70, 88, 106):
        s.line(10, yb, 46, yb + 14, PLANK[3])
        s.line(46, yb, 10, yb + 14, PLANK[2])
    s.rect(8, 116, 50, 119, GREYROCK[3])                    # footing
    s.rect(8, 116, 50, 116, GREYROCK[5])
    # tank (barrel of staves with iron hoops)
    for y in range(18, 58):
        t = (y - 18) / 40.0
        half = 21 + 2.5 * math.sin(math.pi * t)
        for x in range(int(cx - half), int(cx + half) + 1):
            u = (x - cx) / half
            b = 1 if u < -0.5 else (2 if u < -0.1 else (3 if u < 0.45 else 4))
            if (x - int(cx - half)) % 4 == 0:
                b = max(1, b - 1)
            s.puti(x, y, PLANK[b])
    for yh in (22, 36, 52):
        half = 21 + 2.5 * math.sin(math.pi * (yh - 18) / 40.0)
        for x in range(int(cx - half), int(cx + half) + 1):
            s.puti(x, yh, IRON[2 if x < cx + 6 else 3])
            s.puti(x, yh + 1, IRON[1])
    # conical roof with a finial
    for y in range(3, 19):
        half = (y - 3) / 15.0 * 24
        for x in range(int(cx - half), int(cx + half) + 1):
            u = (x - cx) / max(half, 1)
            s.puti(x, y, PLANK_D[1 if u < -0.2 else 2] if u < 0.3 else PLANK[3])
        if y % 3 == 0:
            s.puti(int(cx - half), y, PLANK_D[0])
    s.rect(cx - 1, 0, cx, 4, IRON[3])
    # spout pipe + a ladder on the right
    s.rect(cx + 9, 56, cx + 10, 80, IRON[2])
    s.rect(cx + 7, 80, cx + 12, 82, IRON[3])
    for y in range(58, 116, 4):
        s.rect(cx + 17, y, cx + 21, y, PLANK[4])
    s.rect(cx + 17, 58, cx + 17, 116, PLANK[2])
    s.rect(cx + 21, 58, cx + 21, 116, PLANK[3])
    cap_outline(s, [PLANK, PLANK_D, IRON, GREYROCK])
    return s


def wagon():
    w, h = 80, 64
    s = Spr(w, h)
    cx = 40
    # wheels: two big spoked wheels seen almost edge-on at the sides
    for wx in (9, 70):
        for y in range(18, 62):
            t = (y - 40) / 22.0
            half = 4.4 * math.sqrt(max(0.0, 1 - t * t))
            for x in range(int(wx - half), int(wx + half) + 1):
                s.puti(x, y, PLANK[1 if x < wx else 3])
        for (yy, dx) in ((24, 0), (30, 1), (36, 0), (44, 1), (50, 0), (56, 1)):
            s.puti(wx + dx - 1, yy, PLANK[5])
            s.puti(wx + dx, yy, PLANK[4])
        s.rect(wx - 1, 38, wx + 1, 42, IRON[3])                  # hub
        s.rect(wx - 5, 18, wx + 5, 19, IRON[2])
        s.rect(wx - 5, 60, wx + 5, 61, IRON[1])
    # the bed
    for y in range(44, 58):
        for x in range(14, 66):
            t = (x - 14) / 52.0
            s.puti(x, y, PLANK[2 if t < 0.35 else (3 if t < 0.8 else 4)] if (y - 44) % 5 else PLANK[1])
    s.rect(14, 44, 65, 45, PLANK[5])
    # canvas bonnet: an arch with a dark opening and a gathered rim
    for y in range(2, 46):
        t = (45 - y) / 43.0
        half = 24 * math.sqrt(max(0.0, 1 - t ** 2.2)) + 2
        for x in range(int(cx - half), int(cx + half) + 1):
            u = (x - cx) / max(half, 1)
            b = 2 if u < -0.5 else (3 if u < 0.35 else 4)
            if y > 40:
                b = max(1, b - 1)
            s.puti(x, y, CANVAS[b])
    for y in range(6, 46):                                       # the back opening
        t = (45 - y) / 43.0
        half = 17 * math.sqrt(max(0.0, 1 - t ** 2.4))
        for x in range(int(cx - half), int(cx + half) + 1):
            s.puti(x, y, IRON[1] if (x * 3 + y) % 11 else IRON[0])
    for k in range(0, 5):                                        # bows and a drawstring
        ang = math.radians(20 + 35 * k)
        s.puti(int(cx + 21 * math.cos(ang)), int(44 - 38 * math.sin(ang)), CANVAS[1])
    s.rect(cx - 20, 44, cx + 20, 44, PLANK[0])
    s.rect(cx - 6, 56, cx + 6, 58, IRON[2])                      # tailgate chain bracket
    cap_outline(s, [PLANK, CANVAS, IRON])
    return s


def mine_cart():
    w, h = 52, 36
    s = Spr(w, h)
    # rails
    s.rect(0, 33, 51, 34, IRON[3])
    s.rect(0, 35, 51, 35, IRON[1])
    for x in range(2, 52, 8):
        s.rect(x, 35, x + 2, 35, PLANK[2])
    # ore heap
    for x in range(8, 44):
        t = (x - 25.5) / 17.5
        top = 8 + int(abs(t) ** 1.6 * 8)
        for y in range(top, 16):
            b = clampi(int(2.3 + 2.2 * (-t * 0.7 + (16 - y) / 9.0)), 1, 4)
            s.puti(x, y, ORE[b] if (x * 7 + y * 3) % 5 else ORE[4])
    for (gx, gy) in ((18, 10), (28, 8), (34, 12), (22, 13)):
        s.puti(gx, gy, hx("#fff0a0"))
    # the iron box with a flared rim and rivets
    for y in range(14, 30):
        t = (y - 14) / 15.0
        half = 22 - 3 * t
        for x in range(int(26 - half), int(26 + half) + 1):
            u = (x - 26) / half
            b = 1 if u < -0.5 else (2 if u < 0.2 else 3)
            if (y - 14) % 5 == 4:
                b = max(0, b - 1)
            s.puti(x, y, IRON[b])
    s.rect(3, 13, 48, 15, IRON[4])
    s.rect(3, 13, 48, 13, IRON[3])
    for x in range(6, 46, 6):
        s.puti(x, 19, IRON[4])
        s.puti(x, 25, IRON[4])
    # wheels
    for wx in (11, 41):
        ball(s, wx, 30, 4, 3.4, IRON, bias=0.05)
        s.puti(wx, 30, IRON[4])
    cap_outline(s, [IRON, ORE])
    return s


def hitch_rail():
    w, h = 68, 34
    s = Spr(w, h)
    for px_ in (6, 58):
        s.rect(px_, 4, px_ + 3, 33, PLANK[3])
        s.rect(px_, 4, px_, 33, PLANK[1])
        s.rect(px_ + 3, 4, px_ + 3, 33, PLANK[4])
        s.rect(px_ - 1, 3, px_ + 4, 4, PLANK[5])
    s.rect(2, 9, 65, 12, PLANK[3])
    s.rect(2, 9, 65, 9, PLANK[5])
    s.rect(2, 12, 65, 12, PLANK[1])
    s.rect(2, 19, 65, 21, PLANK[2])
    s.rect(2, 19, 65, 19, PLANK[4])
    # a water trough between the posts
    for y in range(24, 33):
        for x in range(18, 50):
            u = (x - 18) / 31.0
            s.puti(x, y, PLANK[2 if u < 0.3 else (3 if u < 0.8 else 4)] if y > 25 else PLANK[1])
    for x in range(19, 49):
        s.puti(x, 25, hx("#4a86c8") if (x + 1) % 4 else hx("#a0d0f0"))
    s.rect(18, 24, 49, 24, PLANK[5])
    cap_outline(s, [PLANK])
    return s


def red_rock():
    w, h = 64, 46
    s = Spr(w, h)
    ball(s, 22, 29, 19, 15, REDROCK, bias=0.02, gamma=1.1)
    ball(s, 44, 31, 15, 12, REDROCK, bias=0.08, gamma=1.1)
    ball(s, 32, 19, 12, 12, REDROCK, bias=0.06, gamma=1.1)
    rng = random.Random(21)
    op = s.opaque()
    for y in range(h):                                    # sandstone strata: darker bands
        for x in range(w):
            if op[y, x] and ((y + int(2 * math.sin(x * 0.3))) % 6 == 0):
                c = tuple(int(v) for v in s.a[y, x, :3])
                if c in REDROCK and REDROCK.index(c) > 1:
                    s.puti(x, y, REDROCK[REDROCK.index(c) - 1])
    for _ in range(14):                                   # cracks
        x, y = rng.randint(8, 56), rng.randint(14, 40)
        if s.op(x, y):
            s.puti(x, y, REDROCK[1])
            s.puti(x + 1, y + 1, REDROCK[1])
    cap_outline(s, [REDROCK])
    return s


def gas_lamp_lit():
    w, h = 20, 96
    s = Spr(w, h)
    for y in range(18, 96):
        half = 1.5 + (1.5 if y > 84 else 0) + (1 if 40 < y < 44 else 0)
        for x in range(int(10 - half), int(10 + half) + 1):
            s.puti(x, y, IRON[1 if x < 10 else 3])
    s.rect(5, 92, 14, 95, IRON[2])                       # base
    s.rect(6, 88, 13, 89, IRON[3])
    s.rect(2, 20, 17, 21, IRON[2])                       # scrolled cross arm
    s.rect(1, 22, 3, 24, IRON[2])
    s.rect(16, 22, 18, 24, IRON[2])
    s.rect(6, 16, 13, 16, IRON[3])                       # cap
    s.rect(7, 14, 12, 15, IRON[2])
    s.rect(9, 12, 10, 13, IRON[3])
    for y in range(17, 28):                              # glass lantern
        half = 4 - (1 if y > 24 else 0)
        for x in range(int(10 - half), int(10 + half) + 1):
            s.puti(x, y, GLASS_L if abs(x - 10) <= 2 else GLASS_M)
    s.rect(9, 19, 10, 24, GLASS_H)
    s.rect(5, 27, 14, 28, IRON[2])
    cap_outline(s, [IRON])
    return s


# ---------------------------------------------------------------- starlight summit
def observatory_lit():
    w, h = 100, 96
    s = Spr(w, h)
    cx = 50
    # stone footing and a round drum
    for y in range(80, 96):
        for x in range(10, 90):
            u = (x - 10) / 79.0
            s.puti(x, y, GREYROCK[2 if u < 0.3 else (3 if u < 0.75 else 4)] if (y + (x // 6) * 3) % 8 else GREYROCK[1])
    s.rect(10, 80, 89, 80, GREYROCK[5])
    for y in range(44, 81):
        for x in range(14, 87):
            u = (x - 50.0) / 36.5
            b = 1 if u < -0.55 else (2 if u < -0.1 else (3 if u < 0.4 else 4))
            if (x - 14) % 9 == 0:
                b = max(0, b - 1)
            s.puti(x, y, OBSW[b])
    s.rect(14, 44, 86, 44, OBSW[5])
    s.rect(14, 45, 86, 45, OBSW[1])
    for x0 in (22, 66):                                        # round-topped lit windows
        s.rect(x0 - 1, 54, x0 + 8, 71, OBSW[0])
        s.rect(x0, 55, x0 + 7, 70, GLASS_L)
        s.rect(x0, 66, x0 + 7, 70, GLASS_M)
        s.rect(x0 + 3, 55, x0 + 4, 70, OBSW[2])
    s.rect(42, 58, 58, 80, OBSW[0])                            # the door with a lit fanlight
    s.rect(43, 59, 57, 80, OBSW[2])
    s.rect(44, 60, 56, 64, GLASS_L)
    s.rect(49, 60, 51, 80, OBSW[1])
    # the dome: a hemisphere, ribbed, with a slit showing the lit interior and the telescope
    for y in range(4, 45):
        t = (44 - y) / 40.0
        half = 38 * math.sqrt(max(0.0, 1 - t * t)) if t < 1 else 0
        for x in range(int(cx - half), int(cx + half) + 1):
            u = (x - cx) / max(half, 1)
            lum = 0.55 - 0.4 * u + 0.22 * (1 - t)
            b = clampi(int(lum * (len(DOME) - 1) + 0.5), 1, len(DOME) - 1)
            if (x - cx) % 7 == 0:
                b = max(0, b - 1)
            s.puti(x, y, DOME[b])
    s.rect(14, 41, 86, 44, OBSW[3])
    s.rect(14, 41, 86, 41, OBSW[5])
    for y in range(5, 42):                                    # the open slit
        s.rect(cx + 4, y, cx + 12, y, hx("#14182c") if y > 14 else GLASS_L)
        if y > 14:
            s.puti(cx + 5, y, GLASS_M)
            s.puti(cx + 11, y, GLASS_M)
    for k in range(0, 14):                                    # the telescope tube pointing out of the slit
        s.rect(cx + 6 + k // 2, 24 - k, cx + 10 + k // 2, 24 - k, TIN[3 if k % 5 else 5])
        s.puti(cx + 5 + k // 2, 24 - k, TIN[1])
    cap_outline(s, [OBSW, DOME, GREYROCK, TIN])
    return s


def radio_dish():
    w, h = 64, 78
    s = Spr(w, h)
    cx = 32
    # pedestal and a yoke
    for y in range(52, 78):
        half = 4 + max(0, (y - 70)) * 0.8
        for x in range(int(cx - half), int(cx + half) + 1):
            s.puti(x, y, TIN[1 if x < cx - 1 else (3 if x < cx + 2 else 4)])
    s.rect(cx - 12, 74, cx + 12, 77, TIN[2])
    s.rect(cx - 12, 74, cx + 12, 74, TIN[5])
    s.line(cx, 54, cx - 10, 40, TIN[2])
    s.line(cx + 1, 54, cx + 11, 40, TIN[3])
    # the dish: an ellipse tilted up to the right, concave, lit on the inside rim
    for y in range(2, 48):
        for x in range(6, 60):
            nx = (x - 32.0) / 26.0
            ny = (y - 26.0) / 22.0
            r2 = nx * nx + ny * ny
            if r2 > 1:
                continue
            # a light direction gives the bowl its shading
            lum = 0.5 + 0.3 * (nx * 0.7 - ny * 0.5) - 0.28 * (1 - r2) ** 0.5
            b = clampi(int(lum * (len(DISH) - 1) + 0.5), 1, len(DISH) - 1)
            if r2 > 0.8:
                b = len(DISH) - 1 if (nx - ny * 0.4) > 0 else 2
            if abs(r2 - 0.36) < 0.025 or abs(r2 - 0.16) < 0.02:
                b = max(1, b - 1)
            s.puti(x, y, DISH[b])
    s.line(32, 26, 44, 10, DISH[3])                           # the feed arm and horn
    s.line(33, 26, 45, 11, DISH[1])
    s.rect(44, 7, 47, 11, DISH[4])
    s.puti(46, 6, hx("#e8484a"))
    cap_outline(s, [DISH, TIN])
    return s


def antenna_lit():
    w, h = 30, 148
    s = Spr(w, h)
    cx = 15
    for y in range(8, 148):
        half = 1.5 + (y - 8) / 140.0 * 10.5
        xl, xr = int(round(cx - half)), int(round(cx + half))
        s.puti(xl, y, IRON[2])
        s.puti(xl + 1, y, IRON[1])
        s.puti(xr, y, IRON[4])
        s.puti(xr - 1, y, IRON[3])
        if (y - 8) % 14 == 0:
            s.rect(xl, y, xr, y, IRON[3])
        if (y - 8) % 14 < 7:
            span = xr - xl
            xx = xl + int(span * ((y - 8) % 14) / 7.0)
            s.puti(xx, y, IRON[3])
        else:
            span = xr - xl
            xx = xr - int(span * (((y - 8) % 14) - 7) / 7.0)
            s.puti(xx, y, IRON[2])
    s.rect(cx - 5, 96, cx + 5, 98, IRON[3])                   # a small dish on a platform
    s.rect(cx + 5, 91, cx + 9, 98, TIN[3])
    s.rect(cx + 6, 92, cx + 8, 97, TIN[5])
    s.rect(cx - 12, 144, cx + 12, 147, GREYROCK[3])
    s.rect(cx - 12, 144, cx + 12, 144, GREYROCK[5])
    # the beacon
    s.rect(cx - 1, 0, cx + 1, 8, IRON[3])
    for (dx, dy, c) in ((0, 1, "#fff0e0"), (-1, 1, "#ff8a78"), (1, 1, "#ff8a78"), (0, 0, "#ff8a78"), (0, 2, "#ff8a78"),
                        (-1, 2, "#e04838"), (1, 2, "#e04838")):
        s.puti(cx + dx, 2 + dy, hx(c))
    cap_outline(s, [IRON, TIN])
    return s


def night_pine():
    tiers = [(80, 112, 27), (65, 97, 24), (50, 81, 21), (36, 65, 17), (23, 50, 13), (11, 34, 9), (2, 20, 5.5)]
    s = sl.conifer(58, 124, tiers, NIGHTP, False, 11, 104)
    # starlit frost on the sunward tips
    op = s.opaque()
    up = np.zeros_like(op); up[1:, :] = op[:-1, :]
    rt = np.zeros_like(op); rt[:, :-1] = op[:, 1:]
    edge = op & (~rt | ~up)
    for y, x in zip(*np.nonzero(edge)):
        c = tuple(int(v) for v in s.a[y, x, :3])
        if c in NIGHTP and NIGHTP.index(c) >= 3 and (x + y) % 2 == 0:
            s.puti(x, y, hx("#9ac4e8"))
    return s


def crystal_lit():
    w, h = 48, 52
    s = Spr(w, h)
    ball(s, 24, 46, 21, 7, GREYROCK, bias=0.0)               # rocky base
    prisms = [(24, 8, 6.5, 40), (13, 18, 5, 34), (35, 16, 5.5, 36), (6, 30, 3.8, 26), (42, 28, 4, 28)]
    for (cx, tip, hw, base) in prisms:
        for y in range(tip, base + 1):
            t = (y - tip) / max(1, base - tip)
            half = hw * min(1.0, 0.2 + t * 1.6) if t < 0.5 else hw
            for x in range(int(round(cx - half)), int(round(cx + half)) + 1):
                u = (x - cx) / max(half, 1)
                b = 1 if u < -0.35 else (3 if u < 0.25 else 4)
                if t < 0.12:
                    b = 5
                s.puti(x, y, CRYS[b])
            if t > 0.12 and half > 2:
                s.puti(int(round(cx + half * 0.55)), y, CRYS[5])
        s.puti(cx, tip, CRYS_TIP)
        s.puti(cx, tip + 1, CRYS_TIP)
        s.puti(cx + 1, tip + 2, CRYS_TIP)
    sl_fix = [(24, 6), (24, 5), (23, 6), (25, 6)]
    for (x, y) in sl_fix:
        s.puti(x, y, CRYS_TIP)
    selout(s, [CRYS, GREYROCK], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def tent_lit():
    w, h = 60, 44
    s = Spr(w, h)
    # two canvas faces (left in shade, right lit) with an open flap showing the warm light inside
    for y in range(4, 42):
        t = (y - 4) / 37.0
        half = 27 * t
        for x in range(int(30 - half), int(30 + half) + 1):
            u = (x - 30) / max(half, 1)
            if x < 30:
                c = TENT_A[1 if u < -0.5 else 2]
            else:
                c = TENT_B[2 if u < 0.5 else 3]
            if (x + y * 2) % 11 == 0:
                c = TENT_A[0] if x < 30 else TENT_B[1]
            s.puti(x, y, c)
    # the entrance: a warm lit triangle with the flap folded back
    for y in range(18, 42):
        t = (y - 18) / 23.0
        half = 2 + 9 * t
        for x in range(int(36 - half), int(36 + half) + 1):
            u = (x - 36) / max(half, 1)
            s.puti(x, y, GLASS_L if abs(u) < 0.45 else GLASS_M)
    for y in range(18, 42):
        t = (y - 18) / 23.0
        s.puti(int(36 - 2 - 9 * t), y, TENT_B[1])
        s.puti(int(36 + 2 + 9 * t), y, TENT_B[1])
    s.rect(34, 25, 38, 41, GLASS_H)
    # ridge, guy ropes and pegs
    s.rect(30, 3, 31, 4, IRON[3])
    s.line(30, 5, 5, 41, IRON[2])
    s.line(31, 5, 56, 41, IRON[3])
    for px_ in (4, 56, 12, 50):
        s.puti(px_, 42, IRON[3])
        s.puti(px_, 43, IRON[1])
    s.rect(0, 42, 59, 43, hx("#14182c"))
    cap_outline(s, [TENT_A, TENT_B, IRON])
    return s


def telescope():
    w, h = 44, 68
    s = Spr(w, h)
    cx = 20
    for (x1, y1) in ((4, 67), (20, 61), (36, 67)):            # tripod
        s.line(cx, 36, x1, y1, TIN[1 if x1 < cx else 3])
        s.line(cx + 1, 36, x1 + 1, y1, TIN[2 if x1 < cx else 4])
    s.line(cx, 52, 6, 56, TIN[2])
    s.line(cx, 52, 34, 56, TIN[3])
    s.rect(cx - 3, 32, cx + 4, 38, TIN[3])                    # head
    s.rect(cx - 3, 32, cx + 4, 32, TIN[5])
    # the tube, pointing up and to the right, with a dew shield and an eyepiece
    for k in range(0, 34):
        x, y = cx + 2 + int(k * 0.62), 34 - int(k * 0.78)
        wd = 3 if k < 28 else 4
        for dx in range(-wd, wd + 1):
            c = TIN[2] if dx < -1 else (TIN[4] if dx < 2 else TIN[5])
            s.puti(x + dx // 1, y + (dx // 2), c)
    s.rect(cx - 8, 36, cx - 6, 41, TIN[2])                    # eyepiece at the lower end
    s.puti(cx - 8, 41, TIN[5])
    s.rect(cx + 24, 8, cx + 28, 10, hx("#14182c"))
    cap_outline(s, [TIN])
    return s


SPRITES = {
    "saloon_lit": saloon_lit, "store_lit": store_lit, "water_tower": water_tower, "wagon": wagon,
    "mine_cart": mine_cart, "hitch_rail": hitch_rail, "red_rock": red_rock, "gas_lamp_lit": gas_lamp_lit,
    "observatory_lit": observatory_lit, "radio_dish": radio_dish, "antenna_lit": antenna_lit,
    "night_pine": night_pine, "crystal_lit": crystal_lit, "tent_lit": tent_lit, "telescope": telescope,
}
TOWN = {"saloon_lit", "store_lit", "water_tower", "wagon", "mine_cart", "hitch_rail", "red_rock", "gas_lamp_lit"}
GLOW_OK = {(255, 216, 120), (255, 240, 184), (232, 244, 255), (255, 240, 224), (255, 138, 120)}


def check(name, s):
    a = s.a
    assert set(np.unique(a[..., 3])) <= {0, 255}, f"{name}: alpha must be 0/255"
    assert (a[-1, :, 3] > 0).any(), f"{name}: bottom row must touch the ground"
    if name.endswith("_lit"):
        for y, x in zip(*np.nonzero(a[..., 3])):
            c = tuple(int(v) for v in a[y, x, :3])
            if luma(c) > 200 and c not in GLOW_OK:
                print(f"  note: {name}: bright colour {c} will glow")
                return


def main():
    names = sys.argv[1:] or list(SPRITES)
    made = []
    for n in names:
        s = SPRITES[n]()
        check(n, s)
        s.save(n)
        made.append((n, s))
        print(f"{n} {s.w}x{s.h}")
    for tag, bgc in (("town", (214, 158, 108)), ("summit", (24, 30, 60))):
        sel = [m for m in made if (m[0] in TOWN) == (tag == "town")]
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

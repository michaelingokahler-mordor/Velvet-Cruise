#!/usr/bin/env python3
"""Velvet Cruise -- inland route scenery, batch A.

Three new stages:
  THUNDER HIGHWAY  hwy_lamp_lit, gantry, pylon, hwy_sign, barrier
  VINEYARD VALLEY  vines, cypress_tall, olive, winery, barrels, windmill, haybale
  REDWOOD PASS     redwood, pine, fern, log, cabin_lit

Pillow + numpy only.  Reuses the helpers / palettes of make_scenery.py (imported,
never modified).  Writes the PNGs into ./out/ next to the existing sprites
(never touching an existing file) and a 4x preview sheet
./preview_routes_a.png: one row per stage, the same sheet on a neutral
mid-grey (left) and on a dark background (right).

Conventions (see ../STYLE.md): alpha 0/255 only, bottom row = ground contact,
object centred on its base, sun ahead/right/high, neutral daylight colours,
selective dark outline, no text anywhere.  `_lit` sprites: only the light
pixels have luma > 200 (the engine makes exactly those pixels emissive).

Run:  python3 -B make_routes_a.py            (all sprites + preview)
      python3 -B make_routes_a.py vines ...  (only these sprites, + preview)
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_scenery as ms  # noqa: E402
from make_scenery import (  # noqa: E402
    Spr, hx, ramp, clampi, band, ball, selout, outer_outline, remove_orphans, bottom_fix,
    lobed_ball, leaf_dabs, foliage, ring_shadow, stroke, add_layer, limit_palette, shift_x,
    remap, lit_outline, side_face, glass_window, paste_with_shadow, fill_holes, LIGHT,
    OUTLINE, GREY, STEEL, WHITE, WOOD, LEAF, CYP, PURPLE, YEL, GLASS, TERRA, STRAW, GREYROCK,
    PALM_Y,
)

OUT = ms.OUT


# --------------------------------------------------------------------------
# palettes (new materials)
# --------------------------------------------------------------------------
SIGNG = ramp("#0b2219", "#123a28", "#1a5236", "#226842", "#2e7e50", "#4a9a62")   # highway green
CONC = ramp("#2a2630", "#45414a", "#625d62", "#807a78", "#9c958e", "#b8b0a4", "#d2cabc")
LENS_RIM, LENS_CORE = hx("#ffd060"), hx("#fff2b0")          # luma 210 / 239 -> emissive
REFL = ramp("#6a5a2a", "#a08a3a", "#c8ac48", "#e6c85c")     # faded yellow reflector paint
INSUL = ramp("#3a3a48", "#7a7c8a", "#b0b4be", "#d8dade")    # porcelain insulator discs

VLEAF = ramp("#0c2014", "#14341c", "#1e4a22", "#2c6226", "#427c2a", "#62962e", "#94b43c")
GRAPE = ramp("#1a1028", "#2e1a42", "#48285e", "#64407a", "#8a64a0")
STAKE = ramp("#2e2024", "#523a30", "#7a5a42", "#a07e5a", "#c4a47a")
VTRUNK = ramp("#2a1c1e", "#46302a", "#664836", "#866248")
OLEAF = ramp("#1a2420", "#2a3a30", "#3e5242", "#586c52", "#788a66", "#9cab84", "#c4ceaa")
OBARK = ramp("#211b1f", "#362c2e", "#4e423e", "#6a5c52", "#857562", "#9c8c72")
STONE = ramp("#3e2a2a", "#6a4a3c", "#94704f", "#b68e62", "#d0aa76", "#e4c48e", "#f0d8aa")
TILE = ramp("#3a1a1c", "#62282a", "#8a3a30", "#ac5236", "#c86c40", "#de8a52")
SHUT = ramp("#14262a", "#1f3c3a", "#2c544a", "#3e6c58", "#5a8866")             # sage shutters
OAK = ramp("#2c1a1c", "#4c2c24", "#70442e", "#94603a", "#b47e4c", "#cc9c62")
IRON = ramp("#16141c", "#2a2830", "#44424c", "#66646e")
HAY = ramp("#4c3418", "#7a5824", "#a87e30", "#cca444", "#e6c464", "#f4dc8c")
SHINGLE = ramp("#241c22", "#3a2c30", "#54403e", "#6e5650", "#8a6e62", "#a68a78")
RWBARK = ramp("#24141c", "#3e1e24", "#5e2c2c", "#7e3e30", "#a05436", "#bc6e42", "#d48e58")
RWG = ramp("#0a1a18", "#10261f", "#173626", "#20482d", "#2e5c33", "#43723a", "#5e8a44")
FERN = ramp("#0c2216", "#14361e", "#1e4e24", "#2c6828", "#3e822c", "#5a9c34", "#84b844")
MOSS = ramp("#1a2a14", "#2c4418", "#44621e", "#628226", "#84a030", "#a8bc44")
LOGB = ramp("#1e1618", "#34262a", "#4c3834", "#664c40", "#82644e", "#9c7c5e")
CUTW = ramp("#5a3424", "#86533a", "#a8724c", "#c49262", "#d8ae7e", "#e8c896")
CABL = ramp("#2a1c1e", "#46302a", "#66462f", "#86603a", "#a47a48", "#bc945a")   # cabin logs
CHIM = ramp("#262228", "#3e3a40", "#5a5458", "#787070", "#968c86", "#b0a69a")


def luma(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


# --------------------------------------------------------------------------
# small shared helpers
# --------------------------------------------------------------------------
def mask_from(w, h, fn):
    """Boolean mask drawn with a PIL ImageDraw callback (no anti-aliasing)."""
    m = Image.new("L", (w, h), 0)
    fn(ImageDraw.Draw(m))
    return np.array(m) > 0


def fill_mask(s, m, c, ox=0, oy=0):
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        s.puti(x + ox, y + oy, c)


def shaded_vbar(s, x0, x1, y0, y1, cols):
    """Vertical bar whose columns use cols left->right (round tube look)."""
    n = x1 - x0 + 1
    for i in range(n):
        k = int(round(i * (len(cols) - 1) / max(1, n - 1)))
        s.vline(x0 + i, y0, y1, cols[k])


def shaded_line(s, x0, y0, x1, y1, top, bot, thick=2):
    """Member drawn 'thick' px tall: lit colour on top, shadow below."""
    for k in range(thick):
        s.line(x0, y0 + k, x1, y1 + k, top if k == 0 else bot)


def centre_on_base(s, rows=3):
    """Shift the art so the bottom `rows` rows are centred horizontally."""
    op = s.opaque()
    base = op[s.h - rows:].any(axis=0)
    xs = np.nonzero(base)[0]
    if not len(xs):
        return
    mid = (xs.min() + xs.max() + 1) / 2.0
    dx = int(round(s.w / 2.0 - mid))
    if dx:
        shift_x(s, dx)


# ==========================================================================
# THUNDER HIGHWAY
# ==========================================================================
def hwy_lamp_lit():
    """Tall steel highway light: pole centred, davit arm curving over to the
    right, flat lamp head with a glowing lens underneath."""
    w, h = 26, 124
    s = Spr(w, h)
    S = STEEL                       # never use S[6] here (luma > 200 would glow)
    # concrete footing + breakaway base
    s.rect(8, 119, 17, 123, CONC[3]); s.hline(8, 17, 119, CONC[5]); s.hline(9, 16, 120, CONC[4])
    s.vline(8, 120, 123, CONC[2]); s.vline(17, 120, 123, CONC[4]); s.hline(8, 17, 123, CONC[1])
    s.rect(10, 111, 15, 118, S[3]); s.vline(10, 111, 118, S[1]); s.vline(11, 111, 118, S[2])
    s.vline(15, 111, 118, S[5]); s.hline(10, 15, 111, S[5]); s.hline(10, 15, 118, S[1])
    for bx in (10, 15):
        s.puti(bx, 117, S[4])
    # tapered pole: 4 px -> 3 px -> 2 px
    shaded_vbar(s, 11, 14, 76, 110, [S[1], S[3], S[4], S[5]])
    s.hline(11, 14, 76, S[5]); s.hline(11, 14, 77, S[2])            # weld collar
    shaded_vbar(s, 12, 14, 34, 75, [S[1], S[4], S[5]])
    s.hline(12, 14, 34, S[5]); s.hline(12, 14, 35, S[2])
    shaded_vbar(s, 12, 13, 17, 33, [S[2], S[5]])
    # davit arm: quarter curve over to the right, then a slightly rising arm
    pts = []
    R = 6.0
    cx, cy = 12.5 + R, 17.5
    for k in range(0, 25):
        th = math.radians(180 - k * 90 / 24.0)
        pts.append((cx + R * math.cos(th), cy - R * math.sin(th)))
    pts += [(21.0, 11.0), (22.5, 10.8)]
    stroke(s, pts, lambda u: 2.4, S, lo=2, hi=5)
    # flat lamp head (top face seen from above, side, glowing lens below)
    s.hline(18, 24, 9, S[4]); s.puti(24, 9, S[5]); s.puti(18, 9, S[3])
    s.hline(17, 25, 10, S[5]); s.puti(17, 10, S[3])
    s.hline(17, 25, 11, S[3]); s.puti(25, 11, S[4]); s.puti(17, 11, S[1])
    s.hline(17, 25, 12, S[1])
    s.hline(18, 24, 13, LENS_RIM); s.hline(19, 23, 13, LENS_CORE)
    s.hline(19, 23, 14, LENS_RIM)
    pole = np.zeros((h, w), bool)
    pole[12:, :16] = True
    selout(s, [S, CONC], dirs=((-1, 0),), mask=pole)
    remove_orphans(s)
    bottom_fix(s)
    return s


def truss_post(s, x0, top, bot, P=16):
    """17 px open lattice post: two round chords, 2 px zig-zag bracing and
    rungs; the gaps stay transparent."""
    S = STEEL
    x1 = x0 + 16
    for yb in range(top - P, bot + P, P):
        for k in range(2):
            ya = yb + k * (P // 2)
            xa, xb = (x0 + 3, x1 - 3) if k == 0 else (x1 - 3, x0 + 3)
            for px, py in s.line_pts(xa, ya, xb, ya + P // 2):
                if top <= py <= bot:
                    s.puti(px, py, S[4] if k == 0 else S[3])
                    if py + 1 <= bot:
                        s.puti(px, py + 1, S[2] if k == 0 else S[1])
        if top <= yb <= bot - 1:
            s.hline(x0 + 3, x1 - 3, yb, S[5]); s.hline(x0 + 3, x1 - 3, yb + 1, S[2])
    shaded_vbar(s, x0, x0 + 2, top, bot, [S[1], S[3], S[4]])
    shaded_vbar(s, x1 - 2, x1, top, bot, [S[2], S[4], S[6]])


def footing(s, x0, x1, y0, y1):
    s.rect(x0, y0, x1, y1, CONC[3])
    s.hline(x0, x1, y0, CONC[6]); s.hline(x0, x1, y0 + 1, CONC[5])
    s.vline(x0, y0 + 1, y1, CONC[2]); s.vline(x1, y0 + 1, y1, CONC[5])
    s.hline(x0, x1, y1, CONC[1])
    for xx in (x0 + 3, x1 - 3):
        s.puti(xx, y0 + 3, CONC[2]); s.puti(xx + 1, y0 + 3, CONC[4])


def down_arrow(m, cx, y0, shaft_h, head_hw, shaft_hw=3):
    """Pixel-exact down arrow, symmetric about the pixel edge cx."""
    for y in range(y0, y0 + shaft_h):
        m[y, cx - shaft_hw:cx + shaft_hw] = True
    for r in range(head_hw):
        hw = head_hw - r
        m[y0 + shaft_h + r, cx - hw:cx + hw] = True


def bent_arrow(m, x0, ybot, shaft_h, diag, thick=6, head=10, mirror=False):
    """Vertical shaft from the bottom that bends 45 deg and points up-right
    (or up-left when mirror)."""
    H, W = m.shape
    lay = np.zeros_like(m)
    for y in range(ybot - shaft_h, ybot + 1):
        lay[y, x0:x0 + thick] = True
    # diagonal band, thickness measured horizontally
    yb = ybot - shaft_h
    for k in range(diag + 1):
        y = yb - k
        xa = x0 + k
        lay[y, xa:xa + thick] = True
        lay[y + 1, xa:xa + thick] = True
    # head: right-angle triangle with the tip at the top-right
    tx = x0 + diag + thick + head // 2
    ty = yb - diag - head // 2
    for yy in range(ty, ty + head + 1):
        for xx in range(tx - head, tx + 1):
            if (tx - xx) + (yy - ty) <= head:
                lay[yy, xx] = True
    if mirror:
        lay = lay[:, ::-1]
    m |= lay


def sign_board(s, x0, y0, x1, y1, arrow_fn, frame_top=True):
    """Highway-green guide sign: dark rim, lit top/right edge, thin white
    border inset 2 px with rounded corners, white arrow."""
    G = SIGNG
    s.rect(x0, y0, x1, y1, G[0])
    s.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, G[3])
    if frame_top:
        s.hline(x0 + 1, x1, y0, G[5])                # top edge catches the sun
        s.vline(x1, y0, y1 - 1, G[4])                 # right edge
    s.hline(x0 + 1, x1 - 1, y1 - 1, G[2])
    # white border
    bx0, by0, bx1, by1 = x0 + 2, y0 + 2, x1 - 2, y1 - 2
    W4 = WHITE[4]
    s.hline(bx0 + 1, bx1 - 1, by0, W4); s.hline(bx0 + 1, bx1 - 1, by1, W4)
    s.vline(bx0, by0 + 1, by1 - 1, W4); s.vline(bx1, by0 + 1, by1 - 1, W4)
    m = np.zeros((s.h, s.w), bool)
    arrow_fn(m)
    fill_mask(s, m, W4)


def gantry():
    """Overhead sign bridge in the gate's 256x112 frame."""
    w, h = 256, 112
    s = Spr(w, h)
    S = STEEL
    # --- beam: front Warren truss, top/bottom box chords ---
    BX0, BX1 = 6, 250
    # back truss diagonals (seen through the gaps, darker)
    P = 16
    TX0, TX1 = 23, 231               # truss bays between the posts
    for xa in range(TX0, TX1, P):
        s.line(xa + 2, 24, xa + P, 10, S[1]); s.line(xa + 3, 24, xa + P + 1, 10, S[1])
    for xa in range(TX0, TX1 + 1, P):
        # front: verticals + diagonals
        shaded_vbar(s, xa, xa + 2, 9, 25, [S[2], S[3], S[5]])
        if xa + P <= TX1:
            for px, py in s.line_pts(xa + 2, 10, xa + P, 24):
                s.puti(px, py, S[4]); s.puti(px, py + 1, S[2])
    # top chord (box seen from above): lit top face, front face, dark lip
    s.hline(BX0, BX1, 4, S[6]); s.hline(BX0, BX1, 5, S[5]); s.hline(BX0, BX1, 6, S[5])
    s.hline(BX0, BX1, 7, S[4]); s.hline(BX0, BX1, 8, S[3]); s.hline(BX0, BX1, 9, S[1])
    for xx in range(BX0 + 4, BX1, 8):
        s.puti(xx, 5, S[4])                           # deck plate seams
    # bottom chord
    s.hline(BX0, BX1, 25, S[5]); s.hline(BX0, BX1, 26, S[4]); s.hline(BX0, BX1, 27, S[4])
    s.hline(BX0, BX1, 28, S[3]); s.hline(BX0, BX1, 29, S[2]); s.hline(BX0, BX1, 30, S[1])
    # --- posts + footings ---
    for x0 in (6, 234):
        truss_post(s, x0, 4, 103)
        s.rect(x0 - 1, 2, x0 + 17, 3, S[4]); s.hline(x0 - 1, x0 + 17, 2, S[6])
        s.vline(x0 - 1, 2, 3, S[2])
        # gusset plates where the beam meets the post
        for gy in (6, 27):
            s.rect(x0 + 4, gy - 1, x0 + 12, gy + 2, S[4]); s.hline(x0 + 4, x0 + 12, gy - 1, S[5])
            s.puti(x0 + 5, gy, S[2]); s.puti(x0 + 11, gy, S[2])
        footing(s, x0 - 3, x0 + 19, 104, 111)
    # --- signs (in front of the truss) ---
    def a_down2(m, x0, x1):
        cxa = x0 + (x1 - x0 + 1) // 4 + 1
        cxb = x1 - (x1 - x0 + 1) // 4
        for c in (cxa, cxb):
            down_arrow(m, c, 17, 17, 8, shaft_hw=3)

    def a_down1(m, x0, x1):
        down_arrow(m, (x0 + x1 + 1) // 2, 16, 18, 10, shaft_hw=3)

    def a_bent(m, x0, x1):
        bent_arrow(m, x0 + 18, 49, 12, 13, thick=6, head=13)

    for (x0, x1, fn) in ((30, 94, a_down2), (101, 155, a_down1), (162, 226, a_bent)):
        sign_board(s, x0, 11, x1, 55, lambda m, a=x0, b=x1, f=fn: f(m, a, b))
        # hanger brackets peeking under the sign's lower corners
    selout(s, [S, CONC], dirs=((0, 1),),
           mask=np.r_[np.zeros((h - 1, w), bool), np.ones((1, w), bool)])
    return s


def pylon():
    """Steel lattice transmission tower: flared legs, X-braced body, three
    cross arms with hanging porcelain insulator strings."""
    w, h = 64, 150
    s = Spr(w, h)
    S = STEEL
    C = 32.0
    # body half-width as a function of y
    TOP, WAIST, BOT = 8, 70, 149

    def hw(y):
        if y <= WAIST:
            return 3.0 + 4.0 * (y - TOP) / (WAIST - TOP)
        t = (y - WAIST) / (BOT - WAIST)
        return 7.0 + 15.0 * t ** 1.25

    lay = Spr(w, h)            # bracing (drawn first, darker)
    # panel boundaries
    panels = [8, 18, 26, 40, 48, 62, 70, 84, 100, 118, 149]
    for i in range(len(panels) - 1):
        ya, yb = panels[i], panels[i + 1]
        la, ra = C - hw(ya), C + hw(ya)
        lb, rb = C - hw(yb), C + hw(yb)
        lay.line(la + 1, ya, rb - 1, yb, S[4])
        lay.line(ra - 1, ya, lb + 1, yb, S[3])
        lay.line(la, ya, ra, ya, S[4])
    for p in panels[1:-1]:
        s.hline(int(round(C - hw(p))), int(round(C + hw(p))) - 1, p, S[4])
    add_layer(s, lay)
    # legs: 2 px members, left in shade, right lit
    for y in range(TOP, BOT + 1):
        xl = int(math.floor(C - hw(y) + 0.5)); xr = int(math.floor(C + hw(y) + 0.5)) - 1
        s.puti(xl, y, S[1]); s.puti(xl + 1, y, S[3])
        s.puti(xr - 1, y, S[4]); s.puti(xr, y, S[5])
    # peak (earth wire)
    for y in range(0, TOP):
        k = (TOP - y) / TOP
        xl = int(round(C - 1 - 2 * (1 - k))); xr = int(round(C + 1 + 2 * (1 - k))) - 1
        s.puti(xl, y, S[1]); s.puti(xr, y, S[5])
        if xr - xl > 1:
            s.hline(xl + 1, xr - 1, y, S[3])
    s.hline(28, 35, TOP, S[5]); s.hline(28, 35, TOP + 1, S[2])

    # cross arms: ladder trusses (sloping lit top chord, flat bottom chord
    # with a dark underside), straight insulator strings at the tips
    ins = np.zeros((h, w), bool)

    def arm(y, reach):
        for side in (-1, 1):
            xa = C + side * (hw(y) - 1)
            xt = C + side * reach
            lit = S[5] if side > 0 else S[4]
            s.line(xa, y - 4, xt, y + 1, lit)
            s.line(xa, y + 2, xt, y + 2, S[4] if side > 0 else S[3])
            s.line(xa, y + 3, xt, y + 3, S[1])
            n = int(abs(xt - xa) // 4)
            for k in range(1, n + 1):
                xx = int(round(xa + side * k * 4))
                f = abs(xx - xa) / max(1, abs(xt - xa))
                yt = int(round(y - 4 + 5 * f))
                s.vline(xx, yt + 1, y + 1, S[2])
                if k < n:
                    s.line(xx, y + 1, xx + side * 3, yt + 2, S[2])
            xi = int(round(xt)) - (1 if side < 0 else 0)
            yi = y + 4
            s.vline(xi, y, yi, S[1])
            for j in range(5):
                yy = yi + 1 + j * 2
                s.hline(xi - 1, xi + 1, yy, INSUL[2]); s.puti(xi + 1, yy, INSUL[3])
                s.puti(xi - 1, yy, INSUL[1])
                s.puti(xi, yy + 1, INSUL[0])
                ins[yy:yy + 2, xi - 1:xi + 2] = True
            s.hline(xi - 1, xi + 1, yi + 11, S[2]); s.puti(xi, yi + 12, S[1])
            ins[yi + 11:yi + 13, xi - 1:xi + 2] = True
    arm(20, 19)
    arm(42, 28)
    arm(64, 22)
    # dark outline on the outer sides of the members, except inside the arm
    # trusses (keeps them clean); insulators get it too so they read bold
    body = np.ones((h, w), bool)
    for (ya, reach) in ((20, 19), (42, 28), (64, 22)):
        for y in range(ya - 5, ya + 4):
            xl = int(math.floor(C - hw(y) + 0.5)); xr = int(math.floor(C + hw(y) + 0.5)) - 1
            body[y, :xl - 1] = False
            body[y, xr + 2:] = False
    body |= ins
    outer_outline(s, OUTLINE, dirs=((1, 0), (-1, 0)), mask=body)
    remove_orphans(s)
    # concrete pad feet
    for x in (int(C - hw(BOT)) - 1, int(C + hw(BOT)) - 3):
        s.rect(x - 1, 146, x + 4, 149, CONC[3]); s.hline(x - 1, x + 4, 146, CONC[5])
        s.vline(x - 1, 147, 149, CONC[2]); s.hline(x - 1, x + 4, 149, CONC[1])
    bottom_fix(s)
    return s


def hwy_sign():
    """Roadside guide sign on two posts, arrow pointing up-left."""
    w, h = 64, 58
    s = Spr(w, h)
    S = STEEL
    for x0 in (15, 46):
        shaded_vbar(s, x0, x0 + 2, 30, 57, [S[1], S[3], S[5]])
        s.rect(x0 - 1, 55, x0 + 3, 57, S[3]); s.hline(x0 - 1, x0 + 3, 55, S[5])
        s.vline(x0 - 1, 56, 57, S[1]); s.hline(x0 - 1, x0 + 3, 57, S[1])

    sign_board(s, 2, 1, 61, 38, lambda m: None)
    m = np.zeros((h, w), bool)
    bent_arrow(m, 25, 33, 9, 9, thick=6, head=12, mirror=True)
    fill_mask(s, m, WHITE[4])
    # plate thickness: dark sliver under the board
    s.hline(3, 61, 39, SIGNG[0])
    remove_orphans(s)
    bottom_fix(s)
    return s


def barrier():
    """Concrete jersey barrier segment, long side to the camera: lit top,
    upper face, slope break, lit lower slope, dark foot; faded yellow
    reflector stripe and a drain slot."""
    w, h = 64, 20
    s = Spr(w, h)
    C = CONC
    rows = [C[6], C[5], C[4], C[4], C[4], C[3], C[3], C[3], C[3], C[3], C[2], C[4],
            C[5], C[5], C[5], C[4], C[4], C[3], C[2], C[1]]
    for y, c in enumerate(rows):
        s.hline(0, w - 1, y, c)
    for (x, y) in ((0, 0), (1, 0), (0, 1), (w - 1, 0), (w - 2, 0), (w - 1, 1)):
        s.clear(x, y)
    # reflector stripe
    s.hline(2, w - 3, 4, REFL[2])
    for x in (8, 31, 54):
        s.rect(x, 4, x + 2, 4, REFL[3])
        s.puti(x, 5, REFL[1])
    # end joints: shaded left end, lit right end
    s.vline(0, 2, 18, C[2]); s.puti(1, 1, C[4])
    s.vline(w - 1, 2, 18, C[5]); s.puti(w - 2, 1, C[6])
    for x in (0, w - 1):                       # joint loops at the ends
        s.puti(x, 7, C[1]); s.puti(x, 8, C[1])
    # drain slot at the foot, centred
    s.rect(28, 16, 35, 19, C[0]); s.hline(28, 35, 15, C[2])
    s.vline(36, 16, 19, C[4])
    # subtle form-panel seams
    for x in (16, 47):
        s.vline(x, 6, 9, C[2]); s.vline(x + 1, 6, 9, C[4])
    selout(s, [C], dirs=((0, 1), (-1, 0)))
    s.hline(0, w - 1, 19, C[1])
    remove_orphans(s)
    bottom_fix(s)
    return s


# ==========================================================================
# VINEYARD VALLEY
# ==========================================================================
GRAPE_PAT = [".mmm.",
             "dmlhm",
             "dmml.",
             ".dm..",
             "..d.."]
GRAPE_IDX = {"d": 1, "m": 2, "l": 3, "h": 4}


def grapes(s, x, y):
    for j, row in enumerate(GRAPE_PAT):
        for i, ch in enumerate(row):
            if ch != ".":
                s.puti(x + i, y + j, GRAPE[GRAPE_IDX[ch]])


def vines():
    """One trellised grapevine row segment, long side to the camera: lit
    leafy hedge with a sunlit top, stakes poking up, grape clusters peeking
    out at the bottom of the canopy, gnarled trunks below.  Ends taper."""
    w, h = 84, 34
    s = Spr(w, h)
    rng = random.Random(7)
    # gnarled vine trunks below the canopy
    for bx in (20, 34, 50, 64):
        d = rng.choice((-1, 1))
        stroke(s, [(bx, 33.5), (bx + d, 30), (bx, 27), (bx - d, 23)],
               lambda u: 3.2 - 1.0 * u, VTRUNK, lo=1)
    # wooden stakes (whole height; canopy covers the middle)
    for sx in (11, 42, 72):
        s.rect(sx, 1, sx + 1, 33, STAKE[2]); s.vline(sx + 1, 1, 33, STAKE[3])
        s.puti(sx, 0, STAKE[3]); s.puti(sx + 1, 0, STAKE[4])
    selout(s, [VTRUNK, STAKE], dirs=((-1, 0),))
    # canopy: a hedge of lobed clumps, smaller and lower toward the ends
    can = Spr(w, h)
    blobs = []
    n = 9
    for i in range(n):
        e = min(i, n - 1 - i)
        k = (0.62, 0.84, 1.0, 1.0, 1.0)[min(e, 4)]
        x = 8 + i * (68 / (n - 1)) + rng.uniform(-1.2, 1.2)
        blobs.append((x, 19 + (1 - k) * 6, 7.0 * k + 1.0, 7.0 * k, -0.1))
    for i in range(7):
        e = min(i, 6 - i)
        k = (0.7, 0.9, 1.0, 1.0)[min(e, 3)]
        x = 14 + i * (56 / 6) + rng.uniform(-1.5, 1.5)
        blobs.append((x, 12 + (1 - k) * 7 + rng.uniform(-0.8, 0.8), 6.2 * k, 5.0 * k, 0.0))
    foliage(can, blobs, VLEAF, seed=4, bias=0.0, ao=0.32, dab_step=4)
    add_layer(s, can, [VTRUNK, STAKE])
    # grape clusters peeking out along the lower canopy edge
    op = can.opaque()
    for gx in (6, 15, 27, 39, 46, 57, 68, 76):
        col = np.nonzero(op[:, gx + 2])[0]
        if not len(col):
            continue
        gy = col[-1] - rng.choice((2, 3, 4))
        grapes(s, gx, gy)
    for (gx, gy) in ((21, 16), (53, 18), (33, 20)):
        grapes(s, gx, gy)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


def cypress_tall():
    """Slender Tuscan cypress: narrow flame of upswept clumps, lit right
    edge, tiny trunk."""
    w, h = 26, 104
    s = Spr(w, h)
    # trunk
    s.rect(12, 96, 14, 103, ms.BARK[2]); s.vline(12, 96, 103, ms.BARK[1])
    s.vline(14, 96, 103, ms.BARK[3]); s.hline(11, 15, 103, ms.BARK[1])
    prof = [(0.0, 0.8), (0.08, 2.4), (0.22, 5.2), (0.42, 8.2), (0.6, 9.8), (0.76, 9.8),
            (0.88, 8.2), (0.96, 6.0), (1.0, 4.0)]

    def W(t):
        for (t0, w0), (t1, w1) in zip(prof, prof[1:]):
            if t <= t1:
                return w0 + (w1 - w0) * (t - t0) / (t1 - t0)
        return prof[-1][1]
    top, bot = 1, 98
    cx = 13.0
    rng = random.Random(21)
    blobs = []
    yc = bot - 4.0
    while yc > top + 3:
        t = (yc - top) / (bot - top)
        Wt = W(t)
        if Wt < 3.5:
            blobs.append((cx + rng.uniform(-0.4, 0.4), yc, max(1.6, Wt + 0.4), 4.2, 0.02))
        else:
            nb = 2 if Wt < 7.5 else 3
            rx = Wt / nb * 1.25 + 0.8
            for j in range(nb):
                u = (j / (nb - 1)) * 2 - 1
                bx = cx + u * (Wt - rx) + rng.uniform(-0.6, 0.6)
                blobs.append((bx, yc + rng.uniform(-0.8, 0.8) + abs(u) * 1.5, rx, 4.6, 0.09 * u))
        yc -= 4.2
    blobs.append((cx + 0.3, top + 3.5, 1.3, 3.2, 0.1))
    foliage(s, blobs, CYP, seed=9, bias=0.02, ao=0.22, lobes=7, lobe_amp=0.12, dab_step=4,
            gamma=1.3, lit_outline_idx=4)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 20)
    return s


def olive():
    """Olive tree: gnarled twin-strand trunk splitting into limbs, airy
    silvery canopy built from separate cloud-like clumps with gaps."""
    w, h = 72, 70
    s = Spr(w, h)
    fib = [(-0.4, 5, 3, 0), (0.25, 6, 3, 2)]
    tr = Spr(w, h)
    stroke(tr, [(32, 69.5), (31, 64), (34, 58), (31, 51), (28, 45)],
           lambda u: 8.5 - 4 * u + (4 * (0.12 - u) / 0.12 if u < 0.12 else 0), OBARK,
           streaks=fib, lo=1)
    stroke(tr, [(40, 69.5), (41, 63), (37, 57), (39, 50), (43, 44)],
           lambda u: 8 - 4 * u + (4 * (0.12 - u) / 0.12 if u < 0.12 else 0), OBARK,
           streaks=fib, lo=1)
    limbs = [
        ([(28, 46), (22, 39), (15, 34), (9, 33)], 4.0, 2.0),
        ([(29, 46), (29, 37), (26, 28), (24, 20)], 3.6, 2.0),
        ([(43, 45), (50, 38), (57, 33), (63, 31)], 4.0, 2.0),
        ([(42, 45), (42, 35), (45, 26), (46, 18)], 3.6, 2.0),
        ([(35, 52), (36, 42), (35, 30)], 3.0, 1.8),
    ]
    for pts, w0, w1 in limbs:
        stroke(tr, pts, lambda u, a=w0, b=w1: a + (b - a) * u, OBARK,
               streaks=[(0.2, 5, 2, 1)], lo=1)
    selout(tr, [OBARK], dirs=((0, 1), (-1, 0)))
    add_layer(s, tr)
    # canopy clumps (each group = one airy puff), drawn back to front
    groups = [
        ([(36, 12, 13, 8), (26, 15, 9, 6), (47, 13, 10, 7), (36, 6, 8, 5)], 0.02),
        ([(14, 29, 9, 6.5), (8, 33, 5, 4), (21, 27, 6, 5)], -0.02),
        ([(58, 27, 9, 6.5), (64, 31, 5, 4), (51, 25, 6, 5)], 0.06),
        ([(27, 23, 8, 5.5), (33, 25, 6, 4.5)], 0.0),
        ([(45, 22, 8, 5.5), (51, 19, 5, 4)], 0.05),
        ([(36, 33, 7, 4.5)], -0.04),
    ]
    can = Spr(w, h)
    for k, (blobs, b) in enumerate(groups):
        lay = Spr(w, h)
        foliage(lay, blobs, OLEAF, seed=30 + k, bias=b - 0.1, ao=0.26, lobes=10, lobe_amp=0.2,
                dab_step=3, gamma=1.3, outline=False)
        add_layer(can, lay, [OLEAF], sh=1)
    # silver flecks: leaf undersides flashing on the lit upper-right areas
    rng = random.Random(5)
    idx = {c: i for i, c in enumerate(OLEAF)}
    op = can.opaque()
    for _ in range(140):
        x = rng.randint(2, w - 4); y = rng.randint(1, 44)
        c = can.get(x, y)
        if c is None or idx.get(c, 0) < 5 or not (op[y, x + 1] and op[y - 1, x]):
            continue
        can.puti(x, y, OLEAF[6]); can.puti(x + 1, y, OLEAF[5])
    selout(can, [OLEAF], dirs=((0, 1), (-1, 0)))
    add_layer(s, can, [OBARK], sh=1)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


def stone_tex(w, h, seed, course=(4, 3), blen=(5, 10), light_p=0.16, dark_p=0.06):
    """Coursed-stone offset map: 0 = stone, +1 = lighter block, -1 = darker
    block / mortar (bottom row of each course + block joints)."""
    rng = random.Random(seed)
    t = np.zeros((h, w), int)
    y, k = 0, 0
    while y < h:
        ch = course[k % len(course)]
        x = -rng.randint(0, blen[1] - 1)
        while x < w:
            bl = rng.randint(*blen)
            r = rng.random()
            v = 1 if r < light_p else (-1 if r < light_p + dark_p else 0)
            for yy in range(y, min(h, y + ch - 1)):
                for xx in range(max(0, x + 1), min(w, x + bl)):
                    t[yy, xx] = v
                if 0 <= x < w:
                    t[yy, x] = -1
            x += bl
        if y + ch - 1 < h:
            t[y + ch - 1, :] = -1
        y += ch
        k += 1
    return t


def stone_front(s, x0, y0, x1, y1, base, seed, rmp=None):
    rmp = STONE if rmp is None else rmp
    t = stone_tex(x1 - x0 + 1, y1 - y0 + 1, seed)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            s.puti(x, y, rmp[clampi(base + t[y - y0, x - x0], 0, len(rmp) - 1)])


def stone_side(s, x0, x1, ytop, ybot, slope, base, seed, rmp=None):
    rmp = STONE if rmp is None else rmp
    t = stone_tex(x1 - x0 + 1, ybot - ytop + 1 + int(slope * (x1 - x0)) + 2, seed)
    off = int(slope * (x1 - x0)) + 1

    def col(x, y, u, v):
        yy = int(round(y - ytop + (x - x0) * slope))
        return rmp[clampi(base + t[clampi(yy, 0, t.shape[0] - 1), x - x0], 0, len(rmp) - 1)]
    side_face(s, x0, x1, ytop, ybot, slope, col)


def barrel_head(s, cx, cy, r, sliver=3):
    """Oak barrel lying with its head toward the camera: a crescent of the
    stave body (with an iron hoop) visible above, round head with board
    seams and a dark iron chime ring."""
    # receding body crescent
    for y in range(int(cy - r - sliver) - 1, int(cy + r) + 1):
        for x in range(int(cx - r) - 1, int(cx + r) + 1):
            dxx = x + 0.5 - cx
            d_far = math.hypot(dxx, y + 0.5 - (cy - sliver))
            if d_far > r:
                continue
            u = dxx / r
            c = OAK[2] if u < -0.3 else (OAK[3] if u < 0.35 else OAK[4])
            if (x - int(cx)) % 3 == 0:
                c = OAK[1] if u < 0.35 else OAK[2]
            yy = y + 0.5 - (cy - sliver)
            if abs(math.hypot(dxx, yy) - (r - 1.6)) < 0.55 and yy < 0:
                c = IRON[1] if u < 0.3 else IRON[2]
            s.puti(x, y, c)
    # head
    for y in range(int(cy - r) - 1, int(cy + r) + 1):
        for x in range(int(cx - r) - 1, int(cx + r) + 1):
            dx_, dy_ = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx_, dy_)
            if d > r:
                continue
            if d > r - 1.15:
                lit = dx_ * 0.7 - dy_ * 0.7 > r * 0.35
                c = IRON[3] if lit else IRON[1]
            elif d > r - 2.1 and dx_ * 0.7 - dy_ * 0.7 < 0:
                c = OAK[1]
            else:
                i = (dx_ * 0.55 - dy_ * 0.62) / r
                c = OAK[3] if i < 0.15 else OAK[4]
                if i < -0.45:
                    c = OAK[2]
                if (x - int(cx) + 1) % 3 == 0:
                    c = OAK[2] if i > -0.45 else OAK[1]
            s.puti(x, y, c)


def barrels():
    """Pyramid of oak wine barrels: three lying on the ground, two on top."""
    w, h = 42, 30
    s = Spr(w, h)
    r = 7.0
    for cx in (14.0, 28.0):
        barrel_head(s, cx, 10.0, r)
    lay = Spr(w, h)
    for cx in (7.0, 21.0, 35.0):
        barrel_head(lay, cx, 22.5, r)
    add_layer(s, lay, [OAK, IRON], sh=1)
    selout(s, [OAK, IRON], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def shutter_window(s, x0, y0, ww, wh, frame=STONE):
    """Small window: stone frame, dark glass with a glint, sage louvred
    shutters folded open either side."""
    s.rect(x0 - 1, y0 - 1, x0 + ww, y0 + wh, frame[5])
    s.rect(x0, y0, x0 + ww - 1, y0 + wh - 1, GLASS[1])
    s.hline(x0, x0 + ww - 1, y0, GLASS[0])
    s.puti(x0 + ww - 2, y0 + 1, GLASS[3]); s.puti(x0 + ww - 3, y0 + 2, GLASS[3])
    s.vline(x0 + ww // 2, y0, y0 + wh - 1, frame[3])
    sw = max(2, ww // 2)
    for (sx, lit) in ((x0 - 1 - sw, False), (x0 + ww, True)):
        for yy in range(y0 - 1, y0 + wh):
            for xx in range(sx, sx + sw):
                c = SHUT[3] if lit else SHUT[2]
                if (yy - y0) % 2 == 1:
                    c = SHUT[2] if lit else SHUT[1]
                s.puti(xx, yy, c)
        s.vline(sx, y0 - 1, y0 + wh - 1, SHUT[1] if not lit else SHUT[2])
    s.hline(x0 - 1, x0 + ww, y0 + wh, frame[6])           # sill
    s.hline(x0 - 1, x0 + ww, y0 + wh + 1, frame[2])


def arched_door(s, x0, y0, x1, y1, rmp=OAK, frame=STONE):
    """Arched plank door with a stone voussoir surround."""
    r = (x1 - x0 + 1) / 2.0
    cxx = x0 + r
    for y in range(y0 - 2, y1 + 1):
        for x in range(x0 - 2, x1 + 3):
            cy = y0 + r
            dd = math.hypot(x + 0.5 - cxx, y + 0.5 - cy)
            if y < cy and dd > r + 2.0:
                continue
            if y >= cy and (x < x0 - 2 or x > x1 + 2):
                continue
            inside = (y >= cy and x0 <= x <= x1) or (y < cy and dd <= r)
            if inside:
                c = rmp[2] if (x - x0) % 3 == 0 else rmp[3]
                if x == x1:
                    c = rmp[4]
                if y < cy and dd > r - 1.0:
                    c = rmp[1]
            else:
                ang = math.atan2(cy - (y + 0.5), x + 0.5 - cxx)
                c = frame[5] if int((ang + 3.2) * 4) % 2 == 0 else frame[4]
                if y >= cy:
                    c = frame[5] if (y // 3) % 2 == 0 else frame[4]
            s.puti(x, y, c)
    s.puti(x1 - 2, (y0 + y1) // 2 + 3, IRON[3])


def winery():
    """Tuscan stone farmhouse-winery: two-storey block with a square bell
    tower, a one-storey cellar wing, terracotta roofs, arched wooden doors,
    sage shutters, two barrels by the cellar."""
    w, h = 116, 86
    s = Spr(w, h)
    G = 85
    # --- main block ---
    stone_front(s, 8, 34, 64, G, 3, seed=2)
    stone_side(s, 65, 74, 34, G, 0.5, 4, seed=3)
    s.vline(8, 34, G, STONE[2])
    s.hline(8, 64, 34, STONE[1]); s.hline(8, 64, 35, STONE[2])         # eave shadow
    ms.tile_roof(s, [(3, 33), (69, 33), (58, 21), (15, 21)],
                 [(69, 33), (77, 29), (66, 18), (58, 21)], 33)
    s.hline(15, 60, 20, TERRA[4]); s.hline(17, 63, 19, TERRA[5]); s.hline(19, 66, 18, TERRA[4])
    # windows + door on the main block
    shutter_window(s, 42, 40, 6, 8)
    shutter_window(s, 54, 40, 5, 8)
    shutter_window(s, 42, 62, 6, 8)
    arched_door(s, 54, 64, 60, G - 1)
    s.hline(52, 62, G, STONE[2])
    # --- bell tower (front flush with the main wall) ---
    stone_front(s, 17, 9, 33, 52, 3, seed=5)
    stone_side(s, 34, 38, 9, 33, 0.5, 4, seed=6)
    s.vline(17, 9, 52, STONE[2]); s.hline(17, 33, 9, STONE[2]); s.hline(17, 33, 10, STONE[2])
    s.hline(16, 34, 52, STONE[5]); s.hline(16, 34, 53, STONE[2])       # string course
    # belfry: arched opening with a bronze bell
    for y in range(13, 24):
        for x in range(21, 30):
            r = 4.5
            cy = 13 + r
            if y < cy and math.hypot(x + 0.5 - 25.5, y + 0.5 - cy) > r:
                continue
            s.puti(x, y, hx("#2a2030") if x < 28 else hx("#3a2c3a"))
    for (y, x0, x1) in ((16, 24, 26), (17, 23, 27), (18, 23, 27), (19, 22, 28)):
        s.hline(x0, x1, y, YEL[2]); s.puti(x1, y, YEL[3]); s.puti(x0, y, YEL[1])
    s.hline(23, 27, 20, YEL[1]); s.puti(25, 15, IRON[1])
    s.hline(20, 30, 24, STONE[6]); s.hline(20, 30, 25, STONE[2])
    shutter_window(s, 23, 34, 4, 7)
    # tower pyramid roof: front face + lit right face
    for y in range(1, 10):
        f = (y - 1) / 8.0
        xa = int(round(25.5 - 10.5 * f)); xb = int(round(25.5 + 10.5 * f))
        xm = int(round(25.5 + 1.5 * f))
        for x in range(xa, xb + 1):
            if x <= xm:
                c = TERRA[3] if x % 3 else TERRA[2]
            else:
                c = TERRA[4] if (x + y) % 3 else TERRA[5]
            s.puti(x, y, c)
    s.hline(15, 37, 10, TERRA[1])
    s.puti(25, 0, TERRA[4]); s.puti(26, 0, TERRA[5])
    # --- cellar wing ---
    stone_front(s, 66, 54, 104, G, 3, seed=8)
    stone_side(s, 105, 110, 54, G, 0.5, 4, seed=9)
    s.vline(66, 54, G, STONE[2])
    s.hline(66, 104, 54, STONE[1]); s.hline(66, 104, 55, STONE[2])
    ms.tile_roof(s, [(62, 53), (108, 53), (100, 44), (70, 44)],
                 [(108, 53), (114, 50), (106, 41), (100, 44)], 53)
    s.hline(70, 102, 43, TERRA[4]); s.hline(72, 105, 42, TERRA[5]); s.hline(74, 106, 41, TERRA[4])
    arched_door(s, 74, 64, 89, G)
    s.vline(81, 64 + 7, G, OAK[1])
    shutter_window(s, 97, 64, 4, 6)
    # plinth course
    for x0, x1 in ((8, 64), (66, 104)):
        for x in range(x0, x1 + 1):
            if s.get(x, G) in [STONE[i] for i in range(7)]:
                s.puti(x, G, STONE[1])
    # barrels by the cellar door
    bl = Spr(w, h)
    barrel_head(bl, 98.0, 80.5, 5.5, sliver=2)
    barrel_head(bl, 109.0, 80.5, 5.5, sliver=2)
    add_layer(s, bl, [STONE, OAK], sh=1)
    fill_holes(s, max_size=6)
    selout(s, [STONE, TERRA, OAK, IRON, SHUT, YEL], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    limit_palette(s, 24)
    return s


def windmill():
    """Old round stone windmill seen from behind: tapered tower, conical
    shingle cap, four lattice sails in an X turning behind the cap."""
    w, h = 66, 112
    s = Spr(w, h)
    C = 33.0
    HUBX, HUBY = 33.0, 31.0
    # --- sails (behind everything): 2 px spar + lattice frame on the
    # trailing side drawn as clean 45-degree lines; dark edge only around
    # the outside of each frame ---
    sail = Spr(w, h)
    SW = ramp("#2e2024", "#5e4430", "#86663e", "#ac8e5c", "#ccb07c")
    inner = np.zeros((h, w), bool)
    for ang in (45, 135, 225, 315):
        a = math.radians(ang)
        d = np.array([math.cos(a), -math.sin(a)])
        p = np.array([-d[1], d[0]])                  # trailing side

        def P(u, v):
            q = np.array([HUBX, HUBY]) + u * d + v * p
            return (int(math.floor(q[0])), int(math.floor(q[1])))
        frame = [P(6.5, 1.0), P(31.0, 1.0), P(31.0, 8.5), P(6.5, 8.5)]
        inner |= sail.mask_poly(frame)
        for k in range(9):
            u = 7.0 + k * 3.0
            sail.line(*P(u, 1.0), *P(u, 8.0), SW[3])
        sail.line(*P(6.5, 4.8), *P(30.5, 4.8), SW[2])
        sail.line(*P(6.5, 8.5), *P(31.0, 8.5), SW[3])
        sail.line(*P(31.0, 1.0), *P(31.0, 8.5), SW[3])
        a0, a1 = P(2.0, 0.0), P(32.0, 0.0)
        sail.line(*a0, *a1, SW[4])
        sail.line(a0[0], a0[1] + 1, a1[0], a1[1] + 1, SW[1])
    outer_outline(sail, SW[0], mask=~inner)
    add_layer(s, sail)
    sails_s, s = s, Spr(w, h)          # tower + cap on their own layer
    # --- tower ---
    TOP, BOT = 38, 111
    tex = stone_tex(40, 120, seed=12, course=(3, 3), blen=(3, 6))
    for y in range(TOP, BOT + 1):
        hw = 11.0 + 5.5 * (y - TOP) / (BOT - TOP)
        xl = int(math.floor(C - hw + 0.5)); xr = int(math.floor(C + hw + 0.5)) - 1
        for x in range(xl, xr + 1):
            u = (x + 0.5 - C) / hw
            nz = math.sqrt(max(0.0, 1 - u * u))
            lum = 0.5 + 0.5 * (u * 0.8 + nz * 0.45) - 0.05
            b = clampi(int(lum * 5) + 1, 1, 5)
            dip = 1.6 * (1 - u * u)
            tx = clampi(int((u + 1) * 19), 0, 39)
            ty = clampi(int(round(y - dip)) - TOP + 4, 0, 119)
            b = clampi(b + tex[ty, tx], 1, 6)
            if x == xl:
                b = 0
            s.puti(x, y, STONE[b])
    # door + windows
    for y in range(97, BOT + 1):
        for x in range(30, 37):
            r = 3.5; cy = 97 + r
            if y < cy and math.hypot(x + 0.5 - 33.5, y + 0.5 - cy) > r:
                continue
            c = OAK[2] if (x - 30) % 3 == 0 else OAK[3]
            if x == 36:
                c = OAK[4]
            s.puti(x, y, c)
    s.hline(29, 37, BOT, STONE[1])
    for (wy, wx) in ((56, 34), (77, 30)):
        s.rect(wx, wy, wx + 2, wy + 4, hx("#2a2030")); s.puti(wx + 2, wy, hx("#3a2c3a"))
        s.hline(wx - 1, wx + 3, wy + 5, STONE[6])
    # --- conical cap ---
    CT, CB = 15, 41
    for y in range(CT, CB + 1):
        f = (y - CT) / (CB - CT)
        hw = 0.8 + 13.5 * f ** 0.95
        xl = int(math.floor(C - hw + 0.5)); xr = int(math.floor(C + hw + 0.5)) - 1
        for x in range(xl, xr + 1):
            u = (x + 0.5 - C) / max(hw, 0.6)
            nz = math.sqrt(max(0.0, 1 - u * u))
            lum = 0.5 + 0.5 * (u * 0.75 + nz * 0.35 + 0.25) - 0.08
            b = clampi(int(lum * 5) + 1, 1, 5)
            dip = 1.2 * (1 - u * u) * f
            if int(round(y - dip)) % 3 == 0:
                b = clampi(b - 1, 1, 5)
            if x == xl:
                b = 0
            s.puti(x, y, SHINGLE[b])
    # eave lip + finial
    for x in range(int(C - 14), int(C + 14)):
        u = (x + 0.5 - C) / 14.0
        yy = int(round(CB + 1 + 1.2 * (1 - u * u)))
        s.puti(x, yy, SHINGLE[1] if u < 0.4 else SHINGLE[2])
        s.puti(x, yy - 1, SHINGLE[4] if u > 0.2 else SHINGLE[3])
    s.vline(32, 11, 14, IRON[2]); s.vline(33, 11, 14, IRON[3])
    s.rect(32, 10, 33, 10, IRON[3])
    selout(s, [STONE, SHINGLE, OAK, IRON], dirs=((0, 1), (-1, 0)))
    add_layer(sails_s, s)
    s = sails_s            # (no remove_orphans: it would eat the 1 px diagonals)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


def haybale():
    """Round golden hay bale, spiral end toward the camera, rolled body
    receding to the right."""
    w, h = 30, 22
    s = Spr(w, h)
    ecx, ecy, rx, ry = 10.5, 11.6, 9.4, 11.0
    fcx, fcy = 19.5, 11.0
    # body: far end ellipse + the band between
    for y in range(h):
        for x in range(w):
            px, py = x + 0.5, y + 0.5
            inside_far = ((px - fcx) / rx) ** 2 + ((py - fcy) / ry) ** 2 <= 1.0
            t = clampi((px - ecx) / (fcx - ecx), 0.0, 1.0)
            cyy = ecy + (fcy - ecy) * t
            band_ = ecx <= px <= fcx and abs(py - cyy) <= ry
            if not (inside_far or band_):
                continue
            v = (py - cyy) / ry
            lum = 0.5 - 0.55 * v + 0.12
            b = clampi(int(lum * 5) + 1, 1, 5)
            if (y * 3 + (x // 4) * 2) % 7 == 0:
                b = clampi(b - 1, 1, 5)
            elif (y * 3 + (x // 4) * 2) % 7 == 3 and b < 5:
                b += 1
            s.puti(x, y, HAY[b])
    # spiral end face
    for y in range(h):
        for x in range(w):
            dx_, dy_ = (x + 0.5 - ecx) / rx, (y + 0.5 - ecy) / ry
            rr = math.hypot(dx_, dy_)
            if rr > 1.0:
                continue
            th = math.atan2(dy_, dx_)
            ph = rr * 3.3 - th / math.tau
            lum = 0.5 + 0.3 * (dx_ * 0.6 - dy_ * 0.7)
            b = clampi(int(lum * 3) + 2, 2, 4)
            if (ph % 1.0) < 0.3 and rr > 0.1:
                b = clampi(b - 2, 1, 4)
            if rr > 0.9:
                b = 1 if (dx_ * 0.6 - dy_ * 0.7) < 0.1 else 3
            s.puti(x, y, HAY[b])
    selout(s, [HAY], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    return s


# ==========================================================================
# REDWOOD PASS
# ==========================================================================
PINE = ramp("#0a1c16", "#10291d", "#183a24", "#224c2a", "#305f30", "#437236", "#5c873e")


def cast_shadow(s, lay, rmps, rows=2, sh=2):
    """Darken existing pixels of s lying just below the silhouette of `lay`
    (an upper foliage tier shading the one beneath), before compositing."""
    lo = lay.opaque()
    ex = s.opaque()
    tgt = np.zeros_like(lo)
    for k in range(1, rows + 1):
        sh_m = np.zeros_like(lo)
        sh_m[k:, :] = lo[:-k, :]
        tgt |= sh_m
    tgt &= ex & ~lo
    lut = {}
    for r in rmps:
        for i, c in enumerate(r):
            lut.setdefault(c, r[max(1, i - sh)] if i > 1 else r[i])
    for y, x in zip(*np.nonzero(tgt)):
        c = tuple(int(v) for v in s.a[y, x, 0:3])
        if c in lut:
            s.a[y, x, 0:3] = lut[c]


def foliage_tier(w, h, cx, ty, hw, th, rmp, seed, droop=3.0, bias=-0.04):
    """One flat, drooping branch tier (cluster of lobed clumps with a dark
    flat underside), on its own layer."""
    lay = Spr(w, h)
    prng = random.Random(seed)
    nb = max(2, int(hw / 4.5))
    base = ty + th
    for i in range(nb):
        u = (i + 0.5) / nb * 2 - 1
        bx = cx + u * hw * 0.82 + prng.uniform(-1.2, 1.2)
        dr = droop * abs(u) ** 1.6
        top_h = th * (0.75 + 0.3 * (u + 1) / 2) * (1 - 0.35 * abs(u) ** 2) * prng.uniform(0.88, 1.05)
        rx = hw / nb * 1.45 + prng.uniform(0, 1.2)
        lobed_ball(lay, bx, base - top_h * 0.5 + dr, rx, top_h * 0.62, rmp, seed=seed * 7 + i,
                   lobes=9, lobe_amp=0.18, bias=bias + 0.06 * u, gamma=1.2,
                   flat_base=base + dr + prng.choice((0, 0, 1)), lo=1, ao=(ty, base + droop, 0.24))
    leaf_dabs(lay, rmp, seed=seed + 50, step=4, hi_min=2, prob=0.9)
    op = lay.opaque()
    for x in range(w):
        col = np.nonzero(op[:, x])[0]
        if len(col):
            yb = col[-1]
            lay.puti(x, yb, rmp[1])
            if yb - 1 > col[0]:
                lay.puti(x, yb - 1, rmp[2])
    return lay



def spray(lay, x0, y0, length, side, thick, droop, rmp, seed=0):
    """One drooping conifer branch spray reaching out to `side`: lumpy lit
    top, dark serrated underside with hanging needle tips, tapered end."""
    rng = random.Random(seed)
    n = len(rmp)
    ph = rng.uniform(0, math.tau)
    L = max(2, int(round(length)))
    teeth = [rng.choice((0, 1, 1, 2, 2, 3)) for _ in range(L + 2)]
    for i in range(L + 1):
        x = int(round(x0 + side * i))
        t = i / L
        yc = y0 + droop * t ** 1.7
        taper = (1 - t ** 3)
        top = (thick * (0.6 + 0.4 * math.sin(math.pi * min(1.0, t * 1.4))) * taper
               + 0.9 * math.sin(i * 0.8 + ph) * taper + 0.6)
        bot = thick * 0.5 * taper + 0.6 + (teeth[i] if i % 2 == 0 else 0) * taper
        for y in range(int(math.floor(yc - top)), int(math.ceil(yc + bot)) + 1):
            if y + 0.5 < yc - top or y - 0.5 > yc + bot:
                continue
            v = (y + 0.5 - yc) / (top if y + 0.5 < yc else max(bot, 0.8))
            lum = 0.6 - 0.42 * v + 0.07 * side + 0.08 * (1 - t) * (side > 0)
            b = clampi(int(lum * (n - 1)) + 1, 1, n - 1)
            if y + 0.5 > yc + bot - 1.0:
                b = min(b, 2)
            lay.puti(x, y, rmp[b])
    leaf_dabs(lay, rmp, seed=seed + 9, step=4, hi_min=2, prob=0.9)


def redwood():
    """Giant coast redwood: massive fluted trunk with root flare, deep
    meandering bark furrows (lit warm right, cool shade left), layered dark
    branch tiers at the top."""
    w, h = 84, 210
    s = Spr(w, h)
    B = RWBARK
    n = len(B)
    C = 42.0
    BOT = h - 1
    rng = random.Random(77)

    def hw(y):
        k = clampi((194 - y) / 190.0, 0.0, 1.0)
        v = 15.0 - 9.0 * k ** 1.3
        if y < 112:                          # tapers fast inside the crown
            v112 = 15.0 - 9.0 * ((194 - 112) / 190.0) ** 1.3
            v = 1.6 + (v112 - 1.6) * ((y - 2) / 110.0) ** 0.9
        if y > 192:
            f = (y - 192) / (BOT - 192)
            v += 7.0 * f ** 2.2
        return v
    NF = 3.5                                 # furrows per half of the trunk
    fph = [rng.uniform(0, math.tau) for _ in range(16)]
    for y in range(12, h):             # (the crown hides the trunk above)
        half = hw(y)
        # root buttresses: lumpy silhouette at the very bottom
        lob_l = lob_r = 0.0
        if y > 196:
            f = (y - 196) / (BOT - 196)
            lob_l = 2.5 * f * (0.5 + 0.5 * math.sin(y * 0.9))
            lob_r = 2.0 * f * (0.5 + 0.5 * math.cos(y * 0.8))
        xl = int(math.floor(C - half - lob_l + 0.5)); xr = int(math.floor(C + half + lob_r + 0.5)) - 1
        for x in range(xl, xr + 1):
            u = clampi((x + 0.5 - C) / half, -1.0, 1.0)
            nz = math.sqrt(max(0.0, 1 - u * u))
            lum = 0.5 + 0.5 * (u * 0.85 + nz * 0.4) - 0.06
            b = clampi(int(lum * (n - 2)) + 1, 1, n - 2)
            # long furrows following the trunk's curvature, meandering
            ang = math.asin(clampi(u, -0.9, 0.9)) / (math.pi / 2)
            ph = (ang + 1) * NF
            j = int(ph)
            wob = 0.16 * math.sin(y * 0.035 + fph[j]) + 0.07 * math.sin(y * 0.11 + fph[j + 1])
            fr = (ph + wob) % 1.0
            gap = math.sin(y * 0.021 + fph[j] * 3) > 0.9          # rare ridge bridging
            if fr < 0.24 and not gap:
                b = max(0, b - 2)
            elif fr < 0.36 and u > -0.3 and not gap:
                b = min(n - 1, b + 1)                          # lit ridge edge
            if x == xl:
                b = 0
            s.puti(x, y, B[b])
    # top of the trunk disappearing into the crown
    # dead branch stubs
    for (y, side, ln) in ((126, -1, 4), (141, 1, 3), (158, -1, 3), (112, 1, 4)):
        x0 = int(round(C + side * hw(y)))
        for k in range(ln):
            xx = x0 + side * k
            s.puti(xx, y - k // 2, B[4] if side > 0 else B[3])
            s.puti(xx, y + 1 - k // 2, B[1])
    # crown: drooping branch sprays left and right of the trunk (each starts
    # across the trunk so the crown reads as one mass), drawn bottom-up so
    # upper sprays shade the ones beneath; irregular lengths and spacing
    crng = random.Random(15)
    k = 0
    y = 117
    while y > 10:
        f = (y - 2) / 116.0
        env = 7 + 30 * f ** 0.8
        th = 3.4 + 2.8 * f
        dr = 2.5 + 6.0 * f
        for side, dy in ((-1, 0), (1, -crng.choice((3, 4, 5)))):
            if y > 92 and crng.random() < 0.3:
                continue
            ln = env * crng.uniform(0.62, 1.0)
            x0 = C - side * hw(y + dy) * 0.15
            lay = Spr(w, h)
            spray(lay, x0, y + dy, ln + hw(y + dy) * 0.15, side, th, dr, RWG, seed=300 + k)
            cast_shadow(s, lay, [RWG, RWBARK], rows=2, sh=2)
            add_layer(s, lay)
            k += 1
        y -= int(round(7 + 3 * f)) + crng.choice((0, 0, 1, 2))
    lay = Spr(w, h)
    for (yy, hh) in ((2, 1.0), (5, 2.0), (8, 3.0), (11, 3.5)):
        lobed_ball(lay, C + 0.5, yy + 1, hh, 2.6, RWG, seed=yy, lobes=6, lobe_amp=0.15,
                   bias=0.0, gamma=1.2, lo=1)
    cast_shadow(s, lay, [RWG, RWBARK], rows=1, sh=1)
    add_layer(s, lay)
    selout(s, [RWG, RWBARK], dirs=((0, 1), (-1, 0)))
    lit_outline(s, [RWG], idx=3)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


def pine():
    """Douglas fir: stacked drooping conical tiers with serrated lower
    edges, upper tiers shading lower ones, short brown trunk."""
    w, h = 58, 124
    s = Spr(w, h)
    C = 29.0
    # trunk
    for y in range(104, h):
        f = max(0.0, (y - 118) / 5.0)
        half = 2.5 + 1.5 * f
        xl = int(math.floor(C - half + 0.5)); xr = int(math.floor(C + half + 0.5)) - 1
        for x in range(xl, xr + 1):
            u = (x + 0.5 - C) / half
            b = 1 if u < -0.4 else (2 if u < 0.3 else 3)
            if x == xl:
                b = 0
            s.puti(x, y, ms.BARK[b])
    tiers = [(80, 112, 27), (65, 97, 24), (50, 81, 21), (36, 65, 17), (23, 50, 13),
             (11, 34, 9), (2, 20, 5.5)]
    P = PINE
    n = len(P)
    rng = random.Random(3)
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
                ybot = bot - 3.0 * q * q + 1.5 * q ** 3       # front arc, drooping tips
                tooth = teeth[x] if (x % 3) != 1 else 0
                if y > ybot + tooth:
                    continue
                if y < top + (abs(dx) * 0.0):
                    continue
                u = dx / max(half, 1)
                t = 0.52 + 0.34 * u + 0.18 * (1 - f) - 0.1 * (y > ybot - 1)
                b = clampi(int(t * (n - 1)) + 1, 1, n - 1)
                if y > ybot:
                    b = clampi(b - 1, 1, n - 1)
                lay.puti(x, y, P[b])
        leaf_dabs(lay, P, seed=40 + k, step=4, hi_min=2, prob=0.9)
        cast_shadow(s, lay, [P, ms.BARK], rows=3, sh=2)
        add_layer(s, lay)
    selout(s, [P, ms.BARK], dirs=((0, 1), (-1, 0)))
    lit_outline(s, [P], idx=3)
    remove_orphans(s)
    bottom_fix(s)
    return s


def fern_frond(w, h, bx, by, ang, length, droop, maxw, shade, seed=0):
    """Arching fern frond on its own layer: a tapered blade along a curved
    rachis whose edges are cut into saw-teeth (the pinnae) pointing toward
    the tip; upper half lit, lower half in shade, light rachis."""
    side = 1 if math.cos(math.radians(ang)) >= 0 else -1
    K = int(length * 6)
    ds = length / K
    x, y, p = float(bx), float(by), math.radians(ang)
    pts = []
    for k in range(K + 1):
        pts.append((x, y))
        x += math.cos(p) * ds
        y -= math.sin(p) * ds
        p -= side * math.radians(droop) * (ds / length) * (0.2 + 1.6 * k / K)
    D = np.array(pts)
    T = np.gradient(D, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1)[:, None], 1e-9)
    U = np.linspace(0, 1, len(D))
    L = Spr(w, h)
    F = FERN
    nF = len(F)
    xa, xb = int(D[:, 0].min() - maxw - 2), int(D[:, 0].max() + maxw + 2)
    ya, yb = int(D[:, 1].min() - maxw - 2), int(D[:, 1].max() + maxw + 2)
    for yy in range(max(0, ya), min(h, yb + 1)):
        for xx in range(max(0, xa), min(w, xb + 1)):
            d2 = (D[:, 0] - xx - 0.5) ** 2 + (D[:, 1] - yy - 0.5) ** 2
            k = int(d2.argmin())
            u = U[k]
            Nx, Ny = -T[k, 1], T[k, 0]
            if Ny < 0:
                Nx, Ny = -Nx, -Ny                    # N points to the lower side
            sd = (xx + 0.5 - D[k, 0]) * Nx + (yy + 0.5 - D[k, 1]) * Ny
            hwid = maxw * math.sin(math.pi * min(1.0, u * 1.1 + 0.02)) ** 0.6 * (1 - 0.35 * u)
            if u < 0.07:
                hwid = 0.6
            arc = u * length
            saw = ((arc * 0.55 + (0.5 if sd > 0 else 0.0)) % 1.0)
            lim = hwid * (0.4 + 0.6 * saw)
            if abs(sd) > max(lim, 0.6):
                continue
            if abs(sd) < 0.55:
                b = shade + 2
            elif sd < 0:
                b = shade + 2 + (1 if abs(sd) > lim - 1.0 and u < 0.8 else 0)
            else:
                b = shade + (1 if abs(sd) < 1.5 else 0)
            L.puti(xx, yy, F[clampi(b, 1, nF - 1)])
    return L


def fern():
    """Lush sword-fern clump: a fountain of arching fronds with leaflets
    (built with the palm-frond renderer of make_scenery, then recoloured to
    a deeper understory green), back fronds darker, front fronds lit."""
    w, h = 42, 24
    s = Spr(w, h + 6)
    cx, cy = 20.5, 22.0
    fronds = [
        # phi0, len, bend, wdown, wup, shade
        (98, 19, 45, 3.0, 1.6, 1), (78, 19, 45, 3.0, 1.6, 1),
        (122, 20, 80, 3.4, 1.8, 1), (58, 20, 80, 3.4, 1.8, 2),
        (150, 21, 75, 3.4, 1.8, 2), (30, 21, 75, 3.4, 1.8, 3),
        (172, 18, 45, 3.0, 1.6, 2), (8, 18, 45, 3.0, 1.6, 3),
        (110, 14, 70, 3.0, 1.6, 3), (70, 14, 70, 3.0, 1.6, 4),
    ]
    rmps = [ms.PALM_G, ms.PALM_Y]
    for k, (phi, ln, bend, wd, wu, sh) in enumerate(fronds):
        lay = ms.frond_layer(w, h + 6, cx, cy, phi, ln, bend, wd, wu, sh, yel=0.08,
                             period=1.6, grav=0.45, hw=0.9, seed=500 + k)
        paste_with_shadow(s, lay, rmps)
    s.ellipse(20.5, 21.5, 3.0, 1.5, ms.PALM_G[1])
    s.a = s.a[:h]
    s.h = h
    remap(s, dict(zip(ms.PALM_G, FERN)))
    remap(s, {ms.PALM_Y[0]: FERN[4], ms.PALM_Y[1]: FERN[5], ms.PALM_Y[2]: FERN[6],
              ms.PALM_Y[3]: FERN[6]})
    selout(s, [FERN], dirs=((0, 1),))
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    return s


def log():
    """Fallen mossy log lying across the view: bark cylinder under a lumpy
    moss blanket, splintered far end on the left, cut end facing the viewer
    on the right showing growth rings, a couple of shelf fungi."""
    w, h = 74, 22
    s = Spr(w, h)
    rng = random.Random(9)
    XL, XC = 4, 63            # left end, centre of the cut face
    B = LOGB
    ph = rng.uniform(0, 6)
    rad = lambda x: 6.4 + 1.8 * (x - XL) / (XC - XL)
    cyf = lambda x: 21.6 - rad(x)                      # flat ground contact
    for x in range(XL, XC + 1):
        r = rad(x)
        cy = cyf(x)
        mh = 3.0 + 1.4 * math.sin(x * 0.33 + ph) + 0.9 * math.sin(x * 0.85 + ph * 2)
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            v = (y + 0.5 - cy) / r
            if abs(v) > 1.0:
                continue
            nz = math.sqrt(max(0.0, 1 - v * v))
            lum = 0.5 + 0.5 * (-v * 0.75 + nz * 0.45) - 0.06
            b = clampi(int(lum * (len(B) - 1)) + 1, 1, len(B) - 1)
            fv = (v * 4.0 + 0.3 * math.sin(x * 0.19 + ph)) % 1.0
            if fv < 0.24 and abs(v) < 0.85:
                b = max(1, b - 2)
            dtop = y + 0.5 - (cy - r)
            if dtop < mh:
                mb = 5 if dtop < 1.2 else (4 if dtop < mh - 1.2 else 3)
                s.puti(x, y, MOSS[mb])
            else:
                s.puti(x, y, B[b])
        if mh > 3.4 and x % 6 in (2, 3):                 # moss drips
            yy = int(cy - r + mh)
            for k in range(1 + (x * 7) % 3):
                s.puti(x, yy + k, MOSS[2])
    # splintered left end: a few jagged teeth showing pale broken wood
    cyl = cyf(XL)
    for y in range(int(cyl - 7), int(cyl + 7)):
        jag = (0, 0, 2, 2, 3, 3, 1, 1, 3, 3, 2, 2, 0, 0)[(y - int(cyl - 7)) % 14]
        for x in range(XL - 3, XL + jag):
            s.clear(x, y)
        if s.op(XL + jag, y) and s.get(XL + jag, y) not in MOSS:
            s.puti(XL + jag, y, CUTW[2] if y < cyl else CUTW[1])
    # cut face (ellipse toward the viewer) with growth rings
    rx, ry = 4.6, rad(XC)
    CY = cyf(XC)
    for y in range(int(CY - ry) - 1, int(CY + ry) + 2):
        for x in range(int(XC - rx) - 1, int(XC + rx) + 2):
            dx_, dy_ = (x + 0.5 - XC) / rx, (y + 0.5 - CY) / ry
            rr = math.hypot(dx_, dy_)
            if rr > 1.0:
                continue
            lit = (dx_ * 0.6 - dy_ * 0.8) > 0.2
            if rr > 0.82:
                c = B[3] if lit else B[1]
            else:
                ring = int(rr * 4.6)
                c = CUTW[4] if ring % 2 == 0 else CUTW[2]
                if not lit and (dx_ * 0.5 + dy_ * 0.8) > 0.3:
                    c = CUTW[3] if ring % 2 == 0 else CUTW[1]
                if rr < 0.14:
                    c = CUTW[1]
            s.puti(x, y, c)
    for x in range(XC - 3, XC + 3):                     # moss creeping over the rim
        s.puti(x, int(CY - ry) + (1 if x > XC else 0), MOSS[4])
    # shelf fungi on the shaded side
    FUN = ramp("#5a4030", "#9c7a56", "#c8a474", "#e6cc98")
    for (mx, my) in ((20, 14), (24, 16), (47, 15)):
        s.hline(mx + 1, mx + 3, my, FUN[3])
        s.hline(mx, mx + 4, my + 1, FUN[2]); s.puti(mx + 4, my + 1, FUN[3])
        s.hline(mx + 1, mx + 3, my + 2, FUN[0])
    # broken branch stub on top
    s.rect(36, 3, 38, 7, B[3]); s.vline(38, 3, 7, B[4]); s.vline(36, 3, 7, B[1])
    s.hline(36, 38, 3, CUTW[3]); s.puti(37, 3, CUTW[2])
    selout(s, [B, MOSS, CUTW, FUN], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    return s


def cabin_lit():
    """Log cabin with a covered porch, two warmly lit windows (the only
    pixels bright enough to be emissive), plank door, log gable end and a
    stone chimney rising past the ridge."""
    w, h = 104, 72
    s = Spr(w, h)
    L = CABL
    WX0, WX1, WY0, WY1 = 14, 68, 26, 64          # front wall
    SX1, SL = 92, 0.5                             # side wall right edge, recession slope
    APX, APY = 80, 6                              # gable apex

    def log_col(y, lit):
        k = (y - WY0) % 4
        if lit:
            return (L[5], L[4], L[4], L[2])[k]
        return (L[4], L[3], L[3], L[1])[k]
    # side (gable end) wall + gable triangle of logs, lit by the sun
    for x in range(WX1 + 1, SX1 + 1):
        dy = (x - WX1) * SL
        if x <= APX:
            ytop = (WY0 + 8) + (APY - (WY0 + 8)) * (x - WX1 + 4) / (APX - WX1 + 4)
        else:
            ytop = APY + (x - APX) * 1.0
        for y in range(int(round(ytop)), int(round(WY1 - dy)) + 1):
            yy = int(round(y + dy))
            s.puti(x, y, log_col(yy, True))
    # front wall logs with protruding notched ends at both corners
    for y in range(WY0, WY1 + 1):
        for x in range(WX0, WX1 + 1):
            s.puti(x, y, log_col(y, False))
        if (y - WY0) % 8 < 4:
            for x in (WX0 - 2, WX0 - 1):
                s.puti(x, y, log_col(y, False))
    for y in range(WY0, WY1 - 2, 8):
        for (x0, lit) in ((WX0 - 3, False), (WX1 - 1, True)):
            for dy in range(4):
                for dx in range(4):
                    if (dx in (0, 3)) and (dy in (0, 3)):
                        continue
                    c = CUTW[2] if (dx in (1, 2) and dy in (1, 2)) else CUTW[1]
                    if lit and dx >= 2 and dy <= 1:
                        c = CUTW[3]
                    s.puti(x0 + dx, y + 4 + dy, c)
    # lit windows + plank door
    for x0 in (19, 51):
        glass_window(s, x0, 38, x0 + 12, 50, L, lit=True, mullion=[x0 + 6], transom=[44],
                     sill=L)
    s.rect(35, 40, 47, WY1, L[1])
    for y in range(41, WY1 + 1):
        for x in range(36, 47):
            s.puti(x, y, L[2] if (x - 36) % 3 == 0 else L[3])
    s.hline(36, 46, 46, L[1]); s.hline(36, 46, 57, L[1])
    s.puti(44, 52, IRON[3])
    # roof: front slope of cedar shakes (over the porch) up to the ridge
    roof = Spr(w, h)
    front = roof.mask_poly([(2, 34), (73, 34), (APX, APY + 1), (10, APY + 1)])
    for y, x in zip(*np.nonzero(front)):
        row = (34 - y) // 3
        k = (34 - y) % 3
        c = (SHINGLE[2], SHINGLE[3], SHINGLE[4])[k]
        if (x + row * 3) % 6 == 0 and k != 0:
            c = SHINGLE[2]
        roof.puti(x, y, c)
    for y in range(APY + 1, 35):                       # front rake board (lit)
        xr = int(round(73 + (APX - 73) * (34 - y) / (34 - APY - 1)))
        roof.puti(xr, y, SHINGLE[5]); roof.puti(xr + 1, y, SHINGLE[3])
    roof.hline(10, APX, APY, SHINGLE[5]); roof.hline(11, APX - 1, APY - 1, SHINGLE[4])
    for x in range(APX + 1, SX1 + 3):                  # back rake over the gable
        y = int(round(APY + (x - APX) * 1.0)) - 1
        roof.puti(x, y, SHINGLE[4]); roof.puti(x, y + 1, SHINGLE[2])
    roof.hline(2, 73, 34, SHINGLE[1]); roof.hline(2, 73, 35, L[0])
    add_layer(s, roof, [L, CUTW], sh=1)
    # stone chimney outside the gable end, rising past the ridge
    cx0, cx1 = 82, 87
    stone_front(s, cx0, 2, cx1, 62, 3, seed=31, rmp=CHIM)
    stone_side(s, cx1 + 1, cx1 + 3, 2, 62, 0.5, 4, seed=32, rmp=CHIM)
    s.vline(cx0, 2, 62, CHIM[1])
    s.rect(cx0 - 1, 0, cx1 + 2, 1, CHIM[3]); s.hline(cx0 - 1, cx1 + 2, 0, CHIM[5])
    s.vline(cx1 + 2, 0, 1, CHIM[4])
    s.hline(cx0 + 1, cx1 - 1, 2, CHIM[0])
    # porch: deck, steps, posts, rail
    s.rect(2, 65, 80, 66, L[4]); s.hline(2, 80, 65, L[5])
    for x in range(4, 80, 5):
        s.puti(x, 66, L[2])
    s.rect(2, 67, 80, 71, L[2]); s.hline(2, 80, 67, L[3]); s.hline(2, 80, 71, L[0])
    s.rect(34, 67, 48, 71, L[3]); s.hline(34, 48, 68, L[4]); s.hline(34, 48, 69, L[1])
    for px in (3, 26, 52, 73):
        s.rect(px, 36, px + 2, 64, L[3]); s.vline(px, 36, 64, L[1]); s.vline(px + 2, 36, 64, L[4])
    for (a0, a1) in ((3, 33), (49, 75)):
        s.hline(a0, a1, 56, L[4]); s.hline(a0, a1, 57, L[1])
        for x in range(a0 + 3, a1, 4):
            s.vline(x, 58, 64, L[2])
    selout(s, [L, SHINGLE, CHIM, CUTW, IRON], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s, rows=10)          # deck + chimney foot = footprint
    limit_palette(s, 24, keep=(hx("#fff2b0"), hx("#ffd870")))
    return s


# ==========================================================================
# registry / preview / main
# ==========================================================================
SPRITES = [
    ("hwy_lamp_lit", hwy_lamp_lit), ("gantry", gantry), ("pylon", pylon),
    ("hwy_sign", hwy_sign), ("barrier", barrier),
    ("vines", vines), ("cypress_tall", cypress_tall), ("olive", olive), ("winery", winery),
    ("barrels", barrels), ("windmill", windmill), ("haybale", haybale),
    ("redwood", redwood), ("pine", pine), ("fern", fern), ("log", log), ("cabin_lit", cabin_lit),
]

ROWS = [
    ["hwy_lamp_lit", "gantry", "pylon", "hwy_sign", "barrier"],
    ["vines", "cypress_tall", "olive", "winery", "barrels", "windmill", "haybale"],
    ["redwood", "pine", "fern", "log", "cabin_lit"],
]
LIT_NAMES = {"hwy_lamp_lit", "cabin_lit"}
GREY_BG = (128, 128, 128)
DARK_BG = (26, 24, 34)


def protected_names():
    return {n for n, _ in ms.SPRITES} | {"manifest"}


def save(s, name):
    assert name not in protected_names(), "refusing to overwrite existing sprite " + name
    a = s.a
    assert set(np.unique(a[..., 3])) <= {0, 255}
    op = a[..., 3] > 0
    assert op[-1].any(), name + ": bottom row empty"
    s.save(name)


def check(s, name):
    """Print quick QA facts (palette size, base centring, lit pixels)."""
    op = s.opaque()
    cols = {tuple(int(v) for v in c) for c in s.a[op][:, 0:3]}
    base = np.nonzero(op[-1])[0]
    mid = (base.min() + base.max() + 1) / 2.0
    hot = [c for c in cols if luma(c) > 200]
    msg = "%-13s %3dx%-3d colours=%2d base=%d..%d (mid %.1f, centre %.1f)" % (
        name, s.w, s.h, len(cols), base.min(), base.max(), mid, s.w / 2.0)
    if name in LIT_NAMES:
        msg += " emissive=%s" % sorted(hot)
    print(msg)


def preview(zoom=4, pad=8):
    ims = {}
    for row in ROWS:
        for n in row:
            p = os.path.join(OUT, n + ".png")
            if os.path.exists(p):
                ims[n] = Image.open(p).convert("RGBA")
    rows = [[ims[n] for n in row if n in ims] for row in ROWS]
    rows = [r for r in rows if r]
    pw = max(sum(im.width for im in r) + pad * (len(r) + 1) for r in rows)
    ph = sum(max(im.height for im in r) + pad * 2 for r in rows)
    sheet = Image.new("RGBA", (pw * 2, ph), GREY_BG + (255,))
    sheet.paste(Image.new("RGBA", (pw, ph), DARK_BG + (255,)), (pw, 0))
    for panel in range(2):
        y = 0
        for r in rows:
            hm = max(im.height for im in r)
            x = panel * pw + pad
            for im in r:
                sheet.alpha_composite(im, (x, y + pad + hm - im.height))
                x += im.width + pad
            y += hm + pad * 2
            # thin divider between stage rows
            if y < ph:
                d = (110, 110, 110) if panel == 0 else (44, 42, 54)
                sheet.paste(Image.new("RGBA", (pw, 1), d + (255,)), (panel * pw, y - 1))
    sheet = sheet.resize((sheet.width * zoom, sheet.height * zoom), Image.NEAREST)
    sheet.convert("RGB").save(os.path.join(HERE, "preview_routes_a.png"))


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for name, fn in SPRITES:
        if only and name not in only:
            continue
        s = fn()
        save(s, name)
        check(s, name)
    preview()


if __name__ == "__main__":
    main()

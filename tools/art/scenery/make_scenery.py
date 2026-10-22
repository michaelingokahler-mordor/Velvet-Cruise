#!/usr/bin/env python3
"""Velvet Cruise -- roadside scenery sprite generator.

Pillow + numpy only.  Writes PNGs to ./out/ plus out/manifest.json, and
4x preview sheets (over sand #e3c98a and sky #8fbdf2) to ./preview_*.png.

Conventions (see ../STYLE.md):
  * alpha is 0 or 255 only
  * bottom row = ground contact, object centred on its base
  * warm sun ahead/right/high: tops + right edges lit, left/bottom in shade
  * selective dark outline on shadow sides, never pure black

Run:  python3 make_scenery.py            (all sprites + previews)
      python3 make_scenery.py palm_a ... (only these sprites, + previews)
"""
import json
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")


# --------------------------------------------------------------------------
# colour helpers
# --------------------------------------------------------------------------
def hx(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def ramp(*cols):
    return [hx(c) for c in cols]


def clampi(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


# --------------------------------------------------------------------------
# sprite canvas
# --------------------------------------------------------------------------
class Spr:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)

    # -- basic access ------------------------------------------------------
    def inb(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def put(self, x, y, c):
        x = int(math.floor(x + 0.5))
        y = int(math.floor(y + 0.5))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x, 0:3] = c
            self.a[y, x, 3] = 255

    def puti(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x, 0:3] = c
            self.a[y, x, 3] = 255

    def get(self, x, y):
        if self.inb(x, y) and self.a[y, x, 3]:
            return tuple(int(v) for v in self.a[y, x, 0:3])
        return None

    def op(self, x, y):
        return self.inb(x, y) and self.a[y, x, 3] > 0

    def clear(self, x, y):
        if self.inb(x, y):
            self.a[y, x] = 0

    # -- primitives (all inclusive coordinates) ----------------------------
    def rect(self, x0, y0, x1, y1, c):
        x0, x1 = sorted((int(x0), int(x1)))
        y0, y1 = sorted((int(y0), int(y1)))
        x0 = max(0, x0); y0 = max(0, y0)
        x1 = min(self.w - 1, x1); y1 = min(self.h - 1, y1)
        if x0 > x1 or y0 > y1:
            return
        self.a[y0:y1 + 1, x0:x1 + 1, 0:3] = c
        self.a[y0:y1 + 1, x0:x1 + 1, 3] = 255

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1, y, c)

    def vline(self, x, y0, y1, c):
        self.rect(x, y0, x, y1, c)

    def line(self, x0, y0, x1, y1, c):
        x0 = int(round(x0)); y0 = int(round(y0))
        x1 = int(round(x1)); y1 = int(round(y1))
        dx = abs(x1 - x0); dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.puti(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def line_pts(self, x0, y0, x1, y1):
        x0 = int(round(x0)); y0 = int(round(y0))
        x1 = int(round(x1)); y1 = int(round(y1))
        pts = []
        dx = abs(x1 - x0); dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            pts.append((x0, y0))
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy
        return pts

    def mask_poly(self, pts):
        m = Image.new("L", (self.w, self.h), 0)
        ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=255, outline=255)
        return np.array(m) > 0

    def mask_ellipse(self, cx, cy, rx, ry, k=1.0):
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        return ((xx - cx) / max(rx, 0.01)) ** 2 + ((yy - cy) / max(ry, 0.01)) ** 2 <= k

    def fill(self, mask, c):
        self.a[mask, 0:3] = c
        self.a[mask, 3] = 255

    def poly(self, pts, c):
        self.fill(self.mask_poly(pts), c)

    def ellipse(self, cx, cy, rx, ry, c, k=1.0):
        self.fill(self.mask_ellipse(cx, cy, rx, ry, k), c)

    def opaque(self):
        return self.a[..., 3] > 0

    def paste(self, other, ox, oy):
        m = other.a[..., 3] > 0
        for y, x in zip(*np.nonzero(m)):
            self.puti(x + ox, y + oy, tuple(int(v) for v in other.a[y, x, 0:3]))

    def flip(self):
        s = Spr(self.w, self.h)
        s.a = self.a[:, ::-1].copy()
        return s

    def save(self, name):
        a = self.a.copy()
        a[..., 3] = np.where(a[..., 3] > 0, 255, 0)
        a[a[..., 3] == 0] = 0
        Image.fromarray(a, "RGBA").save(os.path.join(OUT, name + ".png"))


# --------------------------------------------------------------------------
# shading helpers
# --------------------------------------------------------------------------
LIGHT = np.array([0.55, -0.62, 0.56])  # screen x right, screen y down, z toward viewer
LIGHT = LIGHT / np.linalg.norm(LIGHT)


def band(t, n):
    return clampi(int(math.floor(t * n)), 0, n - 1)


def ball(s, cx, cy, rx, ry, rmp, bias=0.0, k=1.0, light=LIGHT, gamma=1.0, only=None):
    """Band-shaded ellipsoid (classic pixel-art sphere shading)."""
    n = len(rmp)
    x0 = int(math.floor(cx - rx - 1)); x1 = int(math.ceil(cx + rx + 1))
    y0 = int(math.floor(cy - ry - 1)); y1 = int(math.ceil(cy + ry + 1))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            d = nx * nx + ny * ny
            if d > k:
                continue
            if only is not None and not only(x, y):
                continue
            nz = math.sqrt(max(0.0, 1.0 - min(d, 1.0)))
            i = nx * light[0] + ny * light[1] + nz * light[2]
            t = ((i + 1.0) * 0.5) ** gamma + bias
            s.puti(x, y, rmp[band(t, n)])


def selout(s, rmps, dirs=((0, 1), (-1, 0)), step=None, default=hx("#2a1a2e"), mask=None):
    """Selective outline: opaque pixels whose neighbour in one of `dirs` is
    transparent get darkened to the darkest colour of their ramp (or by `step`
    shades when step is given)."""
    lut = {}
    for r in rmps:
        for i, c in enumerate(r):
            if step is None:
                lut.setdefault(c, r[0])
            else:
                lut.setdefault(c, r[max(0, i - step)])
    a = s.a
    op = a[..., 3] > 0
    edge = np.zeros_like(op)
    H, W = op.shape
    for dx, dy in dirs:
        nb = np.zeros_like(op)
        # nb[y,x] = op[y+dy, x+dx]
        ys = slice(max(0, -dy), H - max(0, dy))
        xs = slice(max(0, -dx), W - max(0, dx))
        ys2 = slice(max(0, dy), H - max(0, -dy) if max(0, -dy) else H)
        xs2 = slice(max(0, dx), W - max(0, -dx) if max(0, -dx) else W)
        nb[ys, xs] = op[ys2, xs2]
        edge |= op & ~nb
    if mask is not None:
        edge &= mask
    for y, x in zip(*np.nonzero(edge)):
        c = tuple(int(v) for v in a[y, x, 0:3])
        a[y, x, 0:3] = lut.get(c, default)


def outer_outline(s, col, dirs=((0, 1), (0, -1), (1, 0), (-1, 0)), mask=None):
    """Add a 1px outline OUTSIDE the silhouette (transparent pixels touching
    opaque ones)."""
    a = s.a
    op = a[..., 3] > 0
    H, W = op.shape
    add = np.zeros_like(op)
    for dx, dy in dirs:
        nb = np.zeros_like(op)
        ys = slice(max(0, -dy), H - max(0, dy))
        xs = slice(max(0, -dx), W - max(0, dx))
        ys2 = slice(max(0, dy), H - max(0, -dy) if max(0, -dy) else H)
        xs2 = slice(max(0, dx), W - max(0, -dx) if max(0, -dx) else W)
        nb[ys, xs] = op[ys2, xs2]
        add |= ~op & nb
    if mask is not None:
        add &= mask
    s.fill(add, col)


def remove_orphans(s, min_n=1):
    """Remove isolated single opaque pixels (no 4-neighbours) -- keeps edges clean."""
    a = s.a
    op = a[..., 3] > 0
    H, W = op.shape
    cnt = np.zeros(op.shape, int)
    p = np.pad(op, 1)
    for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        cnt += p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx]
    kill = op & (cnt < min_n)
    a[kill] = 0


def bottom_fix(s):
    """Guarantee the bottom row has ground contact (crop empty rows by
    shifting content down)."""
    op = s.a[..., 3] > 0
    rows = np.nonzero(op.any(axis=1))[0]
    if len(rows) and rows[-1] < s.h - 1:
        shift = s.h - 1 - rows[-1]
        s.a = np.roll(s.a, shift, axis=0)
        s.a[:shift] = 0


# --------------------------------------------------------------------------
# palettes
# --------------------------------------------------------------------------
OUTLINE = hx("#2a1a2e")

PALM_G = ramp("#10281c", "#1b4127", "#295c2a", "#3d7a2c", "#5c9630", "#88b23a", "#b8cc4c")
PALM_Y = ramp("#5e6a24", "#8f9a30", "#bdbf44", "#e0d870")
PALM_DEAD = ramp("#3e2a1e", "#6b4a26", "#94702e", "#b8933e")
TRUNK = ramp("#2c1a22", "#4a2c26", "#6b402e", "#8d5a36", "#b07a44", "#d1a05a", "#e8c47a")
COCO = ramp("#2a1a1e", "#5a3420", "#87552a", "#c08a44")

LEAF = ramp("#102618", "#1a3d22", "#285a26", "#3e7628", "#5e922c", "#88ac36", "#b8c64a")
BOUG = ramp("#4a0f32", "#8c1d55", "#c52f78", "#ea559a", "#ff8cc0", "#ffc4dd")

SANDSTONE = ramp("#3b1f22", "#6a3528", "#94502e", "#b96f38", "#d68f46", "#ecb15c", "#f6d083")
GREYROCK = ramp("#231c26", "#3c3236", "#574a48", "#76665c", "#968472", "#b6a68e")
STACK = ramp("#1e1726", "#2e2234", "#423040", "#5a4048", "#755552", "#946e5e", "#b48c70")
FOAM = ramp("#7fb4d8", "#bfe0f0", "#f4fbff")
SEA = ramp("#2a5c9c", "#3f7fc0")

CYP = ramp("#0c1f1a", "#133021", "#1d4429", "#2a5a2f", "#3d7434", "#5a8c3a", "#80a446")
BARK = ramp("#1c1418", "#33242a", "#4c3634", "#685044", "#8a6c56")

WOOD = ramp("#3a2420", "#5e3a2a", "#83573a", "#a8784a", "#c99a62", "#e3bd82")
GREY = ramp("#1e1c26", "#34323e", "#4c4b58", "#6a6a76", "#8c8c96", "#b4b4bc", "#dcdce0")
WHITE = ramp("#6c6878", "#9a96a6", "#c4c0c8", "#e2dedc", "#f6f2ea", "#ffffff")
STUCCO = ramp("#5e5266", "#8a7e8e", "#b5aab0", "#d6cdc6", "#ece4d8", "#fbf6ea")
TERRA = ramp("#3e1a1e", "#6a2826", "#94392c", "#bb5233", "#d9713e", "#ee9a5a")
GLASS = ramp("#161a2e", "#232a46", "#33405e", "#4c6684", "#7aa2bc")
LIT = ramp("#a8601e", "#e09a38", "#ffd870", "#fff2b0")
RED = ramp("#3a1020", "#6e1a26", "#a32630", "#d23a36", "#f0604a", "#ff9070")
BLUE = ramp("#141a40", "#1f2f6c", "#2c4aa0", "#3f6fd0", "#62a0ec", "#9cd0ff")
YEL = ramp("#5a3a10", "#a06a14", "#d8a020", "#f4c832", "#ffe466", "#fff4a8")
TEAL = ramp("#0e2e36", "#145058", "#1f7a7a", "#33a49a", "#62c8b4", "#a0e6d0")
PINK = ramp("#5a2440", "#94405e", "#c8687c", "#e8949a", "#f6bcb4", "#ffe0d0")
MINT = ramp("#1e3a3a", "#2e5e58", "#4a8878", "#72b29a", "#a2d4b8", "#d2f0d8")
SKIN = ramp("#4a2422", "#7a3e30", "#a8623e", "#cc8a56", "#e8b07a", "#f8d0a0")
HAIRS = [ramp("#1a1218", "#2e2026", "#4a3430"), ramp("#3a2014", "#5e3620", "#86542e"),
         ramp("#7a4e18", "#b8862c", "#e8c050"), ramp("#2a1612", "#4a2a1a", "#6e4426")]
BLACK = ramp("#0e0c14", "#1a1822", "#2a2834", "#3e3c4a")
SANDP = ramp("#7a5a38", "#a6824e", "#c8a468", "#e3c98a", "#f4e2b0")


# --------------------------------------------------------------------------
# PALMS
# --------------------------------------------------------------------------
def palm_trunk(s, bx, by, tx, ty, wb, wt, seg, curve_p=1.7, flare=2, rng=None, ring_k=1.0):
    """Ringed palm trunk from base (bx,by) up to (tx,ty).  Smooth silhouette,
    curved ring seams (dark on the shadow side, light on the lit side) and a
    small scaly nub on the shadow side at each seam."""
    H = by - ty
    dx = tx - bx
    n = len(TRUNK)

    def cxf(y):
        t = (by - y) / H
        return bx + dx * (t ** curve_p)

    for y in range(by, ty - 1, -1):
        t = (by - y) / H
        cx = cxf(y)
        w = wb + (wt - wb) * t
        fl = by - y
        if fl < 4:
            w += flare * (4 - fl) / 4.0
        left = cx - w / 2.0
        right = cx + w / 2.0
        xl = int(math.floor(left + 0.5)); xr = int(math.floor(right + 0.5)) - 1
        if xr < xl:
            xr = xl
        row_ph = (by - y) % seg
        for x in range(xl, xr + 1):
            u = (x + 0.5 - xl) / (xr - xl + 1)
            nx = 2 * u - 1
            nz = math.sqrt(max(0.0, 1 - nx * nx))
            lum = 0.5 + 0.5 * (nx * 0.8 + nz * 0.42) - 0.04
            v = (by - y) + ring_k * (1 - nx * nx) * 0.75
            ph = int(math.floor(v)) % seg
            b = band(lum, n - 1) + 1
            if ph == seg - 1:          # seam
                b = 1 if u < 0.62 else 3
            elif ph == seg - 2 and u > 0.3:
                b += 1                 # lit lip just under the seam
            b = clampi(b, 1, n - 1)
            if x == xl:
                b = 0
            elif x == xr:
                b = min(b, 4)
            s.puti(x, y, TRUNK[b])
        if row_ph == seg - 1 and fl > 3 and t < 0.97:
            s.puti(xl - 1, y, TRUNK[0])     # scaly nub on the shadow side
    return cxf


def frond_layer(w, h, cx, cy, phi0, length, bend, wdown, wup, shade, yel=0.3,
                period=2.0, dead=False, bend_side=None, grav=0.75, hw=1.05, seed=0):
    """One palm frond in screen space on its own layer.
    phi0: departure angle (deg, 0=right, 90=up); the spine bends toward the
    ground by `bend` degrees in total.  Leaflets are explicit little strips:
    long ones hanging below the spine (blend of spine normal and gravity),
    short lit ones above."""
    rng = random.Random(seed)
    L = Spr(w, h)
    side = bend_side if bend_side is not None else (1 if math.cos(math.radians(phi0)) >= 0 else -1)
    K = max(16, int(length * 4))
    ds = length / K
    pts = []
    x, y, p = float(cx), float(cy), math.radians(phi0)
    for k in range(K + 1):
        pts.append((x, y, p))
        x += math.cos(p) * ds
        y -= math.sin(p) * ds
        p -= side * math.radians(bend) * (ds / length) * (0.15 + 1.7 * k / K)
    rm = PALM_DEAD if dead else PALM_G
    n = len(rm)
    G = np.array([0.0, 1.0])

    def prof(u):
        if u < 0.08:
            return 0.0
        return math.sin(math.pi * min(1.0, u) ** 0.8) ** 0.6 * (1.0 - 0.15 * u)

    yel_u = 1.0 - yel
    # leaflets base -> tip
    s_pos = length * 0.08
    upper, lower = [], []
    while s_pos < length * 0.985:
        k = int(s_pos / ds)
        x, y, p = pts[k]
        u = s_pos / length
        T = np.array([math.cos(p), -math.sin(p)])
        N = side * np.array([math.sin(p), math.cos(p)])
        P = np.array([x, y])
        jit = 0.85 + 0.3 * rng.random()
        # lower (hanging) leaflet
        Dl = N * 0.55 + G * grav + T * 0.45
        Dl /= np.linalg.norm(Dl)
        ll = wdown * prof(u) * jit
        if ll >= 1.0:
            lower.append((P, T, Dl, ll, u))
        Du = -N * 0.75 + T * 0.65 + G * 0.1
        Du /= np.linalg.norm(Du)
        lu = wup * prof(u) * (0.9 + 0.2 * rng.random())
        if lu >= 0.8:
            upper.append((P, T, Du, lu, u))
        s_pos += period

    def leaflet(P, T, D, ll, u, is_low):
        B1 = P - T * hw
        B2 = P + T * hw * 0.6
        Q = P + D * ll
        m = L.mask_poly([tuple(B1), tuple(B2), tuple(Q + T * 0.3), tuple(Q)])
        ys, xs = np.nonzero(m)
        for yy, xx in zip(ys, xs):
            f = float(np.dot(np.array([xx, yy]) - P, D)) / max(ll, 0.5)
            if is_low:
                b = shade + 1 if f < 0.3 else (shade if f < 0.72 else shade - 1)
            else:
                b = shade + 2 if f < 0.6 else shade + 1
            b = clampi(b, 1, n - 1)
            c = rm[b]
            if not dead and u > yel_u and (f > 0.45 or u > yel_u + 0.15):
                c = PALM_Y[clampi(b - 1, 0, len(PALM_Y) - 1)]
            L.puti(xx, yy, c)

    for it in upper:
        leaflet(*it, is_low=False)
    for it in lower:
        leaflet(*it, is_low=True)
    # midrib: 1px line, highlight colour
    prev = None
    for k, (x, y, p) in enumerate(pts):
        q = (int(round(x)), int(round(y)))
        if q == prev:
            continue
        prev = q
        u = k / K
        if dead:
            c = rm[clampi(shade + 1, 1, n - 1)]
        elif u > yel_u + 0.1:
            c = PALM_Y[2]
        else:
            c = rm[clampi(shade + 2, 1, n - 1)]
        L.puti(q[0], q[1], c)
    return L


def paste_with_shadow(s, lay, rmps, sh=2):
    """Composite a layer; where the layer's lower edge sits on existing pixels,
    darken those pixels (front fronds cast shade on the ones behind)."""
    lo = lay.a[..., 3] > 0
    ex = s.a[..., 3] > 0
    H, W = lo.shape
    below = np.zeros_like(lo)
    below[1:, :] = lo[:-1, :]
    below2 = np.zeros_like(lo)
    below2[1:, 1:] = lo[:-1, :-1]
    tgt = (below | below2) & ~lo & ex
    lut = {}
    for r in rmps:
        for i, c in enumerate(r):
            lut.setdefault(c, r[max(0, i - sh)] if i > 0 else r[0])
    for y, x in zip(*np.nonzero(tgt)):
        c = tuple(int(v) for v in s.a[y, x, 0:3])
        if c in lut:
            s.a[y, x, 0:3] = lut[c]
    s.a[lo] = lay.a[lo]


def coconuts(s, cx, cy):
    """Cluster of 3x3-ish nuts, each with a dark rim and a warm glint."""
    nuts = [(-2.5, 0.0), (1.5, -0.5), (-0.5, 2.0), (3.0, 2.0)]
    for (ox, oy) in nuts:
        x0 = int(round(cx + ox)); y0 = int(round(cy + oy))
        for dy in range(-1, 3):
            for dx in range(-1, 3):
                if (dx in (-1, 2)) and (dy in (-1, 2)):
                    continue
                c = COCO[1]
                if dx == -1 or dy == 2:
                    c = COCO[0]
                elif dx == 1 and dy == 0:
                    c = COCO[3]
                elif dx >= 0 and dy <= 0:
                    c = COCO[2]
                s.puti(x0 + dx, y0 + dy, c)


def make_palm(w, h, top_x, top_y, wb, wt, seg, fronds, front, curve_p=1.7, nuts=True,
              crown_dy=0, seed=5):
    """fronds/front: lists of (phi0, length, bend, wdown, wup, shade[, yel, dead])."""
    s = Spr(w, h)
    bx = w / 2.0
    palm_trunk(s, bx, h - 1, top_x, top_y + 3, wb, wt, seg, curve_p=curve_p)
    ccx, ccy = top_x, top_y + crown_dy
    rmps = [PALM_G, PALM_Y, PALM_DEAD, TRUNK, COCO]
    cnt = [0]

    def draw(lst):
        for f in lst:
            phi0, ln, bend, wd, wu, sh = f[:6]
            yel = f[6] if len(f) > 6 else 0.3
            dead = f[7] if len(f) > 7 else False
            cnt[0] += 1
            lay = frond_layer(w, h, ccx, ccy, phi0, ln, bend, wd, wu, sh, yel=yel, dead=dead,
                              seed=seed * 100 + cnt[0])
            paste_with_shadow(s, lay, rmps)

    draw(fronds)
    draw(front)
    if nuts:
        coconuts(s, ccx, ccy + 3)
    selout(s, rmps, dirs=((0, 1),))
    remove_orphans(s)
    bottom_fix(s)
    return s


def palm_a():
    # Outrun hero palm: trunk curving gently right, big drooping crown.
    back = [
        # phi0, len, bend, wdown, wup, shade, yel, dead
        (210, 16, 15, 4.0, 1.0, 1, 0.0, True),   # dead frond hanging under crown
        (102, 26, 60, 5.5, 1.5, 1, 0.12),
        (64, 28, 80, 6.0, 1.5, 2, 0.15),
        (136, 36, 100, 6.5, 2.0, 1, 0.18),
        (30, 31, 105, 6.5, 2.0, 4, 0.2),
    ]
    front = [
        (166, 44, 105, 7.5, 2.0, 2, 0.22),
        (2, 31, 100, 7.0, 2.0, 4, 0.22),
        (202, 34, 70, 7.0, 2.0, 2, 0.18),
        (-30, 27, 62, 6.5, 2.0, 4, 0.18),
        (246, 21, 30, 6.0, 2.0, 2, 0.12),
        (292, 19, 25, 6.0, 2.0, 4, 0.12),
    ]
    return make_palm(72, 160, 45, 28, 8.0, 5.0, 4, back, front, curve_p=1.8)


def palm_b():
    # leaning left, slightly different crown (more upright, fewer long fronds)
    back = [
        (330, 14, 15, 3.5, 1.0, 1, 0.0, True),
        (84, 24, 55, 5.0, 1.5, 1, 0.12),
        (118, 26, 80, 5.5, 1.5, 1, 0.15),
        (48, 30, 95, 6.0, 2.0, 2, 0.18),
        (150, 28, 100, 6.0, 2.0, 1, 0.18),
    ]
    front = [
        (14, 40, 105, 7.0, 2.0, 4, 0.22),
        (180, 26, 95, 6.5, 2.0, 2, 0.2),
        (-22, 30, 70, 6.5, 2.0, 4, 0.18),
        (214, 22, 55, 6.0, 2.0, 2, 0.15),
        (268, 16, 20, 5.5, 2.0, 2, 0.1),
    ]
    return make_palm(64, 136, 21, 25, 7.5, 4.6, 4, back, front, curve_p=1.4)


def palm_c():
    back = [
        (92, 21, 40, 4.5, 1.5, 1, 0.12),
        (56, 23, 75, 5.0, 1.5, 2, 0.15),
        (126, 23, 75, 5.0, 1.5, 1, 0.15),
    ]
    front = [
        (18, 27, 100, 6.0, 2.0, 4, 0.2),
        (162, 27, 100, 6.0, 2.0, 2, 0.2),
        (-25, 22, 60, 6.0, 2.0, 4, 0.15),
        (205, 22, 60, 6.0, 2.0, 2, 0.15),
        (268, 13, 10, 5.0, 2.0, 2, 0.1),
    ]
    return make_palm(56, 112, 29, 24, 7.0, 4.6, 3, back, front, curve_p=1.2)


# --------------------------------------------------------------------------
# FOLIAGE (bushes, cypress pads)
# --------------------------------------------------------------------------
def leaf_texture(w, h, seed, cell=3, amp=0.13):
    """Per-pixel lighting offset made of small leaf clumps on a jittered grid:
    each clump is lit on its upper-right and shaded on its lower-left."""
    rng = random.Random(seed)
    tex = np.zeros((h, w))
    owner = -np.ones((h, w), int)
    best = np.full((h, w), 1e9)
    cents = []
    for gy in range(-1, h // cell + 2):
        for gx in range(-1, w // cell + 2):
            ox = (gy % 2) * cell * 0.5
            cents.append((gx * cell + ox + rng.uniform(-0.8, 0.8), gy * cell + rng.uniform(-0.8, 0.8),
                          rng.uniform(-0.6, 0.6)))
    yy, xx = np.mgrid[0:h, 0:w]
    for i, (cx, cy, r) in enumerate(cents):
        d = (xx - cx) ** 2 + ((yy - cy) * 1.25) ** 2
        m = d < best
        best[m] = d[m]
        owner[m] = i
    for i, (cx, cy, r) in enumerate(cents):
        m = owner == i
        if not m.any():
            continue
        lx = (xx - cx); ly = (yy - cy)
        tex[m] = (amp * (lx[m] * 0.45 - ly[m] * 0.55) / (cell * 0.5) + amp * 0.5 * r)
    # clump borders darker (gaps between leaf clumps)
    return np.clip(tex, -amp * 1.6, amp * 1.6)


def lobed_ball(s, cx, cy, rx, ry, rmp, seed=0, lobes=8, lobe_amp=0.13, bias=0.0, light=LIGHT,
               gamma=1.15, ao=None, flat_base=None, idmap=None, ident=0, lo=1):
    """Ball-shaded clump with a scalloped (lobed) silhouette.  ao=(top,bot,amt)
    darkens toward the bottom of the whole plant."""
    rng = random.Random(seed)
    ph = rng.uniform(0, math.tau)
    ph2 = rng.uniform(0, math.tau)
    n = len(rmp)
    for y in range(int(cy - ry * 1.3) - 1, int(cy + ry * 1.3) + 2):
        for x in range(int(cx - rx * 1.3) - 1, int(cx + rx * 1.3) + 2):
            if not s.inb(x, y):
                continue
            if flat_base is not None and y > flat_base:
                continue
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            d = math.sqrt(nx * nx + ny * ny)
            th = math.atan2(ny, nx)
            rr = 1.0 + lobe_amp * (abs(math.sin(th * lobes * 0.5 + ph)) * 1.6 - 0.6) \
                + lobe_amp * 0.4 * math.sin(th * 3 + ph2)
            if d > rr:
                continue
            q = min(d / rr, 1.0)
            nxx, nyy = (nx / max(d, 1e-6)) * q, (ny / max(d, 1e-6)) * q
            nz = math.sqrt(max(0.0, 1 - q * q))
            i = nxx * light[0] + nyy * light[1] + nz * light[2]
            t = ((i + 1) * 0.5) ** gamma + bias
            if ao is not None:
                t -= ao[2] * clampi((y - ao[0]) / max(1, ao[1] - ao[0]), 0, 1) ** 2
            s.puti(x, y, rmp[clampi(int(math.floor(t * (n - lo))) + lo, lo, n - 1)])
            if idmap is not None:
                idmap[y, x] = ident


def leaf_dabs(s, rmp, seed=0, step=4, region=None, hi_min=2, prob=0.85):
    """Sprinkle small fixed leaf marks: a lit 3-px dab on lit areas, a dark
    3-px notch on shaded areas.  Gives leaf texture without noise."""
    rng = random.Random(seed)
    idx = {c: i for i, c in enumerate(rmp)}
    n = len(rmp)
    H, W = s.h, s.w
    hi_shape = [(0, 0), (1, 0), (0, 1)]
    hi_shape2 = [(0, 0), (1, 0), (1, -1)]
    lo_shape = [(0, 0), (-1, 1), (0, 1)]
    for gy in range(1, H - 1, step - 1):
        for gx in range(1, W - 1, step):
            x = gx + (gy // (step - 1) % 2) * (step // 2) + rng.randint(-1, 1)
            y = gy + rng.randint(-1, 0)
            if rng.random() > prob:
                continue
            c = s.get(x, y)
            if c is None or c not in idx:
                continue
            if region is not None and not region[y, x]:
                continue
            # keep marks away from the silhouette
            if not all(s.op(x + dx, y + dy) for dx in (-1, 0, 1, 2) for dy in (-1, 0, 1, 2)):
                continue
            b = idx[c]
            if b >= hi_min + 1:
                shp = hi_shape if rng.random() < 0.6 else hi_shape2
                nb = b + 1
            else:
                shp = lo_shape
                nb = b - 1
            nb = clampi(nb, 1, n - 1)
            for dx, dy in shp:
                cc = s.get(x + dx, y + dy)
                if cc is not None and cc in idx and abs(idx[cc] - b) <= 1:
                    s.puti(x + dx, y + dy, rmp[nb])


def foliage(s, blobs, rmp, seed=1, bias=0.0, outline=True, out_dirs=((0, 1), (-1, 0)),
            ao=0.28, lobes=8, lobe_amp=0.13, dabs=True, dab_step=4, flat_base=None, gamma=1.45,
            lit_outline_idx=None, contact=True):
    """Bush / canopy: blobs (cx, cy, rx, ry[, bias]) drawn back-to-front as
    lobed, ball-shaded clumps (each on its own layer, casting a 1-shade
    contact shadow on the clumps behind); then leaf dabs; then selective
    outline."""
    tops = [b[1] - b[3] for b in blobs]; bots = [b[1] + b[3] for b in blobs]
    aot = (min(tops), max(bots), ao)
    for k, b in enumerate(blobs):
        cx, cy, rx, ry = b[:4]
        bb = b[4] if len(b) > 4 else 0.0
        lay = Spr(s.w, s.h)
        lobed_ball(lay, cx, cy, rx, ry, rmp, seed=seed * 31 + k, lobes=lobes, lobe_amp=lobe_amp,
                   bias=bias + bb, ao=aot, flat_base=flat_base, gamma=gamma)
        if contact:
            ring_shadow(s, lay, [rmp], sh=1)
        lo = lay.a[..., 3] > 0
        s.a[lo] = lay.a[lo]
    if dabs:
        leaf_dabs(s, rmp, seed=seed + 5, step=dab_step)
    if outline:
        selout(s, [rmp], dirs=out_dirs)
        if lit_outline_idx is not None:
            lit_outline(s, [rmp], idx=lit_outline_idx)


def ring_shadow(s, lay, rmps, sh=1, dirs=((0, 1), (0, -1), (1, 0), (-1, 0), (-1, -1), (1, -1))):
    """Darken pixels of s that touch the silhouette of layer `lay` (contact
    shadow / separation line), before lay is composited."""
    lo = lay.a[..., 3] > 0
    ex = s.a[..., 3] > 0
    H, W = lo.shape
    near = np.zeros_like(lo)
    p = np.pad(lo, 1)
    for dx, dy in dirs:
        near |= p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx]
    tgt = near & ~lo & ex
    lut = {}
    for r in rmps:
        for i, c in enumerate(r):
            lut.setdefault(c, r[max(1, i - sh)] if i > 1 else r[i])
    for y, x in zip(*np.nonzero(tgt)):
        c = tuple(int(v) for v in s.a[y, x, 0:3])
        if c in lut:
            s.a[y, x, 0:3] = lut[c]


def bush_a():
    s = Spr(48, 28)
    blobs = [
        (13, 15, 10, 8.5), (34, 13, 11, 9), (23, 9, 10, 8),
        (8, 21, 8, 7), (41, 20, 7.5, 7.5), (25, 19, 13, 9.5),
    ]
    foliage(s, blobs, LEAF, seed=3, bias=-0.04)
    remove_orphans(s)
    bottom_fix(s)
    return s


def bush_b():
    s = Spr(48, 30)
    blobs = [
        (15, 14, 10, 9), (32, 11, 11, 9), (23, 8, 9, 7.5),
        (8, 22, 8, 7.5), (40, 21, 8, 8), (24, 20, 13, 9.5),
    ]
    foliage(s, blobs, LEAF, seed=8, bias=-0.1)
    # bougainvillea bract masses: clumps of small blossoms, denser on the lit top
    rng = random.Random(41)
    op = s.opaque()
    masses = [(13, 9, 6, 4), (27, 5, 7, 4), (37, 10, 6, 5), (22, 15, 6, 4), (7, 18, 4, 3),
              (40, 20, 4, 3), (31, 20, 5, 3), (17, 22, 4, 3)]
    blos = [[(0, 0), (1, 0), (0, 1), (1, 1)],
            [(0, 0), (1, 0), (-1, 1), (0, 1), (1, 1), (0, 2)],
            [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1)]]
    for (mx, my, rx, ry) in masses:
        for k in range(int(rx * ry * 0.55)):
            a = rng.uniform(0, math.tau); r = math.sqrt(rng.random())
            x = int(round(mx + math.cos(a) * rx * r)); y = int(round(my + math.sin(a) * ry * r))
            sh = rng.choice(blos)
            hi = (x - mx) * 0.6 - (y - my) * 0.8   # lit toward upper right of the mass
            depth = (y - 4) / 26.0
            for (dx, dy) in sh:
                X, Y = x + dx, y + dy
                if not (0 <= X < 48 and 0 <= Y < 30) or not op[Y, X]:
                    continue
                b = 3 + (1 if hi > 1.0 else 0) + (1 if (hi > 2.5 and dy == 0 and dx >= 1) else 0)
                b -= (1 if dy >= 1 and dx <= 0 else 0) + (1 if depth > 0.65 else 0)
                s.puti(X, Y, BOUG[clampi(b, 1, 5)])
    selout(s, [LEAF, BOUG], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


GRASS = ramp("#26301c", "#3e4c26", "#5c6c30", "#80903c", "#a8a84c", "#d0c46c", "#ece0a0")


def grass_a():
    """Dune-grass tuft: a fan of bold arcing blades (2px, shaded: dark left,
    lit right) tapering to 1px straw tips; back blades darker."""
    s = Spr(28, 16)
    rng = random.Random(12)
    blades = []
    N = 13
    for i in range(N):
        u = (i / (N - 1)) * 2 - 1 + rng.uniform(-0.05, 0.05)
        bx = 14 + u * 3.5
        lean = u * 10.0 + rng.uniform(-1.0, 1.0)
        hgt = (15.0 - abs(u) * 7.0) * rng.uniform(0.85, 1.0)
        dep = (1 - abs(u)) * 0.4 + rng.random() * 0.6
        blades.append((bx, lean, hgt, dep, u))
    blades.sort(key=lambda b: b[3])     # back (dark) first
    for (bx, lean, hgt, dep, u) in blades:
        base_b = 1 + int(dep * 2.99)
        steps = 40
        prev = None
        for j in range(steps + 1):
            t = j / steps
            x = bx + lean * t ** 1.7
            y = 15 - hgt * math.sin(t * math.pi * 0.5) * (1 - 0.15 * abs(u) * t * t)
            p = (int(round(x)), int(round(y)))
            if p == prev:
                continue
            prev = p
            b = base_b + (1 if t > 0.55 else 0) + (1 if t > 0.85 else 0)
            if t < 0.7:
                s.puti(p[0], p[1], GRASS[clampi(b - 1, 1, 6)])
                s.puti(p[0] + 1, p[1], GRASS[clampi(b + 1, 1, 6)])
            else:
                s.puti(p[0], p[1], GRASS[clampi(b + 1, 1, 6)])
    remove_orphans(s)
    bottom_fix(s)
    return s


# --------------------------------------------------------------------------
# ROCKS (Voronoi facets over a dome height-field)
# --------------------------------------------------------------------------
def dist_inside(mask):
    """Chamfer distance to the outside for every inside pixel."""
    h, w = mask.shape
    INF = 1e9
    d = np.where(mask, INF, 0.0)
    for y in range(h):
        for x in range(w):
            if d[y, x] == 0:
                continue
            v = d[y, x]
            if x > 0: v = min(v, d[y, x - 1] + 1)
            else: v = min(v, 1)
            if y > 0: v = min(v, d[y - 1, x] + 1)
            else: v = min(v, 1)
            if x > 0 and y > 0: v = min(v, d[y - 1, x - 1] + 1.414)
            if x < w - 1 and y > 0: v = min(v, d[y - 1, x + 1] + 1.414)
            d[y, x] = v
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            if d[y, x] == 0:
                continue
            v = d[y, x]
            if x < w - 1: v = min(v, d[y, x + 1] + 1)
            else: v = min(v, 1)
            if y < h - 1: v = min(v, d[y + 1, x] + 1)
            else: v = min(v, 1)
            if x < w - 1 and y < h - 1: v = min(v, d[y + 1, x + 1] + 1.414)
            if x > 0 and y < h - 1: v = min(v, d[y + 1, x - 1] + 1.414)
            d[y, x] = v
    return d


def facet_rock(s, mask, rmp, nseeds=10, seed=1, stretch=(1.0, 1.0), jitter=0.45,
               dome=6.0, strata=None, light=LIGHT, bias=0.0, edge_dark=True, fissures=3,
               rim=True, nz=0.75, tilt=1.5):
    """Chiselled rock: Voronoi facets, each flat-shaded from the dome normal
    at the facet (plus jitter).  Facet edges are expressed only by value
    change, a lit rim on the upper-right facet and a dark crease on the lower
    facet, plus a few hand-placed-looking fissures."""
    rng = random.Random(seed)
    h, w = mask.shape
    dist = dist_inside(mask)
    # the ground row continues below: don't treat bottom edge as an edge
    hgt = np.sqrt(np.clip(dist, 0, None) / dome) * dome
    gy, gx = np.gradient(hgt)
    ys, xs = np.nonzero(mask)
    pts = list(zip(xs, ys))
    seeds = []
    tries = 0
    mind = math.sqrt(len(pts) / max(1, nseeds)) * 0.75
    while len(seeds) < nseeds and tries < 8000:
        tries += 1
        x, y = pts[rng.randrange(len(pts))]
        if all(((x - a) / stretch[0]) ** 2 + ((y - b) / stretch[1]) ** 2 > mind * mind for a, b, _ in seeds):
            seeds.append((x, y, (rng.uniform(-jitter, jitter), rng.uniform(-jitter, jitter))))
    sx = np.array([a for a, b, _ in seeds], float)
    sy = np.array([b for a, b, _ in seeds], float)
    dd = ((xs[:, None] - sx[None, :]) / stretch[0]) ** 2 + ((ys[:, None] - sy[None, :]) / stretch[1]) ** 2
    own = dd.argmin(axis=1)
    cell = -np.ones((h, w), int)
    cell[ys, xs] = own
    n = len(rmp)
    shade = {}
    for i in range(len(seeds)):
        m = own == i
        if not m.any():
            shade[i] = 1
            continue
        cy = ys[m]; cx = xs[m]
        nx = -gx[cy, cx].mean() * tilt + seeds[i][2][0]
        ny = -gy[cy, cx].mean() * tilt + seeds[i][2][1]
        L = math.sqrt(nx * nx + ny * ny + nz * nz)
        it = (nx * light[0] + ny * light[1] + nz * light[2]) / L
        t = (it + 1) * 0.5 + bias
        shade[i] = clampi(int(math.floor(t * (n - 1))) + 1, 1, n - 2)
    img = np.zeros((h, w), int)
    for x, y, i in zip(xs, ys, own):
        b = shade[i]
        if strata is not None:
            b = clampi(b + strata(x, y), 1, n - 1)
        img[y, x] = b
    out = img.copy()
    if rim:
        for x, y in pts:
            c = cell[y, x]
            # neighbour to the lower-left belongs to a different, darker facet?
            for dx, dy in ((-1, 0), (0, 1), (-1, 1)):
                X, Y = x + dx, y + dy
                if 0 <= X < w and 0 <= Y < h and cell[Y, X] >= 0 and cell[Y, X] != c:
                    if shade[cell[Y, X]] < shade[c]:
                        out[y, x] = clampi(img[y, x] + 1, 1, n - 1)       # lit rim
                        out[Y, X] = clampi(img[Y, X] - 1, 1, n - 1)       # crease
    # fissures: short wandering dark cracks starting at the silhouette
    for f in range(fissures):
        x, y = pts[rng.randrange(len(pts))]
        ang = rng.uniform(0, math.tau)
        for k in range(rng.randint(3, 7)):
            if not (0 <= x < w and 0 <= y < h and mask[y, x]):
                break
            out[y, x] = 1
            if 0 <= x + 1 < w and mask[y, x + 1] and k % 2 == 0:
                out[y, x + 1] = clampi(out[y, x + 1] + 1, 1, n - 1)
            ang += rng.uniform(-0.6, 0.6)
            x = int(round(x + math.cos(ang))); y = int(round(y + math.sin(ang)))
    for x, y in pts:
        s.puti(x, y, rmp[out[y, x]])
    if edge_dark:
        selout(s, [rmp], dirs=((0, 1), (-1, 0)))
    return cell, shade


# ---- tiny low-poly renderer (orthographic, camera slightly above/behind) --
L3 = np.array([0.72, 0.10, 0.68])           # world: x right, y ahead, z up
L3 = L3 / np.linalg.norm(L3)


def rock_mesh(rng, rx, ry, rz, nlat=5, nlon=9, noise=0.22, zprof=None, twist=0.0, flat=0.0):
    """Displaced lat-long ellipsoid (upper hemisphere + skirt down to z=0)."""
    verts = []
    rings = []
    for i in range(nlat + 1):
        # latitude from 0 (ground) to pi/2 (top)
        a = (i / nlat) * (math.pi / 2)
        ring = []
        if i == nlat:
            z = rz * (1 + rng.uniform(-noise, noise) * 0.5)
            verts.append(np.array([rng.uniform(-0.15, 0.15) * rx, rng.uniform(-0.15, 0.15) * ry, z]))
            ring = [len(verts) - 1] * nlon
        else:
            for j in range(nlon):
                b = (j + (i % 2) * 0.5) / nlon * math.tau + twist * i
                k = 1 + rng.uniform(-noise, noise)
                pr = math.cos(a) if zprof is None else zprof(i / nlat)
                x = math.cos(b) * rx * pr * k
                y = math.sin(b) * ry * pr * k
                z = math.sin(a) * rz * (1 + rng.uniform(-noise, noise) * 0.6) if i > 0 else 0.0
                if zprof is not None and i > 0:
                    z = (i / nlat) * rz * (1 + rng.uniform(-noise, noise) * 0.4)
                verts.append(np.array([x, y, z]))
                ring.append(len(verts) - 1)
        rings.append(ring)
    tris = []
    for i in range(nlat):
        r0, r1 = rings[i], rings[i + 1]
        for j in range(nlon):
            a, b = r0[j], r0[(j + 1) % nlon]
            c, d = r1[j], r1[(j + 1) % nlon]
            if c == d:
                tris.append((a, b, c))
            else:
                tris.append((a, b, d)); tris.append((a, d, c))
    return verts, tris


def lit_outline(s, rmps, idx=2):
    """Softer outline on the sun side (top/right): a mid-dark tone of the
    material so the silhouette stays readable on light backgrounds."""
    a = s.a
    op = a[..., 3] > 0
    H, W = op.shape
    edge = np.zeros_like(op)
    up = np.zeros_like(op); up[1:, :] = op[:-1, :]
    rt = np.zeros_like(op); rt[:, :-1] = op[:, 1:]
    edge = op & (~up | ~rt)
    lut = {}
    for r in rmps:
        for i, c in enumerate(r):
            lut.setdefault(c, r[min(idx, i)] if i > idx else r[i])
    for y, x in zip(*np.nonzero(edge)):
        c = tuple(int(v) for v in a[y, x, 0:3])
        if c in lut:
            a[y, x, 0:3] = lut[c]


def render_mesh(s, verts, tris, ox, oy, rmp, pitch=0.30, scale=1.0, light=L3, bias=0.0,
                crease=True, outline=True, strata=None, spec=None, face_jitter=0.0, seed=0):
    """Flat-shaded painter's rendering into sprite s.  (ox, oy) = screen pos
    of world origin (ground centre).  Returns per-pixel face id buffer."""
    rng = random.Random(seed)
    cp, sp = math.cos(pitch), math.sin(pitch)
    P = []
    for v in verts:
        x, y, z = v * scale
        P.append((ox + x, oy - (z * cp + y * sp), y * cp - z * sp))
    faces = []
    n = len(rmp)
    for t in tris:
        A, B, C = (verts[i] for i in t)
        nrm = np.cross(B - A, C - A)
        ln = np.linalg.norm(nrm)
        if ln < 1e-9:
            continue
        nrm = nrm / ln
        cen = (A + B + C) / 3.0
        if np.dot(nrm, cen - np.array([0, 0, cen[2] * 0.3])) < 0:
            nrm = -nrm      # point outward
        # view vector: camera behind (−y) and above
        view = np.array([0.0, -cp, sp])
        if np.dot(nrm, view) <= 0:
            continue        # back face
        it = float(np.dot(nrm, light))
        tt = (it + 1) * 0.5 + bias + rng.uniform(-face_jitter, face_jitter)
        b = clampi(int(math.floor(tt * (n - 1))) + 1, 1, n - 1)
        depth = sum(P[i][2] for i in t) / 3.0
        faces.append((depth, [P[i][:2] for i in t], b, nrm))
    faces.sort(key=lambda f: -f[0])
    fid = -np.ones((s.h, s.w), int)
    shade = []
    for k, (dep, pts, b, nrm) in enumerate(faces):
        m = Image.new("L", (s.w, s.h), 0)
        ImageDraw.Draw(m).polygon([(px, py) for px, py in pts], fill=255, outline=255)
        mm = np.array(m) > 0
        fid[mm] = k
        shade.append(b)
    out = np.zeros((s.h, s.w), int)
    ys, xs = np.nonzero(fid >= 0)
    for y, x in zip(ys, xs):
        b = shade[fid[y, x]]
        if strata is not None:
            b = clampi(b + strata(x, y), 1, n - 1)
        out[y, x] = b
    if crease:
        o2 = out.copy()
        for y, x in zip(ys, xs):
            f = fid[y, x]
            for dx, dy in ((-1, 0), (0, 1)):
                X, Y = x + dx, y + dy
                if 0 <= X < s.w and 0 <= Y < s.h and fid[Y, X] >= 0 and fid[Y, X] != f:
                    if shade[fid[Y, X]] < shade[f] - 0:
                        o2[y, x] = clampi(out[y, x] + 1, 1, n - 1)
                        if shade[f] - shade[fid[Y, X]] >= 2:
                            o2[Y, X] = clampi(out[Y, X] - 1, 1, n - 1)
        out = o2
    for y, x in zip(ys, xs):
        s.puti(x, y, rmp[out[y, x]])
    if outline:
        selout(s, [rmp], dirs=((0, 1), (-1, 0)))
        lit_outline(s, [rmp])
    return fid


def poly_mask(w, h, pts):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=255, outline=255)
    return np.array(m) > 0


def blob_mask(w, h, blobs, flat_bottom=True):
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.zeros((h, w), bool)
    for (cx, cy, rx, ry) in blobs:
        m |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0
    return m


def rock_a():
    w, h = 56, 36
    s = Spr(w, h)
    # small companion stone behind-right, then the main boulder
    rng = random.Random(33)
    v2, t2 = rock_mesh(rng, 9, 7, 11, nlat=3, nlon=7, noise=0.22)
    render_mesh(s, v2, t2, 46, 35, SANDSTONE, pitch=0.35, seed=8, face_jitter=0.05)
    rng = random.Random(15)
    verts, tris = rock_mesh(rng, 22, 13, 30, nlat=3, nlon=8, noise=0.24)

    def strata(x, y):
        v = (y * 1.0 + x * 0.18) % 9
        return -1 if v < 1.0 else 0
    render_mesh(s, verts, tris, 24, 35, SANDSTONE, pitch=0.35, strata=strata, seed=3, face_jitter=0.05)
    remove_orphans(s)
    bottom_fix(s)
    return s


def rock_b():
    w, h = 40, 26
    s = Spr(w, h)
    rng = random.Random(17)
    verts, tris = rock_mesh(rng, 18, 11, 22, nlat=3, nlon=7, noise=0.22)
    render_mesh(s, verts, tris, 20, 25, GREYROCK, pitch=0.35, seed=5, face_jitter=0.05)
    remove_orphans(s)
    bottom_fix(s)
    return s


# ==========================================================================
# SECOND BATCH (sea stack, cypress, beach props, buildings, road furniture,
# billboards, crowd, gates).  Everything below only ADDS functions; the
# helpers above are unchanged so the approved sprites regenerate exactly.
# ==========================================================================
ORANGE = ramp("#4a1c14", "#8a3418", "#c85a1e", "#ee8a2a", "#ffb84a", "#ffdc8a")
STRAW = ramp("#5a3c1c", "#8c6430", "#b88e48", "#dcb866", "#f2da92")
PURPLE = ramp("#22163a", "#3a2460", "#5a3a8c", "#7e5cb8", "#a888dc", "#d0b8f4")
PBLUE = ramp("#3e4c74", "#5e78a4", "#86a6cc", "#acc8e4", "#d0e4f4", "#eef6ff")   # pastel blue
PYEL = ramp("#6e5a32", "#a08848", "#ccb460", "#ead27e", "#f8e8a6", "#fff8d6")    # pastel yellow
CORAL = ramp("#4e1c26", "#8a3438", "#c25448", "#e47a5e", "#f6a47e", "#ffd0aa")
STEEL = ramp("#1c1e2a", "#2e3242", "#464c5e", "#646c7e", "#8a92a2", "#b2bac6", "#dce2ea")
LAMPLIT = ramp("#c88a2a", "#ffd060", "#ffe890", "#fff2b0")


def stroke(s, pts, wfun, rmp, light=LIGHT, lo=1, hi=None, bias=0.0, streaks=(), seed=0,
           flat_t=None):
    """Thick polyline with cylinder shading across its width.  pts: (x, y)
    control points; wfun(u) -> full width at arc fraction u (0 = first point).
    streaks: list of (t_centre, period, on_len, phase) -> darker fibre lines."""
    hi = len(rmp) - 1 if hi is None else hi
    dense = []
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) * 4))
        for k in range(n):
            t = k / n
            dense.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    dense.append(tuple(pts[-1]))
    D = np.array(dense, float)
    seg = np.r_[0.0, np.cumsum(np.hypot(*np.diff(D, axis=0).T))]
    Ltot = max(seg[-1], 1e-6)
    U = seg / Ltot
    T = np.gradient(D, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1)[:, None], 1e-9)
    W = np.array([wfun(u) for u in U])
    xa = int(math.floor((D[:, 0] - W).min())) - 1; xb = int(math.ceil((D[:, 0] + W).max())) + 1
    ya = int(math.floor((D[:, 1] - W).min())) - 1; yb = int(math.ceil((D[:, 1] + W).max())) + 1
    n = len(rmp)
    for y in range(max(0, ya), min(s.h, yb + 1)):
        for x in range(max(0, xa), min(s.w, xb + 1)):
            d2 = (D[:, 0] - x) ** 2 + (D[:, 1] - y) ** 2
            k = int(d2.argmin())
            hw = W[k] / 2.0
            if d2[k] > hw * hw:
                continue
            dvx, dvy = x - D[k, 0], y - D[k, 1]
            Nx, Ny = -T[k, 1], T[k, 0]
            sd = dvx * Nx + dvy * Ny
            t = clampi(sd / max(hw, 0.5), -1.0, 1.0)
            nz = math.sqrt(max(0.0, 1 - t * t))
            i = Nx * t * light[0] + Ny * t * light[1] + nz * light[2]
            v = (i + 1) * 0.5 + bias
            b = clampi(int(math.floor(v * (hi - lo + 1))) + lo, lo, hi)
            for (tc, per, on, ph) in streaks:
                if abs(t - tc) * hw < 0.5 and (seg[k] + ph) % per < on:
                    b = max(lo - 1 if lo > 0 else 0, b - 2)
            s.puti(x, y, rmp[b])


def add_layer(s, lay, rmps=None, sh=1):
    """Composite layer onto s (optional 1-shade contact shadow on s)."""
    if rmps is not None:
        ring_shadow(s, lay, rmps, sh=sh)
    lo = lay.a[..., 3] > 0
    s.a[lo] = lay.a[lo]


def fill_holes(s, max_size=12):
    """Fill small enclosed transparent pockets (mesh cracks) with the colour
    of the opaque pixel above/left of them."""
    op = s.opaque()
    H, W = op.shape
    seen = np.zeros_like(op)
    for sy in range(H):
        for sx in range(W):
            if op[sy, sx] or seen[sy, sx]:
                continue
            comp, stack, border = [], [(sx, sy)], False
            seen[sy, sx] = True
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                if x in (0, W - 1) or y in (0, H - 1):
                    border = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    X, Y = x + dx, y + dy
                    if 0 <= X < W and 0 <= Y < H and not op[Y, X] and not seen[Y, X]:
                        seen[Y, X] = True
                        stack.append((X, Y))
            if border or len(comp) > max_size:
                continue
            for x, y in sorted(comp, key=lambda p: (p[1], p[0])):
                c = s.get(x, y - 1) or s.get(x - 1, y) or s.get(x + 1, y) or s.get(x, y + 1)
                if c is not None:
                    s.puti(x, y, c)


def _cdist(a, b):
    rm = (a[0] + b[0]) / 2.0
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)


def limit_palette(s, n=24, keep=(), mapping=None):
    """Cap the sprite palette at n colours: repeatedly fold the colour pair
    with the smallest (distance * sqrt(rarer count)) into the more common
    one.  Returns the colour mapping (pass it as `mapping` to apply the same
    folding to a variant, e.g. the lit house).  `keep` colours never change."""
    op = s.a[..., 3] > 0
    px = [tuple(int(v) for v in c) for c in s.a[op][:, 0:3]]
    if mapping is None:
        cnt = {}
        for c in px:
            cnt[c] = cnt.get(c, 0) + 1
        mapping = {c: c for c in cnt}
        keep = set(keep)
        while len(cnt) > n:
            best = None
            cols = list(cnt)
            for i in range(len(cols)):
                for j in range(i + 1, len(cols)):
                    a, b = cols[i], cols[j]
                    if a in keep and b in keep:
                        continue
                    sc = _cdist(a, b) * math.sqrt(min(cnt[a], cnt[b]))
                    if best is None or sc < best[0]:
                        best = (sc, a, b)
            _, a, b = best
            src, dst = (a, b) if (cnt[a] < cnt[b] and a not in keep) or b in keep else (b, a)
            cnt[dst] += cnt.pop(src)
            for k, v in mapping.items():
                if v == src:
                    mapping[k] = dst
    ys, xs = np.nonzero(op)
    for y, x in zip(ys, xs):
        c = tuple(int(v) for v in s.a[y, x, 0:3])
        if c in mapping:
            s.a[y, x, 0:3] = mapping[c]
    return mapping


def shift_x(s, dx):
    """Move the artwork horizontally (for anchor centring); must not clip."""
    op = s.a[..., 3] > 0
    xs = np.nonzero(op.any(axis=0))[0]
    assert xs.min() + dx >= 0 and xs.max() + dx < s.w, "shift would clip"
    s.a = np.roll(s.a, dx, axis=1)


def remap(s, mapping):
    for src, dst in mapping.items():
        m = (s.a[..., 3] > 0) & np.all(s.a[..., 0:3] == np.array(src, np.uint8), axis=-1)
        s.a[m, 0:3] = dst


# --------------------------------------------------------------------------
# SEA STACK
# --------------------------------------------------------------------------
def spire_mesh(rng, rings, nlon=9, noise=0.2, zj=1.5, apex=None):
    """Stacked irregular rings (z, rx, ry, cx, cy) closed by an apex."""
    verts, R = [], []
    for i, (z, rx, ry, cx, cy) in enumerate(rings):
        ring = []
        for j in range(nlon):
            b = (j + (i % 2) * 0.5 + rng.uniform(-0.18, 0.18)) / nlon * math.tau
            k = 1 + rng.uniform(-noise, noise)
            zz = z + (rng.uniform(-zj, zj) if i > 0 else 0.0)
            verts.append(np.array([cx + math.cos(b) * rx * k, cy + math.sin(b) * ry * k, zz]))
            ring.append(len(verts) - 1)
        R.append(ring)
    if apex is not None:
        verts.append(np.array(apex, float))
        R.append([len(verts) - 1] * nlon)
    tris = []
    for i in range(len(R) - 1):
        r0, r1 = R[i], R[i + 1]
        for j in range(nlon):
            a, b = r0[j], r0[(j + 1) % nlon]
            c, d = r1[j], r1[(j + 1) % nlon]
            if c == d:
                tris.append((a, b, c))
            else:
                tris.append((a, b, d)); tris.append((a, d, c))
    return verts, tris


def foam_band(s, cx, cy, rx, ry, seed=0, front=True):
    """Foam ring around a rock base: a flattened ellipse with a lumpy outer
    edge.  front=True draws the half nearer the camera (solid, covers the
    rock's waterline); front=False the far half (drawn behind the rock)."""
    rng = random.Random(seed)
    ph = [rng.uniform(0, math.tau) for _ in range(3)]
    for y in range(s.h):
        for x in range(s.w):
            nx = (x - cx) / rx; ny = (y - cy) / ry
            th = math.atan2(ny, nx)
            r = math.hypot(nx, ny)
            lump = 1 + 0.09 * math.sin(th * 7 + ph[0]) + 0.06 * math.sin(th * 13 + ph[1])
            if r > lump:
                continue
            if front != (ny >= -0.15):
                continue
            q = r / lump
            streak = math.sin(x * 0.31 + y * 2.1 + ph[2]) > 0.35
            if ny > 0.45 and q > 0.84:
                c = FOAM[0]
            elif ny > 0.1 and q > 0.6 and streak:
                c = FOAM[1]
            elif q > 0.9 and ny > -0.2:
                c = FOAM[1]
            else:
                c = FOAM[2]
            s.puti(x, y, c)


def sea_stack():
    w, h = 96, 84
    s = Spr(w, h)
    # small companion stack behind and to the right
    rng = random.Random(71)
    rings2 = [(0, 15, 8, 0, 0), (5, 12, 7, 0, 0), (12, 11, 6, 2, 0), (20, 8, 5, 0, 0),
              (27, 5, 3.5, -1, 0)]
    v2, t2 = spire_mesh(rng, rings2, nlon=9, noise=0.25, zj=1.5, apex=(-2, 0, 34))
    back = Spr(w, h)
    render_mesh(back, v2, t2, 75, 79, STACK, pitch=0.30, seed=4, face_jitter=0.1, bias=-0.04)
    # main spire: leans slightly left, craggy shoulder on the right
    rng = random.Random(29)
    rings = [(0, 31, 15, 0, 0), (4, 26, 13, 0, 0), (11, 24, 12, 1, 0), (18, 22, 11, 3, 0),
             (25, 18, 10, 0, 0), (32, 16, 9, -2, 0), (39, 14, 8, -1, 0), (46, 12, 7, -3, 0),
             (53, 9, 6, -2, 0), (60, 7, 5, -1, 0), (66, 5, 3.5, -2, 0), (71, 3, 2.5, -1, 0)]
    verts, tris = spire_mesh(rng, rings, nlon=11, noise=0.24, zj=2.2, apex=(0, 0, 79))

    def strata(x, y):
        v = (y * 1.0 - x * 0.25) % 7
        return -1 if v < 1.0 else 0
    main = Spr(w, h)
    render_mesh(main, verts, tris, 45, 81, STACK, pitch=0.30, strata=strata, seed=11,
                face_jitter=0.1, bias=-0.04)
    rock = Spr(w, h)
    add_layer(rock, back)
    add_layer(rock, main, [STACK])
    fill_holes(rock)
    rock.a[80:] = 0                       # below the waterline: under the sea
    rmask = rock.opaque()
    foam_back = Spr(w, h)
    foam_band(foam_back, 48, 79, 41, 4.5, seed=3, front=False)
    foam_front = Spr(w, h)
    foam_band(foam_front, 48, 79, 41, 4.5, seed=3, front=True)
    add_layer(s, foam_back)
    add_layer(s, rock)
    # surge: continuous foam hugging the rock base, lumpy crest, lit tops
    rng = random.Random(5)
    ph1, ph2 = rng.uniform(0, 6), rng.uniform(0, 6)
    for xx in range(w):
        if not rmask[78, xx]:
            continue
        v = 1.6 + 1.3 * math.sin(xx * 0.42 + ph1) + 0.9 * math.sin(xx * 1.07 + ph2)
        top = 78 - clampi(int(round(v)), 0, 4)
        v2 = 1.6 + 1.3 * math.sin((xx + 1) * 0.42 + ph1) + 0.9 * math.sin((xx + 1) * 1.07 + ph2)
        rising = v2 > v + 0.15          # left flank of a lump -> in shade
        for yy in range(top, 80):
            c = FOAM[2]
            if yy == top and rising and yy < 78:
                c = FOAM[1]
            s.puti(xx, yy, c)
        if top <= 76 and not rising:
            s.puti(xx, top + 2, FOAM[1])    # shade line under the crest
    add_layer(s, foam_front)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# MONTEREY CYPRESS
# --------------------------------------------------------------------------
def cypress():
    w, h = 112, 96
    s = Spr(w, h)
    # gnarled, twisting trunk splitting into two leaders + wind-swept limbs
    fib = [(-0.45, 7, 4, 0), (0.05, 9, 5, 3), (0.5, 6, 3, 1)]
    stroke(s, [(56, 96), (55.5, 88), (54, 80), (52, 72), (50, 66)],
           lambda u: 12 - 4 * u + (6 * (0.16 - u) / 0.16 if u < 0.16 else 0), BARK,
           streaks=fib, lo=1)
    limbs = [
        ([(51, 68), (45, 60), (40, 50), (36, 40), (36, 30)], 7.0, 3.5),   # left leader
        ([(53, 69), (59, 62), (64, 52), (67, 40), (70, 30)], 6.0, 3.0),   # right leader
        ([(42, 52), (32, 47), (20, 45), (10, 46)], 4.0, 2.0),
        ([(37, 40), (26, 34), (14, 31)], 3.5, 2.0),
        ([(64, 52), (74, 47), (84, 44)], 3.5, 2.0),
        ([(56, 64), (58, 55), (55, 47), (56, 40)], 3.0, 2.0),
    ]
    for pts, w0, w1 in limbs:
        stroke(s, pts, lambda u, a=w0, b=w1: a + (b - a) * u, BARK,
               streaks=[(-0.3, 6, 3, 0), (0.35, 7, 3, 2)], lo=1)
    selout(s, [BARK], dirs=((0, 1), (-1, 0)))
    # flat, wind-swept foliage tiers (cx, top_y, half_width, thickness),
    # drawn lowest first so every upper tier's dark flat underside overlaps
    # the lit top of the tier below.
    pads = [
        (20, 40, 15, 8), (86, 36, 10, 8), (52, 35, 15, 10),
        (29, 23, 23, 11), (73, 20, 18, 12),
        (45, 5, 36, 15),
    ]
    for k, (cx, ty, hw, th) in enumerate(pads):
        lay = Spr(w, h)
        prng = random.Random(100 + k)
        nb = max(3, int(hw / 5))
        base = ty + th
        blobs = []
        for i in range(nb):
            u = (i + 0.5) / nb * 2 - 1
            bx = cx + u * hw * 0.8 + prng.uniform(-1.5, 1.5)
            top_h = th * (0.7 + 0.35 * (u + 1) / 2) * (1 - 0.3 * max(0.0, -u) ** 2) \
                * prng.uniform(0.85, 1.05)
            rx = hw / nb * 1.5 + prng.uniform(0, 1.5)
            blobs.append((bx, base - top_h * 0.5, rx, top_h * 0.62))
        blobs.append((cx - hw * 0.98, base - th * 0.3, hw * 0.2, th * 0.3))   # downwind wisp
        for i, (bx, by, rx, ry) in enumerate(blobs):
            lobed_ball(lay, bx, by, rx, ry, CYP, seed=k * 17 + i, lobes=9, lobe_amp=0.17,
                       bias=-0.06, gamma=1.2, flat_base=base + prng.choice((0, 0, -1, 1)), lo=1,
                       ao=(ty, base, 0.22))
        leaf_dabs(lay, CYP, seed=k + 50, step=4, hi_min=2, prob=0.9)
        # flat dark underside
        op = lay.opaque()
        for x in range(w):
            col = np.nonzero(op[:, x])[0]
            if len(col):
                yb = col[-1]
                lay.puti(x, yb, CYP[1])
                if yb - 1 > col[0]:
                    lay.puti(x, yb - 1, CYP[2])
        add_layer(s, lay, [CYP, BARK], sh=1)
    selout(s, [CYP, BARK], dirs=((0, 1), (-1, 0)))
    lit_outline(s, [CYP], idx=3)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# BEACH UMBRELLAS
# --------------------------------------------------------------------------
def umbrella(cols, towel_cols, seed=0):
    """Striped beach umbrella planted behind a striped towel.  The canopy is
    a shallow 8-panel cone seen from above: each panel flat-shaded from its
    own normal, with a scalloped valance along the near rim."""
    w, h = 40, 52
    s = Spr(w, h)
    # --- towel lying flat on the sand: a slanted quad, wide stripes that
    #     follow the towel's perspective, darker near edge ---
    tw = Spr(w, h)
    TL, TR, BR, BL = (10, 46), (31, 45), (34, 51), (6, 51)
    m = tw.mask_poly([TL, TR, BR, BL])
    for y, x in zip(*np.nonzero(m)):
        f = (y - 45.5) / 5.5                       # 0 far edge .. 1 near edge
        xl = TL[0] + (BL[0] - TL[0]) * f; xr = TR[0] + (BR[0] - TR[0]) * f
        u = (x - xl) / max(1.0, xr - xl)            # 0..1 across the towel
        rmp = towel_cols[int(u * 5) % len(towel_cols)]
        b = 4 if f < 0.3 else 3
        if y == 51:
            b = 2
        tw.puti(x, y, rmp[b])
    selout(tw, towel_cols, dirs=((-1, 0),), step=1)
    add_layer(s, tw)
    # --- pole: vertical (the tilt joint is hidden under the canopy) ---
    G = (19.5, 48.0); A = (21.0, 3.0)
    for y in range(12, int(G[1]) + 1):
        s.puti(19, y, WHITE[2])
        s.puti(20, y, WHITE[4])
    s.puti(18, int(G[1]), SANDP[1]); s.puti(21, int(G[1]), SANDP[2])
    # --- canopy ---
    p = 0.36                       # view elevation used for the rim ellipse
    R = 18.0; hc = 12.0            # rim radius, apex height above rim
    ax, ay = (G[0] - A[0]), (G[1] - A[1])
    al = math.hypot(ax, ay); ax /= al; ay /= al
    C = (A[0] + ax * hc, A[1] + ay * hc)
    phi = math.atan2(ax, ay)        # rim tilt (follows the pole)
    rx, ry = R, R * math.sin(p) + 1.0
    beta = math.atan2(hc, R)        # canopy slope
    N = 8
    cosf, sinf = math.cos(phi), math.sin(phi)

    def to_local(x, y):            # rotate about C so the rim is axis-aligned
        dx, dy = x - C[0], y - C[1]
        return dx * cosf - dy * sinf, dx * sinf + dy * cosf

    Al = to_local(*A)
    canopy = Spr(w, h)
    rimy = {}
    for y in range(h):
        for x in range(w):
            px, py = to_local(x, y)
            dx, dy = px - Al[0], py - Al[1]
            a_ = (dx / rx) ** 2 + (dy / ry) ** 2
            b_ = 2 * (Al[0] * dx / rx ** 2 + Al[1] * dy / ry ** 2)
            c_ = (Al[0] / rx) ** 2 + (Al[1] / ry) ** 2 - 1
            disc = b_ * b_ - 4 * a_ * c_
            if a_ < 1e-9 or disc < 0:
                continue
            lam = (-b_ + math.sqrt(disc)) / (2 * a_)
            if lam < 1.0:
                continue
            ex, ey = Al[0] + dx * lam, Al[1] + dy * lam
            th = math.atan2(ey / ry, ex / rx)
            k = int(math.floor((th + math.pi / N) / (math.tau / N))) % N
            thc = k * math.tau / N          # panel centre angle
            # world normal of this flat panel
            nx_ = math.cos(thc) * math.sin(beta); ny_ = -math.sin(thc) * math.sin(beta)
            nz_ = math.cos(beta)
            it = nx_ * L3[0] + ny_ * L3[1] + nz_ * L3[2]
            rmp = cols[k % 2]
            b = clampi(int(math.floor(((it + 1) * 0.5) * 6.2)) - 1, 1, len(rmp) - 1)
            canopy.puti(x, y, rmp[b])
    # valance: short scalloped flap hanging under the near rim
    for x in range(w):
        col = np.nonzero(canopy.opaque()[:, x])[0]
        if not len(col):
            continue
        yb = col[-1]
        px, py = to_local(x, yb)
        if py < -1:
            continue
        th = math.atan2(py / ry, px / rx)
        k = int(math.floor((th + math.pi / N) / (math.tau / N))) % N
        frac = ((th + math.pi / N) / (math.tau / N)) % 1.0
        d = 1 + (1 if 0.2 < frac < 0.8 else 0)
        rmp = cols[k % 2]
        c0 = canopy.get(x, yb)
        bi = rmp.index(c0) if c0 in rmp else 2
        for j in range(1, d + 1):
            canopy.puti(x, yb + j, rmp[clampi(bi - 1, 1, len(rmp) - 1)])
    selout(canopy, cols, dirs=((0, 1), (-1, 0)))
    lit_outline(canopy, cols, idx=2)
    add_layer(s, canopy)
    # finial
    s.puti(int(A[0]), int(A[1]) - 1, WHITE[3]); s.puti(int(A[0]) + 1, int(A[1]) - 1, WHITE[4])
    s.puti(int(A[0]), int(A[1]) - 2, GREY[3])
    remove_orphans(s)
    bottom_fix(s)
    return s


def umbrella_a():
    return umbrella([RED, WHITE], [TEAL, WHITE], seed=1)


def umbrella_b():
    return umbrella([BLUE, YEL], [PINK, WHITE], seed=2)


# --------------------------------------------------------------------------
# SURFBOARD RACK
# --------------------------------------------------------------------------
def board(s, bx, by, length, wd, ang, rmp, deco=None, deco_rmp=None, nose_k=0.8, tail=0.6):
    """Surfboard standing on its tail at (bx, by), tilted `ang` degrees from
    vertical (positive = top leans right).  Lens-shaped outline: pointed or
    round nose, widest a little above the middle, tapering to the tail.
    Flat deck, dark left rail, lit right rail."""
    a = math.radians(ang)
    ux, uy = math.sin(a), -math.cos(a)          # axis direction (up)
    nx_, ny_ = -uy, ux                          # across (to the right)
    for y in range(s.h):
        for x in range(s.w):
            dx, dy = x - bx, y - by
            u = dx * ux + dy * uy                   # along the axis from the tail
            q = dx * nx_ + dy * ny_                 # across
            if u < -0.5 or u > length:
                continue
            v = 1 - u / length                      # 0 nose .. 1 tail
            if v < 0.42:
                f = math.sin(math.pi / 2 * (v / 0.42)) ** nose_k
            else:
                k = (v - 0.42) / 0.58
                f = 1 - (1 - tail) * k ** 1.6
            hw = wd / 2.0 * f
            if abs(q) > hw or hw < 0.45:
                continue
            tt = q / max(hw, 0.5)
            b = 3
            if tt < -0.55: b = 2
            if tt > 0.25: b = 4
            if tt > 0.65 and hw > 2.5: b = 5
            col = rmp
            if deco == "stringer" and abs(q) < 0.5 and v > 0.04:
                b = max(1, b - 1)
            elif deco == "band" and deco_rmp is not None and (0.24 < v < 0.31 or 0.35 < v < 0.39):
                col = deco_rmp
            elif deco == "nose" and v < 0.16 and deco_rmp is not None:
                col = deco_rmp
            elif deco == "stripes" and deco_rmp is not None and abs(tt) < 0.3 and v > 0.07:
                col = deco_rmp
            s.puti(x, y, col[clampi(b, 1, len(col) - 1)])


def surfboards():
    w, h = 40, 48
    s = Spr(w, h)
    # fanned out, tails in the sand: (base x, length, width, tilt, ramp, deco, deco ramp, nose)
    boards = [
        (10.5, 42, 10, -7, TEAL, "band", WHITE, 0.9),
        (29.5, 40, 10, 7, CORAL, "stringer", None, 0.9),
        (16.5, 46, 11, -3, YEL, "nose", RED, 0.45),        # longboard, rounder nose
        (23.5, 45, 10, 4, WHITE, "stripes", BLUE, 1.0),
    ]
    rmps = [TEAL, CORAL, YEL, WHITE, RED, BLUE, WOOD]
    for (bx, ln, wd, ang, rmp, deco, drmp, nk) in boards:
        lay = Spr(w, h)
        board(lay, bx, 47.0, ln, wd, ang, rmp, deco=deco, deco_rmp=drmp, nose_k=nk)
        selout(lay, rmps, dirs=((0, 1), (-1, 0)))
        add_layer(s, lay, rmps)
    # low wooden rack in front: two posts and a cross rail
    rack = Spr(w, h)
    for (x0, x1) in ((4, 6), (33, 35)):
        rack.rect(x0, 31, x1, 47, WOOD[2])
        rack.vline(x1, 31, 47, WOOD[4])
        rack.hline(x0, x1, 31, WOOD[5])
    rack.rect(2, 33, 37, 35, WOOD[3])
    rack.hline(2, 37, 33, WOOD[5])
    rack.hline(2, 37, 35, WOOD[1])
    selout(rack, [WOOD], dirs=((0, 1), (-1, 0)))
    add_layer(s, rack, rmps)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# small 2D construction helpers for buildings / props
# --------------------------------------------------------------------------
def side_face(s, x0, x1, ytop, ybot, slope, col_fn):
    """Receding right-hand side face: column x spans ytop..ybot shifted up by
    slope*(x-x0).  col_fn(x, y, u, v) -> colour or None (u,v in 0..1)."""
    for x in range(x0, x1 + 1):
        dy = (x - x0) * slope
        ya = int(math.floor(ytop - dy + 0.5)); yb = int(math.floor(ybot - dy + 0.5))
        for y in range(ya, yb + 1):
            u = (x - x0) / max(1, x1 - x0); v = (y - ya) / max(1, yb - ya)
            c = col_fn(x, y, u, v)
            if c is not None:
                s.puti(x, y, c)


def thick_line(s, x0, y0, x1, y1, cols):
    """Line drawn len(cols) px thick downward (cols[0] on top)."""
    for k, c in enumerate(cols):
        s.line(x0, y0 + k, x1, y1 + k, c)


def glass_window(s, x0, y0, x1, y1, frame, lit=False, mullion=None, arch=False, sill=None,
                 transom=None):
    """Window with frame; glass dark (GLASS) or warm-lit (#ffd870/#fff2b0).
    Dark glass: a lit diagonal reflection near the top-right.  Lit glass:
    #fff2b0 core with #ffd870 toward the edges/bottom."""
    glow_hi, glow_lo = hx("#fff2b0"), hx("#ffd870")
    w = x1 - x0 + 1; h = y1 - y0 + 1
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if arch:
                r = w / 2.0
                cy = y0 + r - 0.5
                if y < cy and ((x + 0.5 - (x0 + r)) ** 2 + (y + 0.5 - cy) ** 2) > (r + 0.1) ** 2:
                    continue
            s.puti(x, y, frame[3])
    gx0, gy0, gx1, gy1 = x0 + 1, y0 + 1, x1 - 1, y1 - 1
    gw = gx1 - gx0 + 1
    for y in range(gy0, gy1 + 1):
        for x in range(gx0, gx1 + 1):
            if arch:
                r = gw / 2.0
                cy = gy0 + r - 0.5
                if y < cy and ((x + 0.5 - (gx0 + r)) ** 2 + (y + 0.5 - cy) ** 2) > (r - 0.15) ** 2:
                    continue
            u = (x - gx0) / max(1, gx1 - gx0); v = (y - gy0) / max(1, gy1 - gy0)
            if lit:
                c = glow_hi if (0.15 < u < 0.85 and v < 0.75) else glow_lo
                if v > 0.88:
                    c = glow_lo
            else:
                c = GLASS[1]
                if y == gy0:
                    c = GLASS[0]
                d = (u - 0.6) - (1 - v) * 0.8
                if -0.15 < d < 0.12 and v < 0.7:
                    c = GLASS[3]
                elif v > 0.82:
                    c = GLASS[2]
            s.puti(x, y, c)
    if mullion is not None:
        for mx in mullion:
            s.vline(mx, gy0, gy1, frame[2])
    if transom is not None:
        for ty in transom:
            s.hline(gx0, gx1, ty, frame[2])
    # inner frame shading: left/top jamb in shade
    for y in range(y0, y1 + 1):
        if s.get(x0, y) == frame[3]:
            s.puti(x0, y, frame[2])
    if sill is not None:
        s.hline(x0 - 1, x1 + 1, y1 + 1, sill[4])
        s.hline(x0 - 1, x1 + 1, y1 + 2, sill[2])


# --------------------------------------------------------------------------
# LIFEGUARD TOWER
# --------------------------------------------------------------------------
def lifeguard():
    w, h = 64, 76
    s = Spr(w, h)
    # back stilts (further away: a little up-right, darker)
    for x in (9, 36):
        s.rect(x, 53, x + 1, 73, WOOD[1]); s.vline(x + 1, 53, 73, WOOD[2])
    # cross bracing between the front stilts
    thick_line(s, 7, 57, 32, 71, [WOOD[3], WOOD[2]])
    thick_line(s, 32, 57, 7, 71, [WOOD[2], WOOD[1]])
    # front stilts
    for x in (4, 32):
        s.rect(x, 54, x + 2, 75, WOOD[3]); s.vline(x, 54, 75, WOOD[1]); s.vline(x + 2, 54, 75, WOOD[4])
        s.hline(x - 1, x + 3, 75, WOOD[1])
    # hut walls: pastel mint, horizontal lap siding
    for y in range(30, 50):
        for x in range(7, 32):
            c = MINT[4] if (y - 30) % 3 else MINT[3]
            s.puti(x, y, c)
    side_face(s, 32, 37, 30, 49, 0.55,
              lambda x, y, u, v: MINT[5] if (int(y + (x - 32) * 0.55) - 30) % 3 else MINT[4])
    s.vline(7, 30, 49, MINT[2])
    s.vline(31, 30, 49, WHITE[4]); s.vline(32, 30, 49, WHITE[5])   # corner trim
    s.hline(7, 31, 30, MINT[2]); s.hline(7, 31, 31, MINT[3])        # shade under eave
    # window + door on the land side
    glass_window(s, 10, 34, 19, 41, WHITE, mullion=[14])
    for y in range(34, 50):
        for x in range(22, 29):
            s.puti(x, y, PINK[3] if x < 27 else PINK[4])
    s.vline(22, 34, 49, PINK[2]); s.hline(22, 28, 34, WHITE[3])
    s.rect(23, 36, 26, 39, GLASS[1]); s.puti(26, 36, GLASS[3])
    s.puti(27, 42, YEL[4])                                          # door knob
    # rescue can hanging on the lit side wall
    s.rect(34, 35, 35, 41, ORANGE[3]); s.vline(35, 35, 41, ORANGE[4]); s.vline(34, 36, 40, ORANGE[2])
    s.puti(34, 34, WHITE[3]); s.puti(35, 42, ORANGE[1])
    # hip roof: front slope (coral), lit right hip, white fascia
    roof = Spr(w, h)
    front = roof.mask_poly([(4, 29), (35, 29), (27, 19), (12, 19)])
    for y, x in zip(*np.nonzero(front)):
        c = CORAL[3] if (29 - y) % 3 else CORAL[2]
        if x > 22 and (29 - y) % 3:
            c = CORAL[4] if x > 30 else CORAL[3]
        roof.puti(x, y, c)
    hip = roof.mask_poly([(35, 29), (41, 26), (31, 17), (27, 19)])
    for y, x in zip(*np.nonzero(hip)):
        if front[y, x] and not (x - 27 > (29 - y) * 0.8):
            continue
        roof.puti(x, y, CORAL[4] if (int(y + (x - 30) * 0.6) % 3) else CORAL[5])
    roof.hline(12, 27, 18, CORAL[4]); roof.hline(13, 30, 17, CORAL[5])
    roof.hline(3, 35, 29, WHITE[4]); roof.hline(3, 35, 30, WHITE[2])
    roof.line(36, 29, 41, 26, WHITE[5]); roof.line(36, 30, 41, 27, WHITE[3])
    selout(roof, [CORAL, WHITE], dirs=((-1, 0),))
    add_layer(s, roof)
    # deck: lit top surface sliver + white fascia
    s.rect(1, 50, 41, 51, WOOD[4]); s.hline(1, 41, 50, WOOD[5])
    for x in range(3, 41, 5):
        s.puti(x, 51, WOOD[3])
    s.rect(1, 52, 41, 54, WHITE[3]); s.hline(1, 41, 54, WHITE[1]); s.hline(1, 41, 52, WHITE[4])
    side_face(s, 42, 44, 50, 53, 0.55, lambda x, y, u, v: WHITE[5] if v < 0.7 else WHITE[3])
    # railing in front of the hut
    s.hline(1, 42, 43, WHITE[5]); s.hline(1, 42, 44, WHITE[3])
    s.hline(1, 42, 47, WHITE[3])
    for x in (1, 11, 21, 31, 41):
        s.vline(x, 43, 49, WHITE[3]); s.vline(x + 1, 43, 49, WHITE[4])
    # ramp down to the sand on the right: plank surface + side beam + handrail
    for x in range(42, 64):
        yt = 51 + (x - 42) * 24.0 / 21.0
        yi = int(round(yt))
        s.puti(x, yi, WOOD[5] if (x - 42) % 4 else WOOD[3])
        s.puti(x, yi + 1, WOOD[4])
        s.puti(x, yi + 2, WOOD[2]); s.puti(x, yi + 3, WOOD[1])
        s.puti(x, yi + 4, WOOD[1])
    for x in range(42, 61):
        yt = 44 + (x - 42) * 24.0 / 21.0
        s.puti(x, int(round(yt)), WHITE[5]); s.puti(x, int(round(yt)) + 1, WHITE[3])
    for x in (48, 55):
        yt = 44 + (x - 42) * 24.0 / 21.0
        s.vline(x, int(round(yt)) + 1, int(round(yt)) + 6, WHITE[3])
    s.rect(60, 70, 61, 75, WOOD[2]); s.vline(61, 70, 75, WOOD[3])        # ramp foot post
    # flag on the roof
    s.vline(20, 3, 16, GREY[4]); s.vline(21, 4, 16, GREY[2])
    s.puti(20, 2, YEL[4])
    flag = [(22, 3, 29, 4, RED[3]), (22, 5, 28, 5, RED[2]), (22, 6, 26, 7, YEL[3])]
    for (a0, b0, a1, b1, c) in flag:
        s.rect(a0, b0, a1, b1, c)
    s.hline(22, 29, 3, RED[4])
    selout(s, [WOOD, WHITE, MINT, PINK, CORAL, GREY, RED, YEL, ORANGE], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# BEACH SHACK / SNACK STAND
# --------------------------------------------------------------------------
def shack():
    w, h = 104, 64
    s = Spr(w, h)
    FX0, FX1, FY0, FY1 = 6, 78, 21, 63
    # walls: pastel yellow vertical boards (front), lit side face
    for y in range(FY0, FY1 + 1):
        for x in range(FX0, FX1 + 1):
            c = PINK[3]
            if (x - FX0) % 6 == 0:
                c = PINK[2]
            elif (x - FX0) % 6 == 5:
                c = PINK[4]
            s.puti(x, y, c)
    side_face(s, FX1 + 1, FX1 + 14, FY0, FY1, 0.5,
              lambda x, y, u, v: PINK[4] if (x - FX1) % 6 else PINK[3])
    s.vline(FX0, FY0, FY1, PINK[1])
    s.vline(FX1, FY0, FY1, WHITE[4]); s.vline(FX1 + 1, FY0, FY1, WHITE[5])
    s.rect(FX0, FY1 - 2, FX1, FY1, PINK[1]); s.hline(FX0, FX1, FY1 - 2, PINK[2])
    side_face(s, FX1 + 1, FX1 + 14, FY1 - 2, FY1, 0.5, lambda x, y, u, v: PINK[2])
    # side door (coral) with a porthole window
    side_face(s, 83, 89, 34, 62, 0.5,
              lambda x, y, u, v: TEAL[4] if u > 0.3 else TEAL[3])
    side_face(s, 82, 82, 34, 62, 0.5, lambda x, y, u, v: WHITE[3])
    side_face(s, 85, 87, 38, 41, 0.5, lambda x, y, u, v: GLASS[1] if u < 0.7 else GLASS[3])
    # serving window: dark interior with a shelf of colourful bottles and cups
    WX0, WX1, WY0, WY1 = 14, 60, 31, 45
    s.rect(WX0 - 1, WY0 - 1, WX1 + 1, WY1, WHITE[4])
    s.rect(WX0, WY0, WX1, WY1, hx("#2a2030"))
    s.rect(WX0, WY0, WX1, WY0 + 1, hx("#1c1622"))
    s.hline(WX0, WX1, 39, WOOD[2]); s.hline(WX0, WX1, 40, WOOD[1])
    rng = random.Random(4)
    x = WX0 + 2
    bott = [RED, TEAL, YEL, ORANGE, PINK, BLUE, MINT]
    while x < WX1 - 2:
        r = rng.choice(bott)
        hb = rng.choice((3, 4, 4, 5))
        s.rect(x, 39 - hb, x + 1, 38, r[3]); s.vline(x + 1, 39 - hb, 38, r[4])
        s.puti(x, 39 - hb - 1, r[2])
        x += rng.choice((3, 4, 5))
    for cx in (20, 33, 46):                      # stacked cups on the counter
        s.rect(cx, 42, cx + 2, 45, WHITE[4]); s.vline(cx + 2, 42, 45, WHITE[5])
        s.hline(cx, cx + 2, 42, RED[3])
    s.vline(WX0 - 1, WY0 - 1, WY1, WHITE[2])
    # counter ledge
    s.rect(WX0 - 3, 46, WX1 + 3, 46, WOOD[5]); s.rect(WX0 - 3, 47, WX1 + 3, 48, WOOD[3])
    s.hline(WX0 - 3, WX1 + 3, 49, WOOD[1])
    # striped awning over the window: top surface seen from above + valance
    aw = Spr(w, h)
    m = aw.mask_poly([(WX0 - 2, 26), (WX1 + 2, 26), (WX1 + 4, 31), (WX0 - 4, 31)])
    for y, x in zip(*np.nonzero(m)):
        f = (y - 26) / 5.0
        xl = (WX0 - 2) - 2 * f; xr = (WX1 + 2) + 2 * f
        k = int((x - xl) / (xr - xl) * 10)
        rmp = TEAL if k % 2 == 0 else WHITE
        b = 4 if y < 28 else 3
        if x > (xr - 6):
            b += 1
        aw.puti(x, y, rmp[clampi(b, 1, len(rmp) - 1)])
    for x in range(WX0 - 4, WX1 + 5):                # scalloped valance
        xl, xr = WX0 - 4, WX1 + 4
        k = int((x - xl) / (xr - xl + 1) * 10)
        rmp = TEAL if k % 2 == 0 else WHITE
        fr = ((x - xl) / (xr - xl + 1) * 10) % 1.0
        d = 2 + (1 if 0.25 < fr < 0.75 else 0)
        for j in range(d):
            aw.puti(x, 32 + j, rmp[2 if j else 3])
    selout(aw, [TEAL, WHITE], dirs=((0, 1), (-1, 0)))
    add_layer(s, aw)
    # palm-thatch roof: front slope seen from above, ragged fringe
    th = Spr(w, h)
    m = th.mask_poly([(1, 21), (84, 21), (97, 13), (95, 8), (14, 8)])
    for y, x in zip(*np.nonzero(m)):
        c = STRAW[3]
        if (x + (y // 3) * 2) % 4 == 0:
            c = STRAW[2]
        elif (x + (y // 3) * 2) % 4 == 2:
            c = STRAW[4]
        if y in (12, 17):
            c = STRAW[1] if x < 84 else STRAW[2]
        if x > 82:
            c = STRAW[4] if c != STRAW[1] else STRAW[2]
        th.puti(x, y, c)
    rng = random.Random(8)
    for x in range(1, 98):
        ye = 21 if x <= 84 else int(round(21 - (x - 84) * 8 / 13.0))
        d = rng.choice((1, 2, 2, 3))
        for j in range(1, d + 1):
            th.puti(x, ye + j, STRAW[2] if j < d else STRAW[1])
    th.hline(14, 95, 8, STRAW[4]); th.hline(16, 93, 7, STRAW[3])
    selout(th, [STRAW], dirs=((0, 1), (-1, 0)))
    add_layer(s, th)
    # surfboard leaning on the front wall, right of the window
    sb = Spr(w, h)
    board(sb, 71.5, 63.0, 41, 10, -3, WHITE, deco="stripes", deco_rmp=TEAL, nose_k=0.55)
    selout(sb, [WHITE, TEAL], dirs=((0, 1), (-1, 0)))
    add_layer(s, sb, [PINK, WHITE, WOOD])
    # three stools in front of the counter
    for cx, rmp in ((19, RED), (33, TEAL), (47, RED)):
        s.rect(cx - 2, 53, cx + 2, 54, rmp[3]); s.hline(cx - 2, cx + 2, 53, rmp[4])
        s.hline(cx - 2, cx + 2, 55, rmp[1])
        s.vline(cx, 56, 62, GREY[4]); s.vline(cx - 1, 56, 62, GREY[2])
        s.hline(cx - 2, cx + 1, 63, GREY[1]); s.hline(cx - 1, cx + 1, 59, GREY[3])
    selout(s, [PINK, WHITE, WOOD, STRAW, GREY, RED, TEAL], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    shift_x(s, 4)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# CALIFORNIAN HILLSIDE HOUSE (white stucco, terracotta tiles)
# --------------------------------------------------------------------------
def tile_roof(s, front_pts, hip_pts, eave_y):
    """Spanish barrel-tile roof: front slope with vertical tile columns and
    course lines, lit hip slope on the right, dark eave lip."""
    fm = s.mask_poly(front_pts)
    for y, x in zip(*np.nonzero(fm)):
        k = x % 3
        c = (TERRA[2], TERRA[3], TERRA[4])[k]
        if (eave_y - y) % 4 == 3:
            c = TERRA[2] if k != 2 else TERRA[3]
        s.puti(x, y, c)
    if hip_pts is not None:
        hm = s.mask_poly(hip_pts) & ~fm
        for y, x in zip(*np.nonzero(hm)):
            k = (x + y) % 3
            c = (TERRA[3], TERRA[4], TERRA[5])[k]
            s.puti(x, y, c)
    xs = [p[0] for p in front_pts if abs(p[1] - eave_y) < 0.6]
    s.hline(int(min(xs)), int(max(xs)), eave_y, TERRA[1])
    return fm


def house_base(lit):
    w, h = 96, 80
    s = Spr(w, h)

    def stucco_front(x0, x1, y0, y1):
        s.rect(x0, y0, x1, y1, STUCCO[4])
        s.vline(x0, y0, y1, STUCCO[3])
        s.hline(x0, x1, y0, STUCCO[2]); s.hline(x0, x1, y0 + 1, STUCCO[3])   # eave shadow

    def stucco_side(x0, x1, y0, y1, sl=0.5):
        side_face(s, x0, x1, y0, y1, sl,
                  lambda x, y, u, v: STUCCO[3] if v < 0.06 else STUCCO[5])

    # --- main two-storey block ---
    stucco_front(8, 50, 30, 72)
    stucco_side(51, 58, 30, 72)
    s.rect(51, 62, 58, 72, STUCCO[5])
    # chimney (behind the roof ridge)
    s.rect(41, 7, 46, 20, STUCCO[4]); s.vline(41, 7, 20, STUCCO[3]); s.vline(46, 7, 20, STUCCO[5])
    s.rect(40, 5, 47, 6, TERRA[3]); s.hline(40, 47, 5, TERRA[4]); s.hline(41, 46, 7, STUCCO[2])
    tile_roof(s, [(3, 29), (56, 29), (42, 15), (17, 15)],
              [(56, 29), (63, 25), (50, 12), (42, 15)], 29)
    s.hline(17, 42, 14, TERRA[4]); s.hline(18, 49, 13, TERRA[5]); s.hline(20, 48, 12, TERRA[4])
    # upper floor: two arched windows with little wrought-iron balconies
    for x0 in (13, 31):
        glass_window(s, x0, 35, x0 + 8, 46, STUCCO, lit=lit, mullion=[x0 + 4], arch=True)
        s.hline(x0 - 2, x0 + 10, 47, GREY[1]); s.hline(x0 - 2, x0 + 10, 50, GREY[1])
        for xx in range(x0 - 2, x0 + 11, 2):
            s.vline(xx, 48, 49, GREY[2])
        s.hline(x0 - 2, x0 + 10, 51, STUCCO[2])
    # ground floor: big arched window + arched wooden door
    glass_window(s, 12, 54, 25, 69, STUCCO, lit=lit, mullion=[16, 21], arch=True, transom=[61],
                 sill=STUCCO)
    for y in range(56, 73):
        for x in range(33, 42):
            r = 4.5; cy = 56 + r
            if y < cy and (x + 0.5 - 37.5) ** 2 + (y + 0.5 - cy) ** 2 > r * r:
                continue
            c = WOOD[2] if (x - 33) % 3 == 0 else WOOD[3]
            if x == 41:
                c = WOOD[4]
            s.puti(x, y, c)
    s.puti(39, 65, YEL[4])
    s.rect(31, 72, 43, 72, STUCCO[2])                                     # step
    # --- one-storey wing in front-right ---
    stucco_front(56, 89, 46, 72)
    stucco_side(90, 93, 46, 72)
    tile_roof(s, [(52, 45), (92, 45), (85, 36), (62, 36)],
              [(92, 45), (95, 43), (88, 34), (85, 36)], 45)
    s.hline(62, 85, 35, TERRA[4]); s.hline(64, 87, 34, TERRA[5])
    glass_window(s, 62, 52, 84, 64, STUCCO, lit=lit, mullion=[69, 77], sill=STUCCO)
    # bougainvillea spilling over the wing corner
    bg = Spr(w, h)
    foliage(bg, [(56, 52, 5, 6), (53, 60, 4, 5), (59, 46, 5, 4)], LEAF, seed=6, bias=-0.05,
            dabs=False, outline=False)
    rng = random.Random(77)
    opb = bg.opaque()
    for k in range(70):
        x = rng.randint(48, 64); y = rng.randint(41, 66)
        if opb[y, x]:
            for dx, dy in ((0, 0), (1, 0), (0, 1)):
                if bg.op(x + dx, y + dy):
                    lv = 4 if (dx == 1 or y < 50) else 3
                    bg.puti(x + dx, y + dy, BOUG[lv if rng.random() < 0.7 else lv - 1])
    selout(bg, [LEAF, BOUG], dirs=((0, 1), (-1, 0)))
    add_layer(s, bg, [STUCCO, TERRA])
    # --- stone retaining wall of the hillside terrace + a couple of shrubs ---
    for y in range(73, 80):
        for x in range(2, 94):
            row = (y - 74) // 3
            off = (row % 2) * 4
            c = GREYROCK[3]
            if y == 73:
                c = GREYROCK[5]
            elif (y - 74) % 3 == 2 or (x + off) % 8 == 0:
                c = GREYROCK[2]
            elif (x + off) % 8 >= 6:
                c = GREYROCK[4]
            s.puti(x, y, c)
    s.hline(2, 93, 74, GREYROCK[4])
    sh = Spr(w, h)
    foliage(sh, [(9, 70, 6, 4.5), (15, 71, 4, 3.5)], LEAF, seed=12, bias=-0.04, dabs=False)
    foliage(sh, [(88, 70, 5, 4)], LEAF, seed=13, bias=-0.04, dabs=False)
    add_layer(s, sh)
    selout(s, [STUCCO, TERRA, GREYROCK, WOOD], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return s


def house():
    s = house_base(False)
    limit_palette(s, 24)
    return s


def house_lit():
    # same palette folding as the unlit house so the two stay identical
    # except for the glowing window pixels
    m = limit_palette(house_base(False), 24)
    s = house_base(True)
    limit_palette(s, mapping=m)
    return s


# --------------------------------------------------------------------------
# STREET LAMP
# --------------------------------------------------------------------------
def lamp_base(lit):
    w, h = 16, 96
    s = Spr(w, h)
    # pole: 3 px lower section, 2 px upper section, collar between
    s.rect(6, 52, 8, 88, GREY[4]); s.vline(6, 52, 88, GREY[2]); s.vline(8, 52, 88, GREY[5])
    s.rect(7, 13, 8, 51, GREY[4]); s.vline(7, 13, 51, GREY[3]); s.vline(8, 13, 51, GREY[5])
    s.hline(6, 9, 50, GREY[5]); s.hline(6, 9, 51, GREY[3])
    # base plinth + foot
    s.rect(5, 87, 10, 92, GREY[4]); s.vline(5, 87, 92, GREY[2]); s.vline(10, 87, 92, GREY[5])
    s.hline(5, 10, 87, GREY[6])
    s.rect(4, 93, 11, 95, GREY[3]); s.hline(4, 11, 93, GREY[5]); s.vline(11, 93, 95, GREY[4])
    # gooseneck arm curving up and over to the LEFT
    for k in range(0, 41):
        th = math.radians(k * 90 / 40.0)
        x = 3.5 + 4.5 * math.cos(th); y = 12.5 - 5.0 * math.sin(th)
        s.put(x, y, GREY[3])
        s.put(x + 0.6 * math.cos(th), y - 0.9 * math.sin(th) - 0.4, GREY[5])
    # cobra-head lamp housing (top seen from above) + lens underneath
    s.hline(1, 4, 5, GREY[4])
    s.rect(0, 6, 5, 6, GREY[5]); s.puti(5, 6, GREY[6])
    s.rect(0, 7, 5, 7, GREY[3])
    if lit:
        core, rim = hx("#fff2b0"), hx("#ffd060")
        s.hline(0, 5, 8, rim); s.hline(1, 4, 8, core)
        s.hline(1, 4, 9, rim)
    else:
        s.hline(0, 5, 8, GREY[2]); s.hline(1, 4, 8, GREY[5])
        s.hline(1, 4, 9, GREY[3])
    selout(s, [GREY], dirs=((-1, 0),), mask=np.r_[np.zeros((12, w), bool), np.ones((h - 12, w), bool)])
    remove_orphans(s)
    bottom_fix(s)
    return s


def lamp():
    return lamp_base(False)


def lamp_lit():
    return lamp_base(True)


# --------------------------------------------------------------------------
# LIGHTHOUSE
# --------------------------------------------------------------------------
def lighthouse():
    w, h = 48, 144
    s = Spr(w, h)
    C = 23.5
    # rocky outcrop the tower stands on (back boulders)
    rk = Spr(w, h)
    rng = random.Random(61)
    v, tr = rock_mesh(rng, 9.5, 8, 16, nlat=3, nlon=7, noise=0.2)
    render_mesh(rk, v, tr, 35, 143, GREYROCK, pitch=0.35, seed=2, face_jitter=0.06)
    v, tr = rock_mesh(rng, 10, 8, 15, nlat=3, nlon=7, noise=0.2)
    render_mesh(rk, v, tr, 12, 143, GREYROCK, pitch=0.35, seed=3, face_jitter=0.06)
    v, tr = rock_mesh(rng, 20, 11, 20, nlat=3, nlon=8, noise=0.2)
    render_mesh(rk, v, tr, 24, 140, GREYROCK, pitch=0.35, seed=4, face_jitter=0.06)
    add_layer(s, rk)

    def cyl_row(y, hw, rmp, lo=1):
        xl = int(math.floor(C - hw + 0.5)); xr = int(math.floor(C + hw - 0.5))
        for x in range(xl, xr + 1):
            u = (x + 0.5 - C) / hw
            nz = math.sqrt(max(0.0, 1 - u * u))
            lum = 0.5 + 0.5 * (u * 0.78 + nz * 0.5) - 0.06
            b = clampi(int(lum * (len(rmp) - lo)) + lo, lo, len(rmp) - 1)
            if x == xl:
                b = 0
            s.puti(x, y, rmp[b])

    # stone plinth
    for y in range(117, 128):
        cyl_row(y, 12.5, GREY, lo=2)
    s.hline(11, 35, 117, GREY[6]); s.hline(12, 35, 118, GREY[5])
    for y in (121, 124):
        for x in range(12, 36):
            if s.get(x, y) is not None and (x + y) % 6 < 5:
                s.puti(x, y, GREY[2] if x < 30 else GREY[3])
    # tapered tower with red bands (band edges dip in the middle: seen from above)
    TOP, BOT = 36, 116
    for y in range(TOP, BOT + 1):
        hw = 7.5 + 3.5 * (y - TOP) / (BOT - TOP)
        xl = int(math.floor(C - hw + 0.5)); xr = int(math.floor(C + hw - 0.5))
        for x in range(xl, xr + 1):
            u = (x + 0.5 - C) / hw
            dip = 1.3 * (1 - u * u)
            yy = y - dip
            red = any(a <= yy < b for a, b in ((44, 56), (68, 80), (92, 104)))
            rmp = RED if red else WHITE
            nz = math.sqrt(max(0.0, 1 - u * u))
            lum = 0.5 + 0.5 * (u * 0.78 + nz * 0.5) - 0.06
            lo = 1
            b = clampi(int(lum * (len(rmp) - lo)) + lo, lo, len(rmp) - 1)
            if x == xl:
                b = 0
            s.puti(x, y, rmp[b])
    # small windows and the door
    for (wy, x0) in ((60, 22), (85, 23), (108, 22)):
        s.rect(x0, wy, x0 + 2, wy + 4, GLASS[1]); s.puti(x0 + 2, wy, GLASS[3])
        s.hline(x0, x0 + 2, wy + 5, WHITE[5])
    for y in range(108, 117):
        for x in range(28, 32):
            if y == 108 and x in (28, 31):
                continue
            s.puti(x, y, RED[2] if x < 31 else RED[3])
    # gallery deck (top surface visible) + railing
    for y in (33, 34):
        cyl_row(y, 11.0, GREY, lo=2)
    s.hline(13, 34, 32, GREY[6]); s.hline(12, 35, 33, GREY[5])
    s.hline(12, 35, 35, GREY[1])
    s.hline(13, 34, 27, GREY[1])
    for x in range(13, 35, 3):
        s.vline(x, 28, 31, GREY[2])
    s.hline(13, 34, 30, GREY[2])
    # lantern room: dark glazing, yellow light inside, mullions
    for y in range(18, 32):
        for x in range(17, 31):
            c = GLASS[1] if x < 27 else GLASS[2]
            if x == 17:
                c = GLASS[0]
            s.puti(x, y, c)
    s.ellipse(23.5, 24.5, 3.6, 4.2, LIT[2])
    s.ellipse(23.7, 24.0, 2.0, 2.6, LIT[3])
    for x in (20, 27):
        s.vline(x, 18, 31, RED[1])
    s.hline(17, 30, 18, RED[1]); s.hline(17, 30, 31, RED[1])
    # red dome roof, vent ball, lightning rod
    ball(s, 23.5, 17.0, 8.0, 7.0, RED[1:], only=lambda x, y: y <= 16)
    s.hline(15, 32, 17, RED[1]); s.hline(16, 31, 16, RED[2])
    ball(s, 23.5, 8.0, 2.2, 2.2, RED[1:])
    s.vline(23, 1, 5, GREY[2]); s.vline(24, 2, 5, GREY[4])
    # front boulders overlapping the plinth foot
    fr = Spr(w, h)
    v, tr = rock_mesh(rng, 9, 6, 9, nlat=3, nlon=7, noise=0.25)
    render_mesh(fr, v, tr, 15, 143, GREYROCK, pitch=0.35, seed=7, face_jitter=0.06)
    v, tr = rock_mesh(rng, 8, 6, 8, nlat=3, nlon=7, noise=0.25)
    render_mesh(fr, v, tr, 34, 143, GREYROCK, pitch=0.35, seed=8, face_jitter=0.06)
    add_layer(s, fr, [GREYROCK, GREY])
    selout(s, [WHITE, RED, GREY, GREYROCK], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# BILLBOARDS (picture posters, no text)
# --------------------------------------------------------------------------
def bands(pic, rows):
    """Fill a picture with flat horizontal colour bands; a 1-row checker
    dither at each boundary (16-bit style, no blurred gradients).
    rows: list of (y_start, colour) top to bottom."""
    H, W = pic.h, pic.w
    for i, (y0, c) in enumerate(rows):
        y1 = rows[i + 1][0] - 1 if i + 1 < len(rows) else H - 1
        pic.rect(0, y0, W - 1, y1, c)
        if i > 0:
            prev = rows[i - 1][1]
            for x in range(W):
                if x % 2 == 0:
                    pic.puti(x, y0, prev)


def bb_frame(lay):
    """Billboard structure: two steel posts, catwalk, framed panel.  Returns
    the picture origin (x, y) and size (w, h)."""
    s = lay
    # posts + tie + footings
    for x0 in (20, 71):
        s.rect(x0, 44, x0 + 4, 63, STEEL[3]); s.vline(x0, 44, 63, STEEL[1])
        s.vline(x0 + 1, 44, 63, STEEL[2]); s.vline(x0 + 4, 44, 63, STEEL[5])
        s.rect(x0 - 2, 61, x0 + 6, 63, GREY[4]); s.hline(x0 - 2, x0 + 6, 61, GREY[5])
        s.vline(x0 - 2, 61, 63, GREY[2])
    s.rect(25, 52, 70, 53, STEEL[2]); s.hline(25, 70, 52, STEEL[4])
    # catwalk under the panel with three little floodlights
    s.rect(4, 44, 91, 45, STEEL[3]); s.hline(4, 91, 44, STEEL[5]); s.hline(4, 91, 46, STEEL[1])
    for x in range(6, 91, 4):
        s.puti(x, 45, STEEL[2])
    for x in (16, 46, 76):
        s.rect(x, 41, x + 3, 43, STEEL[2]); s.hline(x, x + 3, 41, STEEL[4])
    # panel: dark outer edge, bevel, thickness sliver on top/right
    s.rect(2, 2, 93, 41, STEEL[1])
    s.hline(3, 94, 1, STEEL[5]); s.vline(94, 1, 41, STEEL[4]); s.vline(95, 2, 41, STEEL[2])
    s.hline(3, 92, 3, STEEL[5]); s.vline(92, 3, 40, STEEL[5])
    s.hline(3, 92, 40, STEEL[3]); s.vline(3, 3, 40, STEEL[3])
    return (4, 4, 88, 36)


def sun_disc(pic, cx, cy, r, rim, body, hi, cut=None, cut_col=None):
    for y in range(pic.h):
        for x in range(pic.w):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d > r:
                continue
            c = body
            if d > r - 1.6 and (x - cx) - (y - cy) < 0:
                c = rim
            elif (x - cx) * 0.7 - (y - cy) > r * 0.45 and d < r - 2:
                c = hi
            if cut is not None and cut(y):
                c = cut_col(x, y)
            pic.puti(x, y, c)


def billboard_a():
    w, h = 96, 64
    s = Spr(w, h)
    ox, oy, pw, ph = bb_frame(s)
    pic = Spr(pw, ph)
    # turquoise sky, sea with crest lines, sand bar
    bands(pic, [(0, hx("#4aa8e0")), (9, hx("#6cc4ec")), (17, hx("#9ee0f0")),
                (25, hx("#2c6cc0")), (29, hx("#3f8ad6")), (33, hx("#e8cc86"))])
    for (x0, y0, ln) in ((4, 26, 6), (22, 27, 8), (44, 26, 5), (60, 28, 7), (12, 30, 7),
                         (34, 31, 6), (70, 31, 9)):
        pic.hline(x0, x0 + ln, y0, hx("#e8f6ff"))
        pic.hline(x0 + 1, x0 + ln - 1, y0 + 1, hx("#9cd0ff"))
    pic.hline(0, pw - 1, 33, hx("#f8f0d0"))
    # big sun with short rays
    cx, cy, r = 26, 15, 11
    for k in range(12):
        a = k * math.tau / 12 + 0.13
        for rr in range(r + 2, r + 5):
            for wv in (-0.5, 0.0, 0.5):
                aa = a + wv * 0.09
                pic.put(cx + math.cos(aa) * rr, cy + math.sin(aa) * rr, hx("#ffe466"))
    sun_disc(pic, cx, cy, r, hx("#f08a2a"), hx("#ffc832"), hx("#fff2a0"))
    # surfboard planted in the sand, leaning across the right of the picture
    bdl = Spr(pw, ph)
    board(bdl, 62.0, 35.5, 40, 12, 28, RED, deco="stripes", deco_rmp=WHITE, nose_k=0.9)
    selout(bdl, [RED, WHITE], dirs=((0, 1), (-1, 0), (1, 0), (0, -1)))
    add_layer(pic, bdl)
    s.paste(pic, ox, oy)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


def silhouette_palm(pic, bx, by, tx, ty, col, fronds, wb=3.2, wt=1.6, bow=2.5):
    """Flat poster-style palm silhouette: curved tapering trunk + solid
    drooping fronds (tapered polygons with a serrated underside)."""
    n = 60
    side = 1 if tx > bx else -1
    for k in range(n + 1):
        u = k / n
        x = bx + (tx - bx) * u + bow * math.sin(u * math.pi) * side
        y = by + (ty - by) * u
        hw = (wb + (wt - wb) * u) / 2
        for xx in range(int(math.floor(x - hw + 0.5)), int(math.floor(x + hw + 0.5))):
            pic.puti(xx, int(round(y)), col)
    for (ang, ln, droop, wmax) in fronds:
        a = math.radians(ang)
        K = int(ln * 3)
        prev = None
        out = 1 if math.cos(a) >= 0 else -1
        for k in range(K + 1):
            u = k / K
            x = tx + math.cos(a) * ln * u
            y = ty - math.sin(a) * ln * u + droop * u * u
            q = (int(round(x)), int(round(y)))
            thick = 2 if u < 0.7 else 1
            for d in range(thick):
                pic.puti(q[0], q[1] + d, col)
            if q != prev and 0.12 < u < 0.95 and (q[0] + q[1]) % 2 == 0:
                ll = wmax * math.sin(math.pi * u) + 0.8      # hanging leaflet
                pic.line(q[0], q[1] + 1, q[0] + out * ll * 0.5, q[1] + 1 + ll, col)
            prev = q
    pic.ellipse(tx, ty + 0.5, 2.0, 1.6, col)


def billboard_b():
    w, h = 96, 64
    s = Spr(w, h)
    ox, oy, pw, ph = bb_frame(s)
    pic = Spr(pw, ph)
    HZ = 24
    sky = [(0, hx("#6a4aa8")), (5, hx("#9a4f9e")), (10, hx("#d0607e")), (15, hx("#f4845e")),
           (19, hx("#ffb04a")), (22, hx("#ffd66a"))]
    bands(pic, sky + [(HZ, hx("#3a3c8c")), (28, hx("#2c2e72")), (32, hx("#22225c"))])
    # striped setting sun on the horizon
    cx, cy, r = 57, HZ, 13

    def cut(y):
        k = HZ - y
        return (k in (2, 5, 6, 9, 10, 11)) and y < HZ

    def cut_col(x, y):
        c = None
        for y0, cc in sky:
            if y >= y0:
                c = cc
        return c
    for y in range(0, HZ):
        for x in range(pw):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d > r:
                continue
            c = hx("#fff0a0") if y < cy - 9 else hx("#ffd84a") if y < cy - 5 else hx("#ffa63a")
            if cut(y):
                c = cut_col(x, y)
            pic.puti(x, y, c)
    # glittering reflection on the sea under the sun
    rng = random.Random(3)
    for y in range(HZ + 1, ph, 2):
        k = (y - HZ)
        half = max(2, int(11 - k * 0.6))
        x = cx - half
        while x < cx + half:
            ln = rng.randint(2, 4)
            pic.hline(x, min(cx + half, x + ln), y, hx("#ffc84a") if k < 6 else hx("#f08a3a"))
            x += ln + rng.randint(2, 3)
    pic.hline(0, pw - 1, HZ, hx("#ffe890"))
    # palm silhouette on the left + a smaller one behind
    # small palm further back (lighter), hero palm in front
    silhouette_palm(pic, 12, 31, 15, 17, hx("#4e2c62"),
                    [(165, 9, 5, 1.5), (120, 7, 4, 1.3), (60, 7, 4, 1.3), (15, 9, 5, 1.5)],
                    wb=2.2, wt=1.2, bow=1.5)
    silhouette_palm(pic, 30, 36, 25, 9, hx("#341c44"),
                    [(172, 15, 9, 2.6), (140, 13, 8, 2.4), (100, 9, 6, 2.0), (65, 13, 8, 2.4),
                     (30, 15, 9, 2.6), (2, 12, 9, 2.2)])
    # dark headland in front, sloping down into the sea
    for x in range(0, 52):
        top = 29.0 + 6.5 * (x / 51.0) ** 2.2 - 1.3 * math.sin(x * 0.45) * (1 - x / 51.0)
        pic.vline(x, int(round(top)), ph - 1, hx("#2a1838"))
    s.paste(pic, ox, oy)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# CHEVRON WARNING SIGNS
# --------------------------------------------------------------------------
def chevron_sign(direction):
    w, h = 32, 40
    s = Spr(w, h)
    # post + mounting bracket
    s.rect(15, 23, 16, 39, GREY[4]); s.vline(15, 23, 39, GREY[2]); s.vline(16, 23, 39, GREY[5])
    s.rect(13, 38, 18, 39, GREY[3]); s.hline(13, 18, 38, GREY[5])
    # panel
    X0, X1, Y0, Y1 = 2, 29, 1, 23
    s.rect(X0, Y0, X1, Y1, BLACK[1])
    s.rect(X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, YEL[3])
    s.hline(X0 + 1, X1 - 1, Y0 + 1, YEL[4]); s.vline(X1 - 1, Y0 + 1, Y1 - 1, YEL[4])
    s.hline(X0 + 1, X1 - 1, Y1 - 1, YEL[2]); s.vline(X0 + 1, Y0 + 1, Y1 - 1, YEL[2])
    s.hline(X0 + 1, X1, Y0, GREY[5])                       # top edge of the plate
    s.vline(X1 + 1, Y0 + 1, Y1, GREY[2])                    # plate thickness (right)
    # two bold chevrons
    cy = (Y0 + Y1) / 2.0
    half = 8.0
    thick = 4.0
    for tipx in (5.0, 16.0):
        for y in range(int(cy - half), int(cy + half) + 1):
            dy = abs(y - cy)
            xl = tipx + dy * 0.72
            for x in range(X0 + 2, X1 - 1):
                xx = x if direction == "left" else (X0 + X1) - x
                if xl - 0.01 <= xx + 0.5 - 0.5 < xl + thick:
                    s.puti(x, y, BLACK[1])
    s.puti(X0, Y0, OUTLINE) if False else None
    remove_orphans(s)
    bottom_fix(s)
    return s


def sign_left():
    return chevron_sign("left")


def sign_right():
    return chevron_sign("right")


# --------------------------------------------------------------------------
# CROWD OF SPECTATORS (seen from behind)
# --------------------------------------------------------------------------
KHAKI = ramp("#3e3424", "#6a5a3c", "#94825a", "#bcaa7c", "#ddd0a4")
DENIM = ramp("#141c34", "#22325a", "#344c84", "#4a68a8", "#6c8cc8")


def person(s, cx, base, shirt, shorts, skin, hair, hat=None, pose="V", tank=False,
           long_hair=False, flag=None, stripe=None):
    """One spectator from behind: legs, shorts, shirt, back of the head,
    arms.  cx = body centre column, base = feet row.  Returns a mask of the
    arm pixels (kept out of the dark outline so arms don't turn into sticks)."""
    arms = np.zeros((s.h, s.w), bool)
    y_sh = base - 17                       # shoulder row
    # legs
    for x0, cl in ((cx - 2, (2, 3)), (cx + 1, (3, 4))):
        s.rect(x0, base - 5, x0 + 1, base, skin[cl[0]])
        s.vline(x0 + 1, base - 5, base, skin[cl[1]])
        s.hline(x0, x0 + 1, base, skin[1])
    # shorts
    s.rect(cx - 3, base - 8, cx + 3, base - 6, shorts[2])
    s.vline(cx - 3, base - 8, base - 6, shorts[1]); s.rect(cx + 1, base - 8, cx + 3, base - 6, shorts[3])
    s.puti(cx, base - 6, shorts[1])
    # torso: rounded shoulders, slight taper to the waist
    for y in range(y_sh, base - 8):
        xa, xb = cx - 3, cx + 3
        if y == y_sh:
            xa, xb = cx - 2, cx + 2
        for x in range(xa, xb + 1):
            b = 2 if x <= cx else 3
            if x == cx - 3: b = 1
            if x == cx + 3: b = 4
            if y <= y_sh + 1: b = min(len(shirt) - 1, b + 1)
            c = shirt[b]
            if stripe is not None and (y - y_sh) % 3 == 1:
                c = stripe[min(len(stripe) - 1, b + 1)]
            s.puti(x, y, c)
    if tank:
        s.puti(cx - 2, y_sh, skin[3]); s.puti(cx + 2, y_sh, skin[4])
        s.puti(cx - 3, y_sh + 1, skin[2]); s.puti(cx + 3, y_sh + 1, skin[4])

    def arm(x0, y0, x1, y1, lit, sleeve=True, hand=True):
        pts = s.line_pts(x0, y0, x1, y1)
        for i, (x, y) in enumerate(pts):
            sl = sleeve and (i < 2 and not tank)
            c0 = shirt[3 if lit else 2] if sl else skin[3 if lit else 2]
            c1 = shirt[4 if lit else 3] if sl else skin[4 if lit else 3]
            s.puti(x, y, c0); s.puti(x + 1, y, c1)
            arms[y, x] = arms[y, x + 1] = True
        if hand:
            x, y = pts[-1]
            s.rect(x, y - 1, x + 1, y, skin[4 if lit else 3])
            s.puti(x + 1, y - 1, skin[5 if lit else 4])
            arms[y - 1:y + 1, x:x + 2] = True
    L0 = (cx - 5, y_sh + 1); R0 = (cx + 3, y_sh + 1)
    if pose == "V":
        arm(L0[0], L0[1], cx - 8, y_sh - 10, False); arm(R0[0], R0[1], cx + 6, y_sh - 10, True)
    elif pose == "up":
        arm(L0[0], L0[1], cx - 6, y_sh - 11, False); arm(R0[0], R0[1], cx + 4, y_sh - 11, True)
    elif pose == "one":
        arm(L0[0], L0[1], cx - 5, y_sh + 7, False, hand=False)
        arm(R0[0], R0[1], cx + 5, y_sh - 11, True)
    elif pose == "clap":
        arm(L0[0], L0[1], cx - 3, y_sh - 9, False, hand=False)
        arm(R0[0], R0[1], cx + 1, y_sh - 9, True, hand=False)
        s.rect(cx - 2, y_sh - 11, cx + 1, y_sh - 9, skin[4]); s.vline(cx + 1, y_sh - 11, y_sh - 9, skin[5])
        arms[y_sh - 11:y_sh - 8, cx - 2:cx + 2] = True
    elif pose == "wave":
        arm(L0[0], L0[1], cx - 5, y_sh + 7, False, hand=False)
        arm(R0[0], R0[1], cx + 7, y_sh - 4, True, hand=False)
        arm(cx + 6, y_sh - 4, cx + 7, y_sh - 10, True, sleeve=False)
    elif pose == "down":
        arm(L0[0], L0[1], cx - 5, y_sh + 7, False, hand=False)
        arm(R0[0], R0[1], cx + 3, y_sh + 7, True, hand=False)
    # neck + head (back of the head = hair)
    s.hline(cx - 1, cx + 1, y_sh - 1, skin[2]); s.puti(cx + 1, y_sh - 1, skin[3])
    hy = y_sh - 7
    rows = [(cx - 1, cx + 1), (cx - 2, cx + 2), (cx - 2, cx + 2), (cx - 2, cx + 2),
            (cx - 2, cx + 2), (cx - 1, cx + 1)]
    for k, (a_, b_) in enumerate(rows):
        for x in range(a_, b_ + 1):
            hb = 1
            if x >= cx + 1 or (k <= 1 and x >= cx): hb = 2
            if x == a_ and 0 < k < 5: hb = 0
            s.puti(x, hy + k, hair[hb])
    if not long_hair:
        s.puti(cx - 1, hy + 5, skin[2]); s.puti(cx + 1, hy + 5, skin[3])   # nape
    else:
        s.rect(cx - 2, hy + 5, cx + 2, hy + 9, hair[1]); s.vline(cx + 2, hy + 5, hy + 9, hair[2])
        s.vline(cx - 2, hy + 5, hy + 9, hair[0]); s.hline(cx - 1, cx + 1, hy + 10, hair[1])
    if hat is not None:
        kind, hr, band = hat
        if kind == "sun":
            s.hline(cx - 4, cx + 4, hy + 2, hr[3]); s.hline(cx + 1, cx + 4, hy + 2, hr[4])
            s.hline(cx - 4, cx + 4, hy + 3, hr[1])
            s.rect(cx - 2, hy - 1, cx + 2, hy + 1, hr[3]); s.vline(cx + 2, hy - 1, hy + 1, hr[4])
            s.vline(cx - 2, hy - 1, hy + 1, hr[2]); s.hline(cx - 1, cx + 1, hy - 2, hr[3])
            s.hline(cx - 2, cx + 2, hy + 1, band[3])
        else:   # cap worn backwards
            s.rect(cx - 2, hy, cx + 2, hy + 2, hr[3]); s.vline(cx + 2, hy, hy + 2, hr[4])
            s.vline(cx - 2, hy, hy + 2, hr[2]); s.hline(cx - 1, cx + 1, hy - 1, hr[3])
            s.puti(cx, hy + 2, hair[1])
            s.hline(cx - 2, cx + 1, hy + 3, hr[2])
    if flag is not None:
        # little checkered flag on a stick held up in the right hand
        hx_, hy_ = cx + 5, y_sh - 11
        s.vline(hx_ + 1, hy_ - 5, hy_ - 2, GREY[5])
        arms[hy_ - 5:hy_ - 1, hx_ + 1] = True
        for yy in range(hy_ - 6, hy_ - 1):
            for xx in range(hx_ + 2, hx_ + 8):
                s.puti(xx, yy, WHITE[4] if ((xx - hx_) // 2 + (yy - hy_) // 2) % 2 else BLACK[1])
    return arms


def crowd():
    """Shared, hand-picked 23-colour palette: outline, 5 skin, 5 hair and six
    two-tone clothing colours (hats / shorts reuse the same tones)."""
    w, h = 72, 40
    s = Spr(w, h)
    O = OUTLINE

    def two(d, l):            # person() indexes ramps 0..5
        return [O, hx(d), hx(d), hx(l), hx(l), hx(l)]
    SKL = [O] + ramp("#a8623e", "#a8623e", "#cc8a56", "#e8b07a", "#e8b07a")
    SKD = [O] + ramp("#5e3226", "#5e3226", "#84502f", "#a8623e", "#a8623e")
    H_BLK = ramp("#1e1418", "#1e1418", "#4a3024")
    H_BRN = ramp("#4a3024", "#86542e", "#86542e")
    H_BLD = ramp("#86542e", "#c8962e", "#ecc860")
    RD = two("#a32630", "#e8504a"); TL = two("#1f7a7a", "#4cb4a4")
    YL = two("#d09a1e", "#f8d040"); PK = two("#c8687c", "#f0a0a8")
    BL = two("#2c4aa0", "#4a7ad8"); WT = two("#b4b0bc", "#f6f2ea")
    DK = [O] + ramp("#1e1418", "#1e1418", "#4a3024", "#4a3024", "#4a3024")
    KH = [O] + ramp("#86542e", "#86542e", "#c8962e", "#c8962e", "#ecc860")
    STR = [O] + ramp("#86542e", "#c8962e", "#ecc860", "#ecc860", "#ecc860")
    folks_back = [
        (14, 35, YL, DK, SKD, H_BLK, None, "V", False, False, None, None),
        (28, 35, WT, BL, SKL, H_BLD, ("sun", STR, RD), "down", False, False, None, None),
        (42, 35, TL, DK, SKL, H_BRN, None, "one", True, True, "chk", None),
        (56, 35, RD, KH, SKD, H_BLK, ("cap", BL, None), "up", False, False, None, None),
    ]
    folks_front = [
        (7, 39, RD, BL, SKL, H_BRN, None, "wave", False, False, None, None),
        (21, 39, TL, KH, SKD, H_BLK, ("sun", STR, TL), "up", False, False, None, None),
        (35, 39, YL, BL, SKL, H_BLD, None, "down", True, True, None, None),
        (49, 39, PK, WT, SKL, H_BRN, ("sun", PK, WT), "V", False, False, None, None),
        (63, 39, BL, KH, SKD, H_BLK, ("cap", TL, None), "one", False, False, None, WT),
    ]
    allr = [RD, TL, YL, PK, BL, WT, DK, KH, STR, SKL, SKD, H_BLK, H_BRN, H_BLD]
    for row in (folks_back, folks_front):
        for f in row:
            lay = Spr(w, h)
            (cx, base, shirt, shorts, skin, hair, hat, pose, tank, lh, flag, stripe) = f
            am = person(lay, cx, base, shirt, shorts, skin, hair, hat=hat, pose=pose, tank=tank,
                        long_hair=lh, flag=flag, stripe=stripe)
            # flag stick / cloth use the shared white + outline
            remap(lay, {GREY[5]: hx("#b4b0bc"), WHITE[4]: hx("#f6f2ea"), BLACK[1]: O})
            selout(lay, allr, dirs=((0, 1), (-1, 0)), mask=~am)
            add_layer(s, lay, allr, sh=1)
    # thin dark contour around raised arms / heads so they read on any backdrop
    upper = np.zeros((h, w), bool); upper[:27] = True
    outer_outline(s, O, dirs=((1, 0), (-1, 0), (0, -1)), mask=upper)
    remove_orphans(s)
    bottom_fix(s)
    limit_palette(s, 24)
    return s


# --------------------------------------------------------------------------
# RACE GATES (banner rectangle reserved for runtime text)
# --------------------------------------------------------------------------
BANNER_X0, BANNER_X1, BANNER_Y0, BANNER_Y1 = 12, 243, 6, 33
BANNER_FILL = hx("#f4f0e8")
BANNER_EDGE = hx("#c8302a")


def gate_footing(s, x0, x1, y0, y1):
    s.rect(x0, y0, x1, y1, GREY[4])
    s.hline(x0, x1, y0, GREY[6]); s.hline(x0, x1, y0 + 1, GREY[5])
    s.vline(x0, y0, y1, GREY[2]); s.vline(x1, y0, y1, GREY[5])
    s.hline(x0, x1, y1, GREY[2])
    for yy in range(y0 + 3, y1, 3):
        s.puti(x0 + 3, yy, GREY[3]); s.puti(x1 - 4, yy, GREY[3])


def lattice_pole(s, x0, top, bot):
    """14 px box-truss mast: blue round chords, white zig-zag bracing over a
    dark navy core, white rungs."""
    x1 = x0 + 13
    s.rect(x0 + 3, top, x1 - 3, bot, BLUE[0])
    for y in range(top, bot + 1):
        s.puti(x0 + 3, y, BLUE[1])
    # bracing
    P = 14
    for yb in range(top - P, bot + P, P):
        for k in range(2):
            ya = yb + k * (P // 2)
            xa, xb = (x0 + 3, x1 - 4) if k == 0 else (x1 - 4, x0 + 3)
            for (dx, c) in ((0, WHITE[4]), (1, WHITE[2])):
                for (px, py) in s.line_pts(xa, ya + dx, xb, ya + P // 2 + dx):
                    if top <= py <= bot and x0 + 3 <= px <= x1 - 3:
                        s.puti(px, py, c)
                        if x0 + 3 <= px + 1 <= x1 - 3:
                            s.puti(px + 1, py, WHITE[3] if c == WHITE[4] else WHITE[1])
        if top <= yb <= bot:
            s.hline(x0 + 3, x1 - 3, yb, WHITE[5]); s.hline(x0 + 3, x1 - 3, yb + 1, WHITE[2])
    # chords (3 px round tubes)
    for cxx, cols in ((x0, (BLUE[1], BLUE[3], BLUE[4])), (x1 - 2, (BLUE[2], BLUE[4], BLUE[5]))):
        for i, c in enumerate(cols):
            s.vline(cxx + i, top, bot, c)


def checker_pole(s, x0, top, bot, sq=7):
    x1 = x0 + 13
    C = x0 + 7.0
    for y in range(top, bot + 1):
        for x in range(x0, x1 + 1):
            u = (x + 0.5 - C) / 7.0
            nz = math.sqrt(max(0.0, 1 - u * u))
            lum = 0.5 + 0.5 * (u * 0.8 + nz * 0.45) - 0.04
            white = ((x - x0) // sq + (y - top) // sq) % 2 == 0
            rmp = WHITE if white else BLACK
            b = clampi(int(lum * len(rmp)), 0, len(rmp) - 1)
            if x == x0:
                b = 0
            s.puti(x, y, rmp[b])


def gate_base(goal):
    w, h = 256, 112
    s = Spr(w, h)
    for x0 in (0, 242):
        if goal:
            checker_pole(s, x0, 3, 103)
        else:
            lattice_pole(s, x0, 3, 103)
        # cap plate + beacon on top, ballast footing at the bottom
        s.rect(x0, 1, x0 + 13, 2, GREY[4]); s.hline(x0, x0 + 13, 1, GREY[6]); s.vline(x0, 1, 2, GREY[2])
        s.rect(x0 + 5, 0, x0 + 8, 0, ORANGE[4] if not goal else RED[4])
        gate_footing(s, x0, x0 + 13, 104, 111)
    if goal:
        # checkered strip hanging under the banner, between the poles
        for y in range(BANNER_Y1 + 1, BANNER_Y1 + 13):
            for x in range(14, 242):
                k = ((x - 14) // 6 + (y - BANNER_Y1 - 1) // 6) % 2
                c = WHITE[4] if k == 0 else BLACK[1]
                if y == BANNER_Y1 + 12:
                    c = WHITE[2] if k == 0 else BLACK[0]
                s.puti(x, y, c)
    selout(s, [BLUE, WHITE, GREY, BLACK, ORANGE, RED], dirs=((0, 1),),
           mask=np.r_[np.zeros((h - 1, w), bool), np.ones((1, w), bool)])
    # banner LAST: exact rectangle, flat fill, 2 px border just inside it
    s.rect(BANNER_X0, BANNER_Y0, BANNER_X1, BANNER_Y1, BANNER_EDGE)
    s.rect(BANNER_X0 + 2, BANNER_Y0 + 2, BANNER_X1 - 2, BANNER_Y1 - 2, BANNER_FILL)
    return s


def gate():
    return gate_base(False)


def gate_goal():
    return gate_base(True)


# --------------------------------------------------------------------------
# registry / main
# --------------------------------------------------------------------------
SPRITES = [
    ("palm_a", palm_a), ("palm_b", palm_b), ("palm_c", palm_c),
    ("bush_a", bush_a), ("bush_b", bush_b), ("grass_a", grass_a),
    ("rock_a", rock_a), ("rock_b", rock_b),
    ("sea_stack", sea_stack), ("cypress", cypress),
    ("umbrella_a", umbrella_a), ("umbrella_b", umbrella_b), ("surfboards", surfboards),
    ("lifeguard", lifeguard), ("shack", shack),
    ("house", house), ("house_lit", house_lit), ("lamp", lamp), ("lamp_lit", lamp_lit),
    ("lighthouse", lighthouse),
    ("billboard_a", billboard_a), ("billboard_b", billboard_b),
    ("sign_left", sign_left), ("sign_right", sign_right),
    ("crowd", crowd), ("gate", gate), ("gate_goal", gate_goal),
]

PREVIEW_GROUPS = [
    ("palms", ["palm_a", "palm_b", "palm_c"]),
    ("small", ["bush_a", "bush_b", "grass_a", "rock_a", "rock_b"]),
    ("coast", ["sea_stack", "cypress"]),
    ("beach", ["umbrella_a", "umbrella_b", "surfboards", "lifeguard", "shack"]),
    ("buildings", ["house", "house_lit", "lamp", "lamp_lit", "lighthouse"]),
    ("roadside", ["billboard_a", "billboard_b", "sign_left", "sign_right", "crowd"]),
    ("gates", ["gate", "gate_goal"]),
]

SAND_BG = hx("#e3c98a")
SKY_BG = hx("#8fbdf2")


def preview(group, names, zoom=4, pad=6):
    ims = []
    for n in names:
        p = os.path.join(OUT, n + ".png")
        if os.path.exists(p):
            ims.append(Image.open(p).convert("RGBA"))
    if not ims:
        return
    W = sum(im.width for im in ims) + pad * (len(ims) + 1)
    Hm = max(im.height for im in ims)
    H = (Hm + pad * 2) * 2
    sheet = Image.new("RGBA", (W, H), SAND_BG + (255,))
    sheet.paste(Image.new("RGBA", (W, H // 2), SKY_BG + (255,)), (0, H // 2))
    for panel in range(2):
        x = pad
        for im in ims:
            y = panel * (H // 2) + pad + (Hm - im.height)
            sheet.alpha_composite(im, (x, y))
            x += im.width + pad
    sheet = sheet.resize((W * zoom, H * zoom), Image.NEAREST)
    sheet.convert("RGB").save(os.path.join(HERE, "preview_%s.png" % group))


def preview_scales(names, fname="preview_scales.png"):
    """Every sprite at 1x, 1/2 and 1/4 (nearest), sheet then shown at 2x --
    readability check at in-game sizes."""
    ims = [Image.open(os.path.join(OUT, n + ".png")).convert("RGBA") for n in names
           if os.path.exists(os.path.join(OUT, n + ".png"))]
    rows = []
    for sc in (1.0, 0.5, 0.25):
        row = [im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.NEAREST) for im in ims]
        rows.append(row)
    pad = 4
    W = 0
    lines = []
    # wrap into lines no wider than 640
    for row in rows:
        cur = []; cw = pad
        for im in row:
            if cw + im.width + pad > 640 and cur:
                lines.append(cur); cur = []; cw = pad
            cur.append(im); cw += im.width + pad
        if cur:
            lines.append(cur)
    W = 640
    H = sum(max(i.height for i in ln) + pad for ln in lines) + pad
    sheet = Image.new("RGBA", (W, H), SAND_BG + (255,))
    y = pad
    for k, ln in enumerate(lines):
        hm = max(i.height for i in ln)
        x = pad
        if k % 2:
            sheet.paste(Image.new("RGBA", (W, hm + pad), SKY_BG + (255,)), (0, y - pad // 2))
        for im in ln:
            sheet.alpha_composite(im, (x, y + hm - im.height))
            x += im.width + pad
        y += hm + pad
    sheet = sheet.resize((W * 2, H * 2), Image.NEAREST)
    sheet.convert("RGB").save(os.path.join(HERE, fname))


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for name, fn in SPRITES:
        if only and name not in only:
            continue
        s = fn()
        s.save(name)
        print("%-12s %dx%d" % (name, s.w, s.h))
    man = []
    for name, fn in SPRITES:
        p = os.path.join(OUT, name + ".png")
        if os.path.exists(p):
            im = Image.open(p)
            man.append({"name": name, "w": im.width, "h": im.height})
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(man, f, indent=1)
    for g, names in PREVIEW_GROUPS:
        if only and not (set(names) & only):
            continue
        preview(g, names)
    preview_scales([n for n, _ in SPRITES])


if __name__ == "__main__":
    main()

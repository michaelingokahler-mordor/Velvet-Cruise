#!/usr/bin/env python3
"""Velvet Cruise -- inland route scenery, batch B (painted desert, death
valley, road fork sign + destination / weather icons).

Pillow + numpy only.  Reuses the helpers of make_scenery.py (imported, not
modified).  Writes PNGs into ./out/ (next to the coastal sprites) and a 4x
preview sheet ./preview_routes_b.png (mid-grey and dark backgrounds).

Conventions (see ../STYLE.md):
  * alpha is 0 or 255 only
  * world props: bottom row = ground contact, object centred on its base
  * warm sun ahead/right/high: tops + right edges lit, left/bottom in shade
  * neutral warm daylight colours (the engine tints per stage)
  * no text / letters / numbers / logos

Run:  python3 -B make_routes_b.py              (all sprites + preview)
      python3 -B make_routes_b.py saguaro ...  (only these, + preview)
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw
from PIL.PngImagePlugin import PngInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_scenery as ms  # noqa: E402
from make_scenery import (Spr, hx, ramp, clampi, band, ball, selout, outer_outline,  # noqa: E402
                          remove_orphans, bottom_fix, lobed_ball, foliage, leaf_dabs,
                          ring_shadow, facet_rock, rock_mesh, render_mesh, lit_outline,
                          stroke, add_layer, fill_holes, limit_palette, shift_x, side_face,
                          glass_window, LIGHT, L3, OUTLINE)

OUT = os.path.join(HERE, "out")
GEN_TAG = "make_routes_b"

# --------------------------------------------------------------------------
# palettes (neutral warm daylight; shadows cool, highlights warm)
# --------------------------------------------------------------------------
SAGUARO = ramp("#132420", "#1c3a2c", "#285434", "#3a6e3a", "#538a42", "#76a64e", "#a2c060")
PEAR = ramp("#15302c", "#1f4638", "#2e6042", "#427a4a", "#5e9452", "#84ae5e", "#b0c878")
SPINE = hx("#efe6b4")
FLOWER = ramp("#5a1432", "#981f46", "#d0385a", "#f2627a", "#ffa2aa")
REDROCK = ramp("#2a1222", "#491c28", "#6c282c", "#90392e", "#b14e32", "#cc683a", "#e28848",
               "#f2ae64")
DSAND = ramp("#6a3e32", "#95593c", "#bc7a4c", "#d89c62", "#eec084")
SAGE = ramp("#20261e", "#343c2c", "#4c5638", "#667248", "#848e5a", "#a6ac74", "#c8ca96")
TWIG = ramp("#2a2022", "#463630", "#665040", "#8a6e52", "#ab8e6a")
STRAW = ms.STRAW
BLEACH = ramp("#2a2028", "#443840", "#625452", "#827264", "#a2927c", "#c0b296", "#dcd0b6")
POLEWOOD = ramp("#281c20", "#43302e", "#60463a", "#7c5e4a", "#987a5e", "#b69a78")
INSUL = ramp("#24504e", "#3e8278", "#70b8a6", "#bdeedc")
BONE = ramp("#3c2e36", "#685858", "#958676", "#bfb29a", "#e0d6ba", "#f8f2dc")
BASALT = ramp("#120e18", "#1c1622", "#281f2e", "#36293a", "#463544", "#58434c", "#6c5254")
BASALT_RIM = ramp("#8e6a56", "#b88e66")
RUST = ramp("#22131a", "#3c1d1c", "#5a2a1e", "#7a3a22", "#9a4c26", "#b6622c", "#cc7c38",
            "#dc9a52")
FADED = ramp("#3e5250", "#566e68", "#6e877c", "#88a08e")
SANDP = ms.SANDP
STEEL = ms.STEEL
GREY = ms.GREY
WHITE = ms.WHITE
RED = ms.RED
YEL = ms.YEL
GLASS = ms.GLASS
WOOD = ms.WOOD
ADOBE = ramp("#5a4448", "#866860", "#b28e7a", "#d4b292", "#eacfaa", "#f8eacb")
TEAL = ms.TEAL


# --------------------------------------------------------------------------
# generic helpers
# --------------------------------------------------------------------------
def tube(s, pts, wfun, rmp, lo=1, hi=None, light=LIGHT, bias=0.0, cap_start=False,
         cap_end=True, nrib=0, rib_phase=0.0, gamma=1.0):
    """Ribbed cylinder along a polyline (saguaro trunk / arms).  Returns
    (shade, rib) int maps (-1 outside) so callers can add grooves etc.
    The far end gets a hemispherical cap; ribs converge onto it."""
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
    U = seg / max(seg[-1], 1e-6)
    T = np.gradient(D, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1)[:, None], 1e-9)
    W = np.array([wfun(u) for u in U])
    shade = -np.ones((s.h, s.w), int)
    rib = -np.ones((s.h, s.w), int)
    xa = int(math.floor((D[:, 0] - W).min())) - 1; xb = int(math.ceil((D[:, 0] + W).max())) + 1
    ya = int(math.floor((D[:, 1] - W).min())) - 1; yb = int(math.ceil((D[:, 1] + W).max())) + 1
    for y in range(max(0, ya), min(s.h, yb + 1)):
        for x in range(max(0, xa), min(s.w, xb + 1)):
            px, py = x + 0.5, y + 0.5
            d2 = (D[:, 0] - px) ** 2 + (D[:, 1] - py) ** 2
            k = int(d2.argmin())
            hw = W[k] / 2.0
            if d2[k] > hw * hw:
                continue
            vx, vy = (px - D[k, 0]) / hw, (py - D[k, 1]) / hw
            tx, ty = T[k]
            vt = vx * tx + vy * ty
            if k == 0 and not cap_start and vt < -0.02:
                continue
            if k == len(D) - 1 and not cap_end and vt > 0.02:
                continue
            nxv, nyv = -ty, tx                       # across (right of travel)
            vn = vx * nxv + vy * nyv
            nz = math.sqrt(max(0.0, 1 - vx * vx - vy * vy))
            it = vx * light[0] + vy * light[1] + nz * light[2]
            v = ((it + 1) * 0.5) ** gamma + bias
            b = clampi(int(math.floor(v * (hi - lo + 1))) + lo, lo, hi)
            shade[y, x] = b
            if nrib:
                r = vn / math.sqrt(max(1e-3, 1 - min(vt * vt, 0.999)))
                th = math.asin(clampi(r, -1.0, 1.0))
                rib[y, x] = int(math.floor((th + math.pi / 2) / (math.pi / nrib) + rib_phase))
    return shade, rib


def paint_map(s, shade, rmp):
    ys, xs = np.nonzero(shade >= 0)
    for y, x in zip(ys, xs):
        s.puti(x, y, rmp[shade[y, x]])


def edge_cap(s, rmps, cap, dirs=((1, 0), (0, -1))):
    """Opaque pixels on the sun-side silhouette (transparent neighbour in
    dirs) are capped at ramp index `cap` -- a soft lit outline."""
    lut = {}
    for r in rmps:
        for i, c in enumerate(r):
            lut.setdefault(c, r[min(i, cap)])
    op = s.a[..., 3] > 0
    H, W = op.shape
    edge = np.zeros_like(op)
    for dx, dy in dirs:
        nb = np.zeros_like(op)
        ys = slice(max(0, -dy), H - max(0, dy))
        xs = slice(max(0, -dx), W - max(0, dx))
        ys2 = slice(max(0, dy), H - max(0, -dy) if max(0, -dy) else H)
        xs2 = slice(max(0, dx), W - max(0, -dx) if max(0, -dx) else W)
        nb[ys, xs] = op[ys2, xs2]
        edge |= op & ~nb
    for y, x in zip(*np.nonzero(edge)):
        c = tuple(int(v) for v in s.a[y, x, 0:3])
        if c in lut:
            s.a[y, x, 0:3] = lut[c]


def rot_ellipse_mask(w, h, cx, cy, rx, ry, ang):
    yy, xx = np.mgrid[0:h, 0:w]
    ca, sa = math.cos(ang), math.sin(ang)
    dx, dy = xx + 0.5 - cx, yy + 0.5 - cy
    lx = dx * ca + dy * sa
    ly = -dx * sa + dy * ca
    return (lx / rx) ** 2 + (ly / ry) ** 2 <= 1.0, lx, ly


def centre_on_base(s, rows=1):
    """Shift artwork so the opaque span of the bottom `rows` rows is centred."""
    op = s.a[..., 3] > 0
    xs = np.nonzero(op[s.h - rows:].any(axis=0))[0]
    if not len(xs):
        return
    mid = (xs.min() + xs.max()) / 2.0
    dx = int(round((s.w - 1) / 2.0 - mid))
    allx = np.nonzero(op.any(axis=0))[0]
    dx = clampi(dx, -int(allx.min()), s.w - 1 - int(allx.max()))
    if dx:
        shift_x(s, dx)


def grid_sprite(rows, pal):
    """Hand-pixelled sprite from a list of strings; '.' = transparent."""
    h = len(rows); w = max(len(r) for r in rows)
    s = Spr(w, h)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in (".", " "):
                continue
            s.puti(x, y, hx(pal[ch]) if isinstance(pal[ch], str) else pal[ch])
    return s


# ==========================================================================
# 1) PAINTED DESERT
# ==========================================================================
def elbow_arm(x_root, y_root, x_col, y_top, r):
    """Arm centre line: out of the trunk horizontally, quarter-circle elbow of
    radius r, then straight up to y_top."""
    sgn = 1 if x_col > x_root else -1
    pts = [(x_root, y_root), (x_col - sgn * r, y_root)]
    for k in range(1, 9):
        a = k / 8 * math.pi / 2
        pts.append((x_col - sgn * r * math.cos(a), y_root - r * math.sin(a)))
    pts.append((x_col, y_top))
    return pts


def grooved(lay, sh, rb, rmp, crest_min=4):
    """Carve rib grooves (1 px darker line at each rib boundary; softer on
    the sun side) and a lit crest pixel beside each groove on the sun side."""
    H, W = sh.shape
    n = len(rmp)
    g = np.zeros_like(sh, bool)
    ys, xs = np.nonzero(sh >= 0)
    for y, x in zip(ys, xs):
        r = rb[y, x]
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            X, Y = x + dx, y + dy
            if 0 <= X < W and 0 <= Y < H and sh[Y, X] >= 0 and rb[Y, X] > r:
                g[y, x] = True
    for y, x in zip(ys, xs):
        b = sh[y, x]
        if g[y, x]:
            lay.puti(x, y, rmp[clampi(b - (1 if b >= crest_min else 2), 1, n - 1)])
        elif b >= crest_min:
            for dx, dy in ((-1, 0), (0, 1), (1, 0), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < W and 0 <= Y < H and g[Y, X] and rb[Y, X] < rb[y, x] - 0:
                    lay.puti(x, y, rmp[clampi(b + 1, 1, n - 1)])
                    break


def saguaro():
    w, h = 46, 112
    CX = 22.5
    rmp = SAGUARO
    arms = [
        (elbow_arm(CX - 3, 64.5, 7.5, 28.0, 6.5), 9.0, 6),
        (elbow_arm(CX + 3, 50.5, 37.5, 15.0, 6.5), 9.0, 6),
        (elbow_arm(CX + 3, 81.5, 36.0, 66.0, 5.0), 7.0, 5),
    ]
    parts = []
    for pts, wd, nr in arms:
        lay = Spr(w, h)
        sh, rb = tube(lay, pts, lambda u, wd=wd: wd, rmp, lo=1, nrib=nr, bias=-0.03)
        parts.append((lay, sh, rb))
    trunk = Spr(w, h)
    tsh, trb = tube(trunk, [(CX, 112.0), (CX, 5.5)],
                    lambda u: 13.0 + (3.0 * (0.025 - u) / 0.025 if u < 0.025 else 0), rmp, lo=1,
                    nrib=8, bias=-0.03)
    parts.append((trunk, tsh, trb))
    s = Spr(w, h)
    for lay, sh, rb in parts:
        paint_map(lay, sh, rmp)
        grooved(lay, sh, rb, rmp)
        selout(lay, [rmp], dirs=((0, 1), (-1, 0)))
        add_layer(s, lay, [rmp], sh=1)
    # soft sun-side edge (keeps the silhouette readable on pale sand)
    edge_cap(s, [rmp], 4)
    # spines: a few single pale dots on lit rib crests + tiny edge spikes
    rng = random.Random(5)
    for lay, sh, rb in parts:
        ys, xs = np.nonzero(sh >= 4)
        cand = [(y, x) for y, x in zip(ys, xs)
                if all(s.op(x + dx, y + dy) for dx in (-2, 0, 2) for dy in (-2, 2))
                and s.get(x, y) == rmp[sh[y, x]] and s.get(x - 1, y) != SPINE]
        rng.shuffle(cand)
        used = []
        for y, x in cand:
            if all(abs(y - a) + abs(x - b) > 9 for a, b in used):
                used.append((y, x))
                s.puti(x, y, SPINE)
            if len(used) >= max(2, int(len(cand) / 90)):
                break
    for y in range(9, h - 4, 5):
        for x in range(w - 2, 0, -1):
            if s.op(x, y) and not s.op(x + 1, y):
                if not s.op(x + 1, y - 1) and not s.op(x + 1, y + 1):
                    s.puti(x + 1, y, SPINE if (y // 5) % 2 else rmp[5])
                break
    for y in range(11, h - 4, 6):
        for x in range(1, w - 1):
            if s.op(x, y) and not s.op(x - 1, y):
                if not s.op(x - 1, y - 1) and not s.op(x - 1, y + 1):
                    s.puti(x - 1, y, rmp[2])
                break
    bottom_fix(s)
    centre_on_base(s)
    return s


def pad_layer(w, h, cx, cy, rx, ry, ang, rmp, face=(0.0, 0.0), bias=0.0, seed=0):
    """Prickly-pear pad: a flat rotated ellipsoid, flat-ish face with rounded
    rim, a few areole dots in a diagonal lattice."""
    L = Spr(w, h)
    m, lx, ly = rot_ellipse_mask(w, h, cx, cy, rx, ry, ang)
    ca, sa = math.cos(ang), math.sin(ang)
    rz = 0.5 * min(rx, ry)
    n = len(rmp)
    for y, x in zip(*np.nonzero(m)):
        u, v = lx[y, x], ly[y, x]
        d = (u / rx) ** 2 + (v / ry) ** 2
        z = rz * math.sqrt(max(0.0, 1 - d))
        nl = np.array([u / rx ** 2, v / ry ** 2, z / rz ** 2 + 0.05])
        nx = nl[0] * ca - nl[1] * sa + face[0] * nl[2]
        ny = nl[0] * sa + nl[1] * ca + face[1] * nl[2]
        nn = math.sqrt(nx * nx + ny * ny + nl[2] ** 2)
        it = (nx * LIGHT[0] + ny * LIGHT[1] + nl[2] * LIGHT[2]) / nn
        t = (it + 1) * 0.5 + bias
        L.puti(x, y, rmp[clampi(int(math.floor(t * (n - 1))) + 1, 1, n - 1)])
    # areoles: lattice in pad space, a dark notch with a pale spine above-right
    rng = random.Random(seed)
    for i in range(-3, 4):
        for j in range(-3, 4):
            u = i * 3.6 + (j % 2) * 1.8 + rng.uniform(-0.4, 0.4)
            v = j * 3.4 + rng.uniform(-0.4, 0.4)
            if (u / (rx - 1.8)) ** 2 + (v / (ry - 1.8)) ** 2 > 1:
                continue
            X = int(math.floor(cx + u * ca - v * sa)); Y = int(math.floor(cy + u * sa + v * ca))
            c = L.get(X, Y)
            if c is None:
                continue
            k = rmp.index(c)
            if k >= 3:
                L.puti(X, Y, SPINE if k >= 4 else rmp[k + 1])
            else:
                L.puti(X, Y, rmp[max(1, k - 1)])
    return L


def blossom(s, x, y, open_=True):
    """3-4 px cup flower: petals pink-red, lit right, yellow heart."""
    if open_:
        pts = [(-1, 0, 2), (0, -1, 3), (1, -1, 4), (2, 0, 3), (0, 0, 1), (1, 0, 2),
               (-1, -1, 2), (2, -1, 4), (0, 1, 1), (1, 1, 1)]
        for dx, dy, b in pts:
            s.puti(x + dx, y + dy, FLOWER[b])
        s.puti(x, y - 1, YEL[4]); s.puti(x + 1, y - 1, YEL[5])
        s.puti(x, y, FLOWER[2]); s.puti(x + 1, y, FLOWER[3])
    else:   # bud / fruit
        for dx, dy, b in ((0, 0, 2), (1, 0, 3), (0, -1, 3), (1, -1, 4), (0, 1, 1), (1, 1, 2)):
            s.puti(x + dx, y + dy, FLOWER[b])


def ribbed_ball(s, cx, cy, rx, ry, rmp, nrib=7, flat_base=None, lo=1, bias=0.0):
    """Barrel cactus: ellipsoid with meridian ribs converging top/bottom."""
    sh = -np.ones((s.h, s.w), int)
    rb = -np.ones((s.h, s.w), int)
    n = len(rmp)
    for y in range(s.h):
        for x in range(s.w):
            if flat_base is not None and y > flat_base:
                continue
            nx = (x + 0.5 - cx) / rx; ny = (y + 0.5 - cy) / ry
            d = nx * nx + ny * ny
            if d > 1:
                continue
            nz = math.sqrt(1 - d)
            it = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]
            t = (it + 1) * 0.5 + bias
            sh[y, x] = clampi(int(math.floor(t * (n - lo))) + lo, lo, n - 1)
            r = nx / math.sqrt(max(1e-3, 1 - ny * ny))
            th = math.asin(clampi(r, -1.0, 1.0))
            rb[y, x] = int(math.floor((th + math.pi / 2) / (math.pi / nrib)))
    return sh, rb


def cactus():
    w, h = 38, 28
    s = Spr(w, h)
    # prickly pear: back pads first
    pads = [
        (29.5, 21.0, 6.0, 7.5, 0.30, (0.15, -0.1), -0.10),
        (17.5, 11.5, 4.8, 6.6, -0.42, (-0.05, -0.15), -0.06),
        (27.5, 9.0, 4.8, 6.4, 0.38, (0.2, -0.1), -0.04),
        (20.5, 21.5, 7.0, 6.8, -0.18, (0.05, 0.0), -0.06),
        (22.0, 4.6, 3.6, 4.4, 0.12, (0.15, -0.2), -0.02),
    ]
    for k, (cx, cy, rx, ry, ang, face, bb) in enumerate(pads):
        lay = pad_layer(w, h, cx, cy, rx, ry, ang, PEAR, face=face, bias=bb, seed=k)
        selout(lay, [PEAR, [SPINE]], dirs=((0, 1), (-1, 0)))
        add_layer(s, lay, [PEAR], sh=1)
    # barrel cactus in front, left
    bar = Spr(w, h)
    sh, rb = ribbed_ball(bar, 8.0, 21.0, 6.3, 7.4, PEAR, nrib=7, flat_base=27, bias=0.0)
    paint_map(bar, sh, PEAR)
    grooved(bar, sh, rb, PEAR, crest_min=4)
    for y, x in zip(*np.nonzero(sh >= 0)):        # spine tufts on the rib crests
        if y % 3 == 1 and rb[y, x] != rb[y, min(w - 1, x + 1)] and y < 26:
            bar.puti(x, y, SPINE if sh[y, x] >= 3 else PEAR[4])
    selout(bar, [PEAR, [SPINE]], dirs=((0, 1), (-1, 0)))
    add_layer(s, bar, [PEAR], sh=1)
    # flowers on the pad rims + the barrel crown, a bud
    blossom(s, 21, 1, True)
    blossom(s, 30, 3, True)
    blossom(s, 12, 7, False)
    blossom(s, 7, 14, True)
    edge_cap(s, [PEAR], 4)
    fill_holes(s, max_size=3)
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    return s


# ---- red sandstone butte ---------------------------------------------------
def prism_mesh(rings, cap=True):
    """rings: list of (z, [(x, y), ...]) with equal vertex counts, bottom to
    top.  Side walls + optional flat cap fan on the last ring."""
    verts, R = [], []
    for z, ring in rings:
        idx = []
        for (x, y) in ring:
            verts.append(np.array([x, y, z], float)); idx.append(len(verts) - 1)
        R.append(idx)
    tris = []
    n = len(rings[0][1])
    for i in range(len(R) - 1):
        r0, r1 = R[i], R[i + 1]
        for j in range(n):
            a, b = r0[j], r0[(j + 1) % n]
            c, d = r1[j], r1[(j + 1) % n]
            tris.append((a, b, d)); tris.append((a, d, c))
    if cap:
        z = rings[-1][0]
        cx = np.mean([p[0] for p in rings[-1][1]]); cy = np.mean([p[1] for p in rings[-1][1]])
        verts.append(np.array([cx, cy, z + 0.01]))
        c = len(verts) - 1
        r = R[-1]
        for j in range(n):
            tris.append((r[j], r[(j + 1) % n], c))
    return verts, tris


def plan_ring(rng, rx, ry, n, noise, cx=0.0, cy=0.0, ph=0.0, flutes=None):
    pts = []
    for j in range(n):
        a = (j + ph) / n * math.tau
        k = 1 + rng.uniform(-noise, noise)
        if flutes is not None:
            k *= flutes(a)
        pts.append((cx + math.cos(a) * rx * k, cy + math.sin(a) * ry * k))
    return pts


def boulder(s, cx, cy, rx, ry, rmp, lo=1, flat=True):
    """Small blocky boulder: few-band ball shading, flat bottom, outline on
    the shadow side."""
    lay = Spr(s.w, s.h)
    ball(lay, cx, cy, rx, ry, rmp[lo:], gamma=1.1,
         only=(lambda x, y: y <= cy + ry * 0.55) if flat else None)
    selout(lay, [rmp, rmp[lo:]], dirs=((0, 1), (-1, 0)))
    add_layer(s, lay, [rmp], sh=1)


def block(s, cx, by, bw, bh, rmp, seed=0, lo=2):
    """Angular fallen block: irregular hexagon, lit top + right facet, mid
    front, dark left facet, dark outline bottom/left."""
    rng = random.Random(seed)
    lay = Spr(s.w, s.h)
    x0, x1 = cx - bw / 2.0, cx + bw / 2.0
    top = by - bh
    j = lambda: rng.uniform(-0.6, 0.6)
    poly = [(x0, by + 0.5), (x0 + j(), by - bh * 0.55), (x0 + bw * 0.3 + j(), top),
            (x1 - bw * 0.2 + j(), top + j() * 0.5), (x1 + 0.4, by - bh * 0.5), (x1, by + 0.5)]
    m = lay.mask_poly(poly)
    ridge_x = x0 + bw * (0.35 + rng.uniform(-0.08, 0.08))
    n = len(rmp)
    for y, x in zip(*np.nonzero(m)):
        topf = y < top + max(1.0, bh * 0.35)
        if topf:
            b = lo + 3
        elif x + 0.5 < ridge_x:
            b = lo
        else:
            b = lo + 1 if x + 0.5 < x1 - bw * 0.3 else lo + 2
        lay.puti(x, y, rmp[clampi(b, 1, n - 1)])
    selout(lay, [rmp], dirs=((0, 1), (-1, 0)))
    add_layer(s, lay, [rmp], sh=1)


def mesa_rock():
    """Monument-Valley style butte with a thumb spire, built column by
    column: each vertical facet has its own shade (left faces dark, front
    mid, right faces lit) and its own top; strata lines shift with facet
    depth and break between facets; desert-varnish streaks run down from a
    pale caprock; concave banded talus with gullies and fallen blocks."""
    w, h = 100, 104
    R = REDROCK
    n = len(R)
    s = Spr(w, h)
    sh = -np.ones((h, w), int)
    rng = random.Random(8)

    def talus_top(x):
        # left foot -> under spire -> cliff foot -> right foot
        pts = [(0, 103), (4, 101), (8, 96), (11, 90), (14, 87), (19, 86), (22, 83),
               (25, 78), (29, 75), (32, 74), (68, 74), (72, 76), (76, 80), (80, 86),
               (85, 94), (90, 99), (95, 102), (99, 103)]
        for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
            if xa <= x <= xb:
                return ya + (yb - ya) * (x - xa) / max(1, xb - xa)
        return 103

    # facets: (x0, x1, shade, depth px, top y, bottom y or None=talus)
    facets = [
        (24, 26, 2, 0, 40, None), (27, 29, 2, 0, 15, None), (30, 36, 3, 1, 13, None),
        (37, 38, 2, 0, 13, None), (39, 47, 4, 2, 12, None), (48, 49, 3, 1, 12, None),
        (50, 55, 4, 2, 11, None), (56, 61, 5, 1, 11, None), (62, 67, 6, 1, 12, None),
        (68, 71, 7, 0, 14, None), (72, 75, 6, 0, 33, None),
    ]
    spire = [(12, 13, 2, 0, 32, None), (14, 16, 4, 1, 28, None), (17, 19, 6, 0, 27, None),
             (20, 20, 5, 0, 30, None)]
    strata_y = [27, 37, 63]
    skip = {(4, 27), (7, 37), (2, 63), (9, 63), (6, 27), (1, 37)}
    soft = (45, 49)
    for gi, group in enumerate((spire, facets)):
        for fi, (x0, x1, b0, dep, top, bot) in enumerate(group):
            for x in range(x0, x1 + 1):
                t = top
                if gi == 0:
                    t = top + int(round(abs(x - 15.5) ** 2 * 0.22))
                yb = int(talus_top(x)) + 1
                for y in range(t, min(h, yb + 1)):
                    b = b0
                    yy = y - dep
                    k = y - t
                    if k <= 1:
                        b = 7 if b0 >= 4 else b0 + 2                 # lit top surface
                    elif k <= 5 and gi == 1 and top < 20:
                        b = b0 + 1                                    # pale caprock
                    elif k == 6 and gi == 1 and top < 20:
                        b = b0 - 2                                    # overhang shadow
                    elif k == 2 and gi == 1:
                        b = b0 - 1
                    else:
                        if soft[0] <= yy <= soft[1]:
                            b = b0 - 1
                        elif yy == soft[0] - 1 and b0 >= 4:
                            b = b0 + 1
                        for sy in strata_y:
                            if (fi, sy) in skip or b0 < 3:
                                continue
                            if yy == sy:
                                b = b0 - 1
                            elif yy == sy - 1 and b0 >= 5:
                                b = b0 + 1
                    sh[y, x] = clampi(b, 1, n - 1)
    # desert-varnish streaks: dark drips from under the caprock
    for (x, ln, wd) in ((32, 26, 1), (42, 20, 2), (45, 9, 1), (52, 30, 1), (58, 14, 2),
                        (64, 24, 1), (69, 12, 1), (15, 14, 1)):
        col = np.nonzero(sh[:, x] >= 0)[0]
        y0 = col[0] + 7
        for xx in range(x, x + wd):
            l2 = ln if xx == x else ln * 2 // 3
            for y in range(y0, y0 + l2):
                if sh[y, xx] >= 0:
                    sh[y, xx] = max(1, sh[y, xx] - 1)
    # talus skirt: banded shale, shading by slope direction
    for x in range(0, 100):
        ty = int(round(talus_top(x)))
        for y in range(ty, h):
            if x in range(24, 76) and y < 75:
                continue
            u = (x - 50) / 50.0
            b = 4 + (1 if u > 0.3 else 0) + (1 if u > 0.62 else 0) - (1 if u < -0.25 else 0) \
                - (1 if u < -0.6 else 0)
            if y == ty and u > -0.5:
                b += 1
            if 24 <= x <= 75 and y < 78:
                b -= 1                                   # shadow at the cliff foot
            v = (y + 1.0 * math.sin(x * 0.17) + 0.5 * math.sin(x * 0.53)) % 8
            if v < 1 and ((x // 6) % 4 != 1):
                b -= 1                                   # shale ledge (broken)
            elif v < 2 and ((x // 6) % 4 != 1) and u > -0.2:
                b += 1
            if (sh[y, x] < 0 or y >= 75):
                sh[y, x] = clampi(b, 1, n - 2)
    # gullies: wandering dark grooves with a lit lip
    for (gx, dirx, ln) in ((30, -0.9, 20), (45, -0.25, 24), (62, 0.45, 22), (78, 0.8, 12)):
        x = float(gx); y = int(talus_top(gx)) + 1
        for k in range(ln):
            X = int(round(x))
            if not (0 <= X < w - 1 and y < h - 1) or sh[y, X] < 0:
                break
            sh[y, X] = max(1, sh[y, X] - 1 - (1 if k < ln * 0.6 else 0))
            if sh[y, X + 1] >= 0 and k < ln * 0.7:
                sh[y, X + 1] = min(n - 2, sh[y, X + 1] + 1)
            y += 1; x += dirx * (0.6 + 0.4 * math.sin(k * 0.7 + gx))
    ys, xs = np.nonzero(sh >= 0)
    for y, x in zip(ys, xs):
        s.puti(x, y, R[sh[y, x]])
    selout(s, [R], dirs=((0, 1), (-1, 0)))
    edge_cap(s, [R], 5)
    # fallen blocks / rubble (dark, angular)
    for k, (bx, by, bw, bh) in enumerate(((17, 103, 10, 7), (28, 103, 5, 3), (74, 103, 11, 7),
                                          (87, 103, 5, 3), (55, 103, 4, 3), (8, 103, 4, 3),
                                          (35, 81, 4, 3), (68, 82, 5, 3))):
        block(s, bx, by, bw, bh, R, seed=k, lo=3)
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    return s


TUMBLE = ramp("#3a281e", "#5c432e", "#84653c", "#a6884f", "#c6a96a", "#dec488")


def tumbleweed():
    """Airy ball of curly twigs: arcs on a sphere, far side dark and drawn
    first, near side lit upper-right; open gaps show the background."""
    w, h = 24, 22
    s = Spr(w, h)
    C = (11.6, 10.6); R = 10.3
    rng = random.Random(23)
    pts_all = []
    for k in range(34):
        ax = np.array([rng.gauss(0, 1) for _ in range(3)]); ax /= np.linalg.norm(ax)
        rad = rng.uniform(0.75, 1.0)
        up = np.cross(ax, [0.31, 0.52, 0.79]); up /= np.linalg.norm(up)
        rt = np.cross(ax, up)
        a0 = rng.uniform(0, math.tau); span = rng.uniform(1.0, 2.4)
        for j in range(60):
            a = a0 + span * j / 59
            q = ax * math.sqrt(1 - rad * rad) * rng.choice((1, 1)) + \
                (up * math.cos(a) + rt * math.sin(a)) * rad
            pts_all.append(q)
    zb = {}
    for q in pts_all:
        x = int(math.floor(C[0] + q[0] * R)); y = int(math.floor(C[1] + q[1] * R))
        if (x, y) not in zb or zb[(x, y)][0] < q[2]:
            zb[(x, y)] = (q[2], q)
    for (x, y), (z, q) in zb.items():
        it = q[0] * LIGHT[0] + q[1] * LIGHT[1] + q[2] * LIGHT[2]
        if z < -0.25:
            b = 1
        elif z < 0.2:
            b = 2 + (1 if it > 0.3 else 0)
        else:
            b = 3 + (1 if it > 0.25 else 0) + (1 if it > 0.7 else 0)
        s.puti(x, y, TUMBLE[clampi(b, 1, 5)])
    remove_orphans(s, min_n=1)
    # contact: a couple of dark pixels where it touches the ground
    bottom_fix(s)
    op = s.opaque()
    xs = np.nonzero(op[-1])[0]
    if len(xs) < 3:
        for x in range(10, 14):
            s.puti(x, h - 1, TUMBLE[1] if x < 12 else TUMBLE[2])
    centre_on_base(s)
    return s


# ---- dry desert shrub ---------------------------------------------------------
def desert_bush():
    w, h = 40, 24
    s = Spr(w, h)
    # woody stems visible under the foliage
    for (x0, x1, y1) in ((18, 12, 15), (20, 21, 13), (22, 29, 14), (19, 7, 18), (23, 33, 18)):
        s.line(x0, 23, x1, y1, TWIG[1])
        s.line(x0 + 1, 23, x1 + 1, y1, TWIG[2])
    blobs = [
        (11, 15, 7.5, 5.5), (29, 14, 8.0, 5.5), (20, 10, 9.0, 6.5),
        (6, 18, 5.0, 3.6), (34, 18, 5.0, 3.6), (20, 16, 8.0, 4.0),
    ]
    fol = Spr(w, h)
    foliage(fol, blobs, SAGE, seed=14, bias=-0.02, lobes=13, lobe_amp=0.22, dab_step=3,
            gamma=1.3, flat_base=19)
    add_layer(s, fol, [TWIG], sh=1)
    selout(s, [SAGE, TWIG], dirs=((0, 1), (-1, 0)))
    # a few bare dry twigs poking out of the crown (after the outline pass)
    for (x, y, dx, dy, ln) in ((10, 9, -1, -1, 3), (24, 4, 0.5, -1, 3), (33, 10, 1, -1, 2),
                               (3, 15, -1, -0.5, 2)):
        for k in range(ln):
            X = int(round(x + dx * k)); Y = int(round(y + dy * k))
            if not s.op(X, Y):
                s.puti(X, Y, TWIG[4] if dx > 0 else TWIG[3])
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    limit_palette(s, 16)
    return s


# ---- old roadside gas station --------------------------------------------------
TERRA = ms.TERRA
BLACK = ms.BLACK


def retro_pump(s, x0, top, base, body, trim, seed=0):
    """1950s fuel pump: rounded box body, blank white face with a round dial,
    lit globe on top, hose looping down the right side into its holster."""
    x1 = x0 + 11
    for y in range(top, base + 1):
        for x in range(x0, x1 + 1):
            if y == top and x in (x0, x1):
                continue
            if y == top + 1 and x in (x0, x1) and False:
                continue
            c = body[3]
            if x == x0:
                c = body[1]
            elif x == x0 + 1:
                c = body[2]
            elif x >= x1 - 1:
                c = body[4]
            if y == top:
                c = body[4] if x < x1 - 1 else body[5]
            s.puti(x, y, c)
    # face panel: blank white with a round dial (no numbers) + dark slot
    s.rect(x0 + 2, top + 4, x1 - 2, top + 12, WHITE[4])
    s.hline(x0 + 2, x1 - 2, top + 4, WHITE[2]); s.vline(x0 + 2, top + 4, top + 12, WHITE[2])
    s.vline(x1 - 2, top + 5, top + 12, WHITE[5])
    cx, cy = x0 + 5.5, top + 8.0
    for y in range(top + 5, top + 12):
        for x in range(x0 + 3, x1 - 2):
            d = math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - (cy + 0.5))
            if 2.0 < d <= 3.0:
                s.puti(x, y, GREY[3])
    s.puti(int(cx), int(cy), trim[2]); s.puti(int(cx) + 1, int(cy) - 1, trim[2])
    s.rect(x0 + 3, top + 14, x1 - 3, top + 15, BLACK[1])
    s.hline(x0 + 3, x1 - 3, top + 16, body[2])
    # chrome strip + plinth
    s.hline(x0, x1, top + 19, GREY[5]); s.hline(x0, x1, top + 20, GREY[3])
    s.rect(x0 - 1, base - 1, x1 + 1, base, GREY[2]); s.hline(x0 - 1, x1 + 1, base - 1, GREY[4])
    # globe
    gx, gy = x0 + 5.5, top - 4.0
    s.rect(int(gx) - 1, top - 1, int(gx) + 2, top - 1, GREY[3])
    ball(s, gx + 0.5, gy, 3.6, 3.4, WHITE[1:])
    for x in range(int(gx) - 3, int(gx) + 5):
        if s.get(x, int(gy)) is not None:
            s.puti(x, int(gy), trim[3] if x < gx + 1 else trim[4])
            s.puti(x, int(gy) + 1, trim[2] if x < gx + 1 else trim[3])
    # hose: from the side up top, looping down and back to the holster
    hx_ = x1 + 1
    pts = [(hx_, top + 6), (hx_ + 1, top + 10), (hx_ + 2, top + 15), (hx_ + 2, top + 19),
           (hx_ + 1, top + 22), (hx_, top + 23)]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        s.line(ax, ay, bx, by, BLACK[1])
    s.rect(hx_ - 1, top + 5, hx_, top + 8, GREY[2]); s.puti(hx_, top + 5, GREY[4])


def gas_station():
    w, h = 130, 98
    s = Spr(w, h)
    GY = 92                                       # top of the forecourt slab
    # ---- shop: stucco box with a stepped false-front parapet ----
    FX0, FX1, FY0 = 3, 44, 50
    for y in range(FY0, GY + 1):
        for x in range(FX0, FX1 + 1):
            c = ADOBE[4]
            if x == FX0:
                c = ADOBE[3]
            s.puti(x, y, c)
    side_face(s, FX1 + 1, FX1 + 7, FY0, GY, 0.5,
              lambda x, y, u, v: ADOBE[3] if v < 0.04 else ADOBE[5])
    # parapet: raised centre with stepped shoulders + coping
    for (x0, x1, y0) in ((7, 40, 46), (12, 35, 42)):
        s.rect(x0, y0, x1, FY0, ADOBE[4])
        s.vline(x0, y0, FY0, ADOBE[3])
        s.hline(x0, x1, y0, ADOBE[5]); s.hline(x0, x1, y0 + 1, ADOBE[3])
    s.hline(FX0, FX1, FY0, ADOBE[5]); s.hline(FX0, FX1, FY0 + 1, ADOBE[2])
    # teal trim band
    s.rect(FX0, 53, FX1, 56, TEAL[3]); s.hline(FX0, FX1, 53, TEAL[4]); s.hline(FX0, FX1, 56, TEAL[2])
    side_face(s, FX1 + 1, FX1 + 7, 53, 56, 0.5,
              lambda x, y, u, v: TEAL[4] if v < 0.7 else TEAL[3])
    s.hline(FX0, FX1, 57, ADOBE[3])
    # shop window with shelves inside
    glass_window(s, 7, 61, 25, 78, WHITE, lit=False, mullion=[16])
    for (yy, cols) in ((68, (RED, YEL, TEAL)), (74, (YEL, RED, WHITE))):
        s.hline(8, 24, yy + 1, GLASS[0])
        x = 9
        k = 0
        while x < 24:
            if x in (16,):
                x += 1
                continue
            c = cols[k % 3]
            s.vline(x, yy - 1, yy, c[2]); k += 1
            x += 2
    s.hline(6, 26, 79, ADOBE[5]); s.hline(6, 26, 80, ADOBE[2])
    # screen door
    s.rect(30, 63, 38, GY, TEAL[3]); s.vline(30, 63, GY, TEAL[2]); s.vline(38, 63, GY, TEAL[4])
    s.hline(30, 38, 63, TEAL[4])
    s.rect(31, 65, 37, 75, GLASS[1]); s.puti(36, 66, GLASS[3]); s.puti(35, 67, GLASS[3])
    s.rect(31, 78, 37, 89, hx("#2a2030")); s.hline(31, 37, 83, TEAL[3])
    s.puti(36, 77, YEL[4])
    # lamp over the door
    s.hline(33, 35, 59, GREY[4]); s.puti(34, 60, GREY[2]); s.hline(33, 35, 61, YEL[4])
    # ---- canopy over the pumps ----
    CX0, CX1, CT = 47, 108, 33
    back = Spr(w, h)
    for x0 in (58, 106):                            # back posts (further away)
        back.rect(x0, CT + 8, x0 + 1, 85, GREY[2]); back.vline(x0 + 1, CT + 8, 85, GREY[3])
    add_layer(s, back)
    # roof top sliver (seen from above), receding up-right
    for k, y in enumerate((CT - 1, CT - 2, CT - 3)):
        s.hline(CX0 + 2 * (k + 1), CX1 + 2 * (k + 1), y, GREY[5] if k else GREY[6])
    # fascia: white line / red band / white stripe / dark lip
    s.hline(CX0, CX1, CT, WHITE[5])
    s.rect(CX0, CT + 1, CX1, CT + 6, RED[3]); s.hline(CX0, CX1, CT + 1, RED[4])
    s.hline(CX0, CX1, CT + 7, WHITE[4])
    s.hline(CX0, CX1, CT + 8, RED[1])
    s.vline(CX0, CT, CT + 8, RED[1])
    side_face(s, CX1 + 1, CX1 + 6, CT, CT + 8, 0.5,
              lambda x, y, u, v: WHITE[5] if v < 0.1 else (WHITE[4] if v > 0.8 else RED[4]))
    side_face(s, CX1 + 1, CX1 + 6, CT - 3, CT - 1, 0.5, lambda x, y, u, v: GREY[5])
    # front posts
    for x0 in (52, 101):
        s.rect(x0, CT + 9, x0 + 2, GY - 1, WHITE[3])
        s.vline(x0, CT + 9, GY - 1, WHITE[1]); s.vline(x0 + 2, CT + 9, GY - 1, WHITE[5])
        s.hline(x0, x0 + 2, CT + 9, WHITE[1])
        s.rect(x0 - 1, GY - 3, x0 + 3, GY, GREY[3]); s.hline(x0 - 1, x0 + 3, GY - 3, GREY[5])
    # pump island
    s.rect(60, 85, 99, 91, GREY[3])
    s.hline(60, 99, 85, GREY[6]); s.rect(60, 86, 99, 87, GREY[5])
    s.hline(60, 99, 91, GREY[2]); s.vline(60, 85, 91, GREY[2])
    for x in range(61, 99, 6):
        s.puti(x, 89, YEL[3]); s.puti(x + 1, 89, YEL[3]); s.puti(x + 2, 89, YEL[3])
    retro_pump(s, 64, 61, 85, RED, YEL, seed=1)
    retro_pump(s, 84, 61, 85, WHITE, RED, seed=2)
    # ---- props: tyre stack and an oil drum ----
    for k, y0 in enumerate((88, 84, 80)):           # stacked tyres (side view)
        x0 = 0 + (k % 2)
        for y in range(y0, y0 + 4):
            for x in range(x0, x0 + 8):
                if (y in (y0, y0 + 3)) and x in (x0, x0 + 7):
                    continue
                c = BLACK[2]
                if y == y0:
                    c = BLACK[3]
                elif x >= x0 + 6:
                    c = GREY[2]
                elif (x - x0) % 2 == 0 and y in (y0 + 1, y0 + 2):
                    c = BLACK[1]
                s.puti(x, y, c)
    s.rect(40, 83, 45, GY, RED[3]); s.vline(40, 83, GY, RED[1]); s.vline(45, 83, GY, RED[4])
    s.hline(40, 45, 83, RED[5]); s.hline(40, 45, 87, RED[1]); s.hline(40, 45, 88, RED[4])
    # ---- pole sign: round disc, red ring, white face, red fuel drop ----
    PX = 116
    s.rect(PX, 22, PX + 3, GY, STEEL[3])
    s.vline(PX, 22, GY, STEEL[1]); s.vline(PX + 1, 22, GY, STEEL[2]); s.vline(PX + 3, 22, GY, STEEL[5])
    s.rect(PX - 2, GY - 3, PX + 5, GY, GREY[4]); s.hline(PX - 2, PX + 5, GY - 3, GREY[6])
    s.vline(PX - 2, GY - 3, GY, GREY[2])
    dcx, dcy, R0 = PX + 2.0, 11.5, 10.6
    for y in range(0, 24):
        for x in range(PX - 12, PX + 15):
            d = math.hypot(x + 0.5 - dcx, y + 0.5 - dcy)
            if d > R0:
                continue
            if d > R0 - 1.0:
                c = RED[1]
            elif d > R0 - 3.2:
                c = RED[3] if (x + 0.5 - dcx) - (y + 0.5 - dcy) * 0.8 < 3 else RED[4]
            else:
                c = WHITE[4] if (x + 0.5 - dcx) + (y + 0.5 - dcy) < 4 else WHITE[3]
            s.puti(x, y, c)
    # fuel drop
    for y in range(4, 19):
        for x in range(PX - 6, PX + 10):
            X, Y = x + 0.5 - dcx, y + 0.5 - (dcy + 2.6)
            r = 3.9
            inside = X * X + Y * Y <= r * r
            if not inside and Y < 0:
                k = (-Y) / 8.5
                inside = k < 1 and abs(X) <= r * (1 - k) ** 1.1 * (1 if k > 0 else 1)
            if inside:
                c = RED[3]
                if X > 1.0 and Y > -1:
                    c = RED[4]
                if X < -2.4 or Y > 2.6:
                    c = RED[2]
                s.puti(x, y, c)
    s.puti(int(dcx) + 1, int(dcy + 1), WHITE[5]); s.puti(int(dcx) + 1, int(dcy + 2), WHITE[4])
    # ---- forecourt slab ----
    for y in range(GY + 1, h):
        for x in range(0, w):
            c = GREY[5] if y <= GY + 2 else (GREY[4] if y < h - 1 else GREY[2])
            if (x % 18 == 7) and y <= GY + 3:
                c = GREY[3]
            s.puti(x, y, c)
    s.hline(0, w - 1, GY + 1, GREY[6])
    selout(s, [ADOBE, TEAL, WHITE, RED, GREY, STEEL, BLACK, YEL, GLASS],
           dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    limit_palette(s, 24)
    return s


# ==========================================================================
# 2) DEATH VALLEY
# ==========================================================================
def twig_line(s, x0, y0, ang, ln, col, rng, fork=True, depth=0):
    """1 px twig, optionally forking once near its end."""
    a = math.radians(ang)
    x1 = x0 + math.cos(a) * ln; y1 = y0 - math.sin(a) * ln
    s.line(x0, y0, x1, y1, col)
    if fork and depth < 1 and ln > 3:
        fx = x0 + math.cos(a) * ln * 0.55; fy = y0 - math.sin(a) * ln * 0.55
        side = rng.choice((-1, 1))
        twig_line(s, fx, fy, ang + side * rng.uniform(28, 45), ln * 0.5, col, rng, False, depth + 1)


def dead_tree():
    w, h = 66, 92
    s = Spr(w, h)
    rmp = BLEACH
    fib = [(-0.45, 6, 3, 0), (0.15, 7, 4, 2), (0.55, 5, 2, 1)]
    # roots on the ground
    stroke(s, [(31, 89), (26, 91.5), (21, 92)], lambda u: 3.4 - 1.8 * u, rmp, lo=1)
    stroke(s, [(37, 89), (42, 91.5), (46, 92)], lambda u: 3.0 - 1.5 * u, rmp, lo=1)
    # gnarled leaning trunk
    stroke(s, [(34, 92), (35, 84), (33, 76), (29.5, 68), (28.5, 61)],
           lambda u: 11.0 - 4.5 * u + (5 * (0.14 - u) / 0.14 if u < 0.14 else 0), rmp,
           streaks=fib, lo=1)
    limbs = [
        ([(28, 64), (22, 60), (15, 58), (9, 52), (6, 44)], 5.5, 2.0),
        ([(30, 63), (37, 57), (40, 49), (47, 43), (50, 33), (56, 26)], 6.0, 2.0),
        ([(28.5, 62), (27, 52), (30, 44), (27, 34), (29, 24), (26, 13)], 4.6, 1.6),
        ([(15, 58), (13, 50), (16, 42), (14, 35)], 2.8, 1.3),
        ([(40, 49), (36, 40), (38, 31)], 2.6, 1.3),
        ([(47, 43), (55, 44), (61, 39)], 2.6, 1.3),
        ([(30, 44), (36, 38), (37, 29)], 2.3, 1.2),
        ([(27, 34), (21, 28), (20, 19)], 2.3, 1.2),
        ([(33, 78), (38, 76), (41, 73)], 3.6, 3.0),          # snapped-off stub
    ]
    for pts, w0, w1 in limbs:
        stroke(s, pts, lambda u, a=w0, b=w1: a + (b - a) * u, rmp,
               streaks=[(-0.3, 6, 3, 0), (0.35, 7, 3, 2)], lo=1)
    s.puti(41, 72, rmp[6]); s.puti(41, 73, rmp[5]); s.puti(42, 73, rmp[5]); s.puti(41, 74, rmp[4])
    for (x, y) in ((30, 71), (31, 71), (30, 72), (31, 72), (30, 73)):     # hollow knot
        s.puti(x, y, rmp[0])
    s.puti(32, 72, rmp[5])
    selout(s, [rmp], dirs=((0, 1), (-1, 0)))
    edge_cap(s, [rmp], 5)
    rng = random.Random(6)
    tips = [(6, 44, 120, 6), (6, 44, 160, 5), (56, 26, 60, 6), (56, 26, 25, 5),
            (26, 13, 100, 7), (26, 13, 65, 4), (14, 35, 100, 5), (14, 35, 140, 4),
            (61, 39, 20, 5), (61, 39, 70, 4), (20, 19, 115, 5), (37, 29, 80, 5),
            (37, 29, 45, 4), (38, 31, 105, 4), (9, 52, 200, 4), (50, 33, 120, 4)]
    for (x, y, a, ln) in tips:
        twig_line(s, x, y, a + rng.uniform(-6, 6), ln, rmp[3] if a < 90 else rmp[2], rng)
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s, rows=3)
    limit_palette(s, 16)
    return s


def tele_pole():
    w, h = 30, 132
    s = Spr(w, h)
    rmp = POLEWOOD
    X0, X1 = 13, 16                         # 4 px pole, centred (centre 14.5)
    TOP = 6
    for y in range(TOP, h):
        for x in range(X0, X1 + 1):
            c = (rmp[1], rmp[3], rmp[4], rmp[5])[x - X0]
            if x == X0 + 1 and (y * 5) % 23 < 3:
                c = rmp[2]                    # weathering cracks
            if x == X0 + 2 and (y * 7 + 3) % 31 < 2:
                c = rmp[3]
            if y > h - 9:                     # darker creosote base
                c = (rmp[0], rmp[2], rmp[3], rmp[4])[x - X0]
            s.puti(x, y, c)
    # slanted cut top
    s.hline(X0, X1, TOP - 1, rmp[5]); s.hline(X0 + 1, X1, TOP - 2, rmp[5])
    s.puti(X0, TOP - 1, rmp[3])
    # climbing steps (alternating sides)
    for k, y in enumerate(range(44, h - 14, 9)):
        if k % 2 == 0:
            s.puti(X0 - 1, y, GREY[3]); s.puti(X0 - 2, y, GREY[2])
        else:
            s.puti(X1 + 1, y, GREY[5]); s.puti(X1 + 2, y, GREY[4])

    def crossarm(y, x0, x1, ins):
        # top face (lit), front, underside
        s.hline(x0, x1, y, rmp[5])
        s.rect(x0, y + 1, x1, y + 2, rmp[3])
        s.hline(x0, x1, y + 3, rmp[1])
        s.vline(x0, y, y + 3, rmp[1]); s.vline(x1, y + 1, y + 3, rmp[4])
        for k in range(x0 + 2, x1 - 1, 5):
            s.puti(k, y + 2, rmp[2])
        # braces from the pole to the arm
        for sx, ex in ((X0 - 1, x0 + 5), (X1 + 1, x1 - 5)):
            s.line(sx, y + 9, ex, y + 4, GREY[2] if sx < X0 else GREY[4])
        for ix in ins:
            # glass insulator on a peg: dome + skirt, sea-glass green
            s.puti(ix, y - 1, GREY[3]); s.puti(ix + 1, y - 1, GREY[3])
            s.hline(ix - 1, ix + 2, y - 2, INSUL[1]); s.puti(ix + 2, y - 2, INSUL[2])
            s.hline(ix - 1, ix + 2, y - 3, INSUL[2]); s.puti(ix + 1, y - 3, INSUL[3])
            s.hline(ix, ix + 1, y - 4, INSUL[2]); s.puti(ix + 1, y - 4, INSUL[3])
            s.puti(ix - 1, y - 2, INSUL[0])

    crossarm(14, 1, 28, (2, 7, 21, 26))
    crossarm(27, 4, 25, (5, 23))
    selout(s, [rmp, GREY, INSUL], dirs=((-1, 0),),
           mask=np.r_[np.zeros((40, w), bool), np.ones((h - 40, w), bool)])
    s.hline(X0 - 1, X1 + 1, h - 1, rmp[0])
    bottom_fix(s)
    return s


HORN = ramp("#3a2c30", "#665246", "#958064", "#c2ae8a", "#e4d6b4")


def skull_post():
    w, h = 26, 42
    s = Spr(w, h)
    C = 12.5
    # post (pointed top shows above the skull)
    for y in range(3, h):
        for x in range(11, 15):
            c = (POLEWOOD[1], POLEWOOD[3], POLEWOOD[4], POLEWOOD[5])[x - 11]
            if x == 12 and y % 7 == 3:
                c = POLEWOOD[2]
            s.puti(x, y, c)
    s.hline(12, 13, 2, POLEWOOD[5]); s.puti(12, 2, POLEWOOD[3])
    # stones at the foot
    boulder(s, 8.0, 40.0, 3.0, 2.4, ms.GREYROCK, lo=1)
    boulder(s, 17.5, 40.5, 2.4, 1.8, ms.GREYROCK, lo=1)
    s.hline(10, 15, h - 1, POLEWOOD[0])
    # horns behind the skull
    hl = Spr(w, h)
    for sg in (-1, 1):
        pts = [(C + sg * 4.5, 7.0), (C + sg * 8.5, 6.6), (C + sg * 10.6, 4.6), (C + sg * 11.0, 1.0)]
        stroke(hl, pts, lambda u: 3.4 - 2.2 * u, HORN, lo=1)
    for (x, y) in ((1, 0), (1, 1), (2, 0), (24, 0), (24, 1), (23, 0)):
        if hl.op(x, y):
            hl.puti(x, y, HORN[1] if x < 12 else HORN[2])
    selout(hl, [HORN], dirs=((0, 1), (-1, 0)))
    add_layer(s, hl)
    # skull face: half-widths per row
    half = {5: 4, 6: 6, 7: 6, 8: 6, 9: 6, 10: 7, 11: 8, 12: 8, 13: 7, 14: 6, 15: 5, 16: 4,
            17: 4, 18: 3, 19: 3, 20: 4, 21: 4, 22: 3}
    sk = Spr(w, h)
    for y, a in half.items():
        for x in range(w):
            if abs(x + 0.5 - (C + 0.5)) > a + 0.01:
                continue
            u = (x + 0.5 - (C + 0.5)) / a
            c = BONE[2] if u < -0.55 else BONE[3] if u < -0.05 else BONE[4] if u < 0.55 else BONE[5]
            if y == 5 or (y == 6 and abs(u) > 0.7):
                c = BONE[5] if u > -0.3 else BONE[4]
            sk.puti(x, y, c)
    # nasal ridge, cheek hollows under the orbits, eye sockets, nostrils
    for y in range(8, 20):
        sk.puti(12, y, BONE[4]); sk.puti(13, y, BONE[5])
    for (x, y) in ((8, 14), (9, 14), (9, 15), (16, 14), (17, 14), (16, 15)):
        sk.puti(x, y, BONE[2])
    EYE = hx("#1e1418")
    for (x, y) in ((7, 11), (8, 11), (9, 11), (7, 12), (8, 12), (9, 12), (8, 13), (9, 13),
                   (16, 11), (17, 11), (18, 11), (16, 12), (17, 12), (18, 12), (16, 13), (17, 13)):
        sk.puti(x, y, EYE)
    sk.puti(10, 12, BONE[2]); sk.puti(19, 12, BONE[4]); sk.puti(18, 13, BONE[3])
    for (x, y) in ((10, 20), (11, 20), (11, 21), (14, 20), (15, 20), (14, 21)):
        sk.puti(x, y, EYE)
    sk.puti(12, 6, BONE[2]); sk.puti(12, 7, BONE[3])             # suture
    selout(sk, [BONE], dirs=((0, 1), (-1, 0)))
    edge_cap(sk, [BONE], 4, dirs=((1, 0),))
    add_layer(s, sk, [POLEWOOD, HORN], sh=1)
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s, rows=1)
    return s


def rock_dark():
    """Dark basalt boulder pile: cool purple-brown faces, warm sun-caught
    upper edges."""
    w, h = 58, 38
    s = Spr(w, h)
    piles = [
        # (rx, ry, rz, ox, oy, seed, bias, nlon) back to front
        (9, 7, 12, 44, 30, 3, -0.02, 7),
        (10, 7, 13, 15, 31, 4, -0.04, 7),
        (13, 9, 20, 30, 34, 9, 0.0, 8),
        (8, 6, 10, 48, 37, 5, 0.0, 7),
        (9, 6, 11, 10, 37, 6, -0.02, 7),
        (5, 4, 6, 24, 37, 8, 0.02, 6),
        (4, 3, 4, 37, 37, 2, 0.04, 6),
    ]
    rng = random.Random(41)
    for (rx, ry, rz, ox, oy, sd, bb, nl) in piles:
        lay = Spr(w, h)
        v, t = rock_mesh(rng, rx, ry, rz, nlat=3, nlon=nl, noise=0.22)
        render_mesh(lay, v, t, ox, oy, BASALT, pitch=0.35, seed=sd, face_jitter=0.04, bias=bb)
        fill_holes(lay)
        # warm rim: top-edge pixels of the brighter facets catch the sun
        op = lay.opaque()
        for y in range(1, h):
            for x in range(w):
                if not op[y, x] or op[y - 1, x]:
                    continue
                ks = [BASALT.index(lay.get(x, y + d)) for d in (1, 2, 3)
                      if lay.get(x, y + d) in BASALT]
                k = max(ks) if ks else 0
                if k >= 4 and x > ox - rx * 0.6:
                    lay.puti(x, y, BASALT_RIM[1] if x > ox else BASALT_RIM[0])
                    c2 = lay.get(x, y + 1)
                    if c2 in BASALT and x > ox + rx * 0.2:
                        lay.puti(x, y + 1, BASALT[min(6, BASALT.index(c2) + 1)])
        add_layer(s, lay, [BASALT], sh=1)
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    return s


# ---- tiny quad renderer (yawed 3/4 views) -----------------------------------
def render_parts(w, h, parts, ox, oy, yaw, pitch=0.28, scale=1.0, light=L3):
    """parts: list of (quads, material) where quads are lists of 3D points
    (x across, y forward, z up) in object space.  The object is rotated by
    `yaw` (radians, clockwise seen from above) and projected like
    render_mesh.  Returns (material map, intensity map, face-id map,
    project function)."""
    cy_, sy_ = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)

    def rot(p):
        x, y, z = p
        return np.array([x * cy_ + y * sy_, -x * sy_ + y * cy_, z])

    def proj(p):
        x, y, z = rot(p) * scale
        return (ox + x, oy - (z * cp + y * sp), y * cp - z * sp)

    view = np.array([0.0, -cp, sp])
    faces = []
    for mi, (quads, mat) in enumerate(parts):
        allp = np.array([q for quad in quads for q in quad], float)
        cen = rot(allp.mean(axis=0))
        for quad in quads:
            P = [rot(np.array(q, float)) for q in quad]
            nrm = None
            for i in range(1, len(P) - 1):
                c = np.cross(P[i] - P[0], P[i + 1] - P[0])
                if np.linalg.norm(c) > 1e-9:
                    nrm = c / np.linalg.norm(c)
                    break
            if nrm is None:
                continue
            fc = np.mean(P, axis=0)
            if np.dot(nrm, fc - cen) < 0:
                nrm = -nrm
            if np.dot(nrm, view) <= 1e-4:
                continue
            S = [proj(q) for q in quad]
            depth = np.mean([q[2] for q in S])
            faces.append((depth, [(a, b) for a, b, _ in S], mat, float(np.dot(nrm, light)), nrm))
    faces.sort(key=lambda f: -f[0])
    matm = np.full((h, w), -1, int)
    inten = np.zeros((h, w))
    fid = np.full((h, w), -1, int)
    normals = []
    for k, (dep, pts, mat, it, nrm) in enumerate(faces):
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).polygon(pts, fill=255, outline=255)
        mm = np.array(m) > 0
        matm[mm] = mat; inten[mm] = it; fid[mm] = k
        normals.append(nrm)
    return matm, inten, fid, proj, normals


def loft(stations, closed=False):
    """stations: list of (y, [(x, z), ...]) with equal point counts.
    Returns quads between consecutive stations."""
    quads = []
    for (y0, p0), (y1, p1) in zip(stations, stations[1:]):
        n = len(p0)
        rng_ = range(n) if closed else range(n - 1)
        for j in rng_:
            k = (j + 1) % n
            quads.append([(p0[j][0], y0, p0[j][1]), (p0[k][0], y0, p0[k][1]),
                          (p1[k][0], y1, p1[k][1]), (p1[j][0], y1, p1[j][1])])
    return quads


def cap(y, pts):
    return [[(x, y, z) for x, z in pts]]


def wreck_geometry(tilt=0.075):
    """50s sedan: lofted lower body with tail fins, greenhouse cabin.  The
    nose is tilted down (sunk deeper).  Returns parts and a point transform."""
    def sec(hw, z0, z1, fin, c=2.5):
        zf = z1 + fin
        return [(-hw, z0 + c), (-hw, zf - 1.2), (-hw + 1.6, zf), (-hw + 4.5, z1),
                (hw - 4.5, z1), (hw - 1.6, zf), (hw, zf - 1.2), (hw, z0 + c),
                (hw - c, z0), (-hw + c, z0)]
    st = [(0.0, sec(13.5, 3.5, 12.0, 1.6, 3.0)), (2.0, sec(15.0, 2.5, 13.8, 2.4)),
          (8.0, sec(15.5, 2.0, 14.6, 1.6)), (14.0, sec(15.5, 2.0, 15.0, 0.6)),
          (40.0, sec(15.5, 2.0, 15.0, 0.6)), (52.0, sec(15.2, 2.0, 14.2, 0.8)),
          (58.0, sec(13.0, 3.0, 11.5, 0.4, 3.5))]
    T = lambda q: (q[0], q[1], q[2] - q[1] * tilt)
    body = [[T(q) for q in quad] for quad in loft(st, closed=True) + cap(0.0, st[0][1])]
    cabin_rear = [[T(q) for q in [(-13, 14, 15), (13, 14, 15), (9.5, 21, 23.0), (-9.5, 21, 23.0)]]]
    cabin_side = [[T(q) for q in [(13, 14, 15), (9.5, 21, 23.0), (9.5, 33, 23.0), (13, 39, 15)]]]
    roof = [[T(q) for q in [(-9.5, 21, 23.0), (9.5, 21, 23.0), (9.5, 33, 23.0), (-9.5, 33, 23.0)]]]
    bsec = sec(15.6, 2.4, 6.4, 0.0, 1.4)
    bump = [[T(q) for q in quad] for quad in loft([(-1.6, bsec), (0.5, bsec)], closed=True)
            + cap(-1.6, bsec)]
    parts = [(body, 0), (cabin_rear + roof, 0), (cabin_side, 0), (bump, 2)]
    return parts, T


def wreck():
    """Abandoned rusted-out 1950s car, rear 3/4 view, nose-down in a sand
    drift: no glass (dark empty openings), flat tyres, faded paint."""
    w, h = 82, 42
    s = Spr(w, h)
    parts, T = wreck_geometry()
    yaw = math.radians(33)
    LW = np.array([0.50, 0.05, 0.86]); LW = LW / np.linalg.norm(LW)
    matm, inten, fid, proj, normals = render_parts(w, h, parts, 21.0, 42.0, yaw, pitch=0.30,
                                                   scale=1.12, light=LW)
    n = len(RUST)
    INTER = hx("#26161c")
    rng = random.Random(12)
    for y in range(h):
        for x in range(w):
            m = matm[y, x]
            if m < 0:
                continue
            t = (inten[y, x] + 1) * 0.5
            if m == 2:
                b = clampi(int(t * 4.99), 0, 4)
                s.puti(x, y, (GREY[1], GREY[2], GREY[2], GREY[3], GREY[4])[b])
                continue
            b = clampi(int(math.floor((t - 0.2) / 0.8 * 5.0)) + 3, 3, n - 1)
            s.puti(x, y, RUST[b])
    rmask = s.opaque()

    def fill3d(pts, col_fn):
        P = [proj(T(q))[:2] for q in pts]
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).polygon(P, fill=255, outline=255)
        mm = np.array(m) > 0
        for y, x in zip(*np.nonzero(mm)):
            c = col_fn(x, y)
            if c is not None:
                s.puti(x, y, c)
        return mm

    # faded original paint: blobby patches on the upper body
    blobs = [(50, 26, 4.0), (31, 23, 3.0), (64, 22, 2.5)]
    mott = [(40, 30, 4.0), (56, 29, 3.5), (25, 31, 3.0), (70, 26, 3.0), (10, 33, 2.5),
            (44, 21, 2.0)]
    for y in range(h):
        for x in range(w):
            c = s.get(x, y)
            if c not in RUST:
                continue
            k = RUST.index(c)
            if any((x - bx) ** 2 + ((y - by) * 1.6) ** 2 < r * r for bx, by, r in blobs):
                s.puti(x, y, FADED[clampi(k - 3, 0, 3)])
            elif any((x - bx) ** 2 + ((y - by) * 1.3) ** 2 < r * r for bx, by, r in mott):
                s.puti(x, y, RUST[max(2, k - 2)])
    # glassless openings: side windows (rear door, front door), rear window
    def zx(z):
        return 13 - 3.5 * (z - 15) / 8.0 + 0.05
    win_side = [
        [(zx(16.5), 21.6, 16.5), (zx(21.8), 21.6, 21.8), (zx(21.8), 26.4, 21.8), (zx(16.5), 26.4, 16.5)],
        [(zx(16.5), 27.8, 16.5), (zx(21.8), 27.8, 21.8), (zx(21.8), 32.4, 21.8), (zx(16.5), 35.6, 16.5)],
    ]
    for poly in win_side:
        fill3d(poly, lambda x, y: INTER)
    rw = [(-10.4, 15.2, 16.6), (10.4, 15.2, 16.6), (7.8, 19.6, 22.0), (-7.8, 19.6, 22.0)]
    fill3d(rw, lambda x, y: INTER)
    # seat backs seen through the openings, a hint of the far windows
    for (xx, yy, zz, ww) in ((-5.5, 23.0, 18.4, 3), (5.5, 23.0, 18.4, 3)):
        px, py, _ = proj(T((xx, yy, zz)))
        s.rect(int(px) - ww // 2 - 1, int(py), int(px) + ww // 2, int(py) + 1, RUST[2])
        s.hline(int(px) - ww // 2 - 1, int(px) + ww // 2, int(py), RUST[3])
    # rust holes on the side panel
    for (hx_, hy_) in ((46, 27), (49, 26), (58, 24), (38, 29), (66, 22)):
        if s.get(hx_, hy_) in RUST:
            s.puti(hx_, hy_, RUST[0]); s.puti(hx_ + 1, hy_, RUST[1])
            if s.get(hx_, hy_ + 1) in RUST:
                s.puti(hx_, hy_ + 1, RUST[1])
    # tail-light sockets (empty, a shard of red lens) on the rear fenders
    for xx in (-11.0, 11.0):
        px, py, _ = proj(T((xx, -0.1, 11.0)))
        X, Y = int(round(px)), int(round(py))
        s.rect(X - 1, Y - 1, X, Y + 1, hx("#3a1418"))
        s.puti(X, Y - 1, RED[2])
    # wheel wells with flat tyres on the visible side
    for yy in (9.0, 47.0):
        px, py, _ = proj(T((15.6, yy, 5.5)))
        cx, cy = px, py
        for y in range(int(cy) - 6, int(cy) + 5):
            for x in range(int(cx) - 6, int(cx) + 6):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                if (dx / 4.6) ** 2 + (dy / 5.0) ** 2 <= 1 and s.op(x, y):
                    s.puti(x, y, hx("#1a1014"))
                if (dx / 4.0) ** 2 + ((dy - 1.8) / 2.8) ** 2 <= 1 and dy > 0:
                    s.puti(x, y, BLACK[2] if dx < 1.0 else BLACK[3])
    selout(s, [RUST, FADED, GREY], dirs=((0, 1), (-1, 0)))
    edge_cap(s, [RUST, FADED], 5)
    # sand drift: deeper toward the nose, heaped against the side
    sand = Spr(w, h)

    def stop(x):
        u = x / (w - 1)
        t = 39.0 - 9.0 * u ** 1.6 + 0.8 * math.sin(x * 0.29) + 0.6 * math.sin(x * 0.13 + 1)
        if x < 7:
            t += (7 - x) * 0.8
        if x > w - 9:
            t += (x - (w - 9)) * 1.2
        return int(round(t))
    for x in range(w):
        ti = stop(x)
        for y in range(ti, h):
            b = 3
            if y == ti:
                b = 4 if stop(x - 1) >= ti or x == 0 else 2
            elif y == ti + 1 and stop(x - 1) < ti:
                b = 2
            elif y == int(round(ti + 3 + 1.5 * math.sin(x * 0.09))) and (x // 9) % 3 != 2:
                b = 2
            sand.puti(x, y, SANDP[b])
    add_layer(s, sand, [RUST, FADED, GREY], sh=1)
    selout(s, [SANDP], dirs=((-1, 0),))
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    limit_palette(s, 24)
    return s


def pump_windmill():
    """Farm water-pump windmill: multi-blade fan wheel (seen at an angle,
    elliptical) with a tail vane, on a tapering steel lattice tower."""
    w, h = 50, 124
    s = Spr(w, h)
    S = STEEL
    BOT, TOP = 123, 34
    # leg x at height y (front legs), back legs a bit inside and darker
    def leg(xb, xt, y):
        return xb + (xt - xb) * (BOT - y) / (BOT - TOP)
    FL, FR = (11.0, 22.0), (38.0, 27.0)
    BL, BR = (16.0, 23.5), (33.0, 25.5)
    back = Spr(w, h)
    for (xb, xt) in (BL, BR):
        for y in range(TOP, BOT - 3):
            back.puti(int(round(leg(xb, xt, y))), y, S[2])
    # girts (horizontal) + X bracing on the front face: panels shrink upward
    girts = [BOT - 4]
    while girts[-1] > TOP + 6:
        wd = leg(*FR, girts[-1]) - leg(*FL, girts[-1])
        girts.append(int(round(girts[-1] - wd * 0.85)))
    girts[-1] = TOP + 2
    br = Spr(w, h)
    for y0, y1 in zip(girts, girts[1:]):
        xl0, xr0 = leg(*FL, y0), leg(*FR, y0)
        xl1, xr1 = leg(*FL, y1), leg(*FR, y1)
        br.line(xl0 + 1, y0, xr1 - 1, y1, S[3])
        br.line(xr0 - 1, y0, xl1 + 1, y1, S[3])
    for y in girts:
        xl, xr = leg(*FL, y), leg(*FR, y)
        br.hline(int(round(xl)), int(round(xr)), y, S[4])
        br.hline(int(round(xl)) + 1, int(round(xr)) - 1, y + 1, S[1])
    add_layer(s, back)
    add_layer(s, br)
    # pump rod down the middle + pump head / pipe at the foot
    for y in range(TOP, BOT - 5):
        s.puti(24, y, S[2]); s.puti(25, y, S[4])
    s.rect(22, BOT - 8, 27, BOT - 1, S[3]); s.vline(22, BOT - 8, BOT - 1, S[1])
    s.vline(27, BOT - 8, BOT - 1, S[5]); s.hline(22, 27, BOT - 8, S[5])
    s.rect(27, BOT - 5, 31, BOT - 4, S[2]); s.hline(27, 31, BOT - 5, S[4])      # spout
    # front legs (2 px steel angles) + footings
    for (xb, xt) in (FL, FR):
        for y in range(TOP, BOT + 1):
            x = int(round(leg(xb, xt, y)))
            s.puti(x, y, S[2]); s.puti(x + 1, y, S[5] if xb > 25 else S[4])
        x = int(round(xb))
        s.rect(x - 2, BOT - 2, x + 3, BOT, GREY[3]); s.hline(x - 2, x + 3, BOT - 2, GREY[5])
        s.vline(x - 2, BOT - 2, BOT, GREY[1])
    # small work platform under the head
    s.rect(15, 38, 34, 39, WOOD[3]); s.hline(15, 34, 38, WOOD[5]); s.hline(15, 34, 40, WOOD[1])
    for x in range(17, 34, 4):
        s.puti(x, 39, WOOD[2])
    # head: gearbox + mast
    s.rect(21, 26, 28, 33, S[3]); s.vline(21, 26, 33, S[1]); s.vline(28, 26, 33, S[5])
    s.hline(21, 28, 26, S[5])
    # tail boom + vane (behind the wheel, receding up-right)
    s.line(26, 24, 41, 18, S[2]); s.line(26, 23, 41, 17, S[4])
    vane = [(38.0, 13.0), (49.0, 8.0), (49.0, 25.0), (38.0, 23.0)]
    m = s.mask_poly(vane)
    for y, x in zip(*np.nonzero(m)):
        c = S[5]
        if x <= 38 or y >= 24 - (x - 38) * 0.18:
            c = S[2]
        elif y <= 13 - (x - 38) * 0.45 + 1:
            c = S[6]
        elif x >= 48:
            c = S[4]
        s.puti(x, y, c)
    s.line(39, 18, 48, 16, S[3])                          # vane stiffener
    # fan wheel: elliptical (turned ~40 deg), 18 twisted blades between rings
    whl = Spr(w, h)
    CX, CY, RX, RY = 20.0, 22.0, 15.0, 19.5
    NB = 18
    for y in range(h):
        for x in range(w):
            u = (x + 0.5 - CX) / RX; v = (y + 0.5 - CY) / RY
            r = math.hypot(u, v)
            if r > 1.0:
                continue
            th = math.atan2(v, u)
            lit = (u * 0.6 - v * 0.8)                  # upper-right blades brighter
            if r > 0.93:                               # outer rim
                whl.puti(x, y, S[2] if lit < 0.2 else S[4])
                continue
            if 0.36 < r < 0.45:                        # inner ring
                whl.puti(x, y, S[2] if lit < 0.0 else S[3])
                continue
            if r <= 0.17:                              # hub
                whl.puti(x, y, S[1] if lit < -0.05 else (S[5] if lit > 0.08 else S[3]))
                continue
            f = ((th / (2 * math.pi)) * NB + 0.25) % 1.0
            if r < 0.36:                               # spokes
                if f < 0.18 and int((th / (2 * math.pi)) * NB + 0.25) % 3 == 0:
                    whl.puti(x, y, S[3])
                continue
            if f < 0.72:                               # blade: twisted sail
                b = 4 if f < 0.36 else 3
                b += 1 if lit > 0.35 else (-1 if lit < -0.35 else 0)
                whl.puti(x, y, S[clampi(b, 1, 6)])
    selout(whl, [S], dirs=((0, 1), (-1, 0)), mask=None)
    add_layer(s, whl, [S, WOOD], sh=1)
    remove_orphans(s)
    bottom_fix(s)
    centre_on_base(s)
    return s


# ==========================================================================
# 3) ROAD FORK SIGN + ICONS
# ==========================================================================
SIGN_G = hx("#167a46")           # flat panel colour (icon squares use exactly this)
SIGN_W = hx("#f4f4ec")
SIGN_O = hx("#0c241a")
# exact runtime icon squares (top-left x, y; 18x18) -- engine paints icons here
FORK_ICON_SIZE = 18
FORK_ICON_LEFT = (9, 17)
FORK_ICON_RIGHT = (104, 17)


def fork_sign():
    """Big road-fork sign: wide board on two steel posts, split into two
    green panels with bold white arrows (up-left / up-right).  Each panel
    keeps a clean 18x18 square of flat panel colour on its outer side for
    the destination icon the engine paints at runtime."""
    w, h = 132, 84
    s = Spr(w, h)
    S = STEEL
    # posts (square steel tubes, 8 px) + concrete footings
    for x0 in (29, 95):
        for y in range(40, h):
            for k, c in enumerate((S[1], S[2], S[3], S[3], S[3], S[4], S[5], S[4])):
                s.puti(x0 + k, y, c)
        for y in range(54, h - 5, 8):                       # bolt bands
            s.hline(x0, x0 + 7, y, S[5]); s.hline(x0, x0 + 7, y + 1, S[2])
            s.puti(x0, y, S[2])
        s.rect(x0 - 2, h - 4, x0 + 9, h - 1, GREY[3])
        s.hline(x0 - 2, x0 + 9, h - 4, GREY[5]); s.vline(x0 - 2, h - 4, h - 1, GREY[1])
        s.vline(x0 + 9, h - 3, h - 1, GREY[4])
    selout(s, [S, GREY], dirs=((-1, 0),))
    # board: face x 2..128, y 1..50; top edge sliver + right thickness
    X0, X1, Y0, Y1 = 2, 128, 1, 50
    s.hline(X0 + 1, X1 + 1, Y0 - 1, GREY[5])
    s.vline(X1 + 1, Y0, Y1, GREY[2])
    s.rect(X0, Y0, X1, Y1, SIGN_O)
    s.rect(X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, SIGN_W)
    PY0, PY1 = Y0 + 3, Y1 - 3                                 # panel rows 4..47
    s.rect(X0 + 3, PY0, 62, PY1, SIGN_G)                      # left panel 5..62
    s.rect(68, PY0, X1 - 3, PY1, SIGN_G)                      # right panel 68..125
    s.vline(65, Y0 + 1, Y1 - 1, SIGN_O)                       # centre seam
    # left arrow, built on diagonal coordinates u = x + y, v = x - y so every
    # edge is a clean horizontal, vertical or 45-degree pixel line:
    # stem rises on the inner side, turns up-left into a 90-degree head.
    V0, V1 = 18, 28                    # shaft band (11 px across the diagonal)
    UB, L = 63, 16                     # head base line u = UB, head length
    vc = (V0 + V1) / 2.0
    for y in range(PY0, PY1 + 1):
        for x in range(X0 + 3, 63):
            u, v = x + y, x - y
            stem = 51 <= x <= 58 and 33 <= y <= 45
            shaft = V0 <= v <= V1 and u >= UB and x <= 58 and y <= 45
            head = UB - L <= u < UB and abs(v - vc) <= (u - (UB - L)) + 0.5
            if stem or shaft or head:
                s.puti(x, y, SIGN_W)
    # mirror the left panel's arrow into the right panel (x' = 130 - x)
    for y in range(PY0, PY1 + 1):
        for x in range(X0 + 3, 63):
            if s.get(x, y) == SIGN_W:
                s.puti(130 - x, y, SIGN_W)
    # guarantee the icon squares are flat panel colour
    for (ix, iy) in (FORK_ICON_LEFT, FORK_ICON_RIGHT):
        s.rect(ix, iy, ix + FORK_ICON_SIZE - 1, iy + FORK_ICON_SIZE - 1, SIGN_G)
    bottom_fix(s)
    return s


def outline_icon(s, col=OUTLINE):
    outer_outline(s, col, dirs=((0, 1), (0, -1), (1, 0), (-1, 0)))


def icon_from(rows, pal):
    s = grid_sprite(rows, pal)
    return s


IC_O = "#2a1a2e"


def icon_layer(w, h, fill_fn):
    """Icon layer from a per-pixel colour function (None = empty)."""
    L = Spr(w, h)
    for y in range(h):
        for x in range(w):
            c = fill_fn(x, y)
            if c is not None:
                L.puti(x, y, hx(c) if isinstance(c, str) else c)
    return L


def icon_stack(w, h, layers, final_outline=True):
    """Composite layers back to front; each layer gets its own 1 px dark
    outline first so overlapping shapes stay separated."""
    s = Spr(w, h)
    for L in layers:
        outer_outline(L, hx(IC_O))
        add_layer(s, L)
    return s


def icon_coast():
    pal = {"o": IC_O, "g": "#1f6a2c", "G": "#3f9a36", "L": "#8ccc4a", "t": "#7a4a2c",
           "T": "#c08a4c", "c": "#5a3420", "b": "#1d4c9c", "B": "#3a7fd8", "S": "#86c8f6",
           "W": "#f6f8f0"}
    rows = [
        "......ooo.oo....",
        "...oooLLLoLLoo..",
        "..oLLGGGGLGGLLo.",
        ".oGGGgoGGGogGGGo",
        ".oGgo.ocTco.ogGo",
        ".ogo..otTo...ogo",
        "..o...otTo....o.",
        "......otTo......",
        "......otTo......",
        ".....otTo.......",
        ".....otTo..ooo..",
        ".oo..otTo.oWWWo.",
        "oWWoootTooWSSBWo",
        "oSBWWBBBBWWBBBBo",
        "obbBBBbbBBBBbbbo",
        ".oooooooooooooo.",
    ]
    return icon_from(rows, pal)


def icon_highway():
    """Grey road with white lane dashes running to a small skyscraper."""
    w = h = 16
    K = ("#26365a", "#3e5c92", "#6c94c8")
    Y = "#ffd860"

    def towers(x, y):
        if 6 <= x <= 9 and 1 <= y <= 7:                        # skyscraper
            if x in (7, 9) and y in (2, 4, 6):
                return Y
            return K[0] if x == 6 else (K[1] if x == 7 else K[2])
        return None

    def blocks(x, y):
        if 1 <= x <= 3 and 4 <= y <= 7:                        # low block left
            if x == 2 and y in (5, 7):
                return Y
            return K[0] if x == 1 else K[1]
        if 12 <= x <= 14 and 3 <= y <= 7:                      # block right
            if x == 13 and y in (4, 6):
                return Y
            return K[1] if x == 12 else K[2]
        return None

    def road(x, y):
        if not 8 <= y <= 14:
            return None
        hw = 1.0 + (y - 8) * 1.0
        d = x + 0.5 - 8.0
        if abs(d) > hw + 0.01:
            return None
        if 7 <= x <= 8 and y in (9, 11, 12, 14):
            return "#f4f4ec"
        if abs(d) > hw - 1.0:
            return "#3c3c48"
        return "#5e5e6c" if d < 0 else "#787886"
    return icon_stack(w, h, [icon_layer(w, h, blocks), icon_layer(w, h, towers),
                             icon_layer(w, h, road)])


def icon_vineyard():
    pal = {"o": IC_O, "1": "#3a1c5c", "2": "#6a34a2", "3": "#9c66d8", "4": "#e2ccff",
           "s": "#7a4a2c", "g": "#2a7a30", "G": "#5aaa3c", "L": "#a2d65a"}
    rows = [
        "......oo..ooo...",
        ".....oso.oLLGo..",
        "......osooGLGGo.",
        "...ooooosoGGggo.",
        "..o234o2o4ooggo.",
        ".o2234o234o4oo..",
        ".o1223o123o34o..",
        "..o11o234o223o..",
        "..o23o334o123o..",
        "..o224o12o11o...",
        "...o11o234o.....",
        "...o234o34o.....",
        "....o2o123o.....",
        "....oo234o......",
        "......o11o......",
        ".......oo.......",
    ]
    return icon_from(rows, pal)


def icon_forest():
    """Dark green fir tree: three stacked tiers, lit right, shaded undersides."""
    w = h = 16
    G = ("#0c2e1e", "#185232", "#2a7440", "#5aa452")
    tiers = [(7, 13, 2.0, 6.5), (4, 10, 1.5, 5.0), (1, 6, 0.5, 3.5)]  # top, bottom, hw0, hw1
    layers = []
    trunk = icon_layer(w, h, lambda x, y: ("#5a3424" if x == 7 else "#8a5a36")
                       if 7 <= x <= 8 and 13 <= y <= 14 else None)
    layers.append(trunk)
    for (t, b, h0, h1) in tiers:
        def f(x, y, t=t, b=b, h0=h0, h1=h1):
            if not t <= y <= b:
                return None
            hw = h0 + (h1 - h0) * (y - t) / max(1, b - t)
            d = x + 0.5 - 8.0
            if abs(d) > hw + 0.01:
                return None
            if y == b:
                return G[0] if d < 0 else G[1]
            if d > hw - 1.2 and d > 0:
                return G[3]
            return G[1] if d < -0.5 else G[2]
        layers.append(icon_layer(w, h, f))
    return icon_stack(w, h, layers)


def icon_desert():
    """Green saguaro in front of an orange sun setting behind a red mesa."""
    w = h = 16

    def sun(x, y):
        d = math.hypot(x + 0.5 - 10.5, y + 0.5 - 5.5)
        if d > 4.3:
            return None
        return "#fff0a0" if (x + 0.5 - 10.5) - (y + 0.5 - 5.5) > 2.2 else \
            ("#ffc840" if d < 3.0 else "#f5902a")

    def mesa(x, y):
        if 9 <= y <= 13:
            xl = 8.0 - (y - 9) * 0.8
            xr = 14.0
            if xl <= x + 0.5 <= xr + 0.5:
                if y == 9:
                    return "#e8955a"
                return "#9a3a26" if x + 0.5 < xl + 2.5 else "#c45a30"
        return None

    def cactus(x, y):
        if x in (4, 5) and 2 <= y <= 14:
            return "#2a6e30" if x == 4 else "#62a844"
        if x == 2 and 5 <= y <= 9:
            return "#2a6e30"
        if y == 9 and x == 3:
            return "#3c8a38"
        if x == 7 and 4 <= y <= 8:
            return "#62a844"
        if y == 8 and x == 6:
            return "#3c8a38"
        return None
    ground = icon_layer(w, h, lambda x, y: ("#d8b070" if x > 7 else "#c09456")
                        if y == 14 and 1 <= x <= 14 else None)
    return icon_stack(w, h, [icon_layer(w, h, sun), icon_layer(w, h, mesa), ground,
                             icon_layer(w, h, cactus)])


def icon_valley():
    pal = {"o": IC_O, "h": "#8a7462", "H": "#c8b48e", "1": "#958676", "2": "#cfc4ae",
           "3": "#f6f0dc", "e": "#2a1a2e"}
    rows = [
        "oo............oo",
        "oHo..........oHo",
        "ohHo........oHHo",
        ".ohHoooooooooHho",
        "..ohH2223333HHo.",
        "...o12223333o...",
        "..o122223333o...",
        "..o1ee2233ee3o..",
        "..o1eee23eee3o..",
        "...o1e2233e3o...",
        "...o12223333o...",
        "....o122333o....",
        "....o122333o....",
        "....o1e23e3o....",
        ".....o1223o.....",
        "......oooo......",
    ]
    s = icon_from(rows, pal)
    return s


# ---- weather icons 12x12 ------------------------------------------------------
def wx_sun():
    w = h = 12

    def f(x, y):
        dx, dy = x + 0.5 - 6.0, y + 0.5 - 6.0
        d = math.hypot(dx, dy)
        if d <= 3.2:
            if dx - dy > 1.6:
                return "#fff4a8"
            return "#ffd23a" if dx + dy < 2.0 else "#f5a524"
        # 4 straight rays + 4 diagonal ray dots
        if (abs(dx) < 0.6 and 4.0 < abs(dy) < 5.6) or (abs(dy) < 0.6 and 4.0 < abs(dx) < 5.6):
            return "#ffd23a"
        if abs(abs(dx) - abs(dy)) < 0.6 and 3.6 < d < 5.0:
            return "#f5a524"
        return None
    return icon_stack(w, h, [icon_layer(w, h, f)])


def wx_rain():
    pal = {"o": IC_O, "1": "#7c8090", "2": "#a8acb8", "3": "#dcdee6", "b": "#3a8ef0",
           "B": "#8cc8ff", "y": "#ffe040"}
    rows = [
        "....ooo.....",
        "..oo233oo...",
        ".o22333332o.",
        "o1222333322o",
        "o1112222221o",
        ".o11111111o.",
        "..oooyoooo..",
        ".obo.oyo.ob.",
        ".ob.oyyo.ob.",
        "ob..oyo.ob..",
        "ob...oo.ob..",
        ".o.......o..",
    ]
    return icon_from(rows, pal)


def wx_fog():
    """Three gently wavy pale grey bands."""
    w = h = 12
    layers = []
    for k, (yb, x0, x1) in enumerate(((1, 1, 9), (5, 2, 10), (9, 1, 9))):
        def f(x, y, yb=yb, x0=x0, x1=x1, k=k):
            if not x0 <= x <= x1:
                return None
            off = 1 if ((x - x0 + k * 2) // 3) % 2 else 0
            if y == yb + off:
                return "#f0f2f6"
            if y == yb + off + 1 and False:
                return "#c8ccd4"
            return None
        layers.append(icon_layer(w, h, f))
    s = Spr(w, h)
    for L in layers:
        add_layer(s, L)
    outer_outline(s, hx(IC_O))
    return s


def wx_sand():
    """Orange wind streaks with a curl, flying sand grains."""
    w = h = 12
    O = ("#b8541e", "#ee8a2a", "#ffc060")

    def streaks(x, y):
        if y == 2 and 1 <= x <= 7:
            return O[1]
        if (x, y) in ((8, 2), (9, 3), (9, 4), (8, 5), (7, 4)):
            return O[0] if x < 8 else O[1]                      # curl
        if y == 6 and 0 <= x <= 9:
            return O[2] if x < 6 else O[1]
        if y == 9 and 2 <= x <= 8:
            return O[1]
        if (x, y) in ((9, 10), (10, 9)):
            return O[0]
        return None
    s = icon_stack(w, h, [icon_layer(w, h, streaks)])
    for (x, y) in ((10, 1), (11, 6), (0, 10), (5, 11), (11, 11)):
        if not s.op(x, y):
            s.puti(x, y, hx("#e8b878"))
    return s


def wx_heat():
    """Three wavy orange-red heat lines rising over a small sun."""
    w = h = 12

    def lines(x, y):
        if y > 6:
            return None
        for bx in (1, 5, 9):
            off = (0, 0, 1, 1)[(y + bx // 2) % 4]
            if x == bx + off:
                return "#ff7a30" if (y // 2) % 2 else "#ffa040"
        return None

    def sun(x, y):
        d = math.hypot(x + 0.5 - 6.0, y + 0.5 - 11.0)
        if d <= 3.9 and y <= 10:
            return "#fff0a0" if (x > 6 and y < 9) else ("#ffb43a" if d < 3.0 else "#f07a2a")
        return None
    return icon_stack(w, h, [icon_layer(w, h, sun), icon_layer(w, h, lines)])


# ==========================================================================
# registry / save / preview
# ==========================================================================
SPRITES = [
    ("saguaro", saguaro), ("cactus", cactus), ("mesa_rock", mesa_rock),
    ("tumbleweed", tumbleweed), ("gas_station", gas_station), ("desert_bush", desert_bush),
    ("dead_tree", dead_tree), ("tele_pole", tele_pole), ("skull_post", skull_post),
    ("rock_dark", rock_dark), ("wreck", wreck), ("pump_windmill", pump_windmill),
    ("fork_sign", fork_sign),
    ("icon_coast", icon_coast), ("icon_highway", icon_highway),
    ("icon_vineyard", icon_vineyard), ("icon_forest", icon_forest),
    ("icon_desert", icon_desert), ("icon_valley", icon_valley),
    ("wx_sun", wx_sun), ("wx_rain", wx_rain), ("wx_fog", wx_fog), ("wx_sand", wx_sand),
    ("wx_heat", wx_heat),
]
ICONS = {"icon_coast", "icon_highway", "icon_vineyard", "icon_forest", "icon_desert",
         "icon_valley", "wx_sun", "wx_rain", "wx_fog", "wx_sand", "wx_heat"}


def save(s, name):
    """Write out/<name>.png (alpha 0/255).  Refuses to overwrite a file this
    generator did not write (tagged via a PNG text chunk)."""
    p = os.path.join(OUT, name + ".png")
    if os.path.exists(p):
        try:
            tag = Image.open(p).info.get("generator")
        except Exception:
            tag = None
        if tag != GEN_TAG:
            raise SystemExit("refusing to overwrite %s (not written by %s)" % (p, GEN_TAG))
    a = s.a.copy()
    a[..., 3] = np.where(a[..., 3] > 0, 255, 0)
    a[a[..., 3] == 0] = 0
    info = PngInfo()
    info.add_text("generator", GEN_TAG)
    Image.fromarray(a, "RGBA").save(p, pnginfo=info)


def check(s, name):
    a = s.a
    al = set(np.unique(a[..., 3]).tolist())
    op = a[..., 3] > 0
    ncol = len(set(map(tuple, a[op][:, :3].tolist())))
    msg = "%-14s %3dx%-3d cols=%2d" % (name, s.w, s.h, ncol)
    assert al <= {0, 255}, name + " alpha"
    if name not in ICONS:
        assert op[-1].any(), name + " bottom row empty"
        xs = np.nonzero(op[-1])[0]
        mid = (xs.min() + xs.max()) / 2.0
        msg += " base %d..%d (mid %.1f / centre %.1f)" % (xs.min(), xs.max(), mid, (s.w - 1) / 2)
    print(msg)


PREVIEW_ROWS = [
    ["saguaro", "cactus", "mesa_rock", "tumbleweed", "gas_station", "desert_bush"],
    ["dead_tree", "tele_pole", "skull_post", "rock_dark", "wreck", "pump_windmill"],
    ["fork_sign", "icon_coast", "icon_highway", "icon_vineyard", "icon_forest", "icon_desert",
     "icon_valley", "wx_sun", "wx_rain", "wx_fog", "wx_sand", "wx_heat"],
]
BG_MID = (128, 128, 128)
BG_DARK = (30, 28, 38)


def preview(fname=os.path.join(HERE, "preview_routes_b.png"), zoom=4, pad=6):
    rows = []
    for names in PREVIEW_ROWS:
        ims = []
        for n in names:
            p = os.path.join(OUT, n + ".png")
            if os.path.exists(p):
                ims.append(Image.open(p).convert("RGBA"))
        if ims:
            rows.append(ims)
    if not rows:
        return
    W = max(sum(im.width for im in r) + pad * (len(r) + 1) for r in rows)
    Hp = sum(max(im.height for im in r) + pad for r in rows) + pad
    sheet = Image.new("RGBA", (W, Hp * 2), BG_MID + (255,))
    sheet.paste(Image.new("RGBA", (W, Hp), BG_DARK + (255,)), (0, Hp))
    for panel in range(2):
        y = panel * Hp + pad
        for r in rows:
            hm = max(im.height for im in r)
            x = pad
            for im in r:
                sheet.alpha_composite(im, (x, y + hm - im.height))
                x += im.width + pad
            y += hm + pad
    sheet = sheet.resize((W * zoom, Hp * 2 * zoom), Image.NEAREST)
    sheet.convert("RGB").save(fname)


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for name, fn in SPRITES:
        if only and name not in only:
            continue
        s = fn()
        check(s, name)
        save(s, name)
    preview()


if __name__ == "__main__":
    main()

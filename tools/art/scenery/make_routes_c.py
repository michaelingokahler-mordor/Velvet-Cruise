#!/usr/bin/env python3
"""Velvet Cruise -- route scenery, batch C: NEON CITY (downtown at night,
Vegas strip / Miami vice / synthwave, reached after the desert).

  city_lamp_lit        modern steel street light, LED head reaching right
  neon_palm_lit        strip palm, trunk wrapped in pink + cyan LED spirals
  neon_blade_[a-d]_lit vertical blade signs hanging off a facade
  neon_billboard_lit   synthwave billboard on two steel legs
  neon_arch_lit        neon truss arch over the road (gantry.png frame)
  food_cart_lit        hot-dog cart, striped umbrella, warm counter lamp
  bus_stop_lit         glass bus shelter with a back-lit advert
  hydrant              red fire hydrant
  signal_lit           traffic signal pole (green lit) + push-button box
  icon_city / wx_moon  destination + weather icons

Pillow + numpy only.  Reuses the helpers of make_scenery.py / make_routes_a.py
/ make_routes_b.py (imported, never modified).  Writes the PNGs into ./out/
(refusing to overwrite any file this generator did not write) and a 4x
preview sheet ./preview_routes_c.png (mid-grey panel over a dark navy one).

Night glow rules (engine):
  * `_lit` sprites: pixels with luma (0.3R+0.59G+0.11B) > 200 ignore the night
    tint.
  * `neon_` sprites additionally: max channel >= 220 and max-min >= 90.
Every light colour used here is registered in LIGHTS and verified to glow;
every other pixel is verified to stay clearly below both thresholds (bodies
are neutral; neon housings keep their brightest channel < 190).

Conventions (see ../STYLE.md): alpha 0/255 only, bottom row = ground contact,
object centred on its base, sun ahead/right/high, selective dark outline,
no text / letters / numbers / logos anywhere.

Run:  python3 -B make_routes_c.py               (all sprites + preview)
      python3 -B make_routes_c.py hydrant ...   (only these, + preview)
"""
import math
import os
import random
import sys

import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_scenery as ms  # noqa: E402
from make_scenery import (  # noqa: E402
    Spr, hx, ramp, clampi, selout, outer_outline, remove_orphans, bottom_fix, stroke,
    add_layer, limit_palette, palm_trunk, frond_layer, paste_with_shadow, coconuts,
    silhouette_palm, OUTLINE, STEEL, RED, WHITE, WOOD, PALM_G, PALM_Y, PALM_DEAD, TRUNK,
    COCO, BLACK,
)
import make_routes_a as ra  # noqa: E402
import make_routes_b as rb  # noqa: E402

OUT = os.path.join(HERE, "out")
GEN_TAG = "make_routes_c"

# --------------------------------------------------------------------------
# light colours (registered -> verified to glow)
# --------------------------------------------------------------------------
NEON = {                     # edge colour, near-white core
    "pink": (hx("#ff3ab0"), hx("#fff0fa")),
    "cyan": (hx("#3af0ff"), hx("#e8ffff")),
    "yellow": (hx("#ffe04a"), hx("#fffbe0")),
    "violet": (hx("#b46aff"), hx("#f6ecff")),
    "orange": (hx("#ff7a3a"), hx("#fff0e4")),
    "green": (hx("#5aff8a"), hx("#eeffef")),
}
BULB_A, BULB_B = hx("#fff6c8"), hx("#ffd860")          # marquee bulbs
LED_RIM, LED_CORE = hx("#cfe6ff"), hx("#f4faff")         # cool-white LED lens
WARM_RIM, WARM_CORE = hx("#ffd870"), hx("#fff2b0")       # warm lamp
SIG_G1, SIG_G2, SIG_G3 = hx("#84ffb4"), hx("#a6ffc8"), hx("#e4fff0")  # lit green signal
SUN_Y, SUN_O = hx("#ffc23a"), hx("#ff5a78")              # billboard sun bands (neon rule)
STAR_W = hx("#f4f0ff")
# back-lit advert (pastel, luma > 200)
ADV = [hx(c) for c in ("#fff0b0", "#ffe0b4", "#ffd0d8", "#f0d4ff", "#c8f4ff", "#fffbea",
                       "#ffc8e0", "#d8eaff")]

LIGHTS = set()
for e, c in NEON.values():
    LIGHTS |= {e, c}
LIGHTS |= {BULB_A, BULB_B, LED_RIM, LED_CORE, WARM_RIM, WARM_CORE, SIG_G1, SIG_G2, SIG_G3,
           SUN_Y, SUN_O, STAR_W}
LIGHTS |= set(ADV)

# --------------------------------------------------------------------------
# body palettes (neutral; housings < 190 brightest channel)
# --------------------------------------------------------------------------
BOXM = ramp("#141220", "#1e1a2a", "#2a2636", "#383446", "#4a4658", "#5e5a6e", "#767288",
            "#8e8aa0")                                       # dark sign-box metal
S5 = [STEEL[0], STEEL[1], STEEL[2], STEEL[3], STEEL[4], hx("#a6aebc")]   # steel, max < 190
CONC = ra.CONC
GLASSR = ramp("#3a5866", "#56808c", "#78a4ac", "#9cc4c8", "#b4d6d6")       # shelter glass
TAN = ramp("#3a2420", "#5e3a2a", "#83573a", "#a8784a", "#c99a62")
MUST = ramp("#5a3410", "#94601a", "#c48a24", "#e2ae34")                  # mustard (luma<200)
KETCH = ramp("#3a1020", "#6e1a26", "#a32630", "#d03a36", "#ea5a48")
CREAM = ramp("#6e6672", "#9c94a0", "#c4bcbc", "#e0d8cc")
ADV_INK = ramp("#4a2a5e", "#7a4a8e")                    # advert palm silhouette
SIGBK = ramp("#121018", "#1c1a24", "#28262e", "#383640", "#4a4852", "#5e5c66")
REFL = hx("#d8b03a")


def luma(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def glows(c, neon):
    if luma(c) > 200:
        return True
    return neon and max(c) >= 220 and max(c) - min(c) >= 90


def safe(c, neon):
    """Clearly non-glowing (margin below both thresholds)."""
    if luma(c) > 192:
        return False
    if neon and max(c) >= 205 and max(c) - min(c) >= 80:
        return False
    return True


# --------------------------------------------------------------------------
# mask / line helpers
# --------------------------------------------------------------------------
D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
D8 = D4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def shifted(m, dx, dy):
    """out[y, x] = m[y - dy, x - dx] (False outside)."""
    H, W = m.shape
    out = np.zeros_like(m)
    ys = slice(max(0, dy), H + min(0, dy)); xs = slice(max(0, dx), W + min(0, dx))
    ys2 = slice(max(0, -dy), H + min(0, -dy)); xs2 = slice(max(0, -dx), W + min(0, -dx))
    out[ys, xs] = m[ys2, xs2]
    return out


def dilate(m, dirs=D4, n=1):
    for _ in range(n):
        o = m.copy()
        for dx, dy in dirs:
            o |= shifted(m, dx, dy)
        m = o
    return m


def erode(m, dirs=D4):
    o = m.copy()
    for dx, dy in dirs:
        o &= shifted(m, dx, dy)
    return o


def bres(x0, y0, x1, y1):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
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


def perfect(pts):
    """Drop L-elbows so a 1 px path stays clean and 8-connected."""
    out = []
    for p in pts:
        if out and out[-1] == p:
            continue
        out.append(p)
        if len(out) >= 3:
            a, b, c = out[-3], out[-2], out[-1]
            if abs(a[0] - c[0]) == 1 and abs(a[1] - c[1]) == 1:
                out.pop(-2)
    return out


def polyline(pts, closed=False):
    P = [(int(round(x)), int(round(y))) for x, y in pts]
    if closed:
        P = P + [P[0]]
    out = []
    for a, b in zip(P, P[1:]):
        seg = bres(a[0], a[1], b[0], b[1])
        out.extend(seg if not out else seg[1:])
    if len(P) == 1:
        out = P
    return perfect(out)


def curve(fn, n=240):
    """Sample fn(t)->(x, y), t in 0..1, into a clean 1 px pixel path."""
    pts = []
    for k in range(n + 1):
        x, y = fn(k / n)
        q = (int(math.floor(x)), int(math.floor(y)))
        if pts and q == pts[-1]:
            continue
        if pts and max(abs(q[0] - pts[-1][0]), abs(q[1] - pts[-1][1])) > 1:
            pts.extend(bres(pts[-1][0], pts[-1][1], q[0], q[1])[1:])
        else:
            pts.append(q)
    return perfect(pts)


def pmask(w, h, pts):
    m = np.zeros((h, w), bool)
    for x, y in pts:
        if 0 <= x < w and 0 <= y < h:
            m[y, x] = True
    return m


def ell_mask(w, h, cx, cy, rx, ry):
    yy, xx = np.mgrid[0:h, 0:w]
    return ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1.0


def ring_path(cx, cy, rx, ry, a0=0.0, a1=360.0, n=360):
    def f(t):
        a = math.radians(a0 + (a1 - a0) * t)
        return cx + rx * math.cos(a), cy - ry * math.sin(a)
    return curve(f, n)


# --------------------------------------------------------------------------
# neon tubes
# --------------------------------------------------------------------------
class Neon:
    """Neon tubes, painted back to front in the order they were added.  Each
    tube = 1 px near-white core + coloured halo (4-neighbours -> 3 px tube).
    Parts of one shape go in ONE call (list of paths) so their halos never
    cut their own cores.  gap=n knocks the tubes behind out by n px around
    this one (restoring the backing), the way real tubes avoid crossing."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.items = []

    def path(self, pts, col, dirs=D4, restrict=None, core=True, gap=0, gap_only=None):
        self.items.append((pmask(self.w, self.h, pts), col, dirs, restrict, core, gap,
                           gap_only))

    def paths(self, plist, col, **kw):
        self.path([p for pts in plist for p in pts], col, **kw)

    def mask(self, m, col, dirs=D4, restrict=None, core=True, gap=0, gap_only=None):
        self.items.append((m.copy(), col, dirs, restrict, core, gap, gap_only))

    def render(self, s):
        base = s.a.copy()
        names = list(NEON)
        owner = -np.ones((self.h, self.w), int)          # neon colour index per pixel
        for m, col, dirs, rest, core, gap, gap_only in self.items:
            halo = dilate(m, dirs) & ~m if dirs else np.zeros_like(m)
            if rest is not None:
                halo &= rest
            foot = m | halo
            if gap:
                clr = dilate(foot, D8, gap) & (owner >= 0) & ~foot
                if gap_only is not None:
                    clr &= np.isin(owner, [names.index(c) for c in gap_only])
                s.a[clr] = base[clr]
                owner[clr] = -1
            s.fill(halo, NEON[col][0])
            s.fill(m, NEON[col][1] if core else NEON[col][0])
            owner[foot] = names.index(col)


def bulb_row(s, pts, step=2, phase=0):
    """Marquee bulbs along a pixel path: alternating warm-white / gold."""
    k = 0
    for i, (x, y) in enumerate(pts):
        if (i + phase) % step:
            continue
        s.puti(x, y, BULB_A if k % 2 == 0 else BULB_B)
        k += 1


def spark(nl, x, y, col, arm=1):
    """Tiny 4-point twinkle: plus-shaped core, halo round it."""
    pts = [(x, y)] + [(x + d, y) for d in range(-arm, arm + 1)] + \
          [(x, y + d) for d in range(-arm, arm + 1)]
    nl.path(pts, col)


def star_pts(cx, cy, r_out, r_in, rot=90.0, n=5):
    P = []
    for k in range(n * 2):
        r = r_out if k % 2 == 0 else r_in
        a = math.radians(rot + k * 180.0 / n)
        P.append((cx + r * math.cos(a), cy - r * math.sin(a)))
    return P


def edge_shade(s, m, top, right, left, bottom, outline=None):
    """Colour the 1 px rim of mask m by which side faces outward (sun from the
    upper right: top + right lit, left + bottom in shade)."""
    ring = m & ~erode(m)
    H, W = m.shape
    for y, x in zip(*np.nonzero(ring)):
        out_l = x == 0 or not m[y, x - 1]
        out_b = y == H - 1 or not m[y + 1, x]
        out_t = y == 0 or not m[y - 1, x]
        out_r = x == W - 1 or not m[y, x + 1]
        if out_b:
            c = bottom
        elif out_l:
            c = left
        elif out_t:
            c = top
        elif out_r:
            c = right
        else:
            c = left
        s.puti(x, y, c)
    return ring


def vbar(s, x0, x1, y0, y1, cols):
    n = x1 - x0 + 1
    for i in range(n):
        k = int(round(i * (len(cols) - 1) / max(1, n - 1)))
        s.vline(x0 + i, y0, y1, cols[k])


def hbar(s, x0, x1, y0, y1, cols):
    n = y1 - y0 + 1
    for i in range(n):
        k = int(round(i * (len(cols) - 1) / max(1, n - 1)))
        s.hline(x0, x1, y0 + i, cols[k])


def light_mask(s):
    op = s.opaque()
    m = np.zeros_like(op)
    for c in LIGHTS:
        m |= op & np.all(s.a[..., 0:3] == np.array(c, np.uint8), axis=-1)
    return m


def selout_body(s, rmps, dirs, mask=None):
    """ms.selout that never touches light pixels (selout maps colours outside
    the given ramps to the outline colour)."""
    m = ~light_mask(s)
    if mask is not None:
        m &= mask
    selout(s, rmps, dirs=dirs, mask=m)


def limit_body(s, n):
    """limit_palette on the non-light pixels only (lights never fold)."""
    op = s.opaque()
    lit = np.zeros_like(op)
    for c in LIGHTS:
        lit |= op & np.all(s.a[..., 0:3] == np.array(c, np.uint8), axis=-1)
    tmp = Spr(s.w, s.h)
    tmp.a = s.a.copy()
    tmp.a[lit] = 0
    nl = len({tuple(int(v) for v in c) for c in s.a[lit][:, 0:3]})
    limit_palette(tmp, max(4, n - nl))
    body = tmp.a[..., 3] > 0
    s.a[body] = tmp.a[body]


def deglow(s, neon):
    """Darken any non-light colour that would accidentally glow."""
    op = s.opaque()
    cols = {tuple(int(v) for v in c) for c in s.a[op][:, 0:3]}
    for c in cols:
        if c in LIGHTS or safe(c, neon):
            continue
        d = c
        while not safe(d, neon):
            d = tuple(int(v * 0.92) for v in d)
        m = op & np.all(s.a[..., 0:3] == np.array(c, np.uint8), axis=-1)
        s.a[m, 0:3] = d


# ==========================================================================
# 1) CITY LAMP
# ==========================================================================
def city_lamp_lit():
    """Slim modern steel street light: tapered pole on the centre line, one
    long swan-neck arm sweeping out to the right, flat LED head with a
    cool-white lens facing down."""
    w, h = 28, 122
    s = Spr(w, h)
    S = S5
    # footing + slim base cover
    s.rect(9, 118, 18, 121, CONC[3]); s.hline(9, 18, 118, CONC[5]); s.hline(10, 17, 119, CONC[4])
    s.vline(9, 119, 121, CONC[2]); s.vline(18, 119, 121, CONC[4]); s.hline(9, 18, 121, CONC[1])
    s.rect(11, 106, 16, 117, S[3]); s.vline(11, 106, 117, S[1]); s.vline(12, 106, 117, S[2])
    s.vline(16, 106, 117, S[5]); s.vline(15, 106, 117, S[4]); s.hline(11, 16, 106, S[5])
    s.hline(11, 16, 107, S[2]); s.hline(11, 16, 117, S[1])
    s.rect(12, 110, 13, 114, S[2]); s.puti(13, 110, S[1])       # service hatch
    # tapered pole 4 px -> 3 px -> 2 px with weld collars
    vbar(s, 12, 15, 78, 105, [S[1], S[3], S[4], S[5]])
    s.hline(12, 15, 78, S[5]); s.hline(12, 15, 79, S[2])
    vbar(s, 12, 14, 36, 77, [S[1], S[4], S[5]])
    s.hline(12, 14, 36, S[5]); s.hline(12, 14, 37, S[2])
    vbar(s, 13, 14, 22, 35, [S[2], S[5]])
    # banner bracket: two short arms holding a small vertical pennant
    for by in (40, 58):
        s.hline(15, 21, by, S[4]); s.puti(15, by + 1, S[2]); s.puti(15, by, S[5])
    ban = [hx("#5a1e4a"), hx("#8a2c6c"), hx("#b23e88"), hx("#d0609c")]
    s.rect(17, 41, 21, 57, ban[2]); s.vline(17, 41, 57, ban[1]); s.vline(21, 41, 57, ban[3])
    s.hline(17, 21, 57, ban[1])
    for k in range(3):                                         # swallow-tail
        s.puti(19, 57 - k, ban[0] if k < 2 else ban[1])
    s.puti(19, 56, ban[0])
    s.rect(18, 45, 20, 47, hx("#e0b860")); s.puti(18, 45, hx("#c8963e"))   # sun disc
    s.hline(18, 20, 49, hx("#3aa0b0")); s.hline(18, 20, 51, hx("#3aa0b0"))
    # swan-neck arm: up the pole, sweeping right and slightly up
    pts = [(13.5, 23.0), (13.6, 16.0), (14.6, 11.0), (17.0, 8.0), (20.5, 6.6), (23.0, 6.2)]
    stroke(s, pts, lambda u: 2.4 - 0.5 * u, S, lo=1, hi=5)
    # LED head: slim flat box, tipped slightly, lens underneath
    s.hline(19, 26, 4, S[4]); s.puti(26, 4, S[5])
    s.hline(18, 27, 5, S[5]); s.puti(18, 5, S[3])
    s.hline(18, 27, 6, S[3]); s.puti(27, 6, S[4])
    s.hline(18, 27, 7, S[1]); s.puti(18, 7, S[0])
    s.hline(19, 26, 8, LED_RIM); s.hline(20, 25, 8, LED_CORE)
    s.hline(20, 25, 9, LED_RIM)
    pole = np.zeros((h, w), bool)
    pole[10:, :17] = True
    selout_body(s, [S, CONC], ((-1, 0),), mask=pole)
    remove_orphans(s)
    bottom_fix(s)
    return s


# ==========================================================================
# 2) NEON PALM
# ==========================================================================
def neon_palm_lit():
    w, h = 70, 158
    s = Spr(w, h)
    top_x, top_y = 38, 30
    tr = Spr(w, h)
    palm_trunk(tr, w / 2.0, h - 1, top_x, top_y + 3, 7.6, 5.0, 4, curve_p=1.5)
    op = tr.opaque()
    # LED spiral: two interleaved helices (pink / cyan), front half visible
    P = 12.0
    for y in range(top_y + 11, h - 5):
        xs = np.nonzero(op[y])[0]
        if not len(xs):
            continue
        xl, xr = xs.min(), xs.max()
        if xr - xl >= 2 and not op[y, xl + 1]:
            xl += 1                                         # skip a scaly nub
        while xl < xr and not op[y, xl + 1]:
            xl += 1
        c = (xl + xr + 1) / 2.0
        hw = (xr - xl + 1) / 2.0
        t = (h - 1 - y)
        for x in range(xl, xr + 1):
            u = clampi((x + 0.5 - c) / hw, -0.999, 0.999)
            th = math.asin(u)
            for col, off in (("pink", 0.0), ("cyan", P / 2)):
                ph = (t - (P / 2) * (th / math.pi) - off) % P
                if ph < 1.0:
                    tr.puti(x, y, NEON[col][0])
                elif ph < 2.0:
                    tr.puti(x, y, NEON[col][1] if abs(u) < 0.55 else NEON[col][0])
    s.a = tr.a.copy()
    back = [
        (214, 15, 15, 4.0, 1.0, 1, 0.0, True),
        (98, 25, 55, 5.5, 1.5, 1, 0.1),
        (62, 27, 80, 6.0, 1.5, 2, 0.12),
        (130, 30, 95, 6.5, 2.0, 1, 0.14),
        (28, 30, 100, 6.5, 2.0, 4, 0.15),
    ]
    front = [
        (168, 36, 100, 7.0, 2.0, 2, 0.16),
        (6, 34, 100, 7.0, 2.0, 4, 0.16),
        (204, 30, 70, 7.0, 2.0, 2, 0.14),
        (-30, 28, 62, 6.5, 2.0, 4, 0.14),
        (248, 20, 30, 6.0, 2.0, 2, 0.1),
        (292, 19, 25, 6.0, 2.0, 4, 0.1),
    ]
    rmps = [PALM_G, PALM_Y, PALM_DEAD, TRUNK, COCO]
    greens = {c for c in PALM_G + PALM_Y}
    cnt = 0
    for lst in (back, front):
        for f in lst:
            phi0, ln, bend, wd, wu, sh = f[:6]
            yel = f[6] if len(f) > 6 else 0.3
            dead = f[7] if len(f) > 7 else False
            cnt += 1
            lay = frond_layer(w, h, top_x, top_y, phi0, ln, bend, wd, wu, sh, yel=yel,
                              dead=dead, seed=900 + cnt)
            paste_with_shadow(s, lay, rmps)
    coconuts(s, top_x, top_y + 3)
    selout_body(s, rmps, ((0, 1),))
    # fairy-light strings draped along the front fronds' midribs
    i = 0
    for f in front:
        spine = frond_spine(top_x, top_y, f[0], f[1], f[2])
        for u in (0.3, 0.52, 0.74, 0.92):
            x, y = spine[int(u * (len(spine) - 1))]
            x, y = int(round(x)), int(round(y)) + 1
            if s.get(x, y) in greens:
                s.puti(x, y, (BULB_A, NEON["pink"][0], BULB_B, NEON["cyan"][0])[i % 4])
                i += 1
    remove_orphans(s)
    bottom_fix(s)
    deglow(s, True)
    limit_body(s, 27)
    return s


def frond_spine(cx, cy, phi0, length, bend):
    """Midrib of ms.frond_layer (same integration) as float points."""
    side = 1 if math.cos(math.radians(phi0)) >= 0 else -1
    K = max(16, int(length * 4))
    ds = length / K
    x, y, p = float(cx), float(cy), math.radians(phi0)
    pts = []
    for k in range(K + 1):
        pts.append((x, y))
        x += math.cos(p) * ds
        y -= math.sin(p) * ds
        p -= side * math.radians(bend) * (ds / length) * (0.15 + 1.7 * k / K)
    return pts


# ==========================================================================
# 3) BLADE SIGNS
# ==========================================================================
def blade_box(w, h, top="flat", bottom="flat", y0=5):
    """Dark metal blade-sign box seen face-on.  Returns (spr, face_mask).
    Rings from the outside in: lit/shaded edge, marquee bulb track, lip."""
    s = Spr(w, h)
    m = np.zeros((h, w), bool)
    cx = w / 2.0
    for y in range(y0, h):
        xl, xr = 0, w - 1
        if top == "arch":
            r = w / 2.0
            yc = y0 + r
            if y + 0.5 < yc:
                d = yc - (y + 0.5)
                hw = math.sqrt(max(0.0, r * r - d * d))
                xl = int(math.floor(cx - hw + 0.5)); xr = int(math.ceil(cx + hw - 0.5)) - 1
        elif top == "step":
            k = y - y0
            inset = 6 if k < 4 else (3 if k < 8 else 0)
            xl, xr = inset, w - 1 - inset
        elif top == "round":
            k = y - y0
            inset = (3, 1, 1)[k] if k < 3 else 0
            xl, xr = inset, w - 1 - inset
        if bottom == "point":
            k = (h - 1) - y
            depth = w // 2 - 4
            if k < depth:
                inset = depth - k
                xl, xr = max(xl, inset), min(xr, w - 1 - inset)
        elif bottom == "round":
            k = (h - 1) - y
            if k < 3:
                inset = (3, 1, 1)[k]
                xl, xr = max(xl, inset), min(xr, w - 1 - inset)
        if xr >= xl:
            m[y, xl:xr + 1] = True
    # body fill
    s.fill(m, BOXM[3])
    r0 = edge_shade(s, m, BOXM[7], BOXM[6], OUTLINE, OUTLINE)
    m1 = m & ~r0
    r1 = m1 & ~erode(m1)
    s.fill(r1, BOXM[2])
    m2 = m1 & ~r1
    edge_shade(s, m2, BOXM[5], BOXM[5], BOXM[4], BOXM[4])
    face = erode(m2)
    s.fill(face, BOXM[1])
    # recessed face: shadow under the top lip / beside the left lip
    for y, x in zip(*np.nonzero(face)):
        if not face[y - 1, x] or not face[y, x - 1]:
            s.puti(x, y, BOXM[0])
    # bulbs on the track, every other pixel along the left / right sides + top
    k = 0
    for y in range(h):
        for x in range(w):
            if r1[y, x] and (x + y) % 2 == 0:
                s.puti(x, y, BULB_A if ((x + y) // 2) % 2 == 0 else BULB_B)
                k += 1
    # hanger bracket stub: bar + two rods down to the box
    bx0, bx1 = int(cx) - 8, int(cx) + 7
    s.hline(bx0, bx1, 0, BOXM[6]); s.hline(bx0, bx1, 1, BOXM[3]); s.puti(bx0, 1, OUTLINE)
    s.puti(bx1, 0, BOXM[7])
    for rx in (int(cx) - 5, int(cx) + 4):
        y = 2
        while y < h and not m[y, rx]:
            s.puti(rx, y, BOXM[5]); s.puti(rx + 1, y, BOXM[3])
            y += 1
    return s, face


def blade_finish(s, nl):
    nl.render(s)
    s.a[s.a[..., 3] == 0] = 0
    deglow(s, True)
    return s


def die(nl, cx, cy, half, ang, pips, col, pip_col="yellow"):
    """Tilted neon die: rounded square outline + 1 px pips (grid units)."""
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def rot(u, v):
        return cx + u * ca - v * sa, cy + u * sa + v * ca
    corners = [rot(u * half, v * half) for (u, v) in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    nl.path(polyline(corners, closed=True), col)
    step = half - 3.5                       # keeps every pip 2 px clear of the tube
    for (gu, gv) in pips:
        x, y = rot(gu * step, gv * step)
        nl.path([(int(math.floor(x)), int(math.floor(y)))], pip_col, dirs=())


def neon_blade_a_lit():
    """Cocktail glass with an olive on a pick, two twinkling stars, three
    little diamonds underneath (cyan main)."""
    w, h = 32, 80
    s, face = blade_box(w, h, top="arch")
    nl = Neon(w, h)
    spark(nl, 10, 14, "yellow", arm=2)
    spark(nl, 21, 19, "yellow", arm=1)
    # martini glass (one shape: bowl + stem + foot)
    top_y, apex_y = 27, 46
    bowl = polyline([(4, top_y), (27, top_y), (16, apex_y), (15, apex_y)], closed=True)
    stem = polyline([(15, apex_y), (15, 62)])
    foot = curve(lambda t: (9 + 13 * t, 64 - 1.6 * math.sin(math.pi * t)))
    nl.paths([bowl, stem, foot], "cyan")
    nl.path(polyline([(8, 31), (23, 31)]), "pink")                    # drink line
    nl.path(polyline([(12, 19), (19, 35)]), "pink", gap=1)            # cocktail pick
    nl.path(ring_path(19.5, 36.0, 2.6, 2.6), "green", gap=1)         # olive
    for bx in (8, 15.5, 23):
        nl.path(polyline([(bx - 2, 71), (bx, 69), (bx + 2, 71), (bx, 73)], closed=True), "pink")
    return blade_finish(s, nl)


def neon_blade_b_lit():
    """Heart pierced by an arrow + a row of chevrons (pink main)."""
    w, h = 34, 84
    s, face = blade_box(w, h, top="round", bottom="point")
    nl = Neon(w, h)
    cx, cy = 16.0, 23.0

    def heart(t):
        a = t * 2 * math.pi
        x = 16 * math.sin(a) ** 3
        y = 13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)
        return cx + x * 0.46, cy - y * 0.46 + 1
    hpts = curve(heart, 400)
    # arrow: in front of the heart where it enters (lower left), behind it
    # where it leaves (upper right) -- a real "pierced" read
    shaft = polyline([(5, 36), (29, 9)])
    head = polyline([(24, 9), (29, 9), (29, 14)])
    fl1 = polyline([(4, 34), (7, 34), (7, 37)])
    fl2 = polyline([(7, 31), (10, 31), (10, 34)])
    nl.paths([shaft, head], "yellow")
    nl.path(hpts, "pink", gap=1)
    nl.paths([[p for p in shaft if p[0] <= 14], fl1, fl2], "yellow", gap=1, gap_only=("pink",))
    for k, yy in enumerate((41, 49, 57, 65)):
        col = "violet" if k % 2 else "pink"
        nl.path(polyline([(8, yy), (17, yy + 6), (26, yy)]), col)
    return blade_finish(s, nl)


def neon_blade_c_lit():
    """Playing-card spade over a pair of dice (violet main)."""
    w, h = 30, 76
    s, face = blade_box(w, h, top="step", bottom="flat")
    nl = Neon(w, h)
    cx = 15.0

    def spade(t):
        a = t * 2 * math.pi
        x = 16 * math.sin(a) ** 3
        y = 13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)
        return cx + x * 0.5, 23 + y * 0.5 - 1      # heart flipped upside down
    nl.paths([curve(spade, 400), polyline([(15, 26), (12, 32), (18, 32), (15, 26)])], "green")
    die(nl, 11.0, 46.0, 5.8, -10, [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)], "violet")
    die(nl, 18.5, 63.0, 5.8, 12, [(-1, -1), (0, 0), (1, 1)], "violet", pip_col="pink")
    return blade_finish(s, nl)


def neon_blade_d_lit():
    """Palm tree in front of a striped setting sun over the sea (orange)."""
    w, h = 36, 90
    s, face = blade_box(w, h, top="arch", bottom="round")
    nl = Neon(w, h)
    cx, cy, r = 21.5, 33.0, 10.5
    cols = ["yellow", "yellow", "orange", "orange", "pink"]
    for k, yy in enumerate((24, 28, 32, 36, 40)):
        hw = math.sqrt(max(0.0, r * r - (yy + 0.5 - cy) ** 2))
        nl.path(polyline([(cx - hw + 0.5, yy), (cx + hw - 1.5, yy)]), cols[k])
    nl.path(polyline([(4, 44), (31, 44)]), "cyan")                     # sea horizon
    for k, (yy, hw) in enumerate(((48, 6), (52, 4), (56, 2))):
        nl.path(polyline([(cx - hw, yy), (cx + hw - 1, yy)]), "pink" if k % 2 else "orange")
    for yy, x0, x1 in ((68, 5, 30), (76, 9, 26)):
        nl.path(curve(lambda t, a=x0, b=x1, y=yy: (a + (b - a) * t,
                                                     y + 1.6 * math.sin(t * 4 * math.pi + 0.5))),
                "cyan")
    # palm (in front: knocks the sun stripes out around itself)
    tx, ty = 11, 27
    trunk = curve(lambda t: (8 + 3 * t + 2.0 * math.sin(math.pi * t), 64 - (64 - ty - 2) * t))
    fr = []
    for (ang, ln, droop) in ((170, 8, 5), (12, 10, 6), (125, 6, 2), (55, 8, 3), (215, 5, 3),
                             (-25, 6, 4)):
        a = math.radians(ang)
        fr.append(curve(lambda t, a=a, ln=ln, d=droop: (tx + math.cos(a) * ln * t,
                                                        ty - math.sin(a) * ln * t + d * t * t)))
    nl.paths([trunk] + fr, "green", gap=1)
    return blade_finish(s, nl)


# ==========================================================================
# 4) BILLBOARD
# ==========================================================================
def neon_billboard_lit():
    w, h = 104, 84
    s = Spr(w, h)
    S = S5
    # legs (I-beams) + brace + footings
    for x0 in (22, 76):
        vbar(s, x0, x0 + 5, 58, 81, [S[1], S[2], S[3], S[3], S[4], S[5]])
        s.vline(x0 + 2, 58, 81, S[2])
        s.rect(x0 - 2, 81, x0 + 7, 83, CONC[3]); s.hline(x0 - 2, x0 + 7, 81, CONC[5])
        s.vline(x0 - 2, 81, 83, CONC[2]); s.hline(x0 - 2, x0 + 7, 83, CONC[1])
    for (xa, xb) in ((28, 75),):
        s.hline(xa, xb, 68, S[4]); s.hline(xa, xb, 69, S[2])
        for x, y in bres(28, 60, 75, 77):
            s.puti(x, y, S[3])
        for x, y in bres(28, 77, 75, 60):
            s.puti(x, y, S[2])
    # catwalk under the board
    s.rect(4, 57, 99, 59, S[3]); s.hline(4, 99, 57, S[5]); s.hline(4, 99, 59, S[1])
    for x in range(6, 99, 4):
        s.puti(x, 58, S[2])
    # board frame
    s.rect(0, 6, 103, 56, BOXM[2])
    m = np.zeros((h, w), bool); m[6:57, 0:104] = True
    edge_shade(s, m, BOXM[7], BOXM[6], OUTLINE, OUTLINE)
    s.rect(2, 8, 101, 54, BOXM[4]); s.hline(2, 101, 8, BOXM[5]); s.vline(101, 8, 54, BOXM[5])
    # picture (synthwave)
    px0, py0, px1, py1 = 6, 12, 97, 50
    pw, ph = px1 - px0 + 1, py1 - py0 + 1
    pic = Spr(pw, ph)
    hz = 24                                    # horizon row in picture coords
    sky = [hx("#140c2c"), hx("#24124a"), hx("#3c1a64"), hx("#62227a"), hx("#8c2a86")]
    ms.bands(pic, [(0, sky[0]), (6, sky[1]), (12, sky[2]), (17, sky[3]), (21, sky[4])])
    for (x, y) in ((8, 3), (19, 7), (33, 2), (70, 4), (84, 8), (58, 9), (45, 5)):
        pic.puti(x, y, STAR_W)
    # sun
    scx, scy, sr = 56.0, hz - 1.0, 15.0
    sun_cols = [NEON["yellow"][0], SUN_Y, NEON["orange"][0], SUN_O, NEON["pink"][0]]
    for y in range(ph):
        for x in range(pw):
            d = math.hypot(x + 0.5 - scx, y + 0.5 - scy)
            if d > sr or y >= hz:
                continue
            v = (y - (scy - sr)) / sr          # 0 top .. 1 horizon
            gap = False
            for (gy, gt) in ((0.5, 1), (0.66, 1), (0.8, 2), (0.92, 2)):
                yy = scy - sr + gy * sr
                if yy <= y < yy + gt:
                    gap = True
            if gap:
                continue
            pic.puti(x, y, sun_cols[clampi(int(v * 5), 0, 4)])
    # far mountains
    for x in range(pw):
        hgt = 3.0 + 2.5 * math.sin(x * 0.21) + 1.6 * math.sin(x * 0.53 + 1.0)
        if 40 < x < 72:
            hgt = 1.0
        for y in range(int(hz - hgt), hz):
            pic.puti(x, y, hx("#2a1648") if y > hz - hgt + 1 else hx("#4a2468"))
    # floor + grid
    floor = hx("#160a26")
    pic.rect(0, hz, pw - 1, ph - 1, floor)
    G = NEON["pink"][0]
    vx, vy = (pw - 1) / 2.0, hz - 12.0          # vanishing point above the horizon
    for k in range(-8, 9):
        xb = vx + k * 13.0
        x0 = vx + (xb - vx) * (hz + 1 - vy) / (ph - 1 - vy)
        for x, y in bres(round(x0), hz + 1, round(xb), ph - 1):
            if 0 <= x < pw:
                pic.puti(x, y, G)
    for yy in (hz + 2, hz + 5, hz + 9):
        if yy < ph:
            pic.hline(0, pw - 1, yy, G)
    pic.hline(0, pw - 1, hz, NEON["cyan"][0])
    # palm silhouette (left), dark
    pal = Spr(pw, ph)
    silhouette_palm(pal, 14, ph - 1, 20, 9, hx("#0e0818"),
                    [(150, 11, 5, 3), (30, 12, 5, 3), (100, 7, 2, 2), (190, 9, 5, 2),
                     (-10, 9, 5, 2), (70, 8, 2, 2)], wb=3.4, wt=2.0, bow=3.0)
    add_layer(pic, pal)
    s.paste(pic, px0, py0)
    # neon border tube (rounded corners)
    nl = Neon(w, h)
    bx0, by0, bx1, by1 = 4, 10, 99, 52
    nl.path(polyline([(bx0 + 2, by0), (bx1 - 2, by0), (bx1, by0 + 2), (bx1, by1 - 2),
                      (bx1 - 2, by1), (bx0 + 2, by1), (bx0, by1 - 2), (bx0, by0 + 2)],
                     closed=True), "cyan")
    nl.render(s)
    # spotlights on goosenecks above the board
    for lx in (26, 76):
        s.vline(lx, 2, 5, S[3]); s.vline(lx + 1, 2, 5, S[4])
        s.rect(lx - 1, 0, lx + 4, 2, S[2]); s.hline(lx - 1, lx + 4, 0, S[4])
        s.hline(lx, lx + 4, 3, LED_RIM); s.hline(lx + 1, lx + 3, 3, LED_CORE)
    s.a[s.a[..., 3] == 0] = 0
    deglow(s, True)
    limit_body(s, 27)
    rb.centre_on_base(s)
    return s


# ==========================================================================
# 5) NEON ARCH (256x112, legs aligned with gantry.png)
# ==========================================================================
POSTS = (6, 234)          # gantry.png post x0 (17 px wide), footings x0-3..x0+19


def footing(s, x0, x1, y0, y1):
    """Concrete footing (gantry.png layout, brightest shade capped < 190)."""
    s.rect(x0, y0, x1, y1, CONC[3])
    s.hline(x0, x1, y0, CONC[5]); s.hline(x0, x1, y0 + 1, CONC[4])
    s.vline(x0, y0 + 1, y1, CONC[2]); s.vline(x1, y0 + 1, y1, CONC[4])
    s.hline(x0, x1, y1, CONC[1])
    for xx in (x0 + 3, x1 - 3):
        s.puti(xx, y0 + 3, CONC[2]); s.puti(xx + 1, y0 + 3, CONC[4])


def arch_post(s, x0, top, bot, nl):
    S = S5
    x1 = x0 + 16
    P = 16
    for yb in range(top, bot + P, P):
        for k in range(2):
            ya = yb + k * (P // 2)
            xa, xb = (x0 + 3, x1 - 3) if k == 0 else (x1 - 3, x0 + 3)
            for px, py in bres(xa, ya, xb, ya + P // 2):
                if top <= py <= bot:
                    s.puti(px, py, S[3] if k == 0 else S[2])
                    if py + 1 <= bot:
                        s.puti(px, py + 1, S[1])
        if top <= yb <= bot - 1:
            s.hline(x0 + 3, x1 - 3, yb, S[4]); s.hline(x0 + 3, x1 - 3, yb + 1, S[1])
    vbar(s, x0, x0 + 2, top, bot, [S[1], S[2], S[4]])
    vbar(s, x1 - 2, x1, top, bot, [S[2], S[4], S[5]])
    # vertical neon tube up the middle of the post
    nl.path(polyline([(x0 + 8, top + 6), (x0 + 8, bot - 6)]), "cyan")
    # bulbs down the outer faces of both chords
    bulb_row(s, [(x0 + 1, y) for y in range(top + 3, bot - 2)], step=4)
    bulb_row(s, [(x1 - 1, y) for y in range(top + 3, bot - 2)], step=4, phase=2)


def neon_arch_lit():
    """Neon truss arch over the road in gantry.png's frame (legs on the same
    columns): lattice posts with cyan tubes, a Warren-truss beam carrying a
    pink zig-zag tube and a cyan tube, a bulb-lit bowstring arch on top, and a
    big neon star (pink twinkle at its heart) on a round marquee plate."""
    w, h = 256, 112
    s = Spr(w, h)
    S = S5
    nl = Neon(w, h)
    BT, BB = 14, 40                       # beam top / bottom rows
    for x0 in POSTS:
        arch_post(s, x0, BT, 103, nl)
        footing(s, x0 - 3, x0 + 19, 104, 111)
    # --- bowstring arch above the beam + hangers ---
    AX0, AX1, AC, AH = 14.0, 241.0, 127.5, 11.0

    def arch_y(x):
        u = (x + 0.5 - AC) / (AX1 - AC)
        return BT - 2 - AH * (1 - u * u)
    for x in range(int(AX0), int(AX1) + 1):
        yt = int(round(arch_y(x)))
        s.puti(x, yt, S[5]); s.puti(x, yt + 1, S[3]); s.puti(x, yt + 2, S[1])
    P = 16
    TX0, TX1 = 23, 231
    for xa in range(TX0 + P, TX1, P):
        yt = int(round(arch_y(xa + 1))) + 3
        for y in range(yt, BT):
            s.puti(xa + 1, y, S[2]); s.puti(xa + 2, y, S[3])
    arch_line = [(x, int(round(arch_y(x))) + 1) for x in range(int(AX0) + 2, int(AX1) - 1)]
    bulb_row(s, arch_line, step=3)
    # --- beam: back diagonals, verticals, neon zig-zag on the front diagonals ---
    for xa in range(TX0, TX1, P):
        for px, py in bres(xa + 2, BB - 6, xa + P, BT + 6):
            s.puti(px, py, S[1])
    for xa in range(TX0, TX1 + 1, P):
        vbar(s, xa, xa + 2, BT + 5, BB - 6, [S[1], S[3], S[4]])
    zig = []
    for i, xa in enumerate(range(TX0 + 1, TX1, P // 2)):
        zig.append((xa, BT + 8 if i % 2 == 0 else BB - 9))
    nl.path(polyline(zig), "pink")
    # top chord: lit top face, front face with a bulb row, dark lip
    BX0, BX1 = 6, 250
    hbar(s, BX0, BX1, BT, BT + 5, [S[5], S[4], S[3], S[3], S[2], S[1]])
    bulb_row(s, [(x, BT + 3) for x in range(BX0 + 2, BX1 - 1)], step=3)
    # bottom chord with a cyan tube
    hbar(s, BX0, BX1, BB - 5, BB, [S[4], S[3], S[2], S[2], S[1], S[0]])
    nl.path(polyline([(BX0 + 20, BB - 3), (BX1 - 20, BB - 3)]), "cyan")
    # post caps
    for x0 in POSTS:
        s.rect(x0 - 1, BT - 2, x0 + 17, BT - 1, S[4]); s.hline(x0 - 1, x0 + 17, BT - 2, S[5])
        s.vline(x0 - 1, BT - 2, BT - 1, S[2])
    # --- crown: faceted star on a round marquee plate ---
    cx, cy, R = 127.5, 27.0, 25.0
    plate = ell_mask(w, h, cx, cy, R, R)
    s.fill(plate, BOXM[1])
    edge_shade(s, plate, BOXM[7], BOXM[6], OUTLINE, OUTLINE)
    inner = plate & ~(plate & ~erode(plate))
    s.fill(inner & ~erode(inner), BOXM[3])
    bulb_row(s, ring_path(cx, cy, R - 2.5, R - 2.5), step=2)
    nl.path(polyline(star_pts(cx, cy + 1, 19, 8), closed=True), "yellow")
    spark(nl, int(cx), int(cy) + 1, "pink", arm=3)
    nl.render(s)
    s.a[s.a[..., 3] == 0] = 0
    deglow(s, True)
    return s


# ==========================================================================
# 6) FOOD CART
# ==========================================================================
def food_cart_lit():
    w, h = 50, 46
    s = Spr(w, h)
    # umbrella pole
    vbar(s, 24, 25, 9, 25, [S5[2], S5[4]])
    # canopy: shallow cone, 8 regular gores (mustard / ketchup) radiating from
    # the finial; left half in shade, right half + crown catch the light
    ax, ay = 24.5, 0.0
    NG = 8
    for y in range(1, 12):
        hw = 2.0 + (y - 1) * 2.15
        for x in range(int(ax - hw) - 1, int(ax + hw) + 2):
            if not 0 <= x < w:
                continue
            dx = x + 0.5 - ax
            if abs(dx) > hw:
                continue
            u = dx / hw                                    # -1 .. 1 across the rim
            g = int(math.floor((u + 1) * NG / 2.0))
            g = min(g, NG - 1)
            rmp = MUST if g % 2 == 0 else KETCH
            lit = 2 if u > 0.05 else 1
            if y <= 3:
                lit += 1
            if u > 0.8:
                lit = 3
            if u < -0.82:
                lit = 0
            s.puti(x, y, rmp[clampi(lit, 0, 3)])
    # scalloped valance
    hw = 2.0 + 10 * 2.15
    for x in range(int(ax - hw), int(ax + hw) + 1):
        u = (x + 0.5 - ax) / hw
        g = min(int(math.floor((u + 1) * NG / 2.0)), NG - 1)
        rmp = MUST if g % 2 == 0 else KETCH
        s.puti(x, 12, rmp[1] if u < 0 else rmp[2])
        if (x - int(ax - hw)) % 3 != 2:
            s.puti(x, 13, rmp[0] if u < 0 else rmp[1])
    s.puti(24, 0, S5[4]); s.puti(25, 0, S5[3])
    # warm lamp hanging under the canopy
    s.rect(22, 14, 27, 15, BLACK[2]); s.hline(22, 27, 14, BLACK[3])
    s.hline(23, 26, 16, WARM_RIM); s.hline(24, 25, 16, WARM_CORE); s.hline(24, 25, 17, WARM_RIM)
    # cart body
    s.rect(4, 25, 45, 38, S5[3])
    s.hline(3, 46, 24, S5[5]); s.hline(3, 46, 25, S5[4]); s.vline(3, 24, 25, S5[3])
    s.hline(4, 45, 26, S5[1])
    # lit food warmer window
    s.rect(7, 27, 33, 32, WARM_RIM); s.rect(9, 28, 31, 31, WARM_CORE)
    for sx in (11, 18, 25):                              # sausages in buns
        s.hline(sx, sx + 4, 30, TAN[3]); s.hline(sx + 1, sx + 3, 29, KETCH[3])
    s.vline(6, 27, 33, S5[1]); s.vline(34, 27, 33, S5[4]); s.hline(6, 34, 33, S5[2])
    # ketchup red lower panel with cream stripe
    s.rect(4, 34, 45, 38, KETCH[2]); s.hline(4, 45, 34, KETCH[3]); s.hline(4, 45, 36, CREAM[3])
    s.hline(4, 45, 38, KETCH[1])
    s.rect(36, 27, 44, 33, S5[2]); s.rect(37, 28, 43, 32, S5[3]); s.hline(37, 43, 28, S5[4])
    s.puti(42, 30, S5[5])                                # side door handle
    s.vline(45, 25, 38, S5[4]); s.vline(4, 25, 38, S5[1])
    # condiments + napkins on the counter
    s.vline(38, 21, 23, KETCH[3]); s.puti(38, 20, KETCH[4])
    s.vline(40, 21, 23, MUST[3]); s.puti(40, 20, MUST[2])
    s.rect(42, 21, 44, 23, CREAM[2]); s.hline(42, 44, 21, CREAM[3])
    # push handle (left)
    s.hline(0, 3, 27, S5[4]); s.hline(0, 3, 28, S5[2]); s.vline(0, 27, 30, S5[3])
    # wheels
    for wx in (12, 37):
        for y in range(37, 46):
            for x in range(wx - 4, wx + 5):
                d = math.hypot(x + 0.5 - (wx + 0.5), y + 0.5 - 41.0)
                if d <= 4.4:
                    c = BLACK[1] if d > 3.0 else (BLACK[3] if d > 1.5 else S5[4])
                    if d <= 4.4 and d > 3.0 and x > wx and y < 41:
                        c = BLACK[2]
                    s.puti(x, y, c)
        s.puti(wx, 40, S5[5])
    # shadow strip under the cart
    s.hline(8, 41, 39, BLACK[0])
    selout_body(s, [S5, KETCH, MUST, CREAM, BLACK, TAN], ((-1, 0), (0, 1)))
    s.a[s.a[..., 3] == 0] = 0
    deglow(s, False)
    bottom_fix(s)
    rb.centre_on_base(s)
    return s


# ==========================================================================
# 7) BUS STOP
# ==========================================================================
def bus_stop_lit():
    w, h = 72, 54
    s = Spr(w, h)
    S = S5
    # concrete pad
    s.rect(2, 50, 69, 53, CONC[3]); s.hline(2, 69, 50, CONC[5]); s.hline(2, 69, 51, CONC[4])
    s.vline(2, 51, 53, CONC[2]); s.vline(69, 51, 53, CONC[4]); s.hline(2, 69, 53, CONC[1])
    # back wall frame: rails + mullions, glass panes see-through with glints
    s.hline(6, 46, 13, S[3]); s.hline(6, 46, 14, S[1])
    s.hline(6, 46, 44, S[4]); s.hline(6, 46, 45, S[2])
    for mx in (19, 33):
        s.vline(mx, 15, 43, S[2]); s.vline(mx + 1, 15, 43, S[3])
    for (x0, x1) in ((7, 18), (21, 32), (35, 46)):
        for k in range(3):
            for x, y in bres(x0 + 5 + k * 3, 16, x0 + 1 + k * 3, 24):
                if x0 <= x <= x1 and k != 1:
                    s.puti(x, y, GLASSR[3] if k == 0 else GLASSR[2])
    # advert lightbox
    ax0, ay0, ax1, ay1 = 47, 12, 64, 47
    s.rect(ax0, ay0, ax1, ay1, S[2]); s.hline(ax0, ax1, ay0, S[4]); s.vline(ax1, ay0, ay1, S[3])
    s.vline(ax0, ay0, ay1, S[1])
    pw, ph = ax1 - ax0 - 3, ay1 - ay0 - 3
    pic = Spr(pw, ph)
    hz = 21                                  # horizon row in picture coords
    ms.bands(pic, [(0, ADV[3]), (5, ADV[6]), (11, ADV[2]), (16, ADV[1])])
    for y in range(hz):                      # pale sun with synthwave gaps
        for x in range(pw):
            d = math.hypot(x + 0.5 - 8.5, y + 0.5 - (hz - 1.0))
            if d < 6.2 and y not in (hz - 4, hz - 2):
                pic.puti(x, y, ADV[5] if d < 4.6 else ADV[0])
    pic.rect(0, hz, pw - 1, ph - 1, ADV[4])
    for (yy, x0, x1) in ((hz + 2, 4, 12), (hz + 4, 6, 10), (hz + 7, 1, 5), (hz + 8, 9, 13)):
        pic.hline(x0, x1, yy, ADV[5] if yy < hz + 5 else ADV[7])
    pal = Spr(pw, ph)
    silhouette_palm(pal, 2, hz + 1, 4, 6, ADV_INK[0],
                    [(160, 5, 3, 2), (25, 6, 3, 2), (95, 3, 1, 1), (-15, 5, 3, 1),
                     (200, 3, 2, 1)], wb=2.2, wt=1.2, bow=1.2)
    add_layer(pic, pal)
    s.paste(pic, ax0 + 2, ay0 + 2)
    # posts
    for px in (4, 46, 65):
        vbar(s, px, px + 2, 9, 49, [S[1], S[3], S[4]])
    # bench (slats + legs) in front of the glass
    s.hline(9, 40, 36, TAN[4]); s.hline(9, 40, 37, TAN[3]); s.hline(9, 40, 38, TAN[1])
    s.hline(9, 40, 31, TAN[3]); s.hline(9, 40, 32, TAN[1])
    for lx in (11, 38):
        s.vline(lx, 33, 35, S[2])
        s.vline(lx, 39, 49, S[2]); s.vline(lx + 1, 39, 49, S[3])
    # glass roof: tilted pane seen from slightly above, steel fascia, strip light
    for y in range(3, 8):
        s.hline(1, 70, y, GLASSR[2] if y > 4 else GLASSR[3])
    for x0 in range(6, 70, 13):
        for x, y in bres(x0, 3, x0 - 2, 7):
            s.puti(x, y, GLASSR[4])
    s.hline(1, 70, 2, S[5]); s.vline(70, 2, 9, S[4])
    s.hline(1, 70, 8, S[4]); s.hline(1, 70, 9, S[2]); s.hline(1, 70, 10, S[1])
    s.hline(14, 38, 11, LED_RIM); s.hline(16, 36, 11, LED_CORE)
    selout_body(s, [S, CONC, TAN, GLASSR, ADV_INK], ((-1, 0), (0, 1)))
    s.a[s.a[..., 3] == 0] = 0
    deglow(s, False)
    limit_body(s, 27)
    return s


# ==========================================================================
# 8) HYDRANT
# ==========================================================================
def hydrant():
    w, h = 14, 18
    s = Spr(w, h)
    R = RED
    # base flange
    s.rect(2, 16, 11, 17, R[2]); s.hline(2, 11, 16, R[3]); s.puti(11, 16, R[4])
    s.puti(2, 17, R[0]); s.hline(3, 11, 17, R[1])
    # barrel (cylinder shading)
    cols = [R[1], R[2], R[3], R[3], R[4], R[4], R[5], R[3]]
    for i, x in enumerate(range(3, 11)):
        s.vline(x, 6, 15, cols[i])
    # bonnet flange + dome + nut
    s.hline(2, 11, 5, R[3]); s.hline(2, 11, 6, R[1]); s.puti(11, 5, R[4]); s.puti(2, 5, R[2])
    s.hline(4, 9, 4, STEEL[3]); s.hline(5, 9, 3, STEEL[4]); s.puti(4, 4, STEEL[2])
    s.hline(4, 9, 2, STEEL[4]); s.hline(5, 8, 2, STEEL[5]); s.puti(4, 3, STEEL[2])
    s.rect(6, 0, 7, 1, STEEL[4]); s.puti(7, 0, STEEL[5]); s.puti(6, 1, STEEL[2])
    # side outlets with caps
    s.rect(0, 9, 2, 11, STEEL[3]); s.vline(0, 9, 11, STEEL[2]); s.puti(1, 9, STEEL[4])
    s.rect(11, 9, 13, 11, STEEL[4]); s.vline(13, 9, 11, STEEL[5]); s.puti(11, 11, STEEL[2])
    # front pumper cap
    for y in range(8, 14):
        for x in range(4, 10):
            d = math.hypot(x + 0.5 - 7.0, y + 0.5 - 11.0)
            if d <= 2.6:
                s.puti(x, y, STEEL[3] if (x - 7) - (y - 11) < 1 else STEEL[4])
    s.puti(7, 10, STEEL[5]); s.puti(6, 11, STEEL[2])
    selout_body(s, [R, STEEL], ((-1, 0), (0, 1)))
    return s


# ==========================================================================
# 9) TRAFFIC SIGNAL
# ==========================================================================
def signal_lit():
    w, h = 22, 104
    s = Spr(w, h)
    S = S5
    K = SIGBK
    # pole
    vbar(s, 9, 12, 34, 99, [S[1], S[3], S[4], S[5]])
    # base flange + footing
    s.rect(7, 97, 14, 100, S[3]); s.hline(7, 14, 97, S[5]); s.vline(7, 97, 100, S[1])
    s.puti(8, 99, S[5]); s.puti(13, 99, S[5])
    s.rect(5, 101, 16, 103, CONC[3]); s.hline(5, 16, 101, CONC[5]); s.vline(5, 101, 103, CONC[2])
    s.hline(5, 16, 103, CONC[1]); s.vline(16, 101, 103, CONC[4])
    # pedestrian push-button box
    s.rect(13, 62, 17, 71, MUST[2]); s.vline(17, 62, 71, MUST[3]); s.hline(13, 62, 17, MUST[3])
    s.vline(13, 63, 71, MUST[1]); s.hline(13, 71, 17, MUST[0])
    s.rect(14, 64, 16, 66, S[4]); s.puti(15, 65, S[5]); s.puti(14, 66, S[2])
    s.rect(14, 68, 16, 69, K[1])
    # backplate with reflective border
    s.rect(1, 0, 20, 35, K[1])
    s.hline(2, 19, 0, REFL); s.hline(2, 19, 35, REFL); s.vline(1, 1, 34, REFL)
    s.vline(20, 1, 34, REFL)
    # housing
    s.rect(5, 1, 16, 34, K[2]); s.vline(16, 1, 34, K[4]); s.hline(5, 1, 16, K[4])
    s.vline(5, 1, 34, K[1])
    lenses = [(7.0, "red"), (17.5, "amber"), (28.0, "green")]
    for cy, kind in lenses:
        cx = 11.0
        # visor (hood) over the lens
        for x in range(6, 16):
            for y in range(int(cy) - 5, int(cy) + 1):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if 3.6 < d <= 5.0 and y + 0.5 < cy:
                    s.puti(x, y, K[4] if x >= 11 else K[3])
        for y in range(int(cy) - 4, int(cy) + 5):
            for x in range(6, 16):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d > 3.6:
                    continue
                if kind == "green":
                    c = SIG_G1
                    if d < 2.6:
                        c = SIG_G2
                    if (x + 0.5 - cx) + (y + 0.5 - cy) < -1.4 and d < 2.8:
                        c = SIG_G3
                elif kind == "red":
                    c = hx("#5a1622") if d > 2.4 else hx("#721c2a")
                    if (x + 0.5 - cx) + (y + 0.5 - cy) < -2.2 and d < 3.0:
                        c = hx("#9a3a46")
                else:
                    c = hx("#5a3c14") if d > 2.4 else hx("#74501a")
                    if (x + 0.5 - cx) + (y + 0.5 - cy) < -2.2 and d < 3.0:
                        c = hx("#9e7432")
                s.puti(x, y, c)
    selout_body(s, [S, CONC, MUST, K], ((-1, 0), (0, 1)))
    s.a[s.a[..., 3] == 0] = 0
    deglow(s, False)
    limit_body(s, 27)
    return s


# ==========================================================================
# 10) ICONS
# ==========================================================================
def icon_city():
    """Night skyline: a tall spired tower between two lower blocks, warm lit
    windows, a pink neon roof band and a cyan neon edge strip."""
    w = h = 16
    K = ("#22264a", "#343c6c", "#4c5a94")
    Y, P, C = "#ffd860", "#ff3ab0", "#3af0ff"

    def left(x, y):                                       # low block
        if 1 <= x <= 4 and 8 <= y <= 14:
            if y == 8:
                return P
            if x in (2, 3) and y in (10, 12) and not (x == 3 and y == 12):
                return Y
            return K[0] if x == 1 else K[1]
        return None

    def right(x, y):                                      # mid block
        if 11 <= x <= 14 and 5 <= y <= 14:
            if x == 14 and 6 <= y <= 13:
                return C
            if x == 12 and y in (7, 9, 11, 13) and y != 11:
                return Y
            if x == 13 and y == 11:
                return Y
            return K[0] if x == 11 else K[1]
        return None

    def tower(x, y):                                      # spired tower
        if x == 8 and 1 <= y <= 2:
            return P if y == 1 else K[2]
        if 7 <= x <= 9 and y == 3:
            return K[1] if x < 9 else K[2]
        if 6 <= x <= 10 and 4 <= y <= 14:
            if x in (7, 9) and y in (6, 8, 10, 12):
                return Y
            return K[0] if x == 6 else (K[2] if x == 10 else K[1])
        return None
    return rb.icon_stack(w, h, [rb.icon_layer(w, h, left), rb.icon_layer(w, h, right),
                                rb.icon_layer(w, h, tower)])


def wx_moon():
    """Crescent moon (lit outer limb) with a twinkle and a tiny star."""
    pal = {"o": rb.IC_O, "L": "#fff2c0", "M": "#ffdc78", "D": "#e2b45a",
           "s": "#ffd23a", "S": "#fff4a8"}
    rows = [
        "....ooo.....",
        "..ooLLMo.o..",
        ".oLLMMo.oso.",
        "oLLMMo.osSso",
        "oLMMo...oso.",
        "oLMMo....o..",
        "oLMMo.......",
        "oLMDo....o..",
        "oMMDDo..oSo.",
        ".oMDDDo..o..",
        "..ooDDDo....",
        "....ooo.....",
    ]
    return rb.icon_from(rows, pal)


# ==========================================================================
# registry / checks / save / preview
# ==========================================================================
SPRITES = [
    ("city_lamp_lit", city_lamp_lit), ("neon_palm_lit", neon_palm_lit),
    ("neon_blade_a_lit", neon_blade_a_lit), ("neon_blade_b_lit", neon_blade_b_lit),
    ("neon_blade_c_lit", neon_blade_c_lit), ("neon_blade_d_lit", neon_blade_d_lit),
    ("neon_billboard_lit", neon_billboard_lit), ("neon_arch_lit", neon_arch_lit),
    ("food_cart_lit", food_cart_lit), ("bus_stop_lit", bus_stop_lit), ("hydrant", hydrant),
    ("signal_lit", signal_lit), ("icon_city", icon_city), ("wx_moon", wx_moon),
]
TARGET = {"city_lamp_lit": (28, 122), "neon_palm_lit": (70, 158),
          "neon_blade_a_lit": (32, 80), "neon_blade_b_lit": (34, 84),
          "neon_blade_c_lit": (30, 76), "neon_blade_d_lit": (36, 90),
          "neon_billboard_lit": (104, 84), "neon_arch_lit": (256, 112),
          "food_cart_lit": (50, 46), "bus_stop_lit": (72, 54), "hydrant": (14, 18),
          "signal_lit": (22, 104), "icon_city": (16, 16), "wx_moon": (12, 12)}
EXACT = {"neon_arch_lit", "icon_city", "wx_moon"}
FREE_BASE = {"neon_blade_a_lit", "neon_blade_b_lit", "neon_blade_c_lit", "neon_blade_d_lit",
             "icon_city", "wx_moon"}


def check(s, name):
    a = s.a
    op = a[..., 3] > 0
    al = set(np.unique(a[..., 3]).tolist())
    assert al <= {0, 255}, name + ": alpha not 0/255"
    cols = {tuple(int(v) for v in c) for c in a[op][:, :3]}
    tw, th = TARGET[name]
    if name in EXACT:
        assert (s.w, s.h) == (tw, th), name + ": size"
    else:
        assert abs(s.w - tw) <= 0.15 * tw and abs(s.h - th) <= 0.15 * th, name + ": size"
    msg = "%-18s %3dx%-3d cols=%2d" % (name, s.w, s.h, len(cols))
    if name not in FREE_BASE:
        assert op[-1].any(), name + ": bottom row empty"
        xs = np.nonzero(op[-1])[0]
        mid = (xs.min() + xs.max()) / 2.0
        assert abs(mid - (s.w - 1) / 2.0) <= 0.5, name + ": base not centred"
        msg += " base %d..%d mid %.1f" % (xs.min(), xs.max(), mid)
    lit = name.endswith("_lit")
    neon = name.startswith("neon_")
    if lit:
        bad_light = [c for c in cols if c in LIGHTS and not glows(c, neon)]
        bad_body = [c for c in cols if c not in LIGHTS and not safe(c, neon)]
        assert not bad_light, (name, "light colours that do not glow", bad_light)
        assert not bad_body, (name, "body colours that glow", bad_body)
        if neon and name != "neon_palm_lit":          # sign housings / steel stay dim
            hot = [c for c in cols if c not in LIGHTS and max(c) >= 190]
            assert not hot, (name, "housing colours >= 190", hot)
        n_glow = sum(int((op & np.all(a[..., :3] == np.array(c, np.uint8), axis=-1)).sum())
                     for c in cols if c in LIGHTS)
        msg += " glow px=%d" % n_glow
    elif not name.startswith(("icon_", "wx_")):
        hot = [c for c in cols if c in LIGHTS]
        assert not hot, (name, "light colours in an unlit sprite", hot)
    print(msg)
    return len(cols)


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


PREVIEW_ROWS = [
    ["city_lamp_lit", "neon_palm_lit", "signal_lit", "neon_blade_a_lit", "neon_blade_b_lit",
     "neon_blade_c_lit", "neon_blade_d_lit", "hydrant"],
    ["neon_billboard_lit", "bus_stop_lit", "food_cart_lit", "icon_city", "wx_moon"],
    ["neon_arch_lit"],
]
BG_MID = (128, 128, 128)
BG_DARK = hx("#12102a")


def preview(fname=os.path.join(HERE, "preview_routes_c.png"), zoom=4, pad=6):
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

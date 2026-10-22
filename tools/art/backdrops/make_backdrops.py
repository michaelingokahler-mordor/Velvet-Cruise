#!/usr/bin/env python3
"""
Velvet Cruise -- parallax backdrop generator (Pillow + numpy only).

Writes to ./out/:
    sky_s{N}.png   640x80, opaque.  Dithered sky bands, sun/moon/stars, pixel clouds.
    far_s{N}.png   640x56, RGBA (alpha 0/255).  Bottom row = horizon (screen y 79).
                   Land/headlands on tile x ~560..639,0..300, open sea ~300..560.
Stages (the sun sinks stage by stage; sun tile x = themes.ts sunX + 160):
    1 Palm Cove      afternoon     high sun, blue-grey headlands           (approved)
    2 Coral Bluffs   golden hour   lower golden sun, layered sandstone bluffs,
                                   sea stacks + a sea arch, sailboats
    3 Surfside       sunset        low sun with haze slices                (approved)
    4 Cypress Point  late sunset   half disk on the horizon, forested headlands
                                   with cypress silhouettes, rocky islets (lone cypress)
    5 Twilight Bay   dusk          afterglow only, a few single-pixel stars, thin
                                   crescent, lit windows on the hills, city lights
                                   across the bay
Previews (next to this script):
    preview_s{N}.png       game window (tile x 160..479) at 3x, composited over a sea gradient
    preview_tile_s{N}.png  the full 640 tile at 3x

Usage:  python3 make_backdrops.py            (all stages)
        python3 make_backdrops.py 3 4        (only some stages)
"""
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
W, SKY_H, FAR_H = 640, 80, 56
WIN0 = 160                # visible window = tile x 160..479 when the road is straight
SCREEN_W, SCREEN_H, HORIZON = 320, 180, 80
FAR_TOP = HORIZON - FAR_H  # screen row of far layer row 0 (=24)
ZOOM = 3


# ----------------------------------------------------------------------------
# colour helpers
# ----------------------------------------------------------------------------
def C(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mix(a, b, t):
    a = C(a) if isinstance(a, str) else a
    b = C(b) if isinstance(b, str) else b
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def wrapdx(x, cx):
    """signed horizontal distance on the 640 ring"""
    return ((x - cx + W / 2) % W) - W / 2


# ----------------------------------------------------------------------------
# ordered dither: quarter levels with row-staggered patterns (period 4 -> tiles)
# ----------------------------------------------------------------------------
def dmask(q, X, Y):
    p1 = ((X + 2 * (Y & 1)) % 4) == 0
    p2 = ((X + Y) & 1) == 0
    p3 = ((X + 2 * (Y & 1)) % 4) != 2
    out = q >= 4
    out = out | ((q == 1) & p1)
    out = out | ((q == 2) & p2)
    out = out | ((q == 3) & p3)
    return out


def quantize(u, k, X, Y, umax):
    """u = continuous palette coordinate. Solid in band centres, dithered
    (25/50/75 %) across a zone of width 1/k around each band boundary."""
    i = np.floor(u)
    f = u - i
    lv = np.clip((f - 0.5) * k + 0.5, 0.0, 1.0)
    q = np.rint(lv * 4).astype(int)
    idx = i.astype(int) + dmask(q, X, Y)
    return np.clip(idx, 0, umax)


def periodic_noise(seed, knots, n=W):
    """smooth 1-D value noise that wraps over the 640 tile, range -1..1"""
    rng = np.random.default_rng(seed)
    vals = rng.uniform(-1, 1, knots)
    x = np.arange(n) * knots / n
    i0 = np.floor(x).astype(int) % knots
    i1 = (i0 + 1) % knots
    f = x - np.floor(x)
    f = f * f * (3 - 2 * f)
    return vals[i0] * (1 - f) + vals[i1] * f


# ----------------------------------------------------------------------------
# STAGES
# ----------------------------------------------------------------------------
STAGES = {
    1: dict(
        name="Palm Cove",
        sky=[(0, "#3a6fd8"), (26, "#5d94ec"), (47, "#8fbdf2"), (63, "#c6dff0"), (77, "#f3e2b0")],
        glow_ext=["#ffe28a"],
        sun=dict(x=235, y=24, r=11, disk="#fff6c8", rim="#ffeeb0", w0=2.5, sx=1.25,
                 bulge=2.6, bR=34.0, bsx=1.7, bq=1.4),
        clouds=dict(ramp=["#bccde9", "#dfe8f6", "#ffffff"], rim="#f7d9b0", under="#dfe8f6",
                    light=(0.45, -1.0), wl=1.0, wg=0.7, th=[0.5, 0.95]),
        cloud_list=[
            ("cu", 236, 36, 84, 21), ("cu", 520, 28, 72, 18), ("cu", 64, 40, 62, 15),
            ("cu", 318, 16, 38, 10), ("cu", 612, 50, 46, 11), ("cu", 470, 56, 34, 8),
            ("cu", 150, 22, 32, 8),
            ("st", 440, 68, 60, 1, 2, ("#dfe8f6", "#ffffff", "#f7d9b0", "#ffffff")),
            ("st", 120, 66, 70, 2, 2, ("#dfe8f6", "#ffffff", "#f7d9b0", "#ffffff")),
            ("st", 580, 64, 50, 1, 2, ("#dfe8f6", "#ffffff", "#f7d9b0", "#ffffff")),
        ],
        sea=("#6fa8d8", "#1f5aa8"),
        hills=["#8aa6b8", "#7a97a8", "#6f8a96"],
        warm="#fff0c8", cool="#3d4f86", foam="#eef4f2",
        stack="#7a8f9a", sail=("#ffffff", "#d6e0ee"), hull=("#3a4a6a", "#c04040"),
    ),
    2: dict(
        name="Coral Bluffs",
        sky=[(0, "#4a7fd6"), (17, "#6896de"), (31, "#86aee6"), (42, "#b8bade"),
             (53, "#e9c7a0"), (65, "#f6bd82"), (76, "#ffb466")],
        mid=False,
        glow_ext=["#ffc457", "#ffdc80"],
        sun=dict(x=225, y=42, r=12, disk="#fff0a8", rim="#ffe08a", w0=2.6, sx=1.4,
                 bulge=2.4, bR=36.0, bsx=2.0, bq=1.4),
        clouds=dict(ramp=["#d8c0c4", "#f4e2d4", "#fff6e4"], rim="#f2b878", under="#ffe2a8",
                    light=(0.8, -0.9), wl=1.0, wg=0.6, th=[0.5, 0.95]),
        cloud_list=[
            ("cu", 252, 30, 92, 18), ("cu", 505, 38, 80, 16), ("cu", 60, 24, 72, 14),
            ("cu", 600, 16, 44, 9), ("cu", 150, 48, 44, 9),
            ("st", 400, 12, 60, 1, 2, ("#d8c0c4", "#f4e2d4", "#ffe2a8", "#f4e2d4")),
            ("st", 320, 62, 70, 2, 2, ("#f4e2d4", "#ffe2a8", "#f2b878", "#ffe2a8")),
            ("st", 470, 58, 60, 2, 2, ("#f4e2d4", "#ffe2a8", "#f2b878", "#ffe2a8")),
            ("st", 100, 60, 80, 2, 2, ("#f4e2d4", "#ffe2a8", "#f2b878", "#ffe2a8")),
            ("st", 580, 66, 60, 1, 2, ("#f4e2d4", "#ffe2a8", "#f2b878", "#ffe2a8")),
        ],
        sea=("#8fb0d0", "#27559a"),
        # sandstone bluffs, hazier (lighter) with distance: back -> front
        hills=["#cf9f7c", "#bd8a62", "#a8734e"],
        warm="#ffd890", cool="#5a3a58", foam="#fff0dc",
        # horizontal sandstone bedding on the bluff faces (per layer: period)
        strata=dict(period=[3, 4, 5], dark=0.30, light=0.16, scrub="#6e7a3e"),
        stack="#8e5c4c", sail=("#fff6e6", "#e8c8b0"), hull=("#4a3048", "#3a6ab0"),
    ),
    3: dict(
        name="Surfside",
        sky=[(0, "#4b3fc8"), (14, "#7a4fcc"), (28, "#b85bc0"), (42, "#e46fa8"),
             (56, "#ff9a5a"), (67, "#ffc040"), (76, "#ffd25a")],
        glow_ext=["#ffe066"],
        sun=dict(x=222, y=60, r=13, disk="#fff3b0", rim="#fff0a0", w0=3.0, sx=1.5,
                 bulge=2.6, bR=40.0, bsx=2.4, bq=1.5),
        clouds=dict(ramp=["#c86aa0", "#e88aa8", "#ffb0a0", "#ff8c6a"], rim="#ffc46a", under=None,
                    light=(0.3, 1.0), wl=0.8, wg=0.9, th=[0.5, 0.95, 1.4]),
        cloud_list=[
            ("st", 520, 20, 70, 2, 2, ("#c86aa0", "#f08aa8", "#ffb0a0", "#e88aa8")),
            ("cu", 245, 30, 120, 22), ("cu", 470, 16, 70, 12), ("cu", 40, 24, 90, 16),
            ("cu", 600, 34, 60, 11),
            ("st", 330, 39, 90, 2, 2, ("#e46fa8", "#ff9a7a", "#ffc46a", "#ffa070")),
            ("st", 150, 46, 100, 2, 2, ("#e46fa8", "#ff9a7a", "#ffc46a", "#ffa070")),
            ("st", 455, 46, 80, 2, 2, ("#e46fa8", "#ff9a7a", "#ffc46a", "#ffa070")),
            ("st", 590, 50, 90, 2, 2, ("#e46fa8", "#ff9a7a", "#ffc46a", "#ffa070")),
            ("st", 300, 62, 80, 2, 2, ("#f08a50", "#ffe066", "#fff0a0", "#ffe066")),
            ("st", 470, 66, 60, 1, 2, ("#f08a50", "#ffe066", "#fff0a0", "#ffe066")),
            ("st", 90, 64, 90, 2, 2, ("#f08a50", "#ffe066", "#fff0a0", "#ffe066")),
            ("st", 560, 68, 70, 1, 2, ("#f08a50", "#ffe066", "#fff0a0", "#ffe066")),
        ],
        sea=("#a070b8", "#2a4fb8"),
        hills=["#a0609a", "#8a4f8a", "#6f4078"],
        warm="#ff9a6a", cool="#2e2060", foam="#ffe0c0",
        stack="#7a4a7a", sail=("#fff4e8", "#f0a8a0"), hull=("#3a2448", "#d04848"),
    ),
    4: dict(
        name="Cypress Point",
        sky=[(0, "#2e2470"), (18, "#5a3090"), (36, "#a0408e"), (53, "#e05a6a"),
             (65, "#ff7a3a"), (75, "#ff8a3a")],
        glow_ext=["#ffa448", "#ffc05a"],
        # half sunk: the centre sits on the horizon (screen row 80), so only the
        # upper half disk is in the 80-row sky
        sun=dict(x=215, y=80, r=14, disk="#ffe48a", rim="#fff4c0", w0=2.6, sx=1.5,
                 bulge=2.6, bR=48.0, bsx=2.8, bq=1.5, bvy=1.3, ncore=2,
                 slices=[(73, 1), (76, 1), (78, 1)], toprim=True),
        clouds=dict(ramp=["#3a2262", "#6a2c7a", "#b4407e", "#ff6a5a"], rim="#ffa060", under=None,
                    light=(0.25, 1.0), wl=0.7, wg=1.0, th=[0.55, 1.0, 1.45]),
        cloud_list=[
            ("st", 330, 9, 130, 2, 2, ("#2e2268", "#3e2672", "#9a3c82", "#3e2672")),
            ("st", 600, 6, 90, 2, 2, ("#2e2268", "#3e2672", "#9a3c82", "#3e2672")),
            ("st", 120, 13, 100, 2, 2, ("#2e2268", "#3e2672", "#9a3c82", "#3e2672")),
            ("cu", 250, 34, 104, 17), ("cu", 520, 28, 92, 15), ("cu", 40, 36, 84, 14),
            ("st", 420, 46, 110, 2, 2, ("#5a2c78", "#82347e", "#ff6a5a", "#a03c80")),
            ("st", 160, 50, 100, 2, 2, ("#5a2c78", "#82347e", "#ff6a5a", "#a03c80")),
            ("st", 610, 52, 90, 2, 2, ("#5a2c78", "#82347e", "#ff6a5a", "#a03c80")),
            ("st", 285, 60, 60, 1, 2, ("#9a3c78", "#c04870", "#ffa060", "#c04870")),
            ("st", 470, 62, 80, 1, 2, ("#9a3c78", "#c04870", "#ffa060", "#c04870")),
            ("st", 80, 63, 80, 1, 2, ("#9a3c78", "#c04870", "#ffa060", "#c04870")),
        ],
        sea=("#b05a78", "#2e2a70"),
        # dark forested headlands, back -> front
        hills=["#56305e", "#422650", "#301c40"],
        warm="#ff6a4a", cool="#140a26", foam="#ffb08a",
        forest=dict(tree="#1a0e24", rim="#d0505a"),
        stack="#3a2448", sail=("#ffc8a0", "#c06a70"), hull=("#2a1838", "#2a1838"),
    ),
    5: dict(
        name="Twilight Bay",
        sky=[(0, "#0e1236"), (16, "#1e2058"), (32, "#3a2a78"), (46, "#6a3a8a"),
             (60, "#b04f8a"), (75, "#e8789a")],
        glow_ext=["#f4949a", "#ffb09a"],
        sun=None,
        # the sun has gone: only an afterglow on the horizon where it set
        horizon_glow=dict(x=210, steps=3.2, ax=120.0, ay=13.0, p=0.85),
        moon=dict(x=78, y=15, r=6, off=(-2.2, -1.4), lit="#fff2d0", shade="#e8c49a"),
        stars=dict(n=34, ymax=36, seed=555),
        clouds=dict(ramp=["#2a2460", "#3e2c6c", "#6a3a7a"], rim="#c0608a", under=None,
                    light=(0.2, 1.0), th=[0.6, 1.3]),
        cloud_list=[
            ("st", 330, 50, 120, 2, 2, ("#3a2a6c", "#3a2a6c", "#c8628e", "#3a2a6c")),
            ("st", 520, 45, 100, 2, 2, ("#3a2a6c", "#3a2a6c", "#c8628e", "#3a2a6c")),
            ("st", 110, 55, 110, 2, 2, ("#3a2a6c", "#3a2a6c", "#c8628e", "#3a2a6c")),
            ("st", 420, 62, 90, 1, 2, ("#7a3a7e", "#7a3a7e", "#f08a9a", "#7a3a7e")),
            ("st", 240, 66, 70, 1, 2, ("#7a3a7e", "#7a3a7e", "#f08a9a", "#7a3a7e")),
            ("st", 610, 64, 80, 1, 2, ("#7a3a7e", "#7a3a7e", "#f08a9a", "#7a3a7e")),
        ],
        sea=("#6a4a8a", "#1a1a40"),
        hills=["#3e3068", "#2e2456", "#221a46"],
        warm="#b04f8a", cool="#0e1236", foam="#c07a9a",
        stack="#2a2050", sail=("#5a4a8a", "#3a2e6a"), hull=("#1a1638", "#1a1638"),
        lights="#ffd27a",
        town=dict(cols=["#ffd27a", "#ffb060", "#fff0c0"], dim=["#d89060", "#b07060"],
                  n=[22, 40, 70], seed=505),
        city=dict(x0=396, x1=536, sil="#3e2c64", top="#523a78", seed=78),
    ),
}


# ----------------------------------------------------------------------------
# SKY
# ----------------------------------------------------------------------------
def sky_palette(st):
    stops = st["sky"]
    pal, ys = [], []
    for j, (y, c) in enumerate(stops):
        if j > 0 and st.get("mid", True):
            y0, c0 = stops[j - 1]
            pal.append(mix(c0, c, 0.5))
            ys.append((y0 + y) / 2)
        pal.append(C(c))
        ys.append(y)
    return pal, ys


def render_sky(sn):
    st = STAGES[sn]
    Y, X = np.mgrid[0:SKY_H, 0:W]
    pal, ys = sky_palette(st)
    n_sky = len(pal)
    ext = [C(c) for c in st["glow_ext"]]
    full = pal + ext
    umax = len(full) - 1
    haze_i = n_sky - 1

    # row field
    yrow = np.arange(SKY_H, dtype=float)
    u_row = np.interp(yrow, ys, np.arange(n_sky))
    band_h = np.interp(yrow, [(ys[j] + ys[j + 1]) / 2 for j in range(n_sky - 1)],
                       [ys[j + 1] - ys[j] for j in range(n_sky - 1)])
    k_row = np.maximum(1.0, band_h / 3.0)
    u = np.repeat(u_row[:, None], W, 1)
    k = np.repeat(k_row[:, None], W, 1)

    # sun glow: (a) the bands bulge upward around the sun (horizontally
    # elongated), (b) tight core rings in the glow colours hug the disk
    sun = st.get("sun")
    if sun:
        cx = WIN0 + sun["x"]
        dx = wrapdx(X, cx)
        dy = Y - sun["y"]
        # (a) bulge
        db = np.sqrt((dx / sun["bsx"]) ** 2 + (np.minimum(dy, 0) * sun.get("bvy", 1.7)) ** 2 + (np.maximum(dy, 0) * 0.6) ** 2)
        B = sun["bulge"] * np.clip(1 - db / sun["bR"], 0, 1) ** sun["bq"]
        u = np.minimum(u + B, haze_i)
        # (b) core rings
        d = np.sqrt((dx / sun["sx"]) ** 2 + dy ** 2)
        de = np.maximum(0.0, d - sun["r"])
        u_core = umax - de / sun["w0"] - np.maximum(0, de - sun["w0"] * sun.get("ncore", 2)) * 0.9
        k_core = np.full(u.shape, max(1.0, sun["w0"] / 2.0))
        take = u_core > u
        u = np.where(take, u_core, u)
        k = np.where(take, k_core, k)
    hg = st.get("horizon_glow")
    if hg:
        cx = WIN0 + hg["x"]
        dx = wrapdx(X, cx)
        dy = (SKY_H + 2) - Y
        d = np.sqrt((dx / hg["ax"]) ** 2 + (dy / hg["ay"]) ** 2)
        s = (d ** hg["p"]) * hg["steps"]
        u_g = umax - s
        k_g = np.full(u.shape, 2.2)
        take = u_g > u
        u = np.where(take, u_g, u)
        k = np.where(take, k_g, k)

    idx = quantize(u, k, X, Y, umax)
    img = np.array(full, dtype=np.uint8)[idx]

    # stars / moon (behind clouds)
    if sn == 5:
        draw_stars(img, st)
        draw_moon(img, st)

    # sun disk
    if sun:
        cx = WIN0 + sun["x"]
        dx = wrapdx(X, cx)
        dy = Y - sun["y"]
        r = sun["r"]
        dd = dx * dx + dy * dy
        disk = dd <= r * r + r * 0.8
        img[disk] = C(sun["disk"])
        # a faint warm rim on the lower half of the disk
        inner = dd <= (r - 1) * (r - 1) + (r - 1) * 0.8
        rim = disk & ~inner & (dy > r * 0.25)
        img[rim] = C(sun["rim"])
        if sun.get("toprim"):
            # sun sitting on the horizon: brighter crown along the top of the half disk
            above = np.roll(disk, 1, axis=0)
            above[0, :] = False
            core = disk & (dd <= (r - 3) * (r - 3) + (r - 3) * 0.8)
            img[core] = C(sun["rim"])
            img[disk & ~above] = C(sun["rim"])
        # horizontal haze slices through the low sun (classic arcade touch)
        slices = sun.get("slices", [(66, 1), (70, 1), (73, 1)] if sn == 3 else None)
        if slices:
            for (yy, hh) in slices:
                band = disk & (Y >= yy) & (Y < yy + hh)
                img[band] = full[umax]

    # clouds
    draw_clouds(img, sn, st)
    return img


# ----------------------------------------------------------------------------
# clouds
# ----------------------------------------------------------------------------
def _normL(light):
    L = np.array(light, float)
    return L / np.linalg.norm(L)


GY, GX = np.mgrid[0:SKY_H, 0:W]


def cumulus_puffs(rng, cx, base, w, h):
    """a crown of 2-6 distinct round domes with notches between them, shoulder
    domes at the ends and a front row of low domes on the flat base."""
    puffs = []
    n = int(np.clip(round(w / (h * 0.95)), 2, 6))
    span = w * 0.30
    xs = np.linspace(cx - span, cx + span, n) + rng.uniform(-0.12, 0.12, n) * (2 * span / max(1, n - 1))
    order = list(range(n))
    for i in order:
        x = xs[i]
        t = (x - cx) / (w * 0.5)
        env = max(0.25, 1 - t * t) ** 0.75
        ph = h * env * rng.uniform(0.78, 1.0)
        r = max(3.0, ph * 0.56 * rng.uniform(0.85, 1.05))
        puffs.append((x, base - ph + r, r * rng.uniform(1.0, 1.18), r))
    # shoulders
    for side in (-1, 1):
        r = max(2.5, h * rng.uniform(0.26, 0.34))
        x = cx + side * w * rng.uniform(0.40, 0.45)
        puffs.append((x, base - r * 1.05, r * 1.25, r))
    # front row
    x = cx - w * 0.47 + rng.uniform(0, 3)
    while x < cx + w * 0.47:
        t = (x - cx) / (w * 0.5)
        env = max(0.35, (1 - t * t)) ** 0.5
        r = max(2.2, h * 0.30 * env * rng.uniform(0.75, 1.15))
        puffs.append((x, base - r * 0.65, r * rng.uniform(1.3, 1.6), r))
        x += r * rng.uniform(2.0, 2.6)
    return puffs


def chord_depth(px, py, rx, ry, l):
    """inside-mask and, per pixel, the distance to the ellipse rim walking AWAY
    from the light (0 on the shadow-side rim, ~2r on the lit side)."""
    qx = wrapdx(GX, px) / rx
    qy = (GY - py) / ry
    mx = -l[0] / rx
    my = -l[1] / ry
    mm = mx * mx + my * my
    qm = qx * mx + qy * my
    qq = qx * qx + qy * qy
    inside = qq <= 1.0
    disc = np.maximum(qm * qm - mm * (qq - 1), 0)
    s = (-qm + np.sqrt(disc)) / mm
    return inside, s


def streak_mask(rng, cx, y, length, thick, slant=0.0, broken=True):
    m = np.zeros((SKY_H, W), bool)
    for j in range(thick):
        c = (thick - 1) / 2
        frac = 1 - abs(j - c) / (c + 1) if thick > 1 else 1
        L = length * (0.55 + 0.45 * frac) * rng.uniform(0.85, 1.1)
        x0 = cx - L / 2 + rng.uniform(-0.1, 0.1) * L + j * slant
        x1 = x0 + L
        yy = int(y + j)
        if not (0 <= yy < SKY_H):
            continue
        xs = np.arange(int(round(x0)), int(round(x1)))
        m[yy, xs % W] = True
        if broken:
            for side in (-1, 1):
                pos = x0 if side < 0 else x1
                for _ in range(int(rng.integers(0, 3))):
                    gap = int(rng.integers(2, 5))
                    dl = int(rng.integers(3, 9))
                    if side < 0:
                        e = int(round(pos)) - gap
                        s = e - dl
                        pos = s
                    else:
                        s = int(round(pos)) + gap
                        e = s + dl
                        pos = e
                    m[yy, np.arange(s, e) % W] = True
    return m


def streak_group(rng, cx, y, length, n=2, thick=2):
    m = np.zeros((SKY_H, W), bool)
    for k in range(n):
        L = length * (1.0 - 0.25 * k) * rng.uniform(0.8, 1.05)
        ox = rng.uniform(-0.3, 0.3) * length
        m |= streak_mask(rng, cx + ox, y + k * (thick + 0) - (k > 0) * rng.integers(0, 2), L, thick)
    return m


def cleanup(colmap, mask):
    """remove lone specks: a pixel flanked (h or v) by two equal different colours"""
    c = colmap.copy()
    key = (c[..., 0].astype(int) << 16) | (c[..., 1].astype(int) << 8) | c[..., 2].astype(int)
    for axis in (1, 0):
        a = np.roll(key, 1, axis=axis)
        b = np.roll(key, -1, axis=axis)
        ma = np.roll(mask, 1, axis=axis)
        mb = np.roll(mask, -1, axis=axis)
        if axis == 0:
            ma[0, :] = False
            mb[-1, :] = False
        lone = mask & ma & mb & (a == b) & (a != key)
        src = np.roll(c, 1, axis=axis)
        c[lone] = src[lone]
        key = (c[..., 0].astype(int) << 16) | (c[..., 1].astype(int) << 8) | c[..., 2].astype(int)
    return c


def paint_puff_cloud(img, puffs, base, h, cl):
    """score = wl * (local chord depth / r) + wg * global height term.
    Daylight (light from above): global term = height in the cloud.
    Lit from below: global term = closeness to the base."""
    ramp = np.array([C(c) for c in cl["ramp"]], np.uint8)
    l = np.array(cl["light"][:2], float)
    l /= np.linalg.norm(l)
    th = cl["th"]
    wl, wg = cl.get("wl", 0.6), cl.get("wg", 1.0)
    mask = np.zeros((SKY_H, W), bool)
    score = np.zeros((SKY_H, W), float)
    hf = np.clip((base - GY) / max(1.0, h), 0, 1)
    glob = hf if l[1] < 0 else (1 - hf)
    for (px, py, rx, ry) in puffs:
        inside, s = chord_depth(px, py, rx, ry, l)
        inside &= GY <= base
        sc = wl * np.minimum(s / ry, 2.0) + wg * glob
        score[inside] = sc[inside]
        mask |= inside
    lev = np.zeros((SKY_H, W), int)
    for t in th:
        lev += score > t
    col = img.copy()
    col[mask] = ramp[np.clip(lev, 0, len(ramp) - 1)[mask]]
    below = np.roll(mask, -1, axis=0)
    below[-1, :] = False
    rim = mask & ~below
    under = mask & np.roll(rim, -1, axis=0) & ~rim
    if cl.get("under"):
        col[under & (GY >= base - 1)] = C(cl["under"])
    col[rim] = C(cl["rim"])
    col = cleanup(col, mask)
    img[mask] = col[mask]
    return mask


def paint_streaks(img, m, cols):
    above = np.roll(m, 1, axis=0)
    above[0, :] = False
    below = np.roll(m, -1, axis=0)
    below[-1, :] = False
    top = m & ~above
    bot = m & ~below
    img[m] = C(cols[1])
    img[top & below] = C(cols[0])
    img[bot & above] = C(cols[2])
    single = top & bot
    img[single] = C(cols[3] if len(cols) > 3 else cols[1])


def draw_clouds(img, sn, st):
    cl = st["clouds"]
    rng = np.random.default_rng(100 + sn)
    for item in st["cloud_list"]:
        kind = item[0]
        if kind == "cu":
            _, cx, base, w, h = item
            paint_puff_cloud(img, cumulus_puffs(rng, cx, base, w, h), base, h, cl)
        elif kind == "st":
            _, cx, y, L, n, thick, cols = item
            paint_streaks(img, streak_group(rng, cx, y, L, n, thick), cols)


# ----------------------------------------------------------------------------
# night details
# ----------------------------------------------------------------------------
def draw_stars(img, st):
    """a few single-pixel stars in the upper (darkest) sky only; brighter
    ones higher up, dimmer ones fading out toward the purple band"""
    cfg = st["stars"]
    rng = np.random.default_rng(cfg["seed"])
    moon = st["moon"]
    mx, my = WIN0 + moon["x"], moon["y"]
    bright, mid, dim = C("#ffffff"), C("#e4dcff"), C("#a8a0e0")
    warm = C("#ffe8c8")
    placed = []
    tries = 0
    while len(placed) < cfg["n"] and tries < 5000:
        tries += 1
        x = int(rng.integers(0, W))
        y = int(min(rng.integers(0, cfg["ymax"]), rng.integers(0, cfg["ymax"])))
        if abs(wrapdx(x, mx)) < 11 and abs(y - my) < 10:
            continue
        # keep them sparse: nobody within 9 px
        if any(abs(wrapdx(x, px)) < 9 and abs(y - py) < 6 for px, py in placed):
            continue
        placed.append((x, y))
    for i, (x, y) in enumerate(placed):
        if y < 12:
            c = bright if i % 3 == 0 else (warm if i % 5 == 1 else mid)
        elif y < 24:
            c = mid if i % 2 == 0 else dim
        else:
            c = dim
        img[y, x] = c
    return placed


def draw_moon(img, st):
    """thin crescent; the lit limb faces down-right, toward where the sun set"""
    moon = st["moon"]
    cx, cy, r = WIN0 + moon["x"], moon["y"], moon["r"]
    ox, oy = moon.get("off", (-2.6, -1.6))
    Y, X = np.mgrid[0:SKY_H, 0:W]
    dx = wrapdx(X, cx)
    dy = Y - cy
    a = dx * dx + dy * dy <= r * r + r * 0.8
    dx2 = wrapdx(X, cx + ox)
    dy2 = Y - (cy + oy)
    b = dx2 * dx2 + dy2 * dy2 <= r * r + r * 0.8
    cres = a & ~b
    img[cres] = C(moon.get("lit", "#fff2d0"))
    # inner terminator shade
    dx3 = wrapdx(X, cx + ox * 0.62)
    dy3 = Y - (cy + oy * 0.62)
    c = dx3 * dx3 + dy3 * dy3 <= r * r + r * 0.8
    img[cres & c] = C(moon.get("shade", "#e8c49a"))


# ----------------------------------------------------------------------------
# FAR LAYER
# ----------------------------------------------------------------------------
def headland_profile(start, end, H, h_end, cliff_w, seed, rough=0.18, rise=34, taper=40):
    length = (end - start) % W
    x = np.arange(W)
    t = ((x - start) % W).astype(float)
    n1 = periodic_noise(seed, 22)
    n2 = periodic_noise(seed + 7, 64)
    h = np.zeros(W)
    for i in range(W):
        ti = t[i]
        if ti > length:
            continue
        # rising out of the sea on the far side
        if ti < rise:
            f = ti / rise
            env = f * f * (3 - 2 * f)
        else:
            env = 1.0
        # tapering toward the seaward point
        dist_end = length - ti
        if dist_end < taper + cliff_w:
            f = max(0.0, (dist_end - cliff_w) / taper)
            f = f * f * (3 - 2 * f)
            env *= (h_end / H) + (1 - h_end / H) * f
        hh = H * env * (1 + rough * n1[i]) + 1.6 * n2[i] * env
        # the cliff
        if dist_end < cliff_w:
            g = dist_end / cliff_w
            hh = (h_end * (1 + rough * n1[i])) * (g ** 0.45)
        h[i] = max(0.0, hh)
    return np.rint(h).astype(int), length


def edge_dist(mask):
    """per pixel: run-length to the right edge / left edge in the row (wrap),
    and depth below the top edge in the column"""
    Hh, Ww = mask.shape
    re = np.zeros(mask.shape, int)
    le = np.zeros(mask.shape, int)
    for y in range(Hh):
        row = mask[y]
        if row.all():
            re[y] = 99
            le[y] = 99
            continue
        acc = 0
        start = int(np.argmin(row))  # an empty pixel
        for k in range(1, Ww + 1):
            xx = (start - k) % Ww
            acc = acc + 1 if row[xx] else 0
            re[y, xx] = acc - 1 if row[xx] else -1
        acc = 0
        for k in range(1, Ww + 1):
            xx = (start + k) % Ww
            acc = acc + 1 if row[xx] else 0
            le[y, xx] = acc - 1 if row[xx] else -1
    td = np.zeros(mask.shape, int)
    acc = np.zeros(Ww, int)
    for y in range(Hh):
        acc = np.where(mask[y], acc + 1, 0)
        td[y] = acc - 1
    return re, le, td


HEADLANDS = {
    # back -> front:  (start, end, H, h_end, cliff_w, seed, rough)
    1: [(548, 300, 22, 9, 4, 11, 0.20), (566, 258, 33, 17, 5, 12, 0.22), (588, 212, 46, 27, 6, 13, 0.20)],
    2: [(548, 302, 21, 12, 3, 21, 0.10), (566, 260, 32, 22, 4, 22, 0.10), (588, 214, 45, 32, 5, 23, 0.10)],
    3: [(548, 300, 22, 10, 4, 31, 0.20), (566, 258, 33, 18, 5, 32, 0.22), (588, 210, 47, 28, 6, 33, 0.22)],
    4: [(548, 298, 23, 10, 4, 41, 0.28), (566, 256, 34, 18, 5, 42, 0.30), (588, 212, 47, 26, 6, 43, 0.28)],
    5: [(548, 300, 21, 9, 4, 51, 0.18), (566, 258, 31, 16, 5, 52, 0.20), (588, 212, 44, 25, 6, 53, 0.18)],
}


def render_far(sn):
    st = STAGES[sn]
    img = np.zeros((FAR_H, W, 4), np.uint8)
    Y, X = np.mgrid[0:FAR_H, 0:W]
    pal_sky, _ = sky_palette(st)
    haze = pal_sky[-1]
    warm, cool = st["warm"], st["cool"]
    layers = HEADLANDS[sn]
    n = len(layers)
    tops = []
    for li, (start, end, H, h_end, cw, seed, rough) in enumerate(layers):
        base = C(st["hills"][li])
        depth = 1 - li / (n - 1)  # 1 = farthest
        h, length = headland_profile(start, end, H, h_end, cw, seed, rough)
        if "forest" in st:
            h = canopy_profile(h, start, length, cw, li, seed)
        mask = Y >= (FAR_H - h)[None, :]
        re, le, td = edge_dist(mask)
        lit = mix(base, warm, 0.30 - 0.08 * depth)
        hil = mix(base, warm, 0.55 - 0.12 * depth)
        shd = mix(base, cool, 0.22 - 0.06 * depth)
        col = np.zeros((FAR_H, W, 3), float)
        col[:] = base
        w_lit = 2 + li
        litm = mask & (re >= 0) & (re < w_lit)
        col[litm] = lit
        shm = mask & (le >= 0) & (le < 2 + li // 2) & (td > 0)
        col[shm] = shd
        topm = mask & (td == 0)
        col[topm & (re < w_lit + 3)] = hil
        # cliff striations at the seaward end
        tt = (X - start) % W
        cliff_zone = mask & (tt > length - cw - 6) & (tt <= length) & (re < cw + 2) & (td > 1)
        stri = cliff_zone & ((X % 3) == (seed % 3)) & ((Y + X) % 5 != 0)
        col[stri] = shd
        if "strata" in st:
            paint_strata(col, mask, re, le, td, X, Y, li, base, lit, shd, w_lit, st, seed)
        # base haze toward the horizon
        hz_rows = 3 + int(3 * depth)
        hzc = mix(base, haze, 0.45 * depth + 0.15)
        yb = FAR_H - 1 - Y  # rows above horizon
        lvl = np.clip((hz_rows - yb) / hz_rows, 0, 1)
        q = np.rint(lvl * 4).astype(int)
        hzm = mask & dmask(q, X, Y)
        col[hzm] = np.array(hzc) * 0.5 + col[hzm] * 0.5
        img[mask, :3] = np.rint(col[mask]).astype(np.uint8)
        img[mask, 3] = 255
        tops.append((h, start, end, length))
        if "forest" in st:
            plant_cypresses(img, st, li, n, h, start, length, cw, seed, base)
        if "town" in st:
            town_lights(img, st, li, mask, re, le, td, Y, seed)
        # foam line at the cliff base
        xe = end % W
        for k in range(-1, 4 + li):
            xx = (xe + k) % W
            if img[FAR_H - 1, xx, 3] == 0 or k <= 0:
                if k < 3 + li or (k + li) % 2 == 0:
                    img[FAR_H - 1, xx, :3] = C(st["foam"])
                    img[FAR_H - 1, xx, 3] = 255

    draw_sea_things(img, sn, st, tops)
    return img


# ---- stage-specific far-layer detail (used only by stages that opt in) ----
def paint_strata(col, mask, re, le, td, X, Y, li, base, lit, shd, w_lit, st, seed):
    """sandstone bedding: irregular pale / base / rusty beds that dip gently,
    a few broken seams, and a dotted coastal-scrub fringe along the bluff tops"""
    cfg = st["strata"]
    rng = np.random.default_rng(seed + 40)
    yb = FAR_H - 1 - Y
    wob = np.rint(1.4 * periodic_noise(seed + 50, 9))[None, :].astype(int)
    k = np.clip(yb + wob, 0, FAR_H + 3)
    # bed thicknesses grow with the layer's nearness
    sc = cfg["period"][li] / 4.0
    tone = np.zeros(FAR_H + 4, int)       # 0 base, 1 pale, 2 rust
    seam = np.zeros(FAR_H + 4, bool)
    y, last = 0, 0
    while y < FAR_H + 4:
        th = max(1, int(round(rng.choice([2, 3, 3, 4, 5, 6]) * sc)))
        t = int(rng.choice([0, 1, 1, 2])) if last == 0 else 0
        tone[y:y + th] = t
        if t == 0 and th >= 3 and rng.random() < 0.6:
            seam[y] = True
        last = t
        y += th
    T = tone[k]
    S = seam[k]
    gaps = (periodic_noise(seed + 60, 70)[None, :] > 0.35) | (((X * 7 + k * 13) % 10) == 0)
    body = mask & (td >= 2) & (le >= 1)
    face = re < w_lit + 1
    pale = mix(base, st["warm"], cfg["light"])
    rust = mix(base, "#9a4a3a", 0.22)
    dark = mix(base, st["cool"], cfg["dark"])
    col[body & ~face & (T == 1)] = pale
    col[body & ~face & (T == 2)] = rust
    if li > 0:
        col[body & ~face & S & ~gaps] = dark
    col[body & face & (T == 1)] = mix(lit, st["warm"], 0.25)
    # scrub on the bluff tops (skips the sunlit rim)
    scrub = mix(cfg["scrub"], base, 0.15 + 0.3 * (2 - li) / 2)
    top = mask & (td == 0) & (re >= w_lit + 3) & ((X % 5) != 3)
    top1 = mask & (td == 1) & (re >= w_lit + 3) & (((X * 3) % 5) < 2)
    col[top | top1] = scrub


def canopy_profile(h, start, length, cw, li, seed):
    """forested ridge: rounded tree crowns bumped onto the smooth profile"""
    rng = np.random.default_rng(seed + 900)
    out = h.copy()
    t = 2
    while t < length - cw - 1:
        w = int(rng.integers(3, 6 + li))
        a = rng.uniform(0.8, 1.5 + 0.5 * li)
        for i in range(w):
            xx = (start + t + i) % W
            if h[xx] < 3:
                continue
            u = (i + 0.5) / w * 2 - 1
            out[xx] = max(out[xx], h[xx] + int(round(a * math.sqrt(max(0.0, 1 - u * u)))))
        t += max(2, w - int(rng.integers(0, 2)))
    return out


# Monterey cypress silhouettes: flat, wind-combed canopy pads on a forked trunk.
# X = foliage, t = trunk.  Rim light is added automatically on top/right edges.
CYPRESS = {
    "big": [
        "....XXXXXXX....",
        "..XXXXXXXXXXX..",
        "XXXXXXXXXXXXXXX",
        ".XXXXX.XXXXXXX.",
        "......t..XXX...",
        ".XXXX.t.t......",
        "XXXXXXXtt......",
        ".......t.......",
        ".......t.......",
    ],
    "mid": [
        "..XXXXXX...",
        "XXXXXXXXXX.",
        "XXXXXXXXXXX",
        "..XX.t.XX..",
        ".....tt....",
        ".XXX..t....",
        "XXXXXtt....",
        "......t....",
    ],
    "small": [
        ".XXXXX.",
        "XXXXXXX",
        ".XXtXX.",
        "...t...",
        "...t...",
    ],
    "lean": [
        "XXXXXXX....",
        "XXXXXXXXX..",
        ".XXXXXXXXX.",
        "...t...XX..",
        "....t......",
        ".....t.....",
        ".....t.....",
    ],
    "tiny": [
        ".XXX.",
        "XXXXX",
        "..t..",
        "..t..",
    ],
}


def draw_cypress(img, name, xc, y_bottom, body, rim):
    rows = CYPRESS[name]
    hh, ww = len(rows), len(rows[0])
    x0 = xc - ww // 2
    filled = lambda i, j: 0 <= j < hh and 0 <= i < ww and rows[j][i] != "."
    for j, row in enumerate(rows):
        y = y_bottom - (hh - 1) + j
        if not (0 <= y < FAR_H):
            continue
        for i, ch in enumerate(row):
            if ch == ".":
                continue
            c = body
            if ch == "X":
                top_open = not filled(i, j - 1)
                right_open = not filled(i + 1, j)
                if (top_open and i >= ww * 0.3) or (right_open and j <= hh // 2):
                    c = rim
            xx = (x0 + i) % W
            img[y, xx, :3] = c
            img[y, xx, 3] = 255


def plant_cypresses(img, st, li, n, h, start, length, cw, seed, base):
    """stand cypress silhouettes along the forested ridge: a small group on
    each seaward cliff top, more spaced along the crest"""
    f = st["forest"]
    depth = 1 - li / (n - 1)
    body = mix(f["tree"], base, 0.15 + 0.55 * depth)
    rim = mix(f["rim"], base, 0.10 + 0.45 * depth)
    rng = np.random.default_rng(seed + 1700)
    kinds = {0: ["tiny", "tiny", "small"], 1: ["small", "mid", "lean", "small"],
             2: ["big", "mid", "lean", "mid", "small"]}[li]
    sinks = {"big": 3, "mid": 2, "lean": 2, "small": 1, "tiny": 1}
    end_t = length - cw
    # group on the seaward point: (offset from the cliff edge, sprite)
    groups = {0: [(3, "tiny"), (9, "tiny")],
              1: [(4, "small"), (11, "mid")],
              2: [(6, "big"), (15, "small"), (22, "lean")]}[li]
    pts = [(end_t - off, nm) for off, nm in groups]
    t = int(rng.integers(12, 24))
    while t < end_t - 28:
        pts.append((t, kinds[int(rng.integers(0, len(kinds)))]))
        t += int(rng.integers(9, 19)) + 3 * (2 - li)
    for t, name in pts:
        xx = (start + t) % W
        if h[xx] < 5:
            continue
        ground = FAR_H - int(min(h[(xx + d) % W] for d in (-1, 0, 1)))
        draw_cypress(img, name, xx, ground + sinks[name], body, rim)


def town_lights(img, st, li, mask, re, le, td, Y, seed):
    """tiny warm windows on the dark hills: clustered villages near the shore,
    thinning out up the slopes; dimmer on the farther ridges"""
    cfg = st["town"]
    rng = np.random.default_rng(cfg["seed"] + 13 * li)
    yb = FAR_H - 1 - Y
    cand = mask & (td >= 2) & (le >= 2) & (re >= 3) & (yb >= 1)
    ys, xs = np.nonzero(cand)
    if len(xs) == 0:
        return
    clus = periodic_noise(seed + 300, 24)
    wgt = np.exp(-yb[ys, xs] / (4.0 + 2.5 * li)) * np.clip(clus[xs] + 0.6, 0.05, None) ** 2
    wgt = wgt / wgt.sum()
    order = rng.choice(len(xs), size=min(len(xs), 400), replace=False, p=wgt)
    placed = []
    cols = [C(c) for c in (cfg["cols"] if li == 2 else cfg["cols"][:2] if li == 1 else cfg["dim"])]
    for o in order:
        x, y = int(xs[o]), int(ys[o])
        if any(abs(wrapdx(x, px)) < 3 and abs(y - py) < 2 for px, py in placed):
            continue
        placed.append((x, y))
        c = cols[0] if rng.random() < 0.6 else cols[int(rng.integers(0, len(cols)))]
        img[y, x, :3] = c
        # a few houses show two windows side by side
        if li == 2 and rng.random() < 0.25 and cand[y, (x + 1) % W]:
            img[y, (x + 1) % W, :3] = c
        if len(placed) >= cfg["n"][li]:
            break


def put_sprite(img, rows, x0, y_bottom, cmap):
    h = len(rows)
    for j, row in enumerate(rows):
        y = y_bottom - (h - 1) + j
        for i, ch in enumerate(row):
            if ch == "." or ch == " ":
                continue
            xx = (x0 + i) % W
            if 0 <= y < img.shape[0]:
                img[y, xx, :3] = C(cmap[ch]) if isinstance(cmap[ch], str) else cmap[ch]
                img[y, xx, 3] = 255


BOAT_A = [
    "....m....",
    "...Lm....",
    "...LmS...",
    "..LLmS...",
    "..LLmSS..",
    ".LLLmSS..",
    ".LLLmSSS.",
    "hhhhhhhhh",
    ".kkkkkkk.",
]
BOAT_B = [
    "..m...",
    ".Lm...",
    ".LmS..",
    "LLmSS.",
    "hhhhhh",
    ".kkkk.",
]


def sea_stack(img, x0, heights, st, sn):
    """heights: column heights left->right; lit on the right, shade on the left"""
    base = C(st["stack"])
    lit = mix(base, st["warm"], 0.45)
    hil = mix(base, st["warm"], 0.7)
    shd = mix(base, st["cool"], 0.35)
    peak = int(np.argmax(heights))
    for i, hh in enumerate(heights):
        xx = (x0 + i) % W
        for j in range(hh):
            y = FAR_H - 1 - j
            top = j == hh - 1
            if i < peak:
                c = shd if not top else base
            elif i == peak:
                c = base if not top else hil
            else:
                c = lit if not top else hil
                if (i - peak) >= 2 and j < hh - 2 and (j + i) % 4 == 0:
                    c = base
            img[y, xx, :3] = c
            img[y, xx, 3] = 255
    # foam
    for i in range(-2, len(heights) + 2):
        xx = (x0 + i) % W
        if i < 0 or i >= len(heights) or heights[i] <= 2:
            if (i in (-1, len(heights))) or (i % 2 == 0):
                img[FAR_H - 1, xx, :3] = C(st["foam"])
                img[FAR_H - 1, xx, 3] = 255
        else:
            img[FAR_H - 1, xx, :3] = mix(st["foam"], base, 0.35)


def draw_sea_things(img, sn, st, tops):
    sail_l, sail_s = st["sail"]
    hull, stripe = st["hull"]
    cm = {"L": sail_l, "S": sail_s, "m": mix(hull, sail_s, 0.4), "h": hull, "k": mix(hull, "#000000", 0.25)}
    stacks = {
        1: [(318, [2, 4, 6, 7, 6, 4, 3, 2]), (338, [2, 3, 4, 3, 2]), (505, [1, 3, 5, 6, 4, 2])],
        2: [(320, [3, 6, 8, 8, 7, 7, 4, 2]), (340, [2, 4, 4, 3]), (494, [3, 5, 6, 7, 7, 6, 6, 5, 3, 2])],
        3: [(318, [2, 5, 8, 11, 9, 7, 4, 2]), (336, [2, 4, 6, 5, 3, 2]), (512, [1, 3, 4, 3, 1])],
        # low, craggy islets (one carries a lone cypress, see below)
        4: [(311, [1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1]), (334, [1, 2, 3, 4, 3, 3, 2, 1]),
            (348, [1, 2, 2, 1]), (494, [1, 2, 3, 3, 2, 1])],
        5: [(318, [2, 4, 7, 9, 7, 5, 3, 2]), (336, [2, 4, 5, 3, 2])],
    }[sn]
    for (x0, hs) in stacks:
        sea_stack(img, x0, hs, st, sn)
    boats = {1: [(440, BOAT_A), (535, BOAT_B)], 2: [(452, BOAT_A), (360, BOAT_B)],
             3: [(450, BOAT_A), (476, BOAT_B)], 4: [(455, BOAT_A)], 5: [(372, BOAT_B)]}[sn]
    for (x0, spr) in boats:
        put_sprite(img, spr, x0, FAR_H - 1, cm)
    if sn == 2:
        # punch a sea arch through the far sandstone stack (sky shows through)
        for (xx, yb) in [(497, 0), (498, 0), (499, 0), (497, 1), (498, 1), (499, 1), (498, 2), (499, 2)]:
            img[FAR_H - 1 - yb, xx, 3] = 0
        for xx in (495, 496, 500, 501):
            img[FAR_H - 1, xx, :3] = mix(st["foam"], st["stack"], 0.2)
    if sn == 4:
        f = st["forest"]
        draw_cypress(img, "lean", 318, FAR_H - 1 - 7 + 1, C(f["tree"]), mix(f["rim"], st["stack"], 0.2))
        draw_cypress(img, "tiny", 497, FAR_H - 1 - 3 + 1, mix(f["tree"], st["stack"], 0.3), mix(f["rim"], st["stack"], 0.4))
    if sn == 5:
        # mast-head lantern on the boat
        for (x0, spr) in boats:
            mx = x0 + spr[0].index("m")
            img[FAR_H - 1 - len(spr), mx % W, :3] = C(st["lights"])
            img[FAR_H - 1 - len(spr), mx % W, 3] = 255
        draw_city(img, st)


def draw_city(img, st):
    """a distant city across the bay: a low strip of far shore with a downtown
    cluster of small towers, every one speckled with lit windows, a string of
    waterfront lights along the horizon and red beacons on the tallest towers"""
    cfg = st["city"]
    rng = np.random.default_rng(cfg["seed"])
    sil, top = C(cfg["sil"]), C(cfg["top"])
    lit = C(st["lights"])
    pale, amber, cool = C("#fff0c0"), C("#ffa860"), C("#b8d8ff")
    x0, x1 = cfg["x0"], cfg["x1"]
    hgt = np.zeros(W, int)
    bid = np.full(W, -1)
    # far-shore strip running into the right-hand headland
    for x in range(x0 - 16, 556):
        hgt[x % W] = 1 + (1 if (x0 - 6) < x < x1 + 4 else 0)
    x, b = x0, 0
    towers = []
    while x < x1:
        w = int(rng.integers(2, 6))
        t = (x - x0) / (x1 - x0)
        env = math.exp(-((t - 0.32) / 0.15) ** 2) + 0.5 * math.exp(-((t - 0.72) / 0.07) ** 2)
        hh = 2 + int(round(rng.uniform(0, 2.0) + env * rng.uniform(3.0, 8.5)))
        if env > 0.55 and rng.random() < 0.4:
            hh += int(rng.integers(2, 5))
            towers.append((x + w // 2, hh))
        for i in range(w):
            xx = (x + i) % W
            if hh > hgt[xx]:
                hgt[xx] = hh
                bid[xx] = b
        b += 1
        x += w + (1 if (env < 0.3 and rng.random() < 0.4) else 0)
    for xx in range(W):
        for j in range(hgt[xx]):
            y = FAR_H - 1 - j
            img[y, xx, :3] = top if j == hgt[xx] - 1 and hgt[xx] > 2 else sil
            img[y, xx, 3] = 255
    # windows: every other row, scattered; sparser on the low sprawl
    for xx in range(W):
        hh = hgt[xx]
        if hh <= 2:
            continue
        for j in range(2, hh - 1, 2):
            if rng.random() < (0.55 if hh > 5 else 0.35):
                r = rng.random()
                img[FAR_H - 1 - j, xx, :3] = lit if r < 0.6 else pale if r < 0.8 else amber if r < 0.93 else cool
    # waterfront lights and the far-shore street lamps
    for x in range(x0 - 16, 556):
        xx = x % W
        if hgt[xx] == 0:
            continue
        if (x0 - 6) < x < x1 + 4:
            if x % 2 == 0:
                img[FAR_H - 1, xx, :3] = lit if (x // 2) % 3 else pale
        elif x % 4 == 1 and rng.random() < 0.7:
            img[FAR_H - 1, xx, :3] = amber
    # beacons
    for (tx, th) in towers:
        tx %= W
        if hgt[tx] < th:
            continue
        img[FAR_H - 1 - th, tx, :3] = sil
        img[FAR_H - 1 - th, tx, 3] = 255
        img[FAR_H - 2 - th, tx, :3] = C("#ff5a5a")
        img[FAR_H - 2 - th, tx, 3] = 255


# ----------------------------------------------------------------------------
# previews
# ----------------------------------------------------------------------------
def composite(sky, far, sea, x0, width):
    out = np.zeros((SCREEN_H, width, 3), np.uint8)
    cols = (np.arange(width) + x0) % W
    out[:SKY_H] = sky[:, cols]
    f = far[:, cols]
    region = out[FAR_TOP:HORIZON]
    a = f[..., 3] > 0
    region[a] = f[..., :3][a]
    c0, c1 = np.array(C(sea[0]), float), np.array(C(sea[1]), float)
    for y in range(HORIZON, SCREEN_H):
        t = (y - HORIZON) / (SCREEN_H - 1 - HORIZON)
        out[y] = np.rint(c0 + (c1 - c0) * t)
    return out


def zoom(a, z=ZOOM):
    return np.repeat(np.repeat(a, z, 0), z, 1)


def build(sn):
    sky = render_sky(sn)
    far = render_far(sn)
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(sky, "RGB").save(os.path.join(OUT, f"sky_s{sn}.png"))
    Image.fromarray(far, "RGBA").save(os.path.join(OUT, f"far_s{sn}.png"))
    st = STAGES[sn]
    win = composite(sky, far, st["sea"], WIN0, SCREEN_W)
    Image.fromarray(zoom(win)).save(os.path.join(HERE, f"preview_s{sn}.png"))
    tile = composite(sky, far, st["sea"], 0, W)
    Image.fromarray(zoom(tile)).save(os.path.join(HERE, f"preview_tile_s{sn}.png"))
    ncol = len(np.unique(sky.reshape(-1, 3), axis=0))
    nfar = len(np.unique(far[far[..., 3] > 0][:, :3], axis=0))
    print(f"stage {sn} {st['name']}: sky colours={ncol} far colours={nfar}")


if __name__ == "__main__":
    stages = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4, 5]
    for s in stages:
        build(s)

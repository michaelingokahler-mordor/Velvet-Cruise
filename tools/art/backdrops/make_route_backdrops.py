#!/usr/bin/env python3
"""
Velvet Cruise -- parallax backdrops for the five INLAND route stages (6..10).

Reuses the dithering / cloud / sky helpers of make_backdrops.py (imported, not
modified) and writes to ./out/:
    sky_s{N}.png   640x80, opaque.  Dithered sky bands, sun glow, pixel clouds.
    far_s{N}.png   640x56, RGBA (alpha 0/255).  Bottom row = horizon (screen y 79).
                   Inland: a continuous land silhouette over the whole 640 tile;
                   the bottom row is exactly the stage's horizon-land colour so it
                   joins the engine's land fill below the horizon.
Stages (sun tile x = themes.ts sunX + 160):
    6  Thunder Highway  golden-hour rainstorm: banded storm decks, a gold break on
                        the horizon where the sun hides, distant rain shafts (the
                        engine draws the lightning); a rain-hazy city skyline in
                        front of low hills
    7  Vineyard Valley  sunset: low sun disk, pink-gold streaks; layered Tuscan
                        hills, striped vineyards, cypress lines, hill village
    8  Redwood Pass     sunset in thick fog: pale diffused sun, mist streaks;
                        four ridges of pointy redwoods fading into the fog
    9  Painted Desert   sunset sandstorm: big hazy sun, dust bands; red-rock
                        mesas, buttes and spires over a flat desert floor
    10 Death Valley     late sunset: half sun on the horizon with heat shimmer,
                        violet streaks; jagged dark ranges and a glowing salt pan
Previews (next to this script):
    preview_s{N}.png       game window (tile x 160..479) at 3x, land gradient below
    preview_tile_s{N}.png  the full 640 tile at 3x

Usage:  python3 -B make_route_backdrops.py          (all stages)
        python3 -B make_route_backdrops.py 7 9      (only some stages)
"""
import math
import os
import sys

sys.path.insert(0, "/var/games/game-20261009-93986676/tools/art/backdrops")
import make_backdrops as mb  # noqa: E402

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

C, mix, wrapdx, dmask, quantize = mb.C, mb.mix, mb.wrapdx, mb.dmask, mb.quantize
pnoise, edge_dist = mb.periodic_noise, mb.edge_dist
W, SKY_H, FAR_H, WIN0 = mb.W, mb.SKY_H, mb.FAR_H, mb.WIN0

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

FY, FX = np.mgrid[0:FAR_H, 0:W]          # far-layer grids
SY, SX = np.mgrid[0:SKY_H, 0:W]          # sky grids
YB = FAR_H - 1 - FY                      # rows above the horizon (0 = bottom row)
XS = np.arange(W)
NOCLOUD = dict(ramp=["#000000"], rim="#000000", light=(0, 1), th=[1])


# ----------------------------------------------------------------------------
# STAGES  (sky keys follow make_backdrops.STAGES; sun x is WINDOW x)
# ----------------------------------------------------------------------------
STAGES = {
    6: dict(
        name="Thunder Highway",
        land=("#4a5560", "#2e3a34"),
        sky=[(0, "#262840"), (16, "#30324c"), (32, "#3e3e5a"), (46, "#4e5068"),
             (58, "#62647a"), (68, "#7a7a8a"), (77, "#8e8c94")],
        glow_ext=["#a8887e", "#d89a62", "#f4b860", "#ffd47a"],
        sun=None,
        horizon_glow=dict(x=225, steps=4.0, ax=104.0, ay=30.0, p=0.95, k=3.0),
        # the sun itself hides behind the city hills: only its crown peeks out
        sliver=dict(x=225, y=78, r=8, disk="#fff2b8", rim="#ffe08a"),
        clouds=NOCLOUD, cloud_list=[],
    ),
    7: dict(
        name="Vineyard Valley",
        land=("#7a7a3a", "#4f6a2a"),
        sky=[(0, "#2e2a82"), (13, "#45338f"), (25, "#6c3c9c"), (37, "#a44a9a"),
             (48, "#d65c8c"), (58, "#fa7c6c"), (67, "#ff9c54"), (74, "#ffbc54"), (79, "#ffcc62")],
        mid=False,
        glow_ext=["#ffd870", "#ffe890"],
        sun=dict(x=222, y=60, r=13, disk="#fff4c0", rim="#ffe89a", w0=2.8, sx=1.45,
                 bulge=2.4, bR=44.0, bsx=2.6, bq=1.4),
        clouds=NOCLOUD,
        cloud_list=[
            ("st", 300, 12, 110, 2, 2, ("#4a3494", "#5a3a9a", "#8a4aa0", "#5a3a9a")),
            ("st", 560, 16, 90, 2, 2, ("#4a3494", "#5a3a9a", "#8a4aa0", "#5a3a9a")),
            ("st", 200, 30, 120, 2, 2, ("#8a4096", "#b45496", "#ffa0a0", "#c05c98")),
            ("st", 470, 27, 100, 2, 2, ("#8a4096", "#b45496", "#ffa0a0", "#c05c98")),
            ("st", 40, 24, 90, 2, 2, ("#8a4096", "#b45496", "#ffa0a0", "#c05c98")),
            ("st", 330, 42, 90, 2, 2, ("#c4508c", "#ec7c90", "#ffc888", "#ee8a92")),
            ("st", 560, 45, 70, 1, 2, ("#c4508c", "#ec7c90", "#ffc888", "#ee8a92")),
            ("st", 120, 47, 80, 1, 2, ("#c4508c", "#ec7c90", "#ffc888", "#ee8a92")),
            ("st", 430, 55, 60, 1, 2, ("#f07068", "#ffa070", "#ffe090", "#ffa070")),
        ],
    ),
    8: dict(
        name="Redwood Pass",
        land=("#8a8e8a", "#3a4a3a"),
        sky=[(0, "#76748e"), (18, "#8a869e"), (34, "#a49cae"), (48, "#c0b0b8"),
             (60, "#d8c2bc"), (70, "#e8ccbe"), (78, "#eed2c2")],
        glow_ext=["#f2d8c8", "#f8e2d2", "#fcecdc"],
        sun=dict(x=222, y=58, r=11, disk="#fff6ea", rim="#fdeee0", w0=4.5, sx=1.25,
                 bulge=2.0, bR=56.0, bsx=2.2, bq=1.2, ncore=3),
        clouds=NOCLOUD,
        cloud_list=[
            ("st", 250, 22, 140, 2, 2, ("#9c94aa", "#a8a0b4", "#b8acb8", "#a8a0b4")),
            ("st", 520, 18, 120, 2, 2, ("#9c94aa", "#a8a0b4", "#b8acb8", "#a8a0b4")),
            ("st", 60, 28, 130, 2, 2, ("#9c94aa", "#a8a0b4", "#b8acb8", "#a8a0b4")),
            ("st", 400, 40, 120, 2, 2, ("#bcaeb8", "#c8b8bc", "#d6c2c0", "#c8b8bc")),
            ("st", 160, 44, 110, 2, 2, ("#bcaeb8", "#c8b8bc", "#d6c2c0", "#c8b8bc")),
            ("st", 600, 46, 100, 2, 2, ("#bcaeb8", "#c8b8bc", "#d6c2c0", "#c8b8bc")),
        ],
        # mist bars drawn over the pale sun
        sun_mist=[(53, 2, "#efdcd0"), (61, 1, "#f2dccc"), (66, 2, "#ecd2c4")],
    ),
    9: dict(
        name="Painted Desert",
        land=("#c08a5a", "#b06a3a"),
        sky=[(0, "#7e5034"), (14, "#8e5a3a"), (28, "#a86a40"), (40, "#c07c48"),
             (52, "#d69252"), (62, "#e4aa64"), (71, "#eec27c"), (78, "#f2d092")],
        glow_ext=["#f6daa0", "#f9e4b4", "#fcecc4"],
        sun=dict(x=222, y=56, r=16, disk="#fff2cc", rim="#fbe8b8", w0=4.0, sx=1.3,
                 bulge=2.2, bR=64.0, bsx=2.4, bq=1.2, ncore=2),
        clouds=NOCLOUD, cloud_list=[],
        # horizontal dust bands: (centre y, half thickness, palette shift, seed)
        dust=[(11, 2.2, 1.0, 1), (24, 1.6, 1.0, 2), (36, 2.6, 1.0, 3), (48, 1.6, 1.0, 4),
              (59, 2.0, -1.0, 5), (68, 1.6, -1.0, 6)],
    ),
    10: dict(
        name="Death Valley",
        land=("#d8b8b0", "#b89a8a"),
        sky=[(0, "#3a1a5a"), (14, "#5a2070"), (28, "#842a7c"), (41, "#b43a78"),
             (53, "#de4e66"), (63, "#f06a48"), (72, "#fa8636"), (78, "#ff9a3a")],
        mid=False,
        glow_ext=["#ffb048", "#ffc85e"],
        sun=dict(x=215, y=80, r=15, disk="#ffe08a", rim="#fff2c0", w0=2.8, sx=1.5,
                 bulge=2.6, bR=52.0, bsx=3.0, bq=1.5, bvy=1.3, ncore=2, toprim=True),
        clouds=NOCLOUD,
        cloud_list=[
            ("st", 420, 10, 130, 2, 2, ("#3e1a5e", "#4c1e68", "#7a2a7a", "#4c1e68")),
            ("st", 140, 14, 110, 2, 2, ("#3e1a5e", "#4c1e68", "#7a2a7a", "#4c1e68")),
            ("st", 300, 33, 120, 1, 2, ("#6a2272", "#7a2878", "#c04a7a", "#7a2878")),
            ("st", 560, 30, 100, 1, 2, ("#6a2272", "#7a2878", "#c04a7a", "#7a2878")),
            ("st", 470, 49, 90, 1, 2, ("#9a3070", "#a83472", "#f0705a", "#a83472")),
            ("st", 210, 52, 80, 1, 2, ("#9a3070", "#a83472", "#f0705a", "#a83472")),
        ],
        shimmer=dict(rows=(68, 76)),
    ),
}


# ----------------------------------------------------------------------------
# SKY (same model as make_backdrops.render_sky, plus hooks for the new weather)
# ----------------------------------------------------------------------------
def sky_field(st):
    pal, ys = mb.sky_palette(st)
    n_sky = len(pal)
    full = pal + [C(c) for c in st["glow_ext"]]
    umax = len(full) - 1
    haze_i = n_sky - 1
    yrow = np.arange(SKY_H, dtype=float)
    u_row = np.interp(yrow, ys, np.arange(n_sky))
    band_h = np.interp(yrow, [(ys[j] + ys[j + 1]) / 2 for j in range(n_sky - 1)],
                       [ys[j + 1] - ys[j] for j in range(n_sky - 1)])
    k_row = np.maximum(1.0, band_h / 3.0)
    u = np.repeat(u_row[:, None], W, 1)
    k = np.repeat(k_row[:, None], W, 1)
    return full, umax, haze_i, u, k


def add_sun_glow(u, k, sun, umax, haze_i):
    cx = WIN0 + sun["x"]
    dx = wrapdx(SX, cx)
    dy = SY - sun["y"]
    db = np.sqrt((dx / sun["bsx"]) ** 2 + (np.minimum(dy, 0) * sun.get("bvy", 1.7)) ** 2
                 + (np.maximum(dy, 0) * 0.6) ** 2)
    B = sun["bulge"] * np.clip(1 - db / sun["bR"], 0, 1) ** sun["bq"]
    u = np.minimum(u + B, haze_i)
    d = np.sqrt((dx / sun["sx"]) ** 2 + dy ** 2)
    de = np.maximum(0.0, d - sun["r"])
    u_core = umax - de / sun["w0"] - np.maximum(0, de - sun["w0"] * sun.get("ncore", 2)) * 0.9
    k_core = np.full(u.shape, max(1.0, sun["w0"] / 2.0))
    take = u_core > u
    return np.where(take, u_core, u), np.where(take, k_core, k)


def add_horizon_glow(u, k, hg, umax):
    dx = wrapdx(SX, WIN0 + hg["x"])
    dy = (SKY_H + 2) - SY
    d = np.sqrt((dx / hg["ax"]) ** 2 + (dy / hg["ay"]) ** 2)
    u_g = umax - (d ** hg["p"]) * hg["steps"]
    take = u_g > u
    return np.where(take, u_g, u), np.where(take, hg.get("k", 2.2), k)


def draw_disk(img, sun, full, umax):
    cx = WIN0 + sun["x"]
    dx = wrapdx(SX, cx)
    dy = SY - sun["y"]
    r = sun["r"]
    dd = dx * dx + dy * dy
    disk = dd <= r * r + r * 0.8
    img[disk] = C(sun["disk"])
    inner = dd <= (r - 1) * (r - 1) + (r - 1) * 0.8
    img[disk & ~inner & (dy > r * 0.25)] = C(sun["rim"])
    if sun.get("toprim"):
        above = np.roll(disk, 1, axis=0)
        above[0, :] = False
        img[disk & (dd <= (r - 3) * (r - 3) + (r - 3) * 0.8)] = C(sun["rim"])
        img[disk & ~above] = C(sun["rim"])
    for (yy, hh) in sun.get("slices", []):
        img[disk & (SY >= yy) & (SY < yy + hh)] = full[umax]
    return disk


def render_sky(sn):
    st = STAGES[sn]
    full, umax, haze_i, u, k = sky_field(st)
    if st.get("sun"):
        u, k = add_sun_glow(u, k, st["sun"], umax, haze_i)
    if sn == 9:
        u, k = dust_bands(u, k, st, umax)
    if st.get("horizon_glow"):
        u, k = add_horizon_glow(u, k, st["horizon_glow"], umax)
    idx = quantize(u, k, SX, SY, umax)
    img = np.array(full, dtype=np.uint8)[idx]
    if st.get("sliver"):
        draw_disk(img, st["sliver"], full, umax)
    disk = draw_disk(img, st["sun"], full, umax) if st.get("sun") else None
    if sn == 8:
        for (yy, hh, c) in st["sun_mist"]:
            img[disk & (SY >= yy) & (SY < yy + hh)] = C(c)
    if sn == 9:
        dust_over_sun(img, disk, st)
    if sn == 10:
        heat_shimmer(img, st)
    mb.draw_clouds(img, sn, st)
    if sn == 6:
        storm_sky(img)
    return img


# ---- s9: dust bands --------------------------------------------------------
def dust_strength(y, hth, seed):
    """0..1 strength of a drifting dust band: a solid core with a one-pixel
    soft edge, thickness wobbling along x and tapering out in places"""
    cover = np.clip(pnoise(seed * 31 + 5, 6) * 1.8 + 0.5, 0, 1)
    th = hth * (0.7 + 0.5 * pnoise(seed * 31 + 3, 11)) * cover
    yc = y + 1.4 * pnoise(seed * 31 + 4, 5)
    d = np.abs(SY + 0.5 - yc[None, :])
    return np.clip(th[None, :] - d + 0.5, 0, 1)


def dust_bands(u, k, st, umax):
    for (y, hth, du, seed) in st["dust"]:
        s = dust_strength(y, hth, seed)
        u = np.clip(u + du * s, 0, umax)
        k = np.where(s > 0.02, 4.0, k)
    return u, k


def dust_over_sun(img, disk, st):
    a, b = C(st["glow_ext"][0]), C(st["glow_ext"][1])
    for (y, hth, du, seed) in st["dust"]:
        s = dust_strength(y, hth, seed)
        img[disk & (s > 0.55)] = a
        img[disk & (s > 0.15) & (s <= 0.55) & dmask(np.full(s.shape, 2), SX, SY)] = b


# ---- s10: heat shimmer on the low sun -------------------------------------
def heat_shimmer(img, st):
    """rows just above the horizon wobble sideways (pairs of rows shifted
    alternately left / right) -- the sun's edge ripples in the heat"""
    y0, y1 = st["shimmer"]["rows"]
    cx = WIN0 + st["sun"]["x"]
    xs = np.arange(cx - 70, cx + 70) % W
    for y in range(y0, y1):
        s = 1 if ((y - y0) // 2) % 2 == 0 else -1
        img[y, xs] = np.roll(img[y, xs].copy(), s, axis=0)


# ---- s6: storm decks --------------------------------------------------------
# decks from the top of the sky (nearest, darkest, biggest lobes) toward the
# horizon (farthest, lighter, smaller).  Each hangs a bubbly scalloped
# underside lit from below; near the hidden sun the undersides glow gold.
STORM_RAMP = ["#1c1c30", "#24243c", "#2c2c46", "#343650", "#3e405a", "#484a62", "#52546a",
              "#5e6074", "#6a6a7e"]
STORM_RIMS = ["#3c3858", "#484262", "#564e6c", "#645a76", "#706680", "#7c7488", "#888092"]
STORM = dict(
    sun_x=WIN0 + 225,
    # deck k: body / mid / light = STORM_RAMP[k..k+2], rim = STORM_RIMS[k]
    decks=[
        # base y, lobe w min/max, lobe depth, band px, bay lift, seed
        dict(base=9, w=(60, 104), d=6.0, band=3.0, bay=0, seed=61),
        dict(base=19, w=(44, 80), d=5.5, band=2.6, bay=6, seed=62),
        dict(base=28, w=(34, 60), d=5.0, band=2.3, bay=6, seed=63),
        dict(base=37, w=(26, 46), d=4.2, band=2.0, bay=5, seed=64),
        dict(base=45, w=(20, 36), d=3.6, band=1.8, bay=4, seed=65),
        dict(base=52, w=(14, 28), d=3.0, band=1.5, bay=3, seed=66),
        dict(base=58, w=(10, 20), d=2.4, band=1.3, bay=2, seed=67),
    ],
    # warm light on the undersides near the break: (rim, light) per warmth step
    warm=[("#9a6c78", "#5e5468"), ("#d88c66", "#7c5c68"), ("#ffc46c", "#a46e60")],
    lift=dict(R=44.0, amt=[0, 0, 0, 1, 2, 4, 6]),
    rain=[(196, 30, 1), (520, 44, 2), (88, 36, 3), (600, 18, 4)],
)


def scallops(rng, wmin, wmax, depth, jitter):
    """a ring of hanging semicircular lobes covering the 640 tile"""
    e = np.zeros(W)
    widths = []
    while sum(widths) < W:
        widths.append(int(rng.integers(wmin, wmax + 1)))
    widths[-1] -= sum(widths) - W
    if widths[-1] < max(2, wmin // 2):
        widths[-2] += widths[-1]
        widths.pop()
    pos = int(rng.integers(0, W))
    for w in widths:
        dep = depth * rng.uniform(0.5, 1.5)
        jit = rng.uniform(-1, 1) * jitter
        for t in range(w):
            uu = (t + 0.5) / w * 2 - 1
            e[(pos + t) % W] = jit + dep * math.sqrt(max(0.0, 1 - uu * uu))
        pos += w
    return e


def storm_sky(img):
    cfg = STORM
    nd = len(cfg["decks"])
    sun_dx = wrapdx(XS, cfg["sun_x"])
    deck_id = np.full((SKY_H, W), -1)
    for di in reversed(range(nd)):
        dk = cfg["decks"][di]
        rng = np.random.default_rng(dk["seed"])
        big = scallops(rng, dk["w"][0], dk["w"][1], dk["d"], dk["d"] * 0.4)
        sw = (7, 13) if di < 3 else (5, 10) if di < 5 else (4, 7)
        small = scallops(rng, sw[0], sw[1], sw[0] * 0.42, 0.0)
        bay = dk["bay"] * np.clip(pnoise(dk["seed"] + 500, 5) * 1.8 - 0.4, 0, 1)
        e = dk["base"] + big + small - bay
        e -= cfg["lift"]["amt"][di] * np.exp(-(sun_dx / cfg["lift"]["R"]) ** 2)
        e = np.floor(e)
        mask = SY <= e[None, :]
        t = e[None, :] - SY
        cols = [C(c) for c in STORM_RAMP[di:di + 3] + [STORM_RIMS[di]]]
        b = dk["band"]
        # light band, a wider mid band, then the dark body (1-px dithered seams)
        uu = np.where(t <= 1 + b, 2.0 - (t - 1) / b, 1.0 - (t - 1 - b) / (1.5 * b))
        uu = np.clip(uu, 0, 2)
        idx = quantize(uu, np.full(uu.shape, max(1.0, b)), SX, SY, 2)
        out = np.array(cols[:3], np.uint8)[idx]
        rim = t < 1
        out[rim] = cols[3]
        # warmth near the break, strongest on the low decks
        far = di / (nd - 1)
        wv = far ** 1.4 * np.exp(-(sun_dx / 64.0) ** 2)
        wl = np.clip(np.floor(wv * 3.6 + 0.25), 0, 3).astype(int)[None, :].repeat(SKY_H, 0)
        for lvl in (1, 2, 3):
            rc, lc = C(cfg["warm"][lvl - 1][0]), C(cfg["warm"][lvl - 1][1])
            out[rim & (wl == lvl)] = rc
            out[~rim & (idx == 2) & (wl == lvl)] = lc
        img[mask] = out[mask]
        deck_id[mask] = di
    rain_shafts(img, deck_id)
    # (no painted bolt: the engine flashes its own animated lightning)


def rain_shafts(img, deck_id):
    """slanted streaks of rain falling from the distant decks (in front of the
    far decks and the open sky only); each streak ends at its own height so
    the shaft frays out toward the horizon, and its sides are thinned out"""
    rain_c = [(56, C("#44465e")), (66, C("#53556c")), (99, C("#626479"))]
    for (cx, w, seed) in STORM["rain"]:
        rng = np.random.default_rng(700 + seed)
        dx = wrapdx(SX, cx) + (SY - 60) * 0.5
        lane = (SX + (SY // 2)) % 3 == 0
        lid = ((SX + (SY // 2)) // 3) % W
        ends = rng.integers(64, 80, size=W)
        tops = rng.integers(0, 6, size=W)
        ok = (np.abs(dx) < w / 2) & lane & ((deck_id < 0) | (deck_id >= 5))
        ok &= (SY < ends[lid]) & (SY > 40 + tops[lid])
        ok &= (np.abs(dx) <= (w / 2 - 4)) | ((SY + SX) % 2 == 0)
        for (ymax, c) in rain_c:
            img[ok & (SY < ymax) & (SY >= (ymax - 10 if ymax < 99 else 66))] = c


# ----------------------------------------------------------------------------
# FAR LAYER helpers
# ----------------------------------------------------------------------------
def circ_smooth(h, r):
    if r <= 0:
        return h
    k = np.ones(2 * r + 1) / (2 * r + 1)
    hh = np.concatenate([h[-r:], h, h[:r]])
    return np.convolve(hh, k, mode="valid")


def bump_profile(bumps, base=0.0, smooth=3):
    """union (max) of cosine hills (cx, half width, height), valleys rounded"""
    h = np.full(W, float(base))
    for (cx, w, hh) in bumps:
        dx = wrapdx(XS, cx)
        b = np.where(np.abs(dx) < w, hh * (0.5 + 0.5 * np.cos(np.pi * dx / w)), 0.0)
        h = np.maximum(h, b)
    return circ_smooth(h, smooth)


def hmask(h):
    return FY >= (FAR_H - np.rint(h).astype(int))[None, :]


def put(img, m, c):
    img[m, :3] = C(c) if isinstance(c, str) else c
    img[m, 3] = 255


def put_px(img, x, y, c):
    if 0 <= y < FAR_H:
        img[y, x % W, :3] = C(c) if isinstance(c, str) else c
        img[y, x % W, 3] = 255


def base_haze(img, m, colour, solid, dith=2, start=0):
    """ground haze: `solid` rows of colour at the base of mask m, topped by
    `dith` rows of 50 % checker -- clean bands, no speckle"""
    yb = YB - start
    put(img, m & (yb >= 0) & (yb < solid), colour)
    put(img, m & (yb >= solid) & (yb < solid + dith) & dmask(np.full(FX.shape, 2), FX, FY), colour)


def ground_blend(img, land, checker=True):
    """bottom row = horizon land colour, one row of checker above it"""
    lc = C(land)
    if checker:
        y = FAR_H - 2
        m = (((XS + y) & 1) == 0) & (img[y, :, 3] > 0)
        img[y, m, :3] = lc
    img[FAR_H - 1, :, :3] = lc
    img[FAR_H - 1, :, 3] = 255


def facing_sun(h, sunx):
    """columns whose surface faces the sun (rising toward it)"""
    dh = np.roll(h, -1) - np.roll(h, 1)
    left = wrapdx(XS, sunx) < 0
    return np.where(left, dh <= 0, dh >= 0), np.where(left, dh > 0, dh < 0)


# ----------------------------------------------------------------------------
# s6 THUNDER HIGHWAY: rain-hazy city in front of low hills
# ----------------------------------------------------------------------------
CITY_BACK = dict(body="#5c6674", lit="#6e7884", dark="#535c6a", top="#68727e",
                 glass="#57616e", floor="#56606c")
CITY_FRONT = dict(body="#454d5a", lit="#5c6470", dark="#3b424e", top="#525a66",
                  glass="#404855", floor="#3f4652")


def draw_building(img, x0, w, h, style, P, lit_right, rng, tex):
    hs = np.full(w, h)
    if style == "step" and w >= 5:
        s = max(1, w // 4)
        dh = int(rng.integers(3, 7))
        hs[:s] -= dh
        hs[w - s:] -= dh
    elif style == "slant" and w >= 4:
        n = min(w - 1, 3)
        for i in range(n):
            hs[(w - 1 - i) if rng.random() < 0.5 else i] = h - (n - i)
    hs = np.maximum(hs, 2)
    for i in range(w):
        for j in range(hs[i]):
            c = P["body"]
            inner = 0 < i < w - 1 and j < hs[i] - 1
            if tex == "glass" and inner and i % 2 == 1:
                c = P["glass"]
            if tex == "floors" and inner and j % 3 == 1:
                c = P["floor"]
            if (i == w - 1 and lit_right) or (i == 0 and not lit_right):
                c = P["lit"]
            elif w >= 4 and ((i == 0 and lit_right) or (i == w - 1 and not lit_right)):
                c = P["dark"]
            if j == hs[i] - 1:
                c = P["top"]
            put_px(img, x0 + i, FAR_H - 1 - j, c)
    cx = x0 + w // 2
    if style == "crown" and w >= 5:
        for j in range(1, 4):
            hw = (w // 2) - j
            for i in range(-hw, hw + 1 - (w % 2 == 0)):
                put_px(img, cx + i, FAR_H - 1 - (h - 1 + j), P["top"] if j == 1 else P["body"])
        for j in range(4, 4 + int(rng.integers(2, 5))):
            put_px(img, cx, FAR_H - 1 - (h - 1 + j), P["body"])
    if style == "antenna":
        ax = x0 + int(rng.integers(1, max(2, w - 1)))
        for j in range(1, int(rng.integers(3, 7)) + 1):
            put_px(img, ax, FAR_H - 1 - (h - 1 + j), P["body"])
    if style == "box" and w >= 4:
        bx = x0 + int(rng.integers(1, w - 2))
        for j in range(1, 3):
            put_px(img, bx, FAR_H - 1 - (h - 1 + j), P["body"])
            put_px(img, bx + 1, FAR_H - 1 - (h - 1 + j), P["body"])
    return hs


def render_far_6(st):
    img = np.zeros((FAR_H, W, 4), np.uint8)
    sunx = WIN0 + 225
    # low distant hills, full width (dipping where the sun hides)
    h = 8 + 3.0 * pnoise(601, 9) + 1.0 * pnoise(602, 29)
    h = np.maximum(h, bump_profile([(120, 70, 18), (236, 44, 13), (548, 60, 17), (612, 36, 12),
                                    (470, 30, 11)], smooth=2))
    gap = np.exp(-(wrapdx(XS, sunx) / 22.0) ** 2)
    h = h * (1 - 0.45 * gap)
    h = np.rint(h)
    hm = hmask(h)
    re, le, td = edge_dist(hm)
    put(img, hm, "#6c7684")
    lit, away = facing_sun(h, sunx)
    put(img, hm & (td == 0) & lit[None, :], "#7c8692")
    put(img, hm & (td == 1) & lit[None, :] & ((FX & 1) == 0), "#747e8b")
    # city: back row (hazy), front row (darker)
    rng = np.random.default_rng(606)
    styles = ["flat", "flat", "step", "slant", "crown", "antenna", "box", "flat"]

    def env(x):
        return max(math.exp(-(wrapdx(x, 298) / 46.0) ** 2),
                   0.62 * math.exp(-(wrapdx(x, 434) / 24.0) ** 2),
                   0.2 * math.exp(-(wrapdx(x, 210) / 30.0) ** 2))

    front = []
    for row, P, (xa, xb), hmul in [("back", CITY_BACK, (184, 478), 1.0),
                                   ("front", CITY_FRONT, (194, 470), 0.72)]:
        x = xa
        while x < xb:
            w = int(rng.integers(3, 9 if row == "back" else 8))
            if abs(wrapdx(x + w / 2, sunx)) < 11:      # keep the sun's gap open
                x += 2
                continue
            e = env(x + w / 2)
            hh = int(round(4 + rng.uniform(0, 4) + e * rng.uniform(14, 30) * hmul))
            if e < 0.12:
                hh = int(rng.integers(3, 7))
            style = styles[int(rng.integers(0, len(styles)))] if hh > 8 else "flat"
            tex = ["glass", "floors", None][int(rng.integers(0, 3))] if (hh > 12 and w >= 4) else None
            lit_right = wrapdx(x + w / 2, sunx) < 0
            draw_building(img, x, w, hh, style, P, lit_right, rng, tex)
            if row == "front":
                front.append((x, w, hh))
            x += w + (1 if rng.random() < 0.25 else 0)
    tower(img, 294, 7, 38, CITY_FRONT)
    tv_mast(img, 448, 34, CITY_FRONT)
    # warm lit windows, scattered
    wrng = np.random.default_rng(616)
    warm = [C("#e8b464"), C("#d29a5c"), C("#f4d08a")]
    for (x, w, hh) in front:
        if hh < 8 or w < 3:
            continue
        for _ in range(int(wrng.integers(0, 2 + hh // 9))):
            i = int(wrng.integers(1, max(2, w - 1)))
            j = int(wrng.integers(5, hh - 2))
            c = warm[int(wrng.integers(0, 3))] if wrng.random() < 0.6 else warm[0]
            put_px(img, x + i, FAR_H - 1 - j, c)
            if wrng.random() < 0.3 and i + 1 < w - 1:
                put_px(img, x + i + 1, FAR_H - 1 - j, c)
    # ground mist rising into the city, then the land colour
    m = img[..., 3] > 0
    base_haze(img, m, "#505a66", 4, 1)
    ground_blend(img, st["land"][0], checker=False)
    return img


def tower(img, x0, w, h, P):
    for i in range(w):
        hh = h - (2 if i in (0, w - 1) else 0)
        for j in range(hh):
            c = P["body"]
            if i % 2 == 1 and 0 < i < w - 1 and j < hh - 1:
                c = P["glass"]
            if i == w - 1:
                c = P["lit"]
            if i == 0:
                c = P["dark"]
            if j == hh - 1:
                c = P["top"]
            put_px(img, x0 + i, FAR_H - 1 - j, c)
    cx = x0 + w // 2
    for j, hw in enumerate([2, 1, 1, 0, 0, 0, 0, 0, 0]):
        for i in range(-hw, hw + 1):
            put_px(img, cx + i, FAR_H - 1 - (h + j), P["top"] if j == 0 else P["body"])
    put_px(img, cx, FAR_H - 1 - (h + 9), "#d04848")


def tv_mast(img, cx, h, P):
    for j in range(h):
        put_px(img, cx, FAR_H - 1 - j, P["body"])
        put_px(img, cx + 1, FAR_H - 1 - j, P["lit"])
    for j in range(5):
        put_px(img, cx - 1, FAR_H - 1 - j, P["dark"])
        if j < 3:
            put_px(img, cx + 2, FAR_H - 1 - j, P["lit"])
    py = h - 6
    for j, hw in enumerate([2, 3, 3, 2]):
        for i in range(-hw + 1, hw + 1):
            c = P["lit"] if i >= hw - 1 else (P["top"] if j == 3 else P["body"])
            put_px(img, cx + i, FAR_H - 1 - (py + j), c)
    for j in range(h, h + 6):
        put_px(img, cx, FAR_H - 1 - j, P["body"])
    put_px(img, cx, FAR_H - 1 - (h + 6), "#d04848")


# ----------------------------------------------------------------------------
# s7 VINEYARD VALLEY: layered Tuscan hills, vineyards, cypress, village
# ----------------------------------------------------------------------------
CYP_SPR = {
    "c11": [".X.", ".X.", ".X.", "XXX", "XXX", "XXX", "XXX", "XXX", "XXX", ".X.", ".X."],
    "c8": [".X.", ".X.", "XXX", "XXX", "XXX", "XXX", ".X.", ".X."],
    "c6": [".X", "XX", "XX", "XX", "XX", ".X"],
    "c4": ["X", "X", "X", "X"],
}

# hill town: w wall, l lit wall, s shaded wall, r roof, R lit roof, d opening
VILLAGE = [
    ".................R...............",
    "................rRR..............",
    "................sdl..............",
    "................sdl..............",
    "................swl..............",
    "................swl..............",
    "................swl..............",
    "...........rrrrRswlrR............",
    "..........rrrrrRswlrRR...........",
    ".....rrR..swwwwlswlwwl...rrRR....",
    "....rrrRR.swdwwlswlwdl..rrrRRR...",
    "rrRRswwl..swwwwlswlwwl..swwwwl.rR",
    "swwlswdlrrrrRRRlswlrrRRRswdwwlrRR",
    "swdlswwlswwwwwlswwlswwwlswwwwlswl",
    "swwlswwlswdwdwlswwlswdwlswwdwlsdl",
    "swwlswwlswwwwwlswwlswwwlswwwwlswl",
]
VILLAGE_COLS = dict(w="#caa888", l="#efcc9c", s="#9c8070", r="#a8563c", R="#d47a4e", d="#5a4048")


def cypress(img, name, xc, yb, body, rim):
    rows = CYP_SPR[name]
    hh, ww = len(rows), len(rows[0])
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == ".":
                continue
            right_open = i + 1 >= ww or row[i + 1] == "."
            c = rim if (right_open and ww > 1 and 1 <= j < hh - 2) else body
            put_px(img, xc - ww // 2 + i, yb - (hh - 1) + j, c)


def rand_bumps(seed, wr, hr):
    r = np.random.default_rng(seed)
    out = []
    x = r.uniform(0, 40)
    while x < W:
        out.append((x, r.uniform(*wr), r.uniform(*hr)))
        x += r.uniform(wr[0] * 1.1, wr[1] * 1.3)
    return out


def render_far_7(st):
    img = np.zeros((FAR_H, W, 4), np.uint8)
    sunx = WIN0 + 222
    sun_gap = lambda w: np.exp(-(wrapdx(XS, sunx) / w) ** 2)
    L0 = bump_profile(rand_bumps(71, (40, 70), (22, 33)) + [(326, 60, 32), (448, 50, 27)], base=12, smooth=4)
    L0 = L0 - 10 * sun_gap(26)
    L1 = bump_profile(rand_bumps(72, (30, 55), (14, 25)) + [(196, 46, 25), (300, 40, 21)], base=9, smooth=3)
    L1 = L1 - 8 * sun_gap(22)
    # the village hill gets a flat crown
    plateau = np.where(np.abs(wrapdx(XS, 250)) <= 15, 21.0, 0.0)
    L2 = bump_profile(rand_bumps(73, (26, 44), (9, 16)) + [(250, 38, 24), (464, 36, 16)], base=6, smooth=3)
    L2 = np.maximum(L2, circ_smooth(plateau, 3))
    L2 = L2 - 6 * sun_gap(20)
    L3 = bump_profile(rand_bumps(74, (26, 40), (6, 12)) + [(168, 46, 17), (430, 40, 15), (556, 40, 14)],
                      base=3, smooth=2)
    L3 = np.where(np.abs(wrapdx(XS, 250)) < 30, np.minimum(L3, 7.0), L3)
    L3 = circ_smooth(L3, 2)
    profiles = [np.maximum(np.rint(p), lo) for p, lo in ((L0, 4), (L1, 3), (L2, 3), (L3, 2))]
    lay = [
        dict(base="#b88a8e", lit="#d8a294", shd="#a87e8a", haze="#c89a8e"),
        dict(base="#9a8a72", lit="#c8a07a", shd="#8a7c6c", haze="#b09a7e"),
        dict(base="#76823e", lit="#9c9a52", shd="#687438", haze="#8e8a48"),
        dict(base="#58702e", lit="#869040", shd="#4c6228", haze="#6e7838"),
    ]
    for li, L in enumerate(lay):
        h = profiles[li]
        m = hmask(h)
        re, le, td = edge_dist(m)
        put(img, m, L["base"])
        lit, away = facing_sun(h, sunx)
        put(img, m & (td == 0) & lit[None, :], L["lit"])
        if li >= 2:
            fields(img, m, td, li, h)
        put(img, m & (td == 0) & away[None, :] & (li >= 2), L["shd"])
        base_haze(img, m, L["haze"], 2 if li < 2 else 1, 2)
        if li == 2:
            village(img, 250 - 16, FAR_H - int(h[250]) + 1)
        if li >= 1:
            cypress_lines(img, h, li)
    ground_blend(img, st["land"][0])
    return img


def fields(img, m, td, li, h):
    """patchwork on the near hills: striped vine rows (contour or diagonal),
    golden stubble and olive groves, with dark hedge lines between"""
    seed = 770 + li
    fw = 30 if li == 3 else 22
    bh = 7 if li == 3 else 5
    off = np.rint(8 * pnoise(seed, 11)).astype(int)
    col_id = (FX + off[None, :] + td // 2) // fw
    band_id = (td + 2) // bh
    hsh = (col_id * 7 + band_id * 5 + li * 3) % 7
    body = m & (td >= 2)
    if li == 3:
        vine_a, vine_b, gold, olive, hedge = "#62802e", "#455e26", "#92903e", "#5e7634", "#3a5024"
    else:
        vine_a, vine_b, gold, olive, hedge = "#808c44", "#66763a", "#a49c50", "#76843f", "#5a6834"
    contour = body & np.isin(hsh, [0, 3, 5])
    diag = body & np.isin(hsh, [1, 4])
    wheat = body & (hsh == 2)
    grove = body & (hsh == 6)
    put(img, contour, vine_a)
    put(img, contour & (td % 2 == 0), vine_b)
    put(img, diag, vine_a)
    put(img, diag & ((FX + td) % 3 == 0), vine_b)
    put(img, wheat, gold)
    put(img, grove, olive)
    put(img, grove & ((FX + 2 * (td // 2)) % 4 == 0) & (td % 2 == 1), hedge)
    cl = np.roll(col_id, 1, axis=1)
    bu = np.roll(band_id, 1, axis=0)
    put(img, body & ((cl != col_id) | (bu != band_id)), hedge)


def cypress_lines(img, h, li):
    """rows of slim cypress standing on the ridges"""
    depth = (3 - li) / 2
    body = mix("#283a1e", "#9a8a72", 0.5 * depth)
    rim = mix("#76703a", "#c8a07a", 0.45 * depth)
    kinds = {1: ["c4", "c4", "c6"], 2: ["c6", "c8"], 3: ["c8", "c11", "c8", "c11"]}[li]
    runs = {1: [(150, 8, 3), (318, 6, 3), (520, 10, 3)],
            2: [(214, 4, 4), (276, 3, 4), (440, 9, 4), (600, 7, 4)],
            3: [(130, 6, 5), (192, 5, 5), (404, 6, 5), (530, 8, 5)]}[li]
    for (x0, n, step) in runs:
        for i in range(n):
            x = (x0 + i * step) % W
            yb = FAR_H - int(round(min(h[(x + d) % W] for d in (-1, 0, 1)))) + 1
            cypress(img, kinds[(i + li) % len(kinds)], x, yb, body, rim)


def village(img, x0, y_bottom):
    hh = len(VILLAGE)
    for j, row in enumerate(VILLAGE):
        for i, ch in enumerate(row):
            if ch != ".":
                put_px(img, x0 + i, y_bottom - (hh - 1) + j, VILLAGE_COLS[ch])


# ----------------------------------------------------------------------------
# s8 REDWOOD PASS: ridges of pointy conifers fading into fog
# ----------------------------------------------------------------------------
def conifer_rows(th, wr, tier, cap=99):
    """half widths from the tip down: a 1-px leader, then a widening crown
    whose edge juts out one pixel every `tier` rows (branch tips); `cap`
    keeps redwoods columnar"""
    rows = []
    for j in range(th):
        hw = 0 if j < 1 else min(cap, int((j + 0.5) * wr))
        if tier and j >= 3 and (j % tier) == tier - 1:
            hw += 1
        rows.append(hw)
    return rows


def forest_ridge(seed, ground, th_range, wr, tier, spacing, giants=0.0, columnar=False):
    rng = np.random.default_rng(seed)
    m = hmask(ground)
    x = rng.uniform(0, spacing[1])
    while x < W:
        tx = int(x)
        th = int(rng.integers(*th_range))
        if rng.random() < giants:
            th = int(th_range[1] * rng.uniform(1.15, 1.4))     # an old giant
        g = FAR_H - int(round(ground[tx % W]))
        cap = (2 + th // 9) if columnar else 99
        for j, hw in enumerate(conifer_rows(th, wr * rng.uniform(0.85, 1.15), tier, cap)):
            y = g - th + j + 1
            if 0 <= y < FAR_H:
                for i in range(-hw, hw + 1):
                    m[y, (tx + i) % W] = True
        x += rng.uniform(*spacing)
    return m


def render_far_8(st):
    img = np.zeros((FAR_H, W, 4), np.uint8)
    # the road climbs into a pass: every ridge dips toward the sun and rises
    # on either side of it
    v = np.clip(np.abs(wrapdx(XS, WIN0 + 222)) / 170.0, 0, 1) ** 1.3
    ridges = [
        dict(g=22 + 5 * pnoise(81, 5) + 2.5 * pnoise(82, 14) + 16 * v, th=(3, 7), wr=0.55, tier=0, sp=(2, 4),
             col="#c2b4b8", rim="#cebec0", fog="#dccac2", fade=(3, 5), giants=0.0, columnar=False),
        dict(g=14 + 5 * pnoise(83, 6) + 2.5 * pnoise(84, 15) + 13 * v, th=(5, 10), wr=0.5, tier=3, sp=(2, 5),
             col="#a8a2aa", rim="#b8b0b4", fog="#d2c4c0", fade=(4, 6), giants=0.05, columnar=False),
        dict(g=7 + 4 * pnoise(85, 7) + 2 * pnoise(86, 17) + 8 * v, th=(8, 15), wr=0.42, tier=3, sp=(3, 6),
             col="#7e8a86", rim="#949e98", fog="#b8b6b2", fade=(5, 7), giants=0.08, columnar=False),
        dict(g=2.5 + 1.5 * pnoise(87, 9) + 3 * v, th=(12, 26), wr=0.34, tier=3, sp=(3, 7),
             col="#4a5a52", rim="#66766a", fog=st["land"][0], fade=(9, 9), giants=0.16, columnar=True),
    ]
    for ri, R in enumerate(ridges):
        g = R["g"]
        m = forest_ridge(880 + ri, g, R["th"], R["wr"], R["tier"], R["sp"], R["giants"], R["columnar"])
        re, le, td = edge_dist(m)
        put(img, m, R["col"])
        put(img, m & (re == 0) & (td < 8) & (FY < FAR_H - np.rint(g).astype(int)[None, :]), R["rim"])
        # the ridge fades into the fog below its treeline
        gl = FAR_H - np.rint(g).astype(int)
        a0, a1 = R["fade"]
        f = np.clip((FY - (gl[None, :] - a0)) / (a0 + a1), 0, 1)
        steps = [mix(R["col"], R["fog"], t) for t in (0.3, 0.6, 0.85)]
        idx = quantize(f * 3, np.full(f.shape, 2.0), FX, FY, 3)
        for s in (1, 2, 3):
            put(img, m & (idx == s), steps[s - 1])
    ground_blend(img, st["land"][0])
    return img


# ----------------------------------------------------------------------------
# s9 PAINTED DESERT: mesas, buttes and spires
# ----------------------------------------------------------------------------
DUST = "#e2ac7c"
ROCK = dict(base="#a84c30", lit="#d4703e", hil="#ee945a", top="#c05c36", shd="#8a3e2c", dark="#6c3028",
            skirt="#9a5236", skirt_lit="#c07244", skirt_shd="#82442e")


def rock_pal(t):
    """the front rock palette pushed toward the dust colour by t"""
    return {k: mix(v, DUST, t) for k, v in ROCK.items()}


def draw_butte(img, cx, a, hc, hs, e, P, detail=True, seed=0, p=1.6, taper=False, lit_frac=0.34):
    """a vertical-walled block (half top width a, cliff height hc) on a
    concave talus skirt (height hs, reaching e px further out).  The walls
    are eroded (a pixel bitten out here and there), the sunlit right face
    is a narrow warm strip, and wide faces carry a few long vertical joints."""
    rng = np.random.default_rng(seed)
    xl0, xr0 = int(round(cx - a)), int(round(cx + a))
    wb = xr0 - xl0 + 1
    # ---- talus skirt
    for x in range(int(cx - a - e) - 1, int(cx + a + e) + 2):
        d = abs(x - cx)
        if d <= a:
            hk = hs
        elif e > 0 and d <= a + e:
            hk = hs * (1 - (d - a) / e) ** p
        else:
            continue
        hk = int(round(hk))
        for j in range(hk):
            right = x > cx + a * 0.3
            c = P["skirt_lit"] if right else P["skirt"]
            if detail:
                if x < xl0 and (x + j) % 4 == 0 and j < hk - 1:
                    c = P["skirt_shd"]               # gullies down the shaded slope
                if x > xr0 and (x - j) % 4 == 0 and j < hk - 1:
                    c = P["skirt"]                   # gullies down the lit slope
            if j == hk - 1 and x > xr0 - 1:
                c = P["hil"] if detail else P["skirt_lit"]
            if xl0 <= x <= xr0 and j == hs - 1:
                c = P["skirt_shd"]                   # shadow line under the cliff
            put_px(img, x, FAR_H - 1 - j, c)
    # ---- block: per-row walls with erosion bites
    top = hs + hc
    xl = np.full(top, xl0)
    xr = np.full(top, xr0)
    if detail and wb >= 5:
        for _ in range(max(1, hc // 6)):
            j0 = int(rng.integers(hs + 2, top - 2))
            ln = int(rng.integers(1, 4))
            if rng.random() < 0.5:
                xl[j0:j0 + ln] += 1
            else:
                xr[j0:j0 + ln] -= 1
    if taper and wb >= 2:
        xl[top - 2:] += 1 if wb >= 3 else 0
    lw = max(1, int(round(wb * lit_frac)))
    # desert varnish: dark streaks hanging from the rim down the cliff faces
    streak = {}
    if detail and wb >= 5:
        x = xl0 + 2
        while x < xr0:
            if rng.random() < 0.75:
                streak[x] = int(rng.integers(max(2, hc // 4), max(3, int(hc * 0.85))))
            x += int(rng.integers(2, 4))
    for j in range(hs, top):
        jj = top - 1 - j          # depth below the top
        for x in range(xl[j], xr[j] + 1):
            lit_face = x > xr0 - lw
            c = P["lit"] if lit_face else P["base"]
            if x in streak and 1 <= jj <= streak[x]:
                c = P["base"] if lit_face else P["shd"]
            if x == xr[j] and wb >= 4:
                c = P["hil"]
            if x == xl[j]:
                c = P["dark"]
            elif x == xl[j] + 1 and wb >= 7:
                c = P["shd"]
            if jj == 0:
                c = P["hil"] if lit_face else P["top"]
                if x == xl[j] and wb >= 5:
                    continue                           # rounded top-left corner
            put_px(img, x, FAR_H - 1 - j, c)


def render_far_9(st):
    img = np.zeros((FAR_H, W, 4), np.uint8)
    # far plateau line: long flat-topped mesas with sloped ends (full width)
    P0 = rock_pal(0.62)
    h0 = np.full(W, 4.0)
    for (cx, a, hh) in [(40, 40, 9), (150, 30, 7), (250, 46, 10), (360, 24, 8), (452, 40, 11),
                        (560, 36, 8), (620, 20, 6)]:
        d = np.abs(wrapdx(XS, cx))
        h0 = np.maximum(h0, np.where(d <= a, hh, np.maximum(0, hh - (d - a) * 0.7)))
    h0 = np.rint(h0)
    m0 = hmask(h0)
    re, le, td = edge_dist(m0)
    put(img, m0, P0["base"])
    put(img, m0 & (re >= 0) & (re < 2), P0["lit"])
    put(img, m0 & (td == 0), P0["top"])
    put(img, m0 & (td == 0) & (re < 6), P0["hil"])
    # middle buttes (hazy)
    P1 = rock_pal(0.38)
    for i, (cx, a, hc, hs, e) in enumerate([(60, 16, 9, 8, 16), (38, 1, 12, 8, 0), (226, 11, 10, 8, 14),
                                            (352, 7, 7, 7, 11), (458, 15, 10, 8, 15), (474, 1, 13, 8, 0),
                                            (566, 8, 12, 8, 12), (620, 1, 12, 5, 5)]):
        draw_butte(img, cx, a, hc, hs, e, P1, detail=True, seed=90 + i, lit_frac=0.12)
    m = img[..., 3] > 0
    base_haze(img, m, mix(P1["skirt"], DUST, 0.5), 2, 2)
    # front red rock
    P2 = rock_pal(0.0)
    items = [
        # cx, half top, cliff h, talus h, talus reach, taper
        (172, 20, 18, 12, 20, False),
        (281, 6, 22, 12, 14, False), (269, 1, 15, 12, 0, True),     # left mitten + thumb
        (322, 7, 20, 12, 15, False), (334, 1, 12, 12, 0, True),     # right mitten + thumb
        (405, 1, 27, 8, 9, True),                                   # tall spire by the sun
        (417, 0.5, 18, 6, 6, True),
        (506, 26, 14, 10, 18, False),
        (607, 12, 17, 11, 14, False),
    ]
    for i, (cx, a, hc, hs, e, tp) in enumerate(items):
        draw_butte(img, cx, a, hc, hs, e, P2, detail=True, seed=950 + i, taper=tp)
    # desert floor: a flat band along the base
    m = img[..., 3] > 0
    base_haze(img, m, "#cc9666", 2, 2)
    put(img, YB == 2, "#cc9666")
    put(img, YB == 1, "#c89060")
    ground_blend(img, st["land"][0], checker=False)
    return img


# ----------------------------------------------------------------------------
# s10 DEATH VALLEY: jagged barren ranges over a glowing salt pan
# ----------------------------------------------------------------------------
def ring_mpd(seed, n0=5, levels=7, rough=0.55):
    """midpoint displacement on the 640 ring -> straight slopes, sharp peaks"""
    rng = np.random.default_rng(seed)
    pts = list(rng.uniform(0, 1, n0))
    for lvl in range(levels):
        amp = rough ** (lvl + 1)
        new = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            new += [a, (a + b) / 2 + rng.uniform(-1, 1) * amp]
        pts = new
    v = np.array(pts)
    v = np.interp(np.arange(W), np.linspace(0, W, len(v), endpoint=False), v, period=W)
    return (v - v.min()) / (v.max() - v.min())


PAN_TOP = FAR_H - 5        # first salt-pan row


def render_far_10(st):
    img = np.zeros((FAR_H, W, 4), np.uint8)
    sunx = WIN0 + 215
    gap = np.exp(-(wrapdx(XS, sunx) / 34.0) ** 2)
    ranges = [
        dict(H=31, lo=6, seed=101, n0=6, rough=0.55, pw=1.3, gapk=0.93,
             base="#9c5a7a", lit="#c87478", rim="#ec9a80", shd="#8e5074"),
        dict(H=25, lo=4, seed=113, n0=7, rough=0.56, pw=1.35, gapk=0.97,
             base="#6c3a5a", lit="#a05462", rim="#e08070", shd="#5c3250"),
        dict(H=20, lo=2, seed=127, n0=8, rough=0.5, pw=1.15, gapk=1.0,
             base="#47283e", lit="#7c3e4c", rim="#d0685c", shd="#3a2034"),
    ]
    for ri, R in enumerate(ranges):
        prof = ring_mpd(R["seed"], n0=R["n0"], rough=R["rough"]) ** R["pw"]
        h = (R["lo"] + R["H"] * prof) * (1 - R["gapk"] * gap)
        h = np.rint(h) + 5          # stands on the salt pan
        m = hmask(h)
        re, le, td = edge_dist(m)
        put(img, m, R["base"])
        lit, away = facing_sun(h, sunx)
        dh = np.abs(np.roll(h, -1) - np.roll(h, 1))
        depth = np.clip(dh * 1.2 + 1, 2, 6).astype(int)
        put(img, m & lit[None, :] & (td < depth[None, :]), R["lit"])
        put(img, m & lit[None, :] & (td == 0), R["rim"])
        if ri < 2:
            put(img, m & away[None, :] & (td >= 1) & (td < 3), R["shd"])
    salt_pan(img, st, sunx)
    return img


def salt_pan(img, st, sunx):
    """flat pale salt strip on the valley floor, a heat mirage on its edge
    and the sun's glare stretched across it"""
    rows = [(PAN_TOP, "#ead2ce"), (PAN_TOP + 1, "#f8eae6"), (PAN_TOP + 2, "#fff4f0"),
            (PAN_TOP + 3, "#f0dcd8")]
    for y, c in rows:
        img[y, :, :3] = C(c)
        img[y, :, 3] = 255
    # mirage: the bottoms of the ranges break into pale dashes
    rng = np.random.default_rng(1010)
    x = 0
    while x < W:
        ln = int(rng.integers(3, 12))
        if rng.random() < 0.55:
            for i in range(ln):
                img[PAN_TOP - 1, (x + i) % W, :3] = C("#e6c4c4")
        x += ln + int(rng.integers(2, 10))
    # the sun's glare on the pan
    d = np.abs(wrapdx(XS, sunx))
    img[PAN_TOP + 1, d < 11, :3] = C("#fff0cc")
    img[PAN_TOP + 2, d < 17, :3] = C("#fff6dc")
    img[PAN_TOP + 3, d < 7, :3] = C("#ffe8c0")
    ground_blend(img, st["land"][0], checker=False)


# ----------------------------------------------------------------------------
# build + previews
# ----------------------------------------------------------------------------
FAR = {6: render_far_6, 7: render_far_7, 8: render_far_8, 9: render_far_9, 10: render_far_10}


def check_far(far, land):
    a = far[..., 3]
    assert set(np.unique(a)) <= {0, 255}, "alpha must be 0/255"
    assert (a[-4:] == 255).all(), "land must cover the horizon rows across the whole tile"
    assert (far[-1, :, :3] == C(land)).all(), "bottom row must be the horizon land colour"
    # no holes of open sky reaching down to the horizon: every column is solid
    # from its top-most land pixel down to the bottom row
    top = np.argmax(a > 0, axis=0)
    for x in range(W):
        assert (a[top[x]:, x] == 255).all() or (a[-6:, x] == 255).all(), f"gap at x={x}"


def build(sn):
    st = STAGES[sn]
    sky = render_sky(sn)
    far = FAR[sn](st)
    check_far(far, st["land"][0])
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(sky, "RGB").save(os.path.join(OUT, f"sky_s{sn}.png"))
    Image.fromarray(far, "RGBA").save(os.path.join(OUT, f"far_s{sn}.png"))
    win = mb.composite(sky, far, st["land"], WIN0, mb.SCREEN_W)
    Image.fromarray(mb.zoom(win)).save(os.path.join(HERE, f"preview_s{sn}.png"))
    tile = mb.composite(sky, far, st["land"], 0, W)
    Image.fromarray(mb.zoom(tile)).save(os.path.join(HERE, f"preview_tile_s{sn}.png"))
    ncol = len(np.unique(sky.reshape(-1, 3), axis=0))
    nfar = len(np.unique(far[far[..., 3] > 0][:, :3], axis=0))
    bot = "#%02x%02x%02x" % tuple(int(v) for v in far[-1, 0, :3])
    print(f"stage {sn} {st['name']}: sky colours={ncol} far colours={nfar} far bottom row={bot}")


if __name__ == "__main__":
    assert all(len(r) == len(VILLAGE[0]) for r in VILLAGE)
    stages = [int(a) for a in sys.argv[1:]] or [6, 7, 8, 9, 10]
    for s in stages:
        build(s)

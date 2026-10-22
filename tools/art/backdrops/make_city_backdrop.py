#!/usr/bin/env python3
"""
Velvet Cruise -- parallax backdrop for stage 11 "Neon City" (downtown at night,
synthwave / Miami / Las Vegas flavour; after the red-rock desert, before the
twilight bay).

Reuses the dithering / sky / preview helpers of make_backdrops.py and the
far-layer helpers of make_route_backdrops.py (both imported, not modified) and
writes to ./out/:
    sky_s11.png   640x80, opaque.  Indigo -> violet -> magenta city-glow bands,
                  stars (a few 2x2 twinklers), a crescent moon, three static
                  searchlight beams, a small blimp and an aircraft light.
    far_s11.png   640x56, RGBA (alpha 0/255).  Bottom row = horizon (screen y 79).
                  A dense two-layer downtown skyline over the whole 640 tile:
                  a dimmer, bluer back row; dark navy-purple front towers with
                  grids of lit / unlit windows, neon crowns and edges, red
                  aviation lights; landmarks (observation needle, art-deco
                  spire, ferris wheel, two billboards, a casino blade sign); a
                  solid band of low buildings and street lights at the base.
                  The bottom row is exactly LAND[0] (the stage's landH).
Previews (next to this script):
    preview_s11.png       game window (tile x 160..479) at 3x, land gradient below
    preview_tile_s11.png  the full 640 tile at 3x

All placement is on the 640 ring (wrapdx / modulo W), dithers have period 4,
so both layers tile seamlessly at x = 0 / 640.

Usage:  python3 -B make_city_backdrop.py
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_backdrops as mb  # noqa: E402
import make_route_backdrops as rb  # noqa: E402

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

C, mix, wrapdx, dmask, quantize = mb.C, mb.mix, mb.wrapdx, mb.dmask, mb.quantize
pnoise = mb.periodic_noise
W, SKY_H, FAR_H, WIN0 = mb.W, mb.SKY_H, mb.FAR_H, mb.WIN0
put_px = rb.put_px
OUT = os.path.join(HERE, "out")
SN = 11

SY, SX = np.mgrid[0:SKY_H, 0:W]
FY, FX = np.mgrid[0:FAR_H, 0:W]
YB = FAR_H - 1 - FY
XS = np.arange(W)

# horizon land colour (theme landH) -> near the road (landN)
LAND = ("#221838", "#0c0818")

# ----------------------------------------------------------------------------
# palette
# ----------------------------------------------------------------------------
NEON_PINK, NEON_CYAN = "#ff3ab0", "#3af0ff"
WARM, WARM2, CYAN, PINK = "#ffd890", "#f0b060", "#8af0ff", "#ff8ad0"
RED = "#ff4a4a"

BACK = dict(body="#2c2862", rim="#3a3676", dark="#26225a", top="#46407e",
            unlit=None, win=["#b8987e", "#6aa2c8", "#b06aa8"], neon=["#c0469e", "#3ab4c8"])
FRONT = dict(body="#1a1436", rim="#2a2252", dark="#130e2a", top="#342a5e",
             unlit="#251e48", win=[WARM, CYAN, PINK], neon=[NEON_PINK, NEON_CYAN])
BAND = dict(body="#130d28", top="#1e1638", rim="#241a42")

STAGE = dict(
    name="Neon City",
    land=LAND,
    sky=[(0, "#070820"), (13, "#12103a"), (27, "#2a1458"), (39, "#5a1a78"),
         (50, "#a02a8a"), (62, "#d0508e")],
    glow_ext=["#dc5e94"],
    # the city-light glow bulges the bands upward behind the downtown
    # clusters: (tile x, palette steps added at the base, half width, height, power)
    bulges=[(318, 1.6, 170.0, 62.0, 1.3), (566, 1.1, 90.0, 50.0, 1.3), (92, 1.0, 80.0, 46.0, 1.3)],
    moon=dict(x=548 - WIN0, y=14, r=7, off=(-2.6, -1.6), lit="#fff2d0", shade="#e8c49a"),
)


# ----------------------------------------------------------------------------
# SKY
# ----------------------------------------------------------------------------
# searchlight beams: source tile x, source sky row, lean (deg from vertical,
# + = to the right), length, half width at the source, spread per px
BEAMS = [
    (262, 52, -24.0, 58, 0.9, 0.085),
    (268, 52, 9.0, 54, 0.9, 0.08),
    (414, 56, 27.0, 52, 0.9, 0.08),
]
BEAM_HI, BEAM_LO = "#9480cc", "#6a56a8"


def beam_masks():
    """per beam: (inside, level 0..3) -- the cone fades out with height and
    its edges are one dither step weaker than its core"""
    out = []
    for (bx, by, ang, L, w0, spr) in BEAMS:
        a = math.radians(ang)
        ux, uy = math.sin(a), -math.cos(a)        # along the beam (upward)
        px = wrapdx(SX, bx)
        py = SY - by
        t = px * ux + py * uy
        d = px * (-uy) + py * ux
        hw = w0 + np.maximum(t, 0) * spr
        inside = (t > 0) & (t < L) & (np.abs(d) < hw)
        f = 1 - t / L
        lev = np.where(f > 0.72, 3, np.where(f > 0.36, 2, 1))
        edge = np.abs(d) > hw - 1.0
        lev = np.where(edge, lev - 1, lev)
        out.append((inside, lev))
    return out


def draw_beams(img):
    hi, lo = C(BEAM_HI), C(BEAM_LO)
    any_beam = np.zeros((SKY_H, W), bool)
    for inside, lev in beam_masks():
        # level 3: hi 50 % over lo 50 %; 2: lo 50 %; 1: lo 25 %
        m3 = inside & (lev >= 3)
        m2 = inside & (lev == 2)
        m1 = inside & (lev == 1)
        chk = dmask(np.full(SX.shape, 2), SX, SY)
        qtr = dmask(np.full(SX.shape, 1), SX, SY)
        img[m3 & chk] = hi
        img[m3 & ~chk] = lo
        img[m2 & chk] = lo
        img[m1 & qtr] = lo
        any_beam |= inside & (lev >= 1)
    return any_beam


def draw_stars(img, avoid):
    rng = np.random.default_rng(1111)
    mx, my = WIN0 + STAGE["moon"]["x"], STAGE["moon"]["y"]
    bright, mid, dim, warm = C("#ffffff"), C("#e4dcff"), C("#a8a0e0"), C("#ffe8c8")
    placed = []
    tries = 0
    while len(placed) < 46 and tries < 8000:
        tries += 1
        x = int(rng.integers(0, W))
        y = int(min(rng.integers(0, 38), rng.integers(0, 38)))
        if abs(wrapdx(x, mx)) < 12 and abs(y - my) < 11:
            continue
        if avoid[max(0, y - 1):y + 3, [(x - 1) % W, x, (x + 1) % W, (x + 2) % W]].any():
            continue
        if any(abs(wrapdx(x, px)) < 9 and abs(y - py) < 6 for px, py in placed):
            continue
        placed.append((x, y))
    for i, (x, y) in enumerate(placed):
        if y < 13:
            c = bright if i % 3 == 0 else (warm if i % 5 == 1 else mid)
        elif y < 25:
            c = mid if i % 2 == 0 else dim
        else:
            c = dim
        img[y, x] = c
    # a few bigger twinklers: 2x2, bright corner + soft corners
    for (x, y) in [(212, 6), (402, 11), (598, 22), (40, 9), (318, 3), (486, 26)]:
        img[y, x % W] = bright
        img[y, (x + 1) % W] = mid
        img[y + 1, x % W] = mid
        img[y + 1, (x + 1) % W] = dim
    # two sparkles (plus shape)
    for (x, y) in [(150, 14), (350, 20)]:
        img[y, x] = bright
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            img[y + ddy, (x + ddx) % W] = dim


BLIMP = [
    "....hhhhhh....t",
    "..hhmmmmmmhh.tt",
    ".hmpPpPpPpPmmtt",
    "rmmmmmmmmmmmmtt",
    ".bbmmmmmmmmbb.t",
    "....bbgggbb....",
]
BLIMP_COLS = dict(h="#4c3e86", m="#2e2660", b="#1e1844", t="#262052", p=NEON_PINK, P="#ffa0dc",
                  g=WARM, r=RED)


def draw_blimp(img, x0, y0):
    for j, row in enumerate(BLIMP):
        for i, ch in enumerate(row):
            if ch != ".":
                img[y0 + j, (x0 + i) % W] = C(BLIMP_COLS[ch])


def render_sky():
    st = STAGE
    full, umax, haze_i, u, k = rb.sky_field(st)
    for (bx, amt, ax, ay, q) in st["bulges"]:
        d = np.sqrt((wrapdx(SX, bx) / ax) ** 2 + ((SKY_H + 2 - SY) / ay) ** 2)
        u = np.minimum(u + amt * np.clip(1 - d, 0, 1) ** q, umax)
    idx = quantize(u, k, SX, SY, umax)
    img = np.array(full, dtype=np.uint8)[idx]
    beams = draw_beams(img)
    draw_stars(img, beams)
    mb.draw_moon(img, st)
    draw_blimp(img, 452, 27)
    # a far-off aircraft: white strobe + red wingtip
    img[19, 128] = C("#ffffff")
    img[19, 131] = C(RED)
    return img


# ----------------------------------------------------------------------------
# FAR LAYER
# ----------------------------------------------------------------------------
BAND_H = 6        # rows of low buildings along the base


def env(x):
    """downtown density: a tall core in the middle of the window, smaller
    clusters around it and round the back of the ring -- never empty (the
    city fills the whole tile)"""
    peaks = [(312, 1.0, 40.0), (168, 0.5, 16.0), (396, 0.6, 20.0), (472, 0.75, 22.0),
             (566, 0.9, 30.0), (92, 0.75, 30.0), (14, 0.45, 18.0)]
    return max([0.16] + [a * math.exp(-(wrapdx(x, cx) / sg) ** 2) for (cx, a, sg) in peaks])


# landmarks need lower surroundings to read: (x from, x to, front max, back max)
CAPS = [(188, 209, 21, 33),      # observation needle
        (424, 458, 12, 21)]      # ferris wheel


def cap(xc, h, layer):
    for (a, b, fm, bm) in CAPS:
        if a <= xc % W <= b:
            m = fm if layer == "front" else bm
            if h > m:
                return m - (int(xc) * 7) % 4
    return h


def tower_shape(w, h, style, rng):
    """column heights of a tower + extra pixels above it (crowns, spires)"""
    hs = np.full(w, h)
    extra = []          # (i, j) above-body pixels, in tower coords
    if style == "step" and w >= 6:
        s = max(1, w // 4)
        dh = int(rng.integers(3, 6))
        hs[:s] -= dh
        hs[w - s:] -= dh
    elif style == "slant" and w >= 5:
        # a gentle 1:2 sloped roof, rising to the left or to the right
        right = rng.random() < 0.5
        for i in range(w):
            k = i if right else (w - 1 - i)
            hs[i] = h - k // 2
    elif style == "crown" and w >= 7:
        # art-deco set-backs
        for st in range(1, 4):
            hw = (w // 2) - 1 - st
            if hw < 0:
                break
            for i in range(-hw, hw + 1 - (w % 2 == 0)):
                for jj in range(2):
                    extra.append((w // 2 + i, h + (st - 1) * 2 + jj))
    elif style == "pyramid" and w >= 5:
        for jj in range(1, w // 2 + 1):
            for i in range(jj, w - jj):
                extra.append((i, h - 1 + jj))
    elif style == "antenna":
        ax = int(rng.integers(1, max(2, w - 1)))
        for jj in range(int(rng.integers(3, 7))):
            extra.append((ax, h + jj))
    elif style == "box" and w >= 5:
        bx = int(rng.integers(1, w - 2))
        for jj in range(2):
            extra.append((bx, h + jj))
            extra.append((bx + 1, h + jj))
    return np.maximum(hs, 2), extra


def window_grid(w, kind):
    """x offsets (tower coords) of window pixels in one floor: single
    pixels at pitch 2 or horizontal pairs at pitch 3, centred"""
    inner = w - 2
    if kind == "pair":
        n = (inner + 1) // 3
        span = 3 * n - 1
    else:
        n = (inner + 1) // 2
        span = 2 * n - 1
    if n <= 0:
        return []
    ofs = 1 + (inner - span) // 2
    xs = []
    for k in range(n):
        if kind == "pair":
            xs += [ofs + 3 * k, ofs + 3 * k + 1]
        else:
            xs.append(ofs + 2 * k)
    return xs


def draw_tower(img, x0, w, h, P, style, rng, windows=True, lit_p=None, vpair=False,
               neon=None, neon_col=None, win_main=None, win_j0=BAND_H + 1, occ=None):
    hs, extra = tower_shape(w, h, style, rng)
    body, rim, dark, top = C(P["body"]), C(P["rim"]), C(P["dark"]), C(P["top"])
    for i in range(w):
        for j in range(hs[i]):
            c = body
            if i == w - 1:
                c = rim
            elif i == 0 and w >= 4:
                c = dark
            if j == hs[i] - 1:
                c = top
            put_px(img, x0 + i, FAR_H - 1 - j, c)
            if occ is not None:
                occ[FAR_H - 1 - j, (x0 + i) % W] = True
    for (i, j) in extra:
        put_px(img, x0 + i, FAR_H - 1 - j, top if (i == w - 1 or (i, j + 1) not in extra) else body)
    # windows
    if windows and w >= 4 and h >= win_j0 + 4:
        kind = "pair" if (w - 2) % 3 == 2 and rng.random() < 0.6 else "single"
        if kind == "pair":
            vpair = False                  # windows stay 1x1 / 1x2, never 2x2 blocks
        xs = window_grid(w, kind)
        pitch = 3 if vpair else 2
        lp = lit_p if lit_p is not None else rng.uniform(0.25, 0.5)
        cols = [C(c) for c in P["win"]]
        main = win_main if win_main is not None else int(rng.choice(3, p=[0.6, 0.28, 0.12]))
        jtop = int(hs.min()) - 3
        # windows in whole columns of offices; some columns dark all the way
        col_on = {x: rng.random() < 0.85 for x in xs}
        floor = 0
        for j in range(win_j0, jtop, pitch):
            r = rng.random()
            state = "off" if r < 0.22 else "full" if r < 0.36 else "mix"
            for x in xs:
                if state == "off":
                    lit = rng.random() < 0.06
                elif state == "full":
                    lit = rng.random() < 0.9
                else:
                    lit = col_on[x] and rng.random() < lp
                if lit:
                    c = cols[main] if rng.random() < 0.82 else cols[int(rng.integers(0, 3))]
                elif P["unlit"]:
                    c = C(P["unlit"])
                else:
                    continue
                put_px(img, x0 + x, FAR_H - 1 - j, c)
                if vpair:
                    put_px(img, x0 + x, FAR_H - 2 - j, c)
            floor += 1
    # neon
    if neon and neon_col is not None:
        nc = C(neon_col)
        if neon == "top":
            for i in range(w):
                put_px(img, x0 + i, FAR_H - hs[i], nc)
            for j in range(1, 3):
                put_px(img, x0, FAR_H - hs[0] + j, nc)
                put_px(img, x0 + w - 1, FAR_H - hs[w - 1] + j, nc)
        elif neon == "edge":
            for j in range(win_j0 - 1, int(hs[w - 1])):
                put_px(img, x0 + w - 1, FAR_H - 1 - j, nc)
        elif neon == "edges":
            for j in range(int(hs[0] * 0.55), int(hs[0])):
                put_px(img, x0, FAR_H - 1 - j, nc)
            for j in range(int(hs[w - 1] * 0.55), int(hs[w - 1])):
                put_px(img, x0 + w - 1, FAR_H - 1 - j, nc)
        elif neon == "band":
            jb = int(hs.min()) - 2
            for i in range(w):
                put_px(img, x0 + i, FAR_H - 1 - jb, nc)
        elif neon == "slant":
            for i in range(w):
                put_px(img, x0 + i, FAR_H - hs[i], nc)
    return hs, extra


def place_row(rng, lo_w, hi_w, height_fn, gap_p=0.0, x_start=0):
    """walk once round the ring; returns [(x, w, h)].  The ring closes
    exactly at x_start + 640: the last tower is trimmed, and a remainder too
    narrow for a tower widens its neighbour instead."""
    out = []
    x = x_start
    end = x_start + W
    while x < end:
        w = int(rng.integers(lo_w, hi_w + 1))
        if end - x - w < lo_w:
            w = end - x
        h = height_fn(x + w / 2, w)
        out.append((x % W, w, h))
        x += w + (1 if (rng.random() < gap_p and end - x - w > lo_w + 1) else 0)
    return out


def aviation_light(img, x, j):
    put_px(img, x, FAR_H - 1 - j, RED)


def needle(img, cx, P):
    """observation tower: a tapering tripod shaft, a lit saucer deck and a
    mast with a red light (54 px tall)"""
    body, rim, dark, top = C(P["body"]), C(P["rim"]), C(P["dark"]), C(P["top"])
    deck = 40
    for j in range(deck):
        hw = 1 if j > 7 else (2 if j > 2 else 3)
        for i in range(-hw, hw + 1):
            c = rim if i == hw else dark if i == -hw else body
            put_px(img, cx + i, FAR_H - 1 - j, c)
    # saucer: (half width, kind) bottom -> top
    rows = [(2, "b"), (4, "b"), (5, "u"), (5, "w"), (5, "u"), (4, "t"), (2, "b")]
    for k, (hw, kind) in enumerate(rows):
        j = deck + k
        for i in range(-hw, hw + 1):
            c = body
            if kind == "u":
                c = C(NEON_PINK) if k == 2 else C(NEON_CYAN)
            elif kind == "w":
                c = C(WARM) if i % 2 == 0 else C("#ffe8b8")
                if abs(i) == hw:
                    c = rim if i > 0 else dark
            elif kind == "t":
                c = top
            elif i == hw:
                c = rim
            put_px(img, cx + i, FAR_H - 1 - j, c)
    for j in range(deck + len(rows), 54):
        put_px(img, cx, FAR_H - 1 - j, body if j < 52 else top)
    aviation_light(img, cx, 54)


def deco_spire(img, x0, P, rng):
    """the tallest downtown tower: art-deco set-backs outlined in cyan neon,
    a pink neon pinstripe up its face, a needle spire with a red light"""
    w, h = 11, 40
    body, rim, dark, top = C(P["body"]), C(P["rim"]), C(P["dark"]), C(P["top"])
    draw_tower(img, x0, w, h, P, "flat", rng, lit_p=0.42, win_main=0, neon=None)
    cx = x0 + w // 2
    j = h
    for hw in (4, 3, 2, 1):
        for jj in range(3):
            for i in range(-hw, hw + 1):
                c = rim if i == hw else dark if i == -hw else body
                put_px(img, cx + i, FAR_H - 1 - (j + jj), c)
            if jj == 1 and hw >= 2:
                for i in range(-hw + 1, hw, 2):
                    put_px(img, cx + i, FAR_H - 1 - (j + jj), WARM)
        for i in range(-hw - 1, hw + 2):
            put_px(img, cx + i, FAR_H - 1 - (j - 1), NEON_CYAN)
        j += 3
    for jj in range(j, 54):
        put_px(img, cx, FAR_H - 1 - jj, top)
    aviation_light(img, cx, 54)
    # neon pinstripes on both edges of the shaft
    for jj in range(BAND_H + 2, h - 1):
        put_px(img, x0, FAR_H - 1 - jj, NEON_PINK)


def ferris_wheel(img, cx, R, P):
    """hub height R+4: a pink neon outer rim with a dim inner ring, lit
    spokes, gondola lights hanging off the rim (cyan / warm), an A-frame of
    legs"""
    hub = R + 4
    cy = FAR_H - 1 - hub
    leg = C("#3a3070")
    spoke = C("#6a56a8")
    inner = C("#9a2a86")
    # legs
    for side in (-1, 1):
        for j in range(hub + 1):
            x = cx + side * int(round((hub - j) * 0.45))
            put_px(img, x, FAR_H - 1 - j, leg)
    # spokes: 8 thin lines, starting clear of the hub so they don't clump
    for k in range(8):
        a = 2 * math.pi * k / 8 + 0.2
        for s_ in np.arange(3.0, R - 2.0, 0.25):
            put_px(img, int(round(cx + s_ * math.cos(a))), int(round(cy + s_ * math.sin(a))), spoke)
    # rims
    for y in range(cy - R - 1, cy + R + 2):
        for x in range(cx - R - 1, cx + R + 2):
            d = math.hypot(x - cx, y - cy)
            if R - 0.5 <= d < R + 0.5:
                put_px(img, x, y, NEON_PINK)
            elif R - 2.5 <= d < R - 1.5:
                put_px(img, x, y, inner)
    # gondolas: a lit car hanging just outside the rim at every spoke
    for k in range(12):
        a = 2 * math.pi * k / 12 + 0.13
        gx = int(round(cx + (R + 1.0) * math.cos(a)))
        gy = int(round(cy + (R + 1.0) * math.sin(a))) + 1
        c = NEON_CYAN if k % 2 == 0 else WARM
        put_px(img, gx, gy, c)
        put_px(img, gx, gy + 1, c)
    # hub
    for i in (-1, 0, 1):
        put_px(img, cx + i, cy, spoke)
        put_px(img, cx, cy + i, spoke)
    put_px(img, cx, cy, "#ffffff")


# roof billboards (abstract artwork, no text): c frame, v violet, m magenta,
# y sun yellow, o sun orange, d dark horizon; b cyan panel, B light cyan,
# w white zig-zag, k pink frame
BILLBOARDS = {
    "sun": [
        "ccccccccccccccccc",
        "cvvvvvvyyyvvvvvvc",
        "cvvvvyyyyyyyvvvvc",
        "cmmmyyyyyyyyymmmc",
        "cmmmmmmmmmmmmmmmc",
        "cmmooooooooooommc",
        "cmmmmmmmmmmmmmmmc",
        "cdddddddddddddddc",
        "ccccccccccccccccc",
    ],
    "wave": [
        "kkkkkkkkkkkkkkkkk",
        "kBBBBBBBBBBBBBBBk",
        "kbbbbwbbbbbbbwbbk",
        "kbbbwbwbbbbbwbwbk",
        "kbbwbbbwbbbwbbbwk",
        "kbwbbbbbwbwbbbbbk",
        "kwbbbbbbbwbbbbbbk",
        "kBBBBBBBBBBBBBBBk",
        "kkkkkkkkkkkkkkkkk",
    ],
}
BB_COLS = dict(c=NEON_CYAN, v="#6a1a8a", m="#c02a8e", y="#ffe890", o="#ff9a5a", d="#2a0e48",
               b="#2a9ec8", B="#5ad8f0", w="#ffe8f8", k=NEON_PINK)


def billboard(img, x0, jb, P, kind):
    """a big glowing roof billboard on two posts; jb = row of its bottom edge"""
    rows = BILLBOARDS[kind]
    w = len(rows[0])
    for px in (x0 + 3, x0 + w - 4):
        for j in range(jb - 3, jb):
            put_px(img, px, FAR_H - 1 - j, P["body"])
    for jj, row in enumerate(rows):
        for i, ch in enumerate(row):
            put_px(img, x0 + i, FAR_H - 1 - (jb + len(rows) - 1 - jj), BB_COLS[ch])


def blade_sign(img, x, j0, n):
    """a tall vertical casino sign: pink neon frame, a column of warm bulbs"""
    for jj in range(n):
        j = j0 + jj
        put_px(img, x, FAR_H - 1 - j, NEON_PINK)
        put_px(img, x + 2, FAR_H - 1 - j, NEON_PINK)
        put_px(img, x + 1, FAR_H - 1 - j, WARM if jj % 2 == 0 else "#a02a8a")
    for i in range(3):
        put_px(img, x + i, FAR_H - 1 - (j0 + n), NEON_CYAN)
        put_px(img, x + i, FAR_H - 1 - (j0 - 1), NEON_CYAN)


def base_band(img, rng):
    """solid band of low buildings along the base, shop neon and street lights"""
    body, top, rim = C(BAND["body"]), C(BAND["top"]), C(BAND["rim"])
    x = 0
    while x < W:
        w = int(rng.integers(4, 13))
        w = min(w, W - x)
        h = int(rng.integers(BAND_H - 2, BAND_H + 2))
        for i in range(w):
            for j in range(h):
                c = top if j == h - 1 else (rim if i == w - 1 else body)
                put_px(img, x + i, FAR_H - 1 - j, c)
        # shop signs: short neon dashes
        if rng.random() < 0.45 and w >= 5:
            i0 = int(rng.integers(1, w - 3))
            ln = int(rng.integers(2, 4))
            nc = [NEON_PINK, NEON_CYAN, WARM][int(rng.integers(0, 3))]
            for i in range(ln):
                put_px(img, x + i0 + i, FAR_H - 1 - 3, nc)
        x += w
    # street lights just above the ground row (pitch 4 and colour cycle 5
    # both divide 640: the string of lamps runs straight through the seam)
    for x in range(0, W, 4):
        put_px(img, x, FAR_H - 2, WARM if (x // 4) % 5 else "#ffefc8")
    # the ground row = landH
    img[FAR_H - 1, :, :3] = C(LAND[0])
    img[FAR_H - 1, :, 3] = 255


def render_far():
    img = np.zeros((FAR_H, W, 4), np.uint8)
    rng = np.random.default_rng(1101)

    # ---- back row: dimmer, bluer, sparse dim windows
    def back_h(xc, w):
        e = env(xc)
        h = 21 + rng.uniform(0, 6) + e * rng.uniform(12, 22)
        if rng.random() < 0.3 * e:
            h += rng.uniform(4, 8)                 # the odd tall one behind
        return cap(xc, int(round(min(h, 49))), "back")

    back = place_row(rng, 5, 11, back_h, gap_p=0.0, x_start=3)
    for (x, w, h) in back:
        style = ["flat", "flat", "step", "antenna", "box", "slant", "pyramid"][int(rng.integers(0, 7))]
        neon = None
        if h > 30 and w >= 6 and rng.random() < 0.3:
            neon = "top"
        draw_tower(img, x, w, h, BACK, style, rng, lit_p=0.16, vpair=True,
                   neon=neon, neon_col=BACK["neon"][int(rng.integers(0, 2))], win_j0=12)

    # ---- landmarks behind the front row
    needle(img, 198, FRONT)

    # ---- front row
    def front_h(xc, w):
        e = env(xc)
        r = rng.random()
        if r < 0.3:                                 # low and mid-rise blocks
            h = rng.uniform(13, 19) + e * 4
        elif r < 0.82:
            h = rng.uniform(18, 25) + e * rng.uniform(6, 17)
        else:                                       # towers
            h = rng.uniform(26, 32) + e * rng.uniform(6, 14)
        return cap(xc, int(round(min(max(h, 10), 46))), "front")

    front = place_row(rng, 4, 10, front_h, gap_p=0.18, x_start=0)
    for (x, w, h) in front:
        if abs(wrapdx(x + w / 2, 198)) < 4:
            continue                                   # keep the needle's shaft clear
        if h >= 22:
            style = ["flat", "flat", "step", "slant", "crown", "antenna", "box", "pyramid"][int(rng.integers(0, 8))]
        else:
            style = ["flat", "box", "flat"][int(rng.integers(0, 3))]
        neon, ncol = None, None
        r = rng.random()
        if h >= 20 and r < 0.34:
            neon = {"slant": "slant"}.get(style, ["top", "edge", "edges", "band"][int(rng.integers(0, 4))])
            if neon in ("top", "band", "edges") and (w < 6 or (neon == "edges" and h < 24)):
                neon = "edge"                       # outlines on a slim / short tower read as glyphs
            ncol = FRONT["neon"][int(rng.integers(0, 2))]
        hs, extra = draw_tower(img, x, w, h, FRONT, style, rng, neon=neon, neon_col=ncol,
                               vpair=rng.random() < 0.3)
        top = max([h] + [j + 1 for (_, j) in extra])
        if top >= 36 and style in ("antenna", "crown", "pyramid"):
            xs_ = [i for (i, j) in extra if j + 1 == top] or [w // 2]
            aviation_light(img, x + xs_[0], top)

    # ---- hero landmarks
    deco_spire(img, 306, FRONT, np.random.default_rng(77))
    ferris_wheel(img, 441, 13, FRONT)
    # roof billboard on a mid-rise left of the core, a second one on the right
    draw_tower(img, 247, 14, 24, FRONT, "flat", np.random.default_rng(78), lit_p=0.35)
    billboard(img, 245, 27, FRONT, "sun")
    draw_tower(img, 368, 12, 22, FRONT, "flat", np.random.default_rng(79), lit_p=0.35, win_main=1)
    billboard(img, 366, 25, FRONT, "wave")
    # casino with a blade sign
    blade_sign(img, 404, 10, 14)
    # secondary clusters off-window: a second spire, an antenna tower
    deco_tower_b = np.random.default_rng(80)
    draw_tower(img, 561, 9, 44, FRONT, "flat", deco_tower_b, lit_p=0.38, win_main=1, neon="edges",
               neon_col=NEON_CYAN)
    for jj in range(44, 53):
        put_px(img, 565, FAR_H - 1 - jj, FRONT["top"])
    for i in range(3):
        put_px(img, 564 + i, FAR_H - 1 - 46, FRONT["top"])
    aviation_light(img, 565, 53)
    # a slender pyramid-topped spire in the cluster behind the start
    sp_rng = np.random.default_rng(81)
    draw_tower(img, 88, 7, 40, FRONT, "pyramid", sp_rng, lit_p=0.4, win_main=0, neon="edges",
               neon_col=NEON_PINK)
    for jj in range(43, 50):
        put_px(img, 91, FAR_H - 1 - jj, FRONT["top"])
    aviation_light(img, 91, 50)

    base_band(img, np.random.default_rng(1102))
    return img


# ----------------------------------------------------------------------------
# checks + previews
# ----------------------------------------------------------------------------
def check_tiles(sky, far):
    assert sky.shape == (SKY_H, W, 3)
    assert far.shape == (FAR_H, W, 4)
    a = far[..., 3]
    assert set(np.unique(a)) <= {0, 255}, "alpha must be 0/255"
    assert (a[-BAND_H + 2:] == 255).all(), "the base band must cover the whole tile"
    assert (far[-1, :, :3] == C(LAND[0])).all(), "bottom row must be the horizon land colour"


def build():
    sky = render_sky()
    far = render_far()
    check_tiles(sky, far)
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(sky, "RGB").save(os.path.join(OUT, f"sky_s{SN}.png"))
    Image.fromarray(far, "RGBA").save(os.path.join(OUT, f"far_s{SN}.png"))
    win = mb.composite(sky, far, LAND, WIN0, mb.SCREEN_W)
    Image.fromarray(mb.zoom(win)).save(os.path.join(HERE, f"preview_s{SN}.png"))
    tile = mb.composite(sky, far, LAND, 0, W)
    Image.fromarray(mb.zoom(tile)).save(os.path.join(HERE, f"preview_tile_s{SN}.png"))
    ncol = len(np.unique(sky.reshape(-1, 3), axis=0))
    nfar = len(np.unique(far[far[..., 3] > 0][:, :3], axis=0))
    print(f"stage {SN} {STAGE['name']}: sky colours={ncol} far colours={nfar} "
          f"far bottom row={LAND[0]} (landH) landN={LAND[1]}")
    return sky, far


if __name__ == "__main__":
    build()

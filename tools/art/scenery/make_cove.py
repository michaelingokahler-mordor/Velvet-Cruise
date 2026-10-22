#!/usr/bin/env python3
"""Velvet Cruise -- Palm Cove production assets ("Musterstrecke" for the stage look rules).

Everything here is drawn at the same pixel size and in the same light as the older roadside art
(sun ahead / right / high, neutral daylight, selective dark outline, alpha 0/255, bottom row =
ground contact).  What is new is how objects meet the ground: every building comes with its own
terrace -- dry-stone retaining wall, coping, steps, shrubs that spill over the foot -- so it never
reads as a rectangular plate pasted onto a slope, and every rock / wall / tuft has a ragged,
vegetation-covered foot.

  HOUSE + TERRACE MODULES   cove_villa_a  the original two-storey villa on a stepped terrace
                            cove_villa_b  the same villa mirrored, in ochre, with an olive tree
                            cove_cottage  whitewashed cottage, blue shutters, bougainvillea pergola
                            cove_cube     flat-roofed cube house with a railed roof terrace
                            cove_row      three narrow townhouses sharing one terrace wall
                            cove_chapel   small chapel with a bell tower
  VILLAGE MODULES (distance) cove_village_a / cove_village_b   a tiled cluster stepping up the hill
  ROCK / WALL MODULES       cove_rock_a..d  outcrops that carry grass caps and shrubs at their feet
                            cove_wall_a..c  low dry-stone walls
  GRASS GROUPS              cove_tuft_a, cove_tuft_b  (with broom / daisies)
  VEGETATION VARIANTS       palm_d (wind-bent) palm_e (young) palm_f (twin) palm_g (slim, tall)
                            palm_h (fan palm with a skirt of dead fronds)
                            bush_c (low flowering mound) bush_d (tall oleander) bush_e (agave)
                            bush_f (lavender scrub)

Pillow + numpy only; imports (never modifies) the helpers of make_scenery.py.  Writes PNGs into ./out/.
Run:  python3 -B make_cove.py            (all + preview_cove.png)
      python3 -B make_cove.py cove_cube  (only these)
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
from make_scenery import (Spr, ramp, hx, ball, selout, remove_orphans, bottom_fix, add_layer, foliage,  # noqa: E402
                          clampi, limit_palette, tile_roof, glass_window, side_face, make_palm,
                          STUCCO, TERRA, WOOD, GREYROCK, LEAF, BOUG, GREY, GRASS, GLASS, BLUE, TEAL, PINK,
                          YEL, SANDSTONE, PALM_G, TRUNK, OUTLINE, rock_mesh, render_mesh, remap)

OUT = ms.OUT

# ---------------------------------------------------------------- palettes
LIME = ramp("#4e4044", "#7a6a62", "#a99a84", "#cdbf9f", "#e6dbbd", "#f8f0d6")          # limestone terrace walls
OCHRE = ramp("#5a3a30", "#8a5c3c", "#b98448", "#d8a65c", "#ecc680", "#f8e2aa")         # ochre stucco
ROSE = ramp("#5e3444", "#94566a", "#c4808c", "#e2a4a8", "#f4c6c0", "#fde4da")          # rose stucco
SKYW = ramp("#3e4a6e", "#6478a0", "#8ea6c8", "#b4c8e0", "#d4e2f0", "#f0f6fc")          # pale blue wash
SAGE = ramp("#364a3e", "#5a7a5c", "#86a47c", "#aec49c", "#cddcb8", "#e8f0d4")          # sage stucco
OLIVE = ramp("#1c2a1c", "#2c4228", "#46603a", "#667e4a", "#8a9e5e", "#b0bc7c")         # olive foliage (grey-green)
LAV = ramp("#2a1e44", "#46347a", "#6a52a8", "#8c74c8", "#b09ae0", "#d6c8f4")           # lavender
AGAVE = ramp("#16302e", "#1f4a44", "#2e6a5c", "#468a72", "#6aaa86", "#98c8a4")         # agave leaves
BROOM = ramp("#6a4a10", "#b08a14", "#e0b820", "#f6d838", "#fff070")                    # broom blossom
DAISY = hx("#fffbe8")
EARTH = ramp("#3a2a28", "#5e4638", "#86684a", "#a98a62", "#c8aa7c")                    # dry earth / path
ROCK = ramp("#2c2226", "#463a3c", "#665a54", "#8a7a6a", "#b0a088", "#d4c6a4", "#ece0c0")  # warm limestone rock


def new(w, h):
    return Spr(w, h)


# ---------------------------------------------------------------- terrace foot
def terrace(w, wall_h, seed, stair=None, rag=2, strip=3):
    """Dry-stone retaining wall of width w and height wall_h, with `strip` rows of lit paving on top.
    Returns a Spr (w, strip + wall_h + rag).  `stair=(x0, treads)` puts a flight of steps against it.
    The bottom edge is ragged (blocks of different depth) so it can sit on a slope."""
    rng = random.Random(seed)
    H = strip + wall_h + rag
    s = new(w, H)
    foot = []
    v = rng.randint(0, rag)
    for x in range(w):
        if rng.random() < 0.16:
            v = clampi(v + rng.choice((-1, 1)), 0, rag)
        foot.append(H - 1 - (rag - v))
    for x in range(w):
        for k in range(strip):
            s.puti(x, k, LIME[5] if k == 0 else LIME[4] if k < strip - 1 else LIME[3])
    # wall courses in running bond: block tones vary only a little, joints are one soft step darker
    y = strip
    while y < H:
        ch = rng.choice((3, 4, 4, 5))
        x = -rng.randint(0, 6)
        while x < w:
            bw = rng.choice((7, 8, 10, 11, 13))
            tone = rng.choice((2, 3, 3, 3, 4))
            for yy in range(y, min(H, y + ch)):
                for xx in range(max(0, x), min(w, x + bw)):
                    if yy > foot[xx]:
                        continue
                    c = LIME[tone]
                    if yy == y:
                        c = LIME[min(5, tone + 1)]
                    elif yy == min(H, y + ch) - 1:
                        c = LIME[max(1, tone - 1)]
                    elif xx == x + bw - 1:
                        c = LIME[min(5, tone + 1)]
                    elif xx == max(0, x):
                        c = LIME[max(1, tone - 1)]
                    s.puti(xx, yy, c)
            x += bw
        y += ch
    # the foot of the wall lies in shade
    for x in range(w):
        for k in range(0, 3):
            yy = foot[x] - k
            if yy > strip and s.op(x, yy):
                c = tuple(int(q) for q in s.a[yy, x, 0:3])
                idx = min(range(len(LIME)), key=lambda i: sum((LIME[i][j] - c[j]) ** 2 for j in range(3)))
                s.puti(x, yy, LIME[max(1, idx - (2 if k == 0 else 1))])
    # a flight of steps leaning against the wall: treads rise to the right, a shaded stringer on the left
    if stair:
        x0, treads = stair
        tw, rise = 7, max(3, (wall_h + rag) // treads)
        for t in range(treads):
            xs = x0 + t * tw
            yt = foot[min(w - 1, xs)] - (t + 1) * rise
            for xx in range(xs, min(w, xs + tw + 1)):
                for yy in range(yt, foot[min(w - 1, xx)] + 1):
                    if yy < strip:
                        continue
                    c = LIME[5] if yy == yt else LIME[4] if yy == yt + 1 else LIME[2] if yy >= yt + rise - 1 else LIME[3]
                    s.puti(xx, yy, c)
        for yy in range(strip, H):
            if s.op(x0, yy) and yy > foot[x0] - rise:
                s.puti(x0, yy, LIME[1])
        # the top tread runs into the paving
        for xx in range(x0 + treads * tw, min(w, x0 + treads * tw + 4)):
            s.puti(xx, strip, LIME[5])
    return s


def skirt(s, seed, depth=6, col=None):
    """Give a sprite a ragged, grass-covered foot: `depth` extra rows below it in the slope's own greens
    (dark earth line, then grass clumps of different height), so the lowest row is never a straight edge."""
    rng = random.Random(seed)
    G = col or [hx("#35703c"), hx("#4a8a3e"), hx("#5f9c40"), hx("#8cbc48"), hx("#b4d058")]
    H0 = s.h
    out = new(s.w, H0 + depth)
    out.a[:H0] = s.a
    d = rng.randint(1, depth)
    for x in range(s.w):
        if not s.op(x, H0 - 1) and not s.op(x, H0 - 2):
            d = clampi(d + rng.choice((-1, 0, 1)), 0, 2)
            top = H0 - 1
        else:
            if rng.random() < 0.35:
                d = clampi(d + rng.choice((-2, -1, 1, 2)), 0, depth)
            top = H0 - 1
        for k in range(1, d + 1):
            y = top + k
            if y >= out.h:
                break
            if k == 1:
                c = G[0]
            elif k == d:
                c = G[3] if rng.random() < 0.5 else G[2]
            else:
                c = G[1] if rng.random() < 0.7 else G[2]
            out.puti(x, y, c)
    # a few blades poking up over the wall foot
    for x in range(1, s.w - 1):
        if rng.random() < 0.12 and s.op(x, H0 - 1):
            for k in range(rng.choice((2, 3))):
                out.puti(x, H0 - 1 - k, G[2 + (k > 0)])
    # trim rows that stayed empty so the bottom row touches the ground
    rows = np.nonzero((out.a[..., 3] > 0).any(axis=1))[0]
    out.a = out.a[:rows[-1] + 1].copy()
    out.h = out.a.shape[0]
    return out


def shrubs(s, spots, seed, rmp=None, big=1.0):
    """Shrubs overlapping a foot at the given (cx, cy, rx, ry) spots."""
    rmp = rmp or LEAF
    lay = new(s.w, s.h)
    foliage(lay, [(x, y, rx * big, ry * big) for (x, y, rx, ry) in spots], rmp, seed=seed, bias=-0.04, dabs=False)
    add_layer(s, lay)


def compose(w, h, building, bx, by, ter, tx, ty):
    """Canvas w x h with the terrace at (tx, ty) top-left and the building pasted bottom-centre at (bx, by)."""
    s = new(w, h)
    s.paste(ter, tx, ty)
    s.paste(building, bx, by)
    return s


def contact_shadow(s, y, x0, x1, tone=1):
    """A short run of shadow along the foot of a building on the paving (the sun is on the right)."""
    for x in range(x0, x1):
        c = s.get(x, y)
        if c is not None:
            idx = min(range(len(LIME)), key=lambda i: sum((LIME[i][j] - c[j]) ** 2 for j in range(3)))
            if abs(sum(c) - sum(LIME[idx])) < 40:
                s.puti(x, y, LIME[max(1, idx - 2)])


# ---------------------------------------------------------------- the original villa, re-seated
def villa_cut():
    """The existing two-storey villa (house.png) without its old plate: rows 0..71."""
    src = Image.open(os.path.join(OUT, "house.png")).convert("RGBA")
    a = np.array(src)[:72].copy()
    s = new(src.width, 72)
    s.a = a
    return s


def villa_a():
    b = villa_cut()
    W = 112
    ter = terrace(W, 15, 4, stair=(4, 3), rag=2, strip=3)
    s = compose(W, 72 + 17, b, 8, 0, ter, 0, 72 - 3)
    contact_shadow(s, 72 - 3 + 1, 9, 100)
    shrubs(s, [(103, 76, 7, 5), (14, 79, 5, 3.5), (62, 87, 6, 3.5), (97, 85, 5, 3.5)], 21)
    selout(s, [STUCCO, TERRA, LIME, WOOD, LEAF], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return skirt(s, 5, 6)


def villa_b():
    b = villa_cut()
    # mirrored, and the cream stucco goes ochre
    b.a = b.a[:, ::-1].copy()
    remap(b, {STUCCO[i]: OCHRE[i] for i in range(6)})
    W = 112
    ter = terrace(W, 16, 9, stair=(86, 3), rag=3, strip=3)
    s = compose(W, 72 + 19, b, 8, 0, ter, 0, 72 - 3)
    contact_shadow(s, 72 - 3 + 1, 9, 100)
    # an olive tree growing out of the corner of the terrace, and a stone pot
    lay = new(s.w, s.h)
    foliage(lay, [(9, 74, 8, 6), (14, 68, 7, 5.5), (5, 70, 5.5, 4.5)], OLIVE, seed=31, bias=0.0, dabs=False)
    add_layer(s, lay)
    for yy in range(78, 86):
        s.puti(9, yy, OUTLINE)
    shrubs(s, [(52, 88, 6, 3.5), (30, 86, 5, 3.5), (74, 85, 5, 3.5)], 33)
    selout(s, [OCHRE, TERRA, LIME, WOOD, LEAF, OLIVE], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return skirt(s, 9, 6)



# ---------------------------------------------------------------- building blocks
def front(s, x0, x1, y0, y1, wall):
    s.rect(x0, y0, x1, y1, wall[4])
    s.vline(x0, y0, y1, wall[3])
    s.hline(x0, x1, y0, wall[2])
    s.hline(x0, x1, y0 + 1, wall[3])                      # eave shadow


def side(s, x0, x1, y0, y1, wall, sl=0.5):
    side_face(s, x0, x1, y0, y1, sl, lambda x, y, u, v: wall[3] if v < 0.06 else wall[5])


def hip(s, x0, x1, ye, rise, hang=5, sw=7):
    """Terracotta hip roof over a block whose front spans x0..x1 (right side face sw px wide)."""
    tile_roof(s, [(x0 - hang, ye), (x1 + sw - 1, ye), (x1 - 8, ye - rise), (x0 + 9, ye - rise)],
              [(x1 + sw - 1, ye), (x1 + sw + 6, ye - 4), (x1, ye - rise - 3), (x1 - 8, ye - rise)], ye)
    s.hline(x0 + 9, x1 - 8, ye - rise - 1, TERRA[4])
    s.hline(x0 + 11, x1 - 6, ye - rise - 2, TERRA[5])


def shutters(s, wx0, wx1, y0, y1, col):
    for sx in (wx0 - 3, wx1 + 2):
        s.rect(sx, y0, sx + 1, y1, col[3])
        s.vline(sx, y0, y1, col[2])
        for yy in range(y0 + 1, y1, 3):
            s.hline(sx, sx + 1, yy, col[2])


def flowerbox(s, x0, x1, y, col=None):
    s.hline(x0, x1, y, WOOD[2])
    s.hline(x0, x1, y + 1, WOOD[1])
    for x in range(x0, x1 + 1, 2):
        s.puti(x, y - 1, BOUG[3] if (x // 2) % 2 else BOUG[4])
        s.puti(x + 1, y - 1, LEAF[3])


def pot(s, cx, by, bloom=True):
    s.rect(cx - 2, by - 3, cx + 2, by, TERRA[3])
    s.hline(cx - 2, cx + 2, by - 3, TERRA[4])
    s.hline(cx - 2, cx + 2, by, TERRA[1])
    if bloom:
        for dx, dy, c in ((-2, -5, LEAF[4]), (-1, -6, BOUG[4]), (0, -5, LEAF[3]), (1, -6, BOUG[3]), (2, -5, LEAF[4]), (0, -7, BOUG[4])):
            s.puti(cx + dx, by + dy, c)


def arched_door(s, x0, x1, ytop, ybot, wood=WOOD):
    r = (x1 - x0 + 1) / 2.0
    for y in range(ytop, ybot + 1):
        for x in range(x0, x1 + 1):
            cy = ytop + r
            if y < cy and (x + 0.5 - (x0 + r)) ** 2 + (y + 0.5 - cy) ** 2 > r * r:
                continue
            c = wood[2] if (x - x0) % 3 == 0 else wood[3]
            if x == x1:
                c = wood[4]
            s.puti(x, y, c)
    s.puti(x1 - 1, (ytop + ybot) // 2 + 2, YEL[4])


def awning(s, x0, x1, y, depth=4, cols=(hx("#e8643a"), hx("#fff4e4"))):
    for x in range(x0, x1 + 1):
        c = cols[((x - x0) // 3) % 2]
        for k in range(depth):
            s.puti(x, y + k, c if k < depth - 1 else (hx("#b84a2a") if c == cols[0] else hx("#d8ccb8")))
    for x in range(x0, x1 + 1, 3):
        s.puti(x + 1, y + depth, hx("#b84a2a"))


def bloom_vine(s, rects, seed):
    """Bougainvillea / vine clumps over given (cx, cy, rx, ry) areas."""
    lay = new(s.w, s.h)
    foliage(lay, rects, LEAF, seed=seed, bias=-0.05, dabs=False, outline=False)
    rng = random.Random(seed + 70)
    op = lay.opaque()
    for k in range(len(rects) * 26):
        x = rng.randint(0, s.w - 1); y = rng.randint(0, s.h - 1)
        if op[y, x]:
            for dx, dy in ((0, 0), (1, 0), (0, 1)):
                if lay.op(x + dx, y + dy):
                    lay.puti(x + dx, y + dy, BOUG[4 if (dx or y < rects[0][1]) else 3])
    selout(lay, [LEAF, BOUG], dirs=((0, 1), (-1, 0)))
    add_layer(s, lay, [STUCCO, TERRA])


def end_taper(ter, n=7):
    """Step the two ends of a terrace down so it does not end in a straight vertical cut."""
    for k in range(n):
        cut = (n - k + 1) // 2
        for xx in (k, ter.w - 1 - k):
            for yy in range(0, cut):
                ter.clear(xx, yy)
    return ter


# ---------------------------------------------------------------- house modules
def cottage():
    W = 112
    b = new(W, 66)
    x0, x1, ye, yb = 20, 64, 30, 64
    front(b, x0, x1, ye, yb, STUCCO)
    side(b, x1 + 1, x1 + 7, ye, yb, STUCCO)
    hip(b, x0, x1, ye, 15, hang=5, sw=7)
    b.rect(48, 6, 53, 22, STUCCO[4]); b.vline(48, 6, 22, STUCCO[3]); b.vline(53, 6, 22, STUCCO[5])
    b.rect(47, 4, 54, 5, TERRA[3]); b.hline(47, 54, 4, TERRA[4])
    for wx in (26, 52):
        glass_window(b, wx, 40, wx + 7, 52, STUCCO, mullion=[wx + 3], sill=STUCCO)
        shutters(b, wx, wx + 7, 40, 52, BLUE)
        flowerbox(b, wx - 1, wx + 8, 54)
    arched_door(b, 38, 46, 42, yb)
    b.rect(36, yb, 48, yb, STUCCO[2])
    pot(b, 34, yb)
    pot(b, 51, yb)
    # pergola on the right: posts, beams, a roof of vine and blossom
    for px in (72, 96):
        b.rect(px, 38, px + 1, yb, WOOD[3]); b.vline(px, 38, yb, WOOD[2])
    for yy in (37, 38):
        b.hline(70, 100, yy, WOOD[4] if yy == 37 else WOOD[2])
    for rx in range(72, 100, 4):
        b.hline(rx, rx + 1, 36, WOOD[3])
    bloom_vine(b, [(76, 35, 7, 4), (86, 34, 8, 4.5), (95, 35, 6, 4), (70, 44, 3, 5)], 61)
    for yy in range(yb - 5, yb + 1):                       # a bench under the pergola
        b.hline(78, 90, yb - 4, WOOD[4]); b.hline(78, 90, yb - 3, WOOD[2])
        b.vline(79, yb - 3, yb, WOOD[1]); b.vline(89, yb - 3, yb, WOOD[1])
    ter = end_taper(terrace(W, 14, 12, stair=(3, 3), rag=2, strip=3), 6)
    s = compose(W, 66 + 15, b, 0, 0, ter, 0, 64 - 2)
    contact_shadow(s, 64 - 2 + 1, 20, 70)
    shrubs(s, [(100, 70, 6, 4.5), (10, 71, 5, 4), (60, 79, 6, 3.5)], 62)
    selout(s, [STUCCO, TERRA, LIME, WOOD, LEAF, BLUE], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return skirt(s, 12, 6)


def cube():
    W = 112
    b = new(W, 70)
    # lower block and a smaller upper block, both flat-roofed with a lit parapet
    def flat(x0, x1, ytop, ybot, wall, sw=6):
        b.rect(x0, ytop, x1, ybot, wall[4])
        b.vline(x0, ytop, ybot, wall[3])
        side(b, x1 + 1, x1 + sw, ytop, ybot, wall)
        # roof sliver (we see a little of the top) and the parapet
        for k in range(3):
            b.hline(x0 - 1 + k, x1 + sw + 1 - k, ytop - 5 + k, GREY[2 + (k > 0)])
        b.hline(x0 - 1, x1 + sw, ytop - 2, LIME[5]); b.hline(x0 - 1, x1 + sw, ytop - 1, LIME[4]); b.hline(x0 - 1, x1 + sw, ytop, LIME[2])
    flat(14, 78, 40, 66, STUCCO)
    flat(32, 80, 18, 40, SAGE)
    # the roof terrace of the lower block: railing along the front of the upper block's left
    for rx in range(16, 31, 3):
        b.vline(rx, 31, 38, GREY[3])
    b.hline(15, 31, 31, GREY[5]); b.hline(15, 31, 32, GREY[2])
    # windows
    glass_window(b, 38, 24, 52, 34, SAGE, sill=SAGE)
    glass_window(b, 60, 24, 74, 34, SAGE, sill=SAGE)
    glass_window(b, 20, 47, 40, 60, STUCCO, mullion=[30], sill=STUCCO)
    awning(b, 18, 42, 44, depth=4)
    glass_window(b, 52, 48, 60, 58, STUCCO, sill=STUCCO)
    arched_door(b, 66, 73, 51, 66, WOOD)
    # accent panel + round window
    b.rect(44, 61, 63, 65, OCHRE[3]); b.hline(44, 63, 61, OCHRE[4]); b.hline(44, 63, 65, OCHRE[2])
    # a tall cypress beside it
    lay = new(W, 70)
    foliage(lay, [(100, 52, 5, 8), (100, 42, 4.5, 8), (100, 32, 4, 7), (100, 24, 3, 6)], LEAF, seed=71, bias=-0.15, dabs=False)
    add_layer(b, lay)
    ter = end_taper(terrace(W, 16, 14, stair=(90, 3), rag=3, strip=3), 6)
    s = compose(W, 66 + 17, b, 0, 0, ter, 0, 66 - 2)
    contact_shadow(s, 66 - 2 + 1, 14, 84)
    shrubs(s, [(8, 71, 6, 4.5), (46, 82, 6, 3.5), (84, 70, 5, 4)], 72)
    selout(s, [STUCCO, SAGE, LIME, GREY, WOOD, LEAF], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return skirt(s, 14, 6)


def row():
    W = 116
    b = new(W, 76)
    specs = [(10, 33, 56, ROSE, 14), (34, 59, 44, OCHRE, 17), (60, 83, 52, SKYW, 14)]
    for k, (x0, x1, top, wall, rh) in enumerate(specs):
        yb = 72
        front(b, x0, x1, top, yb, wall)
        b.vline(x1, top + 2, yb, wall[3])
        if k == 2:
            side(b, x1 + 1, x1 + 6, top, yb, wall)
        # a lean roof: front slope only, with a lit eave
        tile_roof(b, [(x0 - 2, top), (x1 + (7 if k == 2 else 2), top), (x1 - 3, top - rh), (x0 + 3, top - rh)],
                  [(x1 + 7, top), (x1 + 11, top - 3), (x1 - 2, top - rh - 2), (x1 - 3, top - rh)] if k == 2 else None, top)
        cx = (x0 + x1) // 2
        for fy in range(top + 7, yb - 14, 14):
            glass_window(b, cx - 8, fy, cx - 3, fy + 7, wall, sill=wall)
            glass_window(b, cx + 3, fy, cx + 8, fy + 7, wall, sill=wall)
            shutters(b, cx - 8, cx - 3, fy, fy + 7, [TEAL, BLUE, SAGE][k])
            shutters(b, cx + 3, cx + 8, fy, fy + 7, [TEAL, BLUE, SAGE][k])
        arched_door(b, cx - 3, cx + 3, yb - 11, yb)
        b.hline(cx - 5, cx + 5, yb, wall[2])
    # chimney and an antenna-free roofline: a small dormer on the middle house
    b.rect(46, 22, 50, 34, STUCCO[4]); b.vline(50, 22, 34, STUCCO[5]); b.rect(45, 20, 51, 21, TERRA[3])
    bloom_vine(b, [(90, 64, 4, 4), (92, 56, 3, 4)], 81)
    ter = end_taper(terrace(W, 15, 16, stair=(94, 3), rag=3, strip=3), 6)
    s = compose(W, 72 + 16, b, 0, 0, ter, 0, 72 - 2)
    contact_shadow(s, 72 - 2 + 1, 10, 84)
    shrubs(s, [(6, 76, 6, 4.5), (36, 86, 6, 3.5), (74, 86, 5, 3.5), (108, 74, 5, 4)], 82)
    selout(s, [ROSE, OCHRE, SKYW, TERRA, LIME, WOOD, LEAF, TEAL, BLUE, SAGE], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return skirt(s, 16, 6)


def chapel():
    W = 104
    b = new(W, 80)
    # nave
    x0, x1, ye, yb = 36, 78, 46, 76
    front(b, x0, x1, ye, yb, STUCCO)
    side(b, x1 + 1, x1 + 7, ye, yb, STUCCO)
    hip(b, x0, x1, ye, 15, hang=5, sw=7)
    # bell tower on the left, taller, with an arched opening and a bell, capped by a small pyramid
    t0, t1 = 16, 34
    b.rect(t0, 20, t1, yb, STUCCO[4]); b.vline(t0, 20, yb, STUCCO[3]); b.vline(t1, 20, yb, STUCCO[5]); b.vline(t1 - 1, 20, yb, STUCCO[4])
    b.hline(t0, t1, 20, STUCCO[2]); b.hline(t0, t1, 21, STUCCO[3])
    for y in range(26, 40):
        for x in range(21, 30):
            r = 4.5; cy = 26 + r
            if y < cy and (x + 0.5 - 25.5) ** 2 + (y + 0.5 - cy) ** 2 > r * r:
                continue
            b.puti(x, y, GLASS[0] if (y < 30 or x == 21) else GLASS[1])
    b.rect(24, 31, 27, 36, YEL[3]); b.hline(24, 27, 31, YEL[5]); b.hline(23, 28, 30, GREY[2])
    tile_roof(b, [(t0 - 3, 20), (t1 + 3, 20), (t1 - 5, 7), (t0 + 5, 7)], None, 20)
    b.hline(t0 + 5, t1 - 5, 6, TERRA[4]); b.hline(t0 + 7, t1 - 7, 5, TERRA[5]); b.rect(25, 1, 26, 5, GREY[2]); b.hline(23, 28, 3, GREY[2])
    # nave facade: round window, double door under an arch, a stone step
    for y in range(54, 63):
        for x in range(51, 62):
            if (x - 56) ** 2 + (y - 58) ** 2 <= 20:
                b.puti(x, y, GLASS[1] if (x + y) % 5 else GLASS[3])
    arched_door(b, 50, 62, 62, yb)
    b.vline(56, 63, yb, WOOD[1])
    b.rect(48, yb, 64, yb, STUCCO[2])
    ter = end_taper(terrace(W, 15, 18, stair=(76, 3), rag=3, strip=3), 6)
    s = compose(W, 76 + 16, b, 0, 0, ter, 0, 76 - 2)
    contact_shadow(s, 76 - 2 + 1, 16, 86)
    # two cypresses by the tower
    lay = new(W, s.h)
    foliage(lay, [(8, 66, 5, 9), (8, 56, 4.5, 8), (8, 46, 4, 7), (8, 38, 3, 6)], LEAF, seed=91, bias=-0.15, dabs=False)
    add_layer(s, lay)
    shrubs(s, [(90, 80, 6, 4.5), (40, 88, 6, 3.5), (68, 88, 5, 3.5)], 92)
    selout(s, [STUCCO, TERRA, LIME, WOOD, LEAF, GREY, YEL], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return skirt(s, 18, 6)




# ---------------------------------------------------------------- rocks, walls, grass groups
SLOPE_G = [hx("#35703c"), hx("#4a8a3e"), hx("#5f9c40"), hx("#8cbc48"), hx("#b4d058")]


def grass_cap(s, seed, thick=(2, 3), reach=0.7):
    """Lay a ragged turf lip on every upward-facing top of the rock: 2-3 rows following the silhouette,
    lit on the right, with a few blades standing up."""
    rng = random.Random(seed)
    op = s.opaque().copy()
    H, W = op.shape
    cap = np.zeros_like(op)
    for x in range(W):
        col = np.nonzero(op[:, x])[0]
        if not len(col):
            continue
        y0 = col[0]
        # skip steep faces: compare with the neighbours' tops
        l = np.nonzero(op[:, max(0, x - 1)])[0]
        r = np.nonzero(op[:, min(W - 1, x + 1)])[0]
        sl = max(abs(int(l[0]) - y0) if len(l) else 9, abs(int(r[0]) - y0) if len(r) else 9)
        if sl > 3 or rng.random() > reach + 0.25:
            continue
        t = rng.randint(*thick)
        for k in range(t):
            cap[y0 + k, x] = True
    for y, x in zip(*np.nonzero(cap)):
        up = y == 0 or not op[y - 1, x] or not cap[y - 1, x]
        c = SLOPE_G[3] if (up and x % 3) else SLOPE_G[2] if up else SLOPE_G[1]
        if x > W * 0.55 and up:
            c = SLOPE_G[4]
        s.puti(x, y, c)
    for x in range(1, W - 1):
        col = np.nonzero(cap[:, x])[0]
        if len(col) and rng.random() < 0.22:
            for k in range(rng.choice((2, 3))):
                if col[0] - 1 - k >= 0:
                    s.puti(x, col[0] - 1 - k, SLOPE_G[2 + (k > 0)])


def rock_sprite(w, h, specs, seed, strata_k=9, caps=True, shrub=None):
    s = new(w, h)
    for (rx, ry, rz, ox, oy, sd, noise) in specs:
        rng = random.Random(sd)
        verts, tris = rock_mesh(rng, rx, ry, rz, nlat=3, nlon=8, noise=noise)

        def strata(x, y, k=strata_k):
            v = (y * 1.0 + x * 0.16) % k
            return -1 if v < 1.0 else 0
        render_mesh(s, verts, tris, ox, oy, ROCK, pitch=0.36, strata=strata, seed=sd, face_jitter=0.05)
    remove_orphans(s)
    if caps:
        grass_cap(s, seed)
    if shrub:
        shrubs(s, shrub, seed + 3)
    selout(s, [ROCK, LEAF, SLOPE_G], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return skirt(s, seed, 5)


def rock_a():      # wide low shelf with two shoulders
    return rock_sprite(92, 44, [(16, 9, 14, 66, 40, 3, 0.24), (36, 12, 24, 34, 41, 5, 0.22)], 11,
                       shrub=[(8, 36, 6, 4.5), (86, 38, 5, 4)])


def rock_b():      # tall crag
    return rock_sprite(60, 70, [(14, 8, 20, 44, 66, 8, 0.24), (22, 12, 54, 28, 67, 14, 0.2)], 12,
                       strata_k=8, shrub=[(8, 64, 6, 4.5), (52, 62, 5, 4)])


def rock_c():      # a group of boulders
    return rock_sprite(80, 36, [(12, 7, 11, 66, 34, 17, 0.26), (14, 8, 15, 44, 34, 19, 0.25), (17, 10, 22, 22, 35, 23, 0.24)], 13,
                       shrub=[(36, 30, 5, 3.5), (74, 31, 4, 3.5)])


def rock_d():      # a cliff face with an overhanging shelf
    return rock_sprite(100, 54, [(40, 11, 30, 52, 50, 29, 0.2), (18, 9, 40, 80, 51, 31, 0.22), (12, 8, 24, 14, 51, 37, 0.24)], 14,
                       strata_k=7, shrub=[(6, 46, 5, 4), (92, 47, 6, 4.5), (50, 50, 5, 3)])


def drystone(w, hgt, seed):
    ter = terrace(w, hgt, seed, rag=2, strip=2)
    # turf on the coping (instead of paving): a ragged green lip
    rng = random.Random(seed + 1)
    for x in range(w):
        t = rng.choice((2, 2, 3))
        for k in range(t):
            ter.puti(x, k, SLOPE_G[3 if k == 0 and x % 2 else 2] if k < 2 else SLOPE_G[1])
        if rng.random() < 0.2:
            for k in range(rng.choice((2, 3))):
                ter.puti(x, -k if False else 0, SLOPE_G[3])
    # extend upward for tufts that stand on top
    s = new(w, ter.h + 4)
    s.paste(ter, 0, 4)
    for x in range(1, w - 1):
        if rng.random() < 0.16:
            for k in range(rng.choice((2, 3, 4))):
                s.puti(x, 3 - k + 1, SLOPE_G[2 + (k > 0)])
    end_taper(s, 4)
    selout(s, [LIME, SLOPE_G], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    return skirt(s, seed, 4)


def wall_a():
    return drystone(72, 10, 41)


def wall_b():
    return drystone(104, 12, 43)


def wall_c():
    return drystone(52, 9, 47)


def tuft(w, h, seed, flowers, clumps):
    s = new(w, h)
    rng = random.Random(seed)
    blades = []
    for (cx, spread, hgt, n) in clumps:
        for i in range(n):
            u = (i / max(1, n - 1)) * 2 - 1 + rng.uniform(-0.08, 0.08)
            bx = cx + u * spread * 0.4
            lean = u * 9.0 + rng.uniform(-1.0, 1.0)
            ht = (hgt - abs(u) * 5.0) * rng.uniform(0.8, 1.0)
            blades.append((bx, lean, ht, rng.random(), u))
    blades.sort(key=lambda b: b[3])
    tops = []
    for (bx, lean, ht, dep, u) in blades:
        base_b = 1 + int(dep * 2.99)
        prev = None
        for j in range(41):
            t = j / 40
            x = bx + lean * t ** 1.7
            y = h - 1 - ht * math.sin(t * math.pi * 0.5)
            p = (int(round(x)), int(round(y)))
            if p == prev:
                continue
            prev = p
            b = base_b + (1 if t > 0.55 else 0) + (1 if t > 0.85 else 0)
            s.puti(p[0], p[1], GRASS[clampi(b - 1, 1, 6)])
            if t < 0.7:
                s.puti(p[0] + 1, p[1], GRASS[clampi(b + 1, 1, 6)])
        tops.append(prev)
    for k, p in enumerate(tops):
        if p and rng.random() < 0.34 and flowers:
            fl = flowers[k % len(flowers)]
            s.puti(p[0], p[1] - 1, fl[0]); s.puti(p[0] + 1, p[1] - 1, fl[1]); s.puti(p[0], p[1] - 2, fl[1])
    remove_orphans(s)
    bottom_fix(s)
    return s


def tuft_a():
    return tuft(52, 24, 5, [(BROOM[3], BROOM[4]), (DAISY, hx("#f8e070"))], [(15, 18, 20, 8), (36, 22, 16, 9)])


def tuft_b():
    return tuft(44, 20, 9, [(LAV[3], LAV[4]), (DAISY, hx("#fff0a0"))], [(12, 14, 15, 7), (30, 18, 17, 8)])


# ---------------------------------------------------------------- palm and bush silhouettes
def palm_d():      # wind-bent: the whole crown streams to the right
    back = [(18, 30, 95, 6.0, 2.0, 2, 0.18), (58, 24, 85, 5.5, 1.5, 1, 0.12), (-18, 26, 75, 6.0, 2.0, 2, 0.15),
            (100, 18, 60, 5.0, 1.5, 1, 0.1)]
    front = [(4, 42, 110, 7.0, 2.0, 4, 0.22), (40, 36, 100, 7.0, 2.0, 4, 0.2), (-38, 28, 85, 6.5, 2.0, 2, 0.18),
             (156, 20, 90, 6.0, 2.0, 2, 0.14), (118, 18, 70, 5.5, 2.0, 2, 0.12)]
    return make_palm(96, 124, 66, 30, 7.5, 4.4, 4, back, front, curve_p=2.6, seed=21)


def palm_e():      # young palm: short, upright, fresh fronds
    back = [(90, 18, 35, 4.0, 1.5, 1, 0.1), (64, 18, 60, 4.5, 1.5, 2, 0.12), (116, 18, 60, 4.5, 1.5, 1, 0.12)]
    front = [(40, 22, 85, 5.5, 2.0, 4, 0.2), (140, 22, 85, 5.5, 2.0, 2, 0.2), (10, 19, 70, 5.0, 2.0, 4, 0.15),
             (170, 19, 70, 5.0, 2.0, 2, 0.15), (92, 15, 15, 4.0, 1.5, 4, 0.1)]
    return make_palm(52, 80, 27, 20, 6.0, 3.6, 3, back, front, curve_p=1.1, seed=22)


def palm_g():      # slim and tall with a small, tight crown
    back = [(96, 16, 30, 3.5, 1.2, 1, 0.1), (60, 18, 70, 4.0, 1.2, 2, 0.12), (130, 18, 70, 4.0, 1.2, 1, 0.12)]
    front = [(24, 24, 100, 5.0, 1.8, 4, 0.2), (156, 24, 100, 5.0, 1.8, 2, 0.2), (-10, 18, 75, 4.5, 1.8, 4, 0.15),
             (192, 18, 75, 4.5, 1.8, 2, 0.15), (92, 13, 10, 3.5, 1.2, 4, 0.1)]
    return make_palm(46, 150, 26, 22, 5.2, 3.2, 5, back, front, curve_p=1.5, seed=23)


def palm_h():      # fan palm: thick straight trunk, round crown and a skirt of dead fronds
    back = [(200, 20, 18, 3.8, 1.0, 1, 0.0, True), (222, 22, 14, 3.8, 1.0, 1, 0.0, True), (-20, 20, 18, 3.8, 1.0, 1, 0.0, True),
            (242, 21, 12, 3.8, 1.0, 1, 0.0, True), (-42, 21, 12, 3.8, 1.0, 1, 0.0, True),
            (100, 22, 50, 5.0, 1.5, 1, 0.1), (60, 24, 80, 5.5, 1.5, 2, 0.14), (140, 24, 80, 5.5, 1.5, 1, 0.14)]
    front = [(20, 28, 100, 6.5, 2.0, 4, 0.2), (160, 28, 100, 6.5, 2.0, 2, 0.2), (-14, 24, 70, 6.0, 2.0, 4, 0.16),
             (194, 24, 70, 6.0, 2.0, 2, 0.16), (90, 16, 12, 4.5, 1.5, 4, 0.1)]
    return make_palm(66, 124, 33, 30, 9.5, 8.5, 5, back, front, curve_p=1.0, seed=24)


def palm_f():      # twin palms leaning apart from one base
    a = palm_c_like()
    b = palm_b_like()
    s = new(84, 126)
    s.paste(b, 0, 126 - b.h)
    s.paste(a, 30, 126 - a.h)
    remove_orphans(s)
    bottom_fix(s)
    return s


def palm_c_like():
    back = [(92, 20, 40, 4.5, 1.5, 1, 0.12), (56, 22, 75, 5.0, 1.5, 2, 0.15), (126, 22, 75, 5.0, 1.5, 1, 0.15)]
    front = [(18, 26, 100, 6.0, 2.0, 4, 0.2), (162, 26, 100, 6.0, 2.0, 2, 0.2), (-25, 21, 60, 6.0, 2.0, 4, 0.15),
             (205, 21, 60, 6.0, 2.0, 2, 0.15), (268, 12, 10, 5.0, 2.0, 2, 0.1)]
    return make_palm(54, 100, 36, 22, 6.5, 4.2, 4, back, front, curve_p=1.6, seed=25)


def palm_b_like():
    back = [(84, 20, 55, 4.5, 1.5, 1, 0.12), (118, 22, 80, 5.0, 1.5, 1, 0.15), (48, 24, 90, 5.5, 2.0, 2, 0.18)]
    front = [(14, 32, 105, 6.5, 2.0, 4, 0.22), (180, 22, 95, 6.0, 2.0, 2, 0.2), (-22, 24, 70, 6.0, 2.0, 4, 0.18),
             (214, 19, 55, 5.5, 2.0, 2, 0.15), (268, 14, 20, 5.0, 2.0, 2, 0.1)]
    return make_palm(52, 126, 12, 20, 7.0, 4.4, 4, back, front, curve_p=1.3, seed=26)


def bush_c():      # low flowering mound: broom
    s = new(64, 24)
    foliage(s, [(14, 16, 12, 7.5), (32, 13, 13, 9), (50, 16, 12, 7.5), (24, 19, 12, 6), (42, 19, 13, 6)], LEAF, seed=51, bias=-0.04)
    rng = random.Random(52)
    op = s.opaque()
    for k in range(60):
        x = rng.randint(4, 59); y = rng.randint(3, 16)
        if op[y, x] and y < 16:
            tone = 3 if (x % 2 or y < 8) else 2
            s.puti(x, y, BROOM[tone + (1 if y < 9 else 0)])
            if rng.random() < 0.5 and op[y, x + 1]:
                s.puti(x + 1, y, BROOM[2])
    selout(s, [LEAF, BROOM], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return skirt(s, 51, 3)


def bush_d():      # tall oleander with pink blossom
    s = new(40, 48)
    foliage(s, [(20, 30, 13, 16), (13, 38, 9, 9), (28, 36, 10, 10), (20, 18, 10, 13)], LEAF, seed=53, bias=-0.06)
    rng = random.Random(54)
    op = s.opaque()
    for k in range(70):
        x = rng.randint(6, 34); y = rng.randint(4, 40)
        if op[y, x]:
            tone = 4 if (x + y) % 3 else 3
            for dx, dy in ((0, 0), (1, 0), (0, 1)) if rng.random() < 0.6 else ((0, 0),):
                if s.op(x + dx, y + dy):
                    s.puti(x + dx, y + dy, PINK[tone + (1 if y < 20 and dx == 0 else 0) if tone < 5 else 5])
    selout(s, [LEAF, PINK], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return skirt(s, 53, 3)


def bush_e():      # agave rosettes: long, stiff, pointed leaves fanning out of three centres
    s = new(60, 36)
    rng = random.Random(55)
    for (cx, cy, n, ln) in ((16, 31, 21, 19), (44, 29, 23, 21), (30, 34, 17, 14)):
        spokes = []
        for i in range(n):
            a = math.pi * (0.04 + 0.92 * i / (n - 1)) + rng.uniform(-0.04, 0.04)
            spokes.append((a, ln * rng.uniform(0.75, 1.0)))
        spokes.sort(key=lambda p: -abs(p[0] - math.pi / 2))
        for a, L in spokes:
            steps = int(L * 3)
            for k in range(steps):
                t = k / steps
                x = cx + math.cos(a) * L * t
                y = cy - math.sin(a) * L * t * 0.9 + (t ** 2.2) * 3.0
                wd = 1.5 * math.sin(math.pi * min(1, t * 1.1)) ** 0.8 + 0.3
                lit = math.cos(a) > -0.15
                for dx in range(-int(wd), int(wd) + 1):
                    b = 3 + (1 if lit and dx >= 0 else 0) + (1 if t > 0.45 and lit else 0)
                    if not lit and dx <= 0:
                        b -= 1
                    if abs(dx) == int(wd) and wd > 1.5:
                        b -= 1
                    if t > 0.93:
                        b = 1
                    s.puti(int(round(x)) + dx, int(round(y)), AGAVE[clampi(b, 1, 5)])
    selout(s, [AGAVE], dirs=((0, 1), (-1, 0), (1, 0)))
    remove_orphans(s)
    bottom_fix(s)
    return skirt(s, 55, 3)


def bush_f():      # lavender scrub
    s = new(56, 22)
    foliage(s, [(10, 14, 9, 6), (24, 12, 11, 7), (40, 13, 10, 6.5), (50, 15, 6, 5), (30, 16, 12, 5)], OLIVE, seed=56, bias=0.0, dabs=False)
    selout(s, [OLIVE], dirs=((0, 1), (-1, 0)))
    rng = random.Random(57)
    op = s.opaque()
    for x in range(4, 52, 2):
        if rng.random() < 0.75:
            ytop = 14
            while ytop > 1 and op[ytop, x]:
                ytop -= 1
            h = rng.randint(3, 6)
            for k in range(h):
                if ytop - k >= 0:
                    s.puti(x, ytop - k, LAV[3 + (k > h // 2) + (x % 3 == 0 and k > 0)])
    remove_orphans(s)
    bottom_fix(s)
    return skirt(s, 56, 3)


# ---------------------------------------------------------------- village modules (middle distance)
WALLS = [STUCCO, OCHRE, ROSE, SKYW]


def tiny_house(s, x0, yb, w, h, wall, roof_h=4, door=True, wins=2, tower=False):
    """A distant house: front, a lit side sliver, a terracotta roof and a couple of dark windows."""
    front(s, x0, x0 + w - 1, yb - h + 1, yb, wall)
    s.vline(x0 + w - 1, yb - h + 2, yb, wall[5])
    for k in range(roof_h):
        for x in range(x0 - 1 + k // 2, x0 + w + 1 - k // 2):
            s.puti(x, yb - h - k, TERRA[3 if k < roof_h - 1 else 4] if (x + k) % 3 else TERRA[2])
    s.hline(x0 - 1, x0 + w, yb - h + 1, TERRA[1])
    if wins:
        gap = max(3, w // (wins + 1))
        for i in range(wins):
            wx = x0 + gap * (i + 1) - 1
            if wx + 1 < x0 + w - 1:
                s.rect(wx, yb - h + 4, wx + 1, yb - h + 6, GLASS[1])
    if door:
        s.rect(x0 + w // 2 - 1, yb - 3, x0 + w // 2, yb, WOOD[2])


def village(seed, wide):
    rng = random.Random(seed)
    W, H = wide, 70
    s = new(W, H)
    rows = [(66, 0), (51, 1), (36, 2)]              # base y of each terrace row, front to back
    cx = W // 2
    s.rect(cx - 3, 6, cx + 3, 40, STUCCO[4]); s.vline(cx + 3, 6, 40, STUCCO[5]); s.vline(cx - 3, 6, 40, STUCCO[3])
    s.rect(cx - 1, 10, cx + 1, 15, GLASS[0])
    for k in range(6):
        s.hline(cx - 4 + k // 2, cx + 4 - k // 2, 5 - k, TERRA[3 if k < 5 else 4])
    for ri, (yb, _) in reversed(list(enumerate(rows))):
        x = rng.randint(2, 8)
        while x < W - 14:
            w = rng.choice((12, 14, 16, 18)) - ri
            h = rng.choice((9, 11, 12)) - (ri > 1)
            wall = WALLS[rng.randrange(4)]
            tiny_house(s, x, yb, w, h, wall, roof_h=4, wins=2 if w > 12 else 1)
            x += w + rng.choice((1, 2, 3))
        # the terrace wall the row stands on
        s.hline(0, W - 1, yb + 1, LIME[5]); s.rect(0, yb + 2, W - 1, yb + 3, LIME[3]); s.hline(0, W - 1, yb + 4, LIME[1]) if ri == 0 else None
    # bell tower in the middle
    cx = W // 2
    pass
    # cypress and olive blobs between the houses
    lay = new(W, H)
    for _ in range(max(3, W // 28)):
        x = rng.randint(6, W - 8); y = rng.choice((66, 51))
        foliage(lay, [(x, y - 7, 2.6, 7), (x, y - 14, 2.2, 5)], LEAF, seed=rng.randint(1, 99), bias=-0.15, dabs=False, outline=False)
    for _ in range(max(4, W // 20)):
        x = rng.randint(4, W - 6); y = rng.choice((67, 52, 37))
        foliage(lay, [(x, y - 2, 4.5, 3.2)], OLIVE, seed=rng.randint(1, 99), dabs=False, outline=False)
    add_layer(s, lay)
    selout(s, [STUCCO, OCHRE, ROSE, SKYW, TERRA, LIME, LEAF, OLIVE, WOOD, GLASS], dirs=((0, 1), (-1, 0)))
    remove_orphans(s)
    s = skirt(s, seed, 5)
    limit_palette(s, 30)
    return s


def village_a():
    return village(3, 150)


def village_b():
    return village(8, 118)


SPRITES = {
    "cove_villa_a": villa_a, "cove_villa_b": villa_b, "cove_cottage": cottage, "cove_cube": cube,
    "cove_row": row, "cove_chapel": chapel,
    "cove_rock_a": rock_a, "cove_rock_b": rock_b, "cove_rock_c": rock_c, "cove_rock_d": rock_d,
    "cove_wall_a": wall_a, "cove_wall_b": wall_b, "cove_wall_c": wall_c,
    "cove_tuft_a": tuft_a, "cove_tuft_b": tuft_b,
    "palm_d": palm_d, "palm_e": palm_e, "palm_f": palm_f, "palm_g": palm_g, "palm_h": palm_h,
    "cove_village_a": village_a, "cove_village_b": village_b,
    "bush_c": bush_c, "bush_d": bush_d, "bush_e": bush_e, "bush_f": bush_f,
}


def check(name, s):
    a = s.a
    assert set(np.unique(a[..., 3])) <= {0, 255}, f"{name}: alpha must be 0/255"
    assert (a[-1, :, 3] > 0).any(), f"{name}: bottom row must touch the ground"


def main():
    names = sys.argv[1:] or list(SPRITES)
    made = []
    for n in names:
        s = SPRITES[n]()
        check(n, s)
        s.save(n)
        made.append((n, s))
        print(f"{n} {s.w}x{s.h}")
    sel = made
    sheets = []
    for bgc in ((140, 188, 232), (112, 166, 63)):
        Wd = sum(s.w + 8 for _, s in sel) + 8
        Hd = max(s.h for _, s in sel) + 8
        sheet = Image.new("RGBA", (Wd, Hd), bgc + (255,))
        x = 8
        for _, s in sel:
            im = Image.fromarray(s.a, "RGBA")
            sheet.paste(im, (x, Hd - 4 - s.h), im)
            x += s.w + 8
        sheets.append(sheet)
    W2 = max(s.width for s in sheets)
    out = Image.new("RGBA", (W2, sum(s.height for s in sheets)))
    y = 0
    for sh in sheets:
        out.paste(sh, (0, y))
        y += sh.height
    out.resize((out.width * 3, out.height * 3), Image.NEAREST).save(os.path.join(HERE, "preview_cove.png"))


if __name__ == "__main__":
    main()

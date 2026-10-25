#!/usr/bin/env python3
"""COURSE MAP background for Velvet Cruise (style: tools/art/STYLE.md).

An oblique patchwork map of the 15-stage Out Run triangle. Start (0 Palm Cove)
bottom left; the five coast stages (0 Palm Cove, 1 Coral Bluffs, 2 Surfside,
3 Cypress Point, 4 Twilight Bay) run along one straight coast highway with the
sea BELOW them (the sea is on the right of the road, like in the game), and
every row inland is one step up and a little to the right. Each stage leads on
to its two neighbours in the next column; the five stages of the last column
are the goals A (top, Neon City) .. E (bottom, Twilight Bay) - the engine draws
the letters. Grid: same as gridPos() in src/game/coursemap.ts. Each stage is a
raised themed tile with a light node pad at its centre where the roads meet.
The sea shifts from afternoon blue (start, left) through sunset to dusk (goals,
right).

Writes:
  out/course_map.png        320x180 opaque background
  out/course_map.json       node pad centres + road centreline polylines
  preview_map.png           3x nearest-neighbour preview
  preview_map_debug.png     3x preview with the JSON polylines (red) and nodes (yellow)
  preview_sprites.png       6x sprite sheet (design check)

Run:  python3 -B make_map.py
"""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
W, H = 320, 180
ZOOM = 3

# Shared with the runtime captions; weather is independent of time of day.
with open(os.path.join(HERE, "..", "..", "..", "assets", "ui", "stage-times.json"), encoding="utf-8") as time_file:
    STAGE_TIMES = json.load(time_file)
FINAL_TIMES = {4: STAGE_TIMES["twilight-bay"], 12: STAGE_TIMES["gold-rush-town"], 13: STAGE_TIMES["crystal-lake"]}


def tile_tint(node):
    return {"sunset": (.92, .75, .78), "dusk": (.57, .61, .80), "night": (.48, .49, .73)}.get(FINAL_TIMES.get(node), (1, 1, 1))

TOP_CALM = 20      # engine writes the title here
BOT_CALM = 22      # engine draws a caption box here

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def C(h):
    if not isinstance(h, str):
        return tuple(h)
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def rh(x, y, s=0):
    """deterministic hash -> [0,1)"""
    h = (x * 374761393 + y * 668265263 + s * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296.0


# ----------------------------------------------------------------------------
# layout
# ----------------------------------------------------------------------------
YC = 130                 # coast highway row
TW, TH = 40, 22          # tile size
SLAB = 3                 # tile thickness (front face)
KL = 8 / 30              # tile side lean (x per y)

COLUMN_NODES = [[0], [5, 1], [8, 6, 2], [9, 11, 7, 3], [10, 12, 13, 14, 4]]   # inland -> coast


def grid(c, k):
    r = c - k
    return (34 + 58 * c - ROWSHIFT * r, YC - 26 * r)


ROWSHIFT = 7             # each row inland sits this much further left (= the tiles' lean over a row)
GAPX = 29                # a road climbs to the next row in the gap this far right of a node


NODES = {n: grid(c, k) for c, col in enumerate(COLUMN_NODES) for k, n in enumerate(col)}
EDGES = [(n, COLUMN_NODES[c + 1][k + j]) for c, col in enumerate(COLUMN_NODES[:-1])
         for k, n in enumerate(col) for j in (0, 1)]
# optional mid-points per edge (none needed: every road is a straight run)
BENDS = {}


def polyline(a, b):
    """roads run along the tile rows; a road to the next row inland climbs the gap between the
    columns (leaning with the tiles), like the grid of the arcade original"""
    (ax, ay), (bx, by) = NODES[a], NODES[b]
    if ay == by:
        pts = [(ax, ay), (bx, by)]
    else:
        pts = [(ax, ay), (ax + GAPX, ay), (ax + GAPX - ROWSHIFT, by), (bx, by)]
    return [list(p) for p in pts]


Y, X = np.mgrid[0:H, 0:W]


def seg_dist(ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
    return np.hypot(X - (ax + t * dx), Y - (ay + t * dy))


def poly_dist(pts):
    d = np.full((H, W), 1e9)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        d = np.minimum(d, seg_dist(ax, ay, bx, by))
    return d


def tile_mask(cx, cy, dy=0, hw=TW / 2):
    top = cy - TH // 2
    bot = cy + TH // 2 - 1
    off = (Y - dy - cy) * KL
    xl = np.round(cx - hw + off)
    xr = np.round(cx + hw + off) - 1
    return (Y >= top + dy) & (Y <= bot + dy) & (X >= xl) & (X <= xr)


def dilate(m, r=1):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r + r:
                o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


img = np.zeros((H, W, 3), np.uint8)


def paint(mask, col):
    img[mask] = C(col)


def px(x, y, col):
    if 0 <= x < W and 0 <= y < H:
        img[y, x] = C(col)


def hline(x0, x1, y, col):
    for x in range(x0, x1 + 1):
        px(x, y, col)


def shade(x, y, k=0.74):
    """cool shadow tint of what is already there"""
    if 0 <= x < W and 0 <= y < H:
        r, g, b = [int(v) for v in img[y, x]]
        img[y, x] = (int(r * k * 0.95), int(g * k), min(255, int(b * k + 18)))


def shore_y(x):
    """the waterline below the coast highway (the sea fills the map below it)"""
    return 150 + (1 if (x // 23) % 3 == 1 else 0) - (2 if x > 300 else 0)


SHORE = np.array([shore_y(x) for x in range(W)])

# road distance fields (needed early so scenery can avoid the roads)
DISTS = {(a, b): poly_dist(polyline(a, b)) for a, b in EDGES}
DMIN = np.min(np.stack(list(DISTS.values())), axis=0)
ROADMASK = DMIN <= 2.5
PADMASK = np.zeros((H, W), bool)
for _n, (_cx, _cy) in NODES.items():
    PADMASK[_cy - 3:_cy + 4, _cx - 4:_cx + 5] = True
KEEPOUT = dilate(ROADMASK | PADMASK, 1)
TOPMASK = {}
BODYMASK = np.zeros((H, W), bool)
for _n, (_cx, _cy) in NODES.items():
    TOPMASK[_n] = tile_mask(_cx, _cy)
    for _d in range(0, SLAB + 1):
        BODYMASK |= tile_mask(_cx, _cy, dy=_d)
GROUNDMASK = ~dilate(BODYMASK, 2) & (Y > TOP_CALM) & (Y < SHORE[X] - 6)

# ----------------------------------------------------------------------------
# sprites: rows of chars, '.' transparent
# ----------------------------------------------------------------------------
SPR = {}


def sprite(name, rows, legend):
    SPR[name] = (rows, legend)


PALMLEG = {"G": "#2f8a3e", "L": "#7cc84c", "g": "#1b5a34", "T": "#b47c46", "t": "#74472c"}
sprite("palm", [
    "..gGG.GGg..",
    ".gLLLGLLLG.",
    "gL..GLG..LG",
    "G..GgTgG..g",
    "..g..T..g..",
    ".....tT....",
    "......T....",
    "......tT...",
    "......tT...",
    "......tT...",
    ".....tTT...",
], PALMLEG)
sprite("palm2", [
    "..GGg.gGG..",
    ".GLLLGLLLg.",
    "GL..GLG..Lg",
    "g..GgTgG..G",
    "..g..T..g..",
    "....Tt.....",
    "....T......",
    "...Tt......",
    "...Tt......",
    "...TTt.....",
], PALMLEG)
sprite("palm_dusk", [
    ".gG.Gg.",
    "gLLGLLG",
    "G.gTg.g",
    "...T...",
    "...tT..",
    "...tT..",
    "...tT..",
    "..tTT..",
], {"G": "#3c4c78", "L": "#7484b8", "g": "#232a48", "T": "#8a7898", "t": "#4a3e5e"})
sprite("palm_neon", [
    ".gG.Gg.",
    "gLLGLLG",
    "G.gTg.g",
    "...T...",
    "...tT..",
    "...tT..",
    "...tT..",
    "..tTT..",
], {"G": "#1c6a74", "L": "#4cf0dc", "g": "#123448", "T": "#e05aa8", "t": "#5a2a66"})
sprite("palm_s", [
    ".gG.Gg.",
    "gLLGLLG",
    "G.gTg.g",
    "...T...",
    "...tT..",
    "...tT..",
    "..tTT..",
], PALMLEG)
for _nm, _a, _b in (("umb_r", "#e23c3c", "#fff4e4"), ("umb_b", "#2f7ad8", "#fff4e4"),
                    ("umb_y", "#f0b020", "#fff4e4")):
    sprite(_nm, [
        "..aba..",
        ".ababa.",
        "abababa",
        "...p...",
        "...p...",
    ], {"a": _a, "b": _b, "p": "#6a5048"})
for _nm, _a, _b in (("surf_p", "#e8487c", "#ffa0c0"), ("surf_c", "#2aa4dc", "#9ae0ff"),
                    ("surf_y", "#e8b818", "#fff27a")):
    sprite(_nm, [".a.", "aba", "aba", "aba", "aba", ".a."], {"a": _a, "b": _b})


def house_sprite(name, roof_d, roof_l, wall, wall_s, win, door="#7a4a34", eave="#4a2e3e"):
    sprite(name, [
        ".rRRRRRr.",
        "rRRRRRRRr",
        "rrrrrrrrr",
        "eeeeeeeee",
        ".sWWWWWW.",
        ".snWnWWW.",
        ".sWWWWdW.",
    ], {"r": roof_d, "R": roof_l, "e": eave, "W": wall, "s": wall_s, "n": win, "d": door})


house_sprite("house_red", "#b83a34", "#e8604a", "#fbf2e0", "#d8c8b4", "#4a78b0")
house_sprite("house_blue", "#2e5aa8", "#4c86d8", "#fbf2e0", "#d8c8b4", "#4a78b0")
house_sprite("house_orng", "#c8702c", "#f09a44", "#fff6e6", "#dccab0", "#4a78b0")
house_sprite("house_teal", "#2a8a86", "#46b8a8", "#fbf2e0", "#d8c8b4", "#4a78b0")
house_sprite("lit_a", "#3c2c5c", "#5c4684", "#9c8cbc", "#7a6a9c", "#ffe070", "#ffd060", "#1e1630")
house_sprite("lit_b", "#5a2c4c", "#82446a", "#a492c0", "#7e6ca0", "#ffe070", "#4a3048", "#1e1630")
sprite("lifeguard", [
    ".rrrrr.",
    "rRRRRRr",
    ".wnnnw.",
    ".wwwww.",
    ".t...t.",
    ".tt.tt.",
    "t.....t",
], {"r": "#d83a34", "R": "#f86a50", "w": "#fbf2e0", "n": "#4a78b0", "t": "#a87848"})
sprite("cypress", [
    ".g.",
    "gGg",
    "gGL",
    "gGL",
    "gGL",
    "gGL",
    "gGg",
    "ggG",
    ".g.",
    ".t.",
], {"g": "#173e2a", "G": "#2c6a3a", "L": "#4e9046", "t": "#5a3a28"})
sprite("mcypress", [
    "....gggg....",
    "..ggGGGGgg..",
    ".gGGLLGGGLg.",
    "gggGGggGGGgg",
    ".g.gg.t.ggg.",
    "......t.....",
    ".....tt.....",
    ".....t......",
    "....tt......",
], {"g": "#152e26", "G": "#25503a", "L": "#d89a50", "t": "#4a2e28"})
sprite("mcypress_s", [
    "..gggg..",
    ".gGLLGg.",
    "gGGGGGgg",
    ".gg.tgg.",
    "....t...",
    "...tt...",
], {"g": "#152e26", "G": "#25503a", "L": "#d89a50", "t": "#4a2e28"})
sprite("redwood", [
    "...g...",
    "..gGg..",
    "..gGL..",
    ".gGGLg.",
    "..gGL..",
    ".gGGGL.",
    "gGGGGLg",
    ".ggGgg.",
    "..rRT..",
    "..rRT..",
    ".rrRTT.",
], {"g": "#173a26", "G": "#2a5e34", "L": "#4c8a42", "r": "#6a2a1e", "R": "#a24a2c", "T": "#cc7044"})
sprite("redwood_s", [
    "..g..",
    ".gGg.",
    ".gGL.",
    "gGGLg",
    ".gGL.",
    "gGGGL",
    "ggGgg",
    ".rRT.",
    ".rRT.",
], {"g": "#173a26", "G": "#2a5e34", "L": "#4c8a42", "r": "#6a2a1e", "R": "#a24a2c", "T": "#cc7044"})
sprite("pine", [
    "..g..",
    ".gGg.",
    ".gGL.",
    "gGGGL",
    ".gGg.",
    "gGGGL",
    "..t..",
], {"g": "#1e5232", "G": "#3a7a3e", "L": "#6aa84a", "t": "#6a4430"})
sprite("bush", [
    ".gGL.",
    "gGGLL",
    "gGGGG",
    ".ggg.",
], {"g": "#3c6a30", "G": "#5e9038", "L": "#8cbc4c"})
sprite("bush_s", [".GL", "gGG"], {"g": "#3c6a30", "G": "#5e9038", "L": "#8cbc4c"})
sprite("scrub", [
    ".g.g.",
    "gGgGg",
    ".ggg.",
], {"g": "#7a7a3c", "G": "#a0a050"})
sprite("saguaro", [
    "...L...",
    "..gGL..",
    "g.gGL..",
    "gLgGL.L",
    "gLgGLgL",
    ".ggGLgL",
    "..gGGL.",
    "..gGL..",
    "..gGL..",
], {"g": "#1e5a30", "G": "#3a8a40", "L": "#7cc050"})
sprite("saguaro_s", [
    "..L..",
    "g.GL.",
    "gLGLL",
    ".gGL.",
    "..GL.",
], {"g": "#1e5a30", "G": "#3a8a40", "L": "#7cc050"})
MESALEG = {"k": "#5a2024", "T": "#f4b070", "t": "#e0965a", "M": "#d8643a", "m": "#b04832",
           "L": "#f08c56", "d": "#843026", "s": "#c86a42", "S": "#e48c5a"}
sprite("mesa", [
    "....kkkkkkkk......",
    "..kkTTTTTTTTkkk...",
    ".kTTTTtTTTTTTTTk..",
    ".kTTTTTTTTTtTTTTk.",
    "kTTtTTTTTTTTTTTTk.",
    "kMmMMmMMMmMMmMLLk.",
    "kmmMmmMmmMmmMmMLk.",
    "kddmddmdddmddmMLk.",
    "kssssssssssssSSSSk",
    "kkkkkkkkkkkkkkkkkk",
], MESALEG)
sprite("butte", [
    ".kk....",
    "kTTkk..",
    "kTTTk..",
    "kMmLk..",
    "kmMLk..",
    "kMmLk..",
    "kmMLk..",
    "kdmLk..",
    "ksssSk.",
    "kssSSSk",
    "kkkkkkk",
], MESALEG)
sprite("windmill", [
    "b.........b",
    ".bB.....Bb.",
    "..bB...Bb..",
    "...bBrBb...",
    "....rRr....",
    "...bsWWb...",
    "..Bb.WWbB..",
    ".Bb.sWWW.bB",
    "Bb..sWWW..b",
    "b..ssWnWW..",
    "...ssWWWW..",
    "...ssWdWW..",
], {"b": "#5a3a2c", "B": "#d8c8ae", "r": "#a83a30", "R": "#e05a40", "W": "#f6f0e2",
    "s": "#c4b8b0", "n": "#4a5a7a", "d": "#7a4a34"})
sprite("skull", [
    "w.......w",
    "Wk.....kW",
    ".WkkkkkW.",
    "..kWWWk..",
    "..WeWeW..",
    "..kWWWk..",
    "...WWW...",
    "...kWk...",
], {"w": "#d8d0c4", "W": "#fbf8f0", "k": "#6a5654", "e": "#2a1a24"})
sprite("deadtree", [
    "b.....b.",
    ".b..b.b.",
    ".bb.b.b.",
    "..bbbbb.",
    "...bB.b.",
    "...bB...",
    "...bB...",
    "...bB...",
    "..bbBB..",
], {"b": "#4a3630", "B": "#7a6258"})
sprite("rock_dk", [
    "..k...",
    ".kRk..",
    ".kRRk.",
    "kRrRRk",
    "krrrrk",
], {"k": "#241a24", "R": "#6a5a68", "r": "#3c3040"})
sprite("rock_dk2", [
    ".kk.k.",
    "kRrkRk",
    "krrrrk",
], {"k": "#241a24", "R": "#6a5a68", "r": "#3c3040"})
sprite("rock_jag", [
    "...k.....",
    "..kRk..k.",
    "..kRRkkRk",
    ".kRrRRkRk",
    "kRrrrRrrk",
    "krrrrrrrk",
], {"k": "#241a24", "R": "#6a5a68", "r": "#3c3040"})
sprite("observatory", [
    "...kkkk...",
    "..kGGsGk..",
    ".kGGGsGGk.",
    ".kGGGdGGk.",
    "kkkkkkkkkk",
    "kSSSwSSSSk",
    "kSSSSSSSSk",
    "kkkkkkkkkk",
], {"k": "#141228", "G": "#d8dcf0", "s": "#9ea4c8", "d": "#2a2e54", "S": "#6a6e98", "w": "#ffd860"})
sprite("saloon", [
    "kkkkkkkkk",
    "kYYYYYYYk",
    "kkkkkkkkk",
    "kBbBbBbBk",
    "kBwBBBwBk",
    "kBBBkBBBk",
    "kBBBkBBBk",
    "kkkkkkkkk",
], {"k": "#3a1e1a", "Y": "#ffd060", "B": "#a8643a", "b": "#7a4428", "w": "#ffe8a0"})
sprite("watertower", [
    ".kkkkk.",
    "kTTTTTk",
    "kTtTtTk",
    "kkkkkkk",
    ".k...k.",
    ".kk.kk.",
    ".k.k.k.",
    ".k...k.",
], {"k": "#3a1e1a", "T": "#b87a48", "t": "#8a5434"})
sprite("seastack", [
    "..gg..",
    ".kSSs.",
    ".kSSs.",
    ".kSsS.",
    "kSSSsS",
    "kSsSSs",
    "kssSSs",
    "kSsSss",
    "ffffff",
], {"g": "#7aa040", "S": "#eaac6c", "s": "#b8683c", "k": "#7e4630", "f": "#f4fbff"})
sprite("seastack_s", [
    ".kS.",
    "kSSs",
    "kSss",
    "kSSs",
    "ffff",
], {"S": "#eaac6c", "s": "#b8683c", "k": "#7e4630", "f": "#f4fbff"})
BLUFFLEG = {"g": "#6e9a3a", "G": "#9cc050", "S": "#f2ba80", "s": "#c87a42", "k": "#7e4230",
            "p": "#f06a8a"}
sprite("outcrop", [
    "...gGpg....",
    "..kSSSSkg..",
    ".kSSSSSSSk.",
    "kSsSSSSSSSk",
    "ksssSsSSSsk",
    "kssssssssk.",
    ".kkkkkkkk..",
], BLUFFLEG)
sprite("outcrop_s", [
    ".gpG..",
    "kSSSk.",
    "kSsSSk",
    "kssssk",
    ".kkkk.",
], BLUFFLEG)
sprite("hoodoo", [
    ".gG.",
    "kSSk",
    "kSsk",
    "kSSk",
    "ksSk",
    "kSsk",
    "kssk",
    "kkkk",
], BLUFFLEG)
sprite("seaarch", [
    "..kSSSSs..",
    ".kSSssSSs.",
    "kSs....kSs",
    "kS......Ss",
    "kS......ks",
    "fff....fff",
], {"S": "#eaac6c", "s": "#b8683c", "k": "#7e4630", "f": "#f4fbff"})
sprite("lighthouse", [
    ".y.",
    "yYy",
    "kgk",
    "rrr",
    "www",
    "rrr",
    "www",
    "rrr",
    "www",
    "kkk",
], {"y": "#fff6c0", "Y": "#ffd050", "g": "#3a3248", "k": "#2a2238", "r": "#d83a44",
    "w": "#f4eef8"})
sprite("redwood_xs", [
    ".g.",
    "gGL",
    "gGL",
    "gGG",
    "ggL",
    ".R.",
    ".R.",
], {"g": "#173a26", "G": "#2a5e34", "L": "#4c8a42", "R": "#a24a2c"})
sprite("cypress_s", [
    ".g.",
    "gGL",
    "gGL",
    "gGL",
    "ggG",
    ".t.",
], {"g": "#173e2a", "G": "#2c6a3a", "L": "#4e9046", "t": "#5a3a28"})
sprite("sandrock", [
    ".kSS.",
    "kSSSs",
    "ksSss",
], {"S": "#eeb478", "s": "#c4783e", "k": "#8a4a30"})
sprite("sailboat", [
    "...w...",
    "...wW..",
    "..wwW..",
    ".wwwWW.",
    "...k...",
    "rrrrrrr",
    ".rrrrr.",
], {"w": "#fbf8f0", "W": "#d8d4e4", "k": "#5a4a40", "r": "#c83a34"})
sprite("lamp", ["y", "Y", "k", "k", "k"], {"y": "#fff6c0", "Y": "#ffd050", "k": "#2a2238"})
sprite("flag", [
    "o...........",
    "kKKwwKKwwKKw",
    "kKKwwKKwwKKw",
    "kwwKKwwKKwwK",
    "kwwKKwwKKwwK",
    "kKKwwKKwwKKw",
    "kKKwwKKwwKK.",
    "k...........",
    "k...........",
    "k...........",
    "k...........",
    "k...........",
    "k...........",
    "kk..........",
], {"o": "#ffd050", "k": "#2a2238", "K": "#24202c", "w": "#fbfaf4"})
sprite("tuft", ["g.g", ".G."], {"g": "#6a8a34", "G": "#4e6e2c"})
sprite("reed", ["L.", "gL", "g."], {"g": "#4e7a34", "L": "#8ab448"})
sprite("towel_r", ["rwr", "rwr"], {"r": "#e84a5a", "w": "#fff4e4"})
sprite("towel_b", ["bwb", "bwb"], {"b": "#3aa0e0", "w": "#fff4e4"})
sprite("fern", [".L.L", "LgLg"], {"g": "#2a4a26", "L": "#6a9a44"})


PLACED = []      # (base_y, order, name, x0, y0, flip, shadow, time tint)
WARN = []
NOTE = []
OCC = np.zeros((H, W), bool)     # pixels already covered by placed sprites


def _pixels(name, x0, y0, flip):
    rows, leg = SPR[name]
    w = len(rows[0])
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".":
                yield x0 + (w - 1 - i if flip else i), y0 + j, ch


def place(name, bx, by, flip=False, nudge=3, shadow=True, base=None, overlap=False,
          check=True, order=0):
    """queue a sprite with its bottom-centre at (bx, by); nudges up to `nudge` px
    to stay clear of roads/pads and other sprites; base mask = where it may stand"""
    rows, leg = SPR[name]
    h, w = len(rows), len(rows[0])
    cands = sorted(((dx, dy) for dx in range(-nudge, nudge + 1) for dy in range(-nudge, nudge + 1)),
                   key=lambda d: (d[0] * d[0] + 2 * d[1] * d[1], abs(d[1]), d[0]))
    for dx, dy in cands:
        x, y = bx + dx, by + dy
        if base is not None and not (0 <= x < W and 0 <= y < H and base[y, x]):
            continue
        x0, y0 = x - w // 2, y - h + 1
        ok = True
        for (qx, qy, ch) in _pixels(name, x0, y0, flip):
            if not (0 <= qx < W and TOP_CALM <= qy < H - BOT_CALM):
                ok = False
                break
            if (check and KEEPOUT[qy, qx]) or (not overlap and OCC[qy, qx]):
                ok = False
                break
        if ok:
            for (qx, qy, ch) in _pixels(name, x0, y0, flip):
                OCC[qy, qx] = True
            node = next((n for n, mask in TOPMASK.items() if mask is base), None)
            PLACED.append((y, order, name, x0, y0, flip, shadow, tile_tint(node)))
            if (dx, dy) != (0, 0):
                NOTE.append(f"{name} ({bx},{by}) nudged {dx:+d},{dy:+d}")
            return True
    WARN.append(f"{name} at ({bx},{by}) does not fit")
    return False


def blit(name, x0, y0, flip=False, tint=(1, 1, 1)):
    rows, leg = SPR[name]
    for (qx, qy, ch) in _pixels(name, x0, y0, flip):
        r, g, b = C(leg[ch])
        # Lamps and warm lit windows remain readable after sunset.
        lit = name.startswith("lit_") or name in ("saloon", "lamppost")
        if not (lit and r > 200 and g > 160 and b < 145):
            r, g, b = (round(value * factor) for value, factor in zip((r, g, b), tint))
        px(qx, qy, (r, g, b))


def flush_sprites():
    # shadows first (cast to the lower-left: sun upper right)
    for by, _o, name, x0, y0, flip, sh, _tint in PLACED:
        if not sh:
            continue
        rows, _ = SPR[name]
        w = len(rows[0])
        for i in range(-1, w - 1):
            for dy in (0, 1):
                x, y = x0 + i - dy - 1, by + dy
                if 0 <= x < W and 0 <= y < H and not KEEPOUT[y, x] and not OCC[y, x]:
                    if dy == 1 and (i < 1 or i > w - 3):
                        continue
                    shade(x, y)
    for by, _o, name, x0, y0, flip, sh, tint in sorted(PLACED, key=lambda t: (t[0], t[1])):
        blit(name, x0, y0, flip, tint)
    PLACED.clear()


# ----------------------------------------------------------------------------
# 1. ground + sea
# ----------------------------------------------------------------------------
GROUND = ["#c99470", "#d6a47e", "#e2b48c", "#eec69e"]




def draw_ground():
    paint(np.ones((H, W), bool), GROUND[2])
    # sparse calm grain clusters (2-px dashes, never single-pixel speckle)
    for y in range(0, SHORE.max()):
        for x in range(0, W - 1):
            r = rh(x, y, 3)
            if r < 0.010:
                px(x, y, GROUND[1])
                px(x + 1, y, GROUND[1])
            elif r < 0.014:
                px(x, y, GROUND[3])
                px(x + 1, y, GROUND[3])


SEA_DAY = ["#1d4f9c", "#2766b4", "#3483c9", "#4aa3da", "#72c4e6"]
SEA_SUN = ["#2a3c88", "#3c4e9e", "#566aae", "#7c86bc", "#a8a8cc"]
SEA_DUSK = ["#1c1c4c", "#28296a", "#3a3884", "#544c9a", "#7a6cb0"]


def _streak(y, seed):
    """per-row horizontal offset: long interleaved streaks like light on water"""
    return int(round(9 * math.sin(y * 0.83 + seed) + 10 * (rh(y // 1, 0, seed) - 0.5)))


def sea_zone(x, y):
    """0 = day, 1 = sunset, 2 = dusk (streaky transitions along the coast)"""
    if x >= 266 + _streak(y, 7):
        return 2
    if x >= 192 + _streak(y, 3):
        return 1
    return 0


def draw_sea():
    pals = [np.array([C(c) for c in p]) for p in (SEA_DAY, SEA_SUN, SEA_DUSK)]
    glint = [("#a6dcf0", "#5c9ad6"), ("#ffc890", "#7a7ec0"), ("#e8d0ff", "#4c4a96")]
    for x in range(W):
        s = SHORE[x]
        for y in range(s, H):
            d = y - s
            u = min(max(4.6 - d / 4.0, 0), 4.999)
            i = int(u)
            if (u - i) > 0.5 + BAYER[y % 4, x % 4] * 0.5:
                i += 1
            z = sea_zone(x, y)
            img[y, x] = pals[z][min(i, 4)]
        # wave glints: short dashes, brighter near the shore
        for y in range(s + 3, H):
            if rh(x // 4, y, 11) < 0.05 and (x % 4) < 3 and rh(x // 4, y, 12) < 0.6:
                z = sea_zone(x, y)
                img[y, x] = C(glint[z][0] if y < s + 10 else glint[z][1])
    # beach + foam (the sand slopes down to the waterline below the coast road)
    for x in range(W):
        s = SHORE[x]
        px(x, s - 5, "#e8cc94")
        for y in range(s - 4, s - 1):
            px(x, y, "#f1dca4")
        px(x, s - 1, "#d9c08a")      # wet sand
        px(x, s, "#f4fbff")
        if rh(x // 3, 0, 5) < 0.55:
            px(x, s + 2, "#c8ecf6" if x < 200 else "#d8d0f0")


def blob(parts):
    m = np.zeros((H, W), bool)
    for (ex, ey, rx, ry) in parts:
        m |= ((X - ex) / rx) ** 2 + ((Y - ey) / ry) ** 2 <= 1.0
    return m


def mound(cx, by, hw, h, lit, mid, dark, rim=None):
    """a soft hill/dune: lit right flank, shaded left flank"""
    for x in range(cx - hw, cx + hw + 1):
        t = (x - cx) / hw
        ht = int(round(h * (1 - t * t)))
        for k in range(ht + 1):
            y = by - k
            if 0 <= y < H and 0 <= x < W and not KEEPOUT[y, x] and GROUNDMASK[y, x]:
                if x > cx - 2 + k // 2:
                    col = lit if k == ht else mid
                else:
                    col = dark
                px(x, y, col)
        if rim and 0 <= x < W and not KEEPOUT[by + 1, x] and GROUNDMASK[by + 1, x]:
            px(x, by + 1, rim)


def mountain(cx, by, peaks, snow=0, seed=0):
    """a small desert massif lit from the upper right. peaks = [(dx, h, wl, wr), ...]
    (main peak first); concave flanks, jagged crest, gullies, optional snow cap"""
    tops, owner = {}, {}
    xs0 = min(cx + dx - wl for dx, h, wl, wr in peaks)
    xs1 = max(cx + dx + wr for dx, h, wl, wr in peaks)
    for x in range(xs0, xs1 + 1):
        best, who = -1, 0
        for k, (dx, h, wl, wr) in enumerate(peaks):
            px0 = cx + dx
            if not (px0 - wl <= x <= px0 + wr):
                continue
            t = (px0 - x) / wl if x < px0 else (x - px0) / wr
            jag = (rh(x, seed + k, 41) - 0.5) * 2.0 if 0.05 < t < 0.85 else 0
            ht = h * (1 - t) ** 1.35 + jag
            if ht > best:
                best, who = ht, k
        tops[x] = by - max(int(round(best)), 0)
        owner[x] = who
    for x in range(xs0, xs1 + 1):
        if not (0 <= x < W):
            continue
        dx, h, wl, wr = peaks[owner[x]]
        pxx, pk = cx + dx, by - h
        for y in range(tops[x], by + 1):
            if KEEPOUT[y, x]:
                continue
            ridge = pxx - (y - pk) * 0.3 + (1 if (y // 3) % 2 else 0)
            right = x >= ridge
            sn = pk + snow + (1 if rh(x, seed, 44) < 0.4 else 0) - (abs(x - pxx) // 2)
            snowy = snow and owner[x] == 0 and y <= sn
            if snowy:
                col = "#f6f2fa" if right else "#c4c0de"
            elif right:
                col = "#cfa08a"
                if ((x - pxx) + (y - pk) // 2) % 5 == 0 and y > pk + 2:
                    col = "#b4887a"
            else:
                col = "#8e6c78" if ((x - pxx) - (y - pk) // 2) % 6 else "#7a5a6c"
            if y == tops[x]:
                if not right:
                    col = "#5a3e52"
                elif not snowy:
                    col = "#e8c2a6"
            px(x, y, col)
        if not KEEPOUT[by + 1, x]:
            px(x, by + 1, "#a8806e")


def draw_filler():
    """scenery in the open land above the triangle: a meadow with a pond, grassy
    hills, a snowy range toward the mountains, scrub and pines"""
    inland = GROUNDMASK & (Y < 128 - (X - 34) * 0.42 - 15) & ~KEEPOUT
    # meadow (dry grass) round the pond, edges dithered into the sand
    meadow = blob([(52, 62, 32, 12), (24, 74, 18, 9), (86, 54, 16, 7), (34, 48, 18, 6)]) & inland
    edge = meadow & ~(np.roll(meadow, 1, 0) & np.roll(meadow, -1, 0) & np.roll(meadow, 1, 1) & np.roll(meadow, -1, 1))
    for y, x in zip(*np.nonzero(meadow)):
        if edge[y, x] and (x + y) % 2:
            continue
        img[y, x] = C("#cbb47c")
    for y, x in zip(*np.nonzero(meadow & ~dilate(edge, 1))):
        r = rh(x, y, 51)
        if r < 0.05 and meadow[y - 1, x - 1] and meadow[y - 1, x + 1]:
            px(x - 1, y - 1, "#a8a05a")
            px(x + 1, y - 1, "#a8a05a")
            px(x, y, "#8a8a48")
    # pond
    pcx, pcy = 56, 62
    pond = ((X - pcx) / 17.0) ** 2 + ((Y - pcy) / 6.0) ** 2 <= 1.0
    ring = dilate(pond, 1) & ~pond
    paint(ring & ~KEEPOUT, "#b49a66")
    paint(pond, "#3e8ed0")
    inner = ((X - pcx - 2) / 13.0) ** 2 + ((Y - pcy - 1) / 3.8) ** 2 <= 1.0
    paint(inner, "#2e74c0")
    for (gx, gy) in ((46, 60), (60, 63), (52, 65)):
        hline(gx, gx + 3, gy, "#8cc8ee")
    for x in range(W):
        col = pond[:, x]
        if col.any():
            px(x, np.argmax(col), "#6aaee0")
    for rx, ry in ((40, 62), (42, 59), (70, 59), (72, 62), (62, 68), (48, 68)):
        place("reed", rx, ry, shadow=False, nudge=1)
    # low grassy hills on the left
    mound(14, 92, 13, 5, "#d8c48a", "#ccb47c", "#b09468", rim="#b48e6a")
    mound(36, 98, 10, 4, "#d8c48a", "#ccb47c", "#b09468", rim="#b48e6a")
    # the mountains rising behind the inland stages (snow on the tallest)
    mountain(150, 50, [(0, 18, 11, 10), (10, 11, 6, 6), (-9, 9, 5, 4)], snow=6, seed=1)
    mountain(176, 40, [(0, 12, 8, 7), (-7, 7, 4, 4)], snow=4, seed=3)
    mountain(118, 46, [(0, 9, 8, 7), (6, 6, 5, 5)], seed=2)
    mountain(214, 28, [(0, 7, 6, 6)], seed=5)
    # scrub, pines, rocks scattered (calm), on a jittered grid
    names = ["bush", "pine", "bush_s", "scrub", "pine", "rock_dk2", "scrub", "bush_s"]
    k = 0
    for gy in range(30, 112, 10):
        for gx in range(6, 230, 13):
            x = gx + int(rh(gx, gy, 61) * 8) - 4
            y = gy + int(rh(gx, gy, 62) * 6) - 3
            if not (0 <= x < W and 0 <= y < H) or not inland[y, x] or rh(gx, gy, 63) < 0.45:
                continue
            place(names[k % len(names)], x, y, base=inland, nudge=2)
            k += 1
    # dunes and scrub on the beach strip before the start
    for (name, x, y) in (("scrub", 8, 140), ("bush_s", 6, 120), ("palm_s", 10, 132)):
        place(name, x, y, base=GROUNDMASK, nudge=3)


# ----------------------------------------------------------------------------
# 2. tiles (raised slabs) + their ground textures
# ----------------------------------------------------------------------------
THEMES = {
    0: dict(top="#f2da9c", hi="#fbeab8", face="#c49a5e", face2="#8e6a44"),
    1: dict(top="#e2a468", hi="#f2c48c", face="#b06a3c", face2="#7e4630"),
    2: dict(top="#f4dea4", hi="#fcecc0", face="#c49a5e", face2="#8e6a44"),
    3: dict(top="#7a8640", hi="#f2b866", face="#7a5a3c", face2="#523a2c"),
    4: dict(top="#5e6488", hi="#8a86b0", face="#463e62", face2="#2e2846"),
    5: dict(top="#a2a29c", hi="#c6c6be", face="#6e6c74", face2="#4a4854"),
    6: dict(top="#bb8c5a", hi="#d8aa74", face="#8a6040", face2="#5e3e2c"),
    7: dict(top="#3e6232", hi="#5e8a44", face="#6a4430", face2="#442c20"),
    8: dict(top="#e2925a", hi="#f4b47a", face="#a85a34", face2="#7a3a26"),
    9: dict(top="#eeeae0", hi="#fdfcf6", face="#aca090", face2="#7a6e64"),
    10: dict(top="#3a3258", hi="#7c6cae", face="#2a2244", face2="#1a142c"),
    11: dict(top="#e6ecf6", hi="#ffffff", face="#7a86a8", face2="#525c80"),     # Snowcap Pass
    12: dict(top="#d8945a", hi="#f2b47a", face="#9a5434", face2="#6e3826"),     # Gold Rush Town
    13: dict(top="#3e6a4e", hi="#5e9068", face="#3a4a5a", face2="#26303e"),     # Crystal Lake
    14: dict(top="#2e3456", hi="#5a6496", face="#1e2240", face2="#12142a"),     # Starlight Summit
}
OUTLINE = "#4a2e3e"


def tex_dashes(top, cx, cy, col, step=(7, 4), length=3, seed=0):
    ys, xs = np.nonzero(top)
    for x, y in zip(xs, ys):
        gy = (y - cy) % step[1]
        if gy != 0:
            continue
        sh = (((y - cy) // step[1]) % 2) * (step[0] // 2)
        if (x - cx + sh + int(rh(y, cy, seed) * step[0])) % step[0] < length:
            img[y, x] = C(col)


def tex_tufts(top, cx, cy, cols, spacing=6, seed=1, density=0.7):
    ys, xs = np.nonzero(top)
    sset = set(zip(xs.tolist(), ys.tolist()))
    for gy in range(cy - 14, cy + 14, spacing - 2):
        for gx in range(cx - 26, cx + 26, spacing):
            ox = int(rh(gx, gy, seed) * (spacing - 2))
            x, y = gx + ox + (gy // (spacing - 2)) % 2 * (spacing // 2), gy + int(rh(gx, gy, seed + 1) * 2)
            if rh(gx, gy, seed + 2) > density:
                continue
            pts = [(x - 1, y - 1, cols[0]), (x + 1, y - 1, cols[0]), (x, y, cols[1])]
            if all((p[0], p[1]) in sset for p in pts):
                for p in pts:
                    px(*p)


def voronoi_cracks(top, cx, cy, col, spacing=7, seed=9):
    sites = []
    for gy in range(cy - 20, cy + 21, spacing - 2):
        for gx in range(cx - 30, cx + 31, spacing):
            sites.append((gx + rh(gx, gy, seed) * spacing, gy + rh(gx, gy, seed + 1) * (spacing - 2)))
    S = np.array(sites)
    ys, xs = np.nonzero(top)
    d = np.hypot(xs[:, None] - S[None, :, 0], (ys[:, None] - S[None, :, 1]) * 1.3)
    d.sort(axis=1)
    crack = (d[:, 1] - d[:, 0]) < 0.9
    img[ys[crack], xs[crack]] = C(col)


def texture(n, top, cx, cy):
    if n == 0:      # Palm Cove: sand ripples + a turquoise cove in the top-left
        tex_dashes(top, cx, cy, "#e2c482", step=(7, 3), length=3, seed=1)
        cove = (((X - (cx - 13)) / 11.0) ** 2 + ((Y - (cy - 8)) / 6.0) ** 2 <= 1.0) & top
        wet = dilate(cove, 1) & top & ~cove
        paint(wet, "#d8bc84")
        paint(cove, "#4cbce0")
        deep = (((X - (cx - 15)) / 8.0) ** 2 + ((Y - (cy - 10)) / 4.0) ** 2 <= 1.0) & top
        paint(deep, "#2f98d0")
        foam = (cove & ~np.roll(cove, 1, 0)) | (cove & ~np.roll(cove, -1, 0))
        paint(foam & top & (Y > cy - 11), "#e8faff")
        for x in range(cx - 18, cx - 8, 4):
            px(x, cy - 8, "#a8e8f4")
            px(x + 1, cy - 8, "#a8e8f4")
    elif n == 1:    # Coral Bluffs: sandstone strata
        ys, xs = np.nonzero(top)
        for x, y in zip(xs, ys):
            k = (y - cy + 11 + int(1.5 * math.sin((x - cx) / 6.0))) % 5
            if k == 0:
                img[y, x] = C("#f0bc84")
            elif k == 2:
                img[y, x] = C("#c8844c")
        for x in range(cx - 24, cx + 24):
            for y in (cy - 11, cy - 10):
                if 0 <= x < W and top[y, x] and rh(x, y, 4) < (0.85 if y == cy - 11 else 0.35):
                    px(x, y, "#86ac46" if rh(x, y, 5) < 0.6 else "#5e8a3a")
        # ice-plant mats (green with coral-pink blooms) spilling over the bluff
        for (ix, iy, rx, ry) in ((-15, -9, 5, 2), (8, -10, 6, 2), (-12, 8, 6, 2), (2, 10, 4, 1.5)):
            m = (((X - (cx + ix)) / rx) ** 2 + ((Y - (cy + iy)) / ry) ** 2 <= 1.0) & top
            ys2, xs2 = np.nonzero(m)
            for x, y in zip(xs2, ys2):
                img[y, x] = C("#4e8a3a" if (x + y) % 3 else "#6eaa44")
                if (x * 5 + y * 3) % 7 == 0:
                    img[y, x] = C("#f2708e")
                elif (x * 3 + y * 5) % 11 == 0:
                    img[y, x] = C("#ffb0c4")
    elif n == 2:    # Surfside: bright sand, ripples
        tex_dashes(top, cx, cy, "#e6c88a", step=(8, 3), length=3, seed=2)
    elif n == 3:    # Cypress Point: sunset grass
        tex_tufts(top, cx, cy, ("#e0a456", "#58662e"), spacing=6, seed=3, density=0.8)
        for x in range(cx - 24, cx + 24):
            y = cy - 11
            if 0 <= x < W and top[y, x]:
                px(x, y, "#a08a72" if rh(x, 0, 6) < 0.5 else "#c4a888")
    elif n == 4:    # Twilight Bay: dusk lawn
        tex_tufts(top, cx, cy, ("#7c82aa", "#4a4e72"), spacing=6, seed=4, density=0.7)
    elif n == 5:    # Thunder Highway: wet city blocks
        ys, xs = np.nonzero(top)
        for x, y in zip(xs, ys):
            lx = x - cx - round((y - cy) * KL)
            if (y - cy) % 6 == 3 or lx % 9 == 4:
                img[y, x] = C("#8c8c8e")
            elif (y - cy) % 6 == 4 and lx % 9 != 4:
                img[y, x] = C("#b2b2aa")
    elif n == 6:    # Vineyard Valley: vine rows
        ys, xs = np.nonzero(top)
        for x, y in zip(xs, ys):
            k = (y - cy + 11) % 3
            if k == 1:
                img[y, x] = C("#3e7a34") if (x + y) % 4 else C("#2e5e2c")
                if (x * 7 + y * 3) % 11 == 0:
                    img[y, x] = C("#6a2e74")
            elif k == 0 and (x + y) % 2 == 0:
                img[y, x] = C("#78b04a")
            elif k == 2:
                img[y, x] = C("#a07448")
    elif n == 7:    # Redwood Pass: forest floor + ferns
        tex_tufts(top, cx, cy, ("#5e8e44", "#2a4626"), spacing=5, seed=7, density=0.85)
    elif n == 8:    # Painted Desert: wavy dune ripples
        ys, xs = np.nonzero(top)
        for x, y in zip(xs, ys):
            k = (y - cy + int(round(1.6 * math.sin((x - cx) / 4.0)))) % 5
            if k == 0:
                img[y, x] = C("#c8743e")
            elif k == 1:
                img[y, x] = C("#f0a86e")
    elif n == 9:    # Death Valley: salt polygons
        voronoi_cracks(top, cx, cy, "#d0c6b6", spacing=7)
    elif n == 11:   # Snowcap Pass: snow drifts with grey rock showing through
        tex_tufts(top, cx, cy, ("#c4d0e6", "#8e9aba"), spacing=6, seed=11, density=0.7)
        tex_dashes(top, cx, cy, "#f8fbff", step=(7, 3), length=3, seed=11)
    elif n == 12:   # Gold Rush Town: dusty main street ruts
        tex_dashes(top, cx, cy, "#c07a46", step=(8, 3), length=4, seed=12)
        tex_dashes(top, cx, cy, "#eab27a", step=(9, 4), length=2, seed=13)
    elif n == 13:   # Crystal Lake: pine meadow round a lake in the back left
        tex_tufts(top, cx, cy, ("#5e9068", "#24483a"), spacing=5, seed=13, density=0.8)
        lake = (((X - (cx - 9)) / 12.0) ** 2 + ((Y - (cy - 5)) / 5.0) ** 2 <= 1.0) & top
        paint(dilate(lake, 1) & top & ~lake, "#8a9a7a")
        paint(lake, "#3c9cc8")
        paint((((X - (cx - 11)) / 8.0) ** 2 + ((Y - (cy - 6)) / 3.0) ** 2 <= 1.0) & top, "#2a7ab0")
        for x in range(cx - 16, cx - 4, 4):
            px(x, cy - 4, "#bfe8f6")
            px(x + 1, cy - 4, "#bfe8f6")
    elif n == 14:   # Starlight Summit: dark rock, a few stars reflected in frost
        tex_tufts(top, cx, cy, ("#4a5486", "#161a34"), spacing=6, seed=14, density=0.75)
        ys, xs = np.nonzero(top)
        for x, y in zip(xs, ys):
            if rh(x, y, 140) < 0.02:
                img[y, x] = C("#e8ecff")
    elif n == 10:   # Neon City: night-time street grid, kerbs, a few street lamps
        ys, xs = np.nonzero(top)
        for x, y in zip(xs, ys):
            lx = x - cx - round((y - cy) * KL)
            if (y - cy) % 6 == 3 or lx % 9 == 4:
                img[y, x] = C("#272140")
                if (y - cy) % 6 == 3 and lx % 9 == 4:
                    img[y, x] = C("#ffcf6a")
            elif (y - cy) % 6 == 4:
                img[y, x] = C("#4a4170")


def draw_tiles():
    order = sorted(NODES, key=lambda n: NODES[n][1])
    for n in order:
        cx, cy = NODES[n]
        th = THEMES[n]
        top = tile_mask(cx, cy)
        body = top.copy()
        for d in range(1, SLAB + 1):
            body |= tile_mask(cx, cy, dy=d)
        face = body & ~top
        outl = dilate(body, 1) & ~body
        paint(outl, OUTLINE)
        paint(face, th["face"])
        lowface = face & ~np.roll(face, -1, 0)
        paint(lowface, th["face2"])
        paint(top, th["top"])
        texture(n, top, cx, cy)
        # top edge + right edge catch the sun
        topedge = top & ~np.roll(top, 1, 0)
        rightedge = top & ~np.roll(top, -1, 1)
        paint(topedge | rightedge, th["hi"])
        # Colour the textured ground as well as its sprites, before drawing
        # neutral route lines and checkpoint pads on top.
        img[body] = np.rint(img[body] * np.array(tile_tint(n))).astype(np.uint8)


# ----------------------------------------------------------------------------
# 3. roads + pads
# ----------------------------------------------------------------------------
ROAD_CORE = "#5f5b6e"
ROAD_EDGE = "#c8c4d4"
ROAD_DASH = "#f8f6fa"
PAD_IN = "#f0ecf6"
PAD_MID = "#cfc8dc"
PAD_OUT = "#3e3650"


def bresenham(x0, y0, x1, y1):
    pts = []
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy
    return pts


def draw_roads():
    core = DMIN <= 1.5
    edge = (DMIN <= 2.5) & ~core
    # soft drop shadow under the road (down-left), on ground/tiles only
    sh = np.roll(np.roll(DMIN <= 2.5, 1, 0), -1, 1) & ~(DMIN <= 2.5)
    for y, x in zip(*np.nonzero(sh)):
        shade(x, y, 0.84)
    paint(edge, ROAD_EDGE)
    paint(core, ROAD_CORE)
    # dashes along each centreline, skipping pads and crossings
    for a, b in EDGES:
        pts = polyline(a, b)
        others = np.full((H, W), 1e9)
        for e2, d in DISTS.items():
            if e2 != (a, b):
                others = np.minimum(others, d)
        t = 0
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            for (x, y) in bresenham(ax, ay, bx, by):
                t += 1
                nearpad = min(math.hypot(x - nx, y - ny) for nx, ny in NODES.values()) < 7
                if nearpad or others[y, x] < 4.5:
                    continue
                if (t % 8) in (3, 4, 5):
                    px(x, y, ROAD_DASH)
    # node pads: 7x5 light checkpoint plate with a dark rim
    for n, (cx, cy) in NODES.items():
        for y in range(cy - 3, cy + 4):
            for x in range(cx - 4, cx + 5):
                ax, ay = abs(x - cx), abs(y - cy)
                if ax == 4 and ay == 3:
                    continue
                if ax <= 3 and ay <= 2:
                    px(x, y, PAD_IN if (ay < 2 and ax < 3) else PAD_MID)
                else:
                    px(x, y, PAD_OUT)


# ----------------------------------------------------------------------------
# 4. stage dressing
# ----------------------------------------------------------------------------
def pl(name, bx, by, **kw):
    """place a tile decoration; one that does not fit in the strip below the tile's road
    (tall trees, mesas) moves up into the back half of the tile instead"""
    n0 = len(WARN)
    if place(name, bx, by, **kw):
        return True
    del WARN[n0:]
    return place(name, bx, by - 14, **kw)


def dress():
    n = NODES
    T = TOPMASK
    # 0 Palm Cove: cove water top-left (texture), palms, a sunshade
    cx, cy = n[0]
    b = T[0]
    pl("palm", cx + 1, cy - 5, base=b)
    pl("palm2", cx + 13, cy - 5, base=b)
    pl("palm", cx - 16, cy + 3, flip=True, base=b)
    pl("palm2", cx - 9, cy + 9, flip=True, base=b)
    pl("umb_r", cx - 1, cy + 9, base=b)
    pl("towel_b", cx - 11, cy + 5, base=b, shadow=False)
    # 1 Coral Bluffs: sandstone bluffs and sea stacks off-shore
    cx, cy = n[1]
    b = T[1]
    pl("outcrop", cx - 5, cy - 5, base=b)
    pl("hoodoo", cx + 4, cy - 5, base=b)
    pl("outcrop_s", cx + 14, cy - 5, base=b)
    pl("outcrop", cx - 6, cy + 10, flip=True, base=b)
    pl("hoodoo", cx - 15, cy + 7, base=b)
    pl("outcrop_s", cx - 17, cy - 6, base=b)
    pl("seastack", cx - 8, 157, shadow=False, check=False)
    pl("seastack_s", cx + 12, 156, shadow=False, check=False)
    pl("seastack", cx + 22, 157, shadow=False, check=False)
    # 2 Surfside: beach houses, lifeguard tower, sunshades, surfboards
    cx, cy = n[2]
    b = T[2]
    pl("house_red", cx - 14, cy - 5, base=b)
    pl("house_teal", cx - 4, cy - 5, base=b)
    pl("house_orng", cx + 6, cy - 5, base=b)
    pl("lifeguard", cx + 15, cy - 5, base=b)
    pl("umb_b", cx - 9, cy + 8, base=b)
    pl("umb_r", cx - 1, cy + 10, base=b)
    pl("umb_y", cx - 15, cy + 10, base=b)
    pl("surf_p", cx - 18, cy + 7, base=b)
    pl("surf_c", cx - 6, cy + 10, base=b)
    pl("towel_r", cx + 4, cy + 9, base=b, shadow=False)
    # 3 Cypress Point: windswept cypresses on a rocky headland
    cx, cy = n[3]
    b = T[3]
    pl("mcypress", cx - 12, cy - 5, base=b)
    pl("mcypress_s", cx + 4, cy - 5, base=b)
    pl("rock_dk2", cx + 15, cy - 6, base=b)
    pl("mcypress", cx + 12, cy + 10, flip=True, base=b)
    pl("rock_dk2", cx + 18, cy + 4, base=b)
    pl("mcypress_s", cx - 20, cy - 6, flip=True, base=b)
    # 4 Twilight Bay: lit houses, lamps, the goal flag
    cx, cy = n[4]
    b = T[4]
    pl("flag", cx + 13, cy - 1, base=b, shadow=False)
    pl("lit_a", cx - 13, cy - 5, base=b)
    pl("lit_b", cx - 3, cy - 5, base=b)
    pl("lit_a", cx + 9, cy + 10, base=b)
    pl("lit_b", cx + 18, cy + 7, base=b)
    pl("lamp", cx + 4, cy - 5, base=b)
    pl("lamp", cx + 6, cy + 6, base=b)
    pl("palm_dusk", cx - 16, cy + 10, base=b)
    pl("palm_dusk", cx - 19, cy - 5, base=b)
    pl("palm_dusk", cx + 20, cy - 3, base=b)
    # 6 Vineyard Valley: windmill, vine rows (texture), cypress
    cx, cy = n[6]
    b = T[6]
    pl("windmill", cx - 14, cy + 10, base=b)
    pl("cypress", cx + 2, cy - 6, base=b)
    pl("cypress_s", cx + 2, cy + 10, base=b)
    pl("cypress_s", cx + 6, cy + 10, base=b)
    pl("cypress", cx - 7, cy - 8, base=b)
    pl("cypress", cx + 9, cy - 8, base=b)
    # 7 Redwood Pass: giant redwoods (fog added later)
    cx, cy = n[7]
    b = T[7]
    for (dx, dy, nm) in ((-9, 10, "redwood"), (13, 10, "redwood"), (19, 5, "redwood_xs"), (-3, 10, "redwood_xs"), (3, 10, "redwood_xs"),
                         (8, 9, "redwood_xs"), (-11, -6, "redwood_xs"), (-5, -6, "redwood_xs"),
                         (-16, -7, "redwood_xs"), (-14, 5, "redwood_xs")):
        pl(nm, cx + dx, cy + dy, base=b)
    # 8 Painted Desert: mesas, buttes, saguaros
    cx, cy = n[8]
    b = T[8]
    # (the Neon City road leaves to the right: the butte stands in the back wedge
    # between the two inland roads, the tall saguaro below the new road)
    pl("mesa", cx - 9, cy + 10, base=b)
    pl("butte", cx, cy - 7, base=b, nudge=1)
    pl("saguaro_s", cx + 3, cy + 10, base=b)
    pl("saguaro_s", cx - 16, cy + 2, base=b)
    pl("saguaro", cx + 12, cy + 10, base=b, nudge=1)
    pl("saguaro_s", cx + 19, cy + 10, base=b)
    # 9 Death Valley: salt flats (texture), black rocks, dead tree, skull
    cx, cy = n[9]
    b = T[9]
    pl("deadtree", cx + 13, cy + 4, base=b)
    pl("skull", cx + 4, cy + 10, base=b)
    pl("rock_jag", cx + 13, cy + 10, base=b)
    pl("rock_dk", cx + 20, cy + 9, base=b)
    pl("rock_dk2", cx + 16, cy - 7, base=b)
    pl("rock_dk2", cx - 4, cy + 10, base=b)
    # 11 Snowcap Pass: a snowy massif in the back, pines and rocks
    cx, cy = n[11]
    b = T[11]
    mountain(cx - 6, cy - 3, [(0, 9, 8, 7), (8, 6, 5, 4)], snow=5, seed=11)
    for (dx, dy) in ((-16, 9), (-10, 9), (12, 9), (17, 6), (6, 9), (-17, -2)):
        pl("pine", cx + dx, cy + dy, base=b)
    pl("rock_dk2", cx + 14, cy - 6, base=b)
    # 12 Gold Rush Town: saloon, water tower, cacti (goal B)
    cx, cy = n[12]
    b = T[12]
    pl("saloon", cx - 10, cy - 4, base=b)
    pl("watertower", cx + 3, cy - 5, base=b)
    pl("saloon", cx - 12, cy + 9, base=b)
    pl("saguaro_s", cx + 8, cy + 9, base=b)
    pl("saguaro_s", cx - 18, cy + 3, base=b)
    pl("flag", cx + 13, cy - 1, base=b, shadow=False)
    # 13 Crystal Lake: pines round the lake, a lit cabin (goal C)
    cx, cy = n[13]
    b = T[13]
    for (dx, dy) in ((4, -6), (-18, 2), (-14, 9), (6, 9), (12, 9)):
        pl("pine", cx + dx, cy + dy, base=b)
    pl("lit_a", cx - 4, cy + 9, base=b)
    pl("flag", cx + 13, cy - 1, base=b, shadow=False)
    # 14 Starlight Summit: the observatory on its peak (goal D)
    cx, cy = n[14]
    b = T[14]
    pl("observatory", cx - 8, cy - 3, base=b)
    for (dx, dy) in ((-17, 9), (5, 9), (10, 9), (-3, 9)):
        pl("pine", cx + dx, cy + dy, base=b)
    pl("flag", cx + 13, cy - 1, base=b, shadow=False)
    # 10 Neon City: dusk palms between the shop blocks (buildings: draw_neon_city)
    cx, cy = n[10]
    b = T[10]
    pl("palm_neon", cx - 1, cy + 10, base=b, nudge=1, shadow=False)
    pl("palm_neon", cx + 18, cy + 10, base=b, nudge=1, shadow=False)
    pl("flag", cx + 13, cy - 1, base=b, shadow=False, nudge=4)


def draw_interstate():
    """Thunder Highway: a wide interstate with a sign gantry on tile 5 (texture level)"""
    cx, cy = NODES[5]
    top = TOPMASK[5]
    for y in range(cy + 5, cy + 8):
        for x in range(cx - 26, cx - 3):
            if not top[y, x]:
                continue
            r = y - (cy + 5)
            col = ["#d8d6e0", "#3e3c4a", "#3e3c4a", "#3e3c4a", "#d8d6e0"][r]
            if r == 2:
                col = "#e8c030" if (x % 2 == 0) else "#3e3c4a"
            if r in (1, 3) and x % 4 == 0:
                col = "#9a98a8"
            img[y, x] = C(col)
    # little cars
    px(cx - 15, cy + 6, "#e83c3c")
    px(cx - 14, cy + 6, "#e83c3c")
    px(cx - 8, cy + 8, "#f0e040")
    px(cx - 7, cy + 8, "#f0e040")
    # sign gantry: two posts and a green board
    for y in range(cy + 1, cy + 8):
        px(cx - 17, y, "#2a2a3a")
        px(cx - 7, y, "#2a2a3a")
    for y in range(cy + 1, cy + 4):
        for x in range(cx - 16, cx - 7):
            edge = y in (cy + 1, cy + 3) or x in (cx - 16, cx - 8)
            px(x, y, "#e8f0e8" if edge else "#2a8a4a")
    px(cx - 13, cy + 2, "#e8f0e8")
    px(cx - 11, cy + 2, "#e8f0e8")


def draw_city():
    """Thunder Highway: towers on tile 5 (boxes lit from the upper right)"""
    cx, cy = NODES[5]
    towers = [(2, -6, 4, 10), (7, -6, 5, 14), (13, -7, 4, 11), (18, -7, 3, 8)]
    for (dx, dyb, w, h) in sorted(towers, key=lambda t: t[1]):
        x0, yb = cx + dx, cy + dyb
        ok = True
        for y in range(yb - h, yb + 2):
            for x in range(x0 - 1, x0 + w + 1):
                if KEEPOUT[y, x]:
                    ok = False
        if not ok:
            WARN.append(f"tower {dx},{dyb} touches road")
            continue
        for x in range(x0 - 2, x0 + w - 1):
            if not KEEPOUT[yb + 1, x]:
                shade(x, yb + 1)
        for y in range(yb - h, yb + 1):
            for x in range(x0, x0 + w + 1):
                side = x == x0 + w
                if y == yb - h:
                    col = "#d8dce8" if not side else "#eef0f8"
                elif side:
                    col = "#a8b4cc"
                else:
                    col = "#6c7896"
                    lx, ly = x - x0, y - (yb - h)
                    if lx % 2 == 1 and ly % 2 == 0 and 1 <= ly < h - 1:
                        col = "#f4e48a" if rh(x, y, 21) < 0.35 else "#9cb0d4"
                px(x, y, col)
                OCC[y, x] = True
            px(x0 - 1, y, "#3a3a58")
        hline(x0 - 1, x0 + w, yb + 1, "#3a3a58")


NEON_P, NEON_PL = "#ff4aa8", "#ffb4dc"     # hot pink tube + its hot core
NEON_C, NEON_CL = "#2ee6ff", "#c4fcff"     # cyan tube + core
NIGHT_OUT = "#150f24"


def glow(cx, cy, rx, ry, col, k=0.35, mask=None):
    """a flat pool of neon light spilled on the pavement (one solid tint step)"""
    c = np.array(C(col), float)
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if not (0 <= x < W and TOP_CALM <= y < H - BOT_CALM) or KEEPOUT[y, x] or OCC[y, x]:
                continue
            if mask is not None and not mask[y, x]:
                continue
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1:
                continue
            img[y, x] = (img[y, x] * (1 - k) + c * k).astype(np.uint8)


def _clear(x0, x1, y0, y1):
    return not KEEPOUT[max(y0, 0):y1 + 1, max(x0, 0):x1 + 1].any()


def night_tower(x0, yb, w, h, roof=None, sign=None, antenna=False, seed=0):
    """a night skyscraper: dark front face with lit windows (warm yellow / cyan),
    moonlit right side, optional neon roof trim, blade sign and beacon antenna"""
    if not _clear(x0 - 2, x0 + w + 1, yb - h - (4 if antenna else 1), yb + 1):
        WARN.append(f"night tower {x0},{yb} touches a road")
        return
    for y in range(yb - h, yb + 1):
        for x in range(x0, x0 + w + 1):
            side = x == x0 + w
            lx, ly = x - x0, y - (yb - h)
            if ly == 0:
                col = ("#7e72b0" if side else "#5c5290")
                if roof and not side:
                    col = roof
            elif side:
                col = "#4a4276"
                if ly % 3 == 1 and 1 < ly < h - 1 and rh(x, y, seed + 31) < 0.45:
                    col = "#9a8a5a"
            else:
                col = "#2a2550"
                if lx % 2 == 1 and ly % 2 == 0 and 1 <= ly < h - 1:
                    r = rh(x, y, seed + 21)
                    col = "#ffd25a" if r < 0.42 else ("#7ef0ff" if r < 0.62 else "#463f74")
            px(x, y, col)
            OCC[y, x] = True
        px(x0 - 1, y, NIGHT_OUT)
        OCC[y, x0 - 1] = True
    hline(x0 - 1, x0 + w, yb + 1, NIGHT_OUT)
    OCC[yb + 1, x0 - 1:x0 + w + 1] = True
    if roof:
        px(x0 + w, yb - h, NEON_PL if roof == NEON_P else NEON_CL)
    if sign:     # vertical neon blade sign hanging off the left wall
        tube, core = sign
        for k in range(4):
            y = yb - h + 3 + k
            px(x0 - 2, y, core if k in (1, 2) else tube)
            OCC[y, x0 - 2] = True
    if antenna:
        for k in range(1, 4):
            px(x0 + w // 2, yb - h - k, "#8a80b4")
        px(x0 + w // 2, yb - h - 4, "#ff3a4a")


def low_block(x0, yb, w, h, stripe, seed=0):
    """a low night-time shop block with a neon fascia and glowing shop windows"""
    if not _clear(x0 - 1, x0 + w, yb - h - 1, yb + 1):
        WARN.append(f"low block {x0},{yb} touches a road")
        return
    for y in range(yb - h, yb + 1):
        for x in range(x0, x0 + w + 1):
            side = x == x0 + w
            ly = y - (yb - h)
            if ly == 0:
                col = "#7e72b0" if side else "#5c5290"
            elif side:
                col = "#4a4276"
            elif ly == 1:
                col = stripe if (x - x0) % 4 != 3 else ("#ffb4dc" if stripe == NEON_P else "#c4fcff")
            elif ly == h - 1 and (x - x0) % 3 != 0:
                col = "#7ef0ff" if rh(x, y, seed) < 0.5 else "#ffd25a"
            else:
                col = "#2a2550"
            px(x, y, col)
            OCC[y, x] = True
        px(x0 - 1, y, NIGHT_OUT)
        OCC[y, x0 - 1] = True
    hline(x0 - 1, x0 + w, yb + 1, NIGHT_OUT)
    OCC[yb + 1, x0 - 1:x0 + w + 1] = True


GATE_L = [".PP", "PL.", "PL.", "PL.", "PL.", "PL.", "PL.", "PL.", "PL.", "kk."]
GATE_R = [r[::-1] for r in GATE_L]


def draw_neon_city():
    """Neon City (node 10): a mini downtown at night - towers with lit windows, neon
    trims, a neon gateway arch over the road out to Twilight Bay"""
    cx, cy = NODES[10]
    top = TOPMASK[10]
    # neon light pooled on the streets in front of the shops and at the gate
    glow(cx - 12, cy + 10, 7, 1.6, NEON_P, 0.30, top)
    glow(cx + 10, cy + 10, 6, 1.6, NEON_C, 0.28, top)
    glow(cx - 2, cy - 7, 10, 2.2, NEON_P, 0.22, top)
    # front: shop blocks with neon fascias, a dusk palm between them
    low_block(cx - 16, cy + 9, 8, 4, NEON_P, seed=3)
    low_block(cx + 7, cy + 9, 6, 4, NEON_C, seed=4)
    # back-left: a low block and a slim tower
    low_block(cx - 21, cy - 5, 3, 5, NEON_C, seed=5)
    night_tower(cx - 16, cy - 5, 4, 11, roof=NEON_C, seed=1)
    # back-right: the skyline (tallest with a beacon), a front tower overlapping it
    night_tower(cx + 7, cy - 6, 4, 12, roof=NEON_P, seed=2)
    night_tower(cx + 13, cy - 5, 4, 20, antenna=True, seed=3)
    night_tower(cx + 13, cy + 3, 4, 10, roof=NEON_P, sign=(NEON_P, NEON_PL), seed=4)
    # gateway arch: a pink and a cyan neon pylon either side of the road out to
    # Twilight Bay, each springing in toward the road (the crown stays open so
    # nothing ever covers the route)
    gb = cy - 8                                     # pylon base row (on the tile)
    gh = len(GATE_L)
    for rows, (tube, core), sgn in ((GATE_L, (NEON_P, NEON_PL), -1), (GATE_R, (NEON_C, NEON_CL), 1)):
        y0 = gb - gh + 1
        ko = [x for x in range(cx - 12, cx + 12) if KEEPOUT[y0, x]]
        if not ko:          # (a goal now: no road runs on through the arch)
            continue
        # sprite's inner column sits right against the road keep-out on its top row
        x0 = ko[0] - 3 if sgn < 0 else ko[-1] + 1
        pix = [(x0 + i, y0 + j, ch) for j, r in enumerate(rows) for i, ch in enumerate(r) if ch != "."]
        if any(KEEPOUT[y, x] or OCC[y, x] for x, y, ch in pix):
            WARN.append("gateway pylon touches the road")
            continue
        for x, y, ch in pix:
            px(x, y, {"P": tube, "L": core, "k": NIGHT_OUT}[ch])
            OCC[y, x] = True


def draw_moon():
    """a crescent moon with a few stars over Neon City (cf. the sun over the desert)"""
    cx, cy = NODES[10]
    mx, my = cx - 34, cy - 2
    # a full disc (lit crescent + dark earthshine) so it reads as a moon, not a glyph
    moon = ["..kkkk..", ".kMMddk.", "kMMmdddk", "kMmddddk", "kMmddddk", "kMMmdddk", ".kMMddk.", "..kkkk.."]
    cols = {"k": "#2a1e4a", "M": "#fff4c4", "m": "#e4cc84", "d": "#463c7a"}
    for j, row in enumerate(moon):
        for i, ch in enumerate(row):
            x, y = mx + i, my + j
            if ch != "." and not KEEPOUT[y, x]:
                px(x, y, cols[ch])
    for (dx, dy) in ((-4, 5),):
        x, y = mx + dx, my + dy
        if not (KEEPOUT[y - 1:y + 2, x - 1:x + 2].any() or OCC[y - 1:y + 2, x - 1:x + 2].any()):
            px(x, y, "#ffffff")
            for (ex, ey) in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                px(ex, ey, "#b4c8ff")


def draw_cloud():
    """rain cloud with a lightning bolt over Thunder Highway"""
    cx, cy = NODES[5]
    ox, oy = cx - 2, cy - 26
    blobs = [(0, 0, 5), (6, -2, 5), (12, 0, 4), (-6, 1, 4), (16, 2, 3)]
    m = np.zeros((H, W), bool)
    for bx, by, r in blobs:
        m |= ((X - (ox + bx)) ** 2 + ((Y - (oy + by)) * 1.6) ** 2) <= r * r
    m &= Y <= oy + 3
    if (m & KEEPOUT).any():
        WARN.append("cloud touches a road")
    m &= ~KEEPOUT
    # rain streaks (falling slightly left, wind from the sea)
    for i in range(-8, 21, 3):
        for k in range(2, 10):
            x, y = ox + i - k // 3, oy + 3 + k
            if (k + i) % 4 != 0 and 0 <= x < W and not KEEPOUT[y, x] and not m[y, x] and not OCC[y, x]:
                px(x, y, "#9cc4ec")
    top = m & ~np.roll(m, 1, 0)
    ys, xs = np.nonzero(m)
    for x, y in zip(xs, ys):
        rel = (y - (oy - 6)) / 10.0
        col = "#c8c8dc" if rel < 0.35 else ("#9a9ab4" if rel < 0.65 else "#6e6e8c")
        img[y, x] = C(col)
    paint(top, "#e8e8f4")
    out = dilate(m, 1) & ~m & ~KEEPOUT
    paint(out & (Y > oy - 2), "#3e3a58")
    for (x, y) in ((ox + 8, oy + 4), (ox + 7, oy + 5), (ox + 7, oy + 6), (ox + 8, oy + 6),
                   (ox + 9, oy + 6), (ox + 8, oy + 7), (ox + 8, oy + 8), (ox + 7, oy + 9)):
        if not KEEPOUT[y, x]:
            px(x, y, "#ffe85a")


def fog_band(wx, wy, L, h=2):
    """a drifting fog band as a flat half-transparent wash (SNES colour-math style)"""
    fog = np.array(C("#eef4f4"), float)
    for i in range(L):
        x = wx + i
        e = min(i, L - 1 - i)
        yy = wy + (1 if (i // 7) % 2 else 0)
        rows = [yy + k for k in range(h)]
        if e == 0:
            rows = rows[1:]
        if e >= 3 and (i // 5) % 3 == 1:
            rows = [yy - 1] + rows
        for k, y in enumerate(rows):
            if 0 <= x < W and not KEEPOUT[y, x]:
                a = 0.62 if k == 0 else 0.45
                img[y, x] = (img[y, x] * (1 - a) + fog * a).astype(np.uint8)


def draw_fog():
    """fog wisps drifting through Redwood Pass"""
    cx, cy = NODES[7]
    for (dx, dy, L) in ((-26, 4, 24), (4, 6, 20), (-16, 8, 18), (-24, -9, 20)):
        fog_band(cx + dx, cy + dy, L)


def draw_haze():
    """sun haze over the Painted Desert: a hot sun icon with a dithered glare + shimmer"""
    cx, cy = NODES[8]
    sx, sy = cx - 24, cy - 1
    for y in range(sy - 12, sy + 13):
        for x in range(sx - 20, sx + 21):
            if not (0 <= x < W and TOP_CALM <= y < H - BOT_CALM) or KEEPOUT[y, x] or OCC[y, x]:
                continue
            d = math.hypot((x - sx) / 1.3, y - sy)
            if 6.0 < d < 11.0 and (x % 2 == 0 and y % 2 == 0):
                r, g, b = [int(v) for v in img[y, x]]
                img[y, x] = (min(255, r + 20), min(255, g + 22), min(255, b + 10))
            elif 4.5 < d <= 6.0 and (x + y) % 2 == 0:
                r, g, b = [int(v) for v in img[y, x]]
                img[y, x] = (min(255, r + 30), min(255, g + 30), min(255, b + 14))
    disc = ["..kkk..", ".kYYyk.", "kYYyyyk", "kYyyyok", "kyyyook", ".kyook.", "..kkk.."]
    cols = {"k": "#f08a30", "Y": "#fffbe0", "y": "#ffe070", "o": "#ffc040"}
    for j, row in enumerate(disc):
        for i, ch in enumerate(row):
            if ch != ".":
                px(sx - 3 + i, sy - 3 + j, cols[ch])
    for (dx, dy) in ((0, -5), (0, -6), (0, 5), (0, 6), (-6, 0), (-7, 0), (6, 0), (7, 0),
                     (-5, -4), (5, -4), (-5, 4), (5, 4)):
        x, y = sx + dx, sy + dy
        if not KEEPOUT[y, x]:
            px(x, y, "#ffd050" if max(abs(dx), abs(dy)) <= 5 else "#ffb040")
    # heat shimmer over the desert floor
    top = TOPMASK[8]
    for (lx, ly, L) in ((cx - 15, cy + 2, 7), (cx + 6, cy + 4, 8), (cx - 6, cy - 4, 5)):
        for i in range(L):
            x, y = lx + i, ly + (1 if (i // 2) % 2 else 0)
            if top[y, x] and not KEEPOUT[y, x] and not OCC[y, x]:
                px(x, y, "#ffd8a0")


def draw_sea_extras():
    place("sailboat", 128, 157, check=False, shadow=False)
    place("sailboat", 238, 157, check=False, shadow=False, flip=True)
    # a wooden pier out from Surfside's beach, with a lamp at its end
    x0 = NODES[2][0] + 8
    for y in range(SHORE[x0] - 4, 157):
        for i, col in enumerate(("#6a4228", "#c08a52", "#a87444", "#6a4228")):
            px(x0 + i, y, col)
        if y % 3 == 0:
            px(x0 + 1, y, "#8a5a38")
            px(x0 + 2, y, "#8a5a38")
        if y % 3 == 1 and y > SHORE[x0] + 1:
            px(x0 + 4, y, "#1e4a8a")
    # sea arch off Coral Bluffs
    place("seaarch", NODES[1][0] - 10, 157, check=False, shadow=False)
    # lighthouse on the far point past Twilight Bay, with a dusk beam out to sea
    lx = 312
    place("lighthouse", lx, 146, check=False, shadow=True)
    for i in range(1, 9):
        for (x, y) in ((lx - 2 - i, 136 + i // 3), (lx - 2 - i, 137 + i // 3)):
            if (x + y + i) % 2 == 0 or i < 3:
                px(x, y, "#fff2b0" if i < 5 else "#d8c8a0")
    # dusk reflections of the bay lights
    for (x, y) in ((262, 153), (263, 153), (272, 155), (280, 152), (281, 152), (290, 156)):
        px(x, y, "#ffe48a")


# ----------------------------------------------------------------------------
# output
# ----------------------------------------------------------------------------
def save():
    os.makedirs(OUT, exist_ok=True)
    assert img.shape == (H, W, 3)
    im = Image.fromarray(img, "RGB")
    im.save(os.path.join(OUT, "course_map.png"))
    data = {"w": W, "h": H,
            "nodes": {str(n): list(NODES[n]) for n in sorted(NODES)},
            "edges": {f"{a}-{b}": polyline(a, b) for a, b in EDGES}}
    with open(os.path.join(OUT, "course_map.json"), "w") as f:
        json.dump(data, f, indent=1)
    big = im.resize((W * ZOOM, H * ZOOM), Image.NEAREST)
    big.save(os.path.join(HERE, "preview_map.png"))
    dbg = big.copy()
    dr = ImageDraw.Draw(dbg)
    for key, pts in data["edges"].items():
        sp = [(x * ZOOM + ZOOM // 2, y * ZOOM + ZOOM // 2) for x, y in pts]
        dr.line(sp, fill=(255, 0, 0), width=1)
    for n, (x, y) in data["nodes"].items():
        cx, cy = x * ZOOM + ZOOM // 2, y * ZOOM + ZOOM // 2
        dr.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=(255, 230, 0))
    dr.line([(0, TOP_CALM * ZOOM), (W * ZOOM, TOP_CALM * ZOOM)], fill=(0, 255, 255))
    dr.line([(0, (H - BOT_CALM) * ZOOM), (W * ZOOM, (H - BOT_CALM) * ZOOM)], fill=(0, 255, 255))
    dbg.save(os.path.join(HERE, "preview_map_debug.png"))


def sprite_sheet():
    names = list(SPR)
    cell = 22
    cols = 10
    rows = (len(names) + cols - 1) // cols
    sh = Image.new("RGB", (cols * cell, rows * cell), (226, 180, 140))
    for k, nm in enumerate(names):
        r, leg = SPR[nm]
        ox, oy = (k % cols) * cell + 2, (k // cols) * cell + 2
        for j, row in enumerate(r):
            for i, ch in enumerate(row):
                if ch != ".":
                    sh.putpixel((ox + i, oy + j), C(leg[ch]))
    sh.resize((sh.width * 6, sh.height * 6), Image.NEAREST).save(os.path.join(HERE, "preview_sprites.png"))


def main():
    draw_ground()
    draw_sea()
    draw_filler()
    flush_sprites()
    draw_tiles()
    draw_interstate()
    draw_roads()
    draw_city()
    draw_neon_city()
    dress()
    draw_sea_extras()
    flush_sprites()
    draw_fog()
    draw_haze()
    draw_cloud()
    draw_moon()
    save()
    sprite_sheet()
    for w in NOTE:
        print("note", w)
    for w in WARN:
        print("WARN", w)
    print("nodes:", {k: NODES[k] for k in sorted(NODES)})


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Velvet Cruise - vehicle sprite generator.

Draws every vehicle sprite procedurally / from hand-authored pixel stamps
(Pillow + numpy only) and writes PNGs to ./out plus out/manifest.json, and
preview sheets (4x nearest zoom, over asphalt grey and sky blue) to
./preview_*.png.

View: directly behind and slightly above. Bottom row = tyre contact line.
Scale: a 2 m wide car is ~80 px wide. Light: warm, high, ahead-right.

Run:  python3 make_vehicles.py
"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")


# ---------------------------------------------------------------------------
# tiny pixel toolkit
# ---------------------------------------------------------------------------
def C(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


CLEAR = (0, 0, 0, 0)


class Canvas:
    """RGBA canvas. Optional per-row x offset (used for the turn shear)."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), np.uint8)
        self.xoff = None  # function y -> int, applied to all drawing

    # -- basic -------------------------------------------------------------
    def _ox(self, y):
        return self.xoff(y) if self.xoff else 0

    def px(self, x, y, c):
        if c is None:
            return
        x = int(x) + self._ox(int(y))
        y = int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = c

    def get(self, x, y):
        x = int(x) + self._ox(int(y))
        y = int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            return tuple(int(v) for v in self.a[y, x])
        return CLEAR

    def hl(self, x0, x1, y, c):
        if x0 > x1:
            x0, x1 = x1, x0
        for x in range(int(x0), int(x1) + 1):
            self.px(x, y, c)

    def vl(self, x, y0, y1, c):
        if y0 > y1:
            y0, y1 = y1, y0
        for y in range(int(y0), int(y1) + 1):
            self.px(x, y, c)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1) + 1):
            self.hl(x0, x1, y, c)

    def frame(self, x0, y0, x1, y1, c):
        self.hl(x0, x1, y0, c)
        self.hl(x0, x1, y1, c)
        self.vl(x0, y0, y1, c)
        self.vl(x1, y0, y1, c)

    def poly(self, pts, c):
        """Scanline fill, pixel-centre test."""
        ys = [p[1] for p in pts]
        n = len(pts)
        for y in range(int(min(ys)), int(max(ys)) + 1):
            yc = y + 0.5
            xs = []
            for i in range(n):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % n]
                if (y0 <= yc < y1) or (y1 <= yc < y0):
                    xs.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                xa = int(np.ceil(xs[i] - 0.5))
                xb = int(np.floor(xs[i + 1] - 0.5))
                self.hl(xa, xb, y, c) if xa <= xb else None

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx = (x + 0.5 - cx) / rx
                dy = (y + 0.5 - cy) / ry
                if dx * dx + dy * dy <= 1.0:
                    self.px(x, y, c)

    def stamp(self, rows, legend, ox, oy, flip=False):
        """ASCII stamp: each char maps through legend; '.'/' ' = skip."""
        for j, row in enumerate(rows):
            if flip:
                row = row[::-1]
            for i, ch in enumerate(row):
                if ch in ". ":
                    continue
                c = legend[ch]
                self.px(ox + i, oy + j, c)

    # -- whole-image ops (ignore xoff) -------------------------------------
    def mask(self):
        return self.a[:, :, 3] > 0

    def outline(self, c, sides="lrtb", only_if=None):
        """Paint c on transparent pixels that touch opaque ones."""
        m = self.mask()
        add = np.zeros_like(m)
        if "l" in sides:  # pixel to the left of opaque
            add[:, :-1] |= m[:, 1:]
        if "r" in sides:
            add[:, 1:] |= m[:, :-1]
        if "t" in sides:
            add[:-1, :] |= m[1:, :]
        if "b" in sides:
            add[1:, :] |= m[:-1, :]
        add &= ~m
        self.a[add] = c

    def recolor_edge(self, c, sides="lrtb", protect=()):
        """Recolour opaque pixels that touch transparency (inner outline)."""
        m = self.mask()
        edge = np.zeros_like(m)
        t = ~m
        if "l" in sides:
            edge[:, 1:] |= t[:, :-1]
            edge[:, 0] |= True
        if "r" in sides:
            edge[:, :-1] |= t[:, 1:]
            edge[:, -1] |= True
        if "t" in sides:
            edge[1:, :] |= t[:-1, :]
            edge[0, :] |= True
        if "b" in sides:
            edge[:-1, :] |= t[1:, :]
        edge &= m
        for pc in protect:
            same = np.all(self.a == np.array(pc, np.uint8), axis=2)
            edge &= ~same
        self.a[edge] = c

    def image(self):
        return Image.fromarray(self.a, "RGBA")

    def bbox(self):
        m = self.mask()
        ys, xs = np.nonzero(m)
        return xs.min(), ys.min(), xs.max(), ys.max()


def crop_to_content(cv, pad_x=0):
    """Return new canvas cropped so the bottom row touches the ground and the
    object is centred horizontally (pad_x extra columns each side)."""
    x0, y0, x1, y1 = cv.bbox()
    w = x1 - x0 + 1 + 2 * pad_x
    h = y1 - y0 + 1
    out = Canvas(w, h)
    out.a[:, pad_x:pad_x + (x1 - x0 + 1)] = cv.a[y0:y1 + 1, x0:x1 + 1]
    return out


def place_bottom_centre(src, w, h, dx=0):
    """Put src content into a WxH canvas, bottom aligned, centred (+dx)."""
    x0, y0, x1, y1 = src.bbox()
    cw, ch = x1 - x0 + 1, y1 - y0 + 1
    out = Canvas(w, h)
    ox = (w - cw) // 2 + dx
    oy = h - ch
    out.a[oy:oy + ch, ox:ox + cw] = src.a[y0:y1 + 1, x0:x1 + 1]
    return out


# ---------------------------------------------------------------------------
# shared palettes
# ---------------------------------------------------------------------------
# dark neutrals (tyres, grilles, undercarriage) - cool purple tinted
K0 = C("#120c18")
K1 = C("#211a2a")
K2 = C("#342b3f")
K3 = C("#4d4459")
K4 = C("#6e6479")
# chrome
S0 = C("#55556c")
S1 = C("#9294aa")
S2 = C("#cfd0de")
S3 = C("#fbf8ff")
# unlit tail-light lens
T0 = C("#3c0a1e")
T1 = C("#5e1226")
T2 = C("#7e1c30")
T3 = C("#b33a48")
# unlit amber indicator
A0 = C("#5a2a12")
A1 = C("#8a4a18")
A2 = C("#c07a30")
# brake lit
BR0 = C("#ff3a20")
BR1 = C("#ffb070")
BR2 = C("#fff0c0")

# ---------------------------------------------------------------------------
# PLAYER CAR
# ---------------------------------------------------------------------------
PW, PH = 88, 48

# red body ramp (dark -> light), hue shifted: shadows purple, lights orange
R0 = C("#4a0a14")
R1 = C("#6c0e1c")
R2 = C("#8e1420")
R3 = C("#c42a26")
R4 = C("#e8483a")
R5 = C("#ff8a5a")
R6 = C("#ffc890")
ROUT = C("#2a0a1a")

# occupants
SK0 = C("#8c4a3a")
SK1 = C("#c87a5a")
SK2 = C("#f2b088")
HB0 = C("#2e160e")
HB1 = C("#5c2e16")
HB2 = C("#8a4a20")
HB3 = C("#b8763a")
SH0 = C("#16266a")
SH1 = C("#2848b4")
SH2 = C("#4a7ce8")
SH3 = C("#94c0ff")
YH0 = C("#80480e")
YH1 = C("#c4861a")
YH2 = C("#eebc2a")
YH3 = C("#ffe468")
YH4 = C("#fff8c4")
PT1 = C("#e0e0f0")  # passenger top (white)
PT0 = C("#a0a0c0")
GL0 = C("#4a6aa0")
GL1 = C("#9cc0ec")
GL2 = C("#e8f4ff")


PCX_WORK = 128  # wide work canvas, cropped/centred into 88x48 at the end
CREASE = 22     # deck rear edge (rows <= CREASE are sheared in turn frames)
TL_T, TL_B = 24, 31  # taillight housing rows (lens rows 25..30)


def player_geom(view):
    """Rear-face edges, flank, shear for each view (work-canvas coords).

    Steering LEFT = nose points left: the rear face swings right and gets a
    little narrower, everything forward of the rear face (deck, cabin,
    occupants) slides left, and the car's LEFT flank - now turned toward the
    camera - shows as a sliver on the left.  RIGHT is the mirror logic.
    """
    if view == "straight":
        return dict(FL=24, FR=103, flank=0, fw=0, k=0.0)
    if view == "left":
        return dict(FL=24, FR=97, flank=-1, fw=8, k=-0.36)
    return dict(FL=24, FR=97, flank=1, fw=8, k=0.36)


def draw_player(view, frame):
    """Returns (body_canvas 88x48, brake_overlay 88x48)."""
    g = player_geom(view)
    FL, FR, flank, fw, k = g["FL"], g["FR"], g["flank"], g["fw"], g["k"]
    cv = Canvas(PCX_WORK, PH)
    cx = (FL + FR) / 2.0
    icx = int(np.floor(cx))  # left-of-centre column

    def Lx(d):
        return FL + d

    def Rx(d):
        return FR - d

    def side_x(side, d):
        return Lx(d) if side < 0 else Rx(d)

    def lit(side, dark, light):
        """left-facing surfaces are shaded, right-facing are lit."""
        return dark if side < 0 else light

    # =================================================================
    # LOWER: tyres, undercarriage, rear face (never sheared)
    # =================================================================
    cv.xoff = None
    TY_T, tw = 37, 12
    tyres = []
    for side in (-1, 1):
        x0 = Lx(1) if side < 0 else Rx(1) - tw + 1
        x1 = x0 + tw - 1
        tyres.append((x0, x1))
        cv.rect(x0, TY_T, x1, PH - 1, K1)
        for y in range(TY_T + 1, PH - 1, 2):
            cv.hl(x0 + 1, x1 - 1, y, K0)
        cv.vl(x0, TY_T, PH - 1, K0)
        cv.vl(x1, TY_T, PH - 1, K0)
        if side > 0:  # lit shoulder facing right
            cv.vl(x1 - 1, TY_T + 1, PH - 2, K3)
            cv.vl(x1 - 2, TY_T + 1, PH - 2, K2)
        else:
            cv.vl(x1 - 1, TY_T + 1, PH - 2, K2)
        cv.px(x0, PH - 1, CLEAR)
        cv.px(x1, PH - 1, CLEAR)
    # undercarriage shadow strip
    ux0, ux1 = tyres[0][1] + 1, tyres[1][0] - 1
    cv.rect(ux0, 38, ux1, 45, K0)
    cv.hl(ux0, ux1, 38, K1)
    cv.hl(ux0 + 1, ux1 - 1, 46, K0)
    for fx in (icx - 9, icx - 4, icx + 5, icx + 10):
        cv.vl(fx, 41, 44, K1)

    # ---- rear face body rows 23..39
    cv.rect(FL, 23, FR, 37, R3)
    cv.hl(FL + 1, FR - 1, 38, R1)
    cv.hl(FL + 2, FR - 2, 39, R0)
    cv.rect(FL, 33, FR, 37, R2)          # lower panel (in shade)
    cv.hl(FL, FR, 32, R4)                # lower crease highlight
    cv.hl(icx + 8, FR - 3, 32, R5)
    cv.hl(FL, FR, 37, R1)
    cv.vl(FL, 23, 37, R2)                # left edge shaded
    cv.vl(FR, 23, 32, R4)                # right edge lit
    cv.vl(FR, 33, 37, R3)

    # ---- taillights rows 24..31
    tlw = 18
    lights = []
    for side in (-1, 1):
        x0 = Lx(1) if side < 0 else Rx(1) - tlw + 1
        x1 = x0 + tlw - 1
        lights.append((x0, x1))
        cv.rect(x0, TL_T, x1, TL_B, K0)
        lx0, lx1 = x0 + 1, x1 - 1  # lens span
        # amber indicator on the outer end
        if side < 0:
            a0, a1 = lx0, lx0 + 2
            r0_, r1_ = a1 + 2, lx1
        else:
            a0, a1 = lx1 - 2, lx1
            r0_, r1_ = lx0, a0 - 2
        cv.rect(a0, TL_T + 1, a1, TL_B - 1, A0)
        cv.hl(a0, a1, TL_T + 1, A1)
        cv.hl(a0, a1, TL_T + 2, A1)
        cv.px(a1, TL_T + 1, A2)
        # red lens
        cv.rect(r0_, TL_T + 1, r1_, TL_B - 1, T1)
        cv.hl(r0_, r1_, TL_T + 1, T2)
        cv.hl(r0_, r1_, TL_T + 2, T2)
        cv.hl(r0_, r1_, TL_T + 4, T0)
        cv.hl(r0_, r1_, TL_B - 1, T0)
        mid = (r0_ + r1_ + 1) // 2
        cv.vl(mid, TL_T + 1, TL_B - 1, T0)
        # glints: short warm streaks at the top-right of each half
        for gx in (mid - 2, r1_ - 1):
            cv.px(gx, TL_T + 1, T3)
            cv.px(gx + 1, TL_T + 1, T3)
            cv.px(gx + 1, TL_T + 2, T3)

    # ---- grille between the lights
    gx0, gx1 = lights[0][1] + 1, lights[1][0] - 1
    cv.rect(gx0, TL_T, gx1, TL_B, K0)
    for y in (TL_T + 1, TL_T + 3, TL_T + 5):
        cv.hl(gx0, gx1, y, K2)
        cv.hl(icx + 3, gx1, y, K3)
    cv.hl(gx0, gx1, TL_B - 1, K1)
    # emblem (generic round badge)
    cv.stamp([".ab.",
              "acdb",
              "bdeb",
              ".bb."], {"a": S3, "b": S1, "c": YH4, "d": YH2, "e": YH1},
             icx - 1, TL_T + 2)

    # ---- plate recess rows 33..38 (blank)
    p0, p1 = icx - 9, icx + 10
    cv.rect(p0, 33, p1, 38, ROUT)
    cv.rect(p0 + 1, 34, p1 - 1, 38, R1)
    cv.rect(p0 + 2, 35, p1 - 2, 37, R2)
    cv.hl(p0 + 2, p1 - 2, 35, R3)
    cv.hl(p0 + 1, p1 - 1, 38, R0)

    # ---- exhaust pairs
    tip = [".ab.",
           "bccd",
           "bccd",
           ".dd."]
    for base in (icx - 24, icx + 15):
        cv.rect(base - 1, 38, base + 9, 41, K0)
        for j in range(2):
            cv.stamp(tip, {"a": S3, "b": S2, "c": K0, "d": S0},
                     base + j * 5, 38)

    # =================================================================
    # FLANK sliver (side of the car turned toward the camera)
    # =================================================================
    if flank:
        draw_player_flank(cv, flank, fw, FL, FR)

    # =================================================================
    # UPPER: deck, haunches, cockpit, windscreen (sheared)
    # =================================================================
    def shear(y):
        if y > CREASE:
            return 0
        return int(round(min(CREASE + 1 - y, 16) * k))

    cab = shear(0)  # rigid offset of the cabin contents

    cv.xoff = shear
    # top profile per column from the outer edge
    ytop = [17, 15, 14, 13, 12, 12, 11, 11, 11, 11, 11, 11, 11, 11, 10, 9, 8,
            8, 8]
    for side in (-1, 1):
        for d, yt in enumerate(ytop):
            cv.vl(side_x(side, d), yt, CREASE, R3)
    cv.rect(Lx(len(ytop)), 16, Rx(len(ytop)), CREASE, R3)

    for side in (-1, 1):
        sx = lambda d: side_x(side, d)
        # outer slope
        for d in range(3):
            cv.vl(sx(d), ytop[d], CREASE - 1, lit(side, R2, R4))
        cv.vl(sx(0), ytop[0], CREASE - 1, lit(side, R1, R4))
        if side > 0:
            cv.vl(sx(1), ytop[1] + 1, CREASE - 2, R5)
        # ridge highlight across the haunch top
        for d in range(1, 14):
            cv.px(sx(d), ytop[d], lit(side, R4, R5))
        for d in range(4, 12):
            cv.px(sx(d), ytop[d] + 1, R4)
        if side > 0:
            for d in range(6, 10):
                cv.px(sx(d), ytop[d], R6)
        # sill / door top rising to the A-pillar
        for d in range(13, 19):
            cv.px(sx(d), ytop[d], lit(side, R4, R5))
        # cockpit inner wall (inside the car, in shade)
        for d in range(16, 19):
            cv.vl(sx(d), ytop[d] + 1, 15, R2)
        cv.vl(sx(18), 9, 15, R1)
        # haunch inner edge streak running down to the deck
        for i, d in enumerate(range(13, 17)):
            cv.px(sx(d), 12 + i, lit(side, R4, R2))

    # cockpit interior between the sills
    cv.rect(Lx(19), 9, Rx(19), 15, K1)
    # engine lid outline + louvres
    lid0, lid1 = Lx(22), Rx(22)
    cv.hl(lid0, lid1, 18, R2)
    cv.hl(lid0, lid1, 19, R3)
    cv.hl(lid0, lid1, 20, R3)
    cv.hl(lid0 + 2, lid1 - 2, 19, R2)
    cv.hl(lid0, lid1, 21, R4)
    # deck rear edge highlight (crease)
    cv.hl(Lx(1), Rx(1), CREASE, R4)
    cv.hl(icx + 6, Rx(4), CREASE, R5)
    cv.hl(icx + 16, Rx(8), CREASE, R6)
    cv.hl(Lx(8), Lx(14), CREASE, R5)

    # ---- everything in the cabin moves rigidly
    cv.xoff = lambda y: cab if y <= 16 else shear(y)
    # dashboard top seen through the windscreen
    cv.rect(Lx(19), 7, Rx(19), 8, K1)
    cv.hl(Lx(20), Rx(20), 7, K2)
    # A-pillars + windscreen top bar
    for side in (-1, 1):
        for i in range(7):
            yy = 7 - i
            d = 18 + (i + 1) // 2
            x = side_x(side, d)
            cv.px(x, yy, lit(side, R3, R4))
            cv.px(x - side, yy, ROUT)
    tb0, tb1 = Lx(22), Rx(22)
    cv.hl(tb0, tb1, 1, R3)
    cv.hl(icx + 4, tb1 - 1, 1, R4)
    cv.hl(tb0 + 1, tb1 - 1, 2, ROUT)
    cv.hl(tb0, tb1, 0, CLEAR)
    # interior rear-view mirror
    cv.stamp(["abbbbbba",
              ".accdda."], {"a": K0, "b": K2, "c": K3, "d": GL1}, icx - 3, 3)

    # side mirrors (glass faces backward toward the camera)
    for side in (-1, 1):
        m = [".abbbbba",
             "abccddeb",
             "bccdddeb",
             "bbccddbb",
             ".ooooooo"]
        leg = {"a": ROUT, "b": lit(side, R2, R4), "c": GL0, "d": GL1,
               "e": GL2, "o": R1}
        mx = Lx(6) if side < 0 else Rx(6) - 7
        cv.stamp(m, leg, mx, 3)
        st = Lx(14) if side < 0 else Rx(16)
        cv.hl(st, st + 2, 6, lit(side, R2, R3))
        cv.hl(st, st + 2, 7, R1)

    # occupants, then the seat backs in front of them
    draw_driver(cv, Lx(28), frame)
    draw_passenger(cv, Rx(28), frame)
    for side in (-1, 1):
        sx0 = Lx(21) if side < 0 else Rx(21) - 14
        draw_seat(cv, sx0, 12, side)
    cv.rect(Lx(36), 13, Rx(36), 15, K1)
    cv.hl(Lx(36), Rx(36), 13, K2)
    # cockpit rear rim (in front of the seats)
    cv.xoff = shear
    cv.hl(Lx(17), Rx(17), 16, R1)
    cv.hl(Lx(17), Rx(17), 17, R4)
    cv.hl(icx + 2, Rx(18), 17, R5)

    cv.xoff = None

    # ---- inner outline on the silhouette sides (keeps 80 px width)
    cv.recolor_edge(ROUT, sides="l")
    cv.recolor_edge(ROUT, sides="r", protect=(R4, R5, R6, K3, GL2, YH3))

    # ---- brake overlay: every lens pixel lights up
    br = Canvas(PCX_WORK, PH)
    lens = np.zeros((PH, PCX_WORK), bool)
    for tc in (T0, T1, T2, T3):
        lens |= np.all(cv.a == np.array(tc, np.uint8), axis=2)
    br.a[lens] = BR0
    for (x0, x1) in lights:
        xs = [x for x in range(x0, x1 + 1) if lens[TL_T + 2, x]]
        if not xs:
            continue
        a, b = xs[0], xs[-1]
        for y in (TL_T + 1, TL_T + 2, TL_T + 3):
            for x in range(a + 1, b):
                if lens[y, x]:
                    br.px(x, y, BR1)
        m = (a + b) // 2
        for x in range(a + 3, b - 2):
            if lens[TL_T + 2, x]:
                br.px(x, TL_T + 2, BR2)

    # ---- crop into the 88x48 frame (centred on the whole silhouette)
    x0, y0, x1, y1 = cv.bbox()
    w = x1 - x0 + 1
    assert w <= PW, (view, w)
    ox = (PW - w) // 2 - x0
    body = Canvas(PW, PH)
    brake = Canvas(PW, PH)
    body.a[:, x0 + ox:x1 + 1 + ox] = cv.a[:, x0:x1 + 1]
    brake.a[:, x0 + ox:x1 + 1 + ox] = br.a[:, x0:x1 + 1]
    return body, brake


def draw_player_flank(cv, side, fw, FL, FR):
    """Sliver of the car's side turned toward the camera: rear fender with
    slanted side strakes, wheel arch and the outer face of the rear wheel.
    Authored for the LEFT flank (col 0 = far end); mirrored + relit for the
    right flank."""
    shade = side < 0  # the left flank faces away from the sun
    if shade:
        P = dict(h=R2, m=R1, l=R0, f=ROUT, g=R2, k=K0, t=K1, u=K2,
                 r=S0, R=S1, w=S2)
    else:
        P = dict(h=R4, m=R3, l=R2, f=R1, g=R5, k=K0, t=K1, u=K3,
                 r=S1, R=S2, w=S3)
    W = 8
    g = [["." for _ in range(W)] for _ in range(PH)]
    for c in range(W):
        r = (W - 1 - c) // 2          # rise toward the far end (2:1)
        for y in range(12, 39 - r):
            g[y][c] = "m"
        for y in range(14, 18 - r):
            g[y][c] = "h"
        for j in range(4):            # strakes: lit blade over dark gap
            y = 20 + 3 * j - r
            g[y][c] = "g"
            g[y + 1][c] = "f"
        g[38 - r][c] = "l"
        g[37 - r][c] = "l"
    # wheel in the arch (far columns), tyre shoulder behind it
    wheel = [".kkkkk",
             "kttttt",
             "ktrRRt",
             "trRwRt",
             "trRRrt",
             "trruRt",
             "trrrrt",
             "ktrrrt",
             "kttttt",
             "kttttk",
             ".kkkk."]
    for j, row in enumerate(wheel):
        for c, ch in enumerate(row):
            y = 35 + j - (W - 1 - c) // 3
            if ch != ".":
                g[y][c] = ch
    for c in (6, 7):                  # rear tyre shoulder under the body
        for y in range(39, PH):
            g[y][c] = "t" if c == 6 else "k"
        g[PH - 1][6] = "k"
    for y in range(PH):
        for c in range(W):
            ch = g[y][c]
            if ch == ".":
                continue
            x = (FL - W + c) if side < 0 else (FR + W - c)
            cv.px(x, y, P[ch])


def draw_seat(cv, x0, y0, side):
    seat = [
        "..ooooooooooo..",
        ".o44555555544o.",
        "o3444444444443o",
        "o3333333133332o",
        "o2333333133322o",
        "o2222222122222o",
    ]
    if side < 0:
        leg = {"o": ROUT, "1": R1, "2": R2, "3": R3, "4": R3, "5": R4}
    else:
        leg = {"o": ROUT, "1": R1, "2": R2, "3": R3, "4": R4, "5": R5}
    cv.stamp(seat, leg, x0, y0)


def draw_driver(cv, hx, frame):
    """Back of the driver's head + blue shirt shoulders. hx = head centre."""
    shirt = [
        "......aasssfaa.....",
        "...aabbbaaaabbbbaa.",
        "..abbbbbbbbbcccdba.",
        ".abbbbbbbbbbccccdba",
        "abbbbbbbbbbbbccddba",
    ]
    if frame == 1:  # shirt ripples in the wind
        shirt[2] = "..abbbbbbbbccccdba."
        shirt[3] = ".abbbbbbbbbbbcccdba"
    cv.stamp(shirt, {"a": SH0, "b": SH1, "c": SH2, "d": SH3, "s": SK1,
                     "f": SK2}, hx - 9, 8)
    head = [
        "...abbbb..",
        "..abbccdb.",
        ".abbcccddb",
        "abbccccddb",
        "abbbccccdb",
        "abbbbcccbb",
        "aabbbbbbba",
        ".aabbbbbaa",
        "..aaabbaa.",
    ]
    cv.stamp(head, {"a": HB0, "b": HB1, "c": HB2, "d": HB3}, hx - 5, 0)
    # ears
    cv.px(hx - 6, 4, SK1)
    cv.px(hx - 6, 5, SK0)
    cv.px(hx + 5, 4, SK2)
    cv.px(hx + 5, 5, SK1)


def draw_passenger(cv, hx, frame):
    """Blonde passenger; long golden hair streaming out to the right."""
    top = [
        "...ssaaaaaaa...",
        ".asfbbbbbbbbba.",
        "afbbbbbbbbbbbba",
        "abbbbbbbbbbbbba",
    ]
    cv.stamp(top, {"a": PT0, "b": PT1, "s": SK1, "f": SK2}, hx - 7, 9)
    hair0 = [
        "...abbba.............",
        "..abcddcb............",
        ".abccdedcbddd........",
        "abcccddddccccddd.....",
        "abccccdddbbbbbbccd...",
        "abcccccdcbbccdd......",
        "abbcccccbbccccddd....",
        "abbbcccbbbbbbbbccdd..",
        ".abbbcbbbabbbbbbbbaa.",
        ".aabbbbbaccdd........",
        "..aabbbbaabccd.......",
        "...aaaba...aabc......",
    ]
    hair1 = [
        "...abbba.............",
        "..abcddcb............",
        ".abccdedcbdddd.......",
        "abcccddddcccccdd.....",
        "abccccdddbbbbbbcd....",
        "abcccccdcbbccddd.....",
        "abbcccccbbccccdddd...",
        "abbbcccbbbbbbbbbccd..",
        ".abbbcbbbabbbbbbbaaa.",
        ".aabbbbbacccd........",
        "..aabbbbaabccdd......",
        "...aaaba...aab.......",
    ]
    hair = hair0 if frame == 0 else hair1
    cv.stamp(hair, {"a": YH0, "b": YH1, "c": YH2, "d": YH3, "e": YH4},
             hx - 5, 0)


# ---------------------------------------------------------------------------
# RIVAL TRAFFIC
# ---------------------------------------------------------------------------
# Each rival is drawn straight onto a canvas of its final size, symmetric
# about the centre line (d = inset from the left / right edge), and relit
# asymmetrically: left-facing surfaces take the shade colour, right-facing
# and top surfaces the warm lit colours.  Paintwork is drawn on its own layer
# so the selective outline only touches the body; tyres and undercarriage sit
# on a layer underneath.  Taillights are unlit (dark red).

def ramp(o, *cols):
    """Body ramp: 'o' = outline, 0 (darkest) .. n (lightest)."""
    d = {"o": C(o)}
    for i, c in enumerate(cols):
        d[i] = C(c)
    return d


#                  outline    0          1          2          3          4          5          6
BLUE = ramp("#130f2e", "#1c1a4c", "#232c78", "#2b44a4", "#3862cc", "#4e90ea", "#80c4f6", "#e4fbf0")
GREEN = ramp("#0d1a1e", "#10302c", "#144a36", "#1b6a40", "#2a904a", "#4fb854", "#94dc6c", "#e2f8aa")
WHITE = ramp("#2a2640", "#56526e", "#7e7c98", "#a6a6be", "#cfd0de", "#ebeaf0", "#fffbf0", "#ffffff")
YELLOW = ramp("#3a1a12", "#6a3214", "#a05814", "#d08818", "#f0b424", "#fcd640", "#fff27a", "#fffcd0")
BLACK = ramp("#07050c", "#0e0a16", "#171222", "#221b30", "#2e2640", "#483e5c", "#7e7090", "#f2e2d6")
SILVER = ramp("#22223a", "#3a3a56", "#5a5c7a", "#7e809e", "#a6a8be", "#c8cad8", "#eceaf0", "#fffbf0")
TEAL = ramp("#0a2026", "#0c343e", "#0e5058", "#127070", "#1a968c", "#36bca4", "#7ae0c0", "#d0fae4")
BUGYEL = ramp("#3a2214", "#6a4218", "#9c6a1c", "#cc9a28", "#ecc43c", "#f8de5c", "#fff494", "#fffcd8")
BROWN = ramp("#22140e", "#3a2016", "#56301c", "#724422", "#8e5a2c", "#ae783c", "#cc9c52", "#ecc880")
ORANGE = ramp("#3a1606", "#5c240a", "#8e3c0e", "#c25814", "#ee7a1c", "#fc9a32", "#ffbe5c", "#ffe49a")
CREAM = ramp("#3a2c26", "#6a5646", "#9a8468", "#c4ae8a", "#e4d4ae", "#f4e8c8", "#fff8e2", "#ffffff")
VBLUE = ramp("#0e1834", "#142650", "#1a3a78", "#2256a6", "#2e76c8", "#4aa0e4", "#86d0f2", "#e6fbee")

# camper curtains (dark, mid, light)
CURT_O = (C("#6a3a1c"), C("#a8642a"), C("#d89a4a"))
CURT_B = (C("#8a5a14"), C("#d0a030"), C("#f4d468"))

# rear glass: dark, with a cool sky reflection
GA0 = C("#141228")
GA1 = C("#1e2140")
GA2 = C("#2e3660")
GA3 = C("#4c6090")
GA4 = C("#8cacd8")
GA5 = C("#dcefff")


class Sym:
    """Mirrored drawing on a canvas: d = inset from the left/right edge.
    cl is used on the left (shade) side, cr (default cl) on the right."""

    def __init__(self, cv):
        self.cv, self.W = cv, cv.w

    def x(self, side, d):
        return d if side < 0 else self.W - 1 - d

    def span(self, y, d, c):
        self.cv.hl(d, self.W - 1 - d, y, c)

    def hpair(self, y, d0, d1, cl, cr=None):
        cr = cl if cr is None else cr
        self.cv.hl(d0, d1, y, cl)
        self.cv.hl(self.W - 1 - d1, self.W - 1 - d0, y, cr)

    def vpair(self, d, y0, y1, cl, cr=None):
        cr = cl if cr is None else cr
        self.cv.vl(d, y0, y1, cl)
        self.cv.vl(self.W - 1 - d, y0, y1, cr)

    def ppair(self, d, y, cl, cr=None):
        cr = cl if cr is None else cr
        self.cv.px(d, y, cl)
        self.cv.px(self.W - 1 - d, y, cr)

    def rpair(self, d0, y0, d1, y1, cl, cr=None):
        for y in range(y0, y1 + 1):
            self.hpair(y, d0, d1, cl, cr)

    def stamp(self, rows, legl, legr, d, y):
        """rows are authored for the LEFT side, placed at inset d; the right
        copy is mirrored and uses legr."""
        w = max(len(r) for r in rows)
        rows = [r.ljust(w, ".") for r in rows]
        self.cv.stamp(rows, legl, d, y)
        self.cv.stamp(rows, legr, self.W - d - w, y, flip=True)


def compose(*layers):
    out = Canvas(layers[0].w, layers[0].h)
    for lay in layers:
        m = lay.mask()
        out.a[m] = lay.a[m]
    return out


def rtyre(cv, x0, x1, y0, y1, side):
    """Rear view of a tyre (same treatment as the player car's)."""
    cv.rect(x0, y0, x1, y1, K1)
    for y in range(y0 + 1, y1, 2):
        cv.hl(x0 + 1, x1 - 1, y, K0)
    cv.vl(x0, y0, y1, K0)
    cv.vl(x1, y0, y1, K0)
    if side > 0:
        cv.vl(x1 - 1, y0 + 1, y1 - 1, K3)
        cv.vl(x1 - 2, y0 + 1, y1 - 1, K2)
    else:
        cv.vl(x1 - 1, y0 + 1, y1 - 1, K2)
    cv.px(x0, y1, CLEAR)
    cv.px(x1, y1, CLEAR)


def outline_body(cv, P, lit=(), top=True):
    """Selective inner outline: full on the shaded left, broken by the
    highlights on the sunny right and on top."""
    cv.recolor_edge(P["o"], sides="l")
    cv.recolor_edge(P["o"], sides="r", protect=lit)
    if top:
        cv.recolor_edge(P["o"], sides="t", protect=lit)


def tail_lens(cv, x0, x1, y0, y1, ribs=(), glint=True):
    """Unlit red lens filling [x0..x1] x [y0..y1]."""
    cv.rect(x0, y0, x1, y1, T1)
    cv.hl(x0, x1, y0, T2)
    if y1 - y0 >= 3:
        cv.hl(x0, x1, y0 + 1, T2)
    cv.hl(x0, x1, y1, T0)
    for ry in ribs:
        cv.hl(x0, x1, ry, T0)
    if glint:
        cv.px(x1 - 1, y0, T3)
        cv.px(x1 - 2, y0, T3)
        cv.px(x1 - 1, y0 + 1, T3)


# ---------------------------------------------------------------------------
# coupe: boxy 80s wedge coupe, 72x38
# ---------------------------------------------------------------------------
def exhaust_tip(cv, x, y, side=1):
    """Round chrome pipe end seen from behind (4x3)."""
    cv.stamp([".ab.", "bkkc", ".cc."],
             {"a": S3, "b": S2, "c": S0, "k": K0}, x, y)


def draw_coupe(P):
    W, H = 72, 38
    lit = (P[4], P[5], P[6], K3, K4, S1, S2, S3)
    # ---- under layer: undercarriage + tyres
    lo = Canvas(W, H)
    lo.rect(12, 30, W - 13, 35, K0)
    lo.hl(12, W - 13, 30, K1)
    for x in (25, 31, 40, 46):
        lo.vl(x, 32, 34, K1)
    for side in (-1, 1):
        x0 = 3 if side < 0 else W - 4 - 9
        rtyre(lo, x0, x0 + 9, 29, H - 1, side)
    exhaust_tip(lo, 16, 31)

    # ---- body layer
    b = Canvas(W, H)
    s = Sym(b)
    gh = [22, 20, 19, 18, 17, 17, 16, 15, 15, 14, 13]   # greenhouse rows 0..10
    sh = {9: 8, 10: 4, 11: 2, 12: 1}                    # fender-top corners
    for y, d in enumerate(gh):
        s.span(y, d, P[3])
    for y in range(9, 26):
        s.span(y, sh.get(y, 1), P[3])

    # roof: dark top lip (silhouette), lit top surface
    s.span(0, gh[0], P["o"])
    b.hl(40, W - 1 - gh[0] - 1, 0, P[5])
    s.span(1, gh[1], P[4])
    b.hl(37, W - 1 - gh[1] - 1, 1, P[5])
    b.hl(44, W - 1 - gh[1] - 3, 1, P[6])
    s.span(2, gh[2], P[3])
    b.hl(40, W - 1 - gh[2] - 1, 2, P[4])
    # C-pillars + glass
    for y in range(3, 11):
        d = gh[y]
        s.hpair(y, d, d + 2, P[2], P[4])
        s.ppair(d + 1, y, P[2], P[5])
        s.ppair(d + 2, y, P[1], P[3])
        b.hl(d + 3, W - 1 - (d + 3), y, GA1)
    b.hl(gh[3] + 3, W - 1 - gh[3] - 3, 3, GA0)
    b.hl(gh[4] + 3, W - 1 - gh[4] - 3, 4, GA2)
    b.hl(gh[4] + 3, 30, 4, GA1)
    # sky reflection streaks on the glass (right half)
    for y in range(4, 11):
        x = 46 - (y - 4)
        b.px(x, y, GA3)
        b.px(x + 1, y, GA3)
        b.px(x + 2, y, GA2)
        b.px(x + 4, y, GA2)
    # headrests behind the glass
    for hx in (24, 42):
        b.stamp([".aaaa.", "aaaaaa"], {"a": GA0}, hx, 8)
    b.hl(gh[10] + 3, W - 1 - gh[10] - 3, 10, GA0)

    # top surfaces: rear fender tops + hatch deck
    for y in range(9, 12):
        for side in (-1, 1):
            for d in range(sh.get(y, 1), 37):
                if y <= 10 and d >= gh[y]:
                    break
                b.px(s.x(side, d), y, P[4])
    for side in (-1, 1):                        # rounded ridge
        hi = P[5] if side > 0 else P[4]
        for d in range(8, 14):
            b.px(s.x(side, d), 9, hi)
        for d in (4, 5, 6, 7):
            b.px(s.x(side, d), 10, hi)
        b.px(s.x(side, 2), 11, hi)
        b.px(s.x(side, 3), 11, hi)
    b.hl(W - 1 - 12, W - 1 - 9, 9, P[6])
    b.hl(W - 1 - 6, W - 1 - 5, 10, P[6])
    b.hl(gh[10], W - 1 - gh[10], 11, P[4])
    # black lip spoiler on the hatch edge, shadow under it
    b.hl(8, W - 9, 12, K3)
    b.hl(36, W - 10, 12, K4)
    b.hl(7, W - 8, 13, K1)
    b.px(7, 12, P[4])
    b.px(W - 8, 12, P[5])
    s.hpair(12, 1, 6, P[4], P[5])
    s.hpair(13, 1, 6, P[3], P[4])
    # crease = top edge of the rear face
    b.hl(1, W - 2, 14, P[4])
    b.hl(38, W - 4, 14, P[5])
    b.hl(52, W - 9, 14, P[6])
    # rear face: base, lower panel in shade
    b.rect(1, 23, W - 2, 25, P[2])
    b.hl(1, W - 2, 22, P[4])
    b.hl(38, W - 4, 22, P[5])
    b.hl(2, W - 3, 25, P[1])
    s.vpair(1, 12, 25, P[2], P[4])
    b.vl(W - 2, 23, 25, P[3])

    # taillights: big ribbed outer part + inner part with reverse lamp
    for side in (-1, 1):
        xs = sorted((s.x(side, 1), s.x(side, 24)))
        b.rect(xs[0], 15, xs[1], 21, K0)
        o = sorted((s.x(side, 2), s.x(side, 13)))
        tail_lens(b, o[0], o[1], 16, 20, ribs=(18,))
        i = sorted((s.x(side, 15), s.x(side, 23)))
        tail_lens(b, i[0], i[1], 16, 18, glint=True)
        b.hl(i[0], i[1], 19, K3)          # smoked reverse lamp
        b.hl(i[0], i[1], 20, K2)
        b.px(i[1] - 1, 19, K4)
    # body-colour groove linking the lights
    b.hl(25, W - 26, 18, P[2])
    b.hl(25, W - 26, 19, P[4])
    # blank plate recess in the lower panel
    p0, p1 = 27, W - 28
    b.rect(p0, 21, p1, 25, P["o"])
    b.rect(p0 + 1, 22, p1 - 1, 25, P[1])
    b.rect(p0 + 2, 23, p1 - 2, 24, P[2])
    b.hl(p0 + 1, p1 - 1, 25, P[0])

    # black bumper with a lit top and a rubber strip
    b.hl(1, W - 2, 26, K3)
    b.hl(36, W - 4, 26, K4)
    b.rect(0, 27, W - 1, 30, K2)
    b.hl(0, W - 1, 28, K1)
    b.hl(1, W - 2, 29, K3)
    b.hl(1, W - 2, 30, K1)
    b.px(0, 30, CLEAR)
    b.px(W - 1, 30, CLEAR)

    outline_body(b, P, lit=lit)
    return compose(lo, b)


# ---------------------------------------------------------------------------
# sports: rear-engine 80s sports car with a whale tail, 72x38
# ---------------------------------------------------------------------------
def draw_sports(P):
    W, H = 72, 38
    lit = (P[4], P[5], P[6], K3, K4, S1, S2, S3)
    lo = Canvas(W, H)
    lo.rect(14, 29, W - 15, 36, K0)
    lo.hl(14, W - 15, 29, K1)
    lo.rect(19, 30, 30, 32, K2)            # muffler box
    lo.hl(19, 30, 30, K3)
    for x in (36, 40, 44):
        lo.vl(x, 32, 35, K1)
    for side in (-1, 1):
        x0 = 2 if side < 0 else W - 3 - 11
        rtyre(lo, x0, x0 + 11, 28, H - 1, side)
    exhaust_tip(lo, 20, 32)
    exhaust_tip(lo, 25, 32)

    b = Canvas(W, H)
    s = Sym(b)
    gh = [25, 23, 22, 22, 21, 21, 20, 20, 19, 19, 18]   # greenhouse rows 0..10
    for y, d in enumerate(gh):
        s.span(y, d, P[3])
    # rounded haunch tops (per inset from the outer edge)
    ht = [18, 15, 13, 12, 11, 10, 10, 10, 10, 11, 11, 12, 12, 13, 13, 14]
    for d, yt in enumerate(ht):
        s.vpair(d, yt, 29, P[3])
    for y in range(14, 30):
        s.span(y, len(ht), P[3])
    for y in (28, 29):                      # rounded lower corners
        s.ppair(0, y, CLEAR)
    s.ppair(1, 29, CLEAR)

    # roof
    s.span(0, gh[0], P["o"])
    b.hl(40, W - 1 - gh[0] - 1, 0, P[5])
    s.span(1, gh[1], P[4])
    b.hl(37, W - 1 - gh[1] - 1, 1, P[5])
    b.hl(42, W - 1 - gh[1] - 3, 1, P[6])
    s.span(2, gh[2], P[3])
    b.hl(39, W - 1 - gh[2] - 1, 2, P[4])
    # fastback glass, slim pillars
    for y in range(3, 11):
        d = gh[y]
        s.hpair(y, d, d + 1, P[2], P[4])
        s.ppair(d + 1, y, P[1], P[5])
        b.hl(d + 2, W - 1 - (d + 2), y, GA1)
    b.hl(gh[3] + 2, W - 1 - gh[3] - 2, 3, GA0)
    b.hl(gh[4] + 2, W - 1 - gh[4] - 2, 4, GA2)
    b.hl(gh[4] + 2, 31, 4, GA1)
    for y in range(4, 9):
        x = 43 - (y - 4)
        b.px(x, y, GA3)
        b.px(x + 1, y, GA3)
        b.px(x + 3, y, GA2)

    # haunches: lit crowns, rounded outer slopes
    for side in (-1, 1):
        for d, yt in enumerate(ht):
            x = s.x(side, d)
            b.px(x, yt, P[5] if side > 0 else P[4])
            b.px(x, yt + 1, P[4])
            b.px(x, yt + 2, P[4] if d >= 2 else P[3])
        for d in range(3):
            x = s.x(side, d)
            b.vl(x, ht[d] + 2, 24, P[2] if side < 0 else P[5])
        b.vl(s.x(side, 0), ht[0], 27, P[1] if side < 0 else P[4])
        b.vl(s.x(side, 1), ht[1] + 3, 27, P[2] if side < 0 else P[5])
        b.vl(s.x(side, 2), ht[2] + 3, 22, P[3] if side < 0 else P[4])
    for d in (4, 5, 6, 7):
        b.px(W - 1 - d, 10, P[6])
    b.px(W - 1 - 3, 11, P[6])
    b.px(W - 1 - 2, 12, P[6])
    # engine lid in the spoiler's shadow, then the rear-face crease
    b.hl(10, W - 11, 14, P[0])
    b.hl(10, W - 11, 15, P[1])
    b.hl(12, W - 13, 16, P[2])
    b.hl(1, W - 2, 17, P[4])
    b.hl(38, W - 4, 17, P[5])
    b.hl(54, W - 6, 17, P[6])

    # whale tail: lit top deck with a black grille, upturned rubber lip
    b.hl(12, W - 13, 6, P["o"])
    b.hl(11, W - 12, 7, P[4])
    b.hl(36, W - 13, 7, P[5])
    for y in (8, 9, 10, 11):
        b.hl(9, W - 10, y, P[4])
    b.hl(38, W - 11, 8, P[5])
    b.hl(48, W - 13, 8, P[6])
    b.hl(40, W - 11, 11, P[5])
    s.ppair(9, 8, P[3], P[5])
    s.ppair(10, 7, P[3], P[5])
    b.rect(18, 8, W - 19, 10, K1)           # intake grille in the deck
    b.hl(18, W - 19, 8, K0)
    b.hl(19, W - 20, 10, K2)
    b.hl(38, W - 20, 10, K3)
    b.hl(18, W - 19, 9, K1)
    for x in range(20, W - 19, 3):
        b.px(x, 9, K2)
    s.vpair(8, 10, 13, K2, K3)              # lip ends curl up
    s.ppair(8, 10, K3, K4)
    b.hl(9, W - 10, 12, K3)
    b.hl(38, W - 10, 12, K4)
    b.hl(9, W - 10, 13, K1)
    b.hl(10, W - 11, 13, K0)

    # full-width taillight bar
    b.rect(1, 18, W - 2, 23, K0)
    tail_lens(b, 2, 24, 19, 22, ribs=(21,))
    tail_lens(b, W - 25, W - 3, 19, 22, ribs=(21,))
    b.rect(26, 19, W - 27, 22, T0)          # centre reflector band
    for x in range(27, W - 26, 2):
        b.vl(x, 19, 21, T1)
    b.hl(26, W - 27, 19, T2)
    b.px(W - 28, 19, T3)
    b.px(W - 29, 19, T3)

    # body-colour bumper with rubber strip and blank plate recess
    b.hl(1, W - 2, 24, P[4])
    b.hl(38, W - 4, 24, P[5])
    b.rect(1, 25, W - 2, 27, P[3])
    b.hl(1, W - 2, 26, K3)
    b.hl(38, W - 3, 26, K4)
    b.hl(1, W - 2, 27, K1)
    b.rect(2, 28, W - 3, 29, P[2])
    b.hl(3, W - 4, 29, P[1])
    s.vpair(1, 24, 27, P[2], P[4])
    p0, p1 = 27, W - 28
    b.rect(p0, 24, p1, 29, P["o"])
    b.rect(p0 + 1, 25, p1 - 1, 29, P[1])
    b.rect(p0 + 2, 26, p1 - 2, 28, P[2])
    b.hl(p0 + 1, p1 - 1, 29, P[0])

    outline_body(b, P, lit=lit)
    return compose(lo, b)


# ---------------------------------------------------------------------------
# beetle: rounded classic bug car, 60x44
# ---------------------------------------------------------------------------
def draw_beetle(P):
    W, H = 60, 44
    lit = (P[4], P[5], P[6], S1, S2, S3, K3, K4)
    lo = Canvas(W, H)
    lo.rect(10, 34, W - 11, 41, K0)
    lo.hl(10, W - 11, 34, K1)
    lo.rect(14, 34, W - 15, 36, K2)         # muffler
    lo.hl(14, W - 15, 34, K3)
    lo.hl(30, W - 16, 34, K4)
    lo.hl(14, W - 15, 36, K1)
    for side in (-1, 1):
        x0 = 3 if side < 0 else W - 4 - 8
        rtyre(lo, x0, x0 + 8, 32, H - 1, side)
    for px_ in (17, W - 21):                # twin pea-shooter pipes
        lo.rect(px_, 36, px_ + 3, 37, K2)
        exhaust_tip(lo, px_, 37)

    b = Canvas(W, H)
    s = Sym(b)
    dome = [22, 18, 15, 13, 12, 11, 10, 10, 9, 9, 9, 8, 8, 8, 8, 8, 8, 8,
            8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 10, 10, 11, 12]
    for y, d in enumerate(dome):
        s.span(y, d, P[3])
    # dome shading: roof top lit, left flank in shade, right flank lit
    s.span(0, dome[0], P["o"])
    b.hl(33, W - 1 - dome[0] - 1, 0, P[5])
    for y in (1, 2, 3):
        s.span(y, dome[y], P[4])
    b.hl(30, W - 1 - dome[1] - 2, 1, P[6])
    b.hl(32, W - 1 - dome[2] - 2, 2, P[5])
    b.hl(35, W - 1 - dome[3] - 3, 3, P[5])
    for y, d in enumerate(dome):
        if y < 2:
            continue
        s.ppair(d, y, P[1], P[4])
        s.ppair(d + 1, y, P[2], P[5] if 3 <= y <= 20 else P[4])
        if 4 <= y <= 24:
            b.px(d + 2, y, P[2])
            b.px(W - 1 - d - 3, y, P[4])

    # small oval rear window (rubber seal, dark glass, sky glint)
    oval = ["......oooooooooo......",
            "...oooaaaaaaaaaaooo...",
            ".ooaaabbbbbbbbbbbbaaoo",
            "oaabbbbbbbbbbbcbbcbbbo",
            "obbbbbbbbbbbbcbbcbbbbo",
            ".oobbbbbbbbbcbbcbbbool",
            "...ooobbbbbbbbbbooll..",
            "......oooooollll......"]
    oval[2] = oval[2][:-2] + "o."
    b.stamp(oval, {"o": P["o"], "a": GA0, "b": GA1, "c": GA3,
                   "l": P[5]}, 19, 3)
    b.hl(22, 27, 5, GA2)

    # engine lid: rounded-top panel, louvres, handle
    lid = {13: 23, 14: 20, 15: 19, 16: 18}
    for y in range(13, 30):
        d = lid.get(y, 18)
        s.ppair(d, y, P[1], P[4])
    b.hl(lid[13], W - 1 - lid[13], 13, P[1])
    b.hl(lid[13] + 1, W - 1 - lid[13] - 1, 14, P[4])
    b.hl(30, W - 1 - lid[13] - 2, 14, P[5])
    b.px(lid[14], 14, P[1])
    b.px(W - 1 - lid[14], 14, P[1])
    for i, y in enumerate((16, 18, 20)):     # two banks of louvres
        for side in (-1, 1):
            d0, d1 = 21, 27
            xs_ = sorted((s.x(side, d0), s.x(side, d1)))
            b.hl(xs_[0], xs_[1], y, P["o"])
            b.hl(xs_[0], xs_[1], y + 1, P[4] if side < 0 else P[5])
    b.hl(lid[16] + 1, W - 1 - lid[16] - 1, 29, P[2])
    # handle + plate-light hump
    b.stamp([".abbbbba.", "acccccccd", ".ddddddd."],
            {"a": S1, "b": S3, "c": S1, "d": S0}, 25, 24)
    # apron below the lid
    for y in range(28, 32):
        s.span(y, dome[y], P[2])
    s.span(31, dome[31], P[1])

    # rounded rear fenders with taillights on top
    for side in (-1, 1):
        f = Canvas(W, H)
        cx = 7.5 if side < 0 else W - 7.5
        f.ellipse(cx, 27.5, 8.6, 11.6, P[3])
        f.a[34:, :] = 0
        m = f.mask()
        ys_, xs_ = np.nonzero(m)
        # outer slope / shading by distance from the fender centre
        for y, x in zip(ys_, xs_):
            dx = (x + 0.5 - cx) / 8.6
            dy = (y + 0.5 - 27.5) / 11.6
            if dy < -0.75:
                c = P[5] if side > 0 or dx > 0 else P[4]
            elif dy < -0.45:
                c = P[4]
            elif dy > 0.35:
                c = P[2]
            else:
                c = P[3]
            if side < 0 and dx < -0.55:
                c = P[2] if dy < 0.35 else P[1]
            if side > 0 and dx > 0.55 and dy < 0.35:
                c = P[5]
            f.a[y, x] = c
        # fender bead (seam) where the fender meets the body
        edge = np.zeros_like(m)
        inner = (lambda xx: xx > cx) if side < 0 else (lambda xx: xx < cx)
        for y, x in zip(ys_, xs_):
            if inner(x) and (not m[y, x + (1 if side < 0 else -1)]):
                edge[y, x] = True
        f.a[edge] = P[1]
        b.a[m] = f.a[m]
        # taillight: small rounded lens on the fender top
        tx = 2 if side < 0 else W - 8
        b.stamp([".kkkk.",
                 "k2223k",
                 "k2113k",
                 "k1111k",
                 "k1101k",
                 "k0000k",
                 ".kkkk."],
                {"k": K0, "0": T0, "1": T1, "2": T2, "3": T3}, tx, 19)

    # chrome blade bumper with overriders
    b.hl(2, W - 3, 31, S2)
    b.hl(30, W - 4, 31, S3)
    b.hl(1, W - 2, 32, S1)
    b.hl(1, W - 2, 33, S0)
    b.px(1, 31, S1)
    b.px(W - 2, 31, S2)
    for d in (15, 16):
        s.vpair(d, 28, 33, S1, S2)
    s.vpair(15, 28, 33, S0, S2)
    s.vpair(16, 28, 33, S1, S3)
    s.ppair(15, 28, S1, S2)
    s.ppair(16, 28, S2, S3)

    outline_body(b, P, lit=lit)
    return compose(lo, b)


def round_rect(cv, x0, y0, x1, y1, r, c):
    """Filled rectangle with stepped (pixel-art) corners of radius r."""
    steps = {1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1],
             5: [5, 3, 2, 1, 1], 6: [6, 4, 2, 2, 1, 1]}.get(r, [])
    for y in range(y0, y1 + 1):
        i = min(y - y0, y1 - y)
        d = steps[i] if i < len(steps) else 0
        cv.hl(x0 + d, x1 - d, y, c)


# ---------------------------------------------------------------------------
# pickup: 80s pickup truck, slightly lifted, 76x48
# ---------------------------------------------------------------------------
def draw_pickup(P):
    W, H = 76, 48
    lit = (P[4], P[5], P[6], S1, S2, S3, K3, K4)
    lo = Canvas(W, H)
    s = Sym(lo)
    # lifted chassis: spare wheel, axle, diff, leaf springs, hitch
    lo.rect(16, 35, W - 17, 45, K0)
    lo.hl(16, W - 17, 35, K1)
    round_rect(lo, 26, 35, W - 27, 38, 1, K1)        # spare tyre (behind)
    lo.hl(27, W - 28, 37, K2)
    lo.rect(16, 40, W - 17, 41, K2)                   # axle tube
    lo.hl(16, W - 17, 40, K3)
    lo.stamp(["..abbbba..",
              ".abccccba.",
              "abccddccba",
              "abcddddcba",
              "abccddccba",
              ".abbbbbba.",
              "..aaaaaa.."],
             {"a": K1, "b": K2, "c": K3, "d": K4}, 33, 37)
    for side in (-1, 1):
        s.vpair(17, 36, 42, K1, K1)
        s.vpair(18, 36, 42, K2, K3)
        s.vpair(19, 36, 42, K1, K2)
    lo.rect(36, 36, 39, 38, K2)                       # hitch receiver
    lo.hl(36, 39, 36, S1)
    lo.rect(37, 37, 38, 38, K0)
    for side in (-1, 1):
        x0 = 3 if side < 0 else W - 4 - 12
        rtyre(lo, x0, x0 + 12, 33, H - 1, side)
    lo.rect(20, 36, 22, 38, K2)                       # tailpipe
    exhaust_tip(lo, 20, 38)

    b = Canvas(W, H)
    s = Sym(b)
    CAB = 13
    for y in range(0, 13):
        s.span(y, CAB, P[3])
    s.span(0, CAB + 2, P[3])
    s.span(1, CAB + 1, P[3])
    for y in range(11, 33):
        s.span(y, 2, P[3])
    s.ppair(2, 11, CLEAR)

    # cab roof
    s.span(0, CAB + 2, P["o"])
    b.hl(42, W - 1 - CAB - 3, 0, P[5])
    s.span(1, CAB + 1, P[4])
    b.hl(38, W - 1 - CAB - 2, 1, P[5])
    b.hl(48, W - 1 - CAB - 5, 1, P[6])
    s.span(2, CAB, P[4])
    b.hl(40, W - 1 - CAB - 1, 2, P[5])
    s.span(3, CAB, P[2])
    # cab back + rear window with a sliding centre pane
    s.vpair(CAB, 4, 12, P[2], P[4])
    s.vpair(CAB + 1, 4, 12, P[3], P[5])
    g0, g1 = CAB + 4, W - 1 - CAB - 4
    b.rect(g0 - 1, 4, g1 + 1, 10, P["o"])
    b.rect(g0, 5, g1, 10, GA1)
    b.hl(g0, g1, 5, GA0)
    b.hl(g0, 30, 6, GA2)
    for y in range(6, 11):
        x = 50 - (y - 6)
        b.px(x, y, GA3)
        b.px(x + 1, y, GA3)
        b.px(x + 3, y, GA2)
    for hx in (22, 47):
        b.stamp([".aaaaa.", "aaaaaaa", "aaaaaaa"], {"a": GA0}, hx, 7)
    for x in (31, W - 32):
        b.vl(x, 5, 10, P["o"])
    b.hl(g0 - 1, g1 + 1, 11, P[2])
    b.hl(g0, g1, 11, P[4])

    # bed seen from above: headboard, lit floor with raised ribs, wheel
    # wells, side rails (inner faces: left one faces the sun, right in shade)
    b.rect(8, 12, W - 9, 18, P[3])
    b.hl(8, W - 9, 12, P[4])
    b.hl(40, W - 10, 12, P[5])
    b.hl(8, W - 9, 13, P[2])
    b.hl(8, W - 9, 14, P[2])                 # headboard shadow on the floor
    for x in range(12, W - 11, 6):
        b.vl(x, 15, 18, P[2])
        b.vl(x + 1, 15, 18, P[4])
    for side in (-1, 1):                    # wheel wells
        ww = [".aaaa", "abbbb", "bcccc", "bcccc"]
        s.stamp(ww, {"a": P[4], "b": P[3], "c": P[2]},
                {"a": P[5], "b": P[4], "c": P[3]}, 8, 15)
    for side in (-1, 1):                    # bed sides: top rail + inner face
        for y in range(11, 19):
            b.px(s.x(side, 2), y, P[4] if side < 0 else P[5])
            b.px(s.x(side, 3), y, P[4] if side < 0 else P[5])
            b.px(s.x(side, 4), y, P[3] if side < 0 else P[4])
            b.px(s.x(side, 5), y, P[2])
            b.px(s.x(side, 6), y, P[4] if side < 0 else P[2])
            b.px(s.x(side, 7), y, P[3] if side < 0 else P[1])
    b.vl(W - 1 - 3, 11, 18, P[6])
    # tailgate top edge
    b.hl(2, W - 3, 19, P[4])
    b.hl(40, W - 4, 19, P[5])
    b.hl(56, W - 8, 19, P[6])
    b.hl(2, W - 3, 20, P[2])
    # tailgate face
    b.rect(2, 21, W - 3, 31, P[3])
    b.rect(2, 29, W - 3, 31, P[2])
    b.hl(3, W - 4, 31, P[1])
    s.vpair(2, 19, 31, P[2], P[4])
    # recessed panel: shadowed top/right walls, lit bottom/left walls
    r0, r1 = 13, W - 14
    b.rect(r0, 23, r1, 29, P[2])
    b.hl(r0, r1, 23, P[0])
    b.hl(r0 + 1, r1, 24, P[1])
    b.vl(r1, 23, 29, P[1])
    b.vl(r0, 24, 29, P[4])
    b.hl(r0, r1, 29, P[4])
    b.hl(r0 + 20, r1 - 1, 29, P[5])
    b.rect(r0 + 1, 25, r1 - 1, 28, P[3])
    b.hl(r0 + 1, r1 - 1, 25, P[2])
    # tailgate handle
    b.rect(33, 21, W - 34, 22, P["o"])
    b.hl(34, W - 35, 22, S1)
    b.hl(38, W - 36, 22, S2)
    # vertical taillights on the bed posts
    for side in (-1, 1):
        xs = sorted((s.x(side, 2), s.x(side, 8)))
        b.rect(xs[0], 19, xs[1], 31, K0)
        ls = sorted((s.x(side, 3), s.x(side, 7)))
        tail_lens(b, ls[0], ls[1], 20, 26, ribs=(23,))
        b.rect(ls[0], 27, ls[1], 28, A0)    # amber + clear segments
        b.hl(ls[0], ls[1], 27, A1)
        b.px(ls[1] - 1, 27, A2)
        b.rect(ls[0], 29, ls[1], 30, K3)
        b.hl(ls[0], ls[1], 29, K4)
        b.px(ls[1] - 1, 29, S2)

    # chrome step bumper
    b.hl(1, W - 2, 32, S2)
    b.hl(38, W - 3, 32, S3)
    b.rect(0, 33, W - 1, 34, S1)
    b.hl(0, W - 1, 34, S1)
    b.hl(40, W - 2, 33, S2)
    b.hl(1, W - 2, 35, S0)
    b.rect(30, 32, W - 31, 34, K2)          # step pad
    b.hl(30, W - 31, 32, K3)
    for x in range(31, W - 31, 2):
        b.px(x, 33, K1)
    b.px(0, 32, CLEAR)
    b.px(W - 1, 32, CLEAR)

    outline_body(b, P, lit=lit)
    return compose(lo, b)


# ---------------------------------------------------------------------------
# van: split-window camper van rear, two-tone, 74x72
# ---------------------------------------------------------------------------
def draw_van(LO, UP, CU):
    """LO = lower body colour, UP = upper body / roof colour,
    CU = (dark, mid, light) curtain colours."""
    W, H = 74, 72
    lit = (LO[4], LO[5], LO[6], UP[4], UP[5], UP[6], S1, S2, S3, K3, K4)
    lo = Canvas(W, H)
    s = Sym(lo)
    lo.rect(14, 58, W - 15, 69, K0)
    lo.hl(14, W - 15, 58, K1)
    lo.stamp(["..aaaaaaaaaaaa..",
              ".abbbbbbbbbbbbba",
              "abbccccccccccbba",
              "abbbbbbbbbbbbbba",
              ".aaaaaaaaaaaaaa."],
             {"a": K1, "b": K2, "c": K3}, 29, 61)       # gearbox / engine sump
    lo.rect(15, 59, W - 16, 61, K2)                    # muffler
    lo.hl(15, W - 16, 59, K3)
    lo.hl(38, W - 17, 59, K4)
    for side in (-1, 1):
        x0 = 4 if side < 0 else W - 5 - 10
        rtyre(lo, x0, x0 + 10, 57, H - 1, side)
    lo.rect(18, 61, 20, 63, K2)
    exhaust_tip(lo, 18, 63)

    b = Canvas(W, H)
    s = Sym(b)
    top = [16, 11, 8, 6, 5, 4, 3, 3]
    for y in range(0, 58):
        d = top[y] if y < len(top) else 2
        s.span(y, d, UP[3] if y < 33 else LO[3])
    # roof seen from above
    s.span(0, top[0], UP["o"])
    b.hl(44, W - 1 - top[0] - 1, 0, UP[5])
    for y in (1, 2, 3):
        s.span(y, top[y], UP[4])
    b.hl(36, W - 1 - top[1] - 1, 1, UP[5])
    b.hl(38, W - 1 - top[2] - 2, 2, UP[5])
    b.hl(46, W - 1 - top[2] - 4, 2, UP[6])
    b.hl(42, W - 1 - top[3] - 3, 3, UP[5])
    s.span(4, top[4], UP[4])
    s.span(5, top[5], UP[2])                 # rain gutter
    b.hl(40, W - 1 - top[5] - 1, 5, UP[3])
    # rounded flanks
    for y in range(4, 58):
        d = top[y] if y < len(top) else 2
        R = UP if y < 33 else LO
        s.ppair(d, y, R[1], R[4])
        s.ppair(d + 1, y, R[2], R[5] if y < 50 else R[4])
        s.ppair(d + 2, y, R[3], R[4])
    # upper-body shading below the window, rear hatch seam
    b.rect(5, 27, W - 6, 31, UP[3])
    b.hl(5, W - 6, 32, UP[2])
    s.vpair(2, 27, 32, UP[1], UP[4])
    hx0, hx1 = 10, W - 11
    for y in range(8, 32):
        b.px(hx0, y, UP[2])
        b.px(hx1, y, UP[2])
        b.px(hx0 + 1, y, UP[4])
    b.hl(hx0 + 2, hx1 - 2, 7, UP[2])
    b.hl(hx0 + 2, hx1 - 2, 8, UP[4])
    b.px(hx0 + 1, 8, UP[2])
    b.px(hx1 - 1, 8, UP[2])
    # rear window: seal, curtains, dark glass, glint
    wx0, wx1, wy0, wy1 = 15, W - 16, 10, 23
    round_rect(b, wx0 - 1, wy0 - 1, wx1 + 1, wy1 + 1, 3, UP["o"])
    round_rect(b, wx0, wy0, wx1, wy1, 2, GA1)
    b.hl(wx0 + 2, wx1 - 2, wy0, GA0)
    b.hl(wx0 + 1, 36, wy0 + 1, GA2)
    for side in (-1, 1):                     # gathered curtains
        for i in range(7):
            x = s.x(side, wx0 + i)
            for y in range(wy0, wy1 + 1):
                if b.get(x, y)[3] and b.get(x, y) != UP["o"]:
                    c = CU[1]
                    if i % 3 == 0:
                        c = CU[0]
                    elif i % 3 == 2:
                        c = CU[2] if side > 0 else CU[1]
                    if i == 6:
                        c = CU[0]
                    b.px(x, y, c)
        b.px(s.x(side, wx0 + 3), 17, UP[5])  # tie-back
        b.px(s.x(side, wx0 + 4), 17, UP[5])
    for y in range(wy0 + 1, wy1 + 1):        # sky reflection
        x = 46 - (y - wy0)
        for xx, c in ((x, GA3), (x + 1, GA3), (x + 3, GA2), (x - 6, GA2)):
            if b.get(xx, y) in (GA1, GA2):
                b.px(xx, y, c)
    b.hl(wx0 + 1, wx1 - 1, wy1 + 1, UP["o"])
    b.hl(38, wx1 - 2, wy1 + 2, UP[5])        # lit lower lip of the seal
    # hatch handle
    b.stamp(["abbbba", ".cdd.."], {"a": S1, "b": S3, "c": S0, "d": S1},
            34, 27)

    # two-tone beltline
    b.hl(2, W - 3, 33, LO[5])
    b.hl(2, 30, 33, LO[4])
    b.hl(3, W - 4, 34, LO[4])
    # lower body: shade toward the bottom
    b.rect(3, 50, W - 4, 55, LO[2])
    b.hl(3, W - 4, 49, LO[3])
    b.hl(3, W - 4, 56, LO[1])
    b.hl(4, W - 5, 57, LO[0])
    s.vpair(2, 50, 57, LO[1], LO[3])
    # small round taillights with chrome bezels
    for side in (-1, 1):
        tl = [".ssss.",
              "s2223s",
              "s1113s",
              "s1101s",
              "s0000s",
              ".ssss."]
        legl = {"s": S1, "0": T0, "1": T1, "2": T2, "3": T3}
        legr = {"s": S2, "0": T0, "1": T1, "2": T2, "3": T3}
        s.stamp(tl, legl, legr, 5, 37)
    # engine lid with horizontal grille slats
    ex0, ex1, ey0, ey1 = 14, W - 15, 37, 55
    for y in range(ey0, ey1 + 1):
        b.px(ex0, y, LO[1])
        b.px(ex1, y, LO[1])
        b.px(ex0 + 1, y, LO[4] if y < 50 else LO[3])
    b.hl(ex0 + 1, ex1 - 1, ey0, LO[1])
    b.hl(ex0 + 1, ex1 - 1, ey0 + 1, LO[4])
    b.hl(40, ex1 - 2, ey0 + 1, LO[5])
    b.hl(ex0 + 1, ex1 - 1, ey1, LO[1])
    for i in range(5):
        y = 40 + i * 2
        b.hl(20, W - 21, y, LO["o"])
        b.hl(20, W - 21, y + 1, LO[4])
        b.hl(40, W - 22, y + 1, LO[5])
    b.vl(20, 40, 49, LO[1])
    b.vl(W - 21, 40, 49, LO[2])
    b.stamp(["abbbba", ".cddc."], {"a": S1, "b": S3, "c": S0, "d": S1},
            34, 51)
    # painted blade bumper (upper colour)
    b.hl(1, W - 2, 56, UP[4])
    b.hl(38, W - 3, 56, UP[5])
    b.rect(0, 57, W - 1, 58, UP[3])
    b.hl(48, W - 3, 57, UP[4])
    b.hl(1, W - 2, 59, UP[1])
    b.px(0, 56, CLEAR)
    b.px(W - 1, 56, CLEAR)

    outline_body(b, LO, lit=lit)
    return compose(lo, b)


# ---------------------------------------------------------------------------
# truck: box truck rear, 96x120
# ---------------------------------------------------------------------------
def draw_truck(P, ST1, ST2):
    """P = box colour, ST1/ST2 = livery stripe ramps."""
    W, H = 96, 120
    lit = (P[4], P[5], P[6], S1, S2, S3, K3, K4, ST1[4], ST1[5], ST2[4],
           ST2[5])
    LAMP = {"k": K0, "0": T0, "1": T1, "2": T2, "3": T3, "a": A1, "b": A2}
    lo = Canvas(W, H)
    s = Sym(lo)
    # chassis between the wheel pairs
    lo.rect(28, 92, W - 29, 114, K0)
    lo.hl(28, W - 29, 92, K1)
    s.rpair(33, 92, 36, 112, K1)
    s.vpair(34, 92, 112, K2, K3)
    lo.rect(28, 106, W - 29, 108, K2)       # axle tube
    lo.hl(28, W - 29, 106, K3)
    lo.stamp(["...abbbbbba...",
              "..abccccccba..",
              ".abccddddccba.",
              "abccdddddccbba",
              "abcccddddcccba",
              "abbccccccccbba",
              ".abbbbbbbbbba.",
              "..aaaaaaaaaa.."],
             {"a": K1, "b": K2, "c": K3, "d": K4}, 41, 103)
    # dual rear tyres
    for side in (-1, 1):
        for d0 in (4, 17):
            x0 = d0 if side < 0 else W - 1 - d0 - 11
            rtyre(lo, x0, x0 + 11, 93, H - 1, side)

    b = Canvas(W, H)
    s = Sym(b)
    b.rect(2, 0, W - 3, 92, P[3])
    s.ppair(2, 0, CLEAR)
    # roof sliver
    b.hl(3, W - 4, 0, P["o"])
    b.hl(50, W - 4, 0, P[5])
    b.hl(70, W - 5, 0, P[6])
    b.hl(2, W - 3, 1, P[4])
    b.hl(40, W - 4, 1, P[5])
    b.hl(60, W - 10, 1, P[6])
    b.hl(2, W - 3, 2, P[2])
    # header beam
    b.rect(2, 3, W - 3, 15, P[3])
    b.hl(2, W - 3, 3, P[4])
    b.hl(46, W - 4, 3, P[5])
    b.hl(2, W - 3, 15, P[2])
    b.hl(2, W - 3, 16, P[0])
    # corner posts
    for side in (-1, 1):
        for d in range(2, 11):
            x = s.x(side, d)
            if side < 0:
                c = {2: P[1], 3: P[2], 9: P[2], 10: P[1]}.get(d, P[3])
            else:
                c = {2: P[4], 3: P[5], 9: P[2], 10: P[1]}.get(d, P[4])
            b.vl(x, 4, 91, c)
        b.vl(s.x(side, 6), 17, 90, P[2] if side < 0 else P[3])
        b.vl(s.x(side, 7), 17, 90, P[4] if side < 0 else P[5])
    # livery: the side stripes wrap round the corners and across the header
    for (R, y0, y1) in ((ST1, 8, 11), (ST2, 13, 14)):
        b.rect(2, y0, W - 3, y1, R[3])
        b.hl(2, W - 3, y0, R[4])
        b.hl(46, W - 4, y0, R[5])
        b.hl(2, W - 3, y1, R[2])
        b.vl(2, y0, y1, R[1])
        b.vl(3, y0, y1, R[2])
        b.vl(W - 3, y0, y1, R[5])
        b.vl(W - 4, y0, y1, R[4])
    b.hl(11, W - 12, 12, P[4])
    # ID lights on the header, clearance lights on the post tops
    for x in (39, 46, 53):
        b.stamp(["kkkk", "k23k", "kkkk"], LAMP, x, 4)
    for side in (-1, 1):
        s.stamp(["kkkk", "k23k", "kkkk"], LAMP, LAMP, 4, 4)
    # roll-up door with horizontal ribs
    d0, d1 = 11, W - 12
    b.rect(d0, 17, d1, 83, P[3])
    for y in range(17, 83, 6):
        b.hl(d0 + 1, d1 - 1, y, P[1])
        b.hl(d0 + 1, d1 - 1, y + 1, P[4])
        b.hl(46, d1 - 2, y + 1, P[5])
        b.hl(d0 + 1, d1 - 1, y + 5, P[2])
    b.rect(d0 + 1, 17, d1 - 1, 19, P[2])     # shadow under the header
    b.hl(d0 + 1, d1 - 1, 17, P[0])
    b.hl(d0 + 1, d1 - 1, 18, P[1])
    b.vl(d0, 17, 87, P[1])
    b.vl(d0 + 1, 17, 87, P[2])
    b.vl(d1, 17, 87, P[2])
    # door bottom rail, latch, pull strap
    b.rect(d0, 83, d1, 87, P[2])
    b.hl(d0, d1, 83, P[4])
    b.hl(46, d1 - 1, 83, P[5])
    b.hl(d0, d1, 87, K1)
    b.stamp(["abbbbbba",
             "acccccca",
             "ac.kk.ca",
             "aaaaaaaa"], {"a": K1, "b": S2, "c": S1, "k": K0}, 44, 82)
    # sill + lower light bar
    b.rect(2, 88, W - 3, 92, K2)
    b.hl(2, W - 3, 88, K4)
    b.hl(40, W - 4, 88, S1)
    b.hl(2, W - 3, 89, K3)
    b.hl(2, W - 3, 92, K1)
    for side in (-1, 1):
        s.stamp(["kkkkkkkkkk",
                 "kab.2223kk",
                 "kaa.1103.k",
                 "kkkkkkkkkk"], LAMP, LAMP, 3, 89)
    # pull strap hanging from the door's bottom rail
    b.stamp(["abba", "abba", "abba", "ab.a", "ab.a", "ab.a", "ab.a", "ab.a",
             "ab.a", ".aa."], {"a": K1, "b": K2}, 34, 86)
    b.px(35, 86, K3)
    # mud flaps hanging behind the duals (tyres show underneath)
    for side in (-1, 1):
        x0 = 5 if side < 0 else W - 1 - 5 - 22
        b.rect(x0, 93, x0 + 22, 107, K1)
        b.hl(x0, x0 + 22, 93, K3)
        b.hl(x0, x0 + 22, 94, K2)
        b.vl(x0, 94, 107, K0)
        b.vl(x0 + 22, 94, 107, K2 if side > 0 else K0)
        b.vl(x0 + 21, 95, 106, K2 if side > 0 else K1)
        b.hl(x0 + 2, x0 + 20, 104, K2)       # stiffening ribs
        b.hl(x0 + 2, x0 + 20, 105, K0)
        b.hl(x0 + 1, x0 + 21, 107, K0)
    # underride bumper bar on brackets
    for side in (-1, 1):
        s.vpair(30, 93, 101, K1, K1)
        s.vpair(31, 93, 101, K2, K3)
    b.rect(28, 101, W - 29, 104, K2)
    b.hl(28, W - 29, 101, K4)
    b.hl(48, W - 30, 101, S2)
    b.hl(28, W - 29, 102, K3)
    b.hl(28, W - 29, 104, K1)
    b.vl(28, 101, 104, K1)

    outline_body(b, P, lit=lit)
    return compose(lo, b)


RIVALS = [
    ("coupe_blue", lambda: draw_coupe(BLUE)),
    ("coupe_green", lambda: draw_coupe(GREEN)),
    ("coupe_white", lambda: draw_coupe(WHITE)),
    ("coupe_yellow", lambda: draw_coupe(YELLOW)),
    ("sports_black", lambda: draw_sports(BLACK)),
    ("sports_silver", lambda: draw_sports(SILVER)),
    ("beetle_yellow", lambda: draw_beetle(BUGYEL)),
    ("beetle_teal", lambda: draw_beetle(TEAL)),
    ("pickup_white", lambda: draw_pickup(WHITE)),
    ("pickup_brown", lambda: draw_pickup(BROWN)),
    ("van_orange", lambda: draw_van(ORANGE, CREAM, CURT_O)),
    ("van_blue", lambda: draw_van(VBLUE, WHITE, CURT_B)),
    ("truck_white", lambda: draw_truck(WHITE, ORANGE, TEAL)),
]


def preview_rivals(rivals, player, path, zoom=4):
    """One row per rival: [player | rival] over asphalt, then over sky."""
    bgs = [(0x70, 0x70, 0x78, 255), (0x8f, 0xbd, 0xf2, 255)]
    pad, gap = 6, 8
    cellw = player.w + gap + max(cv.w for _, cv in rivals) + pad * 2
    cellh = max([player.h] + [cv.h for _, cv in rivals]) + pad * 2
    sheet = Image.new("RGBA", (cellw * len(bgs), cellh * len(rivals)),
                      (40, 30, 50, 255))
    for r, (name, cv) in enumerate(rivals):
        for b, bg in enumerate(bgs):
            cell = Image.new("RGBA", (cellw, cellh), bg)
            gy = cellh - pad
            cell.alpha_composite(player.image(), (pad, gy - player.h))
            rx = pad + player.w + gap
            cell.alpha_composite(cv.image(), (rx, gy - cv.h))
            sheet.paste(cell, (b * cellw, r * cellh))
    sheet = sheet.resize((sheet.width * zoom, sheet.height * zoom),
                         Image.NEAREST)
    sheet.save(path)


def preview_small(rivals, player, path, zoom=4):
    """Readability check: everything shrunk to 1/4 (nearest), over asphalt."""
    ims = [("player", player)] + list(rivals)
    smalls = []
    for _, cv in ims:
        im = cv.image()
        smalls.append(im.resize((max(1, im.width // 4), max(1, im.height // 4)),
                                Image.NEAREST))
    w = sum(s.width for s in smalls) + 4 * (len(smalls) + 1)
    h = max(s.height for s in smalls) + 8
    rowh = h
    sheet = Image.new("RGBA", (w, rowh * 2), (0x70, 0x70, 0x78, 255))
    sky = Image.new("RGBA", (w, rowh), (0x8f, 0xbd, 0xf2, 255))
    sheet.paste(sky, (0, rowh))
    for row in range(2):
        x = 4
        for s in smalls:
            sheet.alpha_composite(s, (x, row * rowh + rowh - 4 - s.height))
            x += s.width + 4
    sheet = sheet.resize((sheet.width * zoom, sheet.height * zoom),
                         Image.NEAREST)
    sheet.save(path)


def check_sprite(name, cv):
    a = cv.a[:, :, 3]
    assert set(np.unique(a)) <= {0, 255}, name + ": alpha not 0/255"
    assert a[-1].any(), name + ": bottom row empty"
    assert a[0].any(), name + ": top row empty"
    cols = np.nonzero(a.any(axis=0))[0]
    lm, rm = cols[0], cv.w - 1 - cols[-1]
    assert abs(lm - rm) <= 1, (name, "not centred", lm, rm)
    bot = np.nonzero(a[-1])[0]
    bl, br = bot[0], cv.w - 1 - bot[-1]
    assert abs(bl - br) <= 1, (name, "base not centred", bl, br)


# ---------------------------------------------------------------------------
# output
# ---------------------------------------------------------------------------
def save_all(sprites):
    os.makedirs(OUT, exist_ok=True)
    manifest = []
    for name, cv in sprites:
        cv.image().save(os.path.join(OUT, name + ".png"))
        manifest.append({"name": name, "w": cv.w, "h": cv.h})
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    return manifest


def preview(sprites, path, zoom=4, cols=None, overlay=None, bgs=None):
    """Each sprite over asphalt and sky, zoomed."""
    bgs = bgs or [(0x70, 0x70, 0x78, 255), (0x8f, 0xbd, 0xf2, 255)]
    pad = 4
    cellw = max(cv.w for _, cv in sprites) + pad * 2
    cellh = max(cv.h for _, cv in sprites) + pad * 2
    n = len(sprites)
    cols = cols or n
    rows = (n + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cellw * len(bgs), rows * cellh),
                      (40, 30, 50, 255))
    for i, (name, cv) in enumerate(sprites):
        r, c = divmod(i, cols)
        for b, bg in enumerate(bgs):
            cell = Image.new("RGBA", (cellw, cellh), bg)
            im = cv.image()
            cell.alpha_composite(im, ((cellw - cv.w) // 2, cellh - pad - cv.h))
            if overlay and name in overlay:
                cell.alpha_composite(overlay[name].image(),
                                     ((cellw - cv.w) // 2, cellh - pad - cv.h))
            sheet.paste(cell, ((c * len(bgs) + b) * cellw, r * cellh))
    sheet = sheet.resize((sheet.width * zoom, sheet.height * zoom), Image.NEAREST)
    sheet.save(path)


def main():
    sprites = []
    brakes = {}
    for view in ("straight", "left", "right"):
        for fr in (0, 1):
            body, br = draw_player(view, fr)
            sprites.append(("player_%s_%d" % (view, fr), body))
            if fr == 0:
                brakes[view] = br
    for view in ("straight", "left", "right"):
        sprites.append(("player_brake_%s" % view, brakes[view]))

    rivals = []
    for name, fn in RIVALS:
        cv = fn()
        check_sprite(name, cv)
        rivals.append((name, cv))
    save_all(sprites + rivals)
    player = [s for s in sprites if s[0].startswith("player_") and "brake" not in s[0]]
    preview(player, os.path.join(HERE, "preview_player.png"), zoom=4, cols=2)
    ov = {"player_%s_0" % v: brakes[v] for v in ("straight", "left", "right")}
    preview([s for s in player if s[0].endswith("_0")],
            os.path.join(HERE, "preview_player_brake.png"), zoom=4, cols=3,
            overlay=ov)
    big = [s for s in player if s[0] == "player_straight_0"]
    preview(big, os.path.join(HERE, "preview_player_big.png"), zoom=8)
    turns = [s for s in player if s[0] in ("player_left_0", "player_right_0")]
    preview(turns, os.path.join(HERE, "preview_player_turns.png"), zoom=8,
            bgs=[(0x70, 0x70, 0x78, 255)])

    # ---- rivals
    pl = dict(sprites)["player_straight_0"]
    rp = os.path.join(HERE, "preview_rivals_%s.png")
    groups = [("coupes", ("coupe_",)), ("sports_beetles", ("sports_", "beetle_")),
              ("pickups_vans", ("pickup_", "van_")), ("truck", ("truck_",))]
    for tag, pre in groups:
        grp = [(n, cv) for n, cv in rivals if n.startswith(pre)]
        if grp:
            preview_rivals(grp, pl, rp % tag)
    preview_small(rivals, pl, rp % "quarter", zoom=4)


if __name__ == "__main__":
    main()

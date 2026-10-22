#!/usr/bin/env python3
"""Extra player cars for Velvet Cruise (same frame, view and style as the red
convertible in make_vehicles.py, so the couple, the speech bubbles and the
tumble crash line up for every car).

  player_yellow_*   wedge-shaped Italian supercar roadster with a big rear wing
  player_green_*    curvy German sports car (cabriolet) with a whale-tail spoiler
  player_blue_*     American muscle convertible with white racing stripes

For each car: <prefix>_{straight,left,right}_{0,1}, <prefix>_brake_{view},
<prefix>_empty (nobody aboard, for the tumble crash).  Taillight lenses use the
shared unlit lens colours T0..T3, which the game also lights up at night.

Run:  python3 make_hero_cars.py   (then python3 ../../pack_assets.py)
"""
import os

import numpy as np
from PIL import Image

import make_vehicles as mv
from make_vehicles import (Canvas, C, CLEAR, K0, K1, K2, K3, K4, S0, S1, S2, S3,
                           T0, T1, T2, T3, A0, A1, A2, BR0, BR1, BR2, GL0, GL1, GL2,
                           PW, PH, PCX_WORK, CREASE, draw_driver, draw_passenger, player_geom)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")


def ramp(*hexes):
    return [C(h) for h in hexes]


# body ramps: 0 darkest .. 6 brightest, shadows cool, lights warm
YEL = ramp("#5a2a10", "#8a4a10", "#c07a12", "#eeb21c", "#fcd23a", "#fff07a", "#fffcd0")
YEL_O = C("#341a0e")
GRN = ramp("#0c2c22", "#104030", "#16603c", "#22844a", "#3cac58", "#86d474", "#d6f6ae")
GRN_O = C("#0a1a16")
BLU = ramp("#10164a", "#16226c", "#1e3698", "#2a56c8", "#3e7ae6", "#7cb0f8", "#cce4ff")
BLU_O = C("#0a0c2e")
STRIPE = ramp("#8e90ac", "#c6c8da", "#f2f0f6", "#ffffff")

# seats
SEAT_BLACK = dict(o=K0, d=K1, m=K2, l=K3, h=K4)
SEAT_TAN = dict(o=C("#3a2414"), d=C("#6a4426"), m=C("#9a6a3c"), l=C("#c8945a"), h=C("#e8c08a"))
SEAT_WHITE = dict(o=C("#3a3850"), d=C("#8a8aa4"), m=C("#c4c4d6"), l=C("#e8e8f0"), h=C("#ffffff"))

SPECS = {
    "yellow": dict(B=YEL, O=YEL_O, seat=SEAT_BLACK, model="toro",
                   ytop=[16, 14, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 10, 9, 9, 9]),
    "green": dict(B=GRN, O=GRN_O, seat=SEAT_TAN, model="speedster",
                  ytop=[21, 18, 16, 15, 14, 13, 13, 12, 12, 12, 12, 12, 12, 12, 11, 10, 9, 9, 9]),
    "blue": dict(B=BLU, O=BLU_O, seat=SEAT_WHITE, model="stallion",
                 ytop=[15, 13, 12, 12, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 9, 9, 9]),
}


def draw_seat(cv, x0, y0, side, S):
    seat = [
        "..ooooooooooo..",
        ".o44555555544o.",
        "o3444444444443o",
        "o3333333133332o",
        "o2333333133322o",
        "o2222222122222o",
    ]
    if side < 0:
        leg = {"o": S["o"], "1": S["d"], "2": S["d"], "3": S["m"], "4": S["m"], "5": S["l"]}
    else:
        leg = {"o": S["o"], "1": S["d"], "2": S["m"], "3": S["m"], "4": S["l"], "5": S["h"]}
    cv.stamp(seat, leg, x0, y0)


def draw_flank(cv, side, FL, FR, B, O, vents):
    """Side sliver turned toward the camera: fender, optional intake vents and
    the outer face of the rear wheel (same layout as the red car's flank)."""
    shade = side < 0
    if shade:
        P = dict(h=B[2], m=B[1], l=B[0], f=O, g=B[2], k=K0, t=K1, u=K2, r=S0, R=S1, w=S2)
    else:
        P = dict(h=B[4], m=B[3], l=B[2], f=B[1], g=B[5], k=K0, t=K1, u=K3, r=S1, R=S2, w=S3)
    Wd = 8
    g = [["." for _ in range(Wd)] for _ in range(PH)]
    for c in range(Wd):
        r = (Wd - 1 - c) // 2
        for y in range(12, 39 - r):
            g[y][c] = "m"
        for y in range(14, 18 - r):
            g[y][c] = "h"
        if vents:
            for j in range(3):
                y = 21 + 3 * j - r
                g[y][c] = "f"
                g[y + 1][c] = "k"
        else:
            g[24 - r][c] = "g"       # one swage line along the side
        g[38 - r][c] = "l"
        g[37 - r][c] = "l"
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
            y = 35 + j - (Wd - 1 - c) // 3
            if ch != ".":
                g[y][c] = ch
    for c in (6, 7):
        for y in range(39, PH):
            g[y][c] = "t" if c == 6 else "k"
        g[PH - 1][6] = "k"
    for y in range(PH):
        for c in range(Wd):
            ch = g[y][c]
            if ch == ".":
                continue
            x = (FL - Wd + c) if side < 0 else (FR + Wd - c)
            cv.px(x, y, P[ch])


def lens(cv, x0, x1, y0, y1, divider=None, glint=True):
    """Unlit red lens block (T palette): brighter top rows, dark bottom row."""
    cv.rect(x0, y0, x1, y1, T1)
    cv.hl(x0, x1, y0, T2)
    if y1 - y0 >= 3:
        cv.hl(x0, x1, y0 + 1, T2)
    cv.hl(x0, x1, y1, T0)
    if divider is not None:
        cv.vl(divider, y0, y1, T0)
    if glint:
        cv.px(x1 - 1, y0, T3)
        cv.px(x1 - 2, y0, T3)
        if y1 > y0 + 1:
            cv.px(x1 - 1, y0 + 1, T3)


def round_tip(cv, x, y):
    cv.stamp([".ab.",
              "bccd",
              "bccd",
              ".dd."], {"a": S3, "b": S2, "c": K0, "d": S0}, x, y)


def draw_hero(key, view, frame, people=True):
    """Returns (body 88x48, brake overlay 88x48)."""
    spec = SPECS[key]
    B, O, model = spec["B"], spec["O"], spec["model"]
    g = player_geom(view)
    FL, FR, flank, fw, k = g["FL"], g["FR"], g["flank"], g["fw"], g["k"]
    cv = Canvas(PCX_WORK, PH)
    cx = (FL + FR) / 2.0
    icx = int(np.floor(cx))

    def Lx(d):
        return FL + d

    def Rx(d):
        return FR - d

    def side_x(side, d):
        return Lx(d) if side < 0 else Rx(d)

    def lit(side, dark, light):
        return dark if side < 0 else light

    # ------------------------------------------------------------ tyres + under
    cv.xoff = None
    TY_T, tw = 37, 12
    if model == "toro":
        tw = 13                      # fat supercar rear tyres
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
        if side > 0:
            cv.vl(x1 - 1, TY_T + 1, PH - 2, K3)
            cv.vl(x1 - 2, TY_T + 1, PH - 2, K2)
        else:
            cv.vl(x1 - 1, TY_T + 1, PH - 2, K2)
        cv.px(x0, PH - 1, CLEAR)
        cv.px(x1, PH - 1, CLEAR)
    ux0, ux1 = tyres[0][1] + 1, tyres[1][0] - 1
    cv.rect(ux0, 38, ux1, 45, K0)
    cv.hl(ux0, ux1, 38, K1)
    cv.hl(ux0 + 1, ux1 - 1, 46, K0)
    for fx in (icx - 9, icx - 4, icx + 5, icx + 10):
        cv.vl(fx, 41, 44, K1)

    # ------------------------------------------------------------ rear face base
    cv.rect(FL, 23, FR, 37, B[3])
    cv.hl(FL + 1, FR - 1, 38, B[1])
    cv.hl(FL + 2, FR - 2, 39, B[0])
    cv.rect(FL, 33, FR, 37, B[2])
    cv.hl(FL, FR, 32, B[4])
    cv.hl(icx + 8, FR - 3, 32, B[5])
    cv.hl(FL, FR, 37, B[1])
    cv.vl(FL, 23, 37, B[2])
    cv.vl(FR, 23, 32, B[4])
    cv.vl(FR, 33, 37, B[3])

    lights = []   # (x0, x1, y0, y1) lens boxes, for the brake overlay
    if model == "toro":
        # black tail band: slim wide lights + engine vents, mesh in the middle
        cv.rect(Lx(1), 25, Rx(1), 31, K0)
        tlw = 19
        for side in (-1, 1):
            x0 = Lx(2) if side < 0 else Rx(2) - tlw + 1
            x1 = x0 + tlw - 1
            # amber on the outer end, two red sections, slanted inner end
            if side < 0:
                cv.rect(x0, 26, x0 + 3, 28, A0)
                cv.hl(x0, x0 + 3, 26, A1)
                cv.px(x0 + 3, 26, A2)
                lens(cv, x0 + 5, x1 - 1, 26, 28, divider=x0 + 12)
                cv.px(x1 - 1, 28, K0)
            else:
                cv.rect(x1 - 3, 26, x1, 28, A0)
                cv.hl(x1 - 3, x1, 26, A1)
                cv.px(x1, 26, A2)
                lens(cv, x0 + 1, x1 - 5, 26, 28, divider=x1 - 12)
                cv.px(x0 + 1, 28, K0)
            lights.append((x0, x1, 26, 28))
            # vent slats under each light
            for y in (30,):
                cv.hl(x0, x1, y, K2)
            cv.hl(x0 + (1 if side < 0 else 4), x1 - (4 if side < 0 else 1), 30, K2)
        mx0, mx1 = lights[0][1] + 2, lights[1][0] - 2
        for y in range(26, 31):
            for x in range(mx0, mx1 + 1):
                if (x + y) % 2 == 0:
                    cv.px(x, y, K2 if x < icx + 3 else K3)
        # lower: body band then a finned diffuser with four tips in the middle
        cv.rect(Lx(8), 35, Rx(8), 38, K0)
        cv.hl(Lx(8), Rx(8), 35, K1)
        for fx in range(Lx(10), Rx(10) + 1, 5):
            cv.vl(fx, 36, 38, K2)
        for j, tx in enumerate((icx - 10, icx - 5, icx + 2, icx + 7)):
            round_tip(cv, tx, 37)
    elif model == "speedster":
        # one red light bar right across the back: clusters at the ends, reflector strip between
        cv.rect(Lx(1), 24, Rx(1), 30, K0)
        cw = 16
        for side in (-1, 1):
            x0 = Lx(2) if side < 0 else Rx(2) - cw + 1
            x1 = x0 + cw - 1
            lens(cv, x0, x1, 25, 29)
            cv.hl(x0, x1, 27, T0)
            # amber indicator in the outer lower corner
            ax0 = x0 if side < 0 else x1 - 4
            cv.rect(ax0, 28, ax0 + 4, 29, A0)
            cv.hl(ax0, ax0 + 4, 28, A1)
            lights.append((x0, x1, 25, 29))
        rx0, rx1 = lights[0][1] + 2, lights[1][0] - 2
        cv.rect(rx0, 26, rx1, 28, T0)
        cv.hl(rx0, rx1, 26, T1)
        for x in range(rx0 + 2, rx1 - 1, 4):
            cv.px(x, 27, T1)
        cv.px(rx1 - 2, 26, T2)
        cv.px(rx1 - 3, 26, T2)
        lights.append((rx0, rx1, 26, 28))
        # black rubber bumper strip, blank plate recess under it
        cv.rect(Lx(0), 33, Rx(0), 34, K1)
        cv.hl(Lx(0), Rx(0), 33, K2)
        cv.hl(icx + 6, Rx(2), 33, K3)
        p0, p1 = icx - 9, icx + 10
        cv.rect(p0, 35, p1, 38, O)
        cv.rect(p0 + 1, 35, p1 - 1, 38, B[1])
        cv.hl(p0 + 2, p1 - 2, 36, B[2])
        # twin tailpipes on the left only
        cv.rect(icx - 26, 38, icx - 16, 41, K0)
        round_tip(cv, icx - 25, 38)
        round_tip(cv, icx - 20, 38)
        # rounded rear corners
        for (x, y) in ((FL, 23), (FL, 24), (FL + 1, 23), (FR, 23), (FR, 24), (FR - 1, 23),
                       (FL, 37), (FR, 37)):
            cv.px(x, y, CLEAR)
    else:  # stallion
        # black panel with three upright lights a side and a round fuel cap in the middle
        cv.rect(Lx(2), 25, Rx(2), 31, K0)
        for side in (-1, 1):
            for j in range(3):
                bx = Lx(3) + j * 5 if side < 0 else Rx(3) - j * 5 - 3
                lens(cv, bx, bx + 3, 26, 30, glint=False)
                cv.px(bx + 2, 26, T3)
                cv.px(bx + 2, 27, T3)
            x0 = Lx(3) if side < 0 else Rx(3) - 13
            lights.append((x0, x0 + 13, 26, 30))
        cv.stamp([".bab.",
                  "bacdb",
                  "acddb",
                  "bcddb",
                  ".bbb."], {"a": S3, "b": S1, "c": S2, "d": S0}, icx - 2, 26)
        # chrome bumper
        cv.hl(Lx(0), Rx(0), 33, S2)
        cv.hl(icx + 4, Rx(1), 33, S3)
        cv.hl(Lx(0), Rx(0), 34, S1)
        cv.hl(Lx(1), Rx(1), 35, S0)
        p0, p1 = icx - 9, icx + 10
        cv.rect(p0, 36, p1, 38, O)
        cv.rect(p0 + 1, 36, p1 - 1, 38, B[1])
        # a big round pipe each side
        for bx in (icx - 24, icx + 19):
            cv.rect(bx - 1, 38, bx + 4, 41, K0)
            round_tip(cv, bx, 38)

    # ------------------------------------------------------------ flank sliver
    if flank:
        draw_flank(cv, flank, FL, FR, B, O, vents=(model == "toro"))

    # ------------------------------------------------------------ upper (sheared)
    def shear(y):
        if y > CREASE:
            return 0
        return int(round(min(CREASE + 1 - y, 16) * k))

    cab = shear(0)
    cv.xoff = shear
    ytop = spec["ytop"]
    for side in (-1, 1):
        for d, yt in enumerate(ytop):
            cv.vl(side_x(side, d), yt, CREASE, B[3])
    cv.rect(Lx(len(ytop)), 16, Rx(len(ytop)), CREASE, B[3])

    for side in (-1, 1):
        sx = lambda d: side_x(side, d)
        for d in range(3):
            cv.vl(sx(d), ytop[d], CREASE - 1, lit(side, B[2], B[4]))
        cv.vl(sx(0), ytop[0], CREASE - 1, lit(side, B[1], B[4]))
        if side > 0:
            cv.vl(sx(1), ytop[1] + 1, CREASE - 2, B[5])
        for d in range(1, 14):
            cv.px(sx(d), ytop[d], lit(side, B[4], B[5]))
        for d in range(4, 12):
            cv.px(sx(d), ytop[d] + 1, B[4])
        if side > 0:
            for d in range(6, 10):
                cv.px(sx(d), ytop[d], B[6])
        for d in range(13, 19):
            cv.px(sx(d), ytop[d], lit(side, B[4], B[5]))
        for d in range(16, 19):
            cv.vl(sx(d), ytop[d] + 1, 15, B[2])
        cv.vl(sx(18), 9, 15, B[1])
        for i, d in enumerate(range(13, 17)):
            cv.px(sx(d), 12 + i, lit(side, B[4], B[2]))

    cv.rect(Lx(19), 9, Rx(19), 15, K1)
    lid0, lid1 = Lx(22), Rx(22)
    if model == "toro":
        # engine cover louvres
        for y in (18, 20):
            cv.hl(lid0, lid1, y, K1)
            cv.hl(icx + 2, lid1, y, K2)
        cv.hl(lid0, lid1, 19, B[3])
        cv.hl(lid0, lid1, 21, B[4])
    elif model == "speedster":
        pass  # the whale tail is drawn after the cockpit (it stands in front of the seats)
    else:
        cv.hl(lid0, lid1, 18, B[2])
        cv.hl(lid0, lid1, 19, B[3])
        cv.hl(lid0, lid1, 20, B[3])
        # ducktail lip at the back of the boot
        cv.hl(Lx(3), Rx(3), 21, B[5])
        cv.hl(Lx(3), Rx(3), 20, B[2])
    cv.hl(Lx(1), Rx(1), CREASE, B[4])
    cv.hl(icx + 6, Rx(4), CREASE, B[5])
    cv.hl(icx + 16, Rx(8), CREASE, B[6])
    cv.hl(Lx(8), Lx(14), CREASE, B[5])

    # ---- cabin (moves rigidly)
    cv.xoff = lambda y: cab if y <= 16 else shear(y)
    cv.rect(Lx(19), 7, Rx(19), 8, K1)
    cv.hl(Lx(20), Rx(20), 7, K2)
    for side in (-1, 1):
        for i in range(7):
            yy = 7 - i
            d = 18 + (i + 1) // 2
            x = side_x(side, d)
            cv.px(x, yy, lit(side, B[3], B[4]))
            cv.px(x - side, yy, O)
    tb0, tb1 = Lx(22), Rx(22)
    cv.hl(tb0, tb1, 1, B[3])
    cv.hl(icx + 4, tb1 - 1, 1, B[4])
    cv.hl(tb0 + 1, tb1 - 1, 2, O)
    cv.hl(tb0, tb1, 0, CLEAR)
    cv.stamp(["abbbbbba",
              ".accdda."], {"a": K0, "b": K2, "c": K3, "d": GL1}, icx - 3, 3)
    for side in (-1, 1):
        m = [".abbbbba",
             "abccddeb",
             "bccdddeb",
             "bbccddbb",
             ".ooooooo"]
        leg = {"a": O, "b": lit(side, B[2], B[4]), "c": GL0, "d": GL1, "e": GL2, "o": B[1]}
        mx = Lx(6) if side < 0 else Rx(6) - 7
        cv.stamp(m, leg, mx, 3)
        st = Lx(14) if side < 0 else Rx(16)
        cv.hl(st, st + 2, 6, lit(side, B[2], B[3]))
        cv.hl(st, st + 2, 7, B[1])

    if people:
        draw_driver(cv, Lx(28), frame)
        draw_passenger(cv, Rx(28), frame)
    S = spec["seat"]
    for side in (-1, 1):
        sx0 = Lx(21) if side < 0 else Rx(21) - 14
        draw_seat(cv, sx0, 12, side, S)
    cv.rect(Lx(36), 13, Rx(36), 15, K1)
    cv.hl(Lx(36), Rx(36), 13, K2)
    cv.xoff = shear
    cv.hl(Lx(17), Rx(17), 16, B[1])
    cv.hl(Lx(17), Rx(17), 17, B[4])
    cv.hl(icx + 2, Rx(18), 17, B[5])

    if model == "toro":
        # the big rear wing: a thin blade on two struts, standing up above the deck
        wy = 9
        w0, w1 = Lx(4), Rx(4)
        for sxs in (Lx(22), Rx(23)):
            cv.vl(sxs, wy + 3, 19, K0)
            cv.vl(sxs + 1, wy + 3, 19, K2)
        cv.hl(w0 + 1, w1 - 1, wy, B[5])
        cv.hl(icx + 6, w1 - 2, wy, B[6])
        cv.hl(w0, w1, wy + 1, B[3])
        cv.hl(icx + 10, w1 - 1, wy + 1, B[4])
        cv.hl(w0, w1, wy + 2, B[1])
        cv.hl(w0 + 1, w1 - 1, wy + 3, O)
        for side in (-1, 1):
            ex = w0 if side < 0 else w1
            for e in (0, 1):
                cv.vl(ex - side * e, wy - 2, wy + 3, lit(side, B[2], B[4]) if e == 0 else (B[1] if side < 0 else B[3]))
            cv.px(ex, wy - 3, O)
            cv.px(ex - side, wy - 3, O)
            cv.px(ex, wy + 4, O)
            cv.px(ex - side, wy + 4, O)
    if model == "speedster":
        # whale-tail spoiler: lit top surface with a short grille and a thick black rubber lip
        wl0, wl1 = Lx(9), Rx(9)
        cv.hl(wl0 + 2, wl1 - 2, 15, O)
        cv.hl(wl0 + 1, wl1 - 1, 16, B[5])
        cv.hl(icx + 6, wl1 - 3, 16, B[6])
        cv.rect(wl0, 17, wl1, 18, B[4])
        cv.hl(wl0, icx - 12, 18, B[3])
        for x in range(icx - 9, icx + 11, 3):
            cv.px(x, 17, K1)
            cv.px(x, 18, K1)
        cv.hl(wl0, wl1, 19, B[3])
        cv.rect(wl0, 20, wl1, 21, K1)
        cv.hl(icx + 3, wl1 - 2, 20, K3)
        for side in (-1, 1):
            ex = wl0 if side < 0 else wl1
            cv.vl(ex, 16, 21, O if side < 0 else B[2])
    if model == "stallion":
        # twin white racing stripes over the boot, the spoiler and the tail
        s_cols = [(icx - 5, icx - 2), (icx + 3, icx + 6)]
        for a, b in s_cols:
            for y in range(16, CREASE + 1):
                for x in range(a, b + 1):
                    if y == 16:
                        c = STRIPE[0]
                    elif y in (17, 21, CREASE):
                        c = STRIPE[3]
                    elif y == 20:
                        c = STRIPE[1]
                    else:
                        c = STRIPE[2] if x < b else STRIPE[3]
                    cv.px(x, y, c)
    cv.xoff = None
    if model == "stallion":
        for a, b in [(icx - 5, icx - 2), (icx + 3, icx + 6)]:
            for y in (23, 24, 32):
                cv.hl(a, b, y, STRIPE[3] if y != 24 else STRIPE[2])
            cv.hl(a, b, 35, STRIPE[1])

    # ---- inner outline on the silhouette sides
    cv.recolor_edge(O, sides="l")
    cv.recolor_edge(O, sides="r", protect=(B[4], B[5], B[6], K3, GL2, mv.YH3, STRIPE[3]))

    # ---- brake overlay: every lens pixel lights up
    br = Canvas(PCX_WORK, PH)
    lensm = np.zeros((PH, PCX_WORK), bool)
    for tc in (T0, T1, T2, T3):
        lensm |= np.all(cv.a == np.array(tc, np.uint8), axis=2)
    br.a[lensm] = BR0
    for (x0, x1, y0, y1) in lights:
        xs = [x for x in range(x0, x1 + 1) if lensm[y0, x]]
        if not xs:
            continue
        a, b = xs[0], xs[-1]
        for y in range(y0, min(y1, y0 + 2) + 1):
            for x in range(a + 1, b):
                if lensm[y, x]:
                    br.px(x, y, BR1)
        for x in range(a + 2, b - 1):
            if lensm[y0, x]:
                br.px(x, y0, BR2)

    x0, y0, x1, y1 = cv.bbox()
    w = x1 - x0 + 1
    assert w <= PW, (key, view, w)
    ox = (PW - w) // 2 - x0
    body = Canvas(PW, PH)
    brake = Canvas(PW, PH)
    body.a[:, x0 + ox:x1 + 1 + ox] = cv.a[:, x0:x1 + 1]
    brake.a[:, x0 + ox:x1 + 1 + ox] = br.a[:, x0:x1 + 1]
    return body, brake


def main():
    os.makedirs(OUT, exist_ok=True)
    sprites = []
    sheet_items = []
    for key in SPECS:
        pre = "player_" + key
        for view in ("straight", "left", "right"):
            for fr in (0, 1):
                body, br = draw_hero(key, view, fr)
                sprites.append(("%s_%s_%d" % (pre, view, fr), body))
                if fr == 0:
                    sprites.append(("%s_brake_%s" % (pre, view), br))
                    sheet_items.append((body, br))
        empty, _ = draw_hero(key, "straight", 0, people=False)
        sprites.append((pre + "_empty", empty))
    for name, cv in sprites:
        a = cv.a[:, :, 3]
        assert set(np.unique(a)) <= {0, 255}, name
        cv.image().save(os.path.join(OUT, name + ".png"))
    # preview: red car + every new car (straight/left/right, with and without brakes)
    red = [mv.draw_player(v, 0) for v in ("straight", "left", "right")]
    rows = [red] + [sheet_items[i * 3:(i + 1) * 3] for i in range(len(SPECS))]
    pad = 4
    cw, chh = PW + pad * 2, PH + pad * 2
    sheet = Image.new("RGBA", (cw * 4, chh * len(rows)), (0x70, 0x70, 0x78, 255))
    for r, row in enumerate(rows):
        for c, (body, br) in enumerate(row):
            im = body.image()
            sheet.alpha_composite(im, (c * cw + pad, r * chh + pad))
        body, br = row[0]
        sheet.alpha_composite(body.image(), (3 * cw + pad, r * chh + pad))
        sheet.alpha_composite(br.image(), (3 * cw + pad, r * chh + pad))
    sheet = sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST)
    sheet.save(os.path.join(HERE, "preview_hero_cars.png"))
    print(len(sprites), "sprites")


if __name__ == "__main__":
    main()

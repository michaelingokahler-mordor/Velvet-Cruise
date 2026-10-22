#!/usr/bin/env python3
"""Velvet Cruise -- Palm Cove's sky and far layer in the "painted slopes" look (sky_s1.png, far_s1.png).

What changed against make_backdrops.py stage 1:
  * SKY: the colour bands are no longer ruled horizontal stripes with a dither row on every edge.  Their
    boundaries wander gently from left to right (low-frequency noise), the dithered transition is a single
    row wide, and the sun's glow is unchanged.  No regular raster across the sky.
  * FAR LAYER: three headlands, back to front, each in its own atmospheric tone (pale blue-green haze ->
    soft sage -> warm Mediterranean green) instead of one slate grey.  Every headland is shaded in broad
    crest-parallel steps (lit rim, body, shaded foot, haze at the waterline) and its right-facing
    (sunlit) flank is lighter; the silhouettes are smooth with a few shoulders, no saw teeth.  A tiny
    white village with red roofs and two cypresses sits on the middle headland.  Boats and sea stacks are
    the old ones.

Run:  python3 -B make_cove_backdrops.py      (then tools/pack_assets.py)
Contract (unchanged): sky 640x80 RGB; far 640x56 RGBA; window x range 160..479; sunX 235 -> tile x 395.
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_backdrops as mb  # noqa: E402
from make_backdrops import C, mix, W, FAR_H  # noqa: E402

SN = 1


def wavy_sky():
    orig = mb.quantize
    wave = mb.periodic_noise(5, 7)[None, :] * 0.34 + mb.periodic_noise(9, 19)[None, :] * 0.12   # in band units

    def q(u, k, X, Y, umax):
        # soften the 'ruler' look: wander the band edges and keep the dither zone one row wide
        return orig(u + wave * (u < umax - 3), np.maximum(k, 6.0), X, Y, umax)
    mb.quantize = q
    try:
        return mb.render_sky(SN)
    finally:
        mb.quantize = orig


def smooth(h, k=5):
    pad = np.concatenate([h[-k:], h, h[:k]]).astype(float)
    ker = np.ones(2 * k + 1) / (2 * k + 1)
    return np.convolve(pad, ker, mode="same")[k:-k]


def render_far():
    st = mb.STAGES[SN]
    img = np.zeros((FAR_H, W, 4), np.uint8)
    Y, X = np.mgrid[0:FAR_H, 0:W]
    pal_sky, _ = mb.sky_palette(st)
    haze = np.array(pal_sky[-1], float)
    warm, cool = np.array(C("#fff0c8"), float), np.array(C("#33507a"), float)
    # back -> front: (start, end, H, h_end, cliff_w, seed, rough), tone
    layers = [((548, 300, 22, 9, 4, 11, 0.12), "#9db8bc"),
              ((566, 258, 33, 17, 5, 12, 0.12), "#7fa496"),
              ((588, 212, 46, 27, 6, 13, 0.10), "#639456")]
    tops = []
    for li, ((start, end, H, h_end, cw, seed, rough), tone) in enumerate(layers):
        depth = 1 - li / (len(layers) - 1)
        h, length = mb.headland_profile(start, end, H, h_end, cw, seed, rough)
        h = np.rint(smooth(h, 4)).astype(int)                       # one connected, calm contour
        mask = Y >= (FAR_H - h)[None, :]
        re, le, td = mb.edge_dist(mask)
        base = np.array(C(tone), float)
        rim = base * 0.55 + warm * 0.45 * (1 - 0.35 * depth)
        lit = base * 0.72 + warm * 0.28 * (1 - 0.35 * depth)
        shd = base * 0.82 + cool * 0.18
        foot = base * (0.55 + 0.25 * depth) + haze * (0.45 - 0.25 * depth)
        col = np.zeros((FAR_H, W, 3), float)
        col[:] = base
        # broad crest-parallel tone steps: lit crown, body, shaded foot
        crown = 2 + li
        col[mask & (td < crown)] = rim
        col[mask & (td >= crown) & (td < crown + 3 + 2 * li)] = lit
        low = (FAR_H - 1 - Y) < (5 + 3 * li)
        col[mask & low] = shd
        col[mask & ((FAR_H - 1 - Y) < 2)] = foot
        img[mask, :3] = np.rint(col[mask]).astype(np.uint8)
        img[mask, 3] = 255
        # seaward cliff end: a short, pale face with a foam foot
        xe = end % W
        for k in range(-1, 3 + li):
            xx = (xe + k) % W
            if k <= 0 or k % 2 == 0:
                img[FAR_H - 1, xx, :3] = C(st["foam"])
                img[FAR_H - 1, xx, 3] = 255
        tops.append((h, start, end, length))
    # a tiny village and cypresses on the middle headland (left of the window, tile x ~ 600..640 + 0..60)
    mid_h = tops[1][0]
    roof, wall = C("#d4553a"), C("#f6efe0")
    for k, x in enumerate((606, 611, 616, 621, 627, 632, 8, 14, 20)):
        xx = x % W
        top = FAR_H - int(mid_h[xx]) + 2 + (k % 3)
        wdt = 3 if k % 2 == 0 else 4
        for dx in range(wdt):
            img[top, (xx + dx) % W, :3] = roof; img[top, (xx + dx) % W, 3] = 255
            img[top + 1, (xx + dx) % W, :3] = wall if dx < wdt - 1 else mix(wall, "#c8bca8", 0.5); img[top + 1, (xx + dx) % W, 3] = 255
    for x in (612, 626, 11):
        xx = x % W
        top = FAR_H - int(mid_h[xx]) - 1
        for k in range(4):
            img[top + 4 - k, xx, :3] = C("#2f5a38"); img[top + 4 - k, xx, 3] = 255
    mb.draw_sea_things(img, SN, st, tops)
    return img


def main():
    sky = wavy_sky()
    far = render_far()
    Image.fromarray(sky, "RGB").save(os.path.join(mb.OUT, f"sky_s{SN}.png"))
    Image.fromarray(far, "RGBA").save(os.path.join(mb.OUT, f"far_s{SN}.png"))
    st = mb.STAGES[SN]
    win = mb.composite(sky, far, st["sea"], mb.WIN0, mb.SCREEN_W)
    Image.fromarray(mb.zoom(win)).save(os.path.join(HERE, "preview_s1.png"))
    tile = mb.composite(sky, far, st["sea"], 0, W)
    Image.fromarray(mb.zoom(tile)).save(os.path.join(HERE, "preview_tile_s1.png"))
    print("sky/far s1 written")


if __name__ == "__main__":
    main()

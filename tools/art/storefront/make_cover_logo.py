#!/usr/bin/env python3
"""Store cover with the game's name: paints the old logo out of the sky of the
original box art (cover_original.webp, kept next to this script) and draws the
"Velvet Cruise" logo in its place, in the same chunky pixel style (flat sunset
gradients, dithered bands, thick dark outline, speed streaks).

    python3 -B tools/art/storefront/make_cover_logo.py [--preview out.png]

Writes assets/ui/cover.webp (768x1024) and assets/ui/cover_sm.webp (400x533).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SRC = HERE / "cover_original.webp"
OUT = ROOT / "assets" / "ui" / "cover.webp"
OUT_SM = ROOT / "assets" / "ui" / "cover_sm.webp"
FONTS = Path("/usr/share/fonts/truetype/liberation")

PX = 3  # logo pixel size in cover pixels (the box art's own grid is ~2-3 px)

# Old logo footprint (cover px): "Sunset" + streaks, "Coast" + palm icons, "Run" + swoosh.
OLD_LOGO = [(44, 22), (690, 14), (724, 96), (726, 186), (702, 312), (618, 332), (618, 430),
            (170, 434), (170, 264), (150, 220), (44, 218)]

INK = (24, 12, 52)
SHADOW = (14, 6, 34)
GOLD = [(255, 246, 214), (255, 226, 150), (255, 198, 92), (255, 160, 60), (255, 120, 48), (246, 86, 52)]
PINK = [(255, 196, 214), (255, 128, 176), (255, 76, 140), (240, 44, 112), (204, 26, 96), (160, 16, 84)]


def inpaint(img: np.ndarray, mask: np.ndarray, iters=(400, 160, 90, 60, 40, 30)) -> np.ndarray:
    """Fill masked pixels smoothly from their surroundings (multi-scale membrane fill)."""
    levels = [(img.astype(np.float32), mask.copy())]
    while min(levels[-1][0].shape[:2]) > 24:
        a, m = levels[-1]
        h, w = (a.shape[0] // 2) * 2, (a.shape[1] // 2) * 2
        a, m = a[:h, :w], m[:h, :w]
        keep = (~m).astype(np.float32)[..., None]
        s = (a * keep).reshape(h // 2, 2, w // 2, 2, 3).sum((1, 3))
        k = keep.reshape(h // 2, 2, w // 2, 2, 1).sum((1, 3))
        levels.append((s / np.maximum(k, 1e-6), k[..., 0] == 0))
    fill = None
    for li in range(len(levels) - 1, -1, -1):
        a, m = levels[li]
        a = a.copy()
        if fill is None:
            a[m] = a[~m].mean(0)
        else:
            up = np.repeat(np.repeat(fill, 2, 0), 2, 1)
            up = np.pad(up, ((0, a.shape[0] - up.shape[0]), (0, a.shape[1] - up.shape[1]), (0, 0)), mode="edge")
            a[m] = up[m]
        n = iters[min(li, len(iters) - 1)]
        for _ in range(n):
            p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
            avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) * 0.25
            a[m] = avg[m]
        fill = a
    return fill


def bands(mask: Image.Image, cols, y0: int, y1: int) -> Image.Image:
    """Flat colour bands top→bottom over [y0, y1) with a checker dither on each seam."""
    w, h = mask.size
    out = np.zeros((h, w, 4), np.uint8)
    n = len(cols)
    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    t = np.clip((ys - y0) / max(1, y1 - y0), 0, 0.9999) * n
    i = np.floor(t).astype(int)
    f = t - i
    # dither the last 30% of each band into the next one
    nxt = np.minimum(i + 1, n - 1)
    use_next = (f > 0.7) & (((xs + ys) & 1) == 0)
    idx = np.where(use_next, nxt, i)
    idx = np.broadcast_to(idx, (h, w))
    pal = np.array(cols, np.uint8)
    out[..., :3] = pal[idx]
    out[..., 3] = (np.array(mask) > 127).astype(np.uint8) * 255
    return Image.fromarray(out, "RGBA")


def grow(mask: Image.Image, r: int) -> Image.Image:
    for _ in range(r):
        mask = mask.filter(ImageFilter.MaxFilter(3))
    return mask


def solid(mask: Image.Image, col) -> Image.Image:
    im = Image.new("RGBA", mask.size, col + (0,))
    im.putalpha(mask.point(lambda v: 255 if v > 127 else 0))
    return im


def text_mask(size, text, font, xy, skew=0.0) -> Image.Image:
    """Text on a small canvas (logo pixels), optionally slanted like a racing logo."""
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).text(xy, text, font=font, fill=255)
    if skew:
        m = m.transform(size, Image.AFFINE, (1, skew, -skew * size[1] * 0.5, 0, 1, 0), resample=Image.NEAREST)
    return m.point(lambda v: 255 if v > 110 else 0)


def fit(path: Path, text: str, width: int) -> ImageFont.FreeTypeFont:
    """Largest font size whose drawn text is at most `width` logo pixels wide."""
    size = 8
    while True:
        f = ImageFont.truetype(str(path), size + 1)
        bb = f.getbbox(text)
        if bb[2] - bb[0] > width:
            return ImageFont.truetype(str(path), size)
        size += 1


def clouds(img: np.ndarray, mask: np.ndarray, rng) -> np.ndarray:
    """Pixel cloud streaks over the patched sky, lit pink on top and shaded purple below."""
    H, W = mask.shape
    out = img.copy()
    ys, xs = np.nonzero(mask)
    lower = ys > 150
    ys, xs = np.concatenate([ys[lower], ys]), np.concatenate([xs[lower], xs])
    for _ in range(34):
        k = rng.integers(len(ys))
        cy, cx = ys[k], xs[k]
        lw, lh = rng.integers(70, 200), rng.integers(7, 15)
        x0, x1 = max(0, cx - lw // 2), min(W, cx + lw // 2)
        for y in range(max(0, cy - lh), min(H, cy + lh)):
            t = (y - cy) / lh
            half = lw / 2 * np.sqrt(max(0.0, 1 - t * t)) * (0.75 + 0.25 * np.sin(y * 0.9 + cx))
            a, b = int(cx - half), int(cx + half)
            a, b = max(x0, a), min(x1, b)
            if b <= a:
                continue
            row = mask[y, a:b]
            lit = np.array([1.22, 0.92, 0.96]) if t < 0.35 else np.array([0.9, 0.84, 1.02])
            out[y, a:b][row] = np.clip(out[y, a:b][row] * lit + (10 if t < 0.35 else 0), 0, 255)
    return out


def logo(size) -> Image.Image:
    """The logo on a canvas of `size` logo pixels (each later becomes PX x PX cover pixels)."""
    w, h = size
    sans = fit(FONTS / "LiberationSans-BoldItalic.ttf", "VELVET", int(w * 0.70))
    serif = fit(FONTS / "LiberationSerif-BoldItalic.ttf", "Cruise", int(w * 0.72))

    # "VELVET": heavy slanted caps, sunset gold
    v = text_mask(size, "VELVET", sans, (0, 0), skew=0.12)
    bb = v.getbbox()
    vx = (w - (bb[2] - bb[0])) // 2 - bb[0] + 8
    v = text_mask(size, "VELVET", sans, (vx, 6 - bb[1]), skew=0.12)
    vb = v.getbbox()
    # stretch the caps 40% taller about their top edge
    tall = v.crop((0, vb[1], w, vb[3]))
    tall = tall.resize((w, int((vb[3] - vb[1]) * 1.4)), Image.NEAREST)
    v = Image.new("L", size, 0)
    v.paste(tall, (0, vb[1]))
    vb = v.getbbox()

    # "Cruise": elegant italic, hot pink, tucked under and a little right
    c = text_mask(size, "Cruise", serif, (0, 0))
    cb = c.getbbox()
    cx = (w - (cb[2] - cb[0])) // 2 - cb[0] + 14
    cy = vb[3] + 2 - cb[1]
    c = text_mask(size, "Cruise", serif, (cx, cy))
    cbb = c.getbbox()

    # speed streaks out of the "V", a swoosh under "Cruise"
    streak = Image.new("L", size, 0)
    d = ImageDraw.Draw(streak)
    sy = vb[1] + (vb[3] - vb[1]) * 0.42
    for k, (dx, ln) in enumerate([(0, 48), (6, 38), (12, 28), (18, 20)]):
        y = int(sy + k * 7)
        x1 = vb[0] + 14 - dx // 2
        d.rectangle([x1 - ln, y, x1, y + 2], fill=255)
    swoosh = Image.new("L", size, 0)
    d = ImageDraw.Draw(swoosh)
    yb = cbb[3] + 4
    pts = [(cbb[0] - 8, yb + 7), (cbb[0] + 30, yb + 1), (cbb[2] + 4, yb - 6), (cbb[2] + 8, yb - 3),
           (cbb[0] + 40, yb + 6), (cbb[0] - 6, yb + 10)]
    d.polygon(pts, fill=255)

    gold = Image.alpha_composite(bands(v, GOLD, vb[1], vb[3]), bands(streak, GOLD[1:5], int(sy) - 2, int(sy) + 28))
    pink = Image.alpha_composite(bands(c, PINK, cbb[1] + 6, cbb[3]), bands(swoosh, PINK[1:4], yb - 6, yb + 10))
    shape = Image.fromarray(np.maximum.reduce([np.array(m) for m in (v, c, streak, swoosh)]))

    out = Image.new("RGBA", size, (0, 0, 0, 0))
    # long drop shadow down-right, then a thick dark outline, then the fills
    sh = Image.new("L", size, 0)
    for k in range(1, 5):
        sh.paste(255, (k, k), grow(shape, 3).crop((0, 0, w - k, h - k)))
    out = Image.alpha_composite(out, solid(sh, SHADOW))
    out = Image.alpha_composite(out, solid(grow(shape, 3), INK))
    out = Image.alpha_composite(out, gold)
    out = Image.alpha_composite(out, pink)
    # a pixel highlight running along the top of the gold letters
    va = np.array(v) > 127
    top = va & ~np.roll(va, 1, 0)
    hl = np.zeros((h, w, 4), np.uint8)
    hl[top] = (255, 255, 240, 255)
    out = Image.alpha_composite(out, Image.fromarray(hl, "RGBA"))
    return out


def main() -> None:
    base = Image.open(SRC).convert("RGB")
    W, H = base.size
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon(OLD_LOGO, fill=255)
    m = grow(m, 2)
    arr = np.array(base).astype(np.float32)
    mask = np.array(m) > 127
    filled = inpaint(arr, mask)
    # back onto the art's pixel grid with a light dither so the fill reads as painted sky, not blur
    rng = np.random.default_rng(7)
    g = filled.reshape(H // 2, 2, W // 2, 2, 3).mean((1, 3))
    g += rng.normal(0, 3.0, g.shape[:2])[..., None]
    g = np.repeat(np.repeat(g, 2, 0), 2, 1)
    g = clouds(g, mask, rng)
    h3, w3 = (H // 3) * 3, (W // 3) * 3
    q = np.repeat(np.repeat(g[:h3, :w3].reshape(h3 // 3, 3, w3 // 3, 3, 3).mean((1, 3)), 3, 0), 3, 1)
    g = np.pad(q, ((0, H - h3), (0, W - w3), (0, 0)), mode="edge")
    out = arr.copy()
    out[mask] = g[mask]
    sky = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

    # soft dusk glow behind the logo so it sits in the sky like the original
    lw, lh = W // PX, 140
    lg = logo((lw, lh))
    big = lg.resize((lw * PX, lh * PX), Image.NEAREST)
    oy = 30
    alpha = big.split()[3]
    pad = 60
    a2 = Image.new("L", (big.width, big.height + pad * 2), 0)
    a2.paste(alpha, (0, pad))
    glow = a2.filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * 0.32))
    glow_im = Image.new("RGBA", a2.size, (255, 80, 130, 0))
    glow_im.putalpha(glow)
    cov = sky.convert("RGBA")
    cov.alpha_composite(glow_im, (0, oy - pad))
    cov.alpha_composite(big, (0, oy))
    cov = cov.convert("RGB")

    cov.save(OUT, "WEBP", quality=92, method=6)
    cov.resize((400, 533), Image.LANCZOS).save(OUT_SM, "WEBP", quality=90, method=6)
    if "--preview" in sys.argv:
        p = sys.argv[sys.argv.index("--preview") + 1]
        prev = Image.new("RGB", (W + 400 + 20, H), (0, 0, 0))
        prev.paste(cov, (0, 0))
        prev.paste(Image.open(OUT_SM).convert("RGB"), (W + 20, 0))
        prev.save(p)
        sky.save(p.replace(".png", "_sky.png"))
    print("wrote", OUT, OUT_SM)


if __name__ == "__main__":
    main()

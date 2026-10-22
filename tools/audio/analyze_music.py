#!/usr/bin/env python3
"""
Verification for the Velvet Cruise soundtrack (no listening required):
  * decodes every mp3 with ffmpeg, reports duration / sample peak / true peak (4x) /
    RMS / integrated loudness (ffmpeg ebur128) / band-energy balance
  * loop-seam check: compares decoded samples around loopStart vs loopEnd and simulates
    the splice (also with simulated decoder start offsets)
  * renders PNGs: full-song spectrogram, intro waveform+spectrogram (8 s), jingle sheets
Usage: python3 analyze_music.py [png_dir]
"""
import os
import re
import sys
import json
import math
import subprocess

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, '..', '..'))
SR = 44100


def decode(path):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype='<f4').reshape(-1, 2).astype(np.float64)


def ebur128(path):
    r = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    txt = r.stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', txt)
    tp = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', txt)
    lra = re.findall(r'LRA:\s+(-?[\d.]+) LU', txt)
    return (float(I[-1]) if I else None, float(tp[-1]) if tp else None, float(lra[-1]) if lra else None)


def true_peak(x):
    n = len(x)
    N = 1 << int(math.ceil(math.log2(n)))
    up = 4
    pk = 0.0
    for ch in range(x.shape[1]):
        X = np.fft.rfft(x[:, ch], N)
        Y = np.zeros(N * up // 2 + 1, dtype=complex)
        Y[:len(X)] = X
        y = np.fft.irfft(Y, N * up) * up
        pk = max(pk, float(np.max(np.abs(y[:n * up]))))
    return 20 * math.log10(pk + 1e-12)


def band_balance(x):
    m = x.mean(axis=1)
    N = 1 << 16
    nseg = len(m) // N
    P = np.zeros(N // 2 + 1)
    w = np.hanning(N)
    for i in range(nseg):
        P += np.abs(np.fft.rfft(m[i * N:(i + 1) * N] * w)) ** 2
    f = np.fft.rfftfreq(N, 1 / SR)
    bands = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000),
             (4000, 8000), (8000, 16000)]
    tot = P.sum()
    return {'%d-%d' % b: round(10 * math.log10(P[(f >= b[0]) & (f < b[1])].sum() / tot + 1e-20), 1) for b in bands}


# ------------------------------------------------------------------ images
def colormap(v):
    """v in [0,1] -> RGB (dark blue -> purple -> orange -> yellow)"""
    stops = np.array([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66],
                      [245, 125, 21], [250, 193, 39], [252, 255, 164]], dtype=float)
    x = np.clip(v, 0, 1) * (len(stops) - 1)
    i = np.minimum(x.astype(int), len(stops) - 2)
    f = (x - i)[..., None]
    return (stops[i] * (1 - f) + stops[i + 1] * f).astype(np.uint8)


def spectrogram_img(x, width, height, fmin=30, fmax=16000, nfft=4096, dbrange=80):
    m = x.mean(axis=1) if x.ndim == 2 else x
    hop = max(1, (len(m) - nfft) // width)
    w = np.hanning(nfft)
    cols = []
    for i in range(width):
        s = i * hop
        seg = m[s:s + nfft]
        if len(seg) < nfft:
            seg = np.pad(seg, (0, nfft - len(seg)))
        cols.append(np.abs(np.fft.rfft(seg * w)))
    S = np.array(cols).T
    f = np.fft.rfftfreq(nfft, 1 / SR)
    lf = np.exp(np.linspace(math.log(fmax), math.log(fmin), height))
    rows = np.empty((height, width))
    for j, fr in enumerate(lf):
        k = fr / (SR / nfft)
        k0 = int(k)
        a = k - k0
        rows[j] = S[k0] * (1 - a) + S[min(k0 + 1, len(f) - 1)] * a
    D = 20 * np.log10(rows + 1e-9)
    D -= D.max()
    v = (D + dbrange) / dbrange
    return Image.fromarray(colormap(v)), lf


def label_freqs(draw, lf, x0, y0, fmarks=(50, 100, 200, 500, 1000, 2000, 5000, 10000)):
    for fm in fmarks:
        j = int(np.argmin(np.abs(lf - fm)))
        draw.line([(x0 - 6, y0 + j), (x0, y0 + j)], fill=(255, 255, 255))
        draw.text((2, y0 + j - 6), ('%dk' % (fm // 1000)) if fm >= 1000 else str(fm), fill=(255, 255, 255))


def wave_img(x, width, height):
    img = Image.new('RGB', (width, height), (16, 16, 24))
    d = ImageDraw.Draw(img)
    m = x.mean(axis=1)
    hop = len(m) / width
    for i in range(width):
        seg = m[int(i * hop):int((i + 1) * hop) + 1]
        if len(seg) == 0:
            continue
        lo, hi = seg.min(), seg.max()
        r = np.sqrt(np.mean(seg ** 2))
        cy = height / 2
        d.line([(i, cy - hi * cy), (i, cy - lo * cy)], fill=(90, 160, 230))
        d.line([(i, cy - r * cy), (i, cy + r * cy)], fill=(240, 200, 80))
    return img


def song_sheet(x, path, title, bpm=None, loop=None, intro_secs=8.0):
    W = 1600
    LM = 40
    img = Image.new('RGB', (W + LM, 300 + 40 + 220 + 300 + 70), (8, 8, 12))
    d = ImageDraw.Draw(img)
    d.text((LM, 4), title + '  (full file spectrogram, log freq 30 Hz-16 kHz, 80 dB range)', fill=(255, 255, 255))
    sp, lf = spectrogram_img(x, W, 300)
    img.paste(sp, (LM, 20))
    label_freqs(d, lf, LM, 20)
    dur = len(x) / SR
    for s in range(0, int(dur) + 1, 10):
        px = LM + int(s / dur * W)
        d.line([(px, 320), (px, 326)], fill=(255, 255, 255))
        d.text((px + 2, 324), '%ds' % s, fill=(200, 200, 200))
    if loop:
        for t, c in ((loop[0], (0, 255, 0)), (loop[1], (255, 60, 60))):
            px = LM + int(t / dur * W)
            d.line([(px, 20), (px, 320)], fill=c)
    # intro zoom
    y0 = 345
    seg = x[:int(intro_secs * SR)]
    d.text((LM, y0 - 4), 'first %.0f s: waveform (blue peak, yellow RMS) + spectrogram; ticks = beats' % intro_secs,
           fill=(255, 255, 255))
    wv = wave_img(seg, W, 200)
    img.paste(wv, (LM, y0 + 12))
    sp2, lf2 = spectrogram_img(seg, W, 300, nfft=2048)
    img.paste(sp2, (LM, y0 + 12 + 210))
    label_freqs(d, lf2, LM, y0 + 12 + 210)
    if bpm:
        beat = 60.0 / bpm
        k = 0
        while k * beat < intro_secs:
            px = LM + int(k * beat / intro_secs * W)
            d.line([(px, y0 + 12), (px, y0 + 22 if k % 4 else y0 + 40)], fill=(255, 255, 255))
            k += 1
    if loop and loop[0] < intro_secs:
        px = LM + int(loop[0] / intro_secs * W)
        d.line([(px, y0 + 12), (px, y0 + 520)], fill=(0, 255, 0))
    img.save(path)


def jingle_sheet(items, path):
    W, LM = 900, 40
    H = 150 + 200
    img = Image.new('RGB', ((W + LM) * 2, H * 2 + 20), (8, 8, 12))
    d = ImageDraw.Draw(img)
    for i, (name, x) in enumerate(items):
        ox = (i % 2) * (W + LM)
        oy = (i // 2) * H + 10
        d.text((ox + LM, oy), '%s  %.2f s' % (name, len(x) / SR), fill=(255, 255, 255))
        img.paste(wave_img(x, W, 130), (ox + LM, oy + 14))
        sp, lf = spectrogram_img(x, W, 190, nfft=2048)
        img.paste(sp, (ox + LM, oy + 150))
        label_freqs(d, lf, ox + LM, oy + 150)
    img.save(path)


# ------------------------------------------------------------------ loop seam
def seam_report(x, ls, le, win=4096):
    """compare samples after/before the two loop points and simulate the splice"""
    a, b = int(round(ls * SR)), int(round(le * SR))
    sig = np.sqrt(np.mean(x[b - win:b + win] ** 2)) + 1e-12
    after = x[a:a + win] - x[b:b + win]
    before = x[a - win:a] - x[b - win:b]
    out = {'after_diff_db': round(20 * math.log10(np.sqrt(np.mean(after ** 2)) / sig + 1e-12), 1),
           'before_diff_db': round(20 * math.log10(np.sqrt(np.mean(before ** 2)) / sig + 1e-12), 1)}
    # splice discontinuity vs. typical sample-to-sample step
    sp = np.concatenate([x[b - 2048:b], x[a:a + 2048]])
    dif = np.abs(np.diff(sp, axis=0)).max(axis=1)
    typ = np.percentile(np.abs(np.diff(x[b - 44100:b], axis=0)).max(axis=1), 99.9)
    out['splice_step'] = round(float(dif[2047]), 4)
    out['typ_step_p99.9'] = round(float(typ), 4)
    # simulated decoder offsets: buffer shifted by d samples (d>0 = extra leading samples)
    res = {}
    for dd in (-1105, -529, 529, 1105, 1152, 2257, 4410):
        if dd > 0:
            y = np.concatenate([np.zeros((dd, 2)), x])
        else:
            y = x[-dd:]
        e1 = y[b - 1024:b + 0]
        e2 = y[a - 1024:a + 0]
        n1 = y[b:b + 1024]
        n2 = y[a:a + 1024]
        # playing y up to b then jumping to a: compare the audio around the jump with the
        # audio around a (both should be 'the same music')
        diff = np.sqrt(np.mean((e1 - e2) ** 2) + np.mean((n1 - n2) ** 2)) / sig
        res[dd] = round(20 * math.log10(diff + 1e-12), 1)
    out['offset_sim_db'] = res
    return out


def seam_sheet(x, ls, le, path, title, secs=1.5):
    """spliced playback (body end -> loopStart) next to the natural continuation"""
    a, b = int(round(ls * SR)), int(round(le * SR))
    n = int(secs * SR)
    spliced = np.concatenate([x[b - n:b], x[a:a + n]])
    natural = x[b - n:b + n]          # the file continues with the body start again
    W, LM = 1200, 40
    img = Image.new('RGB', (W + LM, 2 * (120 + 200) + 40), (8, 8, 12))
    d = ImageDraw.Draw(img)
    for i, (lab, y) in enumerate((('spliced loop: ...body end | loopStart...', spliced),
                                  ('natural file continuation past loopEnd', natural))):
        oy = 4 + i * 330
        d.text((LM, oy), '%s - %s (+-%.1f s around the seam)' % (title, lab, secs), fill=(255, 255, 255))
        img.paste(wave_img(y, W, 110), (LM, oy + 14))
        sp, lf = spectrogram_img(y, W, 190, nfft=1024)
        img.paste(sp, (LM, oy + 130))
        label_freqs(d, lf, LM, oy + 130)
        d.line([(LM + W // 2, oy + 14), (LM + W // 2, oy + 320)], fill=(0, 255, 0))
    img.save(path)


def main():
    pngdir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'build', 'png')
    os.makedirs(pngdir, exist_ok=True)
    adir = os.path.join(GAME, 'assets', 'audio')
    with open(os.path.join(adir, 'music.json')) as fh:
        mj = json.load(fh)
    report = {}
    for s in mj['songs']:
        path = os.path.join(GAME, s['file'])
        x = decode(path)
        I, tp, lra = ebur128(path)
        r = dict(title=s['title'], bpm=s['bpm'], loopStart=s['loopStart'], loopEnd=s['loopEnd'],
                 bytes=os.path.getsize(path), dur=round(len(x) / SR, 3),
                 peak_db=round(20 * math.log10(np.abs(x).max()), 2), true_peak_db=round(true_peak(x), 2),
                 rms_db=round(10 * math.log10(np.mean(x ** 2)), 2), lufs=I, ff_tp=tp, lra=lra,
                 bands=band_balance(x), seam=seam_report(x, s['loopStart'], s['loopEnd']))
        report[s['title']] = r
        name = os.path.splitext(os.path.basename(path))[0]
        song_sheet(x, os.path.join(pngdir, name + '.png'), s['title'], s['bpm'], (s['loopStart'], s['loopEnd']))
        seam_sheet(x, s['loopStart'], s['loopEnd'], os.path.join(pngdir, name + '_seam.png'), s['title'])
        print(json.dumps(r))
    items = []
    for k, f in mj['jingles'].items():
        path = os.path.join(GAME, f)
        x = decode(path)
        I, tp, lra = ebur128(path)
        r = dict(bytes=os.path.getsize(path), dur=round(len(x) / SR, 3),
                 peak_db=round(20 * math.log10(np.abs(x).max()), 2), true_peak_db=round(true_peak(x), 2),
                 rms_db=round(10 * math.log10(np.mean(x ** 2)), 2), lufs=I, ff_tp=tp,
                 bands=band_balance(x))
        report[k] = r
        items.append((k, x))
        print(k, json.dumps(r))
    jingle_sheet(items, os.path.join(pngdir, 'jingles.png'))
    with open(os.path.join(pngdir, 'report.json'), 'w') as fh:
        json.dump(report, fh, indent=1)


if __name__ == '__main__':
    main()

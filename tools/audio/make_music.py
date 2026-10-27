#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Velvet Cruise -- original surf-rock radio soundtrack + jingles.

Generated tracks are synthesised from scratch with numpy (no samples).
Imported tracks listed in imported_music.json are preserved instead:

  guitars / bass  Karplus-Strong strings: Lagrange fractional delay, per-period
                  loss filter tuned for a high-frequency T60, pick-position and
                  pickup-position combs, tremolo picking (re-pick damping +
                  re-excitation), whammy vibrato, slides and glissandi.
  spring reverb   dispersive (chirping) allpass feedback loop solved in the
                  frequency domain -> the classic surf "drip"; 3 springs/side.
  organ           additive wavetable "Farfisa" (reedy + vibrato) and drawbar
                  tonewheel organ through a Leslie (doppler + AM).
  drums           sine / noise / metallic-oscillator synthesis.
  mix / master    FFT EQ, tanh drive, constant-power pan, spring + room sends,
                  gentle RMS compressor and look-ahead brick-wall limiter.

Synthesised songs are written as [intro][body][first 3 s of body again].  The body is
rendered *cyclically* (tails of the last bar wrap into the first bar, reverbs
are circular convolutions, the master runs on a wrapped signal), so looping
loopStart = end of intro -> loopEnd = end of body is sample exact.  The intro's
last bar is the same performance as the body's last bar (a drum fill into the
hook) and the file is cross-faded onto the periodic body before the loop
point, so a decoder that adds or trims start-up samples still loops cleanly.

Usage:  python3 make_music.py            (everything, ~40 s on 7 cores)
        python3 make_music.py coastline  (only the named items: coastline golden wave
                                          twist highway riptide checkpoint stage gameover goal)
        python3 analyze_music.py         (verification report + PNGs in build/png)
"""
import os
import re
import sys
import json
import math
import zlib
import wave
import time
import subprocess
from concurrent.futures import ProcessPoolExecutor

import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(GAME, 'assets', 'audio')
WORK = os.path.join(HERE, 'build')
with open(os.path.join(HERE, 'imported_music.json'), encoding='utf-8') as fh:
    IMPORTED_SONGS = json.load(fh)

SONG_LUFS = -15.1        # internal meter target (reads ~ -16.0 LUFS in ffmpeg ebur128 on the mp3)
JINGLE_LUFS = -14.5      # jingles ~1 LU hotter (game-over a bit softer, see its builder)
CEIL_DB = -2.0           # limiter ceiling (sample peak) -> true peak < -1 dBTP after mp3


# =============================================================================
#  small utilities
# =============================================================================
def next_fast(n):
    """smallest 2^a 3^b 5^c >= n (fast FFT size)"""
    best = 1 << int(math.ceil(math.log2(max(n, 2))))
    p5 = 1
    while p5 < best:
        p35 = p5
        while p35 < best:
            q = p35
            while q < n:
                q *= 2
            best = min(best, q)
            p35 *= 3
        p5 *= 5
    return best


def db(x):
    return 20.0 * math.log10(max(x, 1e-12))


def undb(d):
    return 10.0 ** (d / 20.0)


def rms_db(x):
    return 10.0 * math.log10(float(np.mean(np.square(x))) + 1e-20)


def stable_seed(*parts):
    return zlib.crc32(repr(parts).encode()) & 0x7FFFFFFF


_NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nm(s):
    """'C#5' -> MIDI 73 (A4 = 69)"""
    m = re.fullmatch(r'([A-G])([#b]?)(-?\d)', s)
    if not m:
        raise ValueError('bad note ' + s)
    v = 12 * (int(m.group(3)) + 1) + _NOTE[m.group(1)]
    return v + {'#': 1, 'b': -1, '': 0}[m.group(2)]


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


# =============================================================================
#  frequency-domain filters
# =============================================================================
def mag_resp(f, spec):
    H = np.ones_like(f)
    fz = np.maximum(f, 1e-3)
    for s in spec:
        k = s[0]
        if k == 'hp':
            H *= 1.0 / np.sqrt(1.0 + (s[1] / fz) ** (2 * s[2]))
        elif k == 'lp':
            H *= 1.0 / np.sqrt(1.0 + (f / s[1]) ** (2 * s[2]))
        elif k == 'peak':
            fc, g, Q = s[1], s[2], s[3]
            A = 10 ** (g / 40.0)
            w = f / fc
            num = (1 - w * w) + 1j * w * A / Q
            den = (1 - w * w) + 1j * w / (A * Q)
            H *= np.abs(num / den)
        elif k in ('ls', 'hs'):
            fc, g = s[1], s[2]
            A = 10 ** (g / 40.0)
            sw = 1j * f / fc
            q = 0.7071
            if k == 'ls':
                H *= np.abs(A * (sw * sw + np.sqrt(A) / q * sw + A) /
                            (A * sw * sw + np.sqrt(A) / q * sw + 1))
            else:
                H *= np.abs(A * (A * sw * sw + np.sqrt(A) / q * sw + 1) /
                            (sw * sw + np.sqrt(A) / q * sw + A))
        else:
            raise ValueError(k)
    return H


def fft_eq(x, spec, cyclic=False):
    """zero-phase EQ.  cyclic=True treats x as one period of a periodic signal."""
    if not spec:
        return x
    n = x.shape[0]
    if cyclic:
        c = min(n, int(0.75 * SR))
        ext = np.concatenate([x[-c:], x, x[:c]], axis=0)
        return fft_eq(ext, spec, False)[c:c + n]
    N = next_fast(n + int(0.3 * SR))
    X = np.fft.rfft(x, N, axis=0)
    H = mag_resp(np.fft.rfftfreq(N, 1.0 / SR), spec)
    if x.ndim == 2:
        H = H[:, None]
    return np.fft.irfft(X * H, N, axis=0)[:n]


def convolve(x, ir, cyclic):
    """x mono (n,) or stereo (n,2); ir (m,2).  returns (n,2).  cyclic wraps the tail."""
    n, m = x.shape[0], ir.shape[0]
    N = next_fast(n + m)
    xs = x[:, None] if x.ndim == 1 else x
    X = np.fft.rfft(xs, N, axis=0)
    Hh = np.fft.rfft(ir, N, axis=0)
    y = np.fft.irfft(X * Hh, N, axis=0)
    out = y[:n].copy()
    if cyclic:
        k = min(m, n)
        out[:k] += y[n:n + k]
    return out


def pan_st(x, p):
    th = (p + 1.0) * math.pi / 4.0
    return np.stack([x * math.cos(th), x * math.sin(th)], axis=1)


def shift(x, d, cyclic):
    """delay by d samples (d >= 0)"""
    if d <= 0:
        return x.copy()
    if cyclic:
        return np.roll(x, d, axis=0)
    y = np.zeros_like(x)
    y[d:] = x[:-d]
    return y


# =============================================================================
#  Karplus-Strong string
# =============================================================================
def lagrange3(d):
    h = np.ones(4)
    for i in range(4):
        for j in range(4):
            if j != i:
                h[i] *= (d - j) / (i - j)
    return h


_W4 = 2 * math.pi * 4000.0 / SR


def ks_coeffs(P, t60, hf):
    """loop delay P samples -> block length M, 6 taps, feedback gain g"""
    M = int(math.floor(P - 1.0)) - 1
    d = P - 1.0 - M                       # in [1,2): best range for 3rd-order Lagrange
    L4 = 10 ** (-3.0 * P / (hf * SR))      # per-period amplitude at 4 kHz
    b = (1.0 - L4) / (2.0 * (1.0 - math.cos(_W4)))
    b = min(max(b, 0.0), 0.25)
    h = np.convolve(lagrange3(d), [b, 1.0 - 2.0 * b, b])
    g = 10 ** (-3.0 * P / (t60 * SR))
    return M, h, g


def ks_string(n, f0, picks, t60=3.0, hf=0.4, pickpos=0.15, pickup=0.1, semis=None,
              off=None, damp_t=0.025, pick_damp=0.5, exc_lp=1, seed=0):
    """
    n       samples to render
    f0      base frequency (Hz); semis = optional per-sample pitch offset (semitones)
    picks   list of (sample, amplitude)
    off     sample where the string is muted
    """
    rng = np.random.default_rng(seed)
    x = np.zeros(n)
    gm = np.ones(n)

    def P_at(i):
        if semis is None:
            return SR / f0
        return SR / (f0 * 2.0 ** (semis[min(i, n - 1)] / 12.0))

    for k, (p, a) in enumerate(picks):
        if p >= n:
            continue
        P = P_at(p)
        Lb = max(4, int(round(P)))
        e = rng.standard_normal(Lb)
        for _ in range(exc_lp):
            e = 0.5 * (e + np.roll(e, 1))
        kk = max(1, int(round(pickpos * Lb)))
        e = e - np.roll(e, kk)
        e -= e.mean()
        e /= (np.std(e) + 1e-9)
        seg = min(Lb, n - p)
        x[p:p + seg] += a * e[:seg]
        if k > 0:                              # re-pick: pick touches the string first
            a0, a1 = max(0, p - Lb // 2), min(n, p + Lb // 2)
            gm[a0:a1] *= pick_damp
    if off is not None and off < n:
        P0 = SR / f0
        gm[off:] *= 10 ** (-2.0 * P0 / (damp_t * SR))

    Pmax = SR / f0 if semis is None else SR / (f0 * 2.0 ** (float(np.min(semis)) / 12.0))
    Hh = int(Pmax) + 16
    y = np.zeros(Hh + n)
    s = 0
    if semis is None:
        M, h, g = ks_coeffs(SR / f0, t60, hf)
        gmv = g * gm
    while s < n:
        if semis is not None:
            M, h, g = ks_coeffs(P_at(s), t60, hf)
        e_ = min(n, s + M)
        bl = e_ - s
        a = Hh + s - M
        acc = h[0] * y[a:a + bl]
        acc += h[1] * y[a - 1:a - 1 + bl]
        acc += h[2] * y[a - 2:a - 2 + bl]
        acc += h[3] * y[a - 3:a - 3 + bl]
        acc += h[4] * y[a - 4:a - 4 + bl]
        acc += h[5] * y[a - 5:a - 5 + bl]
        if semis is None:
            y[Hh + s:Hh + e_] = x[s:e_] + gmv[s:e_] * acc
        else:
            y[Hh + s:Hh + e_] = x[s:e_] + g * gm[s:e_] * acc
        s = e_
    out = y[Hh:]
    kp = max(1, int(round(pickup * SR / f0)))
    out = out - shift(out, kp, False)          # pickup position comb (twang)
    return out


# =============================================================================
#  instruments
# =============================================================================
TONES = {
    # surf lead: bridge pickup, bright, whammy dips down
    'surf': dict(t60=4.5, hf=0.40, pick=0.16, pu=0.11, exc_lp=1, wdepth=0.42, wrate=5.6,
                 wmode='down', pick_damp=0.45, rel=0.03, amp=0.30),
    # clean sunny lead: a bit rounder, finger vibrato
    'clean': dict(t60=5.5, hf=0.34, pick=0.19, pu=0.13, exc_lp=2, wdepth=0.20, wrate=5.0,
                  wmode='sym', pick_damp=0.5, rel=0.04, amp=0.30),
    'soft': dict(t60=4.0, hf=0.22, pick=0.22, pu=0.22, exc_lp=3, wdepth=0.16, wrate=4.6,
                 wmode='sym', pick_damp=0.5, rel=0.06, amp=0.30),
    'rhy': dict(t60=2.2, hf=0.30, pick=0.20, pu=0.17, exc_lp=1, spread=0.0095, amp=0.24),
    'rhy_soft': dict(t60=2.6, hf=0.22, pick=0.24, pu=0.22, exc_lp=2, spread=0.022, amp=0.22),
    'bass': dict(t60=2.4, hf=0.10, pick=0.24, pu=0.20, exc_lp=4, amp=0.42),
}


def guitar_note(ev, tone):
    f0 = mtof(ev['pitch'])
    dur = ev['dur']
    fl = ev.get('flags', '')
    stacc = '.' in fl
    offt = dur * (0.5 if stacc else 0.96)
    ring = ev.get('ring', 0.0)
    n = int((offt + tone['rel'] + 0.03 + ring) * SR)
    t = np.arange(n) / SR
    semis = None

    def add_curve(c):
        nonlocal semis
        semis = c if semis is None else semis + c

    if '^' in fl or ('g' in fl and ev.get('prev') is not None):
        st = -2.0 if '^' in fl else float(ev['prev'] - ev['pitch'])
        T = 0.05 if '^' in fl else 0.07
        u = np.clip(t / T, 0, 1)
        add_curve(st * (1 - (3 * u * u - 2 * u * u * u)))
    if 'w' in fl and dur > 0.25:
        d0 = min(0.16, dur * 0.3)
        tt = np.maximum(t - d0, 0)
        fade = np.clip(tt / 0.25, 0, 1)
        if tone['wmode'] == 'down':
            c = -tone['wdepth'] * 0.5 * (1 - np.cos(2 * math.pi * tone['wrate'] * tt)) * fade
        else:
            c = tone['wdepth'] * np.sin(2 * math.pi * tone['wrate'] * tt) * fade
        add_curve(c)
    if 'v' in fl:
        tf = max(0.0, offt - 0.16)
        u = np.clip((t - tf) / 0.16, 0, 1)
        add_curve(-4.0 * u * u)
    if ev.get('curve') is not None:            # glissando
        add_curve(ev['curve'](t))

    rng = np.random.default_rng(ev['seed'])
    amp = tone['amp'] * ev['vel']
    picks = []
    if '~' in fl:
        rate = ev['trem']
        k = 0
        tp = 0.0
        while tp < offt - 0.45 / rate or k == 0:
            j = 0 if k == 0 else int(rng.normal(0, 0.0012) * SR)
            a = amp * (1.0 if k % 2 == 0 else 0.8) * rng.uniform(0.9, 1.06)
            if ev.get('cresc'):
                a *= 0.35 + 0.65 * min(1.0, tp / max(dur, 1e-3))
            picks.append((max(0, int(tp * SR) + j), a))
            k += 1
            tp = k / rate
    else:
        picks.append((0, amp))
    t60 = tone['t60'] * (330.0 / f0) ** 0.35
    sig = ks_string(n, f0, picks, t60=min(max(t60, 1.0), 8.0), hf=tone['hf'],
                    pickpos=tone['pick'] * rng.uniform(0.9, 1.1), pickup=tone['pu'],
                    semis=semis, off=int(offt * SR), damp_t=0.025,
                    pick_damp=tone.get('pick_damp', 0.5), exc_lp=tone['exc_lp'], seed=ev['seed'])
    return sig


_STRUM_CACHE = {}


def strum_sig(voicing, dirn, dur, mute, vel, variant, tone_name, ring=0.0):
    key = (voicing, dirn, round(dur, 3), mute, round(vel, 2), variant, tone_name, round(ring, 2))
    if key in _STRUM_CACHE:
        return _STRUM_CACHE[key]
    tone = TONES[tone_name]
    rng = np.random.default_rng(stable_seed(key))
    strings = list(voicing) if dirn == 'D' else list(voicing)[::-1]
    spread = tone['spread'] * (0.8 if dirn == 'U' else 1.0)
    total = int((dur + 0.08 + ring + spread * len(strings)) * SR)
    out = np.zeros(total)
    for i, m in enumerate(strings):
        o = i * spread + rng.uniform(-0.0012, 0.0012)
        o = max(0.0, o)
        f0 = mtof(m)
        v = vel * (1 - 0.05 * i) * rng.uniform(0.88, 1.05) * tone['amp']
        nlen = total - int(o * SR)
        offt = max(0.02, dur - o) if not ring else None
        if mute:
            sig = ks_string(nlen, f0, [(0, v * 1.3)], t60=0.11, hf=0.05, pickpos=0.25, pickup=tone['pu'],
                            off=int(min(dur - o, 0.12) * SR), damp_t=0.02, exc_lp=2,
                            seed=int(rng.integers(1 << 30)))
        else:
            t60 = tone['t60'] * (330.0 / f0) ** 0.35
            sig = ks_string(nlen, f0, [(0, v)], t60=min(max(t60, 0.8), 6.0), hf=tone['hf'],
                            pickpos=tone['pick'] * rng.uniform(0.85, 1.15), pickup=tone['pu'],
                            off=None if offt is None else int(offt * SR), damp_t=0.03,
                            exc_lp=tone['exc_lp'], seed=int(rng.integers(1 << 30)))
        st = int(o * SR)
        out[st:st + len(sig)] += sig[:total - st]
    _STRUM_CACHE[key] = out
    return out


def bass_note(ev):
    tone = TONES['bass']
    f0 = mtof(ev['pitch'])
    dur = ev['dur']
    offt = dur * ev.get('legato', 0.88)
    n = int((offt + 0.06) * SR)
    rng = np.random.default_rng(ev['seed'])
    sig = ks_string(n, f0, [(0, tone['amp'] * ev['vel'])], t60=tone['t60'], hf=tone['hf'],
                    pickpos=tone['pick'] * rng.uniform(0.9, 1.1), pickup=tone['pu'],
                    off=int(offt * SR), damp_t=0.035, exc_lp=tone['exc_lp'], seed=ev['seed'])
    # a little fundamental weight (flatwound P-bass thump)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.45)
    env[int(offt * SR):] *= np.exp(-(t[int(offt * SR):] - offt) / 0.012)
    sig = sig + 0.12 * tone['amp'] * ev['vel'] * np.sin(2 * math.pi * f0 * t) * env
    return sig


_ORG_TABLES = {}
TBL_N = 4096


def organ_table(kind, f):
    key = (kind, int(round(f)))
    if key in _ORG_TABLES:
        return _ORG_TABLES[key]
    x = np.arange(TBL_N) / TBL_N
    w = np.zeros(TBL_N)
    if kind == 'far':
        nh = max(1, int(min(48, 9000.0 / f)))
        for k in range(1, nh + 1):
            fk = k * f
            a = k ** -0.9 * (1.0 + 1.1 * math.exp(-0.5 * (math.log2(fk / 2100.0) / 0.55) ** 2))
            if k % 2 == 0:
                a *= 0.72
            a *= 1.0 / math.sqrt(1 + (fk / 6500.0) ** 4)
            w += a * np.sin(2 * math.pi * k * x + 0.3 * k)
        # 4' footage for extra sparkle
    else:   # tonewheel drawbars on a 16' base (f is the 8' pitch, base is f/2)
        reg = ORG_REG.get(kind, ORG_REG['ham'])
        harm = [1, 3, 2, 4, 6, 8, 10, 12, 16]
        base = f / 2.0
        for lvl, hn in zip(reg, harm):
            if lvl <= 0 or hn * base > 12000:
                continue
            w += 10 ** ((lvl - 8) * 3 / 20.0) * np.sin(2 * math.pi * hn * x)
    w /= np.max(np.abs(w)) + 1e-9
    _ORG_TABLES[key] = w
    return w


ORG_REG = {
    'ham': [8, 6, 8, 6, 0, 3, 0, 0, 0],       # warm full pad
    'ham_soft': [6, 0, 8, 5, 0, 0, 0, 0, 0],
    'ham_bright': [8, 4, 8, 8, 4, 6, 0, 0, 2],
}


def organ_note(ev, lfo_rate):
    kind = ev['kind']
    pitch = ev['pitch']
    f = mtof(pitch)
    dur = ev['dur']
    rel = 0.05 if kind == 'far' else 0.07
    n = int((dur + rel + 0.01) * SR)
    t = np.arange(n) / SR
    t_abs = ev['n'] / SR
    if kind == 'far':
        dpt = 0.0032
        ph = f * t - f * dpt / (2 * math.pi * lfo_rate) * (
            np.cos(2 * math.pi * lfo_rate * (t + t_abs)) - math.cos(2 * math.pi * lfo_rate * t_abs))
        tb = organ_table('far', f)
    else:
        ph = (f / 2.0) * t                     # table is built on the 16' base
        tb = organ_table(kind, f)
    idx = (ph % 1.0) * TBL_N
    i0 = idx.astype(np.int64)
    fr = idx - i0
    wv = tb[i0 % TBL_N] * (1 - fr) + tb[(i0 + 1) % TBL_N] * fr
    att = ev.get('swell', 0.0) or (0.006 if kind == 'far' else 0.01)
    env = np.minimum(1.0, t / att)
    if ev.get('swell'):
        env = env ** 2
    ro = int(dur * SR)
    env[ro:] *= np.exp(-(t[ro:] - dur) / (rel / 4.0))
    sig = wv * env * ev['vel'] * 0.16
    if kind != 'far':                           # key click
        rng = np.random.default_rng(ev['seed'])
        k = int(0.004 * SR)
        sig[:k] += rng.standard_normal(k) * np.exp(-np.arange(k) / (0.0008 * SR)) * 0.01 * ev['vel']
    return sig


# ----------------------------------------------------------------- drums
def _noise_band(rng, n, lo, hi, order=2):
    w = rng.standard_normal(n + 2048)
    spec = []
    if lo:
        spec.append(('hp', lo, order))
    if hi:
        spec.append(('lp', hi, order))
    y = fft_eq(w, spec)[1024:1024 + n]
    return y / (np.std(y) + 1e-9)


def _metal(rng, n, freqs):
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f in freqs:
        y += np.sign(np.sin(2 * math.pi * f * t + rng.uniform(0, 6.28)))
    return y


_DRUM_CACHE = {}
TOM_TUNING = [110.0]          # floor tom pitch (Hz); set per song to a chord-friendly note


def drum_sample(kind, var):
    key = (kind, var)
    if key in _DRUM_CACHE:
        return _DRUM_CACHE[key]
    rng = np.random.default_rng(stable_seed('drum', kind, var))
    if kind == 'K':
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        f = 50 + 75 * np.exp(-t / 0.032) + 40 * np.exp(-t / 0.005)
        ph = 2 * math.pi * np.cumsum(f) / SR
        body = np.sin(ph) * np.exp(-t / 0.2) * np.minimum(1, t / 0.001)
        click = _noise_band(rng, n, 1200, 6000) * np.exp(-t / 0.0035) * 0.22
        y = body + click
    elif kind in ('S', 's'):
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        f1 = 182 * (1 + 0.12 * np.exp(-t / 0.012))
        tone = 0.55 * np.sin(2 * math.pi * np.cumsum(f1) / SR) * np.exp(-t / 0.075) \
            + 0.28 * np.sin(2 * math.pi * 331 * t + 0.7) * np.exp(-t / 0.05)
        wires = _noise_band(rng, n, 1500, 9500) * np.exp(-t / 0.16) * np.minimum(1, t / 0.0012)
        crack = _noise_band(rng, n, 3000, 12000) * np.exp(-t / 0.006)
        y = 0.8 * tone + 0.55 * wires + 0.25 * crack
    elif kind in ('T1', 'T2', 'T3'):
        base = TOM_TUNING[0]
        f0 = base * {'T1': 16 / 9.0, 'T2': 4 / 3.0, 'T3': 1.0}[kind]
        tau = {'T1': 0.2, 'T2': 0.23, 'T3': 0.27}[kind]
        f0 *= rng.uniform(0.99, 1.01)
        n = int(0.8 * SR)
        t = np.arange(n) / SR
        f = f0 * (1 + 0.32 * np.exp(-t / 0.05))
        ph = 2 * math.pi * np.cumsum(f) / SR
        y = np.sin(ph) * np.exp(-t / tau) + 0.22 * np.sin(1.59 * ph + 0.4) * np.exp(-t / (tau * 0.35))
        y += _noise_band(rng, n, 300, 4000) * np.exp(-t / 0.012) * 0.32
        y *= np.minimum(1, t / 0.0008)
    elif kind in ('H', 'O'):
        n = int((0.3 if kind == 'H' else 1.0) * SR)
        t = np.arange(n) / SR
        m = _metal(rng, n, np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * 1.75)
        m = fft_eq(m, [('hp', 6500, 3), ('lp', 12500, 2)])
        nz = _noise_band(rng, n, 7500, 13000)
        dec = 0.032 if kind == 'H' else 0.26
        y = (0.55 * m / (np.std(m) + 1e-9) + 0.6 * nz) * np.exp(-t / dec) * np.minimum(1, t / 0.0006)
    elif kind in ('C', 'R'):
        n = int((3.0 if kind == 'C' else 2.2) * SR)
        t = np.arange(n) / SR
        if kind == 'C':
            fr = rng.uniform(350, 9000, 40)
            m = _metal(rng, n, fr[:8] * 0.9)
            m = fft_eq(m, [('hp', 3000, 2), ('lp', 11000, 2)])
            m /= np.std(m) + 1e-9
            nz1 = _noise_band(rng, n, 3500, 12000)
            nz2 = _noise_band(rng, n, 1200, 5000)
            y = (0.5 * m * np.exp(-t / 0.9) + 0.6 * nz1 * np.exp(-t / 0.75) + 0.35 * nz2 * np.exp(-t / 1.3))
            y *= np.minimum(1, t / 0.002)
        else:
            m = _metal(rng, n, rng.uniform(300, 900, 6))
            m = fft_eq(m, [('hp', 2500, 2), ('lp', 9000, 2)])
            m /= np.std(m) + 1e-9
            nz = _noise_band(rng, n, 4000, 11000)
            ping = _noise_band(rng, n, 2500, 6000) * np.exp(-t / 0.03)
            y = 0.3 * m * np.exp(-t / 0.7) + 0.45 * nz * np.exp(-t / 0.55) + 0.35 * ping
            y *= np.minimum(1, t / 0.0008)
    elif kind == 'P':     # hand clap: several hands, slightly smeared
        n = int(0.45 * SR)
        t = np.arange(n) / SR
        nz = _noise_band(rng, n, 900, 3200)
        env = np.zeros(n)
        for k, o in enumerate([0.0, 0.0085, 0.0165, 0.025]):
            tt = t - o - rng.uniform(0, 0.0015)
            env += np.where(tt >= 0, np.exp(-np.maximum(tt, 0) / (0.0045 if k < 3 else 0.075)), 0) * (0.8 if k < 3 else 1.0)
        y = nz * env
    elif kind == 'B':     # tambourine
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for f in (4150, 5320, 6870, 8190, 9650):
            fr = f * rng.uniform(0.9, 1.1)
            y += np.sin(2 * math.pi * fr * t + rng.uniform(0, 6)) * np.exp(-t / rng.uniform(0.02, 0.04))
        nz = _noise_band(rng, n, 4500, 11000)
        y = 0.12 * y + 0.8 * nz * np.exp(-t / 0.05)
        y += 0.5 * np.roll(y, int(0.006 * SR)) * (t > 0.006)
        y *= np.minimum(1, t / 0.0015)
    else:
        raise ValueError(kind)
    y = y / (np.max(np.abs(y)) + 1e-9)
    _DRUM_CACHE[key] = y
    return y


def swell_sample(length, seed):
    """reverse-cymbal style swell, peaks at `length` seconds then stops"""
    rng = np.random.default_rng(seed)
    n = int((length + 0.05) * SR)
    t = np.arange(n) / SR
    nz = _noise_band(rng, n, 2500, 11000)
    env = np.clip(t / length, 0, 1) ** 2.5
    env[int(length * SR):] *= np.exp(-(t[int(length * SR):] - length) / 0.01)
    return nz * env / 3.0


DRUM_LVL = {'K': 1.0, 'S': 0.72, 's': 0.72, 'H': 0.2, 'O': 0.2, 'R': 0.22, 'C': 0.3,
            'T1': 0.62, 'T2': 0.66, 'T3': 0.74, 'P': 0.42, 'B': 0.16, 'W': 0.3}
DRUM_PAN = {'K': 0.0, 'S': 0.04, 's': 0.04, 'H': 0.3, 'O': 0.3, 'R': -0.35, 'C': -0.32,
            'T1': 0.28, 'T2': 0.0, 'T3': -0.3, 'P': -0.08, 'B': 0.45, 'W': 0.0}
DRUM_ROOM = {'K': 0.05, 'S': 0.38, 's': 0.3, 'H': 0.06, 'O': 0.08, 'R': 0.1, 'C': 0.14,
             'T1': 0.3, 'T2': 0.3, 'T3': 0.3, 'P': 0.5, 'B': 0.12, 'W': 0.25}


# =============================================================================
#  reverbs
# =============================================================================
def spring_ir(length=3.0):
    """stereo spring tank: 3 dispersive springs per side"""
    N = 1 << 19
    f = np.fft.rfftfreq(N, 1.0 / SR)
    df = f[1]
    ff = np.maximum(f, 45.0)
    band = mag_resp(f, [('hp', 160, 2), ('lp', 4300, 4), ('peak', 1800, 2.0, 1.2)])
    springs = {
        0: [(0.0313, 0.031, 2.4, 1.0), (0.0371, 0.026, 2.8, 0.8), (0.0437, 0.035, 2.2, 0.6)],
        1: [(0.0331, 0.029, 2.6, 1.0), (0.0397, 0.033, 2.5, 0.8), (0.0461, 0.027, 2.3, 0.6)],
    }
    out = np.zeros((int(length * SR), 2))
    for ch in (0, 1):
        H = np.zeros_like(f, dtype=complex)
        for (T, disp, t60, gain) in springs[ch]:
            gd = T + disp * np.sqrt(260.0 / ff)
            gd = np.minimum(gd, T + disp * 2.4)
            phi = 2 * math.pi * np.cumsum(gd) * df
            Hp = np.exp(-1j * phi)
            hfd = 1.0 / np.sqrt(1 + (f / 5000.0) ** 2)
            r = 10 ** (-3 * 2 * gd / t60) * (0.6 + 0.4 * hfd)
            H += gain * Hp / (1 - r * Hp * Hp)
        H *= band
        ir = np.fft.irfft(H, N)[:out.shape[0]]
        out[:, ch] = ir
    tail = int(0.4 * SR)
    out[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
    return inband_normalise(out)


def inband_normalise(ir, lo=300.0, hi=3000.0):
    """scale a stereo IR so that its average power gain in lo..hi Hz is 0 dB (L+R summed)"""
    N = next_fast(ir.shape[0])
    H = np.fft.rfft(ir, N, axis=0)
    f = np.fft.rfftfreq(N, 1.0 / SR)
    m = (f >= lo) & (f <= hi)
    p = float(np.mean(np.sum(np.abs(H[m]) ** 2, axis=1)))
    return ir / math.sqrt(p)


def room_ir(t60=1.0, length=2.0, predelay=0.012, seed=5):
    rng = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    edges = [0, 300, 1200, 3500, 8000, SR / 2]
    t60s = [t60 * 1.15, t60, t60 * 0.85, t60 * 0.6, t60 * 0.35]
    for ch in (0, 1):
        w = rng.standard_normal(n)
        W = np.fft.rfft(w)
        fr = np.fft.rfftfreq(n, 1.0 / SR)
        acc = np.zeros(n)
        for i in range(5):
            m = (fr >= edges[i]) & (fr < edges[i + 1])
            b = np.fft.irfft(W * m, n)
            acc += b * np.exp(-6.91 * t / t60s[i])
        acc *= np.minimum(1, t / 0.01)
        # early reflections
        for k, (dt, g) in enumerate([(0.007, 0.5), (0.0113, 0.4), (0.0171, 0.35), (0.0237, 0.3), (0.031, 0.25)]):
            d = int((dt + rng.uniform(-0.0015, 0.0015)) * SR)
            acc[d] += g * (1 if (k + ch) % 2 else -1) * 3.0
        out[:, ch] = acc
    pd = int(predelay * SR)
    out = np.concatenate([np.zeros((pd, 2)), out[:-pd]])
    out = fft_eq(out, [('hp', 120, 2), ('lp', 9000, 2)])
    return inband_normalise(out)


_IR_CACHE = {}


def get_ir(name, **kw):
    key = (name, tuple(sorted(kw.items())))
    if key not in _IR_CACHE:
        _IR_CACHE[key] = spring_ir(**kw) if name == 'spring' else room_ir(**kw)
    return _IR_CACHE[key]


def leslie(x, t0, Lcyc, cyclic, horn=0.85, drum=0.7):
    """slow 'chorale' Leslie: stereo doppler + AM, horn/drum split at 800 Hz"""
    n = len(x)
    lo = fft_eq(x, [('lp', 800, 2)], cyclic)
    hi = x - lo
    t = t0 + np.arange(n) / SR
    out = np.zeros((n, 2))
    base = np.arange(n, dtype=np.float64)
    for band, rate, dep, am in ((hi, horn, 0.00045, 0.32), (lo, drum, 0.0002, 0.12)):
        if Lcyc:
            rate = max(1, round(rate * Lcyc)) / Lcyc
        for ch, ph in ((0, 0.0), (1, math.pi / 2)):
            s = np.sin(2 * math.pi * rate * t + ph)
            dl = dep * SR * (1 + s)
            idx = base - dl
            if cyclic:
                y = np.interp(idx % n, np.arange(n + 1), np.concatenate([band, band[:1]]))
            else:
                y = np.interp(idx, base, band, left=0.0)
            amp = 1 - am * 0.5 * (1 + np.cos(2 * math.pi * rate * t + ph))
            out[:, ch] += y * amp
    return out


# =============================================================================
#  dynamics
# =============================================================================
def sliding_min(a, w):
    """min over window [i, i+w-1]"""
    n = len(a)
    pad = (-n) % w + w
    b = np.concatenate([a, np.ones(pad)])
    nb = len(b) // w
    B = b[:nb * w].reshape(nb, w)
    pre = np.minimum.accumulate(B, axis=1).ravel()
    suf = np.minimum.accumulate(B[:, ::-1], axis=1)[:, ::-1].ravel()
    return np.minimum(suf[:n], pre[w - 1:w - 1 + n])


def compressor(x, thr=-21.0, ratio=1.8, att=0.012, rel=0.2, knee=8.0, blk=64):
    mid = 0.5 * (x[:, 0] + x[:, 1])
    sc = fft_eq(mid, [('hp', 100, 2)])
    nb = len(sc) // blk
    p = np.mean(sc[:nb * blk].reshape(nb, blk) ** 2, axis=1)
    lv = 10 * np.log10(p + 1e-12) + 3.0
    aa = math.exp(-blk / (att * SR))
    ar = math.exp(-blk / (rel * SR))
    env = np.empty(nb)
    e = lv[0] if nb else -100
    for i in range(nb):
        v = lv[i]
        c = aa if v > e else ar
        e = c * e + (1 - c) * v
        env[i] = e
    over = env - thr
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    centers = (np.arange(nb) + 0.5) * blk
    g = np.interp(np.arange(len(sc)), centers, -gr) if nb else np.zeros(len(sc))
    return x * (10 ** (g / 20.0))[:, None]


def limiter(x, ceil_db=CEIL_DB, look=0.0015, rel=0.09):
    c = undb(ceil_db)
    pk = np.max(np.abs(x), axis=1)
    r = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    A = int(look * SR)
    w = 2 * A + 1
    m = sliding_min(r, w)
    m = np.concatenate([np.ones(A), m[:-A]])            # centred window
    cs = np.concatenate([[0.0], np.cumsum(m)])
    idx = np.arange(len(m))
    lo = np.clip(idx - A, 0, len(m))
    hi = np.clip(idx + A + 1, 0, len(m))
    s = (cs[hi] - cs[lo]) / (hi - lo)
    blk = 32
    nb = len(s) // blk
    if nb > 0:
        bm = s[:nb * blk].reshape(nb, blk).min(axis=1)
        a = math.exp(-blk / (rel * SR))
        e = np.empty(nb)
        v = 1.0
        for i in range(nb):
            v = min(bm[i], v * a + (1 - a))
            e[i] = v
        ei = np.interp(idx, (np.arange(nb) + 0.5) * blk, e)
        g = np.minimum(s, ei)
    else:
        g = s
    y = x * g[:, None]
    return np.clip(y, -c, c)


def master(x, cyclic, gain):
    n = len(x)
    if cyclic:
        c = int(2.5 * SR)
        ext = np.concatenate([x[-c:], x, x[:c]])
        return master(ext, False, gain)[c:c + n]
    y = compressor(x * gain)
    return limiter(y)


def k_weight(x):
    return fft_eq(x, [('hs', 1681.97, 4.0), ('hp', 38.1, 2)])


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    nb = 1 + (len(y) - blk) // hop
    if nb < 1:
        return -70.0
    cs = np.concatenate([[0.0], np.cumsum(np.sum(y ** 2, axis=1))])
    st = np.arange(nb) * hop
    z = (cs[st + blk] - cs[st]) / blk
    lk = -0.691 + 10 * np.log10(z + 1e-20)
    g1 = z[lk > -70]
    if len(g1) == 0:
        return -70.0
    thr = -0.691 + 10 * np.log10(np.mean(g1)) - 10
    g2 = z[(lk > -70) & (lk > thr)]
    return -0.691 + 10 * math.log10(float(np.mean(g2)))


def active_rms_db(x, floor=30.0):
    fr = 4096
    nb = len(x) // fr
    if nb == 0:
        return rms_db(x)
    xx = x[:nb * fr].reshape(nb, -1)
    p = np.mean(xx ** 2, axis=1)
    pdb = 10 * np.log10(p + 1e-20)
    sel = pdb > pdb.max() - floor
    return 10 * math.log10(float(np.mean(p[sel])) + 1e-20)


# =============================================================================
#  composition helpers
# =============================================================================
QUAL = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10),
        'maj7': (0, 4, 7, 11), '6': (0, 4, 7, 9), 'm6': (0, 3, 7, 9), 'sus4': (0, 5, 7),
        '9': (0, 4, 7, 10, 14)}


def parse_chord(sym):
    m = re.fullmatch(r'([A-G][#b]?)(.*)', sym)
    r = m.group(1)
    pc = (_NOTE[r[0]] + (1 if '#' in r else -1 if 'b' in r else 0)) % 12
    return pc, QUAL[m.group(2)], m.group(2)


VOICINGS = {
    'E': (40, 47, 52, 56, 59, 64), 'E7': (40, 47, 50, 56, 59, 64), 'Em': (40, 47, 52, 55, 59, 64),
    'A': (45, 52, 57, 61, 64), 'A7': (45, 52, 55, 61, 64), 'Am': (45, 52, 57, 60, 64),
    'Am6': (45, 52, 57, 60, 66),
    'B': (47, 54, 59, 63, 66), 'B7': (47, 51, 57, 59, 66),
    'C#m': (49, 56, 61, 64, 68), 'F#m': (42, 49, 54, 57, 61, 66), 'F#7': (42, 49, 52, 58, 61, 66),
    'G#7': (44, 51, 54, 60, 63, 68), 'G#m': (44, 51, 56, 59, 63, 68),
    'D': (50, 57, 62, 66), 'D7': (50, 57, 60, 66), 'C': (48, 52, 55, 60, 64),
    'G': (43, 47, 50, 55, 59, 67), 'Bm': (47, 54, 59, 62, 66), 'Em7': (40, 47, 52, 55, 62, 64),
    'F': (41, 48, 53, 57, 60, 65), 'Dm': (50, 57, 62, 65),
}


def voicing(sym, sset):
    v = VOICINGS[sym]
    base = sset.rstrip('m') if sset.endswith('m') and sset != 'm' else sset
    if base == 'all':
        return v
    if base == 'top5':
        return v[-5:]
    if base == 'top4':
        return v[-4:]
    if base == 'top3':
        return v[-3:]
    if base == 'low3':
        return v[:3]
    raise ValueError(sset)


TOK = re.compile(r'^(r|[A-G][#b]?\d(?:\+[A-G][#b]?\d)*)(?:/(\d+))?([~^v.>wg]*)$')


def parse_phrase(text, partial=False):
    notes = []
    step = 0
    bar_start = 0
    for tok in text.split():
        if tok == '|':
            if step - bar_start != 16:
                raise ValueError('bar length %d in %r' % (step - bar_start, text))
            bar_start = step
            continue
        m = TOK.match(tok)
        if not m:
            raise ValueError('bad token %r' % tok)
        p, d, fl = m.groups()
        d = int(d) if d else 2
        if p != 'r':
            notes.append(dict(step=step, steps=d, pitches=[nm(q) for q in p.split('+')], flags=fl))
        step += d
    if not partial and (step - bar_start) not in (0, 16):
        raise ValueError('last bar length %d in %r' % (step - bar_start, text))
    return notes, step


RHY = {
    'chop': [(2, 'D', 1.4, 0.85, 'top4'), (6, 'D', 1.4, 0.8, 'top4'), (10, 'D', 1.4, 0.85, 'top4'),
             (14, 'D', 1.4, 0.8, 'top4')],
    'eighths': [(0, 'D', 2, 0.95, 'top5'), (2, 'U', 2, 0.55, 'top3'), (4, 'D', 2, 0.85, 'top5'),
                (6, 'U', 2, 0.55, 'top3'), (8, 'D', 2, 0.9, 'top5'), (10, 'U', 2, 0.55, 'top3'),
                (12, 'D', 2, 0.85, 'top5'), (14, 'U', 2, 0.6, 'top3')],
    'palm8': [(i * 2, 'D', 2, 0.95 if i % 2 == 0 else 0.78, 'low3m') for i in range(8)],
    'ring': [(0, 'D', 8, 0.9, 'all'), (8, 'D', 8, 0.75, 'all')],
    'whole': [(0, 'D', 16, 0.9, 'all')],
    'stab': [(0, 'D', 3, 1.0, 'all')],
    'oldfaithful': [(0, 'D', 4, 0.9, 'all'), (4, 'D', 2, 0.72, 'top5'), (6, 'U', 4, 0.55, 'top3'),
                    (10, 'U', 2, 0.55, 'top3'), (12, 'D', 2, 0.78, 'top5'), (14, 'U', 2, 0.55, 'top3')],
    'trem16': [(i, 'D' if i % 2 == 0 else 'U', 1, 0.35 + 0.6 * i / 15.0, 'top4') for i in range(16)],
}

DRUM_VEL = {'.': 0.0, 'g': 0.3, 'o': 0.55, 'x': 0.78, 'X': 1.0}


class Song:
    def __init__(self, key, title, bpm, intro_bars, body_bars, seed, loop=True, tail=1.0,
                 trem_div=6, bass_range=(28, 45), bass_center=35):
        self.key, self.title, self.bpm = key, title, bpm
        self.step = 60.0 / bpm / 4
        if loop:
            # body length = whole number of 1152-sample MP3 frames, so both loop points
            # are encoded with identical frame alignment (tempo change < 0.03 %)
            Lf = round(body_bars * 16 * self.step * SR / 1152.0) * 1152
            self.step = Lf / (body_bars * 16 * SR)
        self.bpm_true = 60.0 / (4 * self.step)
        self.barlen = 16 * self.step
        self.intro_bars, self.body_bars = intro_bars, body_bars
        self.loop = loop
        self.tail = tail
        self.I = int(round(intro_bars * self.barlen * SR))
        self.L = int(round(body_bars * self.barlen * SR))
        self.Ls = self.L / SR
        self.ev = []
        self.ch = {}
        self.rng = np.random.default_rng(seed)
        self.trem = bpm / 60.0 * trem_div           # tremolo-picking rate (Hz)
        self.bass_range = bass_range
        self.bass_center = bass_center
        self.bass_prev = None
        self.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
        self.mix = {}
        self.lfo_far = self.lfo(6.1)
        self.trem_amp_rate = self.lfo(bpm / 60.0 * 3)   # amp tremolo: 8th-note triplets
        self.tom_hz = 110.0
        self.lufs = None

    # ------------------------------------------------------------ timing
    def lfo(self, rate):
        if not self.loop:
            return rate
        return max(1, round(rate * self.Ls)) / self.Ls

    def n_at(self, absstep):
        return int(round(absstep * self.step * SR))

    def add(self, part, absstep, jitter_ms=0.0, **kw):
        n = self.n_at(absstep)
        if jitter_ms:
            j = float(np.clip(self.rng.normal(0, jitter_ms), -2 * jitter_ms, 2 * jitter_ms))
            n += int(round(j * SR / 1000.0))
        bar = int(math.floor(absstep / 16))
        ev = dict(part=part, n=n, bar=bar, region='intro' if bar < 0 else 'body',
                  seed=int(self.rng.integers(1 << 30)))
        ev.update(kw)
        self.ev.append(ev)
        return ev

    # ------------------------------------------------------------ harmony
    def chords(self, bar0, prog):
        for i, s in enumerate(prog):
            syms = s.split()
            seg = 16 // len(syms)
            self.ch[bar0 + i] = [(j * seg, syms[j]) for j in range(len(syms))]

    def chord_at(self, bar, step):
        cur = self.ch[bar][0][1]
        for st, sym in self.ch[bar]:
            if step >= st:
                cur = sym
        return cur

    def segments(self, bar):
        lst = self.ch[bar]
        out = []
        for i, (st, sym) in enumerate(lst):
            en = lst[i + 1][0] if i + 1 < len(lst) else 16
            out.append((st, en - st, sym))
        return out

    # ------------------------------------------------------------ melodic parts
    def lead(self, bar0, text, part='lead', vel=0.9, transpose=0, trem=None, jit=4.0, cresc=False):
        notes, _ = parse_phrase(text)
        prev = None
        for nt in notes:
            ab = bar0 * 16 + nt['step']
            dur = nt['steps'] * self.step
            ps = [p + transpose for p in nt['pitches']]
            v = vel * (1.15 if '>' in nt['flags'] else 1.0) * self.rng.uniform(0.94, 1.04)
            if len(ps) > 1:
                v *= 0.8
            for p in ps:
                self.add(part, ab, jit, kind='gtr', pitch=p, dur=dur, vel=v, flags=nt['flags'],
                         prev=prev, trem=trem or self.trem, cresc=cresc)
            prev = ps[-1]

    def harmony(self, bar0, text, part='lead2', mode='3rd', vel=0.6, scale=None, trem=None):
        notes, _ = parse_phrase(text)
        for nt in notes:
            ab = bar0 * 16 + nt['step']
            bar, st = divmod(ab, 16)
            pc, iv, _ = parse_chord(self.chord_at(bar, st))
            ctones = {(pc + i) % 12 for i in iv}
            m = max(nt['pitches'])
            if mode == 'oct':
                h = m - 12
            else:
                h = None
                if nt['steps'] <= 2 and scale is not None and (m % 12) not in ctones:
                    # short passing tone: parallel diatonic third below
                    for dd in (3, 4):
                        if (m - dd) % 12 in scale:
                            h = m - dd
                            break
                if h is None:
                    prefs = [3, 4, 5, 8, 9, 7] if mode == '3rd' else [8, 9, 7, 3, 4, 5]
                    for dd in prefs:
                        if (m - dd) % 12 in ctones:
                            h = m - dd
                            break
                if h is None:
                    h = m - 12
            self.add(part, ab, 4.0, kind='gtr', pitch=h, dur=nt['steps'] * self.step,
                     vel=vel * self.rng.uniform(0.94, 1.04), flags=nt['flags'], prev=None,
                     trem=trem or self.trem)

    def gliss(self, bar, step, steps, p_start, p_end, vel=0.9, part='lead', ease=2.0, hold=0.12, trem=None):
        dur = steps * self.step
        span = float(p_start - p_end)
        T = dur * 0.9

        def curve(t, span=span, T=T, hold=hold, ease=ease):
            u = np.clip((t - hold) / max(T - hold, 1e-3), 0, 1)
            return span * (1 - u ** ease)
        self.add(part, bar * 16 + step, 0, kind='gtr', pitch=p_end, dur=dur, vel=vel, flags='~',
                 prev=None, trem=trem or self.trem, curve=curve)

    # ------------------------------------------------------------ rhythm guitar
    def rhythm(self, bar0, nbars, style, vel=1.0, trem=False, tone=None, ring=0.0):
        for b in range(bar0, bar0 + nbars):
            for (st, d, ln, v, sset) in RHY[style]:
                sym = self.chord_at(b, st)
                self.add('rhy', b * 16 + st, 3.0, kind='strum', voicing=voicing(sym, sset), dir=d,
                         dur=ln * self.step, vel=vel * v * self.rng.uniform(0.93, 1.05),
                         mute=sset.endswith('m') and sset != 'm', trem=trem,
                         tone=tone or self.tones['rhy'], ring=ring)

    def strum(self, bar, step, sym, dur_steps, d='D', sset='all', vel=1.0, ring=0.0, tone=None):
        self.add('rhy', bar * 16 + step, 2.0, kind='strum', voicing=voicing(sym, sset), dir=d,
                 dur=dur_steps * self.step, vel=vel, mute=False, trem=False,
                 tone=tone or self.tones['rhy'], ring=ring)

    # ------------------------------------------------------------ bass
    def pick_root(self, pc, last=None):
        """root octave nearest the last bass note (with a pull towards the centre)"""
        lo, hi = self.bass_range
        last = self.bass_center if last is None else last
        best = None
        for r in range(lo, hi + 1):
            if r % 12 != pc:
                continue
            cost = abs(r - last) + 0.5 * abs(r - self.bass_center)
            if best is None or cost < best[0]:
                best = (cost, r)
        return best[1]

    def _approach(self, npc, prev_note):
        nroot = self.pick_root(npc, prev_note)
        cands = [c for c in (nroot - 1, nroot + 1) if c != prev_note]
        return min(cands, key=lambda c: (abs(c - prev_note), c > nroot))

    def bass(self, bar0, nbars, style, vel=0.9, start_prev=None, legato=0.88):
        if start_prev is not None:
            self.bass_prev = start_prev
        for b in range(bar0, bar0 + nbars):
            segs = self.segments(b)
            for si, (st, ln, sym) in enumerate(segs):
                pc, iv, q = parse_chord(sym)
                root = self.pick_root(pc, self.bass_prev)
                if si + 1 < len(segs):
                    nsym = segs[si + 1][2]
                elif (b + 1) in self.ch:
                    nsym = self.ch[b + 1][0][1]
                else:
                    nsym = sym
                npc = parse_chord(nsym)[0]
                change = npc != pc
                third = 3 if 3 in iv else 4
                minor = q in ('m', 'm7', 'm6')
                sev = 10 in iv
                k = ln // 2
                if style == 'boogie':
                    if minor:
                        seq = [0, 3, 7, 10, 12, 10, 7, 3]
                    elif sev:
                        seq = [0, 4, 7, 10, 12, 10, 7, 4]
                    else:
                        seq = [0, 4, 7, 9, 12, 9, 7, 4]
                    if k == 4:
                        seq = [0, third, 7, 10 if (minor or sev) else 9]
                    pat = [(st + 2 * i, seq[i], 2) for i in range(k)]
                elif style == 'drive':
                    pat = [(st + 2 * i, 12 if (i % 4 == 3 and k == 8) else 0, 2) for i in range(k)]
                    if change and k == 8:
                        pat[-1] = (pat[-1][0], 'A', 2)
                elif style == 'pedal8':
                    pat = [(st + 2 * i, 0, 2) for i in range(k)]
                elif style == 'lope':
                    if ln == 16:
                        pat = [(st, 0, 6), (st + 6, 0, 2), (st + 8, 7, 4), (st + 12, third, 2),
                               (st + 14, 'A' if change else 7, 2)]
                    else:
                        pat = [(st, 0, 3), (st + 3, 0, 1), (st + 4, 7, 2), (st + 6, 'A' if change else 7, 2)]
                elif style == 'walk4':
                    pat = [(st + 4 * i, x, 4) for i, x in enumerate([0, third, 7, 'A' if change else 7][:ln // 4])]
                elif style == 'hit':
                    pat = [(st, 0, 3)]
                elif style == 'whole':
                    pat = [(st, 0, ln)]
                else:
                    raise ValueError(style)
                prev_note = root
                for (s2, iv2, d2) in pat:
                    p = self._approach(npc, prev_note) if iv2 == 'A' else root + iv2
                    self.add('bass', b * 16 + s2, 3.0, kind='bass', pitch=p, dur=d2 * self.step,
                             vel=vel * self.rng.uniform(0.92, 1.05) * (1.06 if s2 % 4 == 0 else 1.0),
                             legato=legato)
                    prev_note = p
                self.bass_prev = prev_note

    def bass_line(self, bar0, text, vel=0.9, legato=0.9):
        notes, _ = parse_phrase(text)
        for nt in notes:
            for p in nt['pitches']:
                self.add('bass', bar0 * 16 + nt['step'], 3.0, kind='bass', pitch=p,
                         dur=nt['steps'] * self.step, vel=vel * self.rng.uniform(0.93, 1.04),
                         legato=0.5 if '.' in nt['flags'] else legato)
            self.bass_prev = nt['pitches'][0]

    # ------------------------------------------------------------ organ
    def _org_voicing(self, sym, center, prev):
        pc, iv, _ = parse_chord(sym)
        tones = sorted({(pc + i) % 12 for i in iv[:4]})
        cands = []
        for lowest in range(center - 7, center + 5):
            if lowest % 12 not in tones:
                continue
            v = [lowest]
            for k in range(1, min(4, len(tones)) if len(tones) > 3 else 3):
                nxt = v[-1] + 1
                while nxt % 12 not in tones or nxt % 12 in [x % 12 for x in v]:
                    nxt += 1
                v.append(nxt)
            cands.append(v)
        if prev is None:
            return min(cands, key=lambda v: abs(np.mean(v) - center))
        return min(cands, key=lambda v: sum(abs(a - b) for a, b in zip(sorted(v), sorted(prev))) + 0.3 * abs(np.mean(v) - center))

    def organ_pad(self, bar0, nbars, kind='far', vel=0.6, center=64, swell=0.0):
        prev = None
        for b in range(bar0, bar0 + nbars):
            for (st, ln, sym) in self.segments(b):
                v = self._org_voicing(sym, center, prev)
                prev = v
                for p in v:
                    self.add('org', b * 16 + st, 2.0, kind=kind, pitch=p, dur=ln * self.step + 0.01,
                             vel=vel * self.rng.uniform(0.95, 1.03), swell=swell)

    def organ_line(self, bar0, text, kind='far', vel=0.8, transpose=0):
        notes, _ = parse_phrase(text)
        for nt in notes:
            for p in nt['pitches']:
                self.add('org', bar0 * 16 + nt['step'], 3.0, kind=kind, pitch=p + transpose,
                         dur=nt['steps'] * self.step * (0.5 if '.' in nt['flags'] else 0.94),
                         vel=vel * (1.1 if '>' in nt['flags'] else 1.0) * self.rng.uniform(0.95, 1.03), swell=0.0)

    def organ_stabs(self, bar0, nbars, steps=(2, 6, 10, 14), ln=1.5, kind='far', vel=0.6, center=66):
        prev = None
        for b in range(bar0, bar0 + nbars):
            for st in steps:
                sym = self.chord_at(b, st)
                v = self._org_voicing(sym, center, prev)
                prev = v
                for p in v:
                    self.add('org', b * 16 + st, 2.5, kind=kind, pitch=p, dur=ln * self.step,
                             vel=vel * self.rng.uniform(0.93, 1.04), swell=0.0)

    # ------------------------------------------------------------ drums
    def drums(self, bar0, pat, nbars=1, vel=1.0):
        for b in range(bar0, bar0 + nbars):
            for lane, s in pat.items():
                assert len(s) == 16, (lane, s)
                for i, ch in enumerate(s):
                    v = DRUM_VEL[ch]
                    if v <= 0:
                        continue
                    jit = 1.5 if lane in ('K', 'S') else 2.5
                    self.add('drums', b * 16 + i, jit, kind=lane, vel=v * vel * self.rng.uniform(0.93, 1.04))

    def hit(self, bar, step, kind, vel=1.0):
        self.add('drums', bar * 16 + step, 1.0, kind=kind, vel=vel)

    def roll(self, bar, s0, s1, kind='S', v0=0.2, v1=0.9, div=2):
        k = int((s1 - s0) * div)
        for i in range(k):
            u = i / max(1, k - 1)
            self.add('drums', bar * 16 + s0 + i / div, 1.0, kind=kind, vel=(v0 + (v1 - v0) * u) * self.rng.uniform(0.9, 1.05))

    def swell(self, bar, step, steps, vel=1.0):
        self.add('drums', bar * 16 + step, 0, kind='W', vel=vel, length=steps * self.step)

    # ------------------------------------------------------------ finish
    def finalize(self):
        if self.loop and self.intro_bars > 0:
            last = self.body_bars - 1
            copies = []
            for ev in self.ev:
                if ev['region'] == 'body' and ev['bar'] == last:
                    c = dict(ev)
                    c['n'] = ev['n'] - self.L
                    c['region'] = 'intro'
                    c['bar'] = -1
                    copies.append(c)
            self.ev.extend(copies)
        return self


# =============================================================================
#  rendering
# =============================================================================
PARTS_MONO = ('lead', 'lead2', 'rhy', 'bass', 'org')


def render_event(song, ev):
    k = ev['kind']
    if k == 'gtr':
        return guitar_note(ev, TONES[song.tones.get(ev['part'], 'surf')])
    if k == 'strum':
        sig = strum_sig(ev['voicing'], ev['dir'], ev['dur'], ev['mute'], ev['vel'], ev['seed'] % 4,
                        ev['tone'], ev.get('ring', 0.0))
        if ev.get('trem'):
            t = (ev['n'] + np.arange(len(sig))) / SR
            sig = sig * (1 - 0.55 * 0.5 * (1 - np.cos(2 * math.pi * song.trem_amp_rate * t)))
        return sig
    if k == 'bass':
        return bass_note(ev)
    if k in ('far', 'ham', 'ham_soft', 'ham_bright'):
        return organ_note(ev, song.lfo_far)
    raise ValueError(k)


def render_region(song, region, cyclic):
    if region == 'body':
        n_out = song.L if song.loop else int((song.body_bars * song.barlen + song.tail) * SR)
        base = 0
    else:
        n_out = song.I
        base = song.I
    TAIL = int(5.0 * SR)
    tot = n_out + TAIL
    bufs = {p: np.zeros(tot) for p in PARTS_MONO}
    drums = np.zeros((tot, 2))
    dsend = np.zeros((tot, 2))

    def place(buf, sig, i0):
        if cyclic:
            i0 = i0 % n_out
        i0 = max(0, i0)
        e = min(tot, i0 + len(sig))
        if e > i0:
            buf[i0:e] += sig[:e - i0]

    for ev in song.ev:
        if ev['region'] != region:
            continue
        i0 = ev['n'] + base
        if ev['part'] == 'drums':
            if ev['kind'] == 'W':            # swell starts on the given step, peaks `length` later
                smp = swell_sample(ev['length'], ev['seed'])
            else:
                smp = drum_sample(ev['kind'], ev['seed'] % 6)
            v = ev['vel'] * DRUM_LVL[ev['kind']]
            st = pan_st(smp * v, DRUM_PAN[ev['kind']])
            place(drums, st, i0)
            place(dsend, st * DRUM_ROOM[ev['kind']], i0)
        else:
            sig = render_event(song, ev)
            place(bufs[ev['part']], sig, i0)
    if cyclic:
        for p in bufs:
            bufs[p][:TAIL] += bufs[p][n_out:]
            bufs[p] = bufs[p][:n_out]
        for arr in ('drums', 'dsend'):
            a = drums if arr == 'drums' else dsend
            a[:TAIL] += a[n_out:]
        drums = drums[:n_out]
        dsend = dsend[:n_out]
    bufs['drums'] = drums
    bufs['dsend'] = dsend
    return bufs


def mix_song(song, st, cyclic, t0, norm=None):
    cfg = song.mix
    first = norm is None
    if first:
        norm = {}
    n = st['drums'].shape[0]
    out = np.zeros((n, 2))
    spring_send = np.zeros(n)
    room_send = np.zeros((n, 2))
    Lcyc = song.Ls if (song.loop and cyclic) else (song.Ls if song.loop else None)
    stems = {}
    for name in PARTS_MONO:
        if name not in cfg:
            continue
        c = cfg[name]
        x = st[name]
        if first and not np.any(x):
            continue
        if name not in norm and not first:
            continue
        x = fft_eq(x, c.get('eq'), cyclic)
        if c.get('drive'):
            if first:
                norm[name + '_pk'] = float(np.max(np.abs(x))) + 1e-9
            pk = norm[name + '_pk']
            k = c['drive']
            x = np.tanh(k * x / pk) * pk / math.tanh(k)
        if c.get('slap'):
            d, sdb = c['slap']
            x = x + undb(sdb) * fft_eq(shift(x, int(d * SR), cyclic), [('lp', 3500, 1), ('hp', 300, 1)], cyclic)
        if first:
            norm[name] = undb(-20.0 + c['db'] - lufs(np.stack([x, x], 1) * 0.7071))
        x = x * norm[name]
        if c.get('leslie'):
            s2 = leslie(x, t0, Lcyc, cyclic) * 0.75
            p = c.get('pan', 0.0)
            s2 = s2 * np.array([1.0 - 0.6 * max(p, 0.0), 1.0 - 0.6 * max(-p, 0.0)])
        else:
            s2 = pan_st(x, c.get('pan', 0.0))
        out += s2
        stems[name] = s2
        if c.get('spring') is not None:
            spring_send += x * undb(c['spring'])
        if c.get('room') is not None:
            room_send += s2 * undb(c['room'])
    # drums
    c = cfg['drums']
    x = fft_eq(st['drums'], c.get('eq'), cyclic)
    if c.get('drive'):
        if first:
            norm['drums_pk'] = float(np.max(np.abs(x))) + 1e-9
        pk = norm['drums_pk']
        k = c['drive']
        x = np.tanh(k * x / pk) * pk / math.tanh(k)
    if first:
        norm['drums'] = undb(-20.0 + c['db'] - lufs(x))
    x = x * norm['drums']
    out += x
    stems['drums'] = x
    room_send += st['dsend'] * norm['drums'] * undb(c.get('room', -6))
    # reverbs
    sp = convolve(spring_send, get_ir('spring'), cyclic)
    sp = fft_eq(sp, [('hp', 230, 2), ('lp', 4800, 2)], cyclic) * undb(cfg.get('spring_ret', 0.0))
    rm = convolve(room_send, get_ir('room', t60=cfg.get('room_t60', 1.0)), cyclic) * undb(cfg.get('room_ret', 0.0))
    out += sp + rm
    stems['spring'] = sp
    stems['room'] = rm
    out = fft_eq(out, cfg.get('master_eq', [('hp', 28, 2)]), cyclic)
    return out, norm, stems


def write_wav(path, x, seed=0):
    rng = np.random.default_rng(seed)
    y = np.clip(x, -1, 1)
    d = (rng.random(y.shape) - rng.random(y.shape))
    s = np.clip(np.round(y * 32767 + d), -32768, 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(s.tobytes())


def encode_mp3(wav, mp3):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-map_metadata', '-1',
                    '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), '-ac', '2', mp3], check=True)
    if not os.environ.get('KEEP_WAV'):          # intermediates are big; keep with KEEP_WAV=1
        os.remove(wav)


def decode(path):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2',
                        '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype='<f4').reshape(-1, 2).astype(np.float64)


def calibrate(x, target, cyclic, gain0=1.0):
    g = gain0
    for _ in range(4):
        y = master(x, cyclic, g)
        L = lufs(y)
        g *= undb(target - L)
        if abs(target - L) < 0.05:
            break
    return g


def stem_report(stems):
    rep = {}
    for k, v in stems.items():
        rep[k] = round(lufs(v), 1) if np.any(v) else None
    return rep


def build_song(fn):
    t_start = time.time()
    song = fn().finalize()
    TOM_TUNING[0] = song.tom_hz
    _DRUM_CACHE.clear()
    os.makedirs(WORK, exist_ok=True)
    body = render_region(song, 'body', True)
    mix_b, norm, stems = mix_song(song, body, True, 0.0)
    g = calibrate(mix_b, SONG_LUFS, True, undb(-16.0 - lufs(mix_b)))
    body_m = master(mix_b, True, g)
    intro = render_region(song, 'intro', False)
    mix_i, _, _ = mix_song(song, intro, False, -song.I / SR, norm)
    pad = int(0.5 * SR)              # let the compressor settle on silence
    intro_m = master(np.concatenate([np.zeros((pad, 2)), mix_i]), False, g)[pad:]

    I, L = song.I, song.L
    total = I + L + 3 * SR
    xs = I - int(0.5 * song.barlen * SR)
    xe = I - int(0.12 * SR)
    w = np.ones(total)
    w[xs:xe] = np.linspace(1.0, 0.0, xe - xs)
    w[xe:] = 0.0
    F = np.zeros((total, 2))
    m = min(total, len(intro_m))
    F[:m] += intro_m[:m] * w[:m, None]
    idx = (np.arange(xs, total) - I) % L
    F[xs:] += body_m[idx] * (1.0 - w[xs:, None])
    fo = int(0.01 * SR)
    F[-fo:] *= np.linspace(1, 0, fo)[:, None]
    pk = float(np.max(np.abs(F)))
    if pk > undb(CEIL_DB):
        F *= undb(CEIL_DB) / pk
    wav = os.path.join(WORK, 'music_%s.wav' % song.key)
    mp3 = os.path.join(OUT, 'music_%s.mp3' % song.key)
    write_wav(wav, F, seed=stable_seed(song.key))
    encode_mp3(wav, mp3)
    info = dict(key=song.key, title=song.title, bpm=song.bpm, bpm_true=round(song.bpm_true, 4), I=I, L=L, total=total,
                loopStart=round(I / SR, 6), loopEnd=round((I + L) / SR, 6),
                file='assets/audio/music_%s.mp3' % song.key,
                lufs_pre=round(lufs(F), 2), rms=round(rms_db(F), 2), peak=round(db(pk), 2),
                stems=stem_report(stems), secs=round(time.time() - t_start, 1))
    with open(os.path.join(WORK, 'music_%s.json' % song.key), 'w') as fh:
        json.dump(info, fh, indent=1)
    return info


def build_jingle(fn):
    t_start = time.time()
    song = fn().finalize()
    TOM_TUNING[0] = song.tom_hz
    _DRUM_CACHE.clear()
    os.makedirs(WORK, exist_ok=True)
    body = render_region(song, 'body', False)
    mix_b, norm, stems = mix_song(song, body, False, 0.0)
    length = int(song.length * SR)
    mix_b = mix_b[:length + int(0.3 * SR)]
    pad = int(0.3 * SR)
    padded = np.concatenate([np.zeros((pad, 2)), mix_b])
    g = calibrate(padded, song.lufs or JINGLE_LUFS, False, undb(-14.0 - lufs(padded)))
    y = master(padded, False, g)[pad:pad + length]
    fo = int(song.fade * SR)
    y[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    fi = int(0.002 * SR)
    y[:fi] *= np.linspace(0, 1, fi)[:, None]
    wav = os.path.join(WORK, '%s.wav' % song.key)
    mp3 = os.path.join(OUT, '%s.mp3' % song.key)
    write_wav(wav, y, seed=stable_seed(song.key))
    encode_mp3(wav, mp3)
    info = dict(key=song.key, file='assets/audio/%s.mp3' % song.key, total=len(y),
                lufs_pre=round(lufs(y), 2), rms=round(rms_db(y), 2), peak=round(db(float(np.max(np.abs(y)))), 2),
                stems=stem_report(stems), secs=round(time.time() - t_start, 1))
    with open(os.path.join(WORK, '%s.json' % song.key), 'w') as fh:
        json.dump(info, fh, indent=1)
    return info


# =============================================================================
#  mix presets
# =============================================================================
EQ_SURF_LEAD = [('hp', 95, 2), ('peak', 300, 1.5, 0.9), ('peak', 2700, 1.5, 0.8), ('lp', 6000, 2), ('hs', 9000, -3)]
EQ_RHY = [('hp', 130, 2), ('peak', 350, 1.0, 1.0), ('peak', 3000, 0.5, 0.8), ('lp', 5200, 2)]
EQ_BASS = [('hp', 33, 2), ('ls', 100, 1.5), ('peak', 850, 3.0, 1.0), ('lp', 2600, 2)]
EQ_FAR = [('hp', 170, 2), ('peak', 3300, -2.5, 1.0), ('lp', 7000, 2)]
EQ_HAM = [('hp', 90, 2), ('lp', 6000, 2)]
EQ_DRUMS = [('hp', 28, 2), ('hs', 9500, -2.5)]


def base_mix():
    return {
        'lead': dict(db=1.5, pan=0.06, eq=EQ_SURF_LEAD, drive=1.7, spring=-7.0, room=-22.0),
        'lead2': dict(db=-4.5, pan=-0.3, eq=EQ_SURF_LEAD, drive=1.7, spring=-8.0, room=-22.0),
        'rhy': dict(db=-6.0, pan=-0.5, eq=EQ_RHY, drive=1.3, spring=-12.0, room=-20.0),
        'bass': dict(db=-1.5, pan=0.0, eq=EQ_BASS, drive=1.5),
        'org': dict(db=-7.0, pan=0.45, eq=EQ_FAR, room=-10.0),
        'drums': dict(db=-0.5, eq=EQ_DRUMS, drive=1.25, room=-6.0),
        'spring_ret': 0.0, 'room_ret': 0.0, 'room_t60': 1.0,
        'master_eq': [('hp', 32, 2), ('peak', 110, 1.0, 0.7), ('peak', 2600, -1.5, 0.8)],
    }


# =============================================================================
#  SONG 1 -- "Coastline Cruise"   E major, 156 BPM, classic upbeat surf
# =============================================================================
E_MAJ = {4, 6, 8, 9, 11, 1, 3}
D_MAJ = {2, 4, 6, 7, 9, 11, 1}
A_MAJ = {9, 11, 1, 2, 4, 6, 8}


def song_coastline():
    S = Song('coastline', 'Coastline Cruise', 156, intro_bars=2, body_bars=40, seed=1101,
             trem_div=6, bass_range=(28, 39), bass_center=34)
    S.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
    S.mix = base_mix()
    S.tom_hz = 123.47          # B2: fits E, A, B7, F#7

    A1 = ['E', 'E', 'A', 'E', 'C#m', 'A', 'B', 'B7']
    A2 = ['E', 'E', 'A', 'E', 'G#7', 'C#m', 'F#m B7', 'E']
    B = ['A', 'A', 'E', 'E', 'A', 'A', 'F#7', 'B7']
    C = ['E', 'E', 'E', 'E', 'A', 'E', 'F#m', 'B7']
    A3 = ['E', 'E', 'A', 'E', 'C#m', 'A', 'B', 'B7']
    S.chords(0, A1 + A2 + B + C + A3)
    S.chords(-2, ['E', 'B7'])

    hook = ["E5/6~ B4/2 C#5/2 B4/2 G#4/4",
            "E4/2 F#4/2 G#4/4 B4/8~",
            "C#5/6~ B4/2 A4/2 C#5/2 E5/4",
            "D#5/2 E5/2 B4/12~w",
            "C#5/6~ G#4/2 E4/2 G#4/2 C#5/4",
            "B4/2 C#5/2 A4/12~w",
            "F#4/2 G#4/2 A4/2 B4/2 D#5/4 F#5/4"]
    J = ' | '.join
    # ---- A1 (bars 0-7)
    S.lead(0, J(hook + ["E5/4 D#5/6~ r/2 C#5/2 D#5/2"]))
    # ---- A2 (bars 8-15): baritone twang an octave down, new cadence
    S.lead(8, J(hook[:4]), transpose=-12, vel=1.0)
    S.lead(12, J(["D#4/6~ C4/2 G#3/2 C4/2 D#4/4",
                  "E4/2 D#4/2 C#4/12~w",
                  "A3/2 B3/2 C#4/2 A3/2 B3/2 D#4/2 F#4/4",
                  "E4/10~ r/2 C#5/2 D#5/2"]), vel=1.0)
    # ---- B (bars 16-23): long tremolo waves
    S.lead(16, J(["E5/12~w C#5/2 E5/2", "F#5/4 E5/4 C#5/8~",
                  "B4/12~w G#4/2 B4/2", "C#5/4 B4/4 G#4/8~",
                  "C#5/12~w A4/2 C#5/2", "E5/4 F#5/4 A5/8~",
                  "F#5/4 E5/4 C#5/4 A#4/4", "B4/4 D#5/4 F#5/6~ r/2"]))
    S.harmony(20, J(["C#5/12~w A4/2 C#5/2", "E5/4 F#5/4 A5/8~"]), mode='3rd', vel=0.55, scale=E_MAJ)
    # ---- C (bars 24-31): stop-time low twang riff, then build
    S.lead(24, J(["r/4 E3/2 G#3/2 B3/2 C#4/2 B3/2 G#3/2",
                  "A3/2 G#3/2 E3/4 B2/2 C#3/2 D3/2 D#3/2",
                  "E3/2> r/2 E3/2 G#3/2 B3/2 E4/2 D4/2 B3/2",
                  "C#4/2 B3/2 A3/2 G#3/2 F#3/2 G#3/2 B3/4"]), vel=1.05)
    S.lead(28, J(["A4/8~ C#5/8~", "B4/8~ G#4/8~", "A4/8~ C#5/4 F#5/4", "D#5/12~w C#5/2 D#5/2"]))
    # ---- A3 (bars 32-39): hook doubled an octave down, fill bar 39
    S.lead(32, J(hook))
    S.lead(32, J(hook), part='lead2', transpose=-12, vel=0.75)
    S.lead(39, "B4+D#5/2. r/10 C#5/2 D#5/2")

    # ---- intro bar -2: surf glissando down the low E string over a snare roll
    S.gliss(-2, 0, 15, 57, 40, vel=1.0, ease=1.7, hold=0.1)
    S.roll(-2, 4, 16, 'S', 0.08, 0.7, div=2)
    S.swell(-2, 0, 16, vel=0.8)

    # ---- rhythm guitar
    S.rhythm(0, 7, 'chop', vel=0.95)
    S.rhythm(7, 1, 'eighths', vel=0.8)
    S.rhythm(8, 8, 'eighths', vel=0.78)
    S.rhythm(16, 8, 'ring', vel=0.85, trem=True)
    S.rhythm(24, 4, 'stab', vel=1.0)
    S.rhythm(28, 4, 'eighths', vel=0.8)
    S.rhythm(32, 7, 'chop', vel=1.0)
    S.rhythm(39, 1, 'stab', vel=1.0)

    # ---- bass
    S.bass(0, 24, 'boogie', vel=0.9, start_prev=30)
    for b in range(24, 27):
        S.bass_line(b, "E1/3 r/13")
    S.bass_line(27, "E1/3 r/5 E1/2 F#1/2 G1/2 G#1/2")
    S.bass(28, 11, 'boogie', vel=0.9, start_prev=32)
    S.bass_line(39, "B1/4 r/4 B1/2 A1/2 G#1/2 F#1/2")

    # ---- organ (Farfisa pad in the bridge and the build)
    S.organ_pad(16, 8, kind='far', vel=0.55, center=66)
    S.organ_pad(28, 4, kind='far', vel=0.5, center=66)

    # ---- drums
    beat = {'K': 'x.......x.x.....', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.X.x.'}
    beat2 = {'K': 'x.......x.x...x.', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.X.o.'}
    surf = {'K': 'x.......x.......', 'S': '....X.......X...', 'T3': 'x.o.x.o.x.o.x.o.', 'P': '....x.......x...'}
    fill1 = {'K': 'x.......x.......', 'S': '....X.......XX..', 'T2': '..............X.', 'T3': '...............X',
             'H': 'X.x.X.x.X.x.....'}
    fill2 = {'K': 'x.......x.......', 'S': '....X...XoXo....', 'T1': '............XX..', 'T3': '..............XX',
             'H': 'X.x.X.x.........'}
    S.drums(0, beat, 7)
    S.hit(0, 0, 'C', 0.9)
    S.drums(7, fill1)
    S.drums(8, beat2, 7)
    S.hit(8, 0, 'C', 0.8)
    S.drums(15, fill2)
    S.drums(16, surf, 7)
    S.hit(16, 0, 'C', 0.9)
    S.hit(20, 0, 'C', 0.7)
    S.drums(23, {'K': 'x.......x.......', 'S': '....X...........', 'T3': 'x.o.x.o.........'})
    S.roll(23, 8, 16, 'S', 0.3, 1.0, div=1)
    for b in range(24, 28):
        S.drums(b, {'K': 'X...............', 'H': '....o...o...o...'})
        S.hit(b, 0, 'C', 0.85)
    S.drums(27, {'S': '............x.xX'})
    S.drums(28, {'K': 'x.......x.......', 'S': '....X.......X...', 'T3': 'x.o.x.o.x.o.x.o.'}, 3)
    S.hit(28, 0, 'C', 0.9)
    S.drums(31, {'K': 'x.......x.......', 'S': '....X...........', 'T3': 'x.o.x.o.........'})
    S.roll(31, 8, 16, 'S', 0.35, 1.0, div=2)
    S.drums(32, beat2, 7)
    S.hit(32, 0, 'C', 1.0)
    S.hit(36, 0, 'C', 0.8)
    # bar 39 = the fill bar the intro also plays: band hit, then a tom run
    S.drums(39, {'K': 'X...............', 'S': '....X.XX........', 'T1': '........XXX.....',
                 'T2': '...........XXX..', 'T3': '..............XX'})
    S.hit(39, 0, 'C', 0.9)
    return S


# =============================================================================
#  SONG 2 -- "Golden Hour"   D major, 120 BPM, easy sunny driving rock
# =============================================================================
def song_golden():
    S = Song('golden', 'Golden Hour', 120, intro_bars=2, body_bars=32, seed=2202,
             trem_div=6, bass_range=(28, 39), bass_center=34)
    S.tones = {'lead': 'clean', 'lead2': 'clean', 'rhy': 'rhy'}
    mx = base_mix()
    mx['lead'] = dict(db=1.5, pan=0.08, eq=[('hp', 110, 2), ('peak', 320, 1.0, 0.9), ('peak', 2500, 1.5, 0.8),
                                            ('lp', 6500, 2), ('hs', 9000, -3)],
                      drive=1.5, spring=-13.0, room=-18.0, slap=(0.118, -11.0))
    mx['lead2'] = dict(mx['lead'], db=-5.0, pan=-0.32, spring=-14.0)
    mx['rhy'] = dict(db=-5.5, pan=-0.48, eq=[('hp', 150, 2), ('peak', 3000, 1.5, 0.8), ('lp', 6000, 2)],
                     drive=1.2, spring=-15.0, room=-16.0)
    mx['org'] = dict(db=-6.5, pan=0.35, eq=EQ_HAM, room=-12.0, leslie=True)
    mx['bass'] = dict(db=-1.5, pan=0.0, eq=EQ_BASS, drive=1.4)
    mx['drums'] = dict(db=-1.0, eq=EQ_DRUMS, drive=1.2, room=-5.0)
    mx['room_t60'] = 1.2
    mx['spring_ret'] = -1.0
    S.mix = mx

    A1 = ['D', 'C', 'G', 'D', 'D', 'C', 'G', 'A']
    A2 = ['D', 'C', 'G', 'D', 'Bm', 'G', 'Em', 'A']
    B = ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'A7']
    A3 = ['D', 'C', 'G', 'D', 'D', 'C', 'G', 'A']
    S.chords(0, A1 + A2 + B + A3)
    S.chords(-2, ['G', 'A'])
    J = ' | '.join
    hook = ["r/4 F#4/2 A4/2 B4/4 A4/4",
            "r/4 E4/2 G4/2 A4/4 G4/4",
            "r/4 B3/2 D4/2 E4/4 G4/4",
            "A4/10w F#4/2 E4/2 D4/2"]
    answer = ["r/4 A4/2 B4/2 D5/4 E5/4",
              "E5/6^ D5/2 C5/4 A4/4",
              "B4/4 A4/2 G4/2 A4/4 B4/4"]
    last = "C#5/12w r/4"
    answer2 = ["r/4 D5/2 F#5/2 E5/4 D5/4",
               "B4/6 A4/2 G4/4 B4/4",
               "G4/4 B4/2 E5/2 D5/4 B4/4",
               "C#5/8w E5/4 C#5/2 A4/2"]
    chorus = ["D5/6 B4/2 D5/4 E5/4",
              "E5/6 C#5/2 E5/4 F#5/4",
              "F#5/6 E5/2 C#5/4 A4/4",
              "B4/12w A4/2 B4/2",
              "D5/6 B4/2 D5/4 G5/4",
              "F#5/4 E5/4 C#5/4 E5/4",
              "D5/12w r/4",
              "r/4 E5/2 C#5/2 A4/4 G4/4"]
    S.lead(0, J(hook + answer + [last]))
    S.lead(8, J(hook + answer2))
    S.harmony(8, J(hook), mode='6th', vel=0.5, scale=D_MAJ)
    S.lead(16, J(chorus))
    S.harmony(16, J(chorus[:6]), mode='3rd', vel=0.5, scale=D_MAJ)
    S.lead(24, J(hook + answer))
    S.harmony(28, J(answer), mode='3rd', vel=0.45, scale=D_MAJ)
    S.lead(31, last)
    # intro bar -2: little pickup lick over an organ swell
    S.lead(-2, "r/8 B4/2 A4/2 G4/2 A4/2", vel=0.85)

    # rhythm / bass / organ
    S.rhythm(0, 31, 'oldfaithful', vel=0.9)
    S.rhythm(31, 1, 'oldfaithful', vel=0.95)
    S.bass(0, 31, 'lope', vel=0.9, start_prev=37)
    S.bass_line(31, "A1/6 A1/2 E2/4 B1/2 C#2/2", vel=0.9)
    S.organ_pad(0, 8, kind='ham', vel=0.45, center=62)
    S.organ_pad(8, 8, kind='ham', vel=0.55, center=62)
    S.organ_pad(16, 8, kind='ham_bright', vel=0.6, center=64)
    S.organ_pad(24, 8, kind='ham', vel=0.5, center=62)
    S.organ_pad(-2, 1, kind='ham', vel=0.5, center=62, swell=1.2)

    # drums
    groove = {'K': 'x.....x.x.......', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.X.x.'}
    groove_cl = dict(groove, P='....x.......x...')
    groove_tb = dict(groove_cl, B='o.x.o.x.o.x.o.x.')
    chorus_d = {'K': 'x.....x.x.....x.', 'S': '....X.......X...', 'R': 'x.x.x.x.x.x.x.x.',
                'P': '....x.......x...', 'B': 'o.x.o.x.o.x.o.x.'}
    small_fill = {'K': 'x.....x.x.......', 'S': '....X.......XX..', 'T2': '..............X.', 'T3': '...............X',
                  'H': 'X.x.X.x.X.x.....'}
    S.drums(0, groove, 7)
    S.hit(0, 0, 'C', 0.75)
    S.drums(7, small_fill)
    S.drums(8, groove_cl, 7)
    S.drums(15, dict(small_fill, P='....x.......x...'))
    S.drums(16, chorus_d, 7)
    S.hit(16, 0, 'C', 0.9)
    S.hit(20, 0, 'C', 0.7)
    S.drums(23, {'K': 'x.....x.x.......', 'S': '....X...X.XxXX..', 'R': 'x.x.x.x.........',
                 'T2': '..............X.', 'T3': '...............X', 'P': '....x.......x...'})
    S.drums(24, groove_tb, 7)
    S.hit(24, 0, 'C', 0.85)
    # bar 31 = fill bar (also the intro's second bar)
    S.drums(31, {'K': 'x.....x.........', 'S': '....X...X.X.....', 'H': 'X.x.X.x.........',
                 'T1': '............X...', 'T2': '.............X..', 'T3': '..............XX',
                 'P': '....x.......x...'})
    S.swell(-2, 0, 16, vel=0.6)
    S.drums(-2, {'B': '........o.x.o.x.'})
    return S


# =============================================================================
#  SONG 3 -- "Wave Rider"   A major, 170 BPM, surf stomp, lead/organ call & response
# =============================================================================
def song_wave():
    S = Song('wave', 'Wave Rider', 170, intro_bars=2, body_bars=40, seed=3303,
             trem_div=6, bass_range=(28, 39), bass_center=34)
    S.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
    mx = base_mix()
    mx['lead'] = dict(db=1.5, pan=-0.12, eq=[('hp', 100, 2), ('peak', 300, 1.0, 0.9), ('peak', 2800, 2.0, 0.8),
                                             ('lp', 6300, 2), ('hs', 9000, -3)],
                      drive=1.8, spring=-9.0, room=-22.0)
    mx['lead2'] = dict(mx['lead'], db=-5.0, pan=0.25, spring=-10.0)
    mx['org'] = dict(db=-2.0, pan=0.38, eq=EQ_FAR, room=-11.0, drive=1.3)
    mx['rhy'] = dict(db=-6.5, pan=-0.5, eq=EQ_RHY, drive=1.4, spring=-13.0, room=-20.0)
    mx['drums'] = dict(db=0.0, eq=EQ_DRUMS, drive=1.3, room=-6.0)
    S.mix = mx
    A = ['A', 'A', 'D', 'D', 'E', 'D', 'A', 'E']
    B = ['D', 'D', 'A', 'A', 'D', 'D', 'E', 'E7']
    C = ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'E', 'E']
    S.chords(0, A + A + B + C + A)
    S.chords(-2, ['E', 'E'])
    J = ' | '.join
    call1 = ["C#5/2 C#5/1 C#5/1 E5/3 C#5/3 A4/2 B4/2 C#5/2", "E5/6~ C#5/2 B4/4 A4/4"]
    resp1 = ["F#5/2 F#5/1 F#5/1 A5/3 F#5/3 D5/2 E5/2 F#5/2", "A5/6 F#5/2 E5/4 D5/4"]
    call2 = ["G#4/2 G#4/1 G#4/1 B4/3 E5/3 D5/2 B4/2 G#4/2", "A4/6~ F#4/2 A4/4 B4/4"]
    resp2 = ["C#5/2 E5/2 A5/4 E5/2 C#5/2 A4/4", "B4/4 G#4/4 E4/4 r/4"]
    # ---- A1: lead calls, organ answers
    S.lead(0, J(call1), vel=0.95)
    S.organ_line(2, J(resp1), vel=0.8)
    S.lead(4, J(call2), vel=0.95)
    S.organ_line(6, J(resp2), vel=0.8)
    # ---- A2: organ calls, lead answers
    S.organ_line(8, J(call1), vel=0.8)
    S.lead(10, J(resp1), vel=0.95)
    S.organ_line(12, J(call2), vel=0.85)
    S.lead(14, J(["C#5/2 E5/2 A5/4 E5/2 C#5/2 A4/4", "B4/4 G#4/4 E4/4 r/4"]), vel=0.95)
    # ---- B: stomp, tremolo waves, organ chops
    S.lead(16, J(["F#5/8~ A5/8~", "F#5/4~ E5/4 D5/8~", "E5/8~ C#5/8~", "E5/4 F#5/4 E5/4 C#5/4",
                  "F#5/8~ A5/8~", "B5/4~ A5/4 F#5/8~", "G#5/8~ E5/8~", "D5/4 E5/4 G#5/4 B5/4"]))
    S.harmony(16, J(["F#5/8~ A5/8~", "F#5/4~ E5/4 D5/8~", "E5/8~ C#5/8~", "E5/4 F#5/4 E5/4 C#5/4"]),
              mode='3rd', vel=0.5, scale=A_MAJ)
    S.organ_stabs(16, 8, kind='far', vel=0.55, center=64)
    # ---- C: low twang riff over toms, then the build
    riff = ["F#3/2 F#3/2 A3/2 C#4/2 E4/4 C#4/4", "D4/2 D4/2 F#3/2 A3/2 D4/4 r/4",
            "C#4/2 C#4/2 E4/2 A4/2 C#5/4 A4/4", "B3/2 B3/2 D4/2 E4/2 G#4/4 B4/4"]
    S.lead(24, J(riff), vel=1.05)
    nts, _ = parse_phrase(J(riff))            # bass doubles the riff two octaves down
    for nt in nts:
        S.add('bass', 24 * 16 + nt['step'], 3.0, kind='bass', pitch=nt['pitches'][0] - 24,
              dur=nt['steps'] * S.step, vel=0.95, legato=0.85)
    S.lead(28, J(["C#5/8~ A4/8~", "D5/8~ F#5/8~", "E5/8~ G#5/8~", "B5/12~ r/4"]), cresc=False)
    S.organ_pad(28, 4, kind='far', vel=0.6, center=64, swell=0.4)
    # ---- A3: everybody on the hook
    S.lead(32, J(call1), vel=0.95)
    S.organ_line(32, J(call1), vel=0.55, transpose=-12)
    S.organ_line(34, J(resp1), vel=0.8)
    S.lead(34, J(resp1), part='lead2', transpose=-12, vel=0.6)
    S.lead(36, J(call2), vel=0.95)
    S.organ_line(36, J(call2), vel=0.5)
    S.organ_line(38, J(["C#5/2 E5/2 A5/4 E5/2 C#5/2 A4/4"]), vel=0.8)
    S.lead(38, J(["C#5/2 E5/2 A5/4 E5/2 C#5/2 A4/4"]), part='lead2', transpose=-12, vel=0.6)
    S.lead(39, "B4+E5/2. r/14")
    S.organ_line(39, "E5+G#5+B5/2. r/14", vel=0.7)
    # intro bar -2: rising tremolo swell on the low strings
    S.gliss(-2, 0, 15, 52, 64, vel=0.85, ease=0.8, hold=0.05)

    # rhythm
    S.rhythm(0, 16, 'palm8', vel=0.9)
    S.rhythm(16, 8, 'eighths', vel=0.85)
    S.rhythm(28, 4, 'eighths', vel=0.8)
    S.rhythm(32, 7, 'palm8', vel=0.95)
    S.rhythm(39, 1, 'stab', vel=1.0)
    # bass
    S.bass(0, 24, 'drive', vel=0.9, start_prev=35)
    S.bass(28, 11, 'drive', vel=0.9, start_prev=35)
    S.bass_line(39, "E2/3 r/5 E2/2 D2/2 C#2/2 B1/2")
    S.bass_line(-2, "E2/2 E2/2 E2/2 E2/2 E2/2 E2/2 E2/2 E2/2", vel=0.85)

    # drums
    drive = {'K': 'x.......x.x.....', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.X.x.'}
    drive_cl = dict(drive, P='....x.......x...', H='X.x.X.x.X.x.X.o.')
    stomp = {'K': 'x...x...x...x...', 'T3': 'x.x.x.x.x.x.x.x.', 'S': '....X.......X...', 'P': '....x.......x...'}
    toms = {'K': 'x.......x.......', 'T3': 'X..x..x.X..x..x.', 'T1': '..........x.....', 'S': '....x.......x...',
            'H': '..x...x...x...x.'}
    fillA = {'K': 'x.......x.......', 'S': '....X.......XX..', 'T2': '..............X.', 'T3': '...............X',
             'H': 'X.x.X.x.X.x.....'}
    S.drums(0, drive, 7)
    S.hit(0, 0, 'C', 0.9)
    S.drums(7, fillA)
    S.drums(8, drive_cl, 7)
    S.hit(8, 0, 'C', 0.8)
    S.drums(15, {'K': 'x.......x.......', 'S': '....X...XX......', 'T1': '..........XX....',
                 'T2': '............XX..', 'T3': '..............XX', 'H': 'X.x.X.x.........'})
    S.drums(16, stomp, 7)
    S.hit(16, 0, 'C', 1.0)
    S.hit(20, 0, 'C', 0.8)
    S.drums(23, {'K': 'x...x...x...x...', 'S': '....X...XXXXXXXX', 'P': '....x...........'})
    S.drums(24, toms, 4)
    S.hit(24, 0, 'C', 0.8)
    S.drums(28, {'K': 'x...x...x...x...', 'S': '....X.......X...', 'H': 'x.x.x.x.x.x.x.x.'}, 2)
    S.hit(28, 0, 'C', 0.8)
    S.drums(30, {'K': 'x...x...x...x...', 'S': 'o.o.x.x.o.o.x.x.'})
    S.roll(31, 0, 16, 'S', 0.4, 1.0, div=1)
    S.drums(31, {'K': 'x...x...x...x...'})
    S.drums(32, drive_cl, 7)
    S.hit(32, 0, 'C', 1.0)
    S.hit(36, 0, 'C', 0.8)
    # bar 39 = fill bar: band hit + punchy tom run (the intro's second bar too)
    S.drums(39, {'K': 'X...............', 'S': '....X.X.........', 'T1': '........XX......',
                 'T2': '..........XX....', 'T3': '............XXXX'})
    S.hit(39, 0, 'C', 0.9)
    # intro bar -2: drums stomp + bass pedal
    S.drums(-2, {'K': 'x...x...x...x...', 'T3': 'o.o.x.o.o.o.x.o.', 'P': '....x.......x...'})
    return S


# =============================================================================
#  SONG 4 -- "Pacific Twist"   G major, 146 BPM, 12-bar twist party, baritone twang + Farfisa
# =============================================================================
G_MAJ = {7, 9, 11, 0, 2, 4, 6}
A_MIN = {9, 11, 0, 2, 4, 5, 7}


def song_twist():
    S = Song('twist', 'Pacific Twist', 146, intro_bars=2, body_bars=32, seed=5505,
             trem_div=6, bass_range=(28, 40), bass_center=34)
    S.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
    mx = base_mix()
    mx['lead'] = dict(db=1.5, pan=0.1, eq=EQ_SURF_LEAD, drive=1.7, spring=-8.0, room=-21.0, slap=(0.105, -13.0))
    mx['lead2'] = dict(mx['lead'], db=-4.0, pan=-0.28, spring=-9.0)
    mx['org'] = dict(db=-3.5, pan=0.4, eq=EQ_FAR, room=-11.0, drive=1.2)
    mx['rhy'] = dict(db=-6.5, pan=-0.5, eq=EQ_RHY, drive=1.3, spring=-12.0, room=-19.0)
    mx['drums'] = dict(db=-0.5, eq=EQ_DRUMS, drive=1.25, room=-6.0)
    S.mix = mx
    S.tom_hz = 98.0            # G2
    blues = ['G', 'G', 'G', 'G', 'C', 'C', 'G', 'G', 'D', 'C', 'G', 'D7']
    bridge = ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D7']
    S.chords(0, blues + blues + bridge)
    S.chords(-2, ['D', 'D7'])
    J = ' | '.join
    riff = ["G4/2 B4/2 D5/2 E5/2 D5/2 B4/2 G4/4",
            "A4/2 B4/2 A4/2 G4/2 E4/4 D4/4",
            "G4/2 B4/2 D5/2 E5/2 G5/4 E5/2 D5/2",
            "D5/8~w B4/4 r/4",
            "C5/2 E5/2 G5/2 A5/2 G5/2 E5/2 C5/4",
            "D5/2 E5/2 D5/2 C5/2 A4/4 G4/4",
            "G4/2 B4/2 D5/2 E5/2 D5/2 B4/2 G4/4",
            "B4/4 A4/4 G4/8~",
            "A4/2 D5/2 F#5/2 A5/2 F#5/2 D5/2 A4/4",
            "G4/2 C5/2 E5/2 G5/2 E5/2 C5/2 G4/4",
            "B4/4 D5/2 B4/2 G4/4 E4/4",
            "F#4/2 G4/2 A4/2 B4/2 C5/2 B4/2 A4/4"]
    # ---- A1 (bars 0-11): the riff, Farfisa chops on the off-beats
    S.lead(0, J(riff))
    S.organ_stabs(0, 12, kind='far', vel=0.4, center=64)
    # ---- A2 (bars 12-23): baritone twang an octave down, Farfisa doubles it on top
    S.lead(12, J(riff), transpose=-12, vel=1.0)
    S.organ_line(12, J(riff[:11]), kind='far', vel=0.55)
    # ---- bridge (bars 24-31): tremolo waves in harmony
    bridge_lead = ["G5/12~w E5/2 G5/2", "E5/8~ C5/8~", "D5/12~w B4/2 D5/2", "F#5/8~ A5/8~",
                   "B5/8~ G5/8~", "E5/4 G5/4 E5/4 C5/4", "C5/4 E5/4 A5/8~", "F#5/4 E5/2 D5/2 C5/2 A4/2 F#4/4"]
    S.lead(24, J(bridge_lead))
    S.harmony(24, J(bridge_lead[:4]), mode='3rd', vel=0.5, scale=G_MAJ)
    S.organ_pad(24, 7, kind='far', vel=0.5, center=64)
    # ---- intro bar -2: drum break + pickup lick
    S.lead(-2, "r/8 D4/2 F#4/2 A4/2 C5/2", vel=0.9)

    # ---- rhythm guitar
    S.rhythm(-2, 1, 'chop', vel=0.8)
    S.rhythm(0, 23, 'chop', vel=0.95)
    S.rhythm(23, 1, 'eighths', vel=0.85)
    S.rhythm(24, 7, 'ring', vel=0.8, trem=True)
    S.rhythm(31, 1, 'eighths', vel=0.85)
    # ---- bass: twist boogie, walking bridge
    S.bass(0, 24, 'boogie', vel=0.9, start_prev=31)
    S.bass(24, 8, 'walk4', vel=0.9)
    S.bass_line(-2, "D2/4 D2/4 F#2/4 A2/4", vel=0.85)

    # ---- drums: twist beat with claps and tambourine
    twist = {'K': 'x.......x.x.....', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.X.x.',
             'P': '....x.......x...', 'B': '..x...x...x...x.'}
    twist2 = dict(twist, K='x.....x.x.x.....')
    fill = {'K': 'x.......x.......', 'S': '....X...X.XxXX..', 'T2': '..............X.', 'T3': '...............X',
            'H': 'X.x.X.x.........'}
    bridge_d = {'K': 'x.......x.......', 'S': '....X.......X...', 'R': 'x.x.x.x.x.x.x.x.', 'T3': '..o...o...o...o.'}
    S.drums(0, twist, 11)
    S.hit(0, 0, 'C', 0.9)
    S.drums(11, fill)
    S.drums(12, twist2, 11)
    S.hit(12, 0, 'C', 0.85)
    S.drums(23, dict(fill, P='....x.......x...'))
    S.drums(24, bridge_d, 7)
    S.hit(24, 0, 'C', 0.95)
    S.hit(28, 0, 'C', 0.75)
    # bar 31 = fill bar (also the intro's second bar)
    S.drums(31, {'K': 'x.......x.......', 'S': '....X.X.X.......', 'T1': '..........XX....',
                 'T2': '............XX..', 'T3': '..............XX'})
    S.drums(-2, {'K': 'x...x...x...x...', 'P': '....x.......x...', 'S': '..............xX'})
    S.swell(-2, 0, 16, vel=0.5)
    return S


# =============================================================================
#  Legacy SONG 5 recipe -- the radio now preserves imported "Coast Drive" instead.
#  "Highway One": A major, 112 BPM, laid-back cruising rock, singing clean lead
# =============================================================================
def song_highway():
    S = Song('highway', 'Highway One', 112, intro_bars=2, body_bars=32, seed=6606,
             trem_div=6, bass_range=(28, 40), bass_center=35)
    S.tones = {'lead': 'clean', 'lead2': 'clean', 'rhy': 'rhy'}
    mx = base_mix()
    mx['lead'] = dict(db=1.5, pan=0.06, eq=[('hp', 110, 2), ('peak', 300, 1.0, 0.9), ('peak', 2400, 1.8, 0.8),
                                            ('lp', 6500, 2), ('hs', 9000, -3)],
                      drive=1.6, spring=-14.0, room=-17.0, slap=(0.125, -11.0))
    mx['lead2'] = dict(mx['lead'], db=-5.0, pan=-0.3)
    mx['rhy'] = dict(db=-5.0, pan=-0.45, eq=[('hp', 140, 2), ('peak', 2800, 1.5, 0.8), ('lp', 6000, 2)],
                     drive=1.35, spring=-16.0, room=-16.0)
    mx['org'] = dict(db=-6.0, pan=0.35, eq=EQ_HAM, room=-12.0, leslie=True)
    mx['bass'] = dict(db=-1.0, pan=0.0, eq=EQ_BASS, drive=1.5)
    mx['drums'] = dict(db=-0.5, eq=EQ_DRUMS, drive=1.2, room=-5.0)
    mx['room_t60'] = 1.3
    S.mix = mx
    S.tom_hz = 110.0           # A2
    verse = ['A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'E']
    chorus = ['D', 'A', 'E', 'F#m', 'D', 'A', 'Bm', 'E']
    S.chords(0, verse + chorus + verse + chorus)
    S.chords(-2, ['D', 'E'])
    J = ' | '.join
    verse_m = ["r/4 C#5/4 E5/4 C#5/2 B4/2", "B4/6 G#4/2 E4/4 r/4",
               "r/4 A4/4 C#5/4 A4/2 F#4/2", "A4/8w F#4/4 E4/4",
               "r/4 C#5/4 E5/4 F#5/2 E5/2", "E5/6 D5/2 B4/4 G#4/4",
               "A4/4 F#4/2 A4/2 D5/4 C#5/4", "B4/12w r/4"]
    chorus_m = ["F#5/6 E5/2 D5/4 F#5/4", "E5/6 C#5/2 A4/4 C#5/4",
                "B4/4 G#4/4 B4/4 E5/4", "C#5/12w r/4",
                "D5/4 F#5/4 A5/4 F#5/4", "E5/6 C#5/2 E5/4 A5/4",
                "F#5/4 E5/2 D5/2 B4/4 D5/4", "E5/8w B4/2 C#5/2 D5/2 E5/2"]
    S.lead(0, J(verse_m))
    S.lead(8, J(chorus_m))
    S.harmony(8, J(chorus_m[:6]), mode='3rd', vel=0.45, scale=A_MAJ)
    S.lead(16, J(verse_m), vel=0.95)
    S.lead(16, J(verse_m), part='lead2', transpose=-12, vel=0.6)
    S.lead(24, J(chorus_m))
    S.harmony(24, J(chorus_m[:7]), mode='6th', vel=0.45, scale=A_MAJ)
    S.lead(-2, "r/8 A4/2 B4/2 C#5/2 D5/2", vel=0.85)

    # ---- rhythm: verses ring out, choruses drive
    S.rhythm(-2, 1, 'ring', vel=0.7)
    S.rhythm(0, 8, 'ring', vel=0.85)
    S.rhythm(8, 8, 'eighths', vel=0.85)
    S.rhythm(16, 8, 'oldfaithful', vel=0.85)
    S.rhythm(24, 8, 'eighths', vel=0.9)
    # ---- bass
    S.bass(0, 8, 'walk4', vel=0.9, start_prev=33)
    S.bass(8, 8, 'drive', vel=0.9)
    S.bass(16, 8, 'lope', vel=0.9)
    S.bass(24, 8, 'drive', vel=0.92)
    S.bass_line(-2, "D2/8 r/4 D2/2 D#2/2", vel=0.85)
    # ---- organ: tonewheel through the Leslie, brighter in the last chorus
    S.organ_pad(0, 8, kind='ham_soft', vel=0.45, center=62)
    S.organ_pad(8, 8, kind='ham', vel=0.55, center=64)
    S.organ_pad(16, 8, kind='ham', vel=0.5, center=62)
    S.organ_pad(24, 8, kind='ham_bright', vel=0.6, center=64)
    S.organ_pad(-2, 1, kind='ham', vel=0.5, center=62, swell=1.2)

    # ---- drums
    cruise = {'K': 'x.......x.x.....', 'S': '....X.......X...', 'H': 'x.x.x.x.x.x.x...', 'O': '..............o.'}
    chorus_d = {'K': 'x.......x.x...x.', 'S': '....X.......X...', 'R': 'x.x.x.x.x.x.x.x.', 'P': '....x.......x...'}
    fill_s = {'K': 'x.......x.......', 'S': '....X.......XX..', 'T2': '..............X.', 'T3': '...............X',
              'H': 'x.x.x.x.x.x.....'}
    S.drums(0, cruise, 7)
    S.hit(0, 0, 'C', 0.8)
    S.drums(7, fill_s)
    S.drums(8, chorus_d, 7)
    S.hit(8, 0, 'C', 0.95)
    S.hit(12, 0, 'C', 0.7)
    S.drums(15, dict(fill_s, P='....x.......x...'))
    S.drums(16, dict(cruise, B='..x...x...x...x.'), 7)
    S.hit(16, 0, 'C', 0.8)
    S.drums(23, fill_s)
    S.drums(24, chorus_d, 7)
    S.hit(24, 0, 'C', 1.0)
    S.hit(28, 0, 'C', 0.75)
    # bar 31 = fill bar (also the intro's second bar)
    S.drums(31, {'K': 'x.......x.......', 'S': '....X...X.X.....', 'H': 'x.x.x.x.........',
                 'T1': '............X...', 'T2': '.............X..', 'T3': '..............XX'})
    S.drums(-2, {'K': 'x.......x.......', 'H': 'x.x.x.x.x.x.x.x.'})
    S.swell(-2, 0, 16, vel=0.6)
    return S


# =============================================================================
#  SONG 6 -- "Riptide"   A minor, 172 BPM, tremolo-picked surf, low twang stop-time riff
# =============================================================================
def song_riptide():
    S = Song('riptide', 'Riptide', 172, intro_bars=2, body_bars=40, seed=7707,
             trem_div=6, bass_range=(28, 40), bass_center=33)
    S.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
    mx = base_mix()
    mx['lead'] = dict(db=1.5, pan=0.0, eq=[('hp', 95, 2), ('peak', 320, 1.5, 0.9), ('peak', 2900, 2.0, 0.8),
                                           ('lp', 6200, 2), ('hs', 9000, -3)],
                      drive=1.9, spring=-6.5, room=-22.0)
    mx['lead2'] = dict(mx['lead'], db=-4.5, pan=-0.3, spring=-8.0)
    mx['org'] = dict(db=-6.0, pan=0.42, eq=EQ_FAR, room=-10.0)
    mx['rhy'] = dict(db=-6.0, pan=-0.5, eq=EQ_RHY, drive=1.4, spring=-11.0, room=-20.0)
    mx['drums'] = dict(db=0.0, eq=EQ_DRUMS, drive=1.3, room=-6.0)
    S.mix = mx
    S.tom_hz = 110.0           # A2
    A = ['Am', 'Am', 'G', 'G', 'F', 'F', 'E', 'E7']
    B = ['Dm', 'Dm', 'Am', 'Am', 'F', 'G', 'E', 'E7']
    C = ['Am', 'Am', 'Am', 'Am', 'F', 'G', 'E', 'E7']
    S.chords(0, A + A + B + C + A)
    S.chords(-2, ['E', 'E7'])
    J = ' | '.join
    hook = ["A4/6~ C5/2 E5/4 A5/4", "G#5/2 A5/2 E5/12~w",
            "G4/6~ B4/2 D5/4 G5/4", "F#5/2 G5/2 D5/12~w",
            "F4/6~ A4/2 C5/4 F5/4", "E5/2 F5/2 C5/12~w",
            "E5/4 D5/4 C5/4 B4/4", "G#4/4 B4/4 D5/6~ r/2"]
    # ---- A1 (bars 0-7)
    S.lead(0, J(hook))
    # ---- A2 (bars 8-15): baritone an octave down over a Farfisa pad
    S.lead(8, J(hook), transpose=-12, vel=1.0)
    S.organ_pad(8, 8, kind='far', vel=0.5, center=64)
    # ---- B (bars 16-23): long tremolo waves in harmony, organ chops
    bsec = ["D5/12~w F5/2 A5/2", "G5/4 F5/4 D5/8~", "C5/12~w E5/2 A5/2", "G5/4 E5/4 C5/8~",
            "A4/8~ C5/8~", "B4/8~ D5/8~", "E5/8~ G#5/8~", "B5/12~w r/4"]
    S.lead(16, J(bsec))
    S.harmony(16, J(bsec[:4]), mode='3rd', vel=0.5, scale=A_MIN)
    S.organ_stabs(16, 8, kind='far', vel=0.5, center=64)
    # ---- C (bars 24-31): stop-time low twang riff (bass doubles it), then the build
    riff = ["A2/2 r/2 A2/2 C3/2 E3/2 G3/2 E3/2 C3/2",
            "D3/2 D#3/2 E3/4 A2/2 C3/2 B2/2 G#2/2",
            "A2/2> r/2 A2/2 C3/2 E3/2 A3/2 G3/2 E3/2",
            "F3/2 E3/2 D3/2 C3/2 B2/2 C3/2 E3/4"]
    S.lead(24, J(riff), vel=1.05)
    nts, _ = parse_phrase(J(riff))
    for nt in nts:
        S.add('bass', 24 * 16 + nt['step'], 3.0, kind='bass', pitch=nt['pitches'][0] - 12,
              dur=nt['steps'] * S.step, vel=0.95, legato=0.85)
    S.lead(28, J(["C5/8~ F5/8~", "D5/8~ G5/8~", "B4/8~ E5/8~", "G#5/12~w B4/2 D5/2"]))
    S.organ_pad(28, 4, kind='far', vel=0.55, center=64, swell=0.4)
    # ---- A3 (bars 32-39): hook doubled an octave down, fill bar 39
    S.lead(32, J(hook[:7]))
    S.lead(32, J(hook[:7]), part='lead2', transpose=-12, vel=0.75)
    S.lead(39, "E4+B4/2. r/14")
    # ---- intro bar -2: rising tremolo on the low string over a tom gallop
    S.gliss(-2, 0, 15, 45, 57, vel=0.85, ease=0.8, hold=0.05)

    # ---- rhythm
    S.rhythm(0, 8, 'palm8', vel=0.9)
    S.rhythm(8, 8, 'eighths', vel=0.8)
    S.rhythm(16, 8, 'ring', vel=0.85, trem=True)
    S.rhythm(24, 4, 'stab', vel=1.0)
    S.rhythm(28, 4, 'eighths', vel=0.85)
    S.rhythm(32, 7, 'palm8', vel=0.95)
    S.rhythm(39, 1, 'stab', vel=1.0)
    # ---- bass
    S.bass(0, 24, 'drive', vel=0.9, start_prev=33)
    S.bass(28, 11, 'drive', vel=0.9, start_prev=33)
    S.bass_line(39, "E1/3 r/5 E1/2 F1/2 F#1/2 G#1/2")

    # ---- drums
    gallop = {'K': 'x.......x.x.....', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.X.x.'}
    surf = {'K': 'x.......x.......', 'S': '....X.......X...', 'T3': 'x.o.x.o.x.o.x.o.', 'P': '....x.......x...'}
    fill = {'K': 'x.......x.......', 'S': '....X.......XX..', 'T2': '..............X.', 'T3': '...............X',
            'H': 'X.x.X.x.X.x.....'}
    S.drums(0, gallop, 7)
    S.hit(0, 0, 'C', 0.9)
    S.drums(7, fill)
    S.drums(8, dict(gallop, H='X.x.X.x.X.x.X.o.'), 7)
    S.hit(8, 0, 'C', 0.8)
    S.drums(15, {'K': 'x.......x.......', 'S': '....X...XX......', 'T1': '..........XX....',
                 'T2': '............XX..', 'T3': '..............XX', 'H': 'X.x.X.x.........'})
    S.drums(16, surf, 7)
    S.hit(16, 0, 'C', 1.0)
    S.hit(20, 0, 'C', 0.8)
    S.drums(23, {'K': 'x.......x.......', 'S': '....X...........', 'T3': 'x.o.x.o.........'})
    S.roll(23, 8, 16, 'S', 0.3, 1.0, div=1)
    for b in range(24, 28):
        S.drums(b, {'K': 'X...............', 'H': '....o...o...o...'})
        S.hit(b, 0, 'C', 0.85)
    S.drums(27, {'S': '............x.xX'})
    S.drums(28, {'K': 'x...x...x...x...', 'S': '....X.......X...', 'H': 'x.x.x.x.x.x.x.x.'}, 3)
    S.hit(28, 0, 'C', 0.9)
    S.drums(31, {'K': 'x...x...x...x...'})
    S.roll(31, 0, 16, 'S', 0.35, 1.0, div=1)
    S.drums(32, gallop, 7)
    S.hit(32, 0, 'C', 1.0)
    S.hit(36, 0, 'C', 0.8)
    # bar 39 = fill bar: band hit + tom run (the intro's second bar too)
    S.drums(39, {'K': 'X...............', 'S': '....X.X.........', 'T1': '........XX......',
                 'T2': '..........XX....', 'T3': '............XXXX'})
    S.hit(39, 0, 'C', 0.9)
    S.drums(-2, {'K': 'x.......x.......', 'T3': 'x.o.x.o.x.o.x.o.', 'S': '............x.xX'})
    return S


# =============================================================================
#  JINGLES
# =============================================================================
def jingle_checkpoint():
    S = Song('jingle_checkpoint', '', 160, 0, 1, seed=4401, loop=False, tail=1.4)
    S.length, S.fade = 2.55, 0.35
    S.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
    S.mix = base_mix()
    S.mix['lead']['spring'] = -7.0
    S.chords(0, ['E'])
    S.lead(0, "G#4/1 B4/1 E5/1 G#5/1 B5/12~w", vel=1.0, jit=1.5)
    S.lead(0, "r/4 G#5/12~w", part='lead2', vel=0.7, jit=1.5)
    S.strum(0, 4, 'E', 12, vel=1.0, ring=0.6)
    S.bass_line(0, "r/4 E2/12", vel=1.0, legato=1.0)
    S.drums(0, {'S': 'oxxX............', 'K': '....X...........'})
    S.hit(0, 4, 'C', 1.0)
    S.hit(0, 4, 'T3', 0.8)
    return S


def jingle_stage():
    S = Song('jingle_stage', '', 150, 0, 2, seed=4402, loop=False, tail=1.2)
    S.length, S.fade = 4.0, 0.5
    S.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
    S.mix = base_mix()
    S.chords(0, ['A B', 'E'])
    S.lead(0, "C#5/2 E5/2 A5/2 E5/2 D#5/2 F#5/2 B5/2 A5/2 | G#5/12~w r/4", vel=1.0, jit=2.0)
    S.lead(1, "E5/12~w r/4", part='lead2', vel=0.7)
    S.rhythm(0, 1, 'eighths', vel=0.85)
    S.strum(1, 0, 'E', 12, vel=1.0, ring=0.5)
    S.bass(0, 1, 'boogie', vel=0.9, start_prev=33)
    S.bass_line(1, "E2/12 r/4", vel=1.0, legato=1.0)
    S.organ_pad(0, 2, kind='far', vel=0.45, center=66)
    S.drums(0, {'K': 'x.......x.......', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.....',
                'T1': '............XX..', 'T3': '..............XX'})
    S.drums(1, {'K': 'X...............', 'S': 'X...............'})
    S.hit(1, 0, 'C', 1.0)
    return S


def jingle_gameover():
    S = Song('jingle_gameover', '', 96, 0, 2, seed=4403, loop=False, tail=1.5)
    S.length, S.fade = 4.1, 0.9
    S.lufs = -15.0
    S.tones = {'lead': 'soft', 'lead2': 'soft', 'rhy': 'rhy_soft'}
    mx = base_mix()
    mx['lead'] = dict(db=0.0, pan=0.05, eq=[('hp', 110, 2), ('peak', 2400, 1.5, 0.8), ('lp', 5000, 2)],
                      drive=1.2, spring=-10.0, room=-14.0)
    mx['rhy'] = dict(db=-4.0, pan=-0.35, eq=[('hp', 120, 2), ('lp', 5000, 2)], drive=1.1, spring=-13.0, room=-14.0)
    mx['org'] = dict(db=-8.0, pan=0.3, eq=EQ_HAM, room=-10.0, leslie=True)
    mx['bass'] = dict(db=-4.0, pan=0.0, eq=EQ_BASS, drive=1.2)
    mx['room_t60'] = 1.4
    S.mix = mx
    S.chords(0, ['E A C#m Am6', 'E'])
    S.lead(0, "B4/4w A4/4w G#4/4w F#4/4w | E4/12w r/4", vel=0.85, jit=6.0)
    # finger-picked arpeggio under the melody
    arp = [('E', (40, 52, 56)), ('A', (45, 52, 57)), ('C#m', (49, 56, 61)), ('Am6', (45, 54, 60))]
    for i, (sym, notes) in enumerate(arp):
        for j, p in enumerate(notes):
            S.add('rhy', i * 4 + j * 1.33, 4.0, kind='strum', voicing=(p,), dir='D',
                  dur=(4 - j * 1.33) * S.step, vel=0.55, mute=False, trem=False, tone='rhy_soft', ring=0.0)
    S.add('rhy', 16, 3.0, kind='strum', voicing=VOICINGS['E'], dir='D', dur=8 * S.step, vel=0.8,
          mute=False, trem=False, tone='rhy_soft', ring=0.8)
    S.organ_pad(0, 2, kind='ham_soft', vel=0.4, center=62, swell=0.15)
    S.bass_line(0, "E2/4 A1/4 C#2/4 A1/4 | E1/12 r/4", vel=0.7, legato=0.95)
    S.hit(1, 0, 'R', 0.25)
    return S


def jingle_goal():
    S = Song('jingle_goal', '', 160, 0, 5, seed=4404, loop=False, tail=1.2)
    S.length, S.fade = 7.0, 0.7
    S.tones = {'lead': 'surf', 'lead2': 'surf', 'rhy': 'rhy'}
    S.mix = base_mix()
    S.mix['org']['db'] = -6.0
    S.chords(0, ['E7', 'A', 'D E', 'A', 'A'])
    # bar 0: build -- snare roll, tremolo glissando up, strummed E7 crescendo
    S.roll(0, 0, 16, 'S', 0.12, 0.95, div=2)
    S.gliss(0, 0, 16, 52, 64, vel=0.9, ease=1.0, hold=0.0)
    S.rhythm(0, 1, 'trem16', vel=0.9)
    S.bass(0, 1, 'pedal8', vel=0.8)
    S.organ_pad(0, 1, kind='far', vel=0.5, center=64, swell=1.2)
    # bars 1-2: fanfare riff
    S.lead(1, "A4/2 C#5/2 E5/4 C#5/2 E5/2 A5/4 | F#5/2 A5/2 F#5/2 D5/2 E5/2 G#5/2 B5/4", vel=1.0, jit=2.0)
    S.harmony(1, "A4/2 C#5/2 E5/4 C#5/2 E5/2 A5/4 | F#5/2 A5/2 F#5/2 D5/2 E5/2 G#5/2 B5/4",
              mode='3rd', vel=0.55, scale=A_MAJ)
    S.rhythm(1, 2, 'eighths', vel=0.9)
    S.bass(1, 2, 'boogie', vel=0.95)
    S.organ_pad(1, 2, kind='far', vel=0.5, center=66)
    S.drums(1, {'K': 'x.......x.x.....', 'S': '....X.......X...', 'H': 'X.x.X.x.X.x.X.x.'})
    S.hit(1, 0, 'C', 1.0)
    S.drums(2, {'K': 'x.......x.......', 'S': '....X.......XX..', 'H': 'X.x.X.x.X.x.....',
                'T2': '..............X.', 'T3': '...............X'})
    # bar 3: big held A chord, tom rumble
    S.lead(3, "A5/16~w", vel=1.0)
    S.lead(3, "E5/16~w", part='lead2', vel=0.65)
    S.strum(3, 0, 'A', 16, vel=1.0, ring=0.2)
    S.bass_line(3, "A1/16", vel=1.0, legato=0.97)
    S.organ_pad(3, 1, kind='far', vel=0.6, center=66)
    S.hit(3, 0, 'C', 1.0)
    S.hit(3, 0, 'K', 1.0)
    toms = ['T1', 'T1', 'T2', 'T2', 'T3', 'T3', 'T1', 'T2', 'T3', 'T3', 'T2', 'T2', 'T3', 'T3', 'S', 'S']
    for i, k in enumerate(toms):
        S.hit(3, i, k, 0.45 + 0.5 * i / 15)
    # bar 4: final hit
    S.lead(4, "A4+C#5+A5/3. r/13", vel=1.1)
    S.strum(4, 0, 'A', 4, vel=1.1, ring=0.9)
    S.bass_line(4, "A1/4 r/12", vel=1.0, legato=1.0)
    S.organ_line(4, "A4+C#5+E5+A5/3 r/13", vel=0.7)
    S.hit(4, 0, 'K', 1.0)
    S.hit(4, 0, 'S', 1.0)
    S.hit(4, 0, 'C', 1.0)
    S.hit(4, 0, 'T3', 0.8)
    return S


SONGS = {'coastline': song_coastline, 'golden': song_golden, 'wave': song_wave,
         'twist': song_twist, 'highway': song_highway, 'riptide': song_riptide}
JINGLES = {'checkpoint': jingle_checkpoint, 'stage': jingle_stage, 'gameover': jingle_gameover,
           'goal': jingle_goal}


def _job(name):
    if name in IMPORTED_SONGS:
        info = dict(IMPORTED_SONGS[name]['song'], stems={})
        if not os.path.isfile(os.path.join(GAME, info['file'])):
            raise FileNotFoundError('Imported radio track is missing: ' + info['file'])
        return ('song', name, info)
    if name in SONGS:
        return ('song', name, build_song(SONGS[name]))
    return ('jingle', name, build_jingle(JINGLES[name]))


def write_music_json():
    songs = []
    for k in SONGS:            # radio order
        if k in IMPORTED_SONGS:
            info = IMPORTED_SONGS[k]['song']
        else:
            with open(os.path.join(WORK, 'music_%s.json' % k)) as fh:
                info = json.load(fh)
        songs.append({'file': info['file'], 'title': info['title'], 'bpm': info['bpm'],
                      'loopStart': info['loopStart'], 'loopEnd': info['loopEnd']})
    doc = {'songs': songs,
           'jingles': {k: 'assets/audio/jingle_%s.mp3' % k for k in ('checkpoint', 'stage', 'gameover', 'goal')}}
    with open(os.path.join(OUT, 'music.json'), 'w') as fh:
        json.dump(doc, fh, indent=2)
    return doc


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    names = sys.argv[1:] or list(SONGS) + list(JINGLES)
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=min(7, len(names))) as ex:
        for kind, name, info in ex.map(_job, names):
            print(kind, name, json.dumps({k: v for k, v in info.items() if k != 'stems'}))
            print('   stems LUFS:', info['stems'])
    if all(k in IMPORTED_SONGS or os.path.exists(os.path.join(WORK, 'music_%s.json' % k)) for k in SONGS):
        print(json.dumps(write_music_json(), indent=1))
    print('done in %.1fs' % (time.time() - t0))


if __name__ == '__main__':
    main()

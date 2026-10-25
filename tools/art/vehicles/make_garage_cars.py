#!/usr/bin/env python3
"""Native 88x48 garage art. Existing open PNGs are immutable inputs.

Run after make_vehicles.py / make_hero_cars.py / make_tumble.py, before pack_assets.py.
Every roof phase shares the original body pixels and a bounded, documented mask.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import make_vehicles as mv
import make_hero_cars as hg

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
C, Canvas = mv.C, mv.Canvas
VIEWS = ['straight', 'left', 'right']
STATES = ['', '_roof1', '_roof2', '_closed']
CARS = [
    ('player', 'Rosso Spider', ['#171620', '#292832', '#41414e', '#62626e']),
    ('player_yellow', 'Giallo Toro', ['#11131c', '#222630', '#343b46', '#565e6b']),
    ('player_green', 'Emerald Speedster', ['#56432b', '#9a7950', '#d5b67f', '#f7dfaf']),
    ('player_blue', 'Blue Stallion', ['#6a6471', '#a5a1ad', '#e3dedb', '#fff3df']),
    ('player_silver', 'Silver Comet', ['#171820', '#2e303d', '#484c5c', '#6b7285']),
    ('player_azure', 'Azure Coast', ['#65533e', '#aa916b', '#e1cba1', '#fff0cc']),
]


def read(name):
    cv = Canvas(88, 48)
    cv.a[:] = np.array(Image.open(OUT / (name + '.png')).convert('RGBA'))
    return cv


def new_car(key, view, frame, people=True):
    """Two individually authored bodies, sharing the original game's occupants/light palette."""
    cv = Canvas(88, 48)
    azure = key == 'player_azure'
    B = [C(h) for h in (['#103c44', '#176c70', '#209997', '#35c7bd', '#8af0df', '#d2fff0'] if azure else
                       ['#20283d', '#48546d', '#77869d', '#aabbd0', '#d8e9f4', '#f4f7ff'])]
    edge = C('#11232e') if azure else C('#141825')
    shift = -5 if view == 'left' else 5 if view == 'right' else 0
    # Fixed ground contact, with the same tyre ramp as the existing cars.
    for x in [6, 70]:
        cv.rect(x, 35, x + 11, 47, mv.K1)
        for y in range(37, 47, 2):
            cv.hl(x + 1, x + 10, y, mv.K0)
        cv.vl(x + 10, 36, 46, mv.K3)
        cv.px(x, 47, mv.CLEAR)
        cv.px(x + 11, 47, mv.CLEAR)
    cv.rect(17, 36, 70, 44, mv.K0)
    # Rounded classic fenders versus a low, broad modern GT deck.
    for y in range(14, 40):
        inset = (9 if y < 17 else 5 if y < 20 else 3 if y < 35 else 5 if y < 38 else 8) if azure else (8 if y < 17 else 5 if y < 20 else 3 if y < 37 else 5)
        s = round(shift * (23 - y) / 23) if y < 23 else 0
        cv.hl(inset + s, 87 - inset + s, y, edge)
        shade = 3 if y < 23 else 2 if y < 34 else 1
        cv.hl(inset + 1 + s, 86 - inset + s, y, B[shade])
        cv.px(85 - inset + s, y, B[min(5, shade + 1)])
    cv.xoff = lambda y: round(shift * min(1, (23 - y) / 16)) if y <= 22 else 0
    for x in [12, 72]:
        cv.vl(x, 14, 21, B[4])
        cv.vl(x + 1, 15, 21, B[5])
    cv.hl(17, 70, 20, B[4])
    cv.hl(21, 65, 21, B[3])
    cv.hl(20, 67, 22, B[1])
    cv.xoff = lambda y: shift
    # Cabin, windshield and mirrors, in the same 16-pixel-high cabin envelope.
    cv.rect(23, 7, 64, 15, mv.K1)
    cv.hl(25, 62, 1, B[4])
    for x in [23, 64]:
        cv.vl(x, 2, 8, edge)
        cv.vl(x + (1 if x == 23 else -1), 2, 7, B[3])
    for x in [8, 73]:
        cv.rect(x, 4, x + 6, 8, edge)
        cv.rect(x + 1, 4, x + 5, 6, mv.GL1)
        cv.hl(x + 2, x + 4, 4, mv.GL2)
    if people:
        mv.draw_driver(cv, 31, frame)
        mv.draw_passenger(cv, 55, frame)
    seat = hg.SEAT_WHITE if azure else dict(o=C('#321721'), d=C('#542232'), m=C('#7b3040'), l=C('#a94a57'), h=C('#db7882'))
    hg.draw_seat(cv, 23, 12, -1, seat)
    hg.draw_seat(cv, 51, 12, 1, seat)
    cv.hl(22, 65, 15, B[1])
    cv.xoff = None
    if azure:
        # Curved boot seam, round ruby lenses and chrome bumper with overriders.
        cv.hl(24, 63, 22, B[2])
        cv.vl(21, 23, 30, B[1])
        cv.vl(66, 23, 30, B[1])
        cv.hl(24, 63, 32, B[1])
        for cx in [12, 75]:
            for dy in range(-4, 5):
                for dx in range(-4, 5):
                    r = dx * dx + dy * dy
                    if r <= 17:
                        cv.px(cx + dx, 28 + dy, mv.S2 if dx + dy < 0 else mv.S0)
                    if r <= 8:
                        cv.px(cx + dx, 28 + dy, [mv.T3, mv.T2, mv.T1, mv.T0][min(3, max(0, dy + 1))])
        cv.hl(6, 81, 35, mv.S3)
        cv.hl(6, 81, 36, mv.S1)
        cv.hl(7, 80, 37, mv.S0)
        for x in [20, 65]:
            cv.rect(x, 34, x + 2, 38, mv.S1)
            cv.vl(x, 34, 37, mv.S3)
        cv.hl(38, 49, 27, mv.S2)
        cv.vl(43, 25, 29, mv.S3)
    else:
        cv.rect(6, 24, 81, 30, mv.K0)
        for x in [8, 59]:
            cv.rect(x, 25, x + 20, 28, mv.T0)
            cv.hl(x, x + 20, 25, mv.T2)
            cv.hl(x + 1, x + 19, 27, mv.T1)
        cv.hl(5, 82, 32, B[4])
        cv.hl(7, 80, 33, B[2])
        cv.rect(33, 34, 54, 37, B[0])
        cv.hl(35, 52, 34, B[1])
        cv.stamp(['..a..', '.aba.', '..a..'], {'a': mv.S2, 'b': mv.S3}, 41, 25)
    for x in [21, 64]:
        hg.round_tip(cv, x, 39)
    if view != 'straight':
        # Visible flank stripe makes the steering pose readable without changing anchors.
        x = 3 if view == 'left' else 82
        cv.vl(x, 23, 35, B[0] if view == 'left' else B[3])
    return cv


def brake_for(cv):
    brake = Canvas(88, 48)
    for i, color in enumerate([mv.T0, mv.T1, mv.T2, mv.T3]):
        mask = np.all(cv.a == color, axis=2)
        brake.a[mask] = [mv.BR0, mv.BR0, mv.BR1, mv.BR2][i]
    return brake


def roof_mask(view):
    mask = Canvas(88, 48)
    shift = -5 if view == 'left' else 5 if view == 'right' else 0
    mask.rect(16 + shift, 0, 71 + shift, 15, C('#ffffff'))
    return mask


def with_roof(base, prefix, view, frame, phase, colors, empty=False):
    cv = Canvas(88, 48)
    cv.a[:] = base.a
    shift = -5 if view == 'left' else 5 if view == 'right' else 0
    center = 43 + shift
    R = [C(h) for h in colors]
    top = [16, 10, 5, 0][phase]
    if phase == 3:
        # Remove windblown hair and windshield only in the declared cockpit mask.
        cv.a[roof_mask(view).mask()] = mv.CLEAR
    cv.poly([(center - 17, top), (center + 17, top), (center + 24, 15), (center - 24, 15)], R[0])
    cv.poly([(center - 16, top + 1), (center + 16, top + 1), (center + 22, 14), (center - 22, 14)], R[1])
    cv.hl(center - 16, center + 16, top + 1, R[3])
    cv.hl(center - 18, center + 18, 14, R[2])
    if phase >= 2:
        cv.poly([(center - 15, top + 4), (center + 15, top + 4), (center + 18, 12), (center - 18, 12)], C('#34475f'))
        cv.hl(center - 14, center + 14, top + 4, C('#7690aa'))
        if not empty:
            # Heads move a pixel in the calm cabin; hair never streams through the roof.
            for x, colors in [(center - 10 + frame, ['#383d49', '#665044', '#8d7660']),
                              (center + 10, ['#6e6959', '#ac9b65', '#cebd87'])]:
                head = ['..aa..', '.abba.', 'abccba', 'abccba', '.abba.', '..aa..']
                for yy, line in enumerate(head):
                    for xx, ch in enumerate(line):
                        if ch != '.' and top + 5 + yy <= 12:
                            cv.px(x - 3 + xx, top + 5 + yy, C(colors['abc'.index(ch)]))
                cv.hl(x - 5, x + 4, 12, C('#45536d'))
        cv.px(center + 14, top + 5, C('#c3d6e4'))
        cv.px(center + 15, top + 6, C('#7690aa'))
    if prefix == 'player_yellow':
        # This wing stands IN FRONT of the rear window. Its pixels must never change.
        cv.a[9:13] = base.a[9:13]
    if prefix == 'player_green':
        cv.a[15] = base.a[15]
    # Invariant enforced even when future roof styling is edited.
    outside = ~roof_mask(view).mask()
    cv.a[outside] = base.a[outside]
    return cv


def main():
    OUT.mkdir(exist_ok=True)
    sheet = Image.new('RGBA', (96 * 4, 64 * 6), '#262b3a')
    paint = ImageDraw.Draw(sheet)
    count = 0
    for row, (prefix, title, colors) in enumerate(CARS):
        new = prefix in ['player_silver', 'player_azure']
        for view in VIEWS:
            roof_mask(view).image().save(OUT / f'{prefix}_roof_mask_{view}.png')
            bases = [new_car(prefix, view, fr) if new else read(f'{prefix}_{view}_{fr}') for fr in [0, 1]]
            brake = brake_for(bases[0]) if new else read(f'{prefix}_brake_{view}')
            for phase, state in enumerate(STATES):
                if phase == 0 and not new:
                    continue
                for fr, base in enumerate(bases):
                    cv = with_roof(base, prefix, view, fr, phase, colors) if phase else base
                    cv.image().save(OUT / f'{prefix}{state}_{view}_{fr}.png')
                    count += 1
                brake.image().save(OUT / f'{prefix}{state}_brake_{view}.png')
        empty = new_car(prefix, 'straight', 0, False) if new else read(f'{prefix}_empty')
        for phase, state in enumerate(STATES):
            if phase or new:
                cv = with_roof(empty, prefix, 'straight', 0, phase, colors, empty=True) if phase else empty
                cv.image().save(OUT / f'{prefix}{state}_empty.png')
            cv = read(f'{prefix}{state}_straight_0')
            x, y = phase * 96 + 4, row * 64 + 15
            sheet.paste(cv.image(), (x, y), cv.image())
            paint.text((phase * 96 + 3, row * 64 + 2), [title, 'Closing 1', 'Closing 2', 'Closed'][phase], fill='#e6edf7')
    sheet.save(HERE / 'garage-weather-native.png')
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.Resampling.NEAREST).save(HERE / 'preview_garage_weather.png')
    (HERE / 'garage-weather-manifest.json').write_text(json.dumps({'frame': [88, 48], 'states': STATES, 'views': VIEWS, 'cars': [p for p, _, _ in CARS], 'mask': 'roof_mask_<view>; only rows 0..15', 'framesWritten': count}, indent=2))
    print(f'Generated {count} animated frames; original open cars retained byte for byte.')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Native 88x48 garage art. Existing open PNGs are immutable inputs.

Run after make_vehicles.py / make_hero_cars.py / make_tumble.py, before pack_assets.py.
Every roof phase shares the original body pixels and a bounded, documented mask.
"""
import json
import argparse
from contextlib import contextmanager
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import make_vehicles as mv
import make_hero_cars as hg

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
C, Canvas = mv.C, mv.Canvas
VIEWS = ['straight', 'left', 'right']
STATES = ['', '_roof1', '_roof2', '_roof3', '_roof4', '_roof5', '_roof6', '_closed']
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


# Final-frame coordinates follow the original generators' crop and steering shear.
# Legacy views narrow in a turn; Silver/Azure retain their original rigid cabin shift.
LEGACY_POSES = {'straight': (23, 64, 10, 67), 'left': (24, 59, 11, 62), 'right': (28, 63, 15, 66)}
PROFILES = {
    'player': dict(outline=[(-1,14),(-.96,10),(-.86,5),(-.72,2),(-.58,1),(.60,1),(.78,2),(.91,6),(1,11),(1,14)], window=[(-.65,6),(.65,6),(.80,12),(-.80,12)], seam=3),
    'player_yellow': dict(outline=[(-1,14),(-.95,6),(-.80,1),(.76,1),(.95,5),(1,14)], window=[(-.65,4),(.62,4),(.80,11),(-.80,11)], seam=2),
    'player_green': dict(outline=[(-1,14),(-.98,10),(-.87,5),(-.67,2),(-.43,0),(.43,0),(.67,2),(.87,5),(.98,10),(1,14)], window=[(-.54,5),(.54,5),(.72,8),(.78,12),(-.78,12),(-.72,8)], seam=3),
    'player_blue': dict(outline=[(-1,14),(-1,9),(-.91,4),(-.73,1),(-.50,0),(.56,0),(.81,2),(.96,6),(1,11),(1,14)], window=[(-.66,5),(.66,5),(.83,11),(.80,12),(-.80,12),(-.83,11)], seam=3),
    'player_silver': dict(outline=[(-1,14),(-.94,9),(-.85,4),(-.65,2),(.66,2),(.86,4),(.97,10),(1,14)], window=[(-.73,7),(.73,7),(.86,12),(-.86,12)], seam=4),
    'player_azure': dict(outline=[(-1,14),(-.97,9),(-.84,4),(-.62,1),(-.32,0),(.32,0),(.62,1),(.84,4),(.97,9),(1,14)], window=[(-.37,5),(.37,5),(.57,7),(.61,10),(.51,12),(-.51,12),(-.61,10),(-.57,7)], seam=3),
}


def geometry(prefix, view):
    if prefix in ['player_silver', 'player_azure']:
        shift = {'straight': 0, 'left': -5, 'right': 5}[view]
        return 23 + shift, 64 + shift, 8 + shift, 73 + shift
    return LEGACY_POSES[view]


@contextmanager
def without_people():
    driver, passenger = mv.draw_driver, mv.draw_passenger
    mv.draw_driver = mv.draw_passenger = lambda *args, **kwargs: None
    try:
        yield
    finally:
        mv.draw_driver, mv.draw_passenger = driver, passenger


def clean_cabin(prefix, view):
    if prefix == 'player':
        with without_people():
            return mv.draw_player(view, 0)[0]
    if prefix in ['player_yellow', 'player_green', 'player_blue']:
        return hg.draw_hero(prefix.split('_')[1], view, 0, people=False)[0]
    return new_car(prefix, view, 0, people=False)


def foreground_mask(prefix, view):
    """Body shoulders, rear cockpit rim, mirrors and wings are never roof-owned."""
    lo, hi, ml, mr = geometry(prefix, view)
    protect = np.zeros((48, 88), bool)
    protect[15:] = True
    protect[9:15, :lo] = True
    protect[9:15, hi+1:] = True
    if prefix in ['player_silver', 'player_azure']:
        for x in [ml, mr]:
            protect[4:9, x:x+7] = True
    else:
        protect[3:8, ml:ml+8] = True
        protect[6:8, ml+8:ml+11] = True
        protect[3:8, mr+3:mr+11] = True
        # The passenger's open-roof hair overlaps the inner end of this stem.
        # Those three human pixels are replaceable; closing reveals the clean stem below.
        protect[6, mr+1:mr+3] = True
        protect[7, mr+2] = True
    if prefix == 'player_yellow':
        x0, x1 = {'straight': (8,79), 'left': (10,75), 'right': (12,77)}[view]
        protect[9:13, x0:x1+1] = True
    return protect


def roof_mask(prefix, view, base, clean):
    lo, hi, *_ = geometry(prefix, view)
    allowed = np.any(base.a != clean.a, axis=2)
    allowed[:15, max(0,lo-3):min(88,hi+4)] = True
    allowed &= ~foreground_mask(prefix, view)
    mask = Canvas(88,48)
    mask.a[allowed] = C('#ffffff')
    return mask


def canopy(prefix, view, phase, frame, colors, empty):
    """Authored folded bows (1..3), unfolding sheet (4..6), tensioned cloth (7)."""
    lo, hi, *_ = geometry(prefix, view)
    center = (lo + hi) / 2
    half = (hi - lo) / 2
    profile = PROFILES[prefix]
    layer = Image.new('RGBA', (88,48))
    draw = ImageDraw.Draw(layer)
    dark, mid, light, highlight = [C(c) for c in colors]
    X = lambda t: int(round(center + t * half))
    if phase <= 3:
        # The rear bow lifts and the doubled fabric opens around its hinge.
        folds = {
            1: [(-.80,14),(-.63,12),(.60,12),(.83,14)],
            2: [(-.88,14),(-.64,8),(-.48,8),(-.25,11),(.22,11),(.49,8),(.67,8),(.89,14)],
            3: [(-.94,14),(-.77,5),(-.51,3),(.50,3),(.78,6),(.94,14),(.52,10),(-.53,10)],
        }[phase]
        pts = [(X(x),y) for x,y in folds]
        draw.polygon(pts, fill=dark)
        draw.line(pts+[pts[0]], fill=light, width=1)
        if phase == 1:
            draw.line([(X(-.65),13),(X(.65),13)],fill=highlight)
        elif phase == 2:
            draw.line([(X(-.64),9),(X(-.25),12),(X(.22),12),(X(.65),9)],fill=highlight)
            draw.line([(X(-.70),12),(X(.72),12)],fill=mid)
        else:
            draw.line([(X(-.51),4),(X(.50),4),(X(.72),7)],fill=highlight)
            draw.line([(X(-.72),7),(X(-.38),10),(X(.40),10),(X(.73),8)],fill=mid)
        return np.array(layer)

    spread = {4:.73,5:.89,6:.97,7:1.0}[phase]
    Y = lambda y: int(round(14 - (14-y)*spread))
    pts = [(X(x),Y(y)) for x,y in profile['outline']]
    draw.polygon(pts,fill=dark)
    inner = [(int(round(center+(x-center)*.94)),min(14,y+1)) for x,y in pts]
    draw.polygon(inner,fill=mid)
    # A softly lit top surface and two stitched seams give cloth volume without a box edge.
    top = min(y for _,y in pts)
    draw.line([(X(-.56),top+1),(X(.55),top+1),(X(.76),top+2)],fill=light)
    draw.line([(X(-.82),Y(6)),(X(-.92),13)],fill=dark)
    draw.line([(X(.83),Y(6)),(X(.93),13)],fill=light)
    if phase < 7:
        # A diagonal fold straightens as the front rail reaches the windshield.
        draw.line([(X(-.60),top+2),(X(-.18),top+3),(X(.58),top+2)],fill=highlight)
    else:
        draw.point((X(.47),top+1),fill=highlight)
    window_pts = [(X(x),Y(y)) for x,y in profile['window']]
    window = Image.new('1',(88,48))
    ImageDraw.Draw(window).polygon(window_pts,fill=1)
    glass = Image.new('RGBA',(88,48))
    gd = ImageDraw.Draw(glass)
    wy = min(y for _,y in window_pts)
    for y in range(wy,14):
        gd.line([(lo,y),(hi,y)], fill=('#3f5668' if y==wy else '#2e4053' if y<wy+3 else '#263548'))
    if not empty:
        # Back-of-head silhouettes, tinted through glass, stay within the rear window.
        head_y = max(wy+1, Y(7))
        for i, hx in enumerate([X(-.43)+(frame if phase>=5 else 0), X(.43)]):
            hair = '#655045' if i==0 else '#b6a16b'
            shade = '#423f42' if i==0 else '#80734e'
            gd.polygon([(hx-2,head_y),(hx+1,head_y),(hx+2,head_y+1),(hx+2,head_y+3),(hx,head_y+4),(hx-2,head_y+3)],fill=shade)
            gd.line([(hx-1,head_y),(hx+1,head_y),(hx+1,head_y+2)],fill=hair,width=1)
            gd.line([(hx-4,head_y+5),(hx+4,head_y+5)],fill='#40506a' if i==0 else '#71654d')
    gd.line([(X(.53),wy+1),(X(.66),wy+3)],fill='#6e8599')
    layer.paste(glass,(0,0),window)
    draw = ImageDraw.Draw(layer)
    draw.line(window_pts+[window_pts[0]],fill=dark,width=1)
    if prefix=='player_azure':
        draw.line([(X(-.48),Y(13)),(X(.48),Y(13))],fill=C('#c8c8ba'))
    # Sealed rear edge, only one pixel deep, seated directly on the original cockpit rim.
    draw.line([(X(-.9),14),(X(.9),14)],fill=dark)
    return np.array(layer)


def with_roof(base, prefix, view, frame, phase, colors, empty=False):
    clean = clean_cabin(prefix, view)
    cv = Canvas(88,48)
    cv.a[:] = base.a if phase <= 3 else clean.a
    if phase >= 4:
        # The open car's windshield belongs to the replaceable cabin, not the body.
        # Remove its exact ink strokes so they cannot stick out around the canvas.
        lo, hi, *_ = geometry(prefix,view)
        cv.hl(lo+2 if prefix in ['player_silver','player_azure'] else lo+3,
              hi-2 if prefix in ['player_silver','player_azure'] else hi-3, 1, mv.CLEAR)
        if prefix in ['player_silver','player_azure']:
            for x in [lo,hi]:
                cv.vl(x,2,8,mv.CLEAR)
                cv.vl(x+(1 if x==lo else -1),2,7,mv.CLEAR)
        else:
            cv.hl(lo+4,hi-4,2,mv.CLEAR)
            center=(lo+hi)//2
            cv.hl(center-3,center+4,3,mv.CLEAR)
            cv.hl(center-2,center+3,4,mv.CLEAR)
            for i in range(7):
                y=7-i;d=(i+1)//2
                for x,side in [(lo-1+d,-1),(hi+1-d,1)]:
                    cv.px(x,y,mv.CLEAR);cv.px(x-side,y,mv.CLEAR)
    layer = canopy(prefix,view,phase,frame,colors,empty)
    cv.a[layer[:,:,3]>0] = layer[layer[:,:,3]>0]
    allowed = roof_mask(prefix,view,base,clean).mask()
    cv.a[~allowed] = base.a[~allowed]
    # Foreground is restored by exact source pixels, including transparent exterior gaps.
    foreground = foreground_mask(prefix,view)
    cv.a[foreground] = base.a[foreground]
    return cv


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--cars',nargs='+',choices=[p for p,_,_ in CARS])
    args=parser.parse_args()
    selected=[c for c in CARS if not args.cars or c[0] in args.cars]
    sheet=Image.new('RGBA',(96*8,64*len(selected)),'#262b3a')
    paint=ImageDraw.Draw(sheet)
    count=0
    for row,(prefix,title,colors) in enumerate(selected):
        for view in VIEWS:
            bases=[read(f'{prefix}_{view}_{fr}') for fr in [0,1]]
            clean=clean_cabin(prefix,view)
            mask=roof_mask(prefix,view,bases[0],clean)
            mask.a[roof_mask(prefix,view,bases[1],clean).mask()]=C('#ffffff')
            mask.image().save(OUT/f'{prefix}_roof_mask_{view}.png')
            brake=read(f'{prefix}_brake_{view}')
            for phase,state in enumerate(STATES[1:],1):
                for fr,base in enumerate(bases):
                    with_roof(base,prefix,view,fr,phase,colors).image().save(OUT/f'{prefix}{state}_{view}_{fr}.png')
                    count+=1
                brake.image().save(OUT/f'{prefix}{state}_brake_{view}.png')
        empty=read(f'{prefix}_empty')
        for phase,state in enumerate(STATES):
            if phase:
                with_roof(empty,prefix,'straight',0,phase,colors,empty=True).image().save(OUT/f'{prefix}{state}_empty.png')
            cv=read(f'{prefix}{state}_straight_0')
            x,y=phase*96+4,row*64+15
            sheet.paste(cv.image(),(x,y),cv.image())
            paint.text((phase*96+3,row*64+2),title if not phase else 'Closed' if phase==7 else f'Fold {phase}',fill='#e6edf7')
    name='garage-weather' if not args.cars else 'garage-reference'
    sheet.save(HERE/(name+'-native.png'))
    sheet.resize((sheet.width*3,sheet.height*3),Image.Resampling.NEAREST).save(HERE/('preview_'+name.replace('-','_')+'.png'))
    if not args.cars:
        (HERE/'garage-weather-manifest.json').write_text(json.dumps({'frame':[88,48],'states':STATES,'views':VIEWS,'cars':[p for p,_,_ in CARS],'mask':'semantic cabin with protected foreground; independent test fixtures','framesWritten':count,'duration':.65},indent=2))
    print(f'Generated {count} occupied frames; all 60 open input PNGs retained byte for byte.')


if __name__=='__main__':
    main()

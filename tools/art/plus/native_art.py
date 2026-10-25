"""Native Plus drawing sources. Classic shapes define scale and material masks only.

New one-pixel seams, lens grids, brick courses, leaves and clouds are authored
on the doubled grid. No blur, interpolation, external art or simulation RNG.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
CAR = re.compile(r'^(player|coupe|sports|beetle|pickup|van|truck|bus)(_|$)')
PILOT = re.compile(r'^(player_(?!(yellow|green|blue|silver|azure)_).*|palm_|bush_|cove_|rock_|grass_|umbrella_|house|gate(?:_|$)|fork_sign|sign_|coupe_|sports_|beetle_|pickup_|van_|truck_|bus|crowd|sea_stack|stone_pine|crash_)')


def scaffold(source):
    return source.resize((source.width*2, source.height*2), Image.Resampling.NEAREST)


def palette(source):
    a=np.array(source)
    return [tuple(map(int,p)) for p in np.unique(a[a[:,:,3]>0],axis=0)]


def clip_layer(base, layer, mask=None):
    a=np.array(base);b=np.array(layer)
    allowed=(a[:,:,3]>0)&(b[:,:,3]>0)
    if mask is not None: allowed &= mask
    a[allowed]=b[allowed]
    return Image.fromarray(a)


def material_edges(source):
    """One native-pixel lit bevel on existing material borders, using its palette."""
    a=np.array(scaffold(source));old=np.array(source)
    pal=palette(source)
    if not pal:return Image.fromarray(a)
    cache={}
    for y in range(1,source.height):
        for x in range(1,source.width-1):
            p=old[y,x]
            if not p[3] or not old[y-1,x,3] or np.array_equal(p,old[y-1,x]):continue
            key=tuple(map(int,p))
            if key not in cache:
                target=np.minimum(255,p[:3].astype(int)+[17,16,10])
                candidates=[q for q in pal if sum(q[:3])>sum(key[:3])+12]
                cache[key]=min(candidates,key=lambda q:sum((int(q[k])-int(target[k]))**2 for k in range(3))) if candidates else key
            a[y*2,x*2+1]=cache[key]
    return Image.fromarray(a)


def vehicle(name,source):
    base=material_edges(source)
    if 'roof_mask' in name:return base
    if '_brake_' in name:
        layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
        for y in range(1,base.height,3):d.line((0,y,base.width-1,y),fill='#ffe5af')
        return clip_layer(base,layer)
    a=np.array(base);w,h=base.size
    layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
    # Rear deck, trim, vents, tail-lamp prisms and tyre tread share one body
    # coordinate system across every frame and roof position.
    if source.size==(88,48):
        dark='#171723';steel='#a0a8ba';shine='#eef1dd'
        for x0,x1 in [(13,48),(127,162)]:
            for y in [53,57,61]:
                d.line((x0,y,x1,y),fill='#f35d53')
                for x in range(x0+3,x1,7):d.line((x,y-1,x,y+1),fill='#8b1d32')
        for y in [52,56,60]:d.line((54,y,121,y),fill=dark)
        d.line((55,53,120,53),fill='#5e525f')
        d.line((32,45,143,45),fill='#ffb0a0')
        d.line((36,47,139,47),fill='#8b1d32')
        for x in [38,129]:
            d.ellipse((x,80,x+8,86),fill=steel,outline=dark)
            d.ellipse((x+2,81,x+6,84),fill=dark)
            d.point((x+2,80),fill=shine)
        for x0 in [10,140]:
            for y in range(79,94,4):
                d.line((x0,y,x0+21,y),fill='#33303d')
                for x in range(x0+3,x0+20,6):d.line((x,y,x-2,y+2),fill=dark)
        # Do not paint red-car lenses over the distinct reward-car bodywork.
        body_mask=np.zeros((h,w),bool);body_mask[44:]=True
        if not re.match(r'^player_(yellow|green|blue|silver|azure)_',name):
            base=clip_layer(base,layer,body_mask)
        else:
            # Their source lens/body ramps remain intact; add neutral fine trim.
            trim=Image.new('RGBA',base.size);td=ImageDraw.Draw(trim)
            for y in [67,71]:td.line((24,y,151,y),fill='#22202d')
            for x in [42,130]:td.ellipse((x,80,x+7,85),outline=steel,width=1)
            base=clip_layer(base,trim,body_mask)
        # Native stitching and folds are limited to the existing cabin mask.
        phase=7 if '_closed_' in name else int(re.search(r'_roof(\d)',name)[1]) if '_roof' in name else 0
        cabin=Image.new('RGBA',base.size);cd=ImageDraw.Draw(cabin)
        if phase>=3:
            lo=round(w*.27);hi=round(w*.73)
            for x in [lo+3,hi-3]:cd.line((x,8+phase,x-2,26),fill='#777580')
            cd.line((lo+8,10+phase,hi-8,10+phase),fill='#a19a9d')
        elif '_empty' not in name:
            # One-pixel hair strands and shirt collars, attached to each seat.
            shift=-8 if '_left_' in name else 8 if '_right_' in name else 0
            for x,color in [(62+shift,'#bb844c'),(110+shift,'#fff28c')]:
                cd.line((x-3,7,x+2,6,x+5,9),fill=color,width=1)
                cd.point((x+5,11),fill=color)
        mask=np.zeros((h,w),bool);mask[:32]=True
        base=clip_layer(base,cabin,mask)
    else:
        # Traffic: narrow panel seams and window reflection, never a new silhouette.
        for y in [int(h*.48),int(h*.72)]:d.line((w*.18,y,w*.82,y),fill='#302936')
        for x in [int(w*.29),int(w*.67)]:d.line((x,h*.12,x+w*.04,h*.27),fill='#c5d8de')
        base=clip_layer(base,layer)
    return base


def palm(name,source):
    w,h=source.width*2,source.height*2
    im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im)
    seed=ord(name[-1]);cx=w*.51;cy=h*.24
    lean=((seed%5)-2)*w*.025
    if name=='palm_d':lean=w*.15;cy=h*.3
    if name=='palm_e':cy=h*.38
    if name=='palm_g':cy=h*.18
    # Curved trunk, four warm material ramps, horizontal leaf scars.
    trunk=[(cx+lean*(1-t)**2,cy+(h-cy-2)*t) for t in np.linspace(0,1,70)]
    d.line(trunk,fill='#49372e',width=max(4,w//14))
    d.line([(x+2,y)for x,y in trunk],fill='#967044',width=max(2,w//30))
    d.line([(x+4,y)for x,y in trunk],fill='#c29b62',width=max(1,w//60))
    for i in range(8,67,4):
        x,y=trunk[i];d.line((x-3,y,x+4,y+2),fill='#60472e')
    # Eleven independent arching fronds with native leaflets and a lit spine.
    crown=(cx+lean,cy)
    for i,angle in enumerate(np.linspace(-math.pi*.98,-math.pi*.02,13)):
        length=w*(.36+(i%3)*.055)
        end=(crown[0]+math.cos(angle)*length,crown[1]+math.sin(angle)*h*.12+h*.16)
        pts=[]
        for j in range(20):
            t=j/19;x=crown[0]+(end[0]-crown[0])*t;y=crown[1]+(end[1]-crown[1])*t-math.sin(t*math.pi)*h*.11
            pts.append((x,y))
            if j in range(3,19):
                spread=(1-t)*w*.11+3
                side=math.copysign(1,end[0]-crown[0])
                d.polygon([(x,y-1),(x-side*spread,y+spread*.7),(x-side*spread*.3,y+2)],fill=['#174e32','#367333','#5b943a'][i%3])
                d.polygon([(x,y),(x+side*spread*.7,y+spread),(x+side*2,y+3)],fill='#397d35')
                d.line((x,y,x-side*spread*.75,y+spread*.5),fill='#8bb548',width=1)
        d.line(pts,fill='#8bb548' if i%2 else '#588f35',width=1)
    d.ellipse((crown[0]-4,cy-3,crown[0]+4,cy+6),fill='#6d6332')
    if name=='palm_h':
        for j in range(-6,7):d.line((crown[0]+j,cy+4,crown[0]+j*1.8,cy+18-abs(j)),fill='#8e7741',width=2)
    # Ragged grass contact; bottom-centre stays the ground anchor.
    for j in range(-5,6):d.line((cx+j,h-1,cx+j*2,h-3-abs(j)%4),fill='#4f7535')
    if name=='palm_f':
        second=palm('palm_e',source).resize((round(w*.58),round(h*.72)),Image.Resampling.NEAREST)
        im.alpha_composite(second,(round(w*.35),h-second.height))
    return im


def scenery(name,source):
    base=material_edges(source);w,h=base.size
    layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
    a=np.array(base);r,g,b=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    if re.search(r'villa|house|cottage|cube|row|chapel|village|saloon|cabin|winery|shack|store|gas|night_',name):
        # Tile seams and masonry courses follow the existing facade masks.
        roof=(r>g*1.2)&(g>b*1.1)&(a[:,:,3]>0)
        stone=(abs(r-g)<35)&(r>b)&(r>115)&(a[:,:,3]>0)
        for y in range(8,h,7):
            for x in range(2+(y//7%2)*5,w,11):
                d.line((x,y,x+8,y),fill='#d1b795');d.line((x,y,x,y+5),fill='#8c795e')
        base=clip_layer(base,layer,stone)
        layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
        for x in range(3,w,6):d.line((x,0,x+int(h*.16),h*.65),fill='#eda56d')
        base=clip_layer(base,layer,roof)
    elif re.search(r'bush|grass|tuft|tree|pine|cypress|olive|redwood|fern|vines|birch|reeds',name):
        green=(g>r*1.12)&(g>b*1.06)&(a[:,:,3]>0)
        for y in range(3,h,9):
            for x in range((y//9%2)*8,w,17):
                d.line((x,y+3,x+3,y,x+6,y+1),fill='#91ad52',width=1)
                d.line((x+2,y+4,x+5,y+2),fill='#427739',width=1)
        base=clip_layer(base,layer,green)
    elif re.search(r'rock|wall|mesa|stone|bluff|crystal|ice|sea_stack',name):
        for y in range(5,h,11):
            for x in range((y//11%2)*13,w,29):
                d.line((x,y,x+11,y-2,x+18,y+1),fill='#b8ab8d')
                d.line((x+7,y+2,x+9,y+6),fill='#756658')
        base=clip_layer(base,layer)
    elif re.search(r'^gate|gantry',name):
        for x in [8,w-15]:
            for y in range(10,h-8,14):
                d.line((x,y,x+6,y+7,x,y+14),fill='#a9bccd',width=1)
        base=clip_layer(base,layer)
    return base


def people(name,source):
    base=material_edges(source);w,h=base.size
    layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
    # Seams follow existing cloth and hair colours; keep the established poses.
    a=np.array(base);r,g,b=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    cloth=(b>r*1.3)&(b>g*1.1)&(a[:,:,3]>0)
    for x in range(5,w,9):d.line((x,h*.28,x+2,h*.7),fill='#6595ca')
    base=clip_layer(base,layer,cloth)
    layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
    hair=(r>g)&(g>b*1.4)&(a[:,:,3]>0)
    for x in range(3,w,7):d.line((x,0,x+2,h*.42),fill='#e8bd69')
    return clip_layer(base,layer,hair)


def background(name,source):
    """Keep each stage's composition, redraw material accents on its native grid."""
    base=material_edges(source);w,h=base.size
    layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
    a=np.array(base);r,g,b=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    if name.startswith('far_'):
        green=(g>r*1.08)&(g>b*1.03)&(a[:,:,3]>0)
        for x in range(9,w,37):
            y=int(h*.56+math.sin(x*.017)*h*.23)
            d.polygon([(x,y-8),(x-3,y+3),(x+4,y+3)],fill='#587968')
            d.line((x,y-7,x+2,y+1),fill='#91a281')
        base=clip_layer(base,layer,green)
        layer=Image.new('RGBA',base.size);d=ImageDraw.Draw(layer)
        rock=(r>g*1.14)&(r>b*1.1)&(a[:,:,3]>0)
        for y in range(8,h,13):
            for x in range((y//13%2)*19,w,53):
                d.line((x,y,x+16,y-2,x+28,y+1),fill='#c59278')
        base=clip_layer(base,layer,rock)
    elif name.startswith('ending_bg'):
        # Plaza paving, native masonry and restrained reflections stay behind
        # the same barrier and character positions in every finale.
        pavement=(a[:,:,3]>0)&(np.indices(a.shape[:2])[0]>h*.81)
        for y in range(int(h*.83),h,11):
            for x in range((y//11%2)*13,w,29):d.line((x,y,x+24,y),fill='#554358')
        base=clip_layer(base,layer,pavement)
    elif name=='course_map':
        for y in range(11,h,21):
            for x in range((y//21%2)*9,w,39):d.line((x,y,x+5,y-1),fill='#889d57')
        green=(g>r*1.05)&(g>b*1.04)&(a[:,:,3]>0)
        base=clip_layer(base,layer,green)
    else:
        # Stars are native one-pixel points rather than doubled square blocks.
        dark=(r+g+b<250)&(a[:,:,3]>0)
        for x in range(17,w,53):
            y=7+((x*37)%max(1,int(h*.52)))
            d.point((x,y),fill='#9ea8bc')
        base=clip_layer(base,layer,dark)
    return base


def palm_backdrops():
    sky=Image.new('RGBA',(1280,160));d=ImageDraw.Draw(sky)
    colors=['#1c65cb','#287cdf','#3e92e7','#67afea','#92c5ec','#bbdaed','#e3e8d4']
    ramps=[tuple(int(c[j:j+2],16)for j in (1,3,5))for c in colors]
    shades=[]
    for i in range(22):
        t=i/21*6;k=min(5,int(t));u=t-k
        shades.append(tuple(round(ramps[k][j]*(1-u)+ramps[k+1][j]*u)for j in range(3))+(255,))
    a=np.zeros((160,1280,4),np.uint8)
    for y in range(160):
        for x in range(1280):
            # Slowly wandering palette boundaries avoid ruler-straight sky bands.
            k=max(0,min(21,int(y/160*22+math.sin(x*math.pi/320)*.5+math.sin(x*math.pi/160)*.15)))
            a[y,x]=shades[k]
    sky=Image.fromarray(a);d=ImageDraw.Draw(sky)
    sunx=(235+160)*2
    for rad,col in [(31,'#afdcdf'),(26,'#e8eac0'),(22,'#fff0ae'),(17,'#fff8cf')]:d.ellipse((sunx-rad,45-rad,sunx+rad,45+rad),fill=col)
    # Flat-bottomed cloud banks, stepped lobes and a cool lower rim.
    for x,y,size in [(445,65,1.9),(625,85,.65),(990,43,.8),(110,95,.6)]:
        for dx,dy,rx,ry in [(0,0,35,8),(-20,-6,17,10),(5,-13,18,15),(28,-7,16,11)]:
            d.ellipse((x+(dx-rx)*size,y+(dy-ry)*size,x+(dx+rx)*size,y+(dy+ry)*size),fill='#f4fbeb')
        d.rectangle((x-44*size,y+3*size,x+45*size,y+8*size),fill='#d2e7e8')
        d.line((x-42*size,y+3*size,x+44*size,y+3*size),fill='#ffffff')
    far=Image.new('RGBA',(1280,112));f=ImageDraw.Draw(far)
    for index,(x,top,color) in enumerate([(555,5,'#a0bdba'),(440,17,'#7baba1'),(330,30,'#5a9876')]):
        points=[(0,112),(0,52),(x-280,48),(x-230,36),(x-174,42),(x-115,top+12),(x-65,top+6),(x-35,top),(x,top+7),(x+28,top+4),(x+63,top+20),(x+95,top+29),(x+137,top+35),(x+176,top+52),(x+220,top+58),(x+280,top+72),(x+350,112)]
        f.polygon(points,fill=color)
        for j in range(4):
            y=top+25+j*13
            f.line((x-130+j*14,y,x-58+j*16,y-6,x+12+j*28,y+8),fill=['#b1c9b5','#96b89a','#78a677'][index],width=3)
    # Small village on the middle shelf, with connected roofs and terrace base.
    f.line((430,90,518,90),fill='#c4c69e',width=3)
    for j in range(8):
        x=434+j*10;y=83-(j%3)*4
        f.rectangle((x,y,x+8,89),fill='#e4e5c6');f.polygon([(x-1,y),(x+4,y-4),(x+10,y)],fill='#b57554')
        f.rectangle((x+3,y+2,x+4,y+4),fill='#577674')
    return {'sky_s1':sky,'far_s1':far}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--all',action='store_true');args=parser.parse_args()
    OUT.mkdir(exist_ok=True,parents=True)
    atlas=json.loads((ROOT/'assets/sprites/atlas.json').read_text())['frames']
    sheet=Image.open(ROOT/'assets/sprites/atlas.png').convert('RGBA')
    catalog={};inventory={};body_cache={}
    protected=json.loads((ROOT/'tools/qa/fixtures/garage-roof-protected.json').read_text())['cars']
    for name,f in atlas.items():
        motif=re.sub(r'_(?:roof[1-6]|closed|straight|left|right|brake|empty|[01])(?=_|$)','',name)
        inventory[name]={'motif':motif,'classicSize':[f['w'],f['h']],'states':re.findall(r'roof[1-6]|closed|straight|left|right|brake|empty|[01]$',name)}
        if name.startswith(('icon_','wx_')) or (not args.all and not PILOT.match(name)):continue
        source=sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
        category='vehicle' if CAR.match(name) else 'palm' if name.startswith('palm_') else 'people' if name.startswith(('cheer_','crash_')) else 'scenery'
        result=vehicle(name,source) if category=='vehicle' else palm(name,source) if category=='palm' else people(name,source) if category=='people' else scenery(name,source)
        pose=re.match(r'^(player(?:_(?:yellow|green|blue|silver|azure))?)_(?:(roof[1-6]|closed)_)?(?:(straight|left|right)_([01])|(empty))$',name)
        if pose and pose[2]:
            prefix,_,view,frame,empty=pose.groups();view=view or 'straight'
            key=f'{prefix}_empty' if empty else f'{prefix}_{view}_{frame}'
            if key not in body_cache:
                f0=atlas[key];original=sheet.crop((f0['x'],f0['y'],f0['x']+f0['w'],f0['y']+f0['h']))
                body_cache[key]=vehicle(key,original)
            for x0,y0,x1,y1 in protected[prefix][view]:
                box=(x0*2,y0*2,(x1+1)*2,(y1+1)*2)
                result.paste(body_cache[key].crop(box),box[:2])
        result.save(OUT/(name+'.png'))
        catalog[name]={'file':name+'.png','density':2,'anchor':'bottom-center','category':category,'emissive':f.get('emissive',False)}
    images={}
    for name,im in palm_backdrops().items():
        im.save(OUT/(name+'.png'));images[name]={'file':name+'.png','density':2,'opaque':name.startswith('sky')}
    if args.all:
        for file in sorted((ROOT/'assets/bg').glob('*.png')):
            name=file.stem.replace('ending','ending_bg') if file.stem.startswith('ending') else file.stem
            if name in images:continue
            result=background(name,Image.open(file).convert('RGBA'))
            result.save(OUT/(name+'.png'));images[name]={'file':name+'.png','density':2,'opaque':not name.startswith('far_')}
    (HERE/'catalog.json').write_text(json.dumps({'sprites':catalog,'images':images,'scope':'all' if args.all else 'pilot'},indent=2))
    (HERE/'inventory.json').write_text(json.dumps({'classicAtlasSha256':hashlib.sha256((ROOT/'assets/sprites/atlas.png').read_bytes()).hexdigest(),'sprites':inventory},indent=2))
    print(f'Authored {len(catalog)} native sprites; {len(images)} backgrounds; inventory {len(inventory)} frames / {len(set(f["motif"] for f in inventory.values()))} motifs.')


if __name__=='__main__':main()

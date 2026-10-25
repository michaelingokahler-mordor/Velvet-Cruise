"""Pack authored native Plus sources only; never writes Classic or source art."""
from pathlib import Path
import argparse
import json
import shutil
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'tools/art/plus'
TARGET=ROOT/'assets/plus'
PAGE=2048


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--release',action='store_true');args=parser.parse_args()
    catalog=json.loads((SOURCE/'catalog.json').read_text())
    classic=json.loads((ROOT/'assets/sprites/atlas.json').read_text())['frames']
    reuse=[name for name in classic if name not in catalog['sprites']]
    if args.release and (catalog['scope']!='all' or any(not n.startswith(('icon_','wx_')) for n in reuse)):
        raise ValueError('Release needs complete native sources')
    expected_images={p.stem.replace('ending','ending_bg') if p.stem.startswith('ending') else p.stem for p in (ROOT/'assets/bg').glob('*.png')}
    if args.release and set(catalog['images'])!=expected_images:raise ValueError('Release needs every stage and finale background')
    TARGET.mkdir(exist_ok=True,parents=True)
    entries=[]
    for name,entry in catalog['sprites'].items():
        im=Image.open(SOURCE/'out'/entry['file']).convert('RGBA')
        if im.size!=(classic[name]['w']*2,classic[name]['h']*2):raise ValueError(name+' size')
        entries.append((name,entry,im))
    entries.sort(key=lambda row:(-row[2].height,-row[2].width,row[0]))
    pages=[];canvas=Image.new('RGBA',(PAGE,PAGE));frames={};x=y=shelf=0
    def save():
        if not frames:return
        n=len(pages);stem=f'atlas-{n}'
        height=min(PAGE,2**max(1,(y+shelf-1).bit_length()))
        canvas.crop((0,0,PAGE,height)).save(TARGET/(stem+'.png'),optimize=True)
        (TARGET/(stem+'.json')).write_text(json.dumps({'frames':frames},separators=(',',':')))
        pages.append({'image':stem+'.png','data':stem+'.json'})
    for name,entry,im in entries:
        if im.width>PAGE or im.height>PAGE:raise ValueError(name+' exceeds page')
        if x+im.width>PAGE:x=0;y+=shelf+2;shelf=0
        if y+im.height>PAGE:
            save();canvas=Image.new('RGBA',(PAGE,PAGE));frames={};x=y=shelf=0
        canvas.paste(im,(x,y));frames[name]={'x':x,'y':y,'w':im.width,'h':im.height,'density':2,'anchor':'bottom-center','emissive':entry['emissive']}
        x+=im.width+2;shelf=max(shelf,im.height)
    save()
    images={}
    for name,entry in catalog['images'].items():
        shutil.copyfile(SOURCE/'out'/entry['file'],TARGET/entry['file']);images[name]=entry
    backgrounds=[]
    for file in sorted((ROOT/'assets/bg').glob('*.png')):
        name=file.stem.replace('ending','ending_bg') if file.stem.startswith('ending') else file.stem
        backgrounds.append(name)
    manifest={'version':1,'complete':args.release,'artVersion':'native-1','atlases':pages,'images':images,'reuse':reuse+[n for n in backgrounds if n not in images],'requiredSprites':sorted(classic)}
    (TARGET/'manifest.json').write_text(json.dumps(manifest,indent=2))
    print(f'Packed {len(entries)} native sprites into {len(pages)} pages; {len(images)} backgrounds. complete={args.release}')


if __name__=='__main__':main()

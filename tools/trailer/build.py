"""Edit current-engine stage captures into 1080x1920 Shorts and a landscape showcase.
Requires ffmpeg/ffprobe, Pillow, and cinematic/runway.mp4 from the recorded Runway task.
Run after capture.mjs, from the repository root. No runtime game files are changed.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, sys, os

ROOT=Path.cwd()
OUT=Path(os.environ.get('VELVET_CAPTURE_DIR',ROOT/'output/trailer/2026-10-24')).resolve()
INTRO_SECONDS=3
OUTRO_SECONDS=6
SHOWCASE_SECONDS=INTRO_SECONDS+15*5+OUTRO_SECONDS
FONT=Path('C:/Windows/Fonts/arial.ttf')
BOLD=Path('C:/Windows/Fonts/arialbd.ttf')
INK='#0b1428'; CREAM='#fff1d8'; CORAL='#ff8775'; CYAN='#79dddc'

def run(args):
    subprocess.run([str(x) for x in args],check=True,stdout=subprocess.DEVNULL)

def ff(*args):
    run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args])

def font(size,bold=False):return ImageFont.truetype(str(BOLD if bold else FONT),size)

def center(d,text,y,size=40,fill=CREAM,bold=False,w=1080):
    f=font(size,bold)
    while d.textlength(text,font=f)>w-100:
        size-=1;f=font(size,bold)
    d.text((w/2,y),text,font=f,fill=fill,anchor='mt')

def base(size):
    w,h=size;im=Image.new('RGB',size,INK);d=ImageDraw.Draw(im)
    for y in range(h):
        a=y/h;d.line((0,y,w,y),fill=(int(11+13*a),int(20+8*a),int(40+14*a)))
    for x in range(-w,w*2,140):d.line((w/2,h*.7,x,h),fill='#26334a',width=2)
    return im

def overlay(stage,index):
    im=base((1080,1920)).convert('RGBA');d=ImageDraw.Draw(im)
    d.line((64,166,1016,166),fill=CORAL,width=4)
    center(d,'SABNOCK WORKS',112,30,CYAN,True)
    center(d,'VELVET',218,118,CREAM,True)
    center(d,'CRUISE',337,118,CORAL,True)
    center(d,stage['name'].upper(),498,58,CREAM,True)
    d.rounded_rectangle((57,605,1023,1155),radius=6,fill=CYAN)
    # The transparent aperture is EXACTLY 3x the game's native 320x180 frame.
    d.rectangle((60,610,1019,1149),fill=(0,0,0,0))
    center(d,f"STAGE {index:02d} / 15   •   FULL DRIVE",1198,35,CYAN,True)
    center(d,'CURRENT DEVELOPMENT BUILD',1273,34,CREAM,True)
    center(d,'Updated visuals. Refined driving physics.',1326,32,CREAM)
    center(d,'sabnockworks.com',1442,44,CORAL,True)
    center(d,'PLAY THE EARLIER WEB DEMO ON TESANA',1530,28,CYAN,True)
    center(d,'velvet-cruise-demo.tesana.com',1583,36,CREAM,True)
    center(d,'The demo shows an older development build.',1643,28,CREAM)
    p=OUT/'qa'/f"overlay-{stage['id']}.png";im.save(p);return p

def card(kind,landscape=False):
    w,h=(1920,1080) if landscape else (1080,1920)
    im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im)
    if kind=='intro':
        d.rectangle((0,h*.05,w,h*.38),fill=(7,13,27,172))
        center(d,'SABNOCK WORKS',h*.075,34,CYAN,True,w)
        center(d,'VELVET CRUISE',h*.15,90 if landscape else 75,CREAM,True,w)
        center(d,'CHASE THE HORIZON',h*.27,38,CORAL,True,w)
        center(d,'AI cinematic intro',h*.89,25,CREAM,False,w)
    else:
        d.rectangle((0,0,w,h),fill=(5,11,24,192))
        center(d,'KEEP CRUISING',h*.17,84,CREAM,True,w)
        center(d,'sabnockworks.com',h*.31,62,CORAL,True,w)
        center(d,'PLAY THE EARLIER WEB DEMO ON TESANA',h*.46,32,CYAN,True,w)
        center(d,'velvet-cruise-demo.tesana.com',h*.53,44,CREAM,True,w)
        center(d,'The current game has evolved beyond the demo:',h*.65,32,CREAM,False,w)
        center(d,'updated visuals and refined driving physics.',h*.70,32,CREAM,False,w)
        center(d,'AI cinematic outro',h*.89,25,CREAM,False,w)
    p=OUT/'qa'/f'{kind}-{"wide" if landscape else "vertical"}.png';im.save(p);return p

ENC=['-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-r','30','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart']

def cinematic(kind,wide=False):
    duration=INTRO_SECONDS if kind=='intro' else OUTRO_SECONDS
    size='1920:1080' if wide else '1080:1920'
    vf=f'[0:v]scale={size}:force_original_aspect_ratio=increase,crop={size},fps=30,setsar=1[v];[v][1:v]overlay=0:0,fade=t=in:st=0:d=0.2,fade=t=out:st={duration-.25}:d=0.25[out]'
    dest=OUT/'cinematic'/f'{kind}-{"wide" if wide else "vertical"}.mp4'
    ff('-ss','0' if kind=='intro' else '4','-i',OUT/'cinematic/runway.mp4','-loop','1','-i',card(kind,wide),'-stream_loop','-1','-i',ROOT/'assets/audio/music_golden.mp3','-filter_complex',vf,'-map','[out]','-map','2:a','-af',f'volume=0.68,afade=t=in:d=0.1,afade=t=out:st={duration-.5}:d=0.5','-t',duration,*ENC,dest)
    return dest

def join(clips,dest):
    listing=OUT/'qa'/f'{dest.stem}-concat.txt'
    listing.write_text(''.join("file '"+str(p).replace('\\','/')+"'\n" for p in clips),encoding='utf8')
    ff('-f','concat','-safe','0','-i',listing,'-c','copy','-movflags','+faststart',dest)

def shorts(stages):
    intro=cinematic('intro');outro=cinematic('outro')
    songs=json.loads((ROOT/'assets/audio/music.json').read_text())['songs']
    upload=[]
    for i,s in enumerate(stages,1):
        print(f'Editing Short {i}/15: {s["name"]}',flush=True)
        op=overlay(s,i);body=OUT/'shorts'/f'body-{s["id"]}.mp4';dur=s['duration']
        vf='[0:v]scale=960:540:flags=neighbor,pad=1080:1920:60:610:color=0x0b1428,setsar=1[game];[game][1:v]overlay=0:0[out]'
        music=ROOT/songs[(i-1)%len(songs)]['file']
        ff('-i',OUT/'raw'/f'{s["id"]}.mkv','-loop','1','-i',op,'-stream_loop','-1','-i',music,'-filter_complex',vf,'-map','[out]','-map','2:a','-af',f'volume=0.68,afade=t=in:d=0.25,afade=t=out:st={dur-.5}:d=0.5','-t',dur,*ENC,body)
        dest=OUT/'shorts'/f'{i:02d}-{s["id"]}-Short.mp4';join([intro,body,outro],dest)
        body.unlink()
        desc=f"{s['name']} — a complete stage drive from the current Velvet Cruise development build.\n\nMore from Sabnock Works: https://sabnockworks.com\nPlay the earlier web demo on Tesana: https://velvet-cruise-demo.tesana.com\n\nThe current game is further along than the web demo, with updated graphics and refined driving physics.\n\nRecorded from the current game engine using its automated driver, at normal speed. Original game soundtrack. AI-generated cinematic intro/outro; driving footage uses the actual game renderer.\n\n#VelvetCruise #ArcadeRacing #IndieGame #Shorts"
        title=f"Velvet Cruise | {s['name']} — Full Stage Drive #Shorts"
        (OUT/'shorts'/f'{i:02d}-{s["id"]}-upload.txt').write_text(title+'\n\n'+desc+'\n',encoding='utf8')
        upload.append({'file':dest.name,'title':title,'description':desc,'durationExpected':dur+INTRO_SECONDS+OUTRO_SECONDS})
    (OUT/'upload.json').write_text(json.dumps(upload,indent=2),encoding='utf8')

def showcase(stages):
    intro=cinematic('intro',True);outro=cinematic('outro',True);clips=[intro]
    for i,s in enumerate(stages,1):
        im=Image.new('RGBA',(1920,1080));d=ImageDraw.Draw(im)
        d.rounded_rectangle((42,235,900,330),radius=8,fill=(5,11,24,190))
        d.text((66,255),s['name'],font=font(46,True),fill=CREAM)
        lab=OUT/'qa'/f'label-{s["id"]}.png';im.save(lab)
        clip=OUT/'landscape'/f'part-{s["id"]}.mp4'
        ff('-ss',min(18,s['duration']/3),'-i',OUT/'raw'/f'{s["id"]}.mkv','-loop','1','-i',lab,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-filter_complex','[0:v]scale=1920:1080:flags=neighbor,setsar=1[v];[v][1:v]overlay=0:0[out]','-map','[out]','-map','2:a','-t','5',*ENC,clip)
        clips.append(clip)
    clips.append(outro);silent=OUT/'landscape/showcase-edit.mp4';join(clips,silent)
    dest=OUT/'landscape/Velvet-Cruise-All-15-Stages.mp4'
    ff('-i',silent,'-stream_loop','-1','-i',ROOT/'assets/audio/music_coastline.mp3','-map','0:v','-map','1:a','-c:v','copy','-af',f'volume=0.68,afade=t=in:d=0.25,afade=t=out:st={SHOWCASE_SECONDS-2}:d=2','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',SHOWCASE_SECONDS,'-movflags','+faststart',dest)
    silent.unlink()
    for p in (OUT/'landscape').glob('part-*.mp4'):p.unlink()
    (OUT/'landscape/upload.txt').write_text('Velvet Cruise | All 15 Stages — Current Development Gameplay\n\nFifteen stages, five destinations. A look at the current Velvet Cruise build.\n\nhttps://sabnockworks.com\nPlay the earlier web demo on Tesana: https://velvet-cruise-demo.tesana.com\n\nThe current game has progressed beyond the web demo, with updated visuals and refined driving physics.\n\nActual current-engine gameplay with an automated driver at normal speed; original game soundtrack. AI cinematic opening and closing. Stage excerpts are 5 seconds each.\n',encoding='utf8')

def main():
    stages=sorted(json.loads((OUT/'capture.json').read_text())['stages'],key=lambda s:s['node'])
    if '--preview' in sys.argv:
        op=overlay(stages[0],1);frame=Image.open(OUT/'qa/palm-cove.png').resize((960,540),Image.Resampling.NEAREST).convert('RGBA')
        preview=base((1080,1920)).convert('RGBA');preview.paste(frame,(60,610));preview.alpha_composite(Image.open(op));preview.convert('RGB').save(OUT/'qa/short-preview.jpg');return
    if not (OUT/'cinematic/runway.mp4').is_file():raise SystemExit('Missing Runway cinematic/runway.mp4')
    (OUT/'edit.json').write_text(json.dumps({'introSeconds':INTRO_SECONDS,'outroSeconds':OUTRO_SECONDS,'showcaseSeconds':SHOWCASE_SECONDS,'runwayTask':'80e689a9-d1dc-49e1-99ce-93e93406e864','reusedCinematic':True},indent=2),encoding='utf8')
    if '--showcase-only' not in sys.argv:shorts(stages)
    showcase(stages)

if __name__=='__main__':main()

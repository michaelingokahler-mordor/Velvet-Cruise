"""Validate all deliveries, sample images, and package without publishing."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess, json, hashlib, zipfile, os

ROOT=Path.cwd();OUT=Path(os.environ.get('VELVET_CAPTURE_DIR',ROOT/'output/trailer/2026-10-24')).resolve()

def digest_file(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for data in iter(lambda:stream.read(1024*1024),b''):h.update(data)
    return h.hexdigest()

def probe(p):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))

def opening_hash(p):
    return subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(p),'-map','0:v:0','-frames:v','90','-f','hash','-hash','sha256','-'],text=True).strip()

def main():
    capture=json.loads((OUT/'capture.json').read_text())
    edit=json.loads((OUT/'edit.json').read_text())
    stages=sorted(capture['stages'],key=lambda s:s['node'])
    assert len(stages)==15 and len({s['node'] for s in stages})==15
    upload=json.loads((OUT/'upload.json').read_text())
    files=[(OUT/'shorts'/x['file'],1080,1920,x['durationExpected']) for x in upload]
    files.append((OUT/'landscape/Velvet-Cruise-All-15-Stages.mp4',1920,1080,edit['showcaseSeconds']))
    source=json.loads((OUT/'qa/source-manifest.json').read_text())
    assert capture['sourceStableDuringCapture']
    assert all(digest_file(ROOT/p)==h for p,h in source['files'].items()),'Runtime sources changed after capture'
    intro=probe(OUT/'cinematic/intro-vertical.mp4')
    intro_video=next(s for s in intro['streams'] if s['codec_type']=='video')
    assert int(intro_video['nb_frames'])==90 and abs(float(intro_video['duration'])-3)<.001
    intro_hash=opening_hash(OUT/'cinematic/intro-vertical.mp4')
    report={'sourceRevision':capture['revision'],'sourceDigest':capture['sourceDigest'],'introSeconds':3,'introFrames':90,'runtimeSourceHashesVerified':True,'checks':[],'humanContinuousWatchListen':'PENDING','realPhoneAndPlatformPlayback':'PENDING','publication':'NOT UPLOADED','artwork':'Current native 320x180 software framebuffer, nearest-neighbour scale; no AI enhancement of driving footage.'}
    contact=Image.new('RGB',(1200,380*5),'#0b1428');d=ImageDraw.Draw(contact)
    f=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
    for i,(p,w,h,expected) in enumerate(files):
        print(f'Validate {p.name}',flush=True)
        info=probe(p);vs=next(s for s in info['streams'] if s['codec_type']=='video');aud=next(s for s in info['streams'] if s['codec_type']=='audio')
        duration=float(info['format']['duration'])
        assert (vs['width'],vs['height'])==(w,h)
        assert vs['codec_name']=='h264' and vs['pix_fmt']=='yuv420p' and vs['r_frame_rate']=='30/1'
        assert aud['codec_name']=='aac' and int(aud['sample_rate'])==48000
        assert abs(duration-expected)<.25,(p,duration,expected)
        if w<h:assert duration<180
        if w<h:assert opening_hash(p)==intro_hash,'Short does not contain the complete three-second intro'
        result=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(p),'-f','null','-'],capture_output=True,text=True)
        assert result.returncode==0 and not result.stderr.strip(),result.stderr
        af=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-vn','-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
        peaks=[s.strip() for s in af.stderr.splitlines() if 'max_volume:' in s or 'mean_volume:' in s]
        assert any('max_volume' in line and '-inf' not in line for line in peaks)
        report['checks'].append({'file':str(p.relative_to(OUT)),'duration':duration,'resolution':[w,h],'video':vs['codec_name'],'audio':aud['codec_name'],'decode':'PASS','audioLevels':peaks,'sha256':digest_file(p)})
        if w<h:
            sample=OUT/'qa'/f'final-{stages[i]["id"]}.jpg'
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(min(30,duration/2)),'-i',str(p),'-frames:v','1',str(sample)],check=True)
            im=Image.open(sample)
            # Contact sheet focuses on driving pixels; the full frame remains separately saved.
            im=im.crop((60,610,1020,1150)).resize((384,216),Image.Resampling.NEAREST)
            x=(i%3)*400+8;y=(i//3)*380+48;contact.paste(im,(x,y));d.text((x,y-28),stages[i]['name'],font=f,fill='#fff1d8')
            telemetry=json.loads((OUT/'qa'/f'{stages[i]["id"]}.json').read_text())['telemetry']
            assert len({round(t['position']) for t in telemetry})>20,'Static drive capture'
    contact.save(OUT/'qa/all-stages-contact.jpg')
    report['result']='PASS'
    (OUT/'qa/validation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    total=sum(x['duration'] for x in report['checks'][:-1])
    readme=f'''# Velvet Cruise video package — 24 October 2026

15 complete stage drives as 1080×1920, 30 fps H.264/AAC Shorts, plus an {edit['showcaseSeconds']}-second 1920×1080 showcase.
Total Shorts running time: {total/60:.2f} minutes. English cards and upload copy are included.
Intro: 3 seconds (90 video frames, one second longer than the previous edit). Outro: 6 seconds.
The existing ten-second Runway source is reused; no new generation was needed.
All fifteen drives were recorded again with the current artwork, lighting, extended stages and physics.
The 23 October package is preserved in its original folder.

## Links and message

- https://sabnockworks.com
- Playable browser version: https://sabnockworks.com/games/more-projects/velvet-cruise/
- The current game has advanced beyond that demo, with updated visuals and refined driving physics.
- Both links and the demo distinction appear in the Shorts, outro, and upload descriptions.

## Recording method and limits

Base commit: `{capture['revision']}`. The recording includes the current uncommitted runtime changes.
Runtime source/asset SHA-256: `{capture['sourceDigest']}`.
The complete runtime source and asset hash list is in `qa/source-manifest.json`.
Hashes were stable throughout capture and were checked again against the workspace before packaging.
The drivers are automated using the current game's Race.autopilot at normal speed, normal difficulty, 60 Hz physics.
All five legal route runs reached their goal. Each of the fifteen distinct stage themes appears once.
The footage uses the current Race, Renderer, assets, HUD and route network. It is an isolated engine capture,
not a desktop screen recording or human live play. Scene event orchestration for passenger bubbles and
messages is reduced; traffic, road renderer and driving physics are unmodified. No SDK was initialized,
and no player save, unlock, achievement, leaderboard or account data was accessed or changed.
The game natively renders at 320×180; the Shorts preserve the whole frame at exactly 3× scale.
Landscape gameplay is exactly 6× scale. Generated cinematic footage is confined to the labeled bookends.
The cinematic is mood footage and depicts a different convertible from the game's sprite.

The audio edit uses six soundtrack files already present in this game. The isolated capture has no live
engine/SFX, passenger voice, or narration. Track changes at the bookends are intentional fades.
The source MP3s are preserved in the repository; no new external music was downloaded.

## Validation

All sixteen final MP4 files passed resolution, frame rate, duration, H.264/AAC, non-silent audio and full
decode checks. Per-stage position telemetry proves that the car moved. Captured driving images, final
encoded samples and the final intro/outro were visually sampled. See `qa/validation.json` and contact sheet.
Technical checks and image samples do not replace continuous human watching/listening or phone playback.
Those human and device checks remain open. Nothing has been published or uploaded to a social platform.

## Review and upload

1. Watch the complete files with sound; check cuts, music transitions, stage coverage and links.
2. Check a Short on a phone, including platform button/caption overlays.
3. Use the matching `*-upload.txt` descriptions. If the platform asks, disclose the generated bookends.
4. Check the platform's upload processing and music checks before publication.

YouTube's official Shorts length reference (previously checked 23 October 2026):
https://support.google.com/youtube/answer/15424877?hl=en
All supplied vertical videos are under three minutes. Platform classification was not tested by an upload.

## Rebuild

From `D:\\Velvet Cruise\\Code`:

```powershell
node tools/trailer/capture.mjs
python tools/trailer/build.py
python tools/trailer/validate_package.py
```

Requires project Node dependencies, Python/Pillow, FFmpeg and Arial Windows fonts.
Keep `cinematic/runway.mp4`; Runway generation is not repeated by these scripts.
Runway task: `80e689a9-d1dc-49e1-99ce-93e93406e864` (ten-second portrait cinematic, generated without audio).

## Package contents

- Upload package: all 15 Shorts, showcase, English upload text, QA report and this document.
- Edit and evidence package: native lossless FFV1 captures, Runway source and labeled bookends,
  capture manifest, telemetry, overlays, image samples and the three reproducible production scripts.
'''
    (OUT/'README.md').write_text(readme,encoding='utf8')
    upload_files=[p for p,_,_,_ in files]+list((OUT/'shorts').glob('*-upload.txt'))+[OUT/'landscape/upload.txt',OUT/'upload.json',OUT/'README.md',OUT/'qa/validation.json',OUT/'qa/all-stages-contact.jpg']
    edit_files=list((OUT/'raw').glob('*'))+list((OUT/'cinematic').glob('*'))+[OUT/'capture.json',OUT/'edit.json',OUT/'README.md',OUT/'qa/engine.cjs']+[p for p in (OUT/'qa').glob('*') if p.suffix in ('.json','.jpg','.png')]
    archives=[]
    for name,paths in [('Velvet-Cruise-Upload-Package.zip',upload_files),('Velvet-Cruise-Edit-and-Evidence.zip',edit_files)]:
        dest=OUT/'delivery'/name
        with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_STORED,allowZip64=True) as z:
            for p in paths:z.write(p,str(p.relative_to(OUT)))
            if 'Evidence' in name:
                for p in (ROOT/'tools/trailer').glob('*'):
                    if p.is_file():z.write(p,'tools/trailer/'+p.name)
        with zipfile.ZipFile(dest) as z:assert z.testzip() is None
        archives.append(dest)
    hashes=''.join(digest_file(p)+'  '+p.name+'\n' for p in archives)
    (OUT/'delivery/SHA256SUMS.txt').write_text(hashes,encoding='ascii')
    print(json.dumps({'result':'PASS','files':len(files),'archives':[str(p) for p in archives]},indent=2))

if __name__=='__main__':main()

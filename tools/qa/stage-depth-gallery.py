"""Build the review gallery from paired real-renderer captures."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path('output/stage-depth')
stages = json.loads((root/'after/audit-data.json').read_text(encoding='utf8'))['stages']
details = json.loads((root/'details.json').read_text(encoding='utf8'))
version = json.loads((root/'desktop-game/build_manifest.json').read_text())['build_version']
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 14)
for s in stages:
    sheet = Image.new('RGB', (1280, ((len(s['shots'])+3)//4)*202+28), '#182029')
    draw = ImageDraw.Draw(sheet); draw.text((8, 5), s['name'], fill='white', font=font)
    for j, p in enumerate(s['shots']):
        x, y = j%4*320, 28+j//4*202
        sheet.paste(Image.open(root/'after/views'/p['file']), (x, y))
        draw.text((x+3, y+181), p['tag']+' · '+str(p['segment']), fill='#dfc098', font=font)
    sheet.save(root/f"after/contact-{s['id']}.png")

html = '''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Velvet Cruise · Mittelgrund, Pässe und Licht</title>
<style>body{margin:0;background:#121825;color:#edf1f1;font:16px/1.5 system-ui}main{max-width:1440px;margin:auto;padding:26px}h1{font-size:29px;margin:0}p,small{color:#bac6cf}nav{display:flex;gap:14px;flex-wrap:wrap;margin:22px 0}label{display:flex;gap:7px;align-items:center}select,button{background:#243044;color:#fff;border:1px solid #65718a;border-radius:5px;padding:9px;font:inherit}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:16px 0 28px}figure{margin:0}figcaption,summary{color:#ffce83;margin:5px 0}img{width:100%;display:block;image-rendering:pixelated;aspect-ratio:16/9;background:#080c12}.sheet{aspect-ratio:auto}details{margin:20px 0}summary{cursor:pointer}a{color:#9adbe9}.note{background:#202d40;padding:12px 16px;border-left:3px solid #ffce83}@media(max-width:850px){.pair{grid-template-columns:1fr}main{padding:14px}}</style>
<main><h1>Velvet Cruise · Mittelgrund, Pässe und Licht</h1><p>Gezielte Überarbeitung nach deinen Anmerkungen. Beide Bilder zeigen dieselbe Stelle und Kameraposition. Der Vergleich kann zwischen der ersten Überarbeitung und der ursprünglichen Landschaft wechseln.</p>
<p class="note"><b>Neu: H / Gamepad Y</b> – tagsüber Hupe, nachts eine doppelte Lichthupe. Der nächste Fahrer voraus macht nach kurzer Reaktion Platz, wenn eine sichere Nachbarspur frei ist. Auf Touchgeräten gibt es dafür H beziehungsweise L.</p>
<nav><label>Stage <select id="stage"></select></label><label>Ansicht <select id="view"></select></label><label>Vergleichen mit <select id="baseline"><option value="before">Erster Überarbeitung</option><option value="original">Ursprünglicher Fassung</option></select></label><button id="prev">←</button><button id="next">→</button></nav>
<p id="info"></p><div class="pair"><figure><figcaption id="beforelabel">Erste Überarbeitung</figcaption><img id="before" alt="Vorherige Fassung"></figure><figure><figcaption>Neue Fassung</figcaption><img id="after" alt="Neue Fassung"></figure></div>
<details><summary>Alle Streckenansichten dieser Stage</summary><img id="sheet" class="sheet" alt="Streckenübersicht"></details>
<details open><summary>Zusätzliche Detailansichten: Siedlungen, Pässe und Hauptstraße</summary><p>Diese Detailpaare vergleichen die erste Überarbeitung mit der neuen Fassung.</p><div id="details"></div></details>
<details><summary>Scheinwerfer und Lichthupe</summary><p>Die Leuchtrichtung bleibt gerade, während die Straße abbiegt. Die Nachtfunktion hat zwei kurze Lichtimpulse.</p><div class="pair"><figure><figcaption>Normales Fahrlicht</figcaption><img src="after/details/headlights-normal.png" alt="Normales Licht"></figure><figure><figcaption>Lichthupe</figcaption><img src="after/details/headlights-pulse-1.png" alt="Erster Lichtimpuls"></figure></div></details>
<details><summary>Redwood: Krone vorher / nachher</summary><div class="pair"><img class="sheet" src="before/redwood.png" alt="Vorheriger Redwood"><img class="sheet" src="after/redwood.png" alt="Redwood mit größerer Krone"></div></details>
<small>VERSION · 320 × 180 Pixel · 170 Streckenbilder, 19 Detailpaare. Straße, Wetterphysik, Zeitvorgaben und bestehende Hindernisse bleiben erhalten. Weitere Ergebnisse im <a href="../../STAGE_DEPTH.md">Änderungsbericht</a>.</small></main>
<script>const stages=STAGES,details=DETAILS;const stage=document.getElementById('stage'),view=document.getElementById('view'),baseline=document.getElementById('baseline');
const labels={'fork':'Abzweig / Übergang','left-bend':'Linkskurve','right-bend':'Rechtskurve','tunnel':'Tunnel','ice':'Eis','sign':'Schilder'};
stages.forEach((s,i)=>stage.add(new Option(s.name,i)));
function update(){const s=stages[stage.value],p=s.shots[view.value],original=baseline.value==='original';document.getElementById('before').src=(original?'../stage-refresh/before/views/':'before/views/')+p.file;document.getElementById('after').src='after/views/'+p.file;document.getElementById('beforelabel').textContent=original?'Ursprüngliche Fassung':'Erste Überarbeitung';document.getElementById('info').textContent=s.name+' · Segment '+p.segment+' · '+Math.round(p.progress*100)+' %';}
function choose(){const s=stages[stage.value];view.replaceChildren();s.shots.forEach((p,i)=>view.add(new Option(labels[p.tag]||p.tag.replace('view-','Streckenansicht '),i)));view.value=Math.max(0,s.shots.findIndex(p=>p.tag==='view-07'));document.getElementById('sheet').src='after/contact-'+s.id+'.png';document.getElementById('details').innerHTML=details.filter(p=>p.node===s.node).map(p=>'<div class="pair"><figure><figcaption>Vorher · '+p.tag+'</figcaption><img src="before/details/'+p.file+'" alt="Detail vorher"></figure><figure><figcaption>Neue Fassung</figcaption><img src="after/details/'+p.file+'" alt="Detail nachher"></figure></div>').join('');update();}
stage.onchange=choose;view.onchange=update;baseline.onchange=update;document.getElementById('prev').onclick=()=>{view.value=(+view.value+view.length-1)%view.length;update()};document.getElementById('next').onclick=()=>{view.value=(+view.value+1)%view.length;update()};stage.value=3;choose();</script>'''
html = html.replace('VERSION', version).replace('STAGES', json.dumps(stages, ensure_ascii=False)).replace('DETAILS', json.dumps(details, ensure_ascii=False))
(root/'Vergleich.html').write_text(html, encoding='utf8')
print('Comparison gallery and 15 contact sheets written')

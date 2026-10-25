// A short, unambiguous phone URL. Set test flags before the game module boots.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const folder=resolve(process.argv[2]||'dist');
const hash='#graphicstest&graphics=plus&tumbletest&stage=2&at=600&path=0,5,6,11,13';
const head=`<script>history.replaceState(null,'',location.pathname+location.search+${JSON.stringify(hash)});</script>`;
const boot=`<div id="rain-version" style="position:fixed;right:4px;top:4px;z-index:50;background:#171321dd;color:#fff1c6;font:12px system-ui;padding:4px;pointer-events:none">Regen-Test V2 lädt</div>
<script>
const label=document.getElementById('rain-version'),started=performance.now();
function testStart(){
 const info=window.__graphicsInfo?.();
 if(info?.error){label.textContent='Regen-Test V2: Ladefehler';return;}
 const race=window.__race;
 if(info?.screen==='race'&&race?.stage===1&&race.rain>.9){label.textContent='Regen-Test V2 · Plus · Stage 2';return;}
 if(info?.mode==='plus'&&!info.busy)label.textContent='Regen-Test V2 bereit · DRIVE starten';
 else if(performance.now()-started>30000){label.textContent='Regen-Test V2: Teststart nicht bereit';return;}
 setTimeout(testStart,50);
}
testStart();
</script>`;
const html=readFileSync(resolve(folder,'index.html'),'utf8').replace('<head>','<head>'+head).replace('</body>',boot+'</body>');
writeFileSync(resolve(folder,'regen-v2.html'),html);console.log('Created '+resolve(folder,'regen-v2.html'));

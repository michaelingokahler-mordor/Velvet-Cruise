import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
const root=path.resolve('output/independent-runtime/native-qa-'+Date.now());
fs.mkdirSync(root,{recursive:true});
const fixture=path.join(root,'game'); fs.mkdirSync(fixture);
fs.writeFileSync(path.join(fixture,'index.html'),'<html><head><script type="application/json" id="velvet-runtime">{"target":"desktop","gameId":"game-20261009-93986676"}</script></head><body>Native runtime fixture</body></html>');
function pack(out){ const result=spawnSync(process.execPath,['tools/package-desktop.mjs','--game',fixture,'--out',out],{encoding:'utf8'}); assert.equal(result.status,0,result.stderr); }
const candidate=path.join(root,'candidate'); pack(candidate);
// Inject a destination-write exception into this test-owned application only.
// The released runtime contains no fixture flag or test failure branch.
const testMain=path.join(candidate,'resources','app','main.mjs');
fs.writeFileSync(testMain,fs.readFileSync(testMain,'utf8').replace('const pendingImports=[];',`const pendingImports=[];
  if(process.argv.includes('--fixture-storage-failure'))await window.webContents.executeJavaScript("const originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='sunset-coast-run.quota')throw new DOMException('fixture destination failure','QuotaExceededError');return originalSetItem.call(this,key,value);};true");`));
assert.equal(fs.existsSync(path.join(candidate,'resources','app.asar')),false);
assert.equal(fs.existsSync(path.join(candidate,'resources','app.asar.unpacked')),false);
const seed=path.join(root,'seed'); pack(seed);
fs.copyFileSync('tools/qa/independent-native-seed.mjs',path.join(seed,'resources','app','main.mjs'));
const executable=dir=>path.join(dir,'Velvet Cruise.exe');
const legacyRoot=path.join(root,'previous'), profile=path.join(legacyRoot,'Neutral Publisher','wrapper'), destination=path.join(root,'current');
const entries=Object.fromEntries(['audio','bindings.v1','controls','tilt','arcade.tour2','arcade.tour2.easy','arcade.tour2.hard','local-bests','local-badges','stage-bests','name','goal-progress.v1','online-profile','online-pending','stages-cleared','goals-reached','station','difficulty','car','graphics-mode.v1','demo-a.audio'].map((k,i)=>['sunset-coast-run.'+k,JSON.stringify({fixture:i})]));
entries['foreign.secret']='must not import';
const config=path.join(root,'seed.json'); fs.writeFileSync(config,JSON.stringify({profile,entries,compact:true}));
async function runSeed(){ await new Promise((resolve,reject)=>{const p=spawn(executable(seed),['--seed-config',config],{stdio:'ignore',windowsHide:true}); const timeout=setTimeout(()=>{p.kill();reject(Error('seed timeout'));},15000);p.once('exit',code=>{clearTimeout(timeout);code===0?resolve():reject(Error('seed exit '+code));});}); }
await runSeed();console.log('Seeded neutral Chromium profile');
const active=path.join(legacyRoot,'Active Neutral Publisher','wrapper'),ready=path.join(root,'ready'),release=path.join(root,'release');
fs.writeFileSync(config,JSON.stringify({profile:active,entries:{'sunset-coast-run.active':'retained','sunset-coast-run.audio':'newest source'},hold:true,ready,release}));
const activeChild=spawn(executable(seed),['--seed-config',config],{stdio:'ignore',windowsHide:true});
for(let i=0;i<100&&!fs.existsSync(ready);i++)await new Promise(r=>setTimeout(r,100));
assert.ok(fs.existsSync(ready),'active Electron fixture must be ready');
const { snapshotProfile } = await import('../../desktop/storage-migration.mjs');
let locked=false;
try { snapshotProfile(active,path.join(root,'active-snapshot')); } catch { locked=true; }
const deferred=await launch(candidate,'',true);
await waitForDeferred(deferred);
assert.match(await deferred.evaluate('document.body.innerText'),/Saved data needs another try/);
assert.equal(await deferred.evaluate(`localStorage.getItem('sunset-coast-run.audio')`),null,'older source must not win while newest source is locked');
await deferred.quit();
fs.writeFileSync(release,'release');
await new Promise(r=>activeChild.once('exit',r));
assert.equal(locked,true,'live Electron LevelDB source must reject snapshot');
entries['sunset-coast-run.audio']='newest source';
const oldDb=path.join(profile,'Local Storage','leveldb');
const tables=fs.readdirSync(oldDb).filter(name=>/\.(ldb|sst)$/.test(name));
assert.ok(tables.length,'real Chromium fixture must compact into SST tables');
const { tableKeys } = await import('../../desktop/leveldb-keys.mjs');
const oldKeys=tables.flatMap(name=>tableKeys(fs.readFileSync(path.join(oldDb,name))));
assert.ok(oldKeys.some(key=>key.includes(Buffer.from('sunset-coast-run.audio'))),'compacted table must contain game settings');
for(const name of fs.readdirSync(oldDb)) if(name.endsWith('.log')) fs.unlinkSync(path.join(oldDb,name));
console.log('Compacted table-only source verified');
async function launch(runtime = candidate, gameOverride = '', expectDeferred = false, storageFailure = false){
 const server=createServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const child=spawn(executable(runtime),['--user-data-dir',destination,'--legacy-profile-root',legacyRoot,'--remote-debugging-port='+port,...(gameOverride?['--game',gameOverride]:[]),...(storageFailure?['--fixture-storage-failure']:[])],{stdio:['ignore','ignore','pipe'],windowsHide:true});let stderr='';child.stderr.on('data',x=>stderr+=x);
 let page;
 for(let i=0;i<200;i++){try {const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1000)})).json();page=pages.find(p=>p.type==='page'&&p.url==='velvet-game://game-20261009-93986676/'+(expectDeferred?'__startup__':''));if(page)break;}catch{} if(child.exitCode!==null)throw Error('runtime exited '+child.exitCode+' '+stderr);await new Promise(r=>setTimeout(r,100));}
 assert.ok(page,'game page must load: '+stderr);
 const socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});let id=0;const pending=new Map();socket.onmessage=e=>{const data=JSON.parse(e.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(Error(data.error.message)):p.resolve(data.result);}};
 socket.onclose=()=>{for(const p of pending.values())p.reject(Error('CDP closed'));pending.clear();};
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  if(socket.readyState!==WebSocket.OPEN){reject(Error('CDP connection closed'));return;}
  const request=++id;
  const timeout=setTimeout(()=>{pending.delete(request);reject(Error('CDP timeout: '+method));},10000);
  pending.set(request,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});
  socket.send(JSON.stringify({id:request,method,params}));
 });
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.equal(result.exceptionDetails,undefined,JSON.stringify(result.exceptionDetails));return result.result.value;};
 const quit=async()=>{void evaluate('window.VelvetDesktop.quit()').catch(()=>{});await new Promise((r,j)=>{if(child.exitCode!==null)return r();const timeout=setTimeout(()=>{child.kill();j(Error('Exit did not shut down'));},10000);child.once('exit',()=>{clearTimeout(timeout);r();});});socket.close();};
 return {evaluate,send,quit,child,stderr:()=>stderr};
}
async function waitForDeferred(runtime) {
 for(let i=0;i<100;i++) {
  if((await runtime.evaluate('document.body?.innerText || '+JSON.stringify(''))).includes('Saved data needs another try'))return;
  await new Promise(r=>setTimeout(r,200));
 }
 assert.fail('runtime must display saved-data retry UI');
}
let app=await launch();console.log('First native launch ready');
assert.deepEqual(await app.evaluate('({embedded:window.VelvetDesktop.embedded,node:typeof require,origin:location.origin})'),{embedded:true,node:'undefined',origin:'velvet-game://game-20261009-93986676'});
for(const [key,value] of Object.entries(entries))assert.equal(await app.evaluate(`localStorage.getItem(${JSON.stringify(key)})`),key==='foreign.secret'?null:value,key);
assert.equal(await app.evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('velvet-runtime.import-v1.')).length`),2);
await app.evaluate(`localStorage.setItem('sunset-coast-run.audio','new preference');localStorage.setItem('sunset-coast-run.new-key','new record')`);
await app.quit();console.log('Native quit verified');
assert.ok(fs.existsSync(path.join(profile,'Local Storage','leveldb')),'original profile retained');
app=await launch();assert.equal(await app.evaluate(`localStorage.getItem('sunset-coast-run.audio')`),'new preference');assert.equal(await app.evaluate(`localStorage.getItem('sunset-coast-run.new-key')`),'new record');
assert.equal(await app.evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('velvet-runtime.import-v1.')).length`),2);
await app.quit();console.log('Native quit verified');
// A missing/incomplete source does not set completion: a later valid source imports.
const nextProfile=path.join(legacyRoot,'Second Neutral Publisher','wrapper');
fs.writeFileSync(config,JSON.stringify({profile:nextProfile,entries:{'sunset-coast-run.retry':'retried','sunset-coast-run.audio':'must preserve'}}));
fs.mkdirSync(path.join(nextProfile,'Local Storage','leveldb'),{recursive:true});
fs.writeFileSync(path.join(nextProfile,'Local Storage','leveldb','000001.log'),'META:prior-game://game-20261009-93986676\0sunset-coast-run.retry');
app=await launch(candidate,'',true);await waitForDeferred(app);assert.match(await app.evaluate('document.body.innerText'),/Saved data needs another try/);assert.equal(await app.evaluate(`localStorage.getItem('sunset-coast-run.retry')`),null);await app.quit();console.log('Failed import defers game startup');
// Replace only this test-owned malformed fixture before real Chromium creates it.
fs.rmSync(nextProfile,{recursive:true,force:true});await runSeed();console.log('Seeded neutral Chromium profile');
app=await launch();assert.equal(await app.evaluate(`localStorage.getItem('sunset-coast-run.retry')`),'retried');assert.equal(await app.evaluate(`localStorage.getItem('sunset-coast-run.audio')`),'new preference');await app.quit();console.log('Native quit verified');
fs.writeFileSync(config,JSON.stringify({profile:path.join(legacyRoot,'Quota Neutral Publisher','wrapper'),entries:{'sunset-coast-run.quota':'q'.repeat(512*1024)}}));
await runSeed();
app=await launch(candidate,'',true,true);await waitForDeferred(app);
assert.match(await app.evaluate('document.body.innerText'),/Saved data needs another try/,'destination quota failure defers startup');
assert.equal(await app.evaluate(`localStorage.getItem('sunset-coast-run.quota')`),null);
await app.evaluate(`setTimeout(()=>document.querySelector('a[href="/__continue__"]').click(),250);true`);
await new Promise(r=>setTimeout(r,1000));
for(let i=0;i<150;i++){if(await app.evaluate('location.pathname')==='/')break;await new Promise(r=>setTimeout(r,100));}
assert.equal(await app.evaluate('location.pathname'),'/','explicit Continue can proceed after storage quota failure');
assert.equal(await app.evaluate(`localStorage.getItem('sunset-coast-run.audio')`),'new preference');
await app.quit();console.log('Destination quota retry/explicit continuation verified');
if(process.argv.includes('--candidate')) {
 const installed=path.resolve(process.argv[process.argv.indexOf('--candidate')+1]);
 // A fresh destination keeps the full-game run separate from the write-failure fixture.
 fs.renameSync(destination,destination+'-fixture');
 app=await launch(installed);
 await new Promise(r=>setTimeout(r,3000));
 assert.ok(await app.evaluate('document.querySelector("canvas") !== null'),'actual game renders a canvas');
 assert.equal(await app.evaluate('window.VelvetDesktop.embedded'),true);
 const shot=await app.send('Page.captureScreenshot',{format:'png'});
 fs.writeFileSync(path.join(root,'native-game.png'),Buffer.from(shot.data,'base64'));
 await app.quit();console.log('Actual game executable startup and Exit verified');
}
fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({passed:true,checks:['real Chromium origin migration','21 game storage families including rankings/badges/stage records','real compressed SST-only profile discovery','actual active Electron profile exclusion','newest-source priority after locked-source retry','older-source staging until all higher-priority reads succeed','failed import defers game startup','injected QuotaExceededError in real Chromium defers startup','explicit continuation after failed storage write','unrelated-key exclusion','native bridge','sandbox','native Exit','relaunch persistence','once-only markers','failed import retry','existing destination retention','original profile retained',...(process.argv.includes('--candidate')?['actual full game executable startup/canvas/Exit']:[])],root},null,2));
console.log('Native executable integration passed: '+root);

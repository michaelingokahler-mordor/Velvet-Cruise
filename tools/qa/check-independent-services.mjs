import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const out=resolve('output/independent-runtime/tests');mkdirSync(out,{recursive:true});
const entry=existsSync('src/platform/services.ts')?'src/platform/services.ts':'src/platform/'+readFileSync('src/main.ts','utf8').match(/from "\.\/platform\/([^"/]+)"/)[1]+'.ts';
const boards=JSON.parse(readFileSync('assets/ui/boards.json')).boards;
const badges=JSON.parse(readFileSync('assets/ui/achievements.json')).achievements;
const values=new Map([
 ['sunset-coast-run.local-bests',JSON.stringify({[boards.find(b=>b.order==='desc').board]:12345})],
 ['sunset-coast-run.local-badges',JSON.stringify({earned:[badges[0].id],counts:{old:7}})],
 ['sunset-coast-run.audio','{"music":0.3,"effects":0.8}'],
 ['sunset-coast-run.controls','keyboard'],
 ['sunset-coast-run.graphics-mode.v1','plus'],
 ['sunset-coast-run.arcade','{"normal":[{"name":"OLD","score":7654}]}'],
 ['sunset-coast-run.stage-bests','{"normal":{"0":123.4}}'],
 ['sunset-coast-run.online-profile','{"id":"retained-profile","token":"retained-token","displayName":"OLD"}'],
 ['sunset-coast-run.online-pending','{}'],
]);
const preserved=new Map(values);
globalThis.window={addEventListener(){}};
globalThis.document={getElementById:()=>null};
globalThis.location={href:'http://127.0.0.1:5173/',hash:''};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{language:'de-DE',webdriver:true}});
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};
const requests=[];globalThis.fetch=async(url)=>{requests.push(String(url));return Response.json({});};
await build({entryPoints:[entry],outfile:resolve(out,'services.mjs'),bundle:true,platform:'node',format:'esm',define:{__DEMO_A__:'false','import.meta.env.VITE_LOCAL_SERVICES':'"false"','import.meta.env.VITE_DESKTOP_BUILD':'"false"','import.meta.env.PROD':'false'}});
const api=await import(pathToFileURL(resolve(out,'services.mjs')));
assert.equal(api.usesLocalServices(),true,'default web/dev must use local-first services without a host SDK');
assert.equal(typeof api.initServices,'function','owned service initialization is available');
let ready=0;api.onServicesReady(()=>ready++);await api.initServices();
assert.ok(ready>=1);assert.equal(api.servicesOnline(),false);
assert.equal(await api.myBest(boards.find(b=>b.order==='desc').board),12345);
assert.ok((await api.listBadges()).some(b=>b.id===badges[0].id&&b.unlocked));
for(const[k,v]of preserved)assert.equal(values.get(k),v,`initialization preserves ${k}`);
for(const order of ['asc','desc']){const b=boards.find(b=>b.order===order);const value=order==='asc'?12:54321;assert.deepEqual(await api.submitScore(b.board,value),{improved:true,best:value});assert.equal(await api.myBest(b.board),value);}
assert.equal(typeof api.t('menu.drive'),'string');assert.equal(api.locale(),'de-DE');
const badge=badges.find(b=>!b.stat&&b.id!==badges[0].id);assert.equal(await api.unlockBadge(badge.id),'new');assert.equal(await api.unlockBadge(badge.id),'had');
const counted=badges.find(b=>b.stat&&b.target>1);assert.ok((await api.badgeProgress(counted.stat,counted.target)).unlocked.includes(counted.id));
const reloaded=await import(pathToFileURL(resolve(out,'services.mjs'))+'?reload');assert.equal(await reloaded.myBest(boards.find(b=>b.order==='desc').board),54321);assert.ok((await reloaded.listBadges()).find(b=>b.id===badge.id).unlocked);
assert.ok(requests.every(u=>!/^https?:/.test(u)), 'local verification cannot contact a production service');
const result={status:'PASS',checks:['default local-first services','existing records/settings/profile preserved','score ordering','local badges and counters','reload persistence','no production requests']};writeFileSync(resolve(out,'services.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

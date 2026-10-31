import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { testDatabase } from './online-test-db.mjs';

mkdirSync('output/statistics/tests', {recursive:true});
const failures=[], passed=[];
async function test(name,fn){try{await fn();passed.push(name);}catch(e){failures.push({name,message:e.stack});}}
await build({entryPoints:['server/worker.ts'],outfile:'output/statistics/tests/worker.mjs',bundle:true,platform:'node',format:'esm'});
const worker=(await import(pathToFileURL(resolve('output/statistics/tests/worker.mjs')))).default;
const schema=readFileSync('server/migrations/0001_rankings.sql','utf8')+readFileSync('server/migrations/0003_driver_tags.sql','utf8')+(existsSync('server/migrations/0002_statistics.sql')?readFileSync('server/migrations/0002_statistics.sql','utf8'):'');
const DB=testDatabase(schema);
const env={DB,ALLOWED_ORIGINS:'https://sabnockworks.com,http://127.0.0.1:4187',STATS_ALLOWED_ORIGIN:'https://sabnockworks.com',STATS_REPORT_SECRET:'synthetic-test-key-0123456789abcdef'};
const event=(type='game_loaded',time=Date.now())=>({id:crypto.randomUUID(),type,timestamp:time});
const call=(path,data,headers={},custom=env)=>worker.fetch(new Request('https://worker.test'+path,{method:data===undefined?'GET':'POST',headers:{Origin:path.startsWith('/stats/report')?'https://worker.test':'https://sabnockworks.com',...(data===undefined?{}:{'Content-Type':'application/json'}),...headers},body:data===undefined?undefined:JSON.stringify(data)}),custom);
const report=async(from,to)=>{const r=await call(`/stats/report?from=${from}&to=${to}`,undefined,{Authorization:`Bearer ${env.STATS_REPORT_SECRET}`});assert.equal(r.status,200);return r.json();};
await test('concurrent duplicates count once and distinct events count independently',async()=>{
 const e=event();const results=await Promise.all(Array.from({length:40},()=>call('/stats/events',e)));assert.ok(results.every(r=>r.status===202),'valid statistics events must be accepted');
 await Promise.all(Array.from({length:9},()=>call('/stats/events',event('run_start'))));
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const r=await report(day,day);assert.deepEqual(r.totals,{game_loaded:1,run_start:9});
});
await test('strict ingest rejects identifiers, invalid types, malformed IDs and stale/future times',async()=>{
 for(const payload of [{...event(),name:'ALICE'},{...event(),profileId:'x'},{...event(),type:'score'},{...event(),type:['run_start']},{...event(),id:'bad'},event('run_start',Date.now()-86405000),event('run_start',Date.now()+305000),{...event(),timestamp:'2026-10-28'},[],null]) assert.equal((await call('/stats/events',payload)).status,400,JSON.stringify(payload));
 assert.equal((await call('/stats/events',event(),{'Content-Type':'text/plain'})).status,415);
 assert.equal((await call('/stats/events',{...event(),extra:'x'.repeat(5000)})).status,413);
});
await test('statistics origin policy excludes ranking localhost and absent origin',async()=>{
 for(const origin of ['http://127.0.0.1:4187','https://www.sabnockworks.com','https://attacker.test','null','']) assert.equal((await call('/stats/events',event(),{Origin:origin})).status,403);
 const pre=await worker.fetch(new Request('https://worker.test/stats/events',{method:'OPTIONS',headers:{Origin:'https://sabnockworks.com'}}),env);assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),'https://sabnockworks.com');
});
await test('event time determines Berlin day and expired retries cannot count twice',async()=>{
 const isolated=testDatabase(schema),local={...env,DB:isolated},clock=Date.now;let now=Date.parse('2026-10-28T00:30:00Z');Date.now=()=>now;
 try{const old=event('game_loaded',Date.parse('2026-10-27T22:30:00Z'));assert.equal((await call('/stats/events',old,{},local)).status,202);assert.equal((await call('/stats/events',old,{},local)).status,202);
 const r=await call('/stats/report?from=2026-10-27&to=2026-10-28',undefined,{Authorization:`Bearer ${env.STATS_REPORT_SECRET}`},local);assert.deepEqual((await r.json()).days,[{day:'2026-10-27',game_loaded:1,run_start:0},{day:'2026-10-28',game_loaded:0,run_start:0}]);
 now+=49*3600000;assert.equal((await call('/stats/events',old,{},local)).status,400);assert.equal((await call('/stats/events',event('run_start'),{},local)).status,202);assert.equal((await isolated.prepare('SELECT COUNT(*) AS n FROM statistics_events').first()).n,1);assert.equal((await isolated.prepare('SELECT game_loaded FROM statistics_daily WHERE day=?').bind('2026-10-27').first()).game_loaded,1);
 }finally{Date.now=clock;isolated.close();}
});
await test('report fails closed and returns inclusive zero days with correct totals',async()=>{
 assert.equal((await call('/stats/report?from=2026-01-01&to=2026-01-03')).status,401);
 assert.equal((await call('/stats/report?from=2026-01-01&to=2026-01-03',undefined,{Authorization:'Bearer wrong'})).status,401);
 assert.equal((await call('/stats/report?from=2026-01-01&to=2026-01-03',undefined,{Authorization:`Bearer ${env.STATS_REPORT_SECRET}`},{...env,STATS_REPORT_SECRET:undefined})).status,503);
 const r=await report('2026-01-01','2026-01-03');assert.deepEqual(r.days,[{day:'2026-01-01',game_loaded:0,run_start:0},{day:'2026-01-02',game_loaded:0,run_start:0},{day:'2026-01-03',game_loaded:0,run_start:0}]);assert.deepEqual(r.totals,{game_loaded:0,run_start:0});assert.equal(r.timezone,'Europe/Berlin');
 for(const range of ['from=2026-02-30&to=2026-03-01','from=2026-03-01&to=2026-01-01','from=2000-01-01&to=2026-01-01','from=2026-1-01&to=2026-01-01'])assert.equal((await call('/stats/report?'+range,undefined,{Authorization:`Bearer ${env.STATS_REPORT_SECRET}`})).status,400);
});
let stats={createStatisticsClient:()=>({record(){}}),statisticsAllowed:()=>false,berlinDay:()=>''};
if(existsSync('src/platform/statistics.ts')){await build({entryPoints:['src/platform/statistics.ts'],outfile:'output/statistics/tests/client.mjs',bundle:true,platform:'node',format:'esm',define:{'import.meta.env.VITE_STATISTICS_PRODUCTION':'"false"'}});stats={...stats,...await import(pathToFileURL(resolve('output/statistics/tests/client.mjs')))};}
await test('client retries same anonymous event at most three times and never stores data',async()=>{
 const sent=[];const client=stats.createStatisticsClient({enabled:()=>true,endpoint:'https://local.test/stats/events',fetch:async(_url,options)=>{sent.push(options);throw Error('offline');},delay:async()=>{},timeoutMs:5});client.record('game_loaded');await new Promise(r=>setTimeout(r,30));assert.equal(sent.length,3);assert.deepEqual(JSON.parse(sent[0].body),JSON.parse(sent[2].body));assert.deepEqual(Object.keys(JSON.parse(sent[0].body)).sort(),['id','timestamp','type']);assert.equal(sent[0].credentials,'omit');assert.equal(sent[0].referrerPolicy,'no-referrer');
});
await test('client times out hanging requests and caps pending queue',async()=>{
 let calls=0;const client=stats.createStatisticsClient({enabled:()=>true,endpoint:'https://local.test',fetch:async()=>{calls++;return new Promise(()=>{});},delay:async()=>{},timeoutMs:2});for(let i=0;i<100;i++)client.record('run_start');await new Promise(r=>setTimeout(r,2400));assert.equal(calls,96,'32 retained events x three attempts');
});
await test('loaded once per document client, run_start for every fresh attempt, no disabled fetch',async()=>{
 const sent=[];let enabled=true;const client=stats.createStatisticsClient({enabled:()=>enabled,endpoint:'https://local.test',fetch:async(_url,o)=>{sent.push(JSON.parse(o.body));return new Response(null,{status:202});},delay:async()=>{}});client.record('game_loaded');client.record('game_loaded');client.record('run_start');client.record('run_start');await new Promise(r=>setTimeout(r,20));assert.deepEqual(sent.map(e=>e.type),['game_loaded','run_start','run_start']);enabled=false;client.record('run_start');await new Promise(r=>setTimeout(r,10));assert.equal(sent.length,3);
});
await test('permanent rejection is not retried and later queued events still send',async()=>{
 let attempts=0;const client=stats.createStatisticsClient({enabled:()=>true,endpoint:'https://local.test',fetch:async()=>{attempts++;return new Response(null,{status:400});},delay:async()=>{}});client.record('game_loaded');client.record('run_start');await new Promise(r=>setTimeout(r,20));assert.equal(attempts,2);
});
await test('production gating blocks every game automation mode, desktop, preview and non-release builds',()=>{
 const good={production:true,href:'https://sabnockworks.com/games/more-projects/velvet-cruise/',webdriver:false,desktop:false,testHooks:false};assert.equal(stats.statisticsAllowed(good),true);
 for(const hash of ['autopilot','stage=1','sim=1','yelltest','radiotest','tumbletest','nametest','endtest','path=0,1','maptest','graphicstest','graphics=plus','qa','test'])assert.equal(stats.statisticsAllowed({...good,href:good.href+'#'+hash}),false,hash);
 for(const change of [{production:false},{webdriver:true},{desktop:true},{testHooks:true},{href:'http://sabnockworks.com/games/more-projects/velvet-cruise/'},{href:'https://www.sabnockworks.com/games/more-projects/velvet-cruise/'},{href:'https://sabnockworks.com/other/'},{href:'http://localhost:5173/'}])assert.equal(stats.statisticsAllowed({...good,...change}),false,JSON.stringify(change));
});
await test('Berlin days follow midnight and both DST transitions',async()=>{
 const mod=await import(pathToFileURL(resolve('output/statistics/tests/worker.mjs')));assert.equal(typeof mod.berlinDay,'function');for(const[iso,want]of[['2026-03-28T23:30:00Z','2026-03-29'],['2026-03-29T01:30:00Z','2026-03-29'],['2026-10-25T00:30:00Z','2026-10-25'],['2026-10-25T01:30:00Z','2026-10-25'],['2026-10-27T23:00:00Z','2026-10-28'],['2026-06-01T22:00:00Z','2026-06-02']])assert.equal(mod.berlinDay(Date.parse(iso)),want);
});
DB.close();const result={status:failures.length?'FAIL':'PASS',passed,failures};writeFileSync(`output/statistics/tests/${process.argv.includes('--red')?'red':'result'}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;

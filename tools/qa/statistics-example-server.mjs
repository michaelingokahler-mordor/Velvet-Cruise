// Local-only same report shell and real protected Worker route, synthetic rows.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { testDatabase } from './online-test-db.mjs';
mkdirSync('output/statistics/example',{recursive:true});
await build({entryPoints:['server/worker.ts','server/stats-report.ts'],outdir:'output/statistics/example',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const worker=(await import(pathToFileURL(resolve('output/statistics/example/worker.mjs')))).default;
const {reportHtml}=await import(pathToFileURL(resolve('output/statistics/example/stats-report.mjs')));
const DB=testDatabase(readFileSync('server/migrations/0001_rankings.sql','utf8')+readFileSync('server/migrations/0002_statistics.sql','utf8'));
for(const[day,loads,starts]of[['2026-10-22',52,89],['2026-10-23',64,112],['2026-10-24',81,146],['2026-10-25',104,191],['2026-10-26',72,125],['2026-10-27',93,164],['2026-10-28',41,68]])await DB.prepare('INSERT INTO statistics_daily(day,game_loaded,run_start) VALUES(?,?,?)').bind(day,loads,starts).run();
const key='synthetic-example-key-only-0123456789';
const env={DB,ALLOWED_ORIGINS:'',STATS_REPORT_SECRET:key};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:4194');if(!['/stats/','/stats','/stats/report'].includes(url.pathname)){res.writeHead(404);res.end();return;}const response=url.pathname!='/stats/report'?new Response(reportHtml('local-example',true),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}):await worker.fetch(new Request(url,{headers:req.headers}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local example error');}});
server.listen(4194,'127.0.0.1',()=>console.log(`SYNTHETIC LOCAL EXAMPLE http://127.0.0.1:4194/stats/\nExample key (not a production secret): ${key}\nExample date range: 2026-10-22 through 2026-10-28`));

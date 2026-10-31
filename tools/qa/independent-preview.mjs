// Local-only browser acceptance fixture. Never forwards requests to production.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {testDatabase} from './online-test-db.mjs';
const root=path.resolve(process.argv[2]||'output/independent-runtime/web-v1');
await fs.mkdir('output/independent-runtime/preview',{recursive:true});
await build({entryPoints:['server/worker.ts'],outfile:'output/independent-runtime/preview/worker.mjs',bundle:true,platform:'node',format:'esm'});
const worker=(await import(pathToFileURL(path.resolve('output/independent-runtime/preview/worker.mjs')))).default;
const DB=testDatabase(await fs.readFile('server/migrations/0001_rankings.sql','utf8'));
for(const[name,score]of[['LOCAL-A',24000],['LOCAL-B',12345]]){
 const id=crypto.randomUUID();await DB.prepare('INSERT INTO profiles(id,display_name,token_hash,created_at) VALUES(?,?,?,?)').bind(id,name,'fixture',Date.now()).run();
 await DB.prepare('INSERT INTO scores(profile_id,board,score,achieved_at) VALUES(?,?,?,?)').bind(id,'score-normal-tour2',score,Date.now()).run();
}
const calls=[];
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4198');
  if(url.pathname==='/online.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({apiBase:url.origin}));return;}
  if(url.pathname==='/__qa'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({calls,productionForwarding:false}));return;}
  if(/^\/(health|profile|profiles|scores\/|stats\/)/.test(url.pathname)){
   calls.push({path:url.pathname,method:req.method});const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const response=await worker.fetch(new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),{DB,ALLOWED_ORIGINS:url.origin,STATS_ALLOWED_ORIGIN:'https://invalid.fixture'});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))throw Error('outside fixture');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(await fs.readFile(file));
 }catch{res.statusCode=404;res.end('Fixture resource missing');}
});
server.listen(4198,'127.0.0.1',()=>console.log('Local acceptance fixture: http://127.0.0.1:4198/'));

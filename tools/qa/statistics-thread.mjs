import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
const worker=(await import(pathToFileURL(workerData.bundle))).default;
const sqlite=new DatabaseSync(workerData.database);sqlite.exec('PRAGMA busy_timeout=15000');
const DB={prepare(sql){let values=[];return{bind(...args){values=args;return this;},async run(){return sqlite.prepare(sql).run(...values);},async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return{results:sqlite.prepare(sql).all(...values)};}};}};
const env={DB,ALLOWED_ORIGINS:'https://sabnockworks.com',STATS_ALLOWED_ORIGIN:'https://sabnockworks.com'};
parentPort.postMessage('ready');await new Promise(r=>parentPort.once('message',r));
const statuses=[];
for(let i=0;i<20;i++){const event=i<15?workerData.shared:{id:crypto.randomUUID(),timestamp:Date.now(),type:'run_start'};const response=await worker.fetch(new Request('https://worker.test/stats/events',{method:'POST',headers:{Origin:'https://sabnockworks.com','Content-Type':'application/json'},body:JSON.stringify(event)}),env);statuses.push(response.status);}
sqlite.close();parentPort.postMessage(statuses);

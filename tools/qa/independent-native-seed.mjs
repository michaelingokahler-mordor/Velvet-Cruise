import { app, BrowserWindow, protocol } from 'electron';
import fs from 'node:fs';
const flag = key => process.argv[process.argv.indexOf(key)+1];
const config = JSON.parse(fs.readFileSync(flag('--seed-config'),'utf8'));
app.setPath('userData',config.profile);
protocol.registerSchemesAsPrivileged([{scheme:'prior-game',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.whenReady().then(async()=>{
 protocol.handle('prior-game',()=>new Response('<!doctype html><title>Neutral storage fixture</title>',{headers:{'content-type':'text/html'}}));
 const win = new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 await win.loadURL('prior-game://game-20261009-93986676/');
 await win.webContents.executeJavaScript(`Object.entries(${JSON.stringify(config.entries)}).forEach(([k,v])=>localStorage.setItem(k,v))`);
 if(config.compact) for(let batch=0;batch<8;batch++) {
   await win.webContents.executeJavaScript(`for(let i=0;i<1000;i++)localStorage.setItem('foreign.compaction.'+i,${JSON.stringify(String.fromCharCode(65))}.repeat(1999)+${JSON.stringify(String(batch))})`);
   win.webContents.session.flushStorageData();
   await new Promise(resolve=>setTimeout(resolve,500));
 }
 win.webContents.session.flushStorageData();
 if(config.hold) {
  fs.writeFileSync(config.ready,'ready');
  while(!fs.existsSync(config.release))await new Promise(resolve=>setTimeout(resolve,100));
 }
 win.destroy(); app.quit();
}).catch(()=>app.exit(1));

import { app, BrowserWindow, ipcMain, Menu, protocol, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { discoverProfiles, gameKey, mergeStorage, snapshotProfile } from './storage-migration.mjs';
import { scheme, privileges, gameHandler } from './protocol.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const automated = process.argv.some(arg => /^--remote-debugging-(port|pipe)(=|$)|^--headless(=|$)/.test(arg));
const flag = key => { const index = process.argv.indexOf(key); return index < 0 ? '' : (process.argv[index + 1] || ''); };
const readerFile = flag('--storage-reader');
const reader = readerFile ? JSON.parse(fs.readFileSync(readerFile,'utf8')) : null;
app.setName('Velvet Cruise');
const game = path.resolve(flag('--game') || path.join(process.resourcesPath,'game'));
const metadata = reader ? { gameId: 'reader' } : JSON.parse(fs.readFileSync(path.join(game,'index.html'),'utf8').match(/<script[^>]*id="velvet-runtime"[^>]*>([\s\S]*?)<\/script>/i)?.[1] || '{}');
if (!/^[a-z0-9-]+$/.test(metadata.gameId)) throw new Error('Desktop game identity missing or invalid.');
const data = path.resolve(reader?.profile || flag('--user-data-dir') || path.join(app.getPath('appData'),'Velvet Cruise','profiles',metadata.gameId));
app.setPath('userData', data);
if (!reader && !app.requestSingleInstanceLock()) app.exit(0);
const candidates = reader ? [] : discoverProfiles({ roots:[flag('--legacy-profile-root') || app.getPath('appData')], gameId:metadata.gameId, exclude:data });
const schemes = new Set([scheme,...(reader ? [new URL(reader.origin).protocol.slice(0,-1)] : [])]);
protocol.registerSchemesAsPrivileged([...schemes].filter(s => !['http','https','file'].includes(s)).map(s => ({scheme:s,privileges})));
async function readPrevious(candidate) {
  const temporary = fs.mkdtempSync(path.join(data,'legacy-import-'));
  try {
    const profile = path.join(temporary,'profile');
    snapshotProfile(candidate.profile, profile);
    const config = path.join(temporary,'request.json'), result = path.join(temporary,'result.json');
    fs.writeFileSync(config,JSON.stringify({profile,origin:candidate.origin,result}));
    await new Promise((resolve,reject) => {
      const child = spawn(process.execPath,['--storage-reader',config],{stdio:'ignore',windowsHide:true});
      const timeout = setTimeout(() => { child.kill(); reject(new Error('Previous storage reader timed out.')); },20000);
      child.once('error',error => { clearTimeout(timeout); reject(error); });
      child.once('exit',code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error('Previous storage reader failed.')); });
    });
    return JSON.parse(fs.readFileSync(result,'utf8'));
  } finally {
    if (temporary.startsWith(data + path.sep + 'legacy-import-')) fs.rmSync(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
}
app.whenReady().then(async () => {
  if (reader) {
    const parsed = new URL(reader.origin);
    protocol.handle(parsed.protocol.slice(0,-1),() => new Response('<!doctype html><title>Storage import</title>',{headers:{'content-type':'text/html'}}));
    const hidden = new BrowserWindow({show:false,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false}});
    await hidden.loadURL(reader.origin + '/');
    const entries = await hidden.webContents.executeJavaScript(`Object.fromEntries(Object.keys(localStorage).filter(${gameKey.toString()}).map(key=>[key,localStorage.getItem(key)]))`);
    fs.writeFileSync(reader.result,JSON.stringify(entries));
    hidden.destroy(); app.quit(); return;
  }
  const origin = `${scheme}://${metadata.gameId}`;
  protocol.handle(scheme,gameHandler(game,origin));
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([
    {label:'Velvet Cruise',submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},
    {label:'View',submenu:[{role:'togglefullscreen'}]},
    {role:'windowMenu'},
  ]) : null);
  const window = new BrowserWindow({title:'Velvet Cruise',width:1280,height:720,minWidth:640,minHeight:360,show:false,fullscreen:true,autoHideMenuBar:true,webPreferences:{preload:path.join(here,'preload.cjs'),additionalArguments:automated?['--velvet-automation']:[],contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true}});
  const external = url => { try { if (['https:','http:'].includes(new URL(url).protocol)) void shell.openExternal(url); } catch {} };
  window.webContents.setWindowOpenHandler(({url}) => { external(url); return {action:'deny'}; });
  let initialize = async () => {};
  let gameStarted = false, initializing = false;
  window.webContents.on('will-navigate',(event,url) => {
    if (!gameStarted && [origin+'/__retry__',origin+'/__continue__'].includes(url)) {event.preventDefault();void initialize(url.endsWith('/__continue__'));return;}
    if (!url.startsWith(origin + '/')) { event.preventDefault(); external(url); }
  });
  window.webContents.on('will-attach-webview',event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
  window.webContents.on('before-input-event',(event,input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    if (input.alt && input.key === 'Enter') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
  });
  ipcMain.handle('velvet:quit',event => { if (event.sender !== window.webContents || !event.senderFrame?.url.startsWith(origin + '/')) throw new Error('Invalid native caller.'); setImmediate(() => app.quit()); return true; });
  initialize = async (allowSkip = false) => {
  if(initializing || gameStarted)return;
  initializing=true;
  await window.loadURL(origin + '/__startup__');
  let failures=0;
  const pendingImports=[];
  const defer = async () => {
    await window.webContents.executeJavaScript(`document.body.innerHTML='<main style="font:20px system-ui;max-width:650px;margin:10vh auto;padding:24px;color:#eef;background:#152236"><h1>Saved data needs another try</h1><p>Close any previous copy of Velvet Cruise, then retry. Your previous saved data is retained. The game has not started or written new preferences.</p><p><a style="color:#9ef" href="/__retry__">Retry saved-data import</a></p><p><a style="color:#9ef" href="/__continue__">Continue with this profile</a> (existing values take priority during future imports).</p></main>';document.body.style.background='#081526'`);
    initializing=false;window.show();
  };
  for (const candidate of candidates) {
    const marker = 'velvet-runtime.import-v1.' + candidate.id;
    if (await window.webContents.executeJavaScript(`localStorage.getItem(${JSON.stringify(marker)}) !== null`)) continue;
    try {
      const entries = await readPrevious(candidate);
      if (!Object.keys(entries).some(gameKey)) throw new Error('No readable previous game data.');
      pendingImports.push({marker,entries});
    } catch { failures++; process.stderr.write('Previous game storage is unavailable; import will retry next launch.\n');if(!allowSkip)break; }
  }
  if(failures && !allowSkip) {
    await defer();return;
  }
  // Do not write older snapshots when a newer source was unavailable. Retry
  // must still allow the newer source to populate an untouched destination.
  for(const {marker,entries} of pendingImports) {
    try {
    await window.webContents.executeJavaScript(`(() => { const gameKey = ${gameKey.toString()}; const result = (${mergeStorage.toString()})(localStorage,${JSON.stringify(entries)}); localStorage.setItem(${JSON.stringify(marker)},'complete'); return result; })()`);
    window.webContents.session.flushStorageData();
    } catch {if(allowSkip)continue;await defer();return;}
  }
  gameStarted=true;
  await window.loadURL(origin + '/');
  window.show();
  initializing=false;
  };
  await initialize();
  app.on('second-instance',() => { if (window.isMinimized()) window.restore(); window.focus(); });
}).catch(error => { process.stderr.write(`Desktop startup failed: ${error.stack || error}\n`); app.exit(1); });
app.on('window-all-closed',() => app.quit());

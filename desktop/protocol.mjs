import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
export const scheme = 'velvet-game';
export const privileges = { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true };
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav', '.wasm':'application/wasm', '.mp4':'video/mp4' };
export function gameHandler(root, origin) {
  const rootPath = fs.realpathSync(root);
  return async request => {
    const url = new URL(request.url);
    if (`${url.protocol}//${url.host}` !== origin) return new Response('Not found', { status: 404 });
    if (!['GET','HEAD'].includes(request.method)) return new Response('', { status:405 });
    if (url.pathname === '/__startup__') return new Response('<!doctype html><title>Velvet Cruise</title>', { headers:{'content-type':'text/html'} });
    let file;
    try {
      file = fs.realpathSync(path.resolve(rootPath, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
      if (!file.startsWith(rootPath + path.sep)) return new Response('', { status:403 });
      if (!fs.statSync(file).isFile()) return new Response('', { status:404 });
    } catch { return new Response('', { status:404 }); }
    const size = fs.statSync(file).size;
    const headers = { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'accept-ranges':'bytes', 'x-content-type-options':'nosniff' };
    let start = 0, end = size - 1, status = 200;
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
    if (range && (range[1] || range[2])) {
      start = range[1] ? Number(range[1]) : Math.max(0,size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(end, Number(range[2])) : end;
      if (start > end || start >= size) return new Response(null,{status:416,headers:{'content-range':`bytes */${size}`}});
      status = 206; headers['content-range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['content-length'] = String(Math.max(0,end-start+1));
    return new Response(request.method === 'HEAD' || !size ? null : Readable.toWeb(fs.createReadStream(file,{start,end})),{status,headers});
  };
}

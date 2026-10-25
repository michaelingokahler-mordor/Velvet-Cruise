import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { build } from 'esbuild';

const root = resolve(process.argv[3] || 'dist');
const apiBase = process.argv[2] || 'http://127.0.0.1:8789';
const { outputFiles } = await build({ stdin: { contents: "export * from './src/platform/tesana'; export * from './src/platform/online-scores'; export * from './src/game/arcade';", resolveDir: resolve(process.argv[4] || '.'), loader: 'ts' }, bundle: true, platform: 'browser', format: 'esm', write: false, define: { __DEMO_A__: 'false', 'import.meta.env.VITE_LOCAL_SERVICES': '"true"' } });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.wasm': 'application/wasm' };
createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1:4187').pathname);
  response.setHeader('Cache-Control', 'no-store');
  if (path === '/online.json') { response.setHeader('Content-Type', 'application/json'); return response.end(JSON.stringify({ apiBase })); }
  if (path === '/__qa/rankings.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(outputFiles[0].contents); }
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (relative(root, file).startsWith('..') || !existsSync(file) || !statSync(file).isFile()) { response.statusCode = 404; return response.end(); }
  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  response.end(readFileSync(file));
}).listen(4187, '127.0.0.1', () => console.log(`QA game http://127.0.0.1:4187/ -> ${apiBase}`));

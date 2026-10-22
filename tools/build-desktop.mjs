// Combine a fresh game build with the supplied desktop shell. The native
// executable, app identity, storage keys and platform scripts stay intact.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
const built = resolve('dist'), shell = resolve('desktop-export');
const out = resolve(process.argv[2] || 'output/palm-cove/desktop-game');
if (out === shell || out === built) throw new Error('Choose a separate output directory.');
if (!existsSync(resolve(built, 'index.html'))) throw new Error('Run npm run build first.');
mkdirSync(out, { recursive: true });
// Copy support files individually, excluding stale JavaScript bundles.
for (const name of ['tesana-shell.js','tesana-desktop.js','tesana-play.js']) cpSync(resolve(shell,name),resolve(out,name));
for (const name of ['assets','_app','decoders']) if (existsSync(resolve(built,name))) cpSync(resolve(built,name),resolve(out,name),{recursive:true});
const html = readFileSync(resolve(built,'index.html'),'utf8');
const moduleScript = html.match(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/)?.[0];
if (!moduleScript) throw new Error('Built module script missing.');
let desktop = readFileSync(resolve(shell,'index.html'),'utf8')
  .replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/,moduleScript)
  .replace(/\s*<link rel="modulepreload"[^>]*>/g,'');
const files = {};
const walk = dir => { for (const name of readdirSync(dir)) { const p=resolve(dir,name); if(statSync(p).isDirectory()) walk(p); else files[relative(out,p).replaceAll('\\','/')]=statSync(p).size; } };
const entry = moduleScript.match(/src="\.\/([^"]+)"/)[1];
const version = 'palm-cove-'+createHash('sha256').update(readFileSync(resolve(out,entry))).digest('hex').slice(0,12);
desktop = desktop.replace(/name="tesana-build" content="[^"]+"/,`name="tesana-build" content="${version}"`);
writeFileSync(resolve(out,'index.html'),desktop);
walk(out); delete files['build_manifest.json'];
writeFileSync(resolve(out,'build_manifest.json'),JSON.stringify({build_version:version,game_name:'game-20261009-93986676',built_at:new Date().toISOString(),runtime:'web',files},null,2));
console.log(JSON.stringify({output:out,version,files:Object.keys(files).length},null,2));

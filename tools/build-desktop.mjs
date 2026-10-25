// Combine a fresh game build with the supplied desktop shell. The native
// executable and platform scripts stay intact. --demo-a uses its own identity.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
const sourceIndex = process.argv.indexOf('--source');
const built = resolve(sourceIndex < 0 ? 'dist' : process.argv[sourceIndex + 1]), shell = resolve('desktop-export');
const demo = process.argv.includes('--demo-a');
const gameId = 'game-20261009-93986676' + (demo ? '-demo-a' : '');
const out = resolve(process.argv[2] || 'output/palm-cove/desktop-game');
if (out === shell || out === built) throw new Error('Choose a separate output directory.');
if (!existsSync(resolve(built, 'index.html'))) throw new Error('Run npm run build first.');
mkdirSync(out, { recursive: true });
// Remove only previously generated, unreferenced chunks from this output's
// manifest. Never recursively remove an output folder or any support assets.
const previous=resolve(out,'build_manifest.json');
if (existsSync(previous)) {
  const files=JSON.parse(readFileSync(previous,'utf8')).files ?? {};
  for(const name of Object.keys(files)) if(/^_app\/[^/]+\.js$/.test(name) && !existsSync(resolve(built,name))) {
    const target=resolve(out,name);
    if(!target.startsWith(resolve(out,'_app')+sep)) throw new Error('Chunk outside output folder.');
    if(existsSync(target)) unlinkSync(target);
  }
}
// Copy support files individually, excluding stale JavaScript bundles.
for (const name of ['tesana-shell.js','tesana-desktop.js','tesana-play.js']) cpSync(resolve(shell,name),resolve(out,name));
for (const name of ['assets','_app','decoders']) if (existsSync(resolve(built,name))) cpSync(resolve(built,name),resolve(out,name),{recursive:true});
const html = readFileSync(resolve(built,'index.html'),'utf8');
if (demo !== /name="velvet-edition" content="demo-a"/.test(html)) throw new Error('Game edition and desktop edition do not match.');
const moduleScript = html.match(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/)?.[0];
if (!moduleScript) throw new Error('Built module script missing.');
let desktop = readFileSync(resolve(shell,'index.html'),'utf8')
  .replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/,moduleScript)
  .replace(/\s*<link rel="modulepreload"[^>]*>/g,'');
desktop = desktop.replace('</head>', `<meta name="velvet-edition" content="${demo ? 'demo-a' : 'full'}">\n</head>`);
if (demo) desktop = desktop.replaceAll('game-20261009-93986676', gameId).replaceAll('Velvet Cruise', 'Velvet Cruise Demo');
const files = {};
const walk = dir => { for (const name of readdirSync(dir)) { const p=resolve(dir,name); if(statSync(p).isDirectory()) walk(p); else files[relative(out,p).replaceAll('\\','/')]=statSync(p).size; } };
const entry = moduleScript.match(/src="\.\/([^"]+)"/)[1];
const version = (process.argv[3] || 'palm-cove')+'-'+createHash('sha256').update(readFileSync(resolve(out,entry))).digest('hex').slice(0,12);
desktop = desktop.replace(/name="tesana-build" content="[^"]+"/,`name="tesana-build" content="${version}"`);
writeFileSync(resolve(out,'index.html'),desktop);
walk(out); delete files['build_manifest.json'];
writeFileSync(resolve(out,'build_manifest.json'),JSON.stringify({build_version:version,game_name:gameId,edition:demo ? 'demo-a' : 'full',built_at:new Date().toISOString(),runtime:'web',files},null,2));
console.log(JSON.stringify({output:out,version,files:Object.keys(files).length},null,2));

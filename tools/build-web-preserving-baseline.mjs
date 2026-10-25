// Publish only the online-service change on the previously released web game.
// This intentionally keeps its legacy arcade/stage keys and driving rules.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = '466be890ecd3360c0064d53462c95a72f1fc386b';
const source = resolve(root, 'output/web-baseline/source');
const output = resolve(root, 'output/web-baseline/dist');
if (!relative(root, source).startsWith('output') || !relative(root, output).startsWith('output')) throw new Error('Build paths must stay inside output');
mkdirSync(source, { recursive: true });
const archive = spawn('git', ['archive', '--format=tar', baseline], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
const extract = spawn('tar', ['-xf', '-', '-C', source], { cwd: root, stdio: ['pipe', 'inherit', 'inherit'] });
archive.stdout.pipe(extract.stdin);
await Promise.all([archive, extract].map(child => new Promise((accept, reject) => {
  child.on('error', reject);
  child.on('close', code => code === 0 ? accept() : reject(new Error(`Archive extraction exited ${code}`)));
})));

for (const path of ['src/platform/tesana.ts', 'src/platform/online-scores.ts', 'src/platform/ranking-contract.ts', 'src/game/edition.ts', 'assets/ui/boards.json', 'public/online.json']) {
  mkdirSync(dirname(resolve(source, path)), { recursive: true });
  copyFileSync(resolve(root, path), resolve(source, path));
}
const arcadePath = resolve(source, 'src/game/arcade.ts');
let arcade = readFileSync(arcadePath, 'utf8');
const hook = '  try { localStorage.setItem(NAME_KEY, n); } catch { /* storage blocked */ }';
if (arcade.split(hook).length !== 2) throw new Error('The released name-entry hook changed');
arcade = "import { renameOnlinePlayer } from '../platform/online-scores';\n" + arcade.replace(hook, hook + '\n  void renameOnlinePlayer();');
writeFileSync(arcadePath, arcade);
if (!existsSync(resolve(source, 'node_modules'))) symlinkSync(resolve(root, 'node_modules'), resolve(source, 'node_modules'), 'junction');
execFileSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'standalone', '--outDir', output], { cwd: source, stdio: 'inherit' });
const html = readFileSync(resolve(output, 'index.html'), 'utf8');
const entry = html.match(/src="\.\/(_app\/[^"/]+\.js)"/)?.[1];
if (!entry || html.includes('data-tesana-bootstrap')) throw new Error('Invalid standalone web output');
writeFileSync(resolve(output, 'build-info.json'), JSON.stringify({ source: 'michaelingokahler-mordor/Velvet-Cruise', commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), webBaseline: baseline, modified: false, edition: 'standalone', entry, onlineApi: JSON.parse(readFileSync(resolve(root, 'public/online.json'), 'utf8')).apiBase }, null, 2) + '\n');
console.log(`Web game preserved at ${baseline}; online-service code from the current source; output ${output}`);

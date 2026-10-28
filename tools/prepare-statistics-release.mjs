// Prepare a reviewable website candidate. Never writes to the website checkout.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve('.');
const source = resolve('output/statistics/web');
if (!existsSync(join(source, 'index.html'))) throw Error('Build output/statistics/web first.');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (dirty) throw Error('Commit the reviewed sources before preparing the release.');
const release = `2026-10-28-${commit.slice(0, 7)}-statistics`;
const game = resolve('output/statistics/site/games/more-projects/velvet-cruise');
const destination = join(game, 'releases', release);
if (existsSync(destination)) throw Error('Candidate exists; inspect it instead of overwriting.');
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
const html = readFileSync(join(source, 'index.html'), 'utf8');
writeFileSync(join(game, 'index.html'), html.replace('<head>', `<head>\n<base href="./releases/${release}/">`));
writeFileSync(join(destination, 'build-info.json'), JSON.stringify({
  source: 'michaelingokahler-mordor/Velvet-Cruise', commit, sourceClean: true,
  edition: 'standalone', release, ruleset: 'tour2',
  onlineApi: 'https://velvet-cruise-api.emerald-hollows.workers.dev',
  status: 'prepared; not published', builtAt: new Date().toISOString(),
}, null, 2) + '\n');
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push({ path: relative(game, file).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(file)).digest('hex') });
  }
}
walk(game);
writeFileSync(resolve('output/statistics/site-manifest.json'), JSON.stringify({ commit, release, files }, null, 2) + '\n');
console.log(JSON.stringify({ release, candidate: relative(root, game), files: files.length, published: false }, null, 2));

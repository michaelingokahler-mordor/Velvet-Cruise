// Default: show checked commands. --push explicitly uploads the three builds.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const options = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (!['--release', '--project', '--butler', '--push'].includes(key) || options.has(key)) throw Error('Unknown or duplicate argument: ' + key);
  if (key === '--push') options.set(key, true);
  else {
    const value = process.argv[++i];
    if (!value || value.startsWith('--')) throw Error('Missing value for ' + key);
    options.set(key, value);
  }
}
if (!options.get('--release')) throw Error('Pass --release <delivery-directory>. Default behavior is a dry run; --push uploads.');
const root = path.resolve(options.get('--release'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
const project = options.get('--project') || manifest.project;
if (!/^[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9_-]*$/.test(project)) throw Error('Use an itch project in account/game form.');
if (manifest.schema !== 1 || manifest.gameId !== 'game-20261009-93986676' || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw Error('Invalid release manifest.');
const channels = ['windows-x64', 'macos-arm64', 'macos-x64'];
if (!Array.isArray(manifest.builds) || manifest.builds.length !== 3 || channels.some((channel, i) => manifest.builds[i].channel !== channel)) throw Error('All three stable release channels are required.');
const localButler = path.resolve('output/itch-tools/butler/butler.exe');
const butler = options.get('--butler') || (process.platform === 'win32' && fs.existsSync(localButler) ? localButler : 'butler');
const filenames = new Set();
const commands = manifest.builds.map(build => {
  if (typeof build.file !== 'string' || path.basename(build.file) !== build.file || !build.file.endsWith('.zip') || filenames.has(build.file)) throw Error('Invalid release filename.');
  filenames.add(build.file);
  const file = path.join(root, build.file), stat = fs.statSync(file);
  const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (!stat.isFile() || stat.size !== build.bytes || hash !== build.sha256) throw Error('Release checksum mismatch: ' + build.file);
  return { executable: butler, args: ['push', file, project + ':' + build.channel, '--userversion', manifest.version] };
});
const push = options.has('--push');
console.log(JSON.stringify({ dryRun: !push, version: manifest.version, project, commands }, null, 2));
if (push) {
  for (const command of commands) {
    const result = spawnSync(command.executable, command.args, { stdio: 'inherit', windowsHide: true });
    if (result.error || result.status !== 0) throw Error('Butler upload stopped: ' + (result.error?.message || 'exit ' + result.status) + '. Re-run the same release after resolving the error.');
  }
}

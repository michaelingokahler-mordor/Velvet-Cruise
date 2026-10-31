// Build game-owned Mac applications from official Electron distributions.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const flag = key => { const index = process.argv.indexOf(key); return index < 0 ? '' : process.argv[index + 1]; };
const game = path.resolve(flag('--game') || 'output/macos-release/desktop-game');
const arch = flag('--arch') || process.arch;
const out = path.resolve(flag('--out') || `output/macos-release/${arch}`);
if (!['arm64', 'x64'].includes(arch)) throw Error('Choose arm64 or x64.');
if (fs.existsSync(out) || out === game || out.startsWith(game + path.sep) || game.startsWith(out + path.sep)) throw Error('Choose a fresh output directory separate from the game payload.');
const html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const metadata = JSON.parse(html.match(/<script[^>]*id="velvet-runtime"[^>]*>([\s\S]*?)<\/script>/)?.[1] || '{}');
if (metadata.target !== 'desktop' || metadata.gameId !== 'game-20261009-93986676') throw Error('A full desktop game payload is required.');
fs.mkdirSync(out, { recursive: true });
const application = path.join(out, 'application'), payload = path.join(out, 'game');
fs.cpSync(path.resolve('desktop'), application, { recursive: true });
fs.writeFileSync(path.join(application, 'package.json'), JSON.stringify({ name: 'velvet-cruise-runtime', version: '0.1.0', type: 'module', main: 'main.mjs', private: true }, null, 2));
fs.cpSync(game, payload, { recursive: true });
if (process.argv.includes('--prepare-only')) {
  console.log(JSON.stringify({ application, payload, arch }));
} else {
  if (process.platform !== 'darwin') throw Error('Mac packaging/signature verification must run on macOS. Use --prepare-only for local preparation checks.');
  const iconset = path.join(out, 'VelvetCruise.iconset'); fs.mkdirSync(iconset);
  const png = path.join(out, 'icon.png');
  execFileSync('/usr/bin/sips', ['-s', 'format', 'png', path.resolve('assets/ui/app_icon.webp'), '--out', png], { stdio: 'ignore' });
  for (const size of [16, 32, 128, 256, 512]) for (const scale of [1, 2]) {
    execFileSync('/usr/bin/sips', ['-z', String(size * scale), String(size * scale), png, '--out', path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)], { stdio: 'ignore' });
  }
  const icon = path.join(out, 'VelvetCruise.icns');
  execFileSync('/usr/bin/iconutil', ['-c', 'icns', '-o', icon, iconset]);
  const { packager } = await import('@electron/packager');
  const paths = await packager({ dir: application, name: 'Velvet Cruise', executableName: 'Velvet Cruise', platform: 'darwin', arch,
    electronVersion: '45.2.1', out: path.join(out, 'bundles'), overwrite: false, asar: false, prune: false,
    appBundleId: 'com.sabnockworks.velvetcruise', helperBundleId: 'com.sabnockworks.velvetcruise.helper',
    appVersion: '0.1.0', buildVersion: '2026.10.31', appCategoryType: 'public.app-category.racing-games',
    icon, extraResource: [payload], darwinDarkModeSupport: true,
  });
  if (paths.length !== 1) throw Error('Expected one Mac application.');
  const app = path.join(paths[0], 'Velvet Cruise.app');
  execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' });
  const zip = path.join(out, `Velvet-Cruise-macOS-${arch}-2026-10-31.zip`);
  execFileSync('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, zip]);
  const result = { app, archive: zip, arch, electronVersion: '45.2.1', gameId: metadata.gameId, bundleId: 'com.sabnockworks.velvetcruise', signing: 'ad-hoc', notarized: false, archiveSha256: createHash('sha256').update(fs.readFileSync(zip)).digest('hex'), bytes: fs.statSync(zip).size };
  fs.writeFileSync(path.join(out, 'release.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

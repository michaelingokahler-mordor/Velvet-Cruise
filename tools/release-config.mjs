import fs from 'node:fs';

export const releaseVersion = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version;
if (!/^\d+\.\d+\.\d+$/.test(releaseVersion)) throw Error('A numeric major.minor.patch release version is required.');
export const gameId = 'game-20261009-93986676';
export const channels = Object.freeze({ windows: 'windows-x64', arm64: 'macos-arm64', x64: 'macos-x64' });
export function releaseInfo(platform, arch) {
  return { game: 'Velvet Cruise', gameId, version: releaseVersion, edition: 'full', platform, arch,
    channel: platform === 'windows' ? channels.windows : channels[arch] };
}
export function itchManifest(platform) {
  const target = platform === 'windows' ? 'Velvet Cruise.exe' : 'Velvet Cruise.app';
  return `[[actions]]\nname = "play"\npath = "${target}"\n`;
}

"""Collect checked Full packages without extracting or changing signed Mac ZIPs."""
from pathlib import Path
import argparse
import hashlib
import json
import plistlib
import re
import shutil
import struct
import tomllib
import zipfile

REPO = Path(__file__).resolve().parents[1]
GAME_ID = 'game-20261009-93986676'


def check_common(read, version, platform, arch):
    prefix = 'resources/' if platform == 'windows' else 'Velvet Cruise.app/Contents/Resources/'
    target = 'Velvet Cruise.exe' if platform == 'windows' else 'Velvet Cruise.app'
    info = json.loads(read('RELEASE-INFO.json'))
    channel = 'windows-x64' if platform == 'windows' else 'macos-' + arch
    expected = dict(game='Velvet Cruise', gameId=GAME_ID, version=version, edition='full', platform=platform, arch=arch, channel=channel)
    if info != expected:
        raise ValueError('Incorrect release metadata: ' + platform + '/' + arch)
    if tomllib.loads(read('.itch.toml').decode('utf-8')) != {'actions': [{'name': 'play', 'path': target}]}:
        raise ValueError('Incorrect itch launch action')
    if json.loads(read(prefix + 'app/package.json'))['version'] != version:
        raise ValueError('Incorrect runtime version')
    build = json.loads(read(prefix + 'game/build_manifest.json'))
    if build.get('edition') != 'full' or build.get('releaseVersion') != version:
        raise ValueError('A matching Full game build is required')
    html = read(prefix + 'game/index.html').decode('utf-8')
    match = re.search(r'<script[^>]*id="velvet-runtime"[^>]*>(.*?)</script>', html, re.S)
    runtime = json.loads(match[1]) if match else {}
    if runtime != dict(target='desktop', gameId=GAME_ID, version=version) or 'content="demo-e"' in html:
        raise ValueError('Incorrect Full runtime identity or version')
    for notice in ['LICENSE.electron.txt' if platform == 'windows' else 'LICENSE', 'LICENSES.chromium.html']:
        if not read(notice):
            raise ValueError('Missing runtime notice: ' + notice)


def check_windows(directory, version):
    check_common(lambda name: (directory / name).read_bytes(), version, 'windows', 'x64')
    with (directory / 'Velvet Cruise.exe').open('rb') as executable:
        header = executable.read(64)
        if header[:2] != b'MZ' or len(header) < 64:
            raise ValueError('Invalid Windows executable')
        executable.seek(struct.unpack_from('<I', header, 60)[0])
        pe = executable.read(6)
        if pe[:4] != b'PE\0\0' or pe[4:] != struct.pack('<H', 0x8664):
            raise ValueError('Expected Windows x64 executable')


def check_mac(archive_path, version, arch):
    with zipfile.ZipFile(archive_path) as archive:
        if archive.testzip() is not None:
            raise ValueError('Invalid Mac ZIP')
        check_common(archive.read, version, 'macos', arch)
        info = plistlib.loads(archive.read('Velvet Cruise.app/Contents/Info.plist'))
        if info['CFBundleIdentifier'] != 'com.sabnockworks.velvetcruise' or any(
                info[key] != version for key in ['CFBundleVersion', 'CFBundleShortVersionString']):
            raise ValueError('Incorrect Mac bundle version or identity')
        name = 'Velvet Cruise.app/Contents/MacOS/' + info['CFBundleExecutable']
        with archive.open(name) as executable:
            header = executable.read(8)
        if header[:4] != struct.pack('<I', 0xFEEDFACF) or header[4:] != struct.pack('<I', 0x100000C if arch == 'arm64' else 0x1000007):
            raise ValueError('Incorrect Mac CPU architecture: ' + arch)
        if not (archive.getinfo(name).external_attr >> 16) & 0o111:
            raise ValueError('Mac executable permission missing')
        if not any((entry.external_attr >> 16) & 0o170000 == 0o120000 for entry in archive.infolist()):
            raise ValueError('Mac framework symlinks missing')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--windows', type=Path, required=True, help='Prepared Windows application directory')
    parser.add_argument('--mac-arm64', type=Path, required=True)
    parser.add_argument('--mac-x64', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True, help='Fresh delivery directory')
    args = parser.parse_args()
    version = json.loads((REPO / 'package.json').read_text(encoding='utf-8'))['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('A numeric major.minor.patch version is required')
    out, windows = args.out.resolve(), args.windows.resolve()
    if out.exists() or out.is_relative_to(windows):
        raise ValueError('Choose a fresh delivery directory outside the Windows application')
    # Validate the complete batch before creating output or uploading anything.
    check_windows(windows, version)
    check_mac(args.mac_arm64, version, 'arm64')
    check_mac(args.mac_x64, version, 'x64')
    out.mkdir(parents=True)
    win_zip = out / f'Velvet-Cruise-Windows-{version}.zip'
    with zipfile.ZipFile(win_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file in sorted(windows.rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(windows).as_posix())
    for source, arch in [(args.mac_arm64, 'arm64'), (args.mac_x64, 'x64')]:
        shutil.copyfile(source, out / f'Velvet-Cruise-macOS-{arch}-{version}.zip')
    builds = []
    for channel, name in [('windows-x64', win_zip.name),
                          ('macos-arm64', f'Velvet-Cruise-macOS-arm64-{version}.zip'),
                          ('macos-x64', f'Velvet-Cruise-macOS-x64-{version}.zip')]:
        archive = out / name
        builds.append(dict(channel=channel, file=name, bytes=archive.stat().st_size,
                           sha256=hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()))
    manifest = dict(schema=1, game='Velvet Cruise', gameId=GAME_ID, version=version,
                    project='sabnockworks/velvet-cruise', builds=builds)
    (out / 'release.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (out / 'SHA256SUMS.txt').write_text(''.join(f"{item['sha256']}  {item['file']}\n" for item in builds), encoding='utf-8')
    print(json.dumps(dict(output=str(out), **manifest), indent=2))


if __name__ == '__main__':
    main()

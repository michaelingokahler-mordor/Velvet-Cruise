"""Exercise collection and upload preflight with real archives and subprocesses."""
from pathlib import Path
import hashlib
import json
import plistlib
import struct
import subprocess
import sys
import tempfile
import zipfile

repo = Path(__file__).resolve().parents[2]
version = json.loads((repo / 'package.json').read_text())['version']
root = Path(tempfile.mkdtemp(prefix='itch-test-', dir=repo / 'output/itch-release'))
game_id = 'game-20261009-93986676'


def files(platform, arch):
    prefix = 'resources/' if platform == 'windows' else 'Velvet Cruise.app/Contents/Resources/'
    target = 'Velvet Cruise.exe' if platform == 'windows' else 'Velvet Cruise.app'
    info = dict(game='Velvet Cruise', gameId=game_id, version=version, edition='full', platform=platform, arch=arch,
                channel='windows-x64' if platform == 'windows' else 'macos-' + arch)
    metadata = dict(target='desktop', gameId=game_id, version=version)
    return {'.itch.toml': f'[[actions]]\nname = "play"\npath = "{target}"\n'.encode(),
            'RELEASE-INFO.json': json.dumps(info).encode(),
            prefix + 'app/package.json': json.dumps(dict(version=version, main='main.mjs')).encode(),
            prefix + 'game/build_manifest.json': json.dumps(dict(releaseVersion=version, edition='full')).encode(),
            prefix + 'game/index.html': ('<meta name="velvet-edition" content="full"><script id="velvet-runtime">' + json.dumps(metadata) + '</script>').encode(),
            'LICENSE.electron.txt' if platform == 'windows' else 'LICENSE': b'Electron notice',
            'LICENSES.chromium.html': b'Chromium notices'}


windows = root / 'windows'
windows.mkdir()
for name, content in files('windows', 'x64').items():
    dest = windows / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
binary = bytearray(128)
binary[:2] = b'MZ'
struct.pack_into('<I', binary, 60, 64)
binary[64:68] = b'PE\0\0'
struct.pack_into('<H', binary, 68, 0x8664)
(windows / 'Velvet Cruise.exe').write_bytes(binary)


def mac_archive(arch):
    dest = root / (arch + '.zip')
    content = files('macos', arch)
    content['Velvet Cruise.app/Contents/Info.plist'] = plistlib.dumps(dict(
        CFBundleIdentifier='com.sabnockworks.velvetcruise', CFBundleExecutable='Velvet Cruise',
        CFBundleVersion=version, CFBundleShortVersionString=version))
    with zipfile.ZipFile(dest, 'w') as archive:
        for name, data in content.items():
            archive.writestr(name, data)
        executable = zipfile.ZipInfo('Velvet Cruise.app/Contents/MacOS/Velvet Cruise')
        executable.create_system = 3
        executable.external_attr = 0o100755 << 16
        archive.writestr(executable, struct.pack('<II', 0xFEEDFACF, 0x100000C if arch == 'arm64' else 0x1000007))
        link = zipfile.ZipInfo('Velvet Cruise.app/Contents/Frameworks/Test.framework/Versions/Current')
        link.create_system = 3
        link.external_attr = 0o120777 << 16
        archive.writestr(link, b'A')
    return dest


arm, intel = mac_archive('arm64'), mac_archive('x64')
out = root / 'delivery'


def collect(destination, arm_input=arm):
    return subprocess.run([sys.executable, 'tools/prepare-itch-release.py', '--windows', str(windows),
                           '--mac-arm64', str(arm_input), '--mac-x64', str(intel), '--out', str(destination)],
                          cwd=repo, capture_output=True, text=True)


result = collect(out)
assert result.returncode == 0, result.stderr
manifest = json.loads((out / 'release.json').read_text())
assert manifest['version'] == version
assert [item['channel'] for item in manifest['builds']] == ['windows-x64', 'macos-arm64', 'macos-x64']
for source, build in zip([arm, intel], manifest['builds'][1:]):
    assert source.read_bytes() == (out / build['file']).read_bytes(), 'Signed Mac ZIP bytes must stay exact'
for build in manifest['builds']:
    assert hashlib.sha256((out / build['file']).read_bytes()).hexdigest() == build['sha256']
assert collect(out).returncode != 0, 'Existing deliveries cannot be overwritten'
bad = root / 'wrong-arch'
assert collect(bad, intel).returncode != 0
assert not bad.exists(), 'All inputs must be validated before creating delivery'
missing = root / 'missing-archive'
assert collect(missing, root / 'not-downloaded.zip').returncode != 0
assert not missing.exists(), 'A missing architecture cannot create a partial delivery'
payload = windows / 'resources/game/build_manifest.json'
payload.write_text(json.dumps(dict(releaseVersion=version, edition='demo-e')))
assert collect(root / 'demo').returncode != 0, 'Never sell a mislabeled demo'
payload.write_text(json.dumps(dict(releaseVersion=version, edition='full')))


def upload(*extra):
    return subprocess.run(['node', 'tools/itch-release.mjs', '--release', str(out),
                           '--project', 'sabnockworks/velvet-cruise', *extra], cwd=repo, capture_output=True, text=True)


dry = upload()
assert dry.returncode == 0, dry.stderr
plan = json.loads(dry.stdout)
assert plan['dryRun'] is True and len(plan['commands']) == 3
for channel, command in zip(['windows-x64', 'macos-arm64', 'macos-x64'], plan['commands']):
    assert command['args'][-3:] == ['sabnockworks/velvet-cruise:' + channel, '--userversion', version]
assert upload('--project', 'invalid').returncode != 0, 'Invalid project arguments fail closed'
last = out / manifest['builds'][-1]['file']
last.write_bytes(last.read_bytes() + b'changed')
corrupt = upload('--push', '--butler', str(root / 'must-never-run.exe'))
assert corrupt.returncode != 0 and 'checksum' in corrupt.stderr.lower(), 'Validate ALL files before invoking Butler'
print('PASS: full/CPU checks, exact Mac archives, hashes, overwrite protection, stable channels, dry run and corrupt batch rejection')

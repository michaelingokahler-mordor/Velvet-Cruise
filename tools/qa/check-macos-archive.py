from pathlib import Path
import argparse
import hashlib
import json
import plistlib
import struct
import tomllib
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
parser.add_argument('--arch', required=True, choices=['arm64', 'x64'])
parser.add_argument('--report', type=Path)
args = parser.parse_args()
version = json.loads((Path(__file__).resolve().parents[2] / 'package.json').read_text(encoding='utf-8'))['version']
with zipfile.ZipFile(args.archive) as bundle:
    assert bundle.testzip() is None, 'ZIP integrity failed'
    for name in ['LICENSE', 'LICENSES.chromium.html']:
        assert name in bundle.namelist() and len(bundle.read(name)) > 0, 'Runtime notice missing: ' + name
    info = plistlib.loads(bundle.read('Velvet Cruise.app/Contents/Info.plist'))
    assert info['CFBundleShortVersionString'] == version, 'Wrong Mac application version'
    assert info['CFBundleVersion'] == version, 'Wrong Mac build version'
    app_package = json.loads(bundle.read('Velvet Cruise.app/Contents/Resources/app/package.json'))
    assert app_package['version'] == version, 'Wrong runtime package version'
    release = json.loads(bundle.read('RELEASE-INFO.json'))
    assert release['version'] == version and release['arch'] == args.arch and release['edition'] == 'full'
    action = tomllib.loads(bundle.read('.itch.toml').decode('utf-8'))['actions']
    assert action == [{'name': 'play', 'path': 'Velvet Cruise.app'}], 'Incorrect itch launch action'
    executable = 'Velvet Cruise.app/Contents/MacOS/' + info['CFBundleExecutable']
    header = bundle.read(executable)[:32]
    cpu = struct.unpack('<I', header[4:8])[0]
    assert cpu == {'arm64': 0x100000C, 'x64': 0x1000007}[args.arch], 'Wrong binary architecture'
    assert info['CFBundleIdentifier'] == 'com.sabnockworks.velvetcruise'
    assert (bundle.getinfo(executable).external_attr >> 16) & 0o111, 'Executable permission missing'
    links = sum(((entry.external_attr >> 16) & 0o170000) == 0o120000 for entry in bundle.infolist())
    assert links > 0, 'Framework symlinks missing'
result = {'status': 'PASS', 'version': version, 'arch': args.arch, 'archive': str(args.archive), 'sha256': hashlib.sha256(args.archive.read_bytes()).hexdigest(), 'bytes': args.archive.stat().st_size, 'minimumMacOS': info['LSMinimumSystemVersion'], 'bundleId': info['CFBundleIdentifier'], 'symlinks': links, 'runtimeNoticesIncluded': True, 'signing': 'ad-hoc', 'notarized': False}
if args.report:
    args.report.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))

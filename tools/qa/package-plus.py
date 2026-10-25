"""Review packages in a fresh output directory. Original exports stay untouched."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import zipfile


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def verify_plus(game):
    source=Path('assets/plus')
    manifest=json.loads((source/'manifest.json').read_text())
    assert manifest['complete'] is True
    names=['manifest.json']+[p[k] for p in manifest['atlases'] for k in ['image','data']]+[e['file'] for e in manifest['images'].values()]
    for name in names:
        target=game/'assets/plus'/name
        assert target.is_file(),str(target)
        assert digest(target)==digest(source/name),str(target)+' differs from checked artwork'
    return len(names)


def archive(folder,target):
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as package:
        for file in sorted(folder.rglob('*')):
            if file.is_file():package.write(file,file.relative_to(folder.parent).as_posix())
    with zipfile.ZipFile(target) as package:assert package.testzip() is None
    return {'file':target.name,'bytes':target.stat().st_size,'sha256':digest(target)}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--web',required=True,type=Path);parser.add_argument('--desktop',required=True,type=Path)
    parser.add_argument('--template',required=True,type=Path);parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args();out=args.output.resolve()
    if out.exists():raise ValueError('Choose a new package output directory')
    assert (args.template/'Velvet Cruise.exe').is_file()
    assert (args.desktop/'build_manifest.json').is_file()
    web_count=verify_plus(args.web);desktop_count=verify_plus(args.desktop)
    out.mkdir(parents=True)
    web=out/'Velvet-Cruise-Plus-Web';shutil.copytree(args.web,web)
    windows=out/'Velvet-Cruise-Plus-Windows'
    resources=(args.template/'resources').resolve()
    def ignore(path,names):return {'game'} if Path(path).resolve()==resources else set()
    shutil.copytree(args.template,windows,ignore=ignore)
    shutil.copytree(args.desktop,windows/'resources/game')
    assert digest(windows/'Velvet Cruise.exe')==digest(args.template/'Velvet Cruise.exe')
    verify_plus(windows/'resources/game')
    report={'status':'PASS','scope':'Package contents and ZIP CRC/SHA256 only; native launch and physical device checks are separate.',
      'plusFiles':{'web':web_count,'windows':desktop_count},'nativeExecutableSha256':digest(windows/'Velvet Cruise.exe'),
      'packages':[archive(web,out/'Velvet-Cruise-Plus-Web.zip'),archive(windows,out/'Velvet-Cruise-Plus-Windows.zip')]}
    (out/'package-report.json').write_text(json.dumps(report,indent=2))
    (out/'SHA256SUMS.txt').write_text('\n'.join(p['sha256']+'  '+p['file'] for p in report['packages'])+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()

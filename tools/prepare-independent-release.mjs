// Record a clean source revision and archive the reviewed candidates locally.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Commit reviewed sources before preparing release archives.');
const base=path.resolve('output/independent-runtime');
const entries=[['web-final','Velvet-Cruise-Web-2026-10-31.zip','standalone'],['windows-final','Velvet-Cruise-Windows-2026-10-31.zip','desktop']];
const artifacts=[];
for(const[folder,archive,edition]of entries){
 const root=path.join(base,folder),zip=path.join(base,archive);
 if(fs.existsSync(zip))throw Error('Archive already exists: '+zip);
 if(!fs.existsSync(path.join(root,edition==='desktop'?'Velvet Cruise.exe':'index.html')))throw Error('Candidate missing: '+root);
 const metadata={source:'michaelingokahler-mordor/Velvet-Cruise',commit,edition,status:'prepared; not published',date:'2026-10-31',statisticsEnabled:edition==='standalone',storageKeysUnchanged:true};
 fs.writeFileSync(path.join(root,edition==='desktop'?'RELEASE-INFO.json':'build-info.json'),JSON.stringify(metadata,null,2)+'\n');
 const files=[];
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else files.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}}
 walk(root);
 execFileSync('python',['-c',
  'import pathlib,sys,zipfile\nr=pathlib.Path(sys.argv[1]);p=pathlib.Path(sys.argv[2])\nwith zipfile.ZipFile(p,"x",compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:\n for f in sorted(r.rglob("*")):\n  if f.is_file():z.write(f,str(pathlib.Path(r.name)/f.relative_to(r)))\nwith zipfile.ZipFile(p) as z:\n assert z.testzip() is None\n',root,zip],{stdio:'inherit'});
 artifacts.push({edition,root,archive:zip,archiveSha256:createHash('sha256').update(fs.readFileSync(zip)).digest('hex'),bytes:fs.statSync(zip).size,files});
}
fs.writeFileSync(path.join(base,'release-manifest.json'),JSON.stringify({commit,published:false,artifacts},null,2)+'\n');
fs.writeFileSync(path.join(base,'SHA256SUMS.txt'),artifacts.map(a=>a.archiveSha256+'  '+path.basename(a.archive)).join('\n')+'\n');
console.log(JSON.stringify({commit,published:false,artifacts:artifacts.map(({files,...a})=>({...a,fileCount:files.length}))},null,2));

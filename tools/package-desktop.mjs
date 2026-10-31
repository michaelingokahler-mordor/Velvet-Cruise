// Reuse the Electron runtime and icon; set the game's own release metadata.
import fs from 'node:fs';
import path from 'node:path';
import { NtExecutable, NtExecutableResource, Resource } from 'resedit';
import { releaseVersion, gameId, releaseInfo, itchManifest } from './release-config.mjs';
const flag = key => { const i=process.argv.indexOf(key); return i<0 ? '' : process.argv[i+1]; };
const template=path.resolve(flag('--template') || 'D:/Velvet Cruise/WinExe');
const outputRoot=path.resolve('output/independent-runtime');
const generated=fs.existsSync(outputRoot)?fs.readdirSync(outputRoot,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&entry.name.startsWith('desktop-game')).map(entry=>path.join(outputRoot,entry.name)).filter(dir=>fs.existsSync(path.join(dir,'build_manifest.json'))).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs):[];
const game=path.resolve(flag('--game') || generated[0] || 'output/independent-runtime/desktop-game');
const out=path.resolve(flag('--out') || 'output/independent-runtime/windows-'+new Date().toISOString().replace(/[:.]/g,'-'));
if (fs.existsSync(out) || out===template || out.startsWith(template+path.sep)) throw new Error('Use a fresh candidate output outside the installed package.');
const metadata=JSON.parse(fs.readFileSync(path.join(game,'index.html'),'utf8').match(/<script[^>]*id="velvet-runtime"[^>]*>([\s\S]*?)<\/script>/)?.[1] || '{}');
if (metadata.target!=='desktop' || metadata.gameId !== gameId || metadata.version !== releaseVersion) throw new Error('Current-version Full desktop game required.');
fs.mkdirSync(out,{recursive:true});
const excluded = new Set(['resources', 'debug.log', 'INSTALLATION-INFO.json', 'RELEASE-INFO.json', '.itch.toml']);
for(const name of fs.readdirSync(template)) if(!excluded.has(name)) fs.cpSync(path.join(template,name),path.join(out,name),{recursive:true});
const app=path.join(out,'resources','app');
fs.mkdirSync(app,{recursive:true});
fs.cpSync(path.resolve('desktop'),app,{recursive:true});
fs.writeFileSync(path.join(app,'package.json'),JSON.stringify({name:'velvet-cruise-runtime',version:releaseVersion,type:'module',main:'main.mjs',private:true},null,2));
fs.cpSync(game,path.join(out,'resources','game'),{recursive:true});
const exePath = path.join(out, 'Velvet Cruise.exe');
const executable = NtExecutable.from(fs.readFileSync(exePath));
const resources = NtExecutableResource.from(executable);
const versions = Resource.VersionInfo.fromEntries(resources.entries);
if (!versions.length) throw Error('Windows runtime has no version resource.');
for (const version of versions) {
  version.setFileVersion(releaseVersion);
  version.setProductVersion(releaseVersion);
  for (const lang of version.getAllLanguagesForStringValues()) {
    version.setStringValues(lang, { FileVersion: releaseVersion, ProductVersion: releaseVersion,
      ProductName: 'Velvet Cruise', FileDescription: 'Velvet Cruise', CompanyName: 'SabnockWorks' });
  }
  version.outputToResourceEntries(resources.entries);
}
resources.outputResource(executable);
fs.writeFileSync(exePath, Buffer.from(executable.generate()));
fs.writeFileSync(path.join(out, '.itch.toml'), itchManifest('windows'));
fs.writeFileSync(path.join(out, 'RELEASE-INFO.json'), JSON.stringify(releaseInfo('windows', 'x64'), null, 2) + '\n');
console.log(JSON.stringify({output:out,version:releaseVersion,gameId:metadata.gameId,runtime:'Electron',steamIntegration:false}));

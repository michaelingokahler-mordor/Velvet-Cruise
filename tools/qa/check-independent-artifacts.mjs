import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const credits=fs.readFileSync('src/main.ts','utf8').match(/const CREDIT_LINKS = \[([\s\S]*?)\];/)[0];
const attribution=[...credits.matchAll(/text: "([^"]+)", href: "([^"]+)"/g)].at(-1);
const label=attribution[1],url=attribution[2],vendor=label.toLowerCase(),domain=new URL(url).hostname;
// Match an identifier boundary. A substring inside an ordinary translated word
// in Chromium's locale resources is not a reference to a publisher or SDK.
const identifier=new RegExp(`(^|[^a-z])${vendor.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`);
const roots=process.argv.slice(2).map(p=>path.resolve(p));
assert.ok(roots.length,'Pass prepared artifact directories.');
const problems=[],results=[];
for(const root of roots){
 let files=0,creditReferences=0;
 function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name),relative=path.relative(root,file).replaceAll('\\','/');
  if(relative.toLowerCase().includes(vendor))problems.push({file,reason:'former identifier in file path'});
  if(entry.isDirectory()){walk(file);continue;}
  if(!entry.isFile())continue;
  files++;
  const bytes=fs.readFileSync(file);
  let text=bytes.toString('utf8');
  const allow=[`"${label}"`,`'${label}'`,`"${url}"`,`'${url}'`,`"${url}/"`,`'${url}/'`];
  if(relative.endsWith('assets/ui/glossary.json'))allow.push(`"${domain}"`);
  for(const value of allow){creditReferences+=text.split(value).length-1;text=text.replaceAll(value,'');}
  if(identifier.test(text.toLowerCase())||identifier.test(bytes.toString('utf16le').toLowerCase()))problems.push({file,reason:'former identifier outside literal Credits'});
  if(/(?:^|\/)index\.html$/.test(relative)&&/<script[^>]+src="https?:/i.test(text))problems.push({file,reason:'remote script loader'});
 }}
 walk(root);assert.ok(creditReferences>0,'Credits must be present in '+root);results.push({root,files,creditReferences});
}
const result={status:problems.length?'FAIL':'PASS',results,problems};
fs.mkdirSync('output/independent-runtime/tests',{recursive:true});fs.writeFileSync('output/independent-runtime/tests/artifacts.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert.equal(problems.length,0);

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const source=readFileSync('src/main.ts','utf8');
const credits=source.match(/const CREDIT_LINKS = \[([\s\S]*?)\];/)[0];
const attribution=[...credits.matchAll(/text: "([^"]+)", href: "([^"]+)"/g)].at(-1);
assert.ok(attribution,'Credits attribution must remain present');
const vendor=attribution[1].toLowerCase(),domain=new URL(attribution[2]).hostname;
const extensions=/\.(?:ts|js|cjs|mjs|json|jsonc|html|css|md|txt|py|svg|yml|yaml)$/i;
const issues=[];
for(const file of new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))){
 if((!extensions.test(file)&&!file.split('/').at(-1).startsWith('.'))||!existsSync(file))continue;
 let text=readFileSync(file,'utf8');
 if(file==='src/main.ts')text=text.replace(credits,'');
 if(file==='assets/ui/glossary.json')text=text.replaceAll(domain,'');
 if(text.toLowerCase().includes(vendor))issues.push({file,reason:'former platform identifier outside Credits'});
}
assert.ok(![...readFileSync('index.html','utf8').matchAll(/<script[^>]+src="([^"]+)"/g)].some(m=>/^https?:/.test(m[1])),'entry page cannot load remote scripts');
const result={status:issues.length?'FAIL':'PASS',creditsPreserved:true,issues};
mkdirSync('output/independent-runtime/tests',{recursive:true});
writeFileSync('output/independent-runtime/tests/distribution.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));assert.equal(issues.length,0,'current tracked files must contain only the Credits attribution');

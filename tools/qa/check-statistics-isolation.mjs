import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadConfigFromFile} from 'vite';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
mkdirSync('output/statistics/tests',{recursive:true});
const source=readFileSync('src/main.ts','utf8').split('async function boot():')[0]+'\nexport {MainScene};';
const require=createRequire(import.meta.url),bundles={};
for(const[name,mode,flag]of[['release','standalone','1'],['preview','standalone','0'],['desktop','production','1'],['demo','demo','1']]){
 process.env.VELVET_PRODUCTION_STATISTICS=flag;
 const {config}=await loadConfigFromFile({command:'build',mode},resolve('vite.config.ts'));
 const outfile=resolve(`output/statistics/tests/isolation-${name}.cjs`);bundles[name]=outfile;
 await build({stdin:{contents:source,resolveDir:resolve('src'),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile,define:{...config.define,'import.meta.env.PROD':'true'},plugins:[{name:'headless-phaser',setup(b){b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export default {Scene:class{}};'}));}}]});
}
delete process.env.VELVET_PRODUCTION_STATISTICS;
process.env.VELVET_PRODUCTION_STATISTICS='1';
const devConfig=await loadConfigFromFile({command:'serve',mode:'standalone'},resolve('vite.config.ts'));
assert.equal(devConfig.config.define['import.meta.env.VITE_STATISTICS_PRODUCTION'],'"false"','dev server cannot enable production statistics');
delete process.env.VELVET_PRODUCTION_STATISTICS;
const scenarios=[{name:'release',expect:2},...['preview','desktop','demo'].map(name=>({name,expect:0})),{name:'webdriver',webdriver:true,expect:0},{name:'native bridge',desktop:true,expect:0},{name:'Steam rail',steam:true,expect:0},{name:'desktop metadata',meta:true,expect:0},{name:'test SDK',sdk:true,expect:0},{name:'localhost',href:'http://127.0.0.1:5173/',expect:0},{name:'other path',href:'https://sabnockworks.com/',expect:0},...['autopilot','stage=1','sim=1','yelltest','radiotest','tumbletest','nametest','endtest','path=0,1','maptest','graphicstest','graphics=plus','oldslopes'].map(hash=>({name:hash,hash,expect:0}))];
const results=[];
for(const scenario of scenarios){
 globalThis.ImageData=class{constructor(w,h){this.data=new Uint8ClampedArray(w*h*4);}};
 const canvas={width:320,height:180,addEventListener(){},getContext(){return{canvas:this};},getBoundingClientRect(){return{left:0,top:0,width:320,height:180};}};
 globalThis.document={createElement:()=>({...canvas}),getElementById:()=>scenario.meta?{textContent:'{"target":"desktop"}'}:null,addEventListener(){},hidden:false};
 globalThis.window={addEventListener(){},...(scenario.desktop?{TesanaDesktop:{}}:{}),...(scenario.steam?{__TESANA__:{rail:'steam'}}:{}),...(scenario.sdk?{__TESANA_READY__:Promise.resolve({__testFake:true})}:{})};globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.location={hash:scenario.hash?'#'+scenario.hash:'',href:(scenario.href??'https://sabnockworks.com/games/more-projects/velvet-cruise/')+(scenario.hash?'#'+scenario.hash:'')};Object.defineProperty(globalThis,'navigator',{value:{language:'en',webdriver:!!scenario.webdriver},configurable:true});
 const sent=[];globalThis.fetch=async(url,options)=>{if(String(url).endsWith('/stats/events')){sent.push(JSON.parse(options.body));return new Response(null,{status:202});}return Response.json({});};
 const file=bundles[scenario.name]??bundles.release;delete require.cache[file];const{MainScene}=require(file);const scene=new MainScene();scene.textures={exists:()=>false};scene.cache={json:{get:()=>null}};scene.load={off(){}};scene.game={canvas,renderer:{}};scene.sound={context:null};scene.newDemo=()=>{};scene.loadAudio=()=>{};scene.create();
 scene.audio=new Proxy({ctx:null},{get:(o,k)=>o[k]??(()=>{})});scene.requestSong=()=>{};scene.newRace=()=>({theme:{nameKey:'test',id:'test'},diff:scene.diff,warp(){}});scene.startRace();await new Promise(r=>setTimeout(r,15));assert.equal(sent.length,scenario.expect,scenario.name);results.push({scenario:scenario.name,requests:sent.length});
}
writeFileSync('output/statistics/tests/isolation.json',JSON.stringify({status:'PASS',results},null,2));console.log(JSON.stringify({status:'PASS',results},null,2));

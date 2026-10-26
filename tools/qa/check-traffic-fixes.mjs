import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {rendererModule,loadBanks} from './plus-render-support.mjs';
const out=resolve('output/traffic-fixes'),m=await rendererModule(out),banks=loadBanks(m);
const uiFile=resolve(out,'controls.mjs');
await build({stdin:{contents:"export * from './src/game/ui';export * from './src/input';export * from './src/input-bindings';export * from './src/audio/audio';",resolveDir:process.cwd(),loader:'ts'},define:{'import.meta.env.VITE_LOCAL_SERVICES':'"true"'},bundle:true,format:'esm',platform:'node',outfile:uiFile});
const ui=await import(pathToFileURL(uiFile)),checks=[],failures=[];
function test(name,fn){try{fn();checks.push(name);}catch(e){failures.push({name,message:e.message});}}
function rearTrial(speed,weather=false){
 const r=new m.Race(new m.Track(weather?[0,5,6,11,12]:[0,1,2,3,4]));r.warp(weather?3:0,200);r.state='race';r.timer=9999;r.playerX=-.25;r.speed=m.MAX_SPEED*speed;r.density=()=>0;r.rand=()=>.999;r.cars=[];
 const z=r.playerZ-3000,c={...r.makeCar(z),z,x:-.25,targetX:-.25,laneX:-.25,speed:m.MAX_SPEED*.7,base:m.MAX_SPEED*.7};r.cars=[c];
 let overlaps=0;for(let i=0;i<120;i++){r.update(1/60,{steer:0,throttle:0,brake:1});const dz=c.z-r.playerZ;if(dz>=-700&&dz<=1750&&Math.abs(c.x-r.playerX)<(c.hw+.145)*.9)overlaps++;}
 return{overlaps,gap:r.playerZ-c.z};
}
test('following NPCs never drive through a stopped or braking player, including snow',()=>{
 for(const speed of [0,.2,.6])for(const snow of [false,true]){const result=rearTrial(speed,snow);assert.equal(result.overlaps,0,`speed=${speed}, snow=${snow}`);assert.ok(result.gap>=700);}
});
test('faster-car side contact receives a collision response',()=>{
 const r=new m.Race(new m.Track());r.state='race';r.position=70*m.SEG_LEN;r.playerX=-.25;r.speed=m.MAX_SPEED*.2;r.cars=[];
 const z=r.playerZ+400,c={...r.makeCar(z),z,x:-.25,targetX:-.25,speed:m.MAX_SPEED*.7,base:m.MAX_SPEED*.7};r.cars=[c];let hits=0;r.events.bump=()=>hits++;r.events.crash=()=>hits++;r.collide();assert.equal(hits,1);
});
test('a forward bump separates the pair instead of leaving both vehicles in the collision window',()=>{
 const r=new m.Race(new m.Track());r.state='race';r.position=70*m.SEG_LEN;r.playerX=-.25;r.speed=m.MAX_SPEED*.8;r.cars=[];
 const z=r.playerZ+1000,c={...r.makeCar(z),z,x:-.25,targetX:-.25,speed:m.MAX_SPEED*.4,base:m.MAX_SPEED*.4};r.cars=[c];let hits=0;r.events.bump=()=>hits++;
 r.collide();assert.equal(hits,1);assert.ok(c.z-r.playerZ>1750,'the first bump must leave the forward collision interval');
 for(let i=0;i<12;i++)r.update(1/60,{steer:0,throttle:0,brake:0});assert.equal(hits,1,'one contact must not become a frame-by-frame collision loop');
});
test('faster side contact separates once without a reverse collision on the next frame',()=>{
 for(const offset of [0,400]){
  const r=new m.Race(new m.Track());r.state='race';r.timer=9999;r.position=70*m.SEG_LEN;r.playerX=-.25;r.speed=m.MAX_SPEED*.6;r.density=()=>0;r.rand=()=>.999;r.cars=[];
  const z=r.playerZ+offset,c={...r.makeCar(z),z,x:-.25,targetX:-.25,laneX:-.25,speed:m.MAX_SPEED*.7,base:m.MAX_SPEED*.7};r.cars=[c];let hits=0;r.events.bump=()=>hits++;r.events.crash=()=>hits++;
  r.collide();for(let i=0;i<12;i++)r.update(1/60,{steer:0,throttle:1,brake:0});assert.equal(hits,1,`offset ${offset}`);
 }
});
test('a faster front car is not mistaken for rear traffic between sequential simulation updates',()=>{
 const r=new m.Race(new m.Track());r.state='race';r.timer=9999;r.position=70*m.SEG_LEN;r.playerX=-.25;r.speed=m.MAX_SPEED*.6;r.density=()=>0;r.rand=()=>.999;r.cars=[];
 const z=r.playerZ+100,c={...r.makeCar(z),z,x:-.25,targetX:-.25,laneX:-.25,speed:m.MAX_SPEED*.7,base:m.MAX_SPEED*.7};r.cars=[c];let crashes=0;r.events.crash=()=>crashes++;
 r.update(1/60,{steer:0,throttle:1,brake:0});assert.equal(crashes,0);assert.ok(c.speed>m.MAX_SPEED*.5);
});
test('traffic buckets retain every current car when the old segment cache reaches its limit',()=>{
 const r=new m.Race(new m.Track());r.state='race';r.timer=9999;
 for(let i=0;i<402;i++)r.carsBySeg.set(-1000-i,[]);
 r.updateTraffic(1/60);assert.ok(r.cars.length>0);
 assert.equal([...r.carsBySeg.values()].reduce((n,cars)=>n+cars.length,0),r.cars.length);
 for(let i=0;i<3600;i++){r.update(1/60,r.autopilot(1/60,.997));assert.equal([...r.carsBySeg.values()].reduce((n,cars)=>n+cars.length,0),r.cars.length,`frame ${i}`);}
});
test('test driver plans a pass early instead of relying on a removed horn request',()=>{
 const r=new m.Race(new m.Track());r.state='race';r.position=70*m.SEG_LEN;r.playerX=-.25;r.speed=m.MAX_SPEED*.9;r.aiLane=1;r.aiThink=0;r.cars=[];r.playerSeg.curve=0;
 const z=r.playerZ+80*m.SEG_LEN;r.cars=[{...r.makeCar(z),z,x:-.25,targetX:-.25,laneX:-.25,speed:m.MAX_SPEED*.4,base:m.MAX_SPEED*.4}];
 const controls=r.autopilot(1/60,.997);assert.ok(controls.steer<0,'a safe empty passing lane must be selected before reaching the traffic');
});
test('player horn, flash request and horn sounds are removed',()=>{
 assert.deepEqual(ui.DRIVE_ACTIONS,['left','right','throttle','brake','pause']);assert.equal(m.Race.prototype.signal,undefined);assert.equal(ui.TOUCH.signal,undefined);assert.equal(ui.drawSignalIndicator,undefined);assert.equal(ui.GameAudio.prototype.horn,undefined);assert.equal(ui.GameAudio.prototype.honk,undefined);
});
for(const mode of ['classic','plus'])test(`${mode}: full touch HUD leaves the windsock visible`,()=>{
 const context=m.createRenderContext(mode),r=new m.Race(new m.Track([0,5,8,9,10]));r.warp(2,1200);r.state='race';r.gust=.46;r.windForward=0;
 const painter=new m.Renderer(context,banks[mode]);painter.render(r);new ui.Hud().draw(context.logical,r,true,.1);
 let red=0,scale=context.fb.w/320;for(let y=71*scale;y<109*scale;y++)for(let x=279*scale;x<315*scale;x++)red+=Number(context.fb.data[y*context.fb.w+x]===m.rgb(0xee4b3c));assert.ok(red>10);
});
test('legacy six-action bindings preserve the remaining custom controls',()=>{
 const key=code=>[{kind:'key',code}],button=index=>[{kind:'button',index}];
 const old={keyboard:{left:key('KeyJ'),right:key('KeyL'),throttle:key('KeyI'),brake:key('KeyK'),pause:key('KeyO'),signal:key('KeyH')},gamepad:{left:[{kind:'axis',index:0,direction:-1,neutral:0}],right:[{kind:'axis',index:0,direction:1,neutral:0}],throttle:button(0),brake:button(1),pause:button(9),signal:button(3)}};
 globalThis.localStorage={getItem:()=>JSON.stringify(old),setItem(){}};const b=new ui.InputBindings();assert.deepEqual(b.get('keyboard','left'),key('KeyJ'));assert.deepEqual(b.get('keyboard','pause'),key('KeyO'));assert.equal(Object.hasOwn(b.config.keyboard,'signal'),false);assert.equal(Object.hasOwn(b.config.gamepad,'signal'),false);
});
const report={status:failures.length?'FAIL':'PASS',checks,failures};writeFileSync(resolve(out,process.argv.includes('--red')?'red.json':'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;

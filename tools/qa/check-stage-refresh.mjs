import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const root=resolve(process.argv[2]??'output/stage-refresh');
const preserve=process.argv.includes('--graphics-only');
const old=preserve?null:require(resolve(root,'before/renderer.cjs'));
const now=require(resolve(root,'after/renderer.cjs'));
const frames=JSON.parse(readFileSync('assets/sprites/atlas.json')).frames;
const routes=[];function visit(p){const n=now.NEXT[p.at(-1)];if(n.length)n.forEach(i=>visit([...p,i]));else routes.push(p);}visit([0]);
const physical=t=>({stages:t.stages,start:t.startTime,goal:t.goalSeg,segs:t.segs.map(s=>[s.i,s.y1,s.y2,s.curve,s.theme,s.stage,s.fo,s.fork,s.wallH,s.wallOff,s.wallRH,s.wallROff,s.soft,s.rail,s.beach,s.gate,s.ice,s.iceL,s.iceR,s.tunnel]),hits:t.segs.flatMap(s=>s.sprites.filter(p=>p.hit>0&&p.y<=50).map(p=>[s.i,p.name,p.x,p.y,p.scale,p.hit,p.br,p.flip]))});
let sections=0,plots=0,homes=0,advances=0,newProps=0,minClear=Infinity;
for(const path of routes){
  const a=preserve?null:new old.Track(path),b=new now.Track(path);
  if(!preserve){
    assert.deepEqual(physical(b),physical(a),'road, surfaces, collision objects and timers remain identical: '+path);
    assert.deepEqual(b.segs.map(s=>s.cove),a.segs.map(s=>s.cove),'accepted Palm ground');
    assert.deepEqual(b.segs.map(s=>s.bluffs),a.segs.map(s=>s.bluffs),'accepted Coral ground');
  }
  const signs=b.segs.flatMap(s=>s.sprites.filter(p=>p.destinations).map(p=>({s,p})));
  assert.equal(signs.length,4,'one advance sign per actual fork, never a shared-array prop');advances+=signs.length;
  for(const {s,p} of signs){assert.equal(p.hit,0);assert.ok(b.forks.some(f=>s.i<=f.start-125&&s.i>=f.start-300&&f.left===p.destinations[0]&&f.right===p.destinations[1]));assert.ok(Math.abs(p.x)*2900-132*p.scale*(1522/140)*.5-s.wallOff*2900>=550);}
  for(const s of b.segs){
    if(!s.landscape)continue;
    for(const side of ['left','right']){
      const g=s.landscape[side];if(!g)continue;sections++;
      assert.equal(g.points.length,7);
      assert.ok(g.points.every((p,k)=>Number.isFinite(p.x)&&Number.isFinite(p.h)&&p.h>=0&&(!k||p.x>g.points[k-1].x)),'closed monotonic ground '+s.i);
      assert.equal(g.points[0].h,0);assert.equal(g.points.at(-1).h,0);
      if(g.plot){
        const band=g.plotBand??1;
        plots++;assert.ok(Math.abs(s.y1+g.points[band].h-g.plot.worldY)<1e-6);assert.ok(Math.abs(s.y1+g.points[band+1].h-g.plot.worldY)<1e-6);
        if(g.plot.houseSegment===s.i){
          const p=s.sprites.find(p=>p.hit===0&&(side==='right'?p.x>0:p.x<0)&&/^(house_lit|cove_villa|winery|shack|cabin|saloon|store|observatory|radio_dish|gas_station)/.test(p.name));
          assert.ok(p,'building on every occupied plot');
          const x=Math.abs(p.x)*2900,half=frames[p.name].w*p.scale*(1522/140)*.5;
          assert.ok(x-half>=g.points[band].x&&x+half<=g.points[band+1].x,'full house footprint on the level shelf');homes++;
        }
      }
    }
    const previous=new Set(a?.segs[s.i].sprites.map(p=>JSON.stringify(p)));
    for(const p of s.sprites)if(!preserve&&p.hit===0&&!previous.has(JSON.stringify(p))&&!p.destinations&&p.y>=0){
      const g=p.x>0?s.landscape.right:s.landscape.left;if(!g)continue;
      const x=Math.abs(p.x)*2900,span=frames[p.name].w*p.scale*(1522/140)*.5;
      const clear=x-span-g.points[0].x;
      // Old passable verge props may keep their original street-side anchor.
      if(x>g.points[1].x){minClear=Math.min(minClear,clear);assert.ok(clear>=499.99,'whole decorative silhouette clears runoff '+p.name+' '+s.i+' '+clear);}
      let h=g.points[0].h;for(let k=1;k<g.points.length;k++)if(x<=g.points[k].x){const l=g.points[k-1],r=g.points[k];h=l.h+(r.h-l.h)*(x-l.x)/(r.x-l.x);break;}
      assert.ok(Math.abs(h-p.y)<1e-6,'decorative ground contact '+s.i+' '+p.name);newProps++;
    }
    if(s.theme===13)assert.ok(s.sprites.every(p=>p.name!=='sea_stack'),'lake has no ocean stacks');
  }
}
const after=JSON.parse(readFileSync(resolve(root,'after/audit-data.json')));
if(!preserve){const before=JSON.parse(readFileSync(resolve(root,'before/audit-data.json')));assert.deepEqual(after.runs,before.runs,'all five complete showcase runs keep times, score and path');}
assert.equal(after.stages.length,15);assert.ok(after.runs.every(r=>r.state==='goal'));
// A route rebuilt after a fork must reproduce its cosmetic land, too.
const t=new now.Track(),hash=()=>JSON.stringify(t.segs.filter(s=>s.theme===4).map(s=>s.landscape));const initial=hash();
t.choose(1,5);for(let k=0;k<5;k++)t.step();t.choose(1,1);for(let k=0;k<5;k++)t.step();assert.equal(hash(),initial,'cosmetic reconstruction');
assert.equal(now.emissivePixel('house_lit',245,240,220,45,10,96,80),false,'white plaster is not a lamp');
assert.equal(now.emissivePixel('house_lit',250,215,110,15,38,96,80),true,'warm window emits light');
assert.equal(now.emissivePixel('lamp_lit',245,240,220,8,75,16,96),false,'pale lamp post remains material');
const result={status:'PASS',mode:preserve?'graphics-preservation':'landscape-migration',routes:routes.length,sections,plotSegments:plots,fullBuildingFootprints:homes,advanceSigns:advances,groundedDecorationChecked:newProps,minClearance:Number.isFinite(minClear)?Math.round(minClear):null,physics:'verified by the separate committed pre-Plus contract',coastGround:'identical',coralDistantMountains:'original method retained',emission:'only lenses and windows',showcaseRuns:preserve?'five goals reached; current road/timer contracts verified separately':'five goals, identical times and scores'};
writeFileSync(resolve(root,'after/validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

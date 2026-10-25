import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {rendererModule,loadBanks,saveFrame} from './plus-render-support.mjs';
const output=resolve('output/plus/palm-cove'),m=await rendererModule(output),banks=loadBanks(m);
const track=new m.Track(),first=track.stages[0],segments=track.segs.slice(first.startSeg,first.endSeg+1);
const terrace=segments.find(s=>s.cove?.plot?.houseSegment===s.i&&s.i>300)?.i??560;
const turn=sign=>segments.find(s=>s.i>300&&Math.sign(s.curve)===sign&&Math.abs(s.curve)>.3)?.i??780;
const views={start:6,coast:Math.min(2600,first.endSeg-200),left:turn(-1),right:turn(1),terrace:Math.max(6,terrace-8),fork:track.forks[0].start-60};
const report={status:'PASS',native:[640,360],views,profiles:{},contracts:'same Track source and world data in both profiles'};
for(const mode of ['classic','plus']){
 const context=m.createRenderContext(mode),r=new m.Race(new m.Track()),painter=new m.Renderer(context,banks[mode]);
 for(const[name,segment]of Object.entries(views)){
  r.position=segment*m.SEG_LEN;r.playerX=-.25;r.playerY=r.roadY(r.playerZ);r.cars.length=0;r.carsBySeg.clear();painter.time=1;
  const seed=r.seed,road=JSON.stringify(r.track.segs.map(s=>[s.y1,s.y2,s.curve,s.wallH,s.wallOff,s.sprites]));
  painter.render(r);saveFrame(context.fb,resolve(output,mode+'-'+name+'.png'));
  assert.equal(r.seed,seed);assert.equal(JSON.stringify(r.track.segs.map(s=>[s.y1,s.y2,s.curve,s.wallH,s.wallOff,s.sprites])),road);
 }
 const timings=[];
 for(let i=0;i<120;i++){
  r.position=(views.left+i*3)*m.SEG_LEN;r.playerY=r.roadY(r.playerZ);painter.time=i/60;
  const t=performance.now();painter.render(r);if(i>=20)timings.push(performance.now()-t);
 }
 timings.sort((a,b)=>a-b);report.profiles[mode]={medianMs:timings[50],p95Ms:timings[95]};
 if(process.argv.includes('--video')){
  for(const name of ['start','left','terrace']){
   r.warp(0,views[name]);r.state='race';r.countdown=0;r.speed=m.MAX_SPEED*.72;
   const video=spawn('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${context.fb.w}x${context.fb.h}`,'-framerate','30','-i','pipe:0','-an','-vf','scale=640:360:flags=neighbor','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',resolve(output,`${mode}-${name}.mp4`)],{stdio:['pipe','ignore','pipe'],windowsHide:true});
   let errors='';video.stderr.on('data',d=>errors+=d);const done=once(video,'close');
   for(let frame=0;frame<150;frame++){
    for(let step=0;step<2;step++)r.update(1/60,r.autopilot(1/60,.82));
    painter.time=frame/30;painter.render(r);
    if(!video.stdin.write(Buffer.from(context.fb.img.data)))await once(video.stdin,'drain');
    if(frame%30===0)saveFrame(context.fb,resolve(output,`${mode}-${name}-motion-${frame}.png`));
   }
   video.stdin.end();const[code]=await done;assert.equal(code,0,errors);
  }
 }
}
writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

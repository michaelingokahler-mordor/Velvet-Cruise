// Coral Bluffs: a low inhabited middle ground, distant dry hills and short
// sandstone cuttings on the inside of left bends. Cosmetic, seeded separately
// from road generation; the existing collision boundary remains the rock foot.
import { ROAD_W, SPR_S } from './config';
import { coveHeight, type CoveSection, type CovePlot } from './cove';
import { cellRand, vnoise } from './terrain';
import type { Seg } from './track';

export interface BluffSection extends CoveSection { spur: number }
const smooth = (v: number) => { const t=Math.max(0,Math.min(1,v)); return t*t*(3-2*t); };

function section(s: Seg, first: number, end: number): BluffSection {
  const i=s.i, foot=s.wallOff*ROAD_W;
  const edge=smooth((i-first)/110)*smooth((end-1-i)/150);
  // Bend easing also eases the rock approach. Forks and gates stay open.
  const spur=s.fork<0 ? smooth((-s.curve-.75)/2.1)*edge : 0;
  const shelf=(270+420*vnoise(i/160,501))*edge;
  const hill=(1300+1800*vnoise(i/255,502))*edge;
  // Small angular ledges roughen only the exposed cutting. House ground and
  // the open hills retain their established profile. The foot never moves.
  const cut=Math.max(0,(spur-.18)/.82);
  const ledge=(step:number,seed:number) => {
    const q=i/step,k=Math.floor(q),t=q-k;
    return cellRand(k,seed)+(cellRand(k+1,seed)-cellRand(k,seed))*t-.5;
  };
  const broken=cut*(ledge(11,541)*220+ledge(27,542)*180);
  return { points:[
    {x:foot,h:0},
    {x:foot+1900-spur*1350+cut*ledge(17,543)*150,h:shelf+spur*(1800+900*vnoise(i/75,503))+broken},
    {x:foot+7300+1200*vnoise(i/190,504),h:shelf+(260+750*vnoise(i/120,509))*edge+spur*550},
    {x:foot+13200+1800*vnoise(i/210,505),h:shelf+hill*.62},
    {x:foot+20500+2800*vnoise(i/270,506),h:shelf+hill},
    {x:foot+33000,h:hill*.35},
    {x:foot+100000,h:0},
  ], spur, meadow:vnoise(i/91,507), rock:vnoise(i/57,508) };
}

export function dressBluffs(segs: Seg[], from: number): void {
  let first=from;
  while(first<segs.length && segs[first].theme!==1) first++;
  let end=first;
  while(end<segs.length && segs[end].theme===1) end++;
  if(first===end) return;
  for(let i=first;i<end;i++) {
    const s=segs[i];
    s.bluffs=section(s,first,end);
    // The elevated lighthouse never participates in collision (race.ts ignores
    // props above y=50). Replace it with the grounded landmark below. All active
    // obstacles, signs, fork props and sea-side objects remain exactly as before.
    s.sprites=s.sprites.filter(p=>!(p.name==='lighthouse' && p.y>50 && p.x<0) &&
      (p.hit>0 || p.x>=0 || !(p.y>0 || p.name.startsWith('cove_tuft'))));
  }
  const add=(i:number,name:string,x:number,scale:number,flip=false) => {
    const s=segs[i];
    s.sprites.push({name,x:-x/ROAD_W,y:coveHeight(s.bluffs!,x),scale,flip,hit:0});
  };
  const clear=(i:number,radius:number) => i-radius>=first && i+radius<end &&
    !segs.slice(i-radius,i+radius+1).some(s=>s.fork>=0 || s.gate || !s.bluffs || s.bluffs.spur>.12 || s.bluffs.plot);
  // A whole house footprint shares one world height (including the road's
  // longitudinal grade). Six quiet settlement pockets, with open land between.
  const homes=['cove_cottage','cove_cube','cove_villa_a','cove_villa_b','cove_row','cove_chapel'];
  for(let group=0;group<6;group++) {
    const base=first+240+group*990, count=group===3 ? 5 : 3;
    for(let house=0;house<count;house++) {
      const target=base+house*52;
      let m=target;
      // Search forwards for gentle terrain and a genuine gap between rock cuttings.
      while(m<target+350 && m+28<end) {
        if(clear(m,25) && Math.abs(segs[m+20].y1-segs[m-20].y1)<380) break;
        m++;
      }
      if(m>=target+350 || m+28>=end || !clear(m,25)) continue;
      const s=segs[m], c=s.bluffs!;
      const front=c.points[0].x+2400, width=5100;
      const plot:CovePlot={first:m-18,last:m+18,houseSegment:m,x:front+width*.5,width,worldY:s.y1+c.points[1].h};
      for(let j=plot.first-7;j<=plot.last+7;j++) {
        const t=segs[j], p=t.bluffs!.points;
        const e=smooth(Math.min(j-(plot.first-7),plot.last+7-j)/7), h=plot.worldY-t.y1;
        p[1]={x:p[1].x+(front-p[1].x)*e,h:p[1].h+(h-p[1].h)*e};
        p[2]={x:p[2].x+(front+width-p[2].x)*e,h:p[2].h+(h-p[2].h)*e};
        if(j>=plot.first && j<=plot.last) t.bluffs!.plot=plot;
      }
      add(m,homes[(group*2+house)%homes.length],plot.x,1.8);
      add(m-8,'bush_e',front+1000,2.0);
      add(m+9,'bush_c',front+width-1000,1.8,true);
      if(house===0) add(m+13,group%2 ? 'stone_pine' : 'palm_h',front+width-400,1.9);
    }
  }
  // The lighthouse gets a level headland as well, after the first long cutting.
  if(first+1150<end) {
    let m=first+720;
    while(m<first+1150 && !clear(m,26)) m++;
    if(m<first+1150) {
      const s=segs[m], c=s.bluffs!, front=c.points[0].x+2900, width=5100;
      const plot:CovePlot={first:m-18,last:m+18,houseSegment:m,x:front+width*.5,width,worldY:s.y1+c.points[1].h};
      for(let j=m-25;j<=m+25;j++) {
        const t=segs[j], p=t.bluffs!.points, e=smooth((25-Math.abs(j-m))/7), h=plot.worldY-t.y1;
        p[1]={x:p[1].x+(front-p[1].x)*e,h:p[1].h+(h-p[1].h)*e};
        p[2]={x:p[2].x+(front+width-p[2].x)*e,h:p[2].h+(h-p[2].h)*e};
        if(j>=plot.first && j<=plot.last) t.bluffs!.plot=plot;
      }
      add(m,'lighthouse',plot.x,2.2);
      add(m-9,'bluff_rock_c',front+width+1000,2.6);
    }
  }
  // Readable scrub and boulders, clustered rather than peppered over the slope.
  const widths={bush_a:48,bush_c:64,bush_e:60,bluff_rock_a:92,bluff_rock_c:80,bluff_rock_d:100};
  const detail=(i:number,name:keyof typeof widths,offset:number,scale:number,flip:boolean) => {
    if(i<first || i>=end) return;
    const s=segs[i], c=s.bluffs!;
    if(s.fork>=0 || c.plot || segs.slice(Math.max(first,i-12),Math.min(end,i+13)).some(t=>t.gate)) return;
    const half=widths[name]*scale*SPR_S*.5;
    const x=Math.max(c.points[1].x+offset,c.points[0].x+500+half);
    add(i,name,x,scale,flip);
  };
  for(let group=0;first+group*106+70<end;group++) {
    const base=first+60+group*106+Math.floor(cellRand(group,520)*22);
    const flip=cellRand(group,521)>.5, drift=cellRand(group,522)*1500;
    detail(base,'bush_e',1100+drift,2.8,flip);
    detail(base+9,'bluff_rock_a',1900+drift,3.0,!flip);
    detail(base+16,'bush_c',800+drift,2.5,!flip);
    if(group%3!==1) detail(base-9,'bluff_rock_d',3800+drift,2.5,flip);
    if(group%3===0) detail(base+25,'bush_a',2700+drift,2.9,flip);
  }
}

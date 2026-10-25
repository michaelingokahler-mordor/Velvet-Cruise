// Cosmetic scenery, independent of road generation and its random stream.
// Sections are closed volumes; all added objects follow the same ground mesh.
import { rgb, type Col } from '../core/fb';
import { ROAD_W, SPR_S } from './config';
import { coveHeight, type CoveSection, type CovePlot } from './cove';
import { cellRand, vnoise } from './terrain';
import type { Seg } from './track';

export interface LandscapeStyle {
  kind: 'grass' | 'forest' | 'sand' | 'rock' | 'snow' | 'night' | 'town';
  colors: Col[];
  rock: Col[];
  bank: number; ridge: number;
  trees: string[]; shrubs: string[]; stones: string[];
  both?: boolean;
}
const style=(kind:LandscapeStyle['kind'],colors:number[],rock:number[],bank:number,ridge:number,
  trees:string[],shrubs:string[],stones:string[],both=false):LandscapeStyle =>
  ({kind,colors:colors.map(rgb),rock:rock.map(rgb),bank,ridge,trees,shrubs,stones,both});
export const LANDSCAPES:Record<number,LandscapeStyle>={
  2:style('town',[0xc29365,0xd3ad79,0xc49a67,0xb78960,0x97724f,0x9b7b57],[0x755445,0x9d7356,0xd6af7c],180,720,
    ['palm_a','palm_c','palm_g'],['bush_b','bush_f'],['cove_rock_c']),
  3:style('forest',[0x344e3d,0x496343,0x506c48,0x456044,0x2d493b,0x314639],[0x40373f,0x796d71,0xac9890],550,7400,
    ['cypress','cyp_c','cyp_d','stone_pine'],['bush_a','bush_f'],['point_rock_a','point_rock_c']),
  4:style('night',[0x30334b,0x3c4056,0x41475b,0x354256,0x28364a,0x303649],[0x35354a,0x63617a,0x9990a3],400,6800,
    ['palm_c','palm_b','cypress'],['bush_a','bush_c'],['cove_rock_b']),
  6:style('grass',[0x64743e,0x8b984f,0x9aa563,0x7e8f4d,0x65783e,0x6c7c45],[0x655d41,0xa09569,0xcbbb8a],420,3900,
    ['olive','cypress_tall','cypress'],['bush_a','bush_e'],['cove_rock_b'],true),
  7:style('forest',[0x394b38,0x45583d,0x526449,0x3d543e,0x2e4739,0x344b3c],[0x393c36,0x64685a,0x8e9481],480,7800,
    ['redwood','pine'],['fern','bush_f'],['rock_b'],true),
  8:style('sand',[0xb47d4f,0xc68c56,0xd39d65,0xc18b59,0xa86f4a,0xb47b4b],[0x85503c,0xaf6842,0xdca06a],85,520,
    ['saguaro','cactus'],['desert_bush'],['red_rock'],true),
  9:style('rock',[0x77505b,0xc1aca2,0xccb8ae,0x94717a,0x694858,0x8b6870],[0x45333f,0x765362,0xb38b87],500,7200,
    ['dead_tree'],['desert_bush'],['rock_dark','bluff_rock_c'],true),
  11:style('snow',[0x939eb5,0xe2e9f3,0xf0f3f9,0xc4cfdf,0x8899b5,0xc5d2e4],[0x65768e,0x94a7c1,0xdbe5f1],540,9200,
    ['snow_pine','snow_fir'],['snow_drift'],['snow_rock'],true),
  12:style('sand',[0x9b6849,0xbc8a59,0xc49460,0xa16d4c,0x88523e,0x9e6c4c],[0x6d3d35,0xad6847,0xd99964],220,1850,
    ['saguaro','cactus'],['desert_bush'],['red_rock'],true),
  13:style('forest',[0x263d3d,0x3d514a,0x495e54,0x304d45,0x203c36,0x2c443e],[0x303d4b,0x64798a,0x97afba],420,6500,
    ['lake_spruce','birch'],['fern','reeds'],['lake_rock']),
  14:style('night',[0x242c45,0x303c59,0x3f4c6d,0x33415e,0x232e48,0x2c3651],[0x19243b,0x414f71,0x6b7d9c],480,8400,
    ['night_pine','night_pine_b','night_pine_c','night_pine_d'],['bush_f'],['summit_rock_a','summit_rock_c'],true),
};
export interface LandSection extends CoveSection { cutting:number; plotBand?:number }
export interface Landscape { left:LandSection; right?:LandSection }
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const windowAt=(p:number,a:number,b:number)=>smooth((p-a)/.035)*smooth((b-p)/.035);

function section(s:Seg,first:number,end:number,st:LandscapeStyle,right:boolean):LandSection {
  const i=s.i,seed=s.theme*31+(right?17:0),foot=(right?s.wallROff:s.wallOff)*ROAD_W;
  // Open transitions and bends reveal the separate background mountains.
  const fade=smooth((i-first)/95)*smooth((end-1-i)/160);
  const pocket=.3+.7*vnoise(i/360,seed+801);
  const progress=(i-first)/(end-first);
  // Pass narrows are composed stretches, separated by open valleys. The road
  // and its collision limits do not change with these cosmetic rock faces.
  const pass=[7,11].includes(s.theme)?Math.max(windowAt(progress,.14,.32),windowAt(progress,.47,.65),windowAt(progress,.77,.91)):0;
  const rock=st.kind==='rock'||st.kind==='snow'||s.theme===7;
  const inside=right?s.curve:-s.curve;
  const buttress=st.kind==='rock'?smooth((vnoise(i/230,seed+811)-.44)/.28)*.8:0;
  const cutting=rock&&s.fork<0&&!(right&&s.theme===9)?Math.max(pass*(.72+.28*smooth((inside+.2)/2)),pass?0:smooth((inside-.8)/2.4)*.35,buttress)*(.75+.25*pocket)*fade:0;
  const close=[3,4,13,14].includes(s.theme)?Math.max(windowAt(progress,.20,.35),windowAt(progress,.52,.66),windowAt(progress,.82,.98))*(.7+.3*vnoise(i/280,seed+813)):0;
  const bank=(st.bank*(.7+.5*vnoise(i/130,seed+802))+cutting*(s.theme===7?6500:s.theme===11?7200:4400)+close*st.ridge*.14)*fade;
  const shelf=st.bank*(.65+.5*vnoise(i/240,seed+803))*fade;
  const hill=st.ridge*(.45+.4*vnoise(i/310,seed+804)+.15*vnoise(i/95,seed+814))*fade;
  const lowRight=right&&[6,9,12].includes(s.theme) ? .35 : 1;
  return {points:[
    {x:foot,h:0},
    {x:foot+1350-cutting*650,h:bank},
    {x:foot+7600+900*vnoise(i/160,seed+805)-close*2500,h:shelf+cutting*2400+close*hill*.38},
    {x:foot+11000+1200*vnoise(i/170,seed+806)-close*1900,h:(shelf+hill*.70)*lowRight},
    {x:foot+17500+1600*vnoise(i/230,seed+807)-close*900,h:(shelf+hill)*lowRight},
    {x:foot+36000,h:hill*.3*lowRight},
    {x:foot+100000,h:0},
  ],meadow:vnoise(i/85,seed+808),rock:vnoise(i/47,seed+809),cutting};
}

// Widths matter to placement even for passable decoration. Values are atlas
// pixel widths, deliberately rounded up for overhanging crowns and verandas.
const WIDTH:Record<string,number>={house_lit:96,winery:152,windmill:88,shack:96,lifeguard:80,
  saloon_lit:104,store_lit:100,observatory_lit:100,radio_dish:64,antenna_lit:48,
  cabin_lit:104,cabin_snow_lit:104,gas_station:160,water_tower:64,wagon:88,
  barrel:40,barrels:52,campfire_lit:48,rowboat:88,telescope:64,
  redwood:96,pine:72,stone_pine:120,cypress:64,cypress_tall:56,olive:96,
  palm_a:96,palm_b:88,palm_c:96,palm_g:100,lake_spruce:88,birch:80};
const width=(name:string)=>WIDTH[name]??(/rock/.test(name)?110:/bush|fern|drift/.test(name)?72:96);

/** Applied after all gameplay decoration. Nothing here consumes Track's RNG. */
export function dressLandscape(segs:Seg[],from:number):void {
  let first=from;
  while(first<segs.length) {
    const node=segs[first].theme,st=LANDSCAPES[node];
    let end=first+1;while(end<segs.length&&segs[end].theme===node)end++;
    if(!st){first=end;continue;}
    for(let i=first;i<end;i++) {
      const s=segs[i];
      s.landscape={left:section(s,first,end,st,false)};
      if(st.both)s.landscape.right=section(s,first,end,st,true);
      // Elevated legacy props are already ignored by the collision system.
      // Rebuild them on the actual surface; keep every active obstacle intact.
      s.sprites=s.sprites.filter(p=>p.y<=50||p.name==='gate'||p.name==='gate_goal');
      if(node===13)s.sprites=s.sprites.map(p=>p.name==='sea_stack'?{...p,name:'lake_rock',scale:2.1}:p);
    }
    const ground=(i:number,right=false)=>right?segs[i].landscape?.right:segs[i].landscape?.left;
    const clear=(i:number,radius=16)=>i-radius>first&&i+radius<end&&
      !segs.slice(i-radius,i+radius+1).some(s=>s.fork>=0||s.gate||s.tunnel);
    const add=(i:number,name:string,x:number,scale:number,right=false,flip=false)=>{
      const s=segs[i],g=ground(i,right);if(!g||!clear(i,2))return;
      const minimum=g.points[0].x+650+width(name)*scale*SPR_S*.5;
      x=Math.max(x,minimum);
      s.sprites.push({name,x:(right?1:-1)*x/ROAD_W,y:coveHeight(g,x),scale,flip,hit:0});
    };
    // Irregular groups separated by genuinely quiet ground. A few tall stems
    // frame the road, most trees belong to the broad middle ground.
    for(let k=0,base=first+90;base<end-100;k++,base=first+90+k*124) {
      const m=base+Math.floor(cellRand(k,node+820)*25);
      if(!clear(m,30))continue;
      for(const right of st.both?[false,true]:[false]) {
        const g=ground(m,right)!,key=k*2+(right?1:0);
        const offset=1600+cellRand(key,node+821)*3600;
        if(cellRand(key,node+822)>.24) {
          const tree=st.trees[k%st.trees.length];
          add(m,tree,g.points[1].x+offset,node===7?3.4:node===8?2.1:2.35,right);
          add(m+13,st.trees[(k+1)%st.trees.length],ground(m+13,right)!.points[1].x+offset+1400,1.95,right);
        }
        add(m-12,st.shrubs[k%st.shrubs.length],ground(m-12,right)!.points[1].x+900+offset*.25,2.1,right,true);
        if(k%3!==1)add(m+22,st.stones[k%st.stones.length],ground(m+22,right)!.points[1].x+1900+offset*.4,2.4,right,k%2===0);
      }
    }
    // An independent layer occupies the rising middle slopes, rather than
    // reusing only the first bank beside the road. Groups leave real gaps.
    const groveStep=[3,7,11,13,14].includes(node)?53:78;
    if([3,4,6,7,9,11,13,14].includes(node))for(let k=0,base=first+150;base<end-180;k++,base=first+150+k*groveStep) {
      const m=base+Math.floor(cellRand(k,node+840)*25);
      if(!clear(m,24)||cellRand(k,node+841)<.19)continue;
      for(const right of st.both?[false,true]:[false]) {
        const g=ground(m,right)!,band=k%3===0?3:2;
        const x=g.points[band].x+500+cellRand(k,node+842)*2100;
        const size=node===9?3.4:node===7?3.6:5.2;
        add(m,st.trees[k%st.trees.length],x,size,right,k%2===0);
        if(k%3!==1)add(m+9,st.trees[(k+1)%st.trees.length],x+1600,size*.76,right);
        add(m-8,st.shrubs[k%st.shrubs.length],x-700,3.1,right,true);
        if(k%2===0)add(m+18,st.stones[k%st.stones.length],x+700,node===9?4.4:3.8,right);
      }
    }
    const plot=(target:number,names:string[],right=false,scale=2.15,band=1,street=false)=>{
      const span=street?18:27,flat=span-8;
      const suitable=(i:number)=>{
        if(!clear(i,span+1))return false;
        const c=ground(i,right)!;
        return c.cutting<.12&&!segs.slice(i-span,i+span+1).some(s=>{
          const g=right?s.landscape?.right:s.landscape?.left;
          return !g||g.plot||(!street&&segs[i].y1+c.points[band].h-s.y1<70);
        })&&Math.abs(segs[i+(street?10:20)].y1-segs[i-(street?10:20)].y1)<(street?950:420);
      };
      let m=target;while(m<target+180&&!suitable(m))m++;
      if(m>=target+180||!clear(m,span+1))return;
      const g=ground(m,right);if(!g)return;
      const front=band===1?g.points[0].x+(street?950:2400):g.points[band].x+250;
      const w=Math.max(street?4300:band===1?6900:5100,...names.map(n=>width(n)*scale*SPR_S+1300));
      if(front+w>=g.points[band+2].x-250)return;
      const worldY=street?Math.max(...segs.slice(m-span,m+span+1).map(s=>s.y1))+160:segs[m].y1+g.points[band].h;
      const p:CovePlot={first:m-flat,last:m+flat,houseSegment:m,x:front+w*.5,width:w,worldY};
      for(let j=m-span;j<=m+span;j++) {
        const c=ground(j,right)!;
        const t=smooth((span-Math.abs(j-m))/8),h=p.worldY-segs[j].y1;
        c.points[band]={x:c.points[band].x+(front-c.points[band].x)*t,h:c.points[band].h+(h-c.points[band].h)*t};
        c.points[band+1]={x:c.points[band+1].x+(front+w-c.points[band+1].x)*t,h:c.points[band+1].h+(h-c.points[band+1].h)*t};
        if(j>=p.first&&j<=p.last){c.plot=p;c.plotBand=band;}
      }
      add(m,names[0],p.x,scale,right);
      if(names[1])add(m+12,names[1],p.x+w*.24,scale*.7,right);
      if(names[2])add(m-10,names[2],front+w*.17,scale*.7,right);
    };
    const length=end-first;
    if(node===4)for(let k=0;k<10;k++)for(let house=0;house<3;house++)
      plot(first+230+k*660+house*87,[house===1?'cove_villa_a':'house_lit','palm_c','bush_a'],false,house===2?3.25:2.3,house===2?3:1);
    if(node===4)for(let m=first+120,k=0;m<end-250;m+=115,k++)
      plot(m,[k%3===0?'cove_villa_a':'house_lit','palm_b','bush_c'],false,k%3===0?4.2:3.5,k%3===0?3:2);
    if(node===6)for(let k=0;k<5;k++) {
      plot(first+330+k*1200,['winery',k%2?'windmill':'olive','barrels'],k%2===1,2.2);
      // Middle-ground vineyard blocks. Within a parcel rows share one direction;
      // paths and gaps separate blocks instead of an endless five-row fence.
      const base=first+210+k*1200;
      for(let j=0;j<70;j+=12)for(let row=0;row<3;row++)if(clear(base+j,2)) {
        const g=ground(base+j)!,x=g.points[1].x+1600+row*1500+j*18;
        add(base+j,'vines',x,1.65,false);
      }
    }
    if(node===6)for(let k=0;k<46;k++)plot(first+390+k*140,
      [k%3===1?'cove_villa_a':'winery','olive','barrels'],k%2===0,3.25,k%3===0?3:2);
    if(node===2)for(let k=0;k<5;k++)plot(first+380+k*1200,['shack','palm_c','surfboards'],false,2.15);
    if(node===7)for(let k=0;k<3;k++)plot(first+600+k*2000,['cabin_lit','fern','log'],k%2===1,2);
    if(node===8)for(let k=0;k<2;k++)plot(first+1200+k*3300,['gas_station','cactus','barrels'],k%2===1,2.25);
    if(node===11)for(let k=0;k<3;k++)plot(first+700+k*2100,['cabin_snow_lit','snow_drift','snowman'],k%2===1,2);
    if(node===12)for(let k=0;k<5;k++) {
      plot(first+400+k*1300,['saloon_lit','hitch_rail','wagon'],false,2.25);
      plot(first+540+k*1300,['store_lit','barrels','water_tower'],true,2.1);
    }
    // The last approach becomes the town's main street, with alternating
    // false fronts on both sides instead of a few isolated roadside houses.
    if(node===12) {
      const finish=segs.slice(first,end).find(s=>s.gate?.kind==='goal')?.i??end-1000;
      for(let k=0;k<24;k++)for(const right of [false,true])
        plot(finish-2200+k*95+(right?30:0),[k%2===0?'saloon_lit':'store_lit',k%3===0?'water_tower':'hitch_rail','barrels'],right,3.2,1,true);
    }
    if(node===13)for(let k=0;k<4;k++)plot(first+600+k*1700,['cabin_lit','birch','campfire_lit'],false,2.05);
    if(node===14) {
      plot(first+Math.floor(length*.23),['radio_dish','antenna_lit'],false,2.6);
      plot(first+Math.floor(length*.59),['observatory_lit','telescope'],true,2.8);
      plot(end-620,['observatory_lit','radio_dish','antenna_lit'],false,3.1);
    }
    // Plots can flatten ground underneath an earlier decorative grove. Re-seat
    // passable scenery after every plot is finished; active hit boxes stay put.
    for(let i=first;i<end;i++)for(const p of segs[i].sprites)if(p.hit===0&&p.y>=0) {
      const g=ground(i,p.x>0);
      if(g)p.y=coveHeight(g,Math.abs(p.x)*ROAD_W);
    }
    first=end;
  }
}

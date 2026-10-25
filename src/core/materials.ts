// Light belongs to windows and lenses, not every pale pixel of a lit sprite.
// Rectangles refer to the existing source art; colour still rejects their frames.
const WINDOWS:Record<string,number[][]>={
  house_lit:[[13,35,22,47],[31,35,40,47],[12,54,26,70],[62,52,85,65]],
  cabin_lit:[[19,38,32,51],[51,38,64,51]],
  cabin_snow_lit:[[19,38,32,51],[51,38,64,51]],
  observatory_lit:[[22,55,30,71],[66,55,74,71],[44,60,57,65],[54,5,63,42]],
};
export function emissivePixel(name:string,r:number,g:number,b:number,x:number,y:number,w:number,h:number):boolean {
  const lum=r*.3+g*.59+b*.11,bright=lum>200;
  const windows=WINDOWS[name];
  if(windows)return windows.some(([x0,y0,x1,y1])=>x>=x0&&x<x1&&y>=y0&&y<y1)&&r>175&&g>120&&b<190;
  if(/^(saloon|store|tent)_lit$/.test(name))return r>215&&g>165&&g<r*.97&&b<150;
  if(/lamp|lantern|antenna/.test(name))return y<h*.28&&(bright||(r>210&&r>g*1.7));
  if(name==='lighthouse')return y<h*.25&&bright;
  const neon=name.startsWith('neon_'),mx=Math.max(r,g,b),mn=Math.min(r,g,b);
  return bright||(neon&&mx>=220&&mx-mn>=90);
}

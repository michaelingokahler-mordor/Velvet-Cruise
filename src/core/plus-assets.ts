import { SpriteBank, type AtlasJson } from './assets';

export interface PlusManifest {
  version: 1;
  complete: boolean;
  atlases: { image: string; data: string }[];
  images: Record<string, { file: string; density: 1 | 2; opaque?: boolean }>;
  reuse: string[];
  requiredSprites: string[];
}

async function json<T>(file: string): Promise<T> {
  const abort = new AbortController(), timer = setTimeout(()=>abort.abort(),20000);
  try {
    const response = await fetch(file,{signal:abort.signal});
    if (!response.ok) throw Error(`Missing graphics file: ${file}`);
    return await response.json() as T;
  } finally { clearTimeout(timer); }
}
function image(file: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{
    const img = new Image();
    const timer=setTimeout(()=>{img.onload=img.onerror=null;img.src='';reject(Error(`Graphics image timed out: ${file}`));},20000);
    img.onload = () => {clearTimeout(timer);resolve(img);};
    img.onerror = () => {clearTimeout(timer);reject(Error(`Missing graphics image: ${file}`));};
    img.src = file;
  });
}

/** Atlas pages load sequentially to avoid retaining several large decoded pages at once. */
export async function loadPlusBank(classic: SpriteBank, pilot = false): Promise<SpriteBank> {
  const manifest = await json<PlusManifest>('assets/plus/manifest.json');
  if (manifest.version !== 1 || (!manifest.complete && !pilot) || !Array.isArray(manifest.atlases) ||
    !manifest.images || !Array.isArray(manifest.reuse) || !Array.isArray(manifest.requiredSprites)) throw Error('Incomplete Plus graphics');
  const bank = new SpriteBank();
  for (const name of manifest.reuse) {
    if (!pilot && !/^(icon_|wx_)/.test(name)) throw Error(`Unexpected Classic replacement: ${name}`);
    const spr = classic.get(name);
    if (!spr) throw Error(`Unknown Classic replacement: ${name}`);
    bank.set(name,spr);
  }
  for (const page of manifest.atlases) {
    const [atlas,img] = await Promise.all([json<AtlasJson>(`assets/plus/${page.data}`),image(`assets/plus/${page.image}`)]);
    bank.addAtlas({getSourceImage:()=>img},atlas);
    bank.releaseScratch();
  }
  for (const [name,entry] of Object.entries(manifest.images)) {
    const img = await image(`assets/plus/${entry.file}`);
    bank.addImage(name,{getSourceImage:()=>img},entry.opaque??name.startsWith('sky'),entry.density);
    bank.releaseScratch();
  }
  for (const name of [...classic.names(),...manifest.requiredSprites]) if (!bank.has(name)) throw Error(`Missing Plus sprite: ${name}`);
  return bank;
}

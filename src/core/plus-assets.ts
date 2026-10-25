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

function positiveInteger(value: number): boolean { return Number.isSafeInteger(value) && value > 0; }

function validateSize(classic: SpriteBank, name: string, width: number, height: number, density: number, pilot: boolean): void {
  if (!positiveInteger(width) || !positiveInteger(height) || !(density === 2 || pilot && density === 1)) throw Error(`Invalid Plus dimensions: ${name}`);
  const original = classic.get(name);
  if (original && (width / density !== original.w / (original.density ?? 1) || height / density !== original.h / (original.density ?? 1))) {
    throw Error(`Mismatched Plus dimensions: ${name}`);
  }
}

/** Atlas pages load sequentially to avoid retaining several large decoded pages at once. */
export async function loadPlusBank(classic: SpriteBank, pilot = false): Promise<SpriteBank> {
  const manifest = await json<PlusManifest>('assets/plus/manifest.json');
  if (manifest.version !== 1 || (manifest.complete !== true && !pilot) || !Array.isArray(manifest.atlases) ||
    !manifest.images || typeof manifest.images !== 'object' || Array.isArray(manifest.images) ||
    !Array.isArray(manifest.reuse) || !Array.isArray(manifest.requiredSprites) ||
    !manifest.reuse.every(name=>typeof name==='string') || !manifest.requiredSprites.every(name=>typeof name==='string')) throw Error('Incomplete Plus graphics');
  const bank = new SpriteBank();
  for (const name of manifest.reuse) {
    if (!pilot && !/^(icon_|wx_)/.test(name)) throw Error(`Unexpected Classic replacement: ${name}`);
    const spr = classic.get(name);
    if (!spr) throw Error(`Unknown Classic replacement: ${name}`);
    bank.set(name,spr);
  }
  for (const page of manifest.atlases) {
    const [atlas,img] = await Promise.all([json<AtlasJson>(`assets/plus/${page.data}`),image(`assets/plus/${page.image}`)]);
    if (!positiveInteger(img.width) || !positiveInteger(img.height) || !pilot && (img.width > 2048 || img.height > 2048) ||
      !atlas.frames || typeof atlas.frames !== 'object' || Array.isArray(atlas.frames)) throw Error('Invalid Plus atlas');
    for (const [name,frame] of Object.entries(atlas.frames)) {
      if (!frame || bank.has(name) || !Number.isSafeInteger(frame.x) || frame.x < 0 || !Number.isSafeInteger(frame.y) || frame.y < 0 ||
        frame.x + frame.w > img.width || frame.y + frame.h > img.height) throw Error(`Invalid Plus frame: ${name}`);
      validateSize(classic,name,frame.w,frame.h,frame.density ?? 1,pilot);
    }
    bank.addAtlas({getSourceImage:()=>img},atlas);
    for (const name of Object.keys(atlas.frames)) if (!bank.get(name)?.data.some(pixel=>pixel>>>24)) throw Error(`Empty Plus sprite: ${name}`);
    bank.releaseScratch();
  }
  for (const [name,entry] of Object.entries(manifest.images)) {
    if (!entry || bank.has(name)) throw Error(`Invalid Plus image: ${name}`);
    const img = await image(`assets/plus/${entry.file}`);
    validateSize(classic,name,img.width,img.height,entry.density,pilot);
    bank.addImage(name,{getSourceImage:()=>img},entry.opaque??name.startsWith('sky'),entry.density);
    bank.releaseScratch();
  }
  for (const name of [...classic.names(),...manifest.requiredSprites]) if (!bank.has(name)) throw Error(`Missing Plus sprite: ${name}`);
  return bank;
}

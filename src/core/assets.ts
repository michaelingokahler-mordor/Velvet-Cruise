// Turns loaded images into raw pixel arrays the software renderer can blit.
import type Phaser from "phaser";
import { Spr, halve } from "./fb";
import { emissivePixel } from './materials';

export interface AtlasJson { frames: Record<string, { x: number; y: number; w: number; h: number; density?: 1 | 2; emissive?: boolean }> }

export class SpriteBank {
  private map = new Map<string, Spr>();
  private ctx: CanvasRenderingContext2D;

  constructor() {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    this.ctx = c.getContext("2d", { willReadFrequently: true })!;
  }

  get(name: string): Spr | undefined { return this.map.get(name); }
  names(): string[] { return [...this.map.keys()]; }
  releaseScratch(): void { this.ctx.canvas.width = this.ctx.canvas.height = 4; }
  has(name: string): boolean { return this.map.has(name); }
  set(name: string, s: Spr): void { this.map.set(name, s); }

  private pixels(img: CanvasImageSource, w: number, h: number): Uint32Array {
    const c = this.ctx.canvas;
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
    this.ctx.clearRect(0, 0, c.width, c.height);
    this.ctx.drawImage(img, 0, 0);
    const d = this.ctx.getImageData(0, 0, w, h).data;
    return new Uint32Array(d.buffer);
  }

  /** Whole image as one sprite (backdrops). Alpha is snapped to 0/255. */
  addImage(name: string, tex: Pick<Phaser.Textures.Texture,'getSourceImage'>, opaque = false, density: 1 | 2 = 1): void {
    const img = tex.getSourceImage() as HTMLImageElement;
    if (!img || !img.width) return;
    const data = this.pixels(img, img.width, img.height);
    for (let i = 0; i < data.length; i++) {
      const a = data[i] >>> 24;
      data[i] = opaque || a >= 128 ? (data[i] | 0xff000000) >>> 0 : 0;
    }
    this.map.set(name, { w: img.width, h: img.height, data, density });
  }

  /** Slice an atlas into individual sprites. */
  addAtlas(tex: Pick<Phaser.Textures.Texture,'getSourceImage'>, json: AtlasJson): void {
    const img = tex.getSourceImage() as HTMLImageElement;
    if (!img || !img.width) return;
    const all = this.pixels(img, img.width, img.height);
    const aw = img.width;
    for (const [name, f] of Object.entries(json.frames)) {
      const data = new Uint32Array(f.w * f.h);
      // neon tubes are saturated rather than bright: count those as light too
      for (let y = 0; y < f.h; y++) {
        for (let x = 0; x < f.w; x++) {
          const p = all[(f.y + y) * aw + f.x + x];
          const a = p >>> 24;
          if (a < 128) { data[y * f.w + x] = 0; continue; }
          let out = (p | 0xff000000) >>> 0;
          if (f.emissive) {
            // bright pixels of light sources ignore the stage lighting tint
            const r = p & 255, g = (p >> 8) & 255, b = (p >> 16) & 255;
            const density = f.density ?? 1;
            if (emissivePixel(name,r,g,b,x/density,y/density,f.w/density,f.h/density)) out = ((p & 0x00ffffff) | (254 << 24)) >>> 0;
          }
          data[y * f.w + x] = out;
        }
      }
      const spr: Spr = { w: f.w, h: f.h, data, density: f.density ?? 1 };
      // scenery that is drawn small gets two half-size copies (cars, people and the HUD never use them)
      if (f.w >= 24 && f.h >= 24 && !/^(cheer_|crash_|car_|coupe_|sports_|beetle_|pickup_|van_|truck_|trophy|icon_|wx_)/.test(name)) {
        spr.mip = halve(spr);
        if (spr.mip.w >= 12 && spr.mip.h >= 12) spr.mip.mip = halve(spr.mip);
      }
      this.map.set(name, spr);
    }
  }
}

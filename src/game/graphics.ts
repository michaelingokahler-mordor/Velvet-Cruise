import { FB } from '../core/fb';
import { ScaledSurface, type DrawSurface } from '../core/draw-surface';

export type GraphicsMode = 'classic' | 'plus';
export interface GraphicsProfile {
  readonly id: GraphicsMode;
  readonly width: 320 | 640;
  readonly height: 180 | 360;
  readonly scale: 1 | 2;
}
export const GRAPHICS_PROFILES: Readonly<Record<GraphicsMode, GraphicsProfile>> = Object.freeze({
  classic: Object.freeze({ id: 'classic', width: 320, height: 180, scale: 1 }),
  plus: Object.freeze({ id: 'plus', width: 640, height: 360, scale: 2 }),
});
export interface RenderContext {
  readonly profile: GraphicsProfile;
  readonly fb: FB;
  readonly logical: DrawSurface;
}
export function createRenderContext(mode: GraphicsMode): RenderContext {
  const profile = GRAPHICS_PROFILES[mode];
  const fb = new FB(profile.width, profile.height);
  return { profile, fb, logical: new ScaledSurface(fb, profile.scale) };
}

/** Load first, then apply and remember. A superseded request cannot replace a newer choice. */
export class GraphicsSelection<T> {
  mode: GraphicsMode = 'classic';
  busy = false;
  error: 'locked' | 'load' | null = null;
  private request = 0;
  constructor(private load: (mode: GraphicsMode) => Promise<T>,
    private apply: (mode: GraphicsMode, resource: T) => void,
    private remember: (mode: GraphicsMode) => void = () => {}) {}
  async select(mode: GraphicsMode, plusAllowed: boolean): Promise<boolean> {
    const request = ++this.request;
    if (mode === 'plus' && !plusAllowed) { this.busy = false; this.error = 'locked'; return false; }
    this.busy = true; this.error = null;
    try {
      const resource = await this.load(mode);
      if (request !== this.request) return false;
      this.apply(mode, resource);
      this.mode = mode;
      try { this.remember(mode); } catch { /* the current session remains usable */ }
      return true;
    } catch {
      if (request === this.request) this.error = 'load';
      return false;
    } finally { if (request === this.request) this.busy = false; }
  }
}

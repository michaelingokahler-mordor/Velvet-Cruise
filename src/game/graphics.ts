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

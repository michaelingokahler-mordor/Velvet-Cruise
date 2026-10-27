import { SAVE_PREFIX } from '../game/edition';

export type AudioChannel = 'music' | 'effects';
export interface AudioLevels { music: number; effects: number }
export const AUDIO_SETTINGS_KEY = `${SAVE_PREFIX}.audio`;
const DEFAULTS: AudioLevels = { music: 60, effects: 80 };
const percent = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value)
  ? Math.round(Math.max(0, Math.min(100, value))) : fallback;

/** Device-local levels; the current session works when storage is unavailable. */
export class AudioSettings {
  readonly levels: AudioLevels = { ...DEFAULTS };
  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || '{}');
      this.levels.music = percent(saved?.music, DEFAULTS.music);
      this.levels.effects = percent(saved?.effects, DEFAULTS.effects);
    } catch { /* malformed or blocked storage keeps defaults */ }
  }
  set(channel: AudioChannel, value: number): number {
    this.levels[channel] = percent(value, this.levels[channel]);
    try { localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.levels)); } catch { /* session only */ }
    return this.levels[channel];
  }
}

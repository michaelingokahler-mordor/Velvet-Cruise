import times from '../../assets/ui/stage-times.json';
import type { Theme, Weather } from './themes';
import { ELEVATION_PROFILES } from './elevation';

export type TimeOfDay = 'afternoon' | 'sunset' | 'dusk' | 'night';
const STAGE_TIMES = times as Record<string, TimeOfDay>;
export const TIME_ICON: Record<TimeOfDay, string> = { afternoon: 'wx_sun', sunset: 'wx_sun', dusk: 'wx_moon', night: 'wx_moon' };
export const WEATHER_ICON: Record<Weather, string> = { clear: 'wx_sun', rain: 'wx_rain', fog: 'wx_fog', sand: 'wx_sand', heat: 'wx_heat', night: 'wx_moon', snow: 'wx_snow' };
export const WEATHER_KEY: Record<Weather, string> = { clear: 'wx.clear', rain: 'wx.rain', fog: 'wx.fog', sand: 'wx.sand', heat: 'wx.heat', night: 'wx.night', snow: 'wx.snow' };

/** Weather darkness can be caused by clouds; it is not a clock. */
export function stageTimeOfDay(theme: Theme): TimeOfDay {
  return STAGE_TIMES[theme.id] ?? 'afternoon';
}

export function weatherIcon(theme: Theme): string {
  return (theme.weather ?? 'clear') === 'clear' ? TIME_ICON[stageTimeOfDay(theme)] : WEATHER_ICON[theme.weather!];
}

export function roadFeatureKey(node: number): string {
  return `route.feature.${ELEVATION_PROFILES[node]?.feature ?? 'road'}`;
}

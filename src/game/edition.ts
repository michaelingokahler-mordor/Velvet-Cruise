/** Selected by Vite at build time. URL parameters cannot change the edition. */
declare const __DEMO__: boolean;
export const DEMO = typeof __DEMO__ !== 'undefined' && __DEMO__;

/** Keep demo preferences, badges and records separate, even on the same origin. */
export const SAVE_PREFIX = DEMO ? 'sunset-coast-run.demo-e' : 'sunset-coast-run';

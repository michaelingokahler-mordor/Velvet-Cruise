/** Selected by Vite at build time. URL parameters cannot change the edition. */
declare const __DEMO_A__: boolean;
export const DEMO_A = typeof __DEMO_A__ !== 'undefined' && __DEMO_A__;

/** Keep demo preferences, badges and records separate, even on the same origin. */
export const SAVE_PREFIX = DEMO_A ? 'sunset-coast-run.demo-a' : 'sunset-coast-run';

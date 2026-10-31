/** Production rankings have their own policy; enabling them never enables statistics. */
export function productionRankingsAllowed(gate: { production: boolean; href: string; desktop: boolean; desktopEnabled: boolean; automation: boolean }): boolean {
  if (!gate.production || gate.automation) return false;
  try {
    const url = new URL(gate.href);
    if (gate.desktop) return gate.desktopEnabled && url.protocol === 'velvet-game:' && url.host === 'game-20261009-93986676' && url.pathname === '/';
    return url.origin === 'https://sabnockworks.com' && url.pathname.startsWith('/games/more-projects/velvet-cruise/');
  } catch { return false; }
}

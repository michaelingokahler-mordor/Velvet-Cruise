/** Native capability and build metadata, independent of online services. */
export function isDesktopBuild(): boolean {
  try {
    if (import.meta.env?.VITE_DESKTOP_BUILD === 'true') return true;
    if ((window as unknown as { VelvetDesktop?: { embedded?: boolean } }).VelvetDesktop?.embedded === true) return true;
    const meta = document.getElementById('velvet-runtime');
    return !!meta && JSON.parse(meta.textContent || '{}').target === 'desktop';
  } catch { return false; }
}

/** Automated and debug runs never initialize player-facing remote services. */
export function isAutomationRun(): boolean {
  try {
    const w = window as unknown as { __VELVET_TEST__?: boolean };
    return navigator.webdriver === true || !!w.__VELVET_TEST__ || /autopilot|stage=|sim=|yelltest|radiotest|tumbletest|nametest|endtest|path=|maptest|graphicstest|graphics=|oldslopes|qa|test/i.test(location.hash + location.search);
  } catch { return false; }
}

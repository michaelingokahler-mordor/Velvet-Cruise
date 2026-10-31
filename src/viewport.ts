/** Keep Phaser's FIT parent inside the visible viewport. Never change native rendering resolution. */
export class GameViewport {
  private frame = 0;
  private until = 0;
  private last = '';
  private probe: HTMLDivElement;
  private observer: ResizeObserver | null = null;
  private visual = window.visualViewport;

  constructor(private parent: HTMLElement, private refresh: () => void) {
    this.probe = document.createElement('div');
    this.probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(this.probe);
    for (const event of ['resize', 'orientationchange', 'pageshow', 'focus']) window.addEventListener(event, this.schedule);
    document.addEventListener('visibilitychange', this.schedule);
    this.visual?.addEventListener('resize', this.schedule);
    this.visual?.addEventListener('scroll', this.schedule);
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.schedule);
      this.observer.observe(parent);
    }
    this.schedule();
  }

  // iOS can report intermediate sizes during rotation; re-read for a bounded settling period.
  schedule = (): void => {
    this.until = performance.now() + 700;
    this.last = '';
    if (!this.frame) this.frame = requestAnimationFrame(this.update);
  };

  private update = (): void => {
    this.frame = 0;
    const v = window.visualViewport;
    const css = getComputedStyle(this.probe);
    const top = parseFloat(css.paddingTop) || 0, right = parseFloat(css.paddingRight) || 0;
    const bottom = parseFloat(css.paddingBottom) || 0, left = parseFloat(css.paddingLeft) || 0;
    const width = Math.max(1, (v?.width ?? window.innerWidth) - left - right);
    const height = Math.max(1, (v?.height ?? window.innerHeight) - top - bottom);
    const x = (v?.offsetLeft ?? 0) + left, y = (v?.offsetTop ?? 0) + top;
    const key = [x,y,width,height].join(':');
    if (key !== this.last) {
      this.last = key;
      Object.assign(this.parent.style, {left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`,right:'auto',bottom:'auto'});
      this.refresh();
    }
    if (performance.now() < this.until) this.frame = requestAnimationFrame(this.update);
  };

  destroy(): void {
    cancelAnimationFrame(this.frame);
    for (const event of ['resize', 'orientationchange', 'pageshow', 'focus']) window.removeEventListener(event, this.schedule);
    document.removeEventListener('visibilitychange', this.schedule);
    this.visual?.removeEventListener('resize', this.schedule);
    this.visual?.removeEventListener('scroll', this.schedule);
    this.observer?.disconnect();
    this.probe.remove();
  }
}

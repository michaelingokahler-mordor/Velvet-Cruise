// Real, clickable web links laid over text the framebuffer draws (the credits
// page). Each link is a transparent <a target="_blank"> placed over its words
// every frame it is shown, and hidden on every other frame, so it never gets in
// the way of the game. Keyboard players open the selected link with Enter.
import { W, H } from "../core/fb";

export interface LinkRect { x: number; y: number; w: number; h: number }

export class LinkLayer {
  private els = new Map<string, HTMLAnchorElement>();
  private shown = new Set<string>();

  constructor(private canvas: HTMLCanvasElement) {}

  /** Show the link to `href` (labelled `text`) over framebuffer rect `r` this frame. */
  place(href: string, text: string, r: LinkRect): void {
    let a = this.els.get(href);
    if (!a) {
      a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = text;
      a.setAttribute("aria-label", text);
      a.className = "game-link";
      Object.assign(a.style, {
        position: "fixed", zIndex: "20", display: "none", overflow: "hidden", whiteSpace: "nowrap",
        color: "transparent", background: "transparent", textDecoration: "none", cursor: "pointer",
        fontSize: "1px", lineHeight: "1px", outline: "none",
      });
      document.body.appendChild(a);
      this.els.set(href, a);
    }
    const b = this.canvas.getBoundingClientRect();
    const sx = b.width / W, sy = b.height / H;
    a.style.left = `${b.left + r.x * sx}px`;
    a.style.top = `${b.top + r.y * sy}px`;
    a.style.width = `${r.w * sx}px`;
    a.style.height = `${r.h * sy}px`;
    a.style.display = "block";
    this.shown.add(href);
  }

  /** Hide every link that was not placed this frame. */
  endFrame(): void {
    for (const [href, a] of this.els) if (!this.shown.has(href) && a.style.display !== "none") a.style.display = "none";
    this.shown.clear();
  }

  /** Open a link from a key press (still inside the player's gesture). */
  open(href: string): void {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}

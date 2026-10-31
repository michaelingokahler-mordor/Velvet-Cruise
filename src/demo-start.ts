import './demo-start.css';

/** Show the demo's content information before any game services or renderer start. */
export function waitForDemoStart(): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className = 'demo-start';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'demo-rating-title');
  overlay.setAttribute('aria-describedby', 'demo-rating-notes');
  const panel = document.createElement('div'); panel.className = 'demo-start__panel';
  const name = document.createElement('p'); name.className = 'demo-start__name'; name.textContent = 'Velvet Cruise · Demo';
  const title = document.createElement('h1'); title.id = 'demo-rating-title';
  title.textContent = 'Ages 6 and up — classification by SabnockWorks';
  const notes = document.createElement('p'); notes.id = 'demo-rating-notes';
  notes.textContent = 'Mild language · Cartoon crashes · Time pressure';
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Play the Demo';
  panel.append(name, title, notes, button); overlay.append(panel);
  const game = document.getElementById('game');
  const oldInert = game?.inert ?? false, oldHidden = game?.getAttribute('aria-hidden');
  if (game) { game.inert = true; game.setAttribute('aria-hidden', 'true'); }
  document.body.append(overlay);
  button.focus({preventScroll:true});

  return new Promise(resolve => {
    let settled = false, frame = 0, padHeld = false, wantsStart = false;
    const heldKeys = new Set<string>();
    const gamepadPressed = () => {
      try { return Array.from(navigator.getGamepads?.() ?? []).some(pad => !!pad?.buttons[0] && (pad.buttons[0].pressed || pad.buttons[0].value > .5)); }
      catch { return false; /* Keyboard and touch remain available if gamepad access is blocked. */ }
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
      window.removeEventListener('blur', blur);
      button.removeEventListener('click', requestStart);
      overlay.remove();
      if (game) {
        game.inert = oldInert;
        if (oldHidden == null) game.removeAttribute('aria-hidden');
        else game.setAttribute('aria-hidden', oldHidden);
      }
      resolve();
    };
    const requestStart = () => {
      wantsStart = true;
      if (heldKeys.size === 0 && !gamepadPressed()) finish();
    };
    const blur = () => { heldKeys.clear(); wantsStart = false; padHeld = false; };
    const confirmKey = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' ';
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') { event.preventDefault(); button.focus(); }
      if (confirmKey(event)) {
        heldKeys.add(event.code || event.key);
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (!confirmKey(event)) return;
      heldKeys.delete(event.code || event.key);
      event.preventDefault(); event.stopImmediatePropagation(); requestStart();
    };
    const poll = () => {
      if (settled) return;
      const pressed = gamepadPressed();
      if (padHeld && !pressed) wantsStart = true;
      if (wantsStart && heldKeys.size === 0 && !pressed) { finish(); return; }
      padHeld = pressed;
      frame = requestAnimationFrame(poll);
    };
    button.addEventListener('click', requestStart);
    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('keyup', keyUp, true);
    window.addEventListener('blur', blur);
    frame = requestAnimationFrame(poll);
  });
}

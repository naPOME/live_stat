// ─── Wallpaper Store ───────────────────────────────────────────────────────────
// Manages background image selection for full-screen overlay widgets.
// Wallpaper files live in public/wallpapers/ — the controller picks one and
// all full-screen widgets (results, leaderboard, MVP, fraggers, WWCD, etc.) use it.

type Listener = () => void;
const listeners = new Set<Listener>();

let activeWallpaper: string | null = null; // e.g. '/wallpapers/erangel.jpg'

export function getWallpaper(): string | null {
  return activeWallpaper;
}

export function setWallpaper(url: string | null): void {
  activeWallpaper = url;
  notify();
}

export function subscribeWallpaper(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) { try { fn(); } catch { /* */ } }
}

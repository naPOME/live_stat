// ─── Global Theme Store ──────────────────────────────────────────────────
// Controls the active PALETTE index for all broadcast overlays.
// Operates completely independent of widget visibility to avoid breaking legacy code.

let activeThemeIdx = 0;
const listeners = new Set<() => void>();

export function getThemeIdx(): number {
  return activeThemeIdx;
}

export function setThemeIdx(idx: number): void {
  activeThemeIdx = idx;
  notify();
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore */ }
  }
}

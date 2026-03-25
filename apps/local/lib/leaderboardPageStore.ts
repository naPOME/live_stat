// ─── Leaderboard Page Store ────────────────────────────────────────────────────
// For broadcast mode: page 1 shows teams 1-10, page 2 shows teams 11+.
// Controller toggles page; master overlay reads it.

type Listener = () => void;
const listeners = new Set<Listener>();

let currentPage = 1; // 1 or 2

export function getLeaderboardPage(): number {
  return currentPage;
}

export function setLeaderboardPage(page: number): void {
  currentPage = page;
  notify();
}

export function toggleLeaderboardPage(): number {
  currentPage = currentPage === 1 ? 2 : 1;
  notify();
  return currentPage;
}

export function subscribeLeaderboardPage(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) { try { fn(); } catch { /* */ } }
}

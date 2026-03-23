'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Session = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  api_key: string;
  stages: Array<{
    id: string;
    name: string;
    status: string;
    match_count: number | null;
    matches: Array<{ id: string; name: string; status: string }>;
  }>;
};

const MATCH_OPTIONS = [
  { value: 1, label: '1 Game' },
  { value: 2, label: '2 Games' },
  { value: 3, label: '3 Games' },
  { value: 5, label: '5 Games' },
  { value: 10, label: 'Day Session' },
];

export default function QuickStreamClient({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [matchCount, setMatchCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/quick-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, match_count: matchCount }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      showToast('Session created');
      setCreating(false);
      setName('');
      router.push(`/quick-stream/${data.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setLoading(false);
    }
  }

  function getSessionStatus(session: Session) {
    const stage = session.stages?.[0];
    if (!stage) return { label: 'Empty', color: 'var(--text-muted)' };
    const matches = stage.matches ?? [];
    const finished = matches.filter(m => m.status === 'finished').length;
    if (finished === matches.length && matches.length > 0) return { label: 'Completed', color: 'var(--accent)' };
    if (finished > 0) return { label: `${finished}/${matches.length} played`, color: 'var(--amber)' };
    return { label: 'Ready', color: 'var(--text-muted)' };
  }

  return (
    <div className="max-w-[900px] page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Quick Stream</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Stream games instantly — no team registration needed
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary inline-flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M10 2L4 10.5H9L8 16L14 7.5H9L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          New Session
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="surface mb-6 animate-slide-down">
          <form onSubmit={handleCreate} className="p-6 space-y-6">
            <div className="font-body text-[14px] font-medium text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-4">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="text-[var(--text-muted)]">
                <path d="M10 2L4 10.5H9L8 16L14 7.5H9L10 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
              New Quick Stream Session
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Session Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Quick Stream — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="label">Match Count</label>
                <div className="flex gap-2">
                  {MATCH_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMatchCount(opt.value)}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium border transition-all ${
                        matchCount === opt.value
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-none">
                {loading ? 'Creating...' : 'Start Session'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="btn-ghost flex-1 sm:flex-none">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 18 18" fill="none" className="text-[var(--text-muted)]">
                <path d="M10 2L4 10.5H9L8 16L14 7.5H9L10 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Sessions Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">
              Create a quick stream session to start broadcasting games instantly. No team setup required — just start your game.
            </p>
            <button onClick={() => setCreating(true)} className="btn-primary inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M10 2L4 10.5H9L8 16L14 7.5H9L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              New Session
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 animate-slide-up">
          {sessions.map(session => {
            const status = getSessionStatus(session);
            const stage = session.stages?.[0];
            const matchTotal = stage?.matches?.length ?? 0;
            const finished = stage?.matches?.filter(m => m.status === 'finished').length ?? 0;

            return (
              <Link
                key={session.id}
                href={`/quick-stream/${session.id}`}
                className="surface flex items-center gap-4 p-4 hover:border-[var(--border-hover)] transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--bg-elevated)] flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="text-[var(--text-muted)]">
                    <path d="M10 2L4 10.5H9L8 16L14 7.5H9L10 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">
                    {session.name}
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    {matchTotal} game{matchTotal !== 1 ? 's' : ''} · {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {/* Progress */}
                {matchTotal > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {Array.from({ length: matchTotal }, (_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full transition-colors"
                        style={{
                          backgroundColor: i < finished ? 'var(--accent)' : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                )}

                <span
                  className="text-[11px] font-display font-bold uppercase tracking-wider flex-shrink-0"
                  style={{ color: status.color }}
                >
                  {status.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-up ${
          toast.type === 'error' ? 'bg-[var(--red)] text-white' : 'bg-[var(--accent)] text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

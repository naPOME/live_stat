'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTeams, useCreateTeam, useDeleteTeam } from '@/lib/hooks/use-teams';
import type { Team } from '@/lib/types';

type TeamsClientProps = {
  initialTeams: Team[];
  initialHasTournaments: boolean;
  initialPlayerCounts: Record<string, number>;
  orgId: string;
};

export default function TeamsClient({ initialTeams, initialHasTournaments, initialPlayerCounts, orgId }: TeamsClientProps) {
  const { data: teams = [] } = useTeams(orgId, initialTeams);
  const createTeamMutation = useCreateTeam(orgId);
  const deleteTeamMutation = useDeleteTeam();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', short_name: '', brand_color: '#00ffc3' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createTeamMutation.mutate(
      { name: form.name.trim(), short_name: form.short_name.trim() || null, brand_color: form.brand_color },
      {
        onSuccess: () => {
          setForm({ name: '', short_name: '', brand_color: '#00ffc3' });
          setAdding(false);
          showToast('Team created');
        },
        onError: (err) => showToast(err.message, 'error'),
      },
    );
  }

  function deleteTeam(teamId: string) {
    const team = teams.find(t => t.id === teamId);
    setConfirmDialog({
      title: 'Delete Team',
      message: `Delete "${team?.name ?? 'this team'}"? This will also remove all their players.`,
      onConfirm: () => {
        setConfirmDialog(null);
        deleteTeamMutation.mutate(teamId, {
          onSuccess: () => showToast('Team deleted'),
          onError: (err) => showToast(err.message, 'error'),
        });
      },
    });
  }

  return (
    <div className="p-10 max-w-[900px] page-enter">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Teams</h1>
          <p className="text-[var(--text-secondary)] text-sm font-body">
            {teams.length} team{teams.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary inline-flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <span>Register Team</span>
        </button>
      </div>

      {/* No tournament warning */}
      {!initialHasTournaments && (
        <div className="bg-warning-soft border border-warning rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between animate-slide-down">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-warning flex-shrink-0">
              <path d="M9 2L16 15H2L9 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M9 8v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="9" cy="13" r="0.7" fill="currentColor"/>
            </svg>
            <span className="text-warning text-sm font-medium">Create a tournament first — teams are assigned to matches within a tournament.</span>
          </div>
          <Link href="/tournaments/new" className="btn-ghost btn-sm flex-shrink-0 ml-4 text-warning border-warning">
            + New Tournament
          </Link>
        </div>
      )}

      {/* New team form */}
      {adding && (
        <div className="surface mb-6 animate-slide-down">
          <form onSubmit={handleCreateTeam} className="p-6 space-y-6">
            <div className="font-body text-[14px] font-medium text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-4">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-[var(--text-muted)]"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Register New Team
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label">Team Name *</label>
                <input autoFocus type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required placeholder="e.g. Sentinels" className="input-premium" />
              </div>
              <div>
                <label className="label">Tag (Optional)</label>
                <input type="text" value={form.short_name}
                  onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value.toUpperCase().slice(0, 5) }))}
                  placeholder="SEN" className="input-premium uppercase" />
              </div>
              <div>
                <label className="label">Brand Color</label>
                <div className="flex items-center gap-3">
                  <label className="relative cursor-pointer w-10 h-10 shrink-0 block">
                    <input type="color" value={form.brand_color}
                      onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                    <div className="w-10 h-10 rounded-lg border border-[var(--border)]"
                      style={{ backgroundColor: form.brand_color }} />
                  </label>
                  <span className="text-[13px] font-mono text-[var(--text-secondary)] uppercase">{form.brand_color}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createTeamMutation.isPending} className="btn-primary flex-1 sm:flex-none">
                {createTeamMutation.isPending ? 'Saving...' : 'Save Team'}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="btn-ghost flex-1 sm:flex-none">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Teams table */}
      {teams.length === 0 ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <circle cx="17" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" opacity="0.5"/>
                <path d="M2 22c0-4 3.5-7 7-7s7 3 7 7" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Teams Registered</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">
              Create your teams and add players with their in-game IDs so they can be matched during live games.
            </p>
            <button onClick={() => setAdding(true)} className="btn-primary inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Register Team</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="surface overflow-hidden stagger">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_80px_80px] items-center gap-4 px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg-base)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Logo</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Team</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">Players</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {teams.map((team) => {
              const color = team.brand_color || '#7a8ba8';
              const playerCount = initialPlayerCounts[team.id] ?? 0;

              return (
                <div key={team.id} className="grid grid-cols-[48px_1fr_80px_80px] items-center gap-4 px-5 py-3 hover:bg-[var(--bg-hover)] transition-colors group">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-[13px] border select-none"
                        style={{ backgroundColor: color + '18', borderColor: `${color}35`, color }}
                      >
                        {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + tag */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[15px] text-[var(--text-primary)] truncate">{team.name}</span>
                      {team.short_name && (
                        <span
                          className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ backgroundColor: color + '18', color }}
                        >
                          {team.short_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Player count */}
                  <div className="text-center">
                    <span className="text-[14px] font-medium text-[var(--text-primary)]">{playerCount}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/teams/${team.id}`}
                      className="btn-ghost btn-sm"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      title="Delete team"
                      className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-up ${
          toast.type === 'error' ? 'bg-[var(--red)] text-white' : 'bg-[var(--accent)] text-black'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="surface-elevated rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-slide-up">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDialog(null)} className="btn-ghost">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className="btn-primary bg-[var(--red)] hover:bg-[var(--red)]">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

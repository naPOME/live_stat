'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTeams, useCreateTeam, useDeleteTeam } from '@/lib/hooks/use-teams';
import { createClient } from '@/lib/supabase/client';
import type { Team } from '@/lib/types';

interface Player {
  id: string;
  display_name: string;
  player_open_id: string;
  team_id: string;
}

type TeamsClientProps = {
  initialTeams: Team[];
  initialHasTournaments: boolean;
  initialPlayerCounts: Record<string, number>;
  orgId: string;
};

export default function TeamsClient({ initialTeams, initialHasTournaments, initialPlayerCounts, orgId }: TeamsClientProps) {
  const supabase = createClient();
  const { data: teams = [] } = useTeams(orgId, initialTeams);
  const createTeamMutation = useCreateTeam(orgId);
  const deleteTeamMutation = useDeleteTeam();

  const [playersByTeam, setPlayersByTeam] = useState<Record<string, Player[]>>({});
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', short_name: '', brand_color: '#00ffc3' });
  const [expanded, setExpanded] = useState<string | null>(null);
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
        setPlayersByTeam((prev) => {
          const next = { ...prev };
          delete next[teamId];
          return next;
        });
        deleteTeamMutation.mutate(teamId, {
          onSuccess: () => showToast('Team deleted'),
          onError: (err) => showToast(err.message, 'error'),
        });
      },
    });
  }

  async function ensureTeamPlayers(teamId: string) {
    if (playersByTeam[teamId]) return;
    const { data } = await supabase
      .from('players')
      .select('id, display_name, player_open_id, team_id')
      .eq('team_id', teamId)
      .order('display_name');
    setPlayersByTeam((prev) => ({ ...prev, [teamId]: (data as Player[]) ?? [] }));
  }

  function getPlayerCount(teamId: string): number {
    // If we've loaded the full roster, use that (most accurate)
    if (playersByTeam[teamId]) return playersByTeam[teamId].length;
    // Fall back to server-side count
    return initialPlayerCounts[teamId] ?? 0;
  }

  return (
    <div className="p-8 max-w-[1100px] page-enter">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">
            Teams
          </h1>
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
        <div className="surface mb-8 animate-slide-down">
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
                  required placeholder="e.g. Sentinels"
                  className="input-premium" />
              </div>

              <div>
                <label className="label">Tag (Optional)</label>
                <input type="text" value={form.short_name}
                  onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value.toUpperCase().slice(0, 5) }))}
                  placeholder="SEN"
                  className="input-premium uppercase" />
              </div>

              <div>
                <label className="label">Brand Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative group/color">
                    <label className="relative cursor-pointer w-10 h-10 shrink-0 block z-10">
                      <input type="color" value={form.brand_color}
                        onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20" />
                      <div className="w-10 h-10 rounded-lg border border-[var(--border)] absolute inset-0 transition-transform hover:scale-[1.05]"
                        style={{ backgroundColor: form.brand_color }} />
                    </label>
                  </div>
                  <span className="text-[13px] font-mono text-[var(--text-secondary)] uppercase">{form.brand_color}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createTeamMutation.isPending} className="btn-primary flex-1 sm:flex-none">
                {createTeamMutation.isPending ? 'Saving...' : 'Save Team'}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="btn-ghost flex-1 sm:flex-none">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teams grid / empty state */}
      {teams.length === 0 ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center relative overflow-hidden flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <circle cx="17" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" opacity="0.5"/>
                <path d="M2 22c0-4 3.5-7 7-7s7 3 7 7" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Teams Registered</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Create your teams and add players with their in-game IDs so they can be matched during live games.</p>
            <button onClick={() => setAdding(true)} className="btn-primary inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Register Team</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {teams.map((team) => {
            const isOpen = expanded === team.id;
            const color = team.brand_color || '#7a8ba8';
            const playerCount = getPlayerCount(team.id);
            const teamPlayers = playersByTeam[team.id];

            return (
              <div key={team.id} className="surface overflow-hidden flex flex-col">
                {/* Card header — colored accent bar */}
                <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: color }} />

                {/* Main card body */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Logo + team info row */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Logo — large and prominent */}
                    <div className="flex-shrink-0">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-20 h-20 rounded-xl object-cover border border-[var(--border)] shadow-sm"
                        />
                      ) : (
                        <div
                          className="w-20 h-20 rounded-xl flex items-center justify-center font-display font-bold text-2xl flex-shrink-0 border shadow-sm select-none"
                          style={{ backgroundColor: color + '18', borderColor: `${color}35`, color }}
                        >
                          {(team.short_name ?? team.name).substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name, tag, player count */}
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="font-display font-semibold text-[16px] text-[var(--text-primary)] truncate leading-tight mb-1">
                        {team.name}
                      </div>
                      {team.short_name && (
                        <span
                          className="inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md mb-2"
                          style={{ backgroundColor: color + '18', color }}
                        >
                          {team.short_name}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" className="text-[var(--text-muted)] flex-shrink-0">
                          <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="15" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" opacity="0.5"/>
                          <path d="M17 17c0-2.2-1.3-4-3-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
                        </svg>
                        <span className="text-[13px] text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">{playerCount}</span> player{playerCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto pt-3 border-t border-[var(--border)]">
                    <Link
                      href={`/teams/${team.id}`}
                      className="btn-ghost btn-sm flex-1 text-center justify-center"
                    >
                      Configure
                    </Link>
                    <button
                      onClick={async () => {
                        const nextId = isOpen ? null : team.id;
                        setExpanded(nextId);
                        if (nextId) await ensureTeamPlayers(nextId);
                      }}
                      className={`btn-sm flex items-center gap-1.5 flex-shrink-0 transition-colors ${
                        isOpen
                          ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                          : 'btn-ghost'
                      }`}
                    >
                      <svg
                        width="13" height="13" viewBox="0 0 16 16" fill="none"
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Roster
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="btn-ghost btn-sm flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] border-transparent hover:border-transparent transition-colors"
                      title="Delete team"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expandable roster panel */}
                {isOpen && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-surface)] animate-slide-down">
                    {!teamPlayers ? (
                      <div className="px-5 py-6 text-center text-[var(--text-muted)] text-[13px]">Loading…</div>
                    ) : teamPlayers.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-[var(--text-muted)] text-[13px] mb-3">No players added yet</p>
                        <Link href={`/teams/${team.id}`} className="btn-ghost btn-sm">
                          Manage Roster
                        </Link>
                      </div>
                    ) : (
                      <div className="px-4 py-3 space-y-1 max-h-52 overflow-y-auto">
                        {teamPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                          >
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ background: color + '20', color }}
                            >
                              {(player.display_name || '?').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[13px] font-medium text-[var(--text-primary)] flex-1 min-w-0 truncate">
                              {player.display_name}
                            </span>
                            <span className="badge badge-muted font-mono text-[11px] truncate max-w-[130px] flex-shrink-0">
                              {player.player_open_id || 'PENDING'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

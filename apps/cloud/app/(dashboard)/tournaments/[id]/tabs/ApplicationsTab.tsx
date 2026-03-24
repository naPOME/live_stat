'use client';

import { useState } from 'react';
import { useTournament } from '../_context';

export default function ApplicationsTab() {
  const {
    tournament, setTournament, applications,
    accepting, selectedApplicationIds, setSelectedApplicationIds,
    linkCopied, copyRegistrationLink,
    acceptApplication, acceptSelectedApplications, autoAcceptFirstN, rejectApplication,
    updateRegistrationSettings,
  } = useTournament();

  const [selectFirstCount, setSelectFirstCount] = useState<number | ''>('');

  if (!tournament) return null;

  const pendingApps = applications.filter((a) => a.status === 'pending');

  function selectFirstNApplications() {
    const count = Math.max(0, Number(selectFirstCount) || 0);
    const sorted = pendingApps.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setSelectedApplicationIds(sorted.slice(0, count).map((a) => a.id));
  }

  return (
    <div className="space-y-4">
      {/* Registration status + toggle */}
      <div className="surface-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${tournament.registration_open ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--text-muted)]/30'}`} />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Registration {tournament.registration_open ? 'Open' : 'Closed'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {tournament.registration_open
                  ? 'Teams can apply via the link below'
                  : 'The registration link is disabled — no one can access it'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={tournament.registration_open ?? true}
                onChange={(e) => setTournament((t) => t ? { ...t, registration_open: e.target.checked } : t)}
                className="sr-only peer" />
              <div className="w-10 h-6 rounded-full bg-[var(--bg-base)] border border-[var(--border)] peer-checked:bg-[var(--accent)]/15 peer-checked:border-[var(--accent-border)] transition-all" />
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-[var(--text-muted)] peer-checked:bg-[var(--accent)] peer-checked:translate-x-4 transition-all" />
            </label>
            <button onClick={updateRegistrationSettings} className="btn-primary text-xs px-3 py-1.5">Save</button>
          </div>
        </div>

        {/* Link — only shown when open */}
        {tournament.registration_open && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)]">Registration Link</span>
              <button onClick={copyRegistrationLink} className="btn-ghost text-xs px-3 py-1">
                {linkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm font-mono text-[var(--text-secondary)] truncate select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/apply/${tournament.id}` : `/apply/${tournament.id}`}
            </div>
          </div>
        )}
      </div>

      {/* Registration settings */}
      {tournament.registration_open && (
        <div className="surface-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Registration Settings</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">Control how teams can register</div>
            </div>
            <button onClick={updateRegistrationSettings} className="btn-primary text-xs px-4 py-2">Save Settings</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Registration Mode</label>
              <select value={tournament.registration_mode}
                onChange={(e) => setTournament((t) => t ? { ...t, registration_mode: e.target.value as 'open' | 'cap' | 'pick_first' } : t)}
                className="input-premium w-full">
                <option value="open">Open — accept all teams</option>
                <option value="cap">Capped — close after limit</option>
                <option value="pick_first">Review — you choose</option>
              </select>
            </div>
            <div>
              <label className="label">Max Teams {tournament.registration_mode === 'open' && <span className="text-[var(--text-muted)]">(ignored)</span>}</label>
              <input type="number" min={0} value={tournament.registration_limit ?? ''}
                onChange={(e) => setTournament((t) => t ? { ...t, registration_limit: e.target.value === '' ? null : Number(e.target.value) } : t)}
                placeholder="e.g. 60" className="input-premium w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions (review mode) */}
      {tournament.registration_mode === 'pick_first' && pendingApps.length > 0 && (
        <div className="surface-elevated p-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bulk Actions</span>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <input type="number" min={1} value={selectFirstCount}
              onChange={(e) => setSelectFirstCount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Count" className="input-premium w-20 text-xs py-1.5" />
            <button onClick={selectFirstNApplications} className="btn-ghost btn-sm text-xs">Select First</button>
          </div>
          <button onClick={acceptSelectedApplications} disabled={selectedApplicationIds.length === 0}
            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40">
            Accept {selectedApplicationIds.length > 0 ? `(${selectedApplicationIds.length})` : 'Selected'}
          </button>
          <button onClick={autoAcceptFirstN} className="btn-ghost btn-sm text-xs">Accept All Pending</button>
        </div>
      )}

      {/* Stats */}
      {applications.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', value: applications.filter((a) => a.status === 'pending').length, cls: 'text-amber-400' },
            { label: 'Accepted', value: applications.filter((a) => a.status === 'accepted').length, cls: 'text-[var(--accent)]' },
            { label: 'Rejected', value: applications.filter((a) => a.status === 'rejected').length, cls: 'text-[var(--red)]' },
          ].map((s) => (
            <div key={s.label} className="surface-elevated rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Application list */}
      {applications.length === 0 ? (
        <div className="surface border border-dashed border-[var(--border)] rounded-2xl p-12 text-center">
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">No applications yet</h3>
          <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto">Share the registration link above with teams.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const isPending = app.status === 'pending';
            const isAccepted = app.status === 'accepted';
            return (
              <div key={app.id} className={`surface overflow-hidden ${isPending ? 'border-amber-500/20' : ''}`}>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {tournament.registration_mode === 'pick_first' && isPending && (
                      <input type="checkbox" checked={selectedApplicationIds.includes(app.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedApplicationIds((p) => [...p, app.id]);
                          else setSelectedApplicationIds((p) => p.filter((x) => x !== app.id));
                        }}
                        className="accent-[var(--accent)] w-4 h-4" />
                    )}
                    {app.logo_url ? (
                      <img src={app.logo_url} alt={app.team_name} className="w-10 h-10 rounded-lg object-cover border border-[var(--border)] flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                        <span className="text-[var(--accent)]">{(app.short_name ?? app.team_name).substring(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)] truncate">{app.team_name}</span>
                        {app.short_name && <span className="badge badge-muted text-[10px]">{app.short_name}</span>}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-500/15 text-amber-400' : isAccepted ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--red)]/10 text-[var(--red)]'}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)]">
                        <span>{app.players.length} player{app.players.length !== 1 ? 's' : ''}</span>
                        {app.contact_email && (
                          <span className="flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-50">
                              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.13l-1.97 9.28c-.15.67-.54.83-1.09.52l-3.02-2.22-1.46 1.4c-.16.16-.3.3-.61.3l.22-3.06 5.54-5c.24-.22-.05-.33-.38-.13l-6.85 4.31-2.95-.92c-.64-.2-.65-.64.13-.95l11.54-4.45c.53-.2 1 .13.82.94z"/>
                            </svg>
                            {app.contact_email.startsWith('@') ? app.contact_email : `@${app.contact_email}`}
                          </span>
                        )}
                        <span>{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {isPending && (
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button onClick={() => acceptApplication(app)} disabled={accepting === app.id} className="btn-primary text-xs px-4 py-2">
                        {accepting === app.id ? 'Accepting...' : 'Accept'}
                      </button>
                      <button onClick={() => rejectApplication(app.id)} className="btn-ghost btn-sm text-xs text-[var(--text-muted)] hover:text-[var(--red)]">Reject</button>
                    </div>
                  )}
                </div>
                <div className="border-t border-[var(--border)] px-5 py-3 bg-[var(--bg-base)]">
                  <div className="grid grid-cols-[1fr_1fr] gap-2 mb-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Player Name</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">In-Game Character ID</span>
                  </div>
                  {app.players.map((p, pi) => (
                    <div key={pi} className="grid grid-cols-[1fr_1fr] gap-2 py-1">
                      <span className="text-sm text-[var(--text-primary)]">{p.display_name}</span>
                      <span className="text-sm text-[var(--text-muted)] font-mono">{p.player_open_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

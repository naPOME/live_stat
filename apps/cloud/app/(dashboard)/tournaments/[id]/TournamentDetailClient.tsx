'use client';

import Link from 'next/link';
import { TournamentProvider, useTournament } from './_context';
import type { TournamentData, PointSystem, Tab } from './_types';
import OverviewTab from './tabs/OverviewTab';
import StagesTab from './tabs/StagesTab';
import StandingsTab from './tabs/StandingsTab';
import ApplicationsTab from './tabs/ApplicationsTab';
import OpsTab from './tabs/OpsTab';

// ─── Inner component (has access to context) ──────────────────────────────────

function TournamentDetail() {
  const {
    tournament, stages,
    activeTab, setActiveTab,
    totalMatches, tournamentTeams, pendingApps,
    toast, setToast,
    confirmDialog, setConfirmDialog,
    archiveTournament,
  } = useTournament();

  if (!tournament) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
      ),
    },
    {
      id: 'stages',
      label: 'Stages',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
      ),
    },
    {
      id: 'standings',
      label: 'Standings',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 11V6m3.5 5V3M9 11V5m3.5 6V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: 'applications',
      label: 'Applications',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M9 2H5a1 1 0 00-1 1v8a1 1 0 001 1h4a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 5h4M5 7h4M5 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: 'ops',
      label: 'Disputes & Flags',
      icon: (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5L12.5 11H1.5L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M7 5.5v2.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="p-10 max-w-[1400px] mx-auto page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8 text-xs text-[var(--text-muted)]">
        <Link href="/tournaments" className="hover:text-[var(--text-primary)] transition-colors">Tournaments</Link>
        <span className="opacity-40">/</span>
        <span className="text-[var(--text-primary)]">{tournament.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{tournament.name}</h1>
            <span className={`text-[11px] uppercase font-semibold tracking-wide px-2.5 py-1 rounded-full border ${
              tournament.status === 'active'
                ? 'bg-[var(--bg-hover)] text-[var(--accent)] border-[var(--accent-border)]'
                : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border)]'
            }`}>
              {tournament.status}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm flex items-center gap-3">
            <span>{stages.length} Stage{stages.length !== 1 ? 's' : ''}</span>
            <span className="text-[var(--border)]">&bull;</span>
            <span>{tournamentTeams.length} Team{tournamentTeams.length !== 1 ? 's' : ''}</span>
            <span className="text-[var(--border)]">&bull;</span>
            <span>{totalMatches} Match{totalMatches !== 1 ? 'es' : ''}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/standings/${tournament.id}`} target="_blank" className="btn-ghost py-2">
            Public Standings
          </Link>
          {tournament.status === 'active' && (
            <button onClick={archiveTournament} className="btn-ghost py-2">
              Archive Tournament
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 border-b border-[var(--border)]">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${
              activeTab === id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              {icon}
              {label}
            </span>
            {id === 'applications' && pendingApps > 0 && (
              <span className="relative z-10 bg-[var(--accent)] text-black text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                {pendingApps}
              </span>
            )}
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'stages' && <StagesTab />}
      {activeTab === 'standings' && <StandingsTab />}
      {activeTab === 'applications' && <ApplicationsTab />}
      {activeTab === 'ops' && <OpsTab />}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 animate-fade-in ${
            toast.type === 'error'
              ? 'bg-[var(--red)]/90 text-white border border-[var(--red)]/30'
              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]'
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="text-white/60 hover:text-white transition-colors ml-1">&times;</button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="surface p-6 max-w-md w-full mx-4 shadow-2xl">
            <p className="text-sm text-[var(--text-primary)] mb-5 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="btn-ghost py-2 px-4 text-sm">Cancel</button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="btn-primary py-2 px-4 text-sm">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root export (sets up provider) ───────────────────────────────────────────

type Props = {
  tournamentId: string;
  initialTournament: TournamentData;
  initialPointSystem: PointSystem | null;
};

export default function TournamentDetailClient({ tournamentId, initialTournament, initialPointSystem }: Props) {
  return (
    <TournamentProvider
      tournamentId={tournamentId}
      initialTournament={initialTournament}
      initialPointSystem={initialPointSystem}
    >
      <TournamentDetail />
    </TournamentProvider>
  );
}

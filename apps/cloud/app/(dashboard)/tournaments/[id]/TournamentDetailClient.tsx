'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { TournamentProvider, useTournament } from './_context';

const HERO_BG = 'https://a-static.besthdwallpaper.com/playerunknown-s-battlegrounds-pubg-mobile-battle-in-mad-miramar-wallpaper-2560x1080-63448_14.jpg';
import type { TournamentData, PointSystem, Tab } from './_types';
import OverviewTab from './tabs/OverviewTab';
import StagesTab from './tabs/StagesTab';
import StandingsTab from './tabs/StandingsTab';
import ApplicationsTab from './tabs/ApplicationsTab';
import OpsTab from './tabs/OpsTab';

// ─── Inner component (has access to context) ──────────────────────────────────

function TournamentDetail() {
  const { sponsors } = useAuth();
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
    <div className="max-w-[1400px] mx-auto page-enter">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-8"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          minHeight: 260,
        }}>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.93) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />

        <div className="relative z-10 flex flex-col justify-between p-8 pt-8" style={{ minHeight: 260 }}>
          {/* Top row: breadcrumb + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Link href="/tournaments" className="hover:text-white/70 transition-colors">Tournaments</Link>
              <span>/</span>
              <span className="text-white/60">{tournament.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/standings/${tournament.id}`} target="_blank"
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/15 bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-all backdrop-blur-sm">
                Public Standings ↗
              </Link>
              {tournament.status === 'active' && (
                <button onClick={archiveTournament}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-white/15 bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-all backdrop-blur-sm">
                  Archive
                </button>
              )}
            </div>
          </div>

          {/* Bottom: name + meta */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                tournament.status === 'active'
                  ? 'bg-black/40 text-[var(--accent)] border-[var(--accent)]/30'
                  : 'bg-black/40 text-white/40 border-white/10'
              }`}>
                {tournament.status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse mr-1.5" />}
                {tournament.status}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white leading-none mb-5">
              {tournament.name}
            </h1>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6 text-white/40 text-[13px]">
                {[
                  { label: 'Stages', value: stages.length },
                  { label: 'Teams', value: tournamentTeams.length },
                  { label: 'Matches', value: totalMatches },
                ].map(({ label, value }, i) => (
                  <span key={label} className="flex items-center gap-6">
                    {i > 0 && <span className="text-white/15">|</span>}
                    <span><span className="font-bold text-white/70 mr-1">{value}</span>{label}</span>
                  </span>
                ))}
              </div>
              {sponsors.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">Presented by</span>
                  {sponsors.map((url, i) => (
                    <img key={i} src={url} alt={`Sponsor ${i + 1}`}
                      className="h-7 w-auto max-w-[80px] object-contain opacity-60 hover:opacity-100 transition-opacity" />
                  ))}
                </div>
              )}
            </div>
          </div>
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

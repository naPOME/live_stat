'use client';

import { useEffect, useState, use } from 'react';
import { MAP_BY_ID } from '@/lib/config';

type TeamInfo = { id: string; name: string; short_name: string | null; logo_url: string | null };
type StandingEntry = {
  rank: number; team_id: string; total_pts: number; total_kills: number;
  matches_played: number; wins: number; avg_placement: number; team: TeamInfo | null;
};
type MatchInfo = { id: string; name: string; map_name: string | null; status: string; scheduled_at: string | null };
type StageData = {
  id: string; name: string; stage_order: number; stage_type: string; status: string;
  map_rotation: string[] | null;
  matches: MatchInfo[]; matchCount: number; totalMatches: number; standings: StandingEntry[];
};
type PlayerStat = {
  rank: number; player_open_id: string; display_name: string; photo_url: string | null;
  team: TeamInfo | null; total_kills: number; total_damage: number;
  matches_played: number; kd: number; avg_damage: number; survival_rate: number; top_fragger_count: number;
};
type TeamEntry = TeamInfo & { seed: number | null };

type Tab = 'overview' | 'schedule' | 'standings' | 'players' | 'teams';

export default function PublicTournamentHub({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tournament, setTournament] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [stages, setStages] = useState<StageData[]>([]);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedStageId, setSelectedStageId] = useState('');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/tournament/${encodeURIComponent(tournamentId)}`);
      if (!res.ok) { setError('Tournament not found'); setLoading(false); return; }
      const data = await res.json();
      setTournament(data.tournament);
      setOrg(data.organization);
      setStages(data.stages);
      setTeams(data.teams);
      setPlayerStats(data.playerStats);
      if (data.stages.length > 0) setSelectedStageId(data.stages[0].id);
      setLoading(false);
    }
    load();
  }, [tournamentId]);

  const accent = org?.brand_color || '#2F6B3F';
  const selectedStage = stages.find((s) => s.id === selectedStageId);
  const totalMatches = stages.reduce((s, st) => s + st.totalMatches, 0);
  const finishedMatches = stages.reduce((s, st) => s + st.matchCount, 0);

  // Flatten all matches for schedule tab
  const allMatches = stages.flatMap((s) =>
    s.matches.map((m) => ({ ...m, stageName: s.name, stageType: s.stage_type }))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          <span className="text-white/40 text-sm">Loading tournament...</span>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">:/</div>
          <p className="text-white font-semibold mb-1">{error || 'Not found'}</p>
          <p className="text-white/40 text-sm">This tournament doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'schedule', label: 'Schedule', count: totalMatches },
    { key: 'standings', label: 'Standings' },
    { key: 'teams', label: 'Teams', count: teams.length },
    { key: 'players', label: 'Players', count: playerStats.length },
  ];

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white">
      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}, transparent 70%)` }} />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-6">
          <div className="flex items-start gap-4">
            {org?.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-2xl object-cover border border-white/10 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 border border-white/10"
                style={{ backgroundColor: accent + '15', color: accent }}>
                {(org?.name ?? 'T')[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {org && <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-1">{org.name}</div>}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tournament.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                  tournament.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}>
                  {tournament.status === 'active' ? 'Active' : 'Archived'}
                </span>
                <span className="text-xs text-white/30">{stages.length} stage{stages.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-white/30">{teams.length} team{teams.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-white/30">{finishedMatches}/{totalMatches} matches played</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {tournament.registration_open && (
                <a
                  href={`/apply/${tournamentId}`}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ backgroundColor: accent, color: '#0a0e17' }}
                >
                  Register
                </a>
              )}
              <button
                onClick={copyLink}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="Copy link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] sticky top-0 bg-[#0a0e17]/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-4 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab.key ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-1.5 text-[10px] text-white/25">{tab.count}</span>}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: accent }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── OVERVIEW ──────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Teams', value: teams.length },
                { label: 'Stages', value: stages.length },
                { label: 'Matches Played', value: `${finishedMatches}/${totalMatches}` },
                { label: 'Players', value: playerStats.length },
              ].map((s) => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{s.label}</div>
                  <div className="text-xl font-bold mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Stage progression */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Tournament Structure</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {stages.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                    {i > 0 && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/15">
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <div className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${
                      s.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : s.status === 'active' ? 'border-white/20 text-white bg-white/[0.05]'
                      : 'border-white/[0.06] text-white/30 bg-white/[0.02]'
                    }`}>
                      <div>{s.name}</div>
                      <div className="text-[10px] mt-0.5 opacity-60">
                        {s.matchCount}/{s.totalMatches} matches · {s.stage_type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 teams quick look */}
            {stages.length > 0 && (() => {
              const latestStageWithStandings = [...stages].reverse().find((s) => s.standings.length > 0);
              if (!latestStageWithStandings) return null;
              const top5 = latestStageWithStandings.standings.slice(0, 5);
              return (
                <div>
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                    Top 5 — {latestStageWithStandings.name}
                  </h3>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                    {top5.map((entry, i) => (
                      <div key={entry.team_id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                        <span className={`w-6 text-center font-bold text-sm ${
                          entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/30'
                        }`}>{entry.rank}</span>
                        {entry.team?.logo_url ? (
                          <img src={entry.team.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold border border-white/10"
                            style={{ backgroundColor: '#2F6B3F15', color: '#2F6B3F' }}>
                            {(entry.team?.short_name ?? entry.team?.name ?? '?').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium flex-1 truncate">{entry.team?.name ?? 'Unknown'}</span>
                        <span className="font-bold" style={{ color: accent }}>{entry.total_pts} pts</span>
                        <span className="text-white/30 text-sm w-16 text-right">{entry.total_kills} kills</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Top fragger */}
            {playerStats.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Top Fraggers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {playerStats.slice(0, 3).map((p, i) => (
                    <div key={p.player_open_id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
                      <div className="relative">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/30">
                            {p.display_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-gray-300 text-black' : 'bg-amber-600 text-black'
                        }`}>{i + 1}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{p.display_name}</div>
                        <div className="text-[10px] text-white/30 truncate">{p.team?.name ?? 'No team'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold" style={{ color: accent }}>{p.total_kills}</div>
                        <div className="text-[10px] text-white/30">kills</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming matches */}
            {(() => {
              const upcoming = allMatches.filter((m) => m.status === 'pending').slice(0, 5);
              if (upcoming.length === 0) return null;
              return (
                <div>
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Upcoming Matches</h3>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                    {upcoming.map((m, i) => (
                      <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{m.name}</div>
                          <div className="text-[10px] text-white/30">{m.stageName}</div>
                        </div>
                        {m.map_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                            style={{
                              color: MAP_BY_ID[m.map_name.toLowerCase()]?.color ?? '#888',
                              borderColor: (MAP_BY_ID[m.map_name.toLowerCase()]?.color ?? '#888') + '33',
                              backgroundColor: (MAP_BY_ID[m.map_name.toLowerCase()]?.color ?? '#888') + '10',
                            }}>
                            {m.map_name}
                          </span>
                        )}
                        {m.scheduled_at ? (
                          <span className="text-xs text-white/40 tabular-nums">
                            {new Date(m.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-xs text-white/20">TBD</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── SCHEDULE ──────────────────────────────────────────── */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {stages.map((stage) => (
              <div key={stage.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">{stage.name}</h3>
                  <span className="text-[10px] text-white/20">{stage.matchCount}/{stage.totalMatches}</span>
                  {stage.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
                {stage.matches.length > 0 ? (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                    {stage.matches.map((m, i) => (
                      <div key={m.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 ${
                        i > 0 ? 'border-t border-white/[0.04]' : ''
                      }`}>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{m.name}</div>
                        </div>
                        {m.map_name ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                            style={{
                              color: MAP_BY_ID[m.map_name.toLowerCase()]?.color ?? '#888',
                              borderColor: (MAP_BY_ID[m.map_name.toLowerCase()]?.color ?? '#888') + '33',
                              backgroundColor: (MAP_BY_ID[m.map_name.toLowerCase()]?.color ?? '#888') + '10',
                            }}>
                            {m.map_name}
                          </span>
                        ) : <span />}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          m.status === 'finished' ? 'bg-emerald-500/10 text-emerald-400'
                          : m.status === 'live' ? 'bg-red-500/10 text-red-400'
                          : 'bg-white/5 text-white/30'
                        }`}>
                          {m.status === 'finished' ? 'Done' : m.status === 'live' ? 'Live' : 'Pending'}
                        </span>
                        {m.scheduled_at ? (
                          <span className="text-xs text-white/30 tabular-nums w-28 text-right">
                            {new Date(m.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-xs text-white/15 w-28 text-right">TBD</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-dashed border-white/[0.06] rounded-xl p-8 text-center text-white/20 text-sm">
                    No matches scheduled
                  </div>
                )}
              </div>
            ))}
            {stages.length === 0 && (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.06] rounded-xl p-12 text-center text-white/20">
                No stages configured yet
              </div>
            )}
          </div>
        )}

        {/* ── STANDINGS ─────────────────────────────────────────── */}
        {activeTab === 'standings' && (
          <div>
            {stages.length > 1 && (
              <div className="flex gap-2 mb-5 flex-wrap">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStageId === s.id
                        ? 'bg-white/10 text-white border border-white/15'
                        : 'text-white/30 hover:text-white/60 border border-transparent hover:border-white/10'
                    }`}
                  >
                    {s.name}
                    <span className="ml-1.5 text-[10px] text-white/20">{s.matchCount}/{s.totalMatches}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedStage && selectedStage.standings.length > 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[44px_1fr_70px_70px_60px_70px_60px] gap-2 px-4 py-2.5 border-b border-white/[0.06] text-[10px] text-white/25 uppercase tracking-wider font-semibold">
                  <span>#</span><span>Team</span>
                  <span className="text-right">Points</span><span className="text-right">Kills</span>
                  <span className="text-right">Wins</span><span className="text-right">Avg</span><span className="text-right">GP</span>
                </div>
                {selectedStage.standings.map((entry, i) => (
                  <div key={entry.team_id}
                    className={`grid grid-cols-[44px_1fr_70px_70px_60px_70px_60px] gap-2 px-4 py-2.5 items-center ${
                      i > 0 ? 'border-t border-white/[0.03]' : ''
                    } ${entry.rank <= 3 ? 'bg-white/[0.015]' : ''}`}>
                    <span className={`text-base font-bold ${
                      entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/20'
                    }`}>{entry.rank}</span>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {entry.team?.logo_url ? (
                        <img src={entry.team.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0 border"
                          style={{ backgroundColor: '#2F6B3F15', borderColor: '#2F6B3F30', color: '#2F6B3F' }}>
                          {(entry.team?.short_name ?? entry.team?.name ?? '?').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{entry.team?.name ?? 'Unknown'}</div>
                        {entry.team?.short_name && <div className="text-[10px] text-white/25">{entry.team.short_name}</div>}
                      </div>
                    </div>
                    <span className="text-right font-bold">{entry.total_pts}</span>
                    <span className="text-right text-white/40">{entry.total_kills}</span>
                    <span className="text-right text-white/40">{entry.wins}</span>
                    <span className="text-right text-white/40">{entry.avg_placement}</span>
                    <span className="text-right text-white/40">{entry.matches_played}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.06] rounded-xl p-12 text-center text-white/20">
                No results yet{selectedStage ? ` for ${selectedStage.name}` : ''}.
              </div>
            )}
          </div>
        )}

        {/* ── TEAMS ─────────────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <div>
            {teams.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {teams.map((t) => (
                  <div key={t.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col items-center gap-2.5 text-center">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.name} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold border border-white/10"
                        style={{ backgroundColor: '#2F6B3F15', color: '#2F6B3F' }}>
                        {(t.short_name ?? t.name).substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm truncate max-w-[120px]">{t.name}</div>
                      {t.short_name && <div className="text-[10px] text-white/25">{t.short_name}</div>}
                    </div>
                    {t.seed && (
                      <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-full">Seed #{t.seed}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.06] rounded-xl p-12 text-center text-white/20">
                No teams registered yet.
                {tournament.registration_open && (
                  <div className="mt-3">
                    <a href={`/apply/${tournamentId}`} className="text-sm font-semibold px-4 py-2 rounded-lg inline-block" style={{ backgroundColor: accent, color: '#0a0e17' }}>
                      Register Your Team
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PLAYERS ───────────────────────────────────────────── */}
        {activeTab === 'players' && (
          <div>
            {playerStats.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Players', value: playerStats.length },
                    { label: 'Total Kills', value: playerStats.reduce((s, p) => s + p.total_kills, 0) },
                    { label: 'Avg K/D', value: (playerStats.reduce((s, p) => s + p.kd, 0) / playerStats.length).toFixed(2) },
                    { label: 'Top Fragger', value: playerStats[0]?.display_name ?? '-' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                      <div className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">{s.label}</div>
                      <div className="text-lg font-bold mt-1 truncate">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[36px_1fr_60px_60px_50px_60px_50px_50px] gap-1.5 px-4 py-2.5 border-b border-white/[0.06] text-[10px] text-white/25 uppercase tracking-wider font-semibold">
                    <span>#</span><span>Player</span>
                    <span className="text-right">Kills</span><span className="text-right">Dmg</span>
                    <span className="text-right">K/D</span><span className="text-right">Avg</span>
                    <span className="text-right">Surv</span><span className="text-right">MVP</span>
                  </div>
                  {playerStats.slice(0, 50).map((p, i) => (
                    <div key={p.player_open_id}
                      className={`grid grid-cols-[36px_1fr_60px_60px_50px_60px_50px_50px] gap-1.5 px-4 py-2 items-center ${
                        i > 0 ? 'border-t border-white/[0.03]' : ''
                      }`}>
                      <span className={`font-bold text-sm ${p.rank <= 3 ? 'text-amber-400' : 'text-white/20'}`}>{p.rank}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" className="w-6 h-6 rounded-md object-cover border border-white/10 flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/20 flex-shrink-0">
                            {p.display_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p.display_name}</div>
                          {p.team && <div className="text-[10px] text-white/20 truncate">{p.team.short_name ?? p.team.name}</div>}
                        </div>
                      </div>
                      <span className="text-right font-bold">{p.total_kills}</span>
                      <span className="text-right text-white/40">{p.total_damage.toLocaleString()}</span>
                      <span className="text-right text-white/40">{p.kd}</span>
                      <span className="text-right text-white/40">{p.avg_damage}</span>
                      <span className="text-right text-white/40">{p.survival_rate}%</span>
                      <span className="text-right text-white/40">{p.top_fragger_count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.06] rounded-xl p-12 text-center text-white/20">
                No player stats available yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center">
          <span className="text-[10px] text-white/20">Powered by Tournyx</span>
        </div>
      </div>
    </div>
  );
}

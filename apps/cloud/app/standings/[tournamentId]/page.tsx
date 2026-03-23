'use client';

import { useEffect, useState, use } from 'react';

type TeamInfo = { id: string; name: string; short_name: string | null; logo_url: string | null; brand_color: string };
type StandingEntry = {
  rank: number; team_id: string; total_pts: number; total_kills: number;
  matches_played: number; wins: number; avg_placement: number; team: TeamInfo | null;
};
type StageData = {
  id: string; name: string; stage_order: number; stage_type: string;
  matchCount: number; totalMatches: number; standings: StandingEntry[];
};
type PlayerStat = {
  rank: number; player_open_id: string; display_name: string; photo_url: string | null;
  team: TeamInfo | null; total_kills: number; total_damage: number;
  matches_played: number; kd: number; avg_damage: number; survival_rate: number; top_fragger_count: number;
};

export default function PublicStandingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tournament, setTournament] = useState<{ id: string; name: string; status: string } | null>(null);
  const [org, setOrg] = useState<{ name: string; logo_url: string | null; brand_color: string } | null>(null);
  const [stages, setStages] = useState<StageData[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [activeTab, setActiveTab] = useState<'standings' | 'players'>('standings');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/public/standings/${encodeURIComponent(tournamentId)}`);
      if (!res.ok) { setError('Tournament not found'); setLoading(false); return; }
      const data = await res.json();
      setTournament(data.tournament);
      setOrg(data.organization);
      setStages(data.stages);
      setPlayerStats(data.playerStats);
      if (data.stages.length > 0) setSelectedStageId(data.stages[0].id);
      setLoading(false);
    }
    load();
  }, [tournamentId]);

  const selectedStage = stages.find((s) => s.id === selectedStageId);
  const accentColor = org?.brand_color || '#2F6B3F';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <span className="loader" aria-label="Loading" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">:/</div>
          <p className="text-white font-semibold mb-1">{error || 'Not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1621] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {org?.logo_url && (
              <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
            )}
            <div>
              {org && <div className="text-xs text-[#8b8da6] uppercase tracking-wider">{org.name}</div>}
              <h1 className="text-2xl font-bold">{tournament.name}</h1>
            </div>
            <div className="ml-auto">
              <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                tournament.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-[#8b8da6]'
              }`}>
                {tournament.status === 'active' ? 'Live' : 'Completed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {(['standings', 'players'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? 'text-white'
                  : 'text-[#8b8da6] hover:text-white'
              }`}
            >
              {tab === 'standings' ? 'Team Standings' : 'Player Stats'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: accentColor }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'standings' && (
          <div>
            {/* Stage selector */}
            {stages.length > 1 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStageId === s.id
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'text-[#8b8da6] hover:text-white border border-transparent hover:border-white/10'
                    }`}
                  >
                    {s.name}
                    <span className="ml-2 text-xs text-[#8b8da6]">{s.matchCount}/{s.totalMatches}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedStage && selectedStage.standings.length > 0 ? (
              <div className="bg-[#1a2735] border border-white/10 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[50px_1fr_80px_80px_80px_80px_80px] gap-2 px-5 py-3 border-b border-white/10 text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">
                  <span>#</span>
                  <span>Team</span>
                  <span className="text-right">Points</span>
                  <span className="text-right">Kills</span>
                  <span className="text-right">Wins</span>
                  <span className="text-right">Avg Place</span>
                  <span className="text-right">Matches</span>
                </div>
                {selectedStage.standings.map((entry, i) => (
                  <div
                    key={entry.team_id}
                    className={`grid grid-cols-[50px_1fr_80px_80px_80px_80px_80px] gap-2 px-5 py-3 items-center ${
                      i > 0 ? 'border-t border-white/5' : ''
                    } ${entry.rank <= 3 ? 'bg-white/[0.02]' : ''}`}
                  >
                    <span className={`text-lg font-bold ${
                      entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-[#8b8da6]'
                    }`}>
                      {entry.rank}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      {entry.team?.logo_url ? (
                        <img src={entry.team.logo_url} alt={entry.team.name} className="w-8 h-8 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 border"
                          style={{ backgroundColor: (entry.team?.brand_color ?? '#555') + '22', borderColor: (entry.team?.brand_color ?? '#555') + '44', color: entry.team?.brand_color ?? '#888' }}
                        >
                          {(entry.team?.short_name ?? entry.team?.name ?? '?').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{entry.team?.name ?? 'Unknown'}</div>
                        {entry.team?.short_name && <div className="text-[10px] text-[#8b8da6]">{entry.team.short_name}</div>}
                      </div>
                    </div>
                    <span className="text-right font-bold text-white">{entry.total_pts}</span>
                    <span className="text-right text-[#8b8da6]">{entry.total_kills}</span>
                    <span className="text-right text-[#8b8da6]">{entry.wins}</span>
                    <span className="text-right text-[#8b8da6]">{entry.avg_placement}</span>
                    <span className="text-right text-[#8b8da6]">{entry.matches_played}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1a2735] border border-dashed border-white/10 rounded-2xl p-12 text-center">
                <p className="text-[#8b8da6]">No results yet for this stage.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div>
            {playerStats.length > 0 ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Players', value: playerStats.length },
                    { label: 'Total Kills', value: playerStats.reduce((s, p) => s + p.total_kills, 0) },
                    { label: 'Avg K/D', value: (playerStats.reduce((s, p) => s + p.kd, 0) / playerStats.length).toFixed(2) },
                    { label: 'Top Fragger', value: playerStats[0]?.display_name ?? '-' },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#1a2735] border border-white/10 rounded-xl p-4">
                      <div className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">{s.label}</div>
                      <div className="text-xl font-bold text-white mt-1 truncate">{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#1a2735] border border-white/10 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[40px_1fr_70px_70px_60px_70px_60px_60px] gap-2 px-5 py-3 border-b border-white/10 text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">
                    <span>#</span>
                    <span>Player</span>
                    <span className="text-right">Kills</span>
                    <span className="text-right">Damage</span>
                    <span className="text-right">K/D</span>
                    <span className="text-right">Avg Dmg</span>
                    <span className="text-right">Surv%</span>
                    <span className="text-right">MVP</span>
                  </div>
                  {playerStats.slice(0, 50).map((p, i) => (
                    <div
                      key={p.player_open_id}
                      className={`grid grid-cols-[40px_1fr_70px_70px_60px_70px_60px_60px] gap-2 px-5 py-2.5 items-center ${
                        i > 0 ? 'border-t border-white/5' : ''
                      }`}
                    >
                      <span className={`font-bold ${p.rank <= 3 ? 'text-amber-400' : 'text-[#8b8da6]'}`}>{p.rank}</span>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.display_name} className="w-7 h-7 rounded-md object-cover border border-white/10 flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-[#8b8da6] flex-shrink-0">
                            {p.display_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">{p.display_name}</div>
                          {p.team && <div className="text-[10px] text-[#8b8da6] truncate">{p.team.short_name ?? p.team.name}</div>}
                        </div>
                      </div>
                      <span className="text-right font-bold text-white">{p.total_kills}</span>
                      <span className="text-right text-[#8b8da6]">{p.total_damage.toLocaleString()}</span>
                      <span className="text-right text-[#8b8da6]">{p.kd}</span>
                      <span className="text-right text-[#8b8da6]">{p.avg_damage}</span>
                      <span className="text-right text-[#8b8da6]">{p.survival_rate}%</span>
                      <span className="text-right text-[#8b8da6]">{p.top_fragger_count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-[#1a2735] border border-dashed border-white/10 rounded-2xl p-12 text-center">
                <p className="text-[#8b8da6]">No player stats available yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center">
          <span className="text-[10px] text-[#8b8da6]">Powered by Tournyx</span>
        </div>
      </div>
    </div>
  );
}

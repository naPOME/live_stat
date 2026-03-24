'use client';

import { useEffect, useState } from 'react';
import { useTournament } from '../_context';

type PlayerStat = {
  rank: number;
  player_open_id: string;
  display_name: string;
  player_id: string | null;
  team: { id: string; name: string; short_name: string | null; logo_url: string | null } | null;
  total_kills: number;
  total_damage: number;
  total_damage_taken: number;
  total_heal: number;
  total_headshots: number;
  total_assists: number;
  total_knockouts: number;
  total_rescues: number;
  total_survival_time: number;
  matches_played: number;
  deaths: number;
  kd: number;
  avg_damage: number;
  survival_rate: number;
  headshot_rate: number;
  top_fragger_count: number;
  mvp_points: number;
};

type SortKey = 'mvp_points' | 'total_kills' | 'total_damage' | 'avg_damage' | 'kd' | 'total_headshots' | 'headshot_rate' | 'total_assists' | 'total_knockouts' | 'total_rescues' | 'total_heal' | 'survival_rate';

const CATEGORIES: { key: SortKey; label: string; suffix?: string }[] = [
  { key: 'mvp_points', label: 'MVP Score' },
  { key: 'total_kills', label: 'Kills' },
  { key: 'total_damage', label: 'Damage' },
  { key: 'avg_damage', label: 'Avg Damage' },
  { key: 'kd', label: 'K/D Ratio' },
  { key: 'total_headshots', label: 'Headshots' },
  { key: 'headshot_rate', label: 'HS Rate', suffix: '%' },
  { key: 'total_assists', label: 'Assists' },
  { key: 'total_knockouts', label: 'Knockdowns' },
  { key: 'total_rescues', label: 'Rescues' },
  { key: 'total_heal', label: 'Healing' },
  { key: 'survival_rate', label: 'Survival', suffix: '%' },
];

function formatStat(val: number, suffix?: string): string {
  const str = val % 1 !== 0 ? val.toFixed(2) : String(val);
  return str + (suffix ?? '');
}

export default function StatsTab() {
  const { tournamentId } = useTournament();
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('mvp_points');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/player-stats?tournamentId=${tournamentId}`)
      .then((r) => r.json())
      .then((d) => {
        setPlayers(d.players ?? []);
        setMatchCount(d.matchCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const sorted = [...players].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));

  // Awards: sorted by MVP points (API default sort)
  const mvp = players[0] ?? null;
  const topDamage = [...players].sort((a, b) => b.total_damage - a.total_damage)[0] ?? null;
  const topKnockouts = [...players].sort((a, b) => b.total_knockouts - a.total_knockouts)[0] ?? null;
  const topSurvivor = [...players].sort((a, b) => b.survival_rate - a.survival_rate)[0] ?? null;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><span className="loader" /></div>;
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-[var(--text-muted)] text-sm">No match data yet</div>
        <div className="text-[var(--text-muted)] text-xs mt-1 opacity-60">Player stats will appear after matches are synced</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-32">

      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Players', value: players.length },
          { label: 'Matches', value: matchCount },
          { label: 'Total Kills', value: players.reduce((s, p) => s + p.total_kills, 0) },
          { label: 'Avg K/D', value: (players.reduce((s, p) => s + p.kd, 0) / players.length).toFixed(2) },
        ].map(({ label, value }) => (
          <div key={label} className="surface px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{label}</div>
            <div className="text-xl font-black text-[var(--text-primary)] mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Tournament Awards ── */}
      <div>
        <h3 className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 px-1">
          Tournament Awards
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: 'MVP', subtitle: 'Kills 40% + Damage 30% + Survival 20% + KO 10%', player: mvp, stat: mvp?.mvp_points.toFixed(4) ?? '0', unit: 'pts', color: '#fbbf24' },
            { title: 'Damage King', subtitle: 'Total Damage Dealt', player: topDamage, stat: topDamage?.total_damage.toLocaleString() ?? '0', unit: 'dmg', color: '#ef4444' },
            { title: 'Terminator', subtitle: 'Most Knockdowns', player: topKnockouts, stat: String(topKnockouts?.total_knockouts ?? 0), unit: 'KOs', color: '#3b82f6' },
            { title: 'Survivor', subtitle: 'Best Survival Rate', player: topSurvivor, stat: `${topSurvivor?.survival_rate ?? 0}%`, unit: '', color: '#10b981' },
          ].map(({ title, subtitle, player, stat, unit, color }) => (
            <div key={title} className="surface overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: color }} />
              <div className="px-4 py-4">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color }}>{title}</div>
                <div className="text-lg font-black text-[var(--text-primary)] leading-tight truncate">
                  {player?.display_name ?? '—'}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                  {player?.team?.short_name ?? player?.team?.name ?? ''}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-black" style={{ color }}>{stat}</span>
                  {unit && <span className="text-xs text-[var(--text-muted)]">{unit}</span>}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] opacity-60 mt-0.5">{subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MVP Formula Explainer ── */}
      <div className="surface px-5 py-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">MVP Points Formula</h4>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'Finishes', weight: '40%', color: '#fbbf24' },
            { label: 'Damage', weight: '30%', color: '#ef4444' },
            { label: 'Survival', weight: '20%', color: '#10b981' },
            { label: 'Knockdowns', weight: '10%', color: '#3b82f6' },
          ].map(({ label, weight, color }) => (
            <div key={label}>
              <div className="text-lg font-black" style={{ color }}>{weight}</div>
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] opacity-60 mt-2 text-center">
          Each stat is the player&apos;s share of all players&apos; totals, weighted and summed
        </p>
      </div>

      {/* ── Category Leaders ── */}
      <div>
        <h3 className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 px-1">
          Category Leaders
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {CATEGORIES.map(({ key, label, suffix }) => {
            const leader = [...players].sort((a, b) => (b[key] as number) - (a[key] as number))[0];
            if (!leader) return null;
            return (
              <div key={key} className="surface px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{label}</div>
                  <div className="text-sm font-bold text-[var(--text-primary)] truncate">{leader.display_name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">{leader.team?.short_name ?? ''}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-[var(--accent)]">
                    {formatStat(leader[key] as number, suffix)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Full Leaderboard Table ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Player Leaderboard
          </h3>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
          >
            {CATEGORIES.map(({ key, label }) => (
              <option key={key} value={key}>Sort by {label}</option>
            ))}
          </select>
        </div>

        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="text-left px-4 py-3 font-bold">#</th>
                  <th className="text-left px-4 py-3 font-bold">Player</th>
                  <th className="text-left px-4 py-3 font-bold">Team</th>
                  <th className="text-right px-3 py-3 font-bold">GP</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('mvp_points')}>MVP</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('total_kills')}>Kills</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('total_damage')}>Dmg</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('avg_damage')}>Avg Dmg</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('kd')}>K/D</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('total_headshots')}>HS</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('total_knockouts')}>KO</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('total_rescues')}>Res</th>
                  <th className="text-right px-3 py-3 font-bold cursor-pointer hover:text-[var(--accent)]" onClick={() => setSortKey('survival_rate')}>SR%</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={p.player_open_id}
                    className={`border-b border-[var(--border)]/50 hover:bg-[var(--bg-elevated)]/50 transition-colors ${i < 3 ? 'bg-[var(--accent)]/[0.03]' : ''}`}>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-bold ${i < 3 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-[var(--text-primary)]">{p.display_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                      {p.team?.short_name ?? p.team?.name ?? '—'}
                    </td>
                    <td className="text-right px-3 py-2.5 text-xs text-[var(--text-muted)]">{p.matches_played}</td>
                    <td className="text-right px-3 py-2.5 font-bold text-[#fbbf24]">{p.mvp_points.toFixed(4)}</td>
                    <td className="text-right px-3 py-2.5 font-bold">{p.total_kills}</td>
                    <td className="text-right px-3 py-2.5">{p.total_damage.toLocaleString()}</td>
                    <td className="text-right px-3 py-2.5">{p.avg_damage}</td>
                    <td className="text-right px-3 py-2.5">{p.kd}</td>
                    <td className="text-right px-3 py-2.5">{p.total_headshots}</td>
                    <td className="text-right px-3 py-2.5">{p.total_knockouts}</td>
                    <td className="text-right px-3 py-2.5">{p.total_rescues}</td>
                    <td className="text-right px-3 py-2.5">{p.survival_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

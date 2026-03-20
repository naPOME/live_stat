import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/players');

  // Fetch player + team
  const { data: player } = await supabase
    .from('players')
    .select('id, display_name, player_open_id, team_id, teams(id, name, short_name, brand_color, logo_url, org_id)')
    .eq('id', id)
    .single();

  if (!player) notFound();

  const team = Array.isArray(player.teams) ? player.teams[0] : player.teams as { id: string; name: string; short_name: string | null; brand_color: string; logo_url: string | null; org_id: string } | null;
  if (!team || team.org_id !== profile.org_id) notFound();

  // Fetch org tournaments
  const { data: orgTournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('org_id', profile.org_id);
  const orgTournamentIds = new Set((orgTournaments ?? []).map((t) => t.id));

  // Fetch finished match IDs belonging to this org
  const { data: rawMatches } = await supabase
    .from('matches')
    .select('id, stage:stages!inner(tournament_id)')
    .eq('status', 'finished');

  const matchIds = (rawMatches ?? [])
    .filter((m) => {
      const stage = Array.isArray(m.stage) ? m.stage[0] : m.stage;
      return orgTournamentIds.has((stage as { tournament_id: string })?.tournament_id);
    })
    .map((m) => m.id);

  // Fetch this player's results
  const { data: results } = matchIds.length > 0
    ? await supabase
        .from('player_match_results')
        .select('match_id, kills, damage, survived, placement')
        .eq('player_open_id', player.player_open_id)
        .in('match_id', matchIds)
    : { data: [] as { match_id: string; kills: number; damage: number; survived: boolean; placement: number | null }[] };

  // Aggregate stats
  const matchesPlayed = results?.length ?? 0;
  const totalKills = results?.reduce((s, r) => s + (r.kills ?? 0), 0) ?? 0;
  const totalDamage = results?.reduce((s, r) => s + (r.damage ?? 0), 0) ?? 0;
  const deaths = results?.filter((r) => !r.survived).length ?? 0;
  const kd = deaths > 0 ? Math.round((totalKills / deaths) * 100) / 100 : totalKills;
  const avgDamage = matchesPlayed > 0 ? Math.round(totalDamage / matchesPlayed) : 0;
  const survivalRate = matchesPlayed > 0 ? Math.round(((matchesPlayed - deaths) / matchesPlayed) * 100) : 0;
  const avgPlacement = matchesPlayed > 0 && results
    ? Math.round(results.reduce((s, r) => s + (r.placement ?? 0), 0) / matchesPlayed * 10) / 10
    : 0;

  // Tournaments played in
  const matchIdSet = new Set(results?.map((r) => r.match_id) ?? []);
  const tournamentMatchMap = new Map<string, string>(); // matchId → tournamentId
  for (const m of rawMatches ?? []) {
    const stage = Array.isArray(m.stage) ? m.stage[0] : m.stage;
    tournamentMatchMap.set(m.id, (stage as { tournament_id: string })?.tournament_id);
  }
  const playedTournamentIds = new Set([...matchIdSet].map((mid) => tournamentMatchMap.get(mid)).filter(Boolean));
  const playedTournaments = (orgTournaments ?? []).filter((t) => playedTournamentIds.has(t.id));

  const initials = (team.short_name ?? team.name).substring(0, 2).toUpperCase();

  const statCards = [
    { label: 'Matches Played', value: matchesPlayed, color: 'var(--text-primary)' },
    { label: 'Total Kills', value: totalKills, color: 'var(--accent)' },
    { label: 'K/D Ratio', value: kd.toFixed(2), color: kd >= 2 ? 'var(--accent)' : 'var(--text-primary)' },
    { label: 'Avg Damage', value: avgDamage.toLocaleString(), color: 'var(--text-primary)' },
    { label: 'Total Damage', value: totalDamage.toLocaleString(), color: 'var(--text-secondary)' },
    { label: 'Survival Rate', value: `${survivalRate}%`, color: survivalRate >= 50 ? 'var(--accent)' : 'var(--text-primary)' },
    { label: 'Avg Placement', value: avgPlacement > 0 ? `#${avgPlacement}` : '—', color: 'var(--text-primary)' },
    { label: 'Tournaments', value: playedTournaments.length, color: 'var(--text-primary)' },
  ];

  return (
    <div className="p-10 max-w-4xl mx-auto page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8 text-xs text-[var(--text-muted)]">
        <Link href="/players" className="hover:text-[var(--text-primary)] transition-colors">Players</Link>
        <span className="opacity-40">/</span>
        <span className="text-[var(--text-primary)]">{player.display_name}</span>
      </div>

      {/* Header card */}
      <div className="surface p-6 mb-6 flex items-center gap-6">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 border"
          style={{ backgroundColor: team.brand_color + '22', borderColor: team.brand_color + '44', color: team.brand_color }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight">{player.display_name}</h1>
          <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{player.player_open_id}</div>
          <div className="mt-2">
            <Link href={`/teams/${team.id}`}
              className="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--border-hover)]"
              style={{ borderColor: team.brand_color + '44', color: team.brand_color, backgroundColor: team.brand_color + '11' }}>
              {team.logo_url && <img src={team.logo_url} alt="" className="w-4 h-4 rounded object-cover" />}
              {team.name}
              {team.short_name && <span className="opacity-60">[{team.short_name}]</span>}
            </Link>
          </div>
        </div>
        {matchesPlayed === 0 && (
          <div className="text-xs text-[var(--text-muted)] text-right">No match data yet</div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="surface p-4">
            <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tournaments played */}
      {playedTournaments.length > 0 && (
        <div className="surface p-5">
          <div className="text-xs font-display font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Tournaments</div>
          <div className="flex flex-wrap gap-2">
            {playedTournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors">
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

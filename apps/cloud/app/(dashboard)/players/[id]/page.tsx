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

  const { data: player } = await supabase
    .from('players')
    .select('id, display_name, player_open_id, team_id, teams(id, name, short_name, brand_color, logo_url, org_id)')
    .eq('id', id)
    .single();

  if (!player) notFound();

  const team = Array.isArray(player.teams) ? player.teams[0] : player.teams as { id: string; name: string; short_name: string | null; brand_color: string; logo_url: string | null; org_id: string } | null;
  if (!team || team.org_id !== profile.org_id) notFound();

  const { data: orgTournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('org_id', profile.org_id);
  const orgTournamentIds = new Set((orgTournaments ?? []).map((t) => t.id));

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

  const { data: results } = matchIds.length > 0
    ? await supabase
        .from('player_match_results')
        .select('match_id, kills, damage, survived, placement')
        .eq('player_open_id', player.player_open_id)
        .in('match_id', matchIds)
    : { data: [] as { match_id: string; kills: number; damage: number; survived: boolean; placement: number | null }[] };

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

  const matchIdSet = new Set(results?.map((r) => r.match_id) ?? []);
  const tournamentMatchMap = new Map<string, string>();
  for (const m of rawMatches ?? []) {
    const stage = Array.isArray(m.stage) ? m.stage[0] : m.stage;
    tournamentMatchMap.set(m.id, (stage as { tournament_id: string })?.tournament_id);
  }
  const playedTournamentIds = new Set([...matchIdSet].map((mid) => tournamentMatchMap.get(mid)).filter(Boolean));
  const playedTournaments = (orgTournaments ?? []).filter((t) => playedTournamentIds.has(t.id));

  const initials = (team.short_name ?? team.name).substring(0, 2).toUpperCase();
  const accent = team.brand_color;

  return (
    <div className="max-w-5xl mx-auto page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs text-[var(--text-muted)]">
        <Link href="/players" className="hover:text-[var(--text-primary)] transition-colors">Players</Link>
        <span className="opacity-30">/</span>
        <span className="text-[var(--text-primary)]">{player.display_name}</span>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] mb-8"
        style={{ background: `linear-gradient(135deg, ${accent}14 0%, transparent 55%)` }}>

        {/* Top section: identity */}
        <div className="flex items-start gap-6 p-8 pb-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 border-2"
            style={{ backgroundColor: accent + '20', borderColor: accent + '50', color: accent }}>
            {initials}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-none">{player.display_name}</h1>
            <div className="font-mono text-xs text-[var(--text-muted)] mt-1.5">{player.player_open_id}</div>
            <Link href={`/teams/${team.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium mt-3 px-2.5 py-1 rounded-full border transition-colors hover:opacity-80"
              style={{ borderColor: accent + '40', color: accent, backgroundColor: accent + '12' }}>
              {team.logo_url && <img src={team.logo_url} alt="" className="w-3.5 h-3.5 rounded object-cover" />}
              {team.name}
              {team.short_name && <span className="opacity-50">[{team.short_name}]</span>}
            </Link>
          </div>

          {/* Headline numbers top-right */}
          {matchesPlayed > 0 && (
            <div className="flex items-start gap-8 pt-1 text-right flex-shrink-0">
              <div>
                <div className="text-4xl font-bold tabular-nums text-[var(--text-primary)]">{matchesPlayed}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">Matches</div>
              </div>
              <div>
                <div className="text-4xl font-bold tabular-nums" style={{ color: accent }}>{totalKills}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">Kills</div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom strip: secondary metrics */}
        {matchesPlayed > 0 && (
          <div className="grid grid-cols-4 divide-x divide-[var(--border)] border-t border-[var(--border)]">
            {[
              { label: 'K/D Ratio', value: kd.toFixed(2), highlight: kd >= 2 },
              { label: 'Avg Damage', value: avgDamage.toLocaleString(), highlight: false },
              { label: 'Survival Rate', value: `${survivalRate}%`, highlight: survivalRate >= 50 },
              { label: 'Avg Placement', value: avgPlacement > 0 ? `#${avgPlacement}` : '—', highlight: false },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="px-6 py-4">
                <div className="text-xl font-bold tabular-nums" style={{ color: highlight ? accent : 'var(--text-primary)' }}>
                  {value}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {matchesPlayed === 0 && (
          <div className="px-8 pb-6 text-xs text-[var(--text-muted)]">No match data recorded yet.</div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-8">

        {/* Career stats — left 2/3 */}
        <div className="col-span-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Career Stats</h2>
          <div className="divide-y divide-[var(--border)]">
            {[
              { label: 'Total Kills', value: totalKills.toLocaleString(), accent: true },
              { label: 'Total Damage', value: totalDamage.toLocaleString(), accent: false },
              { label: 'Avg Damage / Match', value: avgDamage.toLocaleString(), accent: false },
              { label: 'Deaths', value: deaths.toString(), accent: false },
              { label: 'Matches Survived', value: `${matchesPlayed - deaths} of ${matchesPlayed}`, accent: false },
              { label: 'Avg Placement', value: avgPlacement > 0 ? `#${avgPlacement}` : '—', accent: false },
              { label: 'Tournaments Played', value: playedTournaments.length.toString(), accent: false },
            ].map(({ label, value, accent: isAccent }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--text-secondary)]">{label}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: isAccent ? accent : 'var(--text-primary)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tournaments — right 1/3 */}
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Tournaments</h2>
          {playedTournaments.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {playedTournaments.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`}
                  className="flex items-center justify-between py-3 group">
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate pr-2">
                    {t.name}
                  </span>
                  <svg className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 group-hover:text-[var(--text-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] pt-1">No tournaments yet.</p>
          )}
        </div>

      </div>
    </div>
  );
}

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PlayerAvatar } from '@/components/Avatar';

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

  const accent = team.brand_color;

  return (
    <div className="max-w-5xl mx-auto page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-xs text-[var(--text-muted)]">
        <Link href="/players" className="hover:text-[var(--text-primary)] transition-colors">Players</Link>
        <span className="opacity-30">/</span>
        <span className="text-[var(--text-primary)]">{player.display_name}</span>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] mb-10"
        style={{ background: `linear-gradient(135deg, ${accent}28 0%, ${accent}08 50%, transparent 80%)` }}>

        {/* Decorative accent circle */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />

        <div className="relative p-8 pb-0">
          <div className="flex items-start gap-7">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <PlayerAvatar name={player.display_name} logoUrl={team.logo_url} brandColor={accent} px={88} />
              {/* Online-style indicator dot */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-base)]"
                style={{ backgroundColor: accent }} />
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="text-[2.25rem] font-black tracking-tight text-[var(--text-primary)] leading-none">
                {player.display_name}
              </h1>
              <div className="font-mono text-[11px] text-[var(--text-muted)] mt-2 tracking-wider">
                {player.player_open_id}
              </div>
              <Link
                href={`/teams/${team.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold mt-3 px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                style={{ color: accent, backgroundColor: accent + '15', border: `1px solid ${accent}35` }}>
                {team.logo_url && <img src={team.logo_url} alt="" className="w-3.5 h-3.5 rounded-sm object-cover" />}
                {team.name}
                {team.short_name && <span className="opacity-50 font-normal">[{team.short_name}]</span>}
              </Link>
            </div>

            {/* Dominant stat: total kills */}
            {matchesPlayed > 0 && (
              <div className="text-right flex-shrink-0 pt-1">
                <div className="text-[3.5rem] font-black leading-none tabular-nums" style={{ color: accent }}>
                  {totalKills}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1.5">Total Kills</div>
              </div>
            )}
          </div>

          {/* Stats row — flows naturally without boxes or dividers */}
          {matchesPlayed > 0 ? (
            <div className="flex items-end gap-10 mt-8 pb-7 border-b border-[var(--border)]/60">
              {[
                { label: 'Matches', value: String(matchesPlayed), accent: false },
                { label: 'K/D Ratio', value: kd.toFixed(2), accent: kd >= 2 },
                { label: 'Avg Damage', value: avgDamage.toLocaleString(), accent: false },
                { label: 'Survival', value: `${survivalRate}%`, accent: survivalRate >= 60 },
                { label: 'Avg Placement', value: avgPlacement > 0 ? `#${avgPlacement}` : '—', accent: false },
                { label: 'Tournaments', value: String(playedTournaments.length), accent: false },
              ].map(({ label, value, accent: isAccent }) => (
                <div key={label}>
                  <div
                    className="text-2xl font-bold tabular-nums leading-none"
                    style={{ color: isAccent ? accent : 'var(--text-primary)' }}>
                    {value}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1.5">{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pb-7 mt-6 text-sm text-[var(--text-muted)]">No match data recorded yet.</div>
          )}
        </div>

        {/* Tournaments strip */}
        {playedTournaments.length > 0 && (
          <div className="flex items-center gap-3 px-8 py-3 overflow-x-auto">
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] flex-shrink-0">Played in</span>
            {playedTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors">
                {t.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Career Stats ─────────────────────────────────────────────── */}
      {matchesPlayed > 0 && (
        <>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6">Career Stats</div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-0">
            {[
              { label: 'Total Kills', value: totalKills.toLocaleString(), primary: true },
              { label: 'Avg Damage per Match', value: avgDamage.toLocaleString(), primary: false },
              { label: 'Total Damage Dealt', value: totalDamage.toLocaleString(), primary: false },
              { label: 'Deaths', value: deaths.toString(), primary: false },
              { label: 'K/D Ratio', value: kd.toFixed(2), primary: kd >= 2 },
              { label: 'Matches Survived', value: `${matchesPlayed - deaths} of ${matchesPlayed}`, primary: false },
              { label: 'Survival Rate', value: `${survivalRate}%`, primary: survivalRate >= 60 },
              { label: 'Average Placement', value: avgPlacement > 0 ? `#${avgPlacement}` : '—', primary: false },
            ].map(({ label, value, primary }) => (
              <div key={label} className="flex items-baseline justify-between py-3.5 border-b border-[var(--border)]/50">
                <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
                <span
                  className="text-[13px] font-semibold tabular-nums ml-8"
                  style={{ color: primary ? accent : 'var(--text-primary)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

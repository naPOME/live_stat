import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PlayerAvatar } from '@/components/Avatar';

const HERO_BG = 'https://i.redd.it/2gxxm37lrgy51.jpg';

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/players');

  const { data: player } = await supabase
    .from('players')
    .select('id, display_name, player_open_id, team_id, teams(id, name, short_name, logo_url, org_id)')
    .eq('id', id)
    .single();

  if (!player) notFound();

  const team = Array.isArray(player.teams) ? player.teams[0] : player.teams as { id: string; name: string; short_name: string | null; logo_url: string | null; org_id: string } | null;
  if (!team || team.org_id !== profile.org_id) notFound();

  const { data: orgTournaments } = await supabase
    .from('tournaments').select('id, name').eq('org_id', profile.org_id);
  const orgTournamentIds = new Set((orgTournaments ?? []).map((t) => t.id));

  const { data: rawMatches } = await supabase
    .from('matches').select('id, stage:stages!inner(tournament_id)').eq('status', 'finished');

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

  const accent = '#2F6B3F';

  return (
    <div className="max-w-5xl mx-auto page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs text-[var(--text-muted)]">
        <Link href="/players" className="hover:text-[var(--text-primary)] transition-colors">Players</Link>
        <span className="opacity-30">/</span>
        <span className="text-[var(--text-primary)]">{player.display_name}</span>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-10"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 25%',
          minHeight: 340,
        }}>

        {/* Overlays */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.93) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(120deg, ${accent}35 0%, transparent 55%)` }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end" style={{ minHeight: 340 }}>
          <div className="px-8 pt-8 pb-0">
            <div className="flex items-end gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0 mb-1">
                <PlayerAvatar name={player.display_name} logoUrl={team.logo_url} brandColor={accent} px={96} />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black/60"
                  style={{ backgroundColor: accent }} />
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="font-mono text-[10px] text-white/35 uppercase tracking-widest mb-1.5">
                  {player.player_open_id}
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white leading-none">
                  {player.display_name}
                </h1>
                <Link
                  href={`/teams/${team.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold mt-3 px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                  style={{ color: accent, backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${accent}55` }}>
                  {team.logo_url && <img src={team.logo_url} alt="" className="w-3.5 h-3.5 rounded-sm object-cover" />}
                  {team.name}
                  {team.short_name && <span className="opacity-50 font-normal ml-1">[{team.short_name}]</span>}
                </Link>
              </div>

              {/* Hero stat */}
              {matchesPlayed > 0 && (
                <div className="text-right flex-shrink-0 pb-1">
                  <div className="text-5xl font-black tabular-nums leading-none" style={{ color: accent }}>
                    {totalKills}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-white/35 mt-1.5">Total Kills</div>
                </div>
              )}
            </div>

            {/* Stats row */}
            {matchesPlayed > 0 && (
              <div className="flex items-end gap-8 mt-7 pb-6 border-b border-white/10">
                {[
                  { label: 'Matches', value: String(matchesPlayed) },
                  { label: 'K/D', value: kd.toFixed(2), hi: kd >= 2 },
                  { label: 'Avg Dmg', value: avgDamage.toLocaleString() },
                  { label: 'Survival', value: `${survivalRate}%`, hi: survivalRate >= 60 },
                  { label: 'Avg Place', value: avgPlacement > 0 ? `#${avgPlacement}` : '—' },
                  { label: 'Tournaments', value: String(playedTournaments.length) },
                ].map(({ label, value, hi }) => (
                  <div key={label}>
                    <div className="text-xl font-bold tabular-nums leading-none"
                      style={{ color: hi ? accent : 'white' }}>
                      {value}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-white/35 mt-1.5">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {matchesPlayed === 0 && (
              <div className="pb-6 mt-4 text-sm text-white/30">No match data recorded yet.</div>
            )}
          </div>

          {/* Tournament pills */}
          {playedTournaments.length > 0 && (
            <div className="flex items-center gap-2.5 px-8 py-3.5 overflow-x-auto">
              <span className="text-[9px] uppercase tracking-widest text-white/25 flex-shrink-0 mr-1">In</span>
              {playedTournaments.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`}
                  className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/35 transition-colors whitespace-nowrap">
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Career Stats ─────────────────────────────────────────── */}
      {matchesPlayed > 0 && (
        <>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-5">
            Career Stats
          </div>
          <div className="grid grid-cols-2 gap-x-12">
            {[
              { label: 'Total Kills', value: totalKills.toLocaleString(), hi: true },
              { label: 'Avg Damage / Match', value: avgDamage.toLocaleString(), hi: false },
              { label: 'Total Damage Dealt', value: totalDamage.toLocaleString(), hi: false },
              { label: 'Deaths', value: deaths.toString(), hi: false },
              { label: 'K/D Ratio', value: kd.toFixed(2), hi: kd >= 2 },
              { label: 'Matches Survived', value: `${matchesPlayed - deaths} / ${matchesPlayed}`, hi: false },
              { label: 'Survival Rate', value: `${survivalRate}%`, hi: survivalRate >= 60 },
              { label: 'Average Placement', value: avgPlacement > 0 ? `#${avgPlacement}` : '—', hi: false },
            ].map(({ label, value, hi }) => (
              <div key={label} className="flex items-center justify-between py-3.5 border-b border-[var(--border)]/40">
                <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
                <span className="text-[13px] font-semibold tabular-nums"
                  style={{ color: hi ? accent : 'var(--text-primary)' }}>
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

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  // Get all tournaments
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('org_id', profile.org_id);

  const tournamentIds = (tournaments || []).map(t => t.id);
  const tournamentMap = new Map((tournaments || []).map(t => [t.id, t]));

  // Get all stages
  const { data: stages } = tournamentIds.length > 0
    ? await supabase
        .from('stages')
        .select('id, name, tournament_id')
        .in('tournament_id', tournamentIds)
    : { data: [] };

  const stageIds = (stages || []).map(s => s.id);
  const stageMap = new Map((stages || []).map(s => [s.id, s]));

  // Get all matches
  const { data: matches } = stageIds.length > 0
    ? await supabase
        .from('matches')
        .select('*')
        .in('stage_id', stageIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const statusColors: Record<string, string> = {
    pending: 'bg-white/5 text-[#8b8da6]',
    live: 'bg-[#ff4e4e]/10 text-[#ff4e4e]',
    finished: 'bg-[#00ffc3]/10 text-[#00ffc3]',
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Matches</h1>
          <p className="text-[#8b8da6] text-sm mt-1">All matches across your tournaments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Matches', value: matches?.length ?? 0, color: '#00ffc3' },
          { label: 'Live', value: (matches || []).filter((m: any) => m.status === 'live').length, color: '#ff4e4e' },
          { label: 'Finished', value: (matches || []).filter((m: any) => m.status === 'finished').length, color: '#8b8da6' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a2a3a] border border-white/10 rounded-xl p-4">
            <div className="text-3xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[#8b8da6] text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {(!matches || matches.length === 0) ? (
        <div className="bg-[#1a2a3a] border border-dashed border-white/10 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🎮</div>
          <h3 className="text-white font-semibold mb-1">No matches yet</h3>
          <p className="text-[#8b8da6] text-sm mb-4">Add matches within tournament stages to start tracking</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Go to Tournaments
          </Link>
        </div>
      ) : (
        <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-5 py-2.5 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-[#8b8da6]">
            <span>Match</span>
            <span>Tournament / Stage</span>
            <span>Map</span>
            <span>Status</span>
            <span className="w-16" />
          </div>

          {/* Rows */}
          {matches.map((match: any, i: number) => {
            const stage = stageMap.get(match.stage_id);
            const tournament = stage ? tournamentMap.get(stage.tournament_id) : null;

            return (
              <Link
                key={match.id}
                href={`/tournaments/${stage?.tournament_id}/stages/${match.stage_id}/matches/${match.id}`}
                className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-white/5 transition-colors ${
                  i > 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <span className="text-sm font-medium text-white">{match.name}</span>
                <span className="text-xs text-[#8b8da6]">
                  {tournament?.name ?? '—'} / {stage?.name ?? '—'}
                </span>
                <span className="text-xs text-[#8b8da6]">
                  {match.map_name ? (
                    <span className="bg-white/5 px-2 py-0.5 rounded">{match.map_name}</span>
                  ) : '—'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${statusColors[match.status] || statusColors.pending}`}>
                  {match.status}
                </span>
                <span className="text-xs text-[#8b8da6] w-16 text-right">Manage →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function StagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  // Get all stages across all tournaments for this org
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  const tournamentIds = (tournaments || []).map(t => t.id);

  const { data: stages } = tournamentIds.length > 0
    ? await supabase
        .from('stages')
        .select('*, matches(id)')
        .in('tournament_id', tournamentIds)
        .order('stage_order')
    : { data: [] };

  // Build tournament lookup
  const tournamentMap = new Map((tournaments || []).map(t => [t.id, t]));

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Stages</h1>
          <p className="text-[#8b8da6] text-sm mt-1">All stages across your tournaments</p>
        </div>
      </div>

      {(!stages || stages.length === 0) ? (
        <div className="bg-[#1a2a3a] border border-dashed border-white/10 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-white font-semibold mb-1">No stages yet</h3>
          <p className="text-[#8b8da6] text-sm mb-4">Create stages within your tournaments to organize matches</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Go to Tournaments
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage: any) => {
            const tournament = tournamentMap.get(stage.tournament_id);
            const matchCount = stage.matches?.length ?? 0;
            const stageStatusClass = stage.status === 'active'
              ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
              : stage.status === 'completed'
                ? 'bg-white/10 text-[#8b8da6]'
                : 'bg-amber-500/15 text-amber-400';
            return (
              <Link
                key={stage.id}
                href={`/tournaments/${stage.tournament_id}`}
                className="flex items-center justify-between bg-[#1a2a3a] border border-white/10 rounded-xl px-5 py-4 hover:border-[#00ffc3]/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00ffc3]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#00ffc3] text-sm font-black">{stage.stage_order}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{stage.name}</div>
                    <div className="text-[#8b8da6] text-xs mt-0.5">
                      {tournament?.name ?? 'Unknown'} — {matchCount} match{matchCount !== 1 ? 'es' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageStatusClass}`}>
                    {stage.status ?? 'pending'}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    stage.auto_advance
                      ? 'border-[#00ffc3]/40 text-[#00ffc3] bg-[#00ffc3]/10'
                      : 'border-white/10 text-[#8b8da6] bg-white/5'
                  }`}>
                    Auto-advance {stage.auto_advance ? 'On' : 'Off'}
                  </span>
                  {tournament && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tournament.status === 'active' ? 'bg-[#00ffc3]/10 text-[#00ffc3]' : 'bg-white/5 text-[#8b8da6]'
                    }`}>
                      {tournament.status}
                    </span>
                  )}
                  <span className="text-xs text-[#8b8da6] group-hover:text-[#00ffc3] transition-colors">View →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  const { data: tournaments } = await supabase.from('tournaments').select('id, name').eq('org_id', profile.org_id);
  const tournamentIds = (tournaments || []).map(t => t.id);
  const tournamentMap = new Map((tournaments || []).map(t => [t.id, t]));

  const { data: stages } = tournamentIds.length > 0
    ? await supabase.from('stages').select('id, name, tournament_id').in('tournament_id', tournamentIds)
    : { data: [] };
  const stageIds = (stages || []).map(s => s.id);
  const stageMap = new Map((stages || []).map(s => [s.id, s]));

  const { data: matches } = stageIds.length > 0
    ? await supabase.from('matches').select('*').in('stage_id', stageIds).order('created_at', { ascending: false })
    : { data: [] };

  const statItems = [
    { label: 'Total', value: matches?.length ?? 0, cls: 'text-accent' },
    { label: 'Live', value: (matches || []).filter((m: any) => m.status === 'live').length, cls: 'text-danger' },
    { label: 'Finished', value: (matches || []).filter((m: any) => m.status === 'finished').length, cls: 'text-[var(--text-muted)]' },
  ];
  const cols = '40px 1.2fr 1.2fr 90px 90px';



  return (
    <div className="p-10 max-w-[1100px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Matches</h1>
        <p className="text-[var(--text-secondary)] text-sm font-body">All matches across your tournaments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8 stagger">
        {statItems.map(s => (
          <div key={s.label} className="surface-elevated rounded-xl p-5">
            <div className={`stat-number text-3xl mb-1 ${s.cls}`}>{s.value}</div>
            <div className="text-[var(--text-muted)] text-[11px] font-display uppercase tracking-widest font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {(!matches || matches.length === 0) ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center relative overflow-hidden flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                <rect x="3" y="3" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <path d="M3 10H23" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <path d="M10 10V23" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Matches Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Add matches within tournament stages to start tracking results.</p>
            <Link href="/tournaments" className="btn-primary">Go to Tournaments</Link>
          </div>
        </div>
      ) : (
        <div className="data-table animate-slide-up">
          <div className="data-table-header" style={{ gridTemplateColumns: cols }}>
            {['#', 'Match', 'Tournament / Stage', 'Map', 'Status'].map((h) => (
              <span key={h} className="text-[11px] font-display font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <div>
            {matches.map((match: any, i: number) => {
              const stage = stageMap.get(match.stage_id);
              const tournament = stage ? tournamentMap.get(stage.tournament_id) : null;
              const statusStyle = match.status === 'live'
                ? 'text-[var(--red)]'
                : match.status === 'finished'
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)]';
              return (
                <Link key={match.id}
                  href={`/tournaments/${stage?.tournament_id}/stages/${match.stage_id}/matches/${match.id}`}
                  className="data-table-row group transition-colors"
                  style={{ gridTemplateColumns: cols }}>
                  <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{i + 1}</span>
                  <span className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{match.name}</span>
                  <span className="text-[13px] text-[var(--text-muted)] truncate">{tournament?.name ?? '—'} / {stage?.name ?? '—'}</span>
                  <span className="text-[13px] text-[var(--text-secondary)]">{match.map_name || '—'}</span>
                  <span className={`text-[11px] font-display font-bold uppercase tracking-widest ${statusStyle}`}>
                    {match.status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--red)] mr-1.5" />}
                    {match.status === 'finished' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1.5" />}
                    {match.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

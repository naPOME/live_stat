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

  const { data: tournaments } = await supabase
    .from('tournaments').select('id, name, status').eq('org_id', profile.org_id).order('created_at', { ascending: false });

  const tournamentIds = (tournaments || []).map(t => t.id);
  const { data: stages } = tournamentIds.length > 0
    ? await supabase.from('stages').select('*, matches(id)').in('tournament_id', tournamentIds).order('stage_order')
    : { data: [] };

  const tournamentMap = new Map((tournaments || []).map(t => [t.id, t]));
  const cols = '40px 1fr 1.2fr 80px 90px';


  return (
    <div className="p-10 max-w-[1100px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Stages</h1>
        <p className="text-[var(--text-secondary)] text-sm font-body">All stages across your tournaments</p>
      </div>

      {(!stages || stages.length === 0) ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center relative overflow-hidden flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                <rect x="3" y="4" width="20" height="4.5" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]"/>
                <rect x="3" y="10.75" width="20" height="4.5" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" opacity="0.5"/>
                <rect x="3" y="17.5" width="20" height="4.5" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" opacity="0.25"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Stages Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Create stages within your tournaments to organize matches.</p>
            <Link href="/tournaments" className="btn-primary">Go to Tournaments</Link>
          </div>
        </div>
      ) : (
        <div className="data-table animate-slide-up">
          <div className="data-table-header" style={{ gridTemplateColumns: cols }}>
            {['#', 'Stage', 'Tournament', 'Matches', 'Status'].map((h) => (
              <span key={h} className="text-[11px] font-display font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <div>
            {stages.map((stage: any) => {
              const tournament = tournamentMap.get(stage.tournament_id);
              const matchCount = stage.matches?.length ?? 0;
              const statusStyle = stage.status === 'active'
                ? 'text-[var(--accent)]'
                : stage.status === 'completed'
                  ? 'text-[var(--text-muted)]'
                  : 'text-[var(--amber)]';
              return (
                <Link key={stage.id} href={`/tournaments/${stage.tournament_id}`}
                  className="data-table-row group transition-colors"
                  style={{ gridTemplateColumns: cols }}>
                  <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{stage.stage_order}</span>
                  <span className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{stage.name}</span>
                  <span className="text-[13px] text-[var(--text-muted)] truncate">{tournament?.name ?? 'Unknown'}</span>
                  <span className="text-[13px] font-mono tabular-nums text-[var(--text-secondary)]">{matchCount}</span>
                  <span className={`text-[11px] font-display font-bold uppercase tracking-widest ${statusStyle}`}>
                    {stage.status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1.5" style={{ boxShadow: '0 0 6px rgba(0,255,195,0.5)' }} />}
                    {stage.status ?? 'pending'}
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

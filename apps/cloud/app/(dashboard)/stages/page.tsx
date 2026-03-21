import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StagesClient from './StagesClient';

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
  const { data: rawStages } = tournamentIds.length > 0
    ? await supabase.from('stages').select('*, matches(id)').in('tournament_id', tournamentIds).order('stage_order')
    : { data: [] as any[] };

  const tournamentMap = new Map((tournaments || []).map(t => [t.id, t]));

  const stages = (rawStages ?? []).map((s: any) => ({
    id: s.id,
    tournament_id: s.tournament_id,
    name: s.name,
    stage_type: s.stage_type ?? 'finals',
    status: s.status ?? 'pending',
    stage_order: s.stage_order ?? 0,
    matchCount: s.matches?.length ?? 0,
    tournamentName: tournamentMap.get(s.tournament_id)?.name ?? 'Unknown',
  }));

  return (
    <div className="max-w-[1100px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Stages</h1>
        <p className="text-[var(--text-secondary)] text-sm">All stages across your tournaments</p>
      </div>

      {stages.length === 0 ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center flex flex-col items-center">
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
        <div className="animate-slide-up">
          <StagesClient stages={stages} />
        </div>
      )}
    </div>
  );
}

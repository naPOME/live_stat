import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StagesClient from './StagesClient';

const HERO_BG = 'https://a-static.besthdwallpaper.com/playerunknown-s-battlegrounds-pubg-mobile-battle-in-mad-miramar-wallpaper-2560x1080-63448_14.jpg';

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

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-10"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 55%',
          minHeight: 220,
        }}>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.92) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col justify-end p-8 pt-14" style={{ minHeight: 220 }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
            Tournament Structure
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white leading-none mb-2">Stages</h1>
              <p className="text-white/40 text-sm">
                {stages.length} stage{stages.length !== 1 ? 's' : ''} across your tournaments
              </p>
            </div>
          </div>
        </div>
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

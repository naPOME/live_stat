import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const HERO_BG = 'https://a-static.besthdwallpaper.com/playerunknown-s-battlegrounds-pubg-mobile-battle-in-mad-miramar-wallpaper-2560x1080-63448_14.jpg';

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id,name,status,created_at,api_key')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });
  const cols = '40px 1fr 90px 120px';

  return (
    <div className="max-w-[1100px] page-enter">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-10"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          minHeight: 240,
        }}>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.92) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col justify-end p-8 pt-16" style={{ minHeight: 240 }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
            Tournament Management
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white leading-none mb-2">
                Tournaments
              </h1>
              <p className="text-white/40 text-sm">
                {tournaments?.length ?? 0} tournament{tournaments?.length !== 1 ? 's' : ''} in your organization
              </p>
            </div>
            <Link href="/tournaments/new"
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/20 bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Create Tournament
            </Link>
          </div>
        </div>
      </div>

      {tournaments && tournaments.length > 0 ? (
        <div className="data-table animate-slide-up">
          <div className="data-table-header" style={{ gridTemplateColumns: cols }}>
            {['#', 'Event Name', 'Status', 'Created'].map((h) => (
              <span key={h} className="text-[11px] font-display font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <div>
            {tournaments.map((t, i) => {
              const statusStyle = t.status === 'active'
                ? 'text-[var(--accent)] border-[var(--accent)]/30'
                : t.status === 'pending'
                  ? 'text-[var(--amber)] border-[var(--amber)]/30'
                  : 'text-[var(--text-muted)] border-[var(--border)]';
              return (
                <Link key={t.id} href={`/tournaments/${t.id}`}
                  className="data-table-row group transition-colors"
                  style={{ gridTemplateColumns: cols }}>
                  <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{i + 1}</span>
                  <span className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{t.name}</span>
                  <span className={`text-[11px] font-display font-bold uppercase tracking-widest ${statusStyle}`}>
                    {t.status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1.5" style={{ boxShadow: '0 0 6px rgba(0,255,195,0.5)' }} />}
                    {t.status}
                  </span>
                  <span className="text-[var(--text-muted)] text-[12px] font-mono tabular-nums">
                    {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center relative overflow-hidden flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <path d="M14 3L17 10H24L18.5 14.5L20.5 22L14 17.5L7.5 22L9.5 14.5L4 10H11L14 3Z" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Tournaments Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Create your first tournament to start managing teams, matches, and leaderboards.</p>
            <Link href="/tournaments/new" className="btn-primary inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Create Tournament</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

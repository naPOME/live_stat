import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SetupOrgPrompt from '@/components/SetupOrgPrompt';

const HERO_IMG = 'https://a-static.besthdwallpaper.com/playerunknown-s-battlegrounds-pubg-mobile-battle-in-mad-miramar-wallpaper-2560x1080-63448_14.jpg';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();

  if (!profile?.org_id) return <SetupOrgPrompt />;

  const orgId = profile.org_id;
  const [
    { data: org },
    { count: tournamentCount },
    { count: teamCount },
    { data: recentTournaments },
    { data: pendingApps },
  ] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', orgId).single(),
    supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    supabase.from('teams').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('tournaments').select('id,name,status,created_at').eq('org_id', orgId).neq('status', 'archived').order('created_at', { ascending: false }).limit(5),
    supabase.from('team_applications').select('id, tournament_id').eq('status', 'pending'),
  ]);

  const allTournamentIds = await supabase.from('tournaments').select('id').eq('org_id', orgId);
  const ourIds = new Set((allTournamentIds.data || []).map((t: any) => t.id));
  const pendingCount = (pendingApps || []).filter(a => ourIds.has(a.tournament_id)).length;

  const quickActions = [
    { label: 'New Tournament', href: '/tournaments/new', desc: 'Create & configure',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
    { label: 'Manage Teams', href: '/teams', desc: 'Teams & player IDs',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="13" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/><path d="M2 17c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label: 'Widgets', href: '/widgets', desc: 'OBS overlay setup',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="12" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="12" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M14 13l2.5 2.5L14 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'Settings', href: '/settings', desc: 'Branding & theme',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 3v2m0 10v2m7-7h-2M5 10H3m11.6-4.6l-1.4 1.4M5.8 14.2l-1.4 1.4m11.2 0l-1.4-1.4M5.8 5.8L4.4 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  ];

  return (
    <div className="max-w-[1100px] page-enter">

      {/* ── Cinematic Hero ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-10"
        style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          minHeight: 300,
        }}>
        {/* Layered overlay: dark vignette + bottom fade to bg */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.88) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end h-full p-8 pt-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
            Operations Dashboard
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white leading-none mb-6">
            {org?.name ?? 'Dashboard'}
          </h1>

          {/* Stats row */}
          <div className="flex items-end gap-10">
            {[
              { label: 'Active Tournaments', value: tournamentCount ?? 0, href: '/tournaments' },
              { label: 'Registered Teams', value: teamCount ?? 0, href: '/teams' },
              { label: 'Pending Applications', value: pendingCount, href: '/tournaments', warn: pendingCount > 0 },
            ].map(({ label, value, href, warn }) => (
              <Link key={label} href={href} className="group">
                <div className={`text-4xl font-black tabular-nums leading-none transition-colors ${warn && value > 0 ? 'text-[var(--amber)]' : 'text-white group-hover:text-[var(--accent)]'}`}>
                  {value}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1.5">{label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Quick Actions</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href}
              className="surface p-5 card-hover group flex flex-col items-start gap-4">
              <div className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                {a.icon}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-0.5">{a.label}</div>
                <div className="text-[var(--text-muted)] text-[12px]">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Tournaments ───────────────────────────────────────── */}
      {recentTournaments && recentTournaments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent Tournaments</div>
            <Link href="/tournaments" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium">
              View all →
            </Link>
          </div>
          <div className="data-table">
            <div className="data-table-header" style={{ gridTemplateColumns: '1fr 110px 110px' }}>
              {['Name', 'Status', 'Created'].map((h) => (
                <span key={h} className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
              ))}
            </div>
            <div>
              {recentTournaments.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.id}`}
                  className="data-table-row group"
                  style={{ gridTemplateColumns: '1fr 110px 110px' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border border-[var(--border)] bg-[var(--bg-surface)]">
                      <svg width="13" height="13" viewBox="0 0 18 18" fill="none" className="text-[var(--text-muted)]">
                        <path d="M9 2L11 6.5H16L12 9.5L13.5 14L9 11L4.5 14L6 9.5L2 6.5H7L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{t.name}</span>
                  </div>
                  <span>
                    <span className={`badge ${t.status === 'active' ? 'badge-accent' : t.status === 'archived' ? 'badge-muted' : 'badge-warning'}`}>
                      {t.status}
                    </span>
                  </span>
                  <span className="text-[var(--text-muted)] text-[13px]">
                    {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {!recentTournaments?.length && (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <path d="M14 3L17 10H24L18.5 14.5L20.5 22L14 17.5L7.5 22L9.5 14.5L4 10H11L14 3Z" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-muted)]" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Tournaments Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Create your first tournament to start managing teams, matches, and leaderboards.</p>
            <Link href="/tournaments/new" className="btn-primary inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Create Tournament
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

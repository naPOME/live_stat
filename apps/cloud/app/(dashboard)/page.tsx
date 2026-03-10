import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SetupOrgPrompt from '@/components/SetupOrgPrompt';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return <SetupOrgPrompt />;
  }

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
    supabase.from('tournaments').select('id,name,status,created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
    supabase.from('team_applications').select('id, tournament_id').eq('status', 'pending'),
  ]);

  // Filter pending apps to only our tournaments
  const allTournamentIds = await supabase.from('tournaments').select('id').eq('org_id', orgId);
  const ourIds = new Set((allTournamentIds.data || []).map((t: any) => t.id));
  const pendingCount = (pendingApps || []).filter(a => ourIds.has(a.tournament_id)).length;

  const stats = [
    { label: 'Active Tournaments', value: tournamentCount ?? 0, color: '#00ffc3', href: '/tournaments' },
    { label: 'Registered Teams', value: teamCount ?? 0, color: '#00ffc3', href: '/teams' },
    { label: 'Pending Applications', value: pendingCount, color: pendingCount > 0 ? '#ffb800' : '#8b8da6', href: '/tournaments' },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {org?.name ?? 'Dashboard'}
        </h1>
        <p className="text-[#8b8da6] text-sm mt-1">Overview of your tournament activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-[#1a2a3a] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors group"
          >
            <div className="text-3xl font-black tabular-nums" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[#8b8da6] text-xs mt-1 group-hover:text-white/70 transition-colors">
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'New Tournament', href: '/tournaments/new', icon: '+', desc: 'Create a tournament' },
          { label: 'Manage Teams', href: '/teams', icon: '⬡', desc: 'Teams & player IDs' },
          { label: 'Widgets & API', href: '/widgets', icon: '◈', desc: 'OBS overlay widgets' },
          { label: 'Settings', href: '/settings', icon: '⚙', desc: 'Branding & theme' },
        ].map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="bg-[#1a2a3a] border border-white/10 rounded-xl p-4 hover:border-[#00ffc3]/40 transition-all group"
          >
            <div className="text-[#00ffc3] text-xl mb-2 font-black">{a.icon}</div>
            <div className="text-white font-semibold text-sm">{a.label}</div>
            <div className="text-[#8b8da6] text-xs mt-0.5">{a.desc}</div>
          </Link>
        ))}
      </div>

      {/* Recent tournaments */}
      {recentTournaments && recentTournaments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#8b8da6] uppercase tracking-wider">Recent Tournaments</h2>
            <Link href="/tournaments" className="text-xs text-[#00ffc3] hover:text-[#00d9a6] transition-colors">
              View all →
            </Link>
          </div>
          <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl overflow-hidden">
            {recentTournaments.map((t, i) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className={`flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors ${
                  i > 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <span className="text-sm font-medium text-white">{t.name}</span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t.status === 'active'
                        ? 'bg-[#00ffc3]/10 text-[#00ffc3]'
                        : 'bg-white/5 text-[#8b8da6]'
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[#8b8da6] text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!recentTournaments?.length && (
        <div className="bg-[#1a2a3a] border border-dashed border-white/10 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-white font-semibold mb-1">No tournaments yet</h3>
          <p className="text-[#8b8da6] text-sm mb-4">Create your first tournament to get started</p>
          <Link
            href="/tournaments/new"
            className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + New Tournament
          </Link>
        </div>
      )}
    </div>
  );
}

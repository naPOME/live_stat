import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Admin guard
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!(profile as any)?.is_admin) redirect('/');

  // Use service role to query across all orgs (bypasses RLS)
  const service = createServiceClient();

  const [
    { data: orgs },
    { count: totalTournaments },
    { count: totalTeams },
    { count: totalMatches },
  ] = await Promise.all([
    service.from('organizations').select('id, name, brand_color, created_at').order('created_at', { ascending: false }),
    service.from('tournaments').select('*', { count: 'exact', head: true }),
    service.from('teams').select('*', { count: 'exact', head: true }),
    service.from('matches').select('*', { count: 'exact', head: true }),
  ]);

  // Per-org stats
  const orgIds = (orgs ?? []).map((o) => o.id);
  const [{ data: orgTournaments }, { data: orgTeams }] = await Promise.all([
    service.from('tournaments').select('org_id').in('org_id', orgIds),
    service.from('teams').select('org_id').in('org_id', orgIds),
  ]);

  const tCount: Record<string, number> = {};
  const teamCount: Record<string, number> = {};
  for (const t of orgTournaments ?? []) tCount[t.org_id] = (tCount[t.org_id] ?? 0) + 1;
  for (const t of orgTeams ?? []) teamCount[t.org_id] = (teamCount[t.org_id] ?? 0) + 1;

  const stats = [
    { label: 'Organizations', value: orgs?.length ?? 0, color: '#00ffc3' },
    { label: 'Tournaments',   value: totalTournaments ?? 0, color: '#00ffc3' },
    { label: 'Teams',         value: totalTeams ?? 0, color: '#f59e0b' },
    { label: 'Matches',       value: totalMatches ?? 0, color: '#ff4e4e' },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#ff4e4e] shadow-[0_0_8px_#ff4e4e]" />
          <h1 className="text-2xl font-bold text-white">System Admin</h1>
        </div>
        <p className="text-[#8b8da6] text-sm">Platform-wide overview — all organizations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#213448] border border-white/10 rounded-2xl p-5"
          >
            <div className="text-4xl font-black tabular-nums mb-1" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[#8b8da6] text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Organizations table */}
      <div>
        <h2 className="text-sm font-semibold text-[#8b8da6] uppercase tracking-wider mb-3">
          All Organizations
        </h2>
        <div className="bg-[#213448] border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_160px] gap-4 px-5 py-3 border-b border-white/5">
            {['Organization', 'Tournaments', 'Teams', 'Registered'].map((h) => (
              <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8da6]">{h}</span>
            ))}
          </div>

          {(orgs ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-[#8b8da6] text-sm">No organizations yet</div>
          ) : (
            (orgs ?? []).map((org, i) => (
              <div
                key={org.id}
                className={`grid grid-cols-[1fr_80px_80px_160px] gap-4 items-center px-5 py-3.5 ${
                  i > 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-6 h-6 rounded-md flex-shrink-0"
                    style={{ backgroundColor: (org.brand_color ?? '#00ffc3') + '33', border: `1.5px solid ${org.brand_color ?? '#00ffc3'}55` }}
                  />
                  <span className="text-sm font-medium text-white truncate">{org.name}</span>
                </div>
                <span className="text-sm tabular-nums text-[#8b8da6]">
                  {tCount[org.id] ?? 0}
                </span>
                <span className="text-sm tabular-nums text-[#8b8da6]">
                  {teamCount[org.id] ?? 0}
                </span>
                <span className="text-xs text-[#8b8da6]">
                  {new Date(org.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-[10px] text-[#8b8da6]/50 mt-6 text-center">
        Admin access. To grant admin to a user: <code className="font-mono">UPDATE profiles SET is_admin = true WHERE id = &apos;user-uuid&apos;;</code>
      </p>
    </div>
  );
}

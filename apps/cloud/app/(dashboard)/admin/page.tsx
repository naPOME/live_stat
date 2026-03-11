import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!(profile as any)?.is_admin) redirect('/');

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
    { label: 'Organizations', value: orgs?.length ?? 0, cls: 'text-accent' },
    { label: 'Tournaments', value: totalTournaments ?? 0, cls: 'text-purple' },
    { label: 'Teams', value: totalTeams ?? 0, cls: 'text-warning' },
    { label: 'Matches', value: totalMatches ?? 0, cls: 'text-danger' },
  ];

  const cols = '40px 1fr 90px 90px 140px';

  return (
    <div className="p-10 max-w-[1100px] page-enter">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--red)' }} />
          <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)]">System Admin</h1>
        </div>
        <p className="text-[var(--text-secondary)] text-sm font-body">Platform-wide overview — all organizations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-10 stagger">
        {stats.map((s) => (
          <div key={s.label} className="surface-elevated rounded-2xl p-6">
            <div className={`stat-number text-4xl mb-2 ${s.cls}`}>{s.value}</div>
            <div className="text-[var(--text-muted)] text-[11px] font-display uppercase tracking-widest font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Orgs table */}
      <div>
        <h2 className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">All Organizations</h2>
        <div className="data-table">
          <div className="data-table-header" style={{ gridTemplateColumns: cols }}>
            <span>#</span>
            <span>Organization</span>
            <span>Tournaments</span>
            <span>Teams</span>
            <span>Registered</span>
          </div>
          {(orgs ?? []).length === 0 ? (
            <div className="px-6 py-10 text-center text-[var(--text-muted)] text-sm">No organizations yet</div>
          ) : (
            (orgs ?? []).map((org, i) => (
              <div key={org.id}
                className="data-table-row" style={{ gridTemplateColumns: cols }}>
                <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">{i + 1}</span>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-xs flex-shrink-0"
                    style={{ backgroundColor: (org.brand_color ?? '#00ffc3') + '15', border: `1px solid ${org.brand_color ?? '#00ffc3'}20`, color: org.brand_color ?? '#00ffc3' }}>
                    {org.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold truncate">{org.name}</span>
                </div>

                <span className="text-sm font-mono tabular-nums text-[var(--text-secondary)]">{tCount[org.id] ?? 0}</span>
                <span className="text-sm font-mono tabular-nums text-[var(--text-secondary)]">{teamCount[org.id] ?? 0}</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {new Date(org.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)] opacity-50 mt-8 text-center font-mono">
        Admin access. Grant admin: <code>UPDATE profiles SET is_admin = true WHERE id = &apos;user-uuid&apos;;</code>
      </p>
    </div>
  );
}

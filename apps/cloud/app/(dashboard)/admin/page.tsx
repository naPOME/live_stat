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
    service.from('organizations').select('id, name, brand_color, logo_url, created_at').order('created_at', { ascending: false }),
    service.from('tournaments').select('*', { count: 'exact', head: true }),
    service.from('teams').select('*', { count: 'exact', head: true }),
    service.from('matches').select('*', { count: 'exact', head: true }),
  ]);

  // Recent tournaments
  const { data: recentTournaments } = await service
    .from('tournaments')
    .select('id, name, org_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  const orgIds = (orgs ?? []).map((o) => o.id);
  const [{ data: orgTournaments }, { data: orgTeams }] = await Promise.all([
    orgIds.length > 0 ? service.from('tournaments').select('org_id').in('org_id', orgIds) : { data: [] },
    orgIds.length > 0 ? service.from('teams').select('org_id').in('org_id', orgIds) : { data: [] },
  ]);

  const tCount: Record<string, number> = {};
  const teamCount: Record<string, number> = {};
  const orgNameMap: Record<string, string> = {};
  for (const t of orgTournaments ?? []) tCount[t.org_id] = (tCount[t.org_id] ?? 0) + 1;
  for (const t of orgTeams ?? []) teamCount[t.org_id] = (teamCount[t.org_id] ?? 0) + 1;
  for (const o of orgs ?? []) orgNameMap[o.id] = o.name;

  return (
    <div className="p-8 max-w-[1200px] mx-auto page-enter">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--amber)' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Platform Admin</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>System overview across all organizations</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: 'rgba(242,169,0,0.08)', color: 'var(--amber)', border: '1px solid rgba(242,169,0,0.15)' }}>
              {user.email}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Organizations', value: orgs?.length ?? 0, icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          )},
          { label: 'Tournaments', value: totalTournaments ?? 0, icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 22V8"/><path d="M14 22V8"/><rect x="6" y="2" width="12" height="7" rx="1"/></svg>
          )},
          { label: 'Teams', value: totalTeams ?? 0, icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          )},
          { label: 'Matches', value: totalMatches ?? 0, icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          )},
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: 'var(--amber)', opacity: 0.7 }}>{s.icon}</span>
            </div>
            <div className="text-3xl font-semibold tabular-nums mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Organizations — 2/3 */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Organizations</h2>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{(orgs ?? []).length} total</span>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            {(orgs ?? []).length === 0 ? (
              <div className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No organizations yet</div>
            ) : (
              <div>
                {(orgs ?? []).map((org, i) => {
                  const color = org.brand_color ?? '#F2A900';
                  return (
                    <div key={org.id}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                      style={{ borderBottom: i < (orgs ?? []).length - 1 ? '1px solid var(--border)' : 'none', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Color bar */}
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: color }} />

                      {/* Logo or initials */}
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: color + '12', color }}>
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{org.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Counts */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-md tabular-nums font-medium"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {tCount[org.id] ?? 0} <span style={{ color: 'var(--text-muted)' }}>events</span>
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-md tabular-nums font-medium"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {teamCount[org.id] ?? 0} <span style={{ color: 'var(--text-muted)' }}>teams</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Tournaments — 1/3 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Recent Events</h2>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
            {(recentTournaments ?? []).length === 0 ? (
              <div className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No tournaments yet</div>
            ) : (
              <div>
                {(recentTournaments ?? []).map((t: any, i: number) => (
                  <div key={t.id}
                    className="px-4 py-3 transition-colors"
                    style={{ borderBottom: i < (recentTournaments ?? []).length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <div className="text-sm font-medium truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: t.status === 'active' ? 'rgba(34,197,94,0.08)' : t.status === 'draft' ? 'rgba(242,169,0,0.08)' : 'var(--bg-elevated)',
                          color: t.status === 'active' ? '#22c55e' : t.status === 'draft' ? 'var(--amber)' : 'var(--text-muted)',
                          border: `1px solid ${t.status === 'active' ? 'rgba(34,197,94,0.15)' : t.status === 'draft' ? 'rgba(242,169,0,0.15)' : 'var(--border)'}`,
                        }}>
                        {t.status}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {orgNameMap[t.org_id] ?? 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          Admin access granted via <code style={{ background: 'var(--code-bg)', padding: '1px 4px', borderRadius: 3 }}>profiles.is_admin</code>
        </p>
      </div>
    </div>
  );
}

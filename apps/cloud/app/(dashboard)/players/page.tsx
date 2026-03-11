import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  const { data: teams } = await supabase.from('teams').select('id, name, short_name, brand_color').eq('org_id', profile.org_id);
  const teamIds = (teams || []).map(t => t.id);
  const teamMap = new Map((teams || []).map(t => [t.id, t]));

  const { data: players } = teamIds.length > 0
    ? await supabase.from('players').select('*').in('team_id', teamIds).order('display_name')
    : { data: [] };
  const cols = '40px 1.5fr 1.5fr 1fr';



  return (
    <div className="p-10 max-w-[1100px] page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-1">Players</h1>
        <p className="text-[var(--text-secondary)] text-sm font-body">
          {players?.length ?? 0} players across {teams?.length ?? 0} teams
        </p>
      </div>

      {(!players || players.length === 0) ? (
        <div className="surface animate-slide-up mt-8">
          <div className="p-16 text-center relative overflow-hidden flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)]">
              <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.6" className="text-[var(--text-muted)]"/>
                <path d="M4 23c0-5 4-8.5 9-8.5s9 3.5 9 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-[var(--text-muted)]"/>
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold mb-2 text-[var(--text-primary)]">No Players Yet</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-8 max-w-sm">Add players to your teams to start building rosters.</p>
            <Link href="/teams" className="btn-primary">Go to Teams</Link>
          </div>
        </div>
      ) : (
        <div className="data-table animate-slide-up">
          <div className="data-table-header" style={{ gridTemplateColumns: cols }}>
            {['#', 'Player', 'In-Game ID', 'Team'].map((h) => (
              <span key={h} className="text-[11px] font-display font-medium text-[var(--text-muted)] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <div>
            {players.map((player: any, i: number) => {
              const team = teamMap.get(player.team_id);
              const color = team?.brand_color || '#7a8ba8';
              return (
                <Link key={player.id} href={`/teams/${player.team_id}`}
                  className="data-table-row group transition-colors"
                  style={{ gridTemplateColumns: cols }}>
                  <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{i + 1}</span>
                  <span className="text-[14px] font-medium text-[var(--text-primary)] truncate group-hover:text-white transition-colors">{player.display_name}</span>
                  <span className="text-[13px] font-mono text-[var(--text-muted)] truncate">{player.player_open_id}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}44` }} />
                    <span className="text-[13px] text-[var(--text-secondary)] truncate">{team?.name ?? 'Unknown'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

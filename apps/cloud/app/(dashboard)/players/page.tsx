import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  // Get all teams for this org
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, brand_color')
    .eq('org_id', profile.org_id);

  const teamIds = (teams || []).map(t => t.id);
  const teamMap = new Map((teams || []).map(t => [t.id, t]));

  // Get all players
  const { data: players } = teamIds.length > 0
    ? await supabase
        .from('players')
        .select('*')
        .in('team_id', teamIds)
        .order('display_name')
    : { data: [] };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="text-[#8b8da6] text-sm mt-1">{players?.length ?? 0} players across {teams?.length ?? 0} teams</p>
        </div>
      </div>

      {(!players || players.length === 0) ? (
        <div className="bg-[#1a2a3a] border border-dashed border-white/10 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">👤</div>
          <h3 className="text-white font-semibold mb-1">No players yet</h3>
          <p className="text-[#8b8da6] text-sm mb-4">Add players to your teams to start building rosters</p>
          <Link
            href="/teams"
            className="inline-flex items-center gap-2 bg-[#00ffc3]/15 hover:bg-[#00ffc3]/25 text-[#00ffc3] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Go to Teams
          </Link>
        </div>
      ) : (
        <div className="bg-[#1a2a3a] border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_2fr_1.5fr_auto] px-5 py-2.5 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-[#8b8da6]">
            <span>Player</span>
            <span>In-Game ID</span>
            <span>Team</span>
            <span className="w-12" />
          </div>

          {/* Rows */}
          {players.map((player: any, i: number) => {
            const team = teamMap.get(player.team_id);
            const color = team?.brand_color || '#ffffff';

            return (
              <div
                key={player.id}
                className={`grid grid-cols-[2fr_2fr_1.5fr_auto] items-center px-5 py-3 ${
                  i > 0 ? 'border-t border-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background: color + '22', color }}
                  >
                    {(player.display_name || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-white">{player.display_name}</span>
                </div>
                <span className="text-sm font-mono text-[#8b8da6]">{player.player_open_id}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <Link
                    href={`/teams/${player.team_id}`}
                    className="text-xs text-[#8b8da6] hover:text-[#00ffc3] transition-colors"
                  >
                    {team?.name ?? 'Unknown'}
                  </Link>
                </div>
                <Link
                  href={`/teams/${player.team_id}`}
                  className="text-xs text-[#8b8da6] hover:text-[#00ffc3] w-12 text-right transition-colors"
                >
                  Edit
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

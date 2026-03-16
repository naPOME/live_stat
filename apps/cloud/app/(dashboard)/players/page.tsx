import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetupOrgPrompt from '@/components/SetupOrgPrompt';
import PlayersClient from './PlayersClient';

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return <SetupOrgPrompt />;

  const [{ data: teams }, { data: tournaments }] = await Promise.all([
    supabase.from('teams').select('id, name, short_name, brand_color').eq('org_id', profile.org_id),
    supabase.from('tournaments').select('id, name').eq('org_id', profile.org_id).order('name'),
  ]);

  const teamIds = (teams ?? []).map((t) => t.id);
  const { data: players } = teamIds.length > 0
    ? await supabase.from('players').select('id, team_id, display_name, player_open_id').in('team_id', teamIds).order('display_name')
    : { data: [] as any[] };

  return (
    <PlayersClient
      initialPlayers={(players as any[]) ?? []}
      initialTeams={(teams as any[]) ?? []}
      initialTournaments={(tournaments as any[]) ?? []}
    />
  );
}

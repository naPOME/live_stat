import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetupOrgPrompt from '@/components/SetupOrgPrompt';
import TeamsClient from './TeamsClient';

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return <SetupOrgPrompt />;

  const [{ data: teams }, { count }] = await Promise.all([
    supabase.from('teams').select('id, org_id, name, short_name, logo_url, brand_color, created_at').eq('org_id', profile.org_id).order('name'),
    supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const teamIds = (teams ?? []).map((t: any) => t.id);
  const { data: playerRows } = teamIds.length > 0
    ? await supabase.from('players').select('team_id').in('team_id', teamIds)
    : { data: [] };

  // Single query for all player counts instead of N queries
  const playerCounts: Record<string, number> = {};
  for (const row of playerRows ?? []) {
    playerCounts[(row as any).team_id] = (playerCounts[(row as any).team_id] ?? 0) + 1;
  }

  return (
    <TeamsClient
      initialTeams={(teams as any[]) ?? []}
      initialHasTournaments={(count ?? 0) > 0}
      initialPlayerCounts={playerCounts}
      orgId={profile.org_id}
    />
  );
}

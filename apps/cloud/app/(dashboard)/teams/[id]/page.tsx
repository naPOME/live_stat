import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TeamDetailClient from './TeamDetailClient';

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: team }, { data: players }] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).single(),
    supabase.from('players').select('*').eq('team_id', teamId).order('display_name'),
  ]);

  if (!team) redirect('/teams');

  return (
    <TeamDetailClient
      teamId={teamId}
      initialTeam={team}
      initialPlayers={players ?? []}
    />
  );
}

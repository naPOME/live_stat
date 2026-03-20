import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TournamentDetailClient from './TournamentDetailClient';
import type { TournamentData, PointSystem } from './_types';

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tournament }, { data: pointSystem }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, name, status, api_key, registration_open, registration_mode, registration_limit, target_team_count, org_id')
      .eq('id', id)
      .single(),
    supabase
      .from('point_systems')
      .select('id, name, tournament_id, placement_points, kill_points, created_at')
      .eq('tournament_id', id)
      .limit(1)
      .single(),
  ]);

  if (!tournament) redirect('/tournaments');

  return (
    <TournamentDetailClient
      tournamentId={id}
      initialTournament={tournament as TournamentData}
      initialPointSystem={pointSystem as PointSystem | null}
    />
  );
}

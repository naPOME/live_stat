import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetupOrgPrompt from '@/components/SetupOrgPrompt';
import MatchesClient from './MatchesClient';

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return <SetupOrgPrompt />;

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('org_id', profile.org_id);
  const tournamentIds = (tournaments ?? []).map((t) => t.id);

  const { data: stages } = tournamentIds.length > 0
    ? await supabase.from('stages').select('id, name, tournament_id').in('tournament_id', tournamentIds)
    : { data: [] as { id: string; name: string; tournament_id: string }[] };
  const stageIds = (stages ?? []).map((s) => s.id);

  const { data: matches } = stageIds.length > 0
    ? await supabase
      .from('matches')
      .select('id, stage_id, name, map_name, status, scheduled_at, created_at')
      .in('stage_id', stageIds)
      .order('created_at', { ascending: false })
    : { data: [] as any[] };

  return (
    <MatchesClient
      initialMatches={(matches as any[]) ?? []}
      initialStages={(stages as any[]) ?? []}
      initialTournaments={(tournaments as any[]) ?? []}
    />
  );
}

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuickStreamDetailClient from './QuickStreamDetailClient';

export default async function QuickStreamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) redirect('/');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, created_at, api_key, format')
    .eq('id', id)
    .eq('format', 'quick_stream')
    .eq('org_id', profile.org_id)
    .single();

  if (!tournament) notFound();

  const { data: stage } = await supabase
    .from('stages')
    .select('id, name, status')
    .eq('tournament_id', id)
    .order('stage_order')
    .limit(1)
    .single();

  const { data: matches } = await supabase
    .from('matches')
    .select('id, name, status, created_at')
    .eq('stage_id', stage?.id ?? '')
    .order('created_at');

  const matchIds = (matches ?? []).map(m => m.id);

  // Fetch results for all matches
  const { data: results } = matchIds.length > 0
    ? await supabase
        .from('match_results')
        .select('match_id, slot_number, in_game_team_name, team_id, placement, kill_count, total_pts')
        .in('match_id', matchIds)
        .order('placement')
    : { data: [] };

  // Fetch player results
  const { data: playerResults } = matchIds.length > 0
    ? await supabase
        .from('player_match_results')
        .select('match_id, player_open_id, in_game_name, kills, damage, damage_taken, headshots, assists, knockouts, survived')
        .in('match_id', matchIds)
        .order('kills', { ascending: false })
    : { data: [] };

  return (
    <QuickStreamDetailClient
      session={tournament}
      stageId={stage?.id ?? ''}
      matches={matches ?? []}
      results={results ?? []}
      playerResults={playerResults ?? []}
    />
  );
}

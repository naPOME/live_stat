import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const { data: tournament } = await service
    .from('tournaments')
    .select('id, org_id')
    .eq('id', tournamentId)
    .single();

  if (!tournament || tournament.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: rows } = await service
    .from('tournament_teams')
    .select('team_id, seed, teams(*)')
    .eq('tournament_id', tournamentId);

  const teams = (rows ?? []).map((row: any) => ({
    ...(row.teams ?? {}),
    seed: row.seed ?? null,
  }));

  return NextResponse.json({ teams });
}

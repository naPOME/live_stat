import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(
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

  const { data: acceptedApps } = await service
    .from('team_applications')
    .select('team_name, short_name, brand_color, logo_url, players')
    .eq('tournament_id', tournamentId)
    .eq('status', 'accepted');

  if (!acceptedApps || acceptedApps.length === 0) {
    await service.from('tournament_teams').delete().eq('tournament_id', tournamentId);
    return NextResponse.json({ ok: true, linked: 0, removed: 'all' });
  }

  const teamIds: string[] = [];
  for (const app of acceptedApps) {
    const { data: existing } = await service
      .from('teams')
      .select('id')
      .eq('org_id', profile.org_id)
      .ilike('name', app.team_name)
      .limit(1)
      .maybeSingle();

    let teamId = existing?.id ?? null;
    if (!teamId) {
      const { data: created, error } = await service
        .from('teams')
        .insert({
          org_id: profile.org_id,
          name: app.team_name,
          short_name: app.short_name ?? null,
          logo_url: app.logo_url ?? null,
        })
        .select('id')
        .single();
      if (error || !created) continue;
      teamId = created.id;

      if (Array.isArray(app.players) && app.players.length > 0) {
        await service.from('players').insert(
          app.players.map((p: any) => ({
            team_id: teamId,
            display_name: p.display_name,
            player_open_id: p.player_open_id,
          })),
        );
      }
    }

    if (!teamIds.includes(teamId)) teamIds.push(teamId);
  }

  for (const teamId of teamIds) {
    await service.from('tournament_teams').upsert(
      { tournament_id: tournamentId, team_id: teamId },
      { onConflict: 'tournament_id,team_id' },
    );
  }

  const { data: existingLinks } = await service
    .from('tournament_teams')
    .select('team_id')
    .eq('tournament_id', tournamentId);

  const existingIds = (existingLinks ?? []).map((r: any) => r.team_id as string);
  const toRemove = existingIds.filter((id) => !teamIds.includes(id));
  if (toRemove.length > 0) {
    await service
      .from('tournament_teams')
      .delete()
      .eq('tournament_id', tournamentId)
      .in('team_id', toRemove);
  }

  return NextResponse.json({ ok: true, linked: teamIds.length, removed: toRemove.length });
}

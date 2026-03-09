import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tournament_id, team_name, short_name, brand_color, contact_email, players } = body;

  if (!tournament_id || !team_name?.trim() || !Array.isArray(players) || players.length === 0) {
    return NextResponse.json(
      { error: 'Team name and at least one player are required' },
      { status: 400 },
    );
  }

  // Validate each player has both fields
  for (const p of players) {
    if (!p.display_name?.trim() || !p.player_open_id?.trim()) {
      return NextResponse.json(
        { error: 'Each player needs a display name and in-game ID' },
        { status: 400 },
      );
    }
  }

  const supabase = createServiceClient();

  // Verify tournament exists and is active
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('id', tournament_id)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  if (tournament.status !== 'active') {
    return NextResponse.json({ error: 'This tournament is no longer accepting applications' }, { status: 400 });
  }

  // Check for duplicate team name in same tournament
  const { data: existing } = await supabase
    .from('team_applications')
    .select('id')
    .eq('tournament_id', tournament_id)
    .eq('team_name', team_name.trim())
    .neq('status', 'rejected')
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'A team with this name has already applied to this tournament' },
      { status: 409 },
    );
  }

  // Insert application
  const { error } = await supabase.from('team_applications').insert({
    tournament_id,
    team_name: team_name.trim(),
    short_name: short_name?.trim() || null,
    brand_color: brand_color || '#ffffff',
    contact_email: contact_email?.trim() || null,
    players: players.map((p: any) => ({
      display_name: p.display_name.trim(),
      player_open_id: p.player_open_id.trim(),
    })),
  });

  if (error) {
    console.error('[apply] insert error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }

  return NextResponse.json({ success: true, tournament_name: tournament.name });
}

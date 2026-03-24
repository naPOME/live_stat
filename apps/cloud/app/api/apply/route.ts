import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

type ApplicationPlayer = {
  display_name: string;
  player_open_id: string;
};

export async function GET(request: NextRequest) {
  const tournamentId = request.nextUrl.searchParams.get('tournament_id')?.trim();

  if (!tournamentId) {
    return NextResponse.json({ error: 'Tournament ID is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, status, org_id, registration_open, registration_mode, registration_limit')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (tournament.status !== 'active' || tournament.registration_open === false) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, sponsor1_url, sponsor2_url, sponsor3_url')
    .eq('id', tournament.org_id)
    .single();

  // Count accepted teams so far
  const { count: acceptedCount } = await supabase
    .from('team_applications')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('status', 'accepted');

  return NextResponse.json({
    tournament: {
      name: tournament.name,
      status: tournament.status,
      registration_open: tournament.registration_open,
      registration_mode: tournament.registration_mode,
      registration_limit: tournament.registration_limit,
      accepted_teams: acceptedCount ?? 0,
    },
    organization: {
      name: org?.name ?? '',
      logo_url: org?.logo_url ?? null,
      sponsors: [org?.sponsor1_url, org?.sponsor2_url, org?.sponsor3_url].filter(Boolean),
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tournament_id, team_name, short_name, telegram_username, contact_email, logo_url, players } = body as {
    tournament_id?: string;
    team_name?: string;
    short_name?: string | null;
    telegram_username?: string | null;
    contact_email?: string | null;
    logo_url?: string | null;
    players?: ApplicationPlayer[];
  };

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
    .select('id, name, status, registration_open, registration_mode, registration_limit')
    .eq('id', tournament_id)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  if (tournament.status !== 'active') {
    return NextResponse.json({ error: 'This tournament is no longer accepting applications' }, { status: 400 });
  }
  if (tournament.registration_open === false) {
    return NextResponse.json({ error: 'Registration is currently closed' }, { status: 400 });
  }
  if (tournament.registration_mode === 'cap' && tournament.registration_limit) {
    const { count } = await supabase
      .from('team_applications')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament_id)
      .neq('status', 'rejected');
    if ((count ?? 0) >= tournament.registration_limit) {
      await supabase.from('tournaments').update({ registration_open: false }).eq('id', tournament_id);
      return NextResponse.json({ error: 'Registration cap reached' }, { status: 400 });
    }
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
    brand_color: '#ffffff',
    logo_url: logo_url || null,
    contact_email: telegram_username?.trim() || contact_email?.trim() || null,
    players: players.map((p) => ({
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

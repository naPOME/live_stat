import { NextResponse } from 'next/server';
import { loadCloudConfig, saveCloudConfig, clearCloudConfig } from '@/lib/cloudConfig';
import { getRoster, getRosterSource, setRosterFromCloud } from '@/lib/rosterStore';

export const runtime = 'nodejs';

function normalizeCloudUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  return trimmed;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function GET() {
  const cfg = loadCloudConfig();
  const roster = getRoster();
  return NextResponse.json({
    ok: true,
    bound: Boolean(cfg?.cloud_url && (cfg?.device_token || cfg?.org_api_key)),
    cloud_url: cfg?.cloud_url ?? null,
    org: cfg?.org ?? null,
    tournament: cfg?.tournament ?? null,
    match_id: cfg?.match_id ?? null,
    roster_loaded: Boolean(roster),
    roster_source: getRosterSource(),
  });
}

export async function POST(request: Request) {
  let body: any = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const action = body?.action as string;

  if (action === 'clear') {
    clearCloudConfig();
    setRosterFromCloud(null);
    return NextResponse.json({ ok: true });
  }

  if (action === 'bind') {
    const cloudUrl = normalizeCloudUrl(body?.cloud_url || '');
    const orgApiKey = (body?.org_api_key || '').trim();

    if (!cloudUrl || !orgApiKey) {
      return NextResponse.json({ ok: false, error: 'Cloud URL and Org API Key are required' }, { status: 400 });
    }

    const { ok, data, status } = await fetchJson(`${cloudUrl}/api/local/org`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${orgApiKey}` },
    });

    if (!ok) {
      return NextResponse.json({ ok: false, error: data?.error || `Cloud rejected (${status})` }, { status: 400 });
    }

    saveCloudConfig({
      cloud_url: cloudUrl,
      org_api_key: orgApiKey,
      org: { id: data.org.id, name: data.org.name },
      tournament: undefined,
      match_id: null,
    });

    return NextResponse.json({
      ok: true,
      org: data.org,
      cloud_url: cloudUrl,
    });
  }

  if (action === 'device-code') {
    const cloudUrl = normalizeCloudUrl(body?.cloud_url || '');
    if (!cloudUrl) {
      return NextResponse.json({ ok: false, error: 'Cloud URL is required' }, { status: 400 });
    }

    const { ok, data, status } = await fetchJson(`${cloudUrl}/api/local/device-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_name: body?.device_name || null }),
    });

    if (!ok) {
      return NextResponse.json({ ok: false, error: data?.error || `Cloud rejected (${status})` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, code: data.code, expires_at: data.expires_at });
  }

  if (action === 'device-status') {
    const cloudUrl = normalizeCloudUrl(body?.cloud_url || '');
    const code = (body?.code || '').trim();
    if (!cloudUrl || !code) {
      return NextResponse.json({ ok: false, error: 'Cloud URL and code are required' }, { status: 400 });
    }

    const { ok, data, status } = await fetchJson(`${cloudUrl}/api/local/device-status?code=${encodeURIComponent(code)}`);
    if (!ok) {
      return NextResponse.json({ ok: false, error: data?.error || `Cloud rejected (${status})` }, { status: 400 });
    }

    if (data?.device_token && data?.org) {
      saveCloudConfig({
        cloud_url: cloudUrl,
        device_token: data.device_token,
        org: { id: data.org.id, name: data.org.name },
        tournament: undefined,
        match_id: null,
      });
    }

    return NextResponse.json({ ok: true, approved: data?.approved ?? false, org: data?.org ?? null });
  }

  if (action === 'select-tournament') {
    const cfg = loadCloudConfig();
    if (!cfg?.cloud_url || (!cfg?.org_api_key && !cfg?.device_token)) {
      return NextResponse.json({ ok: false, error: 'Organization not linked yet' }, { status: 400 });
    }

    const tournamentId = (body?.tournament_id || '').trim();
    const matchId = (body?.match_id || '').trim();
    if (!tournamentId) {
      return NextResponse.json({ ok: false, error: 'Tournament ID is required' }, { status: 400 });
    }

    const { ok, data, status } = await fetchJson(`${cfg.cloud_url}/api/local/roster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.device_token ?? cfg.org_api_key}`,
      },
      body: JSON.stringify({ tournament_id: tournamentId, match_id: matchId || undefined }),
    });

    if (!ok) {
      return NextResponse.json({ ok: false, error: data?.error || `Cloud rejected (${status})` }, { status: 400 });
    }

    setRosterFromCloud(data.roster);
    saveCloudConfig({
      ...cfg,
      tournament: { id: data.tournament.id, name: data.tournament.name },
      match_id: data.match?.id ?? null,
    });

    return NextResponse.json({ ok: true, tournament: data.tournament, match: data.match ?? null });
  }

  return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
}

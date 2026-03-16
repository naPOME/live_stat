import { NextResponse } from 'next/server';
import { loadCloudConfig } from '@/lib/cloudConfig';

export const runtime = 'nodejs';

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function GET(request: Request) {
  const cfg = loadCloudConfig();
  if (!cfg?.cloud_url) {
    return NextResponse.json({ ok: false, error: 'Cloud URL not set' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('id')?.trim() || cfg.tournament?.id;
  if (!tournamentId) {
    return NextResponse.json({ ok: false, error: 'Tournament not selected' }, { status: 400 });
  }

  const { ok, data, status } = await fetchJson(`${cfg.cloud_url}/api/public/tournament/${tournamentId}`);
  if (!ok) {
    return NextResponse.json({ ok: false, error: data?.error || `Cloud rejected (${status})` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}

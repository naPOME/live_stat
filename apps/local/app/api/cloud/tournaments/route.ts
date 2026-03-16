import { NextResponse } from 'next/server';
import { loadCloudConfig } from '@/lib/cloudConfig';

export const runtime = 'nodejs';

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function GET() {
  const cfg = loadCloudConfig();
  if (!cfg?.cloud_url || (!cfg?.org_api_key && !cfg?.device_token)) {
    return NextResponse.json({ ok: false, error: 'Organization not linked yet' }, { status: 400 });
  }

  const { ok, data, status } = await fetchJson(`${cfg.cloud_url}/api/local/tournaments`, {
    headers: { Authorization: `Bearer ${cfg.device_token ?? cfg.org_api_key}` },
  });

  if (!ok) {
    return NextResponse.json({ ok: false, error: data?.error || `Cloud rejected (${status})` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tournaments: data.tournaments ?? [] });
}

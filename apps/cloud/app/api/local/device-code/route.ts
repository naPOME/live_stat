import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json().catch(() => ({}));
  const deviceName = typeof body?.device_name === 'string' ? body.device_name.trim() : null;

  let code = '';
  let attempts = 0;
  while (!code && attempts < 5) {
    const candidate = generateCode();
    const { data: existing } = await supabase
      .from('device_pairings')
      .select('code')
      .eq('code', candidate)
      .single();
    if (!existing) code = candidate;
    attempts += 1;
  }

  if (!code) {
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase.from('device_pairings').insert({
    code,
    device_name: deviceName,
    expires_at: expiresAt,
  });

  return NextResponse.json({ ok: true, code, expires_at: expiresAt });
}

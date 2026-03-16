import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No org' }, { status: 400 });
  }

  let body: { code?: string; device_name?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const code = body.code?.trim().toUpperCase();
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: pairing } = await service
    .from('device_pairings')
    .select('code, expires_at, approved_at')
    .eq('code', code)
    .single();

  if (!pairing) return NextResponse.json({ error: 'Code not found' }, { status: 404 });
  if (new Date(pairing.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Code expired' }, { status: 410 });
  }

  if (pairing.approved_at) {
    return NextResponse.json({ ok: true, already_approved: true });
  }

  const { data: device } = await service
    .from('org_devices')
    .insert({
      org_id: profile.org_id,
      name: body.device_name?.trim() || null,
    })
    .select('device_token')
    .single();

  if (!device?.device_token) {
    return NextResponse.json({ error: 'Failed to create device token' }, { status: 500 });
  }

  await service
    .from('device_pairings')
    .update({
      org_id: profile.org_id,
      device_token: device.device_token,
      approved_at: new Date().toISOString(),
    })
    .eq('code', code);

  return NextResponse.json({ ok: true });
}

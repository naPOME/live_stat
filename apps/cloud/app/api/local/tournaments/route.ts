import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/local/tournaments
 *
 * Auth: Bearer {org.api_key}
 * Returns: { tournaments: [{ id, name, status, created_at }] }
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header (Bearer api_key)' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let orgId: string | null = null;

  const { data: orgByKey } = await supabase
    .from('organizations')
    .select('id')
    .eq('api_key', token)
    .single();
  if (orgByKey) orgId = orgByKey.id;

  if (!orgId) {
    const { data: device } = await supabase
      .from('org_devices')
      .select('org_id')
      .eq('device_token', token)
      .eq('revoked', false)
      .single();
    if (device?.org_id) {
      orgId = device.org_id;
      await supabase.from('org_devices').update({ last_seen: new Date().toISOString() }).eq('device_token', token);
    }
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ ok: true, tournaments: tournaments ?? [] });
}

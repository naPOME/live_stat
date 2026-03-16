import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/local/org
 *
 * Auth: Bearer {org.api_key}
 * Returns: { org: { id, name } }
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header (Bearer api_key)' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let org: { id: string; name: string } | null = null;

  const { data: orgByKey } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('api_key', token)
    .single();
  if (orgByKey) org = orgByKey;

  if (!org) {
    const { data: device } = await supabase
      .from('org_devices')
      .select('org_id, org:organizations(id, name)')
      .eq('device_token', token)
      .eq('revoked', false)
      .single();
    if (device?.org) {
      org = device.org as any;
      await supabase.from('org_devices').update({ last_seen: new Date().toISOString() }).eq('device_token', token);
    }
  }

  if (!org) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  return NextResponse.json({ ok: true, org });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: pairing } = await supabase
    .from('device_pairings')
    .select('code, org_id, device_token, expires_at, approved_at')
    .eq('code', code)
    .single();

  if (!pairing) {
    return NextResponse.json({ error: 'Code not found' }, { status: 404 });
  }

  if (new Date(pairing.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Code expired', approved: false }, { status: 410 });
  }

  if (!pairing.org_id || !pairing.device_token || !pairing.approved_at) {
    return NextResponse.json({ ok: true, approved: false });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', pairing.org_id)
    .single();

  return NextResponse.json({
    ok: true,
    approved: true,
    org,
    device_token: pairing.device_token,
  });
}

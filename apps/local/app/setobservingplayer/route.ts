import { NextRequest, NextResponse } from 'next/server';
import { handleObservingPlayer } from '@/lib/gameStore';
import { recordTelemetry } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    recordTelemetry();
    const body = await req.json();
    const uid = String(body['0'] ?? '');
    if (uid) handleObservingPlayer(uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/setobservingplayer]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

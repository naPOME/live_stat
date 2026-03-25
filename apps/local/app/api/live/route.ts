import { NextResponse } from 'next/server';
import { buildLegacyLiveState } from '@/lib/liveState';
import { ok, err } from '@shared/api';

export const runtime = 'nodejs';

/**
 * GET /api/live - Legacy overlay endpoint.
 * Keeps the old response shape while reading from the unified live-state builder.
 */
export async function GET() {
  try {
    return NextResponse.json(ok(buildLegacyLiveState()));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Live API]', e);
    return NextResponse.json(err(message), { status: 500 });
  }
}

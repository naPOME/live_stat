import { NextResponse } from 'next/server';
import { buildLiveState } from '@/lib/liveState';
import { ok, err } from '@shared/api';
import type { LiveState } from '@shared/types';

export const runtime = 'nodejs';

/**
 * GET /api/state - Unified live state endpoint.
 */
export async function GET() {
  try {
    const data: LiveState = buildLiveState();
    return NextResponse.json(ok(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[/api/state]', e);
    return NextResponse.json(err(message), { status: 500 });
  }
}

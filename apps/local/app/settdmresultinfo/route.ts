import { NextResponse } from 'next/server';
import { recordTelemetry } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

export async function POST() {
  recordTelemetry();
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { handleKillInfo } from '@/lib/gameStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    handleKillInfo(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/setkillinfo]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

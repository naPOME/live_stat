import { NextRequest, NextResponse } from 'next/server';
import { handleTotalMessage } from '@/lib/gameStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    handleTotalMessage(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/totalmessage]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

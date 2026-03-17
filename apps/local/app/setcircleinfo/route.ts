import { NextRequest, NextResponse } from 'next/server';
import { handleCircleInfo } from '@/lib/gameStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    handleCircleInfo(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/setcircleinfo]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

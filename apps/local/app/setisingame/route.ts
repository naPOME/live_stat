import { NextRequest, NextResponse } from 'next/server';
import { handleMatchPhase } from '@/lib/gameStore';
import { pushMatchResult } from '@/lib/cloudSync';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const text = (await req.text()).trim().replace(/^"|"$/g, '');
    if (text === 'InGame' || text === 'Finished') {
      handleMatchPhase(text as 'InGame' | 'Finished');
      if (text === 'Finished') {
        pushMatchResult().catch(console.error);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/setisingame]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

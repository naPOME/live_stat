import { NextRequest, NextResponse } from 'next/server';
import { handleMatchPhase } from '@/lib/gameStore';
import { pushMatchResult } from '@/lib/cloudSync';
import { recordTelemetry, goLive, goFinished, syncPending, syncDone } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    recordTelemetry();
    const text = (await req.text()).trim().replace(/^"|"$/g, '');

    if (text === 'InGame') {
      handleMatchPhase('InGame');
      goLive();
    }

    if (text === 'Finished') {
      handleMatchPhase('Finished');
      goFinished();

      // Delay sync by 6s — the game sends final totalmessage with complete stats
      // (rank, survivalTime, damage, etc.) 1-5s AFTER the Finished event.
      setTimeout(async () => {
        syncPending();
        try {
          const result = await pushMatchResult();
          syncDone(result.ok, result.error);
        } catch (e) {
          syncDone(false, e instanceof Error ? e.message : 'Unknown error');
        }
      }, 6000);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/setisingame]', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { getParserStats, startParser, stopParser, type ParserOptions, type ParsedLogEvent } from '@/lib/parser';
import {
  handleCircleInfo,
  handleKillInfo,
  handleMatchPhase,
  handleObservingPlayer,
  handleTotalMessage,
} from '@/lib/gameStore';
import { goFinished, goLive, recordTelemetry } from '@/lib/lifecycleStore';

export const runtime = 'nodejs';

const activeWatchers = new Map<string, ParserOptions>();

function dispatchParsedEvent(event: ParsedLogEvent) {
  recordTelemetry();
  switch (event.type) {
    case 'totalmessage':
      handleTotalMessage(event.payload);
      break;
    case 'killinfo':
      handleKillInfo(event.payload);
      break;
    case 'circleinfo':
      handleCircleInfo(event.payload);
      break;
    case 'observing':
      handleObservingPlayer(event.payload.uid);
      break;
    case 'phase':
      handleMatchPhase(event.payload.phase);
      if (event.payload.phase === 'InGame') goLive();
      if (event.payload.phase === 'Finished') goFinished();
      break;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filePath, action, pollIntervalMs } = body as {
      filePath?: string;
      action?: 'start' | 'stop';
      pollIntervalMs?: number;
    };

    if (action === 'stop') {
      stopParser();
      activeWatchers.clear();
      return NextResponse.json({ ok: true, status: 'stopped' });
    }

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ ok: false, error: 'filePath is required' }, { status: 400 });
    }

    const key = filePath.trim();
    if (activeWatchers.has(key)) {
      return NextResponse.json({ ok: true, status: 'already-watching', filePath: key });
    }

    startParser({
      filePath: key,
      pollIntervalMs: typeof pollIntervalMs === 'number' && pollIntervalMs > 0 ? pollIntervalMs : 500,
      onEvent: dispatchParsedEvent,
      onError: (err) => {
        console.error('[Watcher] parser error', err.message);
      },
    });

    activeWatchers.set(key, { filePath: key, pollIntervalMs });
    return NextResponse.json({ ok: true, status: 'started', filePath: key });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  const stats = getParserStats();
  return NextResponse.json({
    ok: true,
    watcher: {
      running: stats.running,
      activeCount: activeWatchers.size,
      active: Array.from(activeWatchers.keys()),
    },
    parser: stats,
    usage: {
      method: 'POST',
      path: '/api/watcher',
      bodyExamples: [
        { action: 'start', filePath: '/path/to/pcob.log', pollIntervalMs: 500 },
        { action: 'stop' },
      ],
    },
  });
}

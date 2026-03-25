'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Single SSE connection to /api/stream that carries all channels.
 * Replaces separate SSE connections for widgets, theme, wallpaper, lbpage, state, killfeed.
 */

export interface UnifiedState {
  widgets: Record<string, boolean>;
  themeIdx: number;
  wallpaper: string | null;
  lbPage: number;
}

type KillHandler = (data: unknown) => void;

export function useUnifiedStream(onKill?: KillHandler): UnifiedState {
  const [state, setState] = useState<UnifiedState>({
    widgets: {},
    themeIdx: 0,
    wallpaper: null,
    lbPage: 1,
  });
  const killRef = useRef(onKill);
  killRef.current = onKill;

  useEffect(() => {
    const es = new EventSource('/api/stream?filter=widgets,theme,wallpaper,lbpage,killfeed');

    es.addEventListener('widgets', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        setState(prev => ({ ...prev, widgets: d }));
      } catch {}
    });

    es.addEventListener('theme', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof d.activeThemeIdx === 'number') {
          setState(prev => ({ ...prev, themeIdx: d.activeThemeIdx }));
        }
      } catch {}
    });

    es.addEventListener('wallpaper', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        setState(prev => ({ ...prev, wallpaper: d.active ?? null }));
      } catch {}
    });

    es.addEventListener('lbpage', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof d.page === 'number') {
          setState(prev => ({ ...prev, lbPage: d.page }));
        }
      } catch {}
    });

    es.addEventListener('kill', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        killRef.current?.(d);
      } catch {}
    });

    return () => es.close();
  }, []);

  return state;
}

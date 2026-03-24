'use client';

import { useEffect, useState } from 'react';

/**
 * Connects any widget overlay page seamlessly to the Controller's Global Theme Engine.
 * Automatically synchronizes via Server-Sent Events (SSE).
 */
export function useGlobalTheme() {
  const [activeThemeIdx, setActiveThemeIdx] = useState(0);

  useEffect(() => {
    // Initial fetch to get the current state instantly
    fetch('/api/theme')
      .then(r => r.json())
      .then(d => {
        if (typeof d.activeThemeIdx === 'number') setActiveThemeIdx(d.activeThemeIdx);
      })
      .catch(() => {});

    // Listen continuously for Stream Deck button presses
    const es = new EventSource('/api/theme?stream=1');
    es.onmessage = e => { 
      try { 
        const d = JSON.parse(e.data);
        if (typeof d.activeThemeIdx === 'number') setActiveThemeIdx(d.activeThemeIdx); 
      } catch {} 
    };

    return () => es.close();
  }, []);

  return activeThemeIdx;
}

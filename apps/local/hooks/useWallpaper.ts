'use client';

import { useEffect, useState } from 'react';

/** Subscribes to the active wallpaper URL via SSE. */
export function useWallpaper(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/wallpaper')
      .then(r => r.json())
      .then(d => setUrl(d.active ?? null))
      .catch(() => {});

    const es = new EventSource('/api/wallpaper?stream=1');
    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data);
        setUrl(d.active ?? null);
      } catch {}
    };
    return () => es.close();
  }, []);

  return url;
}

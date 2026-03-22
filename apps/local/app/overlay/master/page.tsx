'use client';

import { useEffect, useState } from 'react';

// All widget iframes — each overlay page is loaded and shown/hidden via CSS
const WIDGET_IFRAMES: { key: string; src: string }[] = [
  { key: 'leaderboard', src: '/overlay/leaderboard' },
  { key: 'killfeed', src: '/overlay/killfeed' },
  { key: 'playercard', src: '/overlay/playercard' },
  { key: 'elimination', src: '/overlay/elimination' },
  { key: 'wwcd', src: '/overlay/wwcd' },
  { key: 'fraggers', src: '/overlay/fraggers' },
  { key: 'results', src: '/overlay/results' },
  { key: 'mvp', src: '/overlay/mvp' },
  { key: 'pointtable', src: '/overlay/pointtable' },
  { key: 'teamlist', src: '/overlay/teamlist' },
  { key: 'matchinfo', src: '/overlay/matchinfo' },
  { key: 'schedule', src: '/overlay/schedule' },
  { key: 'sponsor_overlay', src: '/overlay/sponsor' },
];

export default function MasterOverlay() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Connect to widget visibility SSE
    const es = new EventSource('/api/widgets?stream=1');
    es.onmessage = (e) => {
      try { setVisibility(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      {WIDGET_IFRAMES.map(({ key, src }) => {
        const active = visibility[key] ?? false;
        return (
          <iframe
            key={key}
            src={src}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: 'none',
              opacity: active ? 1 : 0,
              transition: 'opacity 0.3s ease',
              // Keep iframe loaded but invisible when off
              visibility: active ? 'visible' : 'hidden',
            }}
            title={key}
          />
        );
      })}

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}

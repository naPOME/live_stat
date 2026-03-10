'use client';

import { useEffect, useState } from 'react';

export default function PointTableOverlay() {
  const [theme, setTheme] = useState({ accent_color: '#00ffc3' });

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(setTheme).catch(() => {});
  }, []);

  const accent = theme.accent_color || '#00ffc3';

  const points = [
    { label: '1ST', value: 10 },
    { label: '2ND', value: 6 },
    { label: '3RD', value: 5 },
    { label: '4TH', value: 4 },
    { label: '5TH', value: 3 },
    { label: '6TH', value: 2 },
    { label: '7TH-8TH', value: 1 },
    { label: 'REST', value: 0 },
    { label: 'ELIM POINT', value: 1 },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(10,10,26,0.95)', border: `2px solid ${accent}33` }}
      >
        {/* Title */}
        <div className="px-8 py-4 text-center" style={{ background: 'rgba(10,10,26,0.98)' }}>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">POINT TABLE</h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-[2px] p-4">
          {/* Top Row: 1st-4th */}
          {points.slice(0, 4).map((p, i) => (
            <div
              key={i}
              className="px-6 py-4 text-center rounded-lg"
              style={{ background: accent, color: '#000' }}
            >
              <div className="text-3xl font-black">{p.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1">{p.label}</div>
            </div>
          ))}

          {/* Bottom Row: 5th-8th, REST, ELIM */}
          {points.slice(4).map((p, i) => (
            <div
              key={i + 4}
              className="px-6 py-4 text-center rounded-lg"
              style={{
                background: p.label === 'ELIM POINT' ? accent : `${accent}33`,
                color: p.label === 'ELIM POINT' ? '#000' : accent,
              }}
            >
              <div className="text-3xl font-black">{p.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1"
                style={{ color: p.label === 'ELIM POINT' ? '#000' : '#8b8da6' }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}

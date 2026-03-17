'use client';

import { useEffect, useState } from 'react';

interface PointSystem {
  kill_points: number;
  placement_points: Record<string, number>;
}

export default function PointTableOverlay() {
  const [theme, setTheme] = useState({ accent_color: '#00ffc3' });
  const [pointSystem, setPointSystem] = useState<PointSystem | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/theme')
      .then(r => r.json())
      .then(raw => {
        const data = raw?.data ?? raw;
        setTheme(data);
        if (data.point_system) setPointSystem(data.point_system);
        setTimeout(() => setShow(true), 200);
      })
      .catch(() => {
        setTimeout(() => setShow(true), 200);
      });
  }, []);

  const accent = theme.accent_color || '#00ffc3';

  // Build placement rows from point_system
  const placements: { label: string; value: number }[] = [];

  if (pointSystem) {
    // Sort placements numerically
    const entries = Object.entries(pointSystem.placement_points)
      .map(([k, v]) => ({ rank: parseInt(k, 10), pts: v }))
      .sort((a, b) => a.rank - b.rank);

    // Group consecutive ranks with same points
    let i = 0;
    while (i < entries.length) {
      const start = entries[i];
      let end = start;
      while (i + 1 < entries.length && entries[i + 1].pts === start.pts) {
        end = entries[++i];
      }
      const label =
        start.rank === end.rank
          ? ordinal(start.rank)
          : `${ordinal(start.rank)}-${ordinal(end.rank)}`;
      placements.push({ label: label.toUpperCase(), value: start.pts });
      i++;
    }

    // Add kill points row
    placements.push({ label: 'PER ELIM', value: pointSystem.kill_points });
  } else {
    // Default fallback
    const defaults = [
      { label: '1ST', value: 10 },
      { label: '2ND', value: 6 },
      { label: '3RD', value: 5 },
      { label: '4TH', value: 4 },
      { label: '5TH', value: 3 },
      { label: '6TH', value: 2 },
      { label: '7TH-8TH', value: 1 },
      { label: 'REST', value: 0 },
      { label: 'PER ELIM', value: 1 },
    ];
    placements.push(...defaults);
  }

  // Split into rows of 4
  const rows: typeof placements[] = [];
  for (let i = 0; i < placements.length; i += 4) {
    rows.push(placements.slice(i, i + 4));
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-all duration-700 ${
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(10,10,26,0.95)', border: `2px solid ${accent}33` }}
      >
        {/* Title */}
        <div className="px-8 py-4 text-center" style={{ background: accent, color: '#000' }}>
          <h2 className="text-2xl font-black uppercase tracking-wider m-0">POINT SYSTEM</h2>
        </div>

        {/* Grid */}
        <div className="p-4">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-[2px]" style={{ marginBottom: ri < rows.length - 1 ? 2 : 0 }}>
              {row.map((p, ci) => {
                const isKill = p.label === 'PER ELIM';
                const isTopRow = ri === 0;
                return (
                  <div
                    key={ci}
                    className="flex-1 px-6 py-4 text-center rounded-lg min-w-[120px]"
                    style={{
                      background: isKill ? accent : isTopRow ? `${accent}cc` : `${accent}33`,
                      color: isKill || isTopRow ? '#000' : accent,
                    }}
                  >
                    <div className="text-3xl font-black">{p.value}</div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider mt-1"
                      style={{ color: isKill || isTopRow ? '#000' : '#8b8da6' }}
                    >
                      {p.label}
                    </div>
                  </div>
                );
              })}
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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

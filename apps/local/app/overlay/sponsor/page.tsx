'use client';

import { useEffect, useState } from 'react';

export default function SponsorOverlay() {
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [accent, setAccent] = useState('#9b8afb');
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch('/api/theme')
      .then(r => r.json())
      .then(r => {
        const d = r?.data ?? r;
        if (d.accent_color) setAccent(d.accent_color);
        if (Array.isArray(d.sponsors)) setSponsors(d.sponsors.filter(Boolean));
      })
      .catch(() => {});
  }, []);

  // Rotate through sponsors every 6 seconds with fade transition
  useEffect(() => {
    if (sponsors.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % sponsors.length);
        setVisible(true);
      }, 500);
    }, 6000);
    return () => clearInterval(id);
  }, [sponsors.length]);

  return (
    <>
      <style jsx global>{`body { background: transparent !important; margin: 0; overflow: hidden; }`}</style>

      {sponsors.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 52,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(5, 8, 15, 0.88)',
          border: `1px solid ${accent}28`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 12,
          padding: '8px 20px 8px 16px',
          boxShadow: `0 0 24px ${accent}18, 0 4px 24px rgba(0,0,0,0.5)`,
        }}>
          {/* Left accent bar */}
          <div style={{ width: 2, height: 28, borderRadius: 2, background: accent, flexShrink: 0 }} />

          {/* Label */}
          <span style={{
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'Inter, sans-serif',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            Presented by
          </span>

          {/* Sponsor logo — fades in/out on rotation */}
          <div style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.45s ease',
            display: 'flex',
            alignItems: 'center',
            minWidth: 80,
            justifyContent: 'center',
          }}>
            <img
              src={sponsors[current]}
              alt={`Sponsor ${current + 1}`}
              style={{
                height: 30,
                width: 'auto',
                maxWidth: 120,
                objectFit: 'contain',
                filter: 'brightness(1.1)',
              }}
            />
          </div>

          {/* Dot indicators (only if multiple sponsors) */}
          {sponsors.length > 1 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
              {sponsors.map((_, i) => (
                <div key={i} style={{
                  width: i === current ? 14 : 4,
                  height: 4,
                  borderRadius: 2,
                  background: i === current ? accent : 'rgba(255,255,255,0.18)',
                  transition: 'all 0.35s ease',
                  flexShrink: 0,
                }} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';

export default function MatchInfoOverlay() {
  const [theme, setTheme] = useState({ accent_color: '#60a5fa', bg_color: '#0a0a1a' });
  const [show, setShow] = useState(false);

  // Read query params for match info
  const [matchInfo, setMatchInfo] = useState({
    stage: 'STAGE 1',
    game: 'GAME 1',
    map: 'ERANGEL',
  });

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(r => setTheme(r?.data ?? r)).catch(() => {});

    // Read query params: ?stage=Groups&game=Game 1&map=Erangel
    const params = new URLSearchParams(window.location.search);
    setMatchInfo({
      stage: (params.get('stage') || 'STAGE 1').toUpperCase(),
      game: (params.get('game') || 'GAME 1').toUpperCase(),
      map: (params.get('map') || 'ERANGEL').toUpperCase(),
    });

    setTimeout(() => setShow(true), 300);
  }, []);

  const accent = theme.accent_color || '#60a5fa';

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div
        className={`flex flex-col items-center transition-all duration-700 ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Tournament Banner Placeholder */}
        <div
          className="w-[600px] h-[200px] rounded-2xl flex items-center justify-center mb-0 relative overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent}66, rgba(10,10,26,0.88)), url('https://pubg.wiki.gg/images/thumb/Erangel_Remastered_Mylta_Nuclear_power_plant.png/1200px-Erangel_Remastered_Mylta_Nuclear_power_plant.png?e0f334')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `2px solid ${accent}33`,
          }}
        >
          <div className="text-center">
            <div className="text-sm font-bold uppercase tracking-[0.3em] mb-2" style={{ color: accent }}>
              TOURNAMENT BANNER
            </div>

            {/* Game badge */}
            <div
              className="inline-block px-6 py-2 rounded-lg text-sm font-black uppercase tracking-wider mb-3"
              style={{ background: accent, color: '#000' }}
            >
              {matchInfo.game}
            </div>

            {/* Map name */}
            <div
              className="text-4xl font-black uppercase tracking-wider"
              style={{
                color: accent,
                textShadow: `0 0 30px ${accent}33`,
              }}
            >
              {matchInfo.map}
            </div>
          </div>

          {/* Stage label - top left */}
          <div
            className="absolute bottom-0 left-0 px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ background: accent, color: '#000' }}
          >
            {matchInfo.stage}
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}

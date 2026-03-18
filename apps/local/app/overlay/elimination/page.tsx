'use client';

import { useEffect, useState, useRef } from 'react';

interface Team {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  kills: number;
  alive: boolean;
  liveMemberNum: number;
  totalPoints: number;
}

interface EliminationData {
  teamName: string;
  displayName?: string;
  shortName?: string;
  brandColor?: string;
  logoPath?: string;
  rank: number;
  kills: number;
  totalPoints: number;
}

export default function EliminationOverlay() {
  const [notification, setNotification] = useState<EliminationData | null>(null);
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState({ accent_color: '#60a5fa' });
  const prevAlive = useRef<Record<string, boolean>>({});
  const queue = useRef<EliminationData[]>([]);
  const showing = useRef(false);

  useEffect(() => {
    fetch('/api/theme').then(r => r.json()).then(r => setTheme(r?.data ?? r)).catch(() => {});
  }, []);

  function showNext() {
    if (queue.current.length === 0) {
      showing.current = false;
      return;
    }
    showing.current = true;
    const item = queue.current.shift()!;
    setNotification(item);
    setVisible(true);
    // Show for 4s, then fade out 0.5s, then next
    setTimeout(() => setVisible(false), 4000);
    setTimeout(() => {
      setNotification(null);
      showNext();
    }, 4500);
  }

  useEffect(() => {
    const poll = () => fetch('/api/live').then(r => r.json()).then((raw) => {
      const d = (raw?.data ?? raw) as { teams: Team[] };
      const teams = d.teams;
      for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        const key = t.displayName || t.teamName;
        const wasAlive = prevAlive.current[key];
        const isAlive = t.liveMemberNum > 0;

        // Detect: was alive, now eliminated
        if (wasAlive === true && !isAlive) {
          queue.current.push({
            teamName: t.teamName,
            displayName: t.displayName,
            shortName: t.shortName,
            brandColor: t.brandColor,
            logoPath: t.logoPath,
            rank: i + 1,
            kills: t.kills,
            totalPoints: t.totalPoints,
          });
          if (!showing.current) showNext();
        }
        prevAlive.current[key] = isAlive;
      }
    }).catch(() => {});

    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, []);

  if (!notification) return <style jsx global>{`body { background: transparent !important; margin: 0; }`}</style>;

  const accent = theme.accent_color || '#60a5fa';
  const name = notification.displayName || notification.teamName;
  const short = notification.shortName || name.substring(0, 4).toUpperCase();
  const color = notification.brandColor || '#ffffff';

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div
        className={`flex items-center gap-0 rounded-xl overflow-hidden shadow-2xl transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
        }`}
        style={{ border: `2px solid ${color}55` }}
      >
        {/* Logo Section */}
        <div
          className="w-[80px] h-[80px] flex items-center justify-center flex-shrink-0"
          style={{ background: color + '22' }}
        >
          {notification.logoPath ? (
            <img src={notification.logoPath} alt="" className="w-14 h-14 object-contain" />
          ) : (
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-black"
              style={{ background: color + '33', color }}
            >
              {short.substring(0, 2)}
            </div>
          )}
        </div>

        {/* Info */}
        <div
          className="px-5 py-3 flex flex-col justify-center"
          style={{ background: 'rgba(10,10,26,0.95)' }}
        >
          {/* Rank Badge + "TEAM ELIMINATED" */}
          <div className="flex items-center gap-3 mb-1">
            <span
              className="text-sm font-black px-2 py-0.5 rounded"
              style={{ background: accent, color: '#000' }}
            >
              #{notification.rank}
            </span>
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#ef6b6b' }}>
              TEAM ELIMINATED
            </span>
          </div>
          {/* Team Name */}
          <div className="text-white text-lg font-bold">{name}</div>
        </div>

        {/* Stats */}
        <div
          className="px-5 py-3 flex items-center gap-5"
          style={{ background: 'rgba(10,10,26,0.95)' }}
        >
          <div className="text-center">
            <div className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Elims</div>
            <div className="text-white text-lg font-black">{notification.kills}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[#8b8da6] uppercase tracking-wider font-semibold">Points</div>
            <div className="text-lg font-black" style={{ color: accent }}>{notification.totalPoints}</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}

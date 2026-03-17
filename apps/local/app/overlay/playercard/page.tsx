'use client';

import { useEffect, useState } from 'react';

interface PlayerCardData {
  player?: {
    playerName: string;
    displayName?: string;
    health: number;
    healthMax: number;
    killNum: number;
    liveState: number;
  };
  team?: {
    inGameName: string;
    displayName?: string;
    shortName?: string;
    brandColor?: string;
    rank: number;
    killNum: number;
    liveMemberNum: number;
  };
}

export default function PlayerCardPage() {
  const [card, setCard] = useState<PlayerCardData | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/playercard');

    es.onmessage = (e) => {
      const raw = JSON.parse(e.data);
      const data = (raw?.data ?? raw) as PlayerCardData;
      if (!data.player) return;

      setFlash(true);
      setTimeout(() => setFlash(false), 300);
      setCard(data);
    };

    return () => es.close();
  }, []);

  if (!card?.player) return null;

  const { player, team } = card;
  const color = team?.brandColor ?? '#6d5efc';
  const healthPct = Math.max(0, Math.min(100, (player.health / (player.healthMax || 100)) * 100));
  const displayName = player.displayName ?? player.playerName;
  const teamName = team?.displayName ?? team?.inGameName ?? '';

  return (
    <div
      className="fixed bottom-6 left-6 pointer-events-none"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div
        style={{
          background: 'rgba(10,10,26,0.92)',
          border: `1px solid ${color}44`,
          borderRadius: '12px',
          padding: '14px 18px',
          minWidth: '220px',
          boxShadow: `0 0 20px ${color}22`,
          transform: flash ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.15s ease',
        }}
      >
        {/* Team badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 4,
              height: 32,
              borderRadius: 2,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
          <div>
            <div style={{ color: '#8b8da6', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {team?.shortName ?? teamName}
            </div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>
              {displayName}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: '#8b8da6', fontSize: 10 }}>KILLS</div>
            <div style={{ color: color, fontSize: 20, fontWeight: 800 }}>{player.killNum}</div>
          </div>
        </div>

        {/* Health bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: '#8b8da6', fontSize: 10 }}>HP</span>
            <span style={{ color: '#fff', fontSize: 10 }}>{player.health}/{player.healthMax}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${healthPct}%`,
                background: healthPct > 50 ? '#00ffc3' : healthPct > 25 ? '#ffb300' : '#ff4e4e',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Team rank */}
        {team && (
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <div>
              <div style={{ color: '#8b8da6', fontSize: 10 }}>RANK</div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>#{team.rank}</div>
            </div>
            <div>
              <div style={{ color: '#8b8da6', fontSize: 10 }}>ALIVE</div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{team.liveMemberNum}/4</div>
            </div>
            <div>
              <div style={{ color: '#8b8da6', fontSize: 10 }}>TEAM ELIMS</div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{team.killNum}</div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        body { background: transparent !important; margin: 0; }
      `}</style>
    </div>
  );
}

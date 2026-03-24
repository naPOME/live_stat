'use client';
import React, { useState } from 'react';
import { TopPlayersWidget, PALETTES, type Sponsor } from '@/components/TopPlayersWidget';

const mockPlayers = [
  { name: "GhostKill", eliminations: 8, damage: 1842, survivalTime: "26:30", assists: 3, imageUrl: "/player-sample.png" },
  { name: "ShadowX", eliminations: 6, damage: 1540, survivalTime: "24:12", assists: 5, imageUrl: "/player-sample.png" },
  { name: "Viper99", eliminations: 5, damage: 1290, survivalTime: "22:45", assists: 2, imageUrl: "/player-sample.png" },
  { name: "Stealth", eliminations: 4, damage: 1100, survivalTime: "21:00", assists: 4, imageUrl: "/player-sample.png" },
  { name: "Reaper", eliminations: 3, damage: 870, survivalTime: "19:10", assists: 1, imageUrl: "/player-sample.png" },
];

const mockSponsors: Sponsor[] = [
  { name: "", logoUrl: "https://brandlogos.net/wp-content/uploads/2025/07/safaricom-logo_brandlogos.net_kykbd-512x113.png", url: "https://infinixmobility.com" },
  { name: "", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Logo_of_Infinix.png", url: "https://safaricom.co.ke" },
  { name: "", logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/HyperX_Logo.svg/960px-HyperX_Logo.svg.png", url: "https://hyperx.com" },
];

export default function TopPlayersPage() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div style={{ minHeight: '100vh', background: '#e8e8e8', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Palette Picker Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffff', borderBottom: '1px solid #e0e0e0',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8 }}>
          Palette:
        </span>
        {PALETTES.map((pal, i) => (
          <button
            key={pal.name}
            onClick={() => setActiveIdx(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              border: activeIdx === i ? `2px solid ${pal.accent}` : '2px solid transparent',
              background: activeIdx === i ? `${pal.accent}10` : '#f5f5f5',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: pal.accent, flexShrink: 0 }}></div>
            <span style={{ fontSize: 13, fontWeight: 600, color: activeIdx === i ? pal.accent : '#555' }}>
              {pal.name}
            </span>
          </button>
        ))}
      </div>

      {/* Widget Preview */}
      <TopPlayersWidget
        stageText="SEMI FINAL"
        matchText="DAY 1 MATCH 1"
        players={mockPlayers}
        palette={PALETTES[activeIdx]}
        poweredBy="Tournyx"
        sponsors={mockSponsors}
      />
    </div>
  );
}

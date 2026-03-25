'use client';
import React from 'react';

export type PlayerStat = {
  eliminations?: number;
  damage?: number;
  survivalTime?: string;
  assists?: number;
  name?: string;
  imageUrl?: string;
};

export interface ColorPalette {
  name: string;
  bg: string;
  cardBg: string;
  accent: string;
  accentDark: string;
  text: string;
  textMuted: string;
  labelBg: string;
  labelBorder: string;
  valueBg: string;
  valueText: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  barTrack: string;
  cardShadow: string;
  separator: string;
}

export const PALETTES: ColorPalette[] = [
  {
    name: 'PUBG MOBILE Official',
    bg: '#0e0e0e',
    cardBg: '#161616',
    accent: '#F1C232',
    accentDark: '#c9a228',
    text: '#f0f0f0',
    textMuted: '#777777',
    labelBg: '#1a1a1a',
    labelBorder: '#2a2a2a',
    valueBg: '#F1C232',
    valueText: '#0e0e0e',
    headerText: '#F1C232',
    badgeBg: '#F1C232',
    badgeText: '#0e0e0e',
    barTrack: '#2a2a2a',
    cardShadow: '0 8px 32px rgba(241,194,50,0.08), 0 2px 8px rgba(0,0,0,0.3)',
    separator: '#222222',
  },
  {
    name: 'Crimson Fire',
    bg: '#f5f5f5',
    cardBg: '#ffffff',
    accent: '#dc1f26',
    accentDark: '#b8191f',
    text: '#1a1a1a',
    textMuted: '#888888',
    labelBg: '#fafafa',
    labelBorder: '#e0e0e0',
    valueBg: '#dc1f26',
    valueText: '#ffffff',
    headerText: '#dc1f26',
    badgeBg: '#dc1f26',
    badgeText: '#ffffff',
    barTrack: '#ffe0e0',
    cardShadow: '0 8px 32px rgba(220,31,38,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    separator: '#f0f0f0',
  },
  {
    name: 'Royal Navy',
    bg: '#f0f2f5',
    cardBg: '#ffffff',
    accent: '#1a3a6b',
    accentDark: '#0f2545',
    text: '#1a1a2e',
    textMuted: '#7a8599',
    labelBg: '#f7f8fa',
    labelBorder: '#dde2ea',
    valueBg: '#1a3a6b',
    valueText: '#ffffff',
    headerText: '#1a3a6b',
    badgeBg: '#1a3a6b',
    badgeText: '#ffffff',
    barTrack: '#d4dcea',
    cardShadow: '0 8px 32px rgba(26,58,107,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    separator: '#ebeef3',
  },
  {
    name: 'Emerald Pro',
    bg: '#f2f7f4',
    cardBg: '#ffffff',
    accent: '#0d7c5f',
    accentDark: '#065a44',
    text: '#1a2e26',
    textMuted: '#6b8f80',
    labelBg: '#f5faf7',
    labelBorder: '#d4e8de',
    valueBg: '#0d7c5f',
    valueText: '#ffffff',
    headerText: '#0d7c5f',
    badgeBg: '#0d7c5f',
    badgeText: '#ffffff',
    barTrack: '#c8e6da',
    cardShadow: '0 8px 32px rgba(13,124,95,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    separator: '#e4f0ea',
  },
  {
    name: 'Sunset Gold',
    bg: '#faf6f1',
    cardBg: '#ffffff',
    accent: '#d4830a',
    accentDark: '#a86808',
    text: '#2e2210',
    textMuted: '#a08c6e',
    labelBg: '#fdf9f4',
    labelBorder: '#ecdcc5',
    valueBg: '#d4830a',
    valueText: '#ffffff',
    headerText: '#d4830a',
    badgeBg: '#d4830a',
    badgeText: '#ffffff',
    barTrack: '#f5e4c6',
    cardShadow: '0 8px 32px rgba(212,131,10,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    separator: '#f2eadd',
  },
  {
    name: 'Electric Violet',
    bg: '#f4f2f8',
    cardBg: '#ffffff',
    accent: '#7c3aed',
    accentDark: '#5b21b6',
    text: '#1e1533',
    textMuted: '#8878a9',
    labelBg: '#f8f6fc',
    labelBorder: '#e0d6f0',
    valueBg: '#7c3aed',
    valueText: '#ffffff',
    headerText: '#7c3aed',
    badgeBg: '#7c3aed',
    badgeText: '#ffffff',
    barTrack: '#ddd0f5',
    cardShadow: '0 8px 32px rgba(124,58,237,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    separator: '#ece6f5',
  },
];

export interface Sponsor {
  name: string;
  logoUrl?: string;
  tagline?: string;
  url?: string;
}

interface TopPlayersWidgetProps {
  players: PlayerStat[];
  stageText?: string;
  matchText?: string;
  palette?: ColorPalette;
  sponsors?: Sponsor[];
  poweredBy?: string;
  backgroundImageUrl?: string;
  transparent?: boolean;
}

export function TopPlayersWidget({
  players = [],
  stageText = "SEMI FINAL",
  matchText = "DAY 1 MATCH 1",
  palette = PALETTES[0],
  sponsors = [],
  poweredBy,
  backgroundImageUrl,
  transparent = false,
}: TopPlayersWidgetProps) {
  const displayPlayers = players.length > 0 ? players : Array(5).fill({});
  const p = palette;
  const shellBg = transparent ? 'rgba(14, 14, 14, 0.18)' : p.bg;
  const cardBg = transparent ? 'rgba(22, 22, 22, 0.48)' : p.cardBg;
  const separator = transparent ? 'rgba(255, 255, 255, 0.12)' : p.separator;
  const cardShadow = transparent ? '0 10px 36px rgba(0,0,0,0.22)' : p.cardShadow;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Montserrat:wght@500;600;700;800;900&display=swap');
      `}} />

      <div style={{ background: shellBg, width: '100%', padding: '48px 24px 56px', fontFamily: "'Roboto', sans-serif", position: 'relative', overflow: 'hidden' }}>
        {backgroundImageUrl && (
          <>
            <img src={backgroundImageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />
            <div style={{ position: 'absolute', inset: 0, background: transparent ? 'linear-gradient(180deg, rgba(14,14,14,0.34) 0%, rgba(14,14,14,0.22) 50%, rgba(14,14,14,0.34) 100%)' : `linear-gradient(180deg, ${p.bg}ee 0%, ${p.bg}cc 50%, ${p.bg}ee 100%)` }} />
          </>
        )}
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, paddingBottom: 20, borderBottom: `2px solid ${p.separator}` }}>
            <div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 600, color: p.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                LEADERBOARD
              </div>
              <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, color: p.headerText, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
                Top Players
              </h1>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 700, color: p.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {stageText}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.badgeText, background: p.badgeBg, padding: '4px 12px', borderRadius: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {matchText}
              </span>
            </div>
          </div>

          {/* Powered By Strip */}
          {poweredBy && (
            <div style={{ textAlign: 'center', marginBottom: 32, fontSize: 11, fontWeight: 600, color: p.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Powered by <span style={{ color: p.accent, fontWeight: 700 }}>{poweredBy}</span>
            </div>
          )}

          {/* Players */}
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', justifyContent: 'center', paddingBottom: 8 }}>
            {displayPlayers.map((player, idx) => (
              <div key={idx} style={{
                flexShrink: 0,
                width: 240,
                background: cardBg,
                borderRadius: 16,
                boxShadow: cardShadow,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${separator}`,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = transparent ? '0 14px 44px rgba(0,0,0,0.28)' : p.cardShadow.replace('0.08', '0.18'); }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = cardShadow; }}
              >
                {/* Image area */}
                <div style={{ width: '100%', height: 260, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${p.accent}15 0%, ${p.accent}05 100%)` }}>
                  {/* Rank */}
                  <div style={{
                    position: 'absolute', top: 14, left: 16, zIndex: 10,
                    fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700,
                    color: p.cardBg, background: p.accent, borderRadius: 8,
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {idx + 1}
                  </div>

                  {idx === 0 && (
                    <div style={{
                      position: 'absolute', top: 14, right: 14, zIndex: 10,
                      fontSize: 10, fontWeight: 700, color: p.accent,
                      background: `${p.accent}18`, border: `1px solid ${p.accent}40`,
                      padding: '3px 8px', borderRadius: 6, letterSpacing: '0.15em',
                    }}>
                      MVP
                    </div>
                  )}

                  {player.imageUrl ? (
                    <img src={player.imageUrl} alt={player.name || 'Player'}
                         referrerPolicy="no-referrer"
                         style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 80, height: 80, borderRadius: '50%', border: `2px dashed ${p.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, color: p.textMuted, letterSpacing: '0.1em' }}>PHOTO</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom fade */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(to top, ${cardBg}, transparent)` }}></div>
                </div>

                {/* Info Section */}
                <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', flex: 1, marginTop: -20, position: 'relative', zIndex: 5 }}>
                  
                  {/* Name */}
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 700, color: p.text, marginBottom: 4, lineHeight: 1.2 }}>
                    {player.name || 'Unknown'}
                  </div>
                    <div style={{ width: 28, height: 3, borderRadius: 2, background: p.accent, marginBottom: 20 }}></div>

                  {/* Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Eliminations */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Eliminations</span>
                        <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 700, color: p.accent, lineHeight: 1 }}>{player.eliminations ?? '—'}</span>
                      </div>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, background: p.barTrack, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: p.accent, width: `${Math.min(((player.eliminations || 0) / 10) * 100, 100)}%`, transition: 'width 0.6s ease' }}></div>
                      </div>
                    </div>

                    {/* Damage */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Damage</span>
                        <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 700, color: p.text, lineHeight: 1 }}>{player.damage ?? '—'}</span>
                      </div>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, background: p.barTrack, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: p.accentDark, opacity: 0.5, width: `${Math.min(((player.damage || 0) / 2000) * 100, 100)}%`, transition: 'width 0.6s ease' }}></div>
                      </div>
                    </div>

                    {/* Minor stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4, paddingTop: 14, borderTop: `1px solid ${separator}` }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 4 }}>SURVIVAL</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 600, color: p.text }}>{player.survivalTime || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: p.textMuted, letterSpacing: '0.15em', marginBottom: 4 }}>ASSISTS</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 600, color: p.text }}>{player.assists ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sponsor Banner */}
          {sponsors.length > 0 && (
            <div style={{
              marginTop: 40,
              padding: '20px 0',
              borderTop: `1px solid ${p.separator}`,
              borderBottom: `1px solid ${p.separator}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 48,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: p.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>SPONSORED BY</span>
              {sponsors.map((s, i) => (
                <a key={i} href={s.url || '#'} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', transition: 'opacity 0.2s', opacity: 0.7 }}
                   onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                   onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                >
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} style={{ height: 60, objectFit: 'contain' }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 8,
                      background: `${p.accent}15`, border: `1px solid ${p.accent}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 700, color: p.accent,
                    }}>
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 700, color: p.text }}>{s.name}</div>
                    {s.tagline && <div style={{ fontSize: 10, color: p.textMuted, marginTop: 1 }}>{s.tagline}</div>}
                  </div>
                </a>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default TopPlayersWidget;

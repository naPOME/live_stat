'use client';
import React from 'react';

/**
 * PUBG MOBILE Brand Overlay
 * Per official guidelines:
 *   - PUBG MOBILE logo → top-left (≈1/7 of visual height)
 *   - CI (KRAFTON/Level Infinite/Lightspeed) logo → bottom-left
 *   - Sponsor logos → bottom-center, never beside PUBG/CI logos
 *
 * Wrap any full-screen overlay widget with this component.
 * Logos are black-on-transparent PNGs — `invertLogos` applies CSS invert for dark BGs.
 */

export interface BrandOverlayProps {
  pubgLogoUrl?: string;
  ciLogoUrl?: string;
  sponsors?: { name: string; logoUrl: string }[];
  sponsorLogoUrl?: string;
  sponsorName?: string;
  /** Invert black logos to white (for dark backgrounds like PUBG Official palette) */
  invertLogos?: boolean;
  children: React.ReactNode;
}

const DEFAULT_PUBG_LOGO = '/logo/PUBG_Mobile_Esports_Black@2048px.png';
const DEFAULT_CI_LOGO = '/logo/[General]Black.png';

export function BrandOverlay({
  pubgLogoUrl = DEFAULT_PUBG_LOGO,
  ciLogoUrl = DEFAULT_CI_LOGO,
  sponsors,
  sponsorLogoUrl,
  sponsorName = 'Sponsor',
  invertLogos = true,
  children,
}: BrandOverlayProps) {
  const logoFilter = invertLogos
    ? 'invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.6))'
    : 'drop-shadow(0 2px 8px rgba(255,255,255,0.3))';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}

      {/* PUBG MOBILE ESPORTS logo — top-left (1/7 of visual ≈ ~154px at 1080p) */}
      {pubgLogoUrl && (
        <div style={{
          position: 'absolute',
          top: 28,
          left: 28,
          zIndex: 90,
          pointerEvents: 'none',
        }}>
          <img
            src={pubgLogoUrl}
            alt="PUBG MOBILE ESPORTS"
            style={{
              height: 72,
              objectFit: 'contain',
              filter: logoFilter,
            }}
          />
        </div>
      )}

      {/* CI logo (KRAFTON / Level Infinite / Lightspeed) — bottom-left */}
      {ciLogoUrl && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 28,
          zIndex: 90,
          pointerEvents: 'none',
        }}>
          <img
            src={ciLogoUrl}
            alt="KRAFTON / Level Infinite / Lightspeed Studios"
            style={{
              height: 24,
              objectFit: 'contain',
              filter: logoFilter,
              opacity: 0.85,
            }}
          />
        </div>
      )}

      {/* Sponsor logos — bottom-center, spaced away from CI logo */}
      {sponsors && sponsors.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 90,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}>
          {sponsors.map((s, i) => (
            <img
              key={i}
              src={s.logoUrl}
              alt={s.name}
              style={{
                height: 36,
                objectFit: 'contain',
                opacity: 0.8,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
              }}
            />
          ))}
        </div>
      )}

      {/* Sponsor slot â€” bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 28,
        zIndex: 90,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 14,
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid rgba(255,255,255,0.14)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.68)',
        }}>
          Sponsor
        </div>
        {sponsorLogoUrl ? (
          <img
            src={sponsorLogoUrl}
            alt={sponsorName}
            style={{
              height: 30,
              objectFit: 'contain',
              filter: logoFilter,
            }}
          />
        ) : (
          <div style={{
            minWidth: 120,
            height: 30,
            padding: '0 12px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.72)',
            background: 'rgba(255,255,255,0.06)',
          }}>
            {sponsorName}
          </div>
        )}
      </div>
    </div>
  );
}

export default BrandOverlay;

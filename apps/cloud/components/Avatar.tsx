'use client';

import BoringAvatar from 'boring-avatars';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const PX: Record<Size, number> = { xs: 20, sm: 28, md: 36, lg: 48 };
const DIMS: Record<Size, string> = { xs: 'w-5 h-5', sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' };


const TEAM_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2b2d42'];

type TeamAvatarProps = {
  name: string;
  logoUrl?: string | null;
  size?: Size;
  px?: number;
  className?: string;
};

export function TeamAvatar({ name, logoUrl, size = 'md', px, className = '' }: TeamAvatarProps) {
  const pixelSize = px ?? PX[size];
  const dims = px ? '' : DIMS[size];

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${dims} rounded-lg object-cover border border-[var(--border)] flex-shrink-0 ${className}`}
        style={px ? { width: px, height: px, borderRadius: 8 } : undefined}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-lg overflow-hidden flex-shrink-0 ${className}`}
      style={px ? { width: px, height: px, borderRadius: 8 } : undefined}>
      <BoringAvatar size={pixelSize} name={name} variant="bauhaus" colors={TEAM_COLORS} square />
    </div>
  );
}

type PlayerAvatarProps = {
  name: string;
  logoUrl?: string | null;
  brandColor?: string;
  size?: Size;
  /** Pixel override for large hero usage */
  px?: number;
  className?: string;
};

export function PlayerAvatar({ name, logoUrl, brandColor = '#7a8ba8', size = 'xs', px, className = '' }: PlayerAvatarProps) {
  const pixelSize = px ?? PX[size];
  const dims = px ? '' : DIMS[size];
  const colors = [brandColor, brandColor + 'aa', brandColor + '66', '#0d0d0d', '#1a1a2e'];

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${dims} rounded-lg object-cover border border-[var(--border)] flex-shrink-0 ${className}`}
        style={px ? { width: px, height: px, borderRadius: 12 } : undefined}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-lg overflow-hidden flex-shrink-0 ${className}`}
      style={px ? { width: px, height: px, borderRadius: 12 } : undefined}>
      <BoringAvatar
        size={pixelSize}
        name={name}
        variant="bauhaus"
        colors={colors}
        square
      />
    </div>
  );
}

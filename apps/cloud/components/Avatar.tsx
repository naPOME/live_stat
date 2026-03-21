'use client';

import BoringAvatar from 'boring-avatars';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const PX: Record<Size, number> = { xs: 20, sm: 28, md: 36, lg: 48 };
const DIMS: Record<Size, string> = { xs: 'w-5 h-5', sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' };

function ShieldIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M10 2L3 5v4.5C3 14 6.1 17.4 10 18.5 13.9 17.4 17 14 17 9.5V5L10 2z" />
    </svg>
  );
}

type TeamAvatarProps = {
  logoUrl?: string | null;
  brandColor?: string;
  size?: Size;
  className?: string;
};

export function TeamAvatar({ logoUrl, brandColor = '#7a8ba8', size = 'md', className = '' }: TeamAvatarProps) {
  const dims = DIMS[size];
  const iconSize = Math.round(PX[size] * 0.5);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${dims} rounded-lg object-cover border border-[var(--border)] flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-lg flex items-center justify-center border flex-shrink-0 ${className}`}
      style={{ backgroundColor: brandColor + '18', borderColor: brandColor + '35', color: brandColor }}>
      <ShieldIcon size={iconSize} />
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

import React from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const DIMS: Record<Size, string> = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
};
const ICON_SIZE: Record<Size, number> = { xs: 10, sm: 13, md: 16, lg: 20 };

function ShieldIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M10 2L3 5v4.5C3 14 6.1 17.4 10 18.5 13.9 17.4 17 14 17 9.5V5L10 2z" />
    </svg>
  );
}

function PersonIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="7" r="3.2" strokeLinejoin="round" />
      <path d="M3 18c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5" strokeLinecap="round" />
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
  const iconSize = ICON_SIZE[size];

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
  logoUrl?: string | null;
  brandColor?: string;
  size?: Size;
  className?: string;
};

export function PlayerAvatar({ logoUrl, brandColor = '#7a8ba8', size = 'xs', className = '' }: PlayerAvatarProps) {
  const dims = DIMS[size];
  const iconSize = ICON_SIZE[size];

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${dims} rounded-full object-cover border border-[var(--border)] flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-full flex items-center justify-center border flex-shrink-0 ${className}`}
      style={{ backgroundColor: brandColor + '18', borderColor: brandColor + '35', color: brandColor }}>
      <PersonIcon size={iconSize} />
    </div>
  );
}

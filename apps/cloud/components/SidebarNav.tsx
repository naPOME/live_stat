'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

const links = [
  {
    href: '/',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 7.5L9 2.5L15 7.5V15C15 15.6 14.6 16 14 16H4C3.4 16 3 15.6 3 15V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 16V10H11V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/tournaments',
    label: 'Tournaments',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L11 6.5H16L12 9.5L13.5 14L9 11L4.5 14L6 9.5L2 6.5H7L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/teams',
    label: 'Teams',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="6.5" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="11.5" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.4" opacity="0.45"/>
        <path d="M1.5 14.5C1.5 12 3.8 10 6.5 10C9.2 10 11.5 12 11.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M11.5 10C13.7 10.3 15.5 12 15.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45"/>
      </svg>
    ),
  },
  {
    href: '/stages',
    label: 'Stages',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2.5" y="3" width="13" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="2.5" y="7.5" width="13" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.55"/>
        <rect x="2.5" y="12" width="13" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.3" opacity="0.3"/>
      </svg>
    ),
  },
  {
    href: '/matches',
    label: 'Matches',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M2 7.5H16" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M7.5 7.5V16" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    href: '/players',
    label: 'Players',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3.5 16C3.5 12.69 5.91 10 9 10C12.09 10 14.5 12.69 14.5 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/widgets',
    label: 'Widgets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="10.5" y="2" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="2" y="10.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M12 11.5L15 14L12 16.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 2.5v1.5M9 14v1.5M15.5 9H14M4 9H2.5M13.6 4.4l-1 1M5.4 12.6l-1 1M13.6 13.6l-1-1M5.4 5.4l-1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function SidebarNav() {
  const { orgName, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] flex flex-col z-20 sidebar-shell">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3.5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9 1.5V4M9 14V16.5M1.5 9H4M14 9H16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold tracking-wide text-[var(--text-primary)]">
              Tournyx
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate font-medium mt-0.5">{orgName}</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 divider" />

      {/* Nav */}
      <nav className="flex-1 px-3 pt-5 pb-3 space-y-0.5 overflow-y-auto">
        <div className="label px-3 mb-3 text-[9px]">Navigation</div>

        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] sidebar-item-hover'
              }`}
            >
              {/* Active state */}
              {active && (
                <>
                  <div className="absolute inset-0 rounded-lg sidebar-active-bg" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full sidebar-active-indicator" />
                </>
              )}

              <span className={`relative z-10 w-[18px] h-[18px] flex-shrink-0 transition-all duration-200 ${
                active ? 'text-accent-raw' : 'group-hover:scale-105'
              }`}>
                {link.icon}
              </span>
              <span className="relative z-10 font-display tracking-wide">{link.label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="label px-3 mt-6 mb-3 text-[9px]">System</div>
            <Link
              href="/admin"
              className={`group relative flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive('/admin')
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] sidebar-item-hover'
              }`}
            >
              {isActive('/admin') && (
                <>
                  <div className="absolute inset-0 rounded-lg sidebar-active-bg-admin" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full sidebar-active-indicator-admin" />
                </>
              )}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={`relative z-10 flex-shrink-0 ${isActive('/admin') ? 'text-danger' : ''}`}>
                <path d="M9 2a7 7 0 100 14A7 7 0 009 2z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M9 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="relative z-10 font-display tracking-wide">Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Bottom: Theme toggle + Sign out */}
      <div className="px-3 py-4 sidebar-bottom-border">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-[9px] rounded-lg text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] sidebar-item-hover transition-all duration-200 group mb-0.5"
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 transition-transform duration-200 group-hover:rotate-12">
              <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9 2.5v1.5M9 14v1.5M15.5 9H14M4 9H2.5M13.6 4.4l-1 1M5.4 12.6l-1 1M13.6 13.6l-1-1M5.4 5.4l-1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 transition-transform duration-200 group-hover:-rotate-12">
              <path d="M15.5 10.5a6.5 6.5 0 01-8-8A6.5 6.5 0 1015.5 10.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          <span className="font-display tracking-wide">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-[9px] rounded-lg text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] sidebar-item-hover transition-all duration-200 group"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
            <path d="M7 16H3.5C3 16 2.5 15.5 2.5 15V3C2.5 2.5 3 2 3.5 2H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M12 13L15.5 9.5L12 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.5 9.5H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="font-display tracking-wide">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

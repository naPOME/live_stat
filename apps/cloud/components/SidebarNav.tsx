'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 7.5L9 2.5L15 7.5V15C15 15.6 14.6 16 14 16H4C3.4 16 3 15.6 3 15V7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 16V10H11V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/tournaments',
    label: 'Tournaments',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L10.6 6.6H15.5L11.5 9.4L13.1 14L9 11.2L4.9 14L6.5 9.4L2.5 6.6H7.4L9 2Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/teams',
    label: 'Teams',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="6.5" cy="5.5" r="2.5" fill="currentColor" opacity="0.9"/>
        <circle cx="11.5" cy="5.5" r="2.5" fill="currentColor" opacity="0.5"/>
        <path d="M1 14.5C1 12.015 3.515 10 6.5 10C9.485 10 12 12.015 12 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M11.5 10C13.985 10.3 16 12.15 16 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
  },
  {
    href: '/stages',
    label: 'Stages',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="3" rx="1" fill="currentColor" opacity="0.9"/>
        <rect x="2" y="7.5" width="14" height="3" rx="1" fill="currentColor" opacity="0.6"/>
        <rect x="2" y="12" width="14" height="3" rx="1" fill="currentColor" opacity="0.35"/>
      </svg>
    ),
  },
  {
    href: '/matches',
    label: 'Matches',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2 7H16" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M7 7V16" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    href: '/players',
    label: 'Players',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M3 16C3 12.69 5.69 10 9 10C12.31 10 15 12.69 15 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/widgets',
    label: 'Widgets & API',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 11.5L14.5 14L12 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M9 2v1.5M9 14.5V16M16 9h-1.5M3.5 9H2M13.95 4.05l-1.06 1.06M5.11 12.89l-1.06 1.06M13.95 13.95l-1.06-1.06M5.11 5.11L4.05 4.05" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function SidebarNav({ orgName, isAdmin = false }: { orgName: string; isAdmin?: boolean }) {
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
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col bg-[#0e1621] border-r border-white/5 z-20">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ffc3] to-[#00d9a6] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(0,255,195,0.25)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L5 5L8 8L11 5L14 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 11.5L5 8.5L8 11.5L11 8.5L14 11.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-white truncate leading-tight tracking-tight">LiveStat</div>
            <div className="text-[10px] text-[#8b8da6] truncate leading-tight">{orgName}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? 'bg-[#00ffc3]/12 text-[#00ffc3]'
                  : 'text-[#8b8da6] hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex-shrink-0 w-[18px] h-[18px]">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8b8da6]/40">System</div>
            </div>
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                isActive('/admin')
                  ? 'bg-[#ff4e4e]/12 text-[#ff4e4e]'
                  : 'text-[#8b8da6] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
                <path d="M9 2a7 7 0 100 14A7 7 0 009 2z" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M9 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Admin
            </Link>
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-white/5">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-[#8b8da6] hover:text-white hover:bg-white/5 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 16H3C2.447 16 2 15.553 2 15V3C2 2.447 2.447 2 3 2H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M12 13L16 9L12 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 9H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

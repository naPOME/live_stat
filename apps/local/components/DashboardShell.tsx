'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

/* ── SVG icon helpers ─────────────────────────────────── */
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  broadcast: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2a6 6 0 010-8.4" />
      <path d="M16.2 7.8a6 6 0 010 8.4" /><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  controller: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="10" x2="6" y2="14" />
      <line x1="4" y1="12" x2="8" y2="12" /><circle cx="16" cy="10" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  gallery: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.5" /><line x1="2" y1="10" x2="22" y2="10" />
      <line x1="10" y1="2" x2="10" y2="22" />
    </svg>
  ),
  overlay: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  cloud: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </svg>
  ),
  sync: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  match: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  tdm: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  // Crosshair / esport logo icon
  logo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" stroke="currentColor" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" />
      <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" />
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" />
      <line x1="1" y1="12" x2="5" y2="12" stroke="currentColor" />
      <line x1="19" y1="12" x2="23" y2="12" stroke="currentColor" />
    </svg>
  ),
  minimize: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="5.5" width="8" height="1" rx=".5" /></svg>
  ),
  maximize: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="2" width="8" height="8" rx="1" /></svg>
  ),
  close: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M3.17 2.46a.5.5 0 00-.7.71L5.28 6 2.46 8.83a.5.5 0 10.71.7L6 6.72l2.83 2.82a.5.5 0 00.7-.71L6.72 6l2.82-2.83a.5.5 0 00-.71-.7L6 5.28 3.17 2.46z" />
    </svg>
  ),
  collapse: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

/* ── Nav data ────────────────────────────────────────── */
interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  tag?: string;
  tagColor?: string;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: icons.dashboard },
  {
    label: 'Broadcast',
    icon: icons.broadcast,
    children: [
      { label: 'Controller', href: '/controller', icon: icons.controller },
      { label: 'Widget Gallery', href: '/overlay/gallery', icon: icons.gallery },
      { label: 'Master Overlay', href: '/overlay/master', icon: icons.overlay },
    ],
  },
  {
    label: 'Match',
    icon: icons.match,
    children: [
      { label: 'TDM Match', href: '/tdm_match', icon: icons.tdm },
    ],
  },
  {
    label: 'Cloud',
    icon: icons.cloud,
    tag: 'SYNC',
    tagColor: 'var(--accent)',
    children: [
      { label: 'Cloud Details', href: '/cloud', icon: icons.cloud },
    ],
  },
];

/* ── Component ───────────────────────────────────────── */
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Broadcast: true, Match: true, Cloud: true });
  const [searchFocused, setSearchFocused] = useState(false);

  // Auto-expand the group containing the current page
  useEffect(() => {
    for (const item of NAV) {
      if (item.children?.some(c => c.href === pathname)) {
        setExpanded(prev => ({ ...prev, [item.label]: true }));
      }
    }
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href?: string) => href === pathname;

  return (
    <div className="shell">
      {/* ── Title bar (fake window chrome) ──────────── */}
      <div className="titlebar">
        <div className="titlebar-left">
          <div className="titlebar-logo">{icons.logo}</div>
          <span className="titlebar-name">Live Stat</span>
          <span className="titlebar-sep">/</span>
          <span className="titlebar-page">Local Engine</span>
        </div>

        <div className={`titlebar-search${searchFocused ? ' focused' : ''}`}>
          {icons.search}
          <input
            type="text"
            placeholder="Search pages, widgets, teams…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd>Ctrl+K</kbd>
        </div>

        <div className="titlebar-controls">
          <button className="wc-btn">{icons.minimize}</button>
          <button className="wc-btn">{icons.maximize}</button>
          <button className="wc-btn wc-close">{icons.close}</button>
        </div>
      </div>

      <div className="shell-body">
        {/* ── Sidebar ──────────────────────────────── */}
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-top">
            <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
              {icons.collapse}
            </button>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(item => {
              if (!item.children) {
                // Simple link
                return (
                  <a
                    key={item.label}
                    href={item.href!}
                    className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                  </a>
                );
              }
              // Group with children
              const isOpen = expanded[item.label] && !collapsed;
              const hasActivechild = item.children.some(c => isActive(c.href));
              return (
                <div key={item.label} className="nav-group">
                  <button
                    className={`nav-item nav-group-header${hasActivechild ? ' active-parent' : ''}`}
                    onClick={() => collapsed ? setCollapsed(false) : toggleGroup(item.label)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        {item.tag && (
                          <span className="nav-tag" style={{ color: item.tagColor }}>{item.tag}</span>
                        )}
                        <span className={`nav-chevron${isOpen ? ' open' : ''}`}>{icons.chevron}</span>
                      </>
                    )}
                  </button>
                  {isOpen && (
                    <div className="nav-children">
                      {item.children.map(child => (
                        <a
                          key={child.href}
                          href={child.href}
                          className={`nav-item nav-child${isActive(child.href) ? ' active' : ''}`}
                        >
                          <span className="nav-icon">{child.icon}</span>
                          <span className="nav-label">{child.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          {!collapsed && (
            <div className="sidebar-footer">
              <div className="sidebar-footer-label">Local Engine</div>
              <div className="sidebar-footer-sub">Port 3001</div>
            </div>
          )}
        </aside>

        {/* ── Main content ─────────────────────────── */}
        <main className="shell-main">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  SquaresFour,
  Broadcast,
  GameController,
  GridNine,
  Monitor,
  Lightning,
  Shield,
  CaretRight,
  MagnifyingGlass,
  Crosshair,
  List,
  Minus,
  Square,
  X,
} from '@phosphor-icons/react';

/* ── Nav data ────────────────────────────────────────── */
interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <SquaresFour size={18} /> },
  {
    label: 'Broadcast',
    icon: <Broadcast size={18} />,
    children: [
      { label: 'Controller', href: '/controller', icon: <GameController size={18} /> },
      { label: 'Widget Gallery', href: '/overlay/gallery', icon: <GridNine size={18} /> },
      { label: 'Master Overlay', href: '/overlay/master', icon: <Monitor size={18} /> },
    ],
  },
  {
    label: 'Match',
    icon: <Lightning size={18} />,
    children: [
      { label: 'TDM Match', href: '/tdm_match', icon: <Shield size={18} /> },
    ],
  },
];

/* ── Component ───────────────────────────────────────── */
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Broadcast: true, Match: true });

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
      {/* ── Title bar ────────────────────────────────── */}
      <div className="titlebar">
        <div className="titlebar-left">
          <div className="titlebar-logo"><Crosshair size={14} /></div>
          <span className="titlebar-name">Live Stat</span>
          <span className="titlebar-sep">/</span>
          <span className="titlebar-page">Local Engine</span>
        </div>

        <div className="titlebar-search">
          <MagnifyingGlass size={14} />
          <input type="text" placeholder="Search..." />
          <kbd>Ctrl K</kbd>
        </div>

        <div className="titlebar-controls">
          <button className="wc-btn" onClick={() => (window as any).electronAPI?.minimize()}><Minus size={10} weight="bold" /></button>
          <button className="wc-btn" onClick={() => (window as any).electronAPI?.maximize()}><Square size={10} /></button>
          <button className="wc-btn wc-close" onClick={() => (window as any).electronAPI?.close()}><X size={10} weight="bold" /></button>
        </div>
      </div>

      <div className="shell-body">
        {/* ── Sidebar ──────────────────────────────── */}
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-top">
            <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
              <List size={16} />
            </button>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(item => {
              if (!item.children) {
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
              const isOpen = expanded[item.label] && !collapsed;
              const hasActiveChild = item.children.some(c => isActive(c.href));
              return (
                <div key={item.label} className="nav-group">
                  <button
                    className={`nav-item nav-group-header${hasActiveChild ? ' active-parent' : ''}`}
                    onClick={() => collapsed ? setCollapsed(false) : toggleGroup(item.label)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        <span className={`nav-chevron${isOpen ? ' open' : ''}`}><CaretRight size={12} /></span>
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

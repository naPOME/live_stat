'use client';

import { usePathname } from 'next/navigation';
import DashboardShell from './DashboardShell';

const BARE_PREFIXES = ['/overlay/'];

export default function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PREFIXES.some(p => pathname.startsWith(p));

  if (isBare) return <>{children}</>;
  return <DashboardShell>{children}</DashboardShell>;
}

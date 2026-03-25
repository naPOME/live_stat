'use client';

import { usePathname } from 'next/navigation';
import DashboardShell from './DashboardShell';

// Overlay routes render bare (transparent for OBS), except gallery which is a dashboard page
const SHELL_OVERRIDES = ['/overlay/gallery'];

export default function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = pathname.startsWith('/overlay/') && !SHELL_OVERRIDES.includes(pathname);

  if (isBare) return <>{children}</>;
  return <DashboardShell>{children}</DashboardShell>;
}

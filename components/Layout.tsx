'use client';

import { ReactNode } from 'react';
import LiveLeaderboard from '@/components/LiveLeaderboard';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      
      {/* Right Sidebar - LiveLeaderboard */}
      <div className="w-80 flex-shrink-0 border-l bg-white">
        <LiveLeaderboard />
      </div>
    </div>
  );
};

export default Layout;

'use client';

import TdmLiveScoreboard from '@/components/TdmLiveScoreboard';

export default function TdmMatchPage() {
  return (
    <div className="min-h-screen  font-sans flex items-start justify-center p-6">
      <TdmLiveScoreboard />
    </div>
  );
}

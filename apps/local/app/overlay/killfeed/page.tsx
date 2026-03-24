'use client';

import { useEffect, useState, useRef } from 'react';
import { PALETTES } from '@/components/TopPlayersWidget';
import { KillFeedWidget, type KillEvent } from '@/components/KillFeedWidget';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

const FADE_DURATION = 5000;

export default function KillfeedPage() {
  const [events, setEvents] = useState<KillEvent[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const themeIdx = useGlobalTheme();

  useEffect(() => {
    const es = new EventSource('/api/killfeed');
    es.onmessage = (e) => {
      try {
        const kill = JSON.parse(e.data);
        if (!kill.id) return;

        const mapped: KillEvent = {
          id: kill.id,
          killer: kill.causerName,
          killerTeamColor: kill.causerTeamColor,
          victim: kill.victimName,
          victimTeamColor: kill.victimTeamColor,
          weapon: kill.weaponName || 'M416',
          isKnock: kill.isKnock ?? false,
        };

        setEvents(prev => [mapped, ...prev].slice(0, 8));

        const t = setTimeout(() => {
          setEvents(prev => prev.filter(k => k.id !== kill.id));
          timers.current.delete(kill.id);
        }, FADE_DURATION);
        timers.current.set(kill.id, t);
      } catch {}
    };
    return () => { es.close(); timers.current.forEach(clearTimeout); };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        body { background: transparent !important; margin: 0; }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}} />
      <KillFeedWidget events={events} palette={PALETTES[themeIdx]} />
    </>
  );
}

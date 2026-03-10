'use client';

import { useState } from 'react';

const WIDGETS = [
  {
    name: 'Match Ranking',
    path: '/overlay/leaderboard',
    description: 'Live leaderboard with teams, player alive/dead status bars, points and eliminations. Updates every second during match.',
    size: '420 x 1080',
    category: 'Live',
  },
  {
    name: 'Kill Feed',
    path: '/overlay/killfeed',
    description: 'Real-time kill events showing killer → victim with team colors and distance. Auto-fades after 5 seconds.',
    size: '1920 x 1080',
    category: 'Live',
  },
  {
    name: 'Player Card',
    path: '/overlay/playercard',
    description: 'Stats overlay for the currently observed player: health bar, kills, team info, alive count.',
    size: '1920 x 1080',
    category: 'Live',
  },
  {
    name: 'Elimination Notification',
    path: '/overlay/elimination',
    description: 'Animated popup when a team is fully eliminated. Shows rank badge, team name, elims and total points.',
    size: '1920 x 1080',
    category: 'Live',
  },
  {
    name: 'MVP',
    path: '/overlay/mvp',
    description: 'Match MVP display — top fragger with team tag, eliminations, and detailed stats panel.',
    size: '1920 x 1080',
    category: 'Post-Match',
  },
  {
    name: 'Winner Winner Chicken Dinner',
    path: '/overlay/wwcd',
    description: 'WWCD celebration screen with player silhouettes, WWCD count, total elims, placement and total points.',
    size: '1920 x 1080',
    category: 'Post-Match',
  },
  {
    name: 'Top Fraggers',
    path: '/overlay/fraggers',
    description: 'Top 5 players by eliminations with MVP badge. Cards show player name, team, and kill count.',
    size: '1920 x 1080',
    category: 'Post-Match',
  },
  {
    name: 'After Match Score',
    path: '/overlay/results',
    description: 'Two-column match results table with all teams ranked by total points. Shows elims and totals.',
    size: '1920 x 1080',
    category: 'Post-Match',
  },
  {
    name: 'Point Table',
    path: '/overlay/pointtable',
    description: 'Visual PUBG Mobile standard point system — placement points grid and elimination point value.',
    size: '1920 x 1080',
    category: 'Static',
  },
  {
    name: 'Team List',
    path: '/overlay/teamlist',
    description: 'Two-column grid of all participating teams with logos and slot numbers. Good for pre-match.',
    size: '1920 x 1080',
    category: 'Static',
  },
  {
    name: 'Match Info',
    path: '/overlay/matchinfo',
    description: 'Match started notification with tournament banner, stage name, game number, and map.',
    size: '1920 x 1080',
    category: 'Static',
    params: '?stage=Groups&game=Game 1&map=Erangel',
  },
  {
    name: 'Match Schedule',
    path: '/overlay/schedule',
    description: 'Bottom bar showing all matches with map names and live/finished/upcoming status indicators.',
    size: '1920 x 1080',
    category: 'Static',
    params: '?matches=MATCH 1:ERANGEL:finished,MATCH 2:MIRAMAR:live,MATCH 3:SANHOK:upcoming',
  },
];

const CATEGORIES = ['All', 'Live', 'Post-Match', 'Static'];

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/live', description: 'Current match leaderboard (JSON). Teams sorted by points, includes kills, placement, alive status.' },
  { method: 'GET', path: '/api/stream', description: 'Full game state SSE stream. Events: hello, state, ping. Real-time updates.' },
  { method: 'GET', path: '/api/killfeed', description: 'Kill events SSE stream. Sends last 8 kills on connect, then new kills in real-time.' },
  { method: 'GET', path: '/api/playercard', description: 'Observed player SSE stream. Updates when caster switches player focus.' },
  { method: 'GET', path: '/api/theme', description: 'Overlay theme config: bg_color, accent_color, font, brand_color from roster_mapping.json.' },
  { method: 'POST', path: '/api/pcob', description: 'Game data ingestion endpoint. Accepts team/player state from game client.' },
  { method: 'POST', path: '/api/watcher', description: 'Start/stop watching game log files. Actions: start (with filePath), stop.' },
];

export default function WidgetsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'widgets' | 'api'>('widgets');

  const localUrl = 'http://localhost:3000';

  function copyUrl(path: string, params?: string) {
    const url = `${localUrl}${path}${params || ''}`;
    navigator.clipboard.writeText(url);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = activeCategory === 'All'
    ? WIDGETS
    : WIDGETS.filter(w => w.category === activeCategory);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Widgets & API</h1>
        <p className="text-[#8b8da6] text-sm mt-1">OBS overlay widgets and API endpoints for the local engine</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a2a3a] border border-white/10 rounded-xl p-1 w-fit">
        {(['widgets', 'api'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white/10 text-white'
                : 'text-[#8b8da6] hover:text-white'
            }`}
          >
            {tab === 'widgets' ? 'Overlay Widgets' : 'API Endpoints'}
          </button>
        ))}
      </div>

      {/* WIDGETS TAB */}
      {activeTab === 'widgets' && (
        <>
          {/* Master Overlay + Controller Banner */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gradient-to-br from-[#00ffc3]/10 to-transparent border border-[#00ffc3]/20 rounded-xl p-4">
              <div className="text-[10px] font-bold text-[#00ffc3] uppercase tracking-wider mb-1">Recommended</div>
              <div className="text-white font-semibold text-sm">Master Overlay</div>
              <p className="text-[#8b8da6] text-xs mt-1 mb-2">Single OBS source — composites all widgets. Toggle from Controller.</p>
              <code className="text-[10px] bg-black/30 border border-[#00ffc3]/20 rounded-lg px-2.5 py-1.5 text-[#00ffc3] font-mono block">
                {localUrl}/overlay/master
              </code>
            </div>
            <div className="bg-[#1a2a3a] border border-white/10 rounded-xl p-4">
              <div className="text-[10px] font-bold text-[#ff4e4e] uppercase tracking-wider mb-1">Observer Tool</div>
              <div className="text-white font-semibold text-sm">Widget Controller</div>
              <p className="text-[#8b8da6] text-xs mt-1 mb-2">Toggle widgets with hotkeys (F1-F12). Quick presets for match phases.</p>
              <code className="text-[10px] bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-[#00ffc3] font-mono block">
                {localUrl}/controller
              </code>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#00ffc3]/15 text-[#00ffc3] border border-[#00ffc3]/30'
                    : 'bg-white/5 text-[#8b8da6] border border-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((w) => (
              <div
                key={w.path}
                className="bg-[#1a2a3a] border border-white/10 rounded-xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold text-sm">{w.name}</h3>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        w.category === 'Live' ? 'bg-[#ff4e4e]/15 text-[#ff4e4e]'
                        : w.category === 'Post-Match' ? 'bg-[#00ffc3]/15 text-[#00ffc3]'
                        : 'bg-white/5 text-[#8b8da6]'
                      }`}>
                        {w.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8b8da6]">{w.size}</span>
                  </div>
                  <a
                    href={`${localUrl}${w.path}${w.params || ''}`}
                    target="_blank"
                    rel="noopener"
                    className="text-[10px] text-[#00ffc3] border border-[#00ffc3]/30 px-2 py-1 rounded-md hover:bg-[#00ffc3]/10 transition-colors"
                  >
                    Preview
                  </a>
                </div>

                <p className="text-[#8b8da6] text-xs leading-relaxed">{w.description}</p>

                <div className="flex items-center gap-2 mt-auto">
                  <code className="flex-1 text-[10px] bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-[#00ffc3] font-mono truncate">
                    {localUrl}{w.path}{w.params || ''}
                  </code>
                  <button
                    onClick={() => copyUrl(w.path, w.params)}
                    className={`text-[10px] px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 ${
                      copied === w.path
                        ? 'bg-[#00ffc3] text-[#000]'
                        : 'bg-white/5 text-[#8b8da6] border border-white/10 hover:text-white'
                    }`}
                  >
                    {copied === w.path ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Setup instructions */}
          <div className="mt-8 bg-[#1a2a3a] border border-white/10 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3">OBS Setup Instructions</h3>
            <ol className="text-[#8b8da6] text-xs space-y-2 list-decimal list-inside leading-relaxed">
              <li>Make sure the local engine is running at <code className="text-[#00ffc3] bg-black/30 px-1.5 py-0.5 rounded">http://localhost:3000</code></li>
              <li>In OBS, add a <strong className="text-white">Browser Source</strong></li>
              <li>Paste the widget URL, set size to <strong className="text-white">1920 x 1080</strong></li>
              <li>Check <strong className="text-white">"Shutdown source when not visible"</strong> for performance</li>
              <li>Set <strong className="text-white">Custom CSS</strong> to: <code className="text-[#00ffc3] bg-black/30 px-1.5 py-0.5 rounded">{'body { background: transparent !important; }'}</code></li>
            </ol>
          </div>
        </>
      )}

      {/* API TAB */}
      {activeTab === 'api' && (
        <div className="space-y-3">
          <p className="text-[#8b8da6] text-xs mb-4">
            These endpoints run on the local engine at <code className="text-[#00ffc3]">http://localhost:3000</code>.
            SSE streams auto-reconnect and include ping keepalives every 10 seconds.
          </p>

          {API_ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="bg-[#1a2a3a] border border-white/10 rounded-xl px-5 py-4 flex items-start gap-4"
            >
              <span className={`text-[10px] font-black px-2 py-1 rounded flex-shrink-0 mt-0.5 ${
                ep.method === 'GET' ? 'bg-[#00ffc3]/15 text-[#00ffc3]' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {ep.method}
              </span>
              <div className="flex-1 min-w-0">
                <code className="text-sm text-white font-mono font-semibold">{ep.path}</code>
                <p className="text-[#8b8da6] text-xs mt-1 leading-relaxed">{ep.description}</p>
              </div>
              <button
                onClick={() => copyUrl(ep.path)}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 ${
                  copied === ep.path
                    ? 'bg-[#00ffc3] text-[#000]'
                    : 'bg-white/5 text-[#8b8da6] border border-white/10 hover:text-white'
                }`}
              >
                {copied === ep.path ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

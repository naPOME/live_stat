'use client';

import { useState, useRef, useEffect } from 'react';
import type { StageWithDetails, StandingEntry } from '../_types';

type Props = {
  stages: StageWithDetails[];
  activeStageId: string | null;
  onSelectStage: (stageId: string) => void;
  stageStandings: { id: string; standings: StandingEntry[] }[];
};

export default function StageTimeline({ stages, activeStageId, onSelectStage, stageStandings }: Props) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setHoveredStage(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (stages.length === 0) return null;

  return (
    <div className="relative px-6 py-4">
      {/* Subway track line */}
      <div className="flex items-center gap-0">
        {stages.map((stage, i) => {
          const isSelected = stage.id === activeStageId;
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';
          const isPending = stage.status === 'pending';

          // Match progress for the ring
          const totalMatches = stage.matches.length + stage.groups.reduce((s, g) => s + g.matches.length, 0);
          const finishedMatches = stage.matches.filter(m => m.status === 'finished').length
            + stage.groups.reduce((s, g) => s + g.matches.filter(m => m.status === 'finished').length, 0);
          const progress = totalMatches > 0 ? finishedMatches / totalMatches : 0;

          // Ring geometry
          const radius = 18;
          const circumference = 2 * Math.PI * radius;
          const strokeDash = circumference * progress;

          // Popover standings for completed stages
          const standings = stageStandings.find(s => s.id === stage.id)?.standings ?? [];
          const top3 = standings.slice(0, 3);
          const mvp = standings[0];

          return (
            <div key={stage.id} className="flex items-center">
              {/* Connector line */}
              {i > 0 && (
                <div className={`h-[2px] w-10 transition-colors duration-300 ${
                  isCompleted || isActive ? 'bg-emerald-500/50' : 'bg-[var(--border)]'
                }`} />
              )}

              {/* Stage node */}
              <div className="relative flex flex-col items-center">
                <button
                  ref={(el) => { if (el) nodeRefs.current.set(stage.id, el); }}
                  onClick={() => onSelectStage(stage.id)}
                  onMouseEnter={() => isCompleted && setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer group ${
                    isSelected
                      ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)]'
                      : ''
                  } ${
                    isCompleted
                      ? 'bg-emerald-500/15 border-2 border-emerald-500/40 hover:border-emerald-500/60'
                      : isActive
                        ? 'bg-[var(--accent)]/15 border-2 border-[var(--accent)]/40'
                        : 'bg-[var(--bg-elevated)] border-2 border-[var(--border)] opacity-50'
                  }`}
                >
                  {/* Progress ring for active stage */}
                  {isActive && totalMatches > 0 && (
                    <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24" cy="24" r={radius}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2.5"
                        strokeDasharray={`${strokeDash} ${circumference}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                        opacity="0.7"
                      />
                    </svg>
                  )}

                  {/* Icon */}
                  {isCompleted ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : isActive ? (
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-[var(--accent)] animate-ping opacity-40" />
                    </div>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]" />
                  )}
                </button>

                {/* Stage label */}
                <div className="mt-2 text-center max-w-[80px]">
                  <div className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${
                    isSelected ? 'text-[var(--text-primary)]' : isCompleted ? 'text-emerald-400' : isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                  }`}>
                    {stage.name}
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    {stage.stage_type === 'group' ? 'GRP' : stage.stage_type === 'elimination' ? 'ELIM' : 'FIN'}
                    {isActive && totalMatches > 0 && (
                      <span className="ml-1 text-[var(--accent)]">{finishedMatches}/{totalMatches}</span>
                    )}
                  </div>
                </div>

                {/* Completed stage hover popover */}
                {hoveredStage === stage.id && isCompleted && top3.length > 0 && (
                  <div
                    ref={popoverRef}
                    className="absolute top-full mt-3 z-50 w-56 animate-fade-in"
                  >
                    <div className="surface p-3 rounded-xl shadow-[var(--shadow-elevated)] border border-[var(--border-hover)]">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Top Advancing</div>
                      <div className="space-y-1.5">
                        {top3.map((entry, rank) => (
                          <div key={entry.team_id} className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                              rank === 0 ? 'bg-amber-400/20 text-amber-400' : rank === 1 ? 'bg-gray-300/20 text-gray-300' : 'bg-amber-700/20 text-amber-600'
                            }`}>
                              {rank + 1}
                            </span>
                            {entry.team?.logo_url ? (
                              <img src={entry.team.logo_url} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: '#2F6B3F40' }} />
                            )}
                            <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                              {entry.team?.short_name || entry.team?.name || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-auto tabular-nums font-mono">{entry.total_pts}pt</span>
                          </div>
                        ))}
                      </div>
                      {mvp && (
                        <div className="mt-2 pt-2 border-t border-[var(--border)]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--amber)]">MVP</span>
                            <span className="text-[10px] text-[var(--text-primary)] font-medium">
                              {mvp.team?.short_name || mvp.team?.name}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] ml-auto">{mvp.total_kills} kills</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';
import React from 'react';
import type { TeamStandings } from './OverallLeaderboardWidget';

export function OverallLeaderboardWidget3({
  teams = [],
  stageText = "GLOBAL CHAMPIONSHIP",
  matchText = "DAY 1 • MATCH 4",
}: {
  teams: TeamStandings[];
  stageText?: string;
  matchText?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@600;800;900&display=swap');
      `}} />

      {/* Pure White Background, highly structured, 0px border radius, thick black borders */}
      <div className="w-full min-h-screen bg-white flex flex-col p-8 md:p-12 relative text-black" 
           style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

        <div className="w-full max-w-[1200px] mx-auto relative z-10 flex flex-col">
          
          {/* High Contrast Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 border-b-[4px] border-black gap-4">
            <div className="flex flex-col">
               <div className="bg-red-600 text-white px-3 py-1 font-bold tracking-[0.15em] text-xs uppercase w-fit mb-4">
                 OFFICIAL LEADERBOARD
               </div>
               <h1 className="text-5xl md:text-7xl font-black m-0 tracking-tighter uppercase leading-none">
                 Standings
               </h1>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
               <div className="text-black font-black text-2xl tracking-tight uppercase">
                 {stageText}
               </div>
               <div className="bg-black text-white px-4 py-1.5 font-bold tracking-[0.1em] text-sm uppercase">
                 {matchText}
               </div>
            </div>
          </div>

          {/* Brutalist Table Structure */}
          <div className="w-full border-[3px] border-black bg-white">
            
            {/* Table Header */}
            <div className="grid grid-cols-[70px_60px_1fr_100px_100px_120px_140px] border-b-[3px] border-black bg-black text-white font-bold tracking-widest text-[10px] md:text-xs uppercase items-stretch">
              <div className="flex items-center justify-center py-3 border-r-[2px] border-white/20">RNK</div>
              <div className="border-r-[2px] border-white/20"></div> {/* Change */}
              <div className="flex items-center pl-4 py-3 border-r-[2px] border-white/20">TEAM</div>
              <div className="flex items-center justify-center py-3 border-r-[2px] border-white/20 text-yellow-400">WWCD</div>
              <div className="flex items-center justify-center py-3 border-r-[2px] border-white/20">ELIMS</div>
              <div className="flex items-center justify-center py-3 border-r-[2px] border-white/20">PLACE</div>
              <div className="flex items-center justify-center py-3 bg-red-600 text-white">TOTAL</div>
            </div>

            {/* Table Body */}
            <div>
              {teams.map((team, idx) => {
                const isEven = idx % 2 === 0;
                const top3 = team.rank <= 3;
                
                return (
                  <div key={idx} className={`grid grid-cols-[70px_60px_1fr_100px_100px_120px_140px] items-stretch ${isEven ? 'bg-[#f4f4f5]' : 'bg-white'} ${idx === teams.length-1 ? '' : 'border-b-[2px] border-black/20'}`}>
                    
                    {/* Rank Number */}
                    <div className={`flex items-center justify-center font-black text-2xl border-r-[2px] border-black/20 ${top3 ? 'bg-black text-white' : 'text-black'}`}>
                      {team.rank}
                    </div>

                    {/* Rank Change */}
                    <div className="flex items-center justify-center border-r-[2px] border-black/20 font-bold font-sans">
                      {team.rankChange && team.rankChange > 0 ? (
                         <div className="flex items-center gap-1 text-green-600 text-xs">
                           <span>▲</span>{team.rankChange}
                         </div>
                      ) : team.rankChange && team.rankChange < 0 ? (
                         <div className="flex items-center gap-1 text-red-600 text-xs">
                           <span>▼</span>{Math.abs(team.rankChange)}
                         </div>
                      ) : (
                         <div className="text-black/30">-</div>
                      )}
                    </div>

                    {/* Team Name and Logo */}
                    <div className="flex items-center gap-4 pl-4 py-2 border-r-[2px] border-black/20">
                       <div className="w-10 h-10 bg-black flex items-center justify-center flex-shrink-0">
                         {team.logoUrl ? (
                           <img src={team.logoUrl} alt={team.name} className="w-7 h-7 object-contain bg-white p-0.5" />
                         ) : (
                           <span className="text-white text-xs font-black">{team.name.substring(0,2).toUpperCase()}</span>
                         )}
                       </div>
                       <div className="text-xl md:text-2xl font-black text-black uppercase tracking-tight truncate pr-4">
                         {team.name}
                       </div>
                    </div>

                    {/* WWCD */}
                    <div className={`flex items-center justify-center font-black text-xl border-r-[2px] border-black/20 ${team.wwcd > 0 ? 'text-black' : 'text-black/20'}`}>
                      {team.wwcd > 0 ? team.wwcd : '-'}
                    </div>

                    {/* Elims */}
                    <div className="flex items-center justify-center text-black/60 font-black text-xl border-r-[2px] border-black/20">
                      {team.eliminations}
                    </div>

                    {/* Placement */}
                    <div className="flex items-center justify-center text-black/60 font-black text-xl border-r-[2px] border-black/20">
                      {team.placement}
                    </div>

                    {/* Total Points */}
                    <div className={`flex items-center justify-center text-2xl font-black ${top3 ? 'bg-red-600 text-white' : 'text-black'}`}>
                      {team.totalPoints}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default OverallLeaderboardWidget3;

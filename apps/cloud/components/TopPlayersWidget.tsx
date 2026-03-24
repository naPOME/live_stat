import React from 'react';

export type PlayerStat = {
  eliminations?: number;
  damage?: number;
  survivalTime?: string;
  assists?: number;
  name?: string;
  imageUrl?: string;
};

interface TopPlayersWidgetProps {
  players: PlayerStat[];
  stageText?: string;
  matchText?: string;
}

export function TopPlayersWidget({
  players = [],
  stageText = "SEMI FINAL",
  matchText = "DAY 1 MATCH 1"
}: TopPlayersWidgetProps) {
  // Fill empty array with placeholders if no players provided
  const displayPlayers = players.length > 0 ? players : Array(5).fill({});

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 bg-white overflow-hidden relative font-sans">
      
      {/* Header Section */}
      <div className="flex justify-between md:justify-center items-end md:items-start mb-8 md:mb-16 relative w-full px-4 md:px-12">
        <h1 
          className="text-5xl md:text-8xl font-black text-[#dc1f26] tracking-tighter uppercase font-[Impact,Arial_Black,sans-serif]"
          style={{ transform: 'scaleY(1.3)', transformOrigin: 'bottom' }}
        >
          TOP PLAYERS
        </h1>
        
        <div className="md:absolute right-4 md:right-12 top-0 flex flex-col items-center md:items-end">
          <div 
            className="text-[#dc1f26] text-xl md:text-4xl font-black uppercase tracking-tighter font-[Impact,Arial_Black,sans-serif]"
            style={{ transform: 'scaleY(1.3)', transformOrigin: 'bottom', marginBottom: '8px' }}
          >
            {stageText}
          </div>
          <div className="bg-[#dc1f26] text-white px-3 py-1 md:py-2 text-lg md:text-3xl font-black uppercase tracking-tight font-[Impact,Arial_Black,sans-serif]">
            {matchText}
          </div>
        </div>
      </div>

      {/* Players List Container */}
      <div className="relative group w-full pt-16 md:pt-24 mt-4">
        
        {/* Navigation Arrows */}
        <button className="absolute left-0 lg:left-2 top-[60%] -translate-y-1/2 z-30 text-white/60 hover:text-white drop-shadow-md cursor-pointer transition-colors bg-black/20 hover:bg-black/50 p-2 rounded-full hidden md:block">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button className="absolute right-0 lg:right-2 top-[60%] -translate-y-1/2 z-30 text-white/60 hover:text-white drop-shadow-md cursor-pointer transition-colors bg-black/20 hover:bg-black/50 p-2 rounded-full hidden md:block">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        {/* Players Scroll Container */}
        <div className="flex gap-2 md:gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbars pb-8 px-4 md:px-12 justify-start md:justify-center">
          {displayPlayers.map((player, idx) => (
            <div key={idx} className="shrink-0 w-[200px] md:w-[250px] lg:w-[260px] snap-center flex flex-col group">
              
              {/* Red Background Card */}
              <div className="bg-[#dc1f26] w-full p-2 md:p-3 flex flex-col items-center shadow-[0_4px_10px_rgba(0,0,0,0.3)] h-full">
                
                {/* Character Image Frame */}
                <div className="w-full aspect-[4/5] bg-black/10 mb-2 md:mb-3 flex justify-center items-center overflow-hidden border-[2px] md:border-[3px] border-black bg-white">
                  {player.imageUrl ? (
                     <img src={player.imageUrl} alt={player.name || "Player"} className="w-full h-full object-cover" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center bg-gray-300">
                       <span className="text-gray-500 font-bold font-[Impact,Arial_Black,sans-serif] tracking-wider">IMAGE</span>
                     </div>
                  )}
                </div>

                <div className="w-full flex flex-col gap-1.5 mt-auto">
                  {/* Name Box */}
                  <div className="w-full h-8 md:h-10 bg-white border-[2px] md:border-[3px] border-black flex items-center justify-center font-bold text-lg md:text-xl uppercase font-[Impact,Arial_Black,sans-serif]">
                    {player.name || ""}
                  </div>

                  {/* Stats Grid */}
                  <div className="w-full grid grid-cols-2 gap-1.5">
                    
                    {/* Eliminations */}
                    <div className="flex flex-col border-[2px] md:border-[3px] border-black bg-black">
                      <div className="bg-white text-black text-center text-[10px] md:text-xs lg:text-sm font-bold py-0.5 md:py-1 font-[Impact,Arial_Black,sans-serif] tracking-[0.05em] xl:tracking-widest" style={{ transform: 'scaleY(1.2)' }}>
                        ELIMINATIONS
                      </div>
                      <div className="bg-[#dc1f26] text-white text-center text-xl md:text-2xl lg:text-3xl font-black py-1.5 md:py-2 mt-[2px] md:mt-[3px] font-[Impact,Arial_Black,sans-serif]">
                         {player.eliminations ?? ""}
                      </div>
                    </div>

                    {/* Damage */}
                    <div className="flex flex-col border-[2px] md:border-[3px] border-black bg-black">
                      <div className="bg-white text-black text-center text-[10px] md:text-xs lg:text-sm font-bold py-0.5 md:py-1 font-[Impact,Arial_Black,sans-serif] tracking-[0.05em] xl:tracking-widest" style={{ transform: 'scaleY(1.2)' }}>
                        DAMAGE
                      </div>
                      <div className="bg-[#dc1f26] text-white text-center text-xl md:text-2xl lg:text-3xl font-black py-1.5 md:py-2 mt-[2px] md:mt-[3px] font-[Impact,Arial_Black,sans-serif]">
                        {player.damage ?? ""}
                      </div>
                    </div>

                    {/* Survival Time */}
                    <div className="flex flex-col border-[2px] md:border-[3px] border-black bg-black">
                      <div className="bg-white text-black text-center text-[10px] md:text-xs lg:text-sm font-bold py-0.5 md:py-1 font-[Impact,Arial_Black,sans-serif] tracking-[0.05em] xl:tracking-widest" style={{ transform: 'scaleY(1.2)' }}>
                        SURVIVAL TIME
                      </div>
                      <div className="bg-[#dc1f26] text-white text-center text-xl md:text-2xl lg:text-3xl font-black py-1.5 md:py-2 mt-[2px] md:mt-[3px] font-[Impact,Arial_Black,sans-serif]">
                        {player.survivalTime || ""}
                      </div>
                    </div>

                    {/* Assists */}
                    <div className="flex flex-col border-[2px] md:border-[3px] border-black bg-black">
                      <div className="bg-white text-black text-center text-[10px] md:text-xs lg:text-sm font-bold py-0.5 md:py-1 font-[Impact,Arial_Black,sans-serif] tracking-[0.05em] xl:tracking-widest" style={{ transform: 'scaleY(1.2)' }}>
                        ASSISTS
                      </div>
                      <div className="bg-[#dc1f26] text-white text-center text-xl md:text-2xl lg:text-3xl font-black py-1.5 md:py-2 mt-[2px] md:mt-[3px] font-[Impact,Arial_Black,sans-serif]">
                        {player.assists ?? ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbars::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbars {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

// Default export for ease of use
export default TopPlayersWidget;

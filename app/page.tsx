"use client";

import { useEffect, useState } from "react";
import type { LeaderboardResponse } from "@/lib/types";

export default function LiveLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/live');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched live leaderboard data:", data);
      setLeaderboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      console.error("Error fetching leaderboard:", err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLeaderboard();

    // Set up polling for real-time updates
    const interval = setInterval(fetchLeaderboard, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-red-500">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Live Rankings</h1>
          <p className="text-gray-300">
            Match ID: {leaderboard.matchId} | Updated: {new Date(leaderboard.serverTime).toLocaleTimeString()}
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Team</div>
                <div className="col-span-2 text-center">Kills</div>
                <div className="col-span-2 text-center">Placement</div>
                <div className="col-span-2 text-center">Place Pts</div>
                <div className="col-span-1 text-center">Total</div>
              </div>
            </div>

            <div className="divide-y divide-gray-700">
              {leaderboard.teams.map((team, index) => (
                <div
                  key={team.teamName}
                  className={`px-6 py-4 transition-colors ${
                    index === 0 ? "bg-yellow-900/20" : 
                    index === 1 ? "bg-gray-700/50" : 
                    index === 2 ? "bg-orange-900/20" : 
                    "hover:bg-gray-700/30"
                  }`}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <div className={`text-lg font-bold ${
                        index === 0 ? "text-yellow-400" : 
                        index === 1 ? "text-gray-300" : 
                        index === 2 ? "text-orange-400" : 
                        "text-gray-400"
                      }`}>
                        #{index + 1}
                      </div>
                    </div>
                    
                    <div className="col-span-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            team.alive === false ? "bg-red-500" : "bg-green-500"
                          }`}></div>
                          <span className="font-medium">{team.teamName}</span>
                        </div>
                        {team.alive === false && (
                          <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">Eliminated</span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="text-lg font-semibold text-blue-400">{team.kills}</span>
                    </div>

                    <div className="col-span-2 text-center">
                      {team.placement ? (
                        <span className="text-lg font-medium text-purple-400">#{team.placement}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="text-lg font-medium text-green-400">{team.placementPoints}</span>
                    </div>

                    <div className="col-span-1 text-center">
                      <span className="text-xl font-bold text-white">{team.totalPoints}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {leaderboard.teams.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No teams data available</p>
                <p className="text-sm mt-2">Start the log parser to see live rankings</p>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-gray-400 text-sm">
            <p>Live point ranking system</p>
            <p className="mt-1">Placement points: 1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th-8th=1</p>
          </div>
        </div>
      </div>
    </div>
  );
}

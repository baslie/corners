import { useState, useEffect } from 'react';
import { loadPlayerData, savePlayerData, submitScore } from '../sdk/yandex';
import { DEFAULT_STATS, AI_PLAYER } from '../constants';

export function usePlayerStats() {
  const [playerStats, setPlayerStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    loadPlayerData()
      .then((data) => {
        if (data && typeof data.totalGames === 'number') {
          setPlayerStats({ ...DEFAULT_STATS, ...data });
        }
      })
      .catch(() => {});
  }, []);

  function recordGameResult(state) {
    const elapsedMs = Date.now() - state.startTime;
    const playerWon = state.winner !== AI_PLAYER;
    const newStats = {
      ...playerStats,
      totalGames: (playerStats.totalGames || 0) + 1,
      wins: (playerStats.wins || 0) + (playerWon ? 1 : 0),
      losses: (playerStats.losses || 0) + (playerWon ? 0 : 1),
    };
    if (playerWon) {
      const moves = state.moveCount[2];
      if (newStats.bestMoves === null || moves < newStats.bestMoves) {
        newStats.bestMoves = moves;
      }
      if (newStats.bestTime === null || elapsedMs < newStats.bestTime) {
        newStats.bestTime = elapsedMs;
      }
      submitScore('main', moves);
    }
    setPlayerStats(newStats);
    savePlayerData(newStats);
  }

  return { playerStats, recordGameResult };
}

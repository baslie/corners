import { useReducer } from 'react';
import { usePlayerStats } from './hooks/usePlayerStats';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';

export default function App() {
  const [screen, setScreen] = useReducer((_, a) => a, { type: 'lobby' });
  const { playerStats, recordGameResult } = usePlayerStats();

  if (screen.type === 'game') {
    return (
      <Game
        settings={screen.settings}
        onMenu={() => setScreen({ type: 'lobby' })}
        onGameEnd={recordGameResult}
      />
    );
  }

  return (
    <Lobby
      onStart={(settings) => setScreen({ type: 'game', settings })}
      playerStats={playerStats}
    />
  );
}

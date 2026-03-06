import { useReducer, useCallback, useEffect } from 'react';
import { gameReducer, createInitialGameState } from '../game/reducer';
import { gameplayStart, gameplayStop, showInterstitial, showRewarded } from '../sdk/yandex';
import { AI_PLAYER } from '../constants';
import { buildMovePath } from '../utils';
import { useAnimation } from '../hooks/useAnimation';
import { useGameTimer } from '../hooks/useGameTimer';
import { useAiTurn } from '../hooks/useAiTurn';
import { Board } from './Board';
import { InfoPanel } from './InfoPanel';
import { GameOver } from './GameOver';

export function Game({ settings, onMenu, onGameEnd }) {
  const [state, dispatch] = useReducer(gameReducer, settings, createInitialGameState);
  const { ghostPiece, hiddenCell, animate, animating } = useAnimation();
  const { elapsed, resetTimer } = useGameTimer(state.startTime, !!state.winner);
  const { isThinking, resetAi } = useAiTurn({ state, difficulty: settings.difficulty, animate, animating, dispatch });

  const isVsComputer = !!settings.difficulty;

  useEffect(() => {
    gameplayStart();
    return () => gameplayStop();
  }, []);

  useEffect(() => {
    if (state.winner) {
      gameplayStop();
      if (isVsComputer && onGameEnd) {
        onGameEnd(state);
      }
    }
  }, [state.winner]);

  const handlePlayerMove = useCallback(({ row, col, path, player }) => {
    animate(path, player, () => {
      dispatch({ type: 'MAKE_MOVE', row, col });
    });
  }, [animate]);

  const handleRematch = useCallback(async () => {
    await showInterstitial();
    dispatch({ type: 'RESET' });
    resetAi();
    resetTimer();
  }, [resetAi, resetTimer]);

  const handleBackToMenu = useCallback(async () => {
    await showInterstitial();
    onMenu();
  }, [onMenu]);

  const handleUndo = useCallback(async () => {
    if (state.freeUndosLeft > 0) {
      dispatch({ type: 'UNDO' });
    } else {
      const rewarded = await showRewarded();
      if (rewarded) {
        dispatch({ type: 'UNDO' });
      }
    }
  }, [state.freeUndosLeft]);

  const isPlayerTurnBlocked = isVsComputer && state.currentPlayer === AI_PLAYER;

  return (
    <div className="min-h-screen bg-bg p-2 sm:p-4">
      <div className="grid lg:grid-cols-[minmax(0,min(70vh,600px))_auto] grid-cols-1 gap-3 sm:gap-4 max-w-5xl mx-auto items-start justify-center">
        <div className="lg:col-span-2 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-accent">{'\u0423\u0433\u043e\u043b\u043a\u0438'}</h1>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleUndo}
              disabled={state.history.length === 0 || isThinking || !!state.winner || animating.current}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-accent-soft text-accent border border-accent/20 rounded-[var(--radius-md)] hover:border-accent/40 cursor-pointer transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.freeUndosLeft > 0 ? `\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c (${state.freeUndosLeft})` : '\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c (\u0440\u0435\u043a\u043b\u0430\u043c\u0430)'}
            </button>
            <button
              onClick={() => dispatch({ type: 'SURRENDER' })}
              disabled={!!state.winner || isThinking || animating.current}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-danger-soft text-danger border border-danger/20 rounded-[var(--radius-md)] hover:opacity-80 cursor-pointer transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {'\u0421\u0434\u0430\u0442\u044c\u0441\u044f'}
            </button>
            <button
              onClick={handleBackToMenu}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-surface border border-border text-text-dim rounded-[var(--radius-md)] hover:border-border-strong cursor-pointer transition-all duration-150 active:scale-95"
            >
              {'\u0412 \u043c\u0435\u043d\u044e'}
            </button>
          </div>
        </div>
        <div className="w-full max-w-[min(95vw,600px)]">
          <Board
            state={state}
            dispatch={dispatch}
            isLocked={isPlayerTurnBlocked || animating.current}
            hiddenCell={hiddenCell}
            onPlayerMove={handlePlayerMove}
            ghostPiece={ghostPiece}
          />
        </div>
        <InfoPanel state={state} isThinking={isThinking} elapsed={elapsed} />
      </div>

      {state.winner && (
        <GameOver
          winner={state.winner}
          moveCount={state.moveCount}
          onRematch={handleRematch}
          onMenu={handleBackToMenu}
          isVsComputer={isVsComputer}
          elapsed={elapsed}
        />
      )}
    </div>
  );
}

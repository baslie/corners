import { useState, useEffect, useRef } from 'react';
import { getValidMoves } from '../game/logic';
import { getBestMove, hashBoard } from '../game/ai';
import { buildMovePath } from '../utils';
import { AI_PLAYER, AI_MOVE_DELAY } from '../constants';

export function useAiTurn({ state, difficulty, animate, animating, dispatch }) {
  const [isThinking, setIsThinking] = useState(false);
  const aiRunning = useRef(false);

  const isVsComputer = !!difficulty;

  useEffect(() => {
    if (!isVsComputer || state.winner || state.currentPlayer !== AI_PLAYER) {
      return;
    }

    if (aiRunning.current || animating.current) return;
    aiRunning.current = true;
    setIsThinking(true);

    const timer = setTimeout(() => {
      const positionFrequency = new Map();
      for (const entry of state.history) {
        const h = hashBoard(entry.board);
        positionFrequency.set(h, (positionFrequency.get(h) || 0) + 1);
      }
      const currentHash = hashBoard(state.board);
      positionFrequency.set(currentHash, (positionFrequency.get(currentHash) || 0) + 1);

      const move = getBestMove(
        state.board, state.zones, AI_PLAYER, difficulty,
        positionFrequency, state.moveCount[AI_PLAYER]
      );
      if (move) {
        const aiValidMoves = getValidMoves(state.board, move.fromRow, move.fromCol, state.zones, AI_PLAYER);
        const path = buildMovePath(
          { row: move.fromRow, col: move.fromCol },
          move.toRow, move.toCol,
          aiValidMoves
        );

        animate(path, AI_PLAYER, () => {
          dispatch({
            type: 'MAKE_MOVE_AI',
            fromRow: move.fromRow,
            fromCol: move.fromCol,
            toRow: move.toRow,
            toCol: move.toCol,
          });
          setIsThinking(false);
          aiRunning.current = false;
        });
      } else {
        setIsThinking(false);
        aiRunning.current = false;
      }
    }, AI_MOVE_DELAY);

    return () => {
      clearTimeout(timer);
      if (!animating.current) {
        setIsThinking(false);
        aiRunning.current = false;
      }
    };
  }, [state.currentPlayer, state.winner, state.board, isVsComputer, difficulty, animate, state.zones, animating]);

  const resetAi = () => {
    setIsThinking(false);
    aiRunning.current = false;
  };

  return { isThinking, resetAi };
}

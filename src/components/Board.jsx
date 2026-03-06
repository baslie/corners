import { useRef, useState, useMemo, useCallback } from 'react';
import { getJumpPath } from '../game/logic';
import { buildMovePath } from '../utils';
import { AI_PLAYER } from '../constants';
import { Cell } from './Cell';
import { GhostPiece } from './GhostPiece';

export function Board({ state, dispatch, isLocked, hiddenCell, onPlayerMove, ghostPiece }) {
  const { board, zones, selectedPiece, validMoves, currentPlayer } = state;
  const boardRef = useRef(null);
  const [hoveredPath, setHoveredPath] = useState(new Set());

  const stepSet = useMemo(() => {
    if (!validMoves) return new Set();
    return new Set(validMoves.steps.map(([r, c]) => `${r},${c}`));
  }, [validMoves]);

  const jumpSet = useMemo(() => {
    if (!validMoves) return new Set();
    return new Set(validMoves.jumps.map(([r, c]) => `${r},${c}`));
  }, [validMoves]);

  const handleMouseEnter = useCallback(
    (row, col) => {
      if (!validMoves || !jumpSet.has(`${row},${col}`)) return;
      const path = getJumpPath(validMoves.jumpPaths, row, col);
      setHoveredPath(new Set(path.map(([r, c]) => `${r},${c}`)));
    },
    [validMoves, jumpSet],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPath(new Set());
  }, []);

  const handleClick = useCallback(
    (row, col) => {
      if (state.winner || isLocked) return;
      const k = `${row},${col}`;

      if (selectedPiece && (stepSet.has(k) || jumpSet.has(k))) {
        const path = buildMovePath(selectedPiece, row, col, validMoves);
        setHoveredPath(new Set());
        if (onPlayerMove) {
          onPlayerMove({ row, col, path, player: currentPlayer });
        } else {
          dispatch({ type: 'MAKE_MOVE', row, col });
        }
        return;
      }

      if (board[row][col] === currentPlayer) {
        dispatch({ type: 'SELECT_PIECE', row, col });
        setHoveredPath(new Set());
      } else {
        dispatch({ type: 'DESELECT' });
        setHoveredPath(new Set());
      }
    },
    [board, currentPlayer, selectedPiece, stepSet, jumpSet, state.winner, isLocked, dispatch, onPlayerMove, validMoves],
  );

  const isVsComputer = !!state.settings.difficulty;

  return (
    <div className="relative" ref={boardRef}>
      <div
        className="grid gap-0 border border-border-strong bg-surface rounded-[var(--radius-md)] overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${board[0].length}, 1fr)`,
        }}
      >
        {board.map((row, ri) =>
          row.map((cell, ci) => {
            const k = `${ri},${ci}`;
            const isHidden = hiddenCell && hiddenCell.row === ri && hiddenCell.col === ci;
            const isPlayerPiece = !isVsComputer
              ? cell === currentPlayer
              : cell !== null && cell !== AI_PLAYER && cell === currentPlayer;
            return (
              <Cell
                key={k}
                value={cell}
                isSelected={selectedPiece?.row === ri && selectedPiece?.col === ci}
                isStep={stepSet.has(k)}
                isJump={jumpSet.has(k)}
                isP1Zone={zones.player1.has(k)}
                isP2Zone={zones.player2.has(k)}
                isOnPath={hoveredPath.has(k)}
                isCheckerDark={(ri + ci) % 2 === 1}
                isPlayerPiece={isPlayerPiece}
                currentPlayer={currentPlayer}
                isHidden={isHidden}
                onClick={() => handleClick(ri, ci)}
                onMouseEnter={() => handleMouseEnter(ri, ci)}
                onMouseLeave={handleMouseLeave}
              />
            );
          }),
        )}
      </div>
      {ghostPiece && (
        <GhostPiece
          player={ghostPiece.player}
          row={ghostPiece.row}
          col={ghostPiece.col}
          rows={board.length}
          cols={board[0].length}
        />
      )}
    </div>
  );
}

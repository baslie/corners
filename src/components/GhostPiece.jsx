import { pieceGradient } from '../utils';
import { PIECE_SIZE_PERCENT } from '../constants';

export function GhostPiece({ player, row, col, rows, cols }) {
  const size = PIECE_SIZE_PERCENT;
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const offset = (100 - size) / 2 / 100;

  return (
    <div
      className="ghost-piece rounded-full"
      style={{
        left: `${col * cellW + offset * cellW}%`,
        top: `${row * cellH + offset * cellH}%`,
        width: `${cellW * size / 100}%`,
        height: `${cellH * size / 100}%`,
        background: pieceGradient(player),
        border: `2px solid ${player === 1 ? 'var(--color-p1-dark)' : 'var(--color-p2-dark)'}`,
        boxShadow: player === 1 ? 'var(--shadow-ghost-p1)' : 'var(--shadow-ghost-p2)',
        opacity: 0.9,
      }}
    />
  );
}

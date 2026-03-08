import { getJumpPath } from './game/logic';
import { PIECE_SIZE_PERCENT } from './constants';

export function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function pieceGradient(player) {
  const color = player === 1 ? 'p1' : 'p2';
  return `radial-gradient(ellipse 60% 50% at 45% 35%, var(--color-piece-highlight), transparent 60%), radial-gradient(ellipse 100% 100% at 50% 50%, var(--color-${color}) 0%, var(--color-${color}-dark) 100%)`;
}

export function buildMovePath(selectedPiece, targetRow, targetCol, validMoves) {
  const targetKey = `${targetRow},${targetCol}`;
  if (validMoves?.jumpPaths && validMoves.jumpPaths.has(targetKey)) {
    const jumpPath = getJumpPath(validMoves.jumpPaths, targetRow, targetCol);
    return jumpPath;
  }
  return [[selectedPiece.row, selectedPiece.col], [targetRow, targetCol]];
}

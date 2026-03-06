import { pieceGradient } from '../utils';

export function Cell({ value, isSelected, isStep, isJump, isP1Zone, isP2Zone, isOnPath, isCheckerDark, isPlayerPiece, currentPlayer, onClick, onMouseEnter, onMouseLeave, isHidden }) {
  let bg = isCheckerDark ? 'bg-cell-dark' : 'bg-cell-light';
  let ring = '';
  const p = currentPlayer === 1 ? 'p1' : 'p2';
  if (isOnPath) { bg = 'bg-cell-path'; ring = 'ring-2 ring-path-ring ring-inset'; }
  if (isStep) bg = `bg-cell-step-${p}`;
  else if (isJump) { bg = isOnPath ? 'bg-cell-path' : `bg-cell-jump-${p}`; if (isOnPath) ring = 'ring-2 ring-path-ring ring-inset'; }
  else if (isP1Zone) bg = isCheckerDark ? 'bg-zone-p1-strong' : 'bg-zone-p1';
  else if (isP2Zone) bg = isCheckerDark ? 'bg-zone-p2-strong' : 'bg-zone-p2';
  if (isSelected) { ring = 'ring-2 ring-accent/50 ring-inset'; bg += ' bg-cell-selected'; }

  return (
    <div
      className={`w-full aspect-square flex items-center justify-center cursor-pointer select-none ${bg} ${ring} ${!value && !isStep && !isJump ? 'hover:bg-cell-hover' : ''}`}
      style={{ touchAction: 'manipulation', borderWidth: '0.5px', borderColor: 'var(--color-border)' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {value === 1 && !isHidden && (
        <div
          className={`w-[70%] h-[70%] rounded-full border-2 border-p1-dark shadow-[var(--shadow-piece-p1)] ${isPlayerPiece ? 'transition-transform duration-150 hover:scale-110' : ''}`}
          style={{ background: pieceGradient(1) }}
        />
      )}
      {value === 2 && !isHidden && (
        <div
          className={`w-[70%] h-[70%] rounded-full border-2 border-p2-dark shadow-[var(--shadow-piece-p2)] ${isPlayerPiece ? 'transition-transform duration-150 hover:scale-110' : ''}`}
          style={{ background: pieceGradient(2) }}
        />
      )}
      {value === null && (isStep || isJump) && (
        <div className={`w-[30%] h-[30%] rounded-full ${currentPlayer === 1 ? 'bg-p1/50' : 'bg-p2/50'}`} />
      )}
    </div>
  );
}

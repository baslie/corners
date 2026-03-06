import { useState, useCallback, useRef } from 'react';
import { ANIMATION_STEP_MS } from '../constants';

export function useAnimation() {
  const [ghostPiece, setGhostPiece] = useState(null);
  const [hiddenCell, setHiddenCell] = useState(null);
  const animating = useRef(false);

  const animate = useCallback((path, player, onDone) => {
    if (path.length < 2) {
      onDone();
      return;
    }

    animating.current = true;
    const [startR, startC] = path[0];
    setHiddenCell({ row: startR, col: startC });
    setGhostPiece({ player, row: startR, col: startC });

    let step = 0;
    const nextStep = () => {
      step++;
      if (step >= path.length) {
        setGhostPiece(null);
        setHiddenCell(null);
        animating.current = false;
        onDone();
        return;
      }
      const [r, c] = path[step];
      setGhostPiece({ player, row: r, col: c });
      setTimeout(nextStep, ANIMATION_STEP_MS);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nextStep();
      });
    });
  }, []);

  return { ghostPiece, hiddenCell, animate, animating };
}

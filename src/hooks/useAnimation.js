import { useState, useCallback, useRef } from 'react';
import { ANIMATION_STEP_MS } from '../constants';
import moveSoundUrl from '../assets/move.ogg';

export function useAnimation() {
  const [ghostPiece, setGhostPiece] = useState(null);
  const [hiddenCell, setHiddenCell] = useState(null);
  const animating = useRef(false);

  const soundRef = useRef(null);
  if (!soundRef.current) {
    soundRef.current = new Audio(moveSoundUrl);
    soundRef.current.volume = 0.5;
  }
  const playMoveSound = useCallback(() => {
    const s = soundRef.current;
    s.currentTime = 0;
    s.play().catch(() => {});
  }, []);

  const animate = useCallback((path, player, onDone) => {
    if (path.length < 2) {
      playMoveSound();
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
      playMoveSound();
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
  }, [playMoveSound]);

  return { ghostPiece, hiddenCell, animate, animating };
}

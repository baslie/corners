import { useState, useEffect } from 'react';

export function useGameTimer(startTime, isPaused) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  const reset = () => setElapsed(0);

  return { elapsed, resetTimer: reset };
}

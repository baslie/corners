import { getCornerK } from '../game/logic';

export function BoardPreview({ rows, cols, cornerSize }) {
  const K = getCornerK(cornerSize);
  const cellSize = Math.max(4, Math.min(20, Math.floor(200 / Math.max(rows, cols))));

  return (
    <div
      className="grid border border-border-strong rounded-[var(--radius-xs)] overflow-hidden mx-auto"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gap: 0,
      }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const isP1 = r < K && c < K;
          const isP2 = r >= rows - K && c >= cols - K;
          return (
            <div
              key={`${r},${c}`}
              className="bg-surface flex items-center justify-center border-r border-b border-border/50 last:border-r-0"
            >
              {(isP1 || isP2) && (
                <div
                  className={`rounded-full ${isP1 ? 'bg-p1' : 'bg-p2'}`}
                  style={{ width: '70%', height: '70%' }}
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

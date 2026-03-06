import { formatTime } from '../utils';
import { AI_PLAYER } from '../constants';

export function GameOver({ winner, moveCount, onRematch, onMenu, isVsComputer, elapsed }) {
  let title;
  if (isVsComputer) {
    title = winner === AI_PLAYER ? '\u041a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440 \u043f\u043e\u0431\u0435\u0434\u0438\u043b!' : '\u0412\u044b \u043f\u043e\u0431\u0435\u0434\u0438\u043b\u0438!';
  } else {
    title = `\u0418\u0433\u0440\u043e\u043a ${winner} \u043f\u043e\u0431\u0435\u0434\u0438\u043b!`;
  }

  const iconBg = winner === AI_PLAYER ? 'bg-p1-soft' : 'bg-p2-soft';

  return (
    <div className="fixed inset-0 bg-backdrop backdrop-blur-md flex items-center justify-center z-50 game-over-backdrop">
      <div className="bg-surface border border-border rounded-[var(--radius-xl)] p-8 max-w-sm w-full mx-4 text-center game-over-modal">
        <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center text-3xl mx-auto mb-4`}>
          {winner === AI_PLAYER ? '\ud83e\udd16' : '\ud83c\udf89'}
        </div>
        <h2 className="text-2xl font-bold mb-2 text-text">{title}</h2>
        <div className="text-text-dim mb-2">
          {isVsComputer
            ? `\u0425\u043e\u0434\u043e\u0432: \u0412\u044b \u2014 ${moveCount[2]}, \u041a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440 \u2014 ${moveCount[1]}`
            : `\u0425\u043e\u0434\u043e\u0432: \u0418\u0433\u0440\u043e\u043a 1 \u2014 ${moveCount[1]}, \u0418\u0433\u0440\u043e\u043a 2 \u2014 ${moveCount[2]}`}
        </div>
        <div className="text-text-muted text-sm mb-6">
          {'\u0412\u0440\u0435\u043c\u044f'}: {formatTime(elapsed)}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRematch}
            className="px-5 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover font-medium cursor-pointer transition-all duration-150 active:scale-95"
          >
            {'\u0420\u0435\u0432\u0430\u043d\u0448'}
          </button>
          <button
            onClick={onMenu}
            className="px-5 py-2.5 bg-surface-alt text-text-dim border border-border rounded-[var(--radius-md)] hover:border-border-strong hover:bg-border font-medium cursor-pointer transition-all duration-150 active:scale-95"
          >
            {'\u0412 \u043c\u0435\u043d\u044e'}
          </button>
        </div>
      </div>
    </div>
  );
}

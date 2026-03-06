import { useMemo } from 'react';
import { formatTime } from '../utils';
import { AI_PLAYER, DIFFICULTY_LABELS } from '../constants';

function ProgressBar({ label, player, current, total }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  const gradientStyle = player === 1
    ? { background: 'linear-gradient(90deg, var(--color-p1), var(--color-p1-light))' }
    : { background: 'linear-gradient(90deg, var(--color-p2), var(--color-p2-light))' };
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-text-dim mb-0.5">
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, ...gradientStyle }} />
      </div>
    </div>
  );
}

export function InfoPanel({ state, isThinking, elapsed }) {
  const { currentPlayer, moveCount, zones, board, settings } = state;

  const progress = useMemo(() => {
    const p1Finish = zones.player2;
    const p2Finish = zones.player1;
    let p1 = 0, p2 = 0;
    for (const k of p1Finish) {
      const [r, c] = k.split(',').map(Number);
      if (board[r][c] === 1) p1++;
    }
    for (const k of p2Finish) {
      const [r, c] = k.split(',').map(Number);
      if (board[r][c] === 2) p2++;
    }
    return {
      p1: { current: p1, total: p1Finish.size },
      p2: { current: p2, total: p2Finish.size },
    };
  }, [board, zones]);

  const isVsComputer = !!settings.difficulty;
  const turnLabel = isVsComputer
    ? (currentPlayer === AI_PLAYER ? '\u041a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440' : '\u0412\u044b')
    : `\u0418\u0433\u0440\u043e\u043a ${currentPlayer}`;

  return (
    <div className="w-full max-w-[min(95vw,600px)] lg:w-auto lg:max-w-none flex flex-col gap-2 lg:gap-4 p-3 lg:p-4 bg-surface-alt rounded-[var(--radius-lg)] border border-border lg:min-w-[220px]">
      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:gap-0">

        <div className="text-center min-w-0">
          <div className="text-xs lg:text-sm text-text-dim lg:mb-1">
            <span className="lg:hidden">{'\u0425\u043e\u0434'}</span>
            <span className="hidden lg:inline">{'\u0421\u0435\u0439\u0447\u0430\u0441 \u0445\u043e\u0434\u0438\u0442'}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 lg:gap-2 text-sm lg:text-lg font-bold text-text">
            <div className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full shrink-0 ${currentPlayer === 1 ? 'bg-p1 shadow-[0_0_8px_var(--color-p1-glow)]' : 'bg-p2 shadow-[0_0_8px_var(--color-p2-glow)]'}`} />
            <span className="truncate">{turnLabel}</span>
          </div>
          {isThinking && (
            <div className="flex items-center justify-center gap-1.5 mt-1 lg:mt-2 text-xs lg:text-sm text-text-dim">
              <div className="flex gap-1">
                <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-p1 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-p1 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-p1 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {'\u0434\u0443\u043c\u0430\u0435\u0442...'}
            </div>
          )}
        </div>

        <div className="lg:border-t lg:border-border lg:pt-3 lg:mt-4 min-w-0">
          <div className="text-xs lg:text-sm text-text-dim lg:mb-2">
            <span className="lg:hidden">{'\u0425\u043e\u0434\u044b'}</span>
            <span className="hidden lg:inline">{'\u0425\u043e\u0434\u043e\u0432 \u0441\u0434\u0435\u043b\u0430\u043d\u043e'}</span>
          </div>
          <div className="flex gap-2 lg:justify-between text-xs lg:text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-p1 inline-block shrink-0" />
              <span className="lg:hidden">{isVsComputer ? '\u0418\u0418' : '\u04181'}</span>
              <span className="hidden lg:inline">{isVsComputer ? '\u0418\u0418' : '\u0418\u0433\u0440\u043e\u043a 1'}</span>: {moveCount[1]}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-p2 inline-block shrink-0" />
              <span className="lg:hidden">{isVsComputer ? '\u0412\u044b' : '\u04182'}</span>
              <span className="hidden lg:inline">{isVsComputer ? '\u0412\u044b' : '\u0418\u0433\u0440\u043e\u043a 2'}</span>: {moveCount[2]}
            </span>
          </div>
        </div>

        <div className="lg:border-t lg:border-border lg:pt-3 lg:mt-4 text-center min-w-0">
          <div className="text-xs lg:text-sm text-text-dim">{'\u0412\u0440\u0435\u043c\u044f'}</div>
          <div className="text-sm lg:text-lg font-semibold tabular-nums text-text tracking-wider">{formatTime(elapsed)}</div>
        </div>

      </div>

      <div className="border-t border-border pt-2 lg:pt-3">
        <div className="hidden lg:block text-sm text-text-dim mb-2">{'\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441'}</div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-0">
          <ProgressBar
            label={isVsComputer ? '\u041a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440' : '\u0418\u0433\u0440\u043e\u043a 1'}
            player={1}
            current={progress.p1.current}
            total={progress.p1.total}
          />
          <ProgressBar
            label={isVsComputer ? '\u0412\u044b' : '\u0418\u0433\u0440\u043e\u043a 2'}
            player={2}
            current={progress.p2.current}
            total={progress.p2.total}
          />
        </div>
      </div>

      <div className="border-t border-border pt-1 lg:pt-3 text-xs text-text-muted text-center">
        <span className="lg:hidden">{settings.rows}&times;{settings.cols}{isVsComputer && ` \u00b7 ${DIFFICULTY_LABELS[settings.difficulty]}`}</span>
        <div className="hidden lg:block space-y-0.5">
          <div>{'\u041f\u043e\u043b\u0435'} {settings.rows}&times;{settings.cols}</div>
          {isVsComputer && (
            <div>{'\u0421\u043b\u043e\u0436\u043d\u043e\u0441\u0442\u044c'}: {DIFFICULTY_LABELS[settings.difficulty]}</div>
          )}
        </div>
      </div>
    </div>
  );
}

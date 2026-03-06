import { useReducer } from 'react';
import { BOARD_PRESETS, DEFAULT_SETTINGS, DIFFICULTY_OPTIONS } from '../constants';
import { formatTime } from '../utils';
import { BoardPreview } from './BoardPreview';

export function Lobby({ onStart, playerStats }) {
  const [settings, setSettings] = useReducer(
    (s, a) => ({ ...s, ...a }),
    DEFAULT_SETTINGS,
  );

  const activePreset = BOARD_PRESETS.find((p) => p.rows === settings.rows) || BOARD_PRESETS[0];

  return (
    <div className="min-h-screen lobby-bg flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-[var(--radius-2xl)] border border-border p-6 max-w-md w-full lobby-card">
        <h1 className="text-3xl font-bold text-center mb-2 tracking-tight text-accent">{'\u0423\u0433\u043e\u043b\u043a\u0438'}</h1>
        <p className="text-center text-text-dim text-sm mb-4">
          {'\u041f\u0435\u0440\u0435\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u0432\u0441\u0435 \u0444\u0438\u0448\u043a\u0438 \u0432 \u043f\u0440\u043e\u0442\u0438\u0432\u043e\u043f\u043e\u043b\u043e\u0436\u043d\u044b\u0439 \u0443\u0433\u043e\u043b \u0440\u0430\u043d\u044c\u0448\u0435 \u0441\u043e\u043f\u0435\u0440\u043d\u0438\u043a\u0430'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text mb-2 block">{'\u0420\u0430\u0437\u043c\u0435\u0440 \u0434\u043e\u0441\u043a\u0438'}</label>
            <div className="flex gap-2">
              {BOARD_PRESETS.map((preset) => {
                const active = activePreset.key === preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={() => setSettings({ rows: preset.rows, cols: preset.cols, cornerSize: preset.cornerSize })}
                    className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-medium transition-all cursor-pointer
                      ${active ? 'bg-accent text-white' : 'bg-surface-alt text-text-dim border border-border hover:border-border-strong'}`}
                  >
                    <div>{preset.label}</div>
                    <div className={`text-xs ${active ? 'text-white/75' : 'text-text-muted'}`}>{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text mb-2 block">{'\u0421\u043b\u043e\u0436\u043d\u043e\u0441\u0442\u044c \u0418\u0418'}</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSettings({ difficulty: value })}
                  className={`flex-1 py-2 px-3 rounded-[var(--radius-md)] text-sm font-medium transition-all cursor-pointer
                    ${settings.difficulty === value ? 'bg-accent text-white' : 'bg-surface-alt text-text-dim border border-border hover:border-border-strong'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-3">
            <BoardPreview rows={settings.rows} cols={settings.cols} cornerSize={settings.cornerSize} />
          </div>

          {playerStats.totalGames > 0 && (
            <div className="bg-surface-alt rounded-[var(--radius-md)] p-3 border border-border">
              <div className="text-sm font-medium text-text mb-2">{'\u0412\u0430\u0448\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430'}</div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="text-text-muted text-xs">{'\u0418\u0433\u0440'}</div>
                  <div className="font-semibold text-text">{playerStats.totalGames}</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs">{'\u041f\u043e\u0431\u0435\u0434'}</div>
                  <div className="font-semibold text-success">{playerStats.wins}</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs">{'\u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u0439'}</div>
                  <div className="font-semibold text-danger">{playerStats.losses}</div>
                </div>
              </div>
              {(playerStats.bestMoves !== null || playerStats.bestTime !== null) && (
                <div className="mt-2 pt-2 border-t border-border flex justify-around text-xs text-text-dim">
                  {playerStats.bestMoves !== null && (
                    <span>{'\u041b\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442'}: {playerStats.bestMoves} {'\u0445\u043e\u0434\u043e\u0432'}</span>
                  )}
                  {playerStats.bestTime !== null && (
                    <span>{'\u041b\u0443\u0447\u0448\u0435\u0435 \u0432\u0440\u0435\u043c\u044f'}: {formatTime(playerStats.bestTime)}</span>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => onStart(settings)}
            className="btn-shimmer w-full py-3 bg-accent text-white rounded-[var(--radius-md)] text-lg font-semibold hover:bg-accent-hover transition-all duration-150 active:scale-95 cursor-pointer"
          >
            {'\u041d\u0430\u0447\u0430\u0442\u044c \u0438\u0433\u0440\u0443'}
          </button>
        </div>
      </div>
    </div>
  );
}

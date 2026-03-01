import { useReducer, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  createBoard,
  getCornerK,
  getMaxCornerSize,
  getValidMoves,
  makeMove,
  checkWin,
} from './game/logic';
import { getBestMove } from './game/ai';

// ===================== Reducer =====================

const initialSettings = {
  rows: 8,
  cols: 8,
  cornerSize: 'medium',
  firstMove: 'player',
  difficulty: 'medium',
};

function createInitialGameState(settings) {
  const { board, zones } = createBoard(settings.rows, settings.cols, settings.cornerSize);
  let firstPlayer = 1;
  if (settings.firstMove === 'computer') firstPlayer = 2;
  else if (settings.firstMove === 'random') firstPlayer = Math.random() < 0.5 ? 1 : 2;

  return {
    board,
    zones,
    currentPlayer: firstPlayer,
    selectedPiece: null,
    validMoves: null,
    moveCount: { 1: 0, 2: 0 },
    winner: null,
    settings,
  };
}

const AI_PLAYER = 2;

function gameReducer(state, action) {
  switch (action.type) {
    case 'SELECT_PIECE': {
      const { row, col } = action;
      if (state.board[row][col] !== state.currentPlayer) {
        return { ...state, selectedPiece: null, validMoves: null };
      }
      const validMoves = getValidMoves(state.board, row, col, state.zones, state.currentPlayer);
      return { ...state, selectedPiece: { row, col }, validMoves };
    }
    case 'MAKE_MOVE': {
      const { row, col } = action;
      const { selectedPiece, currentPlayer } = state;
      const newBoard = makeMove(state.board, selectedPiece.row, selectedPiece.col, row, col);
      const winner = checkWin(newBoard, state.zones);
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      return {
        ...state,
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: null,
        moveCount: { ...state.moveCount, [currentPlayer]: state.moveCount[currentPlayer] + 1 },
        winner,
      };
    }
    case 'MAKE_MOVE_AI': {
      const { fromRow, fromCol, toRow, toCol } = action;
      const { currentPlayer } = state;
      const newBoard = makeMove(state.board, fromRow, fromCol, toRow, toCol);
      const winner = checkWin(newBoard, state.zones);
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      return {
        ...state,
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: null,
        moveCount: { ...state.moveCount, [currentPlayer]: state.moveCount[currentPlayer] + 1 },
        winner,
      };
    }
    case 'DESELECT':
      return { ...state, selectedPiece: null, validMoves: null };
    case 'RESET':
      return createInitialGameState(state.settings);
    default:
      return state;
  }
}

// ===================== Компоненты =====================

function Cell({ value, isSelected, isStep, isJump, isP1Zone, isP2Zone, onClick }) {
  let bg = '';
  if (isSelected) bg = 'ring-3 ring-yellow-400 ring-inset';
  if (isStep) bg += ' bg-green-400/40';
  else if (isJump) bg += ' bg-orange-400/40';
  else if (isP1Zone) bg += ' bg-blue-100';
  else if (isP2Zone) bg += ' bg-red-100';

  return (
    <div
      className={`w-full aspect-square border border-gray-300 flex items-center justify-center cursor-pointer select-none ${bg}`}
      onClick={onClick}
    >
      {value === 1 && (
        <div className="w-[70%] h-[70%] rounded-full bg-blue-500 shadow-md border-2 border-blue-700" />
      )}
      {value === 2 && (
        <div className="w-[70%] h-[70%] rounded-full bg-red-500 shadow-md border-2 border-red-700" />
      )}
      {value === null && (isStep || isJump) && (
        <div className={`w-[30%] h-[30%] rounded-full ${isStep ? 'bg-green-500/60' : 'bg-orange-500/60'}`} />
      )}
    </div>
  );
}

function Board({ state, dispatch, isLocked }) {
  const { board, zones, selectedPiece, validMoves, currentPlayer } = state;

  const stepSet = useMemo(() => {
    if (!validMoves) return new Set();
    return new Set(validMoves.steps.map(([r, c]) => `${r},${c}`));
  }, [validMoves]);

  const jumpSet = useMemo(() => {
    if (!validMoves) return new Set();
    return new Set(validMoves.jumps.map(([r, c]) => `${r},${c}`));
  }, [validMoves]);

  const handleClick = useCallback(
    (row, col) => {
      if (state.winner || isLocked) return;
      const k = `${row},${col}`;

      if (selectedPiece && (stepSet.has(k) || jumpSet.has(k))) {
        dispatch({ type: 'MAKE_MOVE', row, col });
        return;
      }

      if (board[row][col] === currentPlayer) {
        dispatch({ type: 'SELECT_PIECE', row, col });
      } else {
        dispatch({ type: 'DESELECT' });
      }
    },
    [board, currentPlayer, selectedPiece, stepSet, jumpSet, state.winner, isLocked, dispatch],
  );

  return (
    <div
      className="grid gap-0 border border-gray-400 bg-white"
      style={{
        gridTemplateColumns: `repeat(${board[0].length}, 1fr)`,
      }}
    >
      {board.map((row, ri) =>
        row.map((cell, ci) => {
          const k = `${ri},${ci}`;
          return (
            <Cell
              key={k}
              value={cell}
              isSelected={selectedPiece?.row === ri && selectedPiece?.col === ci}
              isStep={stepSet.has(k)}
              isJump={jumpSet.has(k)}
              isP1Zone={zones.player1.has(k)}
              isP2Zone={zones.player2.has(k)}
              onClick={() => handleClick(ri, ci)}
            />
          );
        }),
      )}
    </div>
  );
}

function InfoPanel({ state, isThinking }) {
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
    ? (currentPlayer === AI_PLAYER ? 'Компьютер' : 'Вы')
    : `Игрок ${currentPlayer}`;

  const difficultyLabel = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 min-w-[220px]">
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-1">Сейчас ходит</div>
        <div className="flex items-center justify-center gap-2 text-lg font-bold">
          <div className={`w-5 h-5 rounded-full ${currentPlayer === 1 ? 'bg-blue-500' : 'bg-red-500'}`} />
          {turnLabel}
        </div>
        {isThinking && (
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            думает...
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="text-sm text-gray-500 mb-2">Ходов сделано</div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            {isVsComputer ? 'Вы' : 'Игрок 1'}: {moveCount[1]}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            {isVsComputer ? 'ИИ' : 'Игрок 2'}: {moveCount[2]}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="text-sm text-gray-500 mb-2">Прогресс</div>
        <ProgressBar
          label={isVsComputer ? 'Вы' : 'Игрок 1'}
          color="bg-blue-500"
          current={progress.p1.current}
          total={progress.p1.total}
        />
        <ProgressBar
          label={isVsComputer ? 'Компьютер' : 'Игрок 2'}
          color="bg-red-500"
          current={progress.p2.current}
          total={progress.p2.total}
        />
      </div>

      <div className="border-t border-gray-200 pt-3 text-xs text-gray-400 text-center space-y-0.5">
        <div>Поле {settings.rows}&times;{settings.cols} | Уголок: {settings.cornerSize === 'small' ? 'маленький' : settings.cornerSize === 'medium' ? 'средний' : 'большой'}</div>
        {isVsComputer && (
          <div>Сложность: {difficultyLabel[settings.difficulty]}</div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ label, color, current, total }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5">
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GameOver({ winner, moveCount, onRematch, onMenu, isVsComputer }) {
  let title;
  if (isVsComputer) {
    title = winner === 1 ? 'Вы победили!' : 'Компьютер победил!';
  } else {
    title = `Игрок ${winner} победил!`;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="text-4xl mb-4">{winner === 1 ? '🎉' : '🤖'}</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <div className="text-gray-500 mb-6">
          {isVsComputer
            ? `Ходов: Вы — ${moveCount[1]}, Компьютер — ${moveCount[2]}`
            : `Ходов: Игрок 1 — ${moveCount[1]}, Игрок 2 — ${moveCount[2]}`}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRematch}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer"
          >
            Реванш
          </button>
          <button
            onClick={onMenu}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium cursor-pointer"
          >
            В меню
          </button>
        </div>
      </div>
    </div>
  );
}

function Game({ settings, onMenu }) {
  const [state, dispatch] = useReducer(gameReducer, settings, createInitialGameState);
  const [isThinking, setIsThinking] = useState(false);
  const aiRunning = useRef(false);

  const isVsComputer = !!settings.difficulty;

  // Автоматический ход компьютера
  useEffect(() => {
    if (!isVsComputer || state.winner || state.currentPlayer !== AI_PLAYER) {
      return;
    }

    if (aiRunning.current) return;
    aiRunning.current = true;
    setIsThinking(true);

    // Пауза для естественности, затем вычисление хода
    const timer = setTimeout(() => {
      const move = getBestMove(state.board, state.zones, AI_PLAYER, settings.difficulty);
      if (move) {
        dispatch({
          type: 'MAKE_MOVE_AI',
          fromRow: move.fromRow,
          fromCol: move.fromCol,
          toRow: move.toRow,
          toCol: move.toCol,
        });
      }
      setIsThinking(false);
      aiRunning.current = false;
    }, 600);

    return () => {
      clearTimeout(timer);
      setIsThinking(false);
      aiRunning.current = false;
    };
  }, [state.currentPlayer, state.winner, state.board, isVsComputer, settings.difficulty]);

  const handleRematch = useCallback(() => {
    dispatch({ type: 'RESET' });
    setIsThinking(false);
    aiRunning.current = false;
  }, []);

  const isPlayerTurnBlocked = isVsComputer && state.currentPlayer === AI_PLAYER;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Уголки</h1>
          <button
            onClick={onMenu}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer"
          >
            В меню
          </button>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          <div className="w-full max-w-[min(70vh,600px)]">
            <Board state={state} dispatch={dispatch} isLocked={isPlayerTurnBlocked} />
          </div>
          <InfoPanel state={state} isThinking={isThinking} />
        </div>
      </div>

      {state.winner && (
        <GameOver
          winner={state.winner}
          moveCount={state.moveCount}
          onRematch={handleRematch}
          onMenu={onMenu}
          isVsComputer={isVsComputer}
        />
      )}
    </div>
  );
}

// ===================== Board Preview (Лобби) =====================

function BoardPreview({ rows, cols, cornerSize }) {
  const K = getCornerK(cornerSize);
  const cellSize = Math.max(4, Math.min(20, Math.floor(200 / Math.max(rows, cols))));

  return (
    <div
      className="grid gap-px bg-gray-300 border border-gray-400 mx-auto"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const isP1 = r + c < K;
          const isP2 = r + c >= rows + cols - K - 1;
          return (
            <div
              key={`${r},${c}`}
              className={`${isP1 ? 'bg-blue-300' : isP2 ? 'bg-red-300' : 'bg-white'}`}
            />
          );
        }),
      )}
    </div>
  );
}

// ===================== Лобби =====================

const CORNER_LABELS = { small: 'Маленький (6)', medium: 'Средний (10)', large: 'Большой (15)' };
const CORNER_SIZES = ['small', 'medium', 'large'];

const FIRST_MOVE_OPTIONS = [
  { value: 'player', label: 'Игрок' },
  { value: 'computer', label: 'Компьютер' },
  { value: 'random', label: 'Случайно' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Лёгкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
];

function Lobby({ onStart }) {
  const [settings, setSettings] = useReducer(
    (s, a) => ({ ...s, ...a }),
    initialSettings,
  );

  const maxCorner = useMemo(() => getMaxCornerSize(settings.rows, settings.cols), [settings.rows, settings.cols]);

  const availableSizes = useMemo(() => {
    const maxIdx = CORNER_SIZES.indexOf(maxCorner);
    return CORNER_SIZES.slice(0, maxIdx + 1);
  }, [maxCorner]);

  const effectiveCorner = useMemo(() => {
    if (availableSizes.includes(settings.cornerSize)) return settings.cornerSize;
    return availableSizes[availableSizes.length - 1];
  }, [availableSizes, settings.cornerSize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Уголки</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          Переместите все фишки в противоположный угол раньше соперника
        </p>

        <div className="space-y-5">
          <div>
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Ширина поля</span>
              <span className="text-gray-400">{settings.cols}</span>
            </label>
            <input
              type="range"
              min={8}
              max={16}
              value={settings.cols}
              onChange={(e) => setSettings({ cols: +e.target.value })}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Высота поля</span>
              <span className="text-gray-400">{settings.rows}</span>
            </label>
            <input
              type="range"
              min={8}
              max={16}
              value={settings.rows}
              onChange={(e) => setSettings({ rows: +e.target.value })}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Размер уголка</label>
            <div className="flex gap-2">
              {CORNER_SIZES.map((size) => {
                const disabled = !availableSizes.includes(size);
                const active = effectiveCorner === size;
                return (
                  <button
                    key={size}
                    disabled={disabled}
                    onClick={() => !disabled && setSettings({ cornerSize: size })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer
                      ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {CORNER_LABELS[size]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Кто ходит первым</label>
            <div className="flex gap-2">
              {FIRST_MOVE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSettings({ firstMove: value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${settings.firstMove === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Сложность ИИ</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSettings({ difficulty: value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${settings.difficulty === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-3">
            <BoardPreview rows={settings.rows} cols={settings.cols} cornerSize={effectiveCorner} />
          </div>

          <button
            onClick={() => onStart({ ...settings, cornerSize: effectiveCorner })}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Начать игру
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== App =====================

export default function App() {
  const [screen, setScreen] = useReducer((_, a) => a, { type: 'lobby' });

  if (screen.type === 'game') {
    return <Game settings={screen.settings} onMenu={() => setScreen({ type: 'lobby' })} />;
  }

  return <Lobby onStart={(settings) => setScreen({ type: 'game', settings })} />;
}

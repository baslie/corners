import { useReducer, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  createBoard,
  getCornerK,
  getValidMoves,
  getJumpPath,
  makeMove,
  checkWin,
} from './game/logic';
import { getBestMove, hashBoard } from './game/ai';
import {
  gameplayStart,
  gameplayStop,
  showInterstitial,
  showRewarded,
  loadPlayerData,
  savePlayerData,
  submitScore,
} from './sdk/yandex.js';

// ===================== Пресеты доски =====================

const BOARD_PRESETS = [
  { key: 'small',  label: '8×8',   description: '9 фишек',  rows: 8,  cols: 8,  cornerSize: 'small'  },
  { key: 'medium', label: '12×12', description: '16 фишек', rows: 12, cols: 12, cornerSize: 'medium' },
  { key: 'large',  label: '16×16', description: '25 фишек', rows: 16, cols: 16, cornerSize: 'large'  },
];

// ===================== Reducer =====================

const initialSettings = {
  rows: 8,
  cols: 8,
  cornerSize: 'small',
  firstMove: 'random',
  difficulty: 'medium',
};

const FREE_UNDO_LIMIT = 2;

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
    history: [],
    startTime: Date.now(),
    freeUndosLeft: FREE_UNDO_LIMIT,
  };
}

const AI_PLAYER = 1;

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
        history: [...state.history, { board: state.board, currentPlayer: state.currentPlayer, moveCount: { ...state.moveCount } }],
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
        history: [...state.history, { board: state.board, currentPlayer: state.currentPlayer, moveCount: { ...state.moveCount } }],
      };
    }
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const isVsComputer = !!state.settings.difficulty;
      const stepsBack = isVsComputer ? 2 : 1;
      if (state.history.length < stepsBack) return state;
      const target = state.history[state.history.length - stepsBack];
      return {
        ...state,
        board: target.board,
        currentPlayer: target.currentPlayer,
        moveCount: { ...target.moveCount },
        selectedPiece: null,
        validMoves: null,
        winner: null,
        history: state.history.slice(0, -stepsBack),
        freeUndosLeft: Math.max(0, state.freeUndosLeft - 1),
      };
    }
    case 'SURRENDER': {
      if (state.winner) return state;
      const loser = state.currentPlayer;
      return {
        ...state,
        winner: loser === 1 ? 2 : 1,
        selectedPiece: null,
        validMoves: null,
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

function Cell({ value, isSelected, isStep, isJump, isP1Zone, isP2Zone, isOnPath, isCheckerDark, isPlayerPiece, currentPlayer, onClick, onMouseEnter, onMouseLeave, isHidden }) {
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
          style={{ background: 'radial-gradient(ellipse 60% 50% at 45% 35%, var(--color-piece-highlight), transparent 60%), radial-gradient(ellipse 100% 100% at 50% 50%, var(--color-p1) 0%, var(--color-p1-dark) 100%)' }}
        />
      )}
      {value === 2 && !isHidden && (
        <div
          className={`w-[70%] h-[70%] rounded-full border-2 border-p2-dark shadow-[var(--shadow-piece-p2)] ${isPlayerPiece ? 'transition-transform duration-150 hover:scale-110' : ''}`}
          style={{ background: 'radial-gradient(ellipse 60% 50% at 45% 35%, var(--color-piece-highlight), transparent 60%), radial-gradient(ellipse 100% 100% at 50% 50%, var(--color-p2) 0%, var(--color-p2-dark) 100%)' }}
        />
      )}
      {value === null && (isStep || isJump) && (
        <div className={`w-[30%] h-[30%] rounded-full ${currentPlayer === 1 ? 'bg-p1/50' : 'bg-p2/50'}`} />
      )}
    </div>
  );
}

function GhostPiece({ player, row, col, rows, cols }) {
  const size = 70; // percentage of cell
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const offset = (100 - size) / 2 / 100;

  return (
    <div
      className="ghost-piece rounded-full"
      style={{
        left: `${col * cellW + offset * cellW}%`,
        top: `${row * cellH + offset * cellH}%`,
        width: `${cellW * size / 100}%`,
        height: `${cellH * size / 100}%`,
        background: player === 1
          ? 'radial-gradient(ellipse 60% 50% at 45% 35%, var(--color-piece-highlight), transparent 60%), radial-gradient(ellipse 100% 100% at 50% 50%, var(--color-p1) 0%, var(--color-p1-dark) 100%)'
          : 'radial-gradient(ellipse 60% 50% at 45% 35%, var(--color-piece-highlight), transparent 60%), radial-gradient(ellipse 100% 100% at 50% 50%, var(--color-p2) 0%, var(--color-p2-dark) 100%)',
        border: `2px solid ${player === 1 ? 'var(--color-p1-dark)' : 'var(--color-p2-dark)'}`,
        boxShadow: player === 1 ? 'var(--shadow-ghost-p1)' : 'var(--shadow-ghost-p2)',
        opacity: 0.9,
      }}
    />
  );
}

function Board({ state, dispatch, isLocked, hiddenCell, onPlayerMove, ghostPiece }) {
  const { board, zones, selectedPiece, validMoves, currentPlayer } = state;
  const boardRef = useRef(null);
  const [hoveredPath, setHoveredPath] = useState(new Set());

  const stepSet = useMemo(() => {
    if (!validMoves) return new Set();
    return new Set(validMoves.steps.map(([r, c]) => `${r},${c}`));
  }, [validMoves]);

  const jumpSet = useMemo(() => {
    if (!validMoves) return new Set();
    return new Set(validMoves.jumps.map(([r, c]) => `${r},${c}`));
  }, [validMoves]);

  const handleMouseEnter = useCallback(
    (row, col) => {
      if (!validMoves || !jumpSet.has(`${row},${col}`)) return;
      const path = getJumpPath(validMoves.jumpPaths, row, col);
      setHoveredPath(new Set(path.map(([r, c]) => `${r},${c}`)));
    },
    [validMoves, jumpSet],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPath(new Set());
  }, []);

  const handleClick = useCallback(
    (row, col) => {
      if (state.winner || isLocked) return;
      const k = `${row},${col}`;

      if (selectedPiece && (stepSet.has(k) || jumpSet.has(k))) {
        const isJump = jumpSet.has(k);
        let path;
        if (isJump && validMoves?.jumpPaths) {
          const jumpPath = getJumpPath(validMoves.jumpPaths, row, col);
          path = [[selectedPiece.row, selectedPiece.col], ...jumpPath];
        } else {
          path = [[selectedPiece.row, selectedPiece.col], [row, col]];
        }
        setHoveredPath(new Set());
        if (onPlayerMove) {
          onPlayerMove({ row, col, path, player: currentPlayer });
        } else {
          dispatch({ type: 'MAKE_MOVE', row, col });
        }
        return;
      }

      if (board[row][col] === currentPlayer) {
        dispatch({ type: 'SELECT_PIECE', row, col });
        setHoveredPath(new Set());
      } else {
        dispatch({ type: 'DESELECT' });
        setHoveredPath(new Set());
      }
    },
    [board, currentPlayer, selectedPiece, stepSet, jumpSet, state.winner, isLocked, dispatch, onPlayerMove, validMoves],
  );

  const isVsComputer = !!state.settings.difficulty;

  return (
    <div className="relative" ref={boardRef}>
      <div
        className="grid gap-0 border border-border-strong bg-surface rounded-[var(--radius-md)] overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${board[0].length}, 1fr)`,
        }}
      >
        {board.map((row, ri) =>
          row.map((cell, ci) => {
            const k = `${ri},${ci}`;
            const isHidden = hiddenCell && hiddenCell.row === ri && hiddenCell.col === ci;
            const isPlayerPiece = !isVsComputer
              ? cell === currentPlayer
              : cell !== null && cell !== AI_PLAYER && cell === currentPlayer;
            return (
              <Cell
                key={k}
                value={cell}
                isSelected={selectedPiece?.row === ri && selectedPiece?.col === ci}
                isStep={stepSet.has(k)}
                isJump={jumpSet.has(k)}
                isP1Zone={zones.player1.has(k)}
                isP2Zone={zones.player2.has(k)}
                isOnPath={hoveredPath.has(k)}
                isCheckerDark={(ri + ci) % 2 === 1}
                isPlayerPiece={isPlayerPiece}
                currentPlayer={currentPlayer}
                isHidden={isHidden}
                onClick={() => handleClick(ri, ci)}
                onMouseEnter={() => handleMouseEnter(ri, ci)}
                onMouseLeave={handleMouseLeave}
              />
            );
          }),
        )}
      </div>
      {ghostPiece && (
        <GhostPiece
          player={ghostPiece.player}
          row={ghostPiece.row}
          col={ghostPiece.col}
          rows={board.length}
          cols={board[0].length}
        />
      )}
    </div>
  );
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function InfoPanel({ state, isThinking, elapsed }) {
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
    <div className="w-full max-w-[min(95vw,600px)] lg:w-auto lg:max-w-none flex flex-col gap-2 lg:gap-4 p-3 lg:p-4 bg-surface-alt rounded-[var(--radius-lg)] border border-border lg:min-w-[220px]">
      {/* Строка статуса: на мобильных горизонтально, на десктопе — вертикально */}
      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:gap-0">

        {/* Ход */}
        <div className="text-center min-w-0">
          <div className="text-xs lg:text-sm text-text-dim lg:mb-1">
            <span className="lg:hidden">Ход</span>
            <span className="hidden lg:inline">Сейчас ходит</span>
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
              думает...
            </div>
          )}
        </div>

        {/* Ходы */}
        <div className="lg:border-t lg:border-border lg:pt-3 lg:mt-4 min-w-0">
          <div className="text-xs lg:text-sm text-text-dim lg:mb-2">
            <span className="lg:hidden">Ходы</span>
            <span className="hidden lg:inline">Ходов сделано</span>
          </div>
          <div className="flex gap-2 lg:justify-between text-xs lg:text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-p1 inline-block shrink-0" />
              <span className="lg:hidden">{isVsComputer ? 'ИИ' : 'И1'}</span>
              <span className="hidden lg:inline">{isVsComputer ? 'ИИ' : 'Игрок 1'}</span>: {moveCount[1]}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-p2 inline-block shrink-0" />
              <span className="lg:hidden">{isVsComputer ? 'Вы' : 'И2'}</span>
              <span className="hidden lg:inline">{isVsComputer ? 'Вы' : 'Игрок 2'}</span>: {moveCount[2]}
            </span>
          </div>
        </div>

        {/* Время */}
        <div className="lg:border-t lg:border-border lg:pt-3 lg:mt-4 text-center min-w-0">
          <div className="text-xs lg:text-sm text-text-dim">Время</div>
          <div className="text-sm lg:text-lg font-semibold tabular-nums text-text tracking-wider">{formatTime(elapsed)}</div>
        </div>

      </div>

      {/* Прогресс */}
      <div className="border-t border-border pt-2 lg:pt-3">
        <div className="hidden lg:block text-sm text-text-dim mb-2">Прогресс</div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-0">
          <ProgressBar
            label={isVsComputer ? 'Компьютер' : 'Игрок 1'}
            player={1}
            current={progress.p1.current}
            total={progress.p1.total}
          />
          <ProgressBar
            label={isVsComputer ? 'Вы' : 'Игрок 2'}
            player={2}
            current={progress.p2.current}
            total={progress.p2.total}
          />
        </div>
      </div>

      {/* Инфо — на мобильных в одну строку, на десктопе полный вариант */}
      <div className="border-t border-border pt-1 lg:pt-3 text-xs text-text-muted text-center">
        <span className="lg:hidden">{settings.rows}&times;{settings.cols}{isVsComputer && ` · ${difficultyLabel[settings.difficulty]}`}</span>
        <div className="hidden lg:block space-y-0.5">
          <div>Поле {settings.rows}&times;{settings.cols}</div>
          {isVsComputer && (
            <div>Сложность: {difficultyLabel[settings.difficulty]}</div>
          )}
        </div>
      </div>
    </div>
  );
}

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

function GameOver({ winner, moveCount, onRematch, onMenu, isVsComputer, elapsed }) {
  let title;
  if (isVsComputer) {
    title = winner === AI_PLAYER ? 'Компьютер победил!' : 'Вы победили!';
  } else {
    title = `Игрок ${winner} победил!`;
  }

  const iconBg = winner === AI_PLAYER ? 'bg-p1-soft' : 'bg-p2-soft';

  return (
    <div className="fixed inset-0 bg-backdrop backdrop-blur-md flex items-center justify-center z-50 game-over-backdrop">
      <div className="bg-surface border border-border rounded-[var(--radius-xl)] p-8 max-w-sm w-full mx-4 text-center game-over-modal">
        <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center text-3xl mx-auto mb-4`}>
          {winner === AI_PLAYER ? '🤖' : '🎉'}
        </div>
        <h2 className="text-2xl font-bold mb-2 text-text">{title}</h2>
        <div className="text-text-dim mb-2">
          {isVsComputer
            ? `Ходов: Вы — ${moveCount[2]}, Компьютер — ${moveCount[1]}`
            : `Ходов: Игрок 1 — ${moveCount[1]}, Игрок 2 — ${moveCount[2]}`}
        </div>
        <div className="text-text-muted text-sm mb-6">
          Время: {formatTime(elapsed)}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRematch}
            className="px-5 py-2.5 bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent-hover font-medium cursor-pointer transition-all duration-150 active:scale-95"
          >
            Реванш
          </button>
          <button
            onClick={onMenu}
            className="px-5 py-2.5 bg-surface-alt text-text-dim border border-border rounded-[var(--radius-md)] hover:border-border-strong hover:bg-border font-medium cursor-pointer transition-all duration-150 active:scale-95"
          >
            В меню
          </button>
        </div>
      </div>
    </div>
  );
}

function useAnimation(dispatch) {
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
      setTimeout(nextStep, 250);
    };

    // Start first step after a frame so transition triggers
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nextStep();
      });
    });
  }, []);

  return { ghostPiece, hiddenCell, animate, animating };
}

function Game({ settings, onMenu, playerStats, onStatsUpdate }) {
  const [state, dispatch] = useReducer(gameReducer, settings, createInitialGameState);
  const [isThinking, setIsThinking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const aiRunning = useRef(false);
  const { ghostPiece, hiddenCell, animate, animating } = useAnimation(dispatch);

  const isVsComputer = !!settings.difficulty;

  // Lifecycle: gameplayStart при маунте, gameplayStop при анмаунте
  useEffect(() => {
    gameplayStart();
    return () => gameplayStop();
  }, []);

  // Lifecycle: gameplayStop при победе
  useEffect(() => {
    if (state.winner) {
      gameplayStop();
    }
  }, [state.winner]);

  // Сохранение статистики и отправка в лидерборд при победе
  useEffect(() => {
    if (!state.winner || !isVsComputer) return;
    const elapsedMs = Date.now() - state.startTime;
    const playerWon = state.winner !== AI_PLAYER;
    const newStats = {
      ...playerStats,
      totalGames: (playerStats.totalGames || 0) + 1,
      wins: (playerStats.wins || 0) + (playerWon ? 1 : 0),
      losses: (playerStats.losses || 0) + (playerWon ? 0 : 1),
    };
    if (playerWon) {
      const moves = state.moveCount[2]; // player is 2
      if (newStats.bestMoves === null || moves < newStats.bestMoves) {
        newStats.bestMoves = moves;
      }
      if (newStats.bestTime === null || elapsedMs < newStats.bestTime) {
        newStats.bestTime = elapsedMs;
      }
      submitScore('main', moves);
    }
    onStatsUpdate(newStats);
    savePlayerData(newStats);
  }, [state.winner]);

  // Таймер игры
  useEffect(() => {
    if (state.winner) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - state.startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [state.startTime, state.winner]);

  // Обработчик хода игрока с анимацией
  const handlePlayerMove = useCallback(({ row, col, path, player }) => {
    animate(path, player, () => {
      dispatch({ type: 'MAKE_MOVE', row, col });
    });
  }, [animate]);

  // Автоматический ход компьютера
  useEffect(() => {
    if (!isVsComputer || state.winner || state.currentPlayer !== AI_PLAYER) {
      return;
    }

    if (aiRunning.current || animating.current) return;
    aiRunning.current = true;
    setIsThinking(true);

    const timer = setTimeout(() => {
      // Собираем частоту позиций из всей истории для антиповтора
      const positionFrequency = new Map();
      for (const entry of state.history) {
        const h = hashBoard(entry.board);
        positionFrequency.set(h, (positionFrequency.get(h) || 0) + 1);
      }
      const currentHash = hashBoard(state.board);
      positionFrequency.set(currentHash, (positionFrequency.get(currentHash) || 0) + 1);

      const move = getBestMove(
        state.board, state.zones, AI_PLAYER, settings.difficulty,
        positionFrequency, state.moveCount[AI_PLAYER]
      );
      if (move) {
        // Compute animation path for AI move
        const aiValidMoves = getValidMoves(state.board, move.fromRow, move.fromCol, state.zones, AI_PLAYER);
        const targetKey = `${move.toRow},${move.toCol}`;
        let path;
        if (aiValidMoves.jumpPaths && aiValidMoves.jumpPaths.has(targetKey)) {
          const jumpPath = aiValidMoves.jumpPaths.get(targetKey);
          path = [[move.fromRow, move.fromCol], ...jumpPath];
        } else {
          path = [[move.fromRow, move.fromCol], [move.toRow, move.toCol]];
        }

        animate(path, AI_PLAYER, () => {
          dispatch({
            type: 'MAKE_MOVE_AI',
            fromRow: move.fromRow,
            fromCol: move.fromCol,
            toRow: move.toRow,
            toCol: move.toCol,
          });
          setIsThinking(false);
          aiRunning.current = false;
        });
      } else {
        setIsThinking(false);
        aiRunning.current = false;
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (!animating.current) {
        setIsThinking(false);
        aiRunning.current = false;
      }
    };
  }, [state.currentPlayer, state.winner, state.board, isVsComputer, settings.difficulty, animate, state.zones, animating]);

  const handleRematch = useCallback(async () => {
    await showInterstitial();
    dispatch({ type: 'RESET' });
    setIsThinking(false);
    setElapsed(0);
    aiRunning.current = false;
  }, []);

  const handleBackToMenu = useCallback(async () => {
    await showInterstitial();
    onMenu();
  }, [onMenu]);

  const handleUndo = useCallback(async () => {
    if (state.freeUndosLeft > 0) {
      dispatch({ type: 'UNDO' });
    } else {
      const rewarded = await showRewarded();
      if (rewarded) {
        dispatch({ type: 'UNDO' });
      }
    }
  }, [state.freeUndosLeft]);

  const isPlayerTurnBlocked = isVsComputer && state.currentPlayer === AI_PLAYER;

  return (
    <div className="min-h-screen bg-bg p-2 sm:p-4">
      <div className="grid lg:grid-cols-[minmax(0,min(70vh,600px))_auto] grid-cols-1 gap-3 sm:gap-4 max-w-5xl mx-auto items-start justify-center">
        <div className="lg:col-span-2 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-accent">Уголки</h1>
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleUndo}
              disabled={state.history.length === 0 || isThinking || !!state.winner || animating.current}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-accent-soft text-accent border border-accent/20 rounded-[var(--radius-md)] hover:border-accent/40 cursor-pointer transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.freeUndosLeft > 0 ? `Отменить (${state.freeUndosLeft})` : 'Отменить (реклама)'}
            </button>
            <button
              onClick={() => dispatch({ type: 'SURRENDER' })}
              disabled={!!state.winner || isThinking || animating.current}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-danger-soft text-danger border border-danger/20 rounded-[var(--radius-md)] hover:opacity-80 cursor-pointer transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Сдаться
            </button>
            <button
              onClick={handleBackToMenu}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-surface border border-border text-text-dim rounded-[var(--radius-md)] hover:border-border-strong cursor-pointer transition-all duration-150 active:scale-95"
            >
              В меню
            </button>
          </div>
        </div>
        <div className="w-full max-w-[min(95vw,600px)]">
          <Board
            state={state}
            dispatch={dispatch}
            isLocked={isPlayerTurnBlocked || animating.current}
            hiddenCell={hiddenCell}
            onPlayerMove={handlePlayerMove}
            ghostPiece={ghostPiece}
          />
        </div>
        <InfoPanel state={state} isThinking={isThinking} elapsed={elapsed} />
      </div>

      {state.winner && (
        <GameOver
          winner={state.winner}
          moveCount={state.moveCount}
          onRematch={handleRematch}
          onMenu={handleBackToMenu}
          isVsComputer={isVsComputer}
          elapsed={elapsed}
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

// ===================== Лобби =====================

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Лёгкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
];

function Lobby({ onStart, playerStats }) {
  const [settings, setSettings] = useReducer(
    (s, a) => ({ ...s, ...a }),
    initialSettings,
  );

  const activePreset = BOARD_PRESETS.find((p) => p.rows === settings.rows) || BOARD_PRESETS[0];

  return (
    <div className="min-h-screen lobby-bg flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-[var(--radius-2xl)] border border-border p-6 max-w-md w-full lobby-card">
        <h1 className="text-3xl font-bold text-center mb-2 tracking-tight text-accent">Уголки</h1>
        <p className="text-center text-text-dim text-sm mb-4">
          Переместите все фишки в противоположный угол раньше соперника
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text mb-2 block">Размер доски</label>
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
            <label className="text-sm font-medium text-text mb-2 block">Сложность ИИ</label>
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
              <div className="text-sm font-medium text-text mb-2">Ваша статистика</div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="text-text-muted text-xs">Игр</div>
                  <div className="font-semibold text-text">{playerStats.totalGames}</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs">Побед</div>
                  <div className="font-semibold text-success">{playerStats.wins}</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs">Поражений</div>
                  <div className="font-semibold text-danger">{playerStats.losses}</div>
                </div>
              </div>
              {(playerStats.bestMoves !== null || playerStats.bestTime !== null) && (
                <div className="mt-2 pt-2 border-t border-border flex justify-around text-xs text-text-dim">
                  {playerStats.bestMoves !== null && (
                    <span>Лучший результат: {playerStats.bestMoves} ходов</span>
                  )}
                  {playerStats.bestTime !== null && (
                    <span>Лучшее время: {formatTime(playerStats.bestTime)}</span>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => onStart(settings)}
            className="btn-shimmer w-full py-3 bg-accent text-white rounded-[var(--radius-md)] text-lg font-semibold hover:bg-accent-hover transition-all duration-150 active:scale-95 cursor-pointer"
          >
            Начать игру
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== Default stats =====================

const DEFAULT_STATS = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  bestMoves: null,
  bestTime: null,
};

// ===================== App =====================

export default function App() {
  const [screen, setScreen] = useReducer((_, a) => a, { type: 'lobby' });
  const [playerStats, setPlayerStats] = useState(DEFAULT_STATS);

  // Загрузка статистики при маунте
  useEffect(() => {
    loadPlayerData().then((data) => {
      if (data && typeof data.totalGames === 'number') {
        setPlayerStats({ ...DEFAULT_STATS, ...data });
      }
    });
  }, []);

  if (screen.type === 'game') {
    return (
      <Game
        settings={screen.settings}
        onMenu={() => setScreen({ type: 'lobby' })}
        playerStats={playerStats}
        onStatsUpdate={setPlayerStats}
      />
    );
  }

  return (
    <Lobby
      onStart={(settings) => setScreen({ type: 'game', settings })}
      playerStats={playerStats}
    />
  );
}

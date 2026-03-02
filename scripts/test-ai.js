#!/usr/bin/env node

/**
 * Headless AI vs AI тест для игры «Уголки».
 *
 * Прогоняет серии партий на разных конфигурациях доски и сложностях,
 * проверяя, что ИИ не зацикливается и завершает каждую партию.
 *
 * Использование:
 *   node scripts/test-ai.js                          # полный прогон
 *   node scripts/test-ai.js --only=8x8 --games=2     # быстрая проверка
 *   node scripts/test-ai.js --verbose                 # подробный вывод
 *   node scripts/test-ai.js --only=hard               # только hard
 */

import { createBoard, getValidMoves, makeMove, checkWin } from '../src/game/logic.js';
import { getBestMove, hashBoard } from '../src/game/ai.js';

// ======================== CLI-аргументы ========================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    games: null,       // null = использовать дефолт из матрицы
    maxMoves: 300,
    verbose: false,
    only: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--games=')) {
      opts.games = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--max-moves=')) {
      opts.maxMoves = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--verbose') {
      opts.verbose = true;
    } else if (arg.startsWith('--only=')) {
      opts.only = arg.split('=')[1];
    } else {
      console.error(`Unknown argument: ${arg}`);
      console.error('Usage: node scripts/test-ai.js [--games=N] [--max-moves=M] [--verbose] [--only=FILTER]');
      process.exit(2);
    }
  }

  return opts;
}

// ======================== Тестовая матрица ========================

const TEST_MATRIX = [
  // 8×8 (small corner, K=3)
  { rows: 8,  cols: 8,  cornerSize: 'small',  difficulty: 'easy',   defaultGames: 5, label: '8x8 easy' },
  { rows: 8,  cols: 8,  cornerSize: 'small',  difficulty: 'medium', defaultGames: 5, label: '8x8 medium' },
  { rows: 8,  cols: 8,  cornerSize: 'small',  difficulty: 'hard',   defaultGames: 3, label: '8x8 hard' },
  // 12×12 (medium corner, K=4)
  { rows: 12, cols: 12, cornerSize: 'medium', difficulty: 'easy',   defaultGames: 3, label: '12x12 easy' },
  { rows: 12, cols: 12, cornerSize: 'medium', difficulty: 'medium', defaultGames: 2, label: '12x12 medium' },
  { rows: 12, cols: 12, cornerSize: 'medium', difficulty: 'hard',   defaultGames: 1, label: '12x12 hard' },
  // 16×16 (large corner, K=5)
  { rows: 16, cols: 16, cornerSize: 'large',  difficulty: 'easy',   defaultGames: 2, label: '16x16 easy' },
  { rows: 16, cols: 16, cornerSize: 'large',  difficulty: 'medium', defaultGames: 1, label: '16x16 medium' },
  { rows: 16, cols: 16, cornerSize: 'large',  difficulty: 'hard',   defaultGames: 1, label: '16x16 hard' },
];

// ======================== Одна партия ========================

function runGame(config, maxMoves, verbose) {
  const { rows, cols, cornerSize, difficulty } = config;
  const { board: initialBoard, zones } = createBoard(rows, cols, cornerSize);

  let board = initialBoard;
  let currentPlayer = 1;
  const moveCount = { 1: 0, 2: 0 };
  const history = [];          // массив хешей доски
  const stateFrequency = new Map();  // hash → count

  let winner = null;
  let stuck = false;
  let cycleDetected = false;
  let maxRepeatCount = 0;

  const startTime = Date.now();

  for (let totalMoves = 0; totalMoves < maxMoves; totalMoves++) {
    // Проверка победы
    winner = checkWin(board, zones);
    if (winner) break;

    // Собираем частоту позиций из всей истории для антиповтора
    const positionFrequency = new Map();
    for (const h of history) {
      positionFrequency.set(h, (positionFrequency.get(h) || 0) + 1);
    }
    const currentHash = hashBoard(board);
    positionFrequency.set(currentHash, (positionFrequency.get(currentHash) || 0) + 1);

    // Ход ИИ
    const move = getBestMove(board, zones, currentPlayer, difficulty, positionFrequency, moveCount[currentPlayer]);

    if (!move) {
      // Нет доступных ходов — stuck
      stuck = true;
      if (verbose) {
        console.log(`  [move ${totalMoves}] Player ${currentPlayer}: no moves available — stuck`);
      }
      break;
    }

    const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
    const h = hashBoard(newBoard);

    // Отслеживание частоты состояний
    const freq = (stateFrequency.get(h) || 0) + 1;
    stateFrequency.set(h, freq);
    if (freq > maxRepeatCount) maxRepeatCount = freq;
    if (freq >= 3) cycleDetected = true;

    history.push(h);
    moveCount[currentPlayer]++;
    board = newBoard;

    if (verbose) {
      console.log(
        `  [move ${totalMoves + 1}] P${currentPlayer}: ` +
        `(${move.fromRow},${move.fromCol})→(${move.toRow},${move.toCol})` +
        (freq > 1 ? ` [repeat x${freq}]` : '')
      );
    }

    // Переключение игрока
    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }

  // Финальная проверка победы (на случай если лимит ходов достигнут после хода)
  if (!winner) winner = checkWin(board, zones);
  if (!winner && !stuck) stuck = true;

  const timeMs = Date.now() - startTime;
  const totalMoves = moveCount[1] + moveCount[2];

  return { winner, totalMoves, stuck, cycleDetected, maxRepeatCount, timeMs };
}

// ======================== Серия партий ========================

function runConfiguration(config, numGames, maxMoves, verbose) {
  const results = {
    config,
    games: numGames,
    p1Wins: 0,
    p2Wins: 0,
    stuckCount: 0,
    cycleCount: 0,
    totalMoves: 0,
    totalTimeMs: 0,
  };

  for (let g = 0; g < numGames; g++) {
    if (verbose) {
      console.log(`\n--- ${config.label} | Game ${g + 1}/${numGames} ---`);
    }

    const result = runGame(config, maxMoves, verbose);

    if (result.winner === 1) results.p1Wins++;
    else if (result.winner === 2) results.p2Wins++;
    if (result.stuck) results.stuckCount++;
    if (result.cycleDetected) results.cycleCount++;
    results.totalMoves += result.totalMoves;
    results.totalTimeMs += result.timeMs;

    if (verbose) {
      console.log(
        `  Result: ${result.winner ? `P${result.winner} wins` : 'no winner'}` +
        ` | ${result.totalMoves} moves | ${(result.timeMs / 1000).toFixed(1)}s` +
        (result.stuck ? ' | STUCK' : '') +
        (result.cycleDetected ? ` | CYCLE (max repeat: ${result.maxRepeatCount})` : '')
      );
    }
  }

  return results;
}

// ======================== Вывод результатов ========================

function printSummary(allResults) {
  const sep = '='.repeat(94);
  const line = '-'.repeat(94);

  console.log('\nCorners AI vs AI Test Results');
  console.log(sep);
  console.log(
    padRight('Configuration', 30) + '| ' +
    padRight('Games', 6) + '| ' +
    padRight('P1Win', 6) + '| ' +
    padRight('P2Win', 6) + '| ' +
    padRight('Stuck', 6) + '| ' +
    padRight('Cycle', 6) + '| ' +
    padRight('AvgMov', 7) + '| ' +
    padRight('AvgTime', 8)
  );
  console.log(line);

  let totalGames = 0;
  let totalP1 = 0;
  let totalP2 = 0;
  let totalStuck = 0;
  let totalCycle = 0;
  let totalMoves = 0;
  let totalTime = 0;

  for (const r of allResults) {
    const avgMov = r.games > 0 ? Math.round(r.totalMoves / r.games) : 0;
    const avgTime = r.games > 0 ? (r.totalTimeMs / r.games / 1000).toFixed(1) + 's' : '0.0s';

    console.log(
      padRight(r.config.label, 30) + '| ' +
      padRight(String(r.games), 6) + '| ' +
      padRight(String(r.p1Wins), 6) + '| ' +
      padRight(String(r.p2Wins), 6) + '| ' +
      padRight(String(r.stuckCount), 6) + '| ' +
      padRight(String(r.cycleCount), 6) + '| ' +
      padRight(String(avgMov), 7) + '| ' +
      padRight(avgTime, 8)
    );

    totalGames += r.games;
    totalP1 += r.p1Wins;
    totalP2 += r.p2Wins;
    totalStuck += r.stuckCount;
    totalCycle += r.cycleCount;
    totalMoves += r.totalMoves;
    totalTime += r.totalTimeMs;
  }

  console.log(line);

  const totalAvgMov = totalGames > 0 ? Math.round(totalMoves / totalGames) : 0;
  const totalAvgTime = totalGames > 0 ? (totalTime / totalGames / 1000).toFixed(1) + 's' : '0.0s';

  console.log(
    padRight('TOTAL', 30) + '| ' +
    padRight(String(totalGames), 6) + '| ' +
    padRight(String(totalP1), 6) + '| ' +
    padRight(String(totalP2), 6) + '| ' +
    padRight(String(totalStuck), 6) + '| ' +
    padRight(String(totalCycle), 6) + '| ' +
    padRight(String(totalAvgMov), 7) + '| ' +
    padRight(totalAvgTime, 8)
  );

  console.log('');

  if (totalStuck > 0 || totalCycle > 0) {
    console.log(`  FAIL: ${totalStuck} stuck game(s), ${totalCycle} game(s) with cycles detected.`);
    process.exitCode = 1;
  } else {
    console.log('  OK: All games completed successfully, no stuck games or cycles detected.');
  }

  console.log(`  Total wall time: ${(totalTime / 1000).toFixed(1)}s\n`);
}

function padRight(str, len) {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}

// ======================== Точка входа ========================

function main() {
  const opts = parseArgs();

  // Фильтрация матрицы
  let matrix = TEST_MATRIX;
  if (opts.only) {
    // Разбиваем фильтр на термы и проверяем, что все присутствуют в label
    const terms = opts.only.toLowerCase().replace(/[-_=]/g, ' ').split(/\s+/).filter(Boolean);
    matrix = matrix.filter(c => {
      const label = c.label.toLowerCase();
      return terms.every(t => label.includes(t));
    });
    if (matrix.length === 0) {
      console.error(`No configurations match filter: "${opts.only}"`);
      console.error('Available labels:');
      for (const c of TEST_MATRIX) console.error(`  ${c.label}`);
      process.exit(2);
    }
  }

  const totalGames = matrix.reduce((sum, c) => sum + (opts.games ?? c.defaultGames), 0);
  console.log(`Running ${totalGames} AI vs AI games across ${matrix.length} configurations...`);
  if (opts.only) console.log(`Filter: "${opts.only}"`);
  console.log(`Max moves per game: ${opts.maxMoves}`);
  console.log('');

  const allResults = [];
  let completed = 0;

  for (const config of matrix) {
    const numGames = opts.games ?? config.defaultGames;
    if (!opts.verbose) {
      process.stdout.write(`  ${config.label} (${numGames} games)...`);
    }

    const result = runConfiguration(config, numGames, opts.maxMoves, opts.verbose);
    allResults.push(result);
    completed += numGames;

    if (!opts.verbose) {
      const status = result.stuckCount > 0 ? ' STUCK!' : result.cycleCount > 0 ? ' CYCLE!' : ' OK';
      console.log(status);
    }
  }

  printSummary(allResults);
}

main();

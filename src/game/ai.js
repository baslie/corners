import { getValidMoves, makeMove, checkWin } from './logic.js';
import { AI_SCORES, AI_DEADLINE_MS } from '../constants.js';

// === Расстояние Манхэттена до целевого угла ===

function manhattanToTarget(r, c, rows, cols, player) {
  return player === 1
    ? (rows - 1 - r) + (cols - 1 - c)
    : r + c;
}

// === Дисбаланс осей (отклонение от диагонали) ===

function axisImbalance(r, c, rows, cols, player) {
  const rowDist = player === 1 ? (rows - 1 - r) : r;
  const colDist = player === 1 ? (cols - 1 - c) : c;
  return Math.abs(rowDist - colDist);
}

// === Генерация всех ходов для игрока ===

function getAllMoves(board, zones, player) {
  const moves = [];
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === player) {
        const { steps, jumps } = getValidMoves(board, r, c, zones, player);
        for (const [tr, tc] of steps) {
          moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
        }
        for (const [tr, tc] of jumps) {
          moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
        }
      }
    }
  }
  return moves;
}

// === Оценочная функция ===

function evaluate(board, zones, aiPlayer, difficulty, aiMoveCount = 0) {
  const rows = board.length;
  const cols = board[0].length;
  const opponent = aiPlayer === 1 ? 2 : 1;
  const aiFinish = aiPlayer === 1 ? zones.player2 : zones.player1;
  const oppFinish = opponent === 1 ? zones.player2 : zones.player1;

  let aiDist = 0;
  let oppDist = 0;
  let aiInFinish = 0;
  let oppInFinish = 0;
  const aiPieces = [];
  const oppPieces = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === aiPlayer) {
        aiDist += manhattanToTarget(r, c, rows, cols, aiPlayer);
        if (aiFinish.has(`${r},${c}`)) aiInFinish++;
        aiPieces.push([r, c]);
      } else if (board[r][c] === opponent) {
        oppDist += manhattanToTarget(r, c, rows, cols, opponent);
        if (oppFinish.has(`${r},${c}`)) oppInFinish++;
        oppPieces.push([r, c]);
      }
    }
  }

  let score = 0;

  const urgency = 1.0 + Math.max(0, aiMoveCount - 20) * 0.03;
  score -= aiDist * 3 * urgency;

  let maxPieceDist = 0;
  for (const [pr, pc] of aiPieces) {
    const dist = manhattanToTarget(pr, pc, rows, cols, aiPlayer);
    maxPieceDist = Math.max(maxPieceDist, dist);
  }
  score -= maxPieceDist * 8;

  score += aiInFinish * 30;

  if (aiInFinish === aiFinish.size) score += AI_SCORES.WIN;
  if (oppInFinish === oppFinish.size) score -= AI_SCORES.WIN;

  const maxDist = rows - 1 + cols - 1;
  const advancedPieces = aiPieces.filter(([pr, pc]) => {
    const dist = manhattanToTarget(pr, pc, rows, cols, aiPlayer);
    return dist < maxDist * 0.6;
  });
  if (advancedPieces.length > 1) {
    let clusterScore = 0;
    for (let i = 0; i < advancedPieces.length; i++) {
      for (let j = i + 1; j < advancedPieces.length; j++) {
        const d = Math.max(
          Math.abs(advancedPieces[i][0] - advancedPieces[j][0]),
          Math.abs(advancedPieces[i][1] - advancedPieces[j][1]),
        );
        if (d <= 2) clusterScore += 3 - d;
      }
    }
    score += clusterScore;
  }

  if (difficulty === 'hard') {
    score += oppDist * 1.5;
    score -= oppInFinish * 20;

    for (const [ar, ac] of aiPieces) {
      if (!aiFinish.has(`${ar},${ac}`)) {
        for (const [oppRow, oppCol] of oppPieces) {
          const dist = Math.max(Math.abs(ar - oppRow), Math.abs(ac - oppCol));
          if (dist <= 2) score += 2;
        }
      }
    }
  } else if (difficulty === 'medium') {
    score += oppDist * 0.5;
    score -= oppInFinish * 10;
  }

  const avgDist = aiPieces.length > 0 ? aiDist / aiPieces.length : 0;
  for (const [pr, pc] of aiPieces) {
    const dist = manhattanToTarget(pr, pc, rows, cols, aiPlayer);
    const excess = dist - avgDist;
    if (excess > 0) {
      score -= excess * excess * 0.5;
    }
  }

  let totalImbalance = 0;
  let maxImbalance = 0;
  for (const [pr, pc] of aiPieces) {
    const imb = axisImbalance(pr, pc, rows, cols, aiPlayer);
    totalImbalance += imb * imb;
    maxImbalance = Math.max(maxImbalance, imb);
  }
  score -= totalImbalance * 0.4 * urgency;
  score -= maxImbalance * maxImbalance * 0.3 * urgency;

  const aiStart = aiPlayer === 1 ? zones.player1 : zones.player2;
  for (const [pr, pc] of aiPieces) {
    if (aiStart.has(`${pr},${pc}`)) {
      score -= 20;
    }
  }

  return score;
}

// === Сортировка ходов для альфа-бета ===

function sortMoves(moves, board, zones, player) {
  const finishZone = player === 1 ? zones.player2 : zones.player1;

  return moves.sort((a, b) => {
    const aToFinish = finishZone.has(`${a.toRow},${a.toCol}`) ? 1 : 0;
    const bToFinish = finishZone.has(`${b.toRow},${b.toCol}`) ? 1 : 0;
    if (aToFinish !== bToFinish) return bToFinish - aToFinish;

    const aProgress = player === 1
      ? (a.toRow + a.toCol) - (a.fromRow + a.fromCol)
      : (a.fromRow + a.fromCol) - (a.toRow + a.toCol);
    const bProgress = player === 1
      ? (b.toRow + b.toCol) - (b.fromRow + b.fromCol)
      : (b.fromRow + b.fromCol) - (b.toRow + b.toCol);

    if (aProgress !== bProgress) return bProgress - aProgress;

    const rows = board.length;
    const cols = board[0].length;
    const aImbDelta = axisImbalance(a.toRow, a.toCol, rows, cols, player)
                   - axisImbalance(a.fromRow, a.fromCol, rows, cols, player);
    const bImbDelta = axisImbalance(b.toRow, b.toCol, rows, cols, player)
                   - axisImbalance(b.fromRow, b.fromCol, rows, cols, player);
    if (aImbDelta !== bImbDelta) return aImbDelta - bImbDelta;

    const aLen = Math.abs(a.toRow - a.fromRow) + Math.abs(a.toCol - a.fromCol);
    const bLen = Math.abs(b.toRow - b.fromRow) + Math.abs(b.toCol - b.fromCol);
    return bLen - aLen;
  });
}

// === Хеширование доски для антиповтора ===

export function hashBoard(board) {
  return board.map(row => row.map(c => c === null ? '0' : String(c)).join('')).join('|');
}

// === Minimax с альфа-бета отсечением ===

function minimax(board, zones, depth, alpha, beta, maximizing, aiPlayer, difficulty, deadline, aiMoveCount) {
  if (Date.now() > deadline) {
    return { score: evaluate(board, zones, aiPlayer, difficulty, aiMoveCount), timeout: true };
  }

  const winner = checkWin(board, zones);
  if (winner === aiPlayer) return { score: AI_SCORES.WIN + depth };
  if (winner !== null) return { score: -AI_SCORES.WIN - depth };
  if (depth === 0) return { score: evaluate(board, zones, aiPlayer, difficulty, aiMoveCount) };

  const currentPlayer = maximizing ? aiPlayer : (aiPlayer === 1 ? 2 : 1);
  let moves = getAllMoves(board, zones, currentPlayer);

  if (moves.length === 0) return { score: evaluate(board, zones, aiPlayer, difficulty, aiMoveCount) };

  moves = sortMoves(moves, board, zones, currentPlayer);

  let bestMove = moves[0];

  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
      const result = minimax(newBoard, zones, depth - 1, alpha, beta, false, aiPlayer, difficulty, deadline, aiMoveCount);
      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, maxScore);
      if (beta <= alpha) break;
      if (result.timeout) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
      const result = minimax(newBoard, zones, depth - 1, alpha, beta, true, aiPlayer, difficulty, deadline, aiMoveCount);
      if (result.score < minScore) {
        minScore = result.score;
        bestMove = move;
      }
      beta = Math.min(beta, minScore);
      if (beta <= alpha) break;
      if (result.timeout) break;
    }
    return { score: minScore, move: bestMove };
  }
}

// === Эскалирующий штраф за повтор позиции ===

function getRepeatPenalty(hash, positionFrequency) {
  const count = positionFrequency.get(hash) || 0;
  if (count === 0) return 0;
  if (count === 1) return AI_SCORES.REPEAT_ONCE;
  if (count === 2) return AI_SCORES.REPEAT_TWICE;
  return AI_SCORES.REPEAT_TRIPLE;
}

// === Главная функция ИИ ===

export function getBestMove(board, zones, aiPlayer, difficulty, positionFrequency = new Map(), aiMoveCount = 0) {
  const rows = board.length;
  const cols = board[0].length;
  const isLargeBoard = Math.max(rows, cols) >= 12;

  const deadline = Date.now() + AI_DEADLINE_MS;

  if (difficulty === 'easy') {
    const moves = getAllMoves(board, zones, aiPlayer);
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
      const h = hashBoard(newBoard);
      const repeatPenalty = getRepeatPenalty(h, positionFrequency);
      const score = evaluate(newBoard, zones, aiPlayer, difficulty, aiMoveCount) + repeatPenalty + (Math.random() * 10 - 5);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  let depth;
  if (difficulty === 'medium') {
    depth = isLargeBoard ? 2 : 3;
  } else {
    depth = isLargeBoard ? 3 : 4;
  }

  const moves = getAllMoves(board, zones, aiPlayer);
  if (moves.length === 0) return null;

  const sortedMoves = sortMoves(moves, board, zones, aiPlayer);

  let bestMove = sortedMoves[0];
  let bestScore = -Infinity;

  for (const move of sortedMoves) {
    const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
    const result = minimax(newBoard, zones, depth - 1, -Infinity, Infinity, false, aiPlayer, difficulty, deadline, aiMoveCount);

    const h = hashBoard(newBoard);
    const repeatPenalty = getRepeatPenalty(h, positionFrequency);
    const score = result.score + repeatPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (Date.now() > deadline) break;
  }

  return bestMove;
}

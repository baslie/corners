import { getValidMoves, makeMove, checkWin } from './logic';

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

function evaluate(board, zones, aiPlayer, difficulty) {
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
        // Расстояние до целевого угла (Manhattan)
        if (aiPlayer === 1) {
          aiDist += (rows - 1 - r) + (cols - 1 - c);
        } else {
          aiDist += r + c;
        }
        if (aiFinish.has(`${r},${c}`)) aiInFinish++;
        aiPieces.push([r, c]);
      } else if (board[r][c] === opponent) {
        if (opponent === 1) {
          oppDist += (rows - 1 - r) + (cols - 1 - c);
        } else {
          oppDist += r + c;
        }
        if (oppFinish.has(`${r},${c}`)) oppInFinish++;
        oppPieces.push([r, c]);
      }
    }
  }

  let score = 0;

  // Чем меньше расстояние ИИ до цели — тем лучше
  score -= aiDist * 3;

  // Бонус за фишки в зоне финиша
  score += aiInFinish * 30;

  // Терминальные состояния
  if (aiInFinish === aiFinish.size) score += 100000;
  if (oppInFinish === oppFinish.size) score -= 100000;

  // Кластеризация: бонус за компактное расположение (для цепочек прыжков)
  if (aiPieces.length > 1) {
    let clusterScore = 0;
    for (let i = 0; i < aiPieces.length; i++) {
      for (let j = i + 1; j < aiPieces.length; j++) {
        const d = Math.max(
          Math.abs(aiPieces[i][0] - aiPieces[j][0]),
          Math.abs(aiPieces[i][1] - aiPieces[j][1]),
        );
        if (d <= 2) clusterScore += 3 - d; // бонус за близкие фишки
      }
    }
    score += clusterScore;
  }

  // На среднем и сложном уровнях учитываем противника
  if (difficulty === 'hard') {
    score += oppDist * 1.5;
    score -= oppInFinish * 20;

    // Антиблокировка: бонус за позиции на пути противника
    for (const [ar, ac] of aiPieces) {
      if (!aiFinish.has(`${ar},${ac}`)) {
        // Фишка ИИ на пути к цели противника — мешает ему
        for (const [or_, oc] of oppPieces) {
          const dist = Math.max(Math.abs(ar - or_), Math.abs(ac - oc));
          if (dist <= 2) score += 2;
        }
      }
    }
  } else if (difficulty === 'medium') {
    score += oppDist * 0.5;
    score -= oppInFinish * 10;
  }

  // Штраф за «застрявшие» фишки: далеко от цели и далеко от остальных
  for (const [pr, pc] of aiPieces) {
    const distToTarget = aiPlayer === 1
      ? (rows - 1 - pr) + (cols - 1 - pc)
      : pr + pc;
    if (distToTarget > rows + cols - 4) {
      // Фишка очень далеко от цели — штраф
      score -= 5;
    }
  }

  return score;
}

// === Сортировка ходов для альфа-бета ===

function sortMoves(moves, board, zones, player) {
  const rows = board.length;
  const cols = board[0].length;
  const finishZone = player === 1 ? zones.player2 : zones.player1;

  return moves.sort((a, b) => {
    // Приоритет 1: ходы в зону финиша
    const aToFinish = finishZone.has(`${a.toRow},${a.toCol}`) ? 1 : 0;
    const bToFinish = finishZone.has(`${b.toRow},${b.toCol}`) ? 1 : 0;
    if (aToFinish !== bToFinish) return bToFinish - aToFinish;

    // Приоритет 2: больший прогресс к цели
    const aDist = player === 1
      ? (a.fromRow + a.fromCol) - (a.toRow + a.toCol)   // player 1 wants to increase r+c
      : (a.toRow + a.toCol) - (a.fromRow + a.fromCol);   // player 2 wants to decrease r+c

    // Wait, player 1 target is bottom-right, so higher r+c = closer. Progress = to(r+c) - from(r+c)
    // player 2 target is top-left, so lower r+c = closer. Progress = from(r+c) - to(r+c)
    const aProgress = player === 1
      ? (a.toRow + a.toCol) - (a.fromRow + a.fromCol)
      : (a.fromRow + a.fromCol) - (a.toRow + a.toCol);
    const bProgress = player === 1
      ? (b.toRow + b.toCol) - (b.fromRow + b.fromCol)
      : (b.fromRow + b.fromCol) - (b.toRow + b.toCol);

    if (aProgress !== bProgress) return bProgress - aProgress;

    // Приоритет 3: дальние ходы (прыжки) первыми
    const aLen = Math.abs(a.toRow - a.fromRow) + Math.abs(a.toCol - a.fromCol);
    const bLen = Math.abs(b.toRow - b.fromRow) + Math.abs(b.toCol - b.fromCol);
    return bLen - aLen;
  });
}

// === Minimax с альфа-бета отсечением ===

function minimax(board, zones, depth, alpha, beta, maximizing, aiPlayer, difficulty, deadline) {
  if (Date.now() > deadline) {
    return { score: evaluate(board, zones, aiPlayer, difficulty), timeout: true };
  }

  const winner = checkWin(board, zones);
  if (winner === aiPlayer) return { score: 100000 + depth };
  if (winner !== null) return { score: -100000 - depth };
  if (depth === 0) return { score: evaluate(board, zones, aiPlayer, difficulty) };

  const currentPlayer = maximizing ? aiPlayer : (aiPlayer === 1 ? 2 : 1);
  let moves = getAllMoves(board, zones, currentPlayer);

  if (moves.length === 0) return { score: evaluate(board, zones, aiPlayer, difficulty) };

  moves = sortMoves(moves, board, zones, currentPlayer);

  let bestMove = moves[0];

  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
      const result = minimax(newBoard, zones, depth - 1, alpha, beta, false, aiPlayer, difficulty, deadline);
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
      const result = minimax(newBoard, zones, depth - 1, alpha, beta, true, aiPlayer, difficulty, deadline);
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

// === Главная функция ИИ ===

export function getBestMove(board, zones, aiPlayer, difficulty) {
  const rows = board.length;
  const cols = board[0].length;
  const isLargeBoard = Math.max(rows, cols) >= 12;

  const deadline = Date.now() + 2000;

  if (difficulty === 'easy') {
    // Жадный: оценить все ходы, выбрать лучший + случайный шум
    const moves = getAllMoves(board, zones, aiPlayer);
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      const newBoard = makeMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
      const score = evaluate(newBoard, zones, aiPlayer, difficulty) + (Math.random() * 10 - 5);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // Средний и Сложный — Minimax с альфа-бета
  let depth;
  if (difficulty === 'medium') {
    depth = isLargeBoard ? 2 : 3;
  } else {
    depth = isLargeBoard ? 3 : 4;
  }

  const result = minimax(board, zones, depth, -Infinity, Infinity, true, aiPlayer, difficulty, deadline);
  return result.move || null;
}

// === Константы ===

const CORNER_K = { small: 3, medium: 4, large: 5 };

const DIRECTIONS = [
          [-1, 0],
  [0, -1],         [0, 1],
          [1, 0],
];

// === Вспомогательные функции ===

export function getCornerK(cornerSize) {
  return CORNER_K[cornerSize] ?? 4;
}

export function getMaxCornerSize(rows, cols) {
  const area = rows * cols;
  const maxPieces = Math.floor(area * 0.3);
  if (squareCount(5) <= maxPieces) return 'large';
  if (squareCount(4) <= maxPieces) return 'medium';
  return 'small';
}

function squareCount(k) {
  return k * k;
}

function inBounds(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function key(row, col) {
  return `${row},${col}`;
}

// === Создание доски ===

export function createBoard(rows, cols, cornerSize) {
  const K = getCornerK(cornerSize);
  const board = Array.from({ length: rows }, () => Array(cols).fill(null));
  const player1Zone = new Set();
  const player2Zone = new Set();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < K && c < K) {
        player1Zone.add(key(r, c));
        board[r][c] = 1;
      }
      if (r >= rows - K && c >= cols - K) {
        player2Zone.add(key(r, c));
        board[r][c] = 2;
      }
    }
  }

  return {
    board,
    zones: { player1: player1Zone, player2: player2Zone },
  };
}

// === Допустимые ходы ===

export function getValidMoves(board, row, col, zones, currentPlayer) {
  const rows = board.length;
  const cols = board[0].length;
  const steps = [];
  const jumps = [];
  const jumpPaths = new Map();

  // Шаги — 4 соседних клетки
  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc, rows, cols) && board[nr][nc] === null) {
      steps.push([nr, nc]);
    }
  }

  // Прыжки — BFS
  const visited = new Set();
  visited.add(key(row, col));
  const queue = [[row, col, []]];

  while (queue.length > 0) {
    const [cr, cc, path] = queue.shift();
    for (const [dr, dc] of DIRECTIONS) {
      const mr = cr + dr;
      const mc = cc + dc;
      const lr = cr + dr * 2;
      const lc = cc + dc * 2;
      if (
        inBounds(mr, mc, rows, cols) &&
        inBounds(lr, lc, rows, cols) &&
        board[mr][mc] !== null &&
        board[lr][lc] === null &&
        !visited.has(key(lr, lc))
      ) {
        visited.add(key(lr, lc));
        const newPath = [...path, [cr, cc]];
        jumps.push([lr, lc]);
        jumpPaths.set(key(lr, lc), [...newPath, [lr, lc]]);
        queue.push([lr, lc, newPath]);
      }
    }
  }

  return { steps, jumps, jumpPaths };
}

// === Выполнение хода ===

export function makeMove(board, fromRow, fromCol, toRow, toCol) {
  const newBoard = board.map((r) => [...r]);
  newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
  newBoard[fromRow][fromCol] = null;
  return newBoard;
}

// === Проверка победы ===

export function checkWin(board, zones) {
  const p1Wins = [...zones.player2].every((k) => {
    const [r, c] = k.split(',').map(Number);
    return board[r][c] === 1;
  });
  const p2Wins = [...zones.player1].every((k) => {
    const [r, c] = k.split(',').map(Number);
    return board[r][c] === 2;
  });
  if (p1Wins) return 1;
  if (p2Wins) return 2;
  return null;
}

// === Путь прыжка ===

export function getJumpPath(jumpPaths, targetRow, targetCol) {
  return jumpPaths.get(key(targetRow, targetCol)) ?? [];
}

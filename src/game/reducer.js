import { createBoard, getValidMoves, makeMove, checkWin } from './logic';
import { FREE_UNDO_LIMIT } from '../constants';

export function createInitialGameState(settings) {
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

export function gameReducer(state, action) {
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

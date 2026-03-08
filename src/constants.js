// ===================== Board Presets =====================

export const BOARD_PRESETS = [
  { key: 'small',  label: '8\u00d78',   description: '9 \u0444\u0438\u0448\u0435\u043a',  rows: 8,  cols: 8,  cornerSize: 'small'  },
  { key: 'medium', label: '12\u00d712', description: '16 \u0444\u0438\u0448\u0435\u043a', rows: 12, cols: 12, cornerSize: 'medium' },
  { key: 'large',  label: '16\u00d716', description: '25 \u0444\u0438\u0448\u0435\u043a', rows: 16, cols: 16, cornerSize: 'large'  },
];

// ===================== Settings =====================

export const DEFAULT_SETTINGS = {
  rows: 8,
  cols: 8,
  cornerSize: 'small',
  firstMove: 'random',
  difficulty: 'medium',
};

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '\u041b\u0451\u0433\u043a\u0438\u0439' },
  { value: 'medium', label: '\u0421\u0440\u0435\u0434\u043d\u0438\u0439' },
  { value: 'hard', label: '\u0421\u043b\u043e\u0436\u043d\u044b\u0439' },
];

export const DIFFICULTY_LABELS = { easy: '\u041b\u0451\u0433\u043a\u0438\u0439', medium: '\u0421\u0440\u0435\u0434\u043d\u0438\u0439', hard: '\u0421\u043b\u043e\u0436\u043d\u044b\u0439' };

// ===================== Players =====================

export const AI_PLAYER = 1;
export const HUMAN_PLAYER = 2;

// ===================== Gameplay =====================

export const FREE_UNDO_LIMIT = 2;
export const AI_MOVE_DELAY = 400;
export const ANIMATION_STEP_MS = 250;
export const TRANSITION_DURATION_MS = 200;
export const AI_DEADLINE_MS = 2000;
export const PIECE_SIZE_PERCENT = 70;

// ===================== AI Scores =====================

export const AI_SCORES = {
  WIN: 100_000,
  REPEAT_ONCE: -500,
  REPEAT_TWICE: -5000,
  REPEAT_TRIPLE: -100_000,
};

// ===================== Stats =====================

export const DEFAULT_STATS = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  bestMoves: null,
  bestTime: null,
};

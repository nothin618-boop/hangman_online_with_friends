import { getRandomWord, RescueWord, CategoryType } from './words';
import { calculateMillisecondScore, DetailedScoreBreakdown } from './scoring_system';

export type GameMode = 'solo' | 'coop' | 'duel' | 'online';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  targetWord: string;
  category: string;
  hint: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxStrikes: number;
  status: GameStatus;
  scannedLetters: string[];
  scannerUsed: boolean;
  rechargeUsed: boolean;
  mode: GameMode;
  turn: 1 | 2; // For Co-Op
  streak: number;
  score: number;
  player1Score: number;
  player2Score: number;
  roundStartTimeMs: number;
  lastSolveTimeMs?: number;
  lastScoreBreakdown?: DetailedScoreBreakdown;
}

export const MAX_STRIKES = 7;

export function createInitialState(
  category: CategoryType = 'ALL',
  mode: GameMode = 'solo',
  customWord?: string,
  customHint?: string,
  excludeWords?: string[],
  excludeCategory?: string
): GameState {
  let selected: RescueWord;

  if (customWord && customWord.trim().length >= 3) {
    selected = {
      word: customWord.trim().toUpperCase().replace(/[^A-Z]/g, ''),
      category: 'CUSTOM DUEL',
      hint: customHint?.trim() || 'Custom secret codename created by Operative 1',
    };
  } else {
    selected = getRandomWord(category, excludeWords, excludeCategory);
  }

  return {
    targetWord: selected.word.toUpperCase(),
    category: selected.category,
    hint: selected.hint,
    guessedLetters: [],
    wrongGuesses: 0,
    maxStrikes: MAX_STRIKES,
    status: 'playing',
    scannedLetters: [],
    scannerUsed: false,
    rechargeUsed: false,
    mode,
    turn: 1,
    streak: 0,
    score: 0,
    player1Score: 0,
    player2Score: 0,
    roundStartTimeMs: Date.now(),
  };
}

export function guessLetter(state: GameState, letter: string): {
  state: GameState;
  isCorrect: boolean;
  alreadyGuessed: boolean;
} {
  const char = letter.toUpperCase();
  if (state.status !== 'playing') {
    return { state, isCorrect: false, alreadyGuessed: false };
  }

  if (state.guessedLetters.includes(char)) {
    return { state, isCorrect: false, alreadyGuessed: true };
  }

  const newGuessed = [...state.guessedLetters, char];
  const isCorrect = state.targetWord.includes(char);
  const newWrong = isCorrect ? state.wrongGuesses : state.wrongGuesses + 1;

  // Check Win condition: All letters in targetWord have been guessed
  const uniqueTargetLetters = Array.from(new Set(state.targetWord.split('')));
  const isWon = uniqueTargetLetters.every((l) => newGuessed.includes(l));
  const isLost = !isWon && newWrong >= state.maxStrikes;

  const newStatus: GameStatus = isWon ? 'won' : isLost ? 'lost' : 'playing';

  // Score calculations
  let newStreak = state.streak;
  let newScore = state.score;
  let p1Score = state.player1Score;
  let p2Score = state.player2Score;
  let lastSolveTimeMs: number | undefined;
  let lastScoreBreakdown: DetailedScoreBreakdown | undefined;

  if (isWon) {
    newStreak += 1;
    const now = Date.now();
    lastSolveTimeMs = Math.max(1, now - (state.roundStartTimeMs || now));
    lastScoreBreakdown = calculateMillisecondScore({
      word: state.targetWord,
      solveTimeMs: lastSolveTimeMs,
      wrongGuesses: newWrong,
      isSolved: true,
      currentStreak: newStreak,
    });
    newScore += lastScoreBreakdown.total;
    if (state.turn === 1) p1Score += lastScoreBreakdown.total;
    else p2Score += lastScoreBreakdown.total;
  } else if (isLost) {
    newStreak = 0;
  } else if (isCorrect) {
    newScore += 20;
    if (state.turn === 1) p1Score += 20;
    else p2Score += 20;
  }

  // Alternate turn in Co-Op
  const nextTurn: 1 | 2 = state.mode === 'coop' ? (state.turn === 1 ? 2 : 1) : 1;

  return {
    state: {
      ...state,
      guessedLetters: newGuessed,
      wrongGuesses: newWrong,
      status: newStatus,
      turn: nextTurn,
      streak: newStreak,
      score: newScore,
      player1Score: p1Score,
      player2Score: p2Score,
      lastSolveTimeMs: isWon ? lastSolveTimeMs : state.lastSolveTimeMs,
      lastScoreBreakdown: isWon ? lastScoreBreakdown : state.lastScoreBreakdown,
    },
    isCorrect,
    alreadyGuessed: false,
  };
}

/**
 * Scanner Power-Up:
 * Disables 3 alphabet letters that are NOT in target word and haven't been guessed yet.
 */
export function applyScanner(state: GameState): GameState {
  if (state.status !== 'playing' || state.scannerUsed) return state;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const targetChars = new Set(state.targetWord.split(''));

  const candidates = alphabet.filter(
    (l) => !targetChars.has(l) && !state.guessedLetters.includes(l) && !state.scannedLetters.includes(l)
  );

  // Pick up to 3 random decoys
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  const eliminated = shuffled.slice(0, 3);

  return {
    ...state,
    scannerUsed: true,
    scannedLetters: [...state.scannedLetters, ...eliminated],
    guessedLetters: [...state.guessedLetters, ...eliminated], // auto-mark so they show disabled
  };
}

/**
 * Recharge Power-Up:
 * Restores 1 lost energy core and raises stickman back up!
 */
export function applyRecharge(state: GameState): GameState {
  if (state.status !== 'playing' || state.rechargeUsed || state.wrongGuesses <= 0) return state;

  return {
    ...state,
    rechargeUsed: true,
    wrongGuesses: Math.max(0, state.wrongGuesses - 1),
  };
}

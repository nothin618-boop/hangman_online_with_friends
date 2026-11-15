import { ScoreBreakdown } from './types';

export const MAX_CANOPY_FLOATS = 7;
export const BASE_VICTORY_POINTS = 100;
export const FIRST_SOLVER_BONUS = 50;
export const FLOAT_HEALTH_MULTIPLIER = 15;

/**
 * Calculates authoritative score breakdown for a player in a round.
 * 
 * Rules:
 * 1. "jo wrong karenga vo koi point nahi":
 *    If player failed (parachute deflated, wrongGuesses >= 7, or time expired without solving):
 *    Strictly 0 points are awarded.
 * 2. If successfully solved:
 *    - Base Points: 100
 *    - Speed Bonus: Math.round((remainingSeconds / totalSeconds) * 100)
 *    - Canopy Health Bonus: remainingFloats * 15 (rewards accuracy)
 *    - First Finisher Bonus: +50 pts if player triggered the sudden-death rush timer
 */
export function calculatePlayerRoundScore(params: {
  isSolved: boolean;
  wrongGuesses: number;
  remainingSeconds: number;
  totalSeconds: number;
  isFirstSolver: boolean;
  solveTimeMs?: number;
}): ScoreBreakdown {
  const { isSolved, wrongGuesses, remainingSeconds, totalSeconds, isFirstSolver, solveTimeMs } = params;

  // Strict 0 Points rule for failure or landed stickman
  if (!isSolved || wrongGuesses >= MAX_CANOPY_FLOATS || remainingSeconds <= 0) {
    return {
      base: 0,
      speedBonus: 0,
      canopyBonus: 0,
      firstSolveBonus: 0,
      solveTimeMs: 0,
      solveTimeFormatted: '0.00s',
      total: 0,
    };
  }

  const safeTotal = Math.max(1, totalSeconds);
  const safeRemaining = Math.max(0, Math.min(remainingSeconds, safeTotal));

  const base = BASE_VICTORY_POINTS;
  const speedBonus = Math.round((safeRemaining / safeTotal) * 100);
  const remainingFloats = Math.max(0, MAX_CANOPY_FLOATS - wrongGuesses);
  const canopyBonus = remainingFloats * FLOAT_HEALTH_MULTIPLIER;
  const firstSolveBonus = isFirstSolver ? FIRST_SOLVER_BONUS : 0;

  const total = base + speedBonus + canopyBonus + firstSolveBonus;

  return {
    base,
    speedBonus,
    canopyBonus,
    firstSolveBonus,
    solveTimeMs,
    solveTimeFormatted: solveTimeMs ? (solveTimeMs / 1000).toFixed(2) + 's' : undefined,
    isFlawless: wrongGuesses === 0,
    total,
  };
}

/**
 * Calculates round duration according to secret word length
 * - Short (3-5 letters): 30 seconds
 * - Medium (6-8 letters): 45 seconds
 * - Long (9+ letters): 60 seconds
 */
export function getWordRoundDuration(word: string): number {
  const clean = word.trim();
  if (clean.length <= 5) return 30;
  if (clean.length <= 8) return 45;
  return 60;
}

export const RUSH_TIMER_SECONDS = 15;


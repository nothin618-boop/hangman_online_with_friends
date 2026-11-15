/**
 * Millisecond-Precision Authoritative Scoring System for Stickman Rescue
 * 
 * Operates across all modes: Solo, Co-Op, Duel, and Online Multiplayer.
 * Guarantees fair, deterministic points based on exact millisecond reaction speed,
 * parachute canopy preservation, word complexity, and competitive placements.
 */

export const MAX_CANOPY_FLOATS = 7;
export const MIN_HUMAN_SOLVE_TIME_MS = 2000; // 2.0s: fastest human reaction threshold
export const MAX_ROUND_TIME_MS = 45000;       // 45.0s: baseline round duration
export const MAX_SPEED_BONUS = 150;
export const MIN_SPEED_BONUS = 10;
export const FLAWLESS_CANOPY_BONUS = 150;
export const FLOAT_HEALTH_MULTIPLIER = 15;
export const CLUTCH_THRESHOLD_MS = 3000;      // <= 3.0s in rush
export const CLUTCH_BONUS = 50;

export interface MillisecondScoreParams {
  word: string;
  solveTimeMs: number;
  wrongGuesses: number;
  isSolved: boolean;
  totalRoundTimeMs?: number;
  isFirstSolver?: boolean;
  placement?: number; // 1 = 1st, 2 = 2nd, 3 = 3rd, etc.
  isRushActive?: boolean;
  rushRemainingMs?: number;
  currentStreak?: number; // consecutive games won
}

export interface DetailedScoreBreakdown {
  base: number;
  wordLength: number;
  wordTier: 'short' | 'medium' | 'long';
  solveTimeMs: number;
  solveTimeFormatted: string;
  speedBonus: number;
  speedRating: {
    label: string;
    icon: string;
  };
  remainingFloats: number;
  canopyBonus: number;
  isFlawless: boolean;
  placement?: number;
  placementBonus: number;
  isClutch: boolean;
  clutchBonus: number;
  subtotal: number;
  streakCount: number;
  streakMultiplier: number;
  streakBonus: number;
  total: number;
}

/**
 * Classifies word length tier and returns base points:
 * - Short (3-5 chars): 100 pts
 * - Medium (6-8 chars): 150 pts
 * - Long (9+ chars): 200 pts
 */
export function getWordBaseScore(word: string): {
  base: number;
  tier: 'short' | 'medium' | 'long';
} {
  const len = word.trim().length;
  if (len <= 5) {
    return { base: 100, tier: 'short' };
  }
  if (len <= 8) {
    return { base: 150, tier: 'medium' };
  }
  return { base: 200, tier: 'long' };
}

/**
 * Calculates continuous millisecond speed bonus using a smooth decay curve.
 * 
 * Formula:
 * For solveTimeMs <= T_min (2,000ms): 150 pts
 * For solveTimeMs >= T_max (45,000ms): 10 pts
 * In between: decayed smoothly via power curve (1.15).
 */
export function calculateMillisecondSpeedBonus(
  solveTimeMs: number,
  maxRoundMs: number = MAX_ROUND_TIME_MS
): number {
  if (solveTimeMs <= 0) return 0;
  if (solveTimeMs <= MIN_HUMAN_SOLVE_TIME_MS) {
    return MAX_SPEED_BONUS;
  }
  const safeMax = Math.max(MIN_HUMAN_SOLVE_TIME_MS + 1000, maxRoundMs);
  if (solveTimeMs >= safeMax) {
    return MIN_SPEED_BONUS;
  }

  const fractionRemaining = Math.max(
    0,
    1 - (solveTimeMs - MIN_HUMAN_SOLVE_TIME_MS) / (safeMax - MIN_HUMAN_SOLVE_TIME_MS)
  );

  const bonusSpan = MAX_SPEED_BONUS - MIN_SPEED_BONUS; // 140
  const bonus = MIN_SPEED_BONUS + Math.round(bonusSpan * Math.pow(fractionRemaining, 1.15));
  return Math.max(MIN_SPEED_BONUS, Math.min(MAX_SPEED_BONUS, bonus));
}

/**
 * Formats milliseconds into human-readable seconds with 2 decimal places (e.g. 5.43s)
 */
export function formatSolveTime(ms: number): string {
  if (ms <= 0 || !Number.isFinite(ms)) return '0.00s';
  return (ms / 1000).toFixed(2) + 's';
}

/**
 * Gives an evocative rating label and icon based on solve time
 */
export function getSpeedRating(solveTimeMs: number): { label: string; icon: string } {
  if (solveTimeMs <= 3000) return { label: 'GODSPEED', icon: '⚡⚡' };
  if (solveTimeMs <= 6000) return { label: 'LIGHTNING', icon: '⚡' };
  if (solveTimeMs <= 10000) return { label: 'BLAZING', icon: '🚀' };
  if (solveTimeMs <= 18000) return { label: 'VERY FAST', icon: '⏱️' };
  if (solveTimeMs <= 28000) return { label: 'SOLID', icon: '🎯' };
  return { label: 'CLOSE CALL', icon: '⚠️' };
}

/**
 * Computes win streak multiplier:
 * - 0-1 wins: 1.0x
 * - 2 wins: 1.1x (+10%)
 * - 3 wins: 1.2x (+20%)
 * - 4 wins: 1.35x (+35%)
 * - 5+ wins: 1.5x (+50% ON FIRE!)
 */
export function getStreakMultiplier(streak: number): number {
  if (streak <= 1) return 1.0;
  if (streak === 2) return 1.1;
  if (streak === 3) return 1.2;
  if (streak === 4) return 1.35;
  return 1.5;
}

/**
 * Authoritative Millisecond Scoring Engine
 * 
 * Rules:
 * 1. Failure / Crash Landing:
 *    If !isSolved OR wrongGuesses >= 7 OR timeout, returns strictly 0 points.
 * 2. Word Base:
 *    Short = 100, Medium = 150, Long = 200
 * 3. Continuous Speed:
 *    Exact ms decay curve (10 to 150 pts)
 * 4. Canopy Floats:
 *    Flawless (0 wrong) = 150 pts. Otherwise remainingFloats * 15 pts.
 * 5. Multiplayer Placement:
 *    1st = +100, 2nd = +50, 3rd = +25, other solvers = +10.
 * 6. Sudden Death Clutch:
 *    Solved with <= 3000ms remaining in rush = +50 pts.
 * 7. Win Streak Multiplier:
 *    Subtotal * multiplier applied on top.
 */
export function calculateMillisecondScore(
  params: MillisecondScoreParams
): DetailedScoreBreakdown {
  const {
    word,
    solveTimeMs,
    wrongGuesses,
    isSolved,
    totalRoundTimeMs = MAX_ROUND_TIME_MS,
    isFirstSolver,
    placement,
    isRushActive,
    rushRemainingMs,
    currentStreak = 0,
  } = params;

  const wordLength = word.trim().length;
  const { base, tier } = getWordBaseScore(word);
  const remainingFloats = Math.max(0, MAX_CANOPY_FLOATS - wrongGuesses);
  const solveTimeFormatted = formatSolveTime(solveTimeMs);
  const speedRating = getSpeedRating(solveTimeMs);

  // Strict 0-points rule for failed/landed stickman
  if (!isSolved || wrongGuesses >= MAX_CANOPY_FLOATS || solveTimeMs <= 0) {
    return {
      base: 0,
      wordLength,
      wordTier: tier,
      solveTimeMs: 0,
      solveTimeFormatted: '0.00s',
      speedBonus: 0,
      speedRating: { label: 'LANDED', icon: '☁️' },
      remainingFloats: 0,
      canopyBonus: 0,
      isFlawless: false,
      placementBonus: 0,
      isClutch: false,
      clutchBonus: 0,
      subtotal: 0,
      streakCount: 0,
      streakMultiplier: 1.0,
      streakBonus: 0,
      total: 0,
    };
  }

  // 1. Continuous Speed Bonus
  const speedBonus = calculateMillisecondSpeedBonus(solveTimeMs, totalRoundTimeMs);

  // 2. Canopy Health & Flawless Bonus
  const isFlawless = wrongGuesses === 0;
  const canopyBonus = isFlawless
    ? FLAWLESS_CANOPY_BONUS
    : remainingFloats * FLOAT_HEALTH_MULTIPLIER;

  // 3. Multiplayer Placement Bonus
  let placementBonus = 0;
  const resolvedPlacement = placement ?? (isFirstSolver ? 1 : undefined);
  if (resolvedPlacement === 1) {
    placementBonus = 100;
  } else if (resolvedPlacement === 2) {
    placementBonus = 50;
  } else if (resolvedPlacement === 3) {
    placementBonus = 25;
  } else if (resolvedPlacement && resolvedPlacement > 3) {
    placementBonus = 10;
  }

  // 4. Sudden Death Clutch Bonus
  const isClutch =
    Boolean(isRushActive) &&
    typeof rushRemainingMs === 'number' &&
    rushRemainingMs > 0 &&
    rushRemainingMs <= CLUTCH_THRESHOLD_MS;
  const clutchBonus = isClutch ? CLUTCH_BONUS : 0;

  // 5. Subtotal before Streak Multiplier
  const subtotal = base + speedBonus + canopyBonus + placementBonus + clutchBonus;

  // 6. Streak Multiplier
  const multiplier = getStreakMultiplier(currentStreak);
  const totalWithMultiplier = Math.round(subtotal * multiplier);
  const streakBonus = totalWithMultiplier - subtotal;

  return {
    base,
    wordLength,
    wordTier: tier,
    solveTimeMs,
    solveTimeFormatted,
    speedBonus,
    speedRating,
    remainingFloats,
    canopyBonus,
    isFlawless,
    placement: resolvedPlacement,
    placementBonus,
    isClutch,
    clutchBonus,
    subtotal,
    streakCount: currentStreak,
    streakMultiplier: multiplier,
    streakBonus,
    total: totalWithMultiplier,
  };
}


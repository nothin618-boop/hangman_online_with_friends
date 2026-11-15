import { describe, it, expect } from 'vitest';
import {
  getWordBaseScore,
  calculateMillisecondSpeedBonus,
  formatSolveTime,
  getSpeedRating,
  getStreakMultiplier,
  calculateMillisecondScore,
  MAX_CANOPY_FLOATS,
  MAX_SPEED_BONUS,
  MIN_SPEED_BONUS,
  FLAWLESS_CANOPY_BONUS,
  FLOAT_HEALTH_MULTIPLIER,
  CLUTCH_BONUS,
} from '@/lib/cyber_rescue/scoring_system';

describe('Millisecond-Precision Scoring System Suite', () => {
  describe('1. Word Length Base Score Tiering', () => {
    it('awards 100 base points for short words (<= 5 letters)', () => {
      expect(getWordBaseScore('CAT')).toEqual({ base: 100, tier: 'short' });
      expect(getWordBaseScore('WIND')).toEqual({ base: 100, tier: 'short' });
      expect(getWordBaseScore('CYBER')).toEqual({ base: 100, tier: 'short' });
    });

    it('awards 150 base points for medium words (6-8 letters)', () => {
      expect(getWordBaseScore('RESCUE')).toEqual({ base: 150, tier: 'medium' });
      expect(getWordBaseScore('PACMAN')).toEqual({ base: 150, tier: 'medium' });
      expect(getWordBaseScore('QUANTUM')).toEqual({ base: 150, tier: 'medium' });
      expect(getWordBaseScore('AIRBORNE')).toEqual({ base: 150, tier: 'medium' });
    });

    it('awards 200 base points for long words (>= 9 letters)', () => {
      expect(getWordBaseScore('PARACHUTE')).toEqual({ base: 200, tier: 'long' });
      expect(getWordBaseScore('CYBERNETIC')).toEqual({ base: 200, tier: 'long' });
      expect(getWordBaseScore('STEALTHDRONE')).toEqual({ base: 200, tier: 'long' });
    });
  });

  describe('2. Continuous Millisecond Speed Bonus Curve', () => {
    it('awards maximum 150 points for lightning reaction (<= 2000 ms)', () => {
      expect(calculateMillisecondSpeedBonus(500)).toBe(MAX_SPEED_BONUS);
      expect(calculateMillisecondSpeedBonus(1200)).toBe(MAX_SPEED_BONUS);
      expect(calculateMillisecondSpeedBonus(2000)).toBe(MAX_SPEED_BONUS);
    });

    it('awards minimum 10 points for late solves (>= 45000 ms)', () => {
      expect(calculateMillisecondSpeedBonus(45000)).toBe(MIN_SPEED_BONUS);
      expect(calculateMillisecondSpeedBonus(50000)).toBe(MIN_SPEED_BONUS);
    });

    it('smoothly and monotonically decays between 2s and 45s', () => {
      const times = [2000, 3500, 6000, 10000, 15000, 25000, 35000, 44000, 45000];
      const scores = times.map((t) => calculateMillisecondSpeedBonus(t));

      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }

      // Check specific ranges
      expect(calculateMillisecondSpeedBonus(4000)).toBeGreaterThanOrEqual(135);
      expect(calculateMillisecondSpeedBonus(10000)).toBeGreaterThanOrEqual(105);
      expect(calculateMillisecondSpeedBonus(20000)).toBeGreaterThanOrEqual(60);
    });

    it('gives a measurable point difference for 200-500 millisecond differences', () => {
      const faster = calculateMillisecondSpeedBonus(6000);
      const slower = calculateMillisecondSpeedBonus(8000);
      expect(faster).toBeGreaterThan(slower);
    });

    it('formats millisecond timestamps to 2 decimal places with s suffix', () => {
      expect(formatSolveTime(5432)).toBe('5.43s');
      expect(formatSolveTime(7000)).toBe('7.00s');
      expect(formatSolveTime(12080)).toBe('12.08s');
      expect(formatSolveTime(450)).toBe('0.45s');
      expect(formatSolveTime(0)).toBe('0.00s');
      expect(formatSolveTime(-100)).toBe('0.00s');
    });

    it('assigns appropriate speed rating labels', () => {
      expect(getSpeedRating(1800).label).toBe('GODSPEED');
      expect(getSpeedRating(4500).label).toBe('LIGHTNING');
      expect(getSpeedRating(8200).label).toBe('BLAZING');
      expect(getSpeedRating(14000).label).toBe('VERY FAST');
      expect(getSpeedRating(22000).label).toBe('SOLID');
      expect(getSpeedRating(35000).label).toBe('CLOSE CALL');
    });
  });

  describe('3. Parachute Canopy Integrity & Flawless Accuracy', () => {
    it('awards 150 points for flawless canopy (0 wrong guesses, all 7 floats intact)', () => {
      const res = calculateMillisecondScore({
        word: 'SKY',
        solveTimeMs: 4000,
        wrongGuesses: 0,
        isSolved: true,
      });

      expect(res.isFlawless).toBe(true);
      expect(res.remainingFloats).toBe(7);
      expect(res.canopyBonus).toBe(FLAWLESS_CANOPY_BONUS);
    });

    it('awards 15 points per remaining float when degraded (1-6 wrong guesses)', () => {
      // 1 wrong guess = 6 floats left = 90 pts
      const res1 = calculateMillisecondScore({
        word: 'SKY',
        solveTimeMs: 4000,
        wrongGuesses: 1,
        isSolved: true,
      });
      expect(res1.isFlawless).toBe(false);
      expect(res1.remainingFloats).toBe(6);
      expect(res1.canopyBonus).toBe(6 * FLOAT_HEALTH_MULTIPLIER); // 90

      // 4 wrong guesses = 3 floats left = 45 pts
      const res4 = calculateMillisecondScore({
        word: 'SKY',
        solveTimeMs: 4000,
        wrongGuesses: 4,
        isSolved: true,
      });
      expect(res4.remainingFloats).toBe(3);
      expect(res4.canopyBonus).toBe(3 * FLOAT_HEALTH_MULTIPLIER); // 45
    });
  });

  describe('4. Strict Zero-Points Failure Rule ("jo wrong karenga vo koi point nahi")', () => {
    it('returns strictly 0 points for all breakdown fields if not solved', () => {
      const res = calculateMillisecondScore({
        word: 'RESCUE',
        solveTimeMs: 15000,
        wrongGuesses: 2,
        isSolved: false,
      });

      expect(res.total).toBe(0);
      expect(res.base).toBe(0);
      expect(res.speedBonus).toBe(0);
      expect(res.canopyBonus).toBe(0);
      expect(res.placementBonus).toBe(0);
      expect(res.streakBonus).toBe(0);
    });

    it('returns strictly 0 points if player deflates all 7 parachute floats', () => {
      const res = calculateMillisecondScore({
        word: 'RESCUE',
        solveTimeMs: 8000,
        wrongGuesses: 7,
        isSolved: true, // even if letter guessed at same instant as 7th strike
      });

      expect(res.total).toBe(0);
      expect(res.base).toBe(0);
      expect(res.canopyBonus).toBe(0);
    });

    it('returns strictly 0 points if solveTimeMs is 0 or negative', () => {
      const res = calculateMillisecondScore({
        word: 'RESCUE',
        solveTimeMs: 0,
        wrongGuesses: 0,
        isSolved: true,
      });

      expect(res.total).toBe(0);
    });
  });

  describe('5. Multiplayer Competitive Placement & Sudden Death Clutch', () => {
    it('awards +100 points for 1st solver (isFirstSolver or placement 1)', () => {
      const res = calculateMillisecondScore({
        word: 'GLIDER',
        solveTimeMs: 5000,
        wrongGuesses: 0,
        isSolved: true,
        placement: 1,
      });

      expect(res.placementBonus).toBe(100);
      expect(res.placement).toBe(1);
    });

    it('awards +50 for 2nd and +25 for 3rd and +10 for other finishers', () => {
      const res2 = calculateMillisecondScore({
        word: 'GLIDER',
        solveTimeMs: 6500,
        wrongGuesses: 0,
        isSolved: true,
        placement: 2,
      });
      expect(res2.placementBonus).toBe(50);

      const res3 = calculateMillisecondScore({
        word: 'GLIDER',
        solveTimeMs: 8500,
        wrongGuesses: 0,
        isSolved: true,
        placement: 3,
      });
      expect(res3.placementBonus).toBe(25);

      const res4 = calculateMillisecondScore({
        word: 'GLIDER',
        solveTimeMs: 12000,
        wrongGuesses: 0,
        isSolved: true,
        placement: 4,
      });
      expect(res4.placementBonus).toBe(10);
    });

    it('awards +50 clutch bonus when solving within <= 3000ms of sudden death rush', () => {
      const clutchRes = calculateMillisecondScore({
        word: 'GLIDER',
        solveTimeMs: 14000,
        wrongGuesses: 1,
        isSolved: true,
        isRushActive: true,
        rushRemainingMs: 2500, // 2.5s remaining
      });

      expect(clutchRes.isClutch).toBe(true);
      expect(clutchRes.clutchBonus).toBe(CLUTCH_BONUS);
    });

    it('does not award clutch bonus if rush time remaining is > 3000ms', () => {
      const nonClutchRes = calculateMillisecondScore({
        word: 'GLIDER',
        solveTimeMs: 8000,
        wrongGuesses: 1,
        isSolved: true,
        isRushActive: true,
        rushRemainingMs: 8000, // 8.0s remaining
      });

      expect(nonClutchRes.isClutch).toBe(false);
      expect(nonClutchRes.clutchBonus).toBe(0);
    });
  });

  describe('6. Win Streak Multipliers', () => {
    it('applies correct multipliers by streak tier', () => {
      expect(getStreakMultiplier(0)).toBe(1.0);
      expect(getStreakMultiplier(1)).toBe(1.0);
      expect(getStreakMultiplier(2)).toBe(1.1);
      expect(getStreakMultiplier(3)).toBe(1.2);
      expect(getStreakMultiplier(4)).toBe(1.35);
      expect(getStreakMultiplier(5)).toBe(1.5);
      expect(getStreakMultiplier(10)).toBe(1.5);
    });

    it('multiplies subtotal by streak multiplier and calculates streakBonus', () => {
      const res = calculateMillisecondScore({
        word: 'CYBER', // Short = 100
        solveTimeMs: 2000, // Speed = 150
        wrongGuesses: 0, // Canopy = 150
        isSolved: true,
        currentStreak: 3, // 1.2x
      });

      // Subtotal = 100 + 150 + 150 = 400
      expect(res.subtotal).toBe(400);
      expect(res.streakMultiplier).toBe(1.2);
      // Total = 400 * 1.2 = 480
      expect(res.total).toBe(480);
      // Streak bonus = 480 - 400 = 80
      expect(res.streakBonus).toBe(80);
    });
  });
});


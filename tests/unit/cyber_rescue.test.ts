import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  guessLetter,
  applyScanner,
  applyRecharge,
  MAX_STRIKES,
} from '@/lib/cyber_rescue/engine';
import { getRandomWord, WORD_CATALOG } from '@/lib/cyber_rescue/words';

describe('CYBER RESCUE: JETPACK STICKMAN Engine Suite', () => {
  describe('1. Word Catalog & Initialization', () => {
    it('has catalog words across all categories', () => {
      expect(WORD_CATALOG.length).toBeGreaterThan(30);
      for (const item of WORD_CATALOG) {
        expect(item.word.length).toBeGreaterThanOrEqual(3);
        expect(item.hint.length).toBeGreaterThanOrEqual(5);
        expect(/^[A-Z]+$/.test(item.word)).toBe(true);
      }
    });

    it('generates random words by category', () => {
      const gamingWord = getRandomWord('GAMING');
      expect(gamingWord.category).toBe('GAMING');

      const movieWord = getRandomWord('MOVIES & HEROES');
      expect(movieWord.category).toBe('MOVIES & HEROES');
    });

    it('creates initial state correctly', () => {
      const state = createInitialState('GAMING', 'solo');
      expect(state.status).toBe('playing');
      expect(state.wrongGuesses).toBe(0);
      expect(state.maxStrikes).toBe(MAX_STRIKES);
      expect(state.guessedLetters).toEqual([]);
      expect(state.scannerUsed).toBe(false);
      expect(state.rechargeUsed).toBe(false);
      expect(state.mode).toBe('solo');
    });

    it('creates custom 1v1 duel state with custom secret word', () => {
      const state = createInitialState('ALL', 'duel', 'CYBERNETIC', 'Futuristic enhancement');
      expect(state.targetWord).toBe('CYBERNETIC');
      expect(state.category).toBe('CUSTOM DUEL');
      expect(state.hint).toBe('Futuristic enhancement');
      expect(state.mode).toBe('duel');
    });
  });

  describe('2. Letter Guessing & Strike Engine', () => {
    it('correct guess reveals letter and awards score', () => {
      const initial = createInitialState('ALL', 'solo', 'ROBOT', 'Automaton');
      const { state, isCorrect } = guessLetter(initial, 'O');

      expect(isCorrect).toBe(true);
      expect(state.wrongGuesses).toBe(0);
      expect(state.guessedLetters).toContain('O');
      expect(state.score).toBeGreaterThan(0);
      expect(state.status).toBe('playing');
    });

    it('wrong guess increments wrong count and leaves score unchanged', () => {
      const initial = createInitialState('ALL', 'solo', 'ROBOT', 'Automaton');
      const { state, isCorrect } = guessLetter(initial, 'Z');

      expect(isCorrect).toBe(false);
      expect(state.wrongGuesses).toBe(1);
      expect(state.guessedLetters).toContain('Z');
      expect(state.score).toBe(0);
      expect(state.status).toBe('playing');
    });

    it('re-guessing already guessed letter is ignored safely', () => {
      const initial = createInitialState('ALL', 'solo', 'ROBOT', 'Automaton');
      const { state: state1 } = guessLetter(initial, 'R');
      const { state: state2, alreadyGuessed } = guessLetter(state1, 'R');

      expect(alreadyGuessed).toBe(true);
      expect(state2.wrongGuesses).toBe(0);
    });

    it('winning by guessing all unique letters triggers victory & bonus score', () => {
      let state = createInitialState('ALL', 'solo', 'CAT', 'Feline');
      state = guessLetter(state, 'C').state;
      state = guessLetter(state, 'A').state;
      const res = guessLetter(state, 'T');

      expect(res.state.status).toBe('won');
      expect(res.state.streak).toBe(1);
      expect(res.state.score).toBeGreaterThanOrEqual(300);
    });

    it('losing by hitting 7 wrong guesses triggers lost status & resets streak', () => {
      let state = createInitialState('ALL', 'solo', 'CAT', 'Feline');
      state.streak = 5; // Previous streak
      const wrongChars = ['Z', 'X', 'Q', 'W', 'P', 'M', 'K'];

      for (const char of wrongChars) {
        state = guessLetter(state, char).state;
      }

      expect(state.wrongGuesses).toBe(7);
      expect(state.status).toBe('lost');
      expect(state.streak).toBe(0);
    });
  });

  describe('3. Hacker Power-Ups (Scanner & Recharge)', () => {
    it('Scanner power-up eliminates up to 3 non-target letters from keyboard', () => {
      const initial = createInitialState('ALL', 'solo', 'CAT', 'Feline');
      const updated = applyScanner(initial);

      expect(updated.scannerUsed).toBe(true);
      expect(updated.scannedLetters.length).toBe(3);
      // None of the eliminated letters should be C, A, or T
      for (const l of updated.scannedLetters) {
        expect(['C', 'A', 'T']).not.toContain(l);
      }
      expect(updated.guessedLetters.length).toBe(3);
    });

    it('Scanner can only be used once per match', () => {
      const initial = createInitialState('ALL', 'solo', 'CAT', 'Feline');
      const usedOnce = applyScanner(initial);
      const usedTwice = applyScanner(usedOnce);

      expect(usedTwice.scannedLetters.length).toBe(3);
    });

    it('Recharge power-up restores 1 lost life when wrongGuesses > 0', () => {
      let state = createInitialState('ALL', 'solo', 'CAT', 'Feline');
      state = guessLetter(state, 'Z').state;
      state = guessLetter(state, 'X').state;
      expect(state.wrongGuesses).toBe(2);

      const recharged = applyRecharge(state);
      expect(recharged.rechargeUsed).toBe(true);
      expect(recharged.wrongGuesses).toBe(1); // Restored from 2 to 1!
    });

    it('Recharge cannot be used when at 0 damage or already used', () => {
      const state = createInitialState('ALL', 'solo', 'CAT', 'Feline');
      expect(applyRecharge(state).wrongGuesses).toBe(0);
    });
  });

  describe('4. Squad Co-Op Mode Turn Alternation', () => {
    it('alternates turn between Operative 1 and Operative 2 in coop mode', () => {
      let state = createInitialState('ALL', 'coop', 'LASER', 'Coherent light');
      expect(state.turn).toBe(1);

      state = guessLetter(state, 'L').state;
      expect(state.turn).toBe(2);

      state = guessLetter(state, 'Z').state;
      expect(state.turn).toBe(1);
    });
  });
});

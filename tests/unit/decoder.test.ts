import { describe, it, expect } from 'vitest';
import { resolveDecoderGuess, DECODER_BONUS_HOPS } from '@/lib/decoder';
import { Chain } from '@/lib/types';

describe('Decoder Resolution Engine (decoder.ts)', () => {
  function createTestChain(overrides: Partial<Chain> = {}): Chain {
    return {
      id: 'chain-test-01',
      secretTheme: 'Cold War Espionage',
      themeOptions: ['Cold War Espionage', 'Cyberpunk Heist', 'Vatican Archives', 'Smuggler Run'],
      bannedWords: ['spy', 'agent', 'soviet', 'nuclear', 'embassy'],
      initialSentence: 'The midnight courier delivered secret dossiers across foggy Berlin streets.',
      currentSentence: 'The midnight courier delivered secret dossiers across foggy Berlin streets.',
      currentHop: 10,
      bonusHops: 0,
      lives: 3,
      maxHops: 100,
      history: [],
      status: 'in_progress',
      createdAt: Date.now(),
      ...overrides
    };
  }

  describe('Correct Guess Outcomes', () => {
    it('awards +10 bonus hops, advances hop count, and preserves signal lives', () => {
      const chain = createTestChain();
      const result = resolveDecoderGuess(chain, 'Cold War Espionage', 'player-42');

      expect(result.isCorrect).toBe(true);
      expect(result.bonusAwarded).toBe(DECODER_BONUS_HOPS);
      expect(result.chain.bonusHops).toBe(10);
      expect(result.chain.currentHop).toBe(11);
      expect(result.chain.lives).toBe(3);
      expect(result.chain.currentSentence).toBe(chain.initialSentence);
      expect(result.hop.role).toBe('decoder');
      expect(result.hop.isCorrectGuess).toBe(true);
    });

    it('matches theme case-insensitively and trims whitespace', () => {
      const chain = createTestChain();
      const result = resolveDecoderGuess(chain, '  cold war espionage  ', 'player-42');
      expect(result.isCorrect).toBe(true);
    });

    it('transitions chain status to "victory" when (currentHop + bonusHops) >= 100', () => {
      const chain = createTestChain({ currentHop: 90, bonusHops: 0 });
      const result = resolveDecoderGuess(chain, 'Cold War Espionage', 'player-42');

      expect(result.isCorrect).toBe(true);
      expect(result.chain.bonusHops).toBe(10);
      expect(result.chain.currentHop).toBe(91); // 91 + 10 = 101 >= 100
      expect(result.chain.status).toBe('victory');
      expect(result.chain.completedAt).toBeDefined();
    });
  });

  describe('Incorrect Guess Outcomes', () => {
    it('deducts 1 strike from signal lives, awards 0 bonus, and advances hop', () => {
      const chain = createTestChain();
      const result = resolveDecoderGuess(chain, 'Cyberpunk Heist', 'player-42');

      expect(result.isCorrect).toBe(false);
      expect(result.bonusAwarded).toBe(0);
      expect(result.chain.bonusHops).toBe(0);
      expect(result.chain.lives).toBe(2);
      expect(result.chain.currentHop).toBe(11);
      expect(result.chain.currentSentence).toBe(chain.initialSentence);
      expect(result.hop.role).toBe('decoder');
      expect(result.hop.isCorrectGuess).toBe(false);
    });

    it('transitions chain status to "destroyed" when lives reach 0', () => {
      const chain = createTestChain({ lives: 1 });
      const result = resolveDecoderGuess(chain, 'Wrong Guess Theme', 'player-42');

      expect(result.isCorrect).toBe(false);
      expect(result.chain.lives).toBe(0);
      expect(result.chain.status).toBe('destroyed');
      expect(result.chain.completedAt).toBeDefined();
    });
  });

  describe('Sentence Invariant & Boundary Guards', () => {
    it('never modifies sentence tokens during a Decoder deduction', () => {
      const originalSentence = 'The midnight shadow delivered secret dossiers across foggy Berlin streets.';
      const chain = createTestChain({ currentSentence: originalSentence });
      const result = resolveDecoderGuess(chain, 'Cold War Espionage', 'player-42');

      expect(result.chain.currentSentence).toBe(originalSentence);
      expect(result.hop.previousSentence).toBe(originalSentence);
      expect(result.hop.newSentence).toBe(originalSentence);
      expect(result.hop.oldWord).toBeUndefined();
      expect(result.hop.newWord).toBeUndefined();
    });

    it('throws error when submitting guess to an already finalized chain', () => {
      const victoryChain = createTestChain({ status: 'victory' });
      expect(() => resolveDecoderGuess(victoryChain, 'Cold War Espionage', 'p1')).toThrow(/finalized chain/);

      const destroyedChain = createTestChain({ status: 'destroyed' });
      expect(() => resolveDecoderGuess(destroyedChain, 'Cold War Espionage', 'p1')).toThrow(/finalized chain/);
    });
  });
});

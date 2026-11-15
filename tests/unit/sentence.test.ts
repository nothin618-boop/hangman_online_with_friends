import { describe, it, expect } from 'vitest';
import {
  parseWordToken,
  tokenizeSentence,
  formatReplacementToken,
  replaceWordInSentence
} from '@/lib/sentence';

describe('Sentence Utilities (sentence.ts)', () => {
  describe('parseWordToken', () => {
    it('parses pure alphabetic word token', () => {
      const parsed = parseWordToken('courier', 2);
      expect(parsed).toEqual({
        raw: 'courier',
        prefix: '',
        root: 'courier',
        suffix: '',
        index: 2
      });
    });

    it('parses token with leading and trailing punctuation', () => {
      const parsed = parseWordToken('"dossiers,"', 0);
      expect(parsed).toEqual({
        raw: '"dossiers,"',
        prefix: '"',
        root: 'dossiers',
        suffix: ',"',
        index: 0
      });
    });

    it('handles token ending with period', () => {
      const parsed = parseWordToken('streets.', 5);
      expect(parsed).toEqual({
        raw: 'streets.',
        prefix: '',
        root: 'streets',
        suffix: '.',
        index: 5
      });
    });
  });

  describe('tokenizeSentence', () => {
    it('splits sentence into array of parsed tokens', () => {
      const sentence = 'The midnight courier delivered secret dossiers.';
      const tokens = tokenizeSentence(sentence);
      expect(tokens).toHaveLength(6);
      expect(tokens[0].root).toBe('The');
      expect(tokens[5].root).toBe('dossiers');
      expect(tokens[5].suffix).toBe('.');
    });

    it('handles empty sentence gracefully', () => {
      expect(tokenizeSentence('')).toEqual([]);
      expect(tokenizeSentence('   ')).toEqual([]);
    });
  });

  describe('formatReplacementToken', () => {
    it('preserves title-case capitalization', () => {
      const formatted = formatReplacementToken('Berlin', 'munich');
      expect(formatted).toBe('Munich');
    });

    it('preserves uppercase capitalization', () => {
      const formatted = formatReplacementToken('CIA', 'fbi');
      expect(formatted).toBe('FBI');
    });

    it('preserves lowercase and surrounding punctuation', () => {
      const formatted = formatReplacementToken('"courier,"', 'shadow');
      expect(formatted).toBe('"shadow,"');
    });
  });

  describe('replaceWordInSentence', () => {
    it('replaces exactly one word and preserves sentence punctuation', () => {
      const sentence = 'The midnight courier delivered secret dossiers.';
      const result = replaceWordInSentence(sentence, 2, 'shadow');
      expect(result.newSentence).toBe('The midnight shadow delivered secret dossiers.');
      expect(result.oldWord).toBe('courier');
      expect(result.newWord).toBe('shadow');
    });

    it('replaces first word and retains capitalization', () => {
      const sentence = 'The midnight courier delivered secret dossiers.';
      const result = replaceWordInSentence(sentence, 0, 'a');
      expect(result.newSentence).toBe('A midnight courier delivered secret dossiers.');
      expect(result.oldWord).toBe('The');
      expect(result.newWord).toBe('A');
    });

    it('replaces last word and retains trailing period', () => {
      const sentence = 'The midnight courier delivered secret dossiers.';
      const result = replaceWordInSentence(sentence, 5, 'parchment');
      expect(result.newSentence).toBe('The midnight courier delivered secret parchment.');
      expect(result.oldWord).toBe('dossiers');
      expect(result.newWord).toBe('parchment');
    });

    it('throws error for out-of-bounds word index', () => {
      const sentence = 'Hello world.';
      expect(() => replaceWordInSentence(sentence, -1, 'hi')).toThrow(/out of bounds/);
      expect(() => replaceWordInSentence(sentence, 5, 'hi')).toThrow(/out of bounds/);
    });
  });
});

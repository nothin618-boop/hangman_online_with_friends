import { describe, it, expect, beforeAll } from 'vitest';
import { validateCandidateWord, extractHistoricalWords } from '@/lib/filter';
import { initializeDictionary } from '@/lib/dictionary';
import { Hop } from '@/lib/types';

describe('Filter Rule Engine (filter.ts)', () => {
  beforeAll(() => {
    initializeDictionary([
      'whisper', 'shadow', 'cipher', 'courier', 'midnight', 'berlin', 'secret', 'dossier', 'dossiers',
      'parchment', 'infiltrate', 'agent', 'spy', 'soviet', 'nuclear', 'embassy',
      'superpowers', 'a', 'i', 'code', 'laser', 'matrix'
    ]);
  });

  describe('Rule 1: Empty / Whitespace Checks', () => {
    it('rejects empty input or pure whitespace', () => {
      expect(validateCandidateWord('')).toEqual({
        valid: false,
        error: 'EMPTY_INPUT',
        message: expect.stringContaining('empty')
      });
      expect(validateCandidateWord('   ')).toEqual({
        valid: false,
        error: 'EMPTY_INPUT',
        message: expect.stringContaining('blank')
      });
    });
  });

  describe('Rule 2: Alphabet Purity Regex Lock (/^[a-zA-Z]+$/)', () => {
    it('accepts pure alphabetic letters regardless of casing', () => {
      expect(validateCandidateWord('whisper').valid).toBe(true);
      expect(validateCandidateWord('SHADOW').valid).toBe(true);
      expect(validateCandidateWord('Cipher').valid).toBe(true);
    });

    it('rejects numbers', () => {
      const res = validateCandidateWord('agent007');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('INVALID_CHARACTERS');
    });

    it('rejects hyphens and compound words', () => {
      const res = validateCandidateWord('double-agent');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('INVALID_CHARACTERS');
    });

    it('rejects spaces and multi-word submissions', () => {
      const res = validateCandidateWord('secret courier');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('INVALID_CHARACTERS');
    });

    it('rejects symbols and punctuation', () => {
      expect(validateCandidateWord('code!').error).toBe('INVALID_CHARACTERS');
      expect(validateCandidateWord('@shadow').error).toBe('INVALID_CHARACTERS');
      expect(validateCandidateWord('#secret').error).toBe('INVALID_CHARACTERS');
    });
  });

  describe('Rule 3: Length Lock (< 12 characters, 1..11)', () => {
    it('accepts 1-letter words (a, i)', () => {
      expect(validateCandidateWord('a').valid).toBe(true);
      expect(validateCandidateWord('i').valid).toBe(true);
    });

    it('accepts 11-letter boundary words (superpowers)', () => {
      expect('superpowers'.length).toBe(11);
      const res = validateCandidateWord('superpowers');
      expect(res.valid).toBe(true);
    });

    it('rejects 12-letter boundary words (supernatural)', () => {
      expect('supernatural'.length).toBe(12);
      const res = validateCandidateWord('supernatural');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('WORD_TOO_LONG');
    });

    it('rejects words >= 13 letters', () => {
      const res = validateCandidateWord('counterattack');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('WORD_TOO_LONG');
    });
  });

  describe('Rule 4: 100% Strict English Dictionary Verification', () => {
    it('accepts valid recognized English dictionary words', () => {
      expect(validateCandidateWord('courier').valid).toBe(true);
      expect(validateCandidateWord('midnight').valid).toBe(true);
      expect(validateCandidateWord('agent').valid).toBe(true);
      expect(validateCandidateWord('shadow').valid).toBe(true);
    });

    it('rejects non-English, fake words, and gibberish (e.g. raan, asdfghj) with NOT_IN_DICTIONARY', () => {
      const resRaan = validateCandidateWord('raan');
      expect(resRaan.valid).toBe(false);
      expect(resRaan.error).toBe('NOT_IN_DICTIONARY');

      const resGibberish = validateCandidateWord('asdfghj');
      expect(resGibberish.valid).toBe(false);
      expect(resGibberish.error).toBe('NOT_IN_DICTIONARY');
    });
  });

  describe('Rule 5: No Repeats Historical Duplicate Check', () => {
    const mockHistory: Hop[] = [
      {
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: 'The midnight courier delivered secret dossiers.',
        newSentence: 'The midnight shadow delivered secret dossiers.',
        role: 'shifter',
        oldWord: 'courier',
        newWord: 'shadow',
        timestamp: Date.now()
      }
    ];

    it('rejects words used in initial sentence or past hops', () => {
      const res = validateCandidateWord('courier', mockHistory, [], 'The midnight courier delivered secret dossiers.');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });

    it('rejects case-insensitive duplicates from history', () => {
      const res = validateCandidateWord('SHADOW', mockHistory);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });

    it('rejects words regardless of surrounding punctuation in history', () => {
      const res = validateCandidateWord('dossiers', mockHistory);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });

    it('allows fresh words that have never appeared in history', () => {
      const res = validateCandidateWord('parchment', mockHistory);
      expect(res.valid).toBe(true);
    });

    it('skips revoked hops (crowd jury rewound sabotage)', () => {
      const historyWithRevoke: Hop[] = [
        {
          hopNumber: 1,
          playerId: 'troll',
          previousSentence: 'The midnight courier delivered secret dossiers.',
          newSentence: 'The midnight troll delivered secret dossiers.',
          role: 'shifter',
          oldWord: 'courier',
          newWord: 'troll',
          isRevoked: true,
          timestamp: Date.now()
        }
      ];
      const historicalSet = extractHistoricalWords(historyWithRevoke);
      expect(historicalSet.has('troll')).toBe(false);
    });
  });

  describe('Rule 6: Secret Banned Trap Words', () => {
    const traps = ['spy', 'agent', 'soviet', 'nuclear', 'embassy'];

    it('returns valid: true and isTrap: true when input matches secret trap word', () => {
      const res = validateCandidateWord('spy', [], traps);
      expect(res.valid).toBe(true);
      expect(res.isTrap).toBe(true);
      expect(res.message).toContain('trap word');
    });

    it('detects trap words case-insensitively', () => {
      const res = validateCandidateWord('SOVIET', [], traps);
      expect(res.valid).toBe(true);
      expect(res.isTrap).toBe(true);
    });

    it('returns isTrap: false for legitimate non-trap words', () => {
      const res = validateCandidateWord('cipher', [], traps);
      expect(res.valid).toBe(true);
      expect(res.isTrap).toBe(false);
    });
  });
});

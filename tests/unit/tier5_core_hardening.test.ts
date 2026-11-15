/**
 * WHISPER Milestone M4 Phase 2: Tier 5 White-Box Coverage Hardening & Adversarial Test Suite
 *
 * Thorough verification across core modules:
 * 1. Filter Rule Engine (src/lib/filter.ts):
 *    - Extreme inputs: unicode homoglyphs, non-ASCII accents, emojis, symbols, punctuation edge cases
 *    - Strict length boundaries (1 char, 11 chars max allowed, 12 chars rejection boundary, 100+ chars)
 *    - Whitespace trimming, blank inputs, and case-sensitivity normalization invariants
 *    - Historical duplicate word checks (initial sentence tokens, case variations, hop history, revoked hops)
 *    - Banned trap word secret blacklist detection and strike triggers
 * 2. Dynamic Role Assignment (src/lib/roles.ts):
 *    - Scheduling invariants (Hop 0 Shifter, Hops 1-9 Shifter, Hop 10 Decoder, Hop 11 Shifter)
 *    - Consecutive Decoder guard preventing multi-decoder cascades
 *    - Bounds, malformed inputs, and hops-until-next-decoder calculations
 * 3. Decoder Deduction Engine (src/lib/decoder.ts):
 *    - Case-insensitive theme deductions, +10 bonus hops, 1-life strike deduction
 *    - Terminal state transitions (Victory at 100 hops, Destruction at 0 lives)
 *    - Finalized chain rejection guards and Fisher-Yates shuffle integrity
 * 4. Algorithmic Generator & Handcrafted Themes (src/lib/generator.ts & src/lib/prompts.ts):
 *    - Scaled generator testing across 1,000+ distinct seeds (uniqueness, syntax, 5 traps, 3 decoys)
 *    - Determinism across runtimes and domain coverage
 *    - Handcrafted catalog invariant audit (50 themes, unique IDs, trap word lengths <= 11)
 * 5. State Store & Memory Invariants (src/lib/store.ts):
 *    - Deep cloning protections against external state mutation
 *    - Active queue indexing, expired lease queries, troll quarantine, and player streaks
 * 6. QueueEngine Concurrency, Race Torture & Lease Timing (src/lib/queue.ts):
 *    - Exact lease timing boundaries: 59s (valid), 60s (valid), 60.001s / 61s (expired)
 *    - Auto-spawning recovery on depleted active pools during concurrent intercepts
 *    - Idempotent intercepts for existing lease holders
 *    - Double-submission rejection on same hop and in-flight lock enforcement
 *    - End-to-end trap word penalties and chain destruction lifecycle
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { validateCandidateWord, extractHistoricalWords } from '@/lib/filter';
import { determinePlayerRole, getHopsUntilNextDecoder } from '@/lib/roles';
import { resolveDecoderGuess, shuffleThemeOptions, DECODER_BONUS_HOPS } from '@/lib/decoder';
import { generateTheme, generateThemesBatch, GENERATOR_DOMAINS } from '@/lib/generator';
import { HANDCRAFTED_THEMES } from '@/lib/prompts';
import { QueueEngine, sanitizeChain, LEASE_DURATION_MS } from '@/lib/queue';
import { MemoryWhisperStore } from '@/lib/store';
import { createChainFromTemplate, autoSpawnChains } from '@/lib/spawner';
import { isDictionaryWord, getDictionary } from '@/lib/dictionary';
import { Chain, Hop, SecretThemeTemplate } from '@/lib/types';

describe('Tier 5 White-Box Coverage Hardening & Adversarial Suite', () => {
  beforeAll(() => {
    // Warm dictionary index
    getDictionary();
  });

  // =========================================================================
  // 1. FILTER RULE ENGINE ADVERSARIAL HARDENING (src/lib/filter.ts)
  // =========================================================================
  describe('1. Filter Rule Engine Adversarial Hardening', () => {
    describe('1.1 Extreme Inputs & Unicode Spoofing Attacks', () => {
      const nonAsciiVectors = [
        { desc: 'Cyrillic homoglyph "а" (\\u0430) in "courier"', word: 'couri\u0430r' },
        { desc: 'Cyrillic homoglyph "е" (\\u0435) in "secret"', word: 's\u0435cret' },
        { desc: 'Greek small letter "α" (\\u03B1)', word: 'alph\u03B1' },
        { desc: 'Fullwidth latin "ｗｈｉｓｐｅｒ"', word: '\uFF57\uFF48\uFF49\uFF53\uFF50\uFF45\uFF52' },
        { desc: 'Accented e acute "café"', word: 'café' },
        { desc: 'Accented u umlaut "über"', word: 'über' },
        { desc: 'Accented n tilde "mañana"', word: 'mañana' },
        { desc: 'German esszet "straße"', word: 'straße' },
        { desc: 'Zero-width space prefix "\\u200Bwhisper"', word: '\u200Bwhisper' },
        { desc: 'Zero-width space infix "whi\\u200Bsper"', word: 'whi\u200Bsper' },
        { desc: 'Right-to-left override "\\u202Ewhisper"', word: '\u202Ewhisper' },
        { desc: 'Emoji injection "whisper🔒"', word: 'whisper🔒' },
        { desc: 'Symbol injection "whi$per"', word: 'whi$per' },
        { desc: 'Punctuation infix "co-op"', word: 'co-op' },
        { desc: 'Punctuation suffix "whisper!"', word: 'whisper!' },
        { desc: 'Punctuation prefix "@whisper"', word: '@whisper' },
        { desc: 'Number injection "wh1sper"', word: 'wh1sper' },
        { desc: 'Whitespace infix "two words"', word: 'two words' },
        { desc: 'Null byte control char "\\x00whisper"', word: '\x00whisper' },
        { desc: 'Escape control char "\\x1Fwhisper"', word: '\x1Fwhisper' }
      ];

      nonAsciiVectors.forEach(({ desc, word }) => {
        it(`rejects non-alphabet input: ${desc}`, () => {
          const res = validateCandidateWord(word);
          expect(res.valid).toBe(false);
          expect(res.error).toBe('INVALID_CHARACTERS');
        });
      });

      it('rejects blank and whitespace-only strings with EMPTY_INPUT', () => {
        const blanks = ['', '   ', '\t', '\n\r', ' \t \n '];
        blanks.forEach(b => {
          const res = validateCandidateWord(b);
          expect(res.valid).toBe(false);
          expect(res.error).toBe('EMPTY_INPUT');
        });
      });

      it('trims leading and trailing whitespace on valid words without failing regex', () => {
        const res = validateCandidateWord('   whisper   ');
        expect(res.valid).toBe(true);
        expect(res.normalizedWord).toBe('whisper');
      });
    });

    describe('1.2 Word Length Boundary Invariants (< 12 Chars, 1..11)', () => {
      it('accepts minimum 1-character valid English words', () => {
        const validShort = ['a', 'i'];
        validShort.forEach(w => {
          const res = validateCandidateWord(w);
          expect(res.valid).toBe(true);
          expect(res.normalizedWord).toBe(w);
        });
      });

      it('accepts maximum boundary words of exactly 11 characters', () => {
        const elevenCharWords = ['clandestine', 'investigate', 'speakeasies', 'superpowers'];
        elevenCharWords.forEach(w => {
          expect(w.length).toBe(11);
          const res = validateCandidateWord(w);
          expect(res.valid).toBe(true);
          expect(res.normalizedWord).toBe(w);
        });
      });

      it('rejects boundary words of exactly 12 characters with WORD_TOO_LONG', () => {
        const twelveCharWords = ['cryptography', 'surveillance', 'subterranean', 'manipulation'];
        twelveCharWords.forEach(w => {
          expect(w.length).toBe(12);
          const res = validateCandidateWord(w);
          expect(res.valid).toBe(false);
          expect(res.error).toBe('WORD_TOO_LONG');
          expect(res.message).toContain('12');
        });
      });

      it('rejects ultra-long inputs (100+ characters) with WORD_TOO_LONG', () => {
        const longWord = 'a'.repeat(150);
        const res = validateCandidateWord(longWord);
        expect(res.valid).toBe(false);
        expect(res.error).toBe('WORD_TOO_LONG');
      });
    });

    describe('1.3 Case-Sensitivity Normalization Invariants', () => {
      it('normalizes uppercase, titlecase, and mixedcase dictionary words to lowercase', () => {
        const casings = ['WHISPER', 'Whisper', 'wHiSpEr', 'whispER'];
        casings.forEach(w => {
          const res = validateCandidateWord(w);
          expect(res.valid).toBe(true);
          expect(res.normalizedWord).toBe('whisper');
        });
      });

      it('rejects non-dictionary words regardless of casing', () => {
        const fakeWords = ['XYZQWRT', 'Xyzqwrt', 'xyzqwrt'];
        fakeWords.forEach(w => {
          const res = validateCandidateWord(w);
          expect(res.valid).toBe(false);
          expect(res.error).toBe('NOT_IN_DICTIONARY');
        });
      });
    });

    describe('1.4 Historical Duplicate Invariants & Revoked Hops', () => {
      const initialSentence = 'The midnight courier delivered secret dossiers across foggy Berlin streets.';

      it('rejects words from the initial sentence case-insensitively', () => {
        const initialWords = ['the', 'MIDNIGHT', 'Courier', 'delivered', 'secret', 'dossiers', 'berlin', 'streets'];
        initialWords.forEach(w => {
          const res = validateCandidateWord(w, [], [], initialSentence);
          expect(res.valid).toBe(false);
          expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
        });
      });

      it('rejects words introduced in previous non-revoked hops', () => {
        const history: Hop[] = [
          {
            hopNumber: 1,
            playerId: 'p1',
            previousSentence: initialSentence,
            newSentence: 'The midnight agent delivered secret dossiers across foggy Berlin streets.',
            replacedWordIndex: 2,
            oldWord: 'courier',
            newWord: 'agent',
            role: 'shifter',
            timestamp: Date.now() - 10000
          }
        ];

        const res = validateCandidateWord('AGENT', history, [], initialSentence);
        expect(res.valid).toBe(false);
        expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
      });

      it('allows reusing a word from a revoked hop if not present elsewhere', () => {
        // Hop 1 was revoked by crowd jury (e.g., troll inserted "radar")
        const history: Hop[] = [
          {
            hopNumber: 1,
            playerId: 'troll',
            previousSentence: initialSentence,
            newSentence: 'The midnight radar delivered secret dossiers across foggy Berlin streets.',
            replacedWordIndex: 2,
            oldWord: 'courier',
            newWord: 'radar',
            role: 'shifter',
            isRevoked: true, // Rewound by jury!
            timestamp: Date.now() - 10000
          }
        ];

        // "radar" was ONLY in the revoked hop. Candidate should be accepted!
        const res = validateCandidateWord('radar', history, [], initialSentence);
        expect(res.valid).toBe(true);
        expect(res.normalizedWord).toBe('radar');
      });
    });

    describe('1.5 Secret Banned Trap Word Detection', () => {
      const banned = ['spy', 'agent', 'soviet', 'nuclear', 'embassy'];

      it('detects banned trap word case-insensitively and returns valid: true with isTrap: true', () => {
        const trapCandidates = ['SPY', 'Spy', 'sPy', '  spy  '];
        trapCandidates.forEach(w => {
          const res = validateCandidateWord(w, [], banned);
          expect(res.valid).toBe(true);
          expect(res.isTrap).toBe(true);
          expect(res.message).toContain('CRITICAL ALERT');
        });
      });

      it('does not flag words that are not in the banned words list', () => {
        const res = validateCandidateWord('whisper', [], banned);
        expect(res.valid).toBe(true);
        expect(res.isTrap).toBe(false);
      });
    });
  });

  // =========================================================================
  // 2. DYNAMIC ROLE SCHEDULING HARDENING (src/lib/roles.ts)
  // =========================================================================
  describe('2. Dynamic Role Scheduling Hardening', () => {
    it('assigns Shifter role to hop 0 and empty history chains', () => {
      expect(determinePlayerRole({ currentHop: 0, history: [] })).toBe('shifter');
      expect(determinePlayerRole({ currentHop: 10, history: [] })).toBe('shifter');
    });

    it('assigns Shifter role for hops 1 through 9', () => {
      for (let hop = 1; hop <= 9; hop++) {
        const chain = {
          currentHop: hop,
          history: Array.from({ length: hop }, (_, i) => ({
            hopNumber: i + 1,
            playerId: 'p1',
            previousSentence: 'a',
            newSentence: 'b',
            role: 'shifter' as const,
            timestamp: Date.now()
          }))
        };
        expect(determinePlayerRole(chain)).toBe('shifter');
      }
    });

    it('assigns Decoder role on hop 10, 20, 30 when previous hop was shifter', () => {
      [10, 20, 30, 100].forEach(milestone => {
        const history: Hop[] = Array.from({ length: milestone }, (_, i) => ({
          hopNumber: i + 1,
          playerId: 'p1',
          previousSentence: 'a',
          newSentence: 'b',
          role: 'shifter' as const,
          timestamp: Date.now()
        }));
        expect(determinePlayerRole({ currentHop: milestone, history })).toBe('decoder');
      });
    });

    it('enforces Consecutive Decoder Guard: always returns Shifter if last hop was Decoder', () => {
      // Simulating a situation where currentHop is 20, but the last recorded hop was decoder
      const history: Hop[] = [
        {
          hopNumber: 10,
          playerId: 'dec',
          previousSentence: 'a',
          newSentence: 'a',
          role: 'decoder',
          decoderGuess: 'Mystery',
          isCorrectGuess: true,
          timestamp: Date.now()
        }
      ];

      // Even if currentHop is 20 (e.g. from bonus hops leap), lastHop was decoder -> MUST BE SHIFTER
      expect(determinePlayerRole({ currentHop: 20, history })).toBe('shifter');
      expect(determinePlayerRole({ currentHop: 11, history })).toBe('shifter');
    });

    it('calculates getHopsUntilNextDecoder accurately across arbitrary hop ranges', () => {
      expect(getHopsUntilNextDecoder(0)).toBe(10);
      expect(getHopsUntilNextDecoder(1)).toBe(9);
      expect(getHopsUntilNextDecoder(5)).toBe(5);
      expect(getHopsUntilNextDecoder(9)).toBe(1);
      expect(getHopsUntilNextDecoder(10)).toBe(0);
      expect(getHopsUntilNextDecoder(11)).toBe(9);
      expect(getHopsUntilNextDecoder(19)).toBe(1);
      expect(getHopsUntilNextDecoder(20)).toBe(0);
      expect(getHopsUntilNextDecoder(-5)).toBe(10);
    });
  });

  // =========================================================================
  // 3. DECODER DEDUCTION ENGINE HARDENING (src/lib/decoder.ts)
  // =========================================================================
  describe('3. Decoder Deduction Engine Hardening', () => {
    let mockChain: Chain;

    beforeEach(() => {
      mockChain = {
        id: 'decoder-test-chain',
        secretTheme: 'Cold War Espionage',
        themeOptions: ['Cold War Espionage', 'Cyberpunk Heist', 'Deep Sea Exploration', 'Victorian Séance'],
        bannedWords: ['spy', 'agent', 'soviet', 'nuclear', 'embassy'],
        initialSentence: 'The midnight courier delivered secret dossiers across foggy Berlin streets.',
        currentSentence: 'The midnight courier delivered secret dossiers across foggy Berlin streets.',
        currentHop: 10,
        bonusHops: 0,
        lives: 3,
        maxHops: 100,
        history: [],
        status: 'active',
        createdAt: Date.now()
      };
    });

    it('resolves correct guess case-insensitively and with surrounding whitespace', () => {
      const res = resolveDecoderGuess(mockChain, '   cold war espionage   ', 'player-dec');
      expect(res.isCorrect).toBe(true);
      expect(res.bonusAwarded).toBe(DECODER_BONUS_HOPS);
      expect(res.chain.bonusHops).toBe(10);
      expect(res.chain.currentHop).toBe(11);
      expect(res.livesRemaining).toBe(3);
      expect(res.isVictory).toBe(false);
      expect(res.hop.isCorrectGuess).toBe(true);
      expect(res.hop.role).toBe('decoder');
      expect(res.hop.newSentence).toBe(mockChain.initialSentence);
    });

    it('resolves incorrect guess by deducting 1 life and preserving sentence', () => {
      const res = resolveDecoderGuess(mockChain, 'Cyberpunk Heist', 'player-dec');
      expect(res.isCorrect).toBe(false);
      expect(res.bonusAwarded).toBe(0);
      expect(res.livesRemaining).toBe(2);
      expect(res.chain.lives).toBe(2);
      expect(res.chain.currentHop).toBe(11);
      expect(res.isDestroyed).toBe(false);
      expect(res.hop.isCorrectGuess).toBe(false);
    });

    it('triggers Victory when correct guess bonus pushes effective hops >= maxHops', () => {
      mockChain.currentHop = 89;
      mockChain.bonusHops = 0;
      mockChain.maxHops = 100;

      // 89 + 1 (currentHop inc) + 10 (bonus) = 100 >= 100 -> Victory!
      const res = resolveDecoderGuess(mockChain, 'Cold War Espionage', 'player-hero');
      expect(res.isCorrect).toBe(true);
      expect(res.isVictory).toBe(true);
      expect(res.chain.status).toBe('victory');
      expect(res.chain.completedAt).toBeDefined();
    });

    it('triggers Destruction when wrong guess reduces lives to 0', () => {
      mockChain.lives = 1;
      const res = resolveDecoderGuess(mockChain, 'Wrong Theme', 'player-fool');
      expect(res.isCorrect).toBe(false);
      expect(res.livesRemaining).toBe(0);
      expect(res.isDestroyed).toBe(true);
      expect(res.chain.status).toBe('destroyed');
      expect(res.chain.completedAt).toBeDefined();
    });

    it('rejects submitting decoder guess on finalized chains', () => {
      mockChain.status = 'victory';
      expect(() => resolveDecoderGuess(mockChain, 'Cold War Espionage', 'p1')).toThrow(
        /Cannot submit decoder guess to a finalized chain/
      );

      mockChain.status = 'destroyed';
      expect(() => resolveDecoderGuess(mockChain, 'Cold War Espionage', 'p1')).toThrow(
        /Cannot submit decoder guess to a finalized chain/
      );
    });

    it('shuffles theme options without losing or duplicating items', () => {
      const options = ['Theme A', 'Theme B', 'Theme C', 'Theme D'];
      const shuffled = shuffleThemeOptions(options);

      expect(shuffled.length).toBe(4);
      expect(new Set(shuffled).size).toBe(4);
      options.forEach(opt => expect(shuffled).toContain(opt));
      // Original array must not be modified in place
      expect(options).toEqual(['Theme A', 'Theme B', 'Theme C', 'Theme D']);
    });
  });

  // =========================================================================
  // 4. ALGORITHMIC GENERATOR SCALING & PROMPTS AUDIT (generator.ts & prompts.ts)
  // =========================================================================
  describe('4. Algorithmic Generator Scaling & Themes Library Hardening', () => {
    it('verifies 100% compliance across 1,000+ generated themes (seeds 0 through 1,200)', () => {
      const BATCH_SIZE = 1200;
      const themes = generateThemesBatch(0, BATCH_SIZE);

      expect(themes.length).toBe(BATCH_SIZE);
      const seenIds = new Set<string>();

      for (let i = 0; i < themes.length; i++) {
        const t = themes[i];

        // 1. Unique ID
        expect(seenIds.has(t.id)).toBe(false);
        seenIds.add(t.id);
        expect(t.id).toBe(`gen-${i}`);

        // 2. Secret Theme Name & Category
        expect(typeof t.theme).toBe('string');
        expect(t.theme.length).toBeGreaterThan(0);
        expect(typeof t.category).toBe('string');
        expect(t.category.length).toBeGreaterThan(0);

        // 3. Sentence Structure
        expect(t.initialSentence.startsWith('The ')).toBe(true);
        expect(t.initialSentence.endsWith('.')).toBe(true);
        const tokens = t.initialSentence.trim().split(/\s+/);
        expect(tokens.length).toBeGreaterThanOrEqual(7);

        // 4. Trap Words: Exactly 5 unique words, all <= 11 characters
        expect(t.bannedWords.length).toBe(5);
        expect(new Set(t.bannedWords).size).toBe(5);
        for (const trap of t.bannedWords) {
          expect(trap.length).toBeLessThanOrEqual(11);
          expect(/^[a-z]+$/.test(trap)).toBe(true);
        }

        // 5. Decoy Themes: Exactly 3 unique decoys, distinct from target theme
        expect(t.decoyThemes.length).toBe(3);
        expect(new Set(t.decoyThemes).size).toBe(3);
        expect(t.decoyThemes).not.toContain(t.theme);
      }
    });

    it('guarantees deterministic PRNG output for Mulberry32 with identical seed', () => {
      const theme1 = generateTheme(4242);
      const theme2 = generateTheme(4242);
      expect(theme1).toEqual(theme2);
    });

    it('audits all 50 handcrafted themes for strict invariant compliance', () => {
      expect(HANDCRAFTED_THEMES.length).toBe(50);
      const ids = new Set<string>();

      for (const t of HANDCRAFTED_THEMES) {
        // Unique ID
        expect(ids.has(t.id)).toBe(false);
        ids.add(t.id);

        // Word count 7..15
        const tokens = t.initialSentence.trim().split(/\s+/);
        expect(tokens.length).toBeGreaterThanOrEqual(7);
        expect(tokens.length).toBeLessThanOrEqual(15);

        // Exactly 5 banned words <= 11 chars
        expect(t.bannedWords.length).toBe(5);
        for (const b of t.bannedWords) {
          expect(b.length).toBeLessThanOrEqual(11);
        }

        // Exactly 3 decoys
        expect(t.decoyThemes.length).toBe(3);
        expect(t.decoyThemes).not.toContain(t.theme);
      }
    });
  });

  // =========================================================================
  // 5. STATE STORE & MEMORY INVARIANTS (src/lib/store.ts)
  // =========================================================================
  describe('5. State Store & Memory Invariants', () => {
    let store: MemoryWhisperStore;

    beforeEach(async () => {
      store = MemoryWhisperStore.getInstance();
      await store.clear();
    });

    it('enforces deep-cloning immutability on saved chains', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      // Mutating the original external chain object
      chain.lives = 0;
      chain.currentSentence = 'MUTATED SENTENCE';

      // Fetched chain from store must NOT reflect external mutation
      const stored = await store.getChain(chain.id);
      expect(stored?.lives).toBe(3);
      expect(stored?.currentSentence).not.toBe('MUTATED SENTENCE');

      // Mutating a fetched object must NOT alter the store
      if (stored) {
        stored.lives = 999;
      }
      const refetched = await store.getChain(chain.id);
      expect(refetched?.lives).toBe(3);
    });

    it('accurately indexes active vs in_progress queues upon state changes', async () => {
      const chain1 = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      const chain2 = createChainFromTemplate(HANDCRAFTED_THEMES[1]);
      await store.saveChain(chain1);
      await store.saveChain(chain2);

      expect(await store.getActiveChainsCount()).toBe(2);

      // Transition chain1 to in_progress
      chain1.status = 'in_progress';
      chain1.leaseExpiresAt = Date.now() + 60000;
      await store.saveChain(chain1);

      expect(await store.getActiveChainsCount()).toBe(1);
      const leased = await store.getLeasedChains();
      expect(leased.length).toBe(1);
      expect(leased[0].id).toBe(chain1.id);
    });

    it('correctly filters expired leases by timestamp in getExpiredLeases()', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.status = 'in_progress';
      chain.leaseExpiresAt = 10000;
      await store.saveChain(chain);

      // Query before expiry
      expect((await store.getExpiredLeases(9999)).length).toBe(0);

      // Query at exact expiry
      expect((await store.getExpiredLeases(10000)).length).toBe(0);

      // Query after expiry
      const expired = await store.getExpiredLeases(10001);
      expect(expired.length).toBe(1);
      expect(expired[0].id).toBe(chain.id);
    });

    it('manages player streak increments, non-negative clamping, and resets', async () => {
      expect(await store.getPlayerStreak('p1')).toBe(0);
      await store.incrementPlayerStreak('p1', 1);
      expect(await store.getPlayerStreak('p1')).toBe(1);
      await store.incrementPlayerStreak('p1', 3);
      expect(await store.getPlayerStreak('p1')).toBe(4);
      await store.resetPlayerStreak('p1');
      expect(await store.getPlayerStreak('p1')).toBe(0);

      // Negative clamp
      await store.setPlayerStreak('p1', -10);
      expect(await store.getPlayerStreak('p1')).toBe(0);
    });

    it('tracks troll shadow-bans and player chain participation', async () => {
      expect(await store.isPlayerShadowBanned('troll-1')).toBe(false);
      await store.shadowBanPlayer('troll-1');
      expect(await store.isPlayerShadowBanned('troll-1')).toBe(true);

      const trolls = await store.getShadowBannedPlayers();
      expect(trolls).toContain('troll-1');

      await store.removeShadowBan('troll-1');
      expect(await store.isPlayerShadowBanned('troll-1')).toBe(false);

      // Participation
      await store.recordPlayerParticipation('p1', 'chain-alpha');
      await store.recordPlayerParticipation('p1', 'chain-beta');
      const pChains = await store.getPlayerChains('p1');
      expect(pChains).toEqual(['chain-alpha', 'chain-beta']);
    });
  });

  // =========================================================================
  // 6. QUEUE ENGINE CONCURRENCY, RACES & LEASE TIMINGS (src/lib/queue.ts)
  // =========================================================================
  describe('6. QueueEngine Concurrency, Races & Lease Timings', () => {
    let store: MemoryWhisperStore;
    let queue: QueueEngine;

    beforeEach(async () => {
      store = MemoryWhisperStore.getInstance();
      await store.clear();
      QueueEngine.clearInFlight();
      queue = new QueueEngine(store);
    });

    it('tests lease expiration boundary: 59s (valid), 60s (valid), 60.001s (expired), 61s (expired)', async () => {
      const T0 = 100_000;

      // Scenario A: Submission at 59s (T0 + 59_000) -> SUCCESS
      const intercept59 = await queue.interceptChain('p59', T0);
      expect(intercept59).toBeDefined();
      const res59 = await queue.submitMutation(intercept59!.chain.id, 'p59', 2, 'operative', T0 + 59_000);
      expect(res59.success).toBe(true);

      // Scenario B: Submission at exact 60s boundary (T0 + 60_000) -> SUCCESS (now > leaseExpiresAt is false)
      const intercept60 = await queue.interceptChain('p60', T0);
      expect(intercept60).toBeDefined();
      const res60 = await queue.submitMutation(intercept60!.chain.id, 'p60', 2, 'operative', T0 + 60_000);
      expect(res60.success).toBe(true);

      // Scenario C: Submission at 60s + 1ms (T0 + 60_001) -> EXPIRED (now > leaseExpiresAt is true)
      const intercept60plus = await queue.interceptChain('p60plus', T0);
      expect(intercept60plus).toBeDefined();
      const res60plus = await queue.submitMutation(intercept60plus!.chain.id, 'p60plus', 2, 'operative', T0 + 60_001);
      expect(res60plus.success).toBe(false);
      expect(res60plus.error).toBe('LEASE_EXPIRED');

      // Scenario D: Submission at 61s (T0 + 61_000) -> EXPIRED
      const intercept61 = await queue.interceptChain('p61', T0);
      expect(intercept61).toBeDefined();
      const res61 = await queue.submitMutation(intercept61!.chain.id, 'p61', 2, 'operative', T0 + 61_000);
      expect(res61.success).toBe(false);
      expect(res61.error).toBe('LEASE_EXPIRED');
    });

    it('auto-spawns fresh chains when active queue is completely depleted', async () => {
      // Store has 0 chains
      expect(await store.getActiveChainsCount()).toBe(0);

      // Intercept should auto-spawn 50 chains and lease one
      const intercept = await queue.interceptChain('player-empty-queue', 1000);
      expect(intercept).toBeDefined();
      expect(intercept?.role).toBe('shifter');

      // Active pool should now have 49 chains remaining
      expect(await store.getActiveChainsCount()).toBe(49);
    });

    it('grants distinct chains to concurrent intercepting players without collision', async () => {
      // Preload 10 chains
      for (let i = 0; i < 10; i++) {
        await store.saveChain(createChainFromTemplate(HANDCRAFTED_THEMES[i]));
      }

      const playerIds = Array.from({ length: 10 }, (_, i) => `concurrent-p-${i}`);
      const results = await Promise.all(playerIds.map(pid => queue.interceptChain(pid, 5000)));

      const grantedChainIds = results.map(r => r?.chain.id);
      expect(grantedChainIds.every(id => Boolean(id))).toBe(true);

      // All 10 chains granted must be distinct
      const uniqueChainIds = new Set(grantedChainIds);
      expect(uniqueChainIds.size).toBe(10);
    });

    it('returns the same active lease idempotently if player intercepts again within 60s', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      const res1 = await queue.interceptChain('player-reentrant', 1000);
      const res2 = await queue.interceptChain('player-reentrant', 15000);

      expect(res1?.chain.id).toBe(res2?.chain.id);
      expect(res1?.chain.leaseExpiresAt).toBe(res2?.chain.leaseExpiresAt);
    });

    it('rejects double submission on the same hop after lease has been released', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      await queue.interceptChain('player-double', 1000);

      // First submit succeeds
      const sub1 = await queue.submitMutation(chain.id, 'player-double', 2, 'operative', 5000);
      expect(sub1.success).toBe(true);

      // Second submit with same player on same chain is rejected because lease is released
      const sub2 = await queue.submitMutation(chain.id, 'player-double', 3, 'sentinel', 6000);
      expect(sub2.success).toBe(false);
      expect(sub2.error).toBe('INVALID_LEASE_HOLDER');
    });

    it('rejects submission from an unauthorized player who does not hold the lease', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      await queue.interceptChain('player-legit', 1000);

      const imposterSub = await queue.submitMutation(chain.id, 'player-imposter', 2, 'operative', 5000);
      expect(imposterSub.success).toBe(false);
      expect(imposterSub.error).toBe('INVALID_LEASE_HOLDER');
    });

    it('penalizes trap word submissions by deducting strike and resetting player streak', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]); // banned: ['spy', 'agent', 'soviet', 'nuclear', 'embassy']
      await store.saveChain(chain);
      await store.setPlayerStreak('player-trapped', 5);

      await queue.interceptChain('player-trapped', 1000);

      // "spy" is a secret trap word!
      const res = await queue.submitMutation(chain.id, 'player-trapped', 2, 'spy', 2000);
      expect(res.success).toBe(true);
      expect(res.isTrap).toBe(true);
      expect(res.strikeDeducted).toBe(true);
      expect(res.livesRemaining).toBe(2);

      // Streak must be reset to 0
      expect(await store.getPlayerStreak('player-trapped')).toBe(0);

      // Chain should still be active because lives = 2 > 0
      const updated = await store.getChain(chain.id);
      expect(updated?.status).toBe('active');
      expect(updated?.lives).toBe(2);
      expect(updated?.history[0].isTrapHit).toBe(true);
    });

    it('routes shadow-banned players to an isolated troll sandbox chain', async () => {
      await store.shadowBanPlayer('troll-user');

      const intercept = await queue.interceptChain('troll-user', 1000);
      expect(intercept).toBeDefined();
      expect(intercept?.chain.id).toBe('troll-chain-troll-user');
    });
  });
});

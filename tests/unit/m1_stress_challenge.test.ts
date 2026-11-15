import { describe, it, expect } from 'vitest';
import { HANDCRAFTED_THEMES, getHandcraftedThemeById, getRandomHandcraftedTheme } from '@/lib/prompts';
import { generateTheme, generateThemesBatch, GENERATOR_DOMAINS, createMulberry32 } from '@/lib/generator';
import { resolveDecoderGuess, shuffleThemeOptions, DECODER_BONUS_HOPS, DEFAULT_MAX_HOPS } from '@/lib/decoder';
import { Chain, SecretThemeTemplate } from '@/lib/types';
import { isDictionaryWord } from '@/lib/dictionary';

describe('Empirical Adversarial Stress Suite — Milestone M1', () => {

  // =========================================================================
  // SECTION 1: Handcrafted Themes Integrity (50 Curated Themes)
  // =========================================================================
  describe('1. Handcrafted Themes Integrity (50 Themes Catalog)', () => {
    it('verifies catalog strictly contains exactly 50 themes', () => {
      expect(HANDCRAFTED_THEMES).toBeInstanceOf(Array);
      expect(HANDCRAFTED_THEMES.length).toBe(50);
    });

    it('verifies 100% unique IDs across all 50 themes with valid slug format', () => {
      const ids = HANDCRAFTED_THEMES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(50);

      ids.forEach(id => {
        expect(id).toMatch(/^[a-z0-9-]+$/);
        expect(id.length).toBeGreaterThanOrEqual(3);
        expect(id.length).toBeLessThanOrEqual(50);
      });
    });

    it('verifies 100% unique theme display titles across all 50 themes', () => {
      const titles = HANDCRAFTED_THEMES.map(t => t.theme.trim());
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(50);

      titles.forEach(title => {
        expect(title.length).toBeGreaterThan(0);
      });
    });

    it('verifies all 50 sentences comply with 7-12 words, <12 chars/word, pure letters', () => {
      HANDCRAFTED_THEMES.forEach(t => {
        const sentence = t.initialSentence;
        expect(sentence, `Theme ${t.id} sentence must be defined`).toBeDefined();
        expect(sentence.endsWith('.'), `Theme ${t.id} sentence must end with period`).toBe(true);

        const rawTokens = sentence.trim().split(/\s+/);
        expect(rawTokens.length, `Theme ${t.id} must have 7-12 words`).toBeGreaterThanOrEqual(7);
        expect(rawTokens.length, `Theme ${t.id} must have 7-12 words`).toBeLessThanOrEqual(12);

        rawTokens.forEach((rawToken, idx) => {
          // Extract alphabetic root
          const match = rawToken.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
          expect(match, `Token "${rawToken}" in ${t.id} must have valid alphabetic root`).not.toBeNull();
          if (match) {
            const root = match[2];
            expect(root, `Root "${root}" in ${t.id} must match /^[a-zA-Z]+$/`).toMatch(/^[a-zA-Z]+$/);
            expect(root.length, `Word "${root}" in ${t.id} must be < 12 chars`).toBeLessThan(12);
            expect(root.length, `Word "${root}" in ${t.id} must be >= 1 char`).toBeGreaterThanOrEqual(1);
          }
        });
      });
    });

    it('verifies exactly 5 secret trap words per theme, lowercase, pure letters, <12 chars', () => {
      HANDCRAFTED_THEMES.forEach(t => {
        expect(t.bannedWords, `Theme ${t.id} must have bannedWords array`).toBeInstanceOf(Array);
        expect(t.bannedWords.length, `Theme ${t.id} must have exactly 5 traps`).toBe(5);

        const uniqueTraps = new Set(t.bannedWords);
        expect(uniqueTraps.size, `Theme ${t.id} has duplicate trap words`).toBe(5);

        t.bannedWords.forEach(trap => {
          expect(trap, `Trap "${trap}" in ${t.id} must be lowercase`).toBe(trap.toLowerCase());
          expect(trap, `Trap "${trap}" in ${t.id} must match /^[a-z]+$/`).toMatch(/^[a-z]+$/);
          expect(trap.length, `Trap "${trap}" in ${t.id} must be < 12 characters`).toBeLessThan(12);
          expect(trap.length, `Trap "${trap}" in ${t.id} must be >= 1 char`).toBeGreaterThanOrEqual(1);

          // Check if trap words exist in dictionary and collect any missing
          if (!isDictionaryWord(trap)) {
            // Log for analysis
            console.log(`[CHALLENGER OBSERVATION] Trap word "${trap}" (Theme: ${t.id}) not in standard dictionary`);
          }
        });
      });
    });

    it('audits all initial sentence tokens across 50 handcrafted themes against dictionary', () => {
      const missingSentenceWords: { themeId: string; word: string }[] = [];
      HANDCRAFTED_THEMES.forEach(t => {
        const tokens = t.initialSentence.trim().split(/\s+/);
        tokens.forEach(tok => {
          const root = tok.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').toLowerCase();
          if (root.length > 0 && !isDictionaryWord(root)) {
            missingSentenceWords.push({ themeId: t.id, word: root });
            console.log(`[CHALLENGER OBSERVATION] Sentence word "${root}" in theme "${t.id}" not in dictionary`);
          }
        });
      });
      // Handcrafted initial sentences are starter prompts, but shifter replaces words with dictionary words
      expect(missingSentenceWords.length).toBeLessThanOrEqual(5);
    });

    it('audits all generator domain words (subjects, actions, targets, settings, traps) against dictionary', () => {
      const missingDomainWords: { domain: string; category: string; word: string }[] = [];
      GENERATOR_DOMAINS.forEach(dom => {
        const checkWords = (list: readonly string[], field: string) => {
          list.forEach(phrase => {
            const words = phrase.trim().split(/\s+/);
            words.forEach(w => {
              const root = w.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').toLowerCase();
              if (root.length > 0 && !isDictionaryWord(root)) {
                missingDomainWords.push({ domain: dom.name, category: field, word: root });
                console.log(`[CHALLENGER OBSERVATION] Generator ${dom.name} ${field} word "${root}" not in dictionary`);
              }
            });
          });
        };

        checkWords(dom.subjects, 'subjects');
        checkWords(dom.actions, 'actions');
        checkWords(dom.targets, 'targets');
        checkWords(dom.settings, 'settings');
        checkWords(dom.traps, 'traps');
      });

      console.log(`[CHALLENGER METRIC] Total generator domain tokens missing in dictionary: ${missingDomainWords.length}`);
    });

    it('verifies exactly 3 decoy themes per theme, unique, non-empty, distinct from theme title', () => {
      HANDCRAFTED_THEMES.forEach(t => {
        expect(t.decoyThemes, `Theme ${t.id} must have decoyThemes array`).toBeInstanceOf(Array);
        expect(t.decoyThemes.length, `Theme ${t.id} must have exactly 3 decoys`).toBe(3);

        const uniqueDecoys = new Set(t.decoyThemes);
        expect(uniqueDecoys.size, `Theme ${t.id} has duplicate decoy themes`).toBe(3);

        t.decoyThemes.forEach(decoy => {
          expect(decoy.trim().length, `Theme ${t.id} has empty decoy`).toBeGreaterThan(0);
          expect(
            decoy.trim().toLowerCase(),
            `Decoy "${decoy}" in ${t.id} must not match secret theme title`
          ).not.toBe(t.theme.trim().toLowerCase());
        });
      });
    });

    it('verifies getHandcraftedThemeById and getRandomHandcraftedTheme lookups', () => {
      // Lookup every theme by ID
      HANDCRAFTED_THEMES.forEach(t => {
        const found = getHandcraftedThemeById(t.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(t.id);
        expect(found?.theme).toBe(t.theme);
      });

      // Negative lookup
      expect(getHandcraftedThemeById('')).toBeUndefined();
      expect(getHandcraftedThemeById('nonexistent-seed-id-xyz')).toBeUndefined();

      // Random selection
      for (let i = 0; i < 20; i++) {
        const rnd = getRandomHandcraftedTheme();
        expect(rnd).toBeDefined();
        expect(HANDCRAFTED_THEMES.some(t => t.id === rnd.id)).toBe(true);
      }
    });
  });

  // =========================================================================
  // SECTION 2: Algorithmic Generator Scaling & Collision Test (10,000 Themes)
  // =========================================================================
  describe('2. Algorithmic Generator Scaling & Collision Test (10,000 Themes)', () => {
    it('guarantees deterministic PRNG outputs for Mulberry32', () => {
      const rng1 = createMulberry32(1337);
      const rng2 = createMulberry32(1337);
      for (let i = 0; i < 100; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it('generates 10,000 algorithmic themes across sequential seeds with ZERO ID collision', () => {
      const startTime = performance.now();
      const count = 10000;
      const themes: SecretThemeTemplate[] = [];

      for (let seed = 0; seed < count; seed++) {
        themes.push(generateTheme(seed));
      }

      const elapsedMs = performance.now() - startTime;
      expect(themes.length).toBe(count);

      // Verify ZERO collision in theme IDs
      const uniqueIds = new Set(themes.map(t => t.id));
      expect(uniqueIds.size).toBe(count);

      // Verify ID pattern
      themes.forEach((t, idx) => {
        expect(t.id).toBe(`gen-${idx}`);
      });

      // Ensure performant throughput (< 5000ms for 10,000 generations)
      expect(elapsedMs).toBeLessThan(5000);
    });

    it('verifies 100% compliance of sentences across all 10,000 generated themes', () => {
      const count = 10000;
      for (let seed = 0; seed < count; seed++) {
        const theme = generateTheme(seed);
        const sentence = theme.initialSentence;

        expect(sentence.startsWith('The '), `Seed ${seed}: Sentence must start with "The "`).toBe(true);
        expect(sentence.endsWith('.'), `Seed ${seed}: Sentence must end with "."`).toBe(true);

        const tokens = sentence.trim().split(/\s+/);
        expect(tokens.length, `Seed ${seed}: Word count must be 7..12`).toBeGreaterThanOrEqual(7);
        expect(tokens.length, `Seed ${seed}: Word count must be 7..12`).toBeLessThanOrEqual(12);

        tokens.forEach(tok => {
          const root = tok.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
          expect(root, `Seed ${seed}: Token "${tok}" root must match /^[a-zA-Z]+$/`).toMatch(/^[a-zA-Z]+$/);
          expect(root.length, `Seed ${seed}: Word "${root}" must be < 12 characters`).toBeLessThan(12);
          expect(root.length, `Seed ${seed}: Word "${root}" must be >= 1 character`).toBeGreaterThanOrEqual(1);
        });
      }
    });

    it('verifies 100% compliance of traps (exactly 5) and decoys (exactly 3) across 10,000 themes', () => {
      const count = 10000;
      for (let seed = 0; seed < count; seed++) {
        const theme = generateTheme(seed);

        // Trap Words: exactly 5, unique, lowercase, <12 chars, pure letters
        expect(theme.bannedWords.length, `Seed ${seed}: exactly 5 traps`).toBe(5);
        const uniqueTraps = new Set(theme.bannedWords);
        expect(uniqueTraps.size, `Seed ${seed}: duplicate traps detected`).toBe(5);

        theme.bannedWords.forEach(trap => {
          expect(trap).toBe(trap.toLowerCase());
          expect(trap).toMatch(/^[a-z]+$/);
          expect(trap.length).toBeLessThan(12);
        });

        // Decoy Themes: exactly 3, unique, non-empty, distinct from theme
        expect(theme.decoyThemes.length, `Seed ${seed}: exactly 3 decoys`).toBe(3);
        const uniqueDecoys = new Set(theme.decoyThemes);
        expect(uniqueDecoys.size, `Seed ${seed}: duplicate decoys detected`).toBe(3);

        theme.decoyThemes.forEach(decoy => {
          expect(decoy.trim().length).toBeGreaterThan(0);
          expect(decoy.trim().toLowerCase()).not.toBe(theme.theme.trim().toLowerCase());
        });
      }
    });

    it('stress-tests extreme seeds: negative, max uint32, zero, and sparse random seeds', () => {
      const extremeSeeds = [
        -1, -100, -999999,
        0, 1,
        2147483647, // 2^31 - 1
        2147483648, // 2^31
        4294967294, // 2^32 - 2 (distinct from -1 which maps to 4294967295)
      ];

      const generatedThemes = extremeSeeds.map(s => generateTheme(s));
      const ids = new Set(generatedThemes.map(t => t.id));
      expect(ids.size).toBe(extremeSeeds.length); // Zero collisions across extreme seeds

      generatedThemes.forEach(t => {
        expect(t.id).toMatch(/^gen-\d+$/);
        expect(t.initialSentence.startsWith('The ')).toBe(true);
        expect(t.initialSentence.endsWith('.')).toBe(true);
        expect(t.bannedWords.length).toBe(5);
        expect(t.decoyThemes.length).toBe(3);
      });

      // 1,000 pseudo-random 32-bit seeds test
      const randomSeeds = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 0xffffffff));
      const randomUniqueSeeds = Array.from(new Set(randomSeeds));
      const randomThemes = randomUniqueSeeds.map(s => generateTheme(s));
      const randomIds = new Set(randomThemes.map(t => t.id));
      expect(randomIds.size).toBe(randomUniqueSeeds.length);
    });

    it('verifies balanced domain representation across 10,000 generated themes', () => {
      const domainCount: Record<string, number> = {};
      for (let s = 0; s < 10000; s++) {
        const theme = generateTheme(s);
        domainCount[theme.category] = (domainCount[theme.category] || 0) + 1;
      }

      const expectedCategories = Array.from(new Set(GENERATOR_DOMAINS.map(d => d.category)));
      expectedCategories.forEach(cat => {
        expect(domainCount[cat], `Category "${cat}" must be well-represented`).toBeGreaterThan(400);
      });
    });
  });

  // =========================================================================
  // SECTION 3: Decoder Deduction Resolution Stress Test (500 Simulations)
  // =========================================================================
  describe('3. Decoder Deduction Resolution Stress Test (500 Simulations)', () => {
    function makeChain(overrides: Partial<Chain> = {}): Chain {
      return {
        id: `chain-stress-${Math.random().toString(36).substring(2, 9)}`,
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
        ...overrides,
      };
    }

    it('simulates 250 CORRECT decoder guesses across various hop and bonus levels', () => {
      for (let i = 0; i < 250; i++) {
        // Vary starting hops: from 10 to 99
        const initialHop = 10 + (i % 90);
        // Vary starting bonus: 0 to 80 (multiples of 10)
        const initialBonus = (i % 9) * 10;
        // Vary starting lives: 1, 2, 3
        const initialLives = (i % 3) + 1;

        const originalSentence = 'The midnight courier delivered secret dossiers across foggy Berlin streets.';
        const chain = makeChain({
          currentHop: initialHop,
          bonusHops: initialBonus,
          lives: initialLives,
          currentSentence: originalSentence,
        });

        // Test with varying casing and whitespace
        let guess = 'Cold War Espionage';
        if (i % 3 === 0) guess = 'cold war espionage';
        else if (i % 3 === 1) guess = '  COLD WAR ESPIONAGE  ';

        const result = resolveDecoderGuess(chain, guess, `player-${i}`);

        // 1. Correctness & Bonus
        expect(result.isCorrect).toBe(true);
        expect(result.bonusAwarded).toBe(DECODER_BONUS_HOPS);
        expect(result.chain.bonusHops).toBe(initialBonus + DECODER_BONUS_HOPS);

        // 2. Hop progression
        expect(result.chain.currentHop).toBe(initialHop + 1);

        // 3. Lives invariant (lives remain intact on correct guess)
        expect(result.chain.lives).toBe(initialLives);
        expect(result.livesRemaining).toBe(initialLives);

        // 4. Sentence Token Immutability (STRICT INVARIANT)
        expect(result.chain.currentSentence).toBe(originalSentence);
        expect(result.hop.previousSentence).toBe(originalSentence);
        expect(result.hop.newSentence).toBe(originalSentence);
        expect(result.hop.oldWord).toBeUndefined();
        expect(result.hop.newWord).toBeUndefined();

        // 5. Hop entry validity
        expect(result.hop.role).toBe('decoder');
        expect(result.hop.hopNumber).toBe(initialHop + 1);
        expect(result.hop.isCorrectGuess).toBe(true);
        expect(result.hop.decoderGuess).toBe(guess);
        expect(result.hop.playerId).toBe(`player-${i}`);

        // 6. Victory condition evaluation
        const effectiveHops = (initialHop + 1) + (initialBonus + DECODER_BONUS_HOPS);
        const expectedVictory = effectiveHops >= DEFAULT_MAX_HOPS;

        expect(result.isVictory).toBe(expectedVictory);
        if (expectedVictory) {
          expect(result.chain.status).toBe('victory');
          expect(result.chain.completedAt).toBeDefined();
          expect(result.chain.completedAt).toBeGreaterThan(0);
        } else {
          expect(result.chain.status).toBe('in_progress');
        }

        expect(result.isDestroyed).toBe(false);
      }
    });

    it('simulates 250 INCORRECT decoder guesses across various hop and life levels', () => {
      for (let i = 0; i < 250; i++) {
        const initialHop = 10 + (i % 80);
        const initialBonus = (i % 4) * 10;
        // Vary starting lives: 1, 2, or 3
        const initialLives = (i % 3) + 1;

        const originalSentence = 'The midnight courier delivered secret dossiers across foggy Berlin streets.';
        const chain = makeChain({
          currentHop: initialHop,
          bonusHops: initialBonus,
          lives: initialLives,
          currentSentence: originalSentence,
        });

        // Test with decoy options or random wrong strings
        const wrongGuesses = ['Cyberpunk Heist', 'Vatican Archives', 'Completely Bogus Theme', '', '   '];
        const guess = wrongGuesses[i % wrongGuesses.length];

        const result = resolveDecoderGuess(chain, guess, `player-fail-${i}`);

        // 1. Correctness & Bonus
        expect(result.isCorrect).toBe(false);
        expect(result.bonusAwarded).toBe(0);
        expect(result.chain.bonusHops).toBe(initialBonus);

        // 2. Hop progression
        expect(result.chain.currentHop).toBe(initialHop + 1);

        // 3. Strike deduction (lives decremented by 1, clamped to 0)
        const expectedLives = Math.max(0, initialLives - 1);
        expect(result.chain.lives).toBe(expectedLives);
        expect(result.livesRemaining).toBe(expectedLives);

        // 4. Sentence Token Immutability (STRICT INVARIANT)
        expect(result.chain.currentSentence).toBe(originalSentence);
        expect(result.hop.previousSentence).toBe(originalSentence);
        expect(result.hop.newSentence).toBe(originalSentence);
        expect(result.hop.oldWord).toBeUndefined();
        expect(result.hop.newWord).toBeUndefined();

        // 5. Hop entry validity
        expect(result.hop.role).toBe('decoder');
        expect(result.hop.hopNumber).toBe(initialHop + 1);
        expect(result.hop.isCorrectGuess).toBe(false);
        expect(result.hop.decoderGuess).toBe(guess);

        // 6. Destruction condition evaluation
        const expectedDestroyed = expectedLives <= 0;
        expect(result.isDestroyed).toBe(expectedDestroyed);
        if (expectedDestroyed) {
          expect(result.chain.status).toBe('destroyed');
          expect(result.chain.completedAt).toBeDefined();
          expect(result.chain.completedAt).toBeGreaterThan(0);
        } else {
          expect(result.chain.status).toBe('in_progress');
        }

        expect(result.isVictory).toBe(false);
      }
    });

    it('verifies exact Victory boundary transitions at 100 effective hops', () => {
      // Case A: 89 hops + 1 correct guess (currentHop -> 90, bonusHops -> 10, total 100) -> VICTORY
      const chainA = makeChain({ currentHop: 89, bonusHops: 0 });
      const resA = resolveDecoderGuess(chainA, 'Cold War Espionage', 'p-boundary-A');
      expect(resA.chain.currentHop).toBe(90);
      expect(resA.chain.bonusHops).toBe(10);
      expect(resA.chain.currentHop + (resA.chain.bonusHops || 0)).toBe(100);
      expect(resA.isVictory).toBe(true);
      expect(resA.chain.status).toBe('victory');

      // Case B: 88 hops + 1 correct guess (currentHop -> 89, bonusHops -> 10, total 99) -> NOT YET VICTORY
      const chainB = makeChain({ currentHop: 88, bonusHops: 0 });
      const resB = resolveDecoderGuess(chainB, 'Cold War Espionage', 'p-boundary-B');
      expect(resB.chain.currentHop).toBe(89);
      expect(resB.chain.bonusHops).toBe(10);
      expect(resB.chain.currentHop + (resB.chain.bonusHops || 0)).toBe(99);
      expect(resB.isVictory).toBe(false);
      expect(resB.chain.status).toBe('in_progress');

      // Case C: 99 hops + 1 correct guess (currentHop -> 100, bonusHops -> 10, total 110) -> VICTORY
      const chainC = makeChain({ currentHop: 99, bonusHops: 0 });
      const resC = resolveDecoderGuess(chainC, 'Cold War Espionage', 'p-boundary-C');
      expect(resC.chain.currentHop).toBe(100);
      expect(resC.chain.bonusHops).toBe(10);
      expect(resC.isVictory).toBe(true);
      expect(resC.chain.status).toBe('victory');
    });

    it('verifies exact Destruction boundary transitions at 0 lives', () => {
      // Case A: 1 life + 1 incorrect guess -> 0 lives -> DESTROYED
      const chainA = makeChain({ lives: 1 });
      const resA = resolveDecoderGuess(chainA, 'Wrong Guess', 'p-destruct-A');
      expect(resA.chain.lives).toBe(0);
      expect(resA.isDestroyed).toBe(true);
      expect(resA.chain.status).toBe('destroyed');
      expect(resA.chain.completedAt).toBeDefined();

      // Case B: 2 lives + 1 incorrect guess -> 1 life -> NOT DESTROYED
      const chainB = makeChain({ lives: 2 });
      const resB = resolveDecoderGuess(chainB, 'Wrong Guess', 'p-destruct-B');
      expect(resB.chain.lives).toBe(1);
      expect(resB.isDestroyed).toBe(false);
      expect(resB.chain.status).toBe('in_progress');

      // Case C: 3 lives + 1 incorrect guess -> 2 lives -> NOT DESTROYED
      const chainC = makeChain({ lives: 3 });
      const resC = resolveDecoderGuess(chainC, 'Wrong Guess', 'p-destruct-C');
      expect(resC.chain.lives).toBe(2);
      expect(resC.isDestroyed).toBe(false);
      expect(resC.chain.status).toBe('in_progress');
    });

    it('rejects guesses on already finalized chains (victory or destroyed) with descriptive Error', () => {
      const victoryChain = makeChain({ status: 'victory' });
      expect(() => resolveDecoderGuess(victoryChain, 'Cold War Espionage', 'p1')).toThrow(
        /Cannot submit decoder guess to a finalized chain with status "victory"/
      );

      const destroyedChain = makeChain({ status: 'destroyed' });
      expect(() => resolveDecoderGuess(destroyedChain, 'Cold War Espionage', 'p1')).toThrow(
        /Cannot submit decoder guess to a finalized chain with status "destroyed"/
      );
    });

    it('verifies shuffleThemeOptions maintains length, elements, and statistical distribution', () => {
      const original = ['Option A', 'Option B', 'Option C', 'Option D'];
      const firstElementCount: Record<string, number> = {
        'Option A': 0,
        'Option B': 0,
        'Option C': 0,
        'Option D': 0,
      };

      const iterations = 2000;
      for (let i = 0; i < iterations; i++) {
        const shuffled = shuffleThemeOptions(original);
        expect(shuffled.length).toBe(4);
        expect(new Set(shuffled).size).toBe(4);
        original.forEach(opt => expect(shuffled).toContain(opt));

        firstElementCount[shuffled[0]]++;
      }

      // Check roughly uniform distribution for first element (25% = 500, expect 350..650)
      original.forEach(opt => {
        expect(firstElementCount[opt]).toBeGreaterThan(350);
        expect(firstElementCount[opt]).toBeLessThan(650);
      });
    });
  });
});

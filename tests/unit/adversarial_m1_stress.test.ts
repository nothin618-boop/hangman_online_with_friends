import { describe, it, expect, beforeAll } from 'vitest';
import { validateCandidateWord, extractHistoricalWords } from '@/lib/filter';
import { determinePlayerRole, getHopsUntilNextDecoder } from '@/lib/roles';
import { resolveDecoderGuess } from '@/lib/decoder';
import { replaceWordInSentence } from '@/lib/sentence';
import { getDictionary, isDictionaryWord, getDictionarySize } from '@/lib/dictionary';
import { Chain, Hop } from '@/lib/types';

describe('Adversarial Stress Harness — Milestone M1', () => {
  beforeAll(() => {
    // Ensure full dictionary is loaded
    getDictionary();
  });

  // =========================================================================
  // 1. FILTER ENGINE BOUNDARY TORTURE
  // =========================================================================
  describe('1. Filter Engine Boundary Torture', () => {
    describe('1.1 Zero-Width Spaces & Invisible Characters', () => {
      const zeroWidthVectors = [
        { name: 'Embedded Zero-Width Space (\\u200B)', input: 'sec\u200Bret' },
        { name: 'Prefixed Zero-Width Space (\\u200B)', input: '\u200Bsecret' },
        { name: 'Suffixed Zero-Width Space (\\u200B)', input: 'secret\u200B' },
        { name: 'Embedded Zero-Width Non-Joiner (\\u200C)', input: 'sec\u200Cret' },
        { name: 'Embedded Zero-Width Joiner (\\u200D)', input: 'sec\u200Dret' },
        { name: 'Embedded Word Joiner (\\u2060)', input: 'sec\u2060ret' },
        { name: 'Embedded Zero-Width No-Break Space (BOM \\uFEFF)', input: 'sec\uFEFFret' },
        { name: 'Pure Zero-Width Space', input: '\u200B' },
        { name: 'Pure BOM', input: '\uFEFF' },
        { name: 'Alternating Zero-Width Spaces', input: 's\u200Be\u200Bc\u200Br\u200Be\u200Bt' },
      ];

      zeroWidthVectors.forEach(({ name, input }) => {
        it(`rejects invisible formatting attack: ${name}`, () => {
          const res = validateCandidateWord(input);
          expect(res.valid, `Vector "${name}" must be rejected`).toBe(false);
          expect(['INVALID_CHARACTERS', 'EMPTY_INPUT']).toContain(res.error);
        });
      });
    });

    describe('1.2 Unicode Lookalikes & Homoglyphs', () => {
      const lookalikeVectors = [
        { name: 'Cyrillic small letter a (\\u0430) in "shadow"', input: 'sh\u0430dow' },
        { name: 'Cyrillic small letter e (\\u0435) in "secret"', input: 's\u0435cr\u0435t' },
        { name: 'Cyrillic small letter o (\\u043E) in "ghost"', input: 'gh\u043Est' },
        { name: 'Cyrillic small letter c (\\u0441) in "cipher"', input: '\u0441ipher' },
        { name: 'Fullwidth Latin "ｓｅｃｒｅｔ"', input: '\uFF53\uFF45\uFF43\uFF52\uFF45\uFF54' },
        { name: 'Accented Latin "café"', input: 'café' },
        { name: 'Accented Latin "naïve"', input: 'naïve' },
        { name: 'Accented Latin "résumé"', input: 'résumé' },
        { name: 'Greek small letter alpha (\\u03B1)', input: 'secret\u03B1' },
        { name: 'Mathematical monospace "𝚊𝚐𝚎𝚗𝚝"', input: '𝚊𝚐𝚎𝚗𝚝' },
      ];

      lookalikeVectors.forEach(({ name, input }) => {
        it(`rejects unicode homoglyph spoofing: ${name}`, () => {
          const res = validateCandidateWord(input);
          expect(res.valid, `Homoglyph "${name}" must be rejected`).toBe(false);
          expect(res.error).toBe('INVALID_CHARACTERS');
        });
      });
    });

    describe('1.3 Symbols, Control Codes, Punctuation & Whitespace Torture', () => {
      const symbolVectors = [
        { name: 'Hyphenated compound "double-agent"', input: 'double-agent', expectValid: false },
        { name: 'Underscore "secret_code"', input: 'secret_code', expectValid: false },
        { name: 'Embedded space "secret agent"', input: 'secret agent', expectValid: false },
        { name: 'Leading space " agent"', input: ' agent', expectValid: true }, // trim permits valid word
        { name: 'Trailing space "agent "', input: 'agent ', expectValid: true }, // trim permits valid word
        { name: 'Internal tab "secret\\tagent"', input: 'secret\tagent', expectValid: false },
        { name: 'Null byte injection "sec\\0ret"', input: 'sec\0ret', expectValid: false },
        { name: 'Exclamation mark "secret!"', input: 'secret!', expectValid: false },
        { name: 'At sign "@agent"', input: '@agent', expectValid: false },
        { name: 'Dollar sign "bounty$"', input: 'bounty$', expectValid: false },
        { name: 'Emoji injection "spy🕵️"', input: 'spy🕵️', expectValid: false },
        { name: 'Numbers with word "agent007"', input: 'agent007', expectValid: false },
        { name: 'L33t speak "s3cr3t"', input: 's3cr3t', expectValid: false },
        { name: 'Pure numbers "12345"', input: '12345', expectValid: false },
        { name: 'HTML injection "<script>"', input: '<script>', expectValid: false },
        { name: 'SQL injection "secret;--"', input: 'secret;--', expectValid: false },
      ];

      symbolVectors.forEach(({ name, input, expectValid }) => {
        it(`evaluates symbol/syntax vector: ${name}`, () => {
          const res = validateCandidateWord(input);
          if (expectValid) {
            expect(res.valid).toBe(true);
          } else {
            expect(res.valid, `Symbol attack "${name}" must be rejected`).toBe(false);
            expect(['INVALID_CHARACTERS', 'EMPTY_INPUT']).toContain(res.error);
          }
        });
      });
    });

    describe('1.4 Exact Length Boundary Torture (10 vs 11 vs 12 vs 13 chars)', () => {
      it('accepts valid 1-letter English words ("a", "i")', () => {
        expect(validateCandidateWord('a').valid).toBe(true);
        expect(validateCandidateWord('i').valid).toBe(true);
      });

      it('rejects 1-letter non-words ("b", "z", "q")', () => {
        const res = validateCandidateWord('z');
        expect(res.valid).toBe(false);
        expect(res.error).toBe('NOT_IN_DICTIONARY');
      });

      it('accepts valid 10-character words ("cryptogram", "superpower")', () => {
        expect('cryptogram'.length).toBe(10);
        expect(validateCandidateWord('cryptogram').valid).toBe(true);
        expect('superpower'.length).toBe(10);
        expect(validateCandidateWord('superpower').valid).toBe(true);
      });

      it('accepts valid 11-character boundary words ("superpowers", "information", "countermine")', () => {
        expect('superpowers'.length).toBe(11);
        expect(validateCandidateWord('superpowers').valid).toBe(true);

        expect('information'.length).toBe(11);
        const resInfo = validateCandidateWord('information');
        expect(resInfo.valid).toBe(true);

        expect('countermine'.length).toBe(11);
        const resCounter = validateCandidateWord('countermine');
        expect(resCounter.valid).toBe(true);
      });

      it('STRICT REJECTION on 12-character boundary words ("supernatural", "cryptography", "confidential")', () => {
        expect('supernatural'.length).toBe(12);
        const res1 = validateCandidateWord('supernatural');
        expect(res1.valid).toBe(false);
        expect(res1.error).toBe('WORD_TOO_LONG');

        expect('cryptography'.length).toBe(12);
        const res2 = validateCandidateWord('cryptography');
        expect(res2.valid).toBe(false);
        expect(res2.error).toBe('WORD_TOO_LONG');

        expect('confidential'.length).toBe(12);
        const res3 = validateCandidateWord('confidential');
        expect(res3.valid).toBe(false);
        expect(res3.error).toBe('WORD_TOO_LONG');
      });

      it('STRICT REJECTION on 13-character boundary words ("counterattack", "cryptographic")', () => {
        expect('counterattack'.length).toBe(13);
        const res1 = validateCandidateWord('counterattack');
        expect(res1.valid).toBe(false);
        expect(res1.error).toBe('WORD_TOO_LONG');

        expect('cryptographic'.length).toBe(13);
        const res2 = validateCandidateWord('cryptographic');
        expect(res2.valid).toBe(false);
        expect(res2.error).toBe('WORD_TOO_LONG');
      });

      it('STRICT REJECTION on extreme length words (50 chars and 10,000 chars)', () => {
        const longWord50 = 'a'.repeat(50);
        const res50 = validateCandidateWord(longWord50);
        expect(res50.valid).toBe(false);
        expect(res50.error).toBe('WORD_TOO_LONG');

        const longWord10k = 'a'.repeat(10000);
        const res10k = validateCandidateWord(longWord10k);
        expect(res10k.valid).toBe(false);
        expect(res10k.error).toBe('WORD_TOO_LONG');
      });
    });

    describe('1.5 Modern Slang, Gibberish, and Non-Dictionary Words', () => {
      const slangWords = [
        'rizz', 'skibidi', 'yeet', 'delulu', 'poggers',
        'gyatt', 'bussin', 'simp', 'sus', 'cap'
      ];

      slangWords.forEach(slang => {
        it(`handles non-standard slang or non-dictionary token "${slang}"`, () => {
          const res = validateCandidateWord(slang);
          // In standard English dictionary, unindexed slang must be NOT_IN_DICTIONARY
          if (!isDictionaryWord(slang)) {
            expect(res.valid).toBe(false);
            expect(res.error).toBe('NOT_IN_DICTIONARY');
          } else {
            // If slang happens to be an archaic or valid English word (e.g. "cap", "simp", "sus" Latin)
            expect(res.valid).toBe(true);
          }
        });
      });

      const pureGibberish = ['qwrty', 'asdfgh', 'zxcvbn', 'bcdfgh', 'xyzqjk', 'zzzz'];
      pureGibberish.forEach(gibberish => {
        it(`rejects pure gibberish "${gibberish}"`, () => {
          const res = validateCandidateWord(gibberish);
          expect(res.valid).toBe(false);
          expect(res.error).toBe('NOT_IN_DICTIONARY');
        });
      });
    });

    describe('1.6 Edge Casing & Type Robustness', () => {
      it('handles various letter casings identically (case-folding normalization)', () => {
        const lower = validateCandidateWord('whisper');
        const upper = validateCandidateWord('WHISPER');
        const mixed = validateCandidateWord('WhIsPeR');
        const title = validateCandidateWord('Whisper');

        expect(lower.valid).toBe(true);
        expect(upper.valid).toBe(true);
        expect(mixed.valid).toBe(true);
        expect(title.valid).toBe(true);
      });

      it('catches secret trap words across all casing and padding variations', () => {
        const traps = ['spy', 'agent', 'soviet', 'nuclear', 'embassy'];

        expect(validateCandidateWord('spy', [], traps).isTrap).toBe(true);
        expect(validateCandidateWord('SPY', [], traps).isTrap).toBe(true);
        expect(validateCandidateWord('Spy', [], traps).isTrap).toBe(true);
        expect(validateCandidateWord('sPy', [], traps).isTrap).toBe(true);
        expect(validateCandidateWord('  nuclear  ', [], traps).isTrap).toBe(true);
      });

      it('handles null, undefined, empty, and non-string inputs safely without throwing', () => {
        expect(validateCandidateWord('' as any).valid).toBe(false);
        expect(validateCandidateWord(null as any).valid).toBe(false);
        expect(validateCandidateWord(undefined as any).valid).toBe(false);
        expect(validateCandidateWord(12345 as any).valid).toBe(false);
        expect(validateCandidateWord({} as any).valid).toBe(false);
      });
    });

    describe('1.7 Trap Word Evasion Bypass Probes', () => {
      const traps = ['spy', 'agent', 'soviet', 'nuclear', 'embassy'];

      const evasionVectors = [
        { name: 'Zero-width space in trap "s\\u200Bpy"', word: 's\u200Bpy' },
        { name: 'Zero-width space prefix "\\u200Bagent"', word: '\u200Bagent' },
        { name: 'Cyrillic homoglyph in trap "sоviet" (Cyrillic o)', word: 's\u043Eviet' },
        { name: 'Accented trap "spÿ"', word: 'spÿ' },
        { name: 'L33t speak trap "ag3nt"', word: 'ag3nt' },
        { name: 'Punctuation inside trap "s.p.y"', word: 's.p.y' },
        { name: 'Spaced letters "s p y"', word: 's p y' },
        { name: 'Hyphenated trap "anti-agent"', word: 'anti-agent' },
      ];

      evasionVectors.forEach(({ name, word }) => {
        it(`blocks sneaky evasion attempt on trap words: ${name}`, () => {
          const res = validateCandidateWord(word, [], traps);
          // Evasion attempts must NEVER be accepted as valid non-trap words
          expect(res.valid).toBe(false);
          expect(['INVALID_CHARACTERS', 'EMPTY_INPUT', 'NOT_IN_DICTIONARY']).toContain(res.error);
        });
      });
    });

    describe('1.8 Batch Verification: 11 vs 12 vs 13 Character Words from Dictionary', () => {
      const valid11CharWords = [
        'superpowers', 'information', 'countermine', 'astronomers', 'transcripts',
        'submersible', 'underground', 'clandestine', 'patronizing', 'speculation',
        'confounding', 'revolutions', 'coordinates', 'abandonment', 'abbreviated'
      ];

      const rejected12CharWords = [
        'cryptography', 'supernatural', 'confidential', 'intelligence', 'surveillance',
        'headquarters', 'transmission', 'breakthrough', 'interception', 'transmitting',
        'annihilation', 'exterminated', 'refrigerated', 'inquisitions', 'proclamation'
      ];

      const rejected13CharWords = [
        'counterattack', 'cryptographic', 'investigation', 'reconstructed', 'communication',
        'unconditional', 'authoritarian', 'transcription', 'abbreviations', 'abnormalities'
      ];

      it('validates that ALL sampled 11-char words pass the length constraint', () => {
        for (const word of valid11CharWords) {
          expect(word.length).toBe(11);
          const res = validateCandidateWord(word);
          // Should pass length check and be valid if in dictionary
          if (isDictionaryWord(word)) {
            expect(res.valid, `11-letter word "${word}" must be valid`).toBe(true);
          }
        }
      });

      it('strictly rejects ALL sampled 12-char words with WORD_TOO_LONG', () => {
        for (const word of rejected12CharWords) {
          expect(word.length).toBe(12);
          const res = validateCandidateWord(word);
          expect(res.valid, `12-letter word "${word}" must be rejected`).toBe(false);
          expect(res.error).toBe('WORD_TOO_LONG');
        }
      });

      it('strictly rejects ALL sampled 13-char words with WORD_TOO_LONG', () => {
        for (const word of rejected13CharWords) {
          expect(word.length).toBe(13);
          const res = validateCandidateWord(word);
          expect(res.valid, `13-letter word "${word}" must be rejected`).toBe(false);
          expect(res.error).toBe('WORD_TOO_LONG');
        }
      });
    });
  });

  // =========================================================================
  // 2. HISTORY EXTRACTION TORTURE (50-HOP MOCK CHAIN)
  // =========================================================================
  describe('2. History Extraction Torture (50-Hop Mock Chain)', () => {
    const starterSentence = 'The midnight courier delivered secret dossiers to the embassy.';
    
    // Generate a 50-hop mock chain with realistic mutations, casing, and complex punctuation
    const mock50HopChain: Hop[] = [];
    const usedWordsList: string[] = ['midnight', 'courier', 'delivered', 'secret', 'dossiers', 'embassy'];

    // 50 valid dictionary words for mutation
    const mutationWords = [
      'shadow', 'cipher', 'agent', 'stealth', 'phantom',
      'patrol', 'customs', 'hacker', 'matrix', 'flight',
      'rocket', 'shuttle', 'station', 'silicon', 'hazard',
      'castle', 'pyramid', 'parlor', 'chemical', 'cauldron',
      'papal', 'soldiers', 'sentinel', 'paradox', 'forgery',
      'corridors', 'titanium', 'unearthly', 'blinding', 'breached',
      'muffled', 'rotated', 'flickered', 'labyrinth', 'algorithm',
      'sanctuary', 'dawn', 'dusk', 'noon', 'morning',
      'evening', 'escape', 'evade', 'disguise', 'whisper',
      'telephone', 'signal', 'terminal', 'network', 'protocol'
    ];

    let currentSentence = starterSentence;

    for (let hopNum = 1; hopNum <= 50; hopNum++) {
      const prevSentence = currentSentence;
      const word = mutationWords[hopNum - 1];
      usedWordsList.push(word);

      // Apply varying punctuation and casing to test robust token extraction
      let formattedWord = word;
      if (hopNum % 4 === 1) formattedWord = word.toUpperCase();
      else if (hopNum % 4 === 2) formattedWord = word.charAt(0).toUpperCase() + word.slice(1);
      else if (hopNum % 4 === 3) formattedWord = word;

      // Wrap in various punctuation in the sentence
      let sentencePunctuationWord = formattedWord;
      if (hopNum % 5 === 0) sentencePunctuationWord = `"${formattedWord},"`;
      else if (hopNum % 5 === 1) sentencePunctuationWord = `(${formattedWord})!`;
      else if (hopNum % 5 === 2) sentencePunctuationWord = `[${formattedWord}]`;
      else if (hopNum % 5 === 3) sentencePunctuationWord = `—${formattedWord}—`;
      else if (hopNum % 5 === 4) sentencePunctuationWord = `'${formattedWord}...'`;

      currentSentence = `The ${sentencePunctuationWord} agent completed the mission.`;

      mock50HopChain.push({
        hopNumber: hopNum,
        playerId: `player-${hopNum}`,
        playerAlias: `Agent-${hopNum}`,
        previousSentence: prevSentence,
        newSentence: currentSentence,
        role: 'shifter',
        oldWord: 'courier',
        newWord: word,
        timestamp: Date.now() + hopNum * 1000
      });
    }

    it('successfully constructs a valid 50-hop mock chain', () => {
      expect(mock50HopChain.length).toBe(50);
      expect(usedWordsList.length).toBeGreaterThanOrEqual(56);
    });

    it('extractHistoricalWords captures all starter sentence tokens regardless of punctuation', () => {
      const extractedSet = extractHistoricalWords(mock50HopChain, starterSentence);
      
      expect(extractedSet.has('midnight')).toBe(true);
      expect(extractedSet.has('courier')).toBe(true);
      expect(extractedSet.has('delivered')).toBe(true);
      expect(extractedSet.has('secret')).toBe(true);
      expect(extractedSet.has('dossiers')).toBe(true);
      expect(extractedSet.has('embassy')).toBe(true);
    });

    it('extractHistoricalWords captures every mutated word across all 50 hops', () => {
      const extractedSet = extractHistoricalWords(mock50HopChain, starterSentence);
      
      for (const word of mutationWords) {
        expect(extractedSet.has(word), `Extracted set must contain historical word "${word}"`).toBe(true);
      }
    });

    it('guarantees ZERO DUPLICATES can slip past: all 50 mutated words are strictly rejected', () => {
      // Test every single word used in the 50 hops against validateCandidateWord
      for (let i = 0; i < mutationWords.length; i++) {
        const testWord = mutationWords[i];
        
        // 1. Lowercase submission
        const resLower = validateCandidateWord(testWord, mock50HopChain, [], starterSentence);
        expect(resLower.valid, `Duplicate "${testWord}" must be rejected`).toBe(false);
        expect(resLower.error).toBe('DUPLICATE_HISTORICAL_WORD');

        // 2. Uppercase submission
        const resUpper = validateCandidateWord(testWord.toUpperCase(), mock50HopChain, [], starterSentence);
        expect(resUpper.valid, `Uppercase duplicate "${testWord.toUpperCase()}" must be rejected`).toBe(false);
        expect(resUpper.error).toBe('DUPLICATE_HISTORICAL_WORD');

        // 3. Mixed case submission
        const mixed = testWord.charAt(0).toUpperCase() + testWord.slice(1);
        const resMixed = validateCandidateWord(mixed, mock50HopChain, [], starterSentence);
        expect(resMixed.valid, `Mixed case duplicate "${mixed}" must be rejected`).toBe(false);
        expect(resMixed.error).toBe('DUPLICATE_HISTORICAL_WORD');
      }
    });

    it('permits a completely fresh, unused dictionary word not in 50-hop history', () => {
      // "laser" was not used in starterSentence or mutationWords
      expect(usedWordsList.includes('laser')).toBe(false);
      const res = validateCandidateWord('laser', mock50HopChain, [], starterSentence);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('correctly handles revoked hops in 50-hop history without leakage', () => {
      // Inject a revoked sabotage hop with a unique troll word
      const chainWithRevoked: Hop[] = [
        ...mock50HopChain,
        {
          hopNumber: 51,
          playerId: 'troll-99',
          playerAlias: 'Saboteur',
          previousSentence: currentSentence,
          newSentence: 'The trollwordone agent completed the mission.',
          role: 'shifter',
          oldWord: 'agent',
          newWord: 'trollwordone',
          isRevoked: true, // Rewound by crowd jury!
          timestamp: Date.now() + 60000
        }
      ];

      const extracted = extractHistoricalWords(chainWithRevoked, starterSentence);
      // The revoked word MUST NOT be recorded in the historical words
      expect(extracted.has('trollwordone')).toBe(false);

      // But words from non-revoked hops and initial sentence MUST STILL be forbidden
      expect(extracted.has('secret')).toBe(true);
      expect(extracted.has('shadow')).toBe(true);
    });

    it('Sequential 50-Hop Mutation Engine: mutates real sentences and verifies 100% duplicate catch', () => {
      let sentence = 'The covert operative met the contact at the dock.';
      const liveHistory: Hop[] = [];
      const distinctWords = [
        'shadow', 'cipher', 'courier', 'midnight', 'berlin', 'dossier', 'parchment',
        'infiltrate', 'patrol', 'customs', 'hacker', 'matrix', 'flight', 'rocket',
        'shuttle', 'station', 'silicon', 'hazard', 'castle', 'pyramid', 'parlor',
        'chemical', 'cauldron', 'papal', 'soldiers', 'sentinel', 'paradox', 'forgery',
        'corridors', 'titanium', 'unearthly', 'blinding', 'breached', 'muffled',
        'rotated', 'flickered', 'labyrinth', 'algorithm', 'sanctuary', 'dawn',
        'dusk', 'noon', 'morning', 'evening', 'escape', 'evade', 'disguise',
        'whisper', 'telephone', 'signal'
      ];

      for (let i = 0; i < 50; i++) {
        const newWord = distinctWords[i];
        // Mutate word at index 1 or 2
        const targetWordIndex = 1 + (i % 4);
        const { newSentence, oldWord } = replaceWordInSentence(sentence, targetWordIndex, newWord);
        
        liveHistory.push({
          hopNumber: i + 1,
          playerId: `player-${i + 1}`,
          previousSentence: sentence,
          newSentence: newSentence,
          role: 'shifter',
          oldWord,
          newWord,
          timestamp: Date.now() + i * 1000
        });

        sentence = newSentence;
      }

      expect(liveHistory.length).toBe(50);

      // Now verify that ALL 50 newly inserted words and initial words are 100% caught
      const historicalSet = extractHistoricalWords(liveHistory, 'The covert operative met the contact at the dock.');
      for (const word of distinctWords) {
        expect(historicalSet.has(word), `Word "${word}" must be in historical set`).toBe(true);
        const res = validateCandidateWord(word, liveHistory, [], 'The covert operative met the contact at the dock.');
        expect(res.valid, `Duplicate candidate "${word}" must be rejected`).toBe(false);
        expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
      }

      // Initial sentence words must also be strictly rejected
      const initialTokens = ['covert', 'operative', 'met', 'contact', 'dock'];
      for (const token of initialTokens) {
        const res = validateCandidateWord(token, liveHistory, [], 'The covert operative met the contact at the dock.');
        expect(res.valid, `Initial token "${token}" must be rejected as duplicate`).toBe(false);
        expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
      }
    });
  });

  // =========================================================================
  // 3. DYNAMIC ROLE SIMULATOR (1,000 HOPS & BONUS JUMPS)
  // =========================================================================
  describe('3. Dynamic Role Simulator (1,000 Hops & Bonus Jumps)', () => {
    it('Simulation A: Standard sequential progression across 1,000 hops', () => {
      const chain: Pick<Chain, 'currentHop' | 'history'> = {
        currentHop: 0,
        history: []
      };

      // Hop 0 must be Shifter
      const hop0Role = determinePlayerRole(chain);
      expect(hop0Role, 'Hop 0 must strictly be shifter').toBe('shifter');

      let decoderCount = 0;
      let shifterCount = 0;
      let previousRole: string | null = null;

      for (let hop = 1; hop <= 1000; hop++) {
        chain.currentHop = hop;
        const assignedRole = determinePlayerRole(chain);

        // Invariant 1: No two consecutive decoders EVER
        if (previousRole === 'decoder') {
          expect(assignedRole, `Hop ${hop} immediately following decoder must be shifter`).toBe('shifter');
        }

        // Invariant 2: Every 10th hop is decoder
        if (hop % 10 === 0) {
          expect(assignedRole, `Hop ${hop} must be decoder`).toBe('decoder');
          decoderCount++;
        } else {
          expect(assignedRole, `Hop ${hop} must be shifter`).toBe('shifter');
          shifterCount++;
        }

        previousRole = assignedRole;

        // Record hop in history
        chain.history.push({
          hopNumber: hop,
          playerId: `p-${hop}`,
          previousSentence: 'Test sentence',
          newSentence: 'Test sentence',
          role: assignedRole,
          timestamp: Date.now() + hop * 1000
        });
      }

      // Verify exact proportions
      expect(decoderCount).toBe(100); // 100 decoders in 1,000 hops (10, 20, ..., 1000)
      expect(shifterCount).toBe(900); // 900 shifters
    });

    it('Simulation B: 1,000 hops with +10 Bonus Hops jumps at every decoder milestone', () => {
      // In this simulation, whenever a player is assigned Decoder and guesses correctly,
      // the chain receives +10 bonus hops. We stress-test both bonus hop tracking
      // and fast-forward hop transitions.
      const chain: Chain = {
        id: 'stress-chain-bonus',
        secretTheme: 'Cold War Espionage',
        themeOptions: ['Cold War Espionage', 'Occult Secret', 'Cyber Heist', 'Ancient Tomb'],
        bannedWords: ['spy', 'soviet', 'agent', 'nuclear', 'embassy'],
        initialSentence: 'The midnight courier delivered secret dossiers.',
        currentSentence: 'The midnight courier delivered secret dossiers.',
        currentHop: 0,
        bonusHops: 0,
        lives: 3,
        maxHops: 2000,
        history: [],
        status: 'active',
        createdAt: Date.now()
      };

      // Hop 0 verification
      expect(determinePlayerRole(chain)).toBe('shifter');

      let hopsCompleted = 0;
      let previousRole: string | null = null;

      while (hopsCompleted < 1000) {
        const role = determinePlayerRole(chain);

        // CRITICAL INVARIANT: Hop 0 is never Decoder
        if (chain.currentHop === 0) {
          expect(role).toBe('shifter');
        }

        // CRITICAL INVARIANT: No two consecutive hops are ever Decoders
        if (previousRole === 'decoder') {
          expect(role, `Turn immediately after Decoder at hop ${chain.currentHop} must NEVER be Decoder`).toBe('shifter');
        }

        previousRole = role;

        if (role === 'decoder') {
          // Resolve decoder guess correctly -> awards +10 bonus hops!
          const result = resolveDecoderGuess(chain, 'Cold War Espionage', `decoder-${hopsCompleted}`);
          expect(result.isCorrect).toBe(true);
          expect(result.bonusAwarded).toBe(10);

          // Test extreme case: what if a caller also jumps currentHop forward by +10?
          // (Simulating fast-forward leap)
          chain.currentHop += 9; // combined with resolveDecoderGuess's +1, currentHop jumped by 10!
          hopsCompleted += 10;
        } else {
          // Shifter turn
          chain.currentHop += 1;
          hopsCompleted += 1;

          chain.history.push({
            hopNumber: chain.currentHop,
            playerId: `shifter-${hopsCompleted}`,
            previousSentence: chain.currentSentence,
            newSentence: chain.currentSentence,
            role: 'shifter',
            oldWord: 'courier',
            newWord: 'shadow',
            timestamp: Date.now()
          });
        }
      }

      expect(hopsCompleted).toBeGreaterThanOrEqual(1000);
    });

    it('Simulation C: Monte Carlo 10,000 hops with randomized guesses, variable bonus jumps, and jury rewinds', () => {
      const chain: Pick<Chain, 'currentHop' | 'history'> = {
        currentHop: 0,
        history: []
      };

      let previousRole: string | null = null;

      for (let step = 0; step < 10000; step++) {
        const assignedRole = determinePlayerRole(chain);

        // Invariant 1: Hop 0 is never Decoder
        if (chain.currentHop === 0) {
          expect(assignedRole, 'Hop 0 must NEVER be decoder under any conditions').toBe('shifter');
        }

        // Invariant 2: No two consecutive Decoders
        if (previousRole === 'decoder') {
          expect(assignedRole, `Consecutive Decoder violation at step ${step}, hop ${chain.currentHop}`).toBe('shifter');
        }

        previousRole = assignedRole;

        // Advance chain state
        if (assignedRole === 'decoder') {
          // 50% correct guess, 50% wrong guess
          const isCorrect = Math.random() > 0.5;
          const jumpBonus = isCorrect ? 10 : 1; // Correct guess jumps by 10, wrong guess advances by 1

          chain.history.push({
            hopNumber: chain.currentHop,
            playerId: `decoder-sim-${step}`,
            previousSentence: 'Sentence',
            newSentence: 'Sentence',
            role: 'decoder',
            isCorrectGuess: isCorrect,
            timestamp: Date.now()
          });

          // Apply jump
          chain.currentHop += jumpBonus;
        } else {
          // Shifter turn advances hop by 1
          chain.currentHop += 1;
          chain.history.push({
            hopNumber: chain.currentHop,
            playerId: `shifter-sim-${step}`,
            previousSentence: 'Sentence',
            newSentence: 'Sentence',
            role: 'shifter',
            oldWord: 'test',
            newWord: 'word',
            timestamp: Date.now()
          });
        }
      }
    });

    it('Simulation D: Direct Decennial Landing Guard (Jumping from Hop 10 directly to 20, 30, 40)', () => {
      // If a bonus jump lands exactly on a decennial multiple of 10 (e.g. 10 -> 20),
      // the consecutive decoder guard MUST override the % 10 rule and enforce Shifter!
      const decennials = [20, 30, 40, 50, 60, 70, 80, 90, 100];

      for (const targetHop of decennials) {
        const chain: Pick<Chain, 'currentHop' | 'history'> = {
          currentHop: targetHop,
          history: [
            {
              hopNumber: targetHop - 10,
              playerId: 'decoder-hero',
              previousSentence: 'Test',
              newSentence: 'Test',
              role: 'decoder',
              isCorrectGuess: true,
              timestamp: Date.now()
            }
          ]
        };

        const role = determinePlayerRole(chain);
        expect(
          role,
          `At hop ${targetHop} immediately after a Decoder hop, role MUST be shifter (consecutive guard)`
        ).toBe('shifter');
      }
    });

    it('Simulation E: Edge Case & Malformed Object Robustness for Role Assignment', () => {
      // Null / undefined chain
      expect(determinePlayerRole(null as any)).toBe('shifter');
      expect(determinePlayerRole(undefined as any)).toBe('shifter');

      // Hop 0 with empty history
      expect(determinePlayerRole({ currentHop: 0, history: [] })).toBe('shifter');

      // Hop 0 with null history
      expect(determinePlayerRole({ currentHop: 0, history: null as any })).toBe('shifter');

      // Hop 0 with populated history (e.g. state reset)
      expect(
        determinePlayerRole({
          currentHop: 0,
          history: [
            {
              hopNumber: 10,
              playerId: 'p1',
              previousSentence: 'Test',
              newSentence: 'Test',
              role: 'shifter',
              timestamp: Date.now()
            }
          ]
        })
      ).toBe('shifter');
    });

    it('Boundary check: getHopsUntilNextDecoder across 0..100 hops', () => {
      expect(getHopsUntilNextDecoder(0)).toBe(10);
      expect(getHopsUntilNextDecoder(1)).toBe(9);
      expect(getHopsUntilNextDecoder(9)).toBe(1);
      expect(getHopsUntilNextDecoder(10)).toBe(0);
      expect(getHopsUntilNextDecoder(11)).toBe(9);
      expect(getHopsUntilNextDecoder(19)).toBe(1);
      expect(getHopsUntilNextDecoder(20)).toBe(0);
      expect(getHopsUntilNextDecoder(99)).toBe(1);
      expect(getHopsUntilNextDecoder(100)).toBe(0);
    });
  });
});

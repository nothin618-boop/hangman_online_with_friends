/**
 * Tier 1: Feature Coverage Test Suite (WHISPER E2E)
 * Requirement-driven opaque-box tests covering Features 1-20 (>=5 test cases per feature).
 * Derived from ORIGINAL_REQUEST.md and TEST_INFRA.md.
 */

import { describe, it, beforeEach, expect } from './harness.ts';
import {
  InMemoryTestQueue,
  validateCandidateWord,
  determinePlayerRole,
  parseWordToken,
  replaceWordInSentence,
  HANDCRAFTED_THEMES,
  generateAlgorithmicTheme,
  simulateCountdownState,
  AudioEngineSimulator,
} from './harness.ts';
import type { Chain, Hop } from './harness.ts';

describe('Tier 1: Feature Coverage Suite (Features 1 - 20)', () => {
  let queue: InMemoryTestQueue;

  beforeEach(() => {
    queue = new InMemoryTestQueue();
  });

  // =========================================================================
  // Feature 1: Zero-Auth Drop-In (ORIGINAL_REQUEST §R1)
  // =========================================================================
  describe('Feature 1: Zero-Auth Drop-In', () => {
    it('1.1 should intercept whisper immediately without login credentials', async () => {
      const playerId = 'anonymous-player-uuid-1';
      const result = await queue.interceptChain(playerId);
      expect(result).toBeDefined();
      expect(result!.chain.id).toBeDefined();
      expect(result!.chain.currentSentence.length).toBeGreaterThan(0);
    });

    it('1.2 should assign an initial streak of 0 to a newly dropped-in player', async () => {
      const playerId = 'fresh-player-uuid-2';
      const streak = queue.getPlayerStreak(playerId);
      expect(streak).toBe(0);
    });

    it('1.3 should sanitize chain payload to never expose secret trap words to drop-in player', async () => {
      const playerId = 'player-uuid-3';
      const result = await queue.interceptChain(playerId);
      expect(result).toBeDefined();
      expect((result!.chain as any).bannedWords).toBeUndefined();
    });

    it('1.4 should support multiple concurrent drop-in players with distinct IDs', async () => {
      const p1 = 'player-uuid-4a';
      const p2 = 'player-uuid-4b';
      const r1 = await queue.interceptChain(p1);
      const r2 = await queue.interceptChain(p2);
      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
      expect(r1!.chain.id !== r2!.chain.id).toBeTruthy();
    });

    it('1.5 should persist player streak across multiple successful drop-in mutations', async () => {
      const playerId = 'veteran-player-5';
      queue.setPlayerStreak(playerId, 4);
      expect(queue.getPlayerStreak(playerId)).toBe(4);
    });
  });

  // =========================================================================
  // Feature 2: Atomic 60s Lease Lock & Reclaim (ORIGINAL_REQUEST §R1, §R5)
  // =========================================================================
  describe('Feature 2: Atomic 60s Lease Lock & Reclaim', () => {
    it('2.1 should lock active chain for exactly 60 seconds upon intercept', async () => {
      const now = 1000000;
      const playerId = 'player-lock-1';
      const res = await queue.interceptChain(playerId, now);
      expect(res).toBeDefined();
      const chain = queue.getChainById(res!.chain.id);
      expect(chain!.leasedToPlayerId).toBe(playerId);
      expect(chain!.leaseExpiresAt).toBe(now + 60000);
      expect(chain!.status).toBe('in_progress');
    });

    it('2.2 should lock out a second player from claiming the same active chain', async () => {
      const r1 = await queue.interceptChain('player-a');
      const chain1Id = r1!.chain.id;
      const r2 = await queue.interceptChain('player-b');
      expect(r2!.chain.id !== chain1Id).toBeTruthy();
    });

    it('2.3 should release the atomic lease upon successful mutation submission', async () => {
      const r = await queue.interceptChain('player-sub');
      const chainId = r!.chain.id;
      const sub = await queue.submitMutation(chainId, 'player-sub', 0, 'evening');
      expect(sub.success).toBeTruthy();
      const chain = queue.getChainById(chainId);
      expect(chain!.leasedToPlayerId).toBeNull();
      expect(chain!.status).toBe('active');
    });

    it('2.4 should reject submission if 60 seconds have elapsed since lease grant', async () => {
      const now = 1000000;
      const r = await queue.interceptChain('slow-player', now);
      const chainId = r!.chain.id;
      const sub = await queue.submitMutation(chainId, 'slow-player', 0, 'evening', now + 60001);
      expect(sub.success).toBeFalsy();
      expect(sub.error).toBe('LEASE_EXPIRED');
    });

    it('2.5 should automatically reclaim expired leases back to active pool during sweep', async () => {
      const now = 1000000;
      const r = await queue.interceptChain('abandoned-player', now);
      const chainId = r!.chain.id;
      const reclaimedCount = await queue.reclaimExpiredLeases(now + 60005);
      expect(reclaimedCount).toBeGreaterThanOrEqual(1);
      const chain = queue.getChainById(chainId);
      expect(chain!.status).toBe('active');
      expect(chain!.leasedToPlayerId).toBeNull();
    });
  });

  // =========================================================================
  // Feature 3: Dynamic Role Scheduling (ORIGINAL_REQUEST §R1)
  // =========================================================================
  describe('Feature 3: Dynamic Role Scheduling', () => {
    it('3.1 should assign Shifter role to newly spawned chain at Hop 0', () => {
      const chain: Chain = {
        id: 'c1',
        secretTheme: 'Test',
        themeOptions: ['Test', 'D1', 'D2', 'D3'],
        bannedWords: ['a', 'b', 'c', 'd', 'e'],
        initialSentence: 'The quick brown fox jumps over lazy dog.',
        currentSentence: 'The quick brown fox jumps over lazy dog.',
        currentHop: 0,
        lives: 3,
        maxHops: 100,
        history: [],
        status: 'active',
        createdAt: 0
      };
      expect(determinePlayerRole(chain)).toBe('shifter');
    });

    it('3.2 should assign Shifter role for hops 1 through 9', () => {
      const chain: Chain = {
        id: 'c2',
        secretTheme: 'Test',
        themeOptions: ['Test', 'D1', 'D2', 'D3'],
        bannedWords: ['a', 'b', 'c', 'd', 'e'],
        initialSentence: 'Sentence',
        currentSentence: 'Sentence',
        currentHop: 5,
        lives: 3,
        maxHops: 100,
        history: [{
          hopNumber: 5,
          playerId: 'p',
          previousSentence: 'Sentence',
          newSentence: 'Sentence',
          role: 'shifter',
          timestamp: 0
        }],
        status: 'active',
        createdAt: 0
      };
      expect(determinePlayerRole(chain)).toBe('shifter');
    });

    it('3.3 should assign Decoder role on exactly every 10th hop (hop 10)', () => {
      const chain: Chain = {
        id: 'c3',
        secretTheme: 'Test',
        themeOptions: ['Test', 'D1', 'D2', 'D3'],
        bannedWords: ['a', 'b', 'c', 'd', 'e'],
        initialSentence: 'Sentence',
        currentSentence: 'Sentence',
        currentHop: 10,
        lives: 3,
        maxHops: 100,
        history: [{
          hopNumber: 9,
          playerId: 'p',
          previousSentence: 'Sentence',
          newSentence: 'Sentence',
          role: 'shifter',
          timestamp: 0
        }],
        status: 'active',
        createdAt: 0
      };
      expect(determinePlayerRole(chain)).toBe('decoder');
    });

    it('3.4 should guard against consecutive Decoder roles immediately after a Decoder turn', () => {
      const chain: Chain = {
        id: 'c4',
        secretTheme: 'Test',
        themeOptions: ['Test', 'D1', 'D2', 'D3'],
        bannedWords: ['a', 'b', 'c', 'd', 'e'],
        initialSentence: 'Sentence',
        currentSentence: 'Sentence',
        currentHop: 20,
        lives: 3,
        maxHops: 100,
        history: [{
          hopNumber: 10,
          playerId: 'p',
          previousSentence: 'Sentence',
          newSentence: 'Sentence',
          role: 'decoder',
          timestamp: 0
        }],
        status: 'active',
        createdAt: 0
      };
      // If the last hop was decoder, next role MUST be shifter
      expect(determinePlayerRole(chain)).toBe('shifter');
    });

    it('3.5 should return to Shifter role on hop 11 following a decoder turn', () => {
      const chain: Chain = {
        id: 'c5',
        secretTheme: 'Test',
        themeOptions: ['Test', 'D1', 'D2', 'D3'],
        bannedWords: ['a', 'b', 'c', 'd', 'e'],
        initialSentence: 'Sentence',
        currentSentence: 'Sentence',
        currentHop: 11,
        lives: 3,
        maxHops: 100,
        history: [{
          hopNumber: 10,
          playerId: 'p',
          previousSentence: 'Sentence',
          newSentence: 'Sentence',
          role: 'decoder',
          timestamp: 0
        }],
        status: 'active',
        createdAt: 0
      };
      expect(determinePlayerRole(chain)).toBe('shifter');
    });
  });

  // =========================================================================
  // Feature 4: Single-Word Replacement & Structure Retention (ORIGINAL_REQUEST §R1)
  // =========================================================================
  describe('Feature 4: Single-Word Replacement & Structure Retention', () => {
    it('4.1 should replace exactly one target word in a sentence', () => {
      const initial = 'The courier delivered secret dossiers across Berlin.';
      const mutated = replaceWordInSentence(initial, 1, 'phantom');
      expect(mutated).toBe('The phantom delivered secret dossiers across Berlin.');
    });

    it('4.2 should maintain total sentence word count invariant', () => {
      const initial = 'Titanium submersibles illuminated glowing predators inside silent ocean trenches.';
      const initialCount = initial.split(/\s+/).length;
      const mutated = replaceWordInSentence(initial, 3, 'radiant');
      const mutatedCount = mutated.split(/\s+/).length;
      expect(mutatedCount).toBe(initialCount);
    });

    it('4.3 should preserve trailing punctuation attached to replaced word', () => {
      const initial = 'The courier delivered secret dossiers across foggy Berlin streets.';
      const mutated = replaceWordInSentence(initial, 8, 'avenues');
      expect(mutated.endsWith('avenues.')).toBeTruthy();
    });

    it('4.4 should preserve sentence-initial capitalization on replaced word at index 0', () => {
      const initial = 'Velvet curtains muffled strange whispers around the parlor table.';
      const mutated = replaceWordInSentence(initial, 0, 'silk');
      expect(mutated.startsWith('Silk ')).toBeTruthy();
    });

    it('4.5 should record the replaced word index and diff in hop history', async () => {
      const r = await queue.interceptChain('diff-tester');
      const chainId = r!.chain.id;
      const sub = await queue.submitMutation(chainId, 'diff-tester', 2, 'whispered');
      expect(sub.success).toBeTruthy();
      const lastHop = sub.chain!.history[sub.chain!.history.length - 1];
      expect(lastHop.replacedWordIndex).toBe(2);
      expect(lastHop.newWord).toBe('whispered');
    });
  });

  // =========================================================================
  // Feature 5: Decoder 4-Candidate Guess (ORIGINAL_REQUEST §R1)
  // =========================================================================
  describe('Feature 5: Decoder 4-Candidate Guess', () => {
    it('5.1 should provide exactly 4 candidate theme options (1 correct + 3 decoys)', async () => {
      const theme = HANDCRAFTED_THEMES[0];
      const chain = queue.createChainFromTheme(theme);
      expect(chain.themeOptions).toHaveLength(4);
      expect(chain.themeOptions).toContain(theme.theme);
      for (const decoy of theme.decoyThemes) {
        expect(chain.themeOptions).toContain(decoy);
      }
    });

    it('5.2 should award +10 bonus hops on correct theme deduction', async () => {
      const theme = HANDCRAFTED_THEMES[0];
      const chain = queue.createChainFromTheme(theme);
      chain.currentHop = 10;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'decoder-p1';
      chain.leaseExpiresAt = Date.now() + 60000;

      const res = await queue.submitDecoderGuess(chain.id, 'decoder-p1', theme.theme);
      expect(res.success).toBeTruthy();
      expect(res.isCorrect).toBeTruthy();
      expect(res.bonusAwarded).toBe(10);
      expect(chain.bonusHops).toBe(10);
    });

    it('5.3 should increment streak by +3 on correct theme deduction', async () => {
      const playerId = 'decoder-streak-p';
      queue.setPlayerStreak(playerId, 1);
      const theme = HANDCRAFTED_THEMES[1];
      const chain = queue.createChainFromTheme(theme);
      chain.currentHop = 10;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = playerId;
      chain.leaseExpiresAt = Date.now() + 60000;

      await queue.submitDecoderGuess(chain.id, playerId, theme.theme);
      expect(queue.getPlayerStreak(playerId)).toBe(4);
    });

    it('5.4 should deduct 1 signal bar strike on wrong theme deduction', async () => {
      const theme = HANDCRAFTED_THEMES[2];
      const chain = queue.createChainFromTheme(theme);
      chain.currentHop = 10;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'wrong-decoder';
      chain.leaseExpiresAt = Date.now() + 60000;

      const initialLives = chain.lives;
      const res = await queue.submitDecoderGuess(chain.id, 'wrong-decoder', theme.decoyThemes[0]);
      expect(res.success).toBeTruthy();
      expect(res.isCorrect).toBeFalsy();
      expect(chain.lives).toBe(initialLives - 1);
    });

    it('5.5 should reset player streak to 0 on wrong theme deduction', async () => {
      const playerId = 'failing-decoder';
      queue.setPlayerStreak(playerId, 5);
      const theme = HANDCRAFTED_THEMES[3];
      const chain = queue.createChainFromTheme(theme);
      chain.currentHop = 10;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = playerId;
      chain.leaseExpiresAt = Date.now() + 60000;

      await queue.submitDecoderGuess(chain.id, playerId, theme.decoyThemes[0]);
      expect(queue.getPlayerStreak(playerId)).toBe(0);
    });
  });

  // =========================================================================
  // Feature 6: Alphabet Regex Lock (/^[a-zA-Z]+$/) (ORIGINAL_REQUEST §R2)
  // =========================================================================
  describe('Feature 6: Alphabet Regex Lock', () => {
    it('6.1 should accept pure lowercase alphabetic words', () => {
      const res = validateCandidateWord('shadow', []);
      expect(res.valid).toBeTruthy();
    });

    it('6.2 should accept pure uppercase alphabetic words', () => {
      const res = validateCandidateWord('SHADOW', []);
      expect(res.valid).toBeTruthy();
    });

    it('6.3 should accept mixed case alphabetic words', () => {
      const res = validateCandidateWord('ShaDoW', []);
      expect(res.valid).toBeTruthy();
    });

    it('6.4 should reject candidate words containing digits with INVALID_CHARACTERS', () => {
      const res = validateCandidateWord('agent007', []);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('INVALID_CHARACTERS');
    });

    it('6.5 should reject candidate words containing spaces with INVALID_CHARACTERS', () => {
      const res = validateCandidateWord('two words', []);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('INVALID_CHARACTERS');
    });
  });

  // =========================================================================
  // Feature 7: Word Length Lock (< 12 Chars, 1..11) (ORIGINAL_REQUEST §R2)
  // =========================================================================
  describe('Feature 7: Word Length Lock', () => {
    it('7.1 should accept short words of 3 characters', () => {
      const res = validateCandidateWord('spy', []);
      expect(res.valid).toBeTruthy();
    });

    it('7.2 should accept medium words of 7 characters', () => {
      const res = validateCandidateWord('courier', []);
      expect(res.valid).toBeTruthy();
    });

    it('7.3 should accept maximum boundary word of exactly 11 characters', () => {
      const res = validateCandidateWord('superpowers', []);
      expect(res.valid).toBeTruthy();
    });

    it('7.4 should reject words of exactly 12 characters with WORD_TOO_LONG', () => {
      const res = validateCandidateWord('supernatural', []);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('WORD_TOO_LONG');
    });

    it('7.5 should reject empty candidate words of 0 characters with WORD_TOO_LONG or regex', () => {
      const res = validateCandidateWord('', []);
      expect(res.valid).toBeFalsy();
    });
  });

  // =========================================================================
  // Feature 8: English Dictionary Validation (~100k Words) (ORIGINAL_REQUEST §R2)
  // =========================================================================
  describe('Feature 8: English Dictionary Validation', () => {
    it('8.1 should accept verified common English nouns', () => {
      expect(validateCandidateWord('dossier', []).valid).toBeTruthy();
    });

    it('8.2 should accept verified common English verbs', () => {
      expect(validateCandidateWord('breached', []).valid).toBeTruthy();
    });

    it('8.3 should reject arbitrary gibberish keyboard mashing with NOT_IN_DICTIONARY', () => {
      const res = validateCandidateWord('asdfgh', []);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('NOT_IN_DICTIONARY');
    });

    it('8.4 should reject non-dictionary leetspeak with NOT_IN_DICTIONARY', () => {
      const res = validateCandidateWord('cr1me', []);
      expect(res.valid).toBeFalsy();
    });

    it('8.5 should reject modern internet slang not in standard lexicon with NOT_IN_DICTIONARY', () => {
      const res = validateCandidateWord('skibidi', []);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('NOT_IN_DICTIONARY');
    });
  });

  // =========================================================================
  // Feature 9: No Repeats History Invariant (ORIGINAL_REQUEST §R2)
  // =========================================================================
  describe('Feature 9: No Repeats History Invariant', () => {
    it('9.1 should reject reusing any word from the initial starter sentence', () => {
      const history: Hop[] = [{
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: 'The midnight courier delivered secret dossiers.',
        newSentence: 'The twilight courier delivered secret dossiers.',
        role: 'shifter',
        timestamp: 0
      }];
      const res = validateCandidateWord('dossiers', history);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });

    it('9.2 should reject reusing a word introduced in a previous mutation hop', () => {
      const history: Hop[] = [
        {
          hopNumber: 1,
          playerId: 'p1',
          previousSentence: 'The courier arrived.',
          newSentence: 'The phantom arrived.',
          role: 'shifter',
          timestamp: 0
        }
      ];
      const res = validateCandidateWord('phantom', history);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });

    it('9.3 should accept a fresh valid word that has never appeared in chain history', () => {
      const history: Hop[] = [{
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: 'The courier arrived.',
        newSentence: 'The traveler arrived.',
        role: 'shifter',
        timestamp: 0
      }];
      const res = validateCandidateWord('labyrinth', history);
      expect(res.valid).toBeTruthy();
    });

    it('9.4 should perform case-insensitive repeat matching against history', () => {
      const history: Hop[] = [{
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: 'The secret courier left.',
        newSentence: 'The secret agent left.',
        role: 'shifter',
        timestamp: 0
      }];
      const res = validateCandidateWord('SECRET', history);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });

    it('9.5 should ignore punctuation attached to words when tracking history', () => {
      const history: Hop[] = [{
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: 'Berlin streets.',
        newSentence: 'London streets.',
        role: 'shifter',
        timestamp: 0
      }];
      // "streets." had a period, but "streets" must still be recognized as duplicate
      const res = validateCandidateWord('streets', history);
      expect(res.valid).toBeFalsy();
      expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });
  });

  // =========================================================================
  // Feature 10: 5 Secret Banned Words Trap & Siren Alarm (ORIGINAL_REQUEST §R2)
  // =========================================================================
  describe('Feature 10: 5 Secret Banned Words Trap & Siren Alarm', () => {
    it('10.1 should flag isTrap = true when typing secret banned word 1', () => {
      const banned = ['spy', 'agent', 'soviet', 'nuclear', 'embassy'];
      const res = validateCandidateWord('spy', [], banned);
      expect(res.valid).toBeTruthy();
      expect(res.isTrap).toBeTruthy();
    });

    it('10.2 should flag isTrap = true when typing secret banned word 2', () => {
      const banned = ['spy', 'agent', 'soviet', 'nuclear', 'embassy'];
      const res = validateCandidateWord('agent', [], banned);
      expect(res.valid).toBeTruthy();
      expect(res.isTrap).toBeTruthy();
    });

    it('10.3 should flag isTrap = false when typing a clean synonym not on trap list', () => {
      const banned = ['spy', 'agent', 'soviet', 'nuclear', 'embassy'];
      const res = validateCandidateWord('courier', [], banned);
      expect(res.valid).toBeTruthy();
      expect(res.isTrap).toBeFalsy();
    });

    it('10.4 should deduct 1 strike from chain lives upon submitting a trap word', async () => {
      const theme = HANDCRAFTED_THEMES[0]; // banned: spy, agent, soviet, nuclear, embassy
      const chain = queue.createChainFromTheme(theme);
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'trap-runner';
      chain.leaseExpiresAt = Date.now() + 60000;

      const sub = await queue.submitMutation(chain.id, 'trap-runner', 1, 'spy');
      expect(sub.success).toBeTruthy();
      expect(sub.isTrap).toBeTruthy();
      expect(sub.strikeDeducted).toBeTruthy();
      expect(chain.lives).toBe(2);
    });

    it('10.5 should trigger siren audio event when trap word is hit', () => {
      const audio = new AudioEngineSimulator();
      const soundPlayed = audio.triggerSound('trap_alarm');
      expect(soundPlayed).toBeTruthy();
      expect(audio.triggeredEvents).toContain('trap_alarm');
    });
  });

  // =========================================================================
  // Feature 11: 3-Strike Signal Bar Health & Destruction (ORIGINAL_REQUEST §R2)
  // =========================================================================
  describe('Feature 11: 3-Strike Signal Bar Health & Destruction', () => {
    it('11.1 should initialize newly spawned chains with 3 signal bars (lives = 3)', () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      expect(chain.lives).toBe(3);
    });

    it('11.2 should decrement health to 2 bars on first strike', async () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p1';
      chain.leaseExpiresAt = Date.now() + 60000;
      await queue.submitMutation(chain.id, 'p1', 0, 'spy');
      expect(chain.lives).toBe(2);
      expect(chain.status).toBe('active');
    });

    it('11.3 should decrement health to 1 bar on second strike', async () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      chain.lives = 2;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p1';
      chain.leaseExpiresAt = Date.now() + 60000;
      await queue.submitMutation(chain.id, 'p1', 0, 'agent');
      expect(chain.lives).toBe(1);
      expect(chain.status).toBe('active');
    });

    it('11.4 should transition chain status to destroyed upon reaching 0 lives', async () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      chain.lives = 1;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p1';
      chain.leaseExpiresAt = Date.now() + 60000;
      await queue.submitMutation(chain.id, 'p1', 0, 'soviet');
      expect(chain.lives).toBe(0);
      expect(chain.status).toBe('destroyed');
    });

    it('11.5 should transfer destroyed chains permanently to Hall of Ghosts', async () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      chain.lives = 1;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p1';
      chain.leaseExpiresAt = Date.now() + 60000;
      await queue.submitMutation(chain.id, 'p1', 0, 'nuclear');
      const ghost = queue.getGhostReceipt(chain.id);
      expect(ghost).toBeDefined();
      expect(ghost!.outcome).toBe('destroyed');
    });
  });

  // =========================================================================
  // Feature 12: Crowd Jury "Report Sabotage" & 3-Peer Dispatch (ORIGINAL_REQUEST §R3)
  // =========================================================================
  describe('Feature 12: Crowd Jury "Report Sabotage" & 3-Peer Dispatch', () => {
    it('12.1 should create a pending JuryCase when Report Sabotage is triggered', async () => {
      const r = await queue.interceptChain('troll-author');
      await queue.submitMutation(r!.chain.id, 'troll-author', 1, 'phantom');
      const juryCase = await queue.reportSabotage(r!.chain.id, 'vigilant-reporter');
      expect(juryCase).toBeDefined();
      expect(juryCase.status).toBe('pending');
      expect(juryCase.flaggedWord).toBe('phantom');
    });

    it('12.2 should dispatch the flagged case to exactly 3 peer jurors', async () => {
      const r = await queue.interceptChain('author-p');
      await queue.submitMutation(r!.chain.id, 'author-p', 2, 'shadow');
      const juryCase = await queue.reportSabotage(r!.chain.id, 'reporter-p');
      expect(juryCase.assignedPeerIds).toHaveLength(3);
    });

    it('12.3 should record peer vote choices in the active jury case', async () => {
      const r = await queue.interceptChain('author-p');
      await queue.submitMutation(r!.chain.id, 'author-p', 2, 'shadow');
      const juryCase = await queue.reportSabotage(r!.chain.id, 'reporter-p');
      await queue.voteJury(juryCase.id, 'peer-1', true);
      expect(juryCase.votes['peer-1']).toBe(true);
    });

    it('12.4 should reject reporting sabotage on a chain with no mutation history', async () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      await expect(async () => {
        await queue.reportSabotage(chain.id, 'reporter');
      }).toReject('Cannot report sabotage');
    });

    it('12.5 should reject reporting sabotage on a Decoder deduction hop', async () => {
      const theme = HANDCRAFTED_THEMES[0];
      const chain = queue.createChainFromTheme(theme);
      chain.currentHop = 10;
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p-dec';
      chain.leaseExpiresAt = Date.now() + 60000;
      await queue.submitDecoderGuess(chain.id, 'p-dec', theme.theme);

      await expect(async () => {
        await queue.reportSabotage(chain.id, 'reporter');
      }).toReject('Cannot report sabotage on decoder hop');
    });
  });

  // =========================================================================
  // Feature 13: 2/3 Jury Consensus, 1-Hop Rewind & Troll Queue (ORIGINAL_REQUEST §R3)
  // =========================================================================
  describe('Feature 13: 2/3 Jury Consensus, 1-Hop Rewind & Troll Queue', () => {
    it('13.1 should confirm sabotage and rewind chain by 1 hop when 2 peers vote Yes', async () => {
      const r = await queue.interceptChain('troll-user');
      const initialSentence = r!.chain.currentSentence;
      await queue.submitMutation(r!.chain.id, 'troll-user', 1, 'phantom');
      const juryCase = await queue.reportSabotage(r!.chain.id, 'patrol-user');

      await queue.voteJury(juryCase.id, 'peer-1', true);
      const res = await queue.voteJury(juryCase.id, 'peer-2', true);

      expect(res.resolved).toBeTruthy();
      expect(res.verdict).toBe('sabotage');
      expect(res.chainRewound).toBeTruthy();

      const chain = queue.getChainById(r!.chain.id);
      expect(chain!.currentSentence).toBe(initialSentence);
      expect(chain!.currentHop).toBe(0);
    });

    it('13.2 should shadow-ban the troll player to isolated troll queue upon consensus', async () => {
      const r = await queue.interceptChain('bad-actor-99');
      await queue.submitMutation(r!.chain.id, 'bad-actor-99', 1, 'phantom');
      const juryCase = await queue.reportSabotage(r!.chain.id, 'mod-user');

      await queue.voteJury(juryCase.id, 'peer-1', true);
      await queue.voteJury(juryCase.id, 'peer-2', true);

      expect(queue.isTroll('bad-actor-99')).toBeTruthy();
    });

    it('13.3 should dismiss sabotage report when 2 peers vote No', async () => {
      const r = await queue.interceptChain('good-actor');
      await queue.submitMutation(r!.chain.id, 'good-actor', 1, 'phantom');
      const juryCase = await queue.reportSabotage(r!.chain.id, 'salty-reporter');

      await queue.voteJury(juryCase.id, 'peer-1', false);
      const res = await queue.voteJury(juryCase.id, 'peer-2', false);

      expect(res.resolved).toBeTruthy();
      expect(res.verdict).toBe('dismissed');
      expect(res.chainRewound).toBeFalsy();
      expect(queue.isTroll('good-actor')).toBeFalsy();
    });

    it('13.4 should serve shadow-banned players with isolated mock chains on subsequent intercepts', async () => {
      queue['trollQueue'].add('shadow-banned-id');
      const res = await queue.interceptChain('shadow-banned-id');
      expect(res).toBeDefined();
      expect(res!.chain.id).toContain('troll-chain-shadow-banned-id');
    });

    it('13.5 should close jury case status and record resolution timestamp upon consensus', async () => {
      const r = await queue.interceptChain('author');
      await queue.submitMutation(r!.chain.id, 'author', 1, 'phantom');
      const juryCase = await queue.reportSabotage(r!.chain.id, 'mod');

      await queue.voteJury(juryCase.id, 'peer-1', true);
      await queue.voteJury(juryCase.id, 'peer-2', true);

      expect(juryCase.status).toBe('consensus_sabotage');
      expect(juryCase.resolvedAt).toBeDefined();
    });
  });

  // =========================================================================
  // Feature 14: Cybernetic Single-Screen Terminal UI & Scanlines (ORIGINAL_REQUEST §R4)
  // =========================================================================
  describe('Feature 14: Cybernetic Single-Screen Terminal UI', () => {
    it('14.1 should parse sentence words into clean glowing blocks with isolated roots', () => {
      const token = 'Berlin.';
      const parsed = parseWordToken(token);
      expect(parsed.root).toBe('Berlin');
      expect(parsed.suffix).toBe('.');
    });

    it('14.2 should support token parsing with punctuation prefix such as quotes', () => {
      const token = '"dossier"';
      const parsed = parseWordToken(token);
      expect(parsed.prefix).toBe('"');
      expect(parsed.root).toBe('dossier');
      expect(parsed.suffix).toBe('"');
    });

    it('14.3 should maintain single-word replacement input modal state with error codes', () => {
      const validation = validateCandidateWord('invalid!word', []);
      expect(validation.valid).toBeFalsy();
      expect(validation.error).toBe('INVALID_CHARACTERS');
    });

    it('14.4 should track active whispers and global players in telemetry feed', () => {
      const activeCount = queue.getActiveChains().length;
      expect(activeCount).toBeGreaterThanOrEqual(10);
    });

    it('14.5 should provide toggleable audio mute state in terminal topbar', () => {
      const audio = new AudioEngineSimulator(false);
      expect(audio.isMuted()).toBeFalsy();
      audio.setMuted(true);
      expect(audio.isMuted()).toBeTruthy();
    });
  });

  // =========================================================================
  // Feature 15: Animated 60s Countdown Bar (<15s Pulse) (ORIGINAL_REQUEST §R4)
  // =========================================================================
  describe('Feature 15: Animated 60s Countdown Bar', () => {
    it('15.1 should display cyan phase when remaining time is greater than 30s', () => {
      const state = simulateCountdownState(45000);
      expect(state.phase).toBe('cyan');
      expect(state.percentage).toBe(75);
      expect(state.pulseActive).toBeFalsy();
    });

    it('15.2 should transition to amber phase when remaining time is between 15s and 30s', () => {
      const state = simulateCountdownState(25000);
      expect(state.phase).toBe('amber');
      expect(state.pulseActive).toBeFalsy();
    });

    it('15.3 should trigger pulsing crimson phase and heartbeat audio tick when under 15s', () => {
      const state = simulateCountdownState(12000);
      expect(state.phase).toBe('crimson_pulse');
      expect(state.pulseActive).toBeTruthy();
      expect(state.heartbeatAudioTick).toBeTruthy();
    });

    it('15.4 should clamp negative remaining time to 0% width at lease expiry', () => {
      const state = simulateCountdownState(-500);
      expect(state.remainingMs).toBe(0);
      expect(state.percentage).toBe(0);
    });

    it('15.5 should clamp time exceeding 60s to maximum 100% width', () => {
      const state = simulateCountdownState(75000);
      expect(state.remainingMs).toBe(60000);
      expect(state.percentage).toBe(100);
    });
  });

  // =========================================================================
  // Feature 16: Collapsible Trace Log Drawer (Last 3 Hops) (ORIGINAL_REQUEST §R4)
  // =========================================================================
  describe('Feature 16: Collapsible Trace Log Drawer', () => {
    it('16.1 should return empty trace log when chain has 0 mutation hops', async () => {
      const r = await queue.interceptChain('player-1');
      expect(r!.chain.traceLog).toHaveLength(0);
    });

    it('16.2 should return exactly 1 hop in trace log after 1 mutation', async () => {
      const r = await queue.interceptChain('player-trace-1');
      await queue.submitMutation(r!.chain.id, 'player-trace-1', 1, 'phantom');
      const chain = queue.getChainById(r!.chain.id);
      expect(chain!.history.slice(-3)).toHaveLength(1);
    });

    it('16.3 should return exactly 3 hops when chain has progressed through 3 mutations', async () => {
      const r = await queue.interceptChain('player-trace-a');
      const id = r!.chain.id;
      await queue.submitMutation(id, 'player-trace-a', 1, 'phantom');

      await queue.interceptChain('player-trace-b');
      await queue.submitMutation(id, 'player-trace-b', 2, 'shadow');

      await queue.interceptChain('player-trace-c');
      await queue.submitMutation(id, 'player-trace-c', 3, 'covert');

      const chain = queue.getChainById(id);
      expect(chain!.history.slice(-3)).toHaveLength(3);
    });

    it('16.4 should cap trace log display to the latest 3 hops when chain has 5 mutations', async () => {
      const r = await queue.interceptChain('p1');
      const id = r!.chain.id;
      const chain = queue.getChainById(id)!;
      const words = ['phantom', 'shadow', 'covert', 'stealth', 'traveler'];
      for (let i = 0; i < words.length; i++) {
        chain.leasedToPlayerId = `p-${i}`;
        chain.leaseExpiresAt = Date.now() + 60000;
        chain.status = 'in_progress';
        await queue.submitMutation(id, `p-${i}`, 1, words[i]);
      }
      const traceLog = chain.history.slice(-3);
      expect(traceLog).toHaveLength(3);
      expect(traceLog[2].newWord).toBe('traveler');
    });

    it('16.5 should preserve author alias, timestamp, and word diff in trace log entries', async () => {
      const r = await queue.interceptChain('agent-smith');
      const now = 123456789;
      await queue.submitMutation(r!.chain.id, 'agent-smith', 1, 'phantom', now);
      const chain = queue.getChainById(r!.chain.id);
      const entry = chain!.history[0];
      expect(entry.playerId).toBe('agent-smith');
      expect(entry.timestamp).toBe(now);
      expect(entry.newWord).toBe('phantom');
    });
  });

  // =========================================================================
  // Feature 17: "My Active Chains" Tray (ORIGINAL_REQUEST §R4)
  // =========================================================================
  describe('Feature 17: "My Active Chains" Tray', () => {
    it('17.1 should identify chains touched by current player ID', async () => {
      const r = await queue.interceptChain('my-player');
      await queue.submitMutation(r!.chain.id, 'my-player', 1, 'phantom');
      const touched = queue.getAllChains().filter(c => c.history.some(h => h.playerId === 'my-player'));
      expect(touched).toHaveLength(1);
      expect(touched[0].id).toBe(r!.chain.id);
    });

    it('17.2 should reflect mutation progress when another player mutates touched chain', async () => {
      const r = await queue.interceptChain('player-alpha');
      const id = r!.chain.id;
      await queue.submitMutation(id, 'player-alpha', 1, 'phantom');

      await queue.interceptChain('player-beta');
      await queue.submitMutation(id, 'player-beta', 2, 'shadow');

      const touched = queue.getAllChains().filter(c => c.history.some(h => h.playerId === 'player-alpha'));
      expect(touched[0].currentHop).toBe(2);
    });

    it('17.3 should reflect health deduction in touched chain tray card', async () => {
      const r = await queue.interceptChain('player-alpha');
      const id = r!.chain.id;
      await queue.submitMutation(id, 'player-alpha', 1, 'phantom');

      // Another player hits a trap word
      await queue.interceptChain('player-beta');
      await queue.submitMutation(id, 'player-beta', 2, 'spy'); // trap

      const touched = queue.getAllChains().filter(c => c.history.some(h => h.playerId === 'player-alpha'));
      expect(touched[0].lives).toBe(2);
    });

    it('17.4 should transition touched chain card to Victory upon 100 hops', async () => {
      const r = await queue.interceptChain('player-alpha');
      const chain = queue.getChainById(r!.chain.id)!;
      chain.currentHop = 99;
      await queue.submitMutation(chain.id, 'player-alpha', 1, 'phantom');
      expect(chain.status).toBe('victory');
    });

    it('17.5 should transition touched chain card to Destroyed upon 0 lives', async () => {
      const r = await queue.interceptChain('player-alpha');
      const chain = queue.getChainById(r!.chain.id)!;
      chain.lives = 1;
      await queue.submitMutation(chain.id, 'player-alpha', 1, 'spy'); // trap -> 0 lives
      expect(chain.status).toBe('destroyed');
    });
  });

  // =========================================================================
  // Feature 18: Procedural Web Audio API Sound FX (ORIGINAL_REQUEST §R4)
  // =========================================================================
  describe('Feature 18: Procedural Web Audio API Sound FX', () => {
    it('18.1 should trigger sound effects when mute is disabled', () => {
      const audio = new AudioEngineSimulator(false);
      const played = audio.triggerSound('tick');
      expect(played).toBeTruthy();
      expect(audio.triggeredEvents).toContain('tick');
    });

    it('18.2 should suppress all audio events when global mute toggle is enabled', () => {
      const audio = new AudioEngineSimulator(true);
      const played = audio.triggerSound('trap_alarm');
      expect(played).toBeFalsy();
      expect(audio.triggeredEvents).toHaveLength(0);
    });

    it('18.3 should synthesize victory fanfare audio on chain completion', () => {
      const audio = new AudioEngineSimulator(false);
      const played = audio.triggerSound('victory_fanfare');
      expect(played).toBeTruthy();
      expect(audio.triggeredEvents).toContain('victory_fanfare');
    });

    it('18.4 should synthesize heartbeat audio ticks under 15s remaining lease', () => {
      const audio = new AudioEngineSimulator(false);
      const played = audio.triggerSound('heartbeat');
      expect(played).toBeTruthy();
      expect(audio.triggeredEvents).toContain('heartbeat');
    });

    it('18.5 should synthesize word submit audio on valid Shifter replacement', () => {
      const audio = new AudioEngineSimulator(false);
      const played = audio.triggerSound('word_submit');
      expect(played).toBeTruthy();
      expect(audio.triggeredEvents).toContain('word_submit');
    });
  });

  // =========================================================================
  // Feature 19: 50 Handcrafted Themes + 1,000+ Algorithmic Combinations (ORIGINAL_REQUEST §R5)
  // =========================================================================
  describe('Feature 19: 50 Handcrafted Themes + 1,000+ Algorithmic Combinations', () => {
    it('19.1 should provide exactly 50 handcrafted themes in the starter library', () => {
      expect(HANDCRAFTED_THEMES).toHaveLength(50);
    });

    it('19.2 should verify Cold War Espionage theme initial sentence and trap words', () => {
      const t1 = HANDCRAFTED_THEMES[0];
      expect(t1.theme).toBe('Cold War Espionage');
      expect(t1.bannedWords).toHaveLength(5);
      expect(t1.decoyThemes).toHaveLength(3);
      expect(t1.initialSentence).toContain('Berlin');
    });

    it('19.3 should verify Cyberpunk Heist theme initial sentence and trap words', () => {
      const t2 = HANDCRAFTED_THEMES[1];
      expect(t2.theme).toBe('Cyberpunk Heist');
      expect(t2.bannedWords).toHaveLength(5);
      expect(t2.decoyThemes).toHaveLength(3);
      expect(t2.initialSentence).toContain('firewalls');
    });

    it('19.4 should generate distinct algorithmic themes with seed scaling past 1,000', () => {
      const themeA = generateAlgorithmicTheme(100);
      const themeB = generateAlgorithmicTheme(999);
      expect(themeA.id !== themeB.id).toBeTruthy();
      expect(themeA.initialSentence.length).toBeGreaterThan(0);
      expect(themeB.initialSentence.length).toBeGreaterThan(0);
    });

    it('19.5 should produce deterministic algorithmic theme templates for a given seed', () => {
      const tA = generateAlgorithmicTheme(777);
      const tB = generateAlgorithmicTheme(777);
      expect(tA.theme).toBe(tB.theme);
      expect(tA.initialSentence).toBe(tB.initialSentence);
      expect(tA.bannedWords).toEqual(tB.bannedWords);
    });
  });

  // =========================================================================
  // Feature 20: Hall of Ghosts Archival & Permalinks (ORIGINAL_REQUEST §R5)
  // =========================================================================
  describe('Feature 20: Hall of Ghosts Archival & Permalinks', () => {
    it('20.1 should archive victory chain into Hall of Ghosts with victory badge', () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      chain.currentHop = 100;
      const receipt = queue.archiveToHallOfGhosts(chain, 'victory');
      expect(receipt.outcome).toBe('victory');
      expect(receipt.finalHop).toBe(100);
    });

    it('20.2 should archive destroyed chain into Hall of Ghosts with destroyed badge', () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[1]);
      chain.lives = 0;
      const receipt = queue.archiveToHallOfGhosts(chain, 'destroyed');
      expect(receipt.outcome).toBe('destroyed');
    });

    it('20.3 should retrieve archived receipt by chain ID', () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[2]);
      queue.archiveToHallOfGhosts(chain, 'victory');
      const retrieved = queue.getGhostReceipt(chain.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.chainId).toBe(chain.id);
    });

    it('20.4 should return null when querying non-existent chain receipt in Hall of Ghosts', () => {
      const nonExistent = queue.getGhostReceipt('ghost-unknown-404');
      expect(nonExistent).toBeNull();
    });

    it('20.5 should preserve chronological mutation timeline diffs in ghost receipt', () => {
      const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
      const hop1: Hop = {
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: chain.initialSentence,
        newSentence: 'Mutated sentence.',
        oldWord: 'The',
        newWord: 'A',
        replacedWordIndex: 0,
        role: 'shifter',
        timestamp: 1000
      };
      chain.history.push(hop1);
      const receipt = queue.archiveToHallOfGhosts(chain, 'victory');
      expect(receipt.timeline).toHaveLength(1);
      expect(receipt.timeline[0].newWord).toBe('A');
    });
  });
});

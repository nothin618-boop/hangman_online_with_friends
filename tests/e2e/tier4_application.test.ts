/**
 * Tier 4: Real-World Multi-Player Application Scenarios Test Suite (WHISPER E2E)
 * End-to-end integration workflows simulating realistic multi-user game sessions.
 * Derived from ORIGINAL_REQUEST.md, PROJECT.md, and TEST_INFRA.md.
 */

import { describe, it, beforeEach, expect } from './harness.ts';
import {
  InMemoryTestQueue,
  validateCandidateWord,
  determinePlayerRole,
  HANDCRAFTED_THEMES,
  generateAlgorithmicTheme,
  AudioEngineSimulator
} from './harness.ts';
import type { Chain, Hop } from './harness.ts';

describe('Tier 4: Real-World Multi-Player Application Scenarios Suite', () => {
  let queue: InMemoryTestQueue;

  beforeEach(() => {
    queue = new InMemoryTestQueue();
  });

  // =========================================================================
  // Scenario 1: Full Chain Lifecycle from Spawn to 100 Hops Victory
  // =========================================================================
  it('Scenario 1: Full Chain Lifecycle from Spawn to 100 Hops Victory (F1, F2, F3, F4, F5, F8, F9, F11, F19, F20)', async () => {
    // 1. Spawns fresh chain from handcrafted seed
    const theme = HANDCRAFTED_THEMES[0]; // Cold War Espionage
    const chain = queue.createChainFromTheme(theme);
    expect(chain.currentHop).toBe(0);
    expect(chain.lives).toBe(3);
    expect(chain.status).toBe('active');

    // 2. Anonymous players drop in for hops 1 to 10 (Shifters)
    const validDisguiseWords = [
      'twilight', 'phantom', 'traveler', 'parlor', 'envelopes',
      'chemical', 'cauldron', 'papal', 'soldiers', 'sentinel'
    ];

    for (let i = 0; i < 10; i++) {
      const pId = `agent-${i + 1}`;
      const intercept = await queue.interceptChain(pId);
      expect(intercept).toBeDefined();

      // Ensure chain is locked
      chain.leasedToPlayerId = pId;
      chain.leaseExpiresAt = Date.now() + 60000;
      chain.status = 'in_progress';

      const word = validDisguiseWords[i];
      const sub = await queue.submitMutation(chain.id, pId, 1, word);
      expect(sub.success).toBeTruthy();
      expect(sub.isTrap).toBeFalsy();
    }

    expect(chain.currentHop).toBe(10);

    // 3. Hop 10: Decoder turn reached!
    chain.leasedToPlayerId = 'decoder-master';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    const decoderRole = determinePlayerRole(chain);
    expect(decoderRole).toBe('decoder');

    // Decoder submits correct secret theme -> receives +10 bonus hops
    const decResult = await queue.submitDecoderGuess(chain.id, 'decoder-master', theme.theme);
    expect(decResult.success).toBeTruthy();
    expect(decResult.isCorrect).toBeTruthy();
    expect(chain.bonusHops).toBe(10);
    expect(chain.currentHop).toBe(11); // advances hop

    // 4. Fast forward chain towards victory threshold (Hop 90)
    chain.currentHop = 89;
    chain.bonusHops = 10; // Total effective hops = 99
    chain.leasedToPlayerId = 'finisher-hero';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';

    // 5. Final Hop: Reaches 100 hops -> Victory transition!
    const finalSub = await queue.submitMutation(chain.id, 'finisher-hero', 2, 'sanctuary');
    expect(finalSub.success).toBeTruthy();
    expect(chain.status).toBe('victory');
    expect(chain.completedAt).toBeDefined();

    // 6. Archival verification in Hall of Ghosts
    const ghost = queue.getGhostReceipt(chain.id);
    expect(ghost).toBeDefined();
    expect(ghost!.outcome).toBe('victory');
    expect(ghost!.finalHop).toBeGreaterThanOrEqual(100);
    expect(ghost!.totalContributors).toBeGreaterThan(5);
  });

  // =========================================================================
  // Scenario 2: Hostile Sabotage Attack Defeated by Instant Crowd Jury
  // =========================================================================
  it('Scenario 2: Hostile Sabotage Attack Defeated by Instant Crowd Jury (F1, F3, F4, F12, F13, F17)', async () => {
    // 1. Honest players build legitimate chain
    const r1 = await queue.interceptChain('honest-alice');
    const chainId = r1!.chain.id;
    const initialSentence = r1!.chain.currentSentence;

    await queue.submitMutation(chainId, 'honest-alice', 1, 'twilight');
    const chain = queue.getChainById(chainId)!;
    expect(chain.currentHop).toBe(1);

    // 2. Hostile troll intercepts and replaces word with troll token
    chain.leasedToPlayerId = 'bad-troll';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';

    const trollSubmit = await queue.submitMutation(chainId, 'bad-troll', 2, 'shadow');
    expect(trollSubmit.success).toBeTruthy();
    expect(chain.currentHop).toBe(2);
    expect(chain.currentSentence).toContain('shadow');

    // 3. Observer triggers "Report Sabotage"
    const juryCase = await queue.reportSabotage(chainId, 'mod-sentinel');
    expect(juryCase).toBeDefined();
    expect(juryCase.status).toBe('pending');
    expect(juryCase.flaggedWord).toBe('shadow');
    expect(juryCase.assignedPeerIds).toHaveLength(3);

    // 4. Peer jurors vote: Peer 1 votes Yes, Peer 2 votes Yes (2/3 consensus!)
    const vote1 = await queue.voteJury(juryCase.id, 'peer-1', true);
    expect(vote1.resolved).toBeFalsy(); // 1 vote not enough

    const vote2 = await queue.voteJury(juryCase.id, 'peer-2', true);
    expect(vote2.resolved).toBeTruthy();
    expect(vote2.verdict).toBe('sabotage');
    expect(vote2.chainRewound).toBeTruthy();
    expect(vote2.trollShadowBanned).toBeTruthy();

    // 5. Verification: Chain rewound by 1 hop
    expect(chain.currentHop).toBe(1);
    expect(chain.currentSentence).not.toContain('shadow');

    // 6. Verification: Troll is quarantined in troll queue
    expect(queue.isTroll('bad-troll')).toBeTruthy();

    // 7. Troll attempts to intercept again -> routed to mock sandbox
    const trollIntercept = await queue.interceptChain('bad-troll');
    expect(trollIntercept!.chain.id).toContain('troll-chain-bad-troll');
  });

  // =========================================================================
  // Scenario 3: Filter Defense Stress Test: Banned Trap Word & Chain Destruction
  // =========================================================================
  it('Scenario 3: Filter Defense Stress Test: Banned Trap Word & Chain Destruction (F1, F4, F6, F7, F8, F9, F10, F11, F20)', async () => {
    const theme = HANDCRAFTED_THEMES[0]; // Banned: spy, agent, soviet, nuclear, embassy
    const chain = queue.createChainFromTheme(theme);
    expect(chain.lives).toBe(3);

    // 1. Shifter attempts invalid character input -> pre-submission rejection
    const invalidChar = validateCandidateWord('word123', chain.history, chain.bannedWords);
    expect(invalidChar.valid).toBeFalsy();
    expect(invalidChar.error).toBe('INVALID_CHARACTERS');

    // 2. Shifter attempts word >= 12 chars -> pre-submission rejection
    const tooLong = validateCandidateWord('supernatural', chain.history, chain.bannedWords);
    expect(tooLong.valid).toBeFalsy();
    expect(tooLong.error).toBe('WORD_TOO_LONG');

    // 3. Shifter attempts gibberish not in dictionary -> pre-submission rejection
    const nonDict = validateCandidateWord('asdfgh', chain.history, chain.bannedWords);
    expect(nonDict.valid).toBeFalsy();
    expect(nonDict.error).toBe('NOT_IN_DICTIONARY');

    // 4. Shifter submits Strike 1: Trap word 'spy'
    chain.leasedToPlayerId = 'striker-1';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    const s1 = await queue.submitMutation(chain.id, 'striker-1', 1, 'spy');
    expect(s1.strikeDeducted).toBeTruthy();
    expect(chain.lives).toBe(2);

    // 5. Shifter submits Strike 2: Trap word 'agent'
    chain.leasedToPlayerId = 'striker-2';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    const s2 = await queue.submitMutation(chain.id, 'striker-2', 1, 'agent');
    expect(s2.strikeDeducted).toBeTruthy();
    expect(chain.lives).toBe(1);

    // 6. Shifter submits Strike 3: Trap word 'soviet' -> Fatal Strike!
    chain.leasedToPlayerId = 'striker-3';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    const s3 = await queue.submitMutation(chain.id, 'striker-3', 1, 'soviet');
    expect(s3.strikeDeducted).toBeTruthy();
    expect(chain.lives).toBe(0);
    expect(chain.status).toBe('destroyed');

    // 7. Verify chain transferred permanently to Hall of Ghosts
    const ghost = queue.getGhostReceipt(chain.id);
    expect(ghost).toBeDefined();
    expect(ghost!.outcome).toBe('destroyed');
    expect(ghost!.finalHop).toBe(3);
  });

  // =========================================================================
  // Scenario 4: Multi-Player Concurrent Intercept Race & Lease Expiration Reclaim
  // =========================================================================
  it('Scenario 4: Multi-Player Concurrent Intercept Race & Lease Expiration Reclaim (F1, F2, F3, F15, F17)', async () => {
    const t0 = 2000000;
    const testQueue = new InMemoryTestQueue(HANDCRAFTED_THEMES.slice(0, 3));
    // 1. 3 players concurrently drop in to intercept all 3 available whispers
    const [p1, p2, p3] = await Promise.all([
      testQueue.interceptChain('player-alpha', t0),
      testQueue.interceptChain('player-beta', t0),
      testQueue.interceptChain('player-gamma', t0)
    ]);

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p3).toBeDefined();

    // Verify distinct chain leases
    const assignedIds = new Set([p1!.chain.id, p2!.chain.id, p3!.chain.id]);
    expect(assignedIds.size).toBe(3);

    // 2. Player Alpha submits quickly within lease (at 20 seconds)
    const subAlpha = await testQueue.submitMutation(p1!.chain.id, 'player-alpha', 1, 'twilight', t0 + 20000);
    expect(subAlpha.success).toBeTruthy();

    // Keep Alpha's chain in progress so only Beta's chain is the reclaimed active candidate
    const alphaChain = testQueue.getChainById(p1!.chain.id)!;
    alphaChain.status = 'in_progress';
    alphaChain.leaseExpiresAt = t0 + 100000;

    // 3. Player Beta crashes or closes tab -> 65 seconds elapse without submission
    const tReclaim = t0 + 65000;
    const reclaimedCount = await testQueue.reclaimExpiredLeases(tReclaim);
    expect(reclaimedCount).toBeGreaterThanOrEqual(1);

    const betaChain = testQueue.getChainById(p2!.chain.id)!;
    expect(betaChain.status).toBe('active');
    expect(betaChain.leasedToPlayerId).toBeNull();

    // 4. New Player Delta drops in and intercepts the reclaimed chain
    const pDelta = await testQueue.interceptChain('player-delta', tReclaim + 1000);
    expect(pDelta!.chain.id).toBe(betaChain.id);

    // 5. Delta submits mutation successfully
    const subDelta = await testQueue.submitMutation(betaChain.id, 'player-delta', 1, 'phantom', tReclaim + 5000);
    expect(subDelta.success).toBeTruthy();
    expect(betaChain.currentHop).toBe(1);
  });

  // =========================================================================
  // Scenario 5: Milestone Decennial Decoder Deduction with +10 Bonus Leap
  // =========================================================================
  it('Scenario 5: Milestone Decennial Decoder Deduction with +10 Bonus Leap (F1, F3, F5, F11, F15, F16, F19)', async () => {
    const theme = HANDCRAFTED_THEMES[1]; // Cyberpunk Heist
    const chain = queue.createChainFromTheme(theme);
    chain.currentHop = 9;

    // Player completes Hop 9 -> advances to Hop 10
    chain.leasedToPlayerId = 'hop9-shifter';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    await queue.submitMutation(chain.id, 'hop9-shifter', 1, 'phantom');
    expect(chain.currentHop).toBe(10);

    // Intercept assigns Decoder role
    const role = determinePlayerRole(chain);
    expect(role).toBe('decoder');

    // Verify 4 theme options presented to player
    expect(chain.themeOptions).toHaveLength(4);
    expect(chain.themeOptions).toContain(theme.theme);

    // Player selects correct theme
    chain.leasedToPlayerId = 'cryptanalyst-jane';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    const guessResult = await queue.submitDecoderGuess(chain.id, 'cryptanalyst-jane', theme.theme);

    expect(guessResult.success).toBeTruthy();
    expect(guessResult.isCorrect).toBeTruthy();
    expect(guessResult.bonusAwarded).toBe(10);
    expect(chain.bonusHops).toBe(10);
    expect(chain.currentHop).toBe(11);

    // Verify player streak boosted by +3
    expect(queue.getPlayerStreak('cryptanalyst-jane')).toBe(3);

    // Verify next role is safely returned to Shifter
    expect(determinePlayerRole(chain)).toBe('shifter');
  });

  // =========================================================================
  // Scenario 6: Hall of Ghosts Permanent Receipt & Timeline Diff Verification
  // =========================================================================
  it('Scenario 6: Hall of Ghosts Permanent Receipt & Timeline Diff Verification (F1, F4, F5, F11, F16, F20)', async () => {
    const theme = HANDCRAFTED_THEMES[2]; // Victorian Séance
    const chain = queue.createChainFromTheme(theme);

    // Simulate 5 mutation hops by distinct anonymous players
    const contributors = ['ghost-hunter-1', 'medium-2', 'scholar-3', 'archivist-4', 'decoder-5'];
    const mutations = ['parlor', 'envelopes', 'chemical', 'cauldron', 'papal'];

    for (let i = 0; i < 4; i++) {
      const pId = contributors[i];
      chain.leasedToPlayerId = pId;
      chain.leaseExpiresAt = Date.now() + 60000;
      chain.status = 'in_progress';
      await queue.submitMutation(chain.id, pId, i + 1, mutations[i]);
    }

    // Decoder Hop at Hop 10
    chain.currentHop = 10;
    chain.leasedToPlayerId = contributors[4];
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    await queue.submitDecoderGuess(chain.id, contributors[4], theme.theme);

    // Simulate reaching 100 hops Victory
    chain.currentHop = 100;
    chain.status = 'victory';
    const archivedReceipt = queue.archiveToHallOfGhosts(chain, 'victory');

    // Verify receipt metadata
    expect(archivedReceipt.chainId).toBe(chain.id);
    expect(archivedReceipt.themeTitle).toBe(theme.theme);
    expect(archivedReceipt.outcome).toBe('victory');
    expect(archivedReceipt.totalContributors).toBe(5);
    expect(archivedReceipt.initialSentence).toBe(theme.initialSentence);
    expect(archivedReceipt.timeline.length).toBeGreaterThan(0);

    // Verify retrieval via permalink endpoint helper
    const retrieved = queue.getGhostReceipt(chain.id);
    expect(retrieved).toEqual(archivedReceipt);
  });
});

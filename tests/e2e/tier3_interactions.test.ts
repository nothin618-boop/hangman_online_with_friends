/**
 * Tier 3: Cross-Feature Interactions Test Suite (WHISPER E2E)
 * Pairwise combinatorial integration tests verifying cross-subsystem interactions.
 * Derived from ORIGINAL_REQUEST.md, PROJECT.md, and TEST_INFRA.md.
 */

import { describe, it, beforeEach, expect } from './harness.ts';
import {
  InMemoryTestQueue,
  validateCandidateWord,
  determinePlayerRole,
  HANDCRAFTED_THEMES,
  generateAlgorithmicTheme,
  AudioEngineSimulator,
  simulateCountdownState
} from './harness.ts';
import type { Chain, Hop } from './harness.ts';

describe('Tier 3: Cross-Feature Combinatorial Interactions Suite', () => {
  let queue: InMemoryTestQueue;

  beforeEach(() => {
    queue = new InMemoryTestQueue();
  });

  // Interaction 1: Shifter -> Decoder +10 bonus -> Consecutive Role Guard
  it('3.1 Shifter -> Decoder +10 Bonus Leap -> Consecutive Role Guard invariant', async () => {
    const theme = HANDCRAFTED_THEMES[0];
    const chain = queue.createChainFromTheme(theme);
    chain.currentHop = 9; // Hop 9 is shifter

    // Shifter completes turn -> advances to Hop 10
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'shifter-player';
    chain.leaseExpiresAt = Date.now() + 60000;
    const shiftRes = await queue.submitMutation(chain.id, 'shifter-player', 1, 'twilight');
    expect(shiftRes.success).toBeTruthy();
    expect(chain.currentHop).toBe(10);

    // Next intercept must assign Decoder
    const nextRole = determinePlayerRole(chain);
    expect(nextRole).toBe('decoder');

    // Decoder guesses correctly -> +10 bonus hops
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'decoder-player';
    chain.leaseExpiresAt = Date.now() + 60000;
    const decRes = await queue.submitDecoderGuess(chain.id, 'decoder-player', theme.theme);
    expect(decRes.isCorrect).toBeTruthy();
    expect(chain.bonusHops).toBe(10);
    expect(chain.currentHop).toBe(11);

    // Guard: Even if bonus hops + current hop lands on a multiple of 10 or 20, next turn must be Shifter!
    const subsequentRole = determinePlayerRole(chain);
    expect(subsequentRole).toBe('shifter');
  });

  // Interaction 2: Trap Word Hit + 1 Life Remaining -> Immediate Destruction & Hall of Ghosts Transfer
  it('3.2 Trap Word Hit + 1 Life Remaining -> Immediate Destruction & Hall of Ghosts Transfer', async () => {
    const theme = HANDCRAFTED_THEMES[0]; // banned: spy, agent, soviet, nuclear, embassy
    const chain = queue.createChainFromTheme(theme);
    chain.lives = 1; // Only 1 signal bar left

    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'unlucky-shifter';
    chain.leaseExpiresAt = Date.now() + 60000;

    const sub = await queue.submitMutation(chain.id, 'unlucky-shifter', 1, 'nuclear');
    expect(sub.success).toBeTruthy();
    expect(sub.isTrap).toBeTruthy();
    expect(sub.strikeDeducted).toBeTruthy();

    // Verify chain is destroyed
    expect(chain.lives).toBe(0);
    expect(chain.status).toBe('destroyed');

    // Verify archived in Hall of Ghosts
    const ghost = queue.getGhostReceipt(chain.id);
    expect(ghost).toBeDefined();
    expect(ghost!.outcome).toBe('destroyed');
    expect(ghost!.themeTitle).toBe(theme.theme);

    // Verify no longer interceptable
    const nextIntercept = await queue.interceptChain('newcomer');
    expect(nextIntercept!.chain.id !== chain.id).toBeTruthy();
  });

  // Interaction 3: Sabotage Report -> Jury 2/3 Yes -> Rewind + Token Purge + Shadow-ban
  it('3.3 Sabotage Report -> Jury 2/3 Yes -> 1-Hop Rewind + Token Purge + Shadow-ban Isolation', async () => {
    const r = await queue.interceptChain('troll-user-1');
    const chainId = r!.chain.id;
    const originalSentence = r!.chain.currentSentence;

    // Troll enters nonsense disguise word 'traveler'
    await queue.submitMutation(chainId, 'troll-user-1', 1, 'traveler');
    const chain = queue.getChainById(chainId)!;
    expect(chain.currentSentence).toContain('traveler');
    expect(chain.currentHop).toBe(1);

    // Peer player spots sabotage and clicks "Report Sabotage"
    const juryCase = await queue.reportSabotage(chainId, 'vigilant-peer');
    expect(juryCase.status).toBe('pending');

    // 2 peers vote Yes for sabotage
    await queue.voteJury(juryCase.id, 'peer-1', true);
    const vote2 = await queue.voteJury(juryCase.id, 'peer-2', true);

    expect(vote2.resolved).toBeTruthy();
    expect(vote2.verdict).toBe('sabotage');
    expect(vote2.chainRewound).toBeTruthy();
    expect(vote2.trollShadowBanned).toBeTruthy();

    // Verify chain reverted
    expect(chain.currentSentence).toBe(originalSentence);
    expect(chain.currentHop).toBe(0);

    // Verify troll player is shadow-banned
    expect(queue.isTroll('troll-user-1')).toBeTruthy();

    // Verify token purge: 'traveler' was revoked, so future honest player CAN now submit 'traveler'
    const filterCheck = validateCandidateWord('traveler', chain.history);
    expect(filterCheck.valid).toBeTruthy();
  });

  // Interaction 4: Sabotage Report -> Jury 2/3 No -> Dismissal & Chain Retains State
  it('3.4 Sabotage Report -> Jury 2/3 No -> Dismissal & Mutation Retained', async () => {
    const r = await queue.interceptChain('honest-user');
    const chainId = r!.chain.id;

    await queue.submitMutation(chainId, 'honest-user', 1, 'traveler');
    const chain = queue.getChainById(chainId)!;

    const juryCase = await queue.reportSabotage(chainId, 'false-accuser');
    await queue.voteJury(juryCase.id, 'peer-1', false);
    const vote2 = await queue.voteJury(juryCase.id, 'peer-2', false);

    expect(vote2.resolved).toBeTruthy();
    expect(vote2.verdict).toBe('dismissed');
    expect(vote2.chainRewound).toBeFalsy();

    // Chain maintains mutated state
    expect(chain.currentHop).toBe(1);
    expect(chain.currentSentence).toContain('traveler');
    expect(queue.isTroll('honest-user')).toBeFalsy();
  });

  // Interaction 5: Lease Timeout During Modal -> Auto-Reclaim -> Re-Intercept Collision
  it('3.5 Lease Timeout -> Sweep Reclaim -> Second Player Intercepts -> First Submit Rejected', async () => {
    const t0 = 1000000;
    const r1 = await queue.interceptChain('slow-player', t0);
    const chainId = r1!.chain.id;

    // Player takes 65 seconds
    const tExpired = t0 + 65000;
    // Auto-reclaim sweep runs
    const reclaimed = await queue.reclaimExpiredLeases(tExpired);
    expect(reclaimed).toBeGreaterThanOrEqual(1);

    // Fast player intercepts the reclaimed chain
    const r2 = await queue.interceptChain('fast-player', tExpired + 1000);
    expect(r2!.chain.id).toBe(chainId);

    // Slow player finally tries to submit with expired lease
    const lateSubmit = await queue.submitMutation(chainId, 'slow-player', 1, 'twilight', tExpired + 2000);
    expect(lateSubmit.success).toBeFalsy();
    expect(lateSubmit.error).toBe('INVALID_LEASE_HOLDER');

    // Fast player submits cleanly
    const fastSubmit = await queue.submitMutation(chainId, 'fast-player', 1, 'twilight', tExpired + 3000);
    expect(fastSubmit.success).toBeTruthy();
  });

  // Interaction 6: Decoder Wrong Guess at 1 Life -> Chain Destroyed -> Ghost Permalink
  it('3.6 Decoder Wrong Guess at 1 Life -> Chain Destroyed -> Ghost Permalink Generated', async () => {
    const theme = HANDCRAFTED_THEMES[1];
    const chain = queue.createChainFromTheme(theme);
    chain.lives = 1;
    chain.currentHop = 10;
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'risk-decoder';
    chain.leaseExpiresAt = Date.now() + 60000;

    const res = await queue.submitDecoderGuess(chain.id, 'risk-decoder', theme.decoyThemes[0]);
    expect(res.isCorrect).toBeFalsy();
    expect(chain.lives).toBe(0);
    expect(chain.status).toBe('destroyed');

    const ghost = queue.getGhostReceipt(chain.id);
    expect(ghost).toBeDefined();
    expect(ghost!.outcome).toBe('destroyed');
    expect(ghost!.finalHop).toBe(11);
  });

  // Interaction 7: Decoder Correct Guess at 89 Hops (+10 Bonus) -> 100 Hops Victory
  it('3.7 Decoder Correct Guess at 89 Hops (+10 Bonus) -> Reaches 100 Hops -> Victory Archival', async () => {
    const theme = HANDCRAFTED_THEMES[2];
    const chain = queue.createChainFromTheme(theme);
    chain.currentHop = 89;
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'legendary-decoder';
    chain.leaseExpiresAt = Date.now() + 60000;

    const res = await queue.submitDecoderGuess(chain.id, 'legendary-decoder', theme.theme);
    expect(res.isCorrect).toBeTruthy();
    expect(chain.status).toBe('victory');
    expect(chain.completedAt).toBeDefined();

    const ghost = queue.getGhostReceipt(chain.id);
    expect(ghost).toBeDefined();
    expect(ghost!.outcome).toBe('victory');
    expect(ghost!.finalHop).toBe(100);
  });

  // Interaction 8: Troll Queue Isolation -> Troll Mutations Do Not Pollute Main Queue
  it('3.8 Troll Queue Isolation -> Troll Mutations Isolated in Sandbox Pool', async () => {
    // Flag player as troll
    queue['trollQueue'].add('confirmed-troll');

    // Troll intercepts
    const trollRes = await queue.interceptChain('confirmed-troll');
    expect(trollRes!.chain.id).toContain('troll-chain-confirmed-troll');

    // Verify active public queue chains remain untouched
    const activePublic = queue.getActiveChains();
    for (const c of activePublic) {
      expect(c.leasedToPlayerId !== 'confirmed-troll').toBeTruthy();
    }
  });

  // Interaction 9: Audio Mute Interaction with Timer Ticks & Alarms
  it('3.9 Audio Mute Interaction -> Global Mute Toggle Silences Heartbeat & Siren', () => {
    const audio = new AudioEngineSimulator(false);
    // Unmuted: ticks play
    expect(audio.triggerSound('heartbeat')).toBeTruthy();

    // User clicks global mute toggle
    audio.setMuted(true);
    expect(audio.triggerSound('trap_alarm')).toBeFalsy();
    expect(audio.triggerSound('tick')).toBeFalsy();

    // User un-mutes
    audio.setMuted(false);
    expect(audio.triggerSound('victory_fanfare')).toBeTruthy();
  });

  // Interaction 10: Countdown State Pulse (<15s) Correlates with Web Audio Heartbeat
  it('3.10 Countdown State Pulse (<15s) Correlates with Heartbeat Sound Generation', () => {
    const audio = new AudioEngineSimulator(false);

    // Remaining time 20s (amber)
    const stateAmber = simulateCountdownState(20000);
    expect(stateAmber.heartbeatAudioTick).toBeFalsy();

    // Remaining time 10s (crimson pulse)
    const stateCrimson = simulateCountdownState(10000);
    expect(stateCrimson.heartbeatAudioTick).toBeTruthy();
    if (stateCrimson.heartbeatAudioTick) {
      audio.triggerSound('heartbeat');
    }
    expect(audio.triggeredEvents).toContain('heartbeat');
  });

  // Interaction 11: Double Submit Race Condition on Single Chain Lease
  it('3.11 Concurrent Double Submission -> Exactly One Request Succeeds, Second Fails', async () => {
    const r = await queue.interceptChain('racy-player');
    const chainId = r!.chain.id;

    // Simulate concurrent requests
    const p1 = queue.submitMutation(chainId, 'racy-player', 1, 'phantom');
    const p2 = queue.submitMutation(chainId, 'racy-player', 1, 'shadow');

    const [res1, res2] = await Promise.all([p1, p2]);
    const successCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
    expect(successCount).toBe(1);
  });

  // Interaction 12: Streak Tracking Across Mixed Shifter Mutations and Trap Hits
  it('3.12 Streak Tracking -> Increments on Clean Mutations, Resets to 0 on Trap Hit', async () => {
    const pId = 'streak-tester';
    const theme = HANDCRAFTED_THEMES[0];
    const chain = queue.createChainFromTheme(theme);

    // Turn 1: Clean mutation
    chain.leasedToPlayerId = pId;
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    await queue.submitMutation(chain.id, pId, 1, 'phantom');
    expect(queue.getPlayerStreak(pId)).toBe(1);

    // Turn 2: Another clean mutation
    chain.leasedToPlayerId = pId;
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    await queue.submitMutation(chain.id, pId, 2, 'shadow');
    expect(queue.getPlayerStreak(pId)).toBe(2);

    // Turn 3: Player hits trap word ('spy')
    chain.leasedToPlayerId = pId;
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    await queue.submitMutation(chain.id, pId, 3, 'spy');
    // Streak must reset to 0!
    expect(queue.getPlayerStreak(pId)).toBe(0);
  });

  // Interaction 13: Auto-Spawner Triggered When Active Queue Drops Below Minimum
  it('3.13 Auto-Spawner -> Re-enqueues Algorithmic Themes When Active Pool Depletes', async () => {
    const initialActive = queue.getActiveChains().length;
    // Simulate consuming all active chains into in_progress
    const active = queue.getActiveChains();
    for (const c of active) {
      c.status = 'in_progress';
    }
    expect(queue.getActiveChains()).toHaveLength(0);

    // Next intercept forces auto-spawner to generate algorithmic theme
    const res = await queue.interceptChain('spawner-trigger-player');
    expect(res).toBeDefined();
    expect(res!.chain.id).toBeDefined();
  });

  // Interaction 14: Trace Log Drawer Updates Live Across Multiple Connected Players
  it('3.14 Trace Log Drawer Updates Live Across Distinct Players Mutating the Same Chain', async () => {
    const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
    const players = ['alice', 'bob', 'charlie'];

    for (let i = 0; i < players.length; i++) {
      chain.leasedToPlayerId = players[i];
      chain.leaseExpiresAt = Date.now() + 60000;
      chain.status = 'in_progress';
      await queue.submitMutation(chain.id, players[i], i + 1, ['phantom', 'shadow', 'covert'][i]);
    }

    const trace = chain.history.slice(-3);
    expect(trace).toHaveLength(3);
    expect(trace[0].playerId).toBe('alice');
    expect(trace[1].playerId).toBe('bob');
    expect(trace[2].playerId).toBe('charlie');
  });

  // Interaction 15: Case-Insensitive Disguise Filter Interacts with Banned Trap Blacklist
  it('3.15 Case-Insensitive Disguise Filter Interacts with Banned Trap Blacklist', () => {
    const banned = ['nuclear'];
    // All variations of casing must trigger the trap
    expect(validateCandidateWord('nuclear', [], banned).isTrap).toBeTruthy();
    expect(validateCandidateWord('NUCLEAR', [], banned).isTrap).toBeTruthy();
    expect(validateCandidateWord('NuClEaR', [], banned).isTrap).toBeTruthy();
  });

  // Interaction 16: Punctuation Stripping Interacts with History Repeat Detection
  it('3.16 Punctuation Stripping Interacts with History Repeat Detection', () => {
    const history: Hop[] = [{
      hopNumber: 1,
      playerId: 'p1',
      previousSentence: 'Foggy Berlin streets.',
      newSentence: 'Foggy London streets.',
      role: 'shifter',
      timestamp: 0
    }];
    // Even though "streets." has a period, entering "streets" or "STREETS" must be rejected
    const res = validateCandidateWord('streets', history);
    expect(res.valid).toBeFalsy();
    expect(res.error).toBe('DUPLICATE_HISTORICAL_WORD');
  });

  // Interaction 17: "My Active Chains" Reflects Live Health Degradation from Peer Trap Hits
  it('3.17 My Active Chains Reflects Live Health Degradation from Peer Trap Hits', async () => {
    const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
    // Player A mutates
    chain.leasedToPlayerId = 'player-a';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    await queue.submitMutation(chain.id, 'player-a', 1, 'phantom');

    // Player B intercepts and triggers trap
    chain.leasedToPlayerId = 'player-b';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';
    await queue.submitMutation(chain.id, 'player-b', 2, 'spy'); // trap!

    // Player A inspects their active chains tray
    const myChains = queue.getAllChains().filter(c => c.history.some(h => h.playerId === 'player-a'));
    expect(myChains).toHaveLength(1);
    expect(myChains[0].lives).toBe(2); // Reduced from 3 to 2
  });

  // Interaction 18: Chain Destruction Evicts from Active Pool and Precludes Re-Leasing
  it('3.18 Chain Destruction Evicts from Active Pool and Precludes Re-Leasing', async () => {
    const chain = queue.createChainFromTheme(HANDCRAFTED_THEMES[0]);
    chain.lives = 1;
    chain.leasedToPlayerId = 'killer';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';

    // Strike 3
    await queue.submitMutation(chain.id, 'killer', 1, 'agent'); // trap
    expect(chain.status).toBe('destroyed');

    // Ensure it is not in active chains
    const active = queue.getActiveChains();
    expect(active.some(c => c.id === chain.id)).toBeFalsy();
  });

  // Interaction 19: Decoder Guess Fails at 2 Lives Remaining -> Decrements to 1 Without Destruction
  it('3.19 Decoder Guess Fails at 2 Lives -> Decrements to 1 Without Destruction', async () => {
    const theme = HANDCRAFTED_THEMES[0];
    const chain = queue.createChainFromTheme(theme);
    chain.lives = 2;
    chain.currentHop = 10;
    chain.leasedToPlayerId = 'decoder-fail';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.status = 'in_progress';

    const res = await queue.submitDecoderGuess(chain.id, 'decoder-fail', theme.decoyThemes[0]);
    expect(res.isCorrect).toBeFalsy();
    expect(chain.lives).toBe(1);
    expect(chain.status).toBe('active'); // Still alive
    expect(queue.getGhostReceipt(chain.id)).toBeNull(); // Not archived yet
  });

  // Interaction 20: Jury Consensus Speed: 2 Votes Resolve Without Waiting for 3rd
  it('3.20 Jury Consensus Speed -> 2 Affirmative Votes Immediately Resolve and Rewind', async () => {
    const r = await queue.interceptChain('troll-fast');
    await queue.submitMutation(r!.chain.id, 'troll-fast', 1, 'phantom');
    const jc = await queue.reportSabotage(r!.chain.id, 'mod');

    // Only 2 of 3 votes cast
    await queue.voteJury(jc.id, 'peer-1', true);
    const vote2 = await queue.voteJury(jc.id, 'peer-2', true);

    expect(vote2.resolved).toBeTruthy();
    expect(jc.status).toBe('consensus_sabotage');
    expect(Object.keys(jc.votes)).toHaveLength(2);
  });
});

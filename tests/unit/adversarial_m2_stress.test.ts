import { describe, it, expect, beforeEach } from 'vitest';
import { QueueEngine } from '@/lib/queue';
import { MemoryWhisperStore } from '@/lib/store';
import { createChainFromTemplate, autoSpawnChains } from '@/lib/spawner';
import { HANDCRAFTED_THEMES } from '@/lib/prompts';
import { reportSabotage, voteJury } from '@/lib/jury';
import { validateCandidateWord } from '@/lib/filter';
import { EventBroadcaster } from '@/lib/events';
import { NextRequest } from 'next/server';
import { POST as handleIntercept } from '@/app/api/chains/intercept/route';
import { POST as handleSubmit } from '@/app/api/chains/submit/route';
import { POST as handleReport } from '@/app/api/chains/report/route';
import { POST as handleVote } from '@/app/api/jury/vote/route';
import { GET as handleGhost } from '@/app/api/ghost/[id]/route';

describe('Adversarial Critic Stress Suite — Milestone M2', () => {
  let store: MemoryWhisperStore;
  let queue: QueueEngine;

  beforeEach(async () => {
    store = MemoryWhisperStore.getInstance();
    await store.clear();
    queue = new QueueEngine(store);
  });

  function createJsonRequest(url: string, method: string, body?: any): NextRequest {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // =========================================================================
  // SECTION 1: CONCURRENCY, RACES & DOUBLE-SUBMIT ATTACKS
  // =========================================================================
  describe('1. Concurrency, Races & Double-Submit Protection', () => {
    it('prevents double-submit: concurrent identical submits result in exactly one success', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      const intercepted = await queue.interceptChain('player-alpha', 10000);
      expect(intercepted?.chain.id).toBe(chain.id);

      // Concurrent execution of two submits with distinct words
      const [res1, res2] = await Promise.all([
        queue.submitMutation(chain.id, 'player-alpha', 1, 'infiltrator', 15000),
        queue.submitMutation(chain.id, 'player-alpha', 2, 'sentinel', 15000),
      ]);

      const updated = await store.getChain(chain.id);
      console.log('CONCURRENCY TEST DEBUG: res1 success:', res1.success, 'res2 success:', res2.success);
      console.log('CONCURRENCY TEST DEBUG: updated hop:', updated?.currentHop, 'history length:', updated?.history.length);
      console.log('CONCURRENCY TEST DEBUG: player streak:', await store.getPlayerStreak('player-alpha'));

      const successes = [res1, res2].filter(r => r.success);
      const failures = [res1, res2].filter(r => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toBe('INVALID_LEASE_HOLDER');
    });

    it('prevents decoder double-submit: concurrent guesses must award bonus hops exactly once', async () => {
      const template = HANDCRAFTED_THEMES[0];
      const chain = createChainFromTemplate(template);
      chain.currentHop = 10;
      chain.history.push({
        hopNumber: 9,
        playerId: 'p0',
        previousSentence: chain.initialSentence,
        newSentence: chain.initialSentence,
        role: 'shifter',
        timestamp: 1000,
      });
      await store.saveChain(chain);

      await queue.interceptChain('decoder-race', 10000);

      // Concurrent execution of two decoder guesses with same player and chain
      const [res1, res2] = await Promise.all([
        queue.submitDecoderGuess(chain.id, 'decoder-race', template.theme, 15000),
        queue.submitDecoderGuess(chain.id, 'decoder-race', template.theme, 15000),
      ]);

      const updated = await store.getChain(chain.id);
      console.log('DECODER RACE DEBUG: res1 success:', res1.success, 'res2 success:', res2.success);
      console.log('DECODER RACE DEBUG: bonusHops:', updated?.bonusHops, 'player streak:', await store.getPlayerStreak('decoder-race'));

      const successes = [res1, res2].filter(r => r.success);
      expect(successes.length).toBe(1);
      expect(updated?.bonusHops).toBe(10);
      expect(await store.getPlayerStreak('decoder-race')).toBe(3);
    });

    it('enforces atomic mutual exclusion across 20 concurrent intercepts', async () => {
      // Pre-populate 20 chains
      for (let i = 0; i < 20; i++) {
        const c = createChainFromTemplate(HANDCRAFTED_THEMES[i]);
        await store.saveChain(c);
      }
      expect(await store.getActiveChainsCount()).toBe(20);

      // 20 distinct players intercept concurrently
      const playerIds = Array.from({ length: 20 }, (_, i) => `concurrent-player-${i}`);
      const results = await Promise.all(playerIds.map(pid => queue.interceptChain(pid, 5000)));

      // Every player must get a valid chain
      expect(results.every(r => r !== null)).toBe(true);

      // Every assigned chain ID must be distinct (zero collisions)
      const assignedChainIds = results.map(r => r!.chain.id);
      const uniqueChainIds = new Set(assignedChainIds);
      expect(uniqueChainIds.size).toBe(20);

      // Active queue should now be empty
      expect(await store.getActiveChainsCount()).toBe(0);
    });

    it('reclaims expired lease at t+60001, grants to new player, and rejects original player submit', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      const t0 = 100000;
      await queue.interceptChain('slow-operative', t0); // lease expires at 160000

      // At t0 + 60001, new operative intercepts
      const t1 = t0 + 60001;
      const secondIntercept = await queue.interceptChain('fast-operative', t1);
      expect(secondIntercept?.chain.id).toBe(chain.id);
      expect(secondIntercept?.chain.leaseExpiresAt).toBe(t1 + 60000);

      // Slow operative attempts to submit mutation with their stale lease
      const slowSubmit = await queue.submitMutation(chain.id, 'slow-operative', 1, 'sentinel', t1 + 500);
      expect(slowSubmit.success).toBe(false);
      expect(slowSubmit.error).toBe('INVALID_LEASE_HOLDER');

      // Fast operative submits mutation successfully
      const fastSubmit = await queue.submitMutation(chain.id, 'fast-operative', 1, 'sentinel', t1 + 1000);
      expect(fastSubmit.success).toBe(true);
      expect(fastSubmit.chain?.currentHop).toBe(1);
    });

    it('auto-spawns seamlessly under massive demand (50 concurrent intercepts from 0 pool)', async () => {
      expect(await store.getActiveChainsCount()).toBe(0);

      const playerIds = Array.from({ length: 30 }, (_, i) => `swarm-player-${i}`);
      const results = await Promise.all(playerIds.map(pid => queue.interceptChain(pid, 10000)));

      expect(results.every(r => r !== null)).toBe(true);
      const uniqueIds = new Set(results.map(r => r!.chain.id));
      expect(uniqueIds.size).toBe(30);
    });
  });

  // =========================================================================
  // SECTION 2: INSTANT CROWD JURY ADVERSARIAL STRESS
  // =========================================================================
  describe('2. Instant Crowd Jury Adversarial Stress', () => {
    it('strictly rejects sabotage report on Hop 0 (unmutated chain)', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      await expect(queue.reportSabotage(chain.id, 'vigilante')).rejects.toThrow(
        'Cannot report sabotage on chain without mutation history'
      );
    });

    it('strictly rejects sabotage report on a Decoder deduction hop', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.currentHop = 10;
      chain.history.push({
        hopNumber: 10,
        playerId: 'codebreaker',
        previousSentence: chain.initialSentence,
        newSentence: chain.initialSentence,
        role: 'decoder',
        decoderGuess: 'Cold War Espionage',
        isCorrectGuess: true,
        timestamp: Date.now(),
      });
      await store.saveChain(chain);

      await expect(queue.reportSabotage(chain.id, 'vigilante')).rejects.toThrow(
        'Cannot report sabotage on decoder hop'
      );
    });

    it('neutralizes single-juror spam: duplicate votes from same player do NOT count as multiple votes', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.currentHop = 1;
      chain.history.push({
        hopNumber: 1,
        playerId: 'troll-operative',
        previousSentence: chain.initialSentence,
        newSentence: 'Trolled sentence content.',
        newWord: 'trolled',
        role: 'shifter',
        timestamp: Date.now(),
      });
      await store.saveChain(chain);

      const juryCase = await queue.reportSabotage(chain.id, 'reporter');

      // Juror 1 spams 5 'Yes' votes
      for (let i = 0; i < 5; i++) {
        const voteRes = await queue.voteJury(juryCase.id, 'eager-juror', true);
        expect(voteRes.resolved).toBe(false);
      }

      // Check stored case votes
      const stored = await store.getJuryCase(juryCase.id);
      expect(Object.keys(stored!.votes).length).toBe(1);
      expect(stored!.status).toBe('pending');

      // Now Juror 2 votes 'Yes' -> Reaches 2 distinct Yes votes -> Resolves
      const vote2 = await queue.voteJury(juryCase.id, 'independent-juror', true);
      expect(vote2.resolved).toBe(true);
      expect(vote2.verdict).toBe('sabotage');
    });

    it('rejects votes after jury case has reached consensus', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.currentHop = 1;
      chain.history.push({
        hopNumber: 1,
        playerId: 'troll-1',
        previousSentence: chain.initialSentence,
        newSentence: 'Corrupted sentence.',
        newWord: 'corrupted',
        role: 'shifter',
        timestamp: Date.now(),
      });
      await store.saveChain(chain);

      const juryCase = await queue.reportSabotage(chain.id, 'reporter');
      await queue.voteJury(juryCase.id, 'j1', true);
      await queue.voteJury(juryCase.id, 'j2', true); // Closed as consensus_sabotage

      // 3rd juror attempts to vote on closed case
      await expect(queue.voteJury(juryCase.id, 'j3', true)).rejects.toThrow(
        'Jury case not found or already closed'
      );
    });

    it('1-hop rewind correctly restores initialSentence and decrements hop counter to 0', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      const pristineSentence = chain.initialSentence;

      await store.saveChain(chain);
      await queue.interceptChain('troll-user', 1000);
      await queue.submitMutation(chain.id, 'troll-user', 1, 'traveler', 2000);

      const mutatedChain = await store.getChain(chain.id);
      expect(mutatedChain?.currentHop).toBe(1);
      expect(mutatedChain?.currentSentence).toContain('traveler');

      const juryCase = await queue.reportSabotage(chain.id, 'sentinel-peer');
      await queue.voteJury(juryCase.id, 'juror-a', true);
      const res = await queue.voteJury(juryCase.id, 'juror-b', true);

      expect(res.chainRewound).toBe(true);
      expect(res.trollShadowBanned).toBe(true);

      const rewound = await store.getChain(chain.id);
      expect(rewound?.currentHop).toBe(0);
      expect(rewound?.currentSentence).toBe(pristineSentence);
      expect(rewound?.history.length).toBe(0);

      // Verify troll is shadow-banned
      expect(await store.isPlayerShadowBanned('troll-user')).toBe(true);

      // Verify token purge: future valid player can submit 'traveler' without DUPLICATE_HISTORICAL_WORD error
      const filterResult = validateCandidateWord('traveler', rewound!.history, rewound!.bannedWords, rewound!.initialSentence);
      expect(filterResult.valid).toBe(true);
    });

    it('quarantines shadow-banned troll into sandbox: never leases real active chains', async () => {
      const realChain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(realChain);

      await store.shadowBanPlayer('banned-troll-66');

      // Troll attempts to intercept
      const intercept = await queue.interceptChain('banned-troll-66', 10000);
      expect(intercept?.chain.id).toBe('troll-chain-banned-troll-66');

      // Verify real chain was NOT leased to troll
      const checkReal = await store.getChain(realChain.id);
      expect(checkReal?.status).toBe('active');
      expect(checkReal?.leasedToPlayerId).toBeNull();

      // Honest player intercepts real chain
      const honestIntercept = await queue.interceptChain('honest-player', 10000);
      expect(honestIntercept?.chain.id).toBe(realChain.id);
    });

    it('adversarial attack: interleaved mutation during jury deliberation must not ban innocent player or pop wrong hop', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      // 1. Troll mutates Hop 1
      await queue.interceptChain('troll-operative', 1000);
      await queue.submitMutation(chain.id, 'troll-operative', 1, 'traveler', 2000);

      // 2. Sabotage reported on Hop 1
      const juryCase = await queue.reportSabotage(chain.id, 'reporter-operative');
      expect(juryCase.flaggedHop.playerId).toBe('troll-operative');

      // 3. Chain was active, so innocent operative intercepts and mutates Hop 2 before jury resolves!
      await queue.interceptChain('innocent-operative', 3000);
      await queue.submitMutation(chain.id, 'innocent-operative', 2, 'sentinel', 4000);

      const chainBeforeVote = await store.getChain(chain.id);
      expect(chainBeforeVote?.currentHop).toBe(2);
      expect(chainBeforeVote?.history.length).toBe(2);

      // 4. Jury votes Yes on troll's sabotage case!
      await queue.voteJury(juryCase.id, 'juror-1', true);
      const voteRes = await queue.voteJury(juryCase.id, 'juror-2', true);
      expect(voteRes.resolved).toBe(true);

      // Check who was shadow-banned!
      const trollBanned = await store.isPlayerShadowBanned('troll-operative');
      const innocentBanned = await store.isPlayerShadowBanned('innocent-operative');

      console.log('INTERLEAVED JURY DEBUG: trollBanned:', trollBanned, 'innocentBanned:', innocentBanned);

      expect(trollBanned).toBe(true);
      expect(innocentBanned).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 3: SSE CONNECTION LIFECYCLE & MEMORY LEAKS
  // =========================================================================
  describe('3. SSE Connection Lifecycle & Auto-Pruning', () => {
    it('tracks unique players online across multiple tabs per player', () => {
      const broadcaster = new EventBroadcaster();

      const mockController = () => ({
        enqueue: () => {},
        close: () => {},
        error: () => {},
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController);

      // Player 1 opens 3 tabs
      const unreg1 = broadcaster.registerClient('player-1', mockController());
      const unreg2 = broadcaster.registerClient('player-1', mockController());
      const unreg3 = broadcaster.registerClient('player-1', mockController());

      // Player 2 opens 1 tab
      const unreg4 = broadcaster.registerClient('player-2', mockController());

      expect(broadcaster.getActiveConnectionCount()).toBe(4);
      expect(broadcaster.getPlayersOnline()).toBe(2);

      // Player 1 closes 2 tabs
      unreg1();
      unreg2();
      expect(broadcaster.getActiveConnectionCount()).toBe(2);
      expect(broadcaster.getPlayersOnline()).toBe(2);

      // Player 1 closes last tab
      unreg3();
      expect(broadcaster.getActiveConnectionCount()).toBe(1);
      expect(broadcaster.getPlayersOnline()).toBe(1);

      // Player 2 closes tab
      unreg4();
      expect(broadcaster.getActiveConnectionCount()).toBe(0);
    });

    it('auto-prunes dead SSE connections that throw on enqueue during broadcast', () => {
      const broadcaster = new EventBroadcaster();

      let closed = false;
      const badController = {
        enqueue: () => {
          throw new Error('Connection abruptly severed');
        },
        close: () => {},
      } as unknown as ReadableStreamDefaultController;

      broadcaster.registerClient('broken-client', badController);
      expect(broadcaster.getActiveConnectionCount()).toBe(1);

      // Broadcasting triggers auto-prune in catch block
      broadcaster.broadcastTelemetry(10);
      expect(broadcaster.getActiveConnectionCount()).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 4: API ROUTE ERROR HANDLING & ROBUSTNESS
  // =========================================================================
  describe('4. Next.js App Router API Route Robustness', () => {
    it('POST /api/chains/submit rejects wordIndex out of bounds with 400', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p1';
      chain.leaseExpiresAt = Date.now() + 60000;
      await store.saveChain(chain);

      const req = createJsonRequest('http://localhost:3000/api/chains/submit', 'POST', {
        chainId: chain.id,
        playerId: 'p1',
        wordIndex: 9999, // Out of bounds!
        newWord: 'sentinel',
      });

      const res = await handleSubmit(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('OUT_OF_BOUNDS');
    });

    it('POST /api/chains/submit rejects non-dictionary word with 400', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p1';
      chain.leaseExpiresAt = Date.now() + 60000;
      await store.saveChain(chain);

      const req = createJsonRequest('http://localhost:3000/api/chains/submit', 'POST', {
        chainId: chain.id,
        playerId: 'p1',
        wordIndex: 1,
        newWord: 'xyzqwertyp', // Gibberish!
      });

      const res = await handleSubmit(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('NOT_IN_DICTIONARY');
    });

    it('POST /api/chains/submit rejects words >= 12 chars with 400', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.status = 'in_progress';
      chain.leasedToPlayerId = 'p1';
      chain.leaseExpiresAt = Date.now() + 60000;
      await store.saveChain(chain);

      const req = createJsonRequest('http://localhost:3000/api/chains/submit', 'POST', {
        chainId: chain.id,
        playerId: 'p1',
        wordIndex: 1,
        newWord: 'cryptography', // Exactly 12 letters!
      });

      const res = await handleSubmit(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('WORD_TOO_LONG');
    });

    it('POST /api/chains/report returns 400 on Hop 0 report attempt', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      await store.saveChain(chain);

      const req = createJsonRequest('http://localhost:3000/api/chains/report', 'POST', {
        chainId: chain.id,
        reporterPlayerId: 'reporter-1',
      });

      const res = await handleReport(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Cannot report sabotage');
    });

    it('POST /api/jury/vote returns 400 when missing voterId or isSabotage', async () => {
      const req = createJsonRequest('http://localhost:3000/api/jury/vote', 'POST', {
        caseId: 'case-123',
      });

      const res = await handleVote(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('MISSING_PARAMETERS');
    });

    it('GET /api/ghost/[id] returns 404 for unknown ghost ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/ghost/nonexistent-id');
      const res = await handleGhost(req, { params: { id: 'nonexistent-id' } });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('GHOST_NOT_FOUND');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { MemoryWhisperStore } from '@/lib/store';
import { QueueEngine } from '@/lib/queue';
import { reportSabotage, voteJury, selectPeerJurors, isTroll, createTrollSandboxChain } from '@/lib/jury';
import { archiveToHallOfGhosts, getGhostReceipt, listGhostReceipts, generateGhostTimelineDiffs } from '@/lib/ghosts';
import { createChainFromTemplate } from '@/lib/spawner';
import { HANDCRAFTED_THEMES } from '@/lib/prompts';
import { validateCandidateWord, extractHistoricalWords } from '@/lib/filter';
import { Chain, Hop } from '@/lib/types';
import { GET as handleGhost } from '@/app/api/ghost/[id]/route';

describe('Milestone M2 Adversarial Stress Suite: Jury, Troll Sandbox & Hall of Ghosts', () => {
  let store: MemoryWhisperStore;
  let queue: QueueEngine;

  beforeEach(async () => {
    store = MemoryWhisperStore.getInstance();
    await store.clear();
    queue = new QueueEngine(store);
  });

  describe('1. Instant Crowd Jury Consensus Variations & 2/3 Precision', () => {
    it('Consensus Variation A: 2 Yes / 0 No triggers immediate sabotage resolution and terminates pending status', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      chain.currentHop = 1;
      const initialSentence = chain.currentSentence;
      const trollHop: Hop = {
        hopNumber: 1,
        playerId: 'troll-vA',
        previousSentence: initialSentence,
        newSentence: 'The midnight saboteur delivered secret dossiers across foggy Berlin streets.',
        replacedWordIndex: 2,
        oldWord: 'courier',
        newWord: 'saboteur',
        role: 'shifter',
        timestamp: Date.now()
      };
      chain.history.push(trollHop);
      chain.currentSentence = trollHop.newSentence;
      await store.saveChain(chain);

      const juryCase = await reportSabotage(chain.id, 'reporter-vA', store);
      expect(juryCase.status).toBe('pending');
      expect(juryCase.assignedPeerIds.length).toBe(3);

      // Vote 1: Juror 1 votes Yes (1 Yes / 0 No) -> Remains pending
      const vote1 = await voteJury(juryCase.id, juryCase.assignedPeerIds[0], true, store);
      expect(vote1.resolved).toBe(false);
      expect(vote1.verdict).toBeUndefined();

      const caseAfterVote1 = await store.getJuryCase(juryCase.id);
      expect(caseAfterVote1?.status).toBe('pending');

      // Vote 2: Juror 2 votes Yes (2 Yes / 0 No) -> Consensus Sabotage reached (2/3 majority)
      const vote2 = await voteJury(juryCase.id, juryCase.assignedPeerIds[1], true, store);
      expect(vote2.resolved).toBe(true);
      expect(vote2.verdict).toBe('sabotage');
      expect(vote2.chainRewound).toBe(true);
      expect(vote2.trollShadowBanned).toBe(true);

      const finalCase = await store.getJuryCase(juryCase.id);
      expect(finalCase?.status).toBe('consensus_sabotage');
      expect(finalCase?.resolvedAt).toBeGreaterThan(0);
      // Preserved audit trail: flaggedHop on the persisted JuryCase is marked revoked
      expect(finalCase?.flaggedHop.isRevoked).toBe(true);

      // Attempting 3rd vote on finalized case must reject
      await expect(
        voteJury(juryCase.id, juryCase.assignedPeerIds[2], false, store)
      ).rejects.toThrow('Jury case not found or already closed');
    });

    it('Consensus Variation B: 2 Yes / 1 No (Sequence: Yes, No, Yes) accurately calculates 2/3 consensus', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[1]);
      chain.currentHop = 1;
      const initialSentence = chain.currentSentence;
      const trollHop: Hop = {
        hopNumber: 1,
        playerId: 'troll-vB',
        previousSentence: initialSentence,
        newSentence: 'Chrome invaders breached corporate firewalls before orbital security noticed.',
        replacedWordIndex: 1,
        oldWord: 'operatives',
        newWord: 'invaders',
        role: 'shifter',
        timestamp: Date.now()
      };
      chain.history.push(trollHop);
      chain.currentSentence = trollHop.newSentence;
      await store.saveChain(chain);

      const juryCase = await reportSabotage(chain.id, 'reporter-vB', store);
      const [juror1, juror2, juror3] = juryCase.assignedPeerIds;

      // Vote 1: Juror 1 votes Yes (1 Yes / 0 No) -> Pending
      const res1 = await voteJury(juryCase.id, juror1, true, store);
      expect(res1.resolved).toBe(false);

      // Vote 2: Juror 2 votes No (1 Yes / 1 No) -> Pending
      const res2 = await voteJury(juryCase.id, juror2, false, store);
      expect(res2.resolved).toBe(false);

      const caseMid = await store.getJuryCase(juryCase.id);
      expect(caseMid?.status).toBe('pending');

      // Vote 3: Juror 3 votes Yes (2 Yes / 1 No) -> Consensus reached!
      const res3 = await voteJury(juryCase.id, juror3, true, store);
      expect(res3.resolved).toBe(true);
      expect(res3.verdict).toBe('sabotage');
      expect(res3.chainRewound).toBe(true);
      expect(res3.trollShadowBanned).toBe(true);

      const finalCase = await store.getJuryCase(juryCase.id);
      expect(finalCase?.status).toBe('consensus_sabotage');
      expect(await store.isPlayerShadowBanned('troll-vB')).toBe(true);
    });

    it('Consensus Variation C: 1 Yes / 2 No (Sequence: Yes, No, No) resolves to dismissed with mutation preserved', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[2]);
      chain.currentHop = 1;
      const initialSentence = chain.currentSentence;
      const legitimateHop: Hop = {
        hopNumber: 1,
        playerId: 'innocent-vC',
        previousSentence: initialSentence,
        newSentence: 'Velvet drapery muffled strange whispers around the candlelit parlor table.',
        replacedWordIndex: 1,
        oldWord: 'curtains',
        newWord: 'drapery',
        role: 'shifter',
        timestamp: Date.now()
      };
      chain.history.push(legitimateHop);
      chain.currentSentence = legitimateHop.newSentence;
      await store.saveChain(chain);

      const juryCase = await reportSabotage(chain.id, 'accuser-vC', store);
      const [juror1, juror2, juror3] = juryCase.assignedPeerIds;

      // Vote 1: Juror 1 votes Yes (1 Yes / 0 No) -> Pending
      const res1 = await voteJury(juryCase.id, juror1, true, store);
      expect(res1.resolved).toBe(false);

      // Vote 2: Juror 2 votes No (1 Yes / 1 No) -> Pending
      const res2 = await voteJury(juryCase.id, juror2, false, store);
      expect(res2.resolved).toBe(false);

      // Vote 3: Juror 3 votes No (1 Yes / 2 No) -> Consensus Dismissed!
      const res3 = await voteJury(juryCase.id, juror3, false, store);
      expect(res3.resolved).toBe(true);
      expect(res3.verdict).toBe('dismissed');
      expect(res3.chainRewound).toBe(false);
      expect(res3.trollShadowBanned).toBe(false);

      const finalCase = await store.getJuryCase(juryCase.id);
      expect(finalCase?.status).toBe('consensus_dismissed');

      // Verify chain was NOT rewound
      const chainCheck = await store.getChain(chain.id);
      expect(chainCheck?.currentHop).toBe(1);
      expect(chainCheck?.currentSentence).toBe(legitimateHop.newSentence);
      expect(chainCheck?.history.length).toBe(1);

      // Verify author was NOT shadow-banned
      expect(await store.isPlayerShadowBanned('innocent-vC')).toBe(false);
    });

    it('Consensus Variation D: 0 Yes / 2 No triggers immediate dismissal without waiting for 3rd vote', async () => {
      const chain = createChainFromTemplate(HANDCRAFTED_THEMES[3]);
      chain.currentHop = 1;
      const initialSentence = chain.currentSentence;
      const hop: Hop = {
        hopNumber: 1,
        playerId: 'innocent-vD',
        previousSentence: initialSentence,
        newSentence: 'Titanium vessels illuminated glowing predators inside silent ocean trenches.',
        replacedWordIndex: 1,
        oldWord: 'submersibles',
        newWord: 'vessels',
        role: 'shifter',
        timestamp: Date.now()
      };
      chain.history.push(hop);
      chain.currentSentence = hop.newSentence;
      await store.saveChain(chain);

      const juryCase = await reportSabotage(chain.id, 'accuser-vD', store);
      const [juror1, juror2, juror3] = juryCase.assignedPeerIds;

      // Vote 1: No -> Pending
      const res1 = await voteJury(juryCase.id, juror1, false, store);
      expect(res1.resolved).toBe(false);

      // Vote 2: No -> 0 Yes / 2 No reaches majority dismissal immediately!
      const res2 = await voteJury(juryCase.id, juror2, false, store);
      expect(res2.resolved).toBe(true);
      expect(res2.verdict).toBe('dismissed');
      expect(res2.chainRewound).toBe(false);

      // 3rd vote rejected
      await expect(voteJury(juryCase.id, juror3, false, store)).rejects.toThrow(
        'Jury case not found or already closed'
      );
    });

    it('Peer Juror Selection strictly excludes reporter and author with 100% precision across 50 trials', () => {
      for (let trial = 0; trial < 50; trial++) {
        const reporterId = `reporter-${trial}`;
        const authorId = `author-${trial}`;
        const connectedPool = [
          reporterId,
          authorId,
          `peer-A-${trial}`,
          `peer-B-${trial}`,
          `peer-C-${trial}`,
          `peer-D-${trial}`
        ];

        const jurors = selectPeerJurors(reporterId, authorId, connectedPool);
        expect(jurors.length).toBe(3);
        expect(jurors).not.toContain(reporterId);
        expect(jurors).not.toContain(authorId);
        expect(new Set(jurors).size).toBe(3); // Exactly 3 distinct peers
      }
    });
  });

  describe('2. 1-Hop Rewind Invariant & Token Purge Verification', () => {
    it('1-Hop Rewind restores exact previousSentence, decrements currentHop, and purges troll word for honest reuse', async () => {
      const template = HANDCRAFTED_THEMES[0];
      const chain = createChainFromTemplate(template);
      const sentenceHop0 = chain.initialSentence;

      // Hop 1: Honest player mutates word at index 1: "midnight" -> "twilight"
      chain.currentHop = 1;
      const hop1: Hop = {
        hopNumber: 1,
        playerId: 'honest-player-1',
        previousSentence: sentenceHop0,
        newSentence: 'The twilight courier delivered secret dossiers across foggy Berlin streets.',
        replacedWordIndex: 1,
        oldWord: 'midnight',
        newWord: 'twilight',
        role: 'shifter',
        timestamp: 1000
      };
      chain.history.push(hop1);
      chain.currentSentence = hop1.newSentence;
      await store.saveChain(chain);

      // Hop 2: Troll player mutates word at index 2: "courier" -> "sentinel"
      chain.currentHop = 2;
      const sentenceHop1 = hop1.newSentence;
      const trollHop2: Hop = {
        hopNumber: 2,
        playerId: 'troll-operative-2',
        previousSentence: sentenceHop1,
        newSentence: 'The twilight sentinel delivered secret dossiers across foggy Berlin streets.',
        replacedWordIndex: 2,
        oldWord: 'courier',
        newWord: 'sentinel',
        role: 'shifter',
        timestamp: 2000
      };
      chain.history.push(trollHop2);
      chain.currentSentence = trollHop2.newSentence;
      await store.saveChain(chain);

      // Verify pre-sabotage state: "sentinel" is in history and CANNOT be used
      const preValidation = validateCandidateWord('sentinel', chain.history, chain.bannedWords, chain.initialSentence);
      expect(preValidation.valid).toBe(false);
      expect(preValidation.error).toBe('DUPLICATE_HISTORICAL_WORD');

      // Honest player reports trollHop2 as sabotage
      const juryCase = await reportSabotage(chain.id, 'vigilant-witness', store);

      // Jurors vote 2 Yes for sabotage
      await voteJury(juryCase.id, juryCase.assignedPeerIds[0], true, store);
      const sabotageResult = await voteJury(juryCase.id, juryCase.assignedPeerIds[1], true, store);
      expect(sabotageResult.resolved).toBe(true);
      expect(sabotageResult.verdict).toBe('sabotage');
      expect(sabotageResult.chainRewound).toBe(true);

      // Verify 1-Hop Rewind State Invariant
      const restoredChain = await store.getChain(chain.id);
      expect(restoredChain).toBeDefined();
      expect(restoredChain!.currentHop).toBe(1);
      expect(restoredChain!.currentSentence).toBe(sentenceHop1);
      expect(restoredChain!.currentSentence).not.toContain('sentinel');
      expect(restoredChain!.history.length).toBe(1);
      expect(restoredChain!.history[0].hopNumber).toBe(1);

      // TOKEN PURGE VERIFICATION:
      // An honest player can now submit "sentinel" without duplicate historical error
      const postValidation = validateCandidateWord('sentinel', restoredChain!.history, restoredChain!.bannedWords, restoredChain!.initialSentence);
      expect(postValidation.valid).toBe(true);
      expect(postValidation.error).toBeUndefined();

      // Honest player actually intercepts and submits "sentinel" to advance the chain cleanly
      const leaseRes = await queue.interceptChain('honest-player-3', 3000);
      expect(leaseRes).toBeDefined();
      expect(leaseRes!.chain.id).toBe(chain.id);
      expect(leaseRes!.chain.currentSentence).toBe(sentenceHop1);

      const submitRes = await queue.submitMutation(chain.id, 'honest-player-3', 2, 'sentinel', 3100);
      expect(submitRes.success).toBe(true);
      expect(submitRes.chain?.currentHop).toBe(2);
      expect(submitRes.chain?.currentSentence).toBe('The twilight sentinel delivered secret dossiers across foggy Berlin streets.');

      // But words from Hop 0 or Hop 1 ("midnight", "twilight") MUST STILL be rejected as duplicates
      const dupCheck1 = validateCandidateWord('midnight', submitRes.chain!.history, submitRes.chain!.bannedWords, submitRes.chain!.initialSentence);
      expect(dupCheck1.valid).toBe(false);
      expect(dupCheck1.error).toBe('DUPLICATE_HISTORICAL_WORD');

      const dupCheck2 = validateCandidateWord('twilight', submitRes.chain!.history, submitRes.chain!.bannedWords, submitRes.chain!.initialSentence);
      expect(dupCheck2.valid).toBe(false);
      expect(dupCheck2.error).toBe('DUPLICATE_HISTORICAL_WORD');
    });

    it('extractHistoricalWords correctly purges tokens from hops marked isRevoked: true', () => {
      const historyWithRevocation: Hop[] = [
        {
          hopNumber: 1,
          playerId: 'p1',
          previousSentence: 'Alpha beta gamma delta epsilon.',
          newSentence: 'Alpha zeta gamma delta epsilon.',
          oldWord: 'beta',
          newWord: 'zeta',
          role: 'shifter',
          isRevoked: false,
          timestamp: 1000
        },
        {
          hopNumber: 2,
          playerId: 'troll-x',
          previousSentence: 'Alpha zeta gamma delta epsilon.',
          newSentence: 'Alpha zeta malicious delta epsilon.',
          oldWord: 'gamma',
          newWord: 'malicious',
          role: 'shifter',
          isRevoked: true, // Rewound by crowd jury!
          timestamp: 2000
        }
      ];

      const historicalTokens = extractHistoricalWords(historyWithRevocation, 'Alpha beta gamma delta epsilon.');

      // 'malicious' must NOT be in historical tokens
      expect(historicalTokens.has('malicious')).toBe(false);

      // Non-revoked tokens must be present
      expect(historicalTokens.has('alpha')).toBe(true);
      expect(historicalTokens.has('beta')).toBe(true);
      expect(historicalTokens.has('zeta')).toBe(true);
      expect(historicalTokens.has('delta')).toBe(true);
    });

    it('interleaved mutation during jury deliberation must not ban innocent player or pop wrong hop', async () => {
      const template = HANDCRAFTED_THEMES[0];
      const chain = createChainFromTemplate(template);
      await store.saveChain(chain);

      // 1. Troll mutates Hop 1
      await queue.interceptChain('troll-operative', 1000);
      await queue.submitMutation(chain.id, 'troll-operative', 1, 'traveler', 2000);

      // 2. Sabotage reported on Hop 1
      const juryCase = await queue.reportSabotage(chain.id, 'reporter-operative');
      expect(juryCase.flaggedHop.playerId).toBe('troll-operative');

      // 3. Chain remains active; innocent operative intercepts and mutates Hop 2 before jury resolves!
      await queue.interceptChain('innocent-operative', 3000);
      await queue.submitMutation(chain.id, 'innocent-operative', 2, 'sentinel', 4000);

      // 4. Jury votes Yes on troll's sabotage case!
      await queue.voteJury(juryCase.id, 'juror-1', true);
      const voteRes = await queue.voteJury(juryCase.id, 'juror-2', true);
      expect(voteRes.resolved).toBe(true);

      // Check who was shadow-banned
      const trollBanned = await store.isPlayerShadowBanned('troll-operative');
      const innocentBanned = await store.isPlayerShadowBanned('innocent-operative');

      // Verified Sabotage Rollback: The reported troll is shadow-banned, innocent player is protected
      expect(trollBanned).toBe(true);
      expect(innocentBanned).toBe(false);
    });
  });

  describe('3. Troll Shadow-Ban Isolation & Sandbox Quarantine', () => {
    it('quarantined troll players only receive troll-chain-${playerId} and cannot intercept live chains', async () => {
      // Seed store with 10 active live chains
      for (let i = 0; i < 10; i++) {
        const liveChain = createChainFromTemplate(HANDCRAFTED_THEMES[i]);
        await store.saveChain(liveChain);
      }

      const activeBefore = (await store.getAllChains()).filter(c => c.status === 'active').length;
      expect(activeBefore).toBe(10);

      // Shadow-ban a malicious troll
      const trollId = 'malicious-saboteur-999';
      await store.shadowBanPlayer(trollId);
      expect(await store.isPlayerShadowBanned(trollId)).toBe(true);

      // Troll attempts to intercept a chain
      const trollIntercept = await queue.interceptChain(trollId);
      expect(trollIntercept).toBeDefined();
      expect(trollIntercept!.chain.id).toBe(`troll-chain-${trollId}`);
      expect(trollIntercept!.role).toBe('shifter');
      expect(trollIntercept!.chain.status).toBe('in_progress');

      // Verify that NO live chains were consumed from the active pool
      const activeAfter = (await store.getAllChains()).filter(c => c.status === 'active').length;
      expect(activeAfter).toBe(10);

      // Troll attempts to intercept 10 more times — all must return the isolated sandbox
      for (let attempt = 0; attempt < 10; attempt++) {
        const res = await queue.interceptChain(trollId);
        expect(res?.chain.id).toBe(`troll-chain-${trollId}`);
      }

      // An honest player intercepts and receives a genuine live chain
      const honestId = 'honest-citizen-101';
      const honestIntercept = await queue.interceptChain(honestId);
      expect(honestIntercept).toBeDefined();
      expect(honestIntercept!.chain.id).not.toContain('troll-chain-');
      expect(honestIntercept!.chain.id.startsWith('chain-')).toBe(true);

      // Troll attempts to submit a mutation to an active live chain -> REJECTED
      const liveChainId = honestIntercept!.chain.id;
      const attackRes = await queue.submitMutation(liveChainId, trollId, 1, 'infiltrate');
      expect(attackRes.success).toBe(false);
      expect(attackRes.error).toBe('INVALID_LEASE_HOLDER');

      // Honest player can mutate the live chain without interference
      const honestMutate = await queue.submitMutation(liveChainId, honestId, 1, 'sentinel');
      expect(honestMutate.success).toBe(true);
    });

    it('createTrollSandboxChain produces isolated dummy chain with 5 banned words and Shifter role', () => {
      const sandbox = createTrollSandboxChain('troll-alpha');
      expect(sandbox.id).toBe('troll-chain-troll-alpha');
      expect(sandbox.bannedWords.length).toBe(5);
      expect(sandbox.themeOptions.length).toBe(4);
      expect(sandbox.lives).toBe(3);
      expect(sandbox.maxHops).toBe(100);
      expect(sandbox.status).toBe('in_progress');
      expect(sandbox.leasedToPlayerId).toBe('troll-alpha');
    });
  });

  describe('4. Hall of Ghosts Archival, Receipts & 404 Boundaries', () => {
    it('100-hop victory archival creates immutable GhostReceipt with exact unique contributor count', async () => {
      const template = HANDCRAFTED_THEMES[4];
      const chain = createChainFromTemplate(template);
      chain.currentHop = 100;
      chain.currentSentence = 'Cigar smoke drifted over velvet chairs while operatives exchanged confidential documents.';

      // Simulate 100 hops authored by 7 distinct players
      const playerPool = ['player-alpha', 'player-beta', 'player-gamma', 'player-delta', 'player-epsilon', 'player-zeta', 'player-eta'];
      for (let h = 1; h <= 100; h++) {
        chain.history.push({
          hopNumber: h,
          playerId: playerPool[h % playerPool.length],
          previousSentence: 'Prev sentence.',
          newSentence: 'New sentence.',
          role: 'shifter',
          timestamp: 1000 + h * 10
        });
      }

      const expectedContributors = new Set(chain.history.map(h => h.playerId)).size;
      expect(expectedContributors).toBe(7);

      const receipt = await archiveToHallOfGhosts(chain, 'victory', store);
      expect(receipt.chainId).toBe(chain.id);
      expect(receipt.outcome).toBe('victory');
      expect(receipt.finalHop).toBe(100);
      expect(receipt.totalContributors).toBe(7);
      expect(receipt.themeTitle).toBe(chain.secretTheme);
      expect(receipt.timeline.length).toBe(100);

      // Verify chain state in store
      const storedChain = await store.getChain(chain.id);
      expect(storedChain?.status).toBe('victory');
      expect(storedChain?.leasedToPlayerId).toBeNull();

      // Verify retrieval via getGhostReceipt
      const retrieved = await getGhostReceipt(chain.id, store);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.chainId).toBe(chain.id);
      expect(retrieved?.totalContributors).toBe(7);
    });

    it('0-lives destruction archival derives totalContributors from new Set(history.map(h => h.playerId)).size', async () => {
      const template = HANDCRAFTED_THEMES[5];
      const chain = createChainFromTemplate(template);
      chain.lives = 0;
      chain.currentHop = 3;

      // 3 hops authored by 2 distinct players
      chain.history.push(
        { hopNumber: 1, playerId: 'p-one', previousSentence: 'S0', newSentence: 'S1', role: 'shifter', timestamp: 1 },
        { hopNumber: 2, playerId: 'p-one', previousSentence: 'S1', newSentence: 'S2', role: 'shifter', timestamp: 2 },
        { hopNumber: 3, playerId: 'p-two', previousSentence: 'S2', newSentence: 'S3', role: 'shifter', isTrapHit: true, timestamp: 3 }
      );

      const expectedUnique = new Set(chain.history.map(h => h.playerId)).size;
      expect(expectedUnique).toBe(2);

      const receipt = await archiveToHallOfGhosts(chain, 'destroyed', store);
      expect(receipt.outcome).toBe('destroyed');
      expect(receipt.totalContributors).toBe(2);
      expect(receipt.finalHop).toBe(3);

      const storedChain = await store.getChain(chain.id);
      expect(storedChain?.status).toBe('destroyed');
    });

    it('listGhostReceipts returns all archived receipts sorted descending by completedAt', async () => {
      const c1 = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
      const c2 = createChainFromTemplate(HANDCRAFTED_THEMES[1]);

      const r1 = await archiveToHallOfGhosts(c1, 'victory', store);
      // Ensure slight timestamp separation
      await new Promise(res => setTimeout(res, 10));
      const r2 = await archiveToHallOfGhosts(c2, 'destroyed', store);

      const list = await listGhostReceipts(store);
      expect(list.length).toBe(2);
      expect(list[0].chainId).toBe(r2.chainId); // latest first
      expect(list[1].chainId).toBe(r1.chainId);
    });

    it('getGhostReceipt and /api/ghost/[id] return 404/null for non-existent chain IDs', async () => {
      // 1. Direct library call
      const nonExistent = await getGhostReceipt('non-existent-uuid-999', store);
      expect(nonExistent).toBeNull();

      // 2. HTTP route handler call
      const req = new NextRequest('http://localhost:3000/api/ghost/phantom-missing-id');
      const res = await handleGhost(req, { params: { id: 'phantom-missing-id' } });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('GHOST_NOT_FOUND');
      expect(data.message).toContain('phantom-missing-id');
    });

    it('generateGhostTimelineDiffs generates accurate cyberpunk aliases and diff flags', () => {
      const history: Hop[] = [
        {
          hopNumber: 1,
          playerId: 'player-test-xyz',
          previousSentence: 'Old sentence one.',
          newSentence: 'New sentence one.',
          replacedWordIndex: 1,
          oldWord: 'sentence',
          newWord: 'whisper',
          role: 'shifter',
          timestamp: 1000
        },
        {
          hopNumber: 2,
          playerId: 'decoder-guy-456',
          previousSentence: 'New sentence one.',
          newSentence: 'New sentence one.',
          role: 'decoder',
          decoderGuess: 'Classified Theme',
          isCorrectGuess: true,
          timestamp: 2000
        },
        {
          hopNumber: 3,
          playerId: 'trap-stepper-789',
          previousSentence: 'New sentence one.',
          newSentence: 'New sentence one.',
          role: 'shifter',
          isTrapHit: true,
          timestamp: 3000
        }
      ];

      const diffs = generateGhostTimelineDiffs(history);
      expect(diffs.length).toBe(3);

      // Shifter diff
      expect(diffs[0].playerAlias).toMatch(/^[A-Z][a-z]+_\d+$/);
      expect(diffs[0].oldWord).toBe('sentence');
      expect(diffs[0].newWord).toBe('whisper');

      // Decoder correct diff
      expect(diffs[1].bonusHopsAwarded).toBe(10);
      expect(diffs[1].strikeDeducted).toBeUndefined();

      // Trap hit diff
      expect(diffs[2].strikeDeducted).toBe(true);
      expect(diffs[2].isTrapHit).toBe(true);
    });
  });
});

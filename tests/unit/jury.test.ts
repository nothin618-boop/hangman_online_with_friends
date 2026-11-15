import { describe, it, expect, beforeEach } from 'vitest';
import { reportSabotage, voteJury, selectPeerJurors, isTroll, createTrollSandboxChain } from '@/lib/jury';
import { MemoryWhisperStore } from '@/lib/store';
import { Chain, Hop } from '@/lib/types';
import { createChainFromTemplate } from '@/lib/spawner';
import { HANDCRAFTED_THEMES } from '@/lib/prompts';

describe('Instant Crowd Jury Unit Suite (src/lib/jury.ts)', () => {
  let store: MemoryWhisperStore;

  beforeEach(async () => {
    store = MemoryWhisperStore.getInstance();
    await store.clear();
  });

  it('selectPeerJurors excludes reporter and author and always returns exactly 3 peers', () => {
    const peers = selectPeerJurors('reporter-id', 'author-id', ['p1', 'reporter-id', 'p2', 'author-id', 'p3']);
    expect(peers.length).toBe(3);
    expect(peers).not.toContain('reporter-id');
    expect(peers).not.toContain('author-id');
  });

  it('selectPeerJurors generates fallbacks if connected peer pool is empty', () => {
    const peers = selectPeerJurors('reporter-1', 'author-1', []);
    expect(peers.length).toBe(3);
    expect(peers).not.toContain('reporter-1');
    expect(peers).not.toContain('author-1');
  });

  it('rejects sabotage report on chain at Hop 0', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    await store.saveChain(chain);

    await expect(reportSabotage(chain.id, 'player-1', store)).rejects.toThrow(
      'Cannot report sabotage on chain without mutation history'
    );
  });

  it('rejects sabotage report on a Decoder deduction hop', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.currentHop = 10;
    const decoderHop: Hop = {
      hopNumber: 10,
      playerId: 'decoder-guy',
      previousSentence: chain.initialSentence,
      newSentence: chain.initialSentence,
      role: 'decoder',
      decoderGuess: 'Some Theme',
      isCorrectGuess: true,
      timestamp: 1000,
    };
    chain.history.push(decoderHop);
    await store.saveChain(chain);

    await expect(reportSabotage(chain.id, 'observer-1', store)).rejects.toThrow(
      'Cannot report sabotage on decoder hop'
    );
  });

  it('creates pending JuryCase on valid Shifter mutation and assigns 3 peers', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.currentHop = 1;
    const shifterHop: Hop = {
      hopNumber: 1,
      playerId: 'bad-troll',
      previousSentence: chain.initialSentence,
      newSentence: 'Malicious broken sentence.',
      replacedWordIndex: 2,
      oldWord: 'operative',
      newWord: 'gibberish',
      role: 'shifter',
      timestamp: 1000,
    };
    chain.history.push(shifterHop);
    await store.saveChain(chain);

    const juryCase = await reportSabotage(chain.id, 'vigilant-reporter', store);
    expect(juryCase).toBeDefined();
    expect(juryCase.status).toBe('pending');
    expect(juryCase.flaggedWord).toBe('gibberish');
    expect(juryCase.assignedPeerIds.length).toBe(3);
    expect(juryCase.assignedPeerIds).not.toContain('bad-troll');
    expect(juryCase.assignedPeerIds).not.toContain('vigilant-reporter');

    const storedCase = await store.getJuryCase(juryCase.id);
    expect(storedCase?.id).toBe(juryCase.id);
  });

  it('evaluates consensus: 2 Yes votes confirm sabotage, rewind 1 hop, and shadow-ban offender', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    const originalSentence = chain.currentSentence;
    chain.currentHop = 1;

    const trollHop: Hop = {
      hopNumber: 1,
      playerId: 'malicious-troll',
      previousSentence: originalSentence,
      newSentence: 'Corrupted sentence payload.',
      replacedWordIndex: 1,
      oldWord: 'shadow',
      newWord: 'broken',
      role: 'shifter',
      timestamp: 1000,
    };
    chain.history.push(trollHop);
    chain.currentSentence = 'Corrupted sentence payload.';
    await store.saveChain(chain);

    const juryCase = await reportSabotage(chain.id, 'reporter-1', store);

    // Vote 1: Yes -> still pending
    const res1 = await voteJury(juryCase.id, 'juror-1', true, store);
    expect(res1.resolved).toBe(false);

    // Vote 2: Yes -> 2/3 consensus reached!
    const res2 = await voteJury(juryCase.id, 'juror-2', true, store);
    expect(res2.resolved).toBe(true);
    expect(res2.verdict).toBe('sabotage');
    expect(res2.chainRewound).toBe(true);
    expect(res2.trollShadowBanned).toBe(true);

    // Verify 1-Hop Rewind in store
    const rewoundChain = await store.getChain(chain.id);
    expect(rewoundChain?.currentHop).toBe(0);
    expect(rewoundChain?.currentSentence).toBe(originalSentence);
    expect(rewoundChain?.history.length).toBe(0);

    // Verify Offender Shadow-Banned
    expect(await store.isPlayerShadowBanned('malicious-troll')).toBe(true);
  });

  it('evaluates consensus: 2 No votes dismiss report and retain mutation without banning', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.currentHop = 1;
    const innocentHop: Hop = {
      hopNumber: 1,
      playerId: 'innocent-player',
      previousSentence: chain.initialSentence,
      newSentence: 'Legitimate mutation sentence.',
      replacedWordIndex: 1,
      newWord: 'sentinel',
      role: 'shifter',
      timestamp: 1000,
    };
    chain.history.push(innocentHop);
    chain.currentSentence = 'Legitimate mutation sentence.';
    await store.saveChain(chain);

    const juryCase = await reportSabotage(chain.id, 'false-accuser', store);

    // Vote 1: No
    const res1 = await voteJury(juryCase.id, 'juror-1', false, store);
    expect(res1.resolved).toBe(false);

    // Vote 2: No -> Dismissed
    const res2 = await voteJury(juryCase.id, 'juror-2', false, store);
    expect(res2.resolved).toBe(true);
    expect(res2.verdict).toBe('dismissed');
    expect(res2.chainRewound).toBe(false);
    expect(res2.trollShadowBanned).toBe(false);

    // Verify chain is NOT rewound
    const keptChain = await store.getChain(chain.id);
    expect(keptChain?.currentHop).toBe(1);
    expect(keptChain?.currentSentence).toBe('Legitimate mutation sentence.');

    // Verify player is NOT banned
    expect(await store.isPlayerShadowBanned('innocent-player')).toBe(false);
  });

  it('rejects voting on already closed jury cases', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.currentHop = 1;
    chain.history.push({
      hopNumber: 1,
      playerId: 'p1',
      previousSentence: chain.initialSentence,
      newSentence: 'Mutated.',
      role: 'shifter',
      timestamp: 1000,
    });
    await store.saveChain(chain);

    const juryCase = await reportSabotage(chain.id, 'rep', store);
    await voteJury(juryCase.id, 'j1', true, store);
    await voteJury(juryCase.id, 'j2', true, store); // Now closed as consensus_sabotage

    await expect(voteJury(juryCase.id, 'j3', true, store)).rejects.toThrow(
      'Jury case not found or already closed'
    );
  });

  it('generates isolated mock sandbox chain for troll', () => {
    const trollChain = createTrollSandboxChain('troll-xyz');
    expect(trollChain.id).toBe('troll-chain-troll-xyz');
    expect(trollChain.status).toBe('in_progress');
    expect(trollChain.leasedToPlayerId).toBe('troll-xyz');
    expect(trollChain.bannedWords.length).toBe(5);
  });
});

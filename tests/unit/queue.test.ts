import { describe, it, expect, beforeEach } from 'vitest';
import { QueueEngine, sanitizeChain } from '@/lib/queue';
import { MemoryWhisperStore } from '@/lib/store';
import { Chain } from '@/lib/types';
import { createChainFromTemplate } from '@/lib/spawner';
import { HANDCRAFTED_THEMES } from '@/lib/prompts';

describe('Queue Engine Unit Suite (src/lib/queue.ts)', () => {
  let store: MemoryWhisperStore;
  let queue: QueueEngine;

  beforeEach(async () => {
    store = MemoryWhisperStore.getInstance();
    await store.clear();
    queue = new QueueEngine(store);
  });

  it('sanitizes chain payload strictly excluding secretTheme and bannedWords', () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    const sanitizedShifter = sanitizeChain(chain, 'shifter');

    expect((sanitizedShifter as any).secretTheme).toBeUndefined();
    expect((sanitizedShifter as any).bannedWords).toBeUndefined();
    expect(sanitizedShifter.themeOptions).toBeUndefined();
    expect(sanitizedShifter.role).toBe('shifter');

    const sanitizedDecoder = sanitizeChain(chain, 'decoder');
    expect((sanitizedDecoder as any).secretTheme).toBeUndefined();
    expect((sanitizedDecoder as any).bannedWords).toBeUndefined();
    expect(sanitizedDecoder.themeOptions).toBeDefined();
    expect(sanitizedDecoder.themeOptions?.length).toBe(4);
    expect(sanitizedDecoder.role).toBe('decoder');
  });

  it('intercepts active chain and grants 60s lease with shifter role at hop 0', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    await store.saveChain(chain);

    const now = 100000;
    const result = await queue.interceptChain('player-1', now);

    expect(result).toBeDefined();
    expect(result?.role).toBe('shifter');
    expect(result?.chain.status).toBe('in_progress');
    expect(result?.chain.leaseExpiresAt).toBe(now + 60000);

    const stored = await store.getChain(chain.id);
    expect(stored?.status).toBe('in_progress');
    expect(stored?.leasedToPlayerId).toBe('player-1');
  });

  it('auto-spawns chains when active queue is empty upon intercept', async () => {
    expect(await store.getActiveChainsCount()).toBe(0);

    const result = await queue.interceptChain('player-new');
    expect(result).toBeDefined();
    expect(result?.chain.id).toBeDefined();

    // Pool should now be populated with active chains
    const activeCount = await store.getActiveChainsCount();
    expect(activeCount).toBeGreaterThanOrEqual(49);
  });

  it('guarantees mutual exclusion: two players intercept distinct chains', async () => {
    const chain1 = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    const chain2 = createChainFromTemplate(HANDCRAFTED_THEMES[1]);
    await store.saveChain(chain1);
    await store.saveChain(chain2);

    const res1 = await queue.interceptChain('p1');
    const res2 = await queue.interceptChain('p2');

    expect(res1?.chain.id).not.toBe(res2?.chain.id);
  });

  it('returns existing unexpired lease if same player calls intercept again', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    await store.saveChain(chain);

    const res1 = await queue.interceptChain('p1', 1000);
    const res2 = await queue.interceptChain('p1', 2000);

    expect(res1?.chain.id).toBe(res2?.chain.id);
  });

  it('routes shadow-banned players to isolated sandbox chain', async () => {
    await store.shadowBanPlayer('troll-user');

    const result = await queue.interceptChain('troll-user');
    expect(result).toBeDefined();
    expect(result?.chain.id).toContain('troll-chain-troll-user');
    expect(result?.role).toBe('shifter');
  });

  it('processes a clean Shifter mutation successfully', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]); // Initial sentence contains words like 'operative'
    await store.saveChain(chain);

    await queue.interceptChain('player-1', 1000);
    const tokens = chain.currentSentence.split(/\s+/);
    // Replace index 1 with 'infiltrator'
    const mutResult = await queue.submitMutation(chain.id, 'player-1', 1, 'infiltrator', 2000);

    expect(mutResult.success).toBe(true);
    expect(mutResult.isTrap).toBe(false);
    expect(mutResult.chain?.currentHop).toBe(1);
    expect(mutResult.chain?.currentSentence).toContain('infiltrator');
    expect(mutResult.chain?.status).toBe('active');
    expect(mutResult.chain?.leasedToPlayerId).toBeNull();

    // Player streak should increment
    expect(await store.getPlayerStreak('player-1')).toBe(1);
  });

  it('rejects mutation if lease is held by another player', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    await store.saveChain(chain);
    await queue.interceptChain('p1', 1000);

    const res = await queue.submitMutation(chain.id, 'p2-imposter', 0, 'infiltrator', 2000);
    expect(res.success).toBe(false);
    expect(res.error).toBe('INVALID_LEASE_HOLDER');
  });

  it('rejects mutation and unlocks chain if 60s lease expired', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    await store.saveChain(chain);
    await queue.interceptChain('p1', 1000); // Expires at 61000

    const res = await queue.submitMutation(chain.id, 'p1', 0, 'infiltrator', 65000);
    expect(res.success).toBe(false);
    expect(res.error).toBe('LEASE_EXPIRED');

    const updated = await store.getChain(chain.id);
    expect(updated?.status).toBe('active');
    expect(updated?.leasedToPlayerId).toBeNull();
  });

  it('handles trap word triggers: deducts strike and resets streak', async () => {
    const template = HANDCRAFTED_THEMES[0];
    const chain = createChainFromTemplate(template);
    await store.saveChain(chain);
    await queue.interceptChain('p1', 1000);

    const trapWord = template.bannedWords[0];
    const res = await queue.submitMutation(chain.id, 'p1', 0, trapWord, 2000);

    expect(res.success).toBe(true);
    expect(res.isTrap).toBe(true);
    expect(res.strikeDeducted).toBe(true);
    expect(res.livesRemaining).toBe(2);
    expect(res.chain?.currentHop).toBe(1);

    expect(await store.getPlayerStreak('p1')).toBe(0);
  });

  it('destroys chain and archives to Hall of Ghosts when lives hit 0', async () => {
    const template = HANDCRAFTED_THEMES[0];
    const chain = createChainFromTemplate(template);
    chain.lives = 1;
    await store.saveChain(chain);

    await queue.interceptChain('p1', 1000);
    const trapWord = template.bannedWords[0];
    const res = await queue.submitMutation(chain.id, 'p1', 0, trapWord, 2000);

    expect(res.isDestroyed).toBe(true);
    expect(res.chain?.status).toBe('destroyed');

    const ghost = await store.getGhostReceipt(chain.id);
    expect(ghost).toBeDefined();
    expect(ghost?.outcome).toBe('destroyed');
  });

  it('awards victory and archives when effective hops reach 100', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.currentHop = 99;
    await store.saveChain(chain);

    await queue.interceptChain('p1', 1000);
    const res = await queue.submitMutation(chain.id, 'p1', 0, 'sentinel', 2000);

    expect(res.isVictory).toBe(true);
    expect(res.chain?.status).toBe('victory');

    const ghost = await store.getGhostReceipt(chain.id);
    expect(ghost?.outcome).toBe('victory');
    expect(ghost?.finalHop).toBe(100);
  });

  it('processes Decoder guesses correctly (+10 bonus hops and +3 streak on win, strike on loss)', async () => {
    const template = HANDCRAFTED_THEMES[0];
    const chain = createChainFromTemplate(template);
    chain.currentHop = 10;
    chain.history.push({
      hopNumber: 9,
      playerId: 'prev-p',
      previousSentence: chain.initialSentence,
      newSentence: chain.initialSentence,
      role: 'shifter',
      timestamp: 500,
    });
    await store.saveChain(chain);

    // 1. Correct guess
    const intercept1 = await queue.interceptChain('decoder-p1', 1000);
    expect(intercept1?.role).toBe('decoder');

    const winResult = await queue.submitDecoderGuess(chain.id, 'decoder-p1', template.theme, 2000);
    expect(winResult.success).toBe(true);
    expect(winResult.isCorrect).toBe(true);
    expect(winResult.bonusAwarded).toBe(10);
    expect(winResult.chain?.bonusHops).toBe(10);
    expect(await store.getPlayerStreak('decoder-p1')).toBe(3);

    // 2. Incorrect guess on another chain
    await store.clear();
    const chain2 = createChainFromTemplate(HANDCRAFTED_THEMES[1]);
    chain2.currentHop = 10;
    chain2.history.push({
      hopNumber: 9,
      playerId: 'prev-p',
      previousSentence: chain2.initialSentence,
      newSentence: chain2.initialSentence,
      role: 'shifter',
      timestamp: 500,
    });
    await store.saveChain(chain2);
    const intercept2 = await queue.interceptChain('decoder-p2', 1000);
    expect(intercept2?.role).toBe('decoder');
    expect(intercept2?.chain.id).toBe(chain2.id);

    const loseResult = await queue.submitDecoderGuess(chain2.id, 'decoder-p2', 'Completely Wrong Theme', 2000);
    expect(loseResult.success).toBe(true);
    expect(loseResult.isCorrect).toBe(false);
    expect(loseResult.livesRemaining).toBe(2);
    expect(await store.getPlayerStreak('decoder-p2')).toBe(0);
  });

  it('reclaims expired leases during sweep', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'p-timeout';
    chain.leaseExpiresAt = 50000;
    await store.saveChain(chain);

    const reclaimed = await queue.reclaimExpiredLeases(60000);
    expect(reclaimed).toBe(1);

    const updated = await store.getChain(chain.id);
    expect(updated?.status).toBe('active');
    expect(updated?.leasedToPlayerId).toBeNull();
  });
});

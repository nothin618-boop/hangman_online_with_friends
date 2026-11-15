import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryWhisperStore, getStore } from '@/lib/store';
import { Chain, GhostReceipt, JuryCase } from '@/lib/types';

describe('State Store Unit Suite (src/lib/store.ts)', () => {
  let store: MemoryWhisperStore;

  const mockChain: Chain = {
    id: 'chain-test-1',
    secretTheme: 'Cold War Espionage',
    themeOptions: ['Cold War Espionage', 'Decoy A', 'Decoy B', 'Decoy C'],
    bannedWords: ['agent', 'soviet', 'spy', 'embassy', 'dossier'],
    initialSentence: 'The shadow operative delivered classified dossiers at midnight.',
    currentSentence: 'The shadow operative delivered classified dossiers at midnight.',
    currentHop: 0,
    bonusHops: 0,
    lives: 3,
    maxHops: 100,
    history: [],
    status: 'active',
    leasedToPlayerId: null,
    leaseExpiresAt: null,
    createdAt: 1000000,
  };

  beforeEach(async () => {
    store = MemoryWhisperStore.getInstance();
    await store.clear();
  });

  it('verifies singleton factory getStore() returns MemoryWhisperStore instance', () => {
    const factoryStore = getStore();
    expect(factoryStore).toBeDefined();
    expect(factoryStore).toBe(store);
  });

  it('persists and retrieves chains with deep clone isolation', async () => {
    await store.saveChain(mockChain);
    const retrieved = await store.getChain('chain-test-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('chain-test-1');
    expect(retrieved?.secretTheme).toBe('Cold War Espionage');

    // Mutating retrieved object should not corrupt stored state
    retrieved!.currentHop = 99;
    const reFetched = await store.getChain('chain-test-1');
    expect(reFetched?.currentHop).toBe(0);
  });

  it('supports getChainById as alias for getChain', async () => {
    await store.saveChain(mockChain);
    const retrieved = await store.getChainById('chain-test-1');
    expect(retrieved?.id).toBe('chain-test-1');
  });

  it('filters active chains and tracks active queue counts correctly', async () => {
    await store.saveChain(mockChain);
    const leasedChain: Chain = {
      ...mockChain,
      id: 'chain-test-2',
      status: 'in_progress',
      leasedToPlayerId: 'player-x',
      leaseExpiresAt: Date.now() + 60000,
    };
    await store.saveChain(leasedChain);

    const activeChains = await store.getActiveChains();
    expect(activeChains.length).toBe(1);
    expect(activeChains[0].id).toBe('chain-test-1');

    const activeCount = await store.getActiveChainsCount();
    expect(activeCount).toBe(1);

    const leasedChains = await store.getLeasedChains();
    expect(leasedChains.length).toBe(1);
    expect(leasedChains[0].id).toBe('chain-test-2');
  });

  it('pops active chains atomically in FIFO order', async () => {
    const chain1 = { ...mockChain, id: 'chain-fifo-1' };
    const chain2 = { ...mockChain, id: 'chain-fifo-2' };
    await store.saveChain(chain1);
    await store.saveChain(chain2);

    const first = await store.popActiveChain();
    expect(first?.id).toBe('chain-fifo-1');

    const second = await store.popActiveChain();
    expect(second?.id).toBe('chain-fifo-2');

    const third = await store.popActiveChain();
    expect(third).toBeNull();
  });

  it('re-queues active chains to front of queue', async () => {
    const chain1 = { ...mockChain, id: 'chain-1' };
    const chain2 = { ...mockChain, id: 'chain-2' };
    await store.saveChain(chain1);
    await store.saveChain(chain2);

    await store.popActiveChain(); // pops chain-1
    await store.requeueActiveChain('chain-1');

    const next = await store.popActiveChain();
    expect(next?.id).toBe('chain-1');
  });

  it('detects and releases expired leases', async () => {
    const past = Date.now() - 5000;
    const expiredChain: Chain = {
      ...mockChain,
      id: 'chain-expired',
      status: 'in_progress',
      leasedToPlayerId: 'player-slow',
      leaseExpiresAt: past,
    };
    await store.saveChain(expiredChain);

    const expired = await store.getExpiredLeases(Date.now());
    expect(expired.length).toBe(1);
    expect(expired[0].id).toBe('chain-expired');

    await store.releaseLease('chain-expired');
    const released = await store.getChain('chain-expired');
    expect(released?.status).toBe('active');
    expect(released?.leasedToPlayerId).toBeNull();
    expect(released?.leaseExpiresAt).toBeNull();
  });

  it('stores and retrieves Hall of Ghosts receipts', async () => {
    const receipt: GhostReceipt = {
      chainId: 'chain-ghost-1',
      themeTitle: 'Cold War Espionage',
      outcome: 'victory',
      finalHop: 100,
      totalContributors: 15,
      initialSentence: 'Initial prompt.',
      finalSentence: 'Final prompt after 100 hops.',
      timeline: [],
      completedAt: 2000000,
    };

    await store.saveGhostReceipt(receipt);
    const retrieved = await store.getGhostReceipt('chain-ghost-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.outcome).toBe('victory');
    expect(retrieved?.totalContributors).toBe(15);

    const all = await store.getAllGhostReceipts();
    expect(all.length).toBe(1);
    expect(store.getHallOfGhosts().length).toBe(1);
  });

  it('stores, queries, and tracks pending jury cases', async () => {
    const juryCase: JuryCase = {
      id: 'case-100',
      chainId: 'chain-jury-1',
      flaggedHop: {
        hopNumber: 3,
        playerId: 'troll-1',
        previousSentence: 'Before.',
        newSentence: 'After.',
        newWord: 'exploit',
        role: 'shifter',
        timestamp: 1000,
      },
      flaggedWord: 'exploit',
      reporterPlayerId: 'reporter-1',
      assignedPeerIds: ['peer-1', 'peer-2', 'peer-3'],
      votes: {},
      status: 'pending',
      createdAt: 1000,
    };

    await store.saveJuryCase(juryCase);
    const retrieved = await store.getJuryCase('case-100');
    expect(retrieved?.flaggedWord).toBe('exploit');

    const pending = await store.getPendingJuryCaseForChain('chain-jury-1');
    expect(pending?.id).toBe('case-100');

    const activeCases = await store.getActiveJuryCases();
    expect(activeCases.length).toBe(1);
  });

  it('tracks troll shadow-bans across aliases', async () => {
    expect(await store.isPlayerShadowBanned('troll-42')).toBe(false);
    expect(await store.isShadowBanned('troll-42')).toBe(false);
    expect(await store.isTroll('troll-42')).toBe(false);

    await store.shadowBanPlayer('troll-42');
    expect(await store.isPlayerShadowBanned('troll-42')).toBe(true);
    expect(await store.isShadowBanned('troll-42')).toBe(true);
    expect(await store.isTroll('troll-42')).toBe(true);

    const banned = await store.getShadowBannedPlayers();
    expect(banned).toContain('troll-42');
    expect(await store.getTrolls()).toContain('troll-42');

    await store.removeShadowBan('troll-42');
    expect(await store.isPlayerShadowBanned('troll-42')).toBe(false);
  });

  it('manages player consecutive turn streaks correctly', async () => {
    expect(await store.getPlayerStreak('p1')).toBe(0);

    const s1 = await store.incrementPlayerStreak('p1', 1);
    expect(s1).toBe(1);

    const s2 = await store.incrementPlayerStreak('p1', 3);
    expect(s2).toBe(4);

    await store.setPlayerStreak('p1', 10);
    expect(await store.getPlayerStreak('p1')).toBe(10);

    await store.resetPlayerStreak('p1');
    expect(await store.getPlayerStreak('p1')).toBe(0);
  });

  it('records and queries player participation indexing', async () => {
    await store.recordPlayerParticipation('operative-1', 'chain-a');
    await store.recordPlayerParticipation('operative-1', 'chain-b');
    await store.recordPlayerParticipation('operative-1', 'chain-a'); // dedup

    const chains = await store.getPlayerChains('operative-1');
    expect(chains.length).toBe(2);
    expect(chains).toContain('chain-a');
    expect(chains).toContain('chain-b');
  });

  it('aggregates store stats correctly', async () => {
    await store.saveChain(mockChain);
    await store.saveChain({
      ...mockChain,
      id: 'leased-1',
      status: 'in_progress',
      leasedToPlayerId: 'p1',
      leaseExpiresAt: Date.now() + 60000,
    });
    await store.saveGhostReceipt({
      chainId: 'ghost-1',
      themeTitle: 'Ghost Theme',
      outcome: 'victory',
      finalHop: 100,
      totalContributors: 5,
      initialSentence: 'Init',
      finalSentence: 'Final',
      timeline: [],
      completedAt: 100,
    });
    await store.shadowBanPlayer('troll-99');

    const stats = await store.getStats();
    expect(stats.activeChains).toBe(1);
    expect(stats.leasedChains).toBe(1);
    expect(stats.archivedChains).toBe(1);
    expect(stats.trollsCount).toBe(1);
  });
});

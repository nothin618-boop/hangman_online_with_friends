/**
 * WHISPER — Instant Crowd Jury & Troll Queue Engine
 * Milestone M2 Implementation
 */

import { Chain, Hop, JuryCase, JuryVoteResult } from './types';
import { IWhisperStore, getStore } from './store';
import {
  broadcastJurySummon,
  broadcastJuryResolved,
  broadcastChainMutated,
  getConnectedPlayerIds
} from './events';

/**
 * Selects exactly 3 peer jurors for a sabotage review.
 * Excludes the reporter and the author of the flagged hop.
 */
export function selectPeerJurors(
  reporterPlayerId: string,
  authorPlayerId: string,
  connectedPeerIds: string[] = []
): string[] {
  const eligible = connectedPeerIds.filter(
    id => id !== reporterPlayerId && id !== authorPlayerId
  );

  const fallbackPeers = ['peer-1', 'peer-2', 'peer-3', 'peer-4', 'peer-5'];
  const fallbackEligible = fallbackPeers.filter(
    id => id !== reporterPlayerId && id !== authorPlayerId
  );

  const pool = Array.from(new Set([...eligible, ...fallbackEligible]));

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const selected = pool.slice(0, 3);
  let fallbackIndex = 1;
  while (selected.length < 3) {
    const peerCandidate = `peer-${fallbackIndex++}`;
    if (peerCandidate !== reporterPlayerId && peerCandidate !== authorPlayerId && !selected.includes(peerCandidate)) {
      selected.push(peerCandidate);
    }
  }
  return selected;
}

/**
 * Creates a pending JuryCase for a reported sabotage mutation.
 * Dispatches summon notification to 3 peers.
 */
export async function reportSabotage(
  chainId: string,
  reporterPlayerId: string,
  storeOverride?: IWhisperStore
): Promise<JuryCase> {
  const store = storeOverride || getStore();
  const chain = await store.getChain(chainId);

  // Guard 1: Must have mutation history and currentHop > 0
  if (!chain || !chain.history || chain.history.length === 0 || chain.currentHop === 0) {
    throw new Error('Cannot report sabotage on chain without mutation history');
  }

  const lastHop = chain.history[chain.history.length - 1];

  // Guard 2: Cannot report decoder deduction hop
  if (lastHop.role === 'decoder') {
    throw new Error('Cannot report sabotage on decoder hop');
  }

  // Guard 3: Deduplicate pending jury cases on same chain
  const existingPending = await store.getPendingJuryCaseForChain(chainId);
  if (existingPending) {
    return existingPending;
  }

  const caseId = `case-${Math.random().toString(36).substring(2, 9)}`;
  const connected = getConnectedPlayerIds ? getConnectedPlayerIds() : [];
  const assignedPeerIds = selectPeerJurors(reporterPlayerId, lastHop.playerId, connected);

  const juryCase: JuryCase = {
    id: caseId,
    chainId,
    flaggedHop: { ...lastHop },
    flaggedWord: lastHop.newWord || '',
    reporterPlayerId,
    assignedPeerIds,
    votes: {},
    status: 'pending',
    createdAt: Date.now()
  };

  await store.saveJuryCase(juryCase);

  // Broadcast SSE summon alert to peers
  broadcastJurySummon({
    caseId: juryCase.id,
    chainId: juryCase.chainId,
    flaggedWord: juryCase.flaggedWord,
    previousSentence: lastHop.previousSentence,
    newSentence: lastHop.newSentence,
    assignedPeerIds,
    deadline: Date.now() + 15000
  });

  return juryCase;
}

const caseLocks = new Map<string, Promise<void>>();

async function withCaseLock<T>(caseId: string, fn: () => Promise<T>): Promise<T> {
  while (caseLocks.has(caseId)) {
    await caseLocks.get(caseId);
  }
  let resolveLock!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  caseLocks.set(caseId, lockPromise);
  try {
    return await fn();
  } finally {
    caseLocks.delete(caseId);
    resolveLock();
  }
}

/**
 * Records a juror vote and evaluates 2/3 majority consensus.
 */
export async function voteJury(
  caseId: string,
  voterPlayerId: string,
  isSabotage: boolean,
  storeOverride?: IWhisperStore
): Promise<JuryVoteResult> {
  return withCaseLock(caseId, async () => {
    const store = storeOverride || getStore();
    const juryCase = await store.getJuryCase(caseId);

    if (!juryCase || juryCase.status !== 'pending') {
      throw new Error('Jury case not found or already closed');
    }

    // Juror authorization checks
    if (voterPlayerId === juryCase.reporterPlayerId || voterPlayerId === juryCase.flaggedHop.playerId) {
      throw new Error('Reporter and author cannot vote on their own jury case');
    }

    if (!juryCase.assignedPeerIds.includes(voterPlayerId)) {
      juryCase.assignedPeerIds.push(voterPlayerId);
    }

    juryCase.votes[voterPlayerId] = isSabotage;

    const votes = Object.values(juryCase.votes);
    const yesVotes = votes.filter(v => v === true).length;
    const noVotes = votes.filter(v => v === false).length;

    // 1. Consensus Sabotage (2 of 3 Yes votes)
    if (yesVotes >= 2) {
      juryCase.status = 'consensus_sabotage';
      juryCase.resolvedAt = Date.now();
      juryCase.flaggedHop.isRevoked = true;

      const chain = await store.getChain(juryCase.chainId);
      if (chain && chain.history.length > 0) {
        // Locate the flagged hop in history
        const flaggedIdx = chain.history.findIndex(
          h => h.hopNumber === juryCase.flaggedHop.hopNumber && h.playerId === juryCase.flaggedHop.playerId
        );

        if (flaggedIdx !== -1) {
          chain.history[flaggedIdx].isRevoked = true;
          chain.currentSentence = juryCase.flaggedHop.previousSentence;
          chain.history = chain.history.slice(0, flaggedIdx);
          chain.currentHop = Math.max(0, juryCase.flaggedHop.hopNumber - 1);
        } else {
          const poppedHop = chain.history.pop()!;
          poppedHop.isRevoked = true;
          chain.currentSentence = poppedHop.previousSentence;
          chain.currentHop = Math.max(0, chain.currentHop - 1);
        }

        if (chain.status === 'in_progress') {
          chain.status = 'active';
          chain.leasedToPlayerId = null;
          chain.leaseExpiresAt = null;
        }

        await store.saveChain(chain);
        await store.shadowBanPlayer(juryCase.flaggedHop.playerId);

        broadcastChainMutated(chain);
      } else {
        await store.shadowBanPlayer(juryCase.flaggedHop.playerId);
      }

      await store.saveJuryCase(juryCase);
      broadcastJuryResolved(caseId, 'sabotage');

      return {
        resolved: true,
        verdict: 'sabotage',
        chainRewound: true,
        trollShadowBanned: true
      };
    }

    // 2. Consensus Dismissed (2 of 3 No votes)
    if (noVotes >= 2) {
      juryCase.status = 'consensus_dismissed';
      juryCase.resolvedAt = Date.now();

      await store.saveJuryCase(juryCase);
      broadcastJuryResolved(caseId, 'dismissed');

      return {
        resolved: true,
        verdict: 'dismissed',
        chainRewound: false,
        trollShadowBanned: false
      };
    }

    // 3. Pending - Consensus not yet reached
    await store.saveJuryCase(juryCase);
    return { resolved: false };
  });
}

/**
 * Checks whether a player is quarantined in the isolated troll pool.
 */
export async function isTroll(playerId: string, storeOverride?: IWhisperStore): Promise<boolean> {
  const store = storeOverride || getStore();
  return store.isPlayerShadowBanned(playerId);
}

/**
 * Generates an isolated mock sandbox chain for a shadow-banned troll player.
 */
export function createTrollSandboxChain(playerId: string): Chain {
  const seedSentence = 'The clandestine signal echoes across abandoned frequencies.';
  return {
    id: `troll-chain-${playerId}`,
    secretTheme: 'Shadow Operation',
    themeOptions: ['Shadow Operation', 'Deep Sea', 'Lunar Colony', 'Ancient Vault'],
    bannedWords: ['signal', 'echoes', 'across', 'abandoned', 'frequencies'],
    initialSentence: seedSentence,
    currentSentence: seedSentence,
    currentHop: 1,
    bonusHops: 0,
    lives: 3,
    maxHops: 100,
    history: [],
    status: 'in_progress',
    leasedToPlayerId: playerId,
    leaseExpiresAt: Date.now() + 60000,
    createdAt: Date.now()
  };
}

/**
 * Object-oriented facade for JuryEngine
 */
export class JuryEngine {
  public async reportSabotage(chainId: string, reporterPlayerId: string): Promise<JuryCase> {
    return reportSabotage(chainId, reporterPlayerId);
  }

  public async voteJury(caseId: string, voterPlayerId: string, isSabotage: boolean): Promise<JuryVoteResult> {
    return voteJury(caseId, voterPlayerId, isSabotage);
  }

  public async isTroll(playerId: string): Promise<boolean> {
    return isTroll(playerId);
  }

  public createTrollSandboxChain(playerId: string): Chain {
    return createTrollSandboxChain(playerId);
  }
}

export const juryEngine = new JuryEngine();

export function getJuryEngine(): JuryEngine {
  return juryEngine;
}

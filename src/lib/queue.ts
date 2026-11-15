/**
 * WHISPER High-Throughput Queue Engine
 * Milestone M2 Implementation
 */

import { Chain, Hop, JuryCase, JuryVoteResult, PlayerRole, SanitizedChain, GhostReceipt } from './types';
import { IWhisperStore, getStore } from './store';
import { determinePlayerRole } from './roles';
import { validateCandidateWord } from './filter';
import { replaceWordInSentence, parseWordToken } from './sentence';
import { resolveDecoderGuess } from './decoder';
import { autoSpawnChains } from './spawner';
import { reportSabotage, voteJury, createTrollSandboxChain } from './jury';
import { archiveToHallOfGhosts } from './ghosts';
import { broadcastChainMutated } from './events';

export const LEASE_DURATION_MS = 60_000;

export interface InterceptResult {
  chain: SanitizedChain;
  role: PlayerRole;
}

export interface MutationResult {
  success: boolean;
  chain?: Chain;
  sanitizedChain?: SanitizedChain;
  error?: string;
  message?: string;
  isTrap?: boolean;
  strikeDeducted?: boolean;
  livesRemaining?: number;
  isVictory?: boolean;
  isDestroyed?: boolean;
}

export interface DecoderResult {
  success: boolean;
  chain?: Chain;
  sanitizedChain?: SanitizedChain;
  isCorrect?: boolean;
  bonusAwarded?: number;
  livesRemaining?: number;
  isVictory?: boolean;
  isDestroyed?: boolean;
  error?: string;
  message?: string;
}

/**
 * Strips classified server secrets (bannedWords and secretTheme) from chain payload.
 */
export function sanitizeChain(chain: Chain, role: PlayerRole): SanitizedChain {
  return {
    id: chain.id,
    themeOptions: role === 'decoder' ? [...chain.themeOptions] : undefined,
    initialSentence: chain.initialSentence,
    currentSentence: chain.currentSentence,
    currentHop: chain.currentHop,
    bonusHops: chain.bonusHops || 0,
    effectiveHops: chain.currentHop + (chain.bonusHops || 0),
    lives: chain.lives,
    maxHops: chain.maxHops,
    status: chain.status,
    leaseExpiresAt: chain.leaseExpiresAt,
    role,
    traceLog: (chain.history || []).slice(-3)
  };
}

export class QueueEngine {
  private store: IWhisperStore;
  private static inFlightSubmissions = new Set<string>();

  constructor(store?: IWhisperStore) {
    this.store = store || getStore();
  }

  public static clearInFlight(): void {
    QueueEngine.inFlightSubmissions.clear();
  }

  /**
   * Intercepts an active chain with a 60-second atomic lease lock.
   */
  public async interceptChain(playerId: string, now: number = Date.now()): Promise<InterceptResult | null> {
    // 1. Troll check: route shadow-banned players to sandbox
    if (await this.store.isPlayerShadowBanned(playerId)) {
      const trollChain = createTrollSandboxChain(playerId);
      trollChain.leasedToPlayerId = playerId;
      trollChain.leaseExpiresAt = now + LEASE_DURATION_MS;
      return {
        chain: sanitizeChain(trollChain, 'shifter'),
        role: 'shifter'
      };
    }

    // 2. Reclaim expired leases first
    await this.reclaimExpiredLeases(now);

    // 3. Return existing active unexpired lease if player already holds one
    const leasedChains = await this.store.getLeasedChains();
    const existingLease = leasedChains.find(
      c => c.leasedToPlayerId === playerId && c.leaseExpiresAt && c.leaseExpiresAt > now
    );
    if (existingLease) {
      const role = determinePlayerRole(existingLease);
      return {
        chain: sanitizeChain(existingLease, role),
        role
      };
    }

    // 4. Pop next available active chain from store queue
    let chain = await this.store.popActiveChain();
    if (!chain) {
      await autoSpawnChains(50, this.store);
      chain = await this.store.popActiveChain();
    }
    if (!chain) return null;

    // 5. Dynamic Role Assignment
    const role = determinePlayerRole(chain);

    // 6. Apply 60s lease
    chain.status = 'in_progress';
    chain.leasedToPlayerId = playerId;
    chain.leaseExpiresAt = now + LEASE_DURATION_MS;
    await this.store.saveChain(chain);
    await this.store.recordPlayerParticipation(playerId, chain.id);

    return {
      chain: sanitizeChain(chain, role),
      role
    };
  }

  /**
   * Sweeps expired leases back to the active pool.
   */
  public async reclaimExpiredLeases(now: number = Date.now()): Promise<number> {
    const expired = await this.store.getExpiredLeases(now);
    let count = 0;
    for (const chain of expired) {
      chain.status = 'active';
      chain.leasedToPlayerId = null;
      chain.leaseExpiresAt = null;
      await this.store.saveChain(chain);
      count++;
    }
    return count;
  }

  /**
   * Submits a Shifter single-word replacement mutation.
   */
  public async submitMutation(
    chainId: string,
    playerId: string,
    wordIndex: number,
    newWord: string,
    now: number = Date.now()
  ): Promise<MutationResult> {
    // Atomic in-flight lock: reject racing concurrent submissions on the same chain
    if (QueueEngine.inFlightSubmissions.has(chainId)) {
      return { success: false, error: 'INVALID_LEASE_HOLDER', message: 'Lease held by another operative.' };
    }
    QueueEngine.inFlightSubmissions.add(chainId);

    try {
      const chain = await this.store.getChain(chainId);
      if (!chain) {
        return { success: false, error: 'CHAIN_NOT_FOUND', message: 'Chain does not exist.' };
      }

      if (chain.leasedToPlayerId !== playerId) {
        return { success: false, error: 'INVALID_LEASE_HOLDER', message: 'Lease held by another operative.' };
      }

      if (!chain.leaseExpiresAt || now > chain.leaseExpiresAt) {
        chain.status = 'active';
        chain.leasedToPlayerId = null;
        chain.leaseExpiresAt = null;
        await this.store.saveChain(chain);
        return { success: false, error: 'LEASE_EXPIRED', message: '60-second lease has elapsed.' };
      }

      // Validate candidate word through Filter Rule Engine
      const validation = validateCandidateWord(newWord, chain.history, chain.bannedWords, chain.initialSentence);
      if (!validation.valid) {
        return { success: false, error: validation.error, message: validation.message };
      }

      const prevSentence = chain.currentSentence;
      const tokens = prevSentence.trim().split(/\s+/);
      if (wordIndex < 0 || wordIndex >= tokens.length) {
        return { success: false, error: 'OUT_OF_BOUNDS', message: 'Word index out of bounds.' };
      }

      const oldWord = tokens[wordIndex] ? parseWordToken(tokens[wordIndex]).root : '';

      // Handle Trap Word Hit
      if (validation.isTrap) {
        chain.lives = Math.max(0, chain.lives - 1);
        chain.currentHop += 1;
        const hop: Hop = {
          hopNumber: chain.currentHop,
          playerId,
          playerAlias: `Operative-${playerId.slice(0, 4)}`,
          previousSentence: prevSentence,
          newSentence: prevSentence,
          replacedWordIndex: wordIndex,
          oldWord,
          newWord,
          role: 'shifter',
          isTrapHit: true,
          timestamp: now
        };
        chain.history.push(hop);
        await this.store.resetPlayerStreak(playerId);
        await this.store.recordPlayerParticipation(playerId, chain.id);

        if (chain.lives <= 0) {
          chain.status = 'destroyed';
          chain.completedAt = now;
          await archiveToHallOfGhosts(chain, 'destroyed', this.store);
          await autoSpawnChains(50, this.store);
        } else {
          chain.status = 'active';
        }

        chain.leasedToPlayerId = null;
        chain.leaseExpiresAt = null;
        await this.store.saveChain(chain);
        broadcastChainMutated(chain);

        return {
          success: true,
          chain,
          sanitizedChain: sanitizeChain(chain, 'shifter'),
          isTrap: true,
          strikeDeducted: true,
          livesRemaining: chain.lives,
          isDestroyed: chain.lives <= 0
        };
      }

      // Clean word replacement
      const { newSentence, oldWord: extractedOld, newWord: casedNewWord } = replaceWordInSentence(prevSentence, wordIndex, newWord);
      chain.currentHop += 1;
      const hop: Hop = {
        hopNumber: chain.currentHop,
        playerId,
        playerAlias: `Operative-${playerId.slice(0, 4)}`,
        previousSentence: prevSentence,
        newSentence,
        replacedWordIndex: wordIndex,
        oldWord: extractedOld,
        newWord: casedNewWord,
        role: 'shifter',
        timestamp: now
      };
      chain.history.push(hop);
      chain.currentSentence = newSentence;

      await this.store.incrementPlayerStreak(playerId, 1);
      await this.store.recordPlayerParticipation(playerId, chain.id);

      const effectiveHops = chain.currentHop + (chain.bonusHops || 0);
      if (effectiveHops >= chain.maxHops) {
        chain.status = 'victory';
        chain.completedAt = now;
        await archiveToHallOfGhosts(chain, 'victory', this.store);
        await autoSpawnChains(50, this.store);
      } else {
        chain.status = 'active';
      }

      chain.leasedToPlayerId = null;
      chain.leaseExpiresAt = null;
      await this.store.saveChain(chain);
      broadcastChainMutated(chain);

      return {
        success: true,
        chain,
        sanitizedChain: sanitizeChain(chain, 'shifter'),
        isTrap: false,
        strikeDeducted: false,
        livesRemaining: chain.lives,
        isVictory: chain.status === 'victory'
      };
    } finally {
      QueueEngine.inFlightSubmissions.delete(chainId);
    }
  }

  /**
   * Alias for submitMutation
   */
  public async submitShifterMutation(
    chainId: string,
    playerId: string,
    wordIndex: number,
    newWord: string,
    now: number = Date.now()
  ): Promise<MutationResult> {
    return this.submitMutation(chainId, playerId, wordIndex, newWord, now);
  }

  /**
   * Submits a Decoder 4-candidate theme guess.
   */
  public async submitDecoderGuess(
    chainId: string,
    playerId: string,
    guess: string,
    now: number = Date.now()
  ): Promise<DecoderResult> {
    // Atomic in-flight lock: reject racing concurrent decoder guesses on the same chain
    if (QueueEngine.inFlightSubmissions.has(chainId)) {
      return { success: false, error: 'INVALID_LEASE_HOLDER', message: 'Lease held by another operative.' };
    }
    QueueEngine.inFlightSubmissions.add(chainId);

    try {
      const chain = await this.store.getChain(chainId);
      if (!chain) {
        return { success: false, error: 'CHAIN_NOT_FOUND', message: 'Chain does not exist.' };
      }

      if (chain.leasedToPlayerId !== playerId) {
        return { success: false, error: 'INVALID_LEASE_HOLDER', message: 'Lease held by another operative.' };
      }

      if (!chain.leaseExpiresAt || now > chain.leaseExpiresAt) {
        chain.status = 'active';
        chain.leasedToPlayerId = null;
        chain.leaseExpiresAt = null;
        await this.store.saveChain(chain);
        return { success: false, error: 'LEASE_EXPIRED', message: '60-second lease has elapsed.' };
      }

      const result = resolveDecoderGuess(chain, guess, playerId);

      if (result.isCorrect) {
        await this.store.incrementPlayerStreak(playerId, 3);
      } else {
        await this.store.resetPlayerStreak(playerId);
      }

      await this.store.recordPlayerParticipation(playerId, chain.id);

      if (result.isVictory) {
        await archiveToHallOfGhosts(chain, 'victory', this.store);
        await autoSpawnChains(50, this.store);
      } else if (result.isDestroyed) {
        await archiveToHallOfGhosts(chain, 'destroyed', this.store);
        await autoSpawnChains(50, this.store);
      } else {
        chain.status = 'active';
      }

      chain.leasedToPlayerId = null;
      chain.leaseExpiresAt = null;
      await this.store.saveChain(chain);
      broadcastChainMutated(chain);

      return {
        success: true,
        chain,
        sanitizedChain: sanitizeChain(chain, 'decoder'),
        isCorrect: result.isCorrect,
        bonusAwarded: result.bonusAwarded,
        livesRemaining: chain.lives,
        isVictory: result.isVictory,
        isDestroyed: result.isDestroyed
      };
    } finally {
      QueueEngine.inFlightSubmissions.delete(chainId);
    }
  }

  public async reportSabotage(chainId: string, reporterPlayerId: string): Promise<JuryCase> {
    return reportSabotage(chainId, reporterPlayerId, this.store);
  }

  public async voteJury(caseId: string, voterPlayerId: string, isSabotage: boolean): Promise<JuryVoteResult> {
    return voteJury(caseId, voterPlayerId, isSabotage, this.store);
  }

  public async getGhostReceipt(chainId: string): Promise<GhostReceipt | null> {
    return this.store.getGhostReceipt(chainId);
  }

  public async getHallOfGhosts(): Promise<GhostReceipt[]> {
    return this.store.getAllGhostReceipts();
  }

  public async getPlayerStreak(playerId: string): Promise<number> {
    return this.store.getPlayerStreak(playerId);
  }

  public async setPlayerStreak(playerId: string, streak: number): Promise<void> {
    return this.store.setPlayerStreak(playerId, streak);
  }

  public async isTroll(playerId: string): Promise<boolean> {
    return this.store.isPlayerShadowBanned(playerId);
  }

  public async getChainById(chainId: string): Promise<Chain | null> {
    return this.store.getChain(chainId);
  }

  public async getAllChains(): Promise<Chain[]> {
    return this.store.getAllChains();
  }

  public async getActiveChains(): Promise<Chain[]> {
    return this.store.getActiveChains();
  }
}

export const queueEngine = new QueueEngine();

export function getQueueEngine(): QueueEngine {
  return queueEngine;
}

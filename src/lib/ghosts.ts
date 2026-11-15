/**
 * WHISPER — Hall of Ghosts Archival & Permalinks Engine
 * Milestone M2 Implementation
 */

import { Chain, GhostReceipt, Hop, PlayerRole } from './types';
import { IWhisperStore, getStore } from './store';
import { broadcastChainArchived } from './events';

export interface GhostHopDiff {
  hopNumber: number;
  playerId: string;
  playerAlias: string;
  role: PlayerRole;
  previousSentence: string;
  newSentence: string;
  replacedWordIndex?: number;
  oldWord?: string;
  newWord?: string;
  decoderGuess?: string;
  isCorrectGuess?: boolean;
  isTrapHit?: boolean;
  bonusHopsAwarded?: number;
  strikeDeducted?: boolean;
  timestamp: number;
}

const ALIAS_PREFIXES = [
  'Cipher', 'Specter', 'Viper', 'Ghost', 'Phantom', 'Nexus', 'Zero', 'Echo',
  'Vector', 'Shade', 'Glitch', 'Krypton', 'Rogue', 'Raven', 'Apex', 'Recon'
];

/**
 * Generates a deterministic cyberpunk operative codename from a player session ID.
 */
export function generatePlayerAlias(playerId: string): string {
  if (!playerId) return 'Operative_00';
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
  }
  const prefix = ALIAS_PREFIXES[hash % ALIAS_PREFIXES.length];
  const num = (hash % 900) + 10; // 10..999
  return `${prefix}_${num}`;
}

/**
 * Creates an immutable GhostReceipt and stores it in the state store.
 */
export async function archiveToHallOfGhosts(
  chain: Chain,
  outcome: 'victory' | 'destroyed',
  storeOverride?: IWhisperStore
): Promise<GhostReceipt> {
  const store = storeOverride || getStore();
  const contributors = new Set(chain.history.map(h => h.playerId));
  const completedAt = Date.now();

  const receipt: GhostReceipt = {
    chainId: chain.id,
    themeTitle: chain.secretTheme,
    outcome,
    finalHop: chain.currentHop + (chain.bonusHops || 0),
    totalContributors: contributors.size,
    initialSentence: chain.initialSentence,
    finalSentence: chain.currentSentence,
    timeline: [...chain.history],
    completedAt
  };

  chain.status = outcome;
  chain.completedAt = completedAt;
  chain.leasedToPlayerId = null;
  chain.leaseExpiresAt = null;

  await store.saveGhostReceipt(receipt);
  await store.saveChain(chain);

  broadcastChainArchived(chain.id, outcome, receipt);

  return receipt;
}

/**
 * Retrieves an archived receipt from the Hall of Ghosts by chain ID.
 */
export async function getGhostReceipt(
  chainId: string,
  storeOverride?: IWhisperStore
): Promise<GhostReceipt | null> {
  const store = storeOverride || getStore();
  return store.getGhostReceipt(chainId);
}

/**
 * Lists all archived receipts in the Hall of Ghosts, sorted latest first.
 */
export async function listGhostReceipts(
  storeOverride?: IWhisperStore
): Promise<GhostReceipt[]> {
  const store = storeOverride || getStore();
  const list = await store.getAllGhostReceipts();
  return [...list].sort((a, b) => b.completedAt - a.completedAt);
}

/**
 * Generates annotated timeline diffs for display on the /ghost/:id page.
 */
export function generateGhostTimelineDiffs(history: Hop[]): GhostHopDiff[] {
  return history.map(hop => {
    let strikeDeducted = false;
    let bonusHopsAwarded = 0;

    if (hop.role === 'decoder') {
      if (hop.isCorrectGuess) {
        bonusHopsAwarded = 10;
      } else {
        strikeDeducted = true;
      }
    } else if (hop.isTrapHit) {
      strikeDeducted = true;
    }

    return {
      hopNumber: hop.hopNumber,
      playerId: hop.playerId,
      playerAlias: hop.playerAlias || generatePlayerAlias(hop.playerId),
      role: hop.role,
      previousSentence: hop.previousSentence,
      newSentence: hop.newSentence,
      replacedWordIndex: hop.replacedWordIndex,
      oldWord: hop.oldWord,
      newWord: hop.newWord,
      decoderGuess: hop.decoderGuess,
      isCorrectGuess: hop.isCorrectGuess,
      isTrapHit: hop.isTrapHit,
      bonusHopsAwarded: bonusHopsAwarded > 0 ? bonusHopsAwarded : undefined,
      strikeDeducted: strikeDeducted || undefined,
      timestamp: hop.timestamp
    };
  });
}

/**
 * Object-oriented HallOfGhostsEngine facade for compatibility.
 */
export class HallOfGhostsEngine {
  public async archiveChain(chain: Chain, outcome: 'victory' | 'destroyed'): Promise<GhostReceipt> {
    return archiveToHallOfGhosts(chain, outcome);
  }

  public async getReceipt(chainId: string): Promise<GhostReceipt | null> {
    return getGhostReceipt(chainId);
  }

  public async getAllReceipts(): Promise<GhostReceipt[]> {
    return listGhostReceipts();
  }
}

export const ghostArchive = new HallOfGhostsEngine();

export function getGhostArchive(): HallOfGhostsEngine {
  return ghostArchive;
}

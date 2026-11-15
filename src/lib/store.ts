/**
 * WHISPER Dual State Store (Memory + Redis)
 * Milestone M2 Implementation
 */

import { Chain, GhostReceipt, JuryCase } from './types';

export interface StoreStats {
  activeChains: number;
  leasedChains: number;
  archivedChains: number;
  trollsCount: number;
}

export interface IWhisperStore {
  // --- Chain Operations ---
  saveChain(chain: Chain): Promise<void>;
  getChain(chainId: string): Promise<Chain | null>;
  getChainById(chainId: string): Promise<Chain | null>;
  deleteChain(chainId: string): Promise<boolean>;
  getAllChains(): Promise<Chain[]>;

  // --- Queue & Index Operations ---
  getActiveChains(): Promise<Chain[]>;
  getActiveChainsCount(): Promise<number>;
  getLeasedChains(): Promise<Chain[]>;
  popActiveChain(): Promise<Chain | null>;
  requeueActiveChain(chainId: string): Promise<void>;

  // --- Lease Operations ---
  getExpiredLeases(now?: number): Promise<Chain[]>;
  releaseLease(chainId: string): Promise<void>;

  // --- Hall of Ghosts Archival ---
  saveGhostReceipt(receipt: GhostReceipt): Promise<void>;
  getGhostReceipt(chainId: string): Promise<GhostReceipt | null>;
  getAllGhostReceipts(): Promise<GhostReceipt[]>;
  getHallOfGhosts(): GhostReceipt[] | Promise<GhostReceipt[]>;

  // --- Crowd Jury Cases ---
  saveJuryCase(juryCase: JuryCase): Promise<void>;
  getJuryCase(caseId: string): Promise<JuryCase | null>;
  getActiveJuryCases(): Promise<JuryCase[]>;
  getPendingJuryCaseForChain(chainId: string): Promise<JuryCase | null>;
  getPendingJuryCaseByChainId(chainId: string): Promise<JuryCase | null>;

  // --- Troll Queue & Shadow-Bans ---
  isPlayerShadowBanned(playerId: string): Promise<boolean>;
  isShadowBanned(playerId: string): Promise<boolean>;
  isTroll(playerId: string): Promise<boolean>;
  shadowBanPlayer(playerId: string): Promise<void>;
  addShadowBan(playerId: string): Promise<void>;
  addTroll(playerId: string): Promise<void>;
  removeShadowBan(playerId: string): Promise<void>;
  getShadowBannedPlayers(): Promise<string[]>;
  getTrolls(): Promise<string[]>;

  // --- Player Streaks ---
  getPlayerStreak(playerId: string): Promise<number>;
  setPlayerStreak(playerId: string, streak: number): Promise<void>;
  incrementPlayerStreak(playerId: string, delta?: number): Promise<number>;
  resetPlayerStreak(playerId: string): Promise<void>;

  // --- Player Participation ("My Active Chains") ---
  recordPlayerParticipation(playerId: string, chainId: string): Promise<void>;
  getPlayerChains(playerId: string): Promise<string[]>;

  // --- Telemetry & Diagnostics ---
  getStats(): Promise<StoreStats>;
  clear(): Promise<void>;
}

const GLOBAL_STORE_KEY = Symbol.for('__WHISPER_MEMORY_STORE__');

export class MemoryWhisperStore implements IWhisperStore {
  private chains: Map<string, Chain> = new Map();
  private activeQueue: string[] = [];
  private ghosts: Map<string, GhostReceipt> = new Map();
  private juryCases: Map<string, JuryCase> = new Map();
  private trolls: Set<string> = new Set();
  private playerStreaks: Map<string, number> = new Map();
  private playerChains: Map<string, Set<string>> = new Map();

  public static getInstance(): MemoryWhisperStore {
    const globalObj = globalThis as any;
    if (!globalObj[GLOBAL_STORE_KEY]) {
      globalObj[GLOBAL_STORE_KEY] = new MemoryWhisperStore();
    }
    return globalObj[GLOBAL_STORE_KEY];
  }

  public async saveChain(chain: Chain): Promise<void> {
    const cloned: Chain = JSON.parse(JSON.stringify(chain));
    this.chains.set(chain.id, cloned);

    const activeIdx = this.activeQueue.indexOf(chain.id);
    if (chain.status === 'active') {
      if (activeIdx === -1) {
        this.activeQueue.push(chain.id);
      }
    } else {
      if (activeIdx !== -1) {
        this.activeQueue.splice(activeIdx, 1);
      }
    }
  }

  public async getChain(chainId: string): Promise<Chain | null> {
    const chain = this.chains.get(chainId);
    return chain ? JSON.parse(JSON.stringify(chain)) : null;
  }

  public async getChainById(chainId: string): Promise<Chain | null> {
    return this.getChain(chainId);
  }

  public async deleteChain(chainId: string): Promise<boolean> {
    const activeIdx = this.activeQueue.indexOf(chainId);
    if (activeIdx !== -1) this.activeQueue.splice(activeIdx, 1);
    return this.chains.delete(chainId);
  }

  public async getAllChains(): Promise<Chain[]> {
    return Array.from(this.chains.values()).map(c => JSON.parse(JSON.stringify(c)));
  }

  public async getActiveChains(): Promise<Chain[]> {
    const result: Chain[] = [];
    for (const id of this.activeQueue) {
      const c = this.chains.get(id);
      if (c && c.status === 'active') {
        result.push(JSON.parse(JSON.stringify(c)));
      }
    }
    // Fallback check in case any active chain was not in activeQueue
    if (result.length === 0) {
      for (const c of this.chains.values()) {
        if (c.status === 'active') {
          result.push(JSON.parse(JSON.stringify(c)));
        }
      }
    }
    return result;
  }

  public async getActiveChainsCount(): Promise<number> {
    return this.activeQueue.length;
  }

  public async getLeasedChains(): Promise<Chain[]> {
    return Array.from(this.chains.values())
      .filter(c => c.status === 'in_progress')
      .map(c => JSON.parse(JSON.stringify(c)));
  }

  public async popActiveChain(): Promise<Chain | null> {
    while (this.activeQueue.length > 0) {
      const id = this.activeQueue.shift()!;
      const chain = this.chains.get(id);
      if (chain && chain.status === 'active') {
        return JSON.parse(JSON.stringify(chain));
      }
    }
    return null;
  }

  public async requeueActiveChain(chainId: string): Promise<void> {
    if (!this.activeQueue.includes(chainId)) {
      this.activeQueue.unshift(chainId);
    }
  }

  public async getExpiredLeases(now: number = Date.now()): Promise<Chain[]> {
    const expired: Chain[] = [];
    for (const chain of this.chains.values()) {
      if (chain.status === 'in_progress' && chain.leaseExpiresAt && chain.leaseExpiresAt < now) {
        expired.push(JSON.parse(JSON.stringify(chain)));
      }
    }
    return expired;
  }

  public async releaseLease(chainId: string): Promise<void> {
    const chain = this.chains.get(chainId);
    if (chain && chain.status === 'in_progress') {
      chain.status = 'active';
      chain.leasedToPlayerId = null;
      chain.leaseExpiresAt = null;
      await this.saveChain(chain);
    }
  }

  public async saveGhostReceipt(receipt: GhostReceipt): Promise<void> {
    this.ghosts.set(receipt.chainId, JSON.parse(JSON.stringify(receipt)));
  }

  public async getGhostReceipt(chainId: string): Promise<GhostReceipt | null> {
    const g = this.ghosts.get(chainId);
    return g ? JSON.parse(JSON.stringify(g)) : null;
  }

  public async getAllGhostReceipts(): Promise<GhostReceipt[]> {
    return Array.from(this.ghosts.values()).map(g => JSON.parse(JSON.stringify(g)));
  }

  public getHallOfGhosts(): GhostReceipt[] {
    return Array.from(this.ghosts.values()).map(g => JSON.parse(JSON.stringify(g)));
  }

  public async saveJuryCase(juryCase: JuryCase): Promise<void> {
    this.juryCases.set(juryCase.id, JSON.parse(JSON.stringify(juryCase)));
  }

  public async getJuryCase(caseId: string): Promise<JuryCase | null> {
    const j = this.juryCases.get(caseId);
    return j ? JSON.parse(JSON.stringify(j)) : null;
  }

  public async getActiveJuryCases(): Promise<JuryCase[]> {
    return Array.from(this.juryCases.values())
      .filter(j => j.status === 'pending')
      .map(j => JSON.parse(JSON.stringify(j)));
  }

  public async getPendingJuryCaseForChain(chainId: string): Promise<JuryCase | null> {
    for (const c of this.juryCases.values()) {
      if (c.chainId === chainId && c.status === 'pending') {
        return JSON.parse(JSON.stringify(c));
      }
    }
    return null;
  }

  public async getPendingJuryCaseByChainId(chainId: string): Promise<JuryCase | null> {
    return this.getPendingJuryCaseForChain(chainId);
  }

  public async isPlayerShadowBanned(playerId: string): Promise<boolean> {
    return this.trolls.has(playerId);
  }

  public async isShadowBanned(playerId: string): Promise<boolean> {
    return this.isPlayerShadowBanned(playerId);
  }

  public async isTroll(playerId: string): Promise<boolean> {
    return this.isPlayerShadowBanned(playerId);
  }

  public async shadowBanPlayer(playerId: string): Promise<void> {
    this.trolls.add(playerId);
  }

  public async addShadowBan(playerId: string): Promise<void> {
    return this.shadowBanPlayer(playerId);
  }

  public async addTroll(playerId: string): Promise<void> {
    return this.shadowBanPlayer(playerId);
  }

  public async removeShadowBan(playerId: string): Promise<void> {
    this.trolls.delete(playerId);
  }

  public async getShadowBannedPlayers(): Promise<string[]> {
    return Array.from(this.trolls);
  }

  public async getTrolls(): Promise<string[]> {
    return this.getShadowBannedPlayers();
  }

  public async getPlayerStreak(playerId: string): Promise<number> {
    return this.playerStreaks.get(playerId) || 0;
  }

  public async setPlayerStreak(playerId: string, streak: number): Promise<void> {
    this.playerStreaks.set(playerId, Math.max(0, streak));
  }

  public async incrementPlayerStreak(playerId: string, delta: number = 1): Promise<number> {
    const current = this.playerStreaks.get(playerId) || 0;
    const next = current + delta;
    this.playerStreaks.set(playerId, next);
    return next;
  }

  public async resetPlayerStreak(playerId: string): Promise<void> {
    this.playerStreaks.set(playerId, 0);
  }

  public async recordPlayerParticipation(playerId: string, chainId: string): Promise<void> {
    if (!this.playerChains.has(playerId)) {
      this.playerChains.set(playerId, new Set());
    }
    this.playerChains.get(playerId)!.add(chainId);
  }

  public async getPlayerChains(playerId: string): Promise<string[]> {
    const set = this.playerChains.get(playerId);
    return set ? Array.from(set) : [];
  }

  public async getStats(): Promise<StoreStats> {
    let leased = 0;
    for (const c of this.chains.values()) {
      if (c.status === 'in_progress') leased++;
    }
    return {
      activeChains: this.activeQueue.length,
      leasedChains: leased,
      archivedChains: this.ghosts.size,
      trollsCount: this.trolls.size
    };
  }

  public async clear(): Promise<void> {
    this.chains.clear();
    this.activeQueue = [];
    this.ghosts.clear();
    this.juryCases.clear();
    this.trolls.clear();
    this.playerStreaks.clear();
    this.playerChains.clear();
  }
}

/**
 * Distributed Redis state store implementation
 * Supports standard REDIS_URL with graceful fallback.
 */
export class RedisWhisperStore implements IWhisperStore {
  private redis: any;
  private memoryFallback: MemoryWhisperStore;

  constructor(redisClient: any) {
    this.redis = redisClient;
    this.memoryFallback = MemoryWhisperStore.getInstance();
  }

  public async saveChain(chain: Chain): Promise<void> {
    try {
      const key = `whisper:chain:${chain.id}`;
      await this.redis.set(key, JSON.stringify(chain));
      if (chain.status === 'active') {
        await this.redis.rpush('whisper:active_queue', chain.id);
      } else {
        await this.redis.lrem('whisper:active_queue', 0, chain.id);
      }
      if (chain.status === 'in_progress' && chain.leaseExpiresAt) {
        await this.redis.zadd('whisper:leases_zset', chain.leaseExpiresAt, chain.id);
      } else {
        await this.redis.zrem('whisper:leases_zset', chain.id);
      }
    } catch {
      await this.memoryFallback.saveChain(chain);
    }
  }

  public async getChain(chainId: string): Promise<Chain | null> {
    try {
      const raw = await this.redis.get(`whisper:chain:${chainId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return this.memoryFallback.getChain(chainId);
    }
  }

  public async getChainById(chainId: string): Promise<Chain | null> {
    return this.getChain(chainId);
  }

  public async deleteChain(chainId: string): Promise<boolean> {
    try {
      await this.redis.lrem('whisper:active_queue', 0, chainId);
      await this.redis.zrem('whisper:leases_zset', chainId);
      const res = await this.redis.del(`whisper:chain:${chainId}`);
      return res > 0;
    } catch {
      return this.memoryFallback.deleteChain(chainId);
    }
  }

  public async getAllChains(): Promise<Chain[]> {
    try {
      const keys = await this.redis.keys('whisper:chain:*');
      if (!keys || keys.length === 0) return [];
      const records = await this.redis.mget(...keys);
      return records.filter(Boolean).map((r: string) => JSON.parse(r));
    } catch {
      return this.memoryFallback.getAllChains();
    }
  }

  public async getActiveChains(): Promise<Chain[]> {
    try {
      const ids: string[] = await this.redis.lrange('whisper:active_queue', 0, -1);
      if (!ids || ids.length === 0) return [];
      const keys = ids.map(id => `whisper:chain:${id}`);
      const records = await this.redis.mget(...keys);
      return records.filter(Boolean).map((r: string) => JSON.parse(r));
    } catch {
      return this.memoryFallback.getActiveChains();
    }
  }

  public async getActiveChainsCount(): Promise<number> {
    try {
      return await this.redis.llen('whisper:active_queue');
    } catch {
      return this.memoryFallback.getActiveChainsCount();
    }
  }

  public async getLeasedChains(): Promise<Chain[]> {
    try {
      const all = await this.getAllChains();
      return all.filter(c => c.status === 'in_progress');
    } catch {
      return this.memoryFallback.getLeasedChains();
    }
  }

  public async popActiveChain(): Promise<Chain | null> {
    try {
      const chainId = await this.redis.lpop('whisper:active_queue');
      if (!chainId) return null;
      return await this.getChain(chainId);
    } catch {
      return this.memoryFallback.popActiveChain();
    }
  }

  public async requeueActiveChain(chainId: string): Promise<void> {
    try {
      await this.redis.lpush('whisper:active_queue', chainId);
    } catch {
      await this.memoryFallback.requeueActiveChain(chainId);
    }
  }

  public async getExpiredLeases(now: number = Date.now()): Promise<Chain[]> {
    try {
      const expiredIds = await this.redis.zrangebyscore('whisper:leases_zset', 0, now);
      if (!expiredIds || expiredIds.length === 0) return [];
      const keys = expiredIds.map((id: string) => `whisper:chain:${id}`);
      const records = await this.redis.mget(...keys);
      return records.filter(Boolean).map((r: string) => JSON.parse(r));
    } catch {
      return this.memoryFallback.getExpiredLeases(now);
    }
  }

  public async releaseLease(chainId: string): Promise<void> {
    try {
      const chain = await this.getChain(chainId);
      if (chain) {
        chain.status = 'active';
        chain.leasedToPlayerId = null;
        chain.leaseExpiresAt = null;
        await this.saveChain(chain);
      }
    } catch {
      await this.memoryFallback.releaseLease(chainId);
    }
  }

  public async saveGhostReceipt(receipt: GhostReceipt): Promise<void> {
    try {
      await this.redis.set(`whisper:ghost:${receipt.chainId}`, JSON.stringify(receipt));
      await this.redis.sadd('whisper:ghosts_list', receipt.chainId);
    } catch {
      await this.memoryFallback.saveGhostReceipt(receipt);
    }
  }

  public async getGhostReceipt(chainId: string): Promise<GhostReceipt | null> {
    try {
      const raw = await this.redis.get(`whisper:ghost:${chainId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return this.memoryFallback.getGhostReceipt(chainId);
    }
  }

  public async getAllGhostReceipts(): Promise<GhostReceipt[]> {
    try {
      const ids = await this.redis.smembers('whisper:ghosts_list');
      if (!ids || ids.length === 0) return [];
      const keys = ids.map((id: string) => `whisper:ghost:${id}`);
      const records = await this.redis.mget(...keys);
      return records.filter(Boolean).map((r: string) => JSON.parse(r));
    } catch {
      return this.memoryFallback.getAllGhostReceipts();
    }
  }

  public getHallOfGhosts(): GhostReceipt[] | Promise<GhostReceipt[]> {
    return this.getAllGhostReceipts();
  }

  public async saveJuryCase(juryCase: JuryCase): Promise<void> {
    try {
      await this.redis.set(`whisper:jury_case:${juryCase.id}`, JSON.stringify(juryCase), 'EX', 300);
      if (juryCase.status === 'pending') {
        await this.redis.sadd('whisper:jury_active', juryCase.id);
      } else {
        await this.redis.srem('whisper:jury_active', juryCase.id);
      }
    } catch {
      await this.memoryFallback.saveJuryCase(juryCase);
    }
  }

  public async getJuryCase(caseId: string): Promise<JuryCase | null> {
    try {
      const raw = await this.redis.get(`whisper:jury_case:${caseId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return this.memoryFallback.getJuryCase(caseId);
    }
  }

  public async getActiveJuryCases(): Promise<JuryCase[]> {
    try {
      const ids = await this.redis.smembers('whisper:jury_active');
      if (!ids || ids.length === 0) return [];
      const keys = ids.map((id: string) => `whisper:jury_case:${id}`);
      const records = await this.redis.mget(...keys);
      return records.filter(Boolean).map((r: string) => JSON.parse(r));
    } catch {
      return this.memoryFallback.getActiveJuryCases();
    }
  }

  public async getPendingJuryCaseForChain(chainId: string): Promise<JuryCase | null> {
    const active = await this.getActiveJuryCases();
    return active.find(c => c.chainId === chainId && c.status === 'pending') || null;
  }

  public async getPendingJuryCaseByChainId(chainId: string): Promise<JuryCase | null> {
    return this.getPendingJuryCaseForChain(chainId);
  }

  public async isPlayerShadowBanned(playerId: string): Promise<boolean> {
    try {
      return (await this.redis.sismember('whisper:trolls', playerId)) === 1;
    } catch {
      return this.memoryFallback.isPlayerShadowBanned(playerId);
    }
  }

  public async isShadowBanned(playerId: string): Promise<boolean> {
    return this.isPlayerShadowBanned(playerId);
  }

  public async isTroll(playerId: string): Promise<boolean> {
    return this.isPlayerShadowBanned(playerId);
  }

  public async shadowBanPlayer(playerId: string): Promise<void> {
    try {
      await this.redis.sadd('whisper:trolls', playerId);
    } catch {
      await this.memoryFallback.shadowBanPlayer(playerId);
    }
  }

  public async addShadowBan(playerId: string): Promise<void> {
    return this.shadowBanPlayer(playerId);
  }

  public async addTroll(playerId: string): Promise<void> {
    return this.shadowBanPlayer(playerId);
  }

  public async removeShadowBan(playerId: string): Promise<void> {
    try {
      await this.redis.srem('whisper:trolls', playerId);
    } catch {
      await this.memoryFallback.removeShadowBan(playerId);
    }
  }

  public async getShadowBannedPlayers(): Promise<string[]> {
    try {
      return await this.redis.smembers('whisper:trolls');
    } catch {
      return this.memoryFallback.getShadowBannedPlayers();
    }
  }

  public async getTrolls(): Promise<string[]> {
    return this.getShadowBannedPlayers();
  }

  public async getPlayerStreak(playerId: string): Promise<number> {
    try {
      const val = await this.redis.get(`whisper:streak:${playerId}`);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return this.memoryFallback.getPlayerStreak(playerId);
    }
  }

  public async setPlayerStreak(playerId: string, streak: number): Promise<void> {
    try {
      await this.redis.set(`whisper:streak:${playerId}`, streak.toString());
    } catch {
      await this.memoryFallback.setPlayerStreak(playerId, streak);
    }
  }

  public async incrementPlayerStreak(playerId: string, delta: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(`whisper:streak:${playerId}`, delta);
    } catch {
      return this.memoryFallback.incrementPlayerStreak(playerId, delta);
    }
  }

  public async resetPlayerStreak(playerId: string): Promise<void> {
    try {
      await this.redis.set(`whisper:streak:${playerId}`, '0');
    } catch {
      await this.memoryFallback.resetPlayerStreak(playerId);
    }
  }

  public async recordPlayerParticipation(playerId: string, chainId: string): Promise<void> {
    try {
      await this.redis.sadd(`whisper:user_chains:${playerId}`, chainId);
    } catch {
      await this.memoryFallback.recordPlayerParticipation(playerId, chainId);
    }
  }

  public async getPlayerChains(playerId: string): Promise<string[]> {
    try {
      return await this.redis.smembers(`whisper:user_chains:${playerId}`);
    } catch {
      return this.memoryFallback.getPlayerChains(playerId);
    }
  }

  public async getStats(): Promise<StoreStats> {
    try {
      const active = await this.getActiveChainsCount();
      const leased = await this.redis.zcard('whisper:leases_zset');
      const archived = await this.redis.scard('whisper:ghosts_list');
      const trolls = await this.redis.scard('whisper:trolls');
      return {
        activeChains: active,
        leasedChains: leased,
        archivedChains: archived,
        trollsCount: trolls
      };
    } catch {
      return this.memoryFallback.getStats();
    }
  }

  public async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys('whisper:*');
      if (keys && keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {}
    await this.memoryFallback.clear();
  }
}

// Singletons
let configuredStore: IWhisperStore | null = null;

export function getStore(): IWhisperStore {
  if (configuredStore) {
    return configuredStore;
  }
  configuredStore = MemoryWhisperStore.getInstance();
  return configuredStore;
}

export const whisperStore = getStore();

/**
 * Async factory initializing Redis if REDIS_URL is provided,
 * otherwise falling back gracefully to MemoryWhisperStore.
 */
export async function createStore(redisUrl?: string): Promise<IWhisperStore> {
  const url = redisUrl || process.env.REDIS_URL;
  if (!url) {
    return MemoryWhisperStore.getInstance();
  }

  try {
    const pkg = 'ioredis';
    // @ts-ignore
    const { default: Redis } = await import(/* webpackIgnore: true */ pkg);
    const client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
    await client.ping();
    configuredStore = new RedisWhisperStore(client);
    return configuredStore;
  } catch {
    console.warn('[WHISPER Store] Redis unavailable or ioredis not installed. Falling back to MemoryWhisperStore.');
    configuredStore = MemoryWhisperStore.getInstance();
    return configuredStore;
  }
}

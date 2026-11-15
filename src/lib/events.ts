/**
 * WHISPER Real-Time SSE Broadcaster
 * Milestone M2 Implementation
 */

import { ChainStatus } from './types';

export interface SseClient {
  id: string;
  playerId: string;
  controller: ReadableStreamDefaultController;
  connectedAt: number;
}

export interface TelemetryPayload {
  activeWhispers: number;
  playersOnline: number;
}

export interface ChainMutatedPayload {
  chainId: string;
  currentHop: number;
  lives: number;
  status: ChainStatus;
}

export interface JurySummonPayload {
  caseId: string;
  chainId: string;
  flaggedWord: string;
  previousSentence: string;
  newSentence: string;
  assignedPeerIds?: string[];
  deadline: number;
}

export class EventBroadcaster {
  private clients: Map<string, SseClient> = new Map();
  private playerConnections: Map<string, Set<string>> = new Map();

  /**
   * Registers a new SSE connection for a player.
   * Returns a cleanup callback to be invoked on stream cancellation.
   */
  public registerClient(playerId: string, controller: ReadableStreamDefaultController): () => void {
    const connectionId = `conn_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const client: SseClient = {
      id: connectionId,
      playerId,
      controller,
      connectedAt: Date.now(),
    };

    this.clients.set(connectionId, client);

    if (!this.playerConnections.has(playerId)) {
      this.playerConnections.set(playerId, new Set());
    }
    this.playerConnections.get(playerId)!.add(connectionId);

    return () => {
      this.unregisterClient(connectionId, playerId);
    };
  }

  private unregisterClient(connectionId: string, playerId: string): void {
    this.clients.delete(connectionId);
    const set = this.playerConnections.get(playerId);
    if (set) {
      set.delete(connectionId);
      if (set.size === 0) {
        this.playerConnections.delete(playerId);
      }
    }
  }

  /**
   * Returns total unique players currently connected via SSE.
   */
  public getPlayersOnline(): number {
    return Math.max(1, this.playerConnections.size);
  }

  /**
   * Total active connection count.
   */
  public getActiveConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Returns list of connected player IDs.
   */
  public getConnectedPlayerIds(): string[] {
    return Array.from(this.playerConnections.keys());
  }

  /**
   * Formats an SSE message conforming to the W3C EventSource standard.
   */
  private formatMessage(event: string, data: any): Uint8Array {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    return new TextEncoder().encode(payload);
  }

  /**
   * Broadcasts telemetry to all connected clients.
   */
  public broadcastTelemetry(activeWhispers: number): void {
    const payload: TelemetryPayload = {
      activeWhispers,
      playersOnline: this.getPlayersOnline(),
    };
    const message = this.formatMessage('telemetry', payload);
    this.broadcastToAll(message);
  }

  /**
   * Broadcasts chain mutation status to all connected clients.
   */
  public broadcastChainMutated(payload: ChainMutatedPayload | { id: string; currentHop: number; lives: number; status: ChainStatus }): void {
    const normalized: ChainMutatedPayload = 'chainId' in payload
      ? payload
      : {
          chainId: (payload as any).id,
          currentHop: payload.currentHop,
          lives: payload.lives,
          status: payload.status
        };
    const message = this.formatMessage('chain_mutated', normalized);
    this.broadcastToAll(message);
  }

  /**
   * Broadcasts chain archived event.
   */
  public broadcastChainArchived(chainId: string, outcome: string, receipt: any): void {
    const message = this.formatMessage('chain_archived', { chainId, outcome, receipt });
    this.broadcastToAll(message);
  }

  /**
   * Broadcasts jury resolved event.
   */
  public broadcastJuryResolved(caseId: string, verdict: string): void {
    const message = this.formatMessage('jury_resolved', { caseId, verdict });
    this.broadcastToAll(message);
  }

  /**
   * Dispatches a jury summons exclusively to the assigned peer players.
   */
  public dispatchJurySummon(peerPlayerIds: string[], payload: JurySummonPayload): void {
    const message = this.formatMessage('jury_summon', payload);
    for (const peerId of peerPlayerIds) {
      const connIds = this.playerConnections.get(peerId);
      if (connIds) {
        for (const connId of connIds) {
          const client = this.clients.get(connId);
          if (client) {
            try {
              client.controller.enqueue(message);
            } catch {
              this.unregisterClient(connId, peerId);
            }
          }
        }
      }
    }
  }

  /**
   * Internal sender to all active clients with safe auto-prune on closed streams.
   */
  private broadcastToAll(data: Uint8Array): void {
    for (const [connId, client] of this.clients.entries()) {
      try {
        client.controller.enqueue(data);
      } catch {
        this.unregisterClient(connId, client.playerId);
      }
    }
  }

  /**
   * Selects random connected peer player IDs excluding specified players (e.g. reporter and offender).
   */
  public selectRandomPeers(count: number, excludedPlayerIds: string[] = []): string[] {
    const excludeSet = new Set(excludedPlayerIds);
    const eligiblePeers = Array.from(this.playerConnections.keys()).filter(id => !excludeSet.has(id));

    // Shuffle
    for (let i = eligiblePeers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligiblePeers[i], eligiblePeers[j]] = [eligiblePeers[j], eligiblePeers[i]];
    }

    const selected = eligiblePeers.slice(0, count);

    // Fallback if low connected peers (e.g. local test or off-peak)
    let fallbackIndex = 1;
    while (selected.length < count) {
      const fallbackPeer = `peer-${fallbackIndex++}`;
      if (!excludeSet.has(fallbackPeer) && !selected.includes(fallbackPeer)) {
        selected.push(fallbackPeer);
      }
    }

    return selected;
  }

  /**
   * Cleanly closes all client streams (for testing or shutdown).
   */
  public reset(): void {
    for (const [connId, client] of this.clients.entries()) {
      try {
        client.controller.close();
      } catch {}
    }
    this.clients.clear();
    this.playerConnections.clear();
  }
}

// Global singleton for Next.js Fast Refresh
const globalForEvents = globalThis as unknown as { whisperEventBroadcaster?: EventBroadcaster };
export const eventBroadcaster = globalForEvents.whisperEventBroadcaster ?? new EventBroadcaster();
if (process.env.NODE_ENV !== 'production') {
  globalForEvents.whisperEventBroadcaster = eventBroadcaster;
}

export function getEventBroadcaster(): EventBroadcaster {
  return eventBroadcaster;
}

// Standalone function wrappers
export function broadcastTelemetry(activeWhispers: number): void {
  eventBroadcaster.broadcastTelemetry(activeWhispers);
}

export function broadcastChainMutated(payload: any): void {
  eventBroadcaster.broadcastChainMutated(payload);
}

export function broadcastChainArchived(chainId: string, outcome: string, receipt: any): void {
  eventBroadcaster.broadcastChainArchived(chainId, outcome, receipt);
}

export function broadcastJurySummon(payload: JurySummonPayload): void {
  const peers = payload.assignedPeerIds || [];
  eventBroadcaster.dispatchJurySummon(peers, payload);
}

export function broadcastJuryResolved(caseId: string, verdict: string): void {
  eventBroadcaster.broadcastJuryResolved(caseId, verdict);
}

export function getConnectedPlayerIds(): string[] {
  return eventBroadcaster.getConnectedPlayerIds();
}

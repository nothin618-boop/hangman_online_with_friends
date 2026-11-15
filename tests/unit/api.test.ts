import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { MemoryWhisperStore } from '@/lib/store';
import { createChainFromTemplate } from '@/lib/spawner';
import { HANDCRAFTED_THEMES } from '@/lib/prompts';
import { POST as handleIntercept } from '@/app/api/chains/intercept/route';
import { POST as handleSubmit } from '@/app/api/chains/submit/route';
import { POST as handleReport } from '@/app/api/chains/report/route';
import { POST as handleVote } from '@/app/api/jury/vote/route';
import { GET as handleGhost } from '@/app/api/ghost/[id]/route';
import { GET as handleGhosts } from '@/app/api/ghosts/route';
import { GET as handleTelemetry } from '@/app/api/telemetry/route';
import { GET as handleStream } from '@/app/api/chains/stream/route';
import { POST as handleMultiplayerPost, GET as handleMultiplayerGet } from '@/app/api/rescue/multiplayer/route';
import { GET as handleRescueStream } from '@/app/api/rescue/multiplayer/stream/route';

describe('API Route Handlers Unit & Integration Suite', () => {
  let store: MemoryWhisperStore;

  beforeEach(async () => {
    store = MemoryWhisperStore.getInstance();
    await store.clear();
  });

  function createJsonRequest(url: string, method: string, body?: any): NextRequest {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('POST /api/chains/intercept returns 200 with sanitized chain and assigned role', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    await store.saveChain(chain);

    const req = createJsonRequest('http://localhost:3000/api/chains/intercept', 'POST', {
      playerId: 'test-player-1',
    });

    const res = await handleIntercept(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.chain.id).toBe(chain.id);
    expect(data.role).toBe('shifter');
    expect(data.chain.secretTheme).toBeUndefined();
    expect(data.chain.bannedWords).toBeUndefined();
  });

  it('POST /api/chains/submit processes Shifter word replacement', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'p1';
    chain.leaseExpiresAt = Date.now() + 60000;
    await store.saveChain(chain);

    const req = createJsonRequest('http://localhost:3000/api/chains/submit', 'POST', {
      chainId: chain.id,
      playerId: 'p1',
      wordIndex: 1,
      newWord: 'sentinel',
    });

    const res = await handleSubmit(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.chain.currentHop).toBe(1);
    expect(data.isTrap).toBe(false);
  });

  it('POST /api/chains/submit rejects missing parameters with 400', async () => {
    const req = createJsonRequest('http://localhost:3000/api/chains/submit', 'POST', {});
    const res = await handleSubmit(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('MISSING_PARAMETERS');
  });

  it('POST /api/chains/submit detects trap word and returns isTrap = true', async () => {
    const template = HANDCRAFTED_THEMES[0];
    const chain = createChainFromTemplate(template);
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'p1';
    chain.leaseExpiresAt = Date.now() + 60000;
    await store.saveChain(chain);

    const trapWord = template.bannedWords[0];
    const req = createJsonRequest('http://localhost:3000/api/chains/submit', 'POST', {
      chainId: chain.id,
      playerId: 'p1',
      wordIndex: 1,
      newWord: trapWord,
    });

    const res = await handleSubmit(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isTrap).toBe(true);
    expect(data.strikeDeducted).toBe(true);
    expect(data.livesRemaining).toBe(2);
  });

  it('POST /api/chains/submit processes Decoder theme deduction guess', async () => {
    const template = HANDCRAFTED_THEMES[0];
    const chain = createChainFromTemplate(template);
    chain.status = 'in_progress';
    chain.leasedToPlayerId = 'p1';
    chain.leaseExpiresAt = Date.now() + 60000;
    chain.currentHop = 10;
    await store.saveChain(chain);

    const req = createJsonRequest('http://localhost:3000/api/chains/submit', 'POST', {
      chainId: chain.id,
      playerId: 'p1',
      role: 'decoder',
      guess: template.theme,
    });

    const res = await handleSubmit(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.correct).toBe(true);
    expect(data.bonusAwarded).toBe(10);
  });

  it('POST /api/chains/report creates a JuryCase and returns caseId', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.currentHop = 1;
    chain.history.push({
      hopNumber: 1,
      playerId: 'bad-actor',
      previousSentence: chain.initialSentence,
      newSentence: 'Trolled sentence.',
      newWord: 'troll',
      role: 'shifter',
      timestamp: Date.now(),
    });
    await store.saveChain(chain);

    const req = createJsonRequest('http://localhost:3000/api/chains/report', 'POST', {
      chainId: chain.id,
      reporterPlayerId: 'reporter-1',
    });

    const res = await handleReport(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.caseId).toBeDefined();
    expect(data.status).toBe('pending');
  });

  it('POST /api/jury/vote records vote and resolves consensus', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    chain.currentHop = 1;
    chain.history.push({
      hopNumber: 1,
      playerId: 'bad-actor',
      previousSentence: chain.initialSentence,
      newSentence: 'Trolled sentence.',
      newWord: 'troll',
      role: 'shifter',
      timestamp: Date.now(),
    });
    await store.saveChain(chain);

    // Create report first
    const reportReq = createJsonRequest('http://localhost:3000/api/chains/report', 'POST', {
      chainId: chain.id,
      reporterPlayerId: 'rep-1',
    });
    const reportRes = await handleReport(reportReq);
    const { caseId } = await reportRes.json();

    // Vote 1
    const voteReq1 = createJsonRequest('http://localhost:3000/api/jury/vote', 'POST', {
      caseId,
      voterPlayerId: 'juror-1',
      isSabotage: true,
    });
    const voteRes1 = await handleVote(voteReq1);
    expect((await voteRes1.json()).resolved).toBe(false);

    // Vote 2
    const voteReq2 = createJsonRequest('http://localhost:3000/api/jury/vote', 'POST', {
      caseId,
      voterPlayerId: 'juror-2',
      isSabotage: true,
    });
    const voteRes2 = await handleVote(voteReq2);
    const voteData2 = await voteRes2.json();
    expect(voteData2.resolved).toBe(true);
    expect(voteData2.verdict).toBe('sabotage');
    expect(voteData2.chainRewound).toBe(true);
  });

  it('GET /api/ghost/[id] returns receipt and diffs for archived chain, or 404 if missing', async () => {
    // 404 case
    const missingReq = new NextRequest('http://localhost:3000/api/ghost/unknown-id');
    const missingRes = await handleGhost(missingReq, { params: { id: 'unknown-id' } });
    expect(missingRes.status).toBe(404);

    // 200 case
    await store.saveGhostReceipt({
      chainId: 'ghost-chain-1',
      themeTitle: 'Archived Theme',
      outcome: 'victory',
      finalHop: 100,
      totalContributors: 12,
      initialSentence: 'Initial start.',
      finalSentence: 'Final end.',
      timeline: [],
      completedAt: Date.now(),
    });

    const foundReq = new NextRequest('http://localhost:3000/api/ghost/ghost-chain-1');
    const foundRes = await handleGhost(foundReq, { params: { id: 'ghost-chain-1' } });
    expect(foundRes.status).toBe(200);

    const data = await foundRes.json();
    expect(data.success).toBe(true);
    expect(data.receipt.chainId).toBe('ghost-chain-1');
    expect(data.receipt.outcome).toBe('victory');
    expect(data.diffs).toBeDefined();
  });

  it('GET /api/ghosts returns list of all archived receipts', async () => {
    await store.saveGhostReceipt({
      chainId: 'ghost-1',
      themeTitle: 'Theme 1',
      outcome: 'victory',
      finalHop: 100,
      totalContributors: 5,
      initialSentence: 'Init',
      finalSentence: 'Final',
      timeline: [],
      completedAt: 100,
    });

    const res = await handleGhosts();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.receipts.length).toBe(1);
  });

  it('GET /api/telemetry returns 200 with live counts', async () => {
    const chain = createChainFromTemplate(HANDCRAFTED_THEMES[0]);
    await store.saveChain(chain);

    const res = await handleTelemetry();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.activeWhispers).toBe(1);
    expect(data.playersOnline).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/chains/stream initializes an SSE response stream', async () => {
    const req = new NextRequest('http://localhost:3000/api/chains/stream?playerId=stream-test');
    const res = await handleStream(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
  });

  it('POST & GET /api/rescue/multiplayer allows cross-device room creation and join by code', async () => {
    // Device 1: Create room
    const createReq = createJsonRequest('http://localhost:3000/api/rescue/multiplayer', 'POST', {
      type: 'CREATE_ROOM',
      playerName: 'Device1 Host',
    });
    const createRes = await handleMultiplayerPost(createReq);
    expect(createRes.status).toBe(200);

    const createData = await createRes.json();
    expect(createData.type).toBe('ROOM_JOINED');
    expect(createData.room.roomCode).toBeDefined();
    const roomCode = createData.room.roomCode;

    // Device 2: Join room using lowercase code
    const joinReq = createJsonRequest('http://localhost:3000/api/rescue/multiplayer', 'POST', {
      type: 'JOIN_ROOM',
      roomId: roomCode.toLowerCase(),
      playerName: 'Device2 Phone',
    });
    const joinRes = await handleMultiplayerPost(joinReq);
    expect(joinRes.status).toBe(200);

    const joinData = await joinRes.json();
    expect(joinData.type).toBe('ROOM_JOINED');
    expect(joinData.room.roomCode).toBe(roomCode);
    expect(Object.keys(joinData.room.players).length).toBe(2);

    // Device 1: Polls room state
    const pollReq = new NextRequest(`http://localhost:3000/api/rescue/multiplayer?roomId=${roomCode}`);
    const pollRes = await handleMultiplayerGet(pollReq);
    expect(pollRes.status).toBe(200);

    const pollData = await pollRes.json();
    expect(pollData.room.roomCode).toBe(roomCode);
    expect(Object.keys(pollData.room.players).length).toBe(2);
    expect(pollData.events.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/rescue/multiplayer handles PING with low-latency PONG response', async () => {
    const pingTime = Date.now();
    const req = createJsonRequest('http://localhost:3000/api/rescue/multiplayer', 'POST', {
      type: 'PING',
      clientTimestamp: pingTime,
    });
    const res = await handleMultiplayerPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.type).toBe('PONG');
    expect(data.clientTimestamp).toBe(pingTime);
    expect(data.serverTimestamp).toBeGreaterThanOrEqual(pingTime);
  });

  it('GET /api/rescue/multiplayer/stream opens persistent real-time SSE stream on Port 3000', async () => {
    const req = new NextRequest('http://localhost:3000/api/rescue/multiplayer/stream?roomId=STREAM-ROOM-1');
    const res = await handleRescueStream(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
  });
});

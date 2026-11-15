process.env.WS_NO_BUFFER_UTIL = 'true';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let WORD_CATALOG = [];
try {
  const catalogPath = path.join(__dirname, '../src/lib/cyber_rescue/word_catalog.json');
  WORD_CATALOG = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
} catch (e) {
  WORD_CATALOG = [
    { word: 'MINECRAFT', category: 'GAMING', hint: 'Block building and diamond mining survival game' },
    { word: 'VALORANT', category: 'GAMING', hint: 'Tactical hero shooter by Riot Games' },
    { word: 'FORTNITE', category: 'GAMING', hint: 'Battle Royale game with building and battle bus' },
    { word: 'CYBERPUNK', category: 'GAMING', hint: 'Night City open-world futuristic RPG' },
    { word: 'ZELDA', category: 'GAMING', hint: 'Link adventures across Hyrule to save the princess' },
    { word: 'PORTAL', category: 'GAMING', hint: 'Puzzle game with blue and orange physics portals' },
    { word: 'ROBLOX', category: 'GAMING', hint: 'Sandbox universe of user-created virtual games' }
  ];
}

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3001;

const MAX_CANOPY_FLOATS = 7;
const RUSH_TIMER_SECONDS = 15;

const OPERATIVE_CODENAMES = [
  'Phoenix', 'Falcon', 'Viper', 'Shadow', 'Titan', 'Ghost', 'Nova', 'Raven',
  'Blaze', 'Storm', 'Frost', 'Cipher', 'Apex', 'Vortex', 'Echo', 'Spectre'
];

const OPERATIVE_AVATARS = [
  'sticker_classic',
  'sticker_shades',
  'sticker_ninja',
  'sticker_gamer',
  'sticker_cowboy',
  'sticker_detective',
  'sticker_cyborg',
  'sticker_party',
  'sticker_crown',
  'sticker_nerd',
  'sticker_star',
  'sticker_angel',
  'sticker_pirate',
  'sticker_astro',
  'sticker_wizard',
  'sticker_blaze',
  'sticker_viking',
  'sticker_sleepy',
  'sticker_cat',
  'sticker_robot',
];

const GREEK_ALPHABET = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
  'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'
];

const GAMER_CYBER_HANDLES = [
  'CyberHawk',
  'ShadowPulse',
  'NeonViper',
  'GhostRider',
  'SkyDrifter',
  'EchoZero',
  'PhantomBlade',
  'NovaStrike',
  'VortexRider',
  'AeroByte',
  'BlazeRunner',
  'TitanCore',
  'ApexFalcon',
  'ZenithFox',
  'PulseJet',
  'RogueComet',
  'StormRider',
  'IronClaw',
  'SolarKnight',
  'SonicBreeze',
  'SpectreWing',
  'QuantumDash',
  'FrostBite',
  'ThunderBolt',
  'OmegaPilot',
  'PixelWolf',
  'TurboFlare',
  'DarkNexus',
  'CosmicRay',
  'AstroJumper',
  'HyperNova',
  'LunarGlide',
  'StarSentry',
  'SilverFang',
  'VectorWave',
  'GlitchSeeker',
  'FlashSpark',
  'RazorEdge',
  'StealthWing',
  'PrismRider',
  'CipherPulse',
  'AetherDrift',
  'ZeroGravity',
  'NeonBlaster',
  'PlasmaJet',
  'MatrixRider',
  'ShadowHunter',
  'SkyRebel',
  'ApexPredator',
  'CloudRanger',
];

/**
 * Returns a random unique gamer/cyber handle not currently taken.
 * Strictly avoids numeric suffixes (#1, #2, 84, etc.) - always clean gamer names.
 */
function getRandomComputerName(excludeNames = []) {
  const normalizedExclude = new Set(excludeNames.map((n) => (n || '').trim().toLowerCase()));
  const available = GAMER_CYBER_HANDLES.filter((name) => !normalizedExclude.has(name.toLowerCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  // Fallback: Combine cool codename with handle (e.g. ShadowViper, FrostFalcon) - 0 numbers
  for (const code of OPERATIVE_CODENAMES) {
    for (const handle of GAMER_CYBER_HANDLES) {
      const combined = `${code}${handle}`;
      if (!normalizedExclude.has(combined.toLowerCase())) {
        return combined;
      }
    }
  }
  return GAMER_CYBER_HANDLES[Math.floor(Math.random() * GAMER_CYBER_HANDLES.length)];
}

function getRandomOperativeName(excludeNames = []) {
  return getRandomComputerName(excludeNames);
}

function ensureUniquePlayerName(baseName, existingPlayers = {}, targetPlayerId = null) {
  const playersList = Array.isArray(existingPlayers) ? existingPlayers : Object.values(existingPlayers || {});
  const otherPlayers = playersList.filter((p) => !targetPlayerId || p.id !== targetPlayerId);
  const existingNamesLower = otherPlayers.map((p) => (p.name || '').trim().toLowerCase());

  const cleanName = (baseName || '').trim();

  // If empty or purely whitespace, pick an unused cool gamer name
  if (!cleanName) {
    return getRandomComputerName(otherPlayers.map((p) => p.name));
  }

  // If not taken in the room, it's valid as-is
  if (!existingNamesLower.includes(cleanName.toLowerCase())) {
    return cleanName;
  }

  // It's taken! Check if it's "Operative" or "Operative <Greek>"
  const operativeMatch = cleanName.match(/^Operative(\s+[A-Za-z]+)?$/i);
  if (operativeMatch) {
    for (const greek of GREEK_ALPHABET) {
      const candidate = `Operative ${greek}`;
      if (!existingNamesLower.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  // For any duplicate custom name (e.g. "Kabir"), strictly DO NOT add #1, #2 or numeric suffixes!
  // Assign a fresh, unused proper random gamer name instead.
  return getRandomComputerName(otherPlayers.map((p) => p.name));
}

function assignUniqueAvatar(existingPlayers = {}, preferredAvatar = null, targetPlayerId = null) {
  const playersList = Array.isArray(existingPlayers) ? existingPlayers : Object.values(existingPlayers || {});
  const otherPlayers = playersList.filter((p) => !targetPlayerId || p.id !== targetPlayerId);
  const usedAvatars = new Set(otherPlayers.map((p) => p.avatar));

  if (preferredAvatar && !usedAvatars.has(preferredAvatar)) {
    return preferredAvatar;
  }

  for (const avatar of OPERATIVE_AVATARS) {
    if (!usedAvatars.has(avatar)) {
      return avatar;
    }
  }

  return preferredAvatar || OPERATIVE_AVATARS[0];
}

function getWordBaseScore(word) {
  const len = (word || '').trim().length;
  if (len <= 5) return 100;
  if (len <= 8) return 150;
  return 200;
}

function calculateMillisecondSpeedBonus(solveTimeMs, maxRoundMs = 45000) {
  if (solveTimeMs <= 0) return 0;
  if (solveTimeMs <= 2000) return 150;
  const safeMax = Math.max(3000, maxRoundMs);
  if (solveTimeMs >= safeMax) return 10;
  const fractionRemaining = Math.max(0, 1 - (solveTimeMs - 2000) / (safeMax - 2000));
  const bonus = 10 + Math.round(140 * Math.pow(fractionRemaining, 1.15));
  return Math.max(10, Math.min(150, bonus));
}

function calculateScore({
  word = '',
  isSolved,
  wrongGuesses,
  solveTimeMs,
  remainingSeconds,
  totalSeconds,
  placement,
  isFirstSolver,
  isRushActive,
  rushRemainingMs,
  currentStreak = 0,
}) {
  if (!isSolved || wrongGuesses >= MAX_CANOPY_FLOATS) {
    return {
      base: 0,
      speedBonus: 0,
      canopyBonus: 0,
      firstSolveBonus: 0,
      placementBonus: 0,
      clutchBonus: 0,
      solveTimeMs: 0,
      solveTimeFormatted: '0.00s',
      total: 0,
    };
  }

  // Fallback to integer seconds if solveTimeMs not provided
  const effectiveMs = solveTimeMs && solveTimeMs > 0
    ? solveTimeMs
    : remainingSeconds !== undefined && totalSeconds !== undefined
      ? Math.max(1, (totalSeconds - remainingSeconds) * 1000)
      : 15000;

  const base = getWordBaseScore(word);
  const speedBonus = calculateMillisecondSpeedBonus(effectiveMs);
  const isFlawless = wrongGuesses === 0;
  const remainingFloats = Math.max(0, MAX_CANOPY_FLOATS - wrongGuesses);
  const canopyBonus = isFlawless ? 150 : remainingFloats * 15;

  const resolvedPlacement = placement ?? (isFirstSolver ? 1 : undefined);
  let placementBonus = 0;
  if (resolvedPlacement === 1) placementBonus = 100;
  else if (resolvedPlacement === 2) placementBonus = 50;
  else if (resolvedPlacement === 3) placementBonus = 25;
  else if (resolvedPlacement && resolvedPlacement > 3) placementBonus = 10;

  const isClutch = Boolean(isRushActive) && typeof rushRemainingMs === 'number' && rushRemainingMs > 0 && rushRemainingMs <= 3000;
  const clutchBonus = isClutch ? 50 : 0;

  const subtotal = base + speedBonus + canopyBonus + placementBonus + clutchBonus;
  const multiplier = currentStreak <= 1 ? 1.0 : currentStreak === 2 ? 1.1 : currentStreak === 3 ? 1.2 : currentStreak === 4 ? 1.35 : 1.5;
  const total = Math.round(subtotal * multiplier);
  const streakBonus = total - subtotal;

  return {
    base,
    speedBonus,
    canopyBonus,
    firstSolveBonus: resolvedPlacement === 1 ? 100 : 0,
    placementBonus,
    isClutch,
    clutchBonus,
    streakMultiplier: multiplier,
    streakBonus,
    solveTimeMs: effectiveMs,
    solveTimeFormatted: (effectiveMs / 1000).toFixed(2) + 's',
    isFlawless,
    total,
  };
}

// Global server memory store shared across Next.js API & WebSocket server
const rooms = globalThis._rescueRooms ?? (globalThis._rescueRooms = new Map());
const roomCodes = globalThis._rescueRoomCodes ?? (globalThis._rescueRoomCodes = new Map());
const clientSockets = new Map(); // ws -> { roomId, playerId }
const roomSockets = new Map();   // roomId -> Set<ws>

function bindSocketToRoom(ws, roomId, playerId) {
  const prev = clientSockets.get(ws);
  if (prev && prev.roomId && prev.roomId !== roomId) {
    const prevSet = roomSockets.get(prev.roomId);
    if (prevSet) {
      prevSet.delete(ws);
      if (prevSet.size === 0) roomSockets.delete(prev.roomId);
    }
  }
  clientSockets.set(ws, { roomId, playerId });
  let s = roomSockets.get(roomId);
  if (!s) {
    s = new Set();
    roomSockets.set(roomId, s);
  }
  s.add(ws);
}

function unbindSocket(ws) {
  const info = clientSockets.get(ws);
  if (info && info.roomId) {
    const s = roomSockets.get(info.roomId);
    if (s) {
      s.delete(ws);
      if (s.size === 0) roomSockets.delete(info.roomId);
    }
  }
  clientSockets.delete(ws);
  return info;
}

/**
 * Ultra-fast O(1) room broadcast: only delivers to active sockets inside the target room.
 * Zero lag, zero full-server scanning.
 */
function broadcastToRoom(roomId, event) {
  const sockets = roomSockets.get(roomId);
  if (!sockets || sockets.size === 0) return;
  const payload = JSON.stringify(event);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Global hook allowing HTTP API in Next.js to trigger real-time WS broadcasts
globalThis._broadcastWsRoomEvent = (roomId, event) => {
  broadcastToRoom(roomId, event);
};

function executeStartRound(room) {
  if (!room.usedWords) room.usedWords = [];
  // Guarantee genre changes every single round
  const available = WORD_CATALOG.filter(
    (w) => !room.usedWords.includes(w.word) && (!room.category || w.category !== room.category)
  );
  const pool = available.length > 0 ? available : WORD_CATALOG.filter((w) => !room.usedWords.includes(w.word));
  const finalPool = pool.length > 0 ? pool : WORD_CATALOG;
  const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
  room.usedWords.push(selected.word);

  const now = Date.now();

  room.status = 'playing';
  room.roundNumber += 1;
  room.targetWord = selected.word;
  room.category = selected.category;
  room.hint = selected.hint;
  room.totalTimeSeconds = RUSH_TIMER_SECONDS;
  room.remainingTimeSeconds = RUSH_TIMER_SECONDS;
  room.serverStartTime = now;
  room.roundStartTimeMs = now;
  room.serverEndTime = now + 999999000;
  room.isRushActive = false;
  room.rushTriggeredBy = undefined;
  room.countdownSeconds = undefined;
  room.countdownEndTime = undefined;

  for (const p of Object.values(room.players)) {
    p.canopyHealth = MAX_CANOPY_FLOATS;
    p.wrongGuesses = 0;
    p.guessedLetters = [];
    p.solvedCount = 0;
    p.isSolved = false;
    p.status = 'typing';
    p.solveTimeMs = undefined;
    p.solveTimeFormatted = undefined;
    p.solveTimeSeconds = undefined;
    p.scoreBreakdown = undefined;
    p.roundScore = 0;
  }

  broadcastToRoom(room.roomId, {
    type: 'ROUND_STARTED',
    room,
  });
  broadcastToRoom(room.roomId, {
    type: 'ROOM_STATE',
    room,
  });
}

function checkRoomLobbyCountdown(room) {
  if (!room || room.status !== 'in_lobby') return;
  const numPlayers = Object.keys(room.players || {}).length;

  if (room.isPublic !== false) {
    if (numPlayers <= 1) {
      if (room.countdownEndTime) {
        room.countdownSeconds = undefined;
        room.countdownEndTime = undefined;
        broadcastToRoom(room.roomId, { type: 'ROOM_STATE', room });
      }
    } else {
      if (!room.countdownEndTime) {
        room.countdownSeconds = 8;
        room.countdownEndTime = Date.now() + 8000;
        broadcastToRoom(room.roomId, { type: 'ROOM_STATE', room });
      }
    }
  }
}

export function startWsServer(port = PORT) {
  if (globalThis._rescueWsServer) {
    return globalThis._rescueWsServer;
  }

  let wss;
  try {
    wss = new WebSocketServer({ port, host: '0.0.0.0' });
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.log(`[CyberRescue WS] Port ${port} is already active, reusing existing instance.`);
      return null;
    }
    throw err;
  }

  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[CyberRescue WS] Port ${port} is in use; continuing with running instance.`);
    } else {
      console.error('[CyberRescue WS] Server error:', err);
    }
  });

  console.log(`[CyberRescue WS] Server listening for ultra-low latency real-time multiplayer on ws://0.0.0.0:${port}`);

  const onlineSockets = new Map(); // ws -> { socketId, name }

  function getTakenNamesForSocket(targetWs) {
    const names = new Set();
    const targetInfo = clientSockets.get(targetWs);
    for (const r of rooms.values()) {
      for (const p of Object.values(r.players || {})) {
        if (!targetInfo || p.id !== targetInfo.playerId) {
          if (p.name && p.name.trim()) names.add(p.name.trim());
        }
      }
    }
    for (const [otherWs, client] of onlineSockets.entries()) {
      if (otherWs !== targetWs && client.name && client.name.trim()) {
        names.add(client.name.trim());
      }
    }
    return Array.from(names);
  }

  function broadcastOnlineNames() {
    for (const clientWs of onlineSockets.keys()) {
      if (clientWs.readyState === 1 /* WebSocket.OPEN */) {
        try {
          const names = getTakenNamesForSocket(clientWs);
          clientWs.send(JSON.stringify({ type: 'ONLINE_NAMES_UPDATE', names }));
        } catch {}
      }
    }
  }

  wss.on('connection', (ws) => {
    const socketId = 's_' + Math.random().toString(36).substring(2, 8);
    onlineSockets.set(ws, { socketId, name: '' });

    // Send instant snapshot of all player names taken by other players
    try {
      ws.send(JSON.stringify({ type: 'ONLINE_NAMES_UPDATE', names: getTakenNamesForSocket(ws) }));
    } catch {}

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Presence announcement (client notifies server of current chosen gamer handle)
        if (msg.type === 'SET_PLAYER_PRESENCE') {
          const client = onlineSockets.get(ws);
          if (client) {
            client.name = (msg.name || '').trim();
            broadcastOnlineNames();
          }
          return;
        }

        // Instant sub-millisecond PING/PONG
        if (msg.type === 'PING') {
          const now = Date.now();
          ws.send(JSON.stringify({
            type: 'PONG',
            clientTimestamp: msg.clientTimestamp,
            serverTimestamp: now,
          }));
          return;
        }

        if (msg.type === 'CREATE_ROOM') {
          const roomId = 'room_' + Math.random().toString(36).substring(2, 8);
          const roomCode = 'SKY-' + Math.floor(10 + Math.random() * 90);
          const playerId = 'p_' + Math.random().toString(36).substring(2, 8);
          const now = Date.now();

          const hostName = ensureUniquePlayerName(msg.playerName || 'Player 1', []);
          const hostAvatar = assignUniqueAvatar([], msg.avatar);

          const hostPlayer = {
            id: playerId,
            name: hostName,
            avatar: hostAvatar,
            isHost: true,
            ping: 18,
            canopyHealth: MAX_CANOPY_FLOATS,
            wrongGuesses: 0,
            guessedLetters: [],
            solvedCount: 0,
            wordsSolved: 0,
            isSolved: false,
            roundScore: 0,
            totalScore: 0,
            status: 'waiting',
          };

          const initWord = WORD_CATALOG[Math.floor(Math.random() * WORD_CATALOG.length)];
          const room = {
            roomId,
            roomCode,
            status: 'in_lobby',
            hostId: playerId,
            roundNumber: 0,
            maxRounds: 12,
            maxPlayers: msg.maxPlayers || 12,
            isPublic: msg.isPublic !== undefined ? msg.isPublic : false,
            targetWord: initWord.word,
            category: initWord.category,
            hint: initWord.hint,
            totalTimeSeconds: RUSH_TIMER_SECONDS,
            remainingTimeSeconds: RUSH_TIMER_SECONDS,
            serverTimestamp: now,
            serverStartTime: now,
            serverEndTime: now + 999999000,
            isRushActive: false,
            players: { [playerId]: hostPlayer },
          };

          rooms.set(roomId, room);
          roomCodes.set(roomCode.toUpperCase(), roomId);
          bindSocketToRoom(ws, roomId, playerId);

          const client = onlineSockets.get(ws);
          if (client) client.name = hostName;
          broadcastOnlineNames();

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            player: hostPlayer,
            room,
          }));
          return;
        }

        if (msg.type === 'QUICK_JOIN') {
          let targetRoom = null;
          // 1. Search for any public room that is currently in_lobby with space (up to 12 players)
          for (const r of rooms.values()) {
            if (r.isPublic !== false && r.status === 'in_lobby' && Object.keys(r.players || {}).length < (r.maxPlayers || 12)) {
              targetRoom = r;
              break;
            }
          }
          // 2. If no lobby room, search for any active public room with space so players always join the existing public game
          if (!targetRoom) {
            for (const r of rooms.values()) {
              if (r.isPublic !== false && Object.keys(r.players || {}).length < (r.maxPlayers || 12)) {
                targetRoom = r;
                break;
              }
            }
          }

          const playerId = 'p_' + Math.random().toString(36).substring(2, 8);

          if (targetRoom) {
            const uniqueName = ensureUniquePlayerName(msg.playerName, targetRoom.players);
            const uniqueAvatar = assignUniqueAvatar(targetRoom.players, msg.avatar);

            const player = {
              id: playerId,
              name: uniqueName,
              avatar: uniqueAvatar,
              isHost: false,
              ping: 20,
              canopyHealth: MAX_CANOPY_FLOATS,
              wrongGuesses: 0,
              guessedLetters: [],
              solvedCount: 0,
              wordsSolved: 0,
              joinedRound: targetRoom.status === 'playing' || targetRoom.status === 'rush' || targetRoom.status === 'round_over' ? (targetRoom.roundNumber || 1) : 1,
              isSolved: false,
              roundScore: 0,
              totalScore: 0,
              status: targetRoom.status === 'playing' || targetRoom.status === 'rush' ? 'typing' : 'waiting',
            };

            targetRoom.players[playerId] = player;
            bindSocketToRoom(ws, targetRoom.roomId, playerId);
            checkRoomLobbyCountdown(targetRoom);

            const client = onlineSockets.get(ws);
            if (client) client.name = player.name;
            broadcastOnlineNames();

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              player,
              room: targetRoom,
            }));

            broadcastToRoom(targetRoom.roomId, {
              type: 'PLAYER_JOINED',
              player,
            });
            broadcastToRoom(targetRoom.roomId, {
              type: 'ROOM_STATE',
              room: targetRoom,
            });
          } else {
            const roomId = 'pub_' + Math.random().toString(36).substring(2, 8);
            const roomCode = 'SKY-' + Math.floor(10 + Math.random() * 90);
            const now = Date.now();

            const hostName = ensureUniquePlayerName(msg.playerName || 'Player 1', []);
            const hostAvatar = assignUniqueAvatar([], msg.avatar);

            const hostPlayer = {
              id: playerId,
              name: hostName,
              avatar: hostAvatar,
              isHost: true,
              ping: 18,
              canopyHealth: MAX_CANOPY_FLOATS,
              wrongGuesses: 0,
              guessedLetters: [],
              solvedCount: 0,
              wordsSolved: 0,
              isSolved: false,
              roundScore: 0,
              totalScore: 0,
              status: 'waiting',
            };

            const initWord = WORD_CATALOG[Math.floor(Math.random() * WORD_CATALOG.length)];
            const room = {
              roomId,
              roomCode,
              status: 'in_lobby',
              hostId: playerId,
              roundNumber: 0,
              maxRounds: 12,
              maxPlayers: 12,
              isPublic: true,
              targetWord: initWord.word,
              category: initWord.category,
              hint: initWord.hint,
              totalTimeSeconds: RUSH_TIMER_SECONDS,
              remainingTimeSeconds: RUSH_TIMER_SECONDS,
              serverTimestamp: now,
              serverStartTime: now,
              serverEndTime: now + 999999000,
              isRushActive: false,
              players: { [playerId]: hostPlayer },
            };

            rooms.set(roomId, room);
            roomCodes.set(roomCode.toUpperCase(), roomId);
            bindSocketToRoom(ws, roomId, playerId);

            const client = onlineSockets.get(ws);
            if (client) client.name = hostName;
            broadcastOnlineNames();

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              player: hostPlayer,
              room,
            }));
          }
          return;
        }

        if (msg.type === 'JOIN_ROOM') {
          let targetRoom = null;
          const searchKey = (msg.roomId || '').trim().toUpperCase();
          if (rooms.has(searchKey)) {
            targetRoom = rooms.get(searchKey);
          } else if (roomCodes.has(searchKey)) {
            targetRoom = rooms.get(roomCodes.get(searchKey));
          } else {
            for (const r of rooms.values()) {
              if (r.roomId?.toUpperCase() === searchKey || r.roomCode?.toUpperCase() === searchKey) {
                targetRoom = r;
                break;
              }
            }
          }

          if (!targetRoom) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `Room ${searchKey} not found` }));
            return;
          }

          let player = msg.playerId && targetRoom.players[msg.playerId]
            ? targetRoom.players[msg.playerId]
            : null;

          if (!player) {
            if (Object.keys(targetRoom.players || {}).length >= (targetRoom.maxPlayers || 12)) {
              ws.send(JSON.stringify({ type: 'ERROR', message: `Room ${searchKey} is full (max ${targetRoom.maxPlayers || 12})` }));
              return;
            }

            const playerId = 'p_' + Math.random().toString(36).substring(2, 8);
            const uniqueName = ensureUniquePlayerName(msg.playerName || 'Player 2', targetRoom.players);
            const uniqueAvatar = assignUniqueAvatar(targetRoom.players, msg.avatar);

            player = {
              id: playerId,
              name: uniqueName,
              avatar: uniqueAvatar,
              isHost: false,
              ping: 22,
              canopyHealth: MAX_CANOPY_FLOATS,
              wrongGuesses: 0,
              guessedLetters: [],
              solvedCount: 0,
              wordsSolved: 0,
              joinedRound: targetRoom.status === 'playing' || targetRoom.status === 'rush' || targetRoom.status === 'round_over' ? (targetRoom.roundNumber || 1) : 1,
              isSolved: false,
              roundScore: 0,
              totalScore: 0,
              status: targetRoom.status === 'playing' || targetRoom.status === 'rush' ? 'typing' : 'waiting',
            };

            targetRoom.players[playerId] = player;
            checkRoomLobbyCountdown(targetRoom);

            broadcastToRoom(targetRoom.roomId, {
              type: 'PLAYER_JOINED',
              player,
            });
            broadcastToRoom(targetRoom.roomId, {
              type: 'ROOM_STATE',
              room: targetRoom,
            });
          }

          bindSocketToRoom(ws, targetRoom.roomId, player.id);

          const client = onlineSockets.get(ws);
          if (client) client.name = player.name;
          broadcastOnlineNames();

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            player,
            room: targetRoom,
          }));
          return;
        }

        const clientInfo = clientSockets.get(ws);
        if (!clientInfo) return;
        const room = rooms.get(clientInfo.roomId);
        if (!room) return;

        if (msg.type === 'START_ROUND') {
          executeStartRound(room);
          return;
        }

        if (msg.type === 'LEAVE_ROOM') {
          const info = unbindSocket(ws);
          if (info) {
            if (ws.readyState === 1 /* WebSocket.OPEN */) {
              try {
                ws.send(JSON.stringify({ type: 'ROOM_LEFT', roomId: info.roomId }));
              } catch {}
            }
            const room = rooms.get(info.roomId);
            if (room && room.players[info.playerId]) {
              delete room.players[info.playerId];
              if (Object.keys(room.players).length === 0) {
                rooms.delete(room.roomId);
                if (room.roomCode) roomCodes.delete(room.roomCode.toUpperCase());
              } else {
                checkRoomLobbyCountdown(room);
                broadcastToRoom(room.roomId, {
                  type: 'PLAYER_LEFT',
                  playerId: info.playerId,
                });
                broadcastToRoom(room.roomId, {
                  type: 'ROOM_STATE',
                  room,
                });
              }
            }
          }
          broadcastOnlineNames();
          return;
        }

        if (msg.type === 'UPDATE_PLAYER_NAME') {
          const player = room.players[clientInfo.playerId];
          if (!player) return;
          const cleanName = (msg.newName || '').trim();
          if (cleanName) {
            const isTaken = Object.values(room.players || {}).some(
              (p) => p.id !== player.id && (p.name || '').trim().toLowerCase() === cleanName.toLowerCase()
            );
            if (isTaken) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'This name is already in use',
              }));
              return;
            }
          }
          const newName = ensureUniquePlayerName(cleanName, room.players, player.id);
          player.name = newName;
          const client = onlineSockets.get(ws);
          if (client) client.name = newName;
          broadcastToRoom(room.roomId, {
            type: 'ROOM_STATE',
            room,
          });
          broadcastOnlineNames();
          return;
        }

        if (msg.type === 'GUESS_LETTER') {
          const guessPlayerId = msg.playerId || clientInfo.playerId;
          const player = room.players[guessPlayerId];
          if (!player || player.isSolved || player.wrongGuesses >= MAX_CANOPY_FLOATS) return;

          const char = msg.char.toUpperCase();
          if (player.guessedLetters.includes(char)) return;

          player.guessedLetters.push(char);
          const isCorrect = room.targetWord.includes(char);
          if (!isCorrect) {
            player.wrongGuesses += 1;
            player.canopyHealth = Math.max(0, MAX_CANOPY_FLOATS - player.wrongGuesses);
            if (player.wrongGuesses >= MAX_CANOPY_FLOATS) {
              player.status = 'landed';
              player.roundScore = 0;
            }
          } else {
            const unique = Array.from(new Set(room.targetWord.split('')));
            player.solvedCount = unique.filter((l) => player.guessedLetters.includes(l)).length;
            if (unique.every((l) => player.guessedLetters.includes(l))) {
              player.isSolved = true;
              player.wordsSolved = (player.wordsSolved || 0) + 1;
              player.status = 'solved';

              const alreadySolved = Object.values(room.players).filter((p) => p.isSolved && p.id !== player.id);
              const isFirst = alreadySolved.length === 0;
              const placement = alreadySolved.length + 1;

              const now = Date.now();
              const solveTimeMs = Math.max(1, now - (room.roundStartTimeMs || room.serverStartTime || now));
              const remaining = Math.max(0, Math.ceil((room.serverEndTime - now) / 1000));
              const rushRemainingMs = room.isRushActive ? Math.max(0, room.serverEndTime - now) : undefined;

              const breakdown = calculateScore({
                word: room.targetWord,
                isSolved: true,
                wrongGuesses: player.wrongGuesses,
                solveTimeMs,
                remainingSeconds: remaining,
                totalSeconds: room.totalTimeSeconds,
                placement,
                isFirstSolver: isFirst,
                isRushActive: room.isRushActive,
                rushRemainingMs,
                currentStreak: player.wordsSolved || 0,
              });

              player.solveTimeMs = solveTimeMs;
              player.solveTimeFormatted = (solveTimeMs / 1000).toFixed(2) + 's';
              player.solveTimeSeconds = Math.round(solveTimeMs / 1000);
              player.scoreBreakdown = breakdown;
              player.roundScore = breakdown.total;
              player.totalScore += breakdown.total;

              if (isFirst) {
                room.isRushActive = true;
                room.rushTriggeredBy = { id: player.id, name: player.name };
                room.serverEndTime = now + RUSH_TIMER_SECONDS * 1000;
                room.remainingTimeSeconds = RUSH_TIMER_SECONDS;
                broadcastToRoom(room.roomId, {
                  type: 'RUSH_TRIGGERED',
                  rushSeconds: RUSH_TIMER_SECONDS,
                  triggeredBy: room.rushTriggeredBy,
                  remainingSeconds: room.remainingTimeSeconds,
                });
              }

              const allFinished = Object.values(room.players).every(
                (p) => p.isSolved || p.status === 'landed'
              );
              if (allFinished) {
                room.status = room.roundNumber >= (room.maxRounds || 12) ? 'match_over' : 'round_over';
              }

              // Broadcast PLAYER_SOLVED to ALL players in the room with dynamic placement!
              broadcastToRoom(room.roomId, {
                type: 'PLAYER_SOLVED',
                playerId: player.id,
                rank: placement,
                breakdown,
                totalScore: player.totalScore,
                roundScore: breakdown.total,
                wordsSolved: player.wordsSolved,
              });
            }
          }

          broadcastToRoom(room.roomId, {
            type: 'ROOM_STATE',
            room,
          });
        }
      } catch (e) {
        console.error('[CyberRescue WS] Message error:', e);
      }
    });

    ws.on('close', () => {
      const info = unbindSocket(ws);
      onlineSockets.delete(ws);
      if (info) {
        const room = rooms.get(info.roomId);
        if (room && room.players[info.playerId]) {
          delete room.players[info.playerId];
          if (Object.keys(room.players).length === 0) {
            rooms.delete(room.roomId);
            if (room.roomCode) roomCodes.delete(room.roomCode.toUpperCase());
          } else {
            checkRoomLobbyCountdown(room);
            broadcastToRoom(room.roomId, {
              type: 'PLAYER_LEFT',
              playerId: info.playerId,
            });
            broadcastToRoom(room.roomId, {
              type: 'ROOM_STATE',
              room,
            });
          }
        }
      }
      broadcastOnlineNames();
    });
  });

  // Authoritative server clock tick for active lobby countdown and rush countdown
  setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      // 1. Public Lobby Countdown Handler (8-second countdown when > 1 player arrives)
      if (room.status === 'in_lobby') {
        const numPlayers = Object.keys(room.players || {}).length;
        if (numPlayers <= 1) {
          if (room.countdownEndTime) {
            room.countdownSeconds = undefined;
            room.countdownEndTime = undefined;
            broadcastToRoom(room.roomId, { type: 'ROOM_STATE', room });
          }
        } else if (room.isPublic !== false) {
          if (!room.countdownEndTime) {
            room.countdownSeconds = 8;
            room.countdownEndTime = now + 8000;
            broadcastToRoom(room.roomId, { type: 'ROOM_STATE', room });
          } else {
            const remaining = Math.max(0, Math.ceil((room.countdownEndTime - now) / 1000));
            if (remaining <= 0) {
              executeStartRound(room);
            } else if (remaining !== room.countdownSeconds) {
              room.countdownSeconds = remaining;
              broadcastToRoom(room.roomId, { type: 'ROOM_STATE', room });
            }
          }
        }
      }

      // 2. Round Over Auto-Start Countdown in Public Rooms
      if (room.status === 'round_over' && room.isPublic !== false && room.roundNumber < (room.maxRounds || 12)) {
        if (!room.countdownEndTime) {
          room.countdownSeconds = 8;
          room.countdownEndTime = now + 8000;
          broadcastToRoom(room.roomId, { type: 'ROOM_STATE', room });
        } else {
          const remaining = Math.max(0, Math.ceil((room.countdownEndTime - now) / 1000));
          if (remaining <= 0) {
            executeStartRound(room);
          } else if (remaining !== room.countdownSeconds) {
            room.countdownSeconds = remaining;
            broadcastToRoom(room.roomId, { type: 'ROOM_STATE', room });
          }
        }
      }

      // 3. Active Playing / Sudden Death Rush Timer
      if (room.status === 'playing' || room.status === 'rush') {
        if (room.isRushActive) {
          const remaining = Math.max(0, Math.ceil((room.serverEndTime - now) / 1000));
          if (remaining !== room.remainingTimeSeconds) {
            room.remainingTimeSeconds = remaining;
            if (remaining <= 0) {
              room.status = room.roundNumber >= (room.maxRounds || 12) ? 'match_over' : 'round_over';
              for (const p of Object.values(room.players)) {
                if (!p.isSolved) {
                  p.status = 'landed';
                  p.roundScore = 0;
                }
              }
              broadcastToRoom(room.roomId, {
                type: 'ROUND_ENDED',
                room,
                leaderboard: Object.values(room.players).sort((a, b) => {
                  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
                  if (b.roundScore !== a.roundScore) return b.roundScore - a.roundScore;
                  if (a.solveTimeMs && b.solveTimeMs && a.solveTimeMs !== b.solveTimeMs) return a.solveTimeMs - b.solveTimeMs;
                  return a.wrongGuesses - b.wrongGuesses;
                }),
              });
              continue;
            }
            broadcastToRoom(room.roomId, {
              type: 'ROOM_STATE',
              room,
            });
          }
        }
      }
    }
  }, 500);

  globalThis._rescueWsServer = wss;
  return wss;
}

// Direct execution entrypoint
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/multiplayer_ws.js')) {
  startWsServer();
}

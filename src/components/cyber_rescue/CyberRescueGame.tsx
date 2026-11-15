'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  createInitialState,
  guessLetter,
  GameState,
  GameMode,
} from '@/lib/cyber_rescue/engine';
import { CategoryType } from '@/lib/cyber_rescue/words';
import { cyberAudio } from '@/lib/cyber_rescue/audio';
import { RescueHeader } from './RescueHeader';
import { JetpackStickman } from './JetpackStickman';
import { GameOverModal } from './GameOverModal';
import { HistoryModal } from './HistoryModal';
import { SettingsModal } from './SettingsModal';
import { LiveMultiplayerPanel } from './LiveMultiplayerPanel';
import { StartMenu } from './StartMenu';
import { useMultiplayerRescue } from '@/hooks/useMultiplayerRescue';
import { getRandomComputerName } from '@/lib/cyber_rescue/multiplayer/roomEngine';
import { X, AlertCircle } from 'lucide-react';
import { addHistoryEntry } from '@/lib/cyber_rescue/history';

export const CyberRescueGame: React.FC = () => {
  const [selectedCategory] = useState<CategoryType>('ALL');
  const [selectedMode, setSelectedMode] = useState<GameMode>(() => {
    if (typeof window !== 'undefined') {
      const activeRoom = localStorage.getItem('rescue_active_room');
      if (activeRoom) {
        try {
          const parsed = JSON.parse(activeRoom);
          if (parsed && parsed.roomId) return 'online';
        } catch (e) { }
      }
      const savedMode = localStorage.getItem('rescue_game_mode');
      if (savedMode === 'solo' || savedMode === 'online') {
        return savedMode as GameMode;
      }
    }
    return 'solo';
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rescue_solo_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.category && parsed.category !== 'ALL') {
            return parsed;
          }
        } catch (e) { }
      }
    }
    return createInitialState('ALL', 'solo');
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [onlineName, setOnlineName] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rescue_player_name');
      if (
        saved &&
        saved.trim() &&
        !saved.toLowerCase().startsWith('operative') &&
        !saved.toLowerCase().startsWith('player ')
      ) {
        return saved.trim();
      }
      const defaultHandle = getRandomComputerName([]);
      localStorage.setItem('rescue_player_name', defaultHandle);
      return defaultHandle;
    }
    return getRandomComputerName([]);
  });
  // Start menu (Quick Play / Private Room / Single Player). Skipped when an active room is being restored.
  const [showMenu, setShowMenu] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const activeRoom = localStorage.getItem('rescue_active_room');
        if (activeRoom && JSON.parse(activeRoom)?.roomId) return false;
      } catch (e) { }
    }
    return true;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastAction, setLastAction] = useState<'correct' | 'wrong' | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Online Multiplayer Hook
  const mp = useMultiplayerRescue();

  // Active match state: locked name change during match
  const isMatchActive =
    selectedMode === 'online'
      ? !!mp.room && (mp.room.status === 'playing' || mp.room.status === 'rush')
      : gameState.status === 'playing' && gameState.wrongGuesses > 0;

  // Synchronized countdown ticker for stickman arena
  const [arenaCountdown, setArenaCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!mp.room?.countdownEndTime) {
      setArenaCountdown(null);
      return;
    }
    const updateCountdown = () => {
      const diff = Math.max(0, Math.ceil((mp.room!.countdownEndTime! - Date.now()) / 1000));
      setArenaCountdown(diff);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [mp.room?.countdownEndTime]);

  const effectiveCountdown = arenaCountdown ?? mp.room?.countdownSeconds ?? 8;
  const isOnlineLobby = selectedMode === 'online' && mp.room?.status === 'in_lobby';
  const isPublicLobby = mp.room ? mp.room.isPublic !== false : true;
  const onlinePlayerCount = mp.room ? Object.keys(mp.room.players || {}).length : 0;

  const arenaLobbyStatus: 'finding_players' | 'countdown' | null =
    isOnlineLobby && isPublicLobby
      ? onlinePlayerCount <= 1
        ? 'finding_players'
        : 'countdown'
      : null;

  // Sync client mount & audio mute state
  useEffect(() => {
    setHasMounted(true);
    setIsMuted(cyberAudio.getMuted());
  }, []);

  // Room joined (or request failed): leave the menu / stop the connecting spinner
  useEffect(() => {
    if (mp.room) {
      setShowMenu(false);
      setIsConnecting(false);
    }
  }, [mp.room]);

  useEffect(() => {
    if (mp.errorMessage) setIsConnecting(false);
  }, [mp.errorMessage]);

  // Safety: never leave the spinner stuck if the server does not answer
  useEffect(() => {
    if (!isConnecting) return;
    const t = setTimeout(() => setIsConnecting(false), 8000);
    return () => clearTimeout(t);
  }, [isConnecting]);

  // Sync mode with restored multiplayer room
  useEffect(() => {
    if (mp.room && selectedMode !== 'online') {
      setSelectedMode('online');
      if (typeof window !== 'undefined') {
        localStorage.setItem('rescue_game_mode', 'online');
      }
    }
  }, [mp.room, selectedMode]);

  // Sync player name only if unassigned
  useEffect(() => {
    if (mp.localPlayer?.name && !onlineName) {
      setOnlineName(mp.localPlayer.name);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rescue_player_name', mp.localPlayer.name);
      }
    }
  }, [mp.localPlayer?.name, onlineName]);

  // Keep presence updated with current chosen handle across WebSocket server and browser tabs
  useEffect(() => {
    if (onlineName && mp.setPresenceName) {
      mp.setPresenceName(onlineName);
    }
  }, [onlineName, mp.setPresenceName]);

  // If chosen name is already active by another online player/tab, auto-assign a fresh unique name
  useEffect(() => {
    if (onlineName && mp.allTakenNames && mp.allTakenNames.length > 0) {
      const isClashing = mp.allTakenNames.some(
        (n) => (n || '').trim().toLowerCase() === onlineName.trim().toLowerCase()
      );
      if (isClashing && !mp.localPlayer) {
        // Player has not joined a match yet, resolve clash immediately
        const fresh = getRandomComputerName([...mp.allTakenNames, onlineName]);
        updateOnlineName(fresh);
      }
    }
  }, [mp.allTakenNames, onlineName, mp.localPlayer]);

  // Persist solo/coop state across refreshes
  useEffect(() => {
    if (selectedMode !== 'online' && typeof window !== 'undefined') {
      try {
        localStorage.setItem('rescue_solo_state', JSON.stringify(gameState));
      } catch (e) { }
    }
  }, [gameState, selectedMode]);

  const updateOnlineName = (name: string) => {
    const trimmed = name.trim() || 'Player 1';
    setOnlineName(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rescue_player_name', trimmed);
    }
    if (mp.setPresenceName) {
      mp.setPresenceName(trimmed);
    }
    if (mp.updatePlayerName) {
      mp.updatePlayerName(trimmed);
    }
  };

  // Comprehensive taken names list across active room, other open tabs, and WebSocket server
  const combinedExistingNames = React.useMemo(() => {
    const names = new Set<string>();
    if (mp.room && mp.room.players) {
      Object.values(mp.room.players).forEach((p) => {
        if (p && p.id !== mp.localPlayer?.id && p.name) names.add(p.name.trim());
      });
    }
    if (mp.allTakenNames) {
      mp.allTakenNames.forEach((n) => {
        if (n && n.trim()) {
          names.add(n.trim());
        }
      });
    }
    return Array.from(names);
  }, [mp.room, mp.localPlayer?.id, mp.allTakenNames]);

  // History: save each finished solo game
  useEffect(() => {
    if (selectedMode === 'online') return;
    if (gameState.status !== 'won' && gameState.status !== 'lost') return;
    const points = gameState.status === 'won' ? gameState.lastScoreBreakdown?.total ?? 0 : 0;
    addHistoryEntry({
      id: `solo:${gameState.targetWord}:${gameState.status}:${gameState.score}`,
      mode: 'solo',
      word: gameState.targetWord,
      category: gameState.category,
      result: gameState.status,
      wrongGuesses: gameState.wrongGuesses,
      points,
      playedAt: Date.now(),
    });
  }, [gameState.status, gameState.targetWord, gameState.score, gameState.category, gameState.wrongGuesses, gameState.lastScoreBreakdown, selectedMode]);

  // History: save each finished online round for the local player
  useEffect(() => {
    const room = mp.room;
    const me = mp.localPlayer;
    if (selectedMode !== 'online' || !room || !me) return;
    const roundEnded = room.status === 'round_over' || room.status === 'match_over';
    const result = me.isSolved ? 'won' : me.status === 'landed' || (roundEnded && !me.isSolved) ? 'lost' : null;
    if (!result) return;
    addHistoryEntry({
      id: `online:${room.roomId}:${room.roundNumber}`,
      mode: 'online',
      word: room.targetWord,
      category: room.category,
      result,
      wrongGuesses: me.wrongGuesses,
      points: result === 'won' ? me.roundScore || 0 : 0,
      playedAt: Date.now(),
    });
  }, [selectedMode, mp.room, mp.localPlayer]);

  // Play victory sound on forfeit win
  useEffect(() => {
    if (mp.room?.isForfeitVictory) {
      cyberAudio.playVictory();
    }
  }, [mp.room?.isForfeitVictory]);

  // Handle letter guess
  const handleGuess = useCallback(
    (letter: string) => {
      if (selectedMode === 'online') {
        if (!mp.room || (mp.room.status !== 'playing' && mp.room.status !== 'rush')) return;
        if (!mp.localPlayer || mp.localPlayer.isSolved || mp.localPlayer.wrongGuesses >= 7) return;

        const char = letter.toUpperCase();
        if (mp.localPlayer.guessedLetters.includes(char)) return;

        const isCorrect = mp.room.targetWord.includes(char);
        mp.guessLetter(char);

        if (isCorrect) {
          setLastAction('correct');
          cyberAudio.playCorrect();
        } else {
          setLastAction('wrong');
          cyberAudio.playWrong();
        }

        setTimeout(() => setLastAction(null), 650);
        return;
      }

      if (gameState.status !== 'playing') return;

      const { state: nextState, isCorrect, alreadyGuessed } = guessLetter(
        gameState,
        letter
      );
      if (alreadyGuessed) return;

      setGameState(nextState);

      // Play audio feedback and trigger reactive stickman animation
      if (isCorrect) {
        setLastAction('correct');
        cyberAudio.playCorrect();
      } else {
        setLastAction('wrong');
        cyberAudio.playWrong();
      }

      setTimeout(() => {
        setLastAction(null);
      }, 650);

      // Check final game outcomes
      if (nextState.status === 'won') {
        cyberAudio.playVictory();
      } else if (nextState.status === 'lost') {
        cyberAudio.playDefeat();
      }
    },
    [gameState, selectedMode, mp]
  );

  // Reset / Next Game
  const handleNextGame = () => {
    if (selectedMode === 'online') {
      if (mp.room && mp.localPlayer?.isHost) {
        mp.startRound();
      }
      return;
    }

    const nextState = createInitialState(
      'ALL',
      selectedMode,
      undefined,
      undefined,
      [gameState.targetWord],
      gameState.category
    );
    // Preserve streak and scores across rounds!
    setGameState({
      ...nextState,
      streak: gameState.streak,
      score: gameState.score,
      player1Score: gameState.player1Score,
      player2Score: gameState.player2Score,
    });
  };

  const handleCreateOnlineRoom = (name: string) => {
    const finalName = name.trim() || onlineName.trim() || getRandomComputerName([]);
    updateOnlineName(finalName);
    setSelectedMode('online');
    if (typeof window !== 'undefined') {
      localStorage.setItem('rescue_game_mode', 'online');
    }
    mp.createRoom(finalName, selectedCategory);
  };

  const handleJoinOnlineRoom = (code: string, name: string) => {
    const finalName = name.trim() || onlineName.trim() || getRandomComputerName([]);
    updateOnlineName(finalName);
    setSelectedMode('online');
    if (typeof window !== 'undefined') {
      localStorage.setItem('rescue_game_mode', 'online');
    }
    mp.joinRoom(code, finalName);
  };

  const handleQuickJoinLobby = () => {
    const finalName = onlineName.trim() || getRandomComputerName([]);
    updateOnlineName(finalName);
    setSelectedMode('online');
    if (typeof window !== 'undefined') {
      localStorage.setItem('rescue_game_mode', 'online');
    }
    mp.quickJoinLobby(finalName);
  };

  const handleToggleMute = () => {
    const nextMuted = cyberAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  // Start-menu actions
  const handleMenuQuickPlay = () => {
    setIsConnecting(true);
    handleQuickJoinLobby();
  };

  const handleMenuCreatePrivate = () => {
    setIsConnecting(true);
    handleCreateOnlineRoom(onlineName);
  };

  const handleMenuJoinPrivate = (code: string) => {
    setIsConnecting(true);
    handleJoinOnlineRoom(code, onlineName);
  };

  const handleMenuSinglePlayer = () => {
    if (selectedMode === 'online') {
      mp.leaveRoom();
    }
    setSelectedMode('solo');
    if (typeof window !== 'undefined') {
      localStorage.setItem('rescue_game_mode', 'solo');
    }
    // Keep an unfinished solo game, otherwise start a fresh one
    if (gameState.mode !== 'solo' || gameState.status !== 'playing') {
      const nextState = createInitialState(selectedCategory, 'solo');
      setGameState({ ...nextState, streak: gameState.streak, score: gameState.score });
    }
    setShowMenu(false);
  };

  const handleLeaveMatch = () => {
    setShowMenu(true);
    setIsConnecting(false);
    mp.leaveRoom();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('rescue_active_room');
        localStorage.removeItem('rescue_local_player');
      } catch (e) { }
    }
  };

  if (!hasMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200 font-sans gap-3 select-none">
        <span className="text-4xl animate-bounce">🪂</span>
        <span className="text-sm font-bold tracking-wider text-cyan-300">
          PREPARING STICKMAN RESCUE...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-3 sm:p-5 max-w-7xl mx-auto w-full justify-between gap-3 relative select-none">
      {/* Floating Error Notification Toast */}
      {mp.errorMessage && (
        <div
          data-testid="global-error-toast"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-rose-950/95 border border-rose-500/80 text-rose-200 shadow-2xl backdrop-blur-md animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-wide">
            {mp.errorMessage}
          </span>
          <button
            type="button"
            onClick={mp.clearError}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/50 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <RescueHeader
        streak={selectedMode === 'online' ? 0 : gameState.streak}
        score={selectedMode === 'online' && mp.localPlayer ? mp.localPlayer.totalScore : gameState.score}
        mode={selectedMode}
        turn={gameState.turn}
        player1Score={gameState.player1Score}
        player2Score={gameState.player2Score}
        isMuted={isMuted}
        playerName={onlineName}
        onToggleMute={handleToggleMute}
        onNewGame={handleNextGame}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLeaveMatch={selectedMode === 'online' && mp.room ? handleLeaveMatch : undefined}
        onOpenMenu={showMenu ? undefined : () => setShowMenu(true)}
      />

      {/* Center Stage */}
      <main className="flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-4 w-full">
        {/* START MENU: first screen, and whenever online mode has no room */}
        {showMenu || (selectedMode === 'online' && !mp.room) ? (
          <StartMenu
            playerName={onlineName}
            busy={isConnecting}
            onQuickPlay={handleMenuQuickPlay}
            onCreatePrivate={handleMenuCreatePrivate}
            onJoinPrivate={handleMenuJoinPrivate}
            onSinglePlayer={handleMenuSinglePlayer}
          />
        ) : (
          <div className="flex flex-col lg:flex-row items-stretch w-full flex-1 bg-slate-900 border border-slate-800 overflow-hidden">
            {/* Left Side Live Match Panel (Online Mode inside a match) */}
            {selectedMode === 'online' && mp.room && (
              <LiveMultiplayerPanel
                room={mp.room}
                localPlayer={mp.localPlayer}
                opponents={mp.opponents}
                ping={mp.ping}
                isRushActive={mp.isRushActive}
                rushTriggeredBy={mp.rushTriggeredBy}
                onStartRound={mp.startRound}
              />
            )}

            {/* Stickman Floating Arena (Active Game: Solo, Duel, or Active Online Match) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-w-0">
              <JetpackStickman
                wrongGuesses={
                  selectedMode === 'online' && mp.localPlayer
                    ? mp.localPlayer.wrongGuesses
                    : gameState.wrongGuesses
                }
                maxStrikes={gameState.maxStrikes}
                status={
                  selectedMode === 'online'
                    ? mp.localPlayer?.isSolved
                      ? 'won'
                      : mp.localPlayer?.status === 'landed'
                        ? 'lost'
                        : 'playing'
                    : gameState.status
                }
                lastAction={lastAction}
                targetWord={
                  selectedMode === 'online'
                    ? mp.room?.targetWord || 'RESCUE'
                    : gameState.targetWord
                }
                guessedLetters={
                  selectedMode === 'online' && mp.localPlayer
                    ? mp.localPlayer.guessedLetters
                    : gameState.guessedLetters
                }
                category={
                  selectedMode === 'online' && mp.room
                    ? mp.room.category
                    : gameState.category
                }
                scannedLetters={gameState.scannedLetters}
                disabled={
                  selectedMode === 'online'
                    ? !mp.room ||
                    (mp.room.status !== 'playing' && mp.room.status !== 'rush') ||
                    !!mp.localPlayer?.isSolved ||
                    (mp.localPlayer?.wrongGuesses ?? 0) >= 7
                    : gameState.status !== 'playing'
                }
                onGuess={handleGuess}
                playerName={selectedMode === 'online' && mp.localPlayer ? mp.localPlayer.name : undefined}
                playerAvatar={selectedMode === 'online' && mp.localPlayer ? mp.localPlayer.avatar : undefined}
                lobbyStatus={arenaLobbyStatus}
                countdownSeconds={effectiveCountdown}
              />
            </div>
          </div>
        )}
      </main>

      {/* Game Over / Victory Modal (Solo & Duel) */}
      {selectedMode !== 'online' && !showMenu && (
        <GameOverModal
          status={gameState.status}
          targetWord={gameState.targetWord}
          category={gameState.category}
          score={gameState.score}
          streak={gameState.streak}
          solveTimeMs={gameState.lastSolveTimeMs}
          breakdown={gameState.lastScoreBreakdown}
          onNext={handleNextGame}
        />
      )}

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {/* Topbar Settings Modal (Player Name & Audio Preferences) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        playerName={onlineName}
        onSavePlayerName={updateOnlineName}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isMatchActive={isMatchActive}
        existingNames={combinedExistingNames}
      />

    </div>
  );
};

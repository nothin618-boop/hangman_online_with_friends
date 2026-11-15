import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getRoundMarks, LiveMultiplayerPanel } from '@/components/cyber_rescue/LiveMultiplayerPanel';
import { RescueHeader } from '@/components/cyber_rescue/RescueHeader';
import { CloudStickman } from '@/components/cyber_rescue/CloudStickman';
import { MultiplayerRoomState, MultiplayerPlayer } from '@/lib/cyber_rescue/multiplayer/types';

describe('CyberRescue Multiplayer UI Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  const mockLocalPlayer: MultiplayerPlayer = {
    id: 'p1',
    name: 'Operative Alpha',
    avatar: '🦊',
    isHost: true,
    ping: 24,
    canopyHealth: 6, // 1 wrong guess
    wrongGuesses: 1,
    guessedLetters: ['A', 'E'],
    solvedCount: 2,
    isSolved: false,
    roundScore: 0,
    totalScore: 280,
    status: 'typing',
  };

  const mockOpponent: MultiplayerPlayer = {
    id: 'p2',
    name: 'Operative Blaze',
    avatar: '🐯',
    isHost: false,
    ping: 32,
    canopyHealth: 7, // 0 wrong guesses
    wrongGuesses: 0,
    guessedLetters: ['P', 'O', 'K', 'E', 'M', 'O', 'N'],
    solvedCount: 7,
    isSolved: true,
    roundScore: 295,
    totalScore: 410,
    status: 'solved',
  };

  const mockRoom: MultiplayerRoomState = {
    roomId: 'room-123',
    roomCode: 'SKY-42',
    status: 'playing',
    isPublic: false,
    hostId: 'p1',
    roundNumber: 1,
    maxRounds: 3,
    targetWord: 'POKEMON',
    category: 'GAMING',
    totalTimeSeconds: 45,
    remainingTimeSeconds: 28,
    serverTimestamp: Date.now(),
    serverStartTime: Date.now() - 17000,
    serverEndTime: Date.now() + 28000,
    isRushActive: false,
    players: {
      p1: mockLocalPlayer,
      p2: mockOpponent,
    },
  };

  describe('1. LiveMultiplayerPanel Component', () => {
    it('renders room code and live network ping', () => {
      render(
        <LiveMultiplayerPanel
          room={mockRoom}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={24}
          isRushActive={false}
        />
      );

      expect(screen.getByText('SKY-42')).toBeDefined();
      expect(screen.getByText('24ms')).toBeDefined();
    });

    it('displays room code and copy button cleanly in public lobby', () => {
      render(
        <LiveMultiplayerPanel
          room={{ ...mockRoom, isPublic: true }}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={24}
          isRushActive={false}
        />
      );

      expect(screen.getByTestId('copy-room-code-btn')).toBeDefined();
      expect(screen.getByText('SKY-42')).toBeDefined();
    });

    it('hides code race badge and shows rush timer countdown when rush is active', () => {
      const { rerender } = render(
        <LiveMultiplayerPanel
          room={mockRoom}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={24}
          isRushActive={false}
        />
      );

      expect(screen.queryByText('CODE RACE')).toBeNull();
      expect(screen.queryByText('1ST SOLVE STARTS TIMER')).toBeNull();

      rerender(
        <LiveMultiplayerPanel
          room={{ ...mockRoom, isRushActive: true, remainingTimeSeconds: 15 }}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={24}
          isRushActive={true}
          rushTriggeredBy={{ id: 'p2', name: 'Operative Blaze' }}
        />
      );

      const timerDigits = screen.getByTestId('round-timer-digits');
      expect(timerDigits.textContent).toBe('15s');
    });

    it('renders player cards with avatar, score and status', () => {
      render(
        <LiveMultiplayerPanel
          room={mockRoom}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={24}
          isRushActive={false}
        />
      );

      // Local player
      expect(screen.getByText('Operative Alpha')).toBeDefined();
      expect(screen.getByText('YOU')).toBeDefined();
      expect(screen.getByText(/280 pts/i)).toBeDefined();

      // Opponent who solved
      expect(screen.getByText('Operative Blaze')).toBeDefined();
      expect(screen.getByText(/410 pts/i)).toBeDefined();
      expect(screen.getAllByText(/SOLVED/i).length).toBeGreaterThan(0);
    });

    it('displays rush announcement pill and energetic styling when rush is active', () => {
      const rushRoom: MultiplayerRoomState = {
        ...mockRoom,
        isRushActive: true,
        rushTriggeredBy: { id: 'p2', name: 'Operative Blaze' },
        remainingTimeSeconds: 15,
      };

      render(
        <LiveMultiplayerPanel
          room={rushRoom}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={24}
          isRushActive={true}
          rushTriggeredBy={{ id: 'p2', name: 'Operative Blaze' }}
        />
      );

      const rushPill = screen.getByTestId('rush-announcement-pill');
      expect(rushPill.textContent).toContain('Operative Blaze cracked the word! 15s rush!');
      expect(screen.getByText('SUDDEN DEATH RUSH')).toBeDefined();
    });

    it('shows a cross for the current round (no LANDED text) when player collapses canopy', () => {
      const landedPlayer: MultiplayerPlayer = {
        ...mockOpponent,
        isSolved: false,
        wrongGuesses: 7,
        canopyHealth: 0,
        status: 'landed',
        roundScore: 0,
      };

      render(
        <LiveMultiplayerPanel
          room={mockRoom}
          localPlayer={mockLocalPlayer}
          opponents={[landedPlayer]}
          ping={24}
          isRushActive={false}
        />
      );

      expect(screen.queryByText('💥 LANDED (0)')).toBeNull();
      const marks = screen.getByTestId(`player-rounds-${landedPlayer.id}`);
      expect(marks.querySelector('[data-mark="lost"]')).not.toBeNull();
    });
  });

    it('renders max 10 players counter and player details clearly', () => {
      render(
        <LiveMultiplayerPanel
          room={{ ...mockRoom, maxPlayers: 10 }}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={24}
          isRushActive={false}
        />
      );

      expect(screen.getByText(/PLAYERS \(2\/10\)/i)).toBeDefined();
      expect(screen.getByText('Operative Alpha')).toBeDefined();
      expect(screen.getByText('Operative Blaze')).toBeDefined();
    });

  describe('RescueHeader Minimal Topbar & Player Name Suite', () => {
    it('renders player name in topbar and opens settings on click', () => {
      const onOpenSettings = vi.fn();
      render(
        <RescueHeader
          streak={3}
          score={150}
          mode="online"
          turn={1}
          player1Score={0}
          player2Score={0}
          isMuted={false}
          playerName="CyberHawk"
          onToggleMute={vi.fn()}
          onChangeMode={vi.fn()}
          onNewGame={vi.fn()}
          onOpenSettings={onOpenSettings}
        />
      );

      const nameBtn = screen.getByTestId('topbar-player-name-btn');
      expect(nameBtn).toBeDefined();
      expect(nameBtn.textContent).toContain('CyberHawk');

      fireEvent.click(nameBtn);
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('renders leave match button when onLeaveMatch is provided and triggers callback', () => {
      const onLeaveMatch = vi.fn();
      render(
        <RescueHeader
          streak={0}
          score={100}
          mode="online"
          turn={1}
          player1Score={0}
          player2Score={0}
          isMuted={false}
          onToggleMute={vi.fn()}
          onChangeMode={vi.fn()}
          onNewGame={vi.fn()}
          onLeaveMatch={onLeaveMatch}
        />
      );

      const leaveBtn = screen.getByTestId('topbar-leave-match-btn');
      expect(leaveBtn).toBeDefined();
      fireEvent.click(leaveBtn);
      expect(onLeaveMatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Public Lobby Auto-Countdown & Finding Players Suite', () => {
    it('shows finding players indicator and hides start button in public lobby with 1 player', () => {
      const publicRoom1Player: MultiplayerRoomState = {
        ...mockRoom,
        status: 'in_lobby',
        isPublic: true,
        players: {
          p1: mockLocalPlayer,
        },
      };

      render(
        <LiveMultiplayerPanel
          room={publicRoom1Player}
          localPlayer={mockLocalPlayer}
          opponents={[]}
          ping={20}
          isRushActive={false}
          onStartRound={vi.fn()}
        />
      );

      // Must show finding players indicator
      expect(screen.getByTestId('finding-players-indicator')).toBeDefined();
      expect(screen.getByText('FINDING PLAYERS...')).toBeDefined();
      // Must NOT have start button
      expect(screen.queryByTestId('start-round-btn')).toBeNull();
    });

    it('shows 8s countdown banner and hides start button in public lobby when > 1 player arrives', () => {
      const publicRoom2Players: MultiplayerRoomState = {
        ...mockRoom,
        status: 'in_lobby',
        isPublic: true,
        countdownSeconds: 8,
        countdownEndTime: Date.now() + 8000,
        players: {
          p1: mockLocalPlayer,
          p2: mockOpponent,
        },
      };

      render(
        <LiveMultiplayerPanel
          room={publicRoom2Players}
          localPlayer={mockLocalPlayer}
          opponents={[mockOpponent]}
          ping={20}
          isRushActive={false}
          onStartRound={vi.fn()}
        />
      );

      // Must show countdown banner
      expect(screen.getByTestId('lobby-countdown-banner')).toBeDefined();
      expect(screen.getByTestId('lobby-countdown-digits')).toBeDefined();
      expect(screen.getByText('PLAYERS FOUND! STARTING IN')).toBeDefined();
      // Must NOT have start button
      expect(screen.queryByTestId('start-round-btn')).toBeNull();
    });

    it('shows manual start button in private custom room', () => {
      const privateRoom: MultiplayerRoomState = {
        ...mockRoom,
        status: 'in_lobby',
        isPublic: false,
        players: {
          p1: mockLocalPlayer,
        },
      };

      render(
        <LiveMultiplayerPanel
          room={privateRoom}
          localPlayer={mockLocalPlayer}
          opponents={[]}
          ping={20}
          isRushActive={false}
          onStartRound={vi.fn()}
        />
      );

      expect(screen.getByTestId('start-round-btn')).toBeDefined();
    });
  });

  describe('Arena Stickman Lobby Loading & Countdown Suite', () => {
    it('renders finding players loading state over stickman arena when lobbyStatus is finding_players', () => {
      render(
        <CloudStickman
          wrongGuesses={0}
          maxStrikes={7}
          status="playing"
          lobbyStatus="finding_players"
        />
      );

      expect(screen.getByTestId('arena-finding-players')).toBeDefined();
      expect(screen.getByText('FINDING PLAYERS...')).toBeDefined();
      expect(screen.getByText('Searching for opponents to join public lobby')).toBeDefined();
      expect(screen.queryByTestId('word-letters-tray')).toBeNull();
    });

    it('renders match countdown banner over stickman arena when lobbyStatus is countdown', () => {
      render(
        <CloudStickman
          wrongGuesses={0}
          maxStrikes={7}
          status="playing"
          lobbyStatus="countdown"
          countdownSeconds={6}
        />
      );

      expect(screen.getByTestId('arena-match-countdown')).toBeDefined();
      expect(screen.getByText('OPPONENT FOUND! MATCH STARTING')).toBeDefined();
      expect(screen.getByText('6s')).toBeDefined();
      expect(screen.queryByTestId('word-letters-tray')).toBeNull();
    });

    it('renders word letters and category when lobbyStatus is null (active gameplay)', () => {
      render(
        <CloudStickman
          wrongGuesses={0}
          maxStrikes={7}
          status="playing"
          targetWord="RESCUE"
          category="GAMING"
          lobbyStatus={null}
        />
      );

      expect(screen.queryByTestId('arena-finding-players')).toBeNull();
      expect(screen.queryByTestId('arena-match-countdown')).toBeNull();
      expect(screen.getByTestId('category-badge')).toBeDefined();
      expect(screen.getByText('GAMING')).toBeDefined();
      expect(screen.getByTestId('word-letters-tray')).toBeDefined();
    });
  });
});

describe('getRoundMarks', () => {
  const base: any = { id: 'p', name: 'P', avatar: 'sticker_classic', isHost: false, ping: 1, canopyHealth: 7, wrongGuesses: 0, guessedLetters: [], solvedCount: 0, wordsSolved: 0, isSolved: false, roundScore: 0, totalScore: 0, status: 'typing' };
  const room = (roundNumber: number, status: any) => ({ roundNumber, status, maxRounds: 12 });

  it('returns one mark per round, all pending in lobby', () => {
    const marks = getRoundMarks(base, room(1, 'in_lobby'));
    expect(marks).toHaveLength(12);
    expect(marks.every((m) => m === null)).toBe(true);
  });

  it('marks current round lost when landed and won when solved', () => {
    expect(getRoundMarks({ ...base, status: 'landed' }, room(1, 'playing'))[0]).toBe('lost');
    expect(getRoundMarks({ ...base, isSolved: true, status: 'solved', wordsSolved: 1 }, room(1, 'playing'))[0]).toBe('won');
  });

  it('uses recorded results for earlier rounds', () => {
    const marks = getRoundMarks({ ...base, wordsSolved: 1 }, room(3, 'playing'), { 1: 'lost', 2: 'won' });
    expect(marks.slice(0, 4)).toEqual(['lost', 'won', null, null]);
  });

  it('rebuilds unseen earlier rounds from the solved count', () => {
    const marks = getRoundMarks({ ...base, wordsSolved: 1 }, room(4, 'playing'));
    expect(marks.slice(0, 4)).toEqual(['won', 'lost', 'lost', null]);
  });

  it('ignores rounds before a late join', () => {
    const marks = getRoundMarks({ ...base, joinedRound: 3 }, room(3, 'playing'));
    expect(marks.slice(0, 3)).toEqual([null, null, null]);
  });
});

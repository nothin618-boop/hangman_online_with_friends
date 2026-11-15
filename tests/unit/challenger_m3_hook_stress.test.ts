import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWhisperGame } from '@/hooks/useWhisperGame';
import { soundEngine } from '@/lib/audio';
import { SanitizedChain } from '@/lib/types';

describe('Challenger M3: Adversarial Client State Hook Stress Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. State Initialization & Robustness', () => {
    it('handles corrupted streak and corrupted mute state in localStorage without crashing', () => {
      localStorage.setItem('whisper_streak', 'NOT_A_NUMBER');
      localStorage.setItem('whisper_muted', 'INVALID_BOOLEAN');
      localStorage.setItem('whisper_my_chains', '{malformed_json:');

      const { result } = renderHook(() => useWhisperGame());

      expect(result.current.streak).toBe(0);
      expect(result.current.isMuted).toBe(false);
      expect(result.current.myActiveChains).toEqual([]);
      expect(result.current.playerId).toMatch(/^player-[a-z0-9]+$/);
    });

    it('toggleMute synchronizes hook state, soundEngine, and localStorage', () => {
      const { result } = renderHook(() => useWhisperGame());
      expect(result.current.isMuted).toBe(false);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(true);
      expect(soundEngine.isMuted()).toBe(true);
      expect(localStorage.getItem('whisper_muted')).toBe('true');

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(false);
      expect(soundEngine.isMuted()).toBe(false);
      expect(localStorage.getItem('whisper_muted')).toBe('false');
    });
  });

  describe('2. Network Failure & Error Handling in Actions', () => {
    it('interceptWhisper: handles network rejection gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Offline'));
      const clickSpy = vi.spyOn(soundEngine, 'playClick');

      const { result } = renderHook(() => useWhisperGame());

      await act(async () => {
        await result.current.interceptWhisper();
      });

      expect(clickSpy).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.activeChain).toBeNull();
      expect(result.current.statusMessage).toContain('NETWORK INTERFERENCE');
    });

    it('interceptWhisper: handles server empty queue response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          success: false,
          message: 'NO ACTIVE WHISPERS AVAILABLE. AUTO-SPAWNER CALIBRATING...',
        }),
      } as Response);

      const { result } = renderHook(() => useWhisperGame());

      await act(async () => {
        await result.current.interceptWhisper();
      });

      expect(result.current.activeChain).toBeNull();
      expect(result.current.statusMessage).toContain('NO ACTIVE WHISPERS');
    });

    it('submitWordDisguise: triggers trap alarm sound and resets streak on trap hit', async () => {
      const trapSpy = vi.spyOn(soundEngine, 'playTrapAlarm');
      const mockChain: SanitizedChain = {
        id: 'chain-trap-123',
        sentence: 'The quick brown fox jumps',
        currentHop: 3,
        lives: 3,
        status: 'active',
        originTheme: 'secret-theme',
        history: [],
        leaseExpiresAt: Date.now() + 60000,
      };

      global.fetch = vi
        .fn()
        // First mock intercept
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            chain: mockChain,
            role: 'shifter',
          }),
        } as Response)
        // Then mock submit trap
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            isTrap: true,
            message: 'Secret trap triggered',
            chain: { ...mockChain, lives: 2 },
          }),
        } as Response);

      const { result } = renderHook(() => useWhisperGame());

      await act(async () => {
        await result.current.interceptWhisper();
      });

      expect(result.current.activeChain).not.toBeNull();

      await act(async () => {
        const res = await result.current.submitWordDisguise(2, 'hound');
        expect(res.success).toBe(true);
      });

      expect(trapSpy).toHaveBeenCalled();
      expect(result.current.streak).toBe(0);
      expect(result.current.activeChain).toBeNull();
    });

    it('submitWordDisguise: triggers victory sound when chain reaches victory', async () => {
      const victorySpy = vi.spyOn(soundEngine, 'playVictory');
      const mutationSpy = vi.spyOn(soundEngine, 'playMutation');
      const mockChain: SanitizedChain = {
        id: 'chain-vic-99',
        sentence: 'A century of hops recorded',
        currentHop: 99,
        lives: 3,
        status: 'active',
        originTheme: 'secret-theme',
        history: [],
        leaseExpiresAt: Date.now() + 60000,
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            chain: mockChain,
            role: 'shifter',
          }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            isTrap: false,
            status: 'victory',
            chain: { ...mockChain, currentHop: 100, status: 'victory' },
          }),
        } as Response);

      const { result } = renderHook(() => useWhisperGame());

      await act(async () => {
        await result.current.interceptWhisper();
      });

      await act(async () => {
        const res = await result.current.submitWordDisguise(1, 'era');
        expect(res.success).toBe(true);
      });

      expect(mutationSpy).toHaveBeenCalled();
      expect(victorySpy).toHaveBeenCalled();
      expect(result.current.streak).toBe(1);
    });

    it('submitDecoderGuess: plays bonus chime on correct and strike on wrong deduction', async () => {
      const bonusSpy = vi.spyOn(soundEngine, 'playDecoderBonus');
      const strikeSpy = vi.spyOn(soundEngine, 'playStrike');

      const mockChain: SanitizedChain = {
        id: 'chain-dec-10',
        sentence: 'Cryptographic riddle awaits decoder',
        currentHop: 10,
        lives: 3,
        status: 'active',
        originTheme: 'enigma-machine',
        decoyThemes: ['cyber-warfare', 'apollo-guidance', 'stealth-recon'],
        history: [],
        leaseExpiresAt: Date.now() + 60000,
      };

      // Scenario A: Correct Guess
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: async () => ({ success: true, chain: mockChain, role: 'decoder' }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            correct: true,
            bonusAwarded: 10,
            chain: { ...mockChain, currentHop: 20 },
          }),
        } as Response);

      const { result } = renderHook(() => useWhisperGame());

      await act(async () => {
        await result.current.interceptWhisper();
      });

      await act(async () => {
        const res = await result.current.submitDecoderGuess('enigma-machine');
        expect(res.success).toBe(true);
        expect(res.correct).toBe(true);
      });

      expect(bonusSpy).toHaveBeenCalled();
      expect(result.current.streak).toBe(1);

      // Scenario B: Incorrect Guess
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: async () => ({ success: true, chain: mockChain, role: 'decoder' }),
        } as Response)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            correct: false,
            chain: { ...mockChain, lives: 2 },
          }),
        } as Response);

      await act(async () => {
        await result.current.interceptWhisper();
      });

      await act(async () => {
        const res = await result.current.submitDecoderGuess('wrong-theme');
        expect(res.success).toBe(true);
        expect(res.correct).toBe(false);
      });

      expect(strikeSpy).toHaveBeenCalled();
      expect(result.current.streak).toBe(0);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWhisperGame } from '@/hooks/useWhisperGame';
import { soundEngine } from '@/lib/audio';

describe('useWhisperGame Hook Suite (Milestone M3)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('generates and persists anonymous player ID in localStorage with player- prefix', () => {
    const { result } = renderHook(() => useWhisperGame());

    expect(result.current.playerId).toMatch(/^player-[a-z0-9]+$/);
    expect(localStorage.getItem('whisper_player_id')).toBe(result.current.playerId);
    expect(result.current.playerAlias).toBeDefined();
    expect(typeof result.current.playerAlias).toBe('string');
  });

  it('reuses existing player ID from localStorage if present', () => {
    localStorage.setItem('whisper_player_id', 'player-custom-12345');

    const { result } = renderHook(() => useWhisperGame());

    expect(result.current.playerId).toBe('player-custom-12345');
  });

  it('toggles audio mute and persists to localStorage', () => {
    const toggleSpy = vi.spyOn(soundEngine, 'toggleMute');
    const { result } = renderHook(() => useWhisperGame());

    act(() => {
      result.current.toggleMute();
    });

    expect(toggleSpy).toHaveBeenCalled();
    expect(localStorage.getItem('whisper_muted')).toBe(String(result.current.isMuted));
  });

  it('initializes with default telemetry, 0 streak, and empty monitored chains', () => {
    const { result } = renderHook(() => useWhisperGame());

    expect(result.current.streak).toBe(0);
    expect(result.current.telemetry.activeWhispers).toBe(0);
    expect(result.current.telemetry.playersOnline).toBe(1);
    expect(result.current.myActiveChains).toEqual([]);
    expect(result.current.activeChain).toBeNull();
  });
});

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SanitizedChain, PlayerRole, ChainStatus } from '@/lib/types';
import { JurySummonPayload, TelemetryPayload, ChainMutatedPayload } from '@/lib/events';
import { soundEngine } from '@/lib/audio';
import { generatePlayerAlias } from '@/lib/ghosts';

export interface MonitoredChain {
  chainId: string;
  currentHop: number;
  lives: number;
  status: ChainStatus;
  role: PlayerRole;
  lastUpdated: number;
}

export function useWhisperGame() {
  const [playerId, setPlayerId] = useState<string>('');
  const [playerAlias, setPlayerAlias] = useState<string>('Operative_00');
  const [activeChain, setActiveChain] = useState<SanitizedChain | null>(null);
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryPayload>({ activeWhispers: 0, playersOnline: 1 });
  const [streak, setStreak] = useState<number>(0);
  const [myActiveChains, setMyActiveChains] = useState<MonitoredChain[]>([]);
  const [activeJuryCase, setActiveJuryCase] = useState<JurySummonPayload | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSecondSoundRef = useRef<number>(-1);

  // 1. Initialize anonymous player ID and persistent state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let pid = '';
    try {
      pid = localStorage.getItem('whisper_player_id') || '';
    } catch {
      pid = '';
    }

    if (!pid) {
      pid = `player-${Math.random().toString(36).substring(2, 9)}`;
      try {
        localStorage.setItem('whisper_player_id', pid);
      } catch {}
    }

    setPlayerId(pid);
    setPlayerAlias(generatePlayerAlias(pid));

    try {
      const savedStreak = parseInt(localStorage.getItem('whisper_streak') || '0', 10);
      setStreak(isNaN(savedStreak) ? 0 : savedStreak);

      const savedMuted = localStorage.getItem('whisper_muted') === 'true';
      setIsMuted(savedMuted);
      soundEngine.setMuted(savedMuted);

      const savedChains = localStorage.getItem('whisper_my_chains');
      if (savedChains) {
        setMyActiveChains(JSON.parse(savedChains));
      }
    } catch {}
  }, []);

  // Sync streak to localStorage
  const updateStreak = useCallback((updater: (prev: number) => number) => {
    setStreak((prev) => {
      const next = Math.max(0, updater(prev));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('whisper_streak', next.toString());
        } catch {}
      }
      return next;
    });
  }, []);

  // Sync myActiveChains to localStorage
  const trackChain = useCallback((chain: SanitizedChain, assignedRole: PlayerRole) => {
    setMyActiveChains((prev) => {
      const existing = prev.filter((c) => c.chainId !== chain.id);
      const updated: MonitoredChain[] = [
        {
          chainId: chain.id,
          currentHop: chain.currentHop + (chain.bonusHops || 0),
          lives: chain.lives,
          status: chain.status,
          role: assignedRole,
          lastUpdated: Date.now(),
        },
        ...existing,
      ].slice(0, 10);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('whisper_my_chains', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  // 2. Real-Time SSE Stream Listener with Auto-Reconnect
  useEffect(() => {
    if (!playerId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let backoff = 1000;

    function connectSSE() {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

      eventSource = new EventSource(`/api/chains/stream?playerId=${encodeURIComponent(playerId)}`);

      eventSource.addEventListener('telemetry', (e) => {
        try {
          const data: TelemetryPayload = JSON.parse(e.data);
          setTelemetry(data);
        } catch {}
      });

      eventSource.addEventListener('chain_mutated', (e) => {
        try {
          const data: ChainMutatedPayload = JSON.parse(e.data);
          setActiveChain((prev) => {
            if (prev && prev.id === data.chainId) {
              return {
                ...prev,
                currentHop: data.currentHop,
                lives: data.lives,
                status: data.status,
              };
            }
            return prev;
          });

          setMyActiveChains((prev) =>
            prev.map((c) =>
              c.chainId === data.chainId
                ? {
                    ...c,
                    currentHop: data.currentHop,
                    lives: data.lives,
                    status: data.status,
                    lastUpdated: Date.now(),
                  }
                : c
            )
          );
        } catch {}
      });

      eventSource.addEventListener('chain_archived', (e) => {
        try {
          const data = JSON.parse(e.data);
          setMyActiveChains((prev) =>
            prev.map((c) =>
              c.chainId === data.chainId
                ? { ...c, status: data.outcome as ChainStatus, lastUpdated: Date.now() }
                : c
            )
          );
          setActiveChain((prev) => {
            if (prev && prev.id === data.chainId) {
              return { ...prev, status: data.outcome as ChainStatus };
            }
            return prev;
          });
        } catch {}
      });

      eventSource.addEventListener('jury_summon', (e) => {
        try {
          const payload: JurySummonPayload = JSON.parse(e.data);
          setActiveJuryCase(payload);
          soundEngine.playJurySummon();
        } catch {}
      });

      eventSource.addEventListener('jury_resolved', (e) => {
        try {
          const payload = JSON.parse(e.data);
          setActiveJuryCase((prev) => (prev && prev.caseId === payload.caseId ? null : prev));
        } catch {}
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        reconnectTimeout = setTimeout(() => {
          backoff = Math.min(backoff * 1.5, 10000);
          connectSSE();
        }, backoff);
      };

      eventSource.onopen = () => {
        backoff = 1000;
      };
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [playerId]);

  // 3. Active 60-Second Lease Countdown & Procedural Heartbeat
  useEffect(() => {
    if (!activeChain || !activeChain.leaseExpiresAt) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setSecondsRemaining(60);
      setIsPulsing(false);
      return;
    }

    const expiresAt = activeChain.leaseExpiresAt;

    // Initial tick
    const initDiff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    setSecondsRemaining(initDiff);
    setIsPulsing(initDiff <= 15 && initDiff > 0);

    countdownTimerRef.current = setInterval(() => {
      const now = Date.now();
      const diffMs = expiresAt - now;
      const secs = Math.max(0, Math.ceil(diffMs / 1000));

      setSecondsRemaining(secs);
      const pulsing = secs <= 15 && secs > 0;
      setIsPulsing(pulsing);

      // Play heartbeat procedural tick
      if (secs > 0 && secs !== lastSecondSoundRef.current) {
        lastSecondSoundRef.current = secs;
        soundEngine.playHeartbeat(secs);
      }

      // Expired
      if (secs <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        soundEngine.playStrike();
        setStatusMessage('LEASE EXPIRED: Chain returned to active queue.');
        setActiveChain(null);
        setRole(null);
      }
    }, 250);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [activeChain]);

  // 4. Action: Intercept Whisper
  const interceptWhisper = useCallback(async () => {
    if (!playerId) return;
    setIsLoading(true);
    setStatusMessage(null);
    soundEngine.playClick();

    try {
      const res = await fetch('/api/chains/intercept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();

      if (data.success && data.chain) {
        setActiveChain(data.chain);
        setRole(data.role);
        trackChain(data.chain, data.role);
        setStatusMessage(`INTERCEPTED: Chain #${data.chain.id.slice(0, 8)} [Role: ${data.role.toUpperCase()}]`);
      } else {
        setStatusMessage(data.message || 'NO ACTIVE WHISPERS AVAILABLE. AUTO-SPAWNER CALIBRATING...');
      }
    } catch {
      setStatusMessage('NETWORK INTERFERENCE: Unable to reach Whisper gateway.');
    } finally {
      setIsLoading(false);
    }
  }, [playerId, trackChain]);

  // 5. Action: Shifter Word Mutation
  const submitWordDisguise = useCallback(
    async (wordIndex: number, newWord: string) => {
      if (!activeChain || !playerId) return { success: false, message: 'No active lease.' };
      setIsLoading(true);
      setStatusMessage(null);

      try {
        const res = await fetch('/api/chains/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: activeChain.id,
            playerId,
            wordIndex,
            newWord,
          }),
        });
        const data = await res.json();

        if (data.success) {
          if (data.isTrap) {
            soundEngine.playTrapAlarm();
            updateStreak(() => 0);
            setStatusMessage('CRITICAL ALERT: Secret trap word triggered! -1 Signal Bar strike.');
          } else {
            soundEngine.playMutation();
            updateStreak((s) => s + 1);
            setStatusMessage('DISGUISE TRANSMITTED: Chain successfully advanced.');
          }

          if (data.status === 'victory') {
            soundEngine.playVictory();
            setStatusMessage('100-HOP VICTORY! Chain archived to Hall of Ghosts.');
          }

          if (data.chain) {
            trackChain(data.chain, 'shifter');
          }
          setActiveChain(null);
          setRole(null);
          setSelectedWordIndex(null);
          return { success: true };
        } else {
          soundEngine.playStrike();
          setStatusMessage(`SUBMISSION REJECTED: ${data.message || data.error}`);
          return { success: false, message: data.message || data.error };
        }
      } catch (err: unknown) {
        const errObj = err as Error;
        return { success: false, message: errObj?.message || 'Network error' };
      } finally {
        setIsLoading(false);
      }
    },
    [activeChain, playerId, updateStreak, trackChain]
  );

  // 6. Action: Decoder Deduction Guess
  const submitDecoderGuess = useCallback(
    async (guess: string) => {
      if (!activeChain || !playerId) return { success: false, message: 'No active lease.' };
      setIsLoading(true);
      setStatusMessage(null);

      try {
        const res = await fetch('/api/chains/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: activeChain.id,
            playerId,
            guess,
            role: 'decoder',
          }),
        });
        const data = await res.json();

        if (data.success) {
          if (data.correct) {
            soundEngine.playDecoderBonus();
            updateStreak((s) => s + 1);
            setStatusMessage('CLASSIFIED THEME DECODED! +10 Bonus Hops Awarded.');
          } else {
            soundEngine.playStrike();
            updateStreak(() => 0);
            setStatusMessage('INCORRECT DEDUCTION: -1 Signal Bar strike deducted.');
          }

          if (data.status === 'victory') {
            soundEngine.playVictory();
          }

          if (data.chain) {
            trackChain(data.chain, 'decoder');
          }
          setActiveChain(null);
          setRole(null);
          return { success: true, correct: data.correct };
        } else {
          soundEngine.playStrike();
          setStatusMessage(`DEDUCTION REJECTED: ${data.message || data.error}`);
          return { success: false, message: data.message };
        }
      } catch (err: unknown) {
        const errObj = err as Error;
        return { success: false, message: errObj?.message || 'Network error' };
      } finally {
        setIsLoading(false);
      }
    },
    [activeChain, playerId, updateStreak, trackChain]
  );

  // 7. Action: Report Sabotage (Scrub)
  const reportSabotage = useCallback(async () => {
    if (!activeChain || !playerId) return;
    setIsLoading(true);
    soundEngine.playClick();

    try {
      const res = await fetch('/api/chains/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: activeChain.id,
          reporterPlayerId: playerId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('SABOTAGE SIGNAL BROADCAST: 3 Peer Jurors Summoned.');
      } else {
        setStatusMessage(`REPORT FAILED: ${data.message || data.error}`);
      }
    } catch {
      setStatusMessage('Network error reporting sabotage.');
    } finally {
      setIsLoading(false);
    }
  }, [activeChain, playerId]);

  // 8. Action: Jury Vote
  const voteJury = useCallback(
    async (caseId: string, isSabotage: boolean) => {
      if (!playerId) return;
      soundEngine.playClick();

      try {
        await fetch('/api/jury/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId,
            voterPlayerId: playerId,
            isSabotage,
          }),
        });
        setActiveJuryCase(null);
        setStatusMessage(`JURY VOTE RECORDED: ${isSabotage ? 'SABOTAGE' : 'LEGITIMATE'}`);
      } catch {}
    },
    [playerId]
  );

  // 9. Action: Toggle Audio Mute
  const toggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('whisper_muted', String(next));
      } catch {}
    }
  }, []);

  return {
    playerId,
    playerAlias,
    activeChain,
    role,
    secondsRemaining,
    isPulsing,
    telemetry,
    streak,
    myActiveChains,
    activeJuryCase,
    isMuted,
    isLoading,
    statusMessage,
    selectedWordIndex,
    setSelectedWordIndex,
    interceptWhisper,
    submitMutation: submitWordDisguise,
    submitWordDisguise,
    submitDecoderGuess,
    reportSabotage,
    voteJury,
    toggleMute,
    dismissJurySummon: () => setActiveJuryCase(null),
  };
}

/**
 * WHISPER Procedural Web Audio API Engine
 * Milestone M3: Cybernetic Terminal UI & Procedural Audio
 *
 * Requirements:
 * - ZERO external audio files (.mp3, .wav, .ogg, or CDN fetches).
 * - Real-time procedural synthesis via Web Audio API.
 * - Global mute toggle persisted to localStorage ('whisper_muted').
 * - Autoplay policy compliant: transparent click/keypress unlocker.
 * - SSR safe: runs cleanly when window is undefined.
 */

const STORAGE_KEY_MUTED = 'whisper_muted';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private unlockListenersAttached: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_MUTED);
        this.muted = stored === 'true';
      } catch {
        this.muted = false;
      }
    }
  }

  /**
   * Initializes sound engine and binds transparent autoplay unlock listeners.
   * Safe to call repeatedly or during client-side hydration.
   */
  public init(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY_MUTED);
      this.muted = stored === 'true';
    } catch {
      // Ignore localStorage access failures (e.g. strict sandboxing)
    }

    this.attachUnlockListeners();
  }

  /**
   * Transparently resumes/initializes AudioContext on user interaction
   * to satisfy browser Autoplay policies without modal popups.
   */
  private attachUnlockListeners(): void {
    if (typeof window === 'undefined' || this.unlockListenersAttached) return;

    const unlockHandler = () => {
      const ctx = this.ensureContext();
      if (ctx && ctx.state === 'suspended') {
        try {
          const res = ctx.resume();
          if (res && typeof res.then === 'function') {
            res.then(() => {
              this.removeUnlockListeners(unlockHandler);
            }).catch(() => {});
          } else {
            this.removeUnlockListeners(unlockHandler);
          }
        } catch {
          this.removeUnlockListeners(unlockHandler);
        }
      } else if (ctx && ctx.state === 'running') {
        this.removeUnlockListeners(unlockHandler);
      }
    };

    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
    this.unlockListenersAttached = true;
  }

  private removeUnlockListeners(handler: () => void): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('click', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('touchstart', handler);
    this.unlockListenersAttached = false;
  }

  /**
   * Lazily initializes and returns the Web Audio context and master gain node.
   */
  public ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) {
        return null;
      }

      try {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }

    return this.ctx;
  }

  /**
   * Returns current mute state.
   */
  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Toggles mute state, persists to localStorage, and updates master gain.
   * Returns the new mute state.
   */
  public toggleMute(): boolean {
    return this.setMuted(!this.muted);
  }

  /**
   * Explicitly sets mute state, persists to localStorage, and ramps master gain.
   */
  public setMuted(muted: boolean): boolean {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
      } catch {
        // Ignore localStorage error
      }
    }

    if (this.masterGain && this.ctx) {
      try {
        const targetValue = muted ? 0 : 1;
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(targetValue, this.ctx.currentTime, 0.015);
      } catch {
        this.masterGain.gain.value = muted ? 0 : 1;
      }
    }

    return this.muted;
  }

  /**
   * Access underlying AudioContext (useful for telemetry or testing).
   */
  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Disposes the audio context and cleans up event listeners.
   */
  public dispose(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        const p = this.ctx.close();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }
    this.ctx = null;
    this.masterGain = null;
    this.unlockListenersAttached = false;
  }

  // =========================================================================
  // SOUND EFFECTS SYNTHESIZERS (ZERO EXTERNAL ASSETS)
  // =========================================================================

  /**
   * UI Click / Selection Tick:
   * Microscopic cybernetic transient click pulse (~5-8ms).
   */
  public playClick(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Bandpass filtered click at 2800Hz
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(3.0, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.007);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.01);

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * 60s Countdown Heartbeat:
   * - Subdued rhythmic blip when secondsRemaining > 15
   * - Accelerating urgent double-beat pulse ("lub-dub") when secondsRemaining <= 15 (crimson state)
   */
  public playHeartbeat(secondsRemaining: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;

      if (secondsRemaining > 15) {
        // Subdued single heartbeat tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(160, now);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.095);

        osc.onended = () => {
          try {
            osc.disconnect();
            filter.disconnect();
            gain.disconnect();
          } catch {}
        };
      } else {
        // Urgent double-beat pulse (<15s crimson state)
        // Beat 1: "Lub"
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const filter1 = ctx.createBiquadFilter();

        filter1.type = 'lowpass';
        filter1.frequency.setValueAtTime(220, now);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(95, now);
        osc1.frequency.exponentialRampToValueAtTime(45, now + 0.06);

        gain1.gain.setValueAtTime(0.32, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.masterGain);

        osc1.start(now);
        osc1.stop(now + 0.07);

        // Beat 2: "Dub" (+95ms delay, punchier & slightly higher pitch)
        const t2 = now + 0.095;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const filter2 = ctx.createBiquadFilter();

        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(260, t2);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(130, t2);
        osc2.frequency.exponentialRampToValueAtTime(55, t2 + 0.08);

        gain2.gain.setValueAtTime(0.42, t2);
        gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.085);

        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.masterGain);

        osc2.start(t2);
        osc2.stop(t2 + 0.09);

        osc2.onended = () => {
          try {
            osc1.disconnect();
            filter1.disconnect();
            gain1.disconnect();
            osc2.disconnect();
            filter2.disconnect();
            gain2.disconnect();
          } catch {}
        };
      }
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * Word Disguise Mutation:
   * Clean retro cybernetic upward arpeggio/chirp (440Hz -> 659Hz -> 880Hz).
   */
  public playMutation(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 440.0, time: 0.00, dur: 0.045 }, // A4
        { freq: 659.25, time: 0.038, dur: 0.045 }, // E5
        { freq: 880.0, time: 0.076, dur: 0.085 } // A5
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2600, now + time);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.2, now + time + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.01);

        osc.onended = () => {
          try {
            osc.disconnect();
            filter.disconnect();
            gain.disconnect();
          } catch {}
        };
      });
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * Secret Trap Word Alarm:
   * High-low oscillating sawtooth siren (800Hz <-> 1250Hz frequency modulation).
   */
  public playTrapAlarm(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);

      osc.type = 'sawtooth';

      // 4-phase alarm siren frequency sweep
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.14);
      osc.frequency.linearRampToValueAtTime(800, now + 0.28);
      osc.frequency.linearRampToValueAtTime(1350, now + 0.42);
      osc.frequency.linearRampToValueAtTime(700, now + 0.60);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.setValueAtTime(0.35, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.64);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.65);

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * Strike Penalty:
   * Signal bar loss or incorrect decoder deduction.
   * Low crunchy detuned dual square-wave buzz (110Hz + 116Hz).
   */
  public playStrike(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Downward sweeping filter simulates collapsing analog signal
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.35);

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(110, now); // A2

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(116, now); // Detuned +6Hz for harsh acoustic beating

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);

      osc1.onended = () => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * 100-Hop Victory Fanfare:
   * Harmonic retro synth fanfare (major triad arpeggio with shimmering reverb decay).
   */
  public playVictory(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;
      // C Major Triad Fanfare: C5 -> E5 -> G5 -> C6 (held)
      const arpeggio = [
        { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.10, dur: 0.12 }, // E5
        { freq: 783.99, time: 0.20, dur: 0.14 }, // G5
        { freq: 1046.50, time: 0.32, dur: 1.20 } // C6 (climax held)
      ];

      arpeggio.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now + time);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.24, now + time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);

        osc.onended = () => {
          try {
            osc.disconnect();
            filter.disconnect();
            gain.disconnect();
          } catch {}
        };
      });

      // Harmonic backing foundation chord (C5 + G5) supporting the climax
      const chordDelay = 0.32;
      [523.25, 783.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + chordDelay);

        gain.gain.setValueAtTime(0.001, now + chordDelay);
        gain.gain.linearRampToValueAtTime(0.12, now + chordDelay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + chordDelay + 1.15);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + chordDelay);
        osc.stop(now + chordDelay + 1.20);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      });
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * Correct Decoder Deduction Bonus (+10 Hops):
   * Sparkling ascending electronic chime sequence.
   */
  public playDecoderBonus(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;
      // High sparkling electronic chimes: E5, G#5, B5, E6
      const chimes = [
        { freq: 659.25, delay: 0.00 },
        { freq: 830.61, delay: 0.055 },
        { freq: 987.77, delay: 0.11 },
        { freq: 1318.51, delay: 0.17 }
      ];

      chimes.forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + delay;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(t);
        osc.stop(t + 0.46);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      });
    } catch {
      // Non-blocking fallback
    }
  }

  /**
   * Peer Jury Review Summon Alert:
   * Dual-tone resonant sonar ping (900Hz + 1200Hz).
   */
  public playJurySummon(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // High-Q bandpass creates distinct acoustic sonar resonance
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1050, now);
      filter.Q.setValueAtTime(3.5, now);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(900, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.76);
      osc2.stop(now + 0.76);

      osc1.onended = () => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {
      // Non-blocking fallback
    }
  }
}

// Global Singleton Instance
export const soundEngine = new SoundEngine();

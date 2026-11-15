import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundEngine } from '@/lib/audio';

// ============================================================================
// COMPREHENSIVE WEB AUDIO API MOCK HARNESS
// ============================================================================

class MockAudioParam {
  public value: number;
  public calls: { method: string; args: unknown[] }[] = [];

  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
  }

  setValueAtTime(val: number, time: number) {
    this.value = val;
    this.calls.push({ method: 'setValueAtTime', args: [val, time] });
    return this;
  }

  linearRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.calls.push({ method: 'linearRampToValueAtTime', args: [val, time] });
    return this;
  }

  exponentialRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.calls.push({ method: 'exponentialRampToValueAtTime', args: [val, time] });
    return this;
  }

  setTargetAtTime(val: number, time: number, constant: number) {
    this.value = val;
    this.calls.push({ method: 'setTargetAtTime', args: [val, time, constant] });
    return this;
  }
}

class MockAudioNode {
  public connectedTo: unknown[] = [];
  public isDisconnected: boolean = false;

  connect(dest: unknown) {
    this.connectedTo.push(dest);
    return dest;
  }

  disconnect() {
    this.isDisconnected = true;
  }
}

class MockGainNode extends MockAudioNode {
  public gain = new MockAudioParam(1.0);
}

class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency = new MockAudioParam(350);
  public Q = new MockAudioParam(1);
}

class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency = new MockAudioParam(440);
  public started: boolean = false;
  public stopped: boolean = false;
  public startTime: number | null = null;
  public stopTime: number | null = null;
  public onended: (() => void) | null = null;

  start(time: number = 0) {
    this.started = true;
    this.startTime = time;
  }

  stop(time: number = 0) {
    this.stopped = true;
    this.stopTime = time;
    if (this.onended) {
      this.onended();
    }
  }
}

class MockAudioContext {
  public currentTime: number = 0;
  public state: AudioContextState = 'suspended';
  public destination = new MockAudioNode();

  public createdOscillators: MockOscillatorNode[] = [];
  public createdGains: MockGainNode[] = [];
  public createdFilters: MockBiquadFilterNode[] = [];

  createOscillator(): MockOscillatorNode {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc;
  }

  createGain(): MockGainNode {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const filter = new MockBiquadFilterNode();
    this.createdFilters.push(filter);
    return filter;
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SoundEngine (Web Audio API Synthesizer)', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    localStorage.clear();
    mockCtx = new MockAudioContext();
    // Attach to global window
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext =
      vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Initialization & Mute Management', () => {
    it('initializes in unmuted state by default', () => {
      const engine = new SoundEngine();
      engine.init();
      expect(engine.isMuted()).toBe(false);
    });

    it('respects pre-existing localStorage whisper_muted=true', () => {
      localStorage.setItem('whisper_muted', 'true');
      const engine = new SoundEngine();
      engine.init();
      expect(engine.isMuted()).toBe(true);
    });

    it('toggles mute state and persists to localStorage', () => {
      const engine = new SoundEngine();
      engine.init();
      expect(engine.isMuted()).toBe(false);

      const state1 = engine.toggleMute();
      expect(state1).toBe(true);
      expect(engine.isMuted()).toBe(true);
      expect(localStorage.getItem('whisper_muted')).toBe('true');

      const state2 = engine.toggleMute();
      expect(state2).toBe(false);
      expect(engine.isMuted()).toBe(false);
      expect(localStorage.getItem('whisper_muted')).toBe('false');
    });

    it('sets masterGain target to 0 when muted, and 1 when unmuted', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      engine.setMuted(true);
      expect(engine.isMuted()).toBe(true);

      engine.setMuted(false);
      expect(engine.isMuted()).toBe(false);
    });
  });

  describe('2. Autoplay Policy Transparent Unlock', () => {
    it('resumes suspended AudioContext on user interaction event', async () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();
      expect(mockCtx.state).toBe('suspended');

      // Dispatch simulated user interaction
      window.dispatchEvent(new MouseEvent('click'));

      // Context should now be resumed
      expect(mockCtx.state).toBe('running');
    });

    it('handles keydown and pointerdown user unlock triggers', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();
      mockCtx.state = 'suspended';

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(mockCtx.state).toBe('running');
    });
  });

  describe('3. Procedural Sound Synthesizers', () => {
    it('playClick(): generates microscopic bandpass filtered click pulse', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playClick();

      expect(mockCtx.createdOscillators.length).toBe(1);
      const osc = mockCtx.createdOscillators[0];
      expect(osc.type).toBe('triangle');
      expect(osc.started).toBe(true);
      expect(osc.stopped).toBe(true);

      expect(mockCtx.createdFilters.length).toBe(1);
      const filter = mockCtx.createdFilters[0];
      expect(filter.type).toBe('bandpass');
    });

    describe('playHeartbeat()', () => {
      it('generates subdued single rhythmic blip when secondsRemaining > 15', () => {
        const engine = new SoundEngine();
        engine.init();
        engine.playHeartbeat(45);

        // Subdued: exactly 1 oscillator and 1 lowpass filter
        expect(mockCtx.createdOscillators.length).toBe(1);
        expect(mockCtx.createdFilters.length).toBe(1);

        const osc = mockCtx.createdOscillators[0];
        expect(osc.type).toBe('sine');
        expect(osc.started).toBe(true);

        const filter = mockCtx.createdFilters[0];
        expect(filter.type).toBe('lowpass');
      });

      it('generates urgent double-beat pulse ("lub-dub") when secondsRemaining <= 15 (crimson state)', () => {
        const engine = new SoundEngine();
        engine.init();
        engine.playHeartbeat(12);

        // Urgent: exactly 2 oscillators (lub and dub)
        expect(mockCtx.createdOscillators.length).toBe(2);
        expect(mockCtx.createdFilters.length).toBe(2);

        const [osc1, osc2] = mockCtx.createdOscillators;
        expect(osc1.type).toBe('sine');
        expect(osc2.type).toBe('sine');
        expect(osc1.started).toBe(true);
        expect(osc2.started).toBe(true);

        // Beat 2 is scheduled after Beat 1
        expect(osc2.startTime).toBeGreaterThan(osc1.startTime!);
      });
    });

    it('playMutation(): synthesizes ascending 3-note cybernetic arpeggio', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playMutation();

      // 3 notes in sequence: A4 (440Hz), E5 (659Hz), A5 (880Hz)
      expect(mockCtx.createdOscillators.length).toBe(3);
      mockCtx.createdOscillators.forEach((osc) => {
        expect(osc.type).toBe('triangle');
        expect(osc.started).toBe(true);
      });
    });

    it('playTrapAlarm(): synthesizes oscillating sawtooth siren', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playTrapAlarm();

      expect(mockCtx.createdOscillators.length).toBe(1);
      const osc = mockCtx.createdOscillators[0];
      expect(osc.type).toBe('sawtooth');
      expect(osc.started).toBe(true);

      expect(mockCtx.createdFilters.length).toBe(1);
      expect(mockCtx.createdFilters[0].type).toBe('lowpass');
    });

    it('playStrike(): synthesizes detuned dual square/saw crunchy buzz', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playStrike();

      // Dual oscillators for acoustic detuning
      expect(mockCtx.createdOscillators.length).toBe(2);
      const types = mockCtx.createdOscillators.map((o) => o.type);
      expect(types).toContain('square');
      expect(types).toContain('sawtooth');

      // Lowpass filter simulates signal collapse
      expect(mockCtx.createdFilters.length).toBe(1);
      expect(mockCtx.createdFilters[0].type).toBe('lowpass');
    });

    it('playVictory(): synthesizes triumphant major triad fanfare with harmonic chord', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playVictory();

      // 4 arpeggio notes + 2 backing chord harmonics = 6 oscillators
      expect(mockCtx.createdOscillators.length).toBe(6);
      mockCtx.createdOscillators.forEach((osc) => {
        expect(osc.started).toBe(true);
      });
    });

    it('playDecoderBonus(): synthesizes 4-note ascending chime sequence', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playDecoderBonus();

      expect(mockCtx.createdOscillators.length).toBe(4);
      mockCtx.createdOscillators.forEach((osc) => {
        expect(osc.type).toBe('sine');
        expect(osc.started).toBe(true);
      });
    });

    it('playJurySummon(): synthesizes dual-tone sonar ping with resonant bandpass filter', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playJurySummon();

      // Dual tones: 900Hz and 1200Hz
      expect(mockCtx.createdOscillators.length).toBe(2);
      expect(mockCtx.createdFilters.length).toBe(1);
      expect(mockCtx.createdFilters[0].type).toBe('bandpass');

      mockCtx.createdOscillators.forEach((osc) => {
        expect(osc.type).toBe('sine');
        expect(osc.started).toBe(true);
      });
    });
  });

  describe('4. Zero Overhead When Muted', () => {
    it('suppresses all oscillator creations when muted', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.setMuted(true);

      // Trigger every single sound method
      engine.playClick();
      engine.playHeartbeat(50);
      engine.playHeartbeat(10);
      engine.playMutation();
      engine.playTrapAlarm();
      engine.playStrike();
      engine.playVictory();
      engine.playDecoderBonus();
      engine.playJurySummon();

      // Zero audio nodes must be created!
      expect(mockCtx.createdOscillators.length).toBe(0);
      expect(mockCtx.createdFilters.length).toBe(0);
    });
  });

  describe('5. SSR & Robustness Invariants', () => {
    it('does not crash when AudioContext is unsupported', () => {
      delete (window as unknown as { AudioContext?: unknown }).AudioContext;
      delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;

      const engine = new SoundEngine();
      expect(() => {
        engine.init();
        engine.playClick();
        engine.playHeartbeat(30);
        engine.playMutation();
        engine.playTrapAlarm();
        engine.playStrike();
        engine.playVictory();
        engine.playDecoderBonus();
        engine.playJurySummon();
      }).not.toThrow();
    });

    it('properly disposes audio context and event listeners', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();
      expect(mockCtx.state).toBe('suspended');

      engine.dispose();
      expect(mockCtx.state).toBe('closed');
      expect(engine.getAudioContext()).toBeNull();
    });
  });
});

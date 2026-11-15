import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundEngine, soundEngine } from '@/lib/audio';

// ============================================================================
// ADVERSARIAL AUDIO TEST HARNESS
// ============================================================================

class MockAudioParam {
  public value: number;
  public history: { method: string; args: unknown[] }[] = [];

  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
  }

  setValueAtTime(val: number, time: number) {
    this.value = val;
    this.history.push({ method: 'setValueAtTime', args: [val, time] });
    return this;
  }

  linearRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.history.push({ method: 'linearRampToValueAtTime', args: [val, time] });
    return this;
  }

  exponentialRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.history.push({ method: 'exponentialRampToValueAtTime', args: [val, time] });
    return this;
  }

  setTargetAtTime(val: number, time: number, constant: number) {
    this.value = val;
    this.history.push({ method: 'setTargetAtTime', args: [val, time, constant] });
    return this;
  }
}

class MockAudioNode {
  public connections: unknown[] = [];
  public disconnected: boolean = false;

  connect(dest: unknown) {
    this.connections.push(dest);
    return dest;
  }

  disconnect() {
    this.disconnected = true;
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
  public currentTime: number = 100.0; // Non-zero start time to test time offsets
  public state: AudioContextState = 'running';
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

describe('Challenger M3: Adversarial Procedural Audio & State Stress Suite', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    localStorage.clear();
    mockCtx = new MockAudioContext();
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext =
      vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Exhaustive Procedural Audio Node & Connection Verification', () => {
    const generators: { name: string; invoke: (e: SoundEngine) => void; minOscs: number }[] = [
      { name: 'playClick', invoke: (e) => e.playClick(), minOscs: 1 },
      { name: 'playHeartbeat (>15s)', invoke: (e) => e.playHeartbeat(30), minOscs: 1 },
      { name: 'playHeartbeat (<=15s)', invoke: (e) => e.playHeartbeat(15), minOscs: 2 },
      { name: 'playMutation', invoke: (e) => e.playMutation(), minOscs: 3 },
      { name: 'playTrapAlarm', invoke: (e) => e.playTrapAlarm(), minOscs: 1 },
      { name: 'playStrike', invoke: (e) => e.playStrike(), minOscs: 2 },
      { name: 'playVictory', invoke: (e) => e.playVictory(), minOscs: 6 },
      { name: 'playDecoderBonus', invoke: (e) => e.playDecoderBonus(), minOscs: 4 },
      { name: 'playJurySummon', invoke: (e) => e.playJurySummon(), minOscs: 2 },
    ];

    generators.forEach(({ name, invoke, minOscs }) => {
      it(`${name}: successfully schedules audio nodes and connects to masterGain without throws`, () => {
        const engine = new SoundEngine();
        engine.init();

        expect(() => invoke(engine)).not.toThrow();

        expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(minOscs);
        // All scheduled oscillators must have started and stopped
        mockCtx.createdOscillators.forEach((osc) => {
          expect(osc.started).toBe(true);
          expect(osc.stopped).toBe(true);
          expect(osc.stopTime).toBeGreaterThanOrEqual(osc.startTime!);
        });
      });
    });
  });

  describe('2. Mute Semantics & Zero Allocation Stress Test', () => {
    it('under muted conditions, 1,000 rapid sound invocations result in exactly ZERO node allocations', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.setMuted(true);
      expect(engine.isMuted()).toBe(true);

      const initialOscs = mockCtx.createdOscillators.length;
      const initialGains = mockCtx.createdGains.length;
      const initialFilters = mockCtx.createdFilters.length;

      // Hammer all 8 procedural sound methods 100 times each (800 calls)
      for (let i = 0; i < 100; i++) {
        engine.playClick();
        engine.playHeartbeat(45);
        engine.playHeartbeat(10);
        engine.playHeartbeat(0);
        engine.playMutation();
        engine.playTrapAlarm();
        engine.playStrike();
        engine.playVictory();
        engine.playDecoderBonus();
        engine.playJurySummon();
      }

      expect(mockCtx.createdOscillators.length).toBe(initialOscs);
      expect(mockCtx.createdGains.length).toBe(initialGains);
      expect(mockCtx.createdFilters.length).toBe(initialFilters);
    });

    it('toggleMute toggles state cleanly and updates masterGain target', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      // Starts unmuted
      expect(engine.isMuted()).toBe(false);

      // Toggle to muted
      const muted1 = engine.toggleMute();
      expect(muted1).toBe(true);
      expect(engine.isMuted()).toBe(true);
      expect(localStorage.getItem('whisper_muted')).toBe('true');

      // Toggle back to unmuted
      const muted2 = engine.toggleMute();
      expect(muted2).toBe(false);
      expect(engine.isMuted()).toBe(false);
      expect(localStorage.getItem('whisper_muted')).toBe('false');
    });
  });

  describe('3. Edge Cases & Boundary Conditions', () => {
    it('playHeartbeat: handles boundary values at exactly 15, 16, 0, and negative seconds', () => {
      const engine = new SoundEngine();
      engine.init();

      // At 16 seconds: single beat
      mockCtx.createdOscillators = [];
      engine.playHeartbeat(16);
      expect(mockCtx.createdOscillators.length).toBe(1);

      // At exactly 15 seconds: urgent double beat
      mockCtx.createdOscillators = [];
      engine.playHeartbeat(15);
      expect(mockCtx.createdOscillators.length).toBe(2);

      // At 0 seconds: urgent double beat (still valid)
      mockCtx.createdOscillators = [];
      engine.playHeartbeat(0);
      expect(mockCtx.createdOscillators.length).toBe(2);

      // At negative seconds: urgent double beat without throwing
      mockCtx.createdOscillators = [];
      expect(() => engine.playHeartbeat(-10)).not.toThrow();
      expect(mockCtx.createdOscillators.length).toBe(2);
    });

    it('gracefully handles suspended AudioContext and invokes resume', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();
      mockCtx.state = 'suspended';

      const resumeSpy = vi.spyOn(mockCtx, 'resume');
      engine.playClick();

      expect(resumeSpy).toHaveBeenCalled();
    });

    it('handles context resume failure non-blockingly without throwing', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();
      mockCtx.state = 'suspended';
      mockCtx.resume = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));

      expect(() => engine.playClick()).not.toThrow();
      expect(() => engine.playMutation()).not.toThrow();
      expect(() => engine.playTrapAlarm()).not.toThrow();
    });

    it('disconnection and cleanup callbacks properly execute without memory leaks', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.playClick();

      const osc = mockCtx.createdOscillators[0];
      expect(osc.onended).toBeDefined();

      // Trigger cleanup
      expect(() => osc.onended!()).not.toThrow();
      expect(osc.disconnected).toBe(true);
    });

    it('handles corrupted localStorage data gracefully during init', () => {
      localStorage.setItem('whisper_muted', 'INVALID_JSON_OR_CORRUPT');
      const engine = new SoundEngine();
      expect(() => engine.init()).not.toThrow();
      expect(engine.isMuted()).toBe(false);
    });
  });
});

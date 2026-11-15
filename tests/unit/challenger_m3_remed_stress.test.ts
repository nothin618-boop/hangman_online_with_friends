import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundEngine } from '@/lib/audio';

// Mock Web Audio primitives
class MockAudioParam {
  public value: number = 0;
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  setTargetAtTime() { return this; }
}

class MockAudioNode {
  connect(dest: unknown) { return dest; }
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  public gain = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
  public frequency = new MockAudioParam();
  public Q = new MockAudioParam();
}

class MockOscillatorNode extends MockAudioNode {
  public frequency = new MockAudioParam();
  start() {}
  stop() {}
  public onended: (() => void) | null = null;
}

class HostileMockAudioContext {
  public currentTime: number = 0;
  public state: AudioContextState = 'suspended';
  public destination = new MockAudioNode();
  public resumeReturnValue: unknown = undefined;
  public resumeThrows: boolean = false;

  createOscillator() { return new MockOscillatorNode(); }
  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }

  resume(): Promise<void> {
    if (this.resumeThrows) {
      throw new Error('Hostile synchronous resume() error');
    }
    return this.resumeReturnValue as Promise<void>;
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

describe('Challenger M3 Remediation: Hostile Audio Resume & Unlock Stress Suite', () => {
  let hostileCtx: HostileMockAudioContext;

  beforeEach(() => {
    localStorage.clear();
    hostileCtx = new HostileMockAudioContext();
    (window as unknown as { AudioContext: typeof HostileMockAudioContext }).AudioContext =
      vi.fn().mockImplementation(() => hostileCtx) as unknown as typeof AudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Unlock Handler Resumes When ctx.resume() Returns Undefined / Non-Promise', () => {
    it('does NOT throw TypeError: Cannot read properties of undefined (reading "then") when resume() returns undefined on click', () => {
      hostileCtx.resumeReturnValue = undefined;
      hostileCtx.state = 'suspended';

      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      // Trigger all 4 unlock event triggers
      expect(() => window.dispatchEvent(new MouseEvent('click'))).not.toThrow();
      expect(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Space' }))).not.toThrow();
      expect(() => window.dispatchEvent(new Event('pointerdown'))).not.toThrow();
      expect(() => window.dispatchEvent(new Event('touchstart'))).not.toThrow();
    });

    it('does NOT throw when resume() returns primitive types or non-thenable objects', () => {
      const nonThenables = [null, 0, 123, 'string', false, true, {}, { then: 'not a function' }];

      for (const nonThenable of nonThenables) {
        hostileCtx.resumeReturnValue = nonThenable;
        hostileCtx.state = 'suspended';

        const engine = new SoundEngine();
        engine.init();
        engine.ensureContext();

        expect(() => window.dispatchEvent(new MouseEvent('click'))).not.toThrow();
      }
    });

    it('does NOT throw when resume() throws a synchronous exception during unlock event', () => {
      hostileCtx.resumeThrows = true;
      hostileCtx.state = 'suspended';

      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      expect(() => window.dispatchEvent(new MouseEvent('click'))).not.toThrow();
      expect(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))).not.toThrow();
    });

    it('does NOT throw unhandled rejection when resume() returns a rejecting Promise during unlock event', async () => {
      hostileCtx.resumeReturnValue = Promise.reject(new Error('Autoplay blocked by browser policy'));
      hostileCtx.state = 'suspended';

      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      expect(() => window.dispatchEvent(new MouseEvent('click'))).not.toThrow();
      // Allow promise microtask queue to drain
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  describe('2. All 8 Procedural Synthesizers Guarded Under Hostile resume()', () => {
    const playAllSounds = (engine: SoundEngine) => {
      engine.playClick();
      engine.playHeartbeat(30);
      engine.playHeartbeat(10);
      engine.playMutation();
      engine.playTrapAlarm();
      engine.playStrike();
      engine.playVictory();
      engine.playDecoderBonus();
      engine.playJurySummon();
    };

    it('all 8 generators execute cleanly when ctx.resume() returns undefined', () => {
      hostileCtx.resumeReturnValue = undefined;
      hostileCtx.state = 'suspended';

      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      expect(() => playAllSounds(engine)).not.toThrow();
    });

    it('all 8 generators execute cleanly when ctx.resume() returns rejecting Promise', async () => {
      hostileCtx.resumeReturnValue = Promise.reject(new Error('Autoplay policy block'));
      hostileCtx.state = 'suspended';

      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      expect(() => playAllSounds(engine)).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('all 8 generators execute cleanly when ctx.resume() throws synchronously', () => {
      hostileCtx.resumeThrows = true;
      hostileCtx.state = 'suspended';

      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      expect(() => playAllSounds(engine)).not.toThrow();
    });

    it('rapid burst of 800 sound invocations under hostile undefined resume() generates zero crashes', () => {
      hostileCtx.resumeReturnValue = undefined;
      hostileCtx.state = 'suspended';

      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      expect(() => {
        for (let i = 0; i < 100; i++) {
          playAllSounds(engine);
        }
      }).not.toThrow();
    });
  });

  describe('3. AudioContext Constructor Failure & Missing AudioContext Resilience', () => {
    it('handles AudioContext constructor throwing error without uncaught exception', () => {
      (window as unknown as { AudioContext: unknown }).AudioContext = vi.fn().mockImplementation(() => {
        throw new Error('NotAllowedError: AudioContext not allowed to start');
      });

      const engine = new SoundEngine();
      expect(() => engine.init()).not.toThrow();
      expect(engine.ensureContext()).toBeNull();
      expect(() => engine.playClick()).not.toThrow();
      expect(() => engine.playVictory()).not.toThrow();
    });
  });
});

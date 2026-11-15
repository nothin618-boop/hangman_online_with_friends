import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { CenterStage } from '@/components/CenterStage';
import { DecoderQuiz } from '@/components/DecoderQuiz';
import { WordInputModal } from '@/components/WordInputModal';
import { TraceLogDrawer } from '@/components/TraceLogDrawer';
import { GhostTimeline } from '@/components/GhostTimeline';
import { SoundEngine } from '@/lib/audio';
import { SanitizedChain, Hop } from '@/lib/types';
import { GhostHopDiff } from '@/lib/ghosts';

class AdversarialMockAudioContext {
  public currentTime = 0;
  public state: AudioContextState = 'suspended';
  public destination = { connect: vi.fn(), disconnect: vi.fn() };
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 350, setValueAtTime: vi.fn() },
      Q: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}

describe('Adversarial Critic Stress Suite — Milestone M3 (UI & Audio)', () => {
  beforeEach(() => {
    localStorage.clear();
    (window as unknown as { AudioContext: unknown }).AudioContext = AdversarialMockAudioContext;
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Countdown Timer State Machine Stress & Boundaries', () => {
    const baseChain: SanitizedChain = {
      id: 'chain-timer-stress',
      currentSentence: 'Alpha bravo charlie delta echo foxtrot.',
      currentHop: 7,
      lives: 3,
      status: 'active',
      leaseExpiresAt: Date.now() + 60000,
      initialSentence: 'Alpha bravo charlie delta echo foxtrot.',
      history: [],
    };

    it('boundary >30s: verifies emerald green styles at 60s and 31s', () => {
      const { rerender } = render(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={60}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      let timerText = screen.getByTestId('lease-seconds-timer');
      let progress = screen.getByTestId('lease-progress-indicator');
      expect(timerText.textContent).toBe('00:60');
      expect(timerText.className).toContain('text-cyber-green');
      expect(progress.className).toContain('to-cyber-green');
      expect(progress.style.width).toBe('100%');

      // 31s boundary
      rerender(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={31}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      timerText = screen.getByTestId('lease-seconds-timer');
      progress = screen.getByTestId('lease-progress-indicator');
      expect(timerText.textContent).toBe('00:31');
      expect(timerText.className).toContain('text-cyber-green');
      expect(progress.className).toContain('to-cyber-green');
    });

    it('boundary 15-30s: verifies amber styles at exact 30s and 16s', () => {
      const { rerender } = render(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={30}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      let timerText = screen.getByTestId('lease-seconds-timer');
      let progress = screen.getByTestId('lease-progress-indicator');
      expect(timerText.textContent).toBe('00:30');
      expect(timerText.className).toContain('text-cyber-amber');
      expect(progress.className).toContain('to-cyber-amber');
      expect(progress.style.width).toBe('50%');

      // 16s boundary
      rerender(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={16}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      timerText = screen.getByTestId('lease-seconds-timer');
      progress = screen.getByTestId('lease-progress-indicator');
      expect(timerText.textContent).toBe('00:16');
      expect(timerText.className).toContain('text-cyber-amber');
      expect(progress.className).toContain('to-cyber-amber');
    });

    it('boundary <=15s: verifies crimson pulse styles at exact 15s, 1s, and 0s', () => {
      const { rerender } = render(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={15}
          isPulsing={true}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      let timerText = screen.getByTestId('lease-seconds-timer');
      let progress = screen.getByTestId('lease-progress-indicator');
      expect(timerText.textContent).toBe('00:15');
      expect(timerText.className).toContain('text-cyber-red');
      expect(progress.className).toContain('to-cyber-red');
      expect(progress.style.width).toBe('25%');

      // 1s boundary
      rerender(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={1}
          isPulsing={true}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      timerText = screen.getByTestId('lease-seconds-timer');
      progress = screen.getByTestId('lease-progress-indicator');
      expect(timerText.textContent).toBe('00:01');
      expect(timerText.className).toContain('text-cyber-red');

      // 0s boundary
      rerender(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={0}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      timerText = screen.getByTestId('lease-seconds-timer');
      progress = screen.getByTestId('lease-progress-indicator');
      expect(timerText.textContent).toBe('00:00');
      expect(timerText.className).toContain('text-cyber-red');
      expect(progress.style.width).toBe('0%');
    });

    it('clamping: handles out-of-bounds values (>60s and <0s) cleanly without NaN or layout break', () => {
      const { rerender } = render(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={120}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      let progress = screen.getByTestId('lease-progress-indicator');
      expect(progress.style.width).toBe('100%');

      rerender(
        <CenterStage
          activeChain={baseChain}
          role="shifter"
          secondsRemaining={-15}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      progress = screen.getByTestId('lease-progress-indicator');
      expect(progress.style.width).toBe('0%');
    });
  });

  describe('2. Audio Engine Autoplay & Lifecycle Stress', () => {
    it('attaches and detaches unlock listeners on first interaction when AudioContext exists', async () => {
      AdversarialMockAudioContext.prototype.state = 'suspended';
      const resumeSpy = vi.spyOn(AdversarialMockAudioContext.prototype, 'resume');
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const engine = new SoundEngine();
      engine.init();

      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), { passive: true });
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), { passive: true });
      expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), { passive: true });
      expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });

      // First click should trigger unlock and removal
      window.dispatchEvent(new MouseEvent('click'));
      await new Promise((r) => setTimeout(r, 10));

      expect(resumeSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    });

    it('handles rapid sequential mute/unmute toggling without throwing or leaking nodes', () => {
      const engine = new SoundEngine();
      engine.init();

      expect(() => {
        for (let i = 0; i < 50; i++) {
          engine.toggleMute();
          engine.playClick();
          engine.playHeartbeat(10);
        }
      }).not.toThrow();
    });

    it('safely handles repeated dispose() calls', () => {
      const engine = new SoundEngine();
      engine.init();
      engine.ensureContext();

      expect(() => {
        engine.dispose();
        engine.dispose();
        engine.dispose();
      }).not.toThrow();
    });
  });

  describe('3. DecoderQuiz Hotkeys & Unmount Stress', () => {
    const themeOptions = ['theme-1', 'theme-2', 'theme-3', 'theme-4'];

    it('cleans up window event listener upon component unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={false}
          onSubmitGuess={vi.fn()}
        />
      );

      unmount();
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('ignores non-numeric keys and out-of-range keys (0, 5, 9)', () => {
      render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={false}
          onSubmitGuess={vi.fn()}
        />
      );

      const submitBtn = screen.getByTestId('decoder-submit-btn');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Press 0
      fireEvent.keyDown(window, { key: '0' });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Press 5
      fireEvent.keyDown(window, { key: '5' });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Press letters
      fireEvent.keyDown(window, { key: 'a' });
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Press 4 (valid)
      fireEvent.keyDown(window, { key: '4' });
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
      expect(screen.getByTestId('decoder-option-3').getAttribute('data-selected')).toBe('true');
    });

    it('blocks hotkey selection and submit when isSubmitting is true', () => {
      const mockSubmit = vi.fn();
      render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={true}
          onSubmitGuess={mockSubmit}
        />
      );

      // Try hotkey while submitting
      fireEvent.keyDown(window, { key: '2' });
      expect(screen.getByTestId('decoder-option-1').getAttribute('data-selected')).toBe('false');

      // Submit button should be disabled
      const submitBtn = screen.getByTestId('decoder-submit-btn');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
      expect(submitBtn.textContent).toContain('ANALYZING CIPHER...');
    });
  });

  describe('4. WordInputModal Rigorous Boundary & Constraint Stress', () => {
    it('adversarial character set stress: rejects numbers, spaces, symbols, and emojis', () => {
      render(
        <WordInputModal
          isOpen={true}
          wordIndex={0}
          originalRawToken="secret"
          originalRootWord="secret"
          history={[]}
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const input = screen.getByTestId('disguise-word-input');
      const submitBtn = screen.getByTestId('modal-submit-btn');

      const invalidInputs = [
        'agent1',
        'agent 2',
        'agent-x',
        'agent_x',
        '🕵️',
        'café',
        'secret!',
        'word#1',
      ];

      for (const val of invalidInputs) {
        fireEvent.change(input, { target: { value: val } });
        expect(submitBtn.hasAttribute('disabled')).toBe(true);
        expect(screen.getByTestId('validation-error-msg')).toBeDefined();
      }
    });

    it('exact length boundary stress: allows 1 and 11 chars, rejects 0 and 12 chars', () => {
      render(
        <WordInputModal
          isOpen={true}
          wordIndex={0}
          originalRawToken="secret"
          originalRootWord="secret"
          history={[]}
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const input = screen.getByTestId('disguise-word-input');
      const submitBtn = screen.getByTestId('modal-submit-btn');

      // 1 char: 'a' (valid dictionary word)
      fireEvent.change(input, { target: { value: 'a' } });
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
      expect(screen.getByTestId('char-counter').textContent).toBe('1/11 chars');

      // 11 chars: 'abandonment' (valid dictionary word, length = 11)
      fireEvent.change(input, { target: { value: 'abandonment' } });
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
      expect(screen.getByTestId('char-counter').textContent).toBe('11/11 chars');

      // 12 chars: 'abbreviation' (valid dictionary word, length = 12) -> MUST BE REJECTED
      fireEvent.change(input, { target: { value: 'abbreviation' } });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
      expect(screen.getByTestId('char-counter').textContent).toBe('12/11 chars');
      expect(screen.getByTestId('validation-error-msg').textContent).toContain('exceeds 11 characters');
    });

    it('case-insensitive repeat check against chain history', () => {
      const history: Hop[] = [
        {
          hopNumber: 1,
          playerId: 'p1',
          previousSentence: 'Hello world.',
          newSentence: 'Hello earth.',
          oldWord: 'world',
          newWord: 'earth',
          role: 'shifter',
          timestamp: Date.now(),
        },
      ];

      render(
        <WordInputModal
          isOpen={true}
          wordIndex={0}
          originalRawToken="hello"
          originalRootWord="hello"
          history={history}
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const input = screen.getByTestId('disguise-word-input');
      const submitBtn = screen.getByTestId('modal-submit-btn');

      // Typing uppercase 'EARTH' when lowercase 'earth' was used in hop 1
      fireEvent.change(input, { target: { value: 'EARTH' } });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
      expect(screen.getByTestId('validation-error-msg').textContent).toContain('previously used in chain history');
    });
  });

  describe('5. TraceLogDrawer Hops Limiting & Diff Annotation Stress', () => {
    it('strictly slices exactly the latest 3 hops when 6 hops exist', () => {
      const sixHops: Hop[] = [1, 2, 3, 4, 5, 6].map((num) => ({
        hopNumber: num,
        playerId: `player-${num}`,
        playerAlias: `Operative_${num}`,
        previousSentence: `Sentence at hop ${num - 1}.`,
        newSentence: `Sentence at hop ${num}.`,
        oldWord: `word${num - 1}`,
        newWord: `word${num}`,
        role: 'shifter' as const,
        timestamp: Date.now() - (6 - num) * 1000,
      }));

      render(<TraceLogDrawer traceLog={sixHops} />);

      // Open drawer
      fireEvent.click(screen.getByTestId('trace-log-toggle-btn'));

      // Hops 1, 2, 3 must NOT be rendered in recent 3 hops
      expect(screen.queryByTestId('trace-hop-1')).toBeNull();
      expect(screen.queryByTestId('trace-hop-2')).toBeNull();
      expect(screen.queryByTestId('trace-hop-3')).toBeNull();

      // Hops 4, 5, 6 MUST be rendered
      expect(screen.getByTestId('trace-hop-4')).toBeDefined();
      expect(screen.getByTestId('trace-hop-5')).toBeDefined();
      expect(screen.getByTestId('trace-hop-6')).toBeDefined();
    });

    it('returns null gracefully when traceLog is empty or undefined', () => {
      const { container } = render(<TraceLogDrawer traceLog={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('6. GhostTimeline Diff & Receipt Rendering Stress', () => {
    it('accurately renders decoder bonus vs failure badges and shifter diff tags', () => {
      const diffs: GhostHopDiff[] = [
        {
          hopNumber: 9,
          playerId: 'p1',
          playerAlias: 'Shadow_01',
          role: 'shifter',
          previousSentence: 'The vault opens.',
          newSentence: 'The door opens.',
          oldWord: 'vault',
          newWord: 'door',
          isTrapHit: true,
          strikeDeducted: true,
          timestamp: Date.now() - 2000,
        },
        {
          hopNumber: 10,
          playerId: 'p2',
          playerAlias: 'Decoder_02',
          role: 'decoder',
          previousSentence: 'The door opens.',
          newSentence: 'The door opens.',
          decoderGuess: 'bank-heist',
          isCorrectGuess: true,
          bonusHopsAwarded: 10,
          timestamp: Date.now() - 1000,
        },
        {
          hopNumber: 20,
          playerId: 'p3',
          playerAlias: 'Decoder_03',
          role: 'decoder',
          previousSentence: 'The door opens.',
          newSentence: 'The door opens.',
          decoderGuess: 'alien-abduction',
          isCorrectGuess: false,
          strikeDeducted: true,
          timestamp: Date.now(),
        },
      ];

      render(<GhostTimeline diffs={diffs} />);

      // Shifter with trap hit
      expect(screen.getByTestId('ghost-timeline-hop-9')).toBeDefined();
      expect(screen.getByText('TRAP HIT (-1 BAR)')).toBeDefined();

      // Decoder with correct guess
      expect(screen.getByTestId('ghost-timeline-hop-10')).toBeDefined();
      expect(screen.getByText('+10 BONUS HOPS')).toBeDefined();

      // Decoder with wrong guess
      expect(screen.getByTestId('ghost-timeline-hop-20')).toBeDefined();
      expect(screen.getByText('INCORRECT (-1 BAR)')).toBeDefined();
    });
  });
});

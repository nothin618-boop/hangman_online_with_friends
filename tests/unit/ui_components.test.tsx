import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StrikeHealthBar } from '@/components/StrikeHealthBar';
import { TopBar } from '@/components/TopBar';
import { WordInputModal } from '@/components/WordInputModal';
import { DecoderQuiz } from '@/components/DecoderQuiz';
import { TraceLogDrawer } from '@/components/TraceLogDrawer';
import { ActiveChainsBar } from '@/components/ActiveChainsBar';
import { JuryPopupModal } from '@/components/JuryPopupModal';
import { GhostTimeline } from '@/components/GhostTimeline';
import { CenterStage } from '@/components/CenterStage';
import { SanitizedChain, Hop } from '@/lib/types';
import { JurySummonPayload } from '@/lib/events';
import { GhostHopDiff } from '@/lib/ghosts';

describe('Cybernetic Terminal UI Component Suite (Milestone M3)', () => {
  describe('1. StrikeHealthBar', () => {
    it('renders 3 active green bars when lives = 3', () => {
      render(<StrikeHealthBar lives={3} />);
      const bar0 = screen.getByTestId('strike-bar-0');
      const bar1 = screen.getByTestId('strike-bar-1');
      const bar2 = screen.getByTestId('strike-bar-2');

      expect(bar0.getAttribute('data-active')).toBe('true');
      expect(bar1.getAttribute('data-active')).toBe('true');
      expect(bar2.getAttribute('data-active')).toBe('true');
      expect(bar0.className).toContain('bg-cyber-green');
      expect(screen.getByText('3/3')).toBeDefined();
    });

    it('renders 2 active amber bars and 1 inactive when lives = 2', () => {
      render(<StrikeHealthBar lives={2} />);
      const bar0 = screen.getByTestId('strike-bar-0');
      const bar1 = screen.getByTestId('strike-bar-1');
      const bar2 = screen.getByTestId('strike-bar-2');

      expect(bar0.getAttribute('data-active')).toBe('true');
      expect(bar1.getAttribute('data-active')).toBe('true');
      expect(bar2.getAttribute('data-active')).toBe('false');
      expect(bar0.className).toContain('bg-cyber-amber');
      expect(bar2.className).toContain('bg-slate-700/50');
      expect(screen.getByText('2/3')).toBeDefined();
    });

    it('renders 1 active pulsing red bar when lives = 1', () => {
      render(<StrikeHealthBar lives={1} />);
      const bar0 = screen.getByTestId('strike-bar-0');
      const bar1 = screen.getByTestId('strike-bar-1');
      const bar2 = screen.getByTestId('strike-bar-2');

      expect(bar0.getAttribute('data-active')).toBe('true');
      expect(bar1.getAttribute('data-active')).toBe('false');
      expect(bar2.getAttribute('data-active')).toBe('false');
      expect(bar0.className).toContain('bg-cyber-red');
      expect(bar0.className).toContain('animate-pulse');
      expect(screen.getByText('1/3')).toBeDefined();
    });
  });

  describe('2. TopBar', () => {
    it('renders telemetry metrics, streak, player alias, and handles interactions', () => {
      const mockToggleMute = vi.fn();
      const mockIntercept = vi.fn();

      const { rerender } = render(
        <TopBar
          activeWhispers={42}
          playersOnline={7}
          streak={5}
          lives={3}
          isMuted={false}
          hasActiveLease={false}
          isLoading={false}
          onToggleMute={mockToggleMute}
          onIntercept={mockIntercept}
          playerAlias="Cipher-42"
        />
      );

      expect(screen.getByTestId('player-alias').textContent).toBe('Cipher-42');
      expect(screen.getByTestId('active-whispers-count').textContent).toBe('42');
      expect(screen.getByTestId('players-online-count').textContent).toBe('7');
      expect(screen.getByTestId('player-streak').textContent).toBe('5');
      expect(screen.getByTestId('volume-active-icon')).toBeDefined();

      const interceptBtn = screen.getByTestId('intercept-whisper-btn');
      expect(interceptBtn.textContent).toContain('INTERCEPT WHISPER');
      expect(interceptBtn.hasAttribute('disabled')).toBe(false);
      fireEvent.click(interceptBtn);
      expect(mockIntercept).toHaveBeenCalledTimes(1);

      const muteBtn = screen.getByTestId('audio-mute-toggle');
      fireEvent.click(muteBtn);
      expect(mockToggleMute).toHaveBeenCalledTimes(1);

      // Re-render in muted and locked lease state
      rerender(
        <TopBar
          activeWhispers={42}
          playersOnline={7}
          streak={5}
          lives={3}
          isMuted={true}
          hasActiveLease={true}
          isLoading={false}
          onToggleMute={mockToggleMute}
          onIntercept={mockIntercept}
          playerAlias="Cipher-42"
        />
      );
      expect(screen.getByTestId('volume-muted-icon')).toBeDefined();
      expect(screen.getByTestId('intercept-whisper-btn').textContent).toContain('FREQUENCY LOCKED');
      expect(screen.getByTestId('intercept-whisper-btn').hasAttribute('disabled')).toBe(true);
    });
  });

  describe('3. WordInputModal (Live Constraint Engine)', () => {
    const defaultHistory: Hop[] = [
      {
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: 'The quick brown fox jumps.',
        newSentence: 'The agile brown fox jumps.',
        oldWord: 'quick',
        newWord: 'agile',
        role: 'shifter',
        timestamp: Date.now() - 5000,
      },
    ];

    it('enforces live validations: letters only, length < 12, dictionary, and no repeats', async () => {
      const mockSubmit = vi.fn().mockResolvedValue({ success: true });
      const mockClose = vi.fn();

      render(
        <WordInputModal
          isOpen={true}
          wordIndex={2}
          originalRawToken="brown"
          originalRootWord="brown"
          history={defaultHistory}
          initialSentence="The quick brown fox jumps."
          isSubmitting={false}
          onClose={mockClose}
          onSubmit={mockSubmit}
        />
      );

      const input = screen.getByTestId('disguise-word-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('modal-submit-btn');

      // Initially empty -> submit button disabled
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // 1. Non-alphabet
      fireEvent.change(input, { target: { value: 'wolf123' } });
      expect(screen.getByTestId('validation-error-msg').textContent).toContain('Letters only');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // 2. Length >= 12
      fireEvent.change(input, { target: { value: 'supercalifrag' } });
      expect(screen.getByTestId('validation-error-msg').textContent).toContain('exceeds 11 characters');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // 3. Non-dictionary fake word
      fireEvent.change(input, { target: { value: 'asdfghjk' } });
      expect(screen.getByTestId('validation-error-msg').textContent).toContain('Unrecognized non-dictionary');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // 4. Duplicate from history ("agile" was used in hop 1)
      fireEvent.change(input, { target: { value: 'agile' } });
      expect(screen.getByTestId('validation-error-msg').textContent).toContain('previously used in chain history');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // 5. Valid English word <12 chars ("silent")
      fireEvent.change(input, { target: { value: 'silent' } });
      expect(screen.queryByTestId('validation-error-msg')).toBeNull();
      expect(submitBtn.hasAttribute('disabled')).toBe(false);

      // Submit
      fireEvent.click(submitBtn);
      expect(mockSubmit).toHaveBeenCalledWith(2, 'silent');
    });

    it('aborts on abort button click', () => {
      const mockClose = vi.fn();
      render(
        <WordInputModal
          isOpen={true}
          wordIndex={0}
          originalRawToken="test"
          originalRootWord="test"
          history={[]}
          isSubmitting={false}
          onClose={mockClose}
          onSubmit={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('modal-abort-btn'));
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. DecoderQuiz', () => {
    const themeOptions = [
      'cold-war-espionage',
      'deep-sea-trench',
      'cyberpunk-heist',
      'ancient-alchemy',
    ];

    it('renders 4 candidate options and handles selection and submit', () => {
      const mockSubmit = vi.fn();

      render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={false}
          onSubmitGuess={mockSubmit}
        />
      );

      const option0 = screen.getByTestId('decoder-option-0');
      const option1 = screen.getByTestId('decoder-option-1');
      const submitBtn = screen.getByTestId('decoder-submit-btn');

      // Initially disabled
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Click option 1
      fireEvent.click(option1);
      expect(option1.getAttribute('data-selected')).toBe('true');
      expect(option0.getAttribute('data-selected')).toBe('false');
      expect(submitBtn.hasAttribute('disabled')).toBe(false);

      // Click submit
      fireEvent.click(submitBtn);
      expect(mockSubmit).toHaveBeenCalledWith('deep-sea-trench');
    });

    it('supports keyboard hotkeys 1, 2, 3, 4', () => {
      const mockSubmit = vi.fn();

      render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={false}
          onSubmitGuess={mockSubmit}
        />
      );

      // Press '3' for cyberpunk-heist
      fireEvent.keyDown(window, { key: '3' });
      const option2 = screen.getByTestId('decoder-option-2');
      expect(option2.getAttribute('data-selected')).toBe('true');

      // Press '1' for cold-war-espionage
      fireEvent.keyDown(window, { key: '1' });
      const option0 = screen.getByTestId('decoder-option-0');
      expect(option0.getAttribute('data-selected')).toBe('true');
      expect(option2.getAttribute('data-selected')).toBe('false');
    });
  });

  describe('5. TraceLogDrawer', () => {
    const traceHops: Hop[] = [
      {
        hopNumber: 1,
        playerId: 'p1',
        playerAlias: 'Cipher-1',
        previousSentence: 'The agent transmits the secret file.',
        newSentence: 'The operative transmits the secret file.',
        oldWord: 'agent',
        newWord: 'operative',
        role: 'shifter',
        timestamp: Date.now() - 20000,
      },
      {
        hopNumber: 2,
        playerId: 'p2',
        playerAlias: 'Specter-2',
        previousSentence: 'The operative transmits the secret file.',
        newSentence: 'The operative leaks the secret file.',
        oldWord: 'transmits',
        newWord: 'leaks',
        role: 'shifter',
        isTrapHit: true,
        timestamp: Date.now() - 10000,
      },
      {
        hopNumber: 3,
        playerId: 'p3',
        playerAlias: 'Viper-3',
        previousSentence: 'The operative leaks the secret file.',
        newSentence: 'The operative leaks the secret file.',
        role: 'decoder',
        decoderGuess: 'cold-war-espionage',
        isCorrectGuess: true,
        timestamp: Date.now(),
      },
    ];

    it('expands and renders recent hops with diffs and badges', () => {
      render(<TraceLogDrawer traceLog={traceHops} />);

      // Initially closed
      expect(screen.queryByTestId('trace-log-content')).toBeNull();

      // Click expand
      fireEvent.click(screen.getByTestId('trace-log-toggle-btn'));
      expect(screen.getByTestId('trace-log-content')).toBeDefined();

      // Verify hop 2 trap hit badge
      expect(screen.getByText('TRAP HIT (-1 BAR)')).toBeDefined();

      // Verify hop 3 decoder bonus badge
      expect(screen.getByText('+10 BONUS HOPS')).toBeDefined();
    });
  });

  describe('6. ActiveChainsBar', () => {
    it('renders monitored chains and links to ghost receipts for terminal states', () => {
      const monitored = [
        {
          chainId: 'chain-alpha-1234',
          currentHop: 45,
          lives: 3,
          status: 'active' as const,
          role: 'shifter' as const,
          lastUpdated: Date.now(),
        },
        {
          chainId: 'chain-beta-5678',
          currentHop: 100,
          lives: 2,
          status: 'victory' as const,
          role: 'decoder' as const,
          lastUpdated: Date.now(),
        },
      ];

      render(<ActiveChainsBar chains={monitored} />);

      expect(screen.getByTestId('monitored-chains-count').textContent).toContain('2 TRACKED');
      expect(screen.getByTestId('chain-card-chain-alpha-1234')).toBeDefined();
      expect(screen.getByTestId('chain-card-chain-beta-5678')).toBeDefined();

      // Alpha is active -> no ghost receipt link
      expect(screen.queryByTestId('ghost-link-chain-alpha-1234')).toBeNull();

      // Beta is victory -> ghost receipt link rendered
      const ghostLink = screen.getByTestId('ghost-link-chain-beta-5678');
      expect(ghostLink.getAttribute('href')).toBe('/ghost/chain-beta-5678');
    });
  });

  describe('7. JuryPopupModal', () => {
    const sampleJuryCase: JurySummonPayload = {
      caseId: 'case-999',
      chainId: 'chain-xyz',
      flaggedWord: 'gibberish',
      previousSentence: 'The satellite orbits the planet peacefully.',
      newSentence: 'The satellite gibberish the planet peacefully.',
      deadline: Date.now() + 20000,
    };

    it('renders summons details and handles vote actions', () => {
      const mockVote = vi.fn();
      const mockDismiss = vi.fn();

      render(
        <JuryPopupModal
          juryCase={sampleJuryCase}
          onVote={mockVote}
          onDismiss={mockDismiss}
        />
      );

      expect(screen.getByTestId('jury-before-sentence').textContent).toContain('satellite orbits the planet');
      expect(screen.getByTestId('jury-mutated-sentence').textContent).toContain('gibberish');

      // Click Yes Sabotage
      fireEvent.click(screen.getByTestId('jury-vote-sabotage-btn'));
      expect(mockVote).toHaveBeenCalledWith('case-999', true);

      // Click No Legitimate
      fireEvent.click(screen.getByTestId('jury-vote-legitimate-btn'));
      expect(mockVote).toHaveBeenCalledWith('case-999', false);
    });
  });

  describe('8. GhostTimeline', () => {
    it('renders timeline hops and diff indicators correctly', () => {
      const diffs: GhostHopDiff[] = [
        {
          hopNumber: 1,
          playerId: 'p1',
          playerAlias: 'Cipher-1',
          role: 'shifter',
          previousSentence: 'A secret agent infiltrates the base.',
          newSentence: 'A covert agent infiltrates the base.',
          oldWord: 'secret',
          newWord: 'covert',
          timestamp: Date.now() - 50000,
        },
      ];

      render(<GhostTimeline diffs={diffs} />);
      expect(screen.getByTestId('ghost-timeline-hop-1')).toBeDefined();
      expect(screen.getByText('Cipher-1')).toBeDefined();
      expect(screen.getByText('secret')).toBeDefined();
      expect(screen.getByText('covert')).toBeDefined();
    });
  });

  describe('9. CenterStage', () => {
    const sampleChain: SanitizedChain = {
      id: 'chain-stage-1',
      currentSentence: 'The dark shadow moves across the room.',
      currentHop: 5,
      lives: 3,
      status: 'active',
      leaseExpiresAt: Date.now() + 60000,
      initialSentence: 'The dark shadow moves across the room.',
      history: [],
    };

    it('renders standby screen when activeChain is null', () => {
      render(
        <CenterStage
          activeChain={null}
          role={null}
          secondsRemaining={60}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('center-stage-standby')).toBeDefined();
      expect(screen.queryByTestId('center-stage-active')).toBeNull();
    });

    it('renders interactive sentence word blocks and handles word selection and sabotage report', () => {
      const mockSelectWord = vi.fn();
      const mockReportSabotage = vi.fn();

      render(
        <CenterStage
          activeChain={sampleChain}
          role="shifter"
          secondsRemaining={45}
          isPulsing={false}
          onSelectWord={mockSelectWord}
          onReportSabotage={mockReportSabotage}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('center-stage-active')).toBeDefined();
      expect(screen.getByTestId('chain-id-badge').textContent).toContain('CHAIN #chain-st');
      expect(screen.getByTestId('lease-seconds-timer').textContent).toBe('00:45');

      // Click token #1 ("dark")
      const wordBlock1 = screen.getByTestId('word-block-1');
      fireEvent.click(wordBlock1);
      expect(mockSelectWord).toHaveBeenCalledWith(1, 'dark', 'dark');

      // Click SCRUB (report sabotage)
      const scrubBtn = screen.getByTestId('report-sabotage-btn');
      fireEvent.click(scrubBtn);
      expect(mockReportSabotage).toHaveBeenCalledTimes(1);
    });

    it('renders DecoderQuiz when role = decoder and themeOptions exist', () => {
      const decoderChain: SanitizedChain = {
        ...sampleChain,
        currentHop: 10,
        themeOptions: ['theme-a', 'theme-b', 'theme-c', 'theme-d'],
      };

      render(
        <CenterStage
          activeChain={decoderChain}
          role="decoder"
          secondsRemaining={30}
          isPulsing={false}
          onSelectWord={vi.fn()}
          onReportSabotage={vi.fn()}
          onSubmitDecoderGuess={vi.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('decoder-quiz-container')).toBeDefined();
      expect(screen.queryByTestId('sentence-word-blocks')).toBeNull();
    });
  });
});

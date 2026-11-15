import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '@/components/cyber_rescue/SettingsModal';

describe('SettingsModal Component', () => {
  it('renders player name and game settings when open', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onToggleMute = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={onClose}
        playerName="CyberHawk"
        onSavePlayerName={onSave}
        isMuted={false}
        onToggleMute={onToggleMute}
      />
    );

    expect(screen.getByText('GAME SETTINGS')).toBeDefined();
    const input = screen.getByTestId('settings-player-name-input') as HTMLInputElement;
    expect(input.value).toBe('CyberHawk');
  });

  it('allows rolling a random gamer handle and saving it', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onToggleMute = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={onClose}
        playerName="CyberHawk"
        onSavePlayerName={onSave}
        isMuted={false}
        onToggleMute={onToggleMute}
      />
    );

    const randomBtn = screen.getByTestId('randomize-name-settings-btn');
    fireEvent.click(randomBtn);

    expect(onSave).toHaveBeenCalled();
    const newName = onSave.mock.calls[0][0];
    expect(newName).not.toBe('CyberHawk');
    expect(typeof newName).toBe('string');
  });

  it('locks name editing during an active match', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onToggleMute = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={onClose}
        playerName="ShadowPulse"
        onSavePlayerName={onSave}
        isMuted={false}
        onToggleMute={onToggleMute}
        isMatchActive={true}
      />
    );

    expect(screen.getByTestId('locked-name-notice')).toBeDefined();
    const input = screen.getByTestId('settings-player-name-input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(screen.queryByTestId('randomize-name-settings-btn')).toBeNull();
  });

  it('shows error "This name is already in use" when trying to save an already taken name', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onToggleMute = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={onClose}
        playerName="MyName"
        onSavePlayerName={onSave}
        isMuted={false}
        onToggleMute={onToggleMute}
        existingNames={['ShadowPulse', 'NeonViper']}
      />
    );

    const input = screen.getByTestId('settings-player-name-input');
    fireEvent.change(input, { target: { value: 'ShadowPulse' } });

    const saveBtn = screen.getByTestId('save-player-name-btn');
    fireEvent.click(saveBtn);

    expect(screen.getByText('This name is already in use')).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('displays a suggested available name and allows clicking "Use This" to adopt it', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onToggleMute = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={onClose}
        playerName="MyName"
        onSavePlayerName={onSave}
        isMuted={false}
        onToggleMute={onToggleMute}
        existingNames={['ShadowPulse']}
      />
    );

    const input = screen.getByTestId('settings-player-name-input');
    fireEvent.change(input, { target: { value: 'ShadowPulse' } });

    expect(screen.getByText('This name is already in use')).toBeDefined();
    const useBtn = screen.getByTestId('use-suggested-name-btn');
    expect(useBtn).toBeDefined();

    fireEvent.click(useBtn);

    expect(onSave).toHaveBeenCalled();
    const chosen = onSave.mock.calls[0][0];
    expect(chosen).not.toBe('ShadowPulse');
  });
});


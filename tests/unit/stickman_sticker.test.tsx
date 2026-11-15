import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StickmanSticker, STICKER_IDS, resolveAvatarSticker } from '@/components/cyber_rescue/StickmanSticker';

describe('StickmanSticker Custom SVG Avatar Suite', () => {
  it('defines 20 unique sticker avatars', () => {
    expect(STICKER_IDS.length).toBe(20);
    const uniqueIds = new Set(STICKER_IDS);
    expect(uniqueIds.size).toBe(20);
  });

  it('renders all 20 sticker variants as valid SVG elements', () => {
    for (const stickerId of STICKER_IDS) {
      const { unmount } = render(<StickmanSticker avatarId={stickerId} size={32} />);
      const svgEl = screen.getByRole('img');
      expect(svgEl).toBeDefined();
      expect(svgEl.tagName.toLowerCase()).toBe('svg');
      expect(svgEl.getAttribute('width')).toBe('32');
      expect(svgEl.getAttribute('height')).toBe('32');
      expect(svgEl.getAttribute('aria-label')).toBe(stickerId);
      unmount();
    }
  });

  it('resolves legacy emoji avatars to corresponding stickers without breaking', () => {
    expect(resolveAvatarSticker('🙂')).toBe('sticker_classic');
    expect(resolveAvatarSticker('😎')).toBe('sticker_shades');
    expect(resolveAvatarSticker('🤠')).toBe('sticker_cowboy');
    expect(resolveAvatarSticker('🥷')).toBe('sticker_ninja');
    expect(resolveAvatarSticker('🤓')).toBe('sticker_nerd');
    expect(resolveAvatarSticker('👑')).toBe('sticker_crown');
    expect(resolveAvatarSticker('🎧')).toBe('sticker_gamer');
    expect(resolveAvatarSticker('🤖')).toBe('sticker_robot');
    expect(resolveAvatarSticker('🔥')).toBe('sticker_blaze');
    expect(resolveAvatarSticker('🐺')).toBe('sticker_cat');
    expect(resolveAvatarSticker('🦅')).toBe('sticker_astro');
  });

  it('falls back gracefully to classic sticker on null or undefined input', () => {
    expect(resolveAvatarSticker(null)).toBe('sticker_classic');
    expect(resolveAvatarSticker(undefined)).toBe('sticker_classic');
    expect(resolveAvatarSticker('')).toBe('sticker_classic');
  });

  it('deterministically hashes unknown string avatars to one of the 20 stickers', () => {
    const resolved = resolveAvatarSticker('custom_player_xyz');
    expect(STICKER_IDS.includes(resolved)).toBe(true);
  });
});


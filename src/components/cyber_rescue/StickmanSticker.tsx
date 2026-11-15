'use client';

import React from 'react';

export type StickmanStickerId =
  | 'sticker_classic'
  | 'sticker_shades'
  | 'sticker_ninja'
  | 'sticker_gamer'
  | 'sticker_cowboy'
  | 'sticker_detective'
  | 'sticker_cyborg'
  | 'sticker_party'
  | 'sticker_crown'
  | 'sticker_nerd'
  | 'sticker_star'
  | 'sticker_angel'
  | 'sticker_pirate'
  | 'sticker_astro'
  | 'sticker_wizard'
  | 'sticker_blaze'
  | 'sticker_viking'
  | 'sticker_sleepy'
  | 'sticker_cat'
  | 'sticker_robot';

export const STICKER_IDS: StickmanStickerId[] = [
  'sticker_classic',
  'sticker_shades',
  'sticker_ninja',
  'sticker_gamer',
  'sticker_cowboy',
  'sticker_detective',
  'sticker_cyborg',
  'sticker_party',
  'sticker_crown',
  'sticker_nerd',
  'sticker_star',
  'sticker_angel',
  'sticker_pirate',
  'sticker_astro',
  'sticker_wizard',
  'sticker_blaze',
  'sticker_viking',
  'sticker_sleepy',
  'sticker_cat',
  'sticker_robot',
];

// Mapping table to seamlessly convert legacy emojis or unknown IDs to stickers
export function resolveAvatarSticker(avatarId?: string | null): StickmanStickerId {
  if (!avatarId) return 'sticker_classic';
  const clean = avatarId.trim();

  // If already a valid sticker ID, return it
  if (STICKER_IDS.includes(clean as StickmanStickerId)) {
    return clean as StickmanStickerId;
  }

  // Legacy emoji mappings
  switch (clean) {
    case '🙂':
    case '😊':
      return 'sticker_classic';
    case '😎':
      return 'sticker_shades';
    case '😄':
    case '😃':
    case '😁':
      return 'sticker_star';
    case '🤠':
      return 'sticker_cowboy';
    case '🥷':
      return 'sticker_ninja';
    case '🤓':
      return 'sticker_nerd';
    case '🤩':
      return 'sticker_star';
    case '🧐':
      return 'sticker_detective';
    case '🥳':
      return 'sticker_party';
    case '😇':
      return 'sticker_angel';
    case '😉':
    case '😏':
    case '🤔':
      return 'sticker_shades';
    case '😮':
    case '😤':
      return 'sticker_blaze';
    case '👑':
      return 'sticker_crown';
    case '🎧':
      return 'sticker_gamer';
    case '🤖':
      return 'sticker_robot';
    case '😴':
      return 'sticker_sleepy';
    case '🔥':
      return 'sticker_blaze';
    case '🐺':
    case '🦊':
      return 'sticker_cat';
    case '🦅':
      return 'sticker_astro';
    case '🐯':
    case '🦁':
      return 'sticker_viking';
    default:
      // Hash unknown strings deterministically to one of the 20 stickers
      let hash = 0;
      for (let i = 0; i < clean.length; i++) {
        hash = (hash << 5) - hash + clean.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % STICKER_IDS.length;
      return STICKER_IDS[index];
  }
}

const OUT = '#F8FAFC';
const INK = '#0F172A';

/** Shared building blocks so every face reads as one family. */
const Head: React.FC<{ fill?: string }> = ({ fill = INK }) => (
  <circle cx="20" cy="18" r="9.5" stroke={OUT} strokeWidth="2" fill={fill} />
);

const Eyes: React.FC<{ c?: string; y?: number; dx?: number; r?: number }> = ({
  c = '#38BDF8',
  y = 17,
  dx = 3.6,
  r = 1.5,
}) => (
  <>
    <circle cx={20 - dx} cy={y} r={r} fill={c} />
    <circle cx={20 + dx} cy={y} r={r} fill={c} />
  </>
);

const Smile: React.FC<{ y?: number; w?: number; c?: string }> = ({ y = 22, w = 3.6, c = OUT }) => (
  <path d={`M${20 - w} ${y} Q20 ${y + 4} ${20 + w} ${y}`} stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" />
);

export interface StickmanStickerProps {
  avatarId?: string | null;
  size?: number;
  className?: string;
  title?: string;
  /** Hide the outer sticker disc (background + border). */
  bare?: boolean;
}

export const StickmanSticker: React.FC<StickmanStickerProps> = ({
  avatarId,
  size = 28,
  className = '',
  title,
  bare = false,
}) => {
  const sticker = resolveAvatarSticker(avatarId);

  return (
    <svg
      width={size}
      height={size}
      viewBox="2 -2 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible drop-shadow-sm transition-transform hover:scale-110 ${className}`}
      role="img"
      aria-label={title || sticker}
    >
      {!bare && (
        <>
          <circle cx="20" cy="16" r="18" fill="#0E1626" stroke="#38BDF8" strokeWidth="1.6" />
          <circle cx="20" cy="16" r="15.5" fill="#1E293B" />
        </>
      )}

      {sticker === 'sticker_classic' && (
        <g>
          <Head />
          <path d="M14 10 Q16 4 19 8 Q21 3 24 8 Q27 6 26 11" stroke={OUT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Eyes />
          <Smile />
          <ellipse cx="14.2" cy="21" rx="1.6" ry="1" fill="#F43F5E" opacity="0.6" />
          <ellipse cx="25.8" cy="21" rx="1.6" ry="1" fill="#F43F5E" opacity="0.6" />
        </g>
      )}

      {sticker === 'sticker_shades' && (
        <g>
          <Head />
          <path d="M10.8 16 Q12 7 20 7.5 Q28 7 29.2 16 Q24 11 10.8 16 Z" fill="#334155" stroke={OUT} strokeWidth="1.2" />
          <path d="M11.5 15.5 H19 L18 20.5 H13 Z" fill="#020617" stroke="#38BDF8" strokeWidth="1.2" />
          <path d="M21 15.5 H28.5 L27 20.5 H22 Z" fill="#020617" stroke="#38BDF8" strokeWidth="1.2" />
          <path d="M19 16.5 H21" stroke="#38BDF8" strokeWidth="1.4" />
          <line x1="13.5" y1="17" x2="16.5" y2="17" stroke="#E0F2FE" strokeWidth="1" strokeLinecap="round" />
          <line x1="23" y1="17" x2="26" y2="17" stroke="#E0F2FE" strokeWidth="1" strokeLinecap="round" />
          <path d="M16.5 23.5 Q20 25 24 22.8" stroke={OUT} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      )}

      {sticker === 'sticker_ninja' && (
        <g>
          <Head fill="#18181B" />
          <path d="M11 14.5 H29 V19.5 H11 Z" fill="#E2E8F0" />
          <path d="M14.5 15.8 L18.5 17.6 L14.5 18.4 Z" fill="#0F172A" />
          <path d="M25.5 15.8 L21.5 17.6 L25.5 18.4 Z" fill="#0F172A" />
          <circle cx="16.7" cy="17.4" r="0.9" fill="#38BDF8" />
          <circle cx="23.3" cy="17.4" r="0.9" fill="#38BDF8" />
          <path d="M10.2 11.5 Q20 8 29.8 11.5 V14 Q20 11 10.2 14 Z" fill="#EF4444" />
          <path d="M29.5 12 L36 9 L34 14 L37 17" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="18" y="9.2" width="4" height="3.2" rx="0.6" fill="#94A3B8" />
        </g>
      )}

      {sticker === 'sticker_gamer' && (
        <g>
          <Head />
          <path d="M10.5 15 Q12 6.5 20 6.8 Q28 6.5 29.5 15 Q20 11 10.5 15 Z" fill="#0F766E" stroke={OUT} strokeWidth="1.2" />
          <path d="M9.5 18 Q9.5 4 20 4.5 Q30.5 4 30.5 18" stroke="#06B6D4" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <rect x="6.8" y="14.5" width="5" height="9" rx="2.4" fill="#0891B2" stroke={OUT} strokeWidth="1.2" />
          <rect x="28.2" y="14.5" width="5" height="9" rx="2.4" fill="#0891B2" stroke={OUT} strokeWidth="1.2" />
          <path d="M9.3 23.5 Q11 28 17 26.5" stroke="#06B6D4" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="17.3" cy="26.4" r="1.4" fill="#22D3EE" />
          <Eyes />
          <path d="M17.5 22 Q20 24.5 22.5 22" stroke={OUT} strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </g>
      )}

      {sticker === 'sticker_cowboy' && (
        <g>
          <Head />
          <Eyes c={OUT} y={18} />
          <path d="M16 22.5 Q20 26.5 24 22.5" stroke={OUT} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M13 12 Q13 3 20 3.2 Q27 3 27 12 Z" fill="#B45309" stroke="#78350F" strokeWidth="1.2" />
          <path d="M13 10.5 H27" stroke="#78350F" strokeWidth="2" />
          <circle cx="20" cy="10.5" r="1.1" fill="#FBBF24" />
          <path d="M3 13.5 Q9 15.5 14 12 H26 Q31 15.5 37 13.5 Q30 9.5 20 9.8 Q10 9.5 3 13.5 Z" fill="#D97706" stroke="#78350F" strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      )}

      {sticker === 'sticker_detective' && (
        <g>
          <Head />
          <path d="M10.5 13.5 Q12 4 20 4.2 Q28 4 29.5 13.5 Q20 9 10.5 13.5 Z" fill="#78350F" stroke="#92400E" strokeWidth="1.4" />
          <path d="M20 4.4 V11" stroke="#92400E" strokeWidth="1" />
          <path d="M10 14 Q6 15 7 19 M30 14 Q34 15 33 19" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M16 6 Q20 3 24 6" stroke="#B45309" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="24" cy="17.5" r="3.4" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(125,211,252,0.18)" />
          <path d="M26.5 20 Q29 23 28 27" stroke="#F59E0B" strokeWidth="1" fill="none" />
          <circle cx="16" cy="17.5" r="1.5" fill="#38BDF8" />
          <circle cx="24" cy="17.5" r="1.2" fill="#38BDF8" />
          <path d="M16.5 22.8 Q20 23.6 23.5 22.5" stroke={OUT} strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </g>
      )}

      {sticker === 'sticker_cyborg' && (
        <g>
          <Head fill="#1E293B" />
          <path d="M10.5 15 Q11 7.5 20 8 H22 V13 H10.7 Z" fill="#475569" stroke={OUT} strokeWidth="1.2" />
          <path d="M24 9 L27 5" stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="27.4" cy="4.6" r="1.4" fill="#22D3EE" />
          <path d="M11 15 H29 V20.5 H11 Z" fill="#06B6D4" stroke="#22D3EE" strokeWidth="1.4" />
          <line x1="13" y1="17.8" x2="27" y2="17.8" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M13 23 L15.5 26 H19" stroke="#22D3EE" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M20 23.8 H25" stroke={OUT} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {sticker === 'sticker_party' && (
        <g>
          <Head />
          <path d="M12.5 11.5 L21 0.8 L28 12 Q20 9.5 12.5 11.5 Z" fill="#F43F5E" stroke="#FB7185" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M15.5 8 Q21 6 25.2 8.8 M14 10.6 Q20 8.4 26.4 10.8" stroke="#FBBF24" strokeWidth="1.3" fill="none" />
          <circle cx="21" cy="1.4" r="2.2" fill="#FBBF24" />
          <rect x="4" y="8" width="2.4" height="2.4" fill="#67E8F9" transform="rotate(25 5 9)" />
          <rect x="33.5" y="6" width="2.4" height="2.4" fill="#A7F3D0" transform="rotate(-20 34 7)" />
          <rect x="35" y="19" width="2.2" height="2.2" fill="#FDE68A" transform="rotate(40 36 20)" />
          <rect x="2.5" y="21" width="2.2" height="2.2" fill="#FB7185" transform="rotate(10 3.5 22)" />
          <path d="M13 17.2 Q15 19.4 17 17.2" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="24" cy="17" r="1.6" fill="#38BDF8" />
          <path d="M15.5 21.5 Q20 28 24.5 21.5 Z" fill="#FB7185" stroke={OUT} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}

      {sticker === 'sticker_crown' && (
        <g>
          <Head />
          <path d="M11.5 11.5 L9.5 2.5 L15.5 7 L20 0.8 L24.5 7 L30.5 2.5 L28.5 11.5 Q20 9.5 11.5 11.5 Z" fill="#F59E0B" stroke="#FBBF24" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="20" cy="5.6" r="1.3" fill="#EF4444" />
          <circle cx="14.2" cy="9" r="1" fill="#38BDF8" />
          <circle cx="25.8" cy="9" r="1" fill="#38BDF8" />
          <circle cx="9.5" cy="2.6" r="1" fill="#FDE68A" />
          <circle cx="30.5" cy="2.6" r="1" fill="#FDE68A" />
          <Eyes />
          <Smile />
          <path d="M14.5 14.2 Q16.5 13 18.5 14.2 M21.5 14.2 Q23.5 13 25.5 14.2" stroke={OUT} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </g>
      )}

      {sticker === 'sticker_nerd' && (
        <g>
          <Head />
          <path d="M10.5 14 Q12 6.5 20 7 Q28 6.5 29.5 14 Q26 9.5 20 10.5 Q14 9.5 10.5 14 Z" fill="#78350F" stroke={OUT} strokeWidth="1.1" />
          <circle cx="15.5" cy="17.5" r="3.8" stroke={OUT} strokeWidth="1.8" fill="rgba(186,230,253,0.18)" />
          <circle cx="24.5" cy="17.5" r="3.8" stroke={OUT} strokeWidth="1.8" fill="rgba(186,230,253,0.18)" />
          <path d="M19.3 17 H20.7" stroke={OUT} strokeWidth="1.8" />
          <circle cx="15.5" cy="17.5" r="1.4" fill="#38BDF8" />
          <circle cx="24.5" cy="17.5" r="1.4" fill="#38BDF8" />
          <path d="M16.5 22.4 Q20 25.6 23.5 22.4" stroke={OUT} strokeWidth="1.7" strokeLinecap="round" fill="none" />
          <rect x="18.7" y="22.9" width="2.6" height="2" rx="0.5" fill={OUT} />
        </g>
      )}

      {sticker === 'sticker_star' && (
        <g>
          <Head />
          <path d="M10.5 12.5 Q20 6 29.5 12.5" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <polygon points="20,0.5 22,5.2 27,5.6 23.2,8.8 24.4,13.6 20,11 15.6,13.6 16.8,8.8 13,5.6 18,5.2" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1" strokeLinejoin="round" />
          <polygon points="15.5,14.3 16.6,16.6 19,16.9 17.2,18.5 17.7,20.9 15.5,19.7 13.3,20.9 13.8,18.5 12,16.9 14.4,16.6" fill="#FBBF24" />
          <polygon points="24.5,14.3 25.6,16.6 28,16.9 26.2,18.5 26.7,20.9 24.5,19.7 22.3,20.9 22.8,18.5 21,16.9 23.4,16.6" fill="#FBBF24" />
          <path d="M15.5 22.5 Q20 28.5 24.5 22.5 Z" fill="#FB7185" stroke={OUT} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M4 12 V16 M2 14 H6" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M35 17 V21 M33 19 H37" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}

      {sticker === 'sticker_angel' && (
        <g>
          <Head />
          <path d="M10.6 15 Q12 7.5 20 7.8 Q28 7.5 29.4 15 Q24 11 10.6 15 Z" fill="#FDE68A" stroke="#FBBF24" strokeWidth="1" />
          <ellipse cx="20" cy="3.6" rx="8" ry="2.4" stroke="#FBBF24" strokeWidth="2.2" fill="none" />
          <ellipse cx="20" cy="3.6" rx="8" ry="2.4" stroke="#FEF08A" strokeWidth="1" fill="none" opacity="0.9" />
          <path d="M14 17.5 Q16 20 18 17.5 M22 17.5 Q24 20 26 17.5" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M17 22.3 Q20 24.8 23 22.3" stroke={OUT} strokeWidth="1.7" strokeLinecap="round" fill="none" />
          <ellipse cx="13.6" cy="21.2" rx="1.6" ry="1" fill="#FB7185" opacity="0.6" />
          <ellipse cx="26.4" cy="21.2" rx="1.6" ry="1" fill="#FB7185" opacity="0.6" />
        </g>
      )}

      {sticker === 'sticker_pirate' && (
        <g>
          <Head />
          <path d="M5 12.5 Q11 14 15 10.5 H25 Q29 14 35 12.5 Q31 3.5 20 3.4 Q9 3.5 5 12.5 Z" fill="#1E293B" stroke={OUT} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5 12.5 Q11 14 15 10.5 H25 Q29 14 35 12.5" stroke="#FBBF24" strokeWidth="1.2" fill="none" />
          <circle cx="20" cy="7.4" r="2" fill={OUT} />
          <rect x="18.7" y="8.6" width="2.6" height="1.5" rx="0.4" fill={OUT} />
          <circle cx="19.2" cy="7.4" r="0.55" fill={INK} />
          <circle cx="20.8" cy="7.4" r="0.55" fill={INK} />
          <circle cx="15.5" cy="17.5" r="3" fill="#020617" stroke={OUT} strokeWidth="1.2" />
          <path d="M11 11.5 L19 15.5" stroke="#020617" strokeWidth="1.4" />
          <circle cx="24.5" cy="17.5" r="1.6" fill="#38BDF8" />
          <circle cx="30.4" cy="21.5" r="1.4" stroke="#FBBF24" strokeWidth="1.1" fill="none" />
          <path d="M16.5 23 Q21 26 24.5 22.2" stroke={OUT} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      )}

      {sticker === 'sticker_astro' && (
        <g>
          <circle cx="20" cy="17.5" r="12.2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
          <path d="M10.5 13.5 Q20 8.5 29.5 13.5 V21.5 Q20 27 10.5 21.5 Z" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.3" />
          <path d="M13 15.8 Q20 12 27 15.8" stroke="#E0F2FE" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <circle cx="16.3" cy="19" r="1.5" fill="#BAE6FD" />
          <circle cx="23.7" cy="19" r="1.5" fill="#BAE6FD" />
          <path d="M18 22 Q20 23.4 22 22" stroke="#BAE6FD" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M31 8 L34.5 2.5" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="34.8" cy="2.2" r="1.3" fill="#EF4444" />
        </g>
      )}

      {sticker === 'sticker_wizard' && (
        <g>
          <Head />
          <path d="M11.2 20.5 Q12 26.5 20 30 Q28 26.5 28.8 20.5 Q24 25.5 20 24.5 Q16 25.5 11.2 20.5 Z" fill="#E2E8F0" stroke={OUT} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M16.5 22.5 Q20 21.4 23.5 22.5" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="16.8" r="1.5" fill="#C084FC" />
          <circle cx="24" cy="16.8" r="1.5" fill="#C084FC" />
          <path d="M13.5 14.2 Q16 12.8 18.5 14.2 M21.5 14.2 Q24 12.8 26.5 14.2" stroke="#E2E8F0" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path d="M5 13.5 Q20 17 35 13.5 Q27 12 24.5 9.5 L25 0.8 Q15 5 15.5 9.5 Q13 12 5 13.5 Z" fill="#6366F1" stroke="#818CF8" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M15.2 10.6 Q20 12.4 24.8 10.6" stroke="#FBBF24" strokeWidth="1.6" fill="none" />
          <path d="M21.5 5.5 A2.3 2.3 0 1 1 20 9 A1.7 1.7 0 0 0 21.5 5.5" fill="#FBBF24" />
          <polygon points="18,4.2 18.5,5.4 19.8,5.5 18.8,6.3 19.1,7.5 18,6.8 16.9,7.5 17.2,6.3 16.2,5.5 17.5,5.4" fill="#FDE68A" />
        </g>
      )}

      {sticker === 'sticker_blaze' && (
        <g>
          <Head />
          <path d="M10.6 14 Q8 8 11.5 4 Q12 8 14.5 8.5 Q14 3 18 0.8 Q18.5 5 21 6 Q23 2 26 4 Q25.5 8 27.5 9 Q31 6 29.4 14 Q20 9 10.6 14 Z" fill="#F97316" stroke="#EF4444" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M14 12 Q15 8 18 9 Q19 5.5 21 8.5 Q24 6.5 25 11.5 Q20 9.5 14 12 Z" fill="#FDE047" />
          <path d="M12.8 14.2 L18.2 16 M27.2 14.2 L21.8 16" stroke={OUT} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="18" r="1.6" fill="#F97316" />
          <circle cx="24" cy="18" r="1.6" fill="#F97316" />
          <path d="M14.8 22 Q20 28 25.2 22 Z" fill="#7C2D12" stroke="#F97316" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M17 22.4 V24 M20 22.6 V25 M23 22.4 V24" stroke={OUT} strokeWidth="1" />
        </g>
      )}

      {sticker === 'sticker_viking' && (
        <g>
          <Head />
          <path d="M11 20.5 Q11.5 26 18 27.5 Q20 29.5 20 32 Q20 29.5 22 27.5 Q28.5 26 29 20.5 Q24.5 24.5 20 23.5 Q15.5 24.5 11 20.5 Z" fill="#B45309" stroke="#78350F" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M18.6 28.6 H21.4 M18.9 30.6 H21.1" stroke="#78350F" strokeWidth="1.2" />
          <path d="M15.5 22.3 Q18 21 20 22.5 Q22 21 24.5 22.3" stroke={OUT} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M10.2 14.5 Q11 6 20 6.2 Q29 6 29.8 14.5 Q20 10.8 10.2 14.5 Z" fill="#64748B" stroke="#CBD5E1" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M10.2 12.8 Q20 9.5 29.8 12.8" stroke="#FBBF24" strokeWidth="1.8" fill="none" />
          <path d="M11 11.5 Q4.5 10 4 2.5 Q8 5.5 13.5 8 Z" fill={OUT} stroke="#CBD5E1" strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M29 11.5 Q35.5 10 36 2.5 Q32 5.5 26.5 8 Z" fill={OUT} stroke="#CBD5E1" strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M20 10 V16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="15.6" cy="17.6" r="1.5" fill="#38BDF8" />
          <circle cx="24.4" cy="17.6" r="1.5" fill="#38BDF8" />
        </g>
      )}

      {sticker === 'sticker_sleepy' && (
        <g>
          <Head />
          <path d="M10.4 13.5 Q12 4.5 22 5.5 Q30.5 6.5 34 16 Q31 12 29.6 13.5 Q20 10 10.4 13.5 Z" fill="#6366F1" stroke="#A5B4FC" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M10.2 13.8 Q20 9.8 29.8 13.8" stroke={OUT} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="34.4" cy="17" r="2.4" fill={OUT} />
          <path d="M13.5 17.5 Q16.4 15.5 19 17.5 M21 17.5 Q23.6 15.5 26.5 17.5" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="20" cy="23" rx="1.8" ry="2" fill="#FB7185" stroke={OUT} strokeWidth="1" />
          <ellipse cx="13.8" cy="21" rx="1.5" ry="0.9" fill="#FB7185" opacity="0.5" />
          <ellipse cx="26.2" cy="21" rx="1.5" ry="0.9" fill="#FB7185" opacity="0.5" />
          <text x="3" y="12" fill="#38BDF8" fontSize="7" fontWeight="bold" fontFamily="monospace">Z</text>
          <text x="1" y="6" fill="#7DD3FC" fontSize="5" fontWeight="bold" fontFamily="monospace">z</text>
        </g>
      )}

      {sticker === 'sticker_cat' && (
        <g>
          <polygon points="9.5,15 11.5,3.8 18,10" fill="#F43F5E" stroke="#FB7185" strokeWidth="1.3" strokeLinejoin="round" />
          <polygon points="30.5,15 28.5,3.8 22,10" fill="#F43F5E" stroke="#FB7185" strokeWidth="1.3" strokeLinejoin="round" />
          <polygon points="12,13 12.8,7.5 16,10.5" fill="#FBCFE8" />
          <polygon points="28,13 27.2,7.5 24,10.5" fill="#FBCFE8" />
          <Head />
          <path d="M20 9 V12.5 M16.5 9.8 L17.2 12.6 M23.5 9.8 L22.8 12.6" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round" />
          <ellipse cx="15.8" cy="17.5" rx="1.7" ry="2.3" fill="#10B981" />
          <ellipse cx="24.2" cy="17.5" rx="1.7" ry="2.3" fill="#10B981" />
          <ellipse cx="15.8" cy="17.5" rx="0.5" ry="1.8" fill={INK} />
          <ellipse cx="24.2" cy="17.5" rx="0.5" ry="1.8" fill={INK} />
          <polygon points="18.8,20.4 21.2,20.4 20,21.8" fill="#FB7185" />
          <path d="M16.8 22.6 Q18.4 24.2 20 22 Q21.6 24.2 23.2 22.6" stroke={OUT} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M10.5 20 L4 18.5 M10.6 22 L4 23 M29.5 20 L36 18.5 M29.4 22 L36 23" stroke="#E2E8F0" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      )}

      {sticker === 'sticker_robot' && (
        <g>
          <line x1="20" y1="8" x2="20" y2="3" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="2.4" r="2" fill="#EF4444" />
          <circle cx="19.4" cy="1.8" r="0.6" fill="#FECACA" />
          <rect x="8.5" y="8" width="23" height="19" rx="5.5" fill="#1E293B" stroke={OUT} strokeWidth="2.2" />
          <rect x="5.8" y="14.5" width="2.7" height="6" rx="1.1" fill="#06B6D4" />
          <rect x="31.5" y="14.5" width="2.7" height="6" rx="1.1" fill="#06B6D4" />
          <rect x="12.5" y="13.5" width="5.5" height="4.6" rx="1.2" fill="#22D3EE" />
          <rect x="22" y="13.5" width="5.5" height="4.6" rx="1.2" fill="#22D3EE" />
          <rect x="14" y="14.6" width="1.6" height="1.6" rx="0.4" fill="#ECFEFF" />
          <rect x="23.5" y="14.6" width="1.6" height="1.6" rx="0.4" fill="#ECFEFF" />
          <rect x="13" y="20.8" width="14" height="3.4" rx="1" fill="#0F172A" stroke="#22D3EE" strokeWidth="0.9" />
          <path d="M16 21 V24 M19 21 V24 M22 21 V24 M25 21 V24" stroke="#22D3EE" strokeWidth="0.9" />
        </g>
      )}
    </svg>
  );
};

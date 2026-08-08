/**
 * frontend/src/components/achievements/SVGTrophies.tsx
 * Custom SVG icons for each achievement, by tier and key.
 */

import React, { useId } from 'react';

type IconProps = {
  size?: number;
  color?: string;
};

// ─── Shared color utility ───────────────────────────────────────────────────
// Lightens (positive percent) or darkens (negative percent) a 6-digit hex
// color. Used to derive light/mid/dark tri-tone gradients for every
// achievement icon from a single base color, the same way the trophy tier
// palettes are hand-tuned — but generated on the fly so any icon can get the
// same glossy, embossed treatment regardless of what color it's passed.
function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = (num >> 16) & 0xff;
  const G = (num >> 8) & 0xff;
  const B = num & 0xff;
  const newR = Math.round((t - R) * p) + R;
  const newG = Math.round((t - G) * p) + G;
  const newB = Math.round((t - B) * p) + B;
  return '#' + (0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1);
}

// ─── Premium 3D trophy engine ───────────────────────────────────────────────
//
// Built to read as a professionally-illustrated 3D render, not a flat icon:
//  - Cup fill uses a diagonal cylindrical-light gradient (light upper-left,
//    falling off to shadow lower-right) instead of a flat tint.
//  - A blurred specular highlight is clipped to the cup's own silhouette so
//    the glossy patch never spills outside the metal.
//  - The star emblem is "embossed": a larger dark star sits behind a smaller
//    light star at the same center, so a rim of shadow reads as a recessed
//    bevel — the cheap-but-effective way flat-render tools fake engraving.
//  - A dark pedestal with an inset, gradient-filled nameplate replaces the
//    old two-rectangle stack.
//  - A soft radial glow sits behind the whole piece, and platinum gets a
//    genuinely multi-hue iridescent gradient rather than a flat gray tint.

type TierPalette = {
  /** Cup body — light → mid → shadow, applied along a diagonal (top-left lit). */
  cupStops: { offset: string; color: string }[];
  rimColor: string;
  rimShadow: string;
  metalMid: string; // handles, stem, waist bead, foot
  metalDark: string; // deepest shadow tone, used for the embossed star's recess
  nameplateStops: { offset: string; color: string }[];
  glowColor: string;
  sparkleColor: string;
  sparkleCount: 1 | 2 | 3;
};

function PremiumTrophy({ size, palette }: { size: number; palette: TierPalette }) {
  const uid = useId();
  const cupGradId = `${uid}-cup`;
  const plateGradId = `${uid}-plate`;
  const plinthGradId = `${uid}-plinth`;
  const glowGradId = `${uid}-glow`;
  const cupClipId = `${uid}-cupclip`;
  const shadowFilterId = `${uid}-shadow`;
  const blurFilterId = `${uid}-blur`;

  // Shared cup silhouette path, reused for both the fill and the clip path
  // that contains the specular highlight.
  const cupPath = 'M9 8C9 6.2 15.5 5 24 5C32.5 5 39 6.2 39 8L39 15C39 22 33 27 24 27C15 27 9 22 9 15Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={cupGradId} x1="10" y1="5" x2="39" y2="27" gradientUnits="userSpaceOnUse">
          {palette.cupStops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>

        <linearGradient id={plateGradId} x1="17" y1="39.5" x2="31" y2="42.5" gradientUnits="userSpaceOnUse">
          {palette.nameplateStops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>

        <linearGradient id={plinthGradId} x1="24" y1="37" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#46464e" />
          <stop offset="100%" stopColor="#17171b" />
        </linearGradient>

        <radialGradient id={glowGradId} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor={palette.glowColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={palette.glowColor} stopOpacity="0" />
        </radialGradient>

        <clipPath id={cupClipId}>
          <path d={cupPath} />
        </clipPath>

        <filter id={shadowFilterId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.5" floodColor={palette.metalDark} floodOpacity="0.35" />
        </filter>

        <filter id={blurFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
      </defs>

      {/* Ambient glow — soft colored halo behind the whole piece */}
      <circle cx="24" cy="21" r="21" fill={`url(#${glowGradId})`} />

      {/* Ground contact shadow */}
      <ellipse cx="24" cy="45.5" rx="11.5" ry="1.3" fill="black" opacity="0.16" />

      <g filter={`url(#${shadowFilterId})`}>
        {/* Pedestal */}
        <rect x="12" y="37.5" width="24" height="7" rx="2.2" fill={`url(#${plinthGradId})`} />
        <rect x="12" y="37.5" width="24" height="1.4" rx="0.7" fill="#5c5c66" opacity="0.6" />

        {/* Nameplate — recessed inset, then the raised gradient plaque on top */}
        <rect x="16.6" y="39.3" width="14.8" height="3.6" rx="1" fill="#0c0c0e" opacity="0.45" />
        <rect x="17" y="39.6" width="14" height="3" rx="0.85" fill={`url(#${plateGradId})`} />
        <rect x="17" y="39.6" width="14" height="1" rx="0.5" fill="white" opacity="0.22" />

        {/* Foot — flares from stem down to the pedestal */}
        <path d="M21 34L27 34L30.5 37.5L17.5 37.5Z" fill={palette.metalMid} />

        {/* Stem */}
        <rect x="22.2" y="30" width="3.6" height="4.3" fill={palette.metalMid} />

        {/* Waist bead */}
        <ellipse cx="24" cy="29.6" rx="3.8" ry="1.7" fill={palette.metalMid} />

        {/* Handles — thicker tubular loops with a highlight edge for roundness */}
        <path
          d="M11 12C4 11 1 15 1.5 19C2 23 6 25.5 11.5 24.3"
          stroke={palette.metalMid}
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M37 12C44 11 47 15 46.5 19C46 23 42 25.5 36.5 24.3"
          stroke={palette.metalMid}
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M11.3 12.6C5.4 11.8 2.6 15.1 3 18.6"
          stroke="white"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />
        <path
          d="M36.7 12.6C42.6 11.8 45.4 15.1 45 18.6"
          stroke="white"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />

        {/* Cup body */}
        <path d={cupPath} fill={`url(#${cupGradId})`} />

        {/* Specular highlight, clipped tightly to the cup so it never bleeds outside the metal */}
        <g clipPath={`url(#${cupClipId})`}>
          <ellipse cx="16.5" cy="12" rx="5.5" ry="8" fill="white" opacity="0.5" filter={`url(#${blurFilterId})`} />
          <ellipse cx="34" cy="20" rx="4" ry="9" fill="black" opacity="0.14" filter={`url(#${blurFilterId})`} />
        </g>

        {/* Rim — top opening of the cup, lighter than the body with a thin inner-shadow line */}
        <ellipse cx="24" cy="8" rx="15" ry="3.2" fill={palette.rimColor} />
        <ellipse
          cx="24"
          cy="8.55"
          rx="13.2"
          ry="2.4"
          fill="none"
          stroke={palette.rimShadow}
          strokeWidth="0.5"
          opacity="0.55"
        />

        {/* Embossed star emblem — darker star behind a smaller lighter star = recessed bevel */}
        <path
          d="M24 9.6L25.32 13.42L29.36 13.5L26.14 15.9L27.28 19.76L24 17.5L20.72 19.76L21.86 15.9L18.64 13.5L22.68 13.42Z"
          fill={palette.metalDark}
          opacity="0.55"
          transform="translate(24,15) translate(0,0.5) translate(-24,-15)"
        />
        <path
          d="M24 9.6L25.32 13.42L29.36 13.5L26.14 15.9L27.28 19.76L24 17.5L20.72 19.76L21.86 15.9L18.64 13.5L22.68 13.42Z"
          fill={palette.rimColor}
          stroke={palette.metalMid}
          strokeWidth="0.4"
          transform="translate(24,15) scale(0.82) translate(-24,-15)"
        />

        {/* Cup vertical highlight streak, on top of everything for the final glossy pop */}
        <path
          d="M13.5 10.5C12.7 14 13 18.5 15.5 22.5"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
      </g>

      {/* Sparkles — sit outside the shadow group so they render crisp, not blurred */}
      <path d="M40 7L40.8 9.1L43 10L40.8 10.9L40 13L39.2 10.9L37 10L39.2 9.1L40 7Z" fill={palette.sparkleColor} />
      {palette.sparkleCount >= 2 && (
        <path d="M7.5 27L8 28.4L9.4 29L8 29.6L7.5 31L7 29.6L5.6 29L7 28.4L7.5 27Z" fill={palette.sparkleColor} />
      )}
      {palette.sparkleCount >= 3 && <circle cx="8" cy="14" r="1" fill={palette.sparkleColor} opacity="0.85" />}
    </svg>
  );
}

// ─── Tier-based trophy SVGs ─────────────────────────────────────────────────
// Each palette is tuned to the tier's own material — the `color` prop from
// the original API is kept for backwards compatibility but the full
// multi-stop palette (light/mid/shadow) is what actually renders, since a
// single flat color can't produce a 3D-looking metal surface.

const BRONZE_PALETTE: TierPalette = {
  cupStops: [
    { offset: '0%', color: '#F2C49B' },
    { offset: '32%', color: '#E08A4C' },
    { offset: '65%', color: '#C06B2E' },
    { offset: '100%', color: '#7A4118' },
  ],
  rimColor: '#EFAE79',
  rimShadow: '#8A4E22',
  metalMid: '#C9773D',
  metalDark: '#5E3313',
  nameplateStops: [
    { offset: '0%', color: '#F2C49B' },
    { offset: '100%', color: '#C06B2E' },
  ],
  glowColor: '#E08A4C',
  sparkleColor: '#F2C49B',
  sparkleCount: 1,
};

const SILVER_PALETTE: TierPalette = {
  cupStops: [
    { offset: '0%', color: '#FFFFFF' },
    { offset: '32%', color: '#E4E7EC' },
    { offset: '65%', color: '#B7BEC9' },
    { offset: '100%', color: '#6E7480' },
  ],
  rimColor: '#F3F4F6',
  rimShadow: '#7C818C',
  metalMid: '#C3C8D1',
  metalDark: '#565b64',
  nameplateStops: [
    { offset: '0%', color: '#F5F6F8' },
    { offset: '100%', color: '#B7BEC9' },
  ],
  glowColor: '#B7BEC9',
  sparkleColor: '#F3F4F6',
  sparkleCount: 1,
};

const GOLD_PALETTE: TierPalette = {
  cupStops: [
    { offset: '0%', color: '#FFF3C4' },
    { offset: '32%', color: '#FFDD66' },
    { offset: '65%', color: '#F5B400' },
    { offset: '100%', color: '#9C6A00' },
  ],
  rimColor: '#FFE59A',
  rimShadow: '#9C6A00',
  metalMid: '#F0B92A',
  metalDark: '#7A4F00',
  nameplateStops: [
    { offset: '0%', color: '#FFEFB0' },
    { offset: '100%', color: '#F5B400' },
  ],
  glowColor: '#FFC629',
  sparkleColor: '#FFEFB0',
  sparkleCount: 3,
};

const PLATINUM_PALETTE: TierPalette = {
  // Genuinely multi-hue rather than a flat gray — that's what reads as
  // "iridescent" instead of "dull metal" at a glance.
  cupStops: [
    { offset: '0%', color: '#F5F1FF' },
    { offset: '24%', color: '#D9CBFF' },
    { offset: '48%', color: '#B9C7FF' },
    { offset: '72%', color: '#CDE3FF' },
    { offset: '100%', color: '#8FA0DE' },
  ],
  rimColor: '#EDEBFF',
  rimShadow: '#8FA0DE',
  metalMid: '#B9C0E8',
  metalDark: '#5C63A0',
  nameplateStops: [
    { offset: '0%', color: '#FBD9F5' },
    { offset: '50%', color: '#CFE3FF' },
    { offset: '100%', color: '#D9C9FF' },
  ],
  glowColor: '#B9C7FF',
  sparkleColor: '#E8EEFF',
  sparkleCount: 3,
};

export function BronzeTrophy({ size = 48 }: IconProps) {
  return <PremiumTrophy size={size} palette={BRONZE_PALETTE} />;
}

export function SilverTrophy({ size = 48 }: IconProps) {
  return <PremiumTrophy size={size} palette={SILVER_PALETTE} />;
}

export function GoldTrophy({ size = 48 }: IconProps) {
  return <PremiumTrophy size={size} palette={GOLD_PALETTE} />;
}

export function PlatinumTrophy({ size = 48 }: IconProps) {
  return <PremiumTrophy size={size} palette={PLATINUM_PALETTE} />;
}

// ─── Achievement-specific icons ─────────────────────────────────────────────
//
// Every icon below follows the same premium recipe as the trophies, derived
// automatically from whatever single `color` it's given via shadeColor():
//  - a light → mid → dark diagonal gradient fill (real depth, not a flat tint)
//  - a blurred specular highlight + falloff shadow, clipped to the shape
//  - a soft ambient glow behind the whole piece
//  - a drop-shadow filter for elevation off the page
//  - a small embossed / bevelled accent somewhere in the mark, echoing the
//    trophies' "dark shape behind a smaller light shape" trick
// so every badge reads as something genuinely earned, not a flat glyph.

export function MedalIcon({ size = 48, color = '#FF6B35' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-medal`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.55);
  const dark = shadeColor(color, -0.45);

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="15" y1="15" x2="33" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="24" cy="26" r="12" />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <circle cx="24" cy="26" r="20" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        {/* Ribbon */}
        <path d="M16 20L20 34L24 30L28 34L32 20Z" fill={dark} opacity="0.85" />
        <path d="M17.5 20L20.5 31L24 27.5L27.5 31L30.5 20Z" fill={color} opacity="0.9" />

        {/* Medal disc */}
        <circle cx="24" cy="26" r="12" fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.6" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="19" cy="20" rx="6" ry="8" fill="white" opacity="0.45" filter={`url(#${blurId})`} />
          <ellipse cx="29" cy="32" rx="5" ry="7" fill="black" opacity="0.15" filter={`url(#${blurId})`} />
        </g>
        <circle cx="24" cy="26" r="8.4" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.8" />

        {/* Embossed center star */}
        <path
          d="M24 20.5L25.3 24.1L29 24.2L26 26.6L27.1 30.3L24 28.1L20.9 30.3L22 26.6L19 24.2L22.7 24.1Z"
          fill={dark}
          opacity="0.5"
          transform="translate(24,25.5) translate(0,0.4) translate(-24,-25.5)"
        />
        <path
          d="M24 20.5L25.3 24.1L29 24.2L26 26.6L27.1 30.3L24 28.1L20.9 30.3L22 26.6L19 24.2L22.7 24.1Z"
          fill={light}
          transform="translate(24,25.5) scale(0.8) translate(-24,-25.5)"
        />
      </g>
    </svg>
  );
}

export function StarIcon({ size = 48, color = '#FFD700' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-star`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.6);
  const dark = shadeColor(color, -0.5);
  const starPath = 'M24 4L29.09 17.64L44 18.36L32 28.92L35.82 44L24 36.64L12.18 44L16 28.92L4 18.36L18.91 17.64L24 4Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={starPath} />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.3" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <circle cx="24" cy="24" r="23" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d={starPath} fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.5" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="17" cy="14" rx="7" ry="10" fill="white" opacity="0.5" filter={`url(#${blurId})`} />
          <ellipse cx="32" cy="34" rx="6" ry="9" fill="black" opacity="0.16" filter={`url(#${blurId})`} />
        </g>
        {/* Embossed inner point for a faceted, cut-gem feel */}
        <path d="M24 13L27 22L24 26L21 22Z" fill={light} opacity="0.4" />
      </g>

      <path d="M39 6L39.7 8L41.7 8.7L39.7 9.4L39 11.4L38.3 9.4L36.3 8.7L38.3 8Z" fill={light} />
    </svg>
  );
}

export function CrownIcon({ size = 48, color = '#FFD700' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-crown`;
  const bandId = `${uid}-band`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.6);
  const dark = shadeColor(color, -0.5);
  const crownPath = 'M8 36L6 16L14 24L24 12L34 24L42 16L40 36H8Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="6" y1="12" x2="42" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id={bandId} x1="12" y1="36" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={crownPath} />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.3" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <ellipse cx="24" cy="26" rx="22" ry="20" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d={crownPath} fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.5" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="16" cy="18" rx="7" ry="9" fill="white" opacity="0.45" filter={`url(#${blurId})`} />
          <ellipse cx="34" cy="30" rx="6" ry="9" fill="black" opacity="0.14" filter={`url(#${blurId})`} />
        </g>
        <rect x="12" y="36" width="24" height="4" rx="2" fill={`url(#${bandId})`} />
        <rect x="12" y="36" width="24" height="1.2" rx="0.6" fill="white" opacity="0.3" />
        <circle cx="14" cy="16" r="3" fill={light} stroke={dark} strokeWidth="0.4" />
        <circle cx="24" cy="12" r="4" fill={light} stroke={dark} strokeWidth="0.4" />
        <circle cx="34" cy="16" r="3" fill={light} stroke={dark} strokeWidth="0.4" />
        <circle cx="13" cy="15" r="1" fill="white" opacity="0.8" />
        <circle cx="23" cy="10.5" r="1.3" fill="white" opacity="0.8" />
        <circle cx="33" cy="15" r="1" fill="white" opacity="0.8" />
      </g>
    </svg>
  );
}

export function BrainIcon({ size = 48, color = '#8B5CF6' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-brain`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.55);
  const dark = shadeColor(color, -0.45);
  const brainPath =
    'M24 8C18 8 14 12 14 18C14 22 16 25 19 27V36C19 37 20 38 21 38H27C28 38 29 37 29 36V27C32 25 34 22 34 18C34 12 30 8 24 8Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="14" y1="8" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={brainPath} />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.3" stdDeviation="1.1" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <circle cx="24" cy="22" r="19" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d={brainPath} fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.5" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="19" cy="14" rx="6" ry="8" fill="white" opacity="0.4" filter={`url(#${blurId})`} />
          <ellipse cx="30" cy="30" rx="5" ry="8" fill="black" opacity="0.15" filter={`url(#${blurId})`} />
        </g>
        <path
          d="M19 20C19 18 21 16 24 16C27 16 29 18 29 20"
          stroke={light}
          strokeWidth="1.4"
          fill="none"
          opacity="0.7"
        />
        <path d="M21 22C21 21 22 20 24 20" stroke={light} strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M27 22C27 21 26 20 24 20" stroke={light} strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M16 14C14 16 14 20 16 22" stroke={dark} strokeWidth="1.4" fill="none" opacity="0.8" />
        <path d="M32 14C34 16 34 20 32 22" stroke={dark} strokeWidth="1.4" fill="none" opacity="0.8" />
      </g>
    </svg>
  );
}

export function TargetIcon({ size = 48, color = '#EF4444' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-target`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.55);
  const dark = shadeColor(color, -0.5);

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="6" />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.3" stdDeviation="1.1" floodColor={dark} floodOpacity="0.35" />
        </filter>
      </defs>

      <circle cx="24" cy="24" r="22" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <circle cx="24" cy="24" r="18" fill="none" stroke={dark} strokeWidth="2.4" />
        <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="1.6" />
        <circle cx="24" cy="24" r="12" fill="none" stroke={dark} strokeWidth="2.4" opacity="0.85" />
        <circle cx="24" cy="24" r="12" fill="none" stroke={color} strokeWidth="1.6" opacity="0.9" />
        <circle cx="24" cy="24" r="6" fill={`url(#${gradId})`} />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="22" cy="21.5" rx="3" ry="3.6" fill="white" opacity="0.55" filter={`url(#${blurId})`} />
        </g>
        <circle cx="24" cy="24" r="2" fill="white" opacity="0.9" />
        <line x1="24" y1="4" x2="24" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="38" x2="24" y2="44" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="24" x2="10" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="24" x2="44" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function ShieldIcon({ size = 48, color = '#10B981' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-shield`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.55);
  const dark = shadeColor(color, -0.45);
  const shieldPath = 'M24 4L8 12V24C8 32 14 40 24 44C34 40 40 32 40 24V12L24 4Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={shieldPath} />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <ellipse cx="24" cy="24" rx="21" ry="22" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d={shieldPath} fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.5" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="16" cy="14" rx="7" ry="10" fill="white" opacity="0.4" filter={`url(#${blurId})`} />
          <ellipse cx="32" cy="34" rx="6" ry="10" fill="black" opacity="0.16" filter={`url(#${blurId})`} />
        </g>
        <path
          d="M20 24L24 28L30 22"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M20 24L24 28L30 22"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />
      </g>
    </svg>
  );
}

export function ZapIcon({ size = 48, color = '#F59E0B' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-zap`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.6);
  const dark = shadeColor(color, -0.5);
  const boltPath = 'M26 4L12 26H22L20 44L36 20H26L26 4Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="12" y1="4" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={boltPath} />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <circle cx="24" cy="24" r="22" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d={boltPath} fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.5" strokeLinejoin="round" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="20" cy="14" rx="6" ry="10" fill="white" opacity="0.5" filter={`url(#${blurId})`} />
          <ellipse cx="30" cy="34" rx="5" ry="9" fill="black" opacity="0.16" filter={`url(#${blurId})`} />
        </g>
        <path d="M25 8L17 24H23" stroke="white" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function RocketIcon({ size = 48, color = '#3B82F6' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-rocket`;
  const flameId = `${uid}-flame`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.6);
  const dark = shadeColor(color, -0.5);
  const bodyPath = 'M24 6C16 6 10 14 8 24L16 28C16 28 18 18 24 18C30 18 32 28 32 28L40 24C38 14 32 6 24 6Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="40" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id={flameId} x1="24" y1="30" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="60%" stopColor="#FFB347" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.3" stdDeviation="1.2" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <ellipse cx="24" cy="22" rx="20" ry="19" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d="M18 38L24 44L30 38L24 30Z" fill={`url(#${flameId})`} />
        <path d={bodyPath} fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.5" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="16" cy="14" rx="6" ry="9" fill="white" opacity="0.4" filter={`url(#${blurId})`} />
          <ellipse cx="32" cy="24" rx="6" ry="9" fill="black" opacity="0.14" filter={`url(#${blurId})`} />
        </g>
        <circle cx="24" cy="18" r="4" fill={light} opacity="0.9" stroke={dark} strokeWidth="0.4" />
        <circle cx="22.7" cy="16.6" r="1.2" fill="white" opacity="0.85" />
        <path d="M20 28L18 34" stroke={dark} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <path d="M28 28L30 34" stroke={dark} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

export function FlameIcon({ size = 48, color = '#FF6B35' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-flame`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.6);
  const dark = shadeColor(color, -0.5);
  const flamePath = 'M24 4C20 14 12 18 12 28C12 36 18 44 24 44C30 44 36 36 36 28C36 18 28 14 24 4Z';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="12" y1="4" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="55%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={flamePath} />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <ellipse cx="24" cy="26" rx="20" ry="21" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d={flamePath} fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.4" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="18" cy="16" rx="5" ry="9" fill="white" opacity="0.35" filter={`url(#${blurId})`} />
        </g>
        <path
          d="M24 10C22 16 18 18 18 24C18 28 22 32 24 32C26 32 30 28 30 24C30 18 26 16 24 10Z"
          fill="#FFB347"
          opacity="0.85"
        />
        <path
          d="M24 18C23 21 21 22 21 25C21 27 23 29 24 29C25 29 27 27 27 25C27 22 25 21 24 18Z"
          fill="#FFE066"
          opacity="0.95"
        />
      </g>
    </svg>
  );
}

export function AwardIcon({ size = 48, color = '#FFD700' }: IconProps) {
  const uid = useId();
  const gradId = `${uid}-award`;
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const light = shadeColor(color, 0.6);
  const dark = shadeColor(color, -0.5);

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="12" y1="8" x2="36" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="24" cy="20" r="12" />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor={dark} floodOpacity="0.4" />
        </filter>
      </defs>

      <circle cx="24" cy="22" r="20" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <path d="M16 30L20 44H28L32 30Z" fill={dark} opacity="0.85" />
        <path d="M17.5 30L20.7 41.5H27.3L30.5 30Z" fill={color} opacity="0.9" />
        <rect x="18" y="36" width="12" height="3" rx="1.5" fill={light} opacity="0.7" />

        <circle cx="24" cy="20" r="12" fill={`url(#${gradId})`} stroke={dark} strokeWidth="0.6" />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="19" cy="14" rx="6" ry="8" fill="white" opacity="0.45" filter={`url(#${blurId})`} />
          <ellipse cx="29" cy="26" rx="5" ry="7" fill="black" opacity="0.15" filter={`url(#${blurId})`} />
        </g>
        <circle cx="24" cy="20" r="8.4" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="0.8" />
        <path
          d="M24 14.5L25.3 18.1L29 18.2L26 20.6L27.1 24.3L24 22.1L20.9 24.3L22 20.6L19 18.2L22.7 18.1Z"
          fill={dark}
          opacity="0.5"
          transform="translate(24,19.5) translate(0,0.4) translate(-24,-19.5)"
        />
        <path
          d="M24 14.5L25.3 18.1L29 18.2L26 20.6L27.1 24.3L24 22.1L20.9 24.3L22 20.6L19 18.2L22.7 18.1Z"
          fill={light}
          transform="translate(24,19.5) scale(0.8) translate(-24,-19.5)"
        />
      </g>
    </svg>
  );
}

function TimerIcon({ size = 48, color = '#8B5CF6' }: IconProps) {
  const uid = useId();
  const glowId = `${uid}-glow`;
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const shadowId = `${uid}-shadow`;
  const faceId = `${uid}-face`;
  const light = shadeColor(color, 0.6);
  const dark = shadeColor(color, -0.5);

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={faceId} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor={shadeColor(color, 0.85)} stopOpacity="0.9" />
          <stop offset="55%" stopColor={shadeColor(color, 0.85)} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.06" />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="24" cy="26" r="14" />
        </clipPath>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor={dark} floodOpacity="0.35" />
        </filter>
      </defs>

      <circle cx="24" cy="26" r="20" fill={`url(#${glowId})`} />

      <g filter={`url(#${shadowId})`}>
        <rect x="20" y="4" width="8" height="6" rx="2" fill={color} opacity="0.9" stroke={dark} strokeWidth="0.4" />
        <path d="M22 10H26" stroke={dark} strokeWidth="1.2" opacity="0.5" />

        <circle cx="24" cy="26" r="14" fill="none" stroke={dark} strokeWidth="3" />
        <circle cx="24" cy="26" r="14" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="24" cy="26" r="14" fill={`url(#${faceId})`} />
        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="18" cy="18" rx="6" ry="8" fill="white" opacity="0.3" filter={`url(#${blurId})`} />
        </g>
        <path d="M24 16V26L30 30" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="26" r="1.6" fill={dark} />
      </g>
    </svg>
  );
}

// ─── Main resolver: returns the right icon based on achievement key and tier ──

export function getAchievementIcon(key: string, tier: string): React.ReactNode {
  const tierColors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };
  const color = tierColors[tier] ?? '#FFD700';

  switch (key) {
    case 'first_task_done':
      return <ShieldIcon size={48} color={tier === 'bronze' ? '#10B981' : color} />;
    case 'task_crusher_25':
      return <MedalIcon size={48} color={color} />;
    case 'task_legend_100':
      return <GoldTrophy size={48} color={color} />;
    case 'task_master_500':
      return <CrownIcon size={48} color={color} />;
    case 'habit_spark':
      return <FlameIcon size={48} color={color} />;
    case 'seven_day_streak':
      return <SilverTrophy size={48} color={color} />;
    case 'thirty_day_streak':
      return <GoldTrophy size={48} color={color} />;
    case 'streak_50':
      return <MedalIcon size={48} color={color} />;
    case 'century_streak':
      return <StarIcon size={48} color={color} />;
    case 'habit_master_100':
      return <AwardIcon size={48} color={color} />;
    case 'focus_rookie':
      return <TimerIcon size={48} color={color} />;
    case 'deep_work_hour':
      return <BrainIcon size={48} color={color} />;
    case 'focus_marathon':
      return <ZapIcon size={48} color={color} />;
    case 'project_shipper':
      return <RocketIcon size={48} color={color} />;
    case 'project_legend_10':
      return <TargetIcon size={48} color={color} />;
    case 'level_five': {
      if (tier === 'bronze') return <BronzeTrophy size={48} color={color} />;
      if (tier === 'silver') return <SilverTrophy size={48} color={color} />;
      if (tier === 'gold') return <GoldTrophy size={48} color={color} />;
      return <PlatinumTrophy size={48} color={color} />;
    }
    default: {
      if (tier === 'bronze') return <BronzeTrophy size={48} color={color} />;
      if (tier === 'silver') return <SilverTrophy size={48} color={color} />;
      if (tier === 'gold') return <GoldTrophy size={48} color={color} />;
      return <PlatinumTrophy size={48} color={color} />;
    }
  }
}

// Tier-based border colors
export const tierColors: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

export const tierGradients: Record<string, string> = {
  bronze: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)',
  silver: 'linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)',
  gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  platinum: 'linear-gradient(135deg, #E5E4E2 0%, #B0C4DE 50%, #FFFFFF 100%)',
};

/**
 * frontend/src/components/achievements/SVGTrophies.tsx
 * Custom SVG icons for each achievement, by tier and key.
 */

import React, { useId } from 'react';

type IconProps = {
  size?: number;
  color?: string;
};

// ─── Shared trophy silhouette ───────────────────────────────────────────────
// Cup + two handles + stem + tiered base, rendered with a metallic gradient,
// a glossy highlight streak, a soft drop shadow, and (optionally) sparkles.
// Every tier trophy is built from this so proportions stay identical and
// only the palette/extras change.

type TrophyBuildProps = {
  size: number;
  gradientStops: { offset: string; color: string }[];
  rimColor: string;
  accentColor: string; // handles, stem, base, rim shading
  sparkle?: boolean;
  crownSpikes?: boolean; // extra spikes on the rim, used for platinum
  ribbon?: boolean; // small bow at the neck — silver and up
  gem?: boolean; // faceted gem set into the bowl — gold and up
  laurel?: boolean; // laurel leaves flanking the stem — gold and up
  starFinial?: boolean; // star sitting above the rim — platinum only
  extraBaseTier?: boolean; // third, narrower base tier — platinum only
};

function TrophyBase({
  size,
  gradientStops,
  rimColor,
  accentColor,
  sparkle,
  crownSpikes,
  ribbon,
  gem,
  laurel,
  starFinial,
  extraBaseTier,
}: TrophyBuildProps) {
  const uid = useId();
  const cupGradId = `${uid}-cup`;
  const shadowId = `${uid}-shadow`;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={cupGradId} x1="14" y1="7" x2="34" y2="30" gradientUnits="userSpaceOnUse">
          {gradientStops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor={accentColor} floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Ground shadow — grounds the trophy visually */}
      <ellipse cx="24" cy="41.5" rx="11" ry="1.4" fill="black" opacity="0.09" />

      <g filter={`url(#${shadowId})`}>
        {/* Tiered base — a third, narrower tier is inserted for platinum */}
        <rect x="13" y="37.5" width="22" height="3" rx="1.5" fill={accentColor} opacity="0.9" />
        <rect x="17" y="34" width="14" height="3" rx="1.5" fill={accentColor} />
        {extraBaseTier && (
          <rect x="19.5" y="31.3" width="9" height="2.3" rx="1.15" fill={accentColor} opacity="0.85" />
        )}

        {/* Stem connecting cup to base */}
        <path d="M20.5 29.5H27.5L26.3 34H21.7L20.5 29.5Z" fill={accentColor} />

        {/* Laurel leaves flanking the stem — gold and up */}
        {laurel && (
          <>
            <ellipse cx="18.2" cy="31.5" rx="2.1" ry="1" fill={accentColor} opacity="0.75" transform="rotate(-25 18.2 31.5)" />
            <ellipse cx="16.6" cy="33.6" rx="2.1" ry="1" fill={accentColor} opacity="0.7" transform="rotate(-50 16.6 33.6)" />
            <ellipse cx="16" cy="36.1" rx="2" ry="0.95" fill={accentColor} opacity="0.65" transform="rotate(-78 16 36.1)" />
            <ellipse cx="29.8" cy="31.5" rx="2.1" ry="1" fill={accentColor} opacity="0.75" transform="rotate(25 29.8 31.5)" />
            <ellipse cx="31.4" cy="33.6" rx="2.1" ry="1" fill={accentColor} opacity="0.7" transform="rotate(50 31.4 33.6)" />
            <ellipse cx="32" cy="36.1" rx="2" ry="0.95" fill={accentColor} opacity="0.65" transform="rotate(78 32 36.1)" />
          </>
        )}

        {/* Cup bowl */}
        <path
          d="M14 10C14 8.3 16.3 7 24 7C31.7 7 34 8.3 34 10V19C34 25.1 29.7 30 24 30C18.3 30 14 25.1 14 19V10Z"
          fill={`url(#${cupGradId})`}
        />

        {/* Rim lip — gives the bowl a 3D opening */}
        <path
          d="M14 10C14 11.7 18.5 13 24 13C29.5 13 34 11.7 34 10C34 8.3 29.5 7 24 7C18.5 7 14 8.3 14 10Z"
          fill={rimColor}
          opacity="0.95"
        />

        {/* Ribbon bow at the neck — silver and up */}
        {ribbon && (
          <>
            <path d="M20 12.6L23 14.1L20 15.6Z" fill={accentColor} opacity="0.85" />
            <path d="M28 12.6L25 14.1L28 15.6Z" fill={accentColor} opacity="0.85" />
            <circle cx="24" cy="14.1" r="1" fill={accentColor} />
          </>
        )}

        {/* Faceted gem set into the bowl — gold and up */}
        {gem && (
          <>
            <path d="M24 15L26.2 17.5L24 20L21.8 17.5Z" fill="white" opacity="0.9" />
            <path d="M24 15L26.2 17.5L24 17.9L21.8 17.5Z" fill="white" opacity="0.5" />
            <path d="M24 15L26.2 17.5L24 20L21.8 17.5Z" fill="none" stroke={accentColor} strokeWidth="0.6" opacity="0.7" />
          </>
        )}

        {/* Handles */}
        <path
          d="M14.5 13C9 12.3 6 15.3 6.5 18.8C7 22.3 10.5 24.3 14.8 23.2"
          stroke={accentColor}
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M33.5 13C39 12.3 42 15.3 41.5 18.8C41 22.3 37.5 24.3 33.2 23.2"
          stroke={accentColor}
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />

        {/* Optional crown spikes on the rim (platinum) */}
        {crownSpikes && (
          <>
            <path d="M17 8.5L18.5 5.5L20 8.5" stroke={rimColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M28 8.5L29.5 5.5L31 8.5" stroke={rimColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {/* Star finial above the rim — platinum only */}
        {starFinial && (
          <path
            d="M24 2L24.7 3.9L26.7 4.1L25.1 5.4L25.6 7.4L24 6.2L22.4 7.4L22.9 5.4L21.3 4.1L23.3 3.9L24 2Z"
            fill={rimColor}
            stroke={accentColor}
            strokeWidth="0.4"
          />
        )}

        {/* Glossy highlight streak on the bowl */}
        <path
          d="M17.5 11.5C16.5 14.5 16.5 18 18.5 21.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M20 11C19.6 12.3 19.6 13.6 20.2 15"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
      </g>

      {/* Sparkles — sit outside the shadow group so they stay crisp */}
      {sparkle && (
        <>
          <path d="M40 8L40.7 9.8L42.5 10.5L40.7 11.2L40 13L39.3 11.2L37.5 10.5L39.3 9.8L40 8Z" fill={rimColor} />
          <path d="M8 30L8.5 31.3L9.8 31.8L8.5 32.3L8 33.6L7.5 32.3L6.2 31.8L7.5 31.3L8 30Z" fill={rimColor} />
          <circle cx="8.5" cy="14" r="1.1" fill={rimColor} opacity="0.85" />
        </>
      )}
    </svg>
  );
}

// ─── Tier-based trophy SVGs ─────────────────────────────────────────────────

export function BronzeTrophy({ size = 48, color = '#CD7F32' }: IconProps) {
  return (
    <TrophyBase
      size={size}
      accentColor={color}
      rimColor="#E3A063"
      gradientStops={[
        { offset: '0%', color: '#E3A063' },
        { offset: '55%', color: '#CD7F32' },
        { offset: '100%', color: '#8A5223' },
      ]}
    />
  );
}

export function SilverTrophy({ size = 48, color = '#C0C0C0' }: IconProps) {
  return (
    <TrophyBase
      size={size}
      accentColor={color}
      rimColor="#F1F1F1"
      ribbon
      gradientStops={[
        { offset: '0%', color: '#F5F5F5' },
        { offset: '50%', color: '#C0C0C0' },
        { offset: '100%', color: '#8E8E8E' },
      ]}
    />
  );
}

export function GoldTrophy({ size = 48, color = '#FFD700' }: IconProps) {
  return (
    <TrophyBase
      size={size}
      accentColor={color}
      rimColor="#FFEB99"
      sparkle
      ribbon
      gem
      laurel
      gradientStops={[
        { offset: '0%', color: '#FFEB99' },
        { offset: '50%', color: '#FFD700' },
        { offset: '100%', color: '#E8A200' },
      ]}
    />
  );
}

export function PlatinumTrophy({ size = 48, color = '#E5E4E2' }: IconProps) {
  return (
    <TrophyBase
      size={size}
      accentColor="#B0C4DE"
      rimColor="#FFFFFF"
      sparkle
      crownSpikes
      ribbon
      gem
      laurel
      starFinial
      extraBaseTier
      gradientStops={[
        { offset: '0%', color: '#FFFFFF' },
        { offset: '45%', color: '#E5E4E2' },
        { offset: '100%', color: '#A9B9CC' },
      ]}
    />
  );
}

// ─── Achievement-specific icons ─────────────────────────────────────────────

export function MedalIcon({ size = 48, color = '#FF6B35' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="26" r="12" fill={color} opacity="0.9" />
      <circle cx="24" cy="26" r="8" fill="white" opacity="0.3" />
      <circle cx="24" cy="26" r="5" fill={color} />
      <path d="M16 38L24 34L32 38" stroke={color} strokeWidth="2" fill="none" />
      <rect x="20" y="10" width="8" height="10" rx="2" fill={color} opacity="0.5" />
      <path d="M20 12H28" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function StarIcon({ size = 48, color = '#FFD700' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L29.09 17.64L44 18.36L32 28.92L35.82 44L24 36.64L12.18 44L16 28.92L4 18.36L18.91 17.64L24 4Z" fill={color} />
      <circle cx="24" cy="22" r="6" fill="white" opacity="0.4" />
    </svg>
  );
}

export function CrownIcon({ size = 48, color = '#FFD700' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 36L6 16L14 24L24 12L34 24L42 16L40 36H8Z" fill={color} />
      <rect x="12" y="36" width="24" height="4" rx="2" fill={color} opacity="0.7" />
      <circle cx="14" cy="16" r="3" fill={color} opacity="0.9" />
      <circle cx="24" cy="12" r="4" fill={color} opacity="0.9" />
      <circle cx="34" cy="16" r="3" fill={color} opacity="0.9" />
    </svg>
  );
}

export function BrainIcon({ size = 48, color = '#8B5CF6' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 8C18 8 14 12 14 18C14 22 16 25 19 27V36C19 37 20 38 21 38H27C28 38 29 37 29 36V27C32 25 34 22 34 18C34 12 30 8 24 8Z" fill={color} opacity="0.9" />
      <path d="M19 20C19 18 21 16 24 16C27 16 29 18 29 20" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M21 22C21 21 22 20 24 20" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M27 22C27 21 26 20 24 20" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M16 14C14 16 14 20 16 22" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M32 14C34 16 34 20 32 22" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function TargetIcon({ size = 48, color = '#EF4444' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="2" />
      <circle cx="24" cy="24" r="12" stroke={color} strokeWidth="2" opacity="0.8" />
      <circle cx="24" cy="24" r="6" fill={color} opacity="0.9" />
      <circle cx="24" cy="24" r="2" fill="white" />
      <line x1="24" y1="6" x2="24" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="36" x2="24" y2="42" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="24" x2="12" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="24" x2="42" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon({ size = 48, color = '#10B981' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L8 12V24C8 32 14 40 24 44C34 40 40 32 40 24V12L24 4Z" fill={color} opacity="0.9" />
      <path d="M24 12L16 20L20 28L28 20L24 12Z" fill="white" opacity="0.4" />
      <path d="M20 24L24 28L30 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
    </svg>
  );
}

export function ZapIcon({ size = 48, color = '#F59E0B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 4L12 26H22L20 44L36 20H26L26 4Z" fill={color} />
      <path d="M26 4L12 26H22L20 44L36 20H26L26 4Z" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
    </svg>
  );
}

export function RocketIcon({ size = 48, color = '#3B82F6' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 6C16 6 10 14 8 24L16 28C16 28 18 18 24 18C30 18 32 28 32 28L40 24C38 14 32 6 24 6Z" fill={color} opacity="0.9" />
      <circle cx="24" cy="18" r="4" fill="white" opacity="0.5" />
      <path d="M24 30V44" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M18 38L24 44L30 38" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M20 28L18 34" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M28 28L30 34" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function FlameIcon({ size = 48, color = '#FF6B35' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4C20 14 12 18 12 28C12 36 18 44 24 44C30 44 36 36 36 28C36 18 28 14 24 4Z" fill={color} opacity="0.9" />
      <path d="M24 10C22 16 18 18 18 24C18 28 22 32 24 32C26 32 30 28 30 24C30 18 26 16 24 10Z" fill="#FFB347" opacity="0.8" />
      <path d="M24 18C23 21 21 22 21 25C21 27 23 29 24 29C25 29 27 27 27 25C27 22 25 21 24 18Z" fill="#FFE066" opacity="0.9" />
    </svg>
  );
}

export function AwardIcon({ size = 48, color = '#FFD700' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="20" r="12" fill={color} opacity="0.9" />
      <circle cx="24" cy="20" r="8" fill="white" opacity="0.3" />
      <circle cx="24" cy="20" r="5" fill={color} />
      <path d="M16 30L20 44H28L32 30" fill={color} opacity="0.8" />
      <rect x="18" y="36" width="12" height="3" rx="1.5" fill={color} opacity="0.6" />
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
    case 'first_task_done':      return <ShieldIcon size={48} color={tier === 'bronze' ? '#10B981' : color} />;
    case 'task_crusher_25':      return <MedalIcon size={48} color={color} />;
    case 'task_legend_100':      return <GoldTrophy size={48} color={color} />;
    case 'task_master_500':      return <CrownIcon size={48} color={color} />;
    case 'habit_spark':          return <FlameIcon size={48} color={color} />;
    case 'seven_day_streak':     return <SilverTrophy size={48} color={color} />;
    case 'thirty_day_streak':    return <GoldTrophy size={48} color={color} />;
    case 'streak_50':            return <MedalIcon size={48} color={color} />;
    case 'century_streak':       return <StarIcon size={48} color={color} />;
    case 'habit_master_100':     return <AwardIcon size={48} color={color} />;
    case 'focus_rookie':         return <TimerIcon size={48} color={color} />;
    case 'deep_work_hour':       return <BrainIcon size={48} color={color} />;
    case 'focus_marathon':       return <ZapIcon size={48} color={color} />;
    case 'project_shipper':      return <RocketIcon size={48} color={color} />;
    case 'project_legend_10':    return <TargetIcon size={48} color={color} />;
    case 'level_five': {
      if (tier === 'bronze') return <BronzeTrophy size={48} color={color} />;
      if (tier === 'silver') return <SilverTrophy size={48} color={color} />;
      if (tier === 'gold')   return <GoldTrophy size={48} color={color} />;
      return <PlatinumTrophy size={48} color={color} />;
    }
    default: {
      if (tier === 'bronze') return <BronzeTrophy size={48} color={color} />;
      if (tier === 'silver') return <SilverTrophy size={48} color={color} />;
      if (tier === 'gold')   return <GoldTrophy size={48} color={color} />;
      return <PlatinumTrophy size={48} color={color} />;
    }
  }
}

function TimerIcon({ size = 48, color = '#8B5CF6' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="26" r="14" stroke={color} strokeWidth="2.5" />
      <path d="M24 16V26L30 30" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="4" width="8" height="6" rx="2" fill={color} opacity="0.8" />
      <path d="M22 10H26" stroke={color} strokeWidth="1.5" />
    </svg>
  );
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
import React from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Droplet,
  Loader2,
  MapPin,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { useWeather } from '../../features/habits/hooks/useWeather';

interface WeatherWidgetProps {
  location?: string;
  compact?: boolean;
}

type Condition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';

type WeatherTheme = {
  label: string;
  blurb: string;
  card: string;
  glow: string;
  ink: string;
  softInk: string;
  chip: string;
  haze: string;
  skyline: string;
  statBg: string;
};

const THEME: Record<Condition, WeatherTheme> = {
  sunny: {
    label: 'Sunny',
    blurb: 'Clear skies and bright energy.',
    card: 'linear-gradient(135deg, #FFFDF8 0%, #FFF4D7 46%, #FFE3B0 100%)',
    glow: '#FDBA2D',
    ink: '#F59E0B',
    softInk: '#B45309',
    chip: 'rgba(255, 184, 0, 0.15)',
    haze: 'rgba(255, 210, 112, 0.35)',
    skyline: '#E9B56D',
    statBg: '#FFF3D6',
  },
  cloudy: {
    label: 'Cloudy',
    blurb: 'Soft light with a calmer pace.',
    card: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F7 48%, #DDE6F0 100%)',
    glow: '#94A3B8',
    ink: '#64748B',
    softInk: '#475569',
    chip: 'rgba(100, 116, 139, 0.13)',
    haze: 'rgba(148, 163, 184, 0.24)',
    skyline: '#A8B5C4',
    statBg: '#EEF2F7',
  },
  rainy: {
    label: 'Rainy',
    blurb: 'Showers outside, steady wins inside.',
    card: 'linear-gradient(135deg, #F6FAFF 0%, #E4F0FF 48%, #BFD8FF 100%)',
    glow: '#3B82F6',
    ink: '#2563EB',
    softInk: '#1D4ED8',
    chip: 'rgba(59, 130, 246, 0.14)',
    haze: 'rgba(96, 165, 250, 0.28)',
    skyline: '#7EA0D1',
    statBg: '#E3EEFF',
  },
  snowy: {
    label: 'Snowy',
    blurb: 'Quiet air and crisp focus.',
    card: 'linear-gradient(135deg, #FFFFFF 0%, #EFF8FF 48%, #D7ECFA 100%)',
    glow: '#7DD3FC',
    ink: '#0284C7',
    softInk: '#0369A1',
    chip: 'rgba(14, 165, 233, 0.13)',
    haze: 'rgba(186, 230, 253, 0.38)',
    skyline: '#9DBBD0',
    statBg: '#E7F6FF',
  },
  windy: {
    label: 'Windy',
    blurb: 'Fresh gusts moving through.',
    card: 'linear-gradient(135deg, #F7FFFC 0%, #E5FBF2 48%, #C9F3E4 100%)',
    glow: '#2DD4BF',
    ink: '#0D9488',
    softInk: '#0F766E',
    chip: 'rgba(20, 184, 166, 0.14)',
    haze: 'rgba(45, 212, 191, 0.24)',
    skyline: '#8BC9BC',
    statBg: '#DDF8EF',
  },
};

function normalizeCondition(condition: string): Condition {
  const key = condition?.toLowerCase() as Condition;
  return THEME[key] ? key : 'sunny';
}

function CloudShape({
  x,
  y,
  scale = 1,
  fill = '#FFFFFF',
  opacity = 0.85,
}: {
  x: number;
  y: number;
  scale?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill} opacity={opacity}>
      <ellipse cx="0" cy="14" rx="28" ry="11" />
      <circle cx="-17" cy="8" r="11" />
      <circle cx="0" cy="2" r="15" />
      <circle cx="18" cy="9" r="10" />
    </g>
  );
}

function Landscape({ theme }: { theme: WeatherTheme }) {
  return (
    <g>
      <path d="M0 126 C24 108 43 111 62 95 C79 81 92 90 108 76 C121 65 134 78 149 67 C166 55 180 68 193 58 C205 49 217 55 240 42 L240 150 L0 150 Z" fill={theme.skyline} opacity="0.16" />
      <path d="M0 138 C34 128 58 132 82 118 C101 106 114 115 133 100 C151 86 166 99 184 86 C204 71 220 83 240 66 L240 150 L0 150 Z" fill={theme.skyline} opacity="0.22" />
      <g fill={theme.skyline} opacity="0.42" transform="translate(154 76)">
        <path d="M0 56 L0 35 L11 28 L22 35 L22 56 Z" />
        <rect x="30" y="27" width="14" height="29" rx="2" />
        <path d="M32 27 L37 18 L42 27 Z" />
        <rect x="54" y="12" width="16" height="44" rx="2" />
        <path d="M56 12 L62 0 L68 12 Z" />
        <circle cx="62" cy="30" r="3.5" fill="white" opacity="0.75" />
        <rect x="78" y="39" width="18" height="17" rx="2" />
        <path d="M103 56 L103 40 L113 33 L123 40 L123 56 Z" />
      </g>
    </g>
  );
}

function SunnyScene({ theme }: { theme: WeatherTheme }) {
  return (
    <>
      <defs>
        <radialGradient id="weatherSunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE99C" stopOpacity="0.95" />
          <stop offset="62%" stopColor={theme.glow} stopOpacity="0.32" />
          <stop offset="100%" stopColor={theme.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="weatherSunCore" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE778" />
          <stop offset="100%" stopColor="#FF9F1C" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="168"
        cy="52"
        r="52"
        fill="url(#weatherSunGlow)"
        animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '168px 52px' }}
      />
      <circle cx="168" cy="52" r="31" fill="url(#weatherSunCore)" stroke="white" strokeWidth="3" />
      <CloudShape x={78} y={74} scale={0.62} fill="#FFFFFF" opacity={0.55} />
      <CloudShape x={205} y={68} scale={0.45} fill="#FFFFFF" opacity={0.5} />
      <Landscape theme={theme} />
    </>
  );
}

function CloudyScene({ theme }: { theme: WeatherTheme }) {
  return (
    <>
      <circle cx="160" cy="54" r="40" fill={theme.haze} />
      <motion.g animate={{ x: [0, 7, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
        <CloudShape x={134} y={46} scale={0.92} fill="#FFFFFF" opacity={0.9} />
      </motion.g>
      <motion.g animate={{ x: [0, -9, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}>
        <CloudShape x={178} y={63} scale={0.74} fill="#CBD5E1" opacity={0.82} />
      </motion.g>
      <CloudShape x={72} y={78} scale={0.58} fill="#FFFFFF" opacity={0.58} />
      <Landscape theme={theme} />
    </>
  );
}

function RainyScene({ theme }: { theme: WeatherTheme }) {
  const drops = Array.from({ length: 9 }, (_, i) => ({
    x: 98 + i * 13,
    delay: (i % 4) * 0.18,
  }));

  return (
    <>
      <circle cx="160" cy="58" r="46" fill={theme.haze} />
      <CloudShape x={148} y={42} scale={0.95} fill="#8EA5C9" opacity={0.9} />
      <CloudShape x={176} y={51} scale={0.74} fill="#B7C6DD" opacity={0.86} />
      {drops.map((drop, index) => (
        <motion.line
          key={index}
          x1={drop.x}
          x2={drop.x - 5}
          y1="82"
          y2="97"
          stroke="#3B82F6"
          strokeWidth="2.8"
          strokeLinecap="round"
          animate={{ y1: [82, 112], y2: [97, 127], opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: drop.delay, ease: 'easeIn' }}
        />
      ))}
      <Landscape theme={theme} />
    </>
  );
}

function SnowyScene({ theme }: { theme: WeatherTheme }) {
  const flakes = Array.from({ length: 13 }, (_, i) => ({
    x: 82 + ((i * 17) % 130),
    r: 1.6 + (i % 3) * 0.45,
    delay: (i % 6) * 0.28,
  }));

  return (
    <>
      <circle cx="160" cy="58" r="48" fill={theme.haze} />
      <CloudShape x={146} y={42} scale={0.95} fill="#DCEBFA" opacity={0.96} />
      {flakes.map((flake, index) => (
        <motion.circle
          key={index}
          cx={flake.x}
          r={flake.r}
          fill="#FFFFFF"
          animate={{ cy: [72, 134], opacity: [0, 1, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: flake.delay, ease: 'linear' }}
        />
      ))}
      <Landscape theme={theme} />
    </>
  );
}

function WindyScene({ theme }: { theme: WeatherTheme }) {
  const gusts = [
    { y: 46, width: 70, delay: 0 },
    { y: 66, width: 54, delay: 0.35 },
    { y: 86, width: 78, delay: 0.7 },
  ];

  return (
    <>
      <circle cx="160" cy="58" r="46" fill={theme.haze} />
      <CloudShape x={175} y={42} scale={0.68} fill="#FFFFFF" opacity={0.72} />
      {gusts.map((gust, index) => (
        <motion.path
          key={index}
          d={`M82 ${gust.y} C104 ${gust.y - 10}, 121 ${gust.y + 10}, ${82 + gust.width} ${gust.y}`}
          stroke={theme.ink}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 0.85, 0], x: [0, 18] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: gust.delay, ease: 'easeInOut' }}
        />
      ))}
      <Landscape theme={theme} />
    </>
  );
}

const SCENES: Record<Condition, (props: { theme: WeatherTheme }) => React.ReactElement> = {
  sunny: SunnyScene,
  cloudy: CloudyScene,
  rainy: RainyScene,
  snowy: SnowyScene,
  windy: WindyScene,
};

const ICONS: Record<Condition, React.ReactElement> = {
  sunny: <Sun size={18} />,
  cloudy: <Cloud size={18} />,
  rainy: <CloudRain size={18} />,
  snowy: <CloudSnow size={18} />,
  windy: <Wind size={18} />,
};

export function WeatherWidget({ compact }: WeatherWidgetProps) {
  const { weather, loading } = useWeather();

  if (!weather && loading) {
    return (
      <div className="relative overflow-hidden rounded-[22px] border bg-[var(--color-surface,#fff)]" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="text-text-muted animate-spin" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const condition = normalizeCondition(weather.condition);
  const theme = THEME[condition];
  const Scene = SCENES[condition];

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (compact) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-[24px] border"
        style={{
          background: 'var(--color-surface, #fff)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 18px 36px -28px rgba(15, 23, 42, 0.38), 0 1px 2px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div className="relative overflow-hidden px-3 pb-2 pt-3" style={{ background: theme.card }}>
          {/* Decorative glow */}
          <div
            className="absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl"
            style={{ background: theme.glow, opacity: 0.2 }}
          />

          {/* Top row: location + live badge */}
          <div className="relative z-10 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={{ background: 'rgba(255,255,255,0.72)', color: theme.ink }}
              >
                <MapPin size={13} fill={theme.ink} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black leading-tight text-text-primary">
                  {weather.location}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-text-muted">
                  Today - {dateLabel}
                </p>
              </div>
            </div>

            <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/70 bg-white/65 px-2 py-1 shadow-sm backdrop-blur">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <span className="text-[10px] font-black text-emerald-600">Live</span>
            </div>
          </div>

          {/* Content row: temp + details on left, SVG scene on right */}
          <div className="relative z-10 mt-2 flex items-end justify-between gap-2">
            <div className="max-w-[60%]">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-[28px] font-black leading-none tracking-tight text-text-primary"
                style={{ textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}
              >
                {weather.temp}°
              </motion.p>

              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-xl"
                  style={{ color: theme.ink, background: 'rgba(255,255,255,0.58)' }}
                >
                  {ICONS[condition]}
                </span>
                <p className="text-xs font-black leading-tight text-text-primary">{theme.label}</p>
                <span className="text-[10px] font-medium text-text-muted hidden xs:inline">· {theme.blurb}</span>
              </div>

              <div
                className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 shadow-sm"
                style={{ background: 'rgba(255,255,255,0.62)', color: theme.softInk }}
              >
                <Thermometer size={11} />
                <span className="text-[10px] font-black">Feels {weather.feelsLike}°</span>
              </div>
            </div>

            {/* SVG scene - smaller in compact mode */}
            <svg
              viewBox="0 0 240 150"
              className="pointer-events-none h-[90px] w-[140px] shrink-0"
              preserveAspectRatio="xMidYMax meet"
              aria-hidden="true"
            >
              <Scene theme={theme} />
            </svg>
          </div>
        </div>

        {/* Bottom stats row - compact */}
        <div className="grid grid-cols-4 border-t bg-[var(--color-surface)]" style={{ borderColor: 'var(--color-border)' }}>
          <CompactStat icon={<TrendingUp size={11} />} bg="#FEE2E2" color="#EF4444" label="High" value={`${weather.high}°`} />
          <CompactStat icon={<TrendingDown size={11} />} bg="#DBEAFE" color="#2563EB" label="Low" value={`${weather.low}°`} />
          <CompactStat icon={<Droplet size={11} />} bg="#EDE9FE" color="#7C3AED" label="Humidity" value={`${weather.humidity}%`} />
          <CompactStat icon={<Wind size={11} />} bg="#CCFBF1" color="#0D9488" label="Wind" value={`${weather.windSpeed} km/h`} />
        </div>
      </div>
    );
  }

  // --- Original full-size layout ---
  return (
    <div
      className="relative w-full overflow-hidden rounded-[24px] border"
      style={{
        background: 'var(--color-surface, #fff)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 18px 36px -28px rgba(15, 23, 42, 0.38), 0 1px 2px rgba(15, 23, 42, 0.05)',
      }}
    >
      <div className="relative min-h-[218px] overflow-hidden px-4 pb-4 pt-4" style={{ background: theme.card }}>
        <div
          className="absolute -right-12 -top-14 h-40 w-40 rounded-full blur-3xl"
          style={{ background: theme.glow, opacity: 0.22 }}
        />
        <div
          className="absolute right-0 bottom-0 h-28 w-40 rounded-tl-full"
          style={{ background: theme.haze }}
        />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm"
              style={{ background: 'rgba(255,255,255,0.72)', color: theme.ink }}
            >
              <MapPin size={18} fill={theme.ink} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-tight text-text-primary">
                {weather.location}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-text-muted">
                Today - {dateLabel}
              </p>
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/70 bg-white/65 px-2.5 py-1.5 shadow-sm backdrop-blur">
            <motion.span
              className="h-2 w-2 rounded-full bg-emerald-500"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <span className="text-xs font-black text-emerald-600">Live</span>
          </div>
        </div>

        <svg
          viewBox="0 0 240 150"
          className="pointer-events-none absolute bottom-0 right-0 h-[150px] w-[240px]"
          preserveAspectRatio="xMidYMax meet"
          aria-hidden="true"
        >
          <Scene theme={theme} />
        </svg>

        <div className="relative z-10 mt-9 max-w-[58%]">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-[56px] font-black leading-none tracking-tight text-text-primary"
            style={{ textShadow: '0 2px 0 rgba(255,255,255,0.35)' }}
          >
            {weather.temp}°
          </motion.p>

          <div className="mt-3 inline-flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-2xl"
              style={{ color: theme.ink, background: 'rgba(255,255,255,0.58)' }}
            >
              {ICONS[condition]}
            </span>
            <div>
              <p className="text-base font-black leading-tight text-text-primary">{theme.label}</p>
              <p className="mt-0.5 text-xs font-medium leading-snug text-text-muted">{theme.blurb}</p>
            </div>
          </div>

          <div
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm"
            style={{ background: 'rgba(255,255,255,0.62)', color: theme.softInk }}
          >
            <Thermometer size={14} />
            <span className="text-xs font-black">Feels like {weather.feelsLike}°</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t bg-[var(--color-surface)]" style={{ borderColor: 'var(--color-border)' }}>
        <Stat icon={<TrendingUp size={14} />} bg="#FEE2E2" color="#EF4444" label="High" value={`${weather.high}°`} />
        <Stat icon={<TrendingDown size={14} />} bg="#DBEAFE" color="#2563EB" label="Low" value={`${weather.low}°`} />
        <Stat icon={<Droplet size={14} />} bg="#EDE9FE" color="#7C3AED" label="Humidity" value={`${weather.humidity}%`} />
        <Stat icon={<Wind size={14} />} bg="#CCFBF1" color="#0D9488" label="Wind" value={`${weather.windSpeed} km/h`} />
      </div>
    </div>
  );
}

function Stat({
  icon,
  bg,
  color,
  label,
  value,
}: {
  icon: React.ReactElement;
  bg: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-1.5 py-3 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: bg, color }}>
        {icon}
      </div>
      <p className="text-[10px] font-bold leading-none text-text-muted">{label}</p>
      <p className="max-w-full truncate text-[12px] font-black leading-none text-text-primary">{value}</p>
    </div>
  );
}

function CompactStat({
  icon,
  bg,
  color,
  label,
  value,
}: {
  icon: React.ReactElement;
  bg: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-center">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: bg, color }}>
        {icon}
      </div>
      <p className="text-[9px] font-bold leading-none text-text-muted">{label}</p>
      <p className="max-w-full truncate text-[11px] font-black leading-none text-text-primary">{value}</p>
    </div>
  );
}
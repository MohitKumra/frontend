import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Trophy, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePageVariants } from '../../lib/motionVariants';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useDarkMode } from '../../hooks/useDarkMode';

interface HabitHeroProps {
  userName: string;
  greeting: string;
  dailyProgress: number;
  completedToday: number;
  totalHabits: number;
  streakDays: number;
  xpEarned: number;
  activeStreaks: number;
  successRate: number;
  onCreateHabit: () => void;
}

interface StatCardProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string | number;
  suffix: string;
  trend?: string;
  delay?: number;
}

function FloatingStatCard({ icon, iconColor, label, value, suffix, trend, delay = 0 }: StatCardProps) {
  const { itemVariants } = usePageVariants();
  return (
    <motion.div
      variants={itemVariants}
      custom={delay}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden p-3 sm:p-4 rounded-2xl"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        minHeight: '85px',
      }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{
          background: `radial-gradient(circle at top right, ${iconColor}08, transparent 70%)`,
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${iconColor}15`, color: iconColor }}
          >
            {icon}
          </div>
          {trend && (
            <span
              className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full"
              style={{
                background: `${iconColor}12`,
                color: iconColor,
              }}
            >
              {trend}
            </span>
          )}
        </div>

        <p className="text-[24px] sm:text-[28px] md:text-[32px] font-black text-text-primary leading-none tracking-tight mb-1">
          {value}
        </p>
        <p className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] mb-0.5">{label}</p>
        <p className="text-[10px] sm:text-xs font-medium text-text-secondary truncate">{suffix}</p>
      </div>
    </motion.div>
  );
}

// ─── Mobile hero (< md) ───────────────────────────────────────────────────────

function HabitHeroMobile({
  greeting,
  streakDays,
  xpEarned,
  successRate,
  activeStreaks,
  onCreateHabit,
}: HabitHeroProps) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const [activeTab, setActiveTab] = React.useState<'overview' | 'myhabits' | 'insights'>('overview');
  const isDark = useDarkMode();

  // ── Illustrated banner palette (light/dark aware) ────────────────────────────
  const banner = {
    bg: isDark
      ? 'linear-gradient(135deg,#202a47 0%,#1c2542 60%,#18213a 100%)'
      : 'linear-gradient(135deg,#f5f3ff 0%,#ede9ff 60%,#e8f5f0 100%)',
    glow: isDark
      ? 'radial-gradient(ellipse 60% 80% at 70% 50%, rgba(113,96,246,0.18) 0%, transparent 70%)'
      : 'radial-gradient(ellipse 60% 80% at 70% 50%, rgba(231,227,255,0.7) 0%, transparent 70%)',
    pillBg: isDark ? 'rgba(113,96,246,0.18)' : 'rgba(113,96,246,0.12)',
    pillColor: isDark ? '#a78bfa' : '#6554f4',
    title: isDark ? '#f1f5fb' : '#1a1640',
    titleAccent: isDark ? '#a78bfa' : '#6355f5',
    subtitle: isDark ? 'rgba(226,232,248,0.6)' : 'rgba(40,36,80,0.55)',
  };

  const uid = React.useId().replace(/:/g, '');

  // SVG illustration palette for 3D Pot, Plant, Badges and Lighting
  const svg = {
    glow0: isDark ? '#384370' : '#E0DBFF',
    glow1: isDark ? '#1A223E' : '#F5F3FF',
    card0: isDark ? '#293352' : '#FFFFFF',
    card1: isDark ? '#222B45' : '#F8F7FF',
    cardText: isDark ? '#E8EDF7' : '#273049',
    cardShadow: isDark ? '#080C1A' : '#6355F5',
    cardShadowOpacity: isDark ? 0.4 : 0.14,
    potShadowFlood: isDark ? '#060914' : '#4B3D8F',
    potShadowOpacity: isDark ? 0.45 : 0.16,
    // 3D Pot Ceramic Body Stops:
    potStop0: isDark ? '#222B43' : '#D8D1EB',
    potStop14: isDark ? '#354266' : '#EFEBF8',
    potStop28: isDark ? '#556699' : '#FFFFFF',
    potStop46: isDark ? '#3C4B75' : '#F6F3FC',
    potStop72: isDark ? '#252F4A' : '#E2DAF2',
    potStop90: isDark ? '#171F34' : '#CAC0E5',
    potStop100: isDark ? '#242E49' : '#DDD5EE',
    // 3D Rim Collar Stops:
    rimStop0: isDark ? '#232C46' : '#D5CDE8',
    rimStop14: isDark ? '#37456C' : '#EDE8F7',
    rimStop30: isDark ? '#55679A' : '#FFFFFF',
    rimStop55: isDark ? '#3B4972' : '#F5F2FB',
    rimStop80: isDark ? '#252F4B' : '#DAD1ED',
    rimStop94: isDark ? '#182035' : '#C8BEDE',
    rimStop100: isDark ? '#27324E' : '#DCD4EE',
    // 3D Rim Top Bevel Stops:
    rimTop0: isDark ? '#3F4D77' : '#FAF8FF',
    rimTop35: isDark ? '#6476A8' : '#FFFFFF',
    rimTop70: isDark ? '#3A476F' : '#EDE8F7',
    rimTop100: isDark ? '#252F4C' : '#D6CEEA',
    rimBevelLine: isDark ? '#1D2439' : '#D0C6E6',
    // Pot Base Ring Stops:
    baseStop0: isDark ? '#171E33' : '#BDB3D9',
    baseStop30: isDark ? '#303C61' : '#E2DBF3',
    baseStop75: isDark ? '#151A2C' : '#B8ADC9',
    baseStop100: isDark ? '#1C233B' : '#C9BFE0',
    // Cavity & Soil:
    cavity0: isDark ? '#0B0704' : '#1E140C',
    cavity50: isDark ? '#19100A' : '#2E1E13',
    cavity100: isDark ? '#281A11' : '#432C1D',
    soil0: isDark ? '#442D1E' : '#5C3D28',
    soil45: isDark ? '#2E1E13' : '#432C1D',
    soil85: isDark ? '#1C120B' : '#2A1B12',
    soil100: isDark ? '#100A06' : '#1C110A',
    soilPebbleA: isDark ? '#5A3A26' : '#75523B',
    soilPebbleB: isDark ? '#6B462F' : '#846046',
    soilPerlite: isDark ? '#9C9286' : '#E8E3DA',
    rimShadowColor: isDark ? '#0A0E1A' : '#302454',
    rimShadowOpacity: isDark ? 0.45 : 0.28,
    // Ceramic Relief Plaque:
    badgeBg0: isDark ? '#2A3452' : '#FFFFFF',
    badgeBg1: isDark ? '#181E31' : '#EDE8F8',
    badgeDrop: isDark ? '#131929' : '#E2DCF2',
    badgeBorder: isDark ? '#374468' : '#E6E0F5',
    badgeTextA: isDark ? '#C0CCE6' : '#6B6282',
    badgeTextB: isDark ? '#A78BFA' : '#6355F5',
    // Ground shadows:
    groundColor: isDark ? '#0A0E1C' : '#4C3D88',
    contactColor: isDark ? '#04060C' : '#281F4C',
    // Stat Chips:
    chipFocus: isDark ? '#3a2a5e' : '#EFECFF',
    chipHealthier: isDark ? '#3a2226' : '#FFF0F3',
    chipEnergy: isDark ? '#3a3022' : '#FFF4D9',
    chipHappier: isDark ? '#1f3329' : '#E9FAF4',
  };

  const stats = [
    {
      icon: <Flame size={20} style={{ color: '#ff6b35' }} />,
      value: streakDays,
      label: 'Day Streak',
      sub: streakDays === 0 ? 'Start today!' : 'Keep it up!',
      bg: 'rgba(255,107,53,0.08)',
      border: 'rgba(255,107,53,0.18)',
    },
    {
      icon: <Zap size={20} style={{ color: '#f5b72d' }} />,
      value: xpEarned,
      label: 'Total XP',
      sub: "You're growing!",
      bg: 'rgba(245,183,45,0.08)',
      border: 'rgba(245,183,45,0.18)',
    },
    {
      icon: (
        // target / consistency icon
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#43c79a" strokeWidth="2" />
          <circle cx="12" cy="12" r="5" stroke="#43c79a" strokeWidth="2" />
          <circle cx="12" cy="12" r="2" fill="#43c79a" />
        </svg>
      ),
      value: `${successRate}%`,
      label: 'Consistency',
      sub: 'Keep it steady!',
      bg: 'rgba(67,199,154,0.08)',
      border: 'rgba(67,199,154,0.18)',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="2" stroke="#7160f6" strokeWidth="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" stroke="#7160f6" strokeWidth="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" stroke="#7160f6" strokeWidth="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" stroke="#7160f6" strokeWidth="2" />
        </svg>
      ),
      value: activeStreaks,
      label: 'Active Habits',
      sub: activeStreaks === 0 ? 'Add your first!' : 'Going strong',
      bg: 'rgba(113,96,246,0.08)',
      border: 'rgba(113,96,246,0.18)',
    },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* ── Illustrated banner ── */}
      <div
        className="relative w-full"
        style={{
          background: banner.bg,
          minHeight: 196,
        }}
      >
        {/* Soft radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: banner.glow,
          }}
          aria-hidden="true"
        />

        {/* Content row */}
        <div className="relative z-10 flex items-start justify-between px-4 pt-5 pb-2 gap-2">
          {/* Left: text + CTA */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
            <div
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest w-fit"
              style={{ background: banner.pillBg, color: banner.pillColor }}
            >
              {timeGreeting}
            </div>

            <h1 className="text-[20px] font-black leading-tight" style={{ color: banner.title }}>
              Small habits.<br />
              <span style={{ color: banner.titleAccent }}>A better you.</span>
            </h1>

            <p className="text-[11px] leading-snug" style={{ color: banner.subtitle }}>
              Consistency today creates<br />the life you want tomorrow.
            </p>

            <button
              onClick={onCreateHabit}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 w-fit mt-1"
              style={{
                background: 'linear-gradient(135deg,#7160f5,#8b7bff)',
                boxShadow: '0 4px 12px rgba(113,96,245,0.30)',
              }}
            >
              <Plus size={13} /> New Habit
            </button>
          </div>

          {/* Right: illustration SVG — full viewBox, no clipping */}
          <div className="shrink-0" style={{ width: 148, height: 190, marginTop: -4 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="248"
              height="190"
              viewBox="90 0 240 190"
              fill="none"
              aria-hidden="true"
              overflow="visible"
            >
              <defs>
                {/* Radial ambient background glow */}
                <radialGradient id={`hh-glow-${uid}`} cx="147" cy="110" r="85" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.glow0} stopOpacity="0.8" />
                  <stop offset="60%" stopColor={svg.glow1} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={svg.glow1} stopOpacity="0" />
                </radialGradient>

                {/* Card shadow */}
                <filter id={`hh-card-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="180%">
                  <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor={svg.cardShadow} floodOpacity={svg.cardShadowOpacity} />
                </filter>

                {/* Deep 3D Pot Shadow */}
                <filter id={`hh-pot-shadow-${uid}`} x="-40%" y="-20%" width="180%" height="160%">
                  <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor={svg.potShadowFlood} floodOpacity={svg.potShadowOpacity} />
                </filter>

                {/* Ground Contact Shadow */}
                <radialGradient id={`hh-ground-radial-${uid}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={svg.groundColor} stopOpacity={isDark ? 0.55 : 0.22} />
                  <stop offset="50%" stopColor={svg.groundColor} stopOpacity={isDark ? 0.3 : 0.12} />
                  <stop offset="100%" stopColor={svg.groundColor} stopOpacity="0" />
                </radialGradient>

                {/* Pot 3D Cylindrical Shader */}
                <linearGradient id={`hh-pot-body-${uid}`} x1="116" y1="147" x2="178" y2="147" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.potStop0} />
                  <stop offset="14%" stopColor={svg.potStop14} />
                  <stop offset="28%" stopColor={svg.potStop28} />
                  <stop offset="46%" stopColor={svg.potStop46} />
                  <stop offset="72%" stopColor={svg.potStop72} />
                  <stop offset="90%" stopColor={svg.potStop90} />
                  <stop offset="100%" stopColor={svg.potStop100} />
                </linearGradient>

                {/* Specular Gloss Streak */}
                <linearGradient id={`hh-pot-gloss-${uid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={isDark ? '#8DA2DC' : '#FFFFFF'} stopOpacity="0" />
                  <stop offset="50%" stopColor={isDark ? '#BDCEFF' : '#FFFFFF'} stopOpacity={isDark ? 0.6 : 0.75} />
                  <stop offset="100%" stopColor={isDark ? '#8DA2DC' : '#FFFFFF'} stopOpacity="0" />
                </linearGradient>

                {/* Pot Base Ring / Footing */}
                <linearGradient id={`hh-pot-base-${uid}`} x1="124" y1="168" x2="170" y2="168" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.baseStop0} />
                  <stop offset="30%" stopColor={svg.baseStop30} />
                  <stop offset="75%" stopColor={svg.baseStop75} />
                  <stop offset="100%" stopColor={svg.baseStop100} />
                </linearGradient>

                {/* Pot Rim Collar Front Face */}
                <linearGradient id={`hh-rim-front-${uid}`} x1="112" y1="124" x2="182" y2="124" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.rimStop0} />
                  <stop offset="14%" stopColor={svg.rimStop14} />
                  <stop offset="30%" stopColor={svg.rimStop30} />
                  <stop offset="55%" stopColor={svg.rimStop55} />
                  <stop offset="80%" stopColor={svg.rimStop80} />
                  <stop offset="94%" stopColor={svg.rimStop94} />
                  <stop offset="100%" stopColor={svg.rimStop100} />
                </linearGradient>

                {/* Pot Rim Top Bevel */}
                <linearGradient id={`hh-rim-top-${uid}`} x1="115" y1="117" x2="179" y2="125" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.rimTop0} />
                  <stop offset="35%" stopColor={svg.rimTop35} />
                  <stop offset="70%" stopColor={svg.rimTop70} />
                  <stop offset="100%" stopColor={svg.rimTop100} />
                </linearGradient>

                {/* Inner Cavity Ambient Shadow */}
                <linearGradient id={`hh-cavity-${uid}`} x1="147" y1="118" x2="147" y2="125" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.cavity0} />
                  <stop offset="50%" stopColor={svg.cavity50} />
                  <stop offset="100%" stopColor={svg.cavity100} />
                </linearGradient>

                {/* Soil 3D Mound Surface */}
                <radialGradient id={`hh-soil-${uid}`} cx="147" cy="122.5" r="28" fx="144" fy="121.5" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.soil0} />
                  <stop offset="45%" stopColor={svg.soil45} />
                  <stop offset="85%" stopColor={svg.soil85} />
                  <stop offset="100%" stopColor={svg.soil100} />
                </radialGradient>

                {/* Rim Cast Shadow onto Body */}
                <linearGradient id={`hh-rim-shadow-${uid}`} x1="147" y1="127.5" x2="147" y2="134" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.rimShadowColor} stopOpacity={svg.rimShadowOpacity} />
                  <stop offset="50%" stopColor={svg.rimShadowColor} stopOpacity={svg.rimShadowOpacity * 0.4} />
                  <stop offset="100%" stopColor={svg.rimShadowColor} stopOpacity="0" />
                </linearGradient>

                {/* 3D Plant Main Stem Gradient */}
                <linearGradient id={`hh-stem-grad-${uid}`} x1="145" y1="120" x2="153" y2="70" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#259B67" />
                  <stop offset="40%" stopColor="#38B983" />
                  <stop offset="80%" stopColor="#4EDAA0" />
                  <stop offset="100%" stopColor="#6EE7B3" />
                </linearGradient>

                {/* 3D Leaf Lit Side */}
                <linearGradient id={`hh-leaf-lit-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#67F0B6" />
                  <stop offset="50%" stopColor="#38D893" />
                  <stop offset="100%" stopColor="#24B375" />
                </linearGradient>

                {/* 3D Leaf Shaded Side */}
                <linearGradient id={`hh-leaf-shade-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22A46C" />
                  <stop offset="60%" stopColor="#177D51" />
                  <stop offset="100%" stopColor="#10603D" />
                </linearGradient>

                {/* Young Sprout Crown Gradient */}
                <linearGradient id={`hh-sprout-grad-${uid}`} x1="0%" y1="100%" x2="50%" y2="0%">
                  <stop offset="0%" stopColor="#38D893" />
                  <stop offset="60%" stopColor="#7DF39E" />
                  <stop offset="100%" stopColor="#C4FFA8" />
                </linearGradient>

                {/* Ceramic Badge Gradient */}
                <linearGradient id={`hh-badge-${uid}`} x1="127" y1="140" x2="167" y2="162" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={svg.badgeBg0} />
                  <stop offset="100%" stopColor={svg.badgeBg1} />
                </linearGradient>

                {/* Badge Gold/Metallic Accent */}
                <linearGradient id={`hh-gold-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>

                {/* Dewdrop Gradient */}
                <radialGradient id={`hh-dewdrop-${uid}`} cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="35%" stopColor="#A4F9D4" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#1E9B66" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0B5634" stopOpacity="0.7" />
                </radialGradient>
              </defs>

              {/* Background Ambient Glow */}
              <circle cx="147" cy="105" r="92" fill={`url(#hh-glow-${uid})`} />

              {/* Better Focus card */}
              <g transform="rotate(-7 124 24)" filter={`url(#hh-card-shadow-${uid})`}>
                <rect x="112" y="11" width="63" height="32" rx="9" fill={svg.card0} />
                <circle cx="126" cy="27" r="7" fill={svg.chipFocus} />
                <circle cx="126" cy="27" r="4" stroke={isDark ? '#9A8EFF' : '#7160F6'} strokeWidth="1.5" />
                <circle cx="126" cy="27" r="1.5" fill={isDark ? '#9A8EFF' : '#7160F6'} />
                <text x="138" y="25" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>Better</text>
                <text x="138" y="34" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>Focus</text>
              </g>

              {/* Healthier You card */}
              <g transform="rotate(6 187 28)" filter={`url(#hh-card-shadow-${uid})`}>
                <rect x="166" y="12" width="62" height="34" rx="9" fill={svg.card0} />
                <circle cx="179" cy="29" r="7" fill={svg.chipHealthier} />
                <path d="M179 34 C175 31 175 28 175 27 C175 24.5 178 24 179 26 C180 24 183 24.5 183 27 C183 29 182 31 179 34Z" fill={isDark ? '#F47291' : '#F26486'} />
                <text x="191" y="27" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>Healthier</text>
                <text x="191" y="36" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>You</text>
              </g>

              {/* More Energy card */}
              <g transform="rotate(-5 82 73)" filter={`url(#hh-card-shadow-${uid})`}>
                <rect x="51" y="58" width="64" height="34" rx="9" fill={svg.card0} />
                <circle cx="65" cy="75" r="7" fill={svg.chipEnergy} />
                <path d="M67 68L62 76H66L64 82L70 73H66L67 68Z" fill="#F5B72D" />
                <text x="77" y="73" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>More</text>
                <text x="77" y="82" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>Energy</text>
              </g>

              {/* Happier Days card */}
              <g transform="rotate(-3 188 79)" filter={`url(#hh-card-shadow-${uid})`}>
                <rect x="166" y="62" width="62" height="35" rx="9" fill={svg.card0} />
                <circle cx="180" cy="79" r="7" fill={svg.chipHappier} />
                <circle cx="180" cy="79" r="4.5" stroke={isDark ? '#4ADE80' : '#43C79A'} strokeWidth="1.4" />
                <circle cx="178.5" cy="77.5" r=".8" fill={isDark ? '#4ADE80' : '#43C79A'} />
                <circle cx="181.5" cy="77.5" r=".8" fill={isDark ? '#4ADE80' : '#43C79A'} />
                <path d="M178 81C179 82 181 82 182 81" stroke={isDark ? '#4ADE80' : '#43C79A'} strokeWidth="1" strokeLinecap="round" />
                <text x="192" y="77" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>Happier</text>
                <text x="192" y="86" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill={svg.cardText}>Days</text>
              </g>

              {/* ==================== 3D GROUND & CONTACT SHADOWS ==================== */}
              {/* Wide Soft Ambient Floor Shadow */}
              <ellipse cx="147" cy="173.5" rx="52" ry="8.5" fill={`url(#hh-ground-radial-${uid})`} />
              {/* Medium Occlusion Floor Shadow */}
              <ellipse cx="147" cy="172" rx="34" ry="5" fill={svg.groundColor} opacity={isDark ? 0.5 : 0.22} />
              {/* Tight Deep Contact Base Occlusion */}
              <ellipse cx="147" cy="170.8" rx="22" ry="3.2" fill={svg.contactColor} opacity={isDark ? 0.75 : 0.45} />

              {/* ==================== 3D POT STRUCTURE ==================== */}
              <g filter={`url(#hh-pot-shadow-${uid})`}>
                {/* Pot Footing / Base Pedestal (Beveled recessed bottom) */}
                <path
                  d="M 124 167 C 124 169.5 134 170.8 147 170.8 C 160 170.8 170 169.5 170 167 L 169 164.5 C 158 165.8 136 165.8 125 164.5 Z"
                  fill={`url(#hh-pot-base-${uid})`}
                />

                {/* Pot Main 3D Ceramic Body (Smooth tapered curvilinear cylinder) */}
                <path
                  d="M 115 127
                     C 115.5 140 119.5 156 124 166.5
                     C 127.5 169.2 139 170.2 147 170.2
                     C 155 170.2 166.5 169.2 170 166.5
                     C 174.5 156 178.5 140 179 127
                     Z"
                  fill={`url(#hh-pot-body-${uid})`}
                />

                {/* 3D Specular Highlight Streak on Ceramic Body */}
                <path
                  d="M 124 128
                     C 123 140 125.5 154 128.5 163
                     C 131 163 132.5 154 130 128
                     Z"
                  fill={`url(#hh-pot-gloss-${uid})`}
                  opacity={isDark ? 0.9 : 0.85}
                />

                {/* Subtle Bounce Backlight along Right Silhouette */}
                <path
                  d="M 177.5 129
                     C 177 141 174.5 154 170 164"
                  stroke={isDark ? '#657CAE' : '#FFFFFF'}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity={isDark ? 0.4 : 0.5}
                />

                {/* Rim Cast Ambient Shadow onto Body */}
                <path
                  d="M 115 127
                     C 128 131.8 166 131.8 179 127
                     L 178 131.5
                     C 165 136 129 136 116 131.5
                     Z"
                  fill={`url(#hh-rim-shadow-${uid})`}
                />

                {/* 3D Rim Collar Face (Thick rounded rim ring) */}
                <path
                  d="M 112 122.5
                     C 112 121 113.8 120.5 116 120.5
                     H 178
                     C 180.2 120.5 182 121 182 122.5
                     L 181 126.2
                     C 180.5 127.8 178.5 128.2 176 128.4
                     C 163 129.6 131 129.6 118 128.4
                     C 115.5 128.2 113.5 127.8 113 126.2
                     Z"
                  fill={`url(#hh-rim-front-${uid})`}
                />

                {/* Rim Collar Bottom Thickness Highlight / Bevel Line */}
                <path
                  d="M 115 127 C 130 129.2 164 129.2 179 127"
                  stroke={svg.rimBevelLine}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* 3D Top Rim Beveled Surface (Upper annular ring catching light) */}
                <ellipse cx="147" cy="121.2" rx="34" ry="5.8" fill={`url(#hh-rim-top-${uid})`} />

                {/* Inner Pot Cavity (Dark interior depth) */}
                <ellipse cx="147" cy="121.8" rx="29" ry="4.7" fill={`url(#hh-cavity-${uid})`} />

                {/* 3D Soil Surface (Nutrient-rich textured loam mound) */}
                <ellipse cx="147" cy="122.6" rx="28.2" ry="4.4" fill={`url(#hh-soil-${uid})`} />

                {/* Soil Micro-detail: organic soil pebbles & perlite highlights */}
                <ellipse cx="136" cy="123.2" rx="1.6" ry="0.8" fill={svg.soilPebbleA} opacity={0.85} />
                <ellipse cx="158" cy="122.8" rx="1.4" ry="0.7" fill={svg.soilPebbleB} opacity={0.8} />
                <ellipse cx="143" cy="124.1" rx="1.3" ry="0.6" fill={svg.soilPebbleA} opacity={0.75} />
                <ellipse cx="151" cy="123.6" rx="1.5" ry="0.7" fill={svg.soilPebbleB} opacity={0.85} />
                <circle cx="132.5" cy="122.8" r="0.6" fill={svg.soilPerlite} opacity={0.7} />
                <circle cx="162" cy="123.1" r="0.5" fill={svg.soilPerlite} opacity={0.6} />
                <circle cx="146.5" cy="124.3" r="0.6" fill={svg.soilPerlite} opacity={0.65} />
              </g>

              {/* ==================== 3D LUXURY CERAMIC EMBLEM ==================== */}
              {/* Sculpted 3D Relief Plaque on Pot Face */}
              <g transform="translate(0, 0)">
                {/* Plaque Drop Shadow & Outer Bevel */}
                <rect x="127" y="139" width="40" height="23" rx="5.5" fill={svg.badgeDrop} opacity={0.9} />
                {/* Plaque Surface */}
                <rect x="127.5" y="138.5" width="39" height="22" rx="5" fill={`url(#hh-badge-${uid})`} />
                {/* Plaque Inner Fine Border */}
                <rect x="128.5" y="139.5" width="37" height="20" rx="4" fill="none" stroke={svg.badgeBorder} strokeWidth="0.7" />

                {/* Tiny Golden Botanical Sprout Emblem */}
                <path d="M147 141.2 C145.4 139.6 143.2 140 143.2 141.6 C144.5 142.1 146.2 141.7 147 141.2 Z" fill={`url(#hh-gold-grad-${uid})`} />
                <path d="M147 141.2 C148.6 139.6 150.8 140 150.8 141.6 C149.5 142.1 147.8 141.7 147 141.2 Z" fill={`url(#hh-gold-grad-${uid})`} />
                <path d="M147 141.2 V143.2" stroke={`url(#hh-gold-grad-${uid})`} strokeWidth="0.7" strokeLinecap="round" />

                {/* 3D Typography */}
                <text x="147" y="148" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="4.8" fontWeight="800" letterSpacing="0.8" fill={svg.badgeTextA}>GOOD HABITS</text>
                <text x="147" y="156.5" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="7.2" fontWeight="900" letterSpacing="0.6" fill={svg.badgeTextB}>GROW</text>
              </g>

              {/* ==================== 3D BOTANICAL PLANT & FOLIAGE ==================== */}
              {/* Cast shadow of plant base onto soil */}
              <ellipse cx="147" cy="122.6" rx="5" ry="1.5" fill={isDark ? '#080503' : '#140C07'} opacity={isDark ? 0.75 : 0.6} />

              {/* Main Thick 3D Organic Stem */}
              <path
                d="M 147 122.5
                   C 147 106 148.5 91 153.5 73"
                stroke={isDark ? '#1F8255' : '#27A069'}
                strokeWidth="4.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 147 122.5
                   C 147 106 148.5 91 153.5 73"
                stroke={`url(#hh-stem-grad-${uid})`}
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Stem Specular Highlight Curve */}
              <path
                d="M 146.4 118
                   C 146.5 105 148 93 152.2 76"
                stroke={isDark ? '#A3FCE4' : '#9BFAD0'}
                strokeWidth="0.9"
                strokeLinecap="round"
                opacity={isDark ? 0.85 : 0.75}
                fill="none"
              />

              {/* Secondary Stems / Leaf Petioles */}
              <path d="M 147.5 103 C 141 100 134 96 128 92" stroke={isDark ? '#259B67' : '#2AA870'} strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <path d="M 149 95 C 156 93 164 90 171 87" stroke={isDark ? '#218F5D' : '#259C66'} strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M 151 83 C 144 80 138 75 133 68" stroke={isDark ? '#269C68' : '#2CA971'} strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M 152 79 C 158 75 165 70 170 64" stroke={isDark ? '#239462' : '#27A26B'} strokeWidth="1.7" strokeLinecap="round" fill="none" />

              {/* LEAF 1: Bottom-Left Broad Leaf (Layered 3D Curvature) */}
              <g>
                {/* Shaded underside/lower half */}
                <path
                  d="M 148 103
                     C 138 104 125 101 117 91
                     C 125 87 136 90 148 98
                     Z"
                  fill={`url(#hh-leaf-shade-${uid})`}
                />
                {/* Lit upper half catching top-left sun */}
                <path
                  d="M 148 98
                     C 137 87 125 86 117 91
                     C 125 94 137 98 148 101
                     Z"
                  fill={`url(#hh-leaf-lit-${uid})`}
                />
                {/* Center Midrib Vein */}
                <path
                  d="M 148 100
                     C 137 96 126 92 117 91"
                  stroke={isDark ? '#9CFAD0' : '#8AF7C6'}
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Glossy Curved Specular Highlight Streak */}
                <path
                  d="M 144 94
                     C 136 89 127 88 120 91"
                  stroke="#FFFFFF"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  opacity={isDark ? 0.45 : 0.4}
                  fill="none"
                />
                {/* Glistening 3D Dewdrop with refraction */}
                <ellipse cx="127.2" cy="92.4" rx="2.2" ry="1.7" fill={isDark ? '#082E1B' : '#0C4529'} opacity={isDark ? 0.5 : 0.35} />
                <ellipse cx="127" cy="92" rx="2.3" ry="1.8" fill={`url(#hh-dewdrop-${uid})`} />
                <circle cx="126.2" cy="91.3" r="0.6" fill="#FFFFFF" />
              </g>

              {/* LEAF 2: Mid-Right Arching Leaf */}
              <g>
                {/* Lower half in shadow */}
                <path
                  d="M 149 97
                     C 159 100 172 98 181 87
                     C 173 83 162 85 149 92
                     Z"
                  fill={`url(#hh-leaf-shade-${uid})`}
                />
                {/* Upper half catching direct light */}
                <path
                  d="M 149 92
                     C 161 82 173 82 181 87
                     C 172 91 160 94 149 95
                     Z"
                  fill={`url(#hh-leaf-lit-${uid})`}
                />
                {/* Midrib Vein */}
                <path
                  d="M 149 94
                     C 161 90 172 87 181 87"
                  stroke={isDark ? '#95F6CD' : '#87F5C3'}
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Specular Highlight */}
                <path
                  d="M 153 88
                     C 163 84 172 84 178 86"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity={isDark ? 0.42 : 0.38}
                  fill="none"
                />
              </g>

              {/* LEAF 3: Upper-Left Leaf (Elevated lush foliage) */}
              <g>
                {/* Lower shaded half */}
                <path
                  d="M 151 84
                     C 142 85 132 80 126 71
                     C 133 67 142 70 151 78
                     Z"
                  fill={`url(#hh-leaf-shade-${uid})`}
                />
                {/* Upper lit half */}
                <path
                  d="M 151 78
                     C 142 68 132 66 126 71
                     C 133 74 142 78 151 81
                     Z"
                  fill={`url(#hh-leaf-lit-${uid})`}
                />
                {/* Midrib */}
                <path
                  d="M 151 80
                     C 142 76 133 72 126 71"
                  stroke={isDark ? '#A3FCD6' : '#95F9CF'}
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Highlight */}
                <path
                  d="M 147 74
                     C 140 70 133 69 128 71"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity={isDark ? 0.45 : 0.4}
                  fill="none"
                />
              </g>

              {/* LEAF 4: Top-Right Vibrant Leaf */}
              <g>
                {/* Shaded half */}
                <path
                  d="M 152 79
                     C 161 80 171 77 178 67
                     C 170 63 161 65 152 73
                     Z"
                  fill={`url(#hh-leaf-shade-${uid})`}
                />
                {/* Lit half */}
                <path
                  d="M 152 73
                     C 162 64 172 63 178 67
                     C 170 70 160 73 152 76
                     Z"
                  fill={`url(#hh-leaf-lit-${uid})`}
                />
                {/* Midrib */}
                <path
                  d="M 152 75
                     C 162 70 171 67 178 67"
                  stroke={isDark ? '#9CF9CE' : '#90F7CB'}
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Specular line */}
                <path
                  d="M 156 69
                     C 164 65 171 65 176 66"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity={isDark ? 0.4 : 0.35}
                  fill="none"
                />
              </g>

              {/* TOP SPROUT / NEW GROWTH AT CROWN */}
              <g>
                {/* Tender left baby leaf */}
                <path
                  d="M 153.5 73
                     C 150 67 146 62 147.5 56
                     C 151 58 153 65 153.5 73
                     Z"
                  fill={`url(#hh-sprout-grad-${uid})`}
                />
                {/* Tender right baby leaf unfurling */}
                <path
                  d="M 153.5 73
                     C 155 65 159 59 157 53
                     C 154 56 153 64 153.5 73
                     Z"
                  fill={`url(#hh-sprout-grad-${uid})`}
                />
                {/* Crown gold vitality glint */}
                <circle cx="154" cy="56" r="1.5" fill="#FFF490" opacity={isDark ? 0.95 : 0.85} />
              </g>

              {/* ==================== 3D MAGIC SPARKLES & PARTICLES ==================== */}
              {/* Golden Star Sparkle Top Left */}
              <g transform="translate(104, 46)">
                <path d="M0 -5 C0 -1.5 1.5 0 5 0 C1.5 0 0 1.5 0 5 C0 1.5 -1.5 0 -5 0 C-1.5 0 0 -1.5 0 -5Z" fill="#FBBF24" />
                <circle cx="0" cy="0" r="1.2" fill="#FFFFFF" />
              </g>
              {/* Violet/Cyan Star Sparkle Right */}
              <g transform="translate(198, 106)">
                <path d="M0 -4 C0 -1.2 1.2 0 4 0 C1.2 0 0 1.2 0 4 C0 1.2 -1.2 0 -4 0 C-1.2 0 0 -1.2 0 -4Z" fill={isDark ? '#A78BFA' : '#8B7CFF'} />
                <circle cx="0" cy="0" r="1" fill="#FFFFFF" />
              </g>
              {/* Tiny floaty habit energy spores */}
              <circle cx="98" cy="88" r="1.5" fill="#A78BFA" opacity="0.6" />
              <circle cx="192" cy="48" r="1.8" fill="#F472B6" opacity="0.6" />
              <circle cx="140" cy="42" r="1.2" fill="#4ADE80" opacity="0.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Stat chips row ── */}
      <div className="grid grid-cols-4 gap-2 px-3 py-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-xl py-2 px-1"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            {s.icon}
            <span className="text-sm font-black leading-none" style={{ color: 'var(--color-text-primary)' }}>
              {s.value}
            </span>
            <span className="text-[8.5px] font-semibold text-center leading-tight" style={{ color: 'var(--color-text-muted)' }}>
              {s.label}
            </span>
            <span className="text-[8px] text-center leading-tight" style={{ color: 'var(--color-text-muted)' }}>
              {s.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Entry point — conditionally renders mobile or desktop ────────────────────

export function HabitHero(props: HabitHeroProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  if (isMobile) return <HabitHeroMobile {...props} />;
  return <HabitHeroDesktop {...props} />;
}

// ─── Desktop hero (md+) — original, renamed ───────────────────────────────────

function HabitHeroDesktop({
  userName,
  greeting,
  dailyProgress,
  completedToday,
  totalHabits,
  streakDays,
  xpEarned,
  activeStreaks,
  successRate,
  onCreateHabit,
}: HabitHeroProps) {
  const { containerVariants, itemVariants } = usePageVariants();
  const gradientId = React.useId();

  // Circular progress ring math
  const radius = 105;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(dailyProgress, 0), 100);
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden p-4 sm:p-6 md:p-8 mb-6 sm:mb-8"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Background gradient blobs - symmetric, responsive sizes */}
      <div
        className="absolute top-0 right-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #6C63FF15, #8B5CF615, transparent)',
          transform: 'translate(40%, -40%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #00D9A515, #6366F115, transparent)',
          transform: 'translate(-40%, 40%)',
        }}
      />

      {/* Symmetric 3-column layout on lg, 2-column on md, stack on smaller */}
      <div className="relative flex flex-col md:flex-row lg:flex-row items-center justify-between gap-6 sm:gap-8">
        {/* Column 1: Text & CTA */}
        <div className="flex-1 flex flex-col items-start justify-center w-full lg:w-auto order-1 md:order-1">
          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm font-medium text-text-secondary mb-2 sm:mb-3 flex items-center gap-2"
          >
            {greeting}, {userName}! 👋
          </motion.p>

          <motion.h1
            variants={itemVariants}
            className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[36px] xl:text-[40px] font-black text-text-primary mb-2 sm:mb-3 leading-[1.1] tracking-[-0.03em]"
            style={{
              background: 'linear-gradient(135deg, var(--color-text-primary), var(--color-text-secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Build better habits,
            <br />
            build a better you.
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xs sm:text-sm text-text-secondary font-normal mb-4 sm:mb-6">
            {totalHabits > 0
              ? `You're doing better than ${Math.min(dailyProgress + 10, 95)}% of last week.`
              : 'Start building consistency with your first habit.'}
          </motion.p>

          <motion.div variants={itemVariants}>
            <Button
              onClick={onCreateHabit}
              leftIcon={<Plus size={16} className="sm:w-[18px] sm:h-[18px]" />}
              className="font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3"
            >
              New Habit
            </Button>
          </motion.div>
        </div>

        {/* Column 2: Circular Progress Ring (Center on lg, md order 3, sm order 2) */}
        {totalHabits > 0 && (
          <div className="flex-1 flex items-center justify-center w-full lg:w-auto order-2 md:order-2 lg:order-2">
            <motion.div
              variants={itemVariants}
              className="relative w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] md:w-[200px] md:h-[200px] lg:w-[220px] lg:h-[220px] xl:w-[240px] xl:h-[240px]"
            >
              {/* Background glow */}
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />

              <svg className="transform -rotate-90 absolute inset-0 w-full h-full" viewBox="0 0 240 240">
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>

                {/* Background circle */}
                <circle cx="120" cy="120" r="105" fill="none" stroke="var(--color-border)" strokeWidth="8" />

                {/* Progress circle */}
                <motion.circle
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))',
                  }}
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.p
                  className="text-[36px] sm:text-[40px] md:text-[44px] lg:text-[48px] xl:text-[52px] font-black text-text-primary leading-none tracking-tight"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {dailyProgress}%
                </motion.p>
                <p className="text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1 leading-tight">
                  Daily Progress
                </p>
                <p className="text-xs sm:text-sm md:text-base font-semibold text-text-secondary mt-0.5 leading-tight">
                  {completedToday} / {totalHabits} Habits
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Column 3: Stat Cards - 2x2 grid */}
        {totalHabits > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center w-full lg:w-auto order-3 md:order-3 lg:order-3">
            <motion.div variants={containerVariants} className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-[320px]">
              <motion.div variants={itemVariants} custom={0}>
                <FloatingStatCard
                  icon={<Flame size={14} className="sm:w-4 sm:h-4" />}
                  iconColor="#FF6B35"
                  label="Streak"
                  value={streakDays}
                  suffix="Day Streak"
                  trend="↑12%"
                  delay={0}
                />
              </motion.div>

              <motion.div variants={itemVariants} custom={1}>
                <FloatingStatCard
                  icon={<Zap size={14} className="sm:w-4 sm:h-4" />}
                  iconColor="#FFB800"
                  label="XP"
                  value={xpEarned}
                  suffix="Total XP"
                  delay={1}
                />
              </motion.div>

              <motion.div variants={itemVariants} custom={2}>
                <FloatingStatCard
                  icon={<TrendingUp size={14} className="sm:w-4 sm:h-4" />}
                  iconColor="#00D9A5"
                  label="Consistency"
                  value={`${successRate}%`}
                  suffix="Success"
                  delay={2}
                />
              </motion.div>

              <motion.div variants={itemVariants} custom={3}>
                <FloatingStatCard
                  icon={<Trophy size={14} className="sm:w-4 sm:h-4" />}
                  iconColor="#6C63FF"
                  label="Active"
                  value={activeStreaks}
                  suffix="Active Habits"
                  delay={3}
                />
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

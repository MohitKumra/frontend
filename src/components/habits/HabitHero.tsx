import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Trophy, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePageVariants } from '../../lib/motionVariants';
import { useMediaQuery } from '../../hooks/useMediaQuery';

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
          background: 'linear-gradient(135deg,#f5f3ff 0%,#ede9ff 60%,#e8f5f0 100%)',
          minHeight: 196,
        }}
      >
        {/* Soft radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 70% 50%, rgba(231,227,255,0.7) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        {/* Content row */}
        <div className="relative z-10 flex items-start justify-between px-4 pt-5 pb-2 gap-2">
          {/* Left: text + CTA */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
            <div
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest w-fit"
              style={{ background: 'rgba(113,96,246,0.12)', color: '#6554f4' }}
            >
              {timeGreeting}
            </div>

            <h1 className="text-[20px] font-black leading-tight" style={{ color: '#1a1640' }}>
              Small habits.<br />
              <span style={{ color: '#6355f5' }}>A better you.</span>
            </h1>

            <p className="text-[11px] leading-snug" style={{ color: 'rgba(40,36,80,0.55)' }}>
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
                <radialGradient id="hh-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(150 94) rotate(90) scale(92)">
                  <stop offset="0" stopColor="#E7E3FF"/>
                  <stop offset="1" stopColor="#F5F3FF" stopOpacity="0"/>
                </radialGradient>
                <linearGradient id="hh-purple" x1="110" y1="40" x2="170" y2="150" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8B7CFF"/><stop offset="1" stopColor="#6554F4"/>
                </linearGradient>
                <linearGradient id="hh-leaf" x1="145" y1="65" x2="190" y2="125" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#68D9AC"/><stop offset="1" stopColor="#2BB783"/>
                </linearGradient>
                <linearGradient id="hh-pot" x1="130" y1="120" x2="165" y2="165" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF"/><stop offset="1" stopColor="#F0EFF8"/>
                </linearGradient>
                <linearGradient id="hh-card" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#FFFFFF"/><stop offset="1" stopColor="#F8F7FF"/>
                </linearGradient>
                <filter id="hh-shadow" x="-50%" y="-50%" width="200%" height="220%">
                  <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#5D50D5" floodOpacity=".16"/>
                </filter>
              </defs>

              {/* Glow */}
              <circle cx="145" cy="96" r="94" fill="url(#hh-glow)"/>

              {/* Better Focus card */}
              <g transform="rotate(-7 124 24)" filter="url(#hh-shadow)">
                <rect x="112" y="11" width="63" height="32" rx="9" fill="url(#hh-card)"/>
                <circle cx="126" cy="27" r="7" fill="#EFECFF"/>
                <circle cx="126" cy="27" r="4" stroke="#7160F6" strokeWidth="1.5"/>
                <circle cx="126" cy="27" r="1.5" fill="#7160F6"/>
                <text x="138" y="25" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">Better</text>
                <text x="138" y="34" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">Focus</text>
              </g>

              {/* Healthier You card */}
              <g transform="rotate(6 187 28)" filter="url(#hh-shadow)">
                <rect x="166" y="12" width="62" height="34" rx="9" fill="url(#hh-card)"/>
                <circle cx="179" cy="29" r="7" fill="#FFF0F3"/>
                <path d="M179 34 C175 31 175 28 175 27 C175 24.5 178 24 179 26 C180 24 183 24.5 183 27 C183 29 182 31 179 34Z" fill="#F26486"/>
                <text x="191" y="27" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">Healthier</text>
                <text x="191" y="36" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">You</text>
              </g>

              {/* More Energy card */}
              <g transform="rotate(-5 82 73)" filter="url(#hh-shadow)">
                <rect x="51" y="58" width="64" height="34" rx="9" fill="url(#hh-card)"/>
                <circle cx="65" cy="75" r="7" fill="#FFF4D9"/>
                <path d="M67 68L62 76H66L64 82L70 73H66L67 68Z" fill="#F5B72D"/>
                <text x="77" y="73" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">More</text>
                <text x="77" y="82" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">Energy</text>
              </g>

              {/* Happier Days card */}
              <g transform="rotate(-3 188 79)" filter="url(#hh-shadow)">
                <rect x="166" y="62" width="62" height="35" rx="9" fill="url(#hh-card)"/>
                <circle cx="180" cy="79" r="7" fill="#E9FAF4"/>
                <circle cx="180" cy="79" r="4.5" stroke="#43C79A" strokeWidth="1.4"/>
                <circle cx="178.5" cy="77.5" r=".8" fill="#43C79A"/>
                <circle cx="181.5" cy="77.5" r=".8" fill="#43C79A"/>
                <path d="M178 81C179 82 181 82 182 81" stroke="#43C79A" strokeWidth="1" strokeLinecap="round"/>
                <text x="192" y="77" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">Happier</text>
                <text x="192" y="86" fontFamily="Inter,Arial,sans-serif" fontSize="6.5" fontWeight="700" fill="#273049">Days</text>
              </g>

              {/* Ground shadow */}
              <ellipse cx="147" cy="172" rx="52" ry="8" fill="#D8D3F5" opacity=".7"/>

              {/* Pot */}
              <g filter="url(#hh-shadow)">
                <path d="M116 121 H178 L172 159 C171 166 166 170 159 170 H136 C129 170 124 166 123 159 Z" fill="url(#hh-pot)"/>
                <path d="M113 120 H181 C184 120 185 123 183 126 L180 130 H114 L111 126 C109 123 110 120 113 120Z" fill="#F0EEF8"/>
                <ellipse cx="147" cy="121" rx="31" ry="7" fill="#805F45"/>
              </g>

              {/* Plant */}
              <path d="M147 120 C147 103 149 87 159 71" stroke="#39B98A" strokeWidth="4" strokeLinecap="round"/>
              <path d="M148 107 C139 99 134 91 133 82" stroke="#39B98A" strokeWidth="3" strokeLinecap="round"/>
              <path d="M148 107 C135 106 127 98 130 87 C141 88 148 96 148 107Z" fill="url(#hh-leaf)"/>
              <path d="M154 96 C155 79 166 69 181 70 C179 85 169 95 154 96Z" fill="url(#hh-leaf)"/>
              <path d="M157 80 C153 69 157 59 166 53 C172 64 168 75 157 80Z" fill="#75DAB5"/>
              <path d="M147 115 C138 113 134 108 135 101 C143 102 147 107 147 115Z" fill="#79DDB8"/>

              {/* Pot text */}
              <text x="147" y="143" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="7" fontWeight="800" fill="#625D73">GOOD</text>
              <text x="147" y="153" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="7" fontWeight="800" fill="#625D73">HABITS</text>
              <text x="147" y="163" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="7" fontWeight="800" fill="#6C63A1">GROW</text>

              {/* Sparkles */}
              <path d="M91 42V51 M86.5 46.5H95.5" stroke="#8374F8" strokeWidth="2" strokeLinecap="round"/>
              <path d="M207 108V116 M203 112H211" stroke="#A59AFF" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="72" cy="107" r="3" fill="#9A8EFF"/>
              <circle cx="204" cy="55" r="3" fill="#B9B1FF"/>
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

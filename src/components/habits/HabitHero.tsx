import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Trophy, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { containerVariants, itemVariants } from '../../lib/motionVariants';

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

export function HabitHero({
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden p-4 sm:p-6 md:p-8 rounded-3xl mb-6 sm:mb-8"
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
            Build better habits,<br />build a better you.
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xs sm:text-sm text-text-secondary font-normal mb-4 sm:mb-6">
            {totalHabits > 0 
              ? `You're doing better than ${Math.min(dailyProgress + 10, 95)}% of last week.`
              : 'Start building consistency with your first habit.'
            }
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
                  filter: 'blur(20px)'
                }}
              />
              
              <svg 
                className="transform -rotate-90 absolute inset-0 w-full h-full" 
                viewBox="0 0 240 240"
              >
                <defs>
                  <linearGradient id="hero-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
                
                {/* Background circle */}
                <circle
                  cx="120"
                  cy="120"
                  r="105"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="8"
                />
                
                {/* Progress circle */}
                <motion.circle
                  cx="120"
                  cy="120"
                  r="105"
                  fill="none"
                  stroke="url(#hero-progress-gradient)"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 105}`}
                  strokeDashoffset={`${2 * Math.PI * 105 * (1 - dailyProgress / 100)}`}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 2 * Math.PI * 105 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 105 * (1 - dailyProgress / 100) }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))'
                  }}
                />
              </svg>

              {/* Center text */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center text-center"
              >
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
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-[320px]"
            >
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
                  suffix="XP"
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

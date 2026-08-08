import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import type { HabitDTO } from '../../types';

interface WeekJourneyProps {
  habits: HabitDTO[];
}

export function WeekJourney({ habits }: WeekJourneyProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0

  // Calculate completion data for each day
  const dayData = days.map((_, idx) => {
    const completed = habits.filter((h) => h.weekPattern && h.weekPattern[idx]).length;
    const total = habits.length;
    const missed = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isFuture = idx > todayIdx;
    const isToday = idx === todayIdx;

    // Mock time spent (in reality would come from focus sessions)
    const timeSpent = isFuture ? 0 : Math.floor(Math.random() * 120) + 30;

    return { completed, total, missed, percentage, isFuture, isToday, timeSpent };
  });

  const getBarHeight = (percentage: number) => {
    return Math.max(percentage, 5); // Minimum 5% for visibility
  };

  const getStatusLabel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Great';
    if (percentage >= 50) return 'Good';
    if (percentage > 0) return 'Fair';
    return 'Start';
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return '#22C55E';
    if (percentage >= 75) return '#00D9A5';
    if (percentage >= 50) return '#FFB800';
    if (percentage > 0) return '#FF6B35';
    return 'var(--color-border)';
  };

  return (
    <Card variant="default" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
          <CalendarCheck2 size={18} className="text-accent" />
          Weekly Journey
        </h3>
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">This Week</span>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {days.map((day, idx) => {
          const data = dayData[idx];
          const height = getBarHeight(data.percentage);
          const color = getStatusColor(data.percentage);
          const isHovered = hoveredDay === idx;

          return (
            <div
              key={day}
              className="flex flex-col items-center gap-3"
              onMouseEnter={() => setHoveredDay(idx)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <motion.p
                className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  data.isToday ? 'text-accent' : 'text-text-muted'
                }`}
                animate={{ scale: data.isToday ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                {dayShort[idx]}
              </motion.p>

              {/* Animated vertical bar */}
              <div className="relative w-full">
                <div
                  className="h-32 rounded-xl flex items-end justify-center overflow-hidden"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <motion.div
                    className="w-full rounded-t-lg relative"
                    style={{
                      background: data.isFuture
                        ? 'var(--color-border)'
                        : `linear-gradient(180deg, ${color}, ${color}dd)`,
                      boxShadow: !data.isFuture ? `0 0 20px ${color}40` : 'none',
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{
                      duration: 0.8,
                      delay: idx * 0.1,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {/* Shine effect */}
                    {!data.isFuture && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-transparent via-white to-transparent opacity-20"
                        animate={{ y: ['-100%', '100%'] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 3,
                          delay: idx * 0.2,
                        }}
                      />
                    )}
                  </motion.div>
                </div>

                {/* Today indicator ring */}
                {data.isToday && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      border: '2px solid var(--color-accent)',
                    }}
                    animate={{
                      boxShadow: ['0 0 0 0 var(--color-accent)40', '0 0 0 4px var(--color-accent)00'],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Stats below bar */}
              <div className="text-center">
                <motion.p
                  className="text-[18px] font-black text-text-primary leading-none"
                  animate={{ opacity: isHovered ? 1 : 0.9 }}
                >
                  {data.isFuture ? '—' : `${data.completed}/${data.total}`}
                </motion.p>
                <p
                  className="text-[10px] font-bold mt-1 tracking-wide"
                  style={{ color: data.isFuture ? 'var(--color-text-muted)' : color }}
                >
                  {data.isFuture ? 'Upcoming' : getStatusLabel(data.percentage)}
                </p>
              </div>

              {/* Hover tooltip */}
              <AnimatePresence>
                {isHovered && !data.isFuture && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-10 p-3 rounded-xl shadow-xl pointer-events-none"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      top: '100%',
                      marginTop: '8px',
                      minWidth: '140px',
                    }}
                  >
                    <p className="text-[11px] font-bold text-text-primary mb-2">{day}</p>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <CheckCircle size={10} className="text-success" />
                          Completed
                        </span>
                        <span className="text-[10px] font-bold text-text-primary">{data.completed}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <XCircle size={10} className="text-danger" />
                          Missed
                        </span>
                        <span className="text-[10px] font-bold text-text-primary">{data.missed}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Clock size={10} className="text-info" />
                          Time
                        </span>
                        <span className="text-[10px] font-bold text-text-primary">{data.timeSpent}m</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

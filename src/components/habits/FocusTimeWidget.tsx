import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { useFocusSessions, computeFocusTime } from '../../features/habits/hooks/useFocusSessions';

export function FocusTimeWidget() {
  const { data, isLoading } = useFocusSessions();
  const sessions = data?.data ?? [];

  const focusData = React.useMemo(() => {
    if (sessions.length === 0) {
      return {
        todayMinutes: 0,
        hourBuckets: new Array(24).fill(0),
        hours: 0,
        minutes: 0,
      };
    }
    return computeFocusTime(sessions);
  }, [sessions]);

  const hourBuckets = focusData.hourBuckets;
  const maxMinutes = Math.max(...hourBuckets, 1);
  const currentHour = new Date().getHours();
  const goalHours = 4;
  const progressPercentage = Math.round((focusData.todayMinutes / (goalHours * 60)) * 100);

  const tickLabels = ['12AM', '3AM', '6AM', '9AM', '12PM'];

  if (isLoading) {
    return (
      <Card variant="default" className="p-5 relative overflow-hidden" style={{ borderRadius: '20px' }}>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-text-muted animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      className="p-5 relative overflow-hidden"
      style={{ borderRadius: '20px' }}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          background: 'linear-gradient(135deg, #6C63FF, transparent)',
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            Focus Time
          </h3>
        </div>

        {/* Time display */}
        <div className="mb-5">
          <motion.p
            className="text-[40px] font-black text-text-primary leading-none mb-2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
          >
            {focusData.hours}h {focusData.minutes}m
          </motion.p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-text-muted font-medium">Today</p>
            <span className="text-[10px] font-bold text-accent">
              {progressPercentage}% of {goalHours}h goal
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 rounded-full overflow-hidden mb-5" style={{ background: 'var(--color-border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-accent)' }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        </div>

        {/* Hourly bars */}
        <div className="flex items-end justify-between gap-[2px] h-20 mb-3">
          {hourBuckets.map((minutes, hour) => {
            const heightPercent = (minutes / maxMinutes) * 100;
            const isCurrent = hour === currentHour;

            return (
              <motion.div
                key={hour}
                className={`flex-1 rounded-t transition-all ${isCurrent ? 'opacity-100' : 'opacity-60'}`}
                style={{
                  height: `${Math.max(heightPercent, 3)}%`,
                  background: isCurrent 
                    ? 'var(--gradient-accent)' 
                    : 'var(--color-border)',
                  boxShadow: isCurrent ? '0 0 12px var(--color-accent)40' : 'none',
                }}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(heightPercent, 3)}%` }}
                transition={{ delay: hour * 0.02, duration: 0.5 }}
                title={`${hour}:00 — ${minutes}min`}
                whileHover={{ opacity: 1, scale: 1.05 }}
              />
            );
          })}
        </div>

        {/* Time labels */}
        <div className="flex items-center justify-between">
          {tickLabels.map((label) => (
            <p key={label} className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
              {label}
            </p>
          ))}
        </div>
      </div>
    </Card>
  );
}
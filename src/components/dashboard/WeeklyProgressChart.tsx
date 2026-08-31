import React from 'react';
import { BarChart2, CheckSquare, Timer, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface WeeklyProgressChartProps {
  data: Array<{
    week: string;
    tasksCompleted: number;
    focusMinutes: number;
    habitsCompleted: number;
    projectsCompleted: number;
  }>;
}

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  // Format week labels (e.g., "2024-W01" -> "W01")
  const chartData = data.map((item) => ({
    ...item,
    weekLabel: item.week.split('-W')[1] ? `W${item.week.split('-W')[1]}` : item.week,
  }));

  // Check if there's any real activity across all weeks
  const hasData = data.some(
    (item) => item.tasksCompleted > 0 || item.focusMinutes > 0 || item.habitsCompleted > 0 || item.projectsCompleted > 0
  );

  return (
    <Card variant="default" className="pinterest-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'var(--icon-bg-accent)',
              color: 'var(--icon-text-accent)',
            }}
          >
            <BarChart2 size={16} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Weekly Progress</h3>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Last 8 Weeks</span>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col min-h-0" style={{ minHeight: 280 }}>
        {!hasData ? (
          <WeeklyProgressEmpty />
        ) : (
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorHabits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-md)',
                    padding: '8px 12px',
                  }}
                  labelStyle={{
                    color: 'var(--color-text-primary)',
                    fontWeight: 'bold',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                  itemStyle={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    padding: '2px 0',
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    paddingTop: 10,
                  }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="tasksCompleted"
                  name="Tasks"
                  stroke="var(--color-accent)"
                  fill="url(#colorTasks)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="habitsCompleted"
                  name="Habits"
                  stroke="var(--color-success)"
                  fill="url(#colorHabits)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-success)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="focusMinutes"
                  name="Focus"
                  stroke="var(--color-info)"
                  fill="url(#colorFocus)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-info)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

// Animated empty state shown when there's no weekly activity yet
function WeeklyProgressEmpty() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center mb-5"
        style={{ width: 200, height: 130 }}
      >
        {/* Dashed orbit ring */}
        <svg className="absolute inset-0" width="200" height="130" viewBox="0 0 200 130" fill="none">
          <motion.ellipse
            cx="100"
            cy="65"
            rx="90"
            ry="55"
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="5 8"
            opacity="0.35"
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '100px 65px' }}
          />
        </svg>

        {/* Chart illustration — 7 bars with shimmer wave */}
        <svg className="relative" width="168" height="104" viewBox="0 0 168 104" fill="none">
          {/* Grid lines */}
          {[20, 45, 70].map((y) => (
            <line
              key={y}
              x1="8"
              y1={y}
              x2="164"
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.4"
            />
          ))}

          {/* Baseline */}
          <line x1="8" y1="88" x2="164" y2="88" stroke="var(--color-border)" strokeWidth="1.5" opacity="0.5" />

          {/* Bars with shimmer animation */}
          {days.map((_, i) => {
            const x = 14 + i * 22;
            const barWidth = 14;
            const maxH = [28, 48, 36, 56, 42, 32, 20][i];
            return (
              <g key={i}>
                {/* Empty stub */}
                <rect x={x} y={84} width={barWidth} height={4} rx="2" fill="var(--color-border)" opacity="0.3" />
                {/* Shimmer bar */}
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 0.35, 0],
                  }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: 'easeInOut',
                  }}
                >
                  <rect
                    x={x}
                    y={88 - maxH}
                    width={barWidth}
                    height={maxH}
                    rx="2"
                    fill="var(--color-accent)"
                  />
                </motion.g>
              </g>
            );
          })}

          {/* Day labels */}
          {days.map((d, i) => (
            <text
              key={i}
              x={14 + i * 22 + 7}
              y="100"
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="var(--color-text-muted)"
              opacity="0.6"
            >
              {d}
            </text>
          ))}
        </svg>

        {/* Floating sparkle dots */}
        {[
          { x: 10, y: 10, delay: 0 },
          { x: 176, y: 18, delay: 0.5 },
          { x: 28, y: 108, delay: 0.9 },
          { x: 162, y: 100, delay: 1.3 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 5,
              height: 5,
              left: dot.x,
              top: dot.y,
              background:
                i % 3 === 0 ? 'var(--color-accent)' : i % 3 === 1 ? 'var(--color-success)' : 'var(--color-info)',
            }}
            animate={{ scale: [1, 1.7, 1], opacity: [0.2, 0.65, 0.2], y: [0, -5, 0] }}
            transition={{ duration: 2.2 + i * 0.3, repeat: Infinity, delay: dot.delay, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col items-center"
      >
        <p className="text-sm font-bold text-text-primary mb-1">No activity yet this week</p>
        <p className="text-xs text-text-muted mb-4 max-w-xs leading-relaxed">
          Complete tasks, log focus sessions, or check off habits — your progress will chart here.
        </p>

        {/* Legend hints */}
        <div className="flex items-center gap-4">
          {[
            { color: 'var(--color-accent)', icon: <CheckSquare size={11} />, label: 'Tasks' },
            { color: 'var(--color-success)', icon: <Flame size={11} />, label: 'Habits' },
            { color: 'var(--color-info)', icon: <Timer size={11} />, label: 'Focus' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)`, color: item.color }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

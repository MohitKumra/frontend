import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Flame, Star, Trophy, Lock, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import type { HabitDTO } from '../../types';

interface AchievementsPanelProps {
  habits: HabitDTO[];
}

interface Achievement {
  icon: React.ReactNode;
  label: string;
  description: string;
  unlocked: boolean;
  color: string;
}

export function AchievementsPanel({ habits }: AchievementsPanelProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  const totalCompletions = habits.reduce((sum, h) => sum + (h.completedToday ? 1 : 0), 0);
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak), 0);

  const achievements: Achievement[] = [
    {
      icon: <Star size={22} />,
      label: 'Early Starter',
      description: 'Unlocked\n7 Day Streak',
      unlocked: maxStreak >= 7,
      color: '#3B82F6',
    },
    {
      icon: <Flame size={22} />,
      label: 'On Fire',
      description: 'Unlocked\n10 Day Streak',
      unlocked: maxStreak >= 10,
      color: '#FF6B35',
    },
    {
      icon: <Trophy size={22} />,
      label: 'Consistency King',
      description: 'Unlocked\n30 Day Streak',
      unlocked: maxStreak >= 30,
      color: '#FFB800',
    },
    {
      icon: <Award size={22} />,
      label: 'Rising Star',
      description: 'Unlocked\n50 Points',
      unlocked: (totalCompletions * 40) >= 50,
      color: '#8B5CF6',
    },
  ];

  return (
    <Card variant="default" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
          <Trophy size={18} className="text-warning" />
          Achievements
        </h3>
        <a
          href="#"
          className="text-xs font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          onClick={(e) => e.preventDefault()}
        >
          View all
          <Sparkles size={12} />
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {achievements.map((achievement, idx) => {
          const isHovered = hoveredIdx === idx;
          
          return (
            <motion.div
              key={idx}
              className="relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
            >
              <motion.div
                className={`relative flex flex-col items-center text-center gap-3 p-4 rounded-2xl ${
                  achievement.unlocked ? '' : 'opacity-50'
                }`}
                style={{
                  background: achievement.unlocked 
                    ? 'var(--color-surface-raised)' 
                    : 'var(--color-surface)',
                  border: achievement.unlocked 
                    ? `1px solid ${achievement.color}30` 
                    : '1px solid var(--color-border)',
                }}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                {/* Glow effect on hover */}
                {achievement.unlocked && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${achievement.color}15, transparent 70%)`,
                      opacity: isHovered ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                )}

                {/* Icon container */}
                <div className="relative">
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
                    style={{
                      background: achievement.unlocked
                        ? `${achievement.color}20`
                        : 'var(--color-border)',
                      color: achievement.unlocked ? achievement.color : 'var(--color-text-muted)',
                    }}
                    animate={{
                      rotate: achievement.unlocked && isHovered ? [0, -5, 5, -5, 0] : 0,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    {achievement.icon}

                    {/* Lock overlay for locked achievements */}
                    {!achievement.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-2xl">
                        <Lock size={18} className="text-text-muted" />
                      </div>
                    )}

                    {/* Sparkle effect for unlocked */}
                    {achievement.unlocked && isHovered && (
                      <>
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 rounded-full"
                            style={{
                              background: achievement.color,
                              top: '50%',
                              left: '50%',
                            }}
                            animate={{
                              x: [0, (Math.cos((i * Math.PI) / 2) * 20)],
                              y: [0, (Math.sin((i * Math.PI) / 2) * 20)],
                              opacity: [1, 0],
                              scale: [1, 0],
                            }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              repeatDelay: 1,
                              delay: i * 0.1,
                            }}
                          />
                        ))}
                      </>
                    )}
                  </motion.div>

                  {/* Unlocked badge */}
                  {achievement.unlocked && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: achievement.color,
                        boxShadow: `0 2px 8px ${achievement.color}60`,
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.1 + 0.3, type: 'spring', stiffness: 200 }}
                    >
                      <Sparkles size={10} className="text-white" fill="white" />
                    </motion.div>
                  )}
                </div>

                {/* Label */}
                <div className="relative">
                  <p
                    className={`text-[13px] font-bold mb-1 ${
                      achievement.unlocked ? 'text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {achievement.label}
                  </p>
                  <p className="text-[10px] font-medium text-text-muted whitespace-pre-line leading-tight">
                    {achievement.description}
                  </p>
                </div>

                {/* Progress bar for locked achievements */}
                {!achievement.unlocked && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-border rounded-b-2xl overflow-hidden">
                    <motion.div
                      className="h-full"
                      style={{ background: achievement.color }}
                      initial={{ width: 0 }}
                      animate={{ width: '45%' }} // Mock progress
                      transition={{ duration: 1, delay: idx * 0.1 }}
                    />
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
import React from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface HabitEmptyStateProps {
  onCreateHabit: () => void;
}

export function HabitEmptyState({ onCreateHabit }: HabitEmptyStateProps) {
  return (
    <Card
      variant="default"
      className="relative overflow-hidden p-12 text-center"
      style={{ borderRadius: '32px' }}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: 'radial-gradient(circle at center, #6C63FF, transparent 70%)',
        }}
      />

      {/* Animated particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-accent opacity-20"
          style={{
            top: `${20 + i * 15}%`,
            left: `${15 + i * 18}%`,
          }}
          animate={{
            y: [-20, 20],
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.2,
          }}
        />
      ))}

      <div className="relative">
        {/* Icon */}
        <motion.div
          className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center"
          style={{
            background: 'var(--gradient-accent)',
            boxShadow: '0 12px 24px rgba(108, 99, 255, 0.3)',
          }}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
        >
          <Target size={40} className="text-white" strokeWidth={2.5} />
        </motion.div>

        {/* Title */}
        <motion.h3
          className="text-2xl font-black text-text-primary mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          No habits yet
        </motion.h3>

        {/* Description */}
        <motion.p
          className="text-sm text-text-secondary max-w-md mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Start your journey to better habits. Create your first habit and watch your progress grow.
        </motion.p>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {[
            { icon: '🎯', label: 'Track Progress' },
            { icon: '🔥', label: 'Build Streaks' },
            { icon: '✨', label: 'AI Insights' },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              className="p-4 rounded-2xl"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
              }}
              whileHover={{ y: -4, scale: 1.05 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <div className="text-3xl mb-2">{feature.icon}</div>
              <p className="text-xs font-bold text-text-primary">{feature.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <Button
            onClick={onCreateHabit}
            leftIcon={<Plus size={18} />}
            rightIcon={<Sparkles size={16} />}
            size="lg"
            className="font-bold"
            style={{
              background: 'var(--gradient-accent)',
              boxShadow: '0 12px 24px rgba(108, 99, 255, 0.4)',
            }}
          >
            Create Your First Habit
          </Button>
        </motion.div>
      </div>
    </Card>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Gem, Flame } from 'lucide-react';
import { Card } from '../ui/Card';
import type { HabitDTO } from '../../types';

interface LongestStreakCardProps {
  habit: HabitDTO;
  streak: number;
}

export function LongestStreakCard({ habit, streak }: LongestStreakCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card
        variant="default"
        className="p-6 relative overflow-hidden text-white h-full flex flex-col justify-between"
        style={{
          background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #A855F7 100%)',
          borderRadius: '24px',
          border: 'none',
          boxShadow: '0 20px 40px rgba(108, 99, 255, 0.4)',
        }}
      >
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%)',
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Decorative floating icons */}
        <motion.div
          animate={{
            y: [-5, 5],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Star size={18} className="absolute top-5 right-16 opacity-40" />
        </motion.div>
        
        <motion.div
          animate={{
            y: [5, -5],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        >
          <Gem size={16} className="absolute top-12 right-6 opacity-30" />
        </motion.div>
        
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Trophy size={120} className="absolute -bottom-6 -right-6 opacity-10" />
        </motion.div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"
              animate={{
                rotate: [0, 5, 0, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Flame className="text-white" size={20} />
            </motion.div>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
              Longest Streak
            </p>
          </div>

          <div className="flex items-end gap-3 mb-2">
            <motion.p
              className="text-[56px] font-black leading-none"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
            >
              {streak}
            </motion.p>
            <p className="text-lg font-bold mb-2 opacity-90">days</p>
          </div>
          
          <p className="text-[13px] font-semibold opacity-90 mb-1">{habit.title}</p>
        </div>

        <motion.p
          className="relative text-xs font-semibold opacity-90 flex items-center gap-1.5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0.9, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <span>Keep pushing your limits!</span>
          <span className="text-lg">🔥</span>
        </motion.p>

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
          animate={{
            x: ['-100%', '200%'],
            opacity: [0, 0.2, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
        />
      </Card>
    </motion.div>
  );
}
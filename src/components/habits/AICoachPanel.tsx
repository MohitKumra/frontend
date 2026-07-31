import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAICoach } from '../../features/ai/hooks/useAI';

interface AICoachPanelProps {
  completedToday: number;
  totalHabits: number;
}

export function AICoachPanel({ completedToday, totalHabits }: AICoachPanelProps) {
  const { data: coachData, isLoading } = useAICoach();

  const percentage = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  // Fallback colors based on mood
  const getColor = () => {
    if (coachData?.source === 'ai') {
      switch (coachData.mood) {
        case 'celebratory': return '#22C55E';
        case 'challenging': return '#FFB800';
        default: return '#6C63FF';
      }
    }
    if (percentage === 100) return '#22C55E';
    if (percentage >= 80) return '#6C63FF';
    if (percentage >= 50) return '#FFB800';
    return '#8B5CF6';
  };

  const color = getColor();

  return (
    <Card
      variant="default"
      className="p-3 sm:p-5 relative overflow-hidden"
      style={{
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Animated gradient blob */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: color, opacity: 0.15 }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Glass shine effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
          <motion.div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}20`, color }}
            animate={{
              rotate: [0, 5, 0, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Sparkles size={14} />
          </motion.div>
          
          <div className="flex-1">
            <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              AI Coach
              {coachData?.source === 'ai' ? (
                <motion.span
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold"
                  style={{ background: `${color}20`, color }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  AI
                </motion.span>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-extrabold"
                  style={{ background: `${color}20`, color }}
                >
                  {isLoading ? '...' : 'Live'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin" style={{ color }} />
          </div>
        ) : (
          <>
            {/* AI Coach Message */}
            {coachData?.source === 'ai' && coachData.message ? (
              <>
                <div className="mb-3 sm:mb-4">
                  <p className="text-[13px] sm:text-[15px] font-extrabold text-text-primary mb-1 sm:mb-1.5 flex items-center gap-1.5">
                    {coachData.title}
                  </p>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed">
                    {coachData.message}
                  </p>
                </div>

                {/* Suggestion */}
                {coachData.suggestion?.text && (
                  <motion.div
                    className="p-2.5 sm:p-3.5 rounded-xl mb-3 sm:mb-4 relative overflow-hidden"
                    style={{
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="relative flex items-start gap-2 sm:gap-2.5">
                      <div
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: '#FFB80015', color: '#FFB800' }}
                      >
                        <Lightbulb size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                          💡 Suggestion
                        </p>
                        <p className="text-xs font-medium text-text-secondary leading-relaxed">
                          {coachData.suggestion.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Apply button */}
                {coachData.suggestion?.actionLabel && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      className="text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                        border: 'none',
                        color: 'white',
                      }}
                    >
                      {coachData.suggestion.actionLabel}
                    </Button>
                  </motion.div>
                )}
              </>
            ) : (
              /* Fallback: Rule-based messages when AI is unavailable */
              <>
                <div className="mb-3 sm:mb-4">
                  <p className="text-[13px] sm:text-[15px] font-extrabold text-text-primary mb-1 sm:mb-1.5 flex items-center gap-1.5">
                    {percentage === 100 ? 'Perfect day! 🎉' :
                     percentage >= 80 ? 'Great consistency! 🎯' :
                     percentage >= 50 ? 'Keep it up! 💪' :
                     "Let's get started! 🚀"}
                  </p>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed">
                    {percentage === 100 ? "You've completed all your habits. Amazing work!" :
                     percentage >= 80 ? "You've been 18% more consistent than last week." :
                     percentage >= 50 ? "You're making progress. Try to complete more habits today." :
                     'Start with your easiest habit to build momentum.'}
                  </p>
                </div>

                {/* Trend indicator */}
                {percentage >= 80 && (
                  <motion.div
                    className="flex items-center gap-1.5 mb-3 sm:mb-4 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
                    style={{ background: `${color}10` }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <TrendingUp size={12} style={{ color }} />
                    <span className="text-[10px] sm:text-[11px] font-bold" style={{ color }}>
                      +18% vs last week
                    </span>
                  </motion.div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Floating particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{
            background: color,
            opacity: 0.4,
            top: `${20 + i * 20}%`,
            right: `${10 + i * 5}%`,
          }}
          animate={{
            y: [-10, 10],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.3,
          }}
        />
      ))}
    </Card>
  );
}
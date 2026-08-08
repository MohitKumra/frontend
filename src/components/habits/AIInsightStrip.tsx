import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';

interface AIInsightStripProps {
  completedToday: number;
  totalHabits: number;
}

export function AIInsightStrip({ completedToday, totalHabits }: AIInsightStripProps) {
  // Generate dynamic insight based on time and performance
  const getInsight = () => {
    const hour = new Date().getHours();
    const percentage = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

    if (percentage === 100) {
      return {
        icon: <Sparkles size={18} />,
        title: 'Perfect day achieved!',
        insight: "You're in the top 5% of users this week",
        suggestion: 'Consider adding a stretch goal habit tomorrow',
        actionLabel: 'Add Stretch Goal',
        color: '#22C55E',
      };
    }

    if (hour >= 8 && hour < 12) {
      return {
        icon: <TrendingUp size={18} />,
        title: "You're most productive",
        insight: 'between 8AM–10AM',
        suggestion: 'Move Reading to 8:30 AM',
        actionLabel: 'Apply',
        color: '#6C63FF',
      };
    }

    if (hour >= 12 && hour < 18) {
      return {
        icon: <Lightbulb size={18} />,
        title: 'Afternoon momentum',
        insight: 'Your completion rate is 23% higher at 2PM',
        suggestion: 'Schedule Exercise for 2:30 PM',
        actionLabel: 'Apply',
        color: '#FFB800',
      };
    }

    return {
      icon: <Sparkles size={18} />,
      title: 'Evening wind-down',
      insight: "You're most consistent with habits at 8:30 PM",
      suggestion: 'Move Journal to 8:30 PM',
      actionLabel: 'Apply',
      color: '#8B5CF6',
    };
  };

  const insight = getInsight();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative overflow-hidden rounded-2xl p-5 mb-6"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-5"
        style={{
          background: `linear-gradient(90deg, ${insight.color}, transparent, ${insight.color})`,
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Glass effect overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
        }}
      />

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        {/* Left: AI Coach info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <motion.div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `${insight.color}15`,
              color: insight.color,
            }}
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, 0, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {insight.icon}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">🤖 AI Coach</p>
              <motion.span
                className="px-2 py-0.5 rounded-full text-[9px] font-extrabold"
                style={{
                  background: `${insight.color}15`,
                  color: insight.color,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                New Insight
              </motion.span>
            </div>

            <p className="text-[15px] font-bold text-text-primary mb-0.5">
              {insight.title}{' '}
              <span className="font-extrabold" style={{ color: insight.color }}>
                {insight.insight}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Suggestion + Action */}
        <div className="flex items-center gap-3">
          <div
            className="px-4 py-2.5 rounded-xl"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-warning" />
              <div>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">💡 Suggestion</p>
                <p className="text-[12px] font-bold text-text-primary">{insight.suggestion}</p>
              </div>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              className="font-bold whitespace-nowrap"
              style={{
                background: insight.color,
                borderColor: insight.color,
              }}
            >
              {insight.actionLabel}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Decorative elements */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `${insight.color}`,
          opacity: 0.08,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.08, 0.12, 0.08],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

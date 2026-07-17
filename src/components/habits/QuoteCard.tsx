import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote } from 'lucide-react';
import { Card } from '../ui/Card';
import type { Quote as QuoteType } from '../../data/quotes';

interface QuoteCardProps {
  quotes: QuoteType[];
  /** Min interval between flips in ms (default 5000) */
  minInterval?: number;
  /** Max interval between flips in ms (default 10000) */
  maxInterval?: number;
}

export function QuoteCard({
  quotes,
  minInterval = 5000,
  maxInterval = 10000,
}: QuoteCardProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay =
      Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    timerRef.current = setTimeout(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % quotes.length);
    }, delay);
  }, [quotes.length, minInterval, maxInterval]);

  useEffect(() => {
    if (quotes.length <= 1 || isPaused) return;
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, isPaused, quotes.length, scheduleNext]);

  const current = quotes[index];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
    <Card
      variant="default"
      className="p-6 relative overflow-hidden"
      style={{ borderRadius: '20px' }}
    >
      {/* Huge blurred quotation mark background */}
      <motion.div
        className="absolute -top-6 -left-2 pointer-events-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Quote
          size={120}
          className="text-accent"
          fill="currentColor"
          strokeWidth={0}
        />
      </motion.div>

      {/* Decorative gradient blob */}
      <div
        className="absolute bottom-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #6C63FF12, transparent)',
          transform: 'translate(30%, 30%)',
        }}
      />

      {/* Progress dots */}
      {quotes.length > 1 && (
        <div className="flex gap-1.5 mb-3 relative z-10">
          {quotes.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 24 : 6,
                background:
                  i === index
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
              }}
            />
          ))}
        </div>
      )}

      {/* Quote content with vertical slide animation */}
      <div className="relative overflow-hidden" style={{ height: 100 }}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={index}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-x-0"
          >
            <div className="pt-2">
              <motion.p
                className="text-[14px] font-semibold text-text-primary leading-relaxed mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                &ldquo;{current.quote}&rdquo;
              </motion.p>
              <motion.p
                className="text-xs font-bold text-text-muted flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <span className="w-6 h-0.5 rounded-full bg-accent"></span>
                {current.author}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
    </div>
  );
}
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Quote } from 'lucide-react';
import type { Quote as QuoteType } from '../../data/quotes';

interface QuoteCardProps {
  quotes: QuoteType[];
  /** Min interval between flips in ms (default 5000) */
  minInterval?: number;
  /** Max interval between flips in ms (default 10000) */
  maxInterval?: number;
  /** Label shown in the eyebrow pill (default "Daily Quote") */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

function useIsDarkMode() {
  const [isDark, setIsDark] = React.useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

/**
 * Decorative sunset / mountains / birds accent, bottom-right corner.
 * Fixed pixel size on purpose — it's a corner flourish, so it must NOT
 * scale with the card's width/height or it will swallow narrow cards.
 */
function SceneDecoration({ isDark }: { isDark: boolean }) {
  return (
    <svg
      className="absolute bottom-0 right-0 pointer-events-none"
      style={{ width: '48%', maxWidth: 190, height: 'auto' }}
      viewBox="0 0 420 300"
      fill="none"
      preserveAspectRatio="xMaxYMax meet"
    >
      <defs>
        <radialGradient id="qc-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isDark ? '#4A3A1A' : '#FFF7E8'} stopOpacity="0.95" />
          <stop offset="55%" stopColor={isDark ? '#6A5A2A' : '#FBE7C6'} stopOpacity="0.55" />
          <stop offset="100%" stopColor={isDark ? '#6A5A2A' : '#FBE7C6'} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="qc-mtn-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? '#3A3570' : '#C9BFF7'} stopOpacity="0.5" />
          <stop offset="100%" stopColor={isDark ? '#2A2555' : '#B9ADF3'} stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="qc-mtn-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? '#2A2560' : '#A79BF0'} stopOpacity="0.6" />
          <stop offset="100%" stopColor={isDark ? '#1A1545' : '#9689ED'} stopOpacity="0.7" />
        </linearGradient>
      </defs>

      <circle cx="330" cy="210" r="70" fill="url(#qc-sun)" />

      <path
        d="M60,235 Q120,165 170,210 T270,200 Q330,155 420,215 L420,300 L60,300 Z"
        fill="url(#qc-mtn-back)"
      />
      <path
        d="M0,265 Q90,205 160,248 T300,235 Q360,205 420,248 L420,300 L0,300 Z"
        fill="url(#qc-mtn-front)"
      />

      {/* birds */}
      <g stroke={isDark ? '#5A5590' : '#B3A8EF'} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M120,95 q7,-9 14,0 q7,-9 14,0" />
        <path d="M230,70 q6,-8 12,0 q6,-8 12,0" />
        <path d="M190,115 q6,-8 12,0 q6,-8 12,0" />
      </g>
    </svg>
  );
}

export function QuoteCard({
  quotes,
  minInterval = 5000,
  maxInterval = 10000,
  label = 'Daily Quote',
  className,
  style,
}: QuoteCardProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDark = useIsDarkMode();

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay =
      Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    timerRef.current = setTimeout(() => {
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
  const isLiked = !!liked[index];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative min-h-[180px] sm:min-h-[220px] overflow-hidden ${className || ''}`}
      style={{
        containerType: 'inline-size',
        containerName: 'quotecard',
        borderRadius: 'clamp(14px, 6cqw, 26px)',
        padding: 'clamp(12px, 6cqw, 28px)',
        background: isDark
          ? 'radial-gradient(circle at 88% 18%, rgba(139, 131, 255, 0.12), transparent 30%), linear-gradient(150deg, #1A2335 0%, #1E2840 48%, #242D4F 100%)'
          : 'radial-gradient(circle at 88% 18%, rgba(124, 92, 255, 0.14), transparent 30%), linear-gradient(150deg, #FFFFFF 0%, #FBFAFF 48%, #F2EDFF 100%)',
        border: isDark
          ? '1px solid rgba(139, 131, 255, 0.20)'
          : '1px solid rgba(124, 92, 255, 0.16)',
        boxShadow: isDark
          ? '0 22px 46px -26px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 22px 46px -26px rgba(109, 92, 246, 0.38), inset 0 1px 0 rgba(255,255,255,0.86)',
        ...style,
      } as React.CSSProperties}
    >
      <SceneDecoration isDark={isDark} />
      <div
        className="absolute -left-16 -top-16 h-36 w-36 rounded-full blur-3xl"
        style={{ background: isDark ? 'rgba(139, 131, 255, 0.08)' : 'rgba(124, 92, 255, 0.12)' }}
      />

      {/* Header row */}
      <div
        className="relative z-10 flex items-start justify-between flex-wrap"
        style={{ gap: 8, marginBottom: 'clamp(12px, 5cqw, 26px)' }}
      >
        <div className="flex items-center" style={{ gap: 'clamp(6px, 2.5cqw, 12px)' }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 'clamp(30px, 10cqw, 50px)',
              height: 'clamp(30px, 10cqw, 50px)',
              borderRadius: '30%',
              background: 'linear-gradient(135deg, #8C7FFB 0%, #6C5CF0 100%)',
              boxShadow: '0 8px 16px -6px rgba(108, 92, 240, 0.5)',
            }}
          >
            <Quote size={18} color="#FFFFFF" fill="#FFFFFF" />
          </div>

          <div
            className="flex items-center flex-shrink-0"
            style={{
              background: isDark ? 'rgba(139, 131, 255, 0.15)' : 'rgba(124, 92, 255, 0.09)',
              color: isDark ? '#A39DFF' : '#6C5CF0',
              borderRadius: 999,
              gap: 'clamp(4px, 1.5cqw, 8px)',
              padding: 'clamp(4px, 1.5cqw, 7px) clamp(6px, 2.5cqw, 14px)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: isDark ? '#A39DFF' : '#6C5CF0',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              className="font-bold uppercase whitespace-nowrap"
              style={{ letterSpacing: '0.06em', fontSize: 'clamp(8px, 2.5cqw, 12px)' }}
            >
              {label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLiked((prev) => ({ ...prev, [index]: !prev[index] }))}
          aria-label={isLiked ? 'Unfavorite quote' : 'Favorite quote'}
          className="flex items-center justify-center transition-transform active:scale-90 flex-shrink-0"
          style={{
            width: 'clamp(26px, 9cqw, 44px)',
            height: 'clamp(26px, 9cqw, 44px)',
            borderRadius: 999,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
            border: isDark
              ? '1px solid rgba(139, 131, 255, 0.20)'
              : '1px solid rgba(124, 92, 255, 0.16)',
            boxShadow: isDark
              ? '0 4px 10px -4px rgba(0, 0, 0, 0.4)'
              : '0 4px 10px -4px rgba(108, 92, 240, 0.25)',
          }}
        >
          <Heart
            size={16}
            color={isDark ? '#A39DFF' : '#6C5CF0'}
            fill={isLiked ? (isDark ? '#A39DFF' : '#6C5CF0') : 'none'}
            strokeWidth={2}
            style={{ width: 'clamp(12px, 4cqw, 19px)', height: 'clamp(12px, 4cqw, 19px)' }}
          />
        </button>
      </div>

      {/* Quote content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <p
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 700,
                fontSize: 'clamp(15px, 7cqw, 34px)',
                lineHeight: 1.18,
                color: isDark ? '#E8E8F0' : '#171B2E',
                maxWidth: '94%',
                letterSpacing: 0,
              }}
            >
              {current.quote}
              <span
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: isDark ? '#6A6590' : '#B3A8EF',
                  marginLeft: 6,
                }}
              >
                &rdquo;
              </span>
            </p>

            <div
              className="flex items-start"
              style={{ gap: 'clamp(6px, 2.5cqw, 12px)', marginTop: 'clamp(10px, 4cqw, 22px)' }}
            >
              <span
                className="mt-2"
                style={{
                  width: 24,
                  height: 3,
                  borderRadius: 999,
                  background: isDark
                    ? 'linear-gradient(90deg, #8B83FF, #A39DFF)'
                    : 'linear-gradient(90deg, #6C5CF0, #8C7FFB)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  className="font-bold"
                  style={{
                    color: isDark ? '#A39DFF' : '#6C5CF0',
                    fontSize: 'clamp(11px, 4cqw, 16px)',
                    marginBottom: 2,
                  }}
                >
                  {current.author}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rotation indicator, kept subtle to preserve the reference look */}
      {quotes.length > 1 && (
        <div
          className="relative z-10 flex gap-1.5"
          style={{ marginTop: 'clamp(8px, 3cqw, 20px)' }}
        >
          {quotes.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background: i === index
                  ? (isDark ? '#A39DFF' : '#6C5CF0')
                  : (isDark ? 'rgba(163, 157, 255, 0.20)' : '#E4E0FA'),
                transition: 'width 0.3s ease',
                display: 'inline-block',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
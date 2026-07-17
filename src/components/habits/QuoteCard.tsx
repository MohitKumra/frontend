import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import type { Quote as QuoteType } from '../../data/quotes';

interface QuoteCardProps {
  quotes: QuoteType[];
  /** Min interval between flips in ms (default 5000) */
  minInterval?: number;
  /** Max interval between flips in ms (default 10000) */
  maxInterval?: number;
  /** Label shown in the eyebrow pill (default "Daily Quote") */
  label?: string;
}

/**
 * Decorative sunset / mountains / birds accent, bottom-right corner.
 * Fixed pixel size on purpose — it's a corner flourish, so it must NOT
 * scale with the card's width/height or it will swallow narrow cards.
 */
function SceneDecoration() {
  return (
    <svg
      className="absolute bottom-0 right-0 pointer-events-none"
      style={{ width: '38%', maxWidth: 170, height: 'auto' }}
      viewBox="0 0 420 300"
      fill="none"
      preserveAspectRatio="xMaxYMax meet"
    >
      <defs>
        <radialGradient id="qc-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF7E8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#FBE7C6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FBE7C6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="qc-mtn-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9BFF7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#B9ADF3" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="qc-mtn-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A79BF0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#9689ED" stopOpacity="0.7" />
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
      <g stroke="#B3A8EF" strokeWidth="2.5" strokeLinecap="round" fill="none">
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
}: QuoteCardProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      className="relative overflow-hidden"
      style={{
        containerType: 'inline-size',
        containerName: 'quotecard',
        borderRadius: 'clamp(16px, 6cqw, 28px)',
        padding: 'clamp(16px, 6cqw, 32px)',
        background: 'linear-gradient(160deg, #FFFFFF 0%, #F6F4FD 100%)',
        border: '1px solid #ECE8FB',
        boxShadow: '0 24px 60px -20px rgba(109, 92, 246, 0.28)',
      } as React.CSSProperties}
    >
      <SceneDecoration />

      {/* Header row */}
      <div
        className="relative z-10 flex items-start justify-between flex-wrap"
        style={{ gap: 8, marginBottom: 'clamp(20px, 8cqw, 32px)' }}
      >
        <div className="flex items-center" style={{ gap: 'clamp(8px, 3cqw, 12px)' }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 'clamp(34px, 12cqw, 48px)',
              height: 'clamp(34px, 12cqw, 48px)',
              borderRadius: '30%',
              background: 'linear-gradient(135deg, #8C7FFB 0%, #6C5CF0 100%)',
              boxShadow: '0 8px 16px -6px rgba(108, 92, 240, 0.5)',
            }}
          >
            <span
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 700,
                fontSize: 'clamp(16px, 6cqw, 26px)',
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              &ldquo;
            </span>
          </div>

          <div
            className="flex items-center flex-shrink-0"
            style={{
              background: '#F1EEFE',
              color: '#6C5CF0',
              borderRadius: 999,
              gap: 'clamp(4px, 1.5cqw, 8px)',
              padding: 'clamp(5px, 2cqw, 7px) clamp(9px, 3.5cqw, 14px)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#6C5CF0',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              className="font-bold uppercase whitespace-nowrap"
              style={{ letterSpacing: '0.06em', fontSize: 'clamp(9px, 3cqw, 12px)' }}
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
            width: 'clamp(32px, 11cqw, 44px)',
            height: 'clamp(32px, 11cqw, 44px)',
            borderRadius: 999,
            background: '#FFFFFF',
            border: '1px solid #ECE8FB',
            boxShadow: '0 4px 10px -4px rgba(108, 92, 240, 0.25)',
          }}
        >
          <Heart
            size={19}
            color="#6C5CF0"
            fill={isLiked ? '#6C5CF0' : 'none'}
            strokeWidth={2}
            style={{ width: 'clamp(14px, 5cqw, 19px)', height: 'clamp(14px, 5cqw, 19px)' }}
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
                fontSize: 'clamp(15px, 6.5cqw, 34px)',
                lineHeight: 1.3,
                color: '#171B2E',
                maxWidth: '92%',
              }}
            >
              {current.quote}
              <span
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  color: '#B3A8EF',
                  marginLeft: 6,
                }}
              >
                &rdquo;
              </span>
            </p>

            <div
              className="flex items-start"
              style={{ gap: 'clamp(8px, 3cqw, 12px)', marginTop: 'clamp(14px, 5cqw, 24px)' }}
            >
              <span
                className="mt-2"
                style={{
                  width: 24,
                  height: 3,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #6C5CF0, #8C7FFB)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  className="font-bold"
                  style={{
                    color: '#6C5CF0',
                    fontSize: 'clamp(13px, 4.5cqw, 17px)',
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
          style={{ marginTop: 'clamp(12px, 5cqw, 24px)' }}
        >
          {quotes.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background: i === index ? '#6C5CF0' : '#E4E0FA',
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
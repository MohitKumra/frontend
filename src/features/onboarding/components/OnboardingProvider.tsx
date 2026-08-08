/**
 * frontend/src/features/onboarding/components/OnboardingProvider.tsx
 * Root orchestrator: renders the complete onboarding experience.
 * Welcome & Finish modals are:
 *   - Desktop: premium centered glassmorphism modal (spring scale-in)
 *   - Mobile: bottom sheet that slides up from bottom, covering nav tabs
 * All colors use CSS tokens for full light/dark theme support.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingProvider as ContextProvider } from '../context/OnboardingContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { SpotlightOverlay } from './SpotlightOverlay';
import { AIGuide } from './AIGuide';
import { FloatingTooltip } from './FloatingTooltip';
import { PremiumOrb } from './PremiumOrb';
import { WELCOME_MESSAGE, FINISH_MESSAGE, ONBOARDING_STEPS, getStepTargetSelector } from '../config/steps';
import { calculateGuidePosition, calculateAngleToTarget } from '../utils/spotlight';
import { hasCompletedOnboarding } from '../utils/storage';
import type { SpotlightRect } from '../types';

// ─── Spring configs ───────────────────────────────────────────────────────────

const SPRING_ENTER = { type: 'spring', damping: 26, stiffness: 260, mass: 0.75 } as const;
const SPRING_SHEET = { type: 'spring', damping: 34, stiffness: 320, mass: 0.85 } as const;

// ─── Feature badges shown in welcome modal ────────────────────────────────────

const FEATURE_LABELS = [
  { label: 'Dashboard', emoji: '⚡' },
  { label: 'Tasks', emoji: '✅' },
  { label: 'Planner', emoji: '📅' },
  { label: 'Habits', emoji: '🔥' },
  { label: 'Settings', emoji: '⚙️' },
];

// ─── Gradient accent bar ──────────────────────────────────────────────────────

function AccentBar() {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[inherit]"
      style={{
        background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 45%, #ec4899 100%)',
      }}
    />
  );
}

// ─── Sheet handle (mobile only) ───────────────────────────────────────────────

function SheetHandle() {
  return (
    <div className="flex justify-center pt-3 pb-1">
      <div className="w-10 h-1 rounded-full" style={{ background: 'var(--onboarding-sheet-handle)' }} />
    </div>
  );
}

// ─── Inner component that consumes context ────────────────────────────────────

function OnboardingInner({ children }: { children: React.ReactNode }) {
  const { isActive, isFinishing, currentStep, direction, progress, actions, prefersReducedMotion } = useOnboarding();

  const [guidePos, setGuidePos] = useState({ x: 0, y: 0 });
  const [guideTilt, setGuideTilt] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const stepConfig = isActive && currentStep < ONBOARDING_STEPS.length ? ONBOARDING_STEPS[currentStep] : null;

  const targetSelector = stepConfig ? getStepTargetSelector(stepConfig, isMobile) : null;
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  // Show welcome on first activation
  useEffect(() => {
    if (isActive && !welcomeDismissed && currentStep === 0) {
      setShowWelcome(true);
    } else if (!isActive) {
      setShowWelcome(false);
    }
  }, [currentStep, isActive, welcomeDismissed]);

  // Measure target element periodically
  useEffect(() => {
    if (!targetSelector || !isActive) {
      setTargetRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
      }
    };

    measure();
    const interval = setInterval(measure, 100);
    window.addEventListener('resize', measure);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', measure);
    };
  }, [targetSelector, isActive, currentStep]);

  // Update guide position and tilt whenever targetRect changes
  useEffect(() => {
    if (!targetRect || !stepConfig) return;

    const pos = calculateGuidePosition(targetRect, stepConfig.position, isMobile ? 56 : 80, isMobile ? 8 : 16);

    const offset = stepConfig.offset ?? { x: 0, y: 0 };

    setGuidePos({
      x: pos.x + offset.x,
      y: pos.y + offset.y,
    });

    const tilt = calculateAngleToTarget(pos.x + (isMobile ? 28 : 40), pos.y + (isMobile ? 28 : 40), targetRect);
    setGuideTilt(tilt);
  }, [targetRect, stepConfig, isMobile]);

  // ─── Welcome handlers ───────────────────────────────────────────────────────

  const handleStartTour = useCallback(() => {
    setWelcomeDismissed(true);
    setShowWelcome(false);
    actions.start();
  }, [actions]);

  const handleSkipTour = useCallback(() => {
    setWelcomeDismissed(true);
    setShowWelcome(false);
    actions.skip();
  }, [actions]);

  // ─── Derived visibility flags ───────────────────────────────────────────────

  const shouldShowOverlay = isActive && !showWelcome && !isFinishing;
  const shouldShowGuide = shouldShowOverlay && targetRect !== null;
  const shouldShowTooltip = shouldShowOverlay && stepConfig !== null && targetRect !== null;
  const isFirst = currentStep === 0;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  // ─── Animation variants (modal vs sheet) ────────────────────────────────────

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = isMobile
    ? {
        hidden: prefersReducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 },
        visible: prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 },
        exit: prefersReducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0 },
      }
    : {
        hidden: prefersReducedMotion ? { opacity: 0 } : { scale: 0.88, opacity: 0, y: 24, filter: 'blur(4px)' },
        visible: prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: 16, filter: 'blur(2px)' },
      };

  const cardTransition = isMobile ? SPRING_SHEET : SPRING_ENTER;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {children}

      {createPortal(
        <>
          {/* Spotlight Overlay */}
          <SpotlightOverlay visible={shouldShowOverlay} targetRect={targetRect} reducedMotion={prefersReducedMotion} />

          {/* AI Guide orb */}
          {shouldShowGuide && (
            <AIGuide
              x={guidePos.x}
              y={guidePos.y}
              scale={1}
              tilt={guideTilt}
              pointing={true}
              waving={isFinishing}
              entering={currentStep === 0 && direction === 'forward'}
              reducedMotion={prefersReducedMotion}
            />
          )}

          {/* Floating Tooltip */}
          {shouldShowTooltip && stepConfig && (
            <FloatingTooltip
              visible={true}
              targetRect={targetRect}
              title={stepConfig.title}
              description={stepConfig.description}
              progress={progress}
              direction={direction}
              isFirst={isFirst}
              isLast={isLast}
              reducedMotion={prefersReducedMotion}
              onNext={actions.next}
              onPrev={actions.prev}
              onSkip={actions.skip}
            />
          )}

          {/* ── Welcome Modal / Bottom Sheet ─────────────────────────────────── */}
          <AnimatePresence>
            {showWelcome && isActive && !isFinishing && (
              <motion.div
                className="fixed inset-0 z-[10003]"
                style={{ display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={backdropVariants}
                transition={{ duration: prefersReducedMotion ? 0 : 0.28 }}
              >
                {/* Backdrop */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'var(--onboarding-backdrop)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                  onClick={handleSkipTour}
                />

                {/* Card / Sheet */}
                <motion.div
                  className="relative z-10"
                  style={
                    isMobile
                      ? { width: '100%', maxWidth: '100%' }
                      : { width: '100%', maxWidth: '440px', margin: '0 16px' }
                  }
                  variants={modalVariants}
                  transition={cardTransition}
                >
                  {/* Inner card */}
                  <div
                    style={{
                      background: 'var(--onboarding-modal-bg)',
                      backdropFilter: 'blur(28px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                      boxShadow: 'var(--onboarding-modal-shadow)',
                      border: isMobile ? 'none' : '1px solid var(--onboarding-modal-border)',
                      borderRadius: isMobile ? '28px 28px 0 0' : '28px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <AccentBar />

                    {/* Sheet handle on mobile */}
                    {isMobile && <SheetHandle />}

                    <div
                      style={{
                        padding: isMobile ? '20px 24px 32px' : '36px 32px 32px',
                        paddingBottom: isMobile ? 'calc(28px + env(safe-area-inset-bottom))' : '32px',
                        textAlign: 'center',
                      }}
                    >
                      {/* Orb */}
                      <motion.div
                        className="flex justify-center"
                        style={{ marginBottom: isMobile ? '16px' : '20px' }}
                        initial={prefersReducedMotion ? {} : { scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, ...SPRING_ENTER }}
                      >
                        <PremiumOrb size={isMobile ? 76 : 96} reducedMotion={prefersReducedMotion} showSparkles />
                      </motion.div>

                      {/* Title */}
                      <motion.h2
                        style={{
                          fontSize: isMobile ? '1.35rem' : '1.65rem',
                          fontWeight: 800,
                          letterSpacing: '-0.025em',
                          lineHeight: 1.2,
                          marginBottom: '10px',
                          color: 'var(--onboarding-modal-text-primary)',
                        }}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {WELCOME_MESSAGE.title}
                      </motion.h2>

                      {/* Subtitle */}
                      <motion.p
                        style={{
                          fontSize: isMobile ? '0.815rem' : '0.875rem',
                          lineHeight: 1.65,
                          color: 'var(--onboarding-modal-text-secondary)',
                          marginBottom: isMobile ? '18px' : '22px',
                          maxWidth: '360px',
                          margin: `0 auto ${isMobile ? '18px' : '22px'}`,
                        }}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {WELCOME_MESSAGE.subtitle}
                      </motion.p>

                      {/* Feature pills */}
                      <motion.div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          gap: '8px',
                          marginBottom: isMobile ? '22px' : '26px',
                        }}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {FEATURE_LABELS.map(({ label, emoji }) => (
                          <span
                            key={label}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              letterSpacing: '0.01em',
                              background: 'var(--onboarding-pill-bg)',
                              color: 'var(--onboarding-pill-text)',
                              border: '1px solid var(--onboarding-pill-border)',
                            }}
                          >
                            <span aria-hidden>{emoji}</span>
                            {label}
                          </span>
                        ))}
                      </motion.div>

                      {/* CTA buttons */}
                      <motion.div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.38, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {/* Primary CTA */}
                        <button
                          onClick={handleStartTour}
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '14px 20px',
                            borderRadius: '14px',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 55%, #ec4899 100%)',
                            boxShadow: '0 8px 28px rgba(99, 102, 241, 0.38), 0 2px 8px rgba(168, 85, 247, 0.2)',
                            transition: 'transform 120ms ease, box-shadow 120ms ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow =
                              '0 12px 36px rgba(99, 102, 241, 0.45), 0 4px 12px rgba(168, 85, 247, 0.28)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow =
                              '0 8px 28px rgba(99, 102, 241, 0.38), 0 2px 8px rgba(168, 85, 247, 0.2)';
                          }}
                        >
                          {WELCOME_MESSAGE.startButton} →
                        </button>

                        {/* Skip */}
                        <button
                          onClick={handleSkipTour}
                          style={{
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: '14px',
                            fontSize: '0.815rem',
                            fontWeight: 600,
                            border: '1px solid var(--onboarding-skip-border)',
                            background: 'var(--onboarding-skip-bg)',
                            color: 'var(--onboarding-skip-text)',
                            cursor: 'pointer',
                            transition: 'opacity 120ms ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                          }}
                        >
                          {WELCOME_MESSAGE.skipButton}
                        </button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Finish Screen ─────────────────────────────────────────────────── */}
          <AnimatePresence>
            {isFinishing && (
              <motion.div
                className="fixed inset-0 z-[10003]"
                style={{ display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={backdropVariants}
                transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
              >
                {/* Gradient backdrop */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: isMobile
                      ? 'var(--onboarding-backdrop)'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.12) 50%, rgba(236,72,153,0.08) 100%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                />

                {/* Confetti particles */}
                {!prefersReducedMotion && !isMobile && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: 4 + (i % 5),
                          height: 4 + (i % 5),
                          background: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'][i % 5],
                          left: `${(i / 28) * 100}%`,
                          top: -10,
                        }}
                        animate={{
                          y: [0, window.innerHeight + 30],
                          x: [0, ((i % 7) - 3) * 45],
                          rotate: [0, 360],
                          opacity: [1, 0],
                        }}
                        transition={{
                          duration: 2.2 + (i % 3) * 0.4,
                          repeat: Infinity,
                          delay: (i / 28) * 2.2,
                          ease: 'easeIn',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Card / Sheet */}
                <motion.div
                  className="relative z-10"
                  style={isMobile ? { width: '100%' } : { width: '100%', maxWidth: '400px', margin: '0 16px' }}
                  variants={modalVariants}
                  transition={cardTransition}
                >
                  <div
                    style={{
                      background: 'var(--onboarding-modal-bg)',
                      backdropFilter: 'blur(28px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                      boxShadow: 'var(--onboarding-modal-shadow)',
                      border: isMobile ? 'none' : '1px solid var(--onboarding-modal-border)',
                      borderRadius: isMobile ? '28px 28px 0 0' : '28px',
                      overflow: 'hidden',
                      position: 'relative',
                      textAlign: 'center',
                    }}
                  >
                    <AccentBar />
                    {isMobile && <SheetHandle />}

                    <div
                      style={{
                        padding: isMobile ? '20px 24px 32px' : '36px 32px 32px',
                        paddingBottom: isMobile ? 'calc(28px + env(safe-area-inset-bottom))' : '32px',
                      }}
                    >
                      {/* Waving orb */}
                      <motion.div
                        className="flex justify-center"
                        style={{ marginBottom: isMobile ? '16px' : '20px' }}
                        animate={prefersReducedMotion ? {} : { rotate: [0, -5, 5, -5, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <PremiumOrb
                          size={isMobile ? 76 : 96}
                          reducedMotion={prefersReducedMotion}
                          showWave
                          showSparkles
                        />
                      </motion.div>

                      <motion.h2
                        style={{
                          fontSize: isMobile ? '1.4rem' : '1.65rem',
                          fontWeight: 800,
                          letterSpacing: '-0.025em',
                          lineHeight: 1.2,
                          marginBottom: '10px',
                          color: 'var(--onboarding-modal-text-primary)',
                        }}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {FINISH_MESSAGE.title}
                      </motion.h2>

                      <motion.p
                        style={{
                          fontSize: isMobile ? '0.815rem' : '0.875rem',
                          lineHeight: 1.65,
                          color: 'var(--onboarding-modal-text-secondary)',
                          marginBottom: isMobile ? '22px' : '28px',
                          maxWidth: '320px',
                          margin: `0 auto ${isMobile ? '22px' : '28px'}`,
                        }}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {FINISH_MESSAGE.subtitle}
                      </motion.p>

                      <motion.button
                        onClick={actions.finish}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          borderRadius: '14px',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 55%, #ec4899 100%)',
                          boxShadow: '0 8px 28px rgba(99, 102, 241, 0.38)',
                        }}
                        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.28, ...SPRING_ENTER }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {FINISH_MESSAGE.button} 🚀
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}

// ─── Public root component ────────────────────────────────────────────────────

interface OnboardingRootProps {
  children: React.ReactNode;
  /** If true, onboarding will automatically check localStorage and show if not completed */
  autoStart?: boolean;
}

/**
 * OnboardingProvider - Wrap around your app to enable onboarding.
 * Renders the AI guide, spotlight, tooltip, welcome, and finish screens.
 *
 * @example
 * ```tsx
 * <OnboardingRoot autoStart>
 *   <App />
 * </OnboardingRoot>
 * ```
 */
export function OnboardingRoot({ children, autoStart = false }: OnboardingRootProps) {
  return (
    <ContextProvider autoStart={autoStart}>
      <OnboardingInner>{children}</OnboardingInner>
    </ContextProvider>
  );
}

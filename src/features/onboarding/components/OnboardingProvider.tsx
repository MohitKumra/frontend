/**
 * frontend/src/features/onboarding/components/OnboardingProvider.tsx
 * Root orchestrator: renders the complete onboarding experience.
 * Wraps children and displays spotlight, guide, tooltip, welcome, and finish screens.
 * Responsive: uses mobileTarget selectors on mobile viewports.
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

// ─── Inner component that consumes context ────────────────────────────────────

function OnboardingInner({ children }: { children: React.ReactNode }) {
  const {
    isActive,
    isFinishing,
    currentStep,
    direction,
    progress,
    actions,
    prefersReducedMotion,
  } = useOnboarding();

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

  const stepConfig = isActive && currentStep < ONBOARDING_STEPS.length
    ? ONBOARDING_STEPS[currentStep]
    : null;

  // Use mobileTarget on mobile, fall back to desktop target
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

    const pos = calculateGuidePosition(
      targetRect,
      stepConfig.position,
      isMobile ? 56 : 80,
      isMobile ? 8 : 16,
    );

    // Apply offset
    const offset = stepConfig.offset ?? { x: 0, y: 0 };

    setGuidePos({
      x: pos.x + offset.x,
      y: pos.y + offset.y,
    });

    const tilt = calculateAngleToTarget(
      pos.x + (isMobile ? 28 : 40),
      pos.y + (isMobile ? 28 : 40),
      targetRect,
    );
    setGuideTilt(tilt);
  }, [targetRect, stepConfig, isMobile]);

  // ─── Welcome Screen ─────────────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  const shouldShowOverlay = isActive && !showWelcome && !isFinishing;
  const shouldShowGuide = shouldShowOverlay && targetRect !== null;
  const shouldShowTooltip = shouldShowOverlay && stepConfig !== null && targetRect !== null;

  // Determine guide states
  const isFirst = currentStep === 0;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      {children}

      {createPortal(
        <>
          {/* Spotlight Overlay */}
          <SpotlightOverlay
            visible={shouldShowOverlay}
            targetRect={targetRect}
            reducedMotion={prefersReducedMotion}
          />

          {/* AI Guide */}
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

          {/* Welcome Modal */}
          <AnimatePresence>
            {showWelcome && isActive && !isFinishing && (
              <motion.div
                className="fixed inset-0 z-[10003] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Backdrop */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                  onClick={handleSkipTour}
                />

                {/* Modal card */}
                <motion.div
                  className="relative z-10 w-full max-w-md mx-4"
                  initial={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { scale: 0.9, opacity: 0, y: 20 }
                  }
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { scale: 0.9, opacity: 0, y: 20 }
                  }
                  transition={{
                    type: 'spring',
                    damping: 20,
                    stiffness: 200,
                    mass: 0.8,
                  }}
                >
                  <div
                    className="relative overflow-hidden rounded-[24px] p-8 text-center"
                    style={{
                      background: 'var(--onboarding-welcome-bg, rgba(255, 255, 255, 0.95))',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      boxShadow:
                        '0 32px 80px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.1)',
                    }}
                  >
                    {/* Gradient accent line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{
                        background:
                          'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)',
                      }}
                    />

                    <div className="flex justify-center mb-6">
                      <PremiumOrb size={92} reducedMotion={prefersReducedMotion} showSparkles />
                    </div>

                    {/* Title */}
                    <h2
                      className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight"
                      style={{ color: 'var(--color-text-primary, #1e1b4b)' }}
                    >
                      {WELCOME_MESSAGE.title}
                    </h2>

                    {/* Subtitle */}
                    <p
                      className="text-sm sm:text-[15px] leading-relaxed mb-6 sm:mb-7"
                      style={{ color: 'var(--color-text-secondary, #6b7280)' }}
                    >
                      {WELCOME_MESSAGE.subtitle}
                    </p>

                    <div className="flex flex-wrap justify-center gap-2 mb-7">
                      {['Dashboard', 'Tasks', 'Planner', 'Settings'].map((label) => (
                        <span
                          key={label}
                          className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
                          style={{
                            background: 'rgba(255,255,255,0.62)',
                            color: 'var(--color-text-secondary, #6b7280)',
                            borderColor: 'rgba(129,140,248,0.16)',
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleStartTour}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 active:scale-[0.98]"
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          boxShadow: '0 12px 30px rgba(99, 102, 241, 0.28)',
                        }}
                        autoFocus
                      >
                        {WELCOME_MESSAGE.startButton}
                      </button>
                      <button
                        onClick={handleSkipTour}
                        className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-150 hover:opacity-70"
                        style={{
                          color: 'var(--color-text-muted, #9ca3af)',
                          background: 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {WELCOME_MESSAGE.skipButton}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Finish Screen */}
          <AnimatePresence>
            {isFinishing && (
              <motion.div
                className="fixed inset-0 z-[10003] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Gradient backdrop */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1), rgba(236,72,153,0.05))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                />

                {/* Confetti-like particles */}
                {!prefersReducedMotion && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: 4 + (i % 6),
                          height: 4 + (i % 6),
                          background: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'][i % 5],
                          left: `${Math.random() * 100}%`,
                          top: -10,
                        }}
                        animate={{
                          y: [0, window.innerHeight + 20],
                          x: [0, (i % 5 - 2) * 40],
                          rotate: [0, 360],
                          opacity: [1, 0],
                        }}
                        transition={{
                          duration: 2 + (i % 3),
                          repeat: Infinity,
                          delay: (i / 30) * 2,
                          ease: 'easeIn',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Card */}
                <motion.div
                  className="relative z-10 w-full max-w-sm mx-4 text-center"
                  initial={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { scale: 0.8, opacity: 0, y: 30 }
                  }
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { scale: 0.8, opacity: 0, y: 30 }
                  }
                  transition={{
                    type: 'spring',
                    damping: 18,
                    stiffness: 180,
                    mass: 0.8,
                  }}
                >
                  <div
                    className="rounded-[24px] p-8"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      boxShadow: '0 32px 80px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {/* Assistant waving */}
                  <div className="flex justify-center mb-6">
                    <motion.div
                      animate={{ rotate: [0, -4, 4, -4, 0] }}
                      transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <PremiumOrb size={92} reducedMotion={prefersReducedMotion} showWave showSparkles />
                    </motion.div>
                  </div>

                    <h2
                      className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight"
                      style={{ color: 'var(--color-text-primary, #1e1b4b)' }}
                    >
                      {FINISH_MESSAGE.title}
                    </h2>
                    <p
                      className="text-sm sm:text-[15px] leading-relaxed mb-8"
                      style={{ color: 'var(--color-text-secondary, #6b7280)' }}
                    >
                      {FINISH_MESSAGE.subtitle}
                    </p>
                    <button
                      onClick={actions.finish}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-150 active:scale-[0.98]"
                      style={{
                        background:
                          'linear-gradient(135deg, #6366f1, #a855f7)',
                        boxShadow:
                          '0 4px 20px rgba(99, 102, 241, 0.3)',
                      }}
                      autoFocus
                    >
                      {FINISH_MESSAGE.button}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body,
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

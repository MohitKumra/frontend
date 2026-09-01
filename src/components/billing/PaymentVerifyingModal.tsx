// frontend/src/components/billing/PaymentVerifyingModal.tsx
import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, Sparkles, Receipt, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';

export interface PaymentVerifyingModalProps {
  isOpen: boolean;
  status: 'verifying' | 'success' | 'error';
  planName?: string;
  errorMessage?: string;
  onClose?: () => void;
  onContinue?: () => void;
}

export function PaymentVerifyingModal({
  isOpen,
  status,
  planName = 'Pro Plan',
  errorMessage,
  onClose,
  onContinue,
}: PaymentVerifyingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Progressive steps animation while verifying
  useEffect(() => {
    if (!isOpen || status !== 'verifying') return;
    setCurrentStep(1);

    const timer1 = setTimeout(() => {
      setCurrentStep(2);
    }, 1200);

    const timer2 = setTimeout(() => {
      setCurrentStep(3);
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, status]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white dark:bg-[#1a2335] border border-slate-200 dark:border-[#2d3548] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center overflow-hidden"
        >
          {/* Top Background Glow */}
          <div
            className="absolute top-0 inset-x-0 h-1.5"
            style={{
              background:
                status === 'success'
                  ? 'var(--gradient-success)'
                  : status === 'error'
                  ? 'var(--gradient-danger)'
                  : 'var(--gradient-accent)',
            }}
          />

          {/* Animated Main Icon */}
          <div className="relative mx-auto flex items-center justify-center pt-2">
            {status === 'verifying' && (
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500" />
                </span>
              </div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm"
              >
                <CheckCircle2 className="w-9 h-9" />
              </motion.div>
            )}

            {status === 'error' && (
              <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200/80 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <AlertCircle className="w-9 h-9" />
              </div>
            )}
          </div>

          {/* Headline and Plan Name */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              {planName}
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {status === 'verifying'
                ? 'Payment Received! Verifying...'
                : status === 'success'
                ? 'Plan Activated Successfully! 🎉'
                : 'Payment Verification Error'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
              {status === 'verifying'
                ? 'Your payment was safely processed by Razorpay. Please do not close or reload this page while we activate your subscription.'
                : status === 'success'
                ? `You now have full access to all ${planName} features, higher limits, and priority AI processing.`
                : errorMessage || 'We encountered an issue verifying your payment. Your funds are safe and will be checked shortly.'}
            </p>
          </div>

          {/* Stepper (During Verification) */}
          {status === 'verifying' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-left border border-slate-100 dark:border-slate-700/60 space-y-3">
              {/* Step 1 */}
              <div className="flex items-center gap-3 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold transition-colors ${
                    currentStep > 1
                      ? 'bg-emerald-500 text-white'
                      : currentStep === 1
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      currentStep >= 1 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    Verifying Razorpay payment signature
                  </p>
                  <p className="text-[10px] text-slate-400">Cryptographic authenticity verification</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold transition-colors ${
                    currentStep > 2
                      ? 'bg-emerald-500 text-white'
                      : currentStep === 2
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      currentStep >= 2 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    Securing subscription & generating GST tax invoice
                  </p>
                  <p className="text-[10px] text-slate-400">Tax compliance and PDF receipt</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold transition-colors ${
                    currentStep === 3
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  3
                </div>
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      currentStep >= 3 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    Unlocking plan entitlements & Pro features
                  </p>
                  <p className="text-[10px] text-slate-400">Instant workspace upgrade</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {status === 'success' && (
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={onContinue || onClose}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to My Workspace
              </Button>
            )}

            {status === 'error' && (
              <Button variant="secondary" fullWidth onClick={onClose}>
                Dismiss
              </Button>
            )}

            {status === 'verifying' && (
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Secure & Encrypted by 256-bit SSL</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

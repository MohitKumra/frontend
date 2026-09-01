// frontend/src/components/billing/DowngradeConfirmModal.tsx
import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, ArrowDownRight, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatINR } from '../../utils/formatCurrency';
import type { PlanDTO } from '../../features/billing/useUserPlan';

interface DowngradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  targetPlan: PlanDTO;
  periodEndDate?: string | null;
  onConfirm: () => Promise<void>;
}

export function DowngradeConfirmModal({
  isOpen,
  onClose,
  currentPlanName,
  targetPlan,
  periodEndDate,
  onConfirm,
}: DowngradeConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const formattedDate = periodEndDate
    ? new Date(periodEndDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'the end of your billing cycle';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handled by parent toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-raised transition-colors"
          aria-label="Close"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight">
              Downgrade to {targetPlan.name}?
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Scheduled transition for next billing cycle
            </p>
          </div>
        </div>

        {/* Transition Details Box */}
        <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Current plan</span>
            <span className="font-semibold text-text-primary">{currentPlanName} (Active)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">New plan on next cycle</span>
            <span className="font-semibold text-accent">
              {targetPlan.name} ({targetPlan.priceCents === 0 ? 'Free' : `${formatINR(targetPlan.priceCents)}/mo`})
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-text-secondary">Effective date</span>
            <span className="font-bold text-text-primary">{formattedDate}</span>
          </div>
        </div>

        {/* Features retention notice */}
        <div className="space-y-2 text-xs sm:text-sm text-text-secondary">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <span>
              You will keep all your <strong>{currentPlanName}</strong> features until{' '}
              <strong>{formattedDate}</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <span>
              <strong>Your data is 100% safe:</strong> None of your existing tasks, projects, notes, or habits will ever be deleted.
            </span>
          </div>
        </div>

        {/* Data Safety Alert Box */}
        <div className="p-3.5 rounded-2xl bg-info-subtle/50 border border-info-border text-info text-xs space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            What happens if you're over the {targetPlan.name} limits?
          </p>
          <p className="leading-relaxed text-text-secondary">
            You can always view and edit everything you already created. You simply won't be able to create new items beyond {targetPlan.name} limits until you upgrade again.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            Keep {currentPlanName}
          </Button>
          <Button
            variant="warning"
            fullWidth
            loading={loading}
            onClick={handleConfirm}
          >
            Confirm Downgrade
          </Button>
        </div>
      </div>
    </div>
  );
}

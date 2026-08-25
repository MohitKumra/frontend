// frontend/src/components/billing/LockedFeatureWrapper.tsx
import React, { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { UpgradeModal } from './UpgradeModal';

interface LockedFeatureWrapperProps {
  children: React.ReactNode;
  isLocked: boolean;
  featureName: string;
  minPlanName?: string;
  variant?: 'overlay' | 'inline' | 'button';
  className?: string;
}

export function LockedFeatureWrapper({
  children,
  isLocked,
  featureName,
  minPlanName = 'Basic',
  variant = 'overlay',
  className = '',
}: LockedFeatureWrapperProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!isLocked) {
    return <>{children}</>;
  }

  if (variant === 'button') {
    return (
      <>
        <div
          onClick={() => setModalOpen(true)}
          className={`cursor-pointer inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity ${className}`}
        >
          {children}
          <span className="p-1 rounded-md bg-accent/10 border border-accent/20 text-accent">
            <Lock className="w-3 h-3" />
          </span>
        </div>
        <UpgradeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          highlightFeature={featureName}
        />
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <div
          onClick={() => setModalOpen(true)}
          className={`p-3 rounded-xl border border-dashed border-border bg-surface-raised/40 flex items-center justify-between gap-3 cursor-pointer hover:border-accent/40 transition-colors ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">{featureName}</p>
              <p className="text-[11px] text-text-muted">Available on {minPlanName} plan and above</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Upgrade
          </Button>
        </div>
        <UpgradeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          highlightFeature={featureName}
        />
      </>
    );
  }

  // Default: Overlay variant
  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        {/* Blurred Children */}
        <div className="pointer-events-none filter blur-[2px] opacity-40 select-none">
          {children}
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/85 backdrop-blur-xs p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">{featureName} Locked</h4>
            <p className="text-xs text-text-muted max-w-xs mt-0.5">
              This capability requires a {minPlanName} subscription or higher.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Unlock Feature
          </Button>
        </div>
      </div>

      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        highlightFeature={featureName}
      />
    </>
  );
}

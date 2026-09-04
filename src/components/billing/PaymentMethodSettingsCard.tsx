// frontend/src/components/billing/PaymentMethodSettingsCard.tsx
import React, { useState } from 'react';
import {
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Zap,
  Smartphone,
  Building2,
  Power,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useUserPlan } from '../../features/billing/useUserPlan';
import { useAuthStore } from '../../store/authStore';
import { formatINR } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

interface PaymentMethodSettingsCardProps {
  className?: string;
}

type ActionType = 'none' | 'turn_off' | 'turn_on' | 'update_method';

export function PaymentMethodSettingsCard({ className = '' }: PaymentMethodSettingsCardProps) {
  const {
    effectivePlan,
    subscription,
    paymentMethod,
    cancelSubscription,
    setupPaymentMethod,
    confirmPaymentMethod,
    refetch,
  } = useUserPlan();

  const user = useAuthStore((s) => s.user);

  // Distinct modal open states
  const [turnOffModalOpen, setTurnOffModalOpen] = useState(false);
  const [turnOnModalOpen, setTurnOnModalOpen] = useState(false);
  const [updateMethodModalOpen, setUpdateMethodModalOpen] = useState(false);

  // Independent button loading state
  const [loadingAction, setLoadingAction] = useState<ActionType>('none');

  const isPaid = effectivePlan.source === 'SUBSCRIPTION' && effectivePlan.status !== 'FREE';
  const isAutoPayActive = Boolean(
    isPaid &&
      subscription?.status === 'ACTIVE' &&
      subscription?.autoRenew === true &&
      !subscription?.cancelAtPeriodEnd
  );

  const nextRenewalDate = effectivePlan.expiresAt
    ? new Date(effectivePlan.expiresAt).toLocaleDateString('en-IN', {
        dateStyle: 'medium',
      })
    : 'period end';

  const renewalPrice = subscription?.plan?.priceCents
    ? formatINR(
        subscription.plan.priceCents +
          Math.round((subscription.plan.priceCents * (subscription.plan.gstPercent ?? 18)) / 100)
      )
    : 'standard rate';

  // Load Razorpay script on demand
  const ensureRazorpayLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Launch Razorpay to setup / update the mandate
  async function executeMandateFlow(action: 'turn_on' | 'update_method') {
    if (!subscription || !isPaid) {
      toast.error('You need an active subscription to update payment methods.');
      return;
    }

    setLoadingAction(action);
    try {
      const loaded = await ensureRazorpayLoaded();
      if (!loaded) {
        toast.error('Unable to load Razorpay payment gateway. Please check your connection.');
        setLoadingAction('none');
        return;
      }

      const setupData = await setupPaymentMethod();
      const options = {
        key: setupData.keyId,
        subscription_id: setupData.providerSubscriptionId,
        name: 'Finamite Productivity',
        description:
          action === 'turn_on'
            ? `Re-enable Auto-Pay for ${setupData.planName}`
            : `Update Payment Method for ${setupData.planName}`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: action === 'turn_on' ? '#10b981' : '#3b82f6',
        },
        modal: {
          ondismiss: () => {
            setLoadingAction('none');
          },
        },
        handler: async (response: any) => {
          try {
            await confirmPaymentMethod({
              razorpaySubscriptionId: response.razorpay_subscription_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success(
              action === 'turn_on'
                ? 'Auto-Pay successfully enabled for upcoming renewals!'
                : 'Payment method successfully updated!'
            );
            refetch();
          } catch (err: any) {
            toast.error(
              err?.response?.data?.error?.message ||
                'Failed to confirm new payment method. Please contact support.'
            );
          } finally {
            setLoadingAction('none');
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setLoadingAction('none');
        toast.error(resp?.error?.description || 'Mandate authorization failed.');
      });
      rzp.open();
    } catch (err: any) {
      setLoadingAction('none');
      toast.error(
        err?.response?.data?.error?.message || 'Failed to initialize payment method update.'
      );
    }
  }

  // Handle turning Auto-Pay OFF
  async function handleConfirmTurnOff() {
    setLoadingAction('turn_off');
    try {
      await cancelSubscription({ reason: 'User disabled auto-pay toggle' });
      setTurnOffModalOpen(false);
      toast.success(
        `Auto-Pay disabled. You retain full access to ${effectivePlan.planName} until ${nextRenewalDate}.`
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to turn off Auto-Pay');
    } finally {
      setLoadingAction('none');
    }
  }

  const renderPaymentMethodIcon = () => {
    const method = paymentMethod?.method;
    if (method === 'upi') return <Smartphone className="w-5 h-5 text-accent" />;
    if (method === 'netbanking') return <Building2 className="w-5 h-5 text-accent" />;
    return <CreditCard className="w-5 h-5 text-accent" />;
  };

  return (
    <>
      <Card variant="default" className={`overflow-hidden border-border/80 ${className}`}>
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-accent-subtle/50 text-accent shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-text-primary">
                  Payment Method & Auto-Pay
                </CardTitle>
                <p className="text-xs text-text-muted mt-0.5">
                  Configure recurring billing preferences and manage your payment instrument
                </p>
              </div>
            </div>
            {isPaid && (
              <Badge variant={isAutoPayActive ? 'success' : 'warning'} size="sm" dot>
                {isAutoPayActive ? 'AUTO-PAY ON' : 'AUTO-PAY OFF'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          {/* Row 1: Auto-Pay Toggle & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-raised border border-border">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text-primary">Recurring Auto-Pay</span>
                <span className="text-[11px] text-text-muted">
                  ({subscription?.billingInterval ? subscription.billingInterval.toLowerCase() + 'ly' : 'monthly'} renewal)
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {isPaid
                  ? isAutoPayActive
                    ? `Auto-Pay is active. Your subscription will renew automatically for ${renewalPrice} on ${nextRenewalDate}.`
                    : `Auto-Pay is off. Your current access continues until ${nextRenewalDate}, after which auto-debit will not occur.`
                  : 'You are currently on the Free plan. Choose any paid plan above to enable recurring features.'}
              </p>
            </div>

            {isPaid && (
              <div className="shrink-0 flex items-center gap-3">
                {isAutoPayActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={loadingAction === 'turn_off'}
                    disabled={loadingAction !== 'none'}
                    onClick={() => setTurnOffModalOpen(true)}
                    className="border-danger/30 text-danger hover:bg-danger/10 hover:border-danger/50 text-xs font-semibold"
                    leftIcon={<Power className="w-3.5 h-3.5" />}
                  >
                    Turn OFF Auto-Pay
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={loadingAction === 'turn_on'}
                    disabled={loadingAction !== 'none'}
                    onClick={() => setTurnOnModalOpen(true)}
                    className="text-xs font-semibold"
                    leftIcon={<Zap className="w-3.5 h-3.5" />}
                  >
                    Turn ON Auto-Pay
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Saved Payment Instrument */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-raised border border-border">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                {renderPaymentMethodIcon()}
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">
                  {paymentMethod?.summary || (isPaid ? 'Active Mandate (Razorpay)' : 'No Payment Method on File')}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {isPaid
                    ? isAutoPayActive
                      ? 'Used for upcoming scheduled renewal charges'
                      : 'Mandate is paused / will not be charged'
                    : 'Add a payment instrument by upgrading your workspace'}
                </p>
              </div>
            </div>

            {isPaid && (
              <div className="shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loadingAction === 'update_method'}
                  disabled={loadingAction !== 'none'}
                  onClick={() => setUpdateMethodModalOpen(true)}
                  className="text-xs font-semibold"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Update Payment Method
                </Button>
              </div>
            )}
          </div>

          {/* Security footnote */}
          <div className="flex items-center gap-2 text-[11px] text-text-muted pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
            <span>
              Mandates are securely processed and encrypted by Razorpay in compliance with RBI and NPCI guidelines.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modal 1: Confirmation for Turning OFF Auto-Pay */}
      <ConfirmModal
        open={turnOffModalOpen}
        title="Turn off Auto-Pay?"
        message={
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Are you sure you want to disable automatic recurring payments?
            </p>
            <div className="p-3.5 rounded-xl bg-surface-raised border border-border space-y-1.5 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Active Plan:</span>
                <span className="font-semibold text-text-primary">{effectivePlan.planName}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Current Access Active Until:</span>
                <span className="font-semibold text-text-primary">{nextRenewalDate}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Next Debit:</span>
                <span className="font-semibold text-danger">Cancelled (₹0)</span>
              </div>
            </div>
            <p className="text-xs text-text-muted">
              You will keep full access to all features until <strong className="text-text-primary">{nextRenewalDate}</strong>. After this date, your workspace will return to the Free tier without being debited.
            </p>
          </div>
        }
        confirmText="Turn off Auto-Pay"
        cancelText="Keep Auto-Pay On"
        destructive
        isLoading={loadingAction === 'turn_off'}
        onConfirm={handleConfirmTurnOff}
        onClose={() => setTurnOffModalOpen(false)}
      />

      {/* Modal 2: Confirmation for Turning ON Auto-Pay */}
      <ConfirmModal
        open={turnOnModalOpen}
        title="Enable Recurring Auto-Pay"
        message={
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Re-activate automatic renewals so your workspace features stay uninterrupted.
            </p>
            <div className="p-3.5 rounded-xl bg-surface-raised border border-border space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Plan:</span>
                <span className="font-semibold text-text-primary">{effectivePlan.planName}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Next Renewal Date:</span>
                <span className="font-semibold text-text-primary">{nextRenewalDate}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Renewal Amount:</span>
                <span className="font-semibold text-accent">{renewalPrice}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-accent-subtle/30 border border-accent/20 flex items-start gap-2 text-xs text-accent">
              <Zap className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You will authorize a recurring mandate on Razorpay. You will not be charged today; your first renewal debit occurs on {nextRenewalDate}.
              </span>
            </div>
          </div>
        }
        confirmText="Proceed to Set Up Mandate"
        cancelText="Cancel"
        isLoading={loadingAction === 'turn_on'}
        onConfirm={async () => {
          setTurnOnModalOpen(false);
          await executeMandateFlow('turn_on');
        }}
        onClose={() => setTurnOnModalOpen(false)}
      />

      {/* Modal 3: Confirmation for Updating Payment Method */}
      <ConfirmModal
        open={updateMethodModalOpen}
        title="Update Payment Method"
        message={
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Switch your active card or UPI payment method for upcoming subscription renewals.
            </p>
            <div className="p-3.5 rounded-xl bg-surface-raised border border-border space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Current Method on File:</span>
                <span className="font-semibold text-text-primary">
                  {paymentMethod?.summary || 'Active Mandate'}
                </span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Active Subscription:</span>
                <span className="font-semibold text-text-primary">{effectivePlan.planName}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Next Scheduled Charge:</span>
                <span className="font-semibold text-text-primary">{renewalPrice} on {nextRenewalDate}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-accent-subtle/30 border border-accent/20 flex items-start gap-2 text-xs text-accent">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Razorpay will authorize your new card or UPI mandate. Once verified, your previous mandate will be cancelled automatically so you are never double-billed.
              </span>
            </div>
          </div>
        }
        confirmText="Authorize New Payment Method"
        cancelText="Keep Current Method"
        isLoading={loadingAction === 'update_method'}
        onConfirm={async () => {
          setUpdateMethodModalOpen(false);
          await executeMandateFlow('update_method');
        }}
        onClose={() => setUpdateMethodModalOpen(false)}
      />
    </>
  );
}

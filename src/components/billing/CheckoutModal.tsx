// frontend/src/components/billing/CheckoutModal.tsx
// Full checkout review screen: shows the selected plan, allows applying a
// coupon, displays a transparent bill summary (plan price → discount → final
// amount), and only then opens Razorpay to collect payment.

import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Lock,
  CreditCard,
  Check,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useUserPlan, type PlanDTO } from '../../features/billing/useUserPlan';
import { formatINR } from '../../utils/formatCurrency';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The plan the user picked in the previous (plan selection) step. */
  plan: PlanDTO | null;
  /** Optional callback to go back to plan selection without closing the flow. */
  onBack?: () => void;
  /** Optional feature name to highlight in the success toast. */
  highlightFeature?: string;
}

interface AppliedCoupon {
  couponCode: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  discountCents: number;
}

/**
 * Format a coupon discount for display, e.g. "20% off" or "₹199 off".
 */
function describeCoupon(coupon: AppliedCoupon): string {
  if (coupon.discountType === 'PERCENTAGE') {
    return `${coupon.discountValue}% off`;
  }
  return `${formatINR(coupon.discountCents)} off`;
}

export function CheckoutModal({ isOpen, onClose, plan, onBack, highlightFeature }: CheckoutModalProps) {
  const { applyCoupon, createCheckout, verifyPayment, refetch, effectivePlan } = useUserPlan();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset local state every time the modal opens for a new plan so the user
  // never sees a stale coupon from a previous plan session.
  useEffect(() => {
    if (!isOpen) return;
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError(null);
    setIsProcessing(false);
  }, [isOpen, plan?.id]);

  // ── Bill math ─────────────────────────────────────────────────────────
  const planPriceCents = plan?.priceCents ?? 0;
  const discountCents = appliedCoupon?.discountCents ?? 0;
  const taxableCents = Math.max(0, planPriceCents - discountCents);
  // No tax in India for sub-₹50L SaaS B2C; show "Tax" row as ₹0 for transparency
  // and so the user can manually verify totals.
  const taxCents = 0;
  const finalCents = taxableCents + taxCents;

  const hasFreeAccess =
    !!plan && plan.priceCents === 0 && effectivePlan.planSlug === 'free';

  async function handleApplyCoupon() {
    if (!plan) return;
    const code = couponCode.trim();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const data = await applyCoupon({ code, planId: plan.id });
      // Backend returns: { couponCode, discountType, discountValue, discountCents }
      setAppliedCoupon({
        couponCode: data.couponCode ?? code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountCents: data.discountCents,
      });
      toast.success(`Coupon "${code.toUpperCase()}" applied!`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.response?.data?.error?.message || 'Invalid or expired coupon');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
  }

  async function handleProceedToPayment() {
    if (!plan) return;
    if (plan.priceCents === 0) {
      // Free plan: nothing to pay — just close and let the parent refresh.
      toast.success(`You're on the ${plan.name} plan.`);
      refetch();
      onClose();
      return;
    }
    setIsProcessing(true);
    try {
      const checkoutRes = await createCheckout({
        planId: plan.id,
        couponCode: appliedCoupon ? appliedCoupon.couponCode : undefined,
      });

      const { providerOrderId, keyId, amountCents, noPaymentRequired } = checkoutRes;
      // Sanity check: the amount the backend computed must match our bill.
      if (typeof amountCents === 'number' && amountCents !== finalCents) {
        console.warn(
          `Checkout amount mismatch: UI=${finalCents}, backend=${amountCents}. Using backend value.`
        );
      }

      // A bill of ₹0 (e.g. plan fully discounted by a coupon) requires no
      // charge — never open the Razorpay checkout for it (Razorpay rejects
      // zero-amount orders and would show a broken login prompt). Complete the
      // grant through the same verify path used by the offline/mock fallback.
      if (noPaymentRequired || Number(amountCents) === 0) {
        await verifyPayment({
          razorpayOrderId: providerOrderId,
          razorpayPaymentId: `pay_free_${Date.now()}`,
          razorpaySignature: 'sig_mock_verified',
        });
        toast.success(`🎉 ${plan.name} activated with a ₹0 bill.`);
        refetch();
        onClose();
        return;
      }

      // Load Razorpay script if not present.
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: keyId || 'rzp_test_dummy',
        amount: amountCents,
        currency: plan.currency || 'INR',
        name: 'Finamite PMS',
        description: `${plan.name} Plan${
          appliedCoupon ? ` (Coupon ${appliedCoupon.couponCode})` : ''
        }`,
        order_id: providerOrderId,
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id || providerOrderId,
              razorpayPaymentId:
                response.razorpay_payment_id || `pay_mock_${Date.now()}`,
              razorpaySignature:
                response.razorpay_signature || 'sig_mock_verified',
            });
            toast.success(`🎉 Payment successful! Welcome to ${plan.name}.`);
            refetch();
            onClose();
          } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || 'Payment verification failed');
          }
        },
        theme: { color: '#8b5cf6' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast('Payment cancelled. Your plan was not changed.', { icon: 'ℹ️' });
          },
        },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          toast.error(response.error?.description || 'Payment failed');
        });
        rzp.open();
      } else {
        // Mock fallback (offline / dummy env).
        await verifyPayment({
          razorpayOrderId: providerOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'sig_mock_verified',
        });
        toast.success(`🎉 Payment successful! Welcome to ${plan.name}.`);
        refetch();
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to initialize checkout');
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isOpen || !plan) return null;

  const billingLabel = plan.billingInterval === 'YEAR' ? '/year' : '/month';
  const showUpgradeHint = !!highlightFeature;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-raised transition-colors"
          aria-label="Close checkout"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle border border-accent-border text-accent text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Checkout</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Review your order
          </h2>
          <p className="text-sm text-text-muted">
            {showUpgradeHint ? (
              <span className="text-accent font-medium">
                {highlightFeature} requires an upgraded plan. Confirm the details below
                to proceed to payment.
              </span>
            ) : (
              'Confirm the plan, apply any coupon, and proceed to secure payment.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
          {/* ── Left: Plan + Coupon ─────────────────────────────── */}
          <div className="space-y-4">
            {/* Plan card */}
            <div className="p-5 rounded-2xl border border-accent-border bg-accent-subtle/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent text-text-onaccent shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Selected plan
                    </p>
                    <h3 className="text-lg font-extrabold text-text-primary leading-tight">
                      {plan.name}
                    </h3>
                  </div>
                </div>
                {onBack && (
                  <Button variant="ghost" size="sm" onClick={onBack}>
                    Change
                  </Button>
                )}
              </div>
              {plan.description && (
                <p className="text-xs text-text-muted leading-relaxed">{plan.description}</p>
              )}

              {/* Quick features preview */}
              <ul className="grid grid-cols-2 gap-2 pt-1">
                {plan.features?.aiRequestsPerMonth !== undefined && (
                  <li className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Check className="w-3 h-3 text-accent shrink-0" />
                    {plan.features.aiRequestsPerMonth} AI requests/mo
                  </li>
                )}
                {plan.features?.habits !== undefined && (
                  <li className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Check className="w-3 h-3 text-accent shrink-0" />
                    {plan.features.habits} habits
                  </li>
                )}
                {plan.features?.projects !== undefined && (
                  <li className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Check className="w-3 h-3 text-accent shrink-0" />
                    {plan.features.projects} projects
                  </li>
                )}
                {plan.features?.tasks !== undefined && (
                  <li className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Check className="w-3 h-3 text-accent shrink-0" />
                    {plan.features.tasks} tasks
                  </li>
                )}
                {plan.features?.notionSync && (
                  <li className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Check className="w-3 h-3 text-accent shrink-0" />
                    Notion sync
                  </li>
                )}
                {plan.features?.voiceNotes && (
                  <li className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Check className="w-3 h-3 text-accent shrink-0" />
                    Voice notes
                  </li>
                )}
              </ul>
            </div>

            {/* Coupon */}
            <div className="p-5 rounded-2xl border border-border bg-surface-raised space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" />
                <p className="text-sm font-bold text-text-primary">Have a coupon code?</p>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-success/10 border border-success/20 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-success truncate">
                        {appliedCoupon.couponCode} — {describeCoupon(appliedCoupon)}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        You save {formatINR(appliedCoupon.discountCents)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-text-muted hover:text-text-primary text-[11px] underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    placeholder="e.g. LAUNCH20"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      if (couponError) setCouponError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded-xl text-xs font-mono text-text-primary placeholder:text-text-muted uppercase focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    loading={couponLoading}
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim()}
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && (
                <div className="flex items-center gap-1.5 text-[11px] text-danger">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{couponError}</span>
                </div>
              )}
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Payments are processed securely by Razorpay. We never store your card details.</span>
            </div>
          </div>

          {/* ── Right: Bill summary ─────────────────────────────── */}
          <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Receipt className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-extrabold text-text-primary">Bill summary</h3>
            </div>

            <div className="space-y-2.5 text-sm">
              {/* Plan price */}
              <div className="flex items-baseline justify-between">
                <span className="text-text-muted">
                  {plan.name} plan{billingLabel ? ` (${plan.billingInterval === 'YEAR' ? 'annual' : 'monthly'})` : ''}
                </span>
                <span className="font-bold text-text-primary">
                  {planPriceCents === 0 ? 'Free' : formatINR(planPriceCents)}
                </span>
              </div>

              {/* Discount line (only when applied) */}
              {appliedCoupon && (
                <div className="flex items-baseline justify-between">
                  <span className="text-text-muted flex items-center gap-1.5">
                    Coupon discount
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-success/10 text-success">
                      {appliedCoupon.couponCode}
                    </span>
                  </span>
                  <span className="font-bold text-success">−{formatINR(discountCents)}</span>
                </div>
              )}

              {/* Subtotal after discount */}
              {appliedCoupon && planPriceCents > 0 && (
                <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="font-semibold text-text-primary">{formatINR(taxableCents)}</span>
                </div>
              )}

              {/* Tax row — shown for transparency (0 today for sub-₹50L B2C SaaS) */}
              {planPriceCents > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-text-muted">Tax (GST)</span>
                  <span className="font-semibold text-text-secondary">{formatINR(taxCents)}</span>
                </div>
              )}
            </div>

            {/* Final amount */}
            <div className="pt-3 border-t border-border space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-text-primary">Total payable</span>
                <span className="text-2xl font-extrabold text-accent">
                  {planPriceCents === 0 ? 'Free' : formatINR(finalCents)}
                </span>
              </div>
              {planPriceCents > 0 && (
                <p className="text-[11px] text-text-muted text-right">
                  Billed {plan.billingInterval === 'YEAR' ? 'annually' : 'monthly'}, auto-renews until cancelled.
                </p>
              )}
              {appliedCoupon && (
                <p className="text-[11px] text-success text-right">
                  You save {formatINR(discountCents)} on this order
                </p>
              )}
            </div>

            {/* Action button */}
            <Button
              variant="primary"
              size="md"
              className="w-full"
              loading={isProcessing}
              onClick={handleProceedToPayment}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              {hasFreeAccess
                ? 'Switch to Free'
                : planPriceCents === 0
                ? 'Continue with Free plan'
                : `Pay ${formatINR(finalCents)} with Razorpay`}
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-[10px] text-text-muted text-center leading-relaxed">
              By continuing you agree to our Terms of Service and authorize the charge above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

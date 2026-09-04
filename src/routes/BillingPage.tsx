import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
  Tag,
  Receipt,
  Clock3,
  Building2,
  MapPin,
  Mail,
  Wand2,
  Monitor,
  X,
  PauseCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import apiClient from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { APP_NAME, SUPPORT_EMAIL } from '../config/brand';
import { Input } from '../components/ui/Input';
import { PlanCard } from '../components/billing/PlanCard';
import { DowngradeConfirmModal } from '../components/billing/DowngradeConfirmModal';
import { PaymentMethodSettingsCard } from '../components/billing/PaymentMethodSettingsCard';
import { useUserPlan, useUpgradePreview, type PlanDTO } from '../features/billing/useUserPlan';
import { useUpgradeModalStore } from '../store/upgradeModalStore';
import { useCustomPlanModalStore } from '../store/customPlanModalStore';
import { InvoicePreview, type InvoicePreviewData } from '../features/billing/InvoicePreview';
import { fetchMyCustomPlanRequests, type CustomPlanRequestDTO } from '../features/customPlan/customPlanApi';
import { PaymentVerifyingModal } from '../components/billing/PaymentVerifyingModal';
import { formatINR } from '../utils/formatCurrency';
import { useMediaQuery } from '../hooks/useMediaQuery';

function baseTierOf(slug: string): string {
  return slug.endsWith('_yearly') ? slug.slice(0, -'_yearly'.length) : slug;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    REVIEWING: 'Under review',
    QUOTED: 'Quote ready',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };
  return map[status] || status;
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
    PENDING: 'default',
    REVIEWING: 'accent',
    QUOTED: 'info',
    ACCEPTED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'default',
  };
  return map[status] || 'default';
}

function changeSummary(req: CustomPlanRequestDTO): string {
  const limitCount = Object.keys(req.requestedLimits || {}).length;
  const featureCount = Object.keys(req.requestedFeatures || {}).length;
  const parts: string[] = [];
  if (limitCount) parts.push(`${limitCount} limit${limitCount > 1 ? 's' : ''}`);
  if (featureCount) parts.push(`${featureCount} feature${featureCount > 1 ? 's' : ''}`);
  return parts.length ? parts.join(' + ') : 'Reach out to our team';
}

export function BillingPage() {
  const { user } = useAuthStore();
  const {
    plans,
    effectivePlan,
    subscription,
    invoices,
    transactions,
    company,
    billingProfile,
    applyCoupon,
    createCheckout,
    verifyPayment,
    updateBillingProfile,
    downgradeSubscription,
    cancelScheduledDowngrade,
    refetch,
  } =
    useUserPlan();

  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [desktopModalOpen, setDesktopModalOpen] = useState(isMobile);
  const [billingCycle, setBillingCycle] = useState<'MONTH' | 'YEAR' | 'CUSTOM'>('MONTH');
  const [mobileTab, setMobileTab] = useState<'plans' | 'invoices'>('plans');
  const openCustomPlan = useCustomPlanModalStore((s) => s.openCustomPlan);
  const [selectedPlan, setSelectedPlan] = useState<PlanDTO | null>(null);
  const [downgradeTargetPlan, setDowngradeTargetPlan] = useState<PlanDTO | null>(null);
  const { data: upgradePreview } = useUpgradePreview(selectedPlan?.id);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponCode: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    discountCents: number;
  } | null>(null);
  const [paymentMode, setPaymentMode] = useState<'ONE_TIME' | 'SUBSCRIPTION_INITIAL'>('SUBSCRIPTION_INITIAL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string | null>(null);
  const [savingBillingProfile, setSavingBillingProfile] = useState(false);
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    status: 'verifying' | 'success' | 'error';
    planName?: string;
    errorMessage?: string;
  }>({
    isOpen: false,
    status: 'verifying',
  });
  const [billingDraft, setBillingDraft] = useState({
    billingCompanyName: '',
    billingEmail: '',
    billingPhone: '',
    billingAddressLine1: '',
    billingCityState: '',
    billingPostalCode: '',
    billingCountry: 'India',
    billingGstin: '',
  });
  const [customPlanRequests, setCustomPlanRequests] = useState<CustomPlanRequestDTO[]>([]);

  // In-app tracking of custom plan requests (status + history) alongside billing.
  useEffect(() => {
    let cancelled = false;
    fetchMyCustomPlanRequests()
      .then((data) => {
        if (!cancelled) setCustomPlanRequests(data);
      })
      .catch(() => {
        /* non-fatal — the card simply shows empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const paidPlans = useMemo(
    () =>
      billingCycle === 'CUSTOM'
        ? []
        : plans.filter((plan) => plan.priceCents > 0 && plan.billingInterval === billingCycle),
    [plans, billingCycle]
  );

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) || invoices[0] || null,
    [invoices, selectedInvoiceId]
  );

  // When the user picks a plan from an Upgrade modal, that plan is carried here
  // (via useUpgradeModalStore.pendingPlan) so this page opens with it preselected.
  const pendingPlan = useUpgradeModalStore((s) => s.pendingPlan);
  const clearPendingPlan = useUpgradeModalStore((s) => s.clearPendingPlan);

  const routeState = (location.state as { preselectedPlanId?: string; source?: string } | null) || null;

  // Apply the pending (pre-selected) plan once the plans list is available, and
  // set the monthly/annual toggle to match its billing interval. This supports
  // both the global store handoff and the direct route-state handoff from the
  // upgrade modal.
  useEffect(() => {
    const targetPlanId = pendingPlan?.id || routeState?.preselectedPlanId;
    if (!targetPlanId) return;

    const match = plans.find((p) => p.id === targetPlanId) || pendingPlan || null;
    if (!match) return;

    setBillingCycle(match.billingInterval === 'YEAR' ? 'YEAR' : 'MONTH');
    setSelectedPlan(match);

    if (pendingPlan) clearPendingPlan();
  }, [pendingPlan, routeState, plans, clearPendingPlan]);

  useEffect(() => {
    if (!selectedPlan && paidPlans.length > 0) {
      setSelectedPlan(paidPlans[0]);
    }
  }, [paidPlans, selectedPlan]);

  useEffect(() => {
    setCheckoutIdempotencyKey(null);
  }, [selectedPlan?.id, appliedCoupon?.couponCode, paymentMode]);

  useEffect(() => {
    setBillingDraft({
      billingCompanyName: billingProfile.companyName || '',
      billingEmail: billingProfile.email || user?.email || '',
      billingPhone: billingProfile.phone || '',
      billingAddressLine1: billingProfile.addressLines[0] || '',
      billingCityState: billingProfile.cityState || '',
      billingPostalCode: billingProfile.postalCode || '',
      billingCountry: billingProfile.country || 'India',
      billingGstin: billingProfile.gstin || '',
    });
  }, [billingProfile, user?.email]);

  async function handleApplyCoupon() {
    if (!selectedPlan) return;
    const code = couponCode.trim();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const data = await applyCoupon({ code, planId: selectedPlan.id });
      setAppliedCoupon({
        couponCode: data.couponCode ?? code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountCents: data.discountCents,
      });
      setCheckoutIdempotencyKey(null);
      toast.success(`Coupon "${code.toUpperCase()}" applied`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.response?.data?.error?.message || 'Invalid or expired coupon');
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleSaveBillingProfile() {
    setSavingBillingProfile(true);
    try {
      await updateBillingProfile({
        billingCompanyName: billingDraft.billingCompanyName.trim() || null,
        billingEmail: billingDraft.billingEmail.trim() || null,
        billingPhone: billingDraft.billingPhone.trim() || null,
        billingAddressLine1: billingDraft.billingAddressLine1.trim() || null,
        billingCityState: billingDraft.billingCityState.trim() || null,
        billingPostalCode: billingDraft.billingPostalCode.trim() || null,
        billingCountry: billingDraft.billingCountry.trim() || null,
        billingGstin: billingDraft.billingGstin.trim() || null,
      });
      toast.success('Billing details saved');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save billing details');
    } finally {
      setSavingBillingProfile(false);
    }
  }

  async function openInvoicePdf(invoiceId: string) {
    const token = useAuthStore.getState().accessToken;
    const backendBase = import.meta.env.VITE_BACKEND_URL || '';
    const directUrl = `${backendBase}/billing/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token || '')}`;
    window.open(directUrl, '_blank');
  }

  async function downloadInvoicePdf(invoiceId: string, invoiceNumber: string) {
    const response = await apiClient.get(`/billing/invoices/${invoiceId}/pdf?download=1`, { responseType: 'blob' });
    if (response.data.type && response.data.type.includes('json')) {
      const text = await response.data.text();
      let msg = 'Failed to download invoice PDF';
      try {
        const parsed = JSON.parse(text);
        msg = parsed.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  async function handleCancelScheduledDowngrade() {
    try {
      await cancelScheduledDowngrade();
      toast.success('Scheduled downgrade cancelled. Auto-renewal for your current plan restored.');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to cancel scheduled downgrade');
    }
  }

  async function handleCheckout() {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      const idempotencyKey =
        checkoutIdempotencyKey ||
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
      setCheckoutIdempotencyKey(idempotencyKey);

      const checkoutRes = await createCheckout({
        planId: selectedPlan.id,
        couponCode: appliedCoupon?.couponCode,
        type: paymentMode,
        idempotencyKey,
      });

      const { providerOrderId, providerSubscriptionId, isSubscription, keyId, amountCents, noPaymentRequired, offerId } = checkoutRes;
      const isSub = Boolean(isSubscription || providerSubscriptionId);

      if (noPaymentRequired || Number(amountCents) === 0) {
        setVerificationModal({
          isOpen: true,
          status: 'verifying',
          planName: selectedPlan.name,
        });
        try {
          await verifyPayment({
            razorpayOrderId: isSub ? undefined : providerOrderId,
            razorpaySubscriptionId: isSub ? (providerSubscriptionId || providerOrderId) : undefined,
            razorpayPaymentId: `pay_free_${Date.now()}`,
            razorpaySignature: 'sig_mock_verified',
          });
          setVerificationModal({
            isOpen: true,
            status: 'success',
            planName: selectedPlan.name,
          });
          toast.success(`Plan activated: ${selectedPlan.name}`);
          refetch();
          return;
        } catch (err: any) {
          setVerificationModal({
            isOpen: true,
            status: 'error',
            planName: selectedPlan.name,
            errorMessage: err?.response?.data?.error?.message || 'Failed to activate plan',
          });
          return;
        }
      }

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.body.appendChild(script);
        });
      }

      const options: any = {
        key: keyId || 'rzp_test_dummy',
        amount: amountCents,
        currency: selectedPlan.currency || 'INR',
        name: company.name,
        description: `${selectedPlan.name} plan`,
        ...(isSub
          ? {
              subscription_id: providerSubscriptionId || providerOrderId,
              ...(offerId ? { offer_id: offerId } : {}),
            }
          : { order_id: providerOrderId }),
        handler: async (response: any) => {
          setVerificationModal({
            isOpen: true,
            status: 'verifying',
            planName: selectedPlan.name,
          });
          try {
            await verifyPayment({
              razorpayOrderId: isSub ? undefined : (response.razorpay_order_id || providerOrderId),
              razorpaySubscriptionId: isSub
                ? (response.razorpay_subscription_id || providerSubscriptionId || providerOrderId)
                : undefined,
              razorpayPaymentId: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
              razorpaySignature: response.razorpay_signature || 'sig_mock_verified',
            });
            setVerificationModal({
              isOpen: true,
              status: 'success',
              planName: selectedPlan.name,
            });
            toast.success(`Plan activated: ${selectedPlan.name}`);
            refetch();
          } catch (err: any) {
            setVerificationModal({
              isOpen: true,
              status: 'error',
              planName: selectedPlan.name,
              errorMessage:
                err?.response?.data?.error?.message ||
                'Payment received, but verification took longer than expected. Your subscription will sync shortly.',
            });
          }
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
        theme: { color: '#0f766e' },
      };

      if ((window as any).Razorpay && keyId && !keyId.startsWith('rzp_test_dummy')) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          toast.error(response.error?.description || 'Payment failed');
          setIsProcessing(false);
        });
        rzp.open();
      } else if (keyId?.startsWith('rzp_test_dummy')) {
        setVerificationModal({
          isOpen: true,
          status: 'verifying',
          planName: selectedPlan.name,
        });
        try {
          await verifyPayment({
            razorpayOrderId: isSub ? undefined : providerOrderId,
            razorpaySubscriptionId: isSub ? (providerSubscriptionId || providerOrderId) : undefined,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: 'sig_mock_verified',
          });
          setVerificationModal({
            isOpen: true,
            status: 'success',
            planName: selectedPlan.name,
          });
          toast.success(`Payment successful for ${selectedPlan.name}`);
          refetch();
        } catch (err: any) {
          setVerificationModal({
            isOpen: true,
            status: 'error',
            planName: selectedPlan.name,
            errorMessage: err?.response?.data?.error?.message || 'Verification failed',
          });
        }
      } else if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          toast.error(response.error?.description || 'Payment failed');
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        throw new Error('Razorpay Checkout failed to load. Please check your internet connection or disable adblockers.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to initialize checkout');
    } finally {
      setIsProcessing(false);
    }
  }

  const selectedInvoicePlanName = selectedInvoice?.subscription?.plan?.name || selectedInvoice?.order?.id || 'Plan purchase';
  const previewPlan = selectedPlan || plans.find((plan) => plan.id === pendingPlan?.id) || null;
  const useSelectedPlanPreview = Boolean(previewPlan);
  const previewInvoiceSubtotal = previewPlan ? previewPlan.priceCents : selectedInvoice?.subtotalCents || 0;
  const previewDiscountCents = useSelectedPlanPreview ? (appliedCoupon?.discountCents || 0) : selectedInvoice?.discountCents || 0;
  const previewTaxCents = previewPlan
    ? Math.round(((previewInvoiceSubtotal - previewDiscountCents) * previewPlan.gstPercent) / 100)
    : selectedInvoice?.taxCents || 0;
  const previewCgstCents = previewPlan
    ? Math.floor(previewTaxCents / 2)
    : selectedInvoice?.cgstCents || 0;
  const previewSgstCents = previewPlan
    ? previewTaxCents - previewCgstCents
    : selectedInvoice?.sgstCents || 0;
  const previewIgstCents = previewPlan ? 0 : selectedInvoice?.igstCents || 0;
  const previewTotalCents = previewPlan
    ? previewInvoiceSubtotal - previewDiscountCents + previewTaxCents
    : selectedInvoice?.totalCents || 0;

  const billToName = billingDraft.billingCompanyName || billingProfile.companyName || user?.name || user?.email?.split('@')[0] || 'Customer';
  const billToLines = [
    billingDraft.billingAddressLine1 || billingProfile.addressLines[0],
    billingDraft.billingCityState || billingProfile.addressLines[1],
    [billingDraft.billingPostalCode, billingDraft.billingCountry]
      .filter(Boolean)
      .join(', '),
    billingDraft.billingGstin || billingProfile.gstin ? `GSTIN: ${billingDraft.billingGstin || billingProfile.gstin}` : '',
  ].filter(Boolean) as string[];

  // Exact-invoice preview data (mirrors backend buildInvoiceHtml inputs).
  const customerLines = [
    billingProfile.email || user?.email || '',
    ...billToLines,
  ].filter(Boolean) as string[];
  const customerShipLines = [
    ...billToLines,
  ].filter(Boolean) as string[];
  const previewNextDate = selectedInvoice?.subscription?.currentPeriodEnd || subscription?.currentPeriodEnd;
  const previewData: InvoicePreviewData = {
    company,
    customerName: billToName,
    customerLines,
    customerShipLines,
    invoice: useSelectedPlanPreview
      ? {
          invoiceNumber: 'DRAFT',
          status: 'PENDING',
          currency: previewPlan?.currency || 'INR',
          subtotalCents: previewInvoiceSubtotal,
          discountCents: previewDiscountCents,
          taxCents: previewTaxCents,
          cgstCents: previewCgstCents,
          sgstCents: previewSgstCents,
          igstCents: previewIgstCents,
          sac: company.gstin ? '9983' : '9983',
          totalCents: previewTotalCents,
        }
      : selectedInvoice
        ? {
            invoiceNumber: selectedInvoice.invoiceNumber,
            status: selectedInvoice.status,
            currency: selectedInvoice.currency,
            subtotalCents: selectedInvoice.subtotalCents,
            discountCents: selectedInvoice.discountCents,
            taxCents: selectedInvoice.taxCents,
            cgstCents: selectedInvoice.cgstCents || 0,
            sgstCents: selectedInvoice.sgstCents || 0,
            igstCents: selectedInvoice.igstCents || 0,
            sac: selectedInvoice.sac,
            totalCents: selectedInvoice.totalCents,
          }
        : {
            invoiceNumber: 'DRAFT',
            status: 'PENDING',
            currency: 'INR',
            subtotalCents: 0,
            discountCents: 0,
            taxCents: 0,
            cgstCents: 0,
            sgstCents: 0,
            igstCents: 0,
            sac: '9983',
            totalCents: 0,
          },
    issuedAtLabel: selectedInvoice ? new Date(selectedInvoice.issuedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    nextInvoiceLabel: previewNextDate ? new Date(previewNextDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Not set',
    planName: previewPlan?.name || selectedInvoicePlanName,
    paymentMode: previewPlan ? (paymentMode === 'SUBSCRIPTION_INITIAL' ? 'Auto-pay' : 'One-time') : (selectedInvoice?.subscription?.autoRenew ?? subscription?.autoRenew) ? 'Auto-pay' : 'No payment required',
    subscriptionRef: selectedInvoice?.subscription?.id || subscription?.id || 'draft-subscription',
    paymentRef: selectedInvoice?.transactions?.[0]?.providerPaymentId || 'pay_preview',
  };

  // --- Section 1: Choose a plan ---
  const renderPlansSection = () => (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-accent" />
            <CardTitle>Choose a plan</CardTitle>
          </div>
          {selectedPlan && (
            <Badge variant="accent" size="sm">
              Selected: {selectedPlan.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="inline-flex items-center rounded-2xl bg-surface-raised border border-border p-1">
          {(['MONTH', 'YEAR', 'CUSTOM'] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => {
                setBillingCycle(cycle);
                if (cycle === 'CUSTOM') setSelectedPlan(null);
              }}
              className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                billingCycle === cycle
                  ? 'bg-accent text-text-onaccent shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {cycle === 'MONTH' ? 'Monthly' : cycle === 'YEAR' ? 'Annual' : 'Custom'}
            </button>
          ))}
        </div>

        {billingCycle === 'CUSTOM' ? (
          <div className="w-full max-w-md mx-auto flex flex-col rounded-2xl bg-surface border border-dashed border-accent/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-1.5 w-full" style={{ background: 'var(--gradient-accent)' }} />
            <div className="flex flex-col items-center text-center p-6 sm:p-8">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full shrink-0 bg-accent-subtle text-accent border border-accent-border">
                <Wand2 className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-extrabold text-text-primary mt-4 tracking-tight">Custom</h3>
              <p className="text-[13px] text-text-muted mt-1.5 leading-snug">
                Build a plan around exactly what you need.
              </p>
              <div className="h-px bg-border my-5 w-full" />
              <ul className="space-y-3 flex-1 w-full">
                {['Higher limits', 'Additional features', 'Guidance from our team'].map((label) => (
                  <li key={label} className="flex items-center justify-center gap-2.5 text-[13.5px] text-text-primary font-medium">
                    <Sparkles className="w-4 h-4 shrink-0 text-accent" strokeWidth={2.5} />
                    {label}
                  </li>
                ))}
              </ul>
              <Button fullWidth className="mt-6 h-11 sm:h-12" onClick={openCustomPlan} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Build your custom plan
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paidPlans.map((plan) => {
              const isCurrent = effectivePlan.planSlug !== 'free' && baseTierOf(effectivePlan.planSlug) === baseTierOf(plan.slug);
              
              const activePrice = subscription?.plan?.priceCents || 0;
              const startMs = subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).getTime() : 0;
              const endMs = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : 0;
              const totalDurationMs = Math.max(1, endMs - startMs);
              const remainingMs = Math.max(0, endMs - Date.now());
              const unusedRatio = Math.min(1, Math.max(0, remainingMs / totalDurationMs));
              const rawCredit = Math.round(activePrice * unusedRatio);
              const isUpgrade = Boolean(subscription?.status === 'ACTIVE' && activePrice > 0 && plan.priceCents > activePrice);
              const isDowngrade = Boolean(subscription?.status === 'ACTIVE' && activePrice > 0 && plan.priceCents < activePrice && !isCurrent);
              const creditApplied = isUpgrade ? Math.min(plan.priceCents, rawCredit) : 0;
              const taxable = Math.max(0, plan.priceCents - creditApplied);
              const totalWithGst = taxable + Math.round((taxable * (plan.gstPercent ?? 18)) / 100);

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={isCurrent}
                  isPopular={baseTierOf(plan.slug) === 'premium'}
                  isDowngrade={isDowngrade}
                  disabled={subscription?.status === 'PAUSED'}
                  disabledLabel="Billing Paused"
                  upgradeProration={
                    isUpgrade && creditApplied > 0
                      ? {
                          isUpgrade: true,
                          proratedCreditCents: creditApplied,
                          taxableCents: taxable,
                          totalCents: totalWithGst,
                          currentPlanName: subscription?.plan?.name,
                        }
                      : null
                  }
                  onSelect={(p) => {
                    setSelectedPlan(p);
                  }}
                  onDowngrade={(p) => {
                    setDowngradeTargetPlan(p);
                  }}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // --- Section 2: Invoice Preview ---
  const renderPreviewSection = () => (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            <CardTitle>Invoice preview</CardTitle>
          </div>
          {previewPlan && (
            <span className="text-xs font-semibold text-text-muted">
              Previewing: {previewPlan.name}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <InvoicePreview data={previewData} />
      </CardContent>
    </Card>
  );

  // --- Section 3: Bill to details ---
  const renderBillToSection = () => (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" />
          <CardTitle>Bill to details</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Input
            value={billingDraft.billingCompanyName}
            onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingCompanyName: e.target.value }))}
            placeholder="Company / billing name"
          />
          <Input
            value={billingDraft.billingEmail}
            onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingEmail: e.target.value }))}
            placeholder="Billing email"
          />
          <Input
            value={billingDraft.billingPhone}
            onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingPhone: e.target.value }))}
            placeholder="Phone number"
          />
          <Input
            value={billingDraft.billingAddressLine1}
            onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingAddressLine1: e.target.value }))}
            placeholder="Address line 1"
          />
          <Input
            value={billingDraft.billingCityState}
            onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingCityState: e.target.value }))}
            placeholder="City, State"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={billingDraft.billingPostalCode}
              onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingPostalCode: e.target.value }))}
              placeholder="Postal code"
            />
            <Input
              value={billingDraft.billingCountry}
              onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingCountry: e.target.value }))}
              placeholder="Country"
            />
          </div>
          <Input
            value={billingDraft.billingGstin}
            onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingGstin: e.target.value }))}
            placeholder="GSTIN"
          />
        </div>
        <Button
          variant="secondary"
          fullWidth
          loading={savingBillingProfile}
          onClick={handleSaveBillingProfile}
          leftIcon={<ShieldCheck className="w-4 h-4" />}
        >
          Save billing details
        </Button>
        <p className="text-[11px] text-text-muted">
          These details are stored in the backend and reused for invoice PDFs and email receipts.
        </p>
      </CardContent>
    </Card>
  );

  // --- Section 4: Checkout Card ---
  const renderCheckoutSection = () => (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-accent" />
          <CardTitle>Checkout</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-secondary">Plan</label>
          <div className="rounded-2xl border border-border bg-surface-raised p-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-text-primary">{selectedPlan?.name || 'Select a plan'}</p>
              <p className="text-xs text-text-muted">
                {selectedPlan ? `${formatINR(selectedPlan.priceCents)} ${selectedPlan.billingInterval === 'YEAR' ? '/ year' : '/ month'}` : 'Pick a paid plan to get started'}
              </p>
            </div>
            {!selectedPlan && (
              <Button size="sm" variant="secondary" onClick={() => setMobileTab('plans')}>
                View plans
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-secondary">Coupon</label>
          <div className="flex gap-2">
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH20"
            />
            <Button variant="secondary" loading={couponLoading} onClick={handleApplyCoupon}>
              Apply
            </Button>
          </div>
          {couponError && <p className="text-xs text-danger">{couponError}</p>}
          {appliedCoupon && (
            <div className="text-xs text-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {appliedCoupon.couponCode} applied
            </div>
          )}
        </div>

        {(() => {
          const isUpgrade = Boolean(
            upgradePreview?.isUpgrade &&
              upgradePreview?.proratedCreditCents &&
              upgradePreview.proratedCreditCents > 0
          );
          const prorationCredit = isUpgrade ? (upgradePreview?.proratedCreditCents || 0) : 0;
          const couponDiscount = appliedCoupon?.discountCents || 0;
          const totalDiscount = prorationCredit + couponDiscount;
          const taxableAmount = selectedPlan
            ? Math.max(0, selectedPlan.priceCents - totalDiscount)
            : 0;
          const gstPercent = selectedPlan?.gstPercent ?? 18;
          const taxAmount = Math.round((taxableAmount * gstPercent) / 100);
          const amountDue = taxableAmount + taxAmount;

          return (
            <div className="rounded-2xl border border-border bg-surface-raised p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Plan Subtotal</span>
                <span className="font-semibold text-text-primary">
                  {selectedPlan ? formatINR(selectedPlan.priceCents) : formatINR(0)}
                </span>
              </div>

              {isUpgrade && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    Unused {upgradePreview?.currentPlan?.name || 'Current'} Plan Credit ({upgradePreview?.daysRemaining}d left)
                  </span>
                  <span className="font-bold">-{formatINR(prorationCredit)}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-success">
                  <span>Coupon Discount ({appliedCoupon?.couponCode})</span>
                  <span className="font-bold">-{formatINR(couponDiscount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-dashed border-border/80 font-medium text-text-primary">
                <span>Base Plan Total</span>
                <span className="font-semibold text-text-primary">{formatINR(taxableAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-text-secondary">
                <span>GST ({gstPercent}%)</span>
                <span className="font-semibold text-text-primary">{formatINR(taxAmount)}</span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-border font-bold text-sm sm:text-base">
                <span className="text-text-primary">Total Amount</span>
                <span className="text-accent text-base sm:text-lg font-extrabold">{formatINR(amountDue)}</span>
              </div>
            </div>
          );
        })()}

        {subscription?.status === 'PAUSED' ? (
          <div className="rounded-2xl p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <PauseCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Billing Paused by Admin</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              New plan purchases and recurring payments are currently disabled while your account billing is paused. Please reach out to our team to resume your subscription.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Billing%20Paused%20Inquiry%20-${user?.email || ''}`}
              className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 hover:underline text-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact {SUPPORT_EMAIL}</span>
            </a>
          </div>
        ) : null}

        {subscription?.status === 'CANCELLED' ? (
          <div className="rounded-2xl p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Info className="w-4 h-4 text-accent shrink-0" />
              <span>Previous Plan Was Cancelled</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Your previous subscription was cancelled. You can purchase and reactivate your Pro workspace with any plan below.
            </p>
          </div>
        ) : null}

        {subscription?.scheduledDowngradePlan ? (
          <div className="rounded-2xl p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Clock3 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Downgrade to {subscription.scheduledDowngradePlan.name} Scheduled</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              Downgrade takes effect on {effectivePlan.expiresAt ? new Date(effectivePlan.expiresAt).toLocaleDateString('en-GB') : 'period end'}. You maintain all {effectivePlan.planName} features until then.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 rounded-lg"
              onClick={handleCancelScheduledDowngrade}
            >
              Cancel Scheduled Downgrade
            </Button>
          </div>
        ) : null}

        {subscription?.cancelAtPeriodEnd && !subscription?.scheduledDowngradePlan ? (
          <div className="rounded-2xl p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Subscription Ending at Period End</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              Your subscription will not renew after {effectivePlan.expiresAt ? new Date(effectivePlan.expiresAt).toLocaleDateString('en-GB') : 'your current billing cycle'}.
            </p>
          </div>
        ) : null}

        <Button
          fullWidth
          disabled={subscription?.status === 'PAUSED'}
          loading={isProcessing}
          onClick={handleCheckout}
          leftIcon={
            subscription?.status === 'PAUSED' ? (
              <PauseCircle className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )
          }
        >
          {subscription?.status === 'PAUSED'
            ? 'Billing Paused by Admin'
            : subscription?.status === 'CANCELLED'
            ? `Reactivate with ${selectedPlan?.name || 'Selected Plan'}`
            : 'Proceed to payment'}
        </Button>

        <p className="text-[11px] text-text-muted">
          {subscription?.status === 'PAUSED'
            ? 'Plan purchases are locked until an administrator resumes your billing.'
            : 'Payments are processed by Razorpay. We send invoice emails after payment and renewal events.'}
        </p>
      </CardContent>
    </Card>
  );

  // --- Section 5: Invoices & History ---
  const renderInvoicesHistorySection = () => (
    <div className="space-y-6">
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <CardTitle>Invoices</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 ? (
            <div className="text-sm text-text-muted py-2">No invoices yet.</div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${selectedInvoice?.id === invoice.id ? 'border-accent bg-accent-subtle/30' : 'border-border bg-surface hover:border-border-strong'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text-primary">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-text-muted">{invoice.subscription?.plan?.name || 'Plan purchase'}</p>
                  </div>
                  <Badge variant={invoice.status === 'PAID' ? 'success' : 'warning'} size="sm" dot>
                    {invoice.status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                  <span>{new Date(invoice.issuedAt).toLocaleDateString()}</span>
                  <span>{formatINR(invoice.totalCents)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await openInvoicePdf(invoice.id);
                      } catch (err: any) {
                        toast.error(err?.response?.data?.error?.message || 'Failed to open invoice PDF');
                      }
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
                      } catch (err: any) {
                        toast.error(err?.response?.data?.error?.message || 'Failed to download invoice PDF');
                      }
                    }}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-accent" />
            <CardTitle>Transactions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-sm text-text-muted py-2">No transactions yet.</div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-2xl border border-border bg-surface-raised p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {transaction.plan?.name || 'Plan payment'}
                    </p>
                    <p className="text-xs text-text-muted">{transaction.providerPaymentId}</p>
                  </div>
                  <Badge variant={transaction.status === 'CAPTURED' ? 'success' : 'warning'} size="sm" dot>
                    {transaction.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                  <span>{formatINR(transaction.netAmountCents)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent" />
            <CardTitle>Custom plan requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {customPlanRequests.length === 0 ? (
            <div>
              <p className="text-sm text-text-muted">No custom plan requests yet.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={openCustomPlan}
                leftIcon={<Wand2 className="w-4 h-4" />}
              >
                Build a custom plan
              </Button>
            </div>
          ) : (
            customPlanRequests.map((req) => (
              <div key={req.id} className="rounded-2xl border border-border bg-surface-raised p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text-primary">Request #{req.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-text-muted">{new Date(req.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <Badge variant={statusVariant(req.status)} size="sm" dot>
                    {statusLabel(req.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{changeSummary(req)}</span>
                  {req.quotedPriceCents != null && <span className="font-semibold text-text-primary">{formatINR(req.quotedPriceCents)}</span>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            <CardTitle>Supplier details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">{company.name}</p>
          {company.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {company.placeOfSupply && <p>Place of supply: {company.placeOfSupply}</p>}
          {company.email && (
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {company.email}
            </p>
          )}
          <div className="pt-2 flex items-center gap-2 text-xs text-text-muted">
            <Clock3 className="w-4 h-4" />
            Billing updates are stored in the backend and reflected across dev and production.
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // --- Section: Billing Support (Administrative / Help) ---
  const renderSupportSection = () => (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-accent" />
          <CardTitle>Billing & Subscription Support</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-text-muted leading-relaxed">
          Your subscription is managed through your {APP_NAME} account. If you need assistance with your subscription, billing history, or invoice inquiries, our team is here to help.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Billing%20Support%20Inquiry`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-hover border border-border text-text-primary text-xs font-semibold transition-colors"
        >
          <Mail className="w-3.5 h-3.5 text-accent" />
          <span>Contact Billing Support</span>
        </a>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-8xl mx-auto px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-6 space-y-4 sm:space-y-5">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-border bg-gradient-to-br from-surface via-surface to-accent-subtle/20 p-4 sm:p-8">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_32%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-accent-subtle border border-accent-border text-accent text-[11px] sm:text-xs font-bold">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Billing Center
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
              All billing details in one place
            </h1>
            <p className="text-xs sm:text-base text-text-muted max-w-xl">
              Review plans, view your subscription status, and download invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge variant={effectivePlan.planSlug === 'free' ? 'accent' : 'success'} size="sm" dot>
              {effectivePlan.planName}
            </Badge>
            <Badge variant="default" size="sm" dot>
              {subscription?.status || effectivePlan.status}
            </Badge>
            <Badge variant="default" size="sm" dot>
              {company.name}
            </Badge>
          </div>
        </div>
      </div>

      {/* PAUSED Status Banner */}
      {subscription?.status === 'PAUSED' && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <PauseCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Your Account Billing is Paused by Admin
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Paused
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Your subscription and checkout capabilities are currently paused by an administrator. You cannot purchase new plans or process payments at this time. Please reach out to our support team to reactivate your billing.
              </p>
            </div>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Billing%20Paused%20Inquiry%20-${user?.email || ''}`}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Support</span>
          </a>
        </div>
      )}

      {/* CANCELLED Status Banner */}
      {subscription?.status === 'CANCELLED' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
              <Info className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Your Previous Plan Was Cancelled
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Cancelled
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Your previous subscription was cancelled. You can select any plan below to renew your subscription and reactivate your full workspace features whenever you are ready.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (paidPlans.length > 0) setSelectedPlan(paidPlans[0]);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            className="shrink-0"
          >
            Select Plan to Reactivate
          </Button>
        </div>
      )}

      {/* Mobile Section Tabs (< lg) */}
      <div className="lg:hidden flex items-center gap-1.5 p-1 rounded-2xl bg-surface-raised border border-border overflow-x-auto no-scrollbar">
        {[
          { id: 'plans', label: 'My Plan & Plans', icon: CreditCard },
          { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
        ].map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobileTab(id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              mobileTab === id
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <TabIcon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Single-Section Content (< lg) */}
      <div className="lg:hidden space-y-4">
        {mobileTab === 'plans' && (
          <div className="space-y-4">
            {renderPlansSection()}
            <PaymentMethodSettingsCard />
            {renderSupportSection()}
          </div>
        )}
        {mobileTab === 'invoices' && (
          <div className="space-y-4">
            <PaymentMethodSettingsCard />
            {renderInvoicesHistorySection()}
            {renderSupportSection()}
          </div>
        )}
      </div>

      {/* Desktop 2-Column Grid (lg+) */}
      <div className="hidden lg:grid grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          {renderPlansSection()}
          {renderPreviewSection()}
        </div>

        <div className="space-y-6">
          <PaymentMethodSettingsCard />
          {renderBillToSection()}
          {renderCheckoutSection()}
          {renderInvoicesHistorySection()}

          <div className="flex justify-end">
            <Link to="/settings?tab=billing">
              <Button variant="ghost">Back to settings</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Notice: Open in Desktop View Modal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isMobile && desktopModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  className="fixed inset-0 bg-black/60 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setDesktopModalOpen(false)}
                />

                {/* Modal Content */}
                <motion.div
                  className="relative w-full max-w-sm rounded-[28px] bg-white dark:bg-[#12141f] border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xl z-[111] overflow-hidden text-center"
                  initial={{ scale: 0.9, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: 10 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 420 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setDesktopModalOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>

                  {/* Graphic */}
                  <div className="flex flex-col items-center pt-2">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 dark:from-indigo-500/30 dark:to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                        <Monitor size={30} strokeWidth={2} />
                      </div>
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-md">
                        <Sparkles size={12} strokeWidth={2.5} />
                      </span>
                    </div>

                    <h3 className="text-[19px] font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                      Open in Desktop View
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-6 px-1">
                      For full billing management, checkout, and invoice customization, please open this app in desktop view or on your computer.
                    </p>

                    <div className="w-full flex flex-col gap-2.5">
                      <button
                        onClick={() => setDesktopModalOpen(false)}
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white text-[13.5px] font-bold flex items-center justify-center gap-2 shadow-md shadow-accent/25 transition-all hover:brightness-105 active:scale-[0.98]"
                      >
                        <span>Continue on Mobile</span>
                        <ArrowRight size={15} strokeWidth={2.5} />
                      </button>

                      <button
                        onClick={() => {
                          setDesktopModalOpen(false);
                          navigate('/');
                        }}
                        className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-slate-200/60 dark:border-slate-700/60"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Payment Verification & Plan Activation Modal */}
      <PaymentVerifyingModal
        isOpen={verificationModal.isOpen}
        status={verificationModal.status}
        planName={verificationModal.planName || selectedPlan?.name}
        errorMessage={verificationModal.errorMessage}
        onClose={() => setVerificationModal((prev) => ({ ...prev, isOpen: false }))}
        onContinue={() => {
          setVerificationModal((prev) => ({ ...prev, isOpen: false }));
          navigate('/');
        }}
      />

      {downgradeTargetPlan && (
        <DowngradeConfirmModal
          isOpen={Boolean(downgradeTargetPlan)}
          onClose={() => setDowngradeTargetPlan(null)}
          currentPlanName={effectivePlan.planName}
          targetPlan={downgradeTargetPlan}
          periodEndDate={effectivePlan.expiresAt}
          onConfirm={async () => {
            try {
              await downgradeSubscription({ targetPlanId: downgradeTargetPlan.id });
              toast.success(`Downgrade to ${downgradeTargetPlan.name} scheduled for end of billing cycle.`);
              refetch();
            } catch (err: any) {
              toast.error(err?.response?.data?.error?.message || 'Failed to schedule downgrade');
            }
          }}
        />
      )}
    </div>
  );
}

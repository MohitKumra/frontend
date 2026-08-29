import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import apiClient from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { PlanCard } from '../components/billing/PlanCard';
import { useUserPlan, type PlanDTO } from '../features/billing/useUserPlan';
import { InvoicePreview, type InvoicePreviewData } from '../features/billing/InvoicePreview';
import { formatINR } from '../utils/formatCurrency';

function baseTierOf(slug: string): string {
  return slug.endsWith('_yearly') ? slug.slice(0, -'_yearly'.length) : slug;
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
    refetch,
  } =
    useUserPlan();

  const [billingCycle, setBillingCycle] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [selectedPlan, setSelectedPlan] = useState<PlanDTO | null>(null);
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
  const [billingDraft, setBillingDraft] = useState({
    billingCompanyName: '',
    billingEmail: '',
    billingPhone: '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCityState: '',
    billingPostalCode: '',
    billingCountry: 'India',
    billingGstin: '',
  });

  const paidPlans = useMemo(
    () => plans.filter((plan) => plan.priceCents > 0 && plan.billingInterval === billingCycle),
    [plans, billingCycle]
  );

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) || invoices[0] || null,
    [invoices, selectedInvoiceId]
  );

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
      billingAddressLine2: billingProfile.addressLines[1] || '',
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
        billingAddressLine2: billingDraft.billingAddressLine2.trim() || null,
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

  async function openInvoicePdf(pdfUrl: string) {
    // Open the tab synchronously (during the click gesture) so it isn't blocked
    // as a popup; filling it with the blob URL after the fetch keeps auth intact
    // (the token is attached by apiClient). Avoid `noopener` (it nulls the reference).
    const previewWindow = window.open('', '_blank');
    const response = await apiClient.get(pdfUrl, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(response.data);
    if (previewWindow) {
      previewWindow.location.href = blobUrl;
    } else {
      window.open(blobUrl, '_blank');
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  async function downloadInvoicePdf(pdfUrl: string, invoiceNumber: string) {
    const response = await apiClient.get(`${pdfUrl}?download=1`, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
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

      const { providerOrderId, keyId, amountCents, noPaymentRequired } = checkoutRes;
      if (noPaymentRequired || Number(amountCents) === 0) {
        await verifyPayment({
          razorpayOrderId: providerOrderId,
          razorpayPaymentId: `pay_free_${Date.now()}`,
          razorpaySignature: 'sig_mock_verified',
        });
        toast.success(`Paid bill of ₹0 activated for ${selectedPlan.name}`);
        refetch();
        return;
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

      const options = {
        key: keyId || 'rzp_test_dummy',
        amount: amountCents,
        currency: selectedPlan.currency || 'INR',
        name: company.name,
        description: `${selectedPlan.name} plan`,
        order_id: providerOrderId,
        handler: async (response: any) => {
          await verifyPayment({
            razorpayOrderId: response.razorpay_order_id || providerOrderId,
            razorpayPaymentId: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
            razorpaySignature: response.razorpay_signature || 'sig_mock_verified',
          });
          toast.success(`Payment successful for ${selectedPlan.name}`);
          refetch();
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
        theme: { color: '#0f766e' },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          toast.error(response.error?.description || 'Payment failed');
        });
        rzp.open();
      } else {
        await verifyPayment({
          razorpayOrderId: providerOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'sig_mock_verified',
        });
        toast.success(`Payment successful for ${selectedPlan.name}`);
        refetch();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to initialize checkout');
    } finally {
      setIsProcessing(false);
    }
  }

  const selectedInvoicePlanName = selectedInvoice?.subscription?.plan?.name || selectedInvoice?.order?.id || 'Plan purchase';
  const billToName = billingDraft.billingCompanyName || billingProfile.companyName || user?.name || user?.email?.split('@')[0] || 'Customer';
  const billToLines = [
    billingDraft.billingAddressLine1 || billingProfile.addressLines[0],
    billingDraft.billingAddressLine2 || billingProfile.addressLines[1],
    billingDraft.billingCityState || billingProfile.addressLines[2],
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
    invoice: selectedInvoice
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
      : null,
    issuedAtLabel: selectedInvoice ? new Date(selectedInvoice.issuedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    nextInvoiceLabel: previewNextDate ? new Date(previewNextDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Not set',
    planName: selectedInvoicePlanName,
    paymentMode: (selectedInvoice?.subscription?.autoRenew ?? subscription?.autoRenew) ? 'Auto-pay' : 'No payment required',
    subscriptionRef: selectedInvoice?.subscription?.id || subscription?.id || '-',
    paymentRef: selectedInvoice?.transactions?.[0]?.providerPaymentId || 'NA',
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-surface via-surface to-accent-subtle/20 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_32%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle border border-accent-border text-accent text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Billing Center
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
              All billing details in one place
            </h1>
            <p className="text-sm sm:text-base text-text-muted max-w-xl">
              Review plans, apply a coupon, choose auto-pay or one-time payment, and download proper invoices without
              hunting through modals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-accent" />
                <CardTitle>Choose a plan</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="inline-flex items-center rounded-2xl bg-surface-raised border border-border p-1">
                {(['MONTH', 'YEAR'] as const).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                      billingCycle === cycle
                        ? 'bg-accent text-text-onaccent shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {cycle === 'MONTH' ? 'Monthly' : 'Annual'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paidPlans.map((plan) => {
                  const isCurrent = effectivePlan.planSlug !== 'free' && baseTierOf(effectivePlan.planSlug) === baseTierOf(plan.slug);
                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrent={isCurrent}
                      isPopular={baseTierOf(plan.slug) === 'premium'}
                      onSelect={(p) => setSelectedPlan(p)}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-accent" />
                <CardTitle>Invoice preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <InvoicePreview data={previewData} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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
                  value={billingDraft.billingAddressLine2}
                  onChange={(e) => setBillingDraft((prev) => ({ ...prev, billingAddressLine2: e.target.value }))}
                  placeholder="Address line 2"
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
                <div className="rounded-2xl border border-border bg-surface-raised p-3">
                  <p className="font-semibold text-text-primary">{selectedPlan?.name || 'Select a plan'}</p>
                  <p className="text-xs text-text-muted">
                    {selectedPlan ? `${formatINR(selectedPlan.priceCents)} ${selectedPlan.billingInterval === 'YEAR' ? '/ year' : '/ month'}` : 'Pick a paid plan from the left'}
                  </p>
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

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('SUBSCRIPTION_INITIAL')}
                  className={`rounded-2xl border p-3 text-left ${paymentMode === 'SUBSCRIPTION_INITIAL' ? 'border-accent bg-accent-subtle/40' : 'border-border bg-surface'}`}
                >
                  <p className="text-xs font-semibold">Auto-pay</p>
                  <p className="text-[10px] text-text-muted">Renews at full price</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('ONE_TIME')}
                  className={`rounded-2xl border p-3 text-left ${paymentMode === 'ONE_TIME' ? 'border-accent bg-accent-subtle/40' : 'border-border bg-surface'}`}
                >
                  <p className="text-xs font-semibold">One-time</p>
                  <p className="text-[10px] text-text-muted">No auto-renew</p>
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-surface-raised p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Plan total</span>
                  <span className="font-semibold">{selectedPlan ? formatINR(selectedPlan.priceCents) : formatINR(0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Discount</span>
                  <span className="font-semibold text-success">-{formatINR(appliedCoupon?.discountCents || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Tax</span>
                  <span className="font-semibold">
                    {selectedPlan
                      ? formatINR(Math.round(((selectedPlan.priceCents - (appliedCoupon?.discountCents || 0)) * selectedPlan.gstPercent) / 100))
                      : formatINR(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border font-bold">
                  <span>Amount due</span>
                  <span className="text-accent">
                    {selectedPlan
                      ? formatINR(
                          (selectedPlan.priceCents - (appliedCoupon?.discountCents || 0)) +
                            Math.round(((selectedPlan.priceCents - (appliedCoupon?.discountCents || 0)) * selectedPlan.gstPercent) / 100)
                        )
                      : formatINR(0)}
                  </span>
                </div>
              </div>

              <Button fullWidth loading={isProcessing} onClick={handleCheckout} leftIcon={<ArrowRight className="w-4 h-4" />}>
                Proceed to payment
              </Button>

              <p className="text-[11px] text-text-muted">
                Payments are processed by Razorpay. We send invoice emails after payment and renewal events.
              </p>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <CardTitle>Invoices</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.length === 0 ? (
                <div className="text-sm text-text-muted">No invoices yet.</div>
              ) : (
                invoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => setSelectedInvoiceId(invoice.id)}
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
                            await openInvoicePdf(invoice.pdfUrl);
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
                            await downloadInvoicePdf(invoice.pdfUrl, invoice.invoiceNumber);
                          } catch (err: any) {
                            toast.error(err?.response?.data?.error?.message || 'Failed to download invoice PDF');
                          }
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </button>
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
                <div className="text-sm text-text-muted">No transactions yet.</div>
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

          <div className="flex justify-end">
            <Link to="/settings?tab=billing">
              <Button variant="ghost">Back to settings</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

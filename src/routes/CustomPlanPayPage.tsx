// frontend/src/routes/CustomPlanPayPage.tsx
// The dedicated, tailored checkout page a user reaches from the emailed
// payment link for an ACCEPTED custom plan. Shows only their custom plan —
// their exact limits + features and the quoted price (following the app's
// pre-GST convention: displayed base + GST = total) — and drives the existing
// Razorpay checkout + verification to activate their entitlements.

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Check,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  FolderKanban,
  Target,
  ListChecks,
  Cloud,
  FileText,
  BookOpen,
  Users,
  Gauge,
  RefreshCw,
  Headphones,
  Bot,
  Box,
  Gem,
  type LucideIcon,
} from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import { formatINR } from '../utils/formatCurrency';
import {
  resolveCustomPlanPay,
  createCustomPlanCheckout,
  verifyCustomPlanPayment,
} from '../features/customPlan/customPlanApi';
import type { CustomPlanPayInfo } from '../features/customPlan/customPlanApi';
import {
  NUMERIC_FEATURES,
  BOOLEAN_FEATURES,
  formatLimit,
} from '../features/customPlan/customPlanFeature';

const COMPANY_NAME = 'Finamite';

// Picks a representative icon for a limit row from its label text, since
// custom plans can include any combination of limits and we don't have a
// fixed key→icon map. Falls back to a generic gauge icon.
function getLimitIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (l.includes('ai')) return Bot;
  if (l.includes('project')) return FolderKanban;
  if (l.includes('habit')) return Target;
  if (l.includes('task')) return ListChecks;
  if (l.includes('storage')) return Cloud;
  if (l.includes('journal')) return BookOpen;
  if (l.includes('note')) return FileText;
  if (l.includes('team') || l.includes('member')) return Users;
  return Gauge;
}

// Decorative isometric-style illustration matching the reference design:
// a checklist clipboard floating on a soft platform with scattered
// confetti shapes. Pure SVG, no external asset.
function ClipboardIllustration() {
  return (
    <svg viewBox="0 0 380 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* soft glow behind everything */}
      <ellipse cx="205" cy="215" rx="150" ry="90" fill="#EFE9FE" opacity="0.6" />

      {/* platform */}
      <ellipse cx="205" cy="235" rx="130" ry="42" fill="#F3F1FC" />
      <ellipse cx="205" cy="222" rx="130" ry="42" fill="#FFFFFF" stroke="#ECE9FB" strokeWidth="2" />
      <ellipse cx="205" cy="222" rx="88" ry="28" fill="#EDE9FC" opacity="0.7" />

      {/* floating dots */}
      <circle cx="55" cy="145" r="9" fill="#F5A84C" />
      <circle cx="336" cy="150" r="6" fill="#C9C4EE" />
      <circle cx="344" cy="188" r="5" fill="#B9B4E6" />
      <circle cx="70" cy="195" r="4" fill="#D8D4F5" />

      {/* star */}
      <path
        d="M96 92 L102 108 L118 114 L102 120 L96 136 L90 120 L74 114 L90 108 Z"
        fill="#6C5DD3"
      />

      {/* clipboard shadow */}
      <rect x="120" y="70" width="140" height="176" rx="20" fill="#3A2E86" opacity="0.10" transform="translate(6,8)" />

      {/* clipboard body (purple frame) */}
      <rect x="118" y="66" width="140" height="176" rx="20" fill="#6C5DD3" />
      {/* clipboard inner (white page) */}
      <rect x="132" y="86" width="112" height="146" rx="10" fill="#FFFFFF" />

      {/* clip tab */}
      <rect x="168" y="54" width="40" height="24" rx="8" fill="#8577E0" />
      <circle cx="178" cy="66" r="2.4" fill="#FFFFFF" />
      <circle cx="188" cy="66" r="2.4" fill="#FFFFFF" />
      <circle cx="198" cy="66" r="2.4" fill="#FFFFFF" />

      {/* checklist rows */}
      {[108, 140, 172].map((y, i) => (
        <g key={i}>
          <circle cx="150" cy={y} r="9" fill="#6C5DD3" />
          <path
            d={`M146 ${y} l2.5 3 l6 -7`}
            stroke="#FFFFFF"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="168" y={y - 3} width="56" height="6" rx="3" fill="#DAD5F7" />
        </g>
      ))}
    </svg>
  );
}

export function CustomPlanPayPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<CustomPlanPayInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('This payment link is invalid.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await resolveCustomPlanPay(token);
        setInfo(data);
        setActivated(data.alreadyPaid);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'This payment link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handlePay() {
    if (!token || !info || processing) return;
    setProcessing(true);
    try {
      const checkout = await createCustomPlanCheckout(token);

      // Full discount / zero-amount bill → verify immediately.
      if (checkout.noPaymentRequired || Number(checkout.amountCents) === 0) {
        await verifyCustomPlanPayment(token, {
          razorpayOrderId: checkout.providerOrderId,
          razorpayPaymentId: `pay_free_${Date.now()}`,
          razorpaySignature: 'sig_mock_verified',
        });
        setActivated(true);
        setInfo({ ...info, alreadyPaid: true });
        toast.success('Your custom plan is now active');
        return;
      }

      // Load the Razorpay checkout SDK on demand.
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
        key: checkout.keyId || 'rzp_test_dummy',
        amount: checkout.amountCents,
        currency: checkout.currency || 'INR',
        name: COMPANY_NAME,
        description: 'Custom plan activation',
        order_id: checkout.providerOrderId,
        handler: async (response: any) => {
          await verifyCustomPlanPayment(token, {
            razorpayOrderId: response.razorpay_order_id || checkout.providerOrderId,
            razorpayPaymentId: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
            razorpaySignature: response.razorpay_signature || 'sig_mock_verified',
          });
          setActivated(true);
          setInfo((prev) => (prev ? { ...prev, alreadyPaid: true } : prev));
          toast.success('Your custom plan is now active');
        },
        modal: { ondismiss: () => setProcessing(false) },
        theme: { color: '#6C5DD3' },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          toast.error(response.error?.description || 'Payment failed');
        });
        rzp.open();
      } else {
        await verifyCustomPlanPayment(token, {
          razorpayOrderId: checkout.providerOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'sig_mock_verified',
        });
        setActivated(true);
        setInfo((prev) => (prev ? { ...prev, alreadyPaid: true } : prev));
        toast.success('Your custom plan is now active');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to start checkout');
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#EEF0FA]">
        <Spinner className="w-8 h-8 text-[#6C5DD3]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-[#EEF0FA]">
        <div className="max-w-sm w-full rounded-3xl border border-[#ECECF5] bg-white p-8 shadow-xl text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[#14142B] mt-4">Payment link not available</h2>
          <p className="text-sm text-[#6E7191] mt-2 leading-relaxed">{error}</p>
          <button
            className="mt-6 w-full rounded-xl bg-[#6C5DD3] text-white font-semibold py-3 hover:opacity-90 transition"
            onClick={() => navigate('/')}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!info) return null;

  if (activated) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-[#EEF0FA]">
        <div className="max-w-sm w-full rounded-3xl border border-[#ECECF5] bg-white p-8 shadow-xl text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Check className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-[#14142B] mt-5">Your plan is active</h1>
          <p className="text-sm text-[#6E7191] mt-2 leading-relaxed">
            Your new limits and features are live. Head back to your workspace to start using them.
          </p>
          <button
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C5DD3] text-white font-semibold py-3 hover:opacity-90 transition"
            onClick={() => navigate('/')}
          >
            Continue to app
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const subtotal = info.priceCents;
  const tax = Math.round((subtotal * info.gstPercent) / 100);
  const total = subtotal + tax;
  const intervalLabel = info.billingInterval === 'YEAR' ? 'Annual' : 'Monthly';

  const numericShown = NUMERIC_FEATURES.filter((f) => typeof info.features[f.key] === 'number');
  const booleanShown = BOOLEAN_FEATURES.filter((f) => info.features[f.key] === true);

  return (
    <div className="min-h-dvh bg-[#EEF0FA] px-4 py-8 sm:py-10">
      <div className="max-w-8xl mx-auto bg-white rounded-[28px] shadow-sm overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 sm:px-10 py-6 border-b border-[#F0F0F7]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6C5DD3]" fill="#6C5DD3" strokeWidth={0} />
            <span className="text-[15px] font-bold text-[#14142B]">{COMPANY_NAME}</span>
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-[#14142B] bg-[#F5F5FA] hover:bg-[#EFEFF7] transition rounded-full pl-4 pr-4 py-2">
            <Headphones className="w-4 h-4 text-[#6E7191]" />
            Need help?
          </button>
        </header>

        <div className="px-8 sm:px-10 pt-8 pb-10 bg-[#F7F7FC]">
          {/* Hero */}
          <div className="flex items-start justify-between gap-6 mb-8">
            <div className="max-w-md pt-2">
              <h1 className="text-[34px] leading-[1.15] font-extrabold text-[#14142B] tracking-tight">
                Your <span className="text-[#6C5DD3]">custom plan</span> is ready
              </h1>
              <p className="text-[15px] text-[#6E7191] mt-4 leading-relaxed">
                We&apos;ve put this together for your team.
                <br />
                Review what&apos;s included, then activate it below.
              </p>
            </div>

            <div className="hidden md:block w-64 h-56 shrink-0 -mt-4">
              <ClipboardIllustration />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            {/* Left: plan details */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#EFEFF5] bg-white shadow-sm p-6 sm:p-7">
                <div className="flex items-center gap-2 mb-5">
                  <Box className="w-4 h-4 text-[#6C5DD3]" />
                  <span className="text-xs font-bold tracking-wide text-[#6C5DD3]">PLAN LIMITS</span>
                </div>

                {numericShown.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {numericShown.map((f) => {
                      const Icon = getLimitIcon(f.label);
                      return (
                        <div
                          key={f.key}
                          className="flex items-center gap-3 rounded-2xl bg-[#FAFAFD] border border-[#F1F1F7] px-4 py-3"
                        >
                          <span className="w-10 h-10 rounded-xl bg-[#EFEBFD] flex items-center justify-center shrink-0">
                            <Icon className="w-[18px] h-[18px] text-[#6C5DD3]" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] text-[#8A8FA8] leading-tight">{f.label}</p>
                            <p className="text-[15px] font-bold text-[#14142B] leading-tight mt-0.5">
                              {formatLimit(f.key, info.features[f.key] as number)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {booleanShown.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-7 mb-4">
                      <Gem className="w-4 h-4 text-[#6C5DD3]" />
                      <span className="text-xs font-bold tracking-wide text-[#6C5DD3]">INCLUDED FEATURES</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {booleanShown.map((f) => (
                        <div
                          key={f.key}
                          className="flex items-center gap-2 rounded-full border border-[#EFEFF5] bg-white px-4 py-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#6C5DD3] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </span>
                          <span className="text-sm font-semibold text-[#14142B]">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Trust badges */}
              <div className="rounded-3xl border border-[#EFEFF5] bg-white shadow-sm grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#F1F1F7]">
                {[
                  { icon: ShieldCheck, title: 'Secure payments', subtitle: 'Powered by Razorpay' },
                  { icon: RefreshCw, title: 'Cancel anytime', subtitle: 'No long-term lock-in' },
                  { icon: Headphones, title: 'Need help?', subtitle: "We're here for you" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3 px-5 py-6">
                    <span className="w-10 h-10 rounded-xl bg-[#EFEBFD] flex items-center justify-center shrink-0">
                      <item.icon className="w-[18px] h-[18px] text-[#6C5DD3]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#14142B] leading-tight">{item.title}</p>
                      <p className="text-xs text-[#8A8FA8] leading-tight mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: payment summary */}
            <div className="lg:sticky lg:top-10 space-y-6">
              <div className="rounded-3xl bg-gradient-to-br from-[#F3F0FC] to-[#EAE5FA] border border-[#EFE9FB] shadow-sm overflow-hidden relative">
                <div className="px-7 pt-7 pb-6 relative">
                  <span className="text-xs font-bold tracking-wide text-[#6C5DD3]">
                    {intervalLabel.toUpperCase()} BILLING
                  </span>
                  <p className="text-[40px] leading-none font-extrabold text-[#14142B] mt-3 tracking-tight">
                    {formatINR(total)}
                  </p>
                  <p className="text-[13px] text-[#8A8FA8] mt-2">
                    per {info.billingInterval === 'YEAR' ? 'year' : 'month'}, taxes included
                  </p>
                </div>

                <div className="px-7">
                  <div className="border-t border-dashed border-[#D9D3F2]" />
                </div>

                <div className="px-7 py-5 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6E7191]">Subtotal</span>
                    <span className="text-[#14142B] font-semibold">{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6E7191]">GST ({info.gstPercent}%)</span>
                    <span className="text-[#14142B] font-semibold">{formatINR(tax)}</span>
                  </div>
                </div>

                <div className="px-7">
                  <div className="border-t border-[#E4DEF6]" />
                </div>

                <div className="px-7 pt-5 pb-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-[#14142B]">Total</span>
                    <span className="text-sm font-extrabold text-[#6C5DD3]">{formatINR(total)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5B4CE0] to-[#8A78F0] text-white font-semibold text-[15px] py-4 shadow-lg shadow-[#6C5DD3]/25 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-70"
              >
                {processing ? (
                  <Spinner className="w-4 h-4 text-white" />
                ) : (
                  <>
                    Pay &amp; activate
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5 justify-center -mt-3">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8A8FA8]" />
                <p className="text-xs text-[#8A8FA8]">Secured by Razorpay</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
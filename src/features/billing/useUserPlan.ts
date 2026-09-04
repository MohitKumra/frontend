// frontend/src/features/billing/useUserPlan.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import { COMPANY_LEGAL_NAME } from '../../config/brand';

export interface PlanDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  priceCents: number;
  gstPercent: number;
  billingInterval: 'MONTH' | 'YEAR';
  features: Record<string, any>;
  sortOrder: number;
  isActive: boolean;
}

export interface EffectivePlanDTO {
  planId: string | null;
  planName: string;
  planSlug: string;
  source: 'ADMIN_OVERRIDE' | 'SUBSCRIPTION' | 'FREE';
  status: 'ACTIVE' | 'PAST_DUE' | 'FREE' | 'INACTIVE';
  features: Record<string, any>;
  expiresAt?: string | null;
  subscriptionId?: string | null;
  overrideId?: string | null;
}

export interface UserSubscriptionResponse {
  effectivePlan: EffectivePlanDTO;
  subscription: any | null;
  paymentMethod?: {
    method: string;
    summary: string;
  } | null;
  billingProfile: {
    companyName: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    gstin: string | null;
    cityState: string | null;
    postalCode: string | null;
    addressLines: string[];
    country: string | null;
  };
  company: {
    name: string;
    gstin: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    addressLines: string[];
    placeOfSupply: string | null;
  };
  usage: {
    projects: number;
    habits: number;
    tasks: number;
    aiRequests: number;
    notes: number;
    journals: number;
    storageUsedBytes: number;
    storageLimitBytes: number;
  };
  transactions: Array<{
    id: string;
    grossAmountCents: number;
    discountCents: number;
    netAmountCents: number;
    currency: string;
    status: string;
    providerPaymentId: string;
    createdAt: string;
    plan?: { name: string };
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    currency: string;
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    cgstCents: number;
    sgstCents: number;
    igstCents: number;
    sac?: string | null;
    totalCents: number;
    issuedAt: string;
    paidAt: string | null;
    dueAt: string | null;
    pdfUrl: string;
    subscription?: {
      id: string;
      status: string;
      autoRenew: boolean;
      billingInterval: 'MONTH' | 'YEAR';
      currentPeriodEnd: string;
      plan?: { name: string; slug: string };
    } | null;
    order?: { id: string; providerOrderId: string | null } | null;
    transactions?: Array<{
      id: string;
      providerPaymentId: string | null;
      status: string;
    }>;
  }>;
}

export const BILLING_QUERY_KEY = ['billing', 'subscription'];
export const PLANS_QUERY_KEY = ['billing', 'plans'];

export function useUserPlan() {
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery<UserSubscriptionResponse>({
    queryKey: BILLING_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserSubscriptionResponse }>('/billing/subscription');
      return res.data.data;
    },
    staleTime: 1000 * 15, // 15 seconds
    // NOTE: no `refetchOnMount: 'always'`. This hook is called from the app shell,
    // the sidebar AND many pages. With `'always'`, every remount re-fetched the
    // subscription and triggered a render wave on old devices. Default behaviour
    // (refetch only when stale) is plenty — 15s staleness covers plan changes.
  });

  const plansQuery = useQuery<PlanDTO[]>({
    queryKey: PLANS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<{ data: PlanDTO[] }>('/billing/plans');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const effectivePlan = subscriptionQuery.data?.effectivePlan || {
    planId: null,
    planName: 'Free',
    planSlug: 'free',
    source: 'FREE' as const,
    status: 'FREE' as const,
    // NOTE: Don't hardcode admin-controlled feature limits here. The backend's
    // resolveEffectivePlan returns the DB plan's features (edited via Admin).
    // Using an empty object means the real values apply once data loads.
    features: {},
    expiresAt: null,
  };
  const company = subscriptionQuery.data?.company || {
    name: COMPANY_LEGAL_NAME,
    gstin: null,
    email: null,
    phone: null,
    website: null,
    addressLines: [],
    placeOfSupply: null,
  };
  const billingProfile = subscriptionQuery.data?.billingProfile || {
    companyName: null,
    contactName: null,
    email: null,
    phone: null,
    gstin: null,
    cityState: null,
    postalCode: null,
    addressLines: [],
    country: null,
  };

  const usage = subscriptionQuery.data?.usage || {
    projects: 0,
    habits: 0,
    tasks: 0,
    aiRequests: 0,
    notes: 0,
    journals: 0,
    storageUsedBytes: 0,
    storageLimitBytes: 0,
  };

  /**
   * Returns true if a boolean feature is false or if usage has exceeded numeric limit.
   */
  function isFeatureLocked(featureKey: string): boolean {
    const val = effectivePlan.features[featureKey];
    if (val === undefined) return true;
    if (typeof val === 'boolean') return !val;
    if (typeof val === 'number') {
      const currentUsage = (usage as any)[featureKey] || 0;
      return currentUsage >= val;
    }
    return false;
  }

  /**
   * Returns the numerical limit or boolean status of a feature.
   */
  function getFeatureLimit(featureKey: string): any {
    return effectivePlan.features[featureKey];
  }

  /**
   * Returns remaining numerical quota for a feature (e.g. remaining projects).
   * Works for any numeric limit key (projects, habits, tasks, aiRequests →
   * aiRequestsPerMonth, notes, journals). Returns Infinity for unlimited (-1)
   * plans.
   */
  function getRemainingQuota(
    featureKey: 'projects' | 'habits' | 'tasks' | 'aiRequests' | 'notes' | 'journals'
  ): number {
    const limitKey = featureKey === 'aiRequests' ? 'aiRequestsPerMonth' : featureKey;
    const limit = effectivePlan.features[limitKey];
    if (limit === -1) return Infinity; // unlimited
    if (typeof limit !== 'number') return Infinity;
    const current = usage[featureKey as keyof typeof usage] || 0;
    return Math.max(0, limit - current);
  }

  // Mutations
  const createCheckoutMutation = useMutation({
    mutationFn: async (payload: {
      planId: string;
      couponCode?: string;
      type?: 'ONE_TIME' | 'SUBSCRIPTION_INITIAL';
      idempotencyKey?: string;
    }) => {
      const res = await apiClient.post('/billing/checkout', payload);
      return res.data.data;
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (payload: {
      razorpayOrderId?: string;
      razorpaySubscriptionId?: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      orderId?: string;
    }) => {
      const res = await apiClient.post('/billing/verify-payment', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (payload?: { reason?: string; immediately?: boolean }) => {
      const res = await apiClient.post('/billing/cancel-subscription', payload || {});
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const applyCouponMutation = useMutation({
    mutationFn: async (payload: { code: string; planId: string }) => {
      const res = await apiClient.post('/billing/apply-coupon', payload);
      return res.data.data;
    },
  });

  const updateBillingProfileMutation = useMutation({
    mutationFn: async (payload: {
      billingCompanyName?: string | null;
      billingEmail?: string | null;
      billingPhone?: string | null;
      billingAddressLine1?: string | null;
      billingCityState?: string | null;
      billingPostalCode?: string | null;
      billingCountry?: string | null;
      billingGstin?: string | null;
    }) => {
      const res = await apiClient.put('/billing/profile', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const downgradeSubscriptionMutation = useMutation({
    mutationFn: async (payload: { targetPlanId: string }) => {
      const res = await apiClient.post('/billing/downgrade', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const cancelScheduledDowngradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/billing/cancel-downgrade');
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const setupPaymentMethodMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/billing/setup-payment-method');
      return res.data.data;
    },
  });

  const confirmPaymentMethodMutation = useMutation({
    mutationFn: async (payload: {
      razorpaySubscriptionId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      const res = await apiClient.post('/billing/confirm-payment-method', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  return {
    subscriptionQuery,
    plansQuery,
    effectivePlan,
    subscription: subscriptionQuery.data?.subscription,
    paymentMethod: subscriptionQuery.data?.paymentMethod || null,
    company,
    billingProfile,
    usage,
    transactions: subscriptionQuery.data?.transactions || [],
    invoices: subscriptionQuery.data?.invoices || [],
    plans: plansQuery.data || [],
    isLoading: subscriptionQuery.isLoading || plansQuery.isLoading,
    isError: !!subscriptionQuery.isError || !!plansQuery.isError,

    isFeatureLocked,
    getFeatureLimit,
    getRemainingQuota,
    createCheckout: createCheckoutMutation.mutateAsync,
    verifyPayment: verifyPaymentMutation.mutateAsync,
    cancelSubscription: cancelSubscriptionMutation.mutateAsync,
    downgradeSubscription: downgradeSubscriptionMutation.mutateAsync,
    cancelScheduledDowngrade: cancelScheduledDowngradeMutation.mutateAsync,
    setupPaymentMethod: setupPaymentMethodMutation.mutateAsync,
    confirmPaymentMethod: confirmPaymentMethodMutation.mutateAsync,
    applyCoupon: applyCouponMutation.mutateAsync,
    updateBillingProfile: updateBillingProfileMutation.mutateAsync,
    refetch: () => {
      subscriptionQuery.refetch();
      plansQuery.refetch();
    },
  };
}

export interface UpgradePreviewDTO {
  isUpgrade: boolean;
  currentPlan: {
    id: string;
    name: string;
    slug: string;
    priceCents: number;
    billingInterval: 'MONTH' | 'YEAR';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    daysRemaining: number;
    rawCreditCents: number;
  } | null;
  targetPlan: {
    id: string;
    name: string;
    slug: string;
    priceCents: number;
    billingInterval: 'MONTH' | 'YEAR';
    currency: string;
    gstPercent: number;
  };
  proratedCreditCents: number;
  daysRemaining: number;
  subtotalCents: number;
  discountCents: number;
  taxableAmountCents: number;
  gstPercent: number;
  taxCents: number;
  totalCents: number;
}

export function useUpgradePreview(targetPlanId: string | null | undefined) {
  return useQuery<UpgradePreviewDTO | null>({
    queryKey: ['billing', 'upgrade-preview', targetPlanId],
    queryFn: async () => {
      if (!targetPlanId) return null;
      const res = await apiClient.get<{ data: UpgradePreviewDTO }>(
        `/billing/upgrade-preview?targetPlanId=${targetPlanId}`
      );
      return res.data.data;
    },
    enabled: !!targetPlanId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

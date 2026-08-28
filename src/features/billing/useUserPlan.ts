// frontend/src/features/billing/useUserPlan.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';

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
    mutationFn: async (payload: { planId: string; couponCode?: string; type?: 'ONE_TIME' | 'SUBSCRIPTION_INITIAL' }) => {
      const res = await apiClient.post('/billing/checkout', payload);
      return res.data.data;
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (payload: {
      razorpayOrderId: string;
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

  return {
    subscriptionQuery,
    plansQuery,
    effectivePlan,
    subscription: subscriptionQuery.data?.subscription,
    usage,
    transactions: subscriptionQuery.data?.transactions || [],
    plans: plansQuery.data || [],
    isLoading: subscriptionQuery.isLoading || plansQuery.isLoading,
    // True if either request failed. A failure should never leave the UI stuck
    // on an infinite spinner — the settings panel surfaces this as an error state.
    isError: !!subscriptionQuery.isError || !!plansQuery.isError,

    isFeatureLocked,
    getFeatureLimit,
    getRemainingQuota,
    createCheckout: createCheckoutMutation.mutateAsync,
    verifyPayment: verifyPaymentMutation.mutateAsync,
    cancelSubscription: cancelSubscriptionMutation.mutateAsync,
    applyCoupon: applyCouponMutation.mutateAsync,
    refetch: () => {
      subscriptionQuery.refetch();
      plansQuery.refetch();
    },
  };
}

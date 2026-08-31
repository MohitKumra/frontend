// frontend/src/features/customPlan/customPlanApi.ts
// API access for Custom Plan requests (self-service).
import apiClient from '../../lib/apiClient';

export interface CustomPlanRequestDTO {
  id: string;
  userId: string;
  currentPlanId: string | null;
  status: string;
  requestedFeatures: Record<string, boolean>;
  requestedLimits: Record<string, number>;
  requirements: Record<string, string> | null;
  adminNotes: string | null;
  quotedPriceCents: number | null;
  currency: string;
  billingInterval: string | null;
  finalConfig: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export interface SubmitCustomPlanPayload {
  requestedFeatures?: Record<string, boolean>;
  requestedLimits?: Record<string, number>;
  requirements?: { goal?: string; hurdles?: string; otherNotes?: string };
}

export async function submitCustomPlanRequest(
  payload: SubmitCustomPlanPayload
): Promise<CustomPlanRequestDTO> {
  const res = await apiClient.post<{ data: CustomPlanRequestDTO }>('/custom-plans', payload);
  return res.data.data;
}

export async function fetchMyCustomPlanRequests(): Promise<CustomPlanRequestDTO[]> {
  const res = await apiClient.get<{ data: CustomPlanRequestDTO[] }>('/custom-plans/me');
  return res.data.data;
}

// ─── Accepted-custom-plan payment (tailored pay page) ──────────────────────

export interface CustomPlanPayInfo {
  request: CustomPlanRequestDTO;
  carrierPlan: {
    id: string;
    priceCents: number;
    currency: string;
    gstPercent: number;
    billingInterval: string;
    features: Record<string, any>;
  };
  alreadyPaid: boolean;
  priceCents: number;
  currency: string;
  gstPercent: number;
  billingInterval: string;
  features: Record<string, any>;
}

export interface CustomPlanCheckoutInfo {
  orderId: string;
  providerOrderId: string;
  amountCents: number;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  noPaymentRequired: boolean;
  keyId?: string;
}

/** Resolves the tailored plan for the emailed payment token. */
export async function resolveCustomPlanPay(token: string): Promise<CustomPlanPayInfo> {
  const res = await apiClient.get<{ data: CustomPlanPayInfo }>(`/custom-plans/pay/${token}`);
  return res.data.data;
}

/** Creates (idempotently) the Razorpay checkout order for the custom plan. */
export async function createCustomPlanCheckout(token: string): Promise<CustomPlanCheckoutInfo> {
  const res = await apiClient.post<{ data: CustomPlanCheckoutInfo }>(`/custom-plans/pay/${token}/checkout`);
  return res.data.data;
}

export async function verifyCustomPlanPayment(
  token: string,
  verification: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<{ transactionId: string }> {
  const res = await apiClient.post<{ data: { transactionId: string } }>(
    `/custom-plans/pay/${token}/verify-payment`,
    verification
  );
  return res.data.data;
}
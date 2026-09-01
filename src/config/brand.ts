// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the product / company brand and shared defaults.
// Change the name / emails / defaults here ONCE and it propagates across the
// entire frontend. Mirrors backend/src/config/env.ts (which still holds its own
// copies for server-side rendering — keep them in sync when rebranding).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Product / software name ────────────────────────────────────────────────
export const APP_NAME = 'Personal Productivity'; // short name shown in the UI (headers, auth, footer)
export const APP_NAME_FULL = 'Finamite PMS'; // long name for admin / not-found contexts
export const APP_TAGLINE = 'Personal Management System';
export const APP_DESCRIPTION =
  `${APP_NAME} — Your personal productivity workspace. Tasks, habits, notes, focus timer, and analytics in one app.`;

// ─── Company ─────────────────────────────────────────────────────────────────
export const COMPANY_NAME = 'Finamite'; // brand name used in copy / copyright
export const COMPANY_LEGAL_NAME = 'Finamite Solutions LLP'; // legal entity (invoices / admin)

// ─── Contact / support emails ────────────────────────────────────────────────
export const SUPPORT_EMAIL = 'support@finamite.com';
export const BILLING_EMAIL = 'billing@finamite.in';
export const PRIVACY_EMAIL = 'privacy@finamite.com';
export const LEGAL_EMAIL = 'info@finamite.in';
export const ADMIN_EMAIL = 'admin@finamite.com';

// ─── Storage keys ────────────────────────────────────────────────────────────
export const STORAGE_PREFIX = 'finamite';
export const WEATHER_CACHE_KEY = `${STORAGE_PREFIX}-weather-cache`;

// ─── Legal UI ────────────────────────────────────────────────────────────────
export const LEGAL_HEADER_LABEL = `${APP_NAME} · Legal`;

// ─── Shared billing / locale defaults (also duplicated elsewhere) ────────────
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const INVOICE_NOTES = 'All monthly and usage payments are non-refundable.';
export const GST_PERCENT = 18;
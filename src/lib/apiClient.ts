// frontend/src/lib/apiClient.ts
// Axios-based API client that:
//   - Attaches the Authorization: Bearer header from authStore
//   - On 401, attempts one token refresh via POST /api/auth/refresh
//   - If refresh fails, logs the user out and redirects to /login
// Never import this directly in components — use feature-level api.ts files instead.

import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useAppBlockedStore } from '../store/appBlockedStore';
import { useUpgradeModalStore } from '../store/upgradeModalStore';
import { queryClient } from './queryClient';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true, // send httpOnly refresh cookie on refresh calls
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token before every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone) config.headers['X-Client-Timezone'] = timezone;
  return config;
});

// On 401, try once to refresh; on failure, logout + redirect
// Skip the refresh attempt for auth endpoints (login, signup, etc.)
// so a wrong-password 401 never triggers a page reload.

/**
 * Returns true only on a protected user-app route where a dead session should
 * force a full reload to /login. Public, auth and isolated pages (including the
 * admin portal) never get hard-redirected — they render fine logged out and rely
 * on their own guards (RequireAuth / AdminGuard) for graceful navigation.
 */
function shouldBounceToLogin(): boolean {
  const path = window.location.pathname;
  if (path === '/login' || path === '/signup') return false;
  if (path.startsWith('/admin')) return false;
  if (path.startsWith('/forgot-password')) return false;
  if (path.startsWith('/reset-password')) return false;
  if (path.startsWith('/google')) return false;
  if (path === '/privacy' || path === '/terms') return false;
  return true;
}

apiClient.interceptors.response.use(
  (response) => {
    const url = response.config?.url || '';
    const method = response.config?.method?.toUpperCase() || '';
    // Invalidate storage file lists and usage only when media/file mutations succeed
    if (
      (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') &&
      (url.includes('/upload') || url.includes('/media') || url.includes('/storage') || url.includes('/avatars'))
    ) {
      void queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['storage', 'files'] });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the backend reports the account is deactivated or banned, surface the
    // blocking overlay. No retry — these are permanent account states.
    const code = error.response?.data?.error?.code;
    if (error.response?.status === 403) {
      if (code === 'ACCOUNT_DEACTIVATED') {
        useAppBlockedStore.getState().setBlocked('DEACTIVATED', error.response.data.error.message);
        return Promise.reject(error);
      }
      if (code === 'ACCOUNT_BANNED') {
        useAppBlockedStore.getState().setBlocked('BANNED', error.response.data.error.message);
        return Promise.reject(error);
      }
    }

    // Plan limit / entitlement errors: show a clear "limit reached" toast and
    // open the global upgrade modal so the UI never feels unresponsive.
    const BLOCK_CODES: Record<string, { feature: string; label: string }> = {
      PLAN_LIMIT_REACHED: { feature: '', label: `You've reached your limit for this feature.` },
      FEATURE_LOCKED: { feature: '', label: 'This feature requires an upgrade.' },
      AI_QUOTA_EXCEEDED: { feature: 'AI Features', label: `You've hit your monthly AI request limit.` },
      PLAN_EXPIRED: { feature: '', label: 'Your plan has expired. Renew to continue.' },
    };
    const blocker = error.response?.data?.error?.code;
    if (blocker && BLOCK_CODES[blocker]) {
      const msg = error.response?.data?.error?.message || BLOCK_CODES[blocker].label;
      toast.error(msg, { duration: 4000 });
      useUpgradeModalStore.getState().openUpgrade(BLOCK_CODES[blocker].feature, msg);
    }

    // Never intercept auth-endpoint 401s — just let them propagate as normal errors
    const isAuthEndpoint =
      originalRequest?.url &&
      (originalRequest.url.includes('/auth/login') ||
        originalRequest.url.includes('/auth/signup') ||
        originalRequest.url.includes('/auth/refresh') ||
        originalRequest.url.includes('/auth/forgot-password') ||
        originalRequest.url.includes('/auth/reset-password') ||
        originalRequest.url.includes('/auth/me'));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
        const res = await axios.post<{ accessToken: string }>(`${baseUrl}/auth/refresh`, {}, { withCredentials: true });
        useAuthStore.getState().setAccessToken(res.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        useAppBlockedStore.getState().clearBlocked();
        // Only hard-redirect to /login on a protected user-app route. On public or
        // isolated pages (auth screens, /admin/*, legal pages) a failed refresh
        // should never yank the user out with a full page reload — those screens
        // render fine logged-out and the guard already handles redirects.
        if (shouldBounceToLogin()) {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// frontend/src/lib/apiClient.ts
// Axios-based API client that:
//   - Attaches the Authorization: Bearer header from authStore
//   - On 401, attempts one token refresh via POST /api/auth/refresh
//   - If refresh fails, logs the user out and redirects to /login
// Never import this directly in components — use feature-level api.ts files instead.

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,  // send httpOnly refresh cookie on refresh calls
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
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true });
        useAuthStore.getState().setAccessToken(res.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

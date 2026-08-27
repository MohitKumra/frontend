// frontend/src/lib/adminApiClient.ts
// Dedicated Axios instance for Admin API calls.
// Reads the in-memory access token from the adminStore, and refreshes via
// HttpOnly cookie when the access token expires (401).

import axios from 'axios';
import { useAdminStore } from '../store/adminStore';

const configuredBackendUrl = (import.meta.env.VITE_BACKEND_URL || '/api').replace(/\/+$/, '');
const backendApiUrl = configuredBackendUrl.endsWith('/api') ? configuredBackendUrl : `${configuredBackendUrl}/api`;

export const adminApiClient = axios.create({
  baseURL: `${backendApiUrl}/admin`,
  withCredentials: true, // Send HttpOnly admin cookie for refresh
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request: attach in-memory access token ───────────────────────────────────
adminApiClient.interceptors.request.use((config) => {
  const token = useAdminStore.getState().accessToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ─── Response: auto-refresh on 401 ───────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

adminApiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers['Authorization'] = `Bearer ${token}`;
            resolve(adminApiClient(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(
          '/api/admin/auth/refresh',
          {},
          { withCredentials: true }
        );
        const newToken: string = data.data.accessToken;
        useAdminStore.getState().setAccessToken(newToken);
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return adminApiClient(original);
      } catch {
        useAdminStore.getState().clearSession();
        refreshQueue = [];
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
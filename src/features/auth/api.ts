// frontend/src/features/auth/api.ts
import apiClient from '../../lib/apiClient';
import type { AuthResponse, LoginRequest, SignupRequest, ChangePasswordRequest, SetPasswordRequest } from '../../types';

export const authApi = {
  signup: (data: SignupRequest) => apiClient.post<AuthResponse>('/auth/signup', data).then((r) => r.data),

  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  refresh: () => apiClient.post<{ accessToken: string }>('/auth/refresh').then((r) => r.data),

  logout: () => apiClient.post('/auth/logout'),

  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),

  forgotPasswordByRecoveryEmail: (recoveryEmail: string) =>
    apiClient.post('/auth/forgot-password/recovery', { recoveryEmail }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }).then((r) => r.data),

  getMe: () => apiClient.get('/auth/me').then((r) => r.data),

  googleStart: (purpose: 'signin' | 'calendar-connect', returnTo: string) =>
    apiClient.get<{ url: string }>('/auth/google/start', { params: { purpose, returnTo } }).then((r) => r.data),

  changePassword: (data: ChangePasswordRequest) => apiClient.post('/auth/change-password', data).then((r) => r.data),

  setPassword: (data: SetPasswordRequest) => apiClient.post('/auth/set-password', data).then((r) => r.data),
};

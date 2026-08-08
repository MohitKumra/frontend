// frontend/src/features/auth/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../../../store/authStore';
import { queryClient } from '../../../lib/queryClient';
import type { LoginRequest, SignupRequest } from '../../../types';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      navigate('/');
    },
  });
}

export function useSignup() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: SignupRequest) => authApi.signup(data),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      navigate('/');
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useForgotPasswordByRecoveryEmail() {
  return useMutation({
    mutationFn: (recoveryEmail: string) => authApi.forgotPasswordByRecoveryEmail(recoveryEmail),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => authApi.resetPassword(token, password),
    onSuccess: () => navigate('/login'),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword?: string; newPassword: string }) => authApi.changePassword(data),
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (data: { newPassword: string }) => authApi.setPassword(data),
  });
}

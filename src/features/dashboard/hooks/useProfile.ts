import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';
import { useAuthStore } from '../../../store/authStore';

/**
 * Uploads a new avatar image for the current user.
 * Expects the backend to accept multipart/form-data on POST /users/me/avatar
 * and to respond with { avatarUrl: string }.
 */
export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const { data } = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.avatarUrl;
    },
    onSuccess: (avatarUrl) => {
      if (user) setUser({ ...user, avatarUrl });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Removes the current user's avatar, reverting to initials. */
export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/users/me/avatar');
    },
    onSuccess: () => {
      if (user) setUser({ ...user, avatarUrl: null });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
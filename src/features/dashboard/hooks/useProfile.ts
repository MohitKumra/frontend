import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';
import { prepareUploadFile } from '../../../lib/mediaUpload';
import { useAuthStore } from '../../../store/authStore';

/**
 * Uploads a new avatar image for the current user.
 * Sends the image as base64 JSON to POST /users/me/avatar and expects
 * { avatarUrl: string } in return.
 */
export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (file: File) => {
      const { file: preparedFile, base64DataUrl } = await prepareUploadFile(file);
      const { data } = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', {
        fileName: preparedFile.name,
        mimeType: preparedFile.type || file.type,
        base64Data: base64DataUrl,
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

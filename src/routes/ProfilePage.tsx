import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, X, Trash2, User as UserIcon, Mail, Calendar, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { Avatar } from '../components/ui/Avatar';
import type { UserDTO } from '../types';
import { format } from 'date-fns';

interface UpdateProfilePayload {
  name: string;
}

interface UploadAvatarPayload {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editedName, setEditedName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const res = await apiClient.patch<UserDTO>('/users/me/profile', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data);
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (payload: UploadAvatarPayload) => {
      const res = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (user) {
        setUser({ ...user, avatarUrl: data.avatarUrl });
      }
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/users/me/avatar');
    },
    onSuccess: () => {
      if (user) {
        setUser({ ...user, avatarUrl: null });
      }
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const base64WithoutPrefix = base64Data.split(',')[1];

      uploadAvatarMutation.mutate({
        fileName: file.name,
        mimeType: file.type,
        base64Data: base64WithoutPrefix,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!editedName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    updateProfileMutation.mutate({ name: editedName.trim() });
  };

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted">No user data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-text-primary mb-2">Profile</h1>
          <p className="text-sm text-text-muted">Manage your personal information and preferences</p>
        </div>

        {/* Profile Card */}
        <div
          className="rounded-2xl border p-8"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8 pb-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="relative group">
              <Avatar src={user.avatarUrl} name={user.name} email={user.email} size="2xl" showBorder />

              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  disabled={uploadAvatarMutation.isPending}
                >
                  <Camera size={20} className="text-white" />
                </button>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-text-onaccent)',
                }}
              >
                {uploadAvatarMutation.isPending ? 'Uploading...' : 'Change Photo'}
              </button>

              {user.avatarUrl && (
                <button
                  onClick={() => removeAvatarMutation.mutate()}
                  disabled={removeAvatarMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-colors text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={14} className="inline mr-1" />
                  {removeAvatarMutation.isPending ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                <UserIcon size={14} />
                Full Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={!isEditing}
                  className="flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors"
                  style={{
                    background: isEditing ? 'var(--color-surface)' : 'var(--color-surface-raised)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Enter your full name"
                />

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-3 rounded-xl text-xs font-bold transition-colors"
                    style={{
                      background: 'var(--color-accent)',
                      color: 'var(--color-text-onaccent)',
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-3 rounded-xl text-xs font-bold transition-colors"
                      style={{
                        background: 'var(--color-success)',
                        color: 'var(--color-text-onaccent)',
                      }}
                    >
                      <Save size={14} className="inline mr-1" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-3 rounded-xl text-xs font-bold transition-colors text-text-muted hover:bg-[var(--color-surface)]"
                    >
                      <X size={14} className="inline mr-1" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Email Field (Read-only) */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                <Mail size={14} />
                Email Address
              </label>
              <div
                className="px-4 py-3 rounded-xl border text-sm font-semibold"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {user.email}
              </div>
              <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
            </div>

            {/* Account Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {/* Created At */}
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <Calendar size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Member Since</span>
                </div>
                <p className="text-sm font-semibold text-text-primary">
                  {format(new Date(user.createdAt), 'MMMM d, yyyy')}
                </p>
              </div>

              {/* Auth Methods */}
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2 text-text-muted mb-1">
                  <Shield size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Sign-in Methods</span>
                </div>
                <div className="flex gap-2">
                  {user.hasPassword && (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Password
                    </span>
                  )}
                  {user.hasGoogle && (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400">
                      Google
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

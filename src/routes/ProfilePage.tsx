import { useState, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Camera,
  Save,
  X,
  Trash2,
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Globe,
  KeyRound,
  CheckCircle2,
  Pencil,
  Clock,
  Hash,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { Avatar } from '../components/ui/Avatar';
import type { UserDTO } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { usePageVariants } from '../lib/motionVariants';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import type { ReactNode } from 'react';

interface UpdateProfilePayload {
  name: string;
}

interface UploadAvatarPayload {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Badge3D({
  icon,
  size = 44,
  colorVar = '--color-accent',
  rotation = 8,
}: {
  icon: ReactNode;
  size?: number;
  colorVar?: string;
  rotation?: number;
}) {
  const isAccent = colorVar === '--color-accent';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-[30%]"
        style={{
          background: `color-mix(in srgb, var(${colorVar}) 22%, var(--color-surface))`,
          transform: `rotate(-${rotation}deg)`,
        }}
      />
      <div
        className="absolute inset-0 rounded-[30%] flex items-center justify-center text-white"
        style={{
          background: isAccent
            ? 'var(--gradient-accent)'
            : `linear-gradient(135deg, var(${colorVar}), color-mix(in srgb, var(${colorVar}) 55%, white))`,
          transform: `rotate(${rotation / 2}deg)`,
          boxShadow: `0 8px 18px color-mix(in srgb, var(${colorVar}) 35%, transparent)`,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  code,
  colorVar = '--color-accent',
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  code?: string;
  colorVar?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Badge3D icon={icon} size={40} colorVar={colorVar} rotation={8} />
      <div className="min-w-0 flex-1">
        {code && (
          <div
            className="text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5"
            style={{ color: `var(${colorVar})` }}
          >
            {code}
          </div>
        )}
        <h2 className="text-sm font-extrabold text-text-primary">{title}</h2>
        <p className="text-xs text-text-muted mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Hero — full-width, avatar left, identity right, stats far right ──────────

function ProfileHero({
  user,
  isUploading,
  isRemoving,
  onChangePhoto,
  onRemovePhoto,
}: {
  user: UserDTO;
  isUploading: boolean;
  isRemoving: boolean;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 18 });
  const blob1X = useTransform(springX, [0, 1], ['-6%', '6%']);
  const blob1Y = useTransform(springY, [0, 1], ['-6%', '6%']);
  const blob2X = useTransform(springX, [0, 1], ['6%', '-6%']);
  const blob2Y = useTransform(springY, [0, 1], ['4%', '-4%']);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const displayName = user.name ?? user.email.split('@')[0];
  const memberSince = format(new Date(user.createdAt), 'MMM d, yyyy');
  const memberAgo = formatDistanceToNow(new Date(user.createdAt), { addSuffix: true });
  const authCount = (user.hasPassword ? 1 : 0) + (user.hasGoogle ? 1 : 0);

  return (
    <div
      ref={heroRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border w-full"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow:
          '0 0 0 1px color-mix(in srgb, var(--color-accent) 6%, transparent), 0 24px 60px -12px rgba(0,0,0,0.1)',
      }}
    >
      {/* Ambient blobs */}
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full"
        aria-hidden
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </motion.div>
      <motion.div
        style={{ x: blob2X, y: blob2Y }}
        className="pointer-events-none absolute -bottom-20 -right-16 h-80 w-80 rounded-full"
        aria-hidden
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-info) 11%, transparent), transparent 70%)',
            filter: 'blur(45px)',
          }}
        />
      </motion.div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ── Main hero content: 3-zone horizontal layout ── */}
      <div className="relative flex flex-col lg:flex-row lg:items-stretch gap-0 p-5 sm:p-7 lg:p-0">

        {/* Zone 1 — Avatar + photo controls */}
        <div
          className="flex flex-row lg:flex-col items-center lg:justify-center gap-5 lg:gap-4 lg:w-56 lg:border-r lg:p-8 shrink-0"
          style={{ borderColor: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        >
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div
              className="overflow-hidden border-2 shadow-xl"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
                boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-accent) 10%, transparent), 0 12px 32px rgba(0,0,0,0.18)',
                borderRadius: 100,
                width: 100,
                height: 100,
              }}
            >
              <Avatar src={user.avatarUrl} name={user.name} email={user.email} size="2xl" className="w-full h-full" />
            </div>
            <button
              type="button"
              onClick={onChangePhoto}
              disabled={isUploading}
              aria-label="Change profile photo"
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 group-hover:bg-black/50 transition-all rounded-full opacity-0 group-hover:opacity-100"
            >
              <Camera size={18} className="text-white drop-shadow" />
              <span className="text-[9px] font-bold text-white">
                {isUploading ? 'Uploading…' : 'Change'}
              </span>
            </button>

            {/* Active dot */}
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{
                background: 'var(--color-success)',
                borderColor: 'var(--color-surface)',
                boxShadow: '0 0 8px var(--color-success)',
              }}
            />
          </div>

          {/* Photo buttons */}
          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={onChangePhoto}
              disabled={isUploading}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.97]"
              style={{
                background: 'var(--gradient-accent)',
                color: 'var(--color-text-onaccent)',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--color-accent) 22%, transparent)',
              }}
            >
              <Camera size={12} />
              {isUploading ? 'Uploading…' : 'Change photo'}
            </button>

            {user.avatarUrl && (
              <button
                type="button"
                onClick={onRemovePhoto}
                disabled={isRemoving}
                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.97]"
                style={{
                  borderColor: 'color-mix(in srgb, #ef4444 28%, transparent)',
                  background: 'color-mix(in srgb, #ef4444 7%, var(--color-surface))',
                  color: '#ef4444',
                }}
              >
                <Trash2 size={12} />
                {isRemoving ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
        </div>

        {/* Zone 2 — Identity: name, email, badges */}
        <div className="flex flex-col justify-center gap-3 flex-1 lg:p-8 lg:border-r pt-4 lg:pt-0"
          style={{ borderColor: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
        >
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] w-fit"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <UserIcon size={10} />
            Account profile
          </div>

          <div>
            <h1
              className="font-black tracking-tight leading-none"
              style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)', color: 'var(--color-text-primary)' }}
            >
              {displayName}
            </h1>
            <p className="mt-1.5 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {user.email}
            </p>
          </div>

          {/* Auth method badges */}
          <div className="flex flex-wrap gap-2">
            {user.hasPassword && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                style={{
                  background: 'color-mix(in srgb, var(--color-info) 10%, var(--color-surface))',
                  borderColor: 'color-mix(in srgb, var(--color-info) 28%, transparent)',
                  color: 'var(--color-info)',
                }}
              >
                <KeyRound size={10} />
                Password login
              </span>
            )}
            {user.hasGoogle && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                style={{
                  background: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface))',
                  borderColor: 'color-mix(in srgb, var(--color-warning) 28%, transparent)',
                  color: 'var(--color-warning)',
                }}
              >
                <Shield size={10} />
                Google linked
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
              style={{
                background: 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))',
                borderColor: 'color-mix(in srgb, var(--color-success) 28%, transparent)',
                color: 'var(--color-success)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }}
              />
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline name field ────────────────────────────────────────────────────────

function NameField({
  value,
  onChange,
  onSave,
  onCancel,
  isEditing,
  onStartEdit,
  isSaving,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  isSaving: boolean;
}) {
  return (
    <div>
      <label
        className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest mb-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <UserIcon size={11} />
        Full name
      </label>

      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <Input
                  id="profile-name"
                  label=""
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  leftIcon={<UserIcon size={15} />}
                  placeholder="Your full name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave();
                    if (e.key === 'Escape') onCancel();
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
              >
                <UserIcon size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {value || 'No name set'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!isEditing ? (
            <motion.button
              key="edit"
              type="button"
              onClick={onStartEdit}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.13 }}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold border transition-all hover:-translate-y-0.5 active:scale-[0.97] shrink-0 mt-0"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Pencil size={13} />
              Edit
            </motion.button>
          ) : (
            <motion.div
              key="save-cancel"
              className="flex gap-1.5 shrink-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.13 }}
            >
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-[0.97]"
                style={{
                  background: 'var(--gradient-accent)',
                  color: 'var(--color-text-onaccent)',
                  boxShadow: '0 4px 10px color-mix(in srgb, var(--color-accent) 22%, transparent)',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                <Save size={13} />
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="inline-flex items-center rounded-xl px-3 py-3 text-xs font-bold border transition-all hover:-translate-y-0.5 active:scale-[0.97]"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { containerVariants, itemVariants } = usePageVariants();

  const [editedName, setEditedName] = useState(user?.name ?? '');
  const [isEditing, setIsEditing] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const res = await apiClient.patch<UserDTO>('/users/me/profile', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setUser(data);
      setIsEditing(false);
      toast.success('Name updated');
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: () => toast.error('Failed to update name'),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (payload: UploadAvatarPayload) => {
      const res = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (user) setUser({ ...user, avatarUrl: data.avatarUrl });
      toast.success('Photo updated');
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: () => toast.error('Failed to upload photo'),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/users/me/avatar');
    },
    onSuccess: () => {
      if (user) setUser({ ...user, avatarUrl: null });
      toast.success('Photo removed');
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: () => toast.error('Failed to remove photo'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be smaller than 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      uploadAvatarMutation.mutate({ fileName: file.name, mimeType: file.type, base64Data });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!editedName.trim()) { toast.error('Name cannot be empty'); return; }
    updateProfileMutation.mutate({ name: editedName.trim() });
  };

  const handleCancel = () => {
    setEditedName(user?.name ?? '');
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-text-muted">No user data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 sm:pb-20 px-4 sm:px-0">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 sm:gap-5"
      >
        {/* Hero — full width */}
        <motion.div variants={itemVariants}>
          <ProfileHero
            user={user}
            isUploading={uploadAvatarMutation.isPending}
            isRemoving={removeAvatarMutation.isPending}
            onChangePhoto={() => fileInputRef.current?.click()}
            onRemovePhoto={() => removeAvatarMutation.mutate()}
          />
        </motion.div>

        {/* ── 3-column grid below hero ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">

          {/* Col 1 — Identity: name + email */}
          <Card className="p-5 flex flex-col gap-5" variant="default">
            <SectionHeader
              icon={<UserIcon size={18} />}
              title="Personal info"
              subtitle="Your name shown across the workspace."
              code="MOD.01"
              colorVar="--color-accent"
            />

            <NameField
              value={editedName}
              onChange={setEditedName}
              onSave={handleSave}
              onCancel={handleCancel}
              isEditing={isEditing}
              onStartEdit={() => setIsEditing(true)}
              isSaving={updateProfileMutation.isPending}
            />

            {/* Email */}
            <div>
              <label
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Mail size={11} />
                Email address
              </label>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
              >
                <Mail size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {user.email}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Read-only
                </span>
              </div>
              <p className="mt-1.5 px-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Email is tied to your account and cannot be changed.
              </p>
            </div>
          </Card>

          {/* Col 2 — Account details */}
          <Card className="p-5 flex flex-col gap-5" variant="default">
            <SectionHeader
              icon={<Calendar size={18} />}
              title="Account details"
              subtitle="Membership info and account identifiers."
              code="MOD.02"
              colorVar="--color-info"
            />

            <div className="flex flex-col gap-3">
              {/* Member since */}
              <div
                className="flex items-center gap-3 rounded-xl border p-3.5"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface))', color: 'var(--color-info)' }}
                >
                  <Calendar size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Member since
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {format(new Date(user.createdAt), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Member for */}
              <div
                className="flex items-center gap-3 rounded-xl border p-3.5"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))', color: 'var(--color-accent)' }}
                >
                  <Clock size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Member for
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {formatDistanceToNow(new Date(user.createdAt))}
                  </p>
                </div>
              </div>

              {/* Timezone */}
              <div
                className="flex items-center gap-3 rounded-xl border p-3.5"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-success) 22%, var(--color-border))',
                  background: 'color-mix(in srgb, var(--color-success) 5%, var(--color-surface-raised))',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))', color: 'var(--color-success)' }}
                >
                  <Globe size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Timezone
                  </p>
                  <p className="text-sm font-bold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {user.timezone}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Col 3 — Sign-in methods */}
          <Card className="p-5 flex flex-col gap-5 md:col-span-2 xl:col-span-1" variant="default">
            <SectionHeader
              icon={<Shield size={18} />}
              title="Sign-in methods"
              subtitle="Active authentication methods on this account."
              code="MOD.03"
              colorVar="--color-warning"
            />

            <div className="flex flex-col gap-3">
              {/* Password */}
              <div
                className="flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors"
                style={{
                  borderColor: user.hasPassword
                    ? 'color-mix(in srgb, var(--color-info) 28%, var(--color-border))'
                    : 'var(--color-border)',
                  background: user.hasPassword
                    ? 'color-mix(in srgb, var(--color-info) 5%, var(--color-surface-raised))'
                    : 'var(--color-surface-raised)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: user.hasPassword
                        ? 'color-mix(in srgb, var(--color-info) 16%, var(--color-surface))'
                        : 'color-mix(in srgb, var(--color-text-muted) 8%, var(--color-surface))',
                      color: user.hasPassword ? 'var(--color-info)' : 'var(--color-text-muted)',
                    }}
                  >
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Password</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {user.hasPassword ? 'Password login enabled' : 'No password set'}
                    </p>
                  </div>
                </div>
                {user.hasPassword ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
                ) : (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Not set
                  </span>
                )}
              </div>

              {/* Google */}
              <div
                className="flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors"
                style={{
                  borderColor: user.hasGoogle
                    ? 'color-mix(in srgb, var(--color-warning) 28%, var(--color-border))'
                    : 'var(--color-border)',
                  background: user.hasGoogle
                    ? 'color-mix(in srgb, var(--color-warning) 5%, var(--color-surface-raised))'
                    : 'var(--color-surface-raised)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: user.hasGoogle
                        ? 'color-mix(in srgb, var(--color-warning) 16%, var(--color-surface))'
                        : 'color-mix(in srgb, var(--color-text-muted) 8%, var(--color-surface))',
                      color: user.hasGoogle ? 'var(--color-warning)' : 'var(--color-text-muted)',
                    }}
                  >
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Google</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {user.hasGoogle ? 'Google account linked' : 'No Google account linked'}
                    </p>
                  </div>
                </div>
                {user.hasGoogle ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                ) : (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Not linked
                  </span>
                )}
              </div>

              <p className="px-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Manage passwords and Google link in{' '}
                <a
                  href="/settings?tab=security"
                  className="font-bold underline underline-offset-2 hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Settings → Security
                </a>
                .
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

import {
  Image as ImageIcon,
  Video as VideoIcon,
  Music2,
  FileText,
  FileQuestion,
} from 'lucide-react';
import type { StorageFileType } from './api';

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const TYPE_ORDER: StorageFileType[] = ['image', 'video', 'audio', 'document', 'other'];

export const TYPE_CONFIG: Record<
  StorageFileType,
  { label: string; icon: typeof ImageIcon; bg: string; color: string; badgeClass: string; gradient: string }
> = {
  image: {
    label: 'Images',
    icon: ImageIcon,
    bg: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
    color: '#3b82f6',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40',
    gradient: 'from-blue-500/20 to-blue-600/5',
  },
  video: {
    label: 'Videos',
    icon: VideoIcon,
    bg: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20',
    color: '#a855f7',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/40',
    gradient: 'from-purple-500/20 to-purple-600/5',
  },
  audio: {
    label: 'Audio & Voice',
    icon: Music2,
    bg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20',
    color: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
  },
  document: {
    label: 'Documents',
    icon: FileText,
    bg: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20',
    color: '#f59e0b',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40',
    gradient: 'from-amber-500/20 to-amber-600/5',
  },
  other: {
    label: 'Other Files',
    icon: FileQuestion,
    bg: 'bg-slate-500/10 text-slate-500 dark:bg-slate-500/20',
    color: '#64748b',
    badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/40',
    gradient: 'from-slate-500/20 to-slate-600/5',
  },
};

export const FOLDER_LABELS: Record<string, string> = {
  attachment: 'Attachments',
  attachments: 'Attachments',
  'task-attachment': 'Tasks',
  'project-attachment': 'Projects',
  'note-attachment': 'Notes',
  'goal-attachment': 'Goals',
  'ai-attachment': 'AI & Chat',
  avatar: 'Avatars',
  avatars: 'Avatars',
  'voice-note': 'Voice Notes',
  'voice-notes': 'Voice Notes',
  'note-covers': 'Note Covers',
};

export const FOLDER_COLORS: Record<string, string> = {
  attachments: '#6c63ff',
  'task-attachment': '#3b82f6',
  'project-attachment': '#8b5cf6',
  'note-attachment': '#f59e0b',
  'goal-attachment': '#10b981',
  'ai-attachment': '#ec4899',
  avatars: '#06b6d4',
  'voice-notes': '#14b8a6',
  'note-covers': '#f97316',
};

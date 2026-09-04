import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Plus,
  Send,
  Square,
  Target,
  Trash2,
  User,
  Wand2,
  X,
  ChevronLeft,
  Sparkles,
  Flag,
  PenSquare,
  CheckSquare,
  Sliders,
  FileCheck2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { appendTranscriptText, useSpeechTranscription } from '../../features/ai/hooks/useSpeechTranscription';
import {
  confirmCoachEntity,
  createAICoachChat,
  deleteAICoachChat,
  getAICoachChat,
  getAICoachChats,
  sendAICoachMessage,
  type CoachChatSendResponse,
  type CoachEntityDraft,
} from '../../features/ai/api';
import { goalPlannerApi } from '../../features/goals/api';
import { UpgradeModal } from '../billing/UpgradeModal';
import { useAIFeatureEnabled } from '../../features/ai/hooks/useAI';
import { useSettings } from '../../features/settings';
import { useGoals } from '../../features/goals/hooks/useGoals';
import { useHabits } from '../../features/habits/hooks/useHabits';
import { uploadMediaFile } from '../../lib/mediaUpload';
import type {
  CoachChatDTO,
  CoachChatListDTO,
  CoachChatMessageDTO,
  GoalDTO,
  GoalPlannerPlanDTO,
  HabitDTO,
  ListResponse,
} from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type CoachStudioPanelProps = {
  initialPrompt?: string;
  autoSend?: boolean;
};

type ComposerAttachment = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
};

type PendingExchange = {
  id: string;
  userText: string;
  imageUrls?: string[];
};

type DisplayMessage = CoachChatMessageDTO & { pending?: boolean; imageUrls?: string[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clip(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function buildPlanSeed(
  messages: CoachChatDTO['messages'],
  fallbackInput: string,
  assistantPlanPrompt?: string,
  sessionSummary?: string,
): string {
  if (assistantPlanPrompt?.trim()) return assistantPlanPrompt.trim();
  const recentUserMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.content.trim())
    .filter(Boolean);
  const parts = [sessionSummary?.trim(), ...recentUserMessages, fallbackInput.trim()].filter(Boolean);
  if (parts.length === 0) return '';
  return `Create a practical goal plan from this coaching conversation: ${parts.join(' | ')}`;
}

function toChatListItem(chat: CoachChatDTO): CoachChatListDTO {
  const { messages: _messages, ...item } = chat;
  return item;
}

function upsertChatList(
  current: ListResponse<CoachChatListDTO> | undefined,
  chat: CoachChatDTO,
): ListResponse<CoachChatListDTO> {
  const item = toChatListItem(chat);
  const nextData = current
    ? [item, ...current.data.filter((e) => e.id !== item.id)]
    : [item];
  nextData.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return { data: nextData, meta: { total: nextData.length } };
}

function removeChatFromList(
  current: ListResponse<CoachChatListDTO> | undefined,
  chatId: string,
): ListResponse<CoachChatListDTO> | undefined {
  if (!current) return current;
  const nextData = current.data.filter((c) => c.id !== chatId);
  return { data: nextData, meta: { total: nextData.length } };
}

function getActiveGoals(goals: GoalDTO[]): GoalDTO[] {
  return [...goals]
    .filter((g) => g.status !== 'ARCHIVED')
    .sort((a, b) => b.progress - a.progress);
}

function getTopHabits(habits: HabitDTO[]): HabitDTO[] {
  return [...habits]
    .filter((h) => h.isActive)
    .sort((a, b) => b.currentStreak - a.currentStreak);
}

// Image file extensions
const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif',
  'bmp', 'tiff', 'tif', 'svg',
]);

function isImageAttachment(attachment: ComposerAttachment): boolean {
  if (attachment.mimeType.startsWith('image/')) return true;
  const ext = attachment.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

function buildNonImageAttachmentSummary(attachments: ComposerAttachment[]): string {
  const nonImages = attachments.filter((a) => !isImageAttachment(a));
  if (nonImages.length === 0) return '';
  return `Attachments: ${nonImages.map((a) => a.name).join(', ')}`;
}

function extractImageUrls(attachments: ComposerAttachment[]): string[] {
  return attachments.filter(isImageAttachment).map((a) => a.url);
}

function buildOutboundMessage(text: string, attachments: ComposerAttachment[]): string {
  const trimmed = text.trim();
  const fileSummary = buildNonImageAttachmentSummary(attachments);
  if (trimmed && fileSummary) return `${trimmed}\n\n${fileSummary}`;
  return trimmed || fileSummary;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Group Chats by Date ──────────────────────────────────────────────────────

function groupChatsByDate(chats: CoachChatListDTO[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 86400000;

  const today: CoachChatListDTO[] = [];
  const previous7Days: CoachChatListDTO[] = [];
  const older: CoachChatListDTO[] = [];

  for (const chat of chats) {
    const time = new Date(chat.lastMessageAt).getTime();
    if (time >= todayStart) {
      today.push(chat);
    } else if (time >= weekStart) {
      previous7Days.push(chat);
    } else {
      older.push(chat);
    }
  }

  return { today, previous7Days, older };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1 px-1">
      <span className="h-2 w-2 animate-pulse rounded-full opacity-70 [animation-delay:0ms]" style={{ background: 'var(--color-accent)' }} />
      <span className="h-2 w-2 animate-pulse rounded-full opacity-70 [animation-delay:150ms]" style={{ background: 'var(--color-accent)' }} />
      <span className="h-2 w-2 animate-pulse rounded-full opacity-70 [animation-delay:300ms]" style={{ background: 'var(--color-accent)' }} />
    </div>
  );
}

function MessageBubble({
  role,
  content,
  pending = false,
  imageUrls,
  onCopy,
}: {
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  imageUrls?: string[];
  onCopy?: () => void;
}) {
  const isUser = role === 'user';
  const hasImages = imageUrls && imageUrls.length > 0;
  const hasText = content.trim().length > 0;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex gap-3 sm:gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start group`}>
      {/* Avatar */}
      <div
        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl shadow-xs"
        style={{
          background: isUser
            ? 'color-mix(in srgb, var(--color-accent) 18%, var(--color-surface))'
            : 'var(--color-accent)',
          color: isUser ? 'var(--color-accent)' : '#ffffff',
          borderRadius: isUser ? '9999px' : '12px',
        }}
      >
        {isUser ? <User size={15} /> : <Bot size={16} />}
      </div>

      {/* Bubble container */}
      <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Role label */}
        <div className={`flex items-center gap-1.5 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-accent)' }}
          >
            {isUser ? 'YOU' : 'COACH'}
          </span>
        </div>

        {/* Image attachments */}
        {hasImages && (
          <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {imageUrls!.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group relative block">
                <img
                  src={url}
                  alt="Attached image"
                  className="rounded-2xl border object-cover shadow-sm transition-opacity group-hover:opacity-90 max-w-[240px] max-h-[200px]"
                  style={{
                    borderColor: isUser
                      ? 'color-mix(in srgb, var(--color-accent) 30%, var(--color-border))'
                      : 'var(--color-border)',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <ImageIcon size={18} className="text-white drop-shadow" />
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Text bubble */}
        {(hasText || pending) && (
          <div
            className="rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm leading-relaxed shadow-xs border"
            style={{
              background: isUser
                ? 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface-raised))'
                : 'var(--color-surface)',
              borderColor: isUser
                ? 'color-mix(in srgb, var(--color-accent) 26%, var(--color-border))'
                : 'var(--color-border)',
              color: 'var(--color-text-primary)',
              borderTopRightRadius: isUser ? '4px' : '16px',
              borderTopLeftRadius: isUser ? '16px' : '4px',
            }}
          >
            {pending ? <TypingDots /> : <p className="whitespace-pre-wrap select-text font-normal">{content}</p>}
          </div>
        )}

        {/* Action button below message (Copy) */}
        {!isUser && !pending && onCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:opacity-100 opacity-70"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Copy size={11} />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ComposerAttachment;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))',
        borderColor: 'color-mix(in srgb, var(--color-accent) 25%, var(--color-border))',
        color: 'var(--color-text-primary)',
      }}
    >
      {isImageAttachment(attachment) ? (
        <ImageIcon size={12} style={{ color: 'var(--color-accent)' }} />
      ) : (
        <FileText size={12} style={{ color: 'var(--color-accent)' }} />
      )}
      <span className="max-w-[140px] truncate">{clip(attachment.name, 24)}</span>
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-red-500 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="Remove"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Left Sidebar (AI Coach Chats) ────────────────────────────────────────────

function ChatHistorySidebar({
  chats,
  isLoading,
  selectedChatId,
  isDraftMode,
  isBusy,
  canCreateChat,
  onNew,
  onSelect,
  onDelete,
  collapsed,
  onToggle,
  isMobile,
  onCloseMobile,
}: {
  chats: CoachChatListDTO[];
  isLoading: boolean;
  selectedChatId: string | null;
  isDraftMode: boolean;
  isBusy: boolean;
  canCreateChat: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (chat: CoachChatListDTO) => void;
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  onCloseMobile?: () => void;
}) {
  const { today, previous7Days, older } = useMemo(() => groupChatsByDate(chats), [chats]);

  const renderChatGroup = (groupTitle: string, groupChats: CoachChatListDTO[]) => {
    if (groupChats.length === 0) return null;
    return (
      <div key={groupTitle} className="space-y-1 mb-3">
        {!collapsed && (
          <p className="px-2 text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            {groupTitle}
          </p>
        )}
        {groupChats.map((chat) => {
          const isActive = chat.id === selectedChatId && !isDraftMode;
          return (
            <div
              key={chat.id}
              className="group relative rounded-xl transition-all"
              style={{
                background: isActive
                  ? 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))'
                  : 'transparent',
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(chat.id)}
                className="w-full text-left rounded-xl p-2.5 transition-colors hover:bg-[var(--sidebar-item-hover)]"
                title={collapsed ? chat.title : undefined}
              >
                {collapsed ? (
                  <Sparkles
                    size={16}
                    className="mx-auto"
                    style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                  />
                ) : (
                  <div className="pr-6">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Sparkles
                        size={13}
                        className="shrink-0"
                        style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                      />
                      <p
                        className="text-xs font-bold truncate leading-snug"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {chat.title}
                      </p>
                    </div>
                    <p
                      className="text-[11px] truncate leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {chat.preview || 'No messages yet'}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {formatRelativeTime(chat.lastMessageAt)}
                    </p>
                  </div>
                )}
              </button>

              {!collapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(chat);
                  }}
                  className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all hover:text-red-500"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label={`Delete ${chat.title}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside
      className={`flex flex-col border-r shrink-0 transition-all duration-200 ${
        isMobile ? 'fixed inset-y-0 left-0 z-30 shadow-2xl' : ''
      }`}
      style={{
        width: collapsed ? (isMobile ? '0' : '64px') : isMobile ? '290px' : '260px',
        display: isMobile && collapsed ? 'none' : 'flex',
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3.5 h-14 shrink-0"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={16} className="shrink-0" style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-black truncate tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              AI Coach
            </span>
          </div>
        )}
        <button
          onClick={isMobile ? onCloseMobile : onToggle}
          className="p-1.5 rounded-lg transition-colors ml-auto hover:bg-[var(--sidebar-item-hover)]"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isMobile ? <X size={16} /> : collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* New chat button */}
      <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <button
          onClick={onNew}
          disabled={!canCreateChat || isBusy}
          className={`flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-3 text-xs font-bold transition-all border disabled:opacity-40 shadow-2xs ${
            collapsed ? 'px-0' : ''
          }`}
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))',
            borderColor: 'color-mix(in srgb, var(--color-accent) 25%, var(--color-border))',
            color: 'var(--color-accent)',
          }}
          aria-label="New chat"
        >
          <Plus size={15} className="shrink-0" />
          {!collapsed && <span>New chat</span>}
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {isLoading ? (
          !collapsed && (
            <div className="flex items-center justify-center py-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span className="animate-pulse">Loading chats…</span>
            </div>
          )
        ) : chats.length === 0 ? (
          !collapsed && (
            <div className="px-3 py-6 text-center text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              No chats yet.<br />Send a message to start coaching.
            </div>
          )
        ) : (
          <>
            {renderChatGroup('Today', today.length > 0 ? today : chats.length > 0 && previous7Days.length === 0 && older.length === 0 ? chats : [])}
            {today.length > 0 && renderChatGroup('Previous 7 Days', previous7Days)}
            {today.length > 0 && renderChatGroup('Older', older)}
          </>
        )}
      </div>
    </aside>
  );
}

// ─── Right Sidebar (Context Panel) ────────────────────────────────────────────

type QuickPromptItem = {
  id: string;
  title: string;
  subtitle: string;
  promptText: string;
  icon: any;
  iconBg: string;
  iconColor: string;
};

const RICH_QUICK_PROMPTS: QuickPromptItem[] = [
  {
    id: 'refine',
    title: 'Refine Response',
    subtitle: 'Make the response more concise and actionable',
    promptText: 'Make the previous response more concise, structured, and immediately actionable.',
    icon: PenSquare,
    iconBg: 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))',
    iconColor: 'var(--color-accent)',
  },
  {
    id: 'brainstorm',
    title: 'Brainstorm Ideas',
    subtitle: 'Generate more creative variations and possibilities',
    promptText: 'Generate more creative variations, alternative ideas, and out-of-the-box possibilities for this.',
    icon: Sparkles,
    iconBg: 'color-mix(in srgb, #a855f7 14%, var(--color-surface))',
    iconColor: '#a855f7',
  },
  {
    id: 'examples',
    title: 'Ask for Examples',
    subtitle: 'Show real-world examples and use cases',
    promptText: 'Show concrete real-world examples and practical use cases for this.',
    icon: CheckSquare,
    iconBg: 'color-mix(in srgb, var(--color-success) 14%, var(--color-surface))',
    iconColor: 'var(--color-success)',
  },
  {
    id: 'tone',
    title: 'Change Tone',
    subtitle: 'Adjust the tone to be more professional / casual',
    promptText: 'Adjust the tone to be direct, structured, and highly professional.',
    icon: Sliders,
    iconBg: 'color-mix(in srgb, var(--color-warning) 14%, var(--color-surface))',
    iconColor: 'var(--color-warning)',
  },
  {
    id: 'summarize',
    title: 'Summarize Chat',
    subtitle: 'Summarize our conversation in key points',
    promptText: 'Summarize our conversation so far into key takeaways, decisions, and immediate next steps.',
    icon: FileCheck2,
    iconBg: 'color-mix(in srgb, var(--color-danger) 14%, var(--color-surface))',
    iconColor: 'var(--color-danger)',
  },
];

function ContextPanel({
  goals,
  habits,
  isDraftMode,
  selectedChatSummary,
  refreshLabel,
  lastCoachResult,
  plan,
  isGeneratingPlan,
  isCreatingWorkspace,
  canBuildPlan,
  onBuildPlan,
  onCreateWorkspace,
  collapsed,
  onToggle,
  onPromptSelect,
  isMobile,
  onCloseMobile,
}: {
  goals: GoalDTO[];
  habits: HabitDTO[];
  isDraftMode: boolean;
  selectedChatSummary: string;
  refreshLabel: string;
  lastCoachResult: CoachChatSendResponse['result'] | null;
  plan: GoalPlannerPlanDTO | null;
  isGeneratingPlan: boolean;
  isCreatingWorkspace: boolean;
  canBuildPlan: boolean;
  onBuildPlan: () => void;
  onCreateWorkspace: () => void;
  collapsed: boolean;
  onToggle: () => void;
  onPromptSelect?: (prompt: string) => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}) {
  const activeGoals = getActiveGoals(goals);
  const activeHabits = getTopHabits(habits);

  return (
    <aside
      className={`flex flex-col border-l shrink-0 overflow-y-auto no-scrollbar transition-all duration-200 ${
        isMobile ? 'fixed inset-y-0 right-0 z-30 shadow-2xl' : ''
      }`}
      style={{
        width: collapsed ? (isMobile ? '0' : '48px') : isMobile ? '300px' : '285px',
        display: isMobile && collapsed ? 'none' : 'flex',
        background: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 h-14 shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {!collapsed && (
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            CONTEXT
          </span>
        )}
        <button
          onClick={isMobile ? onCloseMobile : onToggle}
          className="p-1.5 rounded-lg transition-colors ml-auto hover:bg-[var(--sidebar-item-hover)]"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label={collapsed ? 'Expand context' : 'Collapse context'}
        >
          {isMobile ? <X size={16} /> : collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 p-4 space-y-5">
          {/* SNAPSHOT Section */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              SNAPSHOT
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Goals card */}
              <div
                className="rounded-2xl border p-3.5 flex flex-col items-center justify-center text-center shadow-2xs"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="mb-1.5" style={{ color: 'var(--color-accent)' }}>
                  <Flag size={18} />
                </div>
                <p className="text-xl font-black leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {activeGoals.length}
                </p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Goals
                </p>
              </div>

              {/* Habits card */}
              <div
                className="rounded-2xl border p-3.5 flex flex-col items-center justify-center text-center shadow-2xs"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="mb-1.5" style={{ color: 'var(--color-success)' }}>
                  <Target size={18} />
                </div>
                <p className="text-xl font-black leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {activeHabits.length}
                </p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Habits
                </p>
              </div>
            </div>
          </div>

          {/* MEMORY Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                MEMORY
              </p>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Auto-refresh every {refreshLabel}
            </p>
            <div
              className="rounded-2xl border p-3.5 text-xs leading-relaxed"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {selectedChatSummary ? clip(selectedChatSummary, 140) : 'No saved memory yet. Chat with the coach to build long-term memory.'}
            </div>
          </div>

          {/* QUICK PROMPTS Section */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              QUICK PROMPTS
            </p>
            <div className="space-y-2">
              {RICH_QUICK_PROMPTS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPromptSelect?.(item.promptText)}
                    className="w-full text-left rounded-2xl border p-3 transition-all hover:border-[var(--color-accent)] hover:shadow-xs group flex items-start gap-3"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div
                      className="h-8 w-8 rounded-xl shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform"
                      style={{ background: item.iconBg, color: item.iconColor }}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-bold transition-colors group-hover:text-[var(--color-accent)]"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.title}
                      </p>
                      <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan Section */}
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              ACTION PLAN
            </p>

            {plan ? (
              <div className="space-y-2">
                <div
                  className="rounded-2xl border p-3"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))',
                    borderColor: 'color-mix(in srgb, var(--color-accent) 25%, var(--color-border))',
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{plan.goal.title}</p>
                  <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{clip(plan.summary, 80)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: `${plan.milestones.length} milestones` },
                      { label: `${plan.tasks.length} tasks` },
                      { label: `${plan.habits.length} habits` },
                    ].map(({ label }) => (
                      <span
                        key={label}
                        className="text-[9px] font-bold rounded-full px-2 py-0.5 border"
                        style={{
                          background: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <Button size="sm" fullWidth onClick={onCreateWorkspace} loading={isCreatingWorkspace}>
                  Create workspace
                </Button>
              </div>
            ) : (
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Generate an executable goal workspace directly from your conversation.
              </p>
            )}

            <Button
              size="sm"
              variant="secondary"
              fullWidth
              onClick={onBuildPlan}
              loading={isGeneratingPlan}
              disabled={!canBuildPlan}
              leftIcon={<Wand2 size={12} />}
            >
              {plan ? 'Regenerate plan' : 'Build plan'}
            </Button>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-col items-center gap-4 py-4" style={{ color: 'var(--color-text-muted)' }}>
          <Flag size={16} />
          <Target size={16} />
          <Wand2 size={16} />
        </div>
      )}
    </aside>
  );
}

// ─── Entity Draft Banner ──────────────────────────────────────────────────────

const ENTITY_LABELS: Record<CoachEntityDraft['entity'], string> = {
  task: 'Task',
  habit: 'Habit',
  goal: 'Goal',
  project: 'Project',
};

function EntityDraftBanner({
  draft,
  isConfirming,
  onConfirm,
  onDismiss,
}: {
  draft: CoachEntityDraft;
  isConfirming: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const entityLabel = ENTITY_LABELS[draft.entity] ?? draft.entity;
  const filledFields = Object.entries(draft.fields).filter(([, v]) => v !== null && v !== '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="mx-3 sm:mx-6 mb-3 rounded-2xl border p-3 sm:p-4 shadow-sm"
      style={{
        background: 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))',
        borderColor: 'color-mix(in srgb, var(--color-success) 30%, var(--color-border))',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--color-success) 18%, var(--color-surface))',
              color: 'var(--color-success)',
            }}
          >
            <CheckCircle2 size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              Create {entityLabel}: <span className="font-extrabold" style={{ color: 'var(--color-accent)' }}>{draft.title}</span>
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Coach detected actionable items and prepared this draft
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md transition-colors hover:text-red-500"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {filledFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filledFields.slice(0, 5).map(([field, value]) => (
            <span
              key={field}
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold truncate max-w-[200px]"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              title={`${field}: ${value}`}
            >
              {field}: {value}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          loading={isConfirming}
          leftIcon={<CheckCircle2 size={12} />}
        >
          Create {entityLabel}
        </Button>
        <Button size="sm" variant="secondary" onClick={onDismiss} disabled={isConfirming}>
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CoachStudioPanelV3({ initialPrompt = '', autoSend = false }: CoachStudioPanelProps) {
  const coachEnabled = useAIFeatureEnabled('coachEnabled');
  const { data: settings } = useSettings();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const canChat = Boolean(settings) && coachEnabled;
  const canCreateChat = Boolean(settings);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isDraftMode, setIsDraftMode] = useState(true);
  const [input, setInput] = useState(initialPrompt.trim());
  const [assistantPlanPrompt, setAssistantPlanPrompt] = useState('');
  const [plan, setPlan] = useState<GoalPlannerPlanDTO | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [lastCoachResult, setLastCoachResult] = useState<CoachChatSendResponse['result'] | null>(null);
  const [pendingExchange, setPendingExchange] = useState<PendingExchange | null>(null);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<CoachChatListDTO | null>(null);
  const [historySidebarCollapsed, setHistorySidebarCollapsed] = useState(false);
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false);
  const [showQuickPromptsPopover, setShowQuickPromptsPopover] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [pendingEntityDraft, setPendingEntityDraft] = useState<CoachEntityDraft | null>(null);
  const [isConfirmingEntity, setIsConfirmingEntity] = useState(false);
  const [quotaUpgradeOpen, setQuotaUpgradeOpen] = useState(false);

  const hasAutoSentRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Recalculate textarea height whenever input value changes (covers prefill & prompt clicks)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const transcription = useSpeechTranscription({
    onTranscript: (text) => {
      setInput((cur) => appendTranscriptText(cur, text));
    },
  });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const chatsQuery = useQuery({
    queryKey: ['ai-coach-chats'],
    queryFn: getAICoachChats,
    enabled: Boolean(settings),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const selectedChatQuery = useQuery({
    queryKey: ['ai-coach-chat', selectedChatId],
    queryFn: () => getAICoachChat(selectedChatId!),
    enabled: Boolean(settings) && Boolean(selectedChatId) && !isDraftMode,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: goalsData } = useGoals();
  const { data: habitsData } = useHabits();

  const chats = chatsQuery.data?.data ?? [];
  const goals = goalsData?.data ?? [];
  const habits = habitsData?.data ?? [];
  const selectedChat = selectedChatQuery.data ?? null;
  const selectedChatListItem = chats.find((c) => c.id === selectedChatId) ?? null;
  const selectedChatTitle =
    isDraftMode && !selectedChat ? 'New Chat' : selectedChat?.title ?? selectedChatListItem?.title ?? 'Coach';
  const selectedChatSummary = selectedChat?.summary ?? selectedChatListItem?.summary ?? '';
  const messages = selectedChat?.messages ?? [];

  const displayMessages = useMemo<DisplayMessage[]>(
    () =>
      pendingExchange
        ? [
            ...messages,
            {
              id: `pending-user-${pendingExchange.id}`,
              chatId: selectedChatId ?? 'draft',
              role: 'user',
              content: pendingExchange.userText,
              createdAt: new Date().toISOString(),
              imageUrls: pendingExchange.imageUrls,
            },
            {
              id: `pending-assistant-${pendingExchange.id}`,
              chatId: selectedChatId ?? 'draft',
              role: 'assistant',
              content: '',
              createdAt: new Date().toISOString(),
              pending: true,
            },
          ]
        : messages,
    [messages, pendingExchange, selectedChatId],
  );

  const refreshLabel = settings?.ai?.summaryRefreshMinutes ? `${settings.ai.summaryRefreshMinutes}m` : '60m';
  const canBuildPlan = Boolean(
    buildPlanSeed(displayMessages, input, assistantPlanPrompt, selectedChatSummary),
  );
  const isBusy = isSending || isCreatingChat || isUploadingAttachments || isDeletingChat;

  // ── Cache helpers ────────────────────────────────────────────────────────────
  const syncChatCache = (chat: CoachChatDTO) => {
    queryClient.setQueryData(['ai-coach-chat', chat.id], chat);
    queryClient.setQueryData<ListResponse<CoachChatListDTO> | undefined>(['ai-coach-chats'], (cur) =>
      upsertChatList(cur, chat),
    );
  };

  const removeChatCache = (chatId: string) => {
    queryClient.setQueryData<ListResponse<CoachChatListDTO> | undefined>(['ai-coach-chats'], (cur) =>
      removeChatFromList(cur, chatId),
    );
    queryClient.removeQueries({ queryKey: ['ai-coach-chat', chatId], exact: true });
  };

  const focusComposer = () => {
    if (!isDesktop) return;
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const nextPrompt = initialPrompt.trim();
    hasAutoSentRef.current = false;
    setInput(nextPrompt);
    setPlan(null);
    setAssistantPlanPrompt('');
    setLastCoachResult(null);
    setStatus(nextPrompt ? 'Prompt loaded.' : null);
  }, [initialPrompt]);

  useEffect(() => {
    if (!settings || isDraftMode || selectedChatId || chatsQuery.isLoading) return;
    if (chats.length > 0) { setSelectedChatId(chats[0].id); return; }
    setIsDraftMode(true);
  }, [chats, chatsQuery.isLoading, isDraftMode, selectedChatId, settings]);

  useEffect(() => {
    if (!isDesktop) return;
    const handle = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(handle);
  }, [isDesktop, selectedChatId, isDraftMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [displayMessages.length, selectedChatId, pendingExchange]);

  useEffect(() => {
    if (!autoSend || hasAutoSentRef.current || !initialPrompt.trim() || !canChat) return;
    hasAutoSentRef.current = true;
    void sendPromptToThread(initialPrompt.trim(), { forceNewThread: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend, canChat, initialPrompt]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleCreateNewChat() {
    if (isBusy || !canCreateChat) return;
    setSelectedChatId(null);
    setIsDraftMode(true);
    setInput('');
    setComposerAttachments([]);
    setPlan(null);
    setAssistantPlanPrompt('');
    setLastCoachResult(null);
    setPendingExchange(null);
    setPendingEntityDraft(null);
    setStatus(null);
    if (!isDesktop) {
      setMobileHistoryOpen(false);
    }
    focusComposer();
  }

  function handleSelectChat(chatId: string) {
    setSelectedChatId(chatId);
    setIsDraftMode(false);
    setInput('');
    setComposerAttachments([]);
    setPlan(null);
    setAssistantPlanPrompt('');
    setLastCoachResult(null);
    setPendingExchange(null);
    setPendingEntityDraft(null);
    setStatus(null);
    if (!isDesktop) {
      setMobileHistoryOpen(false);
    }
    focusComposer();
  }

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    setShowQuickPromptsPopover(false);
    if (!isDesktop) {
      setMobileContextOpen(false);
    }
    focusComposer();
  }

  async function handleAttachmentsChanged(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || !canChat) return;
    setIsUploadingAttachments(true);
    try {
      for (const file of files) {
        const uploaded = await uploadMediaFile(file, 'attachments');
        setComposerAttachments((cur) => [
          ...cur,
          { id: makeId('att'), name: file.name, url: uploaded.url, size: uploaded.size, mimeType: uploaded.mimeType || file.type || 'application/octet-stream' },
        ]);
      }
    } catch { setStatus('Could not upload that file.'); }
    finally { setIsUploadingAttachments(false); focusComposer(); }
  }

  async function sendPromptToThread(promptText: string, options: { forceNewThread?: boolean } = {}) {
    const trimmed = promptText.trim();
    const outboundText = buildOutboundMessage(promptText, composerAttachments);
    const imageUrls = extractImageUrls(composerAttachments);
    const displayText =
      trimmed ||
      (imageUrls.length > 0
        ? imageUrls.length === 1
          ? 'Sent an image.'
          : `Sent ${imageUrls.length} images.`
        : buildNonImageAttachmentSummary(composerAttachments) || 'Shared an attachment.');

    if ((!trimmed && composerAttachments.length === 0) || isBusy || !canChat) return;

    const outgoingAttachments = composerAttachments;
    const pendingId = makeId('pending');
    const wasDraft = options.forceNewThread || isDraftMode || !selectedChatId;
    let chatId = options.forceNewThread ? null : selectedChatId;
    let createdChatId: string | null = null;

    setPendingExchange({ id: pendingId, userText: displayText, imageUrls: imageUrls.length > 0 ? imageUrls : undefined });
    setStatus(null);
    setPlan(null);
    setAssistantPlanPrompt('');
    setLastCoachResult(null);
    setPendingEntityDraft(null);
    setInput('');
    setComposerAttachments([]);
    setIsSending(true);

    try {
      if (!chatId) {
        setIsCreatingChat(true);
        const created = await createAICoachChat();
        createdChatId = created.id;
        chatId = created.id;
        syncChatCache(created);
        setSelectedChatId(created.id);
        setIsDraftMode(false);
      }
      if (!chatId) throw new Error('No coach chat available');
      const response = await sendAICoachMessage(
        chatId,
        outboundText,
        imageUrls.length > 0 ? imageUrls : undefined,
      );
      syncChatCache(response.chat);
      setSelectedChatId(chatId);
      setIsDraftMode(false);
      setLastCoachResult(response.result);
      setAssistantPlanPrompt(response.result.planPrompt?.trim() || '');
      if (response.result.entityDraft) {
        setPendingEntityDraft(response.result.entityDraft);
        setStatus(null);
      } else if (response.result.suggestion?.actionType === 'create_plan') {
        setStatus('Plan ready — hit Build plan when you are ready.');
      } else if (response.result.suggestion?.text) {
        setStatus(`Next step: ${response.result.suggestion.text}`);
      } else {
        setStatus(null);
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'AI_QUOTA_EXCEEDED') {
        setStatus('Monthly AI request limit reached. Upgrade your plan to continue.');
        setQuotaUpgradeOpen(true);
      } else {
        if (createdChatId && wasDraft) {
          try { await deleteAICoachChat(createdChatId); removeChatCache(createdChatId); } catch { /* ignore */ }
          if (selectedChatId === createdChatId) { setSelectedChatId(null); setIsDraftMode(true); }
        }
        setInput(trimmed);
        setComposerAttachments(outgoingAttachments);
        setStatus('Could not reach the coach. Please try again.');
      }
    } finally {
      setPendingExchange(null);
      setIsSending(false);
      setIsCreatingChat(false);
      focusComposer();
    }
  }

  async function handleSend() { await sendPromptToThread(input); }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    void handleSend();
  }

  async function handleBuildPlan() {
    if (!canBuildPlan || isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    try {
      const seed = buildPlanSeed(displayMessages, input, assistantPlanPrompt, selectedChatSummary);
      const generated = await goalPlannerApi.generatePlan(seed);
      setPlan(generated);
      setStatus('Plan generated.');
    } catch { setStatus('Could not generate a plan right now.'); }
    finally { setIsGeneratingPlan(false); focusComposer(); }
  }

  async function handleConfirmEntity() {
    if (!pendingEntityDraft || isConfirmingEntity) return;
    setIsConfirmingEntity(true);
    const draft = pendingEntityDraft;
    try {
      await confirmCoachEntity(draft.entity, { title: draft.title, ...draft.fields });
      setPendingEntityDraft(null);
      const entityLabel = ENTITY_LABELS[draft.entity] ?? draft.entity;
      setStatus(`${entityLabel} "${draft.title}" created.`);
      const queryKeyMap: Record<CoachEntityDraft['entity'], string> = {
        task: 'tasks',
        habit: 'habits',
        goal: 'goals',
        project: 'projects',
      };
      void queryClient.invalidateQueries({ queryKey: [queryKeyMap[draft.entity]] });
    } catch {
      setStatus(`Could not create the ${draft.entity}. Please try again.`);
    } finally {
      setIsConfirmingEntity(false);
      focusComposer();
    }
  }

  async function handleCreateWorkspace() {
    if (!plan || isCreatingWorkspace) return;
    setIsCreatingWorkspace(true);
    try {
      const created = await goalPlannerApi.createWorkspace(plan);
      navigate(`/goals/${created.goal.id}`);
    } catch { setStatus('Could not create the workspace.'); }
    finally { setIsCreatingWorkspace(false); }
  }

  async function confirmDeleteChat() {
    if (!deleteTarget || isDeletingChat) return;
    const chatId = deleteTarget.id;
    setIsDeletingChat(true);
    try {
      await deleteAICoachChat(chatId);
      removeChatCache(chatId);
      const remaining = chats.filter((c) => c.id !== chatId);
      if (selectedChatId === chatId) {
        if (remaining.length > 0) { setSelectedChatId(remaining[0].id); setIsDraftMode(false); }
        else { setSelectedChatId(null); setIsDraftMode(true); setInput(''); }
      }
    } catch { setStatus('Could not delete that chat.'); }
    finally { setDeleteTarget(null); setIsDeletingChat(false); focusComposer(); }
  }

  return (
    <div className="flex h-full w-full overflow-hidden font-sans" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile History Backdrop */}
      {!isDesktop && mobileHistoryOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-20"
          onClick={() => setMobileHistoryOpen(false)}
        />
      )}

      {/* Mobile Context Backdrop */}
      {!isDesktop && mobileContextOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-20"
          onClick={() => setMobileContextOpen(false)}
        />
      )}

      {/* ── 1. Left Sidebar: AI Coach Chats ───────────────────────────── */}
      <ChatHistorySidebar
        chats={chats}
        isLoading={chatsQuery.isLoading}
        selectedChatId={selectedChatId}
        isDraftMode={isDraftMode}
        isBusy={isBusy}
        canCreateChat={canCreateChat}
        onNew={handleCreateNewChat}
        onSelect={handleSelectChat}
        onDelete={(chat) => setDeleteTarget(chat)}
        collapsed={!isDesktop ? !mobileHistoryOpen : historySidebarCollapsed}
        onToggle={() => setHistorySidebarCollapsed((v) => !v)}
        isMobile={!isDesktop}
        onCloseMobile={() => setMobileHistoryOpen(false)}
      />

      {/* ── 2. Center Main Chat Area ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-3 border-b px-4 sm:px-6 h-14 shrink-0 shadow-2xs"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button — always visible */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1 rounded-lg transition-colors shrink-0 hover:bg-[var(--sidebar-item-hover)]"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Mobile history toggle button — uses MessageSquare so it's distinct from the composer sparkle */}
            {!isDesktop && (
              <button
                type="button"
                onClick={() => setMobileHistoryOpen(true)}
                className="p-1.5 -ml-1 rounded-lg transition-colors shrink-0 hover:bg-[var(--sidebar-item-hover)]"
                style={{ color: 'var(--color-accent)' }}
                aria-label="Open chats history"
              >
                <MessageSquare size={18} />
              </button>
            )}

            {/* Sparkle circle icon */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))',
                color: 'var(--color-accent)',
              }}
            >
              <Sparkles size={15} />
            </div>

            {/* Chat Title & Subtitle */}
            <div className="min-w-0">
              <p className="text-sm font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
                {selectedChatTitle}
              </p>
              {selectedChatSummary && (
                <p className="text-[11px] truncate hidden sm:block max-w-[420px]" style={{ color: 'var(--color-text-muted)' }}>
                  {clip(selectedChatSummary, 65)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isSending && (
              <Badge variant="warning" size="sm" dot>
                <span className="hidden sm:inline">Thinking…</span>
                <span className="sm:hidden">...</span>
              </Badge>
            )}

            {/* Pill badge: • AI ready */}
            <div
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))',
                borderColor: 'color-mix(in srgb, var(--color-accent) 25%, var(--color-border))',
                color: 'var(--color-accent)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-accent)' }} />
              <span>{coachEnabled ? 'AI ready' : 'Coach off'}</span>
            </div>

            {/* Mobile context toggle button */}
            {!isDesktop && (
              <button
                type="button"
                onClick={() => setMobileContextOpen(true)}
                className="p-1.5 rounded-lg transition-colors shrink-0 hover:bg-[var(--sidebar-item-hover)]"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Open context"
              >
                <Target size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Coach Disabled Notice */}
        {!coachEnabled && (
          <div
            className="mx-4 sm:mx-6 mt-3 rounded-2xl border p-3.5 text-xs leading-relaxed"
            style={{
              background: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-warning) 25%, var(--color-border))',
              color: 'var(--color-text-secondary)',
            }}
          >
            AI Coach is turned off in <strong>Settings → AI &amp; Tokens</strong>. You can read chat history but cannot send new messages.
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
          {displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4 max-w-lg mx-auto py-12">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-3xl shadow-sm"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))',
                  color: 'var(--color-accent)',
                }}
              >
                <Sparkles size={26} />
              </div>
              <div className="space-y-1.5">
                <p className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
                  How can I help you today?
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Ask for goal planning, habit strategies, deep focus advice, or quick ideas.
                </p>
              </div>

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {RICH_QUICK_PROMPTS.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePromptClick(p.promptText)}
                    className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {displayMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                  >
                    <MessageBubble
                      role={msg.role}
                      content={msg.content}
                      pending={Boolean(msg.pending)}
                      imageUrls={msg.imageUrls}
                      onCopy={
                        msg.role === 'assistant' && !msg.pending
                          ? () => void navigator.clipboard?.writeText(msg.content)
                          : undefined
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Inline Entity Draft Confirmation */}
        <AnimatePresence>
          {pendingEntityDraft && !isSending && (
            <EntityDraftBanner
              draft={pendingEntityDraft}
              isConfirming={isConfirmingEntity}
              onConfirm={() => void handleConfirmEntity()}
              onDismiss={() => { setPendingEntityDraft(null); setStatus(null); }}
            />
          )}
        </AnimatePresence>

        {/* Status text */}
        {status && (
          <div className="px-4 sm:px-8 pb-1">
            <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{status}</p>
          </div>
        )}

        {/* Composer Input Area */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 pb-3 sm:pb-3 shrink-0 border-t" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-3xl mx-auto">
            {/* Attachments preview */}
            {composerAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {composerAttachments.map((att) => (
                  <AttachmentChip
                    key={att.id}
                    attachment={att}
                    onRemove={() => setComposerAttachments((cur) => cur.filter((a) => a.id !== att.id))}
                  />
                ))}
              </div>
            )}

            {/* Quick prompts dropdown popover */}
            <AnimatePresence>
              {showQuickPromptsPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mb-2 rounded-2xl border p-2 space-y-1 shadow-lg max-h-60 overflow-y-auto"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  {RICH_QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePromptClick(p.promptText)}
                      className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-2.5 hover:bg-[var(--sidebar-item-hover)]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
                      <div>
                        <p className="font-bold">{p.title}</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{p.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating rounded composer container */}
            <div
              className="rounded-2xl border shadow-sm px-2 py-1 sm:px-2.5 sm:py-1.5 flex items-end gap-1 sm:gap-1.5 transition-all focus-within:border-[var(--color-accent)]"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              {/* Left tool action buttons */}
              <div className="flex items-center gap-0.5 pl-0.5 self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => setShowQuickPromptsPopover((v) => !v)}
                  className="p-1.5 rounded-full transition-colors hover:bg-[var(--sidebar-item-hover)]"
                  style={{ color: 'var(--color-accent)' }}
                  aria-label="Quick prompts"
                  title="Quick prompts"
                >
                  <Sparkles size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canChat || isBusy}
                  className="p-1.5 rounded-full transition-colors disabled:opacity-40 hover:bg-[var(--sidebar-item-hover)]"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label="Attach file"
                  title="Attach file"
                >
                  <Paperclip size={17} />
                </button>
                {transcription.isSupported && (
                  <button
                    type="button"
                    onClick={transcription.isListening ? transcription.stop : transcription.start}
                    disabled={!transcription.isSupported || !canChat || isBusy}
                    className={`p-1.5 rounded-full transition-colors disabled:opacity-40 ${
                      transcription.isListening
                        ? 'text-red-500 bg-red-500/10 animate-pulse'
                        : 'hover:bg-[var(--sidebar-item-hover)]'
                    }`}
                    style={{ color: transcription.isListening ? undefined : 'var(--color-text-muted)' }}
                    aria-label={transcription.isListening ? 'Stop recording' : 'Voice input'}
                    title="Voice input"
                  >
                    {transcription.isListening ? <Square size={15} /> : <Mic size={17} />}
                  </button>
                )}
              </div>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    !canChat
                      ? 'AI Coach is disabled'
                      : transcription.isListening
                      ? 'Listening…'
                      : isDesktop
                      ? 'Message the coach... (Enter to send, Shift+Enter for new line)'
                      : 'Message the coach...'
                  }
                  disabled={!canChat || isBusy}
                  rows={1}
                  className="w-full resize-none bg-transparent border-0 px-2 py-1.5 text-sm outline-none disabled:opacity-50"
                  style={{
                    color: 'var(--color-text-primary)',
                    maxHeight: '140px',
                    lineHeight: '1.4',
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                  }}
                />
              </div>

              {/* Send Button */}
              <div className="pr-0.5 self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={(!input.trim() && composerAttachments.length === 0) || !canChat || isBusy || isUploadingAttachments}
                  className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-full shadow-md transition-all active:scale-95 disabled:opacity-40 shrink-0"
                  style={{ background: 'var(--color-accent)', color: '#ffffff' }}
                  aria-label="Send message"
                >
                  {isSending ? (
                    <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={15} className="-ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv"
            onChange={(e) => void handleAttachmentsChanged(e)}
          />
        </div>
      </div>

      {/* ── 3. Right Sidebar: Context Panel ───────────────────────────── */}
      <ContextPanel
        goals={goals}
        habits={habits}
        isDraftMode={isDraftMode}
        selectedChatSummary={selectedChatSummary}
        refreshLabel={refreshLabel}
        lastCoachResult={lastCoachResult}
        plan={plan}
        isGeneratingPlan={isGeneratingPlan}
        isCreatingWorkspace={isCreatingWorkspace}
        canBuildPlan={canBuildPlan}
        onBuildPlan={() => void handleBuildPlan()}
        onCreateWorkspace={() => void handleCreateWorkspace()}
        collapsed={!isDesktop ? !mobileContextOpen : contextPanelCollapsed}
        onToggle={() => setContextPanelCollapsed((v) => !v)}
        onPromptSelect={(prompt) => {
          setInput(prompt);
          if (!isDesktop) setMobileContextOpen(false);
          focusComposer();
        }}
        isMobile={!isDesktop}
        onCloseMobile={() => setMobileContextOpen(false)}
      />

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete chat">
        <div className="space-y-4">
          <p className="text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
            Delete <strong>{deleteTarget?.title}</strong>? This removes the messages and memory from history.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeletingChat}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDeleteChat()} loading={isDeletingChat}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      <UpgradeModal
        isOpen={quotaUpgradeOpen}
        onClose={() => setQuotaUpgradeOpen(false)}
        highlightFeature="AI Coach (Monthly Quota Reached)"
      />
    </div>
  );
}

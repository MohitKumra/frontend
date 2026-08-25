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
  Clock,
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
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
}

function getTopHabits(habits: HabitDTO[]): HabitDTO[] {
  return [...habits]
    .filter((h) => h.isActive)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 4);
}

// Image file extensions — used as fallback when mimeType is blank
const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif',
  'bmp', 'tiff', 'tif', 'svg',
]);

function isImageAttachment(attachment: ComposerAttachment): boolean {
  if (attachment.mimeType.startsWith('image/')) return true;
  const ext = attachment.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

/** Returns only the non-image attachments as a text summary (for PDFs, docs, etc.) */
function buildNonImageAttachmentSummary(attachments: ComposerAttachment[]): string {
  const nonImages = attachments.filter((a) => !isImageAttachment(a));
  if (nonImages.length === 0) return '';
  return `Attachments: ${nonImages.map((a) => a.name).join(', ')}`;
}

/** Returns image URLs for vision-capable LLMs */
function extractImageUrls(attachments: ComposerAttachment[]): string[] {
  return attachments.filter(isImageAttachment).map((a) => a.url);
}

function buildOutboundMessage(text: string, attachments: ComposerAttachment[]): string {
  const trimmed = text.trim();
  // Only append non-image file names as text — images go via imageUrls separately
  const fileSummary = buildNonImageAttachmentSummary(attachments);
  if (trimmed && fileSummary) return `${trimmed}\n\n${fileSummary}`;
  return trimmed || fileSummary;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1 px-1">
      <span className="h-2 w-2 animate-pulse rounded-full bg-current opacity-60 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-current opacity-60 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-current opacity-60 [animation-delay:300ms]" />
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

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border mt-0.5"
        style={{
          background: isUser
            ? 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))'
            : 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface))',
          borderColor: isUser
            ? 'color-mix(in srgb, var(--color-accent) 30%, var(--color-border))'
            : 'color-mix(in srgb, var(--color-info) 25%, var(--color-border))',
          color: isUser ? 'var(--color-accent)' : 'var(--color-info)',
        }}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* Bubble content */}
      <div className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[72%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-1"
          style={{ color: isUser ? 'var(--color-accent)' : 'var(--color-info)' }}
        >
          {isUser ? 'You' : 'Coach'}
        </span>

        {/* Image previews — shown above the text bubble */}
        {hasImages && (
          <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {imageUrls!.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group relative block">
                <img
                  src={url}
                  alt="Attached image"
                  className="rounded-xl border object-cover shadow-sm transition-opacity group-hover:opacity-90"
                  style={{
                    maxWidth: '240px',
                    maxHeight: '200px',
                    borderColor: isUser
                      ? 'color-mix(in srgb, var(--color-accent) 22%, var(--color-border))'
                      : 'var(--color-border)',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <ImageIcon size={18} className="text-white drop-shadow" />
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Text bubble — only render if there is text or it's pending */}
        {(hasText || pending) && (
          <div
            className="rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm"
            style={{
              background: isUser
                ? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))'
                : 'var(--color-surface)',
              border: `1px solid ${
                isUser
                  ? 'color-mix(in srgb, var(--color-accent) 22%, var(--color-border))'
                  : 'var(--color-border)'
              }`,
              color: 'var(--color-text-primary)',
              borderTopRightRadius: isUser ? '4px' : '16px',
              borderTopLeftRadius: isUser ? '16px' : '4px',
            }}
          >
            {pending ? <TypingDots /> : <p className="whitespace-pre-wrap">{content}</p>}
          </div>
        )}

        {!isUser && !pending && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 px-1 text-[11px] font-semibold text-text-muted transition-colors hover:text-text-primary"
          >
            <Copy size={11} />
            Copy
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
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {isImageAttachment(attachment) ? <ImageIcon size={11} /> : <FileText size={11} />}
      <span className="max-w-[140px] truncate">{clip(attachment.name, 24)}</span>
      <button type="button" onClick={onRemove} className="text-text-muted hover:text-danger" aria-label="Remove">
        <X size={11} />
      </button>
    </div>
  );
}

// ─── History sidebar ──────────────────────────────────────────────────────────

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
}) {
  return (
    <aside
      className={`flex flex-col border-r shrink-0 transition-all duration-200 ${
        isMobile ? 'absolute inset-y-0 left-0 z-20 bg-[var(--sidebar-bg)]' : ''
      }`}
      style={{
        width: collapsed ? (isMobile ? '0' : '56px') : isMobile ? '280px' : '260px',
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
        display: isMobile && collapsed ? 'none' : 'flex',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 shrink-0"
        style={{ height: '56px', borderColor: 'var(--sidebar-border)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={16} className="text-accent shrink-0" />
            <span className="text-sm font-black text-text-primary truncate">Chats</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--sidebar-item-hover)] transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* New chat button */}
      <div className={`p-2 border-b shrink-0`} style={{ borderColor: 'var(--sidebar-border)' }}>
        <button
          onClick={onNew}
          disabled={!canCreateChat || isBusy}
          className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-xs font-bold transition-colors hover:bg-[var(--sidebar-item-hover)] disabled:opacity-40"
          style={{ color: 'var(--color-accent)' }}
          aria-label="New chat"
        >
          <Plus size={14} className="shrink-0" />
          {!collapsed && <span>New chat</span>}
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5 no-scrollbar">
        {isLoading ? (
          !collapsed && (
            <p className="px-2 py-3 text-xs text-text-muted">Loading…</p>
          )
        ) : chats.length === 0 ? (
          !collapsed && (
            <p className="px-2 py-3 text-xs text-text-muted leading-relaxed">
              No chats yet. Send a message to start the first thread.
            </p>
          )
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === selectedChatId && !isDraftMode;
            return (
              <div
                key={chat.id}
                className={`group relative rounded-lg transition-colors ${collapsed ? 'mx-0' : ''}`}
                style={{
                  background: isActive
                    ? 'color-mix(in srgb, var(--color-accent) 9%, var(--color-surface))'
                    : 'transparent',
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  className="w-full text-left rounded-lg px-2.5 py-2.5 transition-colors hover:bg-[var(--sidebar-item-hover)]"
                  title={collapsed ? chat.title : undefined}
                >
                  {collapsed ? (
                    <Sparkles
                      size={16}
                      className="mx-auto"
                      style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                    />
                  ) : (
                    <div className="pr-5">
                      <p className="text-xs font-bold text-text-primary truncate leading-snug">{chat.title}</p>
                      <p className="text-[10px] text-text-muted truncate mt-0.5 leading-relaxed">
                        {chat.preview || 'New chat'}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">{formatRelativeTime(chat.lastMessageAt)}</p>
                    </div>
                  )}
                </button>

                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => onDelete(chat)}
                    className="absolute right-1.5 top-2.5 opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-danger transition-all"
                    aria-label={`Delete ${chat.title}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ─── Context panel ────────────────────────────────────────────────────────────

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
}) {
  const activeGoals = getActiveGoals(goals);
  const topHabits = getTopHabits(habits);

  return (
    <aside
      className="hidden lg:flex flex-col border-l shrink-0 overflow-y-auto no-scrollbar transition-all duration-200"
      style={{
        width: collapsed ? '48px' : '280px',
        background: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 shrink-0"
        style={{ height: '56px', borderColor: 'var(--color-border)' }}
      >
        {!collapsed && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Context</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--sidebar-item-hover)] transition-colors ml-auto"
          aria-label={collapsed ? 'Expand context' : 'Collapse context'}
        >
          {collapsed ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 p-3 space-y-4">
          {/* Quick stats */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Snapshot</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Flag, label: 'Goals', value: activeGoals.length, color: 'var(--color-accent)' },
                { icon: Target, label: 'Habits', value: topHabits.length, color: 'var(--color-success)' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl border p-2.5 text-center"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  <Icon size={14} style={{ color }} className="mx-auto mb-1" />
                  <p className="text-base font-black text-text-primary">{value}</p>
                  <p className="text-[10px] text-text-muted">{label}</p>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Memory</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {selectedChatSummary ? clip(selectedChatSummary, 100) : 'No saved memory yet.'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <Clock size={10} />
              <span>Auto-refresh every {refreshLabel}</span>
            </div>
          </div>

          {/* Quick prompts for entity creation */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Quick Prompts</p>
            <div className="space-y-1.5">
              {[
                { 
                  icon: '📝', 
                  label: 'Task #1', 
                  prompt: 'Create a critical task: prepare Q4 board presentation by next Friday at 2pm, remind me 1 hour before with message "final review time", recurring quarterly, with subtasks: gather financial data, create slide deck, get CEO approval' 
                },
                { 
                  icon: '📝', 
                  label: 'Task #2', 
                  prompt: 'Create daily task: gym workout at 5am, remind me at 4:30am with message "rise and grind", skip Sundays, estimated 1.5 hours, link to my fitness project, high priority' 
                },
                { 
                  icon: '✅', 
                  label: 'Habit #1', 
                  prompt: 'Create habit: morning workout for 30 minutes every day at 6am, remind me at 5:45am with message "time to move", skip Saturdays and Sundays, commit for 90 days, link to my fitness goal' 
                },
                { 
                  icon: '✅', 
                  label: 'Habit #2', 
                  prompt: 'Create weekly habit: team standup meeting every Monday and Thursday at 10am, remind me 15 minutes before, duration 30 minutes, link to management project, track consistency for performance review' 
                },
                { 
                  icon: '🎯', 
                  label: 'Goal #1', 
                  prompt: 'Create high priority career goal: launch freelance consulting business with 3 paying clients by March 31st 2027, focus on building sustainable side income, track with blue rocket icon' 
                },
                { 
                  icon: '🎯', 
                  label: 'Goal #2', 
                  prompt: 'Create fitness goal: lose 15 pounds by summer 2027, medium priority, health category, description: combine strength training 3x week with calorie tracking, green dumbbell icon' 
                },
                { 
                  icon: '📦', 
                  label: 'Project #1', 
                  prompt: 'Create active project: home office renovation starting today until December 15th, includes designing layout, purchasing furniture, hiring contractors, setting up tech equipment, purple color scheme, link to productivity goal' 
                },
                { 
                  icon: '📦', 
                  label: 'Project #2', 
                  prompt: 'Create project: marketing campaign for product launch, active status, start March 1st 2027 end May 31st 2027, description: social media, email sequences, influencer outreach, paid ads, orange theme' 
                },
              ].map(({ icon, label, prompt }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onPromptSelect?.(prompt)}
                  className="w-full text-left rounded-lg border px-2.5 py-2 hover:border-accent transition-colors group"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  title={prompt}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-text-secondary group-hover:text-accent transition-colors block">
                        {label}
                      </span>
                      <p className="text-[10px] text-text-muted leading-relaxed mt-0.5 line-clamp-2">
                        {prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Next step from coach */}
          {lastCoachResult?.suggestion?.text && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Next step</p>
              <div
                className="rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-info) 25%, var(--color-border))',
                  background: 'color-mix(in srgb, var(--color-info) 6%, var(--color-surface))',
                }}
              >
                <p className="text-xs font-semibold text-text-primary leading-relaxed">
                  {lastCoachResult.suggestion.text}
                </p>
              </div>
            </div>
          )}

          {/* Plan section */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Action plan</p>

            {plan ? (
              <div className="space-y-2">
                <div
                  className="rounded-xl border px-3 py-2.5"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  <p className="text-xs font-black text-text-primary">{plan.goal.title}</p>
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{clip(plan.summary, 80)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: `${plan.milestones.length} milestones` },
                      { label: `${plan.tasks.length} tasks` },
                      { label: `${plan.habits.length} habits` },
                    ].map(({ label }) => (
                      <span
                        key={label}
                        className="text-[10px] font-bold rounded-full px-2 py-0.5 border"
                        style={{
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          background: 'var(--color-surface-raised)',
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
              <p className="text-[11px] text-text-muted leading-relaxed">
                Chat first, then build a structured plan from the conversation.
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
              {plan ? 'Regenerate' : 'Build plan'}
            </Button>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex flex-col items-center gap-4 py-4">
          <Flag size={15} className="text-text-muted" />
          <Target size={15} className="text-text-muted" />
          <Wand2 size={15} className="text-text-muted" />
        </div>
      )}
    </aside>
  );
}

// ─── Entity draft banner ──────────────────────────────────────────────────────
// Shown inline in the chat area when the coach returns an entityDraft.
// The user can confirm (create) or dismiss it.

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
      className="mx-3 sm:mx-4 mb-3 rounded-2xl border p-3 sm:p-4"
      style={{
        background: 'color-mix(in srgb, var(--color-success) 6%, var(--color-surface))',
        borderColor: 'color-mix(in srgb, var(--color-success) 28%, var(--color-border))',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--color-success) 14%, var(--color-surface))',
              color: 'var(--color-success)',
            }}
          >
            <CheckCircle2 size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-text-primary">
              Create {entityLabel}: <span className="text-accent break-words">{draft.title}</span>
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              Coach is ready to create this {entityLabel.toLowerCase()} for you
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded text-text-muted hover:text-text-primary transition-colors"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>

      {/* Field summary chips */}
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
          {filledFields.length > 5 && (
            <span
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              +{filledFields.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
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

// ─── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  'Summarize my latest progress and the next blocker.',
  'Give me one honest next step for today.',
  'Turn this chat into a practical plan.',
  'Review my habits and show the weakest point.',
  'What should I focus on in the next 30 minutes?',
  'Help me make this goal more realistic.',
];

// ─── Main component ───────────────────────────────────────────────────────────

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
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  // Entity draft — set when the coach returns an entityDraft in its response
  const [pendingEntityDraft, setPendingEntityDraft] = useState<CoachEntityDraft | null>(null);
  const [isConfirmingEntity, setIsConfirmingEntity] = useState(false);
  const [quotaUpgradeOpen, setQuotaUpgradeOpen] = useState(false);

  const hasAutoSentRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    isDraftMode && !selectedChat ? 'New chat' : selectedChat?.title ?? selectedChatListItem?.title ?? 'Coach';
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
    // Only auto-focus on desktop to avoid keyboard popping up on mobile
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
    // Close sidebar on mobile after selecting a chat
    if (!isDesktop) {
      setHistorySidebarCollapsed(true);
    }
    focusComposer();
  }

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    setShowQuickPrompts(false);
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
    // Display text: use the raw text + image count hint if no text but images present
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
      // Surface entity draft if the coach gathered enough info to create an entity
      if (response.result.entityDraft) {
        setPendingEntityDraft(response.result.entityDraft);
        setStatus(null);
      } else if (response.result.suggestion?.actionType === 'create_plan') {
        setStatus('Plan ready — hit Build plan when you\'re ready.');
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
      // Invalidate the relevant list so the sidebar / page refreshes
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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile sidebar backdrop */}
      {!isDesktop && !historySidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-10"
          onClick={() => setHistorySidebarCollapsed(true)}
          style={{ backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* ── History sidebar ─────────────────────────────────────────────── */}
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
        collapsed={historySidebarCollapsed}
        onToggle={() => setHistorySidebarCollapsed((v) => !v)}
        isMobile={!isDesktop}
      />

      {/* ── Chat area ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Chat topbar */}
        <div
          className="flex items-center justify-between gap-3 border-b px-4 shrink-0"
          style={{ height: '56px', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile menu toggle */}
            {!isDesktop && (
              <button
                type="button"
                onClick={() => setHistorySidebarCollapsed((v) => !v)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors shrink-0"
                aria-label="Toggle menu"
              >
                <Sparkles size={18} />
              </button>
            )}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))',
                color: 'var(--color-accent)',
              }}
            >
              <Sparkles size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-text-primary truncate">{selectedChatTitle}</p>
              {selectedChatSummary && (
                <p className="text-[10px] text-text-muted truncate hidden sm:block">
                  {clip(selectedChatSummary, 60)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSending && (
              <Badge variant="warning" size="sm" dot>
                <span className="hidden sm:inline">Thinking…</span>
                <span className="sm:hidden">...</span>
              </Badge>
            )}
            {isDraftMode && !isSending && (
              <Badge variant="default" size="sm">
                Draft
              </Badge>
            )}
            <Badge variant={coachEnabled ? 'accent' : 'warning'} size="sm" dot className="hidden sm:flex">
              {coachEnabled ? 'AI ready' : 'Coach off'}
            </Badge>
          </div>
        </div>

        {/* Coach-off warning */}
        {!coachEnabled && (
          <div
            className="mx-3 sm:mx-4 mt-3 rounded-xl border px-3 sm:px-4 py-3 text-xs leading-relaxed"
            style={{
              background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-warning) 22%, var(--color-border))',
              color: 'var(--color-text-secondary)',
            }}
          >
            AI Coach is turned off in <strong>Settings → AI &amp; Tokens</strong>. You can read history but cannot send new messages.
          </div>
        )}

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
          {displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 sm:gap-5 pb-20 text-center px-4">
              <div
                className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))',
                  color: 'var(--color-accent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 18%, var(--color-border))',
                }}
              >
                <Sparkles size={isDesktop ? 24 : 20} />
              </div>
              <div className="space-y-2 max-w-sm">
                <p className="text-base font-black text-text-primary">How can I help you today?</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  Ask about your habits, goals, blockers, or focus. Your first message creates a saved thread.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {QUICK_PROMPTS.slice(0, isDesktop ? 4 : 3).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    className="rounded-full border px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
                  >
                    {prompt}
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
                    initial={{ opacity: 0, y: 10 }}
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

        {/* Entity draft banner — shown when coach gathers enough info to create an entity */}
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

        {/* Status bar */}
        {status && (
          <div className="px-3 sm:px-4 pb-1">
            <p className="text-[11px] text-text-muted">{status}</p>
          </div>
        )}

        {/* Composer */}
        <div
          className="border-t p-2 sm:p-3 shrink-0"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          {/* Attachments strip */}
          {composerAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {composerAttachments.map((att) => (
                <AttachmentChip
                  key={att.id}
                  attachment={att}
                  onRemove={() => setComposerAttachments((cur) => cur.filter((a) => a.id !== att.id))}
                />
              ))}
            </div>
          )}

          {/* Quick prompts popover */}
          <AnimatePresence>
            {showQuickPrompts && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mb-2 rounded-xl border p-2 space-y-1 max-h-[50vh] overflow-y-auto"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePromptClick(p)}
                    className="w-full text-left rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-[var(--sidebar-item-hover)] text-text-secondary hover:text-text-primary"
                  >
                    {p}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div className="flex items-end gap-1.5 sm:gap-2">
            {/* Left actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 pb-1">
              <button
                type="button"
                onClick={() => setShowQuickPrompts((v) => !v)}
                className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--sidebar-item-hover)] transition-colors"
                aria-label="Quick prompts"
                title="Quick prompts"
              >
                <Sparkles size={16} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canChat || isBusy}
                className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--sidebar-item-hover)] transition-colors disabled:opacity-40"
                aria-label="Attach file"
              >
                <Paperclip size={16} />
              </button>
              {transcription.isSupported && (
                <button
                  type="button"
                  onClick={transcription.isListening ? transcription.stop : transcription.start}
                  disabled={!transcription.isSupported || !canChat || isBusy}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors disabled:opacity-40 ${
                    transcription.isListening
                      ? 'text-danger bg-danger/10'
                      : 'text-text-muted hover:text-text-primary hover:bg-[var(--sidebar-item-hover)]'
                  }`}
                  aria-label={transcription.isListening ? 'Stop recording' : 'Voice input'}
                >
                  {transcription.isListening ? <Square size={16} /> : <Mic size={16} />}
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
                    ? 'Message the coach… (Enter to send, Shift+Enter for new line)'
                    : 'Message the coach…'
                }
                disabled={!canChat || isBusy}
                rows={1}
                className="w-full resize-none rounded-xl border px-3 sm:px-4 py-2.5 sm:py-3 text-sm outline-none transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)', 
                  maxHeight: '160px',
                  lineHeight: '1.5',
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                }}
              />
            </div>

            {/* Send */}
            <div className="pb-1">
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={(!input.trim() && composerAttachments.length === 0) || !canChat || isBusy || isUploadingAttachments}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-all disabled:opacity-40 active:scale-95"
                style={{ background: 'var(--gradient-accent)', color: 'white' }}
                aria-label="Send message"
              >
                {isSending ? (
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
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

      {/* ── Context panel ───────────────────────────────────────────────── */}
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
        collapsed={contextPanelCollapsed}
        onToggle={() => setContextPanelCollapsed((v) => !v)}
        onPromptSelect={(prompt) => {
          setInput(prompt);
          focusComposer();
        }}
      />

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete chat">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-text-secondary">
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

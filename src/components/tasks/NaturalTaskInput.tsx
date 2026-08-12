import { useState, useRef, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  X,
  Ban,
  Calendar,
  Flag,
  Clock,
  Repeat,
  CheckCircle2,
  ChevronRight,
  Wand2,
  ListChecks,
  Mic,
  Square,
} from 'lucide-react';
import { useTaskParser, useAIFeatureEnabled } from '../../features/ai/hooks/useAI';
import { appendTranscriptText, useSpeechTranscription } from '../../features/ai/hooks/useSpeechTranscription';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';

interface ParsedTask {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  dueTime?: string;
  reminderTime?: string;
  reminderMessage?: string;
  estimatedDuration?: number;
  status?: 'TODO' | 'IN_PROGRESS';
  recurrence?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  subTasks?: { title: string }[];
}

interface NaturalTaskInputProps {
  onTaskParsed: (task: ParsedTask) => void;
  onClose?: () => void;
}

const EXAMPLES = [
  'Review Q3 report by Friday, high priority',
  'Team standup daily at 9am, recurring',
  'Fix login bug, critical, 2 hours',
  'Submit invoice tomorrow, remind me at 8am',
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#3B82F6',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#7C3AED',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NaturalTaskInput({ onTaskParsed, onClose }: NaturalTaskInputProps) {
  const inputId = useId();
  const [input, setInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedTask | null>(null);
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const taskParser = useTaskParser();
  const taskBuilderEnabled = useAIFeatureEnabled('taskParserEnabled');
  const transcription = useSpeechTranscription({
    onTranscript: (text) => {
      setInput((current) => appendTranscriptText(current, text));
      inputRef.current?.focus();
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || taskParser.isPending) return;

    try {
      const result = await taskParser.mutateAsync(input.trim());
      if (result.source === 'ai') {
        const parsed: ParsedTask = {
          title: result.title,
          description: result.description,
          priority: result.priority,
          dueDate: result.dueDate,
          dueTime: result.dueTime,
          reminderTime: result.reminderTime,
          reminderMessage: result.reminderMessage,
          estimatedDuration: result.estimatedDuration,
          status: result.status,
          recurrence: result.recurrence,
          subTasks: result.subTasks,
        };
        setParsedResult(parsed);
        setShowResult(true);
      } else {
        onTaskParsed({ title: input.trim() });
        setInput('');
        if (onClose) onClose();
      }
    } catch {
      onTaskParsed({ title: input.trim() });
      setInput('');
      if (onClose) onClose();
    }
  }, [input, taskParser, onTaskParsed, onClose]);

  const handleApply = () => {
    if (!parsedResult) return;
    onTaskParsed(parsedResult);
    setInput('');
    setParsedResult(null);
    setShowResult(false);
    if (onClose) onClose();
  };

  const handleDiscard = () => {
    setParsedResult(null);
    setShowResult(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const applyExample = (example: string) => {
    setInput(example);
    inputRef.current?.focus();
  };

  const hasContent = input.trim().length > 0;

  return (
    <div className="flex flex-col gap-0">
      {/* ── Disabled banner ── */}
      {!taskBuilderEnabled && (
        <div
          className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--color-warning) 9%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-warning) 22%, transparent)',
            color: 'var(--color-warning)',
          }}
        >
          <Ban size={13} />
          Task builder disabled — enable in Settings → AI &amp; Tokens.
        </div>
      )}

      {/* ── Main builder panel ── */}
      <div
        className="relative overflow-hidden rounded-[20px]"
        style={{
          background:
            'linear-gradient(145deg, color-mix(in srgb, var(--color-accent) 5%, var(--color-surface)) 0%, var(--color-surface) 60%)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 24%, var(--color-border))',
          boxShadow:
            '0 0 0 1px color-mix(in srgb, var(--color-accent) 8%, transparent), 0 4px 24px color-mix(in srgb, var(--color-accent) 8%, transparent)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        {/* Shimmer beam on loading */}
        <AnimatePresence>
          {taskParser.isPending && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            >
              <motion.div
                className="absolute inset-y-0 w-24"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent)',
                }}
                initial={{ left: '-10%' }}
                animate={{ left: '110%' }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header row */}
        <div className="relative flex items-center gap-2.5 px-4 pt-3.5 pb-0">
          {/* Orb icon */}
          <motion.div
            className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #818CF8 60%, #3B82F6 100%)',
              boxShadow: '0 0 12px color-mix(in srgb, var(--color-accent) 40%, transparent)',
            }}
            animate={taskParser.isPending ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.8, repeat: taskParser.isPending ? Infinity : 0 }}
          >
            {taskParser.isPending ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Wand2 size={14} className="text-white" />
            )}
          </motion.div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--color-accent)' }}>
              AI Task Builder
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {taskParser.isPending ? 'Analyzing your input…' : 'Describe your task in plain language'}
            </p>
          </div>

          <div
            className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em]"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), #818CF8)',
              color: 'white',
            }}
          >
            AI
          </div>
        </div>

        {/* Textarea */}
        <div className="relative px-4 pt-3 pb-3">
          <textarea
            ref={inputRef}
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              taskBuilderEnabled
                ? 'e.g. "Prepare client report by Friday, high priority, 2 hours"'
                : 'Enter a task title…'
            }
            rows={2}
            disabled={taskParser.isPending}
            className="w-full resize-none rounded-2xl border bg-transparent px-3.5 py-3 text-sm font-medium leading-relaxed outline-none transition-all focus:ring-2 placeholder:text-[var(--color-text-muted)]"
            style={
              {
                background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface-raised))',
                borderColor: hasContent
                  ? 'color-mix(in srgb, var(--color-accent) 35%, transparent)'
                  : 'color-mix(in srgb, var(--color-border) 80%, transparent)',
                color: 'var(--color-text-primary)',
                '--tw-ring-color': 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
              } as React.CSSProperties
            }
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="absolute right-7 top-5 rounded-full p-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <div
            className="min-h-4 text-[10px] font-semibold"
            style={{
              color: transcription.error ? 'var(--color-danger)' : 'var(--color-text-muted)',
            }}
          >
            {transcription.error ?? (transcription.isListening ? 'Listening' : '')}
          </div>
          <Tooltip content={transcription.isListening ? 'Stop transcription' : 'Transcribe speech'} side="top">
            <Button
              type="button"
              size="icon"
              variant={transcription.isListening ? 'danger' : 'secondary'}
              onClick={transcription.isListening ? transcription.stop : transcription.start}
              disabled={!transcription.isSupported || taskParser.isPending}
              aria-label={transcription.isListening ? 'Stop transcription' : 'Start transcription'}
              title={
                transcription.isSupported ? undefined : 'Speech transcription is not supported in this browser'
              }
              leftIcon={transcription.isListening ? <Square size={14} /> : <Mic size={14} />}
            />
          </Tooltip>
        </div>

        {/* Example prompts */}
        {!hasContent && !showResult && (
          <div className="px-4 pb-3">
            <p
              className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Try an example
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => applyExample(ex)}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))',
                    borderColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <ChevronRight size={10} style={{ color: 'var(--color-accent)' }} />
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit button row */}
        <div
          className="flex items-center justify-between gap-3 border-t px-4 py-3"
          style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-border))' }}
        >
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Press{' '}
            <kbd
              className="rounded-md border px-1 py-0.5 font-mono text-[10px]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              ↵ Enter
            </kbd>{' '}
            to parse
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasContent || taskParser.isPending}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #818CF8 100%)',
              boxShadow: hasContent ? '0 4px 12px color-mix(in srgb, var(--color-accent) 28%, transparent)' : 'none',
            }}
          >
            {taskParser.isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Parsing…
              </>
            ) : (
              <>
                <Sparkles size={12} />
                {taskBuilderEnabled ? 'Build with AI' : 'Add Task'}
                <ArrowRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Parsed result card ── */}
      <AnimatePresence>
        {showResult && parsedResult && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 overflow-hidden rounded-[20px]"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid color-mix(in srgb, var(--color-success) 30%, var(--color-border))',
              boxShadow:
                '0 0 0 1px color-mix(in srgb, var(--color-success) 8%, transparent), 0 4px 20px color-mix(in srgb, var(--color-success) 6%, transparent)',
            }}
          >
            {/* Result header */}
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b"
              style={{ borderColor: 'color-mix(in srgb, var(--color-success) 15%, var(--color-border))' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}
              >
                <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
              </motion.div>
              <div className="flex-1">
                <p
                  className="text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{ color: 'var(--color-success)' }}
                >
                  AI parsed your task
                </p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  Review the extracted fields below
                </p>
              </div>
            </div>

            {/* Parsed task title */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-sm font-black leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                {parsedResult.title}
              </p>
              {parsedResult.description && (
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {parsedResult.description}
                </p>
              )}
            </div>

            {/* Parsed fields chips */}
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {parsedResult.priority && (
                <div
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: `${PRIORITY_COLORS[parsedResult.priority]}15`,
                    color: PRIORITY_COLORS[parsedResult.priority],
                    border: `1px solid ${PRIORITY_COLORS[parsedResult.priority]}30`,
                  }}
                >
                  <Flag size={10} />
                  {PRIORITY_LABELS[parsedResult.priority]}
                </div>
              )}
              {parsedResult.dueDate && (
                <div
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                    color: 'var(--color-info)',
                    border: '1px solid color-mix(in srgb, var(--color-info) 22%, transparent)',
                  }}
                >
                  <Calendar size={10} />
                  {formatDate(parsedResult.dueDate)}
                  {parsedResult.dueTime && ` · ${parsedResult.dueTime}`}
                </div>
              )}
              {parsedResult.estimatedDuration && (
                <div
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
                    color: 'var(--color-warning)',
                    border: '1px solid color-mix(in srgb, var(--color-warning) 22%, transparent)',
                  }}
                >
                  <Clock size={10} />
                  {formatDuration(parsedResult.estimatedDuration)}
                </div>
              )}
              {parsedResult.recurrence && parsedResult.recurrence !== 'none' && (
                <div
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                    color: 'var(--color-accent)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)',
                  }}
                >
                  <Repeat size={10} />
                  {parsedResult.recurrence.charAt(0).toUpperCase() + parsedResult.recurrence.slice(1)}
                </div>
              )}
              {parsedResult.subTasks && parsedResult.subTasks.length > 0 && (
                <div
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--color-text-muted) 8%, transparent)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <ListChecks size={10} />
                  {parsedResult.subTasks.length} subtask{parsedResult.subTasks.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Subtask preview */}
            {parsedResult.subTasks && parsedResult.subTasks.length > 0 && (
              <div
                className="mx-4 mb-3 rounded-xl border divide-y overflow-hidden"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {parsedResult.subTasks.slice(0, 4).map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ background: 'var(--color-surface-raised)' }}
                  >
                    <span
                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                      style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {st.title}
                    </span>
                  </div>
                ))}
                {parsedResult.subTasks.length > 4 && (
                  <div
                    className="px-3 py-1.5 text-[10px] font-semibold"
                    style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }}
                  >
                    +{parsedResult.subTasks.length - 4} more subtasks
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div
              className="flex gap-2 border-t px-4 py-3"
              style={{ borderColor: 'color-mix(in srgb, var(--color-success) 15%, var(--color-border))' }}
            >
              <button
                type="button"
                onClick={handleDiscard}
                className="flex-1 rounded-2xl border px-3 py-2 text-xs font-bold transition-all hover:opacity-80 active:scale-95"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-black text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, var(--color-success) 0%, #16A34A 100%)',
                  boxShadow: '0 4px 12px color-mix(in srgb, var(--color-success) 28%, transparent)',
                }}
              >
                <CheckCircle2 size={13} />
                Apply to Form
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

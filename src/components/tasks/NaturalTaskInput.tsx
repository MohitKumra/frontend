import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, X, Brain } from 'lucide-react';
import { useTaskParser } from '../../features/ai/hooks/useAI';

interface ParsedTask {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (24-hour)
  reminderTime?: string; // HH:mm (24-hour)
  reminderMessage?: string;
  estimatedDuration?: number; // minutes
  status?: 'TODO' | 'IN_PROGRESS';
  recurrence?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  subTasks?: { title: string }[];
}

interface NaturalTaskInputProps {
  onTaskParsed: (task: ParsedTask) => void;
  onClose?: () => void;
}

export function NaturalTaskInput({ onTaskParsed, onClose }: NaturalTaskInputProps) {
  const [input, setInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const taskParser = useTaskParser();

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;

    try {
      const result = await taskParser.mutateAsync(input.trim());
      if (result.source === 'ai') {
        onTaskParsed({
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
        });
        setShowResult(true);
        setTimeout(() => {
          setInput('');
          setShowResult(false);
          if (onClose) onClose();
        }, 1500);
      } else {
        // Fallback: use raw input as title
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 p-2 rounded-xl transition-all"
        style={{
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="shrink-0 pl-2">
          {taskParser.isPending ? (
            <Loader2 size={16} className="animate-spin text-accent" />
          ) : (
            <Brain size={16} className="text-accent/60" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add task naturally... e.g. 'Prepare report by Friday, high priority'"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none min-w-0"
          disabled={taskParser.isPending}
          autoFocus
        />
        {input && (
          <button
            onClick={() => setInput('')}
            className="shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-text-muted"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || taskParser.isPending}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40"
          style={{
            background: input.trim() ? 'var(--gradient-accent)' : 'var(--color-surface)',
            color: input.trim() ? 'white' : 'var(--text-muted)',
          }}
        >
          {taskParser.isPending ? (
            'Parsing...'
          ) : (
            <>
              Parse
              <ArrowRight size={12} />
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            className="mt-2 p-2.5 rounded-lg text-xs font-medium text-accent"
            style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} />
              AI parsed your task
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {taskParser.isPending && (
        <div className="mt-2 flex items-center gap-2 px-2 py-1">
          <Loader2 size={10} className="animate-spin text-accent" />
          <span className="text-[10px] text-text-muted">AI is analyzing your input...</span>
        </div>
      )}
    </div>
  );
}
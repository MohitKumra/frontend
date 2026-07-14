import React from 'react';
import { CheckSquare, Plus, Calendar, ArrowRight, List } from 'lucide-react';
import type { TaskStatus } from '../../types';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';

interface TasksEmptyStateProps {
  filter: TaskFilter;
  onCreateTask: () => void;
  onChangeFilter: (filter: TaskFilter) => void;
}

interface EmptyConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  suggestions: { label: string; icon: React.ReactNode; action: () => void }[];
}

export function TasksEmptyState({ filter, onCreateTask, onChangeFilter }: TasksEmptyStateProps) {
  const configs: Record<TaskFilter, EmptyConfig> = {
    all: {
      icon: <CheckSquare size={40} />,
      title: 'No tasks yet',
      subtitle: 'Start by adding your first task. Keep it simple — title, due date, and priority is all you need.',
      suggestions: [
        { label: 'Create your first task', icon: <Plus size={13} />, action: onCreateTask },
        { label: 'View upcoming work', icon: <Calendar size={13} />, action: () => onChangeFilter('upcoming') },
      ],
    },
    today: {
      icon: <Calendar size={40} />,
      title: 'Nothing scheduled today',
      subtitle: 'You have a clear day. Consider scheduling high-priority tasks for today or planning tomorrow.',
      suggestions: [
        { label: 'Schedule a task for today', icon: <Plus size={13} />, action: onCreateTask },
        { label: 'View upcoming tasks', icon: <ArrowRight size={13} />, action: () => onChangeFilter('upcoming') },
      ],
    },
    upcoming: {
      icon: <ArrowRight size={40} />,
      title: 'No upcoming tasks',
      subtitle: 'Nothing is scheduled for the next 7 days. Plan ahead to avoid last-minute pressure.',
      suggestions: [
        { label: 'Plan your week', icon: <Plus size={13} />, action: onCreateTask },
        { label: 'View all tasks', icon: <List size={13} />, action: () => onChangeFilter('all') },
      ],
    },
    completed: {
      icon: <CheckSquare size={40} />,
      title: 'No completed tasks',
      subtitle: 'Complete a task to see it here. Focus on your today and upcoming tasks to make progress.',
      suggestions: [
        { label: 'View today\'s tasks', icon: <Calendar size={13} />, action: () => onChangeFilter('today') },
        { label: 'View all tasks', icon: <List size={13} />, action: () => onChangeFilter('all') },
      ],
    },
    overdue: {
      icon: <CheckSquare size={40} />,
      title: 'No overdue tasks',
      subtitle: 'Great job — everything is on track. Keep it up by staying on top of your daily schedule.',
      suggestions: [
        { label: 'View today\'s tasks', icon: <Calendar size={13} />, action: () => onChangeFilter('today') },
        { label: 'View all tasks', icon: <List size={13} />, action: () => onChangeFilter('all') },
      ],
    },
  };

  const cfg = configs[filter];

  return (
    <div
      className="rounded-2xl border-2 p-16 text-center flex flex-col items-center"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
        style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
      >
        {cfg.icon}
      </div>

      {/* Text */}
      <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
        {cfg.title}
      </h3>
      <p className="text-sm max-w-sm mx-auto mb-8 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {cfg.subtitle}
      </p>

      {/* Suggestion buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {cfg.suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={suggestion.action}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-md hover:-translate-y-0.5 ${i === 0 ? 'text-white' : 'border'}`}
            style={
              i === 0
                ? { background: 'var(--gradient-accent)' }
                : {
                    background: 'var(--color-surface-raised)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }
            }
          >
            {suggestion.icon}
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

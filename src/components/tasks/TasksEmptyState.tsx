import React from 'react';
import { Plus, Calendar, ArrowRight, List } from 'lucide-react';
import { FloatingTasksEmpty } from '../ui/FloatingTasksEmpty';
import { Card } from '../ui/Card';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';

interface TasksEmptyStateProps {
  filter: TaskFilter;
  onCreateTask: () => void;
  onChangeFilter: (filter: TaskFilter) => void;
}

interface EmptyConfig {
  title: string;
  subtitle: string;
  suggestions: { label: string; icon: React.ReactNode; action: () => void }[];
}

export function TasksEmptyState({ filter, onCreateTask, onChangeFilter }: TasksEmptyStateProps) {
  const configs: Record<TaskFilter, EmptyConfig> = {
    all: {
      title: 'No tasks yet',
      subtitle: 'Start by adding your first task — title, due date, and priority is all you need.',
      suggestions: [
        { label: 'Create your first task', icon: <Plus size={13} />, action: onCreateTask },
        { label: 'View upcoming work', icon: <Calendar size={13} />, action: () => onChangeFilter('upcoming') },
      ],
    },
    today: {
      title: 'Nothing scheduled today',
      subtitle: 'You have a clear day. Consider scheduling high-priority tasks for today or planning tomorrow.',
      suggestions: [
        { label: 'Schedule a task for today', icon: <Plus size={13} />, action: onCreateTask },
        { label: 'View upcoming tasks', icon: <ArrowRight size={13} />, action: () => onChangeFilter('upcoming') },
      ],
    },
    upcoming: {
      title: 'No upcoming tasks',
      subtitle: 'Nothing is scheduled for the next 7 days. Plan ahead to avoid last-minute pressure.',
      suggestions: [
        { label: 'Plan your week', icon: <Plus size={13} />, action: onCreateTask },
        { label: 'View all tasks', icon: <List size={13} />, action: () => onChangeFilter('all') },
      ],
    },
    completed: {
      title: 'No completed tasks',
      subtitle: 'Complete a task to see it here. Focus on your today and upcoming tasks to make progress.',
      suggestions: [
        { label: 'View today\'s tasks', icon: <Calendar size={13} />, action: () => onChangeFilter('today') },
        { label: 'View all tasks', icon: <List size={13} />, action: () => onChangeFilter('all') },
      ],
    },
    overdue: {
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
    <Card variant="default" className="p-6 sm:p-10 text-center">
      <FloatingTasksEmpty
        title={cfg.title}
        description={cfg.subtitle}
        suggestions={cfg.suggestions}
      />
    </Card>
  );
}

import { Plus, CheckSquare, FileText, FolderKanban, Timer, Calendar, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  route: string;
  gradient: string;
}

export function QuickActionsPanel() {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'task',
      label: 'New Task',
      description: 'Capture work quickly',
      icon: CheckSquare,
      route: '/tasks',
      gradient: 'var(--gradient-accent)',
    },
    {
      id: 'note',
      label: 'New Note',
      description: 'Ideas and context',
      icon: FileText,
      route: '/notes',
      gradient: 'var(--gradient-info)',
    },
    {
      id: 'project',
      label: 'New Project',
      description: 'Organize related work',
      icon: FolderKanban,
      route: '/projects',
      gradient: 'var(--gradient-warning)',
    },
    {
      id: 'focus',
      label: 'Start Focus',
      description: 'Deep work session',
      icon: Timer,
      route: '/focus',
      gradient: 'var(--gradient-success)',
    },
    {
      id: 'planner',
      label: 'Plan Day',
      description: 'Block time',
      icon: Calendar,
      route: '/planner',
      gradient: 'var(--gradient-danger)',
    },
    {
      id: 'journal',
      label: 'Journal',
      description: 'Reflect and plan',
      icon: BookOpen,
      route: '/notes',
      gradient: 'var(--gradient-info)',
    },
  ];

  return (
    <Card variant="default">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Quick Actions</h3>
            <p className="text-xs text-text-secondary">Jump into your workflow</p>
          </div>
        </div>

        {/* Action Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ id, label, description, icon: Icon, route, gradient }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(route)}
              className="group relative rounded-xl p-4 text-left transition-all duration-200 active:scale-98"
              style={{ 
                background: 'var(--color-surface-raised)', 
                border: '1px solid var(--color-border)' 
              }}
            >
              {/* Content */}
              <div className="relative flex flex-col items-center text-center">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-105 shadow-sm"
                  style={{ background: gradient }}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <p className="text-xs font-bold text-text-primary mb-1 leading-tight">{label}</p>
                <p className="text-[10px] text-text-muted leading-tight">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

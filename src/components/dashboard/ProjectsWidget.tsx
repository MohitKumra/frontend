import React from 'react';
import { Folder, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import type { ProjectDTO } from '../../types';

interface ProjectsWidgetProps {
  projects: ProjectDTO[];
}

const statusColors = {
  PLANNING: 'info',
  ACTIVE: 'accent',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
} as const;

export function ProjectsWidget({ projects }: ProjectsWidgetProps) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No deadline';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Card variant="default" className="overflow-hidden">
      {/* Header */}
      <div 
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'var(--icon-bg-accent)',
              color: 'var(--icon-text-accent)',
            }}
          >
            <Folder size={16} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Current Projects</h3>
        </div>
        <button 
          onClick={() => navigate('/projects')}
          className="text-xs font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          View All
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Project Cards Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-xs text-text-muted">No active projects yet</p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-bold text-text-onaccent transition-all"
              style={{ background: 'var(--gradient-accent)' }}
            >
              Create Project
            </button>
          </div>
        ) : (
          projects.map((project) => {
            const daysRemaining = getDaysRemaining(project.dueDate);
            const isOverdue = daysRemaining !== null && daysRemaining < 0;
            const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-surface-raised)',
                }}
              >
                {/* Project Color Bar */}
                <div 
                  className="w-full h-1 rounded-full mb-3"
                  style={{ background: project.color }}
                />

                {/* Project Name */}
                <h4 className="text-sm font-bold text-text-primary mb-2 truncate group-hover:text-accent transition-colors">
                  {project.name}
                </h4>

                {/* Progress Bar */}
                <div className="mb-3">
                  <ProgressBar 
                    value={project.progress} 
                    color={statusColors[project.status]} 
                    size="sm" 
                    showLabel
                    label={`${project.progress}% Complete`}
                  />
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 text-text-muted">
                    <TrendingUp size={12} />
                    <span className="font-bold">
                      {project.completedTaskCount ?? 0}/{project.taskCount ?? 0} tasks
                    </span>
                  </div>

                  {project.dueDate && (
                    <div className={`flex items-center gap-1 font-bold ${
                      isOverdue ? 'text-danger' : isUrgent ? 'text-warning' : 'text-text-muted'
                    }`}>
                      <Calendar size={12} />
                      <span>
                        {isOverdue 
                          ? `${Math.abs(daysRemaining!)}d overdue` 
                          : daysRemaining === 0
                          ? 'Due today'
                          : daysRemaining === 1
                          ? '1 day left'
                          : `${daysRemaining}d left`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

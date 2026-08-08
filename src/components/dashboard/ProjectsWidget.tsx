import React from 'react';
import { Folder, ArrowRight, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import type { ProjectDTO } from '../../types';

interface ProjectsWidgetProps {
  projects: ProjectDTO[];
}

export function ProjectsWidget({ projects }: ProjectsWidgetProps) {
  const navigate = useNavigate();

  const planning = projects.filter((p) => p.status === 'PLANNING');
  const active = projects.filter((p) => p.status === 'ACTIVE');

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
          <div>
            <h3 className="text-sm font-bold text-text-primary">Projects</h3>
            <p className="text-[10px] text-text-muted font-medium">{projects.length} active</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/projects')}
          className="text-xs font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
        >
          View All
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Two-column kanban: Planning | Active */}
      <div className="p-4 sm:p-5">
        {projects.length === 0 ? (
          <div className="text-center py-10">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
            >
              <Folder size={24} />
            </div>
            <p className="text-sm font-bold text-text-primary mb-1">No projects yet</p>
            <p className="text-xs text-text-muted mb-5 max-w-[200px] mx-auto leading-snug">
              Create a project to organize tasks and track progress.
            </p>
            <button
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Folder size={14} />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Planning column */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--icon-text-info)' }} />
                  <span
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: 'var(--icon-text-info)' }}
                  >
                    Planning
                  </span>
                </div>
                <span className="text-[9px] font-bold text-text-muted tabular-nums">{planning.length}</span>
              </div>
              <div
                className="flex flex-col gap-1.5 min-h-[60px] rounded-lg p-2"
                style={{ background: 'color-mix(in srgb, var(--icon-bg-info) 15%, var(--color-surface))' }}
              >
                {planning.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed p-3 text-center"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-[9px] text-text-muted">No projects</p>
                  </div>
                ) : (
                  planning.map((project) => {
                    const color = project.color || '#6366f1';
                    return (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="rounded-lg border p-2.5 transition-all cursor-pointer group hover:-translate-y-0.5 hover:shadow-sm"
                        style={{
                          borderColor: 'var(--color-border)',
                          background: 'var(--color-surface-raised)',
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <p className="text-[11px] font-bold text-text-primary truncate leading-tight group-hover:text-accent transition-colors">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div
                            className="flex-1 h-1 rounded-full overflow-hidden"
                            style={{ background: 'var(--color-border-subtle)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${project.progress}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                              }}
                            />
                          </div>
                          <span className="text-[8px] font-bold text-text-muted tabular-nums">{project.progress}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Active column */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--icon-text-accent)' }} />
                  <span
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: 'var(--icon-text-accent)' }}
                  >
                    Active
                  </span>
                </div>
                <span className="text-[9px] font-bold text-text-muted tabular-nums">{active.length}</span>
              </div>
              <div
                className="flex flex-col gap-1.5 min-h-[60px] rounded-lg p-2"
                style={{ background: 'color-mix(in srgb, var(--icon-bg-accent) 15%, var(--color-surface))' }}
              >
                {active.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed p-3 text-center"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-[9px] text-text-muted">No projects</p>
                  </div>
                ) : (
                  active.map((project) => {
                    const color = project.color || '#6366f1';
                    return (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="rounded-lg border p-2.5 transition-all cursor-pointer group hover:-translate-y-0.5 hover:shadow-sm"
                        style={{
                          borderColor: 'var(--color-border)',
                          background: 'var(--color-surface-raised)',
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <p className="text-[11px] font-bold text-text-primary truncate leading-tight group-hover:text-accent transition-colors">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div
                            className="flex-1 h-1 rounded-full overflow-hidden"
                            style={{ background: 'var(--color-border-subtle)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${project.progress}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                              }}
                            />
                          </div>
                          <span className="text-[8px] font-bold text-text-muted tabular-nums">{project.progress}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

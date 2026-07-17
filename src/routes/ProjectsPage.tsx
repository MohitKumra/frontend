import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import {
  Folder,
  Plus,
  Grid3x3,
  List,
  Calendar,
  TrendingUp,
  MoreVertical,
  Trash2,
  Edit2,
  Play,
  Pause,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useProjects, useDeleteProject } from '../features/projects/hooks/useProjects';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { EditProjectModal } from '../components/projects/EditProjectModal';
import type { ProjectDTO } from '../types';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'ALL' | 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

const statusConfig = {
  PLANNING: { label: 'Planning', color: 'info', icon: Clock },
  ACTIVE: { label: 'Active', color: 'accent', icon: Play },
  ON_HOLD: { label: 'On Hold', color: 'warning', icon: Pause },
  COMPLETED: { label: 'Completed', color: 'success', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'danger', icon: Trash2 },
} as const;

export function ProjectsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);

  const { data: projectsData, isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  const projects = projectsData?.data ?? [];

  const filteredProjects = projects.filter((p) => 
    filterStatus === 'ALL' ? true : p.status === filterStatus
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No deadline';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject.mutate(id);
      setProjectMenuOpen(null);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-[1400px] mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-5 sm:gap-6"
      >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          icon={<Folder size={24} />}
          title="Projects"
          subtitle={`${filteredProjects.length} ${filterStatus === 'ALL' ? 'total' : filterStatus.toLowerCase()} projects`}
        />

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
              aria-label="Grid view"
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Create Project Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </motion.div>
      {/* Status Filter Tabs */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {(['ALL', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as FilterStatus[]).map((status) => {
          const count = status === 'ALL' ? projects.length : projects.filter(p => p.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              style={filterStatus === status ? { background: 'var(--gradient-accent)' } : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
            >
              {status === 'ALL' ? 'All' : statusConfig[status].label}
              <span className="ml-1.5 opacity-75">({count})</span>
            </button>
          );
        })}
      </motion.div>
      {/* Projects Grid/List */}
      <motion.div variants={itemVariants}>
      {filteredProjects.length === 0 ? (
        <Card variant="default" className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
            <Folder size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">No projects found</h3>
          <p className="text-sm text-text-muted mb-6">
            {filterStatus === 'ALL' 
              ? "Get started by creating your first project"
              : `No ${filterStatus.toLowerCase()} projects`
            }
          </p>
          {filterStatus === 'ALL' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Plus size={18} className="inline mr-2" />
              Create Project
            </button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const StatusIcon = statusConfig[project.status].icon;
            const daysRemaining = getDaysRemaining(project.dueDate);
            const isOverdue = daysRemaining !== null && daysRemaining < 0;
            const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

            return (
            <Card key={project.id} variant="default" className="hover:shadow-lg transition-all group cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                {/* Project Header */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="w-full h-1.5 rounded-full mb-3" style={{ background: project.color }} />
                      <h3 className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>

                    {/* Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id);
                        }}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-text-muted transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {projectMenuOpen === project.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-lg z-10 py-1"
                          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(project);
                              setProjectMenuOpen(null);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge variant={statusConfig[project.status].color} size="sm" className="inline-flex items-center gap-1">
                    <StatusIcon size={10} />
                    {statusConfig[project.status].label}
                  </Badge>
                </div>

                {/* Project Body */}
                <div className="p-4 space-y-3">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Progress</span>
                      <span className="text-xs font-bold text-text-primary">{project.progress}%</span>
                    </div>
                    <ProgressBar value={project.progress} color={statusConfig[project.status].color} size="sm" />
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
                        <span>{formatDate(project.dueDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card variant="default">
          <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
            {filteredProjects.map((project) => {
              const StatusIcon = statusConfig[project.status].icon;
              const daysRemaining = getDaysRemaining(project.dueDate);

              return (
                <div key={project.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="flex items-center gap-4">
                    {/* Color Indicator */}
                    <div className="w-1 h-12 rounded-full shrink-0" style={{ background: project.color }} />

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-text-primary truncate">{project.name}</h3>
                        <Badge variant={statusConfig[project.status].color} size="sm" className="inline-flex items-center gap-1">
                          <StatusIcon size={10} />
                          {statusConfig[project.status].label}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="text-xs text-text-muted truncate">{project.description}</p>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="w-32 shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-text-muted uppercase">Progress</span>
                        <span className="text-xs font-bold text-text-primary">{project.progress}%</span>
                      </div>
                      <ProgressBar value={project.progress} color={statusConfig[project.status].color} size="sm" />
                    </div>

                    {/* Tasks */}
                    <div className="text-xs font-bold text-text-muted shrink-0 w-20 text-right">
                      {project.completedTaskCount ?? 0}/{project.taskCount ?? 0} tasks
                    </div>

                    {/* Due Date */}
                    {project.dueDate && (
                      <div className="text-xs font-bold text-text-muted shrink-0 w-28 text-right">
                        {formatDate(project.dueDate)}
                      </div>
                    )}

                    {/* Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id);
                        }}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-text-muted transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {projectMenuOpen === project.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-lg z-10 py-1"
                          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(project);
                              setProjectMenuOpen(null);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      </motion.div>
      </motion.div>
      {/* Modals */}
      {createModalOpen && (
        <CreateProjectModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      )}

      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          project={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}

export default ProjectsPage;

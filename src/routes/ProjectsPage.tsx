import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Search,
  SlidersHorizontal,
  Star,
  ChevronDown,
  AlertTriangle,
  Paperclip,
  Mic,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useProjects, useDeleteProject } from '../features/projects/hooks/useProjects';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { EditProjectModal } from '../components/projects/EditProjectModal';
import type { ProjectDTO } from '../types';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'ALL' | 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
type SortBy = 'default' | 'name' | 'progress' | 'dueDate';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { data: projectsData, isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  const projects = projectsData?.data ?? [];

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No deadline';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isProjectOverdue = (p: ProjectDTO) => {
    const days = getDaysRemaining(p.dueDate);
    return days !== null && days < 0 && p.status !== 'COMPLETED' && p.status !== 'CANCELLED';
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject.mutate(id);
      setProjectMenuOpen(null);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- Stats ----
  const totalCount = projects.length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const onHoldCount = projects.filter((p) => p.status === 'ON_HOLD').length;
  const overdueCount = projects.filter(isProjectOverdue).length;
  const pct = (n: number) => (totalCount > 0 ? Math.round((n / totalCount) * 100) : 0);

  const statCards = [
    { label: 'Total Projects', value: totalCount, sub: 'Active projects', icon: Folder, tone: 'accent' as const },
    { label: 'Completed', value: completedCount, sub: `${pct(completedCount)}% of total`, icon: CheckCircle2, tone: 'success' as const },
    { label: 'In Progress', value: activeCount, sub: `${pct(activeCount)}% of total`, icon: Clock, tone: 'warning' as const },
    { label: 'On Hold', value: onHoldCount, sub: `${pct(onHoldCount)}% of total`, icon: Pause, tone: 'warning' as const },
    { label: 'Overdue', value: overdueCount, sub: `${overdueCount === 1 ? 'project' : 'projects'} overdue`, icon: AlertTriangle, tone: 'danger' as const },
  ];

  const toneStyles: Record<string, { bg: string; color: string }> = {
    accent: { bg: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' },
    success: { bg: 'var(--icon-bg-success, rgba(34,197,94,0.12))', color: 'var(--color-success, #16a34a)' },
    warning: { bg: 'var(--icon-bg-warning, rgba(245,158,11,0.12))', color: 'var(--color-warning, #d97706)' },
    danger: { bg: 'var(--icon-bg-danger, rgba(239,68,68,0.12))', color: 'var(--color-danger, #dc2626)' },
  };

  // ---- Filter + search + sort ----
  const filteredProjects = useMemo(() => {
    let list = projects.filter((p) => (filterStatus === 'ALL' ? true : p.status === filterStatus));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'progress':
        sorted.sort((a, b) => b.progress - a.progress);
        break;
      case 'dueDate':
        sorted.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      default:
        break;
    }
    return sorted;
  }, [projects, filterStatus, searchQuery, sortBy]);

  if (isLoading) {
    return <ProjectsSkeleton />;
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
            subtitle={`${totalCount} total ${totalCount === 1 ? 'project' : 'projects'}`}
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
              className="flex items-center gap-2 pl-4 pr-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-md"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Plus size={16} />
              New Project
              <ChevronDown size={14} className="opacity-70 ml-1" />
            </button>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          {statCards.map((stat) => {
            const StatIcon = stat.icon;
            const tone = toneStyles[stat.tone];
            return (
              <motion.div key={stat.label} variants={itemVariants}>
                <Card variant="default" className="p-4 flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">{stat.label}</span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: tone.bg, color: tone.color }}
                    >
                      <StatIcon size={16} />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-text-primary leading-none">{stat.value}</p>
                    <p className="text-[11px] font-bold mt-1.5" style={{ color: tone.color }}>
                      {stat.sub}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Status Filter Tabs + Search + Filters */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 lg:flex-1 lg:min-w-0">
            {(['ALL', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as FilterStatus[]).map((status) => {
              const count = status === 'ALL' ? projects.length : projects.filter((p) => p.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === status ? 'text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
                  }`}
                  style={filterStatus === status ? { background: 'var(--gradient-accent)' } : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                >
                  {status === 'ALL' ? 'All' : statusConfig[status].label}
                  <span className="ml-1.5 opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 lg:flex-initial">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-56 pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setSortMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary transition-all"
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
              >
                <SlidersHorizontal size={14} />
                Filters
              </button>

              <AnimatePresence>
                {sortMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg z-10 py-1"
                    style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                  >
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Sort by</p>
                    {([
                      { key: 'default', label: 'Default' },
                      { key: 'name', label: 'Name' },
                      { key: 'progress', label: 'Progress' },
                      { key: 'dueDate', label: 'Due date' },
                    ] as { key: SortBy; label: string }[]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortBy(opt.key);
                          setSortMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                          sortBy === opt.key ? 'text-accent' : 'text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
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
                {filterStatus === 'ALL' && !searchQuery
                  ? 'Get started by creating your first project'
                  : 'Try a different filter or search term'}
              </p>
              {filterStatus === 'ALL' && !searchQuery && (
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
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2 gap-4' : 'flex flex-col gap-4'}
            >
              {filteredProjects.map((project) => (
                <motion.div key={project.id} variants={itemVariants}>
                  <ProjectCard
                    project={project}
                    isFavorite={favorites.has(project.id)}
                    onToggleFavorite={() => toggleFavorite(project.id)}
                    menuOpen={projectMenuOpen === project.id}
                    onToggleMenu={() =>
                      setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id)
                    }
                    onEdit={() => {
                      setEditingProject(project);
                      setProjectMenuOpen(null);
                    }}
                    onDelete={() => handleDeleteProject(project.id)}
                    onOpen={() => navigate(`/projects/${project.id}`)}
                    formatDate={formatDate}
                    getDaysRemaining={getDaysRemaining}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Modals */}
      {createModalOpen && <CreateProjectModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />}
      {editingProject && (
        <EditProjectModal isOpen={!!editingProject} project={editingProject} onClose={() => setEditingProject(null)} />
      )}
    </div>
  );
}

// ============================================================================
// Project Card — detailed card with circular progress ring
// ============================================================================
function ProjectCard({
  project,
  isFavorite,
  onToggleFavorite,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
  onOpen,
  formatDate,
  getDaysRemaining,
}: {
  project: ProjectDTO;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  formatDate: (d: string | null) => string;
  getDaysRemaining: (d: string | null) => number | null;
}) {
  const StatusIcon = statusConfig[project.status].icon;
  const daysRemaining = getDaysRemaining(project.dueDate);
  const isOverdue = daysRemaining !== null && daysRemaining < 0 && project.status !== 'COMPLETED' && project.status !== 'CANCELLED';
  const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

  // Circular progress ring math
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(project.progress, 0), 100) / 100) * circumference;

  return (
    <Card
      variant="default"
      className="relative overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
      onClick={onOpen}
    >
      {/* Top progress strip */}
      <div className="h-1.5 w-full" style={{ background: 'var(--color-border-subtle)' }}>
        <motion.div
          className="h-full rounded-r-full"
          style={{ background: project.color || 'var(--color-accent)' }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(project.progress, 0), 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Menu */}
      <div className="absolute right-3 top-4 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleMenu}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-text-muted transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-lg z-10 py-1"
              style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
            >
              <button
                onClick={onEdit}
                className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <Edit2 size={12} />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="w-full px-3 py-2 text-left text-xs font-bold text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Left: icon + info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in srgb, ${project.color || '#6366f1'} 16%, transparent)`, color: project.color || 'var(--color-accent)' }}
          >
            <Folder size={24} />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-base sm:text-lg font-black text-text-primary truncate group-hover:text-accent transition-colors">
              {project.name}
            </h3>
            <div className="mt-1.5">
              <Badge variant={statusConfig[project.status].color} size="sm" className="inline-flex items-center gap-1">
                <StatusIcon size={10} />
                {statusConfig[project.status].label}
              </Badge>
            </div>
            {project.description && (
              <p className="text-xs sm:text-sm text-text-muted mt-2 line-clamp-2">{project.description}</p>
            )}

            {/* Footer info row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
              <div className="flex items-center gap-1.5 text-text-muted">
                <TrendingUp size={13} />
                <span className="text-xs font-bold">
                  {project.completedTaskCount ?? 0}/{project.taskCount ?? 0} tasks
                </span>
              </div>

              {project.attachmentUrl && (
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Paperclip size={13} />
                  <span className="text-xs font-bold">Attachment</span>
                </div>
              )}

              {project.voiceNoteUrl && (
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Mic size={13} />
                  <span className="text-xs font-bold">Voice note</span>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  isFavorite ? 'text-accent' : 'text-text-muted hover:text-text-primary'
                }`}
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <Star size={12} className={isFavorite ? 'fill-current' : ''} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: progress ring + due date */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 shrink-0 sm:pl-2 sm:border-l" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--color-border-subtle)" strokeWidth="7" />
              <motion.circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={project.color || 'var(--color-accent)'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-black text-text-primary">{project.progress}%</span>
            </div>
          </div>

          {project.dueDate && (
            <div
              className={`flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${
                isOverdue ? 'text-danger' : isUrgent ? 'text-warning' : 'text-text-muted'
              }`}
            >
              <Calendar size={13} />
              <span>{formatDate(project.dueDate)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Loading skeleton — mirrors the real layout so content doesn't "pop in"
// ============================================================================
function ProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
          <div>
            <div className="h-6 w-32 rounded-lg animate-pulse mb-2" style={{ background: 'var(--color-surface-raised)' }} />
            <div className="h-3.5 w-24 rounded-md animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 rounded-lg animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
          <div className="h-9 w-36 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-16 rounded mb-4" style={{ background: 'var(--color-border-subtle)' }} />
            <div className="h-7 w-10 rounded" style={{ background: 'var(--color-border-subtle)' }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-lg animate-pulse shrink-0" style={{ background: 'var(--color-surface-raised)', animationDelay: `${i * 50}ms` }} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl animate-pulse flex items-center gap-4"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', animationDelay: `${i * 80}ms` }}
          >
            <div className="w-14 h-14 rounded-2xl shrink-0" style={{ background: 'var(--color-border-subtle)' }} />
            <div className="flex-1">
              <div className="h-4 w-1/3 rounded mb-2" style={{ background: 'var(--color-border-subtle)' }} />
              <div className="h-3 w-2/3 rounded" style={{ background: 'var(--color-border-subtle)' }} />
            </div>
            <div className="w-20 h-20 rounded-full shrink-0" style={{ background: 'var(--color-border-subtle)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectsPage;
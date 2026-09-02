import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePageVariants } from '../lib/motionVariants';
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
  Eye,
  FolderKanban,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FloatingProjectsEmpty } from '../components/ui/FloatingProjectsEmpty';
import { useProjects, useDeleteProject, useFilteredProjects } from '../features/projects/hooks/useProjects';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { EditProjectModal } from '../components/projects/EditProjectModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
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
  const { containerVariants, itemVariants } = usePageVariants();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
    setProjectMenuOpen(null);
  };

  const confirmDeleteProject = () => {
    if (!deleteTargetId) return;
    deleteProject.mutate(deleteTargetId);
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
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
  const { totalCount, completedCount, activeCount, onHoldCount, overdueCount, statCards } = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    const active = projects.filter((p) => p.status === 'ACTIVE').length;
    const onHold = projects.filter((p) => p.status === 'ON_HOLD').length;
    const overdue = projects.filter(isProjectOverdue).length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    const cards = [
      { label: 'Total Projects', value: total, sub: 'Active projects', icon: Folder, tone: 'accent' as const },
      {
        label: 'Completed',
        value: completed,
        sub: `${pct(completed)}% of total`,
        icon: CheckCircle2,
        tone: 'success' as const,
      },
      {
        label: 'In Progress',
        value: active,
        sub: `${pct(active)}% of total`,
        icon: Clock,
        tone: 'warning' as const,
      },
      {
        label: 'On Hold',
        value: onHold,
        sub: `${pct(onHold)}% of total`,
        icon: Pause,
        tone: 'warning' as const,
      },
      {
        label: 'Overdue',
        value: overdue,
        sub: `${overdue === 1 ? 'project' : 'projects'} overdue`,
        icon: AlertTriangle,
        tone: 'danger' as const,
      },
    ];

    return {
      totalCount: total,
      completedCount: completed,
      activeCount: active,
      onHoldCount: onHold,
      overdueCount: overdue,
      statCards: cards,
    };
  }, [projects]);

  const toneStyles: Record<string, { bg: string; color: string }> = {
    accent: { bg: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' },
    success: { bg: 'var(--icon-bg-success, rgba(34,197,94,0.12))', color: 'var(--color-success, #16a34a)' },
    warning: { bg: 'var(--icon-bg-warning, rgba(245,158,11,0.12))', color: 'var(--color-warning, #d97706)' },
    danger: { bg: 'var(--icon-bg-danger, rgba(239,68,68,0.12))', color: 'var(--color-danger, #dc2626)' },
  };

  // Debounce search so the backend is only called after the user pauses typing.
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  // The status / search / sort filters are applied on the backend. The full
  // project set is still fetched for the stats / widgets above. For the default
  // view we fall back to the already-fetched full list so the page paints
  // instantly; other filter combinations are loaded from the backend.
  const listFilters = useMemo(
    () => ({ status: filterStatus, search: debouncedSearchQuery.trim(), sort: sortBy }),
    [filterStatus, debouncedSearchQuery, sortBy]
  );
  const { data: filteredProjectsData } = useFilteredProjects(listFilters);

  // Instant local placeholder computed from the already-fetched full project
  // set. It renders on every filter/sort/search change with zero lag; the
  // backend response replaces it as soon as it arrives, so the backend stays
  // the source of truth. This is what keeps the UI feeling immediate.
  const localFilteredProjects = useMemo(() => {
    let list = projects.filter((p) => (filterStatus === 'ALL' ? true : p.status === filterStatus));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
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
    }
    return sorted;
  }, [projects, filterStatus, searchQuery, sortBy]);

  const filteredProjects = filteredProjectsData?.data ?? localFilteredProjects;

  const handleFilterChange = useCallback(
    (nextStatus: FilterStatus) => {
      setFilterStatus(nextStatus);
    },
    [setFilterStatus]
  );

  // Handle projectId from URL query parameter (for notification clicks).
  // AUTO-SELECT a filter that will show the project, HIGHLIGHT the card, SCROLL to it.
  // Never opens the create/edit modal from this URL-based trigger.
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (!projectId || !projects) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // 1. If a filter is applied that hides this project, reset to ALL so it's visible.
    if (filterStatus !== 'ALL' && filterStatus !== project.status) {
      setFilterStatus('ALL');
    }
    // 2. If search query hides it, clear search.
    if (searchQuery.trim()) {
      setSearchQuery('');
    }

    // 3. Highlight for a short beat (card gets accent ring)
    setHighlightedProjectId(projectId);

    // 4. Scroll into view, wrapped in rAF to allow state changes (filter/search reset) to re-render first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`project-card-${projectId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // 5. Clear query param after navigation + drop highlight
    const clearParamId = window.setTimeout(() => {
      setSearchParams({}, { replace: true });
    }, 350);
    const clearHighlightId = window.setTimeout(() => {
      setHighlightedProjectId((current) => (current === projectId ? null : current));
    }, 5000);

    return () => {
      window.clearTimeout(clearParamId);
      window.clearTimeout(clearHighlightId);
    };
  }, [searchParams, projects, setSearchParams, filterStatus, searchQuery]);

  if (isLoading) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 px-3.5 pt-3.5 pb-6 sm:px-0 sm:pt-0 sm:pb-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-5 sm:gap-6"
      >
        {/* ── Premium Hero ─────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <ProjectsHero
            totalCount={totalCount}
            completedCount={completedCount}
            activeCount={activeCount}
            onHoldCount={onHoldCount}
            overdueCount={overdueCount}
            projects={projects}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onNewProject={() => setCreateModalOpen(true)}
          />
        </motion.div>

        {/* Status Filter Tabs + Search + Filters */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 lg:pb-0 lg:flex-1 lg:min-w-0">
            <div className="np-pill-segmented flex-nowrap shrink-0">
              {(['ALL', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as FilterStatus[]).map((status) => {
                const count = status === 'ALL' ? projects.length : projects.filter((p) => p.status === status).length;
                const isActive = filterStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleFilterChange(status)}
                    className={`np-pill ${isActive ? 'is-active' : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="project-filter-indicator"
                        className="np-pill-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 1 }}
                      />
                    )}
                    <span className="relative z-[1] flex items-center gap-[5px]">
                      {status === 'ALL' ? 'All' : statusConfig[status].label}
                      <span className="np-pill-count">{count}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 lg:flex-initial">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-56 pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                style={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
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
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Sort by
                    </p>
                    {(
                      [
                        { key: 'default', label: 'Default' },
                        { key: 'name', label: 'Name' },
                        { key: 'progress', label: 'Progress' },
                        { key: 'dueDate', label: 'Due date' },
                      ] as { key: SortBy; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortBy(opt.key);
                          setSortMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                          sortBy === opt.key
                            ? 'text-accent'
                            : 'text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
            <Card variant="default" className="p-6 sm:p-10 text-center">
              <FloatingProjectsEmpty
                title={filterStatus === 'ALL' && !searchQuery ? 'No active projects yet' : 'No projects found'}
                description={
                  filterStatus === 'ALL' && !searchQuery
                    ? 'Get started today — create your first project'
                    : 'Try a different filter or search term'
                }
                onCreateProject={filterStatus === 'ALL' && !searchQuery ? () => setCreateModalOpen(true) : undefined}
                showCtaHint={false}
              />
            </Card>
          ) : viewMode === 'grid' ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {filteredProjects.map((project) => (
                <motion.div key={project.id} variants={itemVariants} className="h-full">
                  <ProjectCard
                    project={project}
                    isFavorite={favorites.has(project.id)}
                    isHighlighted={highlightedProjectId === project.id}
                    onToggleFavorite={() => toggleFavorite(project.id)}
                    menuOpen={projectMenuOpen === project.id}
                    onToggleMenu={() => setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id)}
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
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
            >
              {/* List header row (desktop only) */}
              <div
                className="hidden sm:grid items-center gap-4 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted"
                style={{
                  gridTemplateColumns: 'minmax(0,1fr) 110px 130px 90px 110px 40px',
                  background: 'var(--color-surface-raised)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span>Project</span>
                <span>Status</span>
                <span>Progress</span>
                <span>Tasks</span>
                <span>Due date</span>
                <span />
              </div>

              {filteredProjects.map((project, idx) => (
                <motion.div key={project.id} variants={itemVariants}>
                  <ProjectListRow
                    project={project}
                    isFavorite={favorites.has(project.id)}
                    isHighlighted={highlightedProjectId === project.id}
                    isLast={idx === filteredProjects.length - 1}
                    onToggleFavorite={() => toggleFavorite(project.id)}
                    menuOpen={projectMenuOpen === project.id}
                    onToggleMenu={() => setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id)}
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
// Project Card — detailed vertical card with circular progress ring (GRID view)
// ============================================================================
function ProjectCard({
  project,
  isFavorite,
  isHighlighted,
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
  isHighlighted?: boolean;
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
  const isOverdue =
    daysRemaining !== null && daysRemaining < 0 && project.status !== 'COMPLETED' && project.status !== 'CANCELLED';
  const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

  const color = project.color || 'var(--color-accent)';

  return (
    <Card
      id={`project-card-${project.id}`}
      variant="default"
      className="relative flex flex-col justify-between h-full overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer border rounded-2xl"
      onClick={onOpen}
      style={
        isHighlighted
          ? {
              boxShadow: '0 0 0 3px var(--color-accent), 0 10px 40px -15px rgba(0,0,0,0.35)',
              borderColor: 'var(--color-accent)',
              transform: 'translateY(-4px) scale(1.01)',
              transition: 'all 0.35s cubic-bezier(0.2, 0.9, 0.25, 1)',
            }
          : undefined
      }
    >
      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Card Top Row: Icon + Badges + Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: `color-mix(in srgb, ${color} 16%, transparent)`,
                color: color,
              }}
            >
              <Folder size={20} />
            </div>
            <Badge
              variant={statusConfig[project.status].color}
              size="sm"
              className="inline-flex items-center gap-1 shrink-0"
            >
              <StatusIcon size={11} />
              {statusConfig[project.status].label}
            </Badge>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onToggleFavorite}
              className={`p-1.5 rounded-lg transition-colors ${
                isFavorite
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-text-muted hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
            >
              <Star size={16} className={isFavorite ? 'fill-amber-500' : ''} />
            </button>

            <div className="relative">
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
                    className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-lg z-20 py-1"
                    style={{
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                    >
                      <Eye size={12} />
                      View details
                    </button>
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
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold text-text-primary truncate group-hover:text-accent transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-text-muted mt-1.5 line-clamp-2 leading-relaxed">
            {project.description || 'No description provided.'}
          </p>
        </div>

        {/* Media / Attachment Chips if any */}
        {(project.attachmentUrl || project.voiceNoteUrl) && (
          <div className="flex items-center gap-2">
            {project.attachmentUrl && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-text-muted bg-neutral-100 dark:bg-neutral-800">
                <Paperclip size={11} /> Attachment
              </span>
            )}
            {project.voiceNoteUrl && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-text-muted bg-neutral-100 dark:bg-neutral-800">
                <Mic size={11} /> Voice Note
              </span>
            )}
          </div>
        )}

        {/* Centered Progress Bar Section */}
        <div
          className="flex flex-col gap-2 p-3.5 rounded-xl"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5 text-text-primary">
              <TrendingUp size={13} className="text-accent shrink-0" />
              <span>
                {project.completedTaskCount ?? 0}/{project.taskCount ?? 0} tasks
              </span>
            </div>
            <span className="font-extrabold text-accent">{project.progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-200/70 dark:bg-neutral-800">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(project.progress, 0), 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Card Footer: Due Date */}
      <div
        className="px-5 py-3 border-t flex items-center justify-between text-xs font-bold text-text-muted"
        style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-raised)' }}
      >
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className={isOverdue ? 'text-danger' : isUrgent ? 'text-warning' : 'text-text-muted'} />
          <span className={isOverdue ? 'text-danger font-extrabold' : isUrgent ? 'text-warning font-extrabold' : ''}>
            {formatDate(project.dueDate)}
          </span>
        </div>

        {isOverdue && (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-danger/10 text-danger">Overdue</span>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Project List Row — dense, scannable table-style row (LIST view)
// ============================================================================
function ProjectListRow({
  project,
  isFavorite,
  isHighlighted,
  isLast,
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
  isHighlighted?: boolean;
  isLast: boolean;
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
  const isOverdue =
    daysRemaining !== null && daysRemaining < 0 && project.status !== 'COMPLETED' && project.status !== 'CANCELLED';
  const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;
  const progress = Math.min(Math.max(project.progress, 0), 100);

  return (
    <div
      id={`project-card-${project.id}`}
      onClick={onOpen}
      className="relative grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_110px_130px_90px_110px_40px] items-center gap-x-4 gap-y-2 px-5 py-3.5 cursor-pointer group transition-colors hover:bg-[var(--color-surface-raised)]"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
        ...(isHighlighted
          ? {
              boxShadow: 'inset 3px 0 0 var(--color-accent)',
              background: 'var(--color-surface-raised)',
              transition: 'all 0.35s cubic-bezier(0.2, 0.9, 0.25, 1)',
            }
          : undefined),
      }}
    >
      {/* Project name + icon + favorite */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `color-mix(in srgb, ${project.color || '#6366f1'} 16%, transparent)`,
            color: project.color || 'var(--color-accent)',
          }}
        >
          <Folder size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-sm font-black text-text-primary truncate group-hover:text-accent transition-colors">
              {project.name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`shrink-0 ${isFavorite ? 'text-accent' : 'text-text-muted/50 hover:text-text-muted'}`}
              aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Star size={12} className={isFavorite ? 'fill-current' : ''} />
            </button>
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            {project.description && (
              <p className="text-xs text-text-muted truncate max-w-[280px]">{project.description}</p>
            )}
            {project.attachmentUrl && <Paperclip size={11} className="text-text-muted shrink-0" />}
            {project.voiceNoteUrl && <Mic size={11} className="text-text-muted shrink-0" />}
          </div>
        </div>
      </div>

      {/* Status */}
      <div>
        <Badge variant={statusConfig[project.status].color} size="sm" className="inline-flex items-center gap-1">
          <StatusIcon size={10} />
          {statusConfig[project.status].label}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: project.color || 'var(--color-accent)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[11px] font-black text-text-primary w-8 text-right shrink-0">{progress}%</span>
      </div>

      {/* Tasks */}
      <div className="flex items-center gap-1.5 text-text-muted">
        <TrendingUp size={12} />
        <span className="text-xs font-bold">
          {project.completedTaskCount ?? 0}/{project.taskCount ?? 0}
        </span>
      </div>

      {/* Due date */}
      <div
        className={`flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${
          isOverdue ? 'text-danger' : isUrgent ? 'text-warning' : 'text-text-muted'
        }`}
      >
        <Calendar size={12} />
        <span>{project.dueDate ? formatDate(project.dueDate) : '—'}</span>
      </div>

      {/* Menu */}
      <div className="absolute right-3 top-3 sm:static sm:justify-self-end" onClick={(e) => e.stopPropagation()}>
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
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
                className="w-full px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <Eye size={12} />
                View details
              </button>
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
    </div>
  );
}

// ============================================================================
// Premium Projects Hero
// ============================================================================

function ProjectsHero({
  totalCount,
  completedCount,
  activeCount,
  onHoldCount,
  overdueCount,
  projects,
  viewMode,
  setViewMode,
  onNewProject,
}: {
  totalCount: number;
  completedCount: number;
  activeCount: number;
  onHoldCount: number;
  overdueCount: number;
  projects: ProjectDTO[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onNewProject: () => void;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 18 });
  const blob1X = useTransform(springX, [0, 1], ['-5%', '5%']);
  const blob1Y = useTransform(springY, [0, 1], ['-5%', '5%']);
  const blob2X = useTransform(springX, [0, 1], ['5%', '-5%']);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const pct = (n: number) => (totalCount > 0 ? Math.round((n / totalCount) * 100) : 0);
  const inProgressTotal = activeCount + onHoldCount;
  const completionRate = pct(completedCount);

  return (
    <div
      ref={heroRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden rounded-[28px]"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow:
          '0 0 0 1px color-mix(in srgb, var(--color-accent) 6%, transparent), 0 20px 60px -12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Ambient blobs */}
      <motion.div
        style={{ x: blob1X, y: blob1Y }}
        className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full"
        aria-hidden="true"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 13%, transparent), transparent 70%)',
            filter: 'blur(36px)',
          }}
        />
      </motion.div>
      <motion.div
        style={{ x: blob2X }}
        className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full"
        aria-hidden="true"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-success) 10%, transparent), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </motion.div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.022]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:p-8">
        {/* Row 1: eyebrow + view toggle + CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <FolderKanban size={11} />
            </motion.span>
            Project workspace
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div
              className="flex items-center gap-1 rounded-2xl border p-1"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              {(['grid', 'list'] as ViewMode[]).map((vm) => (
                <button
                  key={vm}
                  onClick={() => setViewMode(vm)}
                  className="flex items-center justify-center rounded-xl p-2 transition-all"
                  style={
                    viewMode === vm
                      ? { background: 'linear-gradient(135deg, var(--color-accent), #818CF8)', color: 'white' }
                      : { color: 'var(--color-text-muted)' }
                  }
                >
                  {vm === 'grid' ? <Grid3x3 size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>

            {/* New project CTA */}
            <button
              onClick={onNewProject}
              className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-black text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent), #818CF8)',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--color-accent) 28%, transparent)',
              }}
            >
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>

        {/* Row 2: Headline + stat cluster */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: headline + sub */}
          <div className="min-w-0">
            <h1
              className="font-black tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.6rem)', lineHeight: 1.08, color: 'var(--color-text-primary)' }}
            >
              Your <span style={{ color: 'var(--color-accent)' }}>projects,</span> organized.
            </h1>
            <p className="mt-2 text-sm leading-relaxed max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {totalCount > 0
                ? `${totalCount} project${totalCount !== 1 ? 's' : ''} — ${activeCount} active, ${completedCount} completed.`
                : 'Start your first project and keep everything organized in one place.'}
            </p>

            {/* Completion metric */}
            {totalCount > 0 && (
              <div
                className="mt-4 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5"
                style={{
                  background:
                    completionRate >= 50
                      ? 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface))'
                      : 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
                  borderColor:
                    completionRate >= 50
                      ? 'color-mix(in srgb, var(--color-success) 22%, transparent)'
                      : 'color-mix(in srgb, var(--color-warning) 22%, transparent)',
                }}
              >
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <ArrowUpRight
                    size={13}
                    style={{ color: completionRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}
                  />
                </motion.span>
                <span
                  className="text-xs font-black"
                  style={{ color: completionRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}
                >
                  {completionRate}% completion rate
                </span>
              </div>
            )}
          </div>

          {/* Right: inline stats strip */}
          <div
            className="flex items-center divide-x overflow-hidden rounded-2xl border lg:shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {[
              { value: totalCount, label: 'Projects', color: 'var(--color-accent)' },
              { value: completedCount, label: 'Completed', color: 'var(--color-success)' },
              { value: inProgressTotal, label: 'In progress', color: 'var(--color-info)' },
              {
                value: overdueCount,
                label: 'Overdue',
                color: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
              },
            ].map((s, i) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-0.5 px-5 py-3 min-w-[72px]"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.15em] leading-none"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {s.label}
                </span>
                <motion.span
                  className="text-2xl font-black leading-tight"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  style={{ color: s.color }}
                >
                  {s.value}
                </motion.span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
            <div
              className="h-6 w-32 rounded-lg animate-pulse mb-2"
              style={{ background: 'var(--color-surface-raised)' }}
            />
            <div
              className="h-3.5 w-24 rounded-md animate-pulse"
              style={{ background: 'var(--color-surface-raised)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 rounded-lg animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
          <div className="h-9 w-36 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl animate-pulse"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div className="h-3 w-16 rounded mb-4" style={{ background: 'var(--color-border-subtle)' }} />
            <div className="h-7 w-10 rounded" style={{ background: 'var(--color-border-subtle)' }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 rounded-lg animate-pulse shrink-0"
            style={{ background: 'var(--color-surface-raised)', animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl animate-pulse flex items-center gap-4"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              animationDelay: `${i * 80}ms`,
            }}
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

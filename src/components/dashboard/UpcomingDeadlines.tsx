import React from 'react';
import { Clock, CheckSquare, Folder, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';

interface UpcomingDeadlinesProps {
  deadlines: Array<{
    type: 'task' | 'project';
    id: string;
    title: string;
    dueDate: string;
    daysUntilDue: number;
  }>;
}

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  const navigate = useNavigate();

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'danger';
    if (days === 0) return 'warning';
    if (days <= 2) return 'warning';
    return 'info';
  };

  const formatDeadline = (days: number) => {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days}d`;
  };

  const handleClick = (deadline: (typeof deadlines)[0]) => {
    if (deadline.type === 'task') {
      navigate('/tasks');
    } else {
      navigate(`/projects/${deadline.id}`);
    }
  };

  // Useful even when the list itself is short - tells the user at a
  // glance whether anything actually needs attention, without reading
  // every row.
  const overdueCount = deadlines.filter((d) => d.daysUntilDue < 0).length;
  const dueTodayCount = deadlines.filter((d) => d.daysUntilDue === 0).length;
  const dueThisWeekCount = deadlines.filter((d) => d.daysUntilDue > 0 && d.daysUntilDue <= 7).length;

  return (
    // flex-1 (not h-full) so the card claims whatever space is left in its
    // flex-col parent directly, rather than depending on a % height
    // resolving correctly through a grid-stretched ancestor. Requires the
    // immediate parent to be a flex container - see DashboardPage's
    // "lg:col-span-5 flex flex-col" wrapper.
    <Card variant="default" className="overflow-hidden flex-1 flex flex-col">
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'var(--icon-bg-warning)',
              color: 'var(--icon-text-warning)',
            }}
          >
            <Clock size={16} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Upcoming deadlines</h3>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Overdue & upcoming</span>
      </div>

      {deadlines.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Urgency summary - gives the card weight and a real answer
              ("is anything on fire") even when only one or two rows follow. */}
          <div
            className="px-5 py-3 grid grid-cols-3 gap-2 border-b shrink-0"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <StatChip label="Overdue" count={overdueCount} urgency="danger" />
            <StatChip label="Due today" count={dueTodayCount} urgency="warning" />
            <StatChip label="This week" count={dueThisWeekCount} urgency="info" />
          </div>

          {/* flex-1 instead of a fixed max-h - the list now grows to fill
              whatever space the card has, and only scrolls internally once
              content genuinely exceeds that space. */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
              {deadlines.map((deadline) => {
                const Icon = deadline.type === 'task' ? CheckSquare : Folder;
                const urgency = getUrgencyColor(deadline.daysUntilDue);

                return (
                  <div
                    key={`${deadline.type}-${deadline.id}`}
                    onClick={() => handleClick(deadline)}
                    className="px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                        style={{
                          background: `var(--icon-bg-${urgency})`,
                          color: `var(--icon-text-${urgency})`,
                        }}
                      >
                        <Icon size={14} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-primary mb-1 truncate">{deadline.title}</p>

                        <div className="flex items-center gap-2">
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{
                              background: 'var(--color-border-subtle)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            {deadline.type}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: `var(--color-${urgency})` }}>
                            {formatDeadline(deadline.daysUntilDue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function StatChip({ label, count, urgency }: { label: string; count: number; urgency: 'danger' | 'warning' | 'info' }) {
  const isZero = count === 0;
  return (
    <div
      className="rounded-lg px-2.5 py-2 flex flex-col items-center gap-0.5"
      style={{
        background: isZero ? 'var(--color-border-subtle)' : `var(--icon-bg-${urgency})`,
      }}
    >
      <span
        className="text-sm font-bold leading-none"
        style={{
          color: isZero ? 'var(--color-text-muted)' : `var(--icon-text-${urgency})`,
        }}
      >
        {count}
      </span>
      <span
        className="text-[9px] font-bold uppercase tracking-wider"
        style={{
          color: isZero ? 'var(--color-text-muted)' : `var(--icon-text-${urgency})`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Illustrated, gently-animated empty state. Respects prefers-reduced-motion
// so it never becomes a distraction for people sensitive to motion.
function EmptyState() {
  return (
    <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center text-center">
      <style>{`
        @keyframes deadlines-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes deadlines-check-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .deadlines-empty-float {
          animation: deadlines-float 3.5s ease-in-out infinite;
        }
        .deadlines-empty-check {
          animation: deadlines-check-pop 0.5s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .deadlines-empty-float,
          .deadlines-empty-check {
            animation: none;
          }
        }
      `}</style>

      <div className="deadlines-empty-float relative w-16 h-16 mb-4">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="12" width="48" height="44" rx="8" fill="var(--icon-bg-info)" />
          <rect x="8" y="12" width="48" height="12" rx="8" fill="var(--icon-text-info)" opacity="0.25" />
          <rect x="18" y="6" width="4" height="10" rx="2" fill="var(--icon-text-info)" />
          <rect x="42" y="6" width="4" height="10" rx="2" fill="var(--icon-text-info)" />
          <circle cx="24" cy="38" r="2" fill="var(--icon-text-info)" opacity="0.4" />
          <circle cx="32" cy="38" r="2" fill="var(--icon-text-info)" opacity="0.4" />
          <circle cx="24" cy="46" r="2" fill="var(--icon-text-info)" opacity="0.4" />
        </svg>
        <div
          className="deadlines-empty-check absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2"
          style={{
            background: 'var(--icon-bg-success, #dcfce7)',
            borderColor: 'var(--color-surface, #fff)',
            color: 'var(--icon-text-success, #16a34a)',
          }}
        >
          <CalendarCheck size={14} strokeWidth={2.5} />
        </div>
      </div>

      <p className="text-xs font-bold text-text-primary mb-1">All caught up</p>
      <p className="text-[11px] text-text-muted max-w-[220px]">No overdue or upcoming deadlines to worry about.</p>
    </div>
  );
}

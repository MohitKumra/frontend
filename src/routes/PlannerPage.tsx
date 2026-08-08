import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import { useTasks, useUpdateTask } from '../features/tasks/hooks/useTasks';
import { LoadingScreen } from '../components/ui/Spinner';
import { getWeekDays, getMonthDays, addDays, subDays, isSameDay, isToday, format, isSameMonth } from '../lib/dateUtils';
import { PageHeader } from '../components/ui/PageHeader';
import { TabBar } from '../components/ui/TabBar';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { AgendaTaskRow } from '../components/planner/AgendaTaskRow';
import type { TaskDTO } from '../types';

type PlannerView = 'day' | 'week' | 'month';

const STATUS_META = {
  TODO: { label: 'To do', color: 'var(--color-info)' },
  IN_PROGRESS: { label: 'In progress', color: 'var(--color-warning)' },
  DONE: { label: 'Done', color: 'var(--color-success)' },
} as const;

export function PlannerPage() {
  const [view, setView] = useState<PlannerView>('week');
  const [reference, setReference] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { data, isLoading } = useTasks();
  const updateTask = useUpdateTask();

  const tasks = (data?.pages.flatMap((p) => p.data) ?? []).filter((t: TaskDTO) => t.dueDate);

  const navigate = (dir: 1 | -1) => {
    setReference((d) => {
      const delta = view === 'day' ? 1 : view === 'week' ? 7 : 30;
      return dir === 1 ? addDays(d, delta) : subDays(d, delta);
    });
  };

  const tasksForDay = (date: Date): TaskDTO[] =>
    tasks
      .filter((t: TaskDTO) => t.dueDate && isSameDay(new Date(t.dueDate), date))
      .sort((a: TaskDTO, b: TaskDTO) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  if (isLoading) return <LoadingScreen />;

  const viewTabs = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ];

  const selectedDayTasks = selectedDate ? tasksForDay(selectedDate) : [];
  const doneCount = selectedDayTasks.filter((t) => t.status === 'DONE').length;
  const totalCount = selectedDayTasks.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const statusCounts = {
    TODO: selectedDayTasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: selectedDayTasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE: doneCount,
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto flex flex-col gap-4 sm:gap-6 md:gap-8 px-3 sm:px-4"
      aria-hidden={!!selectedDate}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 sm:gap-6 md:gap-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <PageHeader
            icon={<Calendar size={20} />}
            title="Planner"
            subtitle="Manage your schedule"
            action={
              <TabBar tabs={viewTabs} activeTab={view} onTabChange={(v) => setView(v as PlannerView)} variant="pill" />
            }
          />
        </motion.div>

        {/* Navigation Row */}
        <motion.div variants={itemVariants}>
          <div
            className="flex items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl border"
            style={{
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
            }}
          >
            <button
              onClick={() => navigate(-1)}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-text-secondary hover:text-text-primary transition-colors tap-target"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-xs sm:text-sm md:text-base font-extrabold text-text-primary text-center px-2 truncate">
              {view === 'day'
                ? format(reference, 'EEEE, MMMM d')
                : view === 'week'
                  ? `Week of ${format(getWeekDays(reference)[0], 'MMMM d, yyyy')}`
                  : format(reference, 'MMMM yyyy')}
            </p>
            <button
              onClick={() => navigate(1)}
              className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-text-secondary hover:text-text-primary transition-colors tap-target"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Day/Week/Month Views */}
        <motion.div variants={itemVariants}>
          {/* Day View */}
          {view === 'day' && <DayColumn date={reference} tasks={tasksForDay(reference)} updateTask={updateTask} />}

          {/* Week View - Responsive Grid */}
          {view === 'week' && (
            <div className="grid  grid-cols-4 md:grid-cols-7 gap-1.5 sm:gap-2 md:gap-3 overflow-x-auto no-scrollbar min-w-[320px] sm:min-w-[500px] md:min-w-[640px] py-1">
              {getWeekDays(reference).map((day) => {
                const dayTasks = tasksForDay(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="flex flex-col gap-1.5 sm:gap-2 md:gap-3 min-w-0 cursor-pointer"
                    onClick={() => setSelectedDate(day)}
                  >
                    <div
                      className={[
                        'text-center py-2 sm:py-3 rounded-lg sm:rounded-xl md:rounded-2xl text-[10px] sm:text-xs font-extrabold flex flex-col border',
                        today ? 'text-white border-transparent shadow-sm' : 'text-text-secondary border-border',
                      ].join(' ')}
                      style={{
                        background: today ? 'var(--gradient-accent)' : 'var(--color-surface)',
                      }}
                    >
                      <span className="uppercase tracking-wider opacity-75">{format(day, 'EEE')}</span>
                      <span className="text-base sm:text-lg md:text-xl font-black mt-0.5">{format(day, 'd')}</span>
                    </div>
                    <div className="flex flex-col gap-1 min-h-[80px] sm:min-h-[100px] md:min-h-[140px] p-1 rounded-lg sm:rounded-xl md:rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/20 border border-dashed border-border">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className={[
                            'p-1.5 sm:p-2 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] leading-snug font-bold border transition-all duration-200',
                            t.status === 'DONE'
                              ? 'bg-success/5 border-success/15 text-success line-through opacity-70'
                              : 'bg-accent-subtle border-accent-border text-accent',
                          ].join(' ')}
                        >
                          <p className="line-clamp-1 sm:line-clamp-2">{t.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Month View - Responsive Grid */}
          {view === 'month' && (
            <div className="overflow-x-auto no-scrollbar min-w-[320px] sm:min-w-[500px] md:min-w-[768px] py-1">
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div
                    key={i}
                    className="text-center text-[9px] sm:text-[10px] uppercase font-bold text-text-muted py-1 tracking-wider"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
                {getMonthDays(reference).map((day) => {
                  const dayTasks = tasksForDay(day);
                  const today = isToday(day);
                  const inCurrentMonth = isSameMonth(day, reference);
                  return (
                    <div
                      key={day.toISOString()}
                      className={[
                        'min-h-[70px] sm:min-h-[90px] md:min-h-[110px] p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl md:rounded-2xl border flex flex-col',
                        today ? 'border-accent shadow-sm' : inCurrentMonth ? 'border-border' : 'border-border/30',
                        inCurrentMonth ? 'cursor-pointer' : 'cursor-default',
                      ].join(' ')}
                      style={{
                        background: inCurrentMonth ? 'var(--color-surface)' : 'var(--color-surface-raised)',
                        opacity: inCurrentMonth ? 1 : 0.4,
                      }}
                      onClick={() => inCurrentMonth && setSelectedDate(day)}
                    >
                      <p
                        className={[
                          'text-[9px] sm:text-xs font-bold self-start mb-1 sm:mb-2 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center',
                          today
                            ? 'text-text-onaccent font-black'
                            : inCurrentMonth
                              ? 'text-text-secondary'
                              : 'text-text-muted',
                        ].join(' ')}
                        style={{
                          background: today ? 'var(--gradient-accent)' : undefined,
                        }}
                      >
                        {format(day, 'd')}
                      </p>
                      {inCurrentMonth && (
                        <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 overflow-y-auto no-scrollbar">
                          {dayTasks.slice(0, 2).map((t) => (
                            <div
                              key={t.id}
                              className={[
                                'text-[8px] sm:text-[9px] font-bold rounded-sm sm:rounded-md px-1 py-0.5 sm:px-1.5 sm:py-0.5 truncate border',
                                t.status === 'DONE'
                                  ? 'bg-success/5 border-success/10 text-success opacity-70 line-through'
                                  : 'bg-accent-subtle border-accent-border text-accent',
                              ].join(' ')}
                            >
                              {t.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <div className="text-[8px] sm:text-[9px] text-text-muted font-bold pl-1">
                              {dayTasks.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
      {/* Day Detail Modal — a calendar app's day-agenda view, not a form list */}
      <Modal
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}
        maxWidth="max-w-2xl"
      >
        {selectedDate && (
          <div className="flex flex-col gap-5 -mt-1">
            {totalCount > 0 ? (
              <div
                className="rounded-2xl border p-4 sm:p-5"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
                    >
                      <CalendarCheck size={16} />
                    </div>
                    <p className="text-xs font-bold text-text-primary">
                      {doneCount} of {totalCount} completed
                    </p>
                  </div>
                  <span
                    className="text-xs font-extrabold px-2.5 py-1 rounded-full"
                    style={{
                      color: 'var(--color-accent)',
                      background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                    }}
                  >
                    {completionPct}%
                  </span>
                </div>

                {/* Segmented progress bar — one bespoke bar, not a generic chart widget */}
                <div
                  className="flex w-full h-2 rounded-full overflow-hidden mb-3"
                  style={{ background: 'var(--color-border-subtle)' }}
                >
                  {(['DONE', 'IN_PROGRESS', 'TODO'] as const).map((key) =>
                    statusCounts[key] > 0 ? (
                      <div
                        key={key}
                        style={{
                          width: `${(statusCounts[key] / totalCount) * 100}%`,
                          background: STATUS_META[key].color,
                          transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)',
                        }}
                      />
                    ) : null
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5">
                  {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((key) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[key].color }} />
                      <span className="text-[11px] font-bold text-text-muted">
                        {statusCounts[key]} {STATUS_META[key].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-10">
                <div
                  className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center"
                  style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
                >
                  <Calendar size={26} />
                </div>
                <p className="text-sm font-bold text-text-primary mb-1">Nothing scheduled</p>
                <p className="text-xs text-text-muted">This day is wide open.</p>
              </div>
            )}

            {/* Agenda timeline */}
            {selectedDayTasks.length > 0 && (
              <div>
                {selectedDayTasks.map((t, i) => (
                  <AgendaTaskRow
                    key={t.id}
                    task={t}
                    isLast={i === selectedDayTasks.length - 1}
                    onToggle={() =>
                      updateTask.mutate({ id: t.id, data: { status: t.status === 'DONE' ? 'TODO' : 'DONE' } })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DayColumn({
  date,
  tasks,
  updateTask,
}: {
  date: Date;
  tasks: TaskDTO[];
  updateTask: ReturnType<typeof useUpdateTask>;
}) {
  return (
    <Card variant="default" className="p-4 sm:p-6 md:p-8 animate-scale-in">
      <p className="text-base sm:text-lg md:text-xl font-extrabold text-text-primary mb-4 sm:mb-6">
        {format(date, 'EEEE, MMMM d')}
      </p>
      {tasks.length === 0 ? (
        <p className="text-xs sm:text-sm text-text-muted py-8 sm:py-10 text-center font-bold">
          No tasks scheduled for this day
        </p>
      ) : (
        <div>
          {tasks.map((t, i) => (
            <AgendaTaskRow
              key={t.id}
              task={t}
              isLast={i === tasks.length - 1}
              onToggle={() => updateTask.mutate({ id: t.id, data: { status: t.status === 'DONE' ? 'TODO' : 'DONE' } })}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { addMonths } from 'date-fns';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  LayoutList,
  Timer,
  CheckSquare,
  Circle,
  Sparkles,
  CalendarCheck,
  ArrowRight,
  Plus,
  RefreshCw,
  Check,
  ListTodo,
  Zap,
} from 'lucide-react';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  formatDate,
  formatTime,
  getMonthDays,
  getWeekDays,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from '../lib/dateUtils';
import { useCalendarOverview } from '../features/calendar/hooks/useCalendar';
import { LoadingScreen } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { TabBar } from '../components/ui/TabBar';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { AgendaTaskRow } from '../components/planner/AgendaTaskRow';
import { useTasks, useUpdateTask } from '../features/tasks/hooks/useTasks';
import { useUIStore } from '../store/uiStore';
import type { CalendarEventDTO, TaskDTO } from '../types';

type CalendarView = 'day' | 'week' | 'month' | 'agenda';
type PlannerView = 'day' | 'week' | 'month';
type EventTypeKey = CalendarEventDTO['type'];

const EVENT_META: Record<EventTypeKey, { label: string; accent: string; bg: string; dot: string }> = {
  TASK_DUE: {
    label: 'Task',
    accent: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
    dot: 'var(--color-accent)',
  },
  FOCUS_SESSION: {
    label: 'Focus',
    accent: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    dot: 'var(--color-success)',
  },
};

// Categories shown in the sidebar filter list. Two are backed by real event
// data (Tasks, Focus Sessions). The rest are placeholders for calendar
// sources that don't exist in the API yet — shown muted, ready to wire up
// the moment the backend exposes them.
const CALENDAR_FILTERS: { key: EventTypeKey; label: string; color: string; wired: true }[] = [
  { key: 'TASK_DUE', label: 'Tasks', color: 'var(--color-accent)', wired: true },
  { key: 'FOCUS_SESSION', label: 'Focus Sessions', color: 'var(--color-success)', wired: true },
];
const COMING_SOON_FILTERS = [
  { label: 'Deadlines', color: 'var(--color-danger, #ef4444)' },
  { label: 'Personal', color: 'var(--color-warning, #f59e0b)' },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}
function startOfMonthRange(date: Date) {
  return startOfMonth(date);
}
function endOfMonthRange(date: Date) {
  return endOfMonth(date);
}
function startOfWeekRange(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}
function endOfWeekRange(date: Date) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

function formatRangeLabel(view: CalendarView, reference: Date) {
  switch (view) {
    case 'day':
      return format(reference, 'EEEE, MMMM d');
    case 'week': {
      const start = startOfWeekRange(reference);
      const end = endOfWeekRange(reference);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    case 'month':
      return format(reference, 'MMMM yyyy');
    case 'agenda':
      return `Agenda from ${format(reference, 'MMM d, yyyy')}`;
  }
}

function getRange(view: CalendarView, reference: Date) {
  switch (view) {
    case 'day':
      return { from: startOfDay(reference), to: endOfDay(reference) };
    case 'week':
      return { from: startOfWeekRange(reference), to: endOfWeekRange(reference) };
    case 'month':
      return { from: startOfMonthRange(reference), to: endOfMonthRange(reference) };
    case 'agenda':
      return { from: startOfWeekRange(reference), to: endOfMonthRange(addMonths(reference, 1)) };
  }
}

function getEventSummary(events: CalendarEventDTO[]) {
  return {
    tasks: events.filter((event) => event.type === 'TASK_DUE').length,
    focus: events.filter((event) => event.type === 'FOCUS_SESSION').length,
  };
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CalendarPage() {
  const calendarViewPreference = useUIStore((s) => s.calendarViewPreference);
  const [view, setView] = useState<CalendarView>(calendarViewPreference);
  const [reference, setReference] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [plannerView, setPlannerView] = useState<PlannerView>('week');
  const [plannerReference, setPlannerReference] = useState(new Date());
  const [plannerSelectedDate, setPlannerSelectedDate] = useState<Date | null>(null);

  // Left rail state
  const [miniRef, setMiniRef] = useState(new Date());
  const [activeFilters, setActiveFilters] = useState<Set<EventTypeKey>>(
    () => new Set(['TASK_DUE', 'FOCUS_SESSION']),
  );
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  useEffect(() => {
    setView(calendarViewPreference);
  }, [calendarViewPreference]);

  const { data: tasksData } = useTasks();
  const updateTask = useUpdateTask();

  const range = getRange(view, reference);
  const calendarRange = useMemo(
    () => ({
      from: format(range.from, 'yyyy-MM-dd'),
      to: format(range.to, 'yyyy-MM-dd'),
    }),
    [range.from, range.to],
  );

  const { data, isLoading } = useCalendarOverview(calendarRange);

  const allEvents = data?.events ?? [];
  const events = useMemo(
    () => allEvents.filter((event) => activeFilters.has(event.type)),
    [allEvents, activeFilters],
  );
  const tasks = tasksData?.pages.flatMap((p) => p.data) ?? [];
  const referenceKey = format(reference, 'yyyy-MM-dd');
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const event of events) {
      const key = format(new Date(event.startAt), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [events]);

  const referenceEvents = eventsByDay.get(referenceKey) ?? [];
  const todayEvents = eventsByDay.get(todayKey) ?? [];

  const rangeLabel = formatRangeLabel(view, reference);
  const summary = getEventSummary(events);
  const plannerTasks = useMemo(
    () => tasks.filter((task: TaskDTO) => task.dueDate && task.status !== 'CANCELLED'),
    [tasks],
  );

  const tasksForDay = (date: Date) =>
    plannerTasks
      .filter((task: TaskDTO) => task.dueDate && isSameDay(new Date(task.dueDate), date))
      .sort((a: TaskDTO, b: TaskDTO) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const plannerSelectedTasks = plannerSelectedDate ? tasksForDay(plannerSelectedDate) : [];
  const plannerDoneCount = plannerSelectedTasks.filter((task: TaskDTO) => task.status === 'DONE').length;
  const plannerTotalCount = plannerSelectedTasks.length;
  const plannerCompletionPct = plannerTotalCount > 0 ? Math.round((plannerDoneCount / plannerTotalCount) * 100) : 0;
  const plannerStatusCounts = {
    TODO: plannerSelectedTasks.filter((task: TaskDTO) => task.status === 'TODO').length,
    IN_PROGRESS: plannerSelectedTasks.filter((task: TaskDTO) => task.status === 'IN_PROGRESS').length,
    DONE: plannerDoneCount,
  };

  // Today card + this-week summary (right rail) — derived from real task data.
  const todaysTasks = tasksForDay(new Date());
  const todaysDone = todaysTasks.filter((t) => t.status === 'DONE').length;
  const todaysTotal = todaysTasks.length;

  const weekDays = getWeekDays(new Date());
  const weekTasks = useMemo(
    () => weekDays.flatMap((d) => tasksForDay(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plannerTasks],
  );
  const weekDone = weekTasks.filter((t) => t.status === 'DONE').length;
  const weekInProgress = weekTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const weekTodo = weekTasks.filter((t) => t.status === 'TODO').length;
  const weekRate = weekTasks.length > 0 ? Math.round((weekDone / weekTasks.length) * 100) : 0;

  const upcomingItems = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 7);
    const fromTasks = plannerTasks
      .filter((t) => t.dueDate && new Date(t.dueDate) >= startOfDay(now) && new Date(t.dueDate) <= horizon)
      .map((t) => ({ id: `task-${t.id}`, title: t.title, date: new Date(t.dueDate!), kind: 'Task' as const }));
    const fromEvents = allEvents
      .filter((e) => new Date(e.startAt) >= startOfDay(now) && new Date(e.startAt) <= horizon)
      .map((e) => ({ id: `event-${e.id}`, title: e.title, date: new Date(e.startAt), kind: EVENT_META[e.type].label }));
    return [...fromTasks, ...fromEvents].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 3);
  }, [plannerTasks, allEvents]);

  const navigatePeriod = (direction: -1 | 1) => {
    setReference((current) => {
      if (view === 'day') return addDays(current, direction);
      if (view === 'week') return addDays(current, direction * 7);
      if (view === 'month') return addMonths(current, direction);
      return addDays(current, direction * 14);
    });
  };

  const plannerNavigate = (direction: -1 | 1) => {
    setPlannerReference((current) => {
      const delta = plannerView === 'day' ? 1 : plannerView === 'week' ? 7 : 30;
      return addDays(current, direction * delta);
    });
  };

  const toggleFilter = (key: EventTypeKey) => {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const jumpToToday = () => {
    const today = new Date();
    setReference(today);
    setMiniRef(today);
    setSelectedDate(today);
    setView('day');
  };

  if (isLoading) return <LoadingScreen />;

  const viewTabs = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'agenda', label: 'Agenda' },
  ] satisfies { id: CalendarView; label: string }[];

  return (
    <div className="w-full max-w-[1700px] mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
        {/* Header */}
        <motion.div variants={itemVariants}>
          <PageHeader
            icon={<CalendarDays size={18} />}
            title="Calendar"
            subtitle="Plan your time. Achieve more."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:shadow-sm"
                  style={{
                    background: 'var(--color-surface-raised)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Today
                </button>
                <TabBar tabs={viewTabs} activeTab={view} onTabChange={(tab) => setView(tab as CalendarView)} variant="pill" />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNewMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm"
                    style={{ background: 'var(--gradient-accent)' }}
                  >
                    <Plus size={14} /> New <ChevronDown size={12} />
                  </button>
                  {newMenuOpen && (
                    <div
                      className="absolute right-0 mt-1.5 w-36 rounded-xl border shadow-lg z-20 overflow-hidden"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      {['Event', 'Task', 'Focus', 'Habit'].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setNewMenuOpen(false)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            }
          />
        </motion.div>

        {/* 3-column layout: left rail / main / right rail */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] xl:grid-cols-[230px_1fr_270px] gap-4 items-start">
          {/* LEFT RAIL */}
          <motion.div variants={itemVariants} className="order-2 lg:order-1 flex flex-col gap-4">
            <MiniCalendar
              miniRef={miniRef}
              setMiniRef={setMiniRef}
              reference={reference}
              onSelectDate={(day) => {
                setReference(day);
                setMiniRef(day);
              }}
            />

            <Card variant="default" className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-text-primary">Calendars</h4>
              </div>
              <div className="flex flex-col gap-1.5">
                {CALENDAR_FILTERS.map((f) => {
                  const count = f.key === 'TASK_DUE' ? summary.tasks : summary.focus;
                  const active = activeFilters.has(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleFilter(f.key)}
                      className="flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center border shrink-0"
                        style={{
                          background: active ? f.color : 'transparent',
                          borderColor: active ? f.color : 'var(--color-border)',
                        }}
                      >
                        {active && <Check size={10} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-[11px] font-semibold text-text-primary flex-1 text-left truncate">{f.label}</span>
                      <span className="text-[11px] font-bold text-text-muted">{count}</span>
                    </button>
                  );
                })}
                {COMING_SOON_FILTERS.map((f) => (
                  <div key={f.label} className="flex items-center gap-2 py-1 px-1 opacity-40">
                    <span className="w-3.5 h-3.5 rounded-[4px] border shrink-0" style={{ borderColor: f.color }} />
                    <span className="text-[11px] font-semibold text-text-primary flex-1 text-left truncate">{f.label}</span>
                    <span className="text-[10px] font-bold text-text-muted">Soon</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="default" className="p-3">
              <h4 className="text-xs font-bold text-text-primary mb-2">Upcoming This Week</h4>
              {upcomingItems.length === 0 ? (
                <p className="text-[11px] text-text-muted font-semibold py-2">Nothing coming up.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {upcomingItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--color-accent)' }} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                          {isSameDay(item.date, new Date()) ? 'Today' : format(item.date, 'EEE, h:mm a')}
                        </p>
                        <p className="text-[11px] font-bold text-text-primary truncate">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setView('agenda')}
                className="mt-2.5 text-[11px] font-bold text-accent hover:text-accent-hover inline-flex items-center gap-1"
              >
                View full agenda <ArrowRight size={11} />
              </button>
            </Card>

            <Card variant="default" className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}
                >
                  <Check size={12} style={{ color: 'var(--color-success)' }} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-text-primary truncate">Synced</p>
                  <p className="text-[10px] text-text-muted font-semibold truncate">Last sync just now</p>
                </div>
              </div>
              <RefreshCw size={13} className="text-text-muted shrink-0" />
            </Card>
          </motion.div>

          {/* MAIN */}
          <motion.div variants={itemVariants} className="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={<CalendarDays size={16} />}
                iconBg="color-mix(in srgb, var(--color-accent) 14%, transparent)"
                iconColor="var(--color-accent)"
                label="Total Events"
                value={data?.meta.totalEvents ?? 0}
                sub={`in current range`}
                subColor="var(--color-success)"
              />
              <StatCard
                icon={<ListTodo size={16} />}
                iconBg="color-mix(in srgb, var(--color-info, #3b82f6) 14%, transparent)"
                iconColor="var(--color-info, #3b82f6)"
                label="Tasks Due"
                value={summary.tasks}
                sub={`in range`}
                subColor="var(--color-text-muted)"
              />
              <StatCard
                icon={<Clock3 size={16} />}
                iconBg="color-mix(in srgb, var(--color-success) 14%, transparent)"
                iconColor="var(--color-success)"
                label="Focus Sessions"
                value={summary.focus}
                sub={`in range`}
                subColor="var(--color-text-muted)"
              />
              <StatCard
                icon={<Zap size={16} />}
                iconBg="color-mix(in srgb, var(--color-warning, #f59e0b) 14%, transparent)"
                iconColor="var(--color-warning, #f59e0b)"
                label="Completion"
                value={`${weekRate}%`}
                sub="this week"
                subColor="var(--color-text-muted)"
              />
            </div>

            {/* Range nav */}
            <div
              className="flex items-center justify-between p-2.5 rounded-2xl border"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => navigatePeriod(-1)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center min-w-0">
                <p className="text-sm font-extrabold text-text-primary truncate">{rangeLabel}</p>
                <p className="text-[10px] font-semibold text-text-muted mt-0.5">{events.length} events shown</p>
              </div>
              <button
                type="button"
                onClick={() => navigatePeriod(1)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* View body */}
            {view === 'day' && (
              <Card variant="default" className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">Day View</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Everything scheduled for the selected day</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(reference)}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    Open agenda
                  </button>
                </div>
                <CalendarDayAgenda day={reference} events={referenceEvents} onPickDay={setSelectedDate} />
              </Card>
            )}

            {view === 'week' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {getWeekDays(reference).map((day) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay.get(dayKey) ?? [];
                  const summaryForDay = getEventSummary(dayEvents);
                  const today = isSameDay(day, new Date());
                  return (
                    <button
                      type="button"
                      key={dayKey}
                      onClick={() => setSelectedDate(day)}
                      className="text-left rounded-xl border p-2.5 transition-all hover:shadow-md"
                      style={{
                        background: today ? 'color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))' : 'var(--color-surface)',
                        borderColor: today ? 'var(--color-accent-border)' : 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{format(day, 'EEE')}</div>
                          <div className="text-base font-black text-text-primary">{format(day, 'd')}</div>
                        </div>
                        {today && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: EVENT_META.TASK_DUE.bg, color: EVENT_META.TASK_DUE.accent }}
                          >
                            Today
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-text-muted mb-1">
                        <span>Tasks {summaryForDay.tasks}</span>
                        <span>Focus {summaryForDay.focus}</span>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <EventChip key={event.id} event={event} compact />
                        ))}
                        {dayEvents.length > 2 && <div className="text-[10px] font-semibold text-text-muted">+{dayEvents.length - 2} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {view === 'month' && (
              <div className="overflow-x-auto no-scrollbar">
                <div className="grid grid-cols-7 gap-1.5 mb-1.5 min-w-[620px]">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <div key={i} className="text-center text-[9px] font-bold uppercase tracking-wider text-text-muted py-1">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5 min-w-[620px]">
                  {getMonthDays(reference).map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay.get(dayKey) ?? [];
                    const inMonth = isSameMonth(day, reference);
                    const today = isSameDay(day, new Date());
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        onClick={() => inMonth && setSelectedDate(day)}
                        className="text-left rounded-xl border p-1.5 sm:p-2 min-h-[74px] sm:min-h-[92px] transition-all"
                        style={{
                          background: today ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))' : inMonth ? 'var(--color-surface)' : 'var(--color-surface-raised)',
                          borderColor: today ? 'var(--color-accent)' : 'var(--color-border)',
                          opacity: inMonth ? 1 : 0.4,
                          cursor: inMonth ? 'pointer' : 'default',
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className="w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center"
                            style={{
                              background: today ? 'var(--gradient-accent)' : 'transparent',
                              color: today ? 'var(--color-text-onaccent)' : 'var(--color-text-primary)',
                            }}
                          >
                            {format(day, 'd')}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <EventChip key={event.id} event={event} compact />
                          ))}
                          {dayEvents.length > 2 && <div className="text-[9px] font-semibold text-text-muted">+{dayEvents.length - 2} more</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'agenda' && (
              <Card variant="default" className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">Agenda</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Chronological list across the current range</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
                    <LayoutList size={12} />
                    <span>{events.length} events</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <div className="py-10 text-center">
                      <Sparkles size={30} className="mx-auto text-text-muted mb-2" />
                      <p className="text-xs font-bold text-text-primary">No events in this range</p>
                      <p className="text-[10px] text-text-muted mt-1">Your calendar is clear for now.</p>
                    </div>
                  ) : (
                    events.map((event) => (
                      <AgendaRow key={event.id} event={event} onClick={() => setSelectedDate(new Date(event.startAt))} />
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* Planner */}
            <Card variant="default" className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-xs font-bold text-text-primary">Planner</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">Task scheduling and execution</p>
                </div>
                <TabBar
                  tabs={[
                    { id: 'day', label: 'Day' },
                    { id: 'week', label: 'Week' },
                    { id: 'month', label: 'Month' },
                  ]}
                  activeTab={plannerView}
                  onTabChange={(tab) => setPlannerView(tab as PlannerView)}
                  variant="pill"
                />
              </div>

              <div
                className="flex items-center justify-between p-2 rounded-xl border mb-3"
                style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => plannerNavigate(-1)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <p className="text-xs font-extrabold text-text-primary text-center px-2 truncate">
                  {plannerView === 'day'
                    ? format(plannerReference, 'EEEE, MMMM d')
                    : plannerView === 'week'
                      ? `Week of ${format(getWeekDays(plannerReference)[0], 'MMMM d, yyyy')}`
                      : format(plannerReference, 'MMMM yyyy')}
                </p>
                <button
                  type="button"
                  onClick={() => plannerNavigate(1)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {plannerView === 'day' && (
                <PlannerDayColumn date={plannerReference} tasks={tasksForDay(plannerReference)} updateTask={updateTask} onPickDay={setPlannerSelectedDate} />
              )}

              {plannerView === 'week' && (
                <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5 overflow-x-auto no-scrollbar min-w-[320px] py-1">
                  {getWeekDays(plannerReference).map((day) => {
                    const dayTasks = tasksForDay(day);
                    const today = isSameDay(day, new Date());
                    return (
                      <button type="button" key={day.toISOString()} className="flex flex-col gap-1.5 min-w-0 text-left" onClick={() => setPlannerSelectedDate(day)}>
                        <div
                          className="text-center py-1.5 rounded-xl text-[9px] font-extrabold flex flex-col border"
                          style={{
                            background: today ? 'var(--gradient-accent)' : 'var(--color-surface)',
                            borderColor: today ? 'transparent' : 'var(--color-border)',
                            color: today ? '#fff' : 'var(--color-text-secondary)',
                          }}
                        >
                          <span className="uppercase tracking-wider opacity-75">{format(day, 'EEE')}</span>
                          <span className="text-sm font-black mt-0.5">{format(day, 'd')}</span>
                        </div>
                        <div className="flex flex-col gap-1 min-h-[70px] p-1.5 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20 border border-dashed border-border">
                          {dayTasks.slice(0, 2).map((task: TaskDTO) => (
                            <div
                              key={task.id}
                              className={[
                                'rounded-md px-1.5 py-1 text-[9px] leading-snug font-bold border truncate',
                                task.status === 'DONE'
                                  ? 'bg-success/5 border-success/15 text-success line-through opacity-70'
                                  : 'bg-accent-subtle border-accent-border text-accent',
                              ].join(' ')}
                            >
                              {task.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && <div className="text-[9px] font-bold text-text-muted pl-1">+{dayTasks.length - 2} more</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {plannerView === 'month' && (
                <div className="overflow-x-auto no-scrollbar">
                  <div className="grid grid-cols-7 gap-1.5 mb-1.5 min-w-[560px]">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <div key={i} className="text-center text-[9px] font-bold uppercase tracking-wider text-text-muted py-1">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 min-w-[560px]">
                    {getMonthDays(plannerReference).map((day) => {
                      const dayTasks = tasksForDay(day);
                      const inCurrentMonth = isSameMonth(day, plannerReference);
                      const today = isSameDay(day, new Date());
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => inCurrentMonth && setPlannerSelectedDate(day)}
                          className="text-left rounded-xl border p-1.5 min-h-[74px] transition-all"
                          style={{
                            background: inCurrentMonth ? 'var(--color-surface)' : 'var(--color-surface-raised)',
                            borderColor: today ? 'var(--color-accent)' : 'var(--color-border)',
                            opacity: inCurrentMonth ? 1 : 0.4,
                            cursor: inCurrentMonth ? 'pointer' : 'default',
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center mb-1"
                            style={{
                              background: today ? 'var(--gradient-accent)' : 'transparent',
                              color: today ? 'var(--color-text-onaccent)' : 'var(--color-text-primary)',
                            }}
                          >
                            {format(day, 'd')}
                          </span>
                          <div className="space-y-1">
                            {dayTasks.slice(0, 2).map((task: TaskDTO) => (
                              <div
                                key={task.id}
                                className={[
                                  'text-[9px] font-bold rounded-md px-1 py-0.5 truncate border',
                                  task.status === 'DONE'
                                    ? 'bg-success/5 border-success/10 text-success opacity-70 line-through'
                                    : 'bg-accent-subtle border-accent-border text-accent',
                                ].join(' ')}
                              >
                                {task.title}
                              </div>
                            ))}
                            {dayTasks.length > 2 && <div className="text-[9px] text-text-muted font-bold pl-0.5">+{dayTasks.length - 2}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Task agenda for planner-selected day (kept for parity with prior page) */}
            {plannerSelectedDate && (
              <Card variant="default" className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">Task Agenda · {format(plannerSelectedDate, 'MMM d')}</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Quick execution view for the selected day</p>
                  </div>
                  <span
                    className="text-[10px] font-extrabold px-2 py-1 rounded-full"
                    style={{ color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
                  >
                    {plannerCompletionPct}%
                  </span>
                </div>
                <div className="flex w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--color-border-subtle)' }}>
                  {(['DONE', 'IN_PROGRESS', 'TODO'] as const).map((key) =>
                    plannerStatusCounts[key] > 0 ? (
                      <div
                        key={key}
                        style={{
                          width: `${(plannerStatusCounts[key] / Math.max(plannerTotalCount, 1)) * 100}%`,
                          background: key === 'DONE' ? 'var(--color-success)' : key === 'IN_PROGRESS' ? 'var(--color-warning)' : 'var(--color-info)',
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="space-y-1.5">
                  {plannerSelectedTasks.length === 0 ? (
                    <p className="text-[11px] text-text-muted font-bold py-4 text-center">Nothing due on this day.</p>
                  ) : (
                    plannerSelectedTasks.map((task: TaskDTO, index: number) => (
                      <AgendaTaskRow
                        key={task.id}
                        task={task}
                        isLast={index === plannerSelectedTasks.length - 1}
                        onToggle={() => updateTask.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })}
                      />
                    ))
                  )}
                </div>
              </Card>
            )}
          </motion.div>

          {/* RIGHT RAIL */}
          <motion.div variants={itemVariants} className="order-3 flex flex-col gap-4">
            <Card variant="default" className="p-3.5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Today</p>
                  <p className="text-xs font-extrabold text-text-primary">{format(new Date(), 'EEE, MMM d')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RingProgress value={todaysTotal > 0 ? (todaysDone / todaysTotal) * 100 : 0} size={64} strokeWidth={7} color="var(--color-accent)">
                  <span className="text-xs font-black text-text-primary">
                    {todaysDone}/{todaysTotal}
                  </span>
                </RingProgress>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-text-primary">Daily Progress</p>
                  <p className="text-[11px] text-text-muted font-semibold">
                    {todaysTotal === 0 ? 'Nothing due today' : todaysDone === todaysTotal ? "You're all done!" : "You're doing great!"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlannerSelectedDate(new Date());
                  setPlannerReference(new Date());
                }}
                className="mt-3 w-full py-2 rounded-xl text-xs font-bold border transition-colors"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)', background: 'var(--color-surface-raised)' }}
              >
                View My Day
              </button>
            </Card>

            <Card variant="default" className="p-3.5">
              <h4 className="text-xs font-bold text-text-primary mb-2.5">Today's Agenda</h4>
              <div className="flex flex-col gap-2.5">
                {todaysTasks.length === 0 && todayEvents.filter((e) => e.type === 'FOCUS_SESSION').length === 0 ? (
                  <p className="text-[11px] text-text-muted font-semibold py-2">Nothing scheduled today.</p>
                ) : (
                  <>
                    {todaysTasks.slice(0, 4).map((task) => (
                      <div key={task.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateTask.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })}
                          className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0"
                          style={{
                            background: task.status === 'DONE' ? 'var(--color-success)' : 'transparent',
                            borderColor: task.status === 'DONE' ? 'var(--color-success)' : 'var(--color-border)',
                          }}
                        >
                          {task.status === 'DONE' && <Check size={10} className="text-white" strokeWidth={3} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={['text-[11px] font-bold truncate', task.status === 'DONE' ? 'text-text-muted line-through' : 'text-text-primary'].join(' ')}>
                            {task.title}
                          </p>
                          <p className="text-[9px] text-text-muted font-semibold">Task</p>
                        </div>
                        <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">{formatTime(new Date(task.dueDate!))}</span>
                      </div>
                    ))}
                    {todayEvents
                      .filter((e) => e.type === 'FOCUS_SESSION')
                      .slice(0, 2)
                      .map((ev) => (
                        <div key={ev.id} className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0"
                            style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                          >
                            <Check size={10} className="text-white" strokeWidth={3} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-text-primary truncate">{ev.title}</p>
                            <p className="text-[9px] text-text-muted font-semibold">Focus</p>
                          </div>
                          <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">
                            {ev.allDay ? 'All day' : formatTime(new Date(ev.startAt))}
                          </span>
                        </div>
                      ))}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setView('agenda')}
                className="mt-3 text-[11px] font-bold text-accent hover:text-accent-hover inline-flex items-center gap-1"
              >
                View full agenda <ArrowRight size={11} />
              </button>
            </Card>

            <Card variant="default" className="p-3.5">
              <h4 className="text-xs font-bold text-text-primary mb-2.5">Quick Add</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Event', icon: <CalendarDays size={16} /> },
                  { label: 'Task', icon: <CheckSquare size={16} /> },
                  { label: 'Focus', icon: <Timer size={16} /> },
                  { label: 'Habit', icon: <Sparkles size={16} /> },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-colors hover:shadow-sm"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)', color: 'var(--color-text-primary)' }}
                  >
                    {item.icon}
                    <span className="text-[9px] font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card variant="default" className="p-3.5">
              <h4 className="text-xs font-bold text-text-primary mb-3">Week Progress</h4>
              <div className="grid grid-cols-4 gap-2">
                <MiniRing value={weekTasks.length ? (weekDone / weekTasks.length) * 100 : 0} color="var(--color-success)" label="Done" count={weekDone} />
                <MiniRing value={weekTasks.length ? (weekInProgress / weekTasks.length) * 100 : 0} color="var(--color-warning, #f59e0b)" label="Active" count={weekInProgress} />
                <MiniRing value={weekTasks.length ? (weekTodo / weekTasks.length) * 100 : 0} color="var(--color-info, #3b82f6)" label="To do" count={weekTodo} />
                <MiniRing value={weekRate} color="var(--color-accent)" label="Rate" count={`${weekRate}%`} />
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <Modal
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}
        maxWidth="max-w-2xl"
      >
        {selectedDate && <CalendarDayAgenda day={selectedDate} events={eventsByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? []} />}
      </Modal>
    </div>
  );
}

/* ---------- Small presentational pieces ---------- */

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  subColor?: string;
}) {
  return (
    <Card variant="default" className="p-3 flex items-start gap-2.5">
      <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted truncate">{label}</div>
        <div className="text-lg font-black text-text-primary leading-tight">{value}</div>
        {sub && (
          <div className="text-[10px] font-semibold mt-0.5" style={{ color: subColor }}>
            {sub}
          </div>
        )}
      </div>
    </Card>
  );
}

function RingProgress({
  value,
  size = 60,
  strokeWidth = 6,
  color,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border-subtle)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function MiniRing({ value, color, label, count }: { value: number; color: string; label: string; count: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <RingProgress value={value} size={44} strokeWidth={4.5} color={color}>
        <span className="text-[10px] font-black text-text-primary">{count}</span>
      </RingProgress>
      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wide">{label}</span>
    </div>
  );
}

function MiniCalendar({
  miniRef,
  setMiniRef,
  reference,
  onSelectDate,
}: {
  miniRef: Date;
  setMiniRef: (d: Date) => void;
  reference: Date;
  onSelectDate: (d: Date) => void;
}) {
  const days = getMonthDays(miniRef);
  return (
    <Card variant="default" className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-text-primary">{format(miniRef, 'MMMM yyyy')}</p>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => setMiniRef(addMonths(miniRef, -1))} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-secondary">
            <ChevronLeft size={13} />
          </button>
          <button type="button" onClick={() => setMiniRef(addMonths(miniRef, 1))} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-secondary">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-text-muted">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, miniRef);
          const today = isSameDay(day, new Date());
          const isReference = isSameDay(day, reference);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className="w-full aspect-square flex items-center justify-center text-[10px] font-bold rounded-lg mx-auto"
              style={{
                color: !inMonth ? 'var(--color-text-muted)' : isReference ? '#fff' : today ? 'var(--color-accent)' : 'var(--color-text-primary)',
                background: isReference ? 'var(--gradient-accent)' : today ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function EventChip({ event, compact = false }: { event: CalendarEventDTO; compact?: boolean }) {
  const meta = EVENT_META[event.type];
  const timeLabel = event.allDay ? 'All day' : formatTime(new Date(event.startAt));

  return (
    <div
      className={['flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left', compact ? 'px-1.5 py-1' : 'px-2.5 py-2'].join(' ')}
      style={{ background: meta.bg, borderColor: 'color-mix(in srgb, ' + meta.accent + ' 20%, var(--color-border))' }}
    >
      {event.type === 'TASK_DUE' ? <CheckSquare size={10} style={{ color: meta.accent }} /> : <Timer size={10} style={{ color: meta.accent }} />}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-text-primary truncate">{event.title}</div>
        {!compact && <div className="text-[9px] font-semibold text-text-muted truncate">{meta.label} · {timeLabel}</div>}
      </div>
      {!compact && <span className="text-[9px] font-bold text-text-muted whitespace-nowrap">{timeLabel}</span>}
    </div>
  );
}

function AgendaRow({ event, onClick }: { event: CalendarEventDTO; onClick: () => void }) {
  const meta = EVENT_META[event.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all hover:shadow-sm"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg, color: meta.accent }}>
        {event.type === 'TASK_DUE' ? <CheckSquare size={15} /> : <Timer size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[11px] font-bold text-text-primary truncate">{event.title}</p>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: meta.accent, background: meta.bg }}>
            {meta.label}
          </span>
        </div>
        <p className="text-[10px] text-text-muted mt-0.5 truncate">
          {event.allDay ? formatDate(event.startAt) : `${formatDate(event.startAt)} · ${formatTime(event.startAt)}`}
          {event.metadata?.durationMin ? ` · ${event.metadata.durationMin} min` : ''}
        </p>
      </div>
      <Clock3 size={12} className="text-text-muted shrink-0" />
    </button>
  );
}

function CalendarDayAgenda({ day, events, onPickDay }: { day: Date; events: CalendarEventDTO[]; onPickDay?: (day: Date) => void }) {
  const summary = getEventSummary(events);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Card variant="default" className="p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wide text-text-muted">Tasks</div>
          <div className="mt-0.5 text-lg font-black text-accent">{summary.tasks}</div>
        </Card>
        <Card variant="default" className="p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wide text-text-muted">Focus</div>
          <div className="mt-0.5 text-lg font-black text-success">{summary.focus}</div>
        </Card>
      </div>
      <div className="space-y-1.5">
        {events.length === 0 ? (
          <div className="py-8 text-center rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
            <Circle size={24} className="mx-auto text-text-muted mb-2" />
            <p className="text-xs font-bold text-text-primary">Nothing scheduled here</p>
            <p className="text-[10px] text-text-muted mt-1">This day is available for planning.</p>
          </div>
        ) : (
          events.map((event) => <AgendaRow key={event.id} event={event} onClick={() => onPickDay?.(day)} />)
        )}
      </div>
    </div>
  );
}

function PlannerDayColumn({
  date,
  tasks,
  updateTask,
  onPickDay,
}: {
  date: Date;
  tasks: TaskDTO[];
  updateTask: ReturnType<typeof useUpdateTask>;
  onPickDay: (day: Date) => void;
}) {
  return (
    <Card variant="default" className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-extrabold text-text-primary">{format(date, 'EEEE, MMMM d')}</p>
          <p className="text-[10px] text-text-muted mt-0.5">Tasks due on this day</p>
        </div>
        <button
          type="button"
          onClick={() => onPickDay(date)}
          className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          Open agenda <ArrowRight size={11} />
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="text-[11px] text-text-muted py-6 text-center font-bold">No tasks scheduled for this day</p>
      ) : (
        <div>
          {tasks.map((task, index) => (
            <AgendaTaskRow
              key={task.id}
              task={task}
              isLast={index === tasks.length - 1}
              onToggle={() => updateTask.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
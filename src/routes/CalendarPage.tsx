import { useMediaQuery } from '../hooks/useMediaQuery';
import { useDarkMode } from '../hooks/useDarkMode';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePageVariants } from '../lib/motionVariants';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  LayoutList,
  Timer,
  CheckSquare,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Plus,
  RefreshCw,
  Check,
  ListTodo,
  Zap,
  Loader2,
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
import { useSettings, useSyncGoogleCalendar } from '../features/settings/hooks/useSettings';
import { LoadingScreen } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { AgendaTaskRow } from '../components/planner/AgendaTaskRow';
import { useTasks, useUpdateTask } from '../features/tasks/hooks/useTasks';
import { useUIStore } from '../store/uiStore';
import type { CalendarEventDTO, TaskDTO } from '../types';

type CalendarView = 'day' | 'week' | 'month' | 'agenda';
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
      return format(reference, 'MMMM d, yyyy');
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
      return { from: startOfDay(reference), to: endOfDay(reference) };
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
  const { containerVariants, itemVariants } = usePageVariants();
  const calendarViewPreference = useUIStore((s) => s.calendarViewPreference);
  const [view, setView] = useState<CalendarView>(calendarViewPreference);
  const [reference, setReference] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [miniRef, setMiniRef] = useState(new Date());
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  useEffect(() => {
    setView(calendarViewPreference);
  }, [calendarViewPreference]);

  const navigate = useNavigate();
  const { data: tasksData } = useTasks();
  const updateTask = useUpdateTask();
  const { data: settingsData } = useSettings();
  const syncGoogleCalendar = useSyncGoogleCalendar();
  const lastSyncedAt = settingsData?.integrations?.googleCalendar?.lastSyncedAt ?? null;
  const isSyncing = syncGoogleCalendar.isPending;
  const handleSync = () => syncGoogleCalendar.mutate();

  const referenceKey = format(reference, 'yyyy-MM-dd');
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const calendarRange = useMemo(() => {
    const range = getRange(view, reference);
    return {
      from: format(range.from, 'yyyy-MM-dd'),
      to: format(range.to, 'yyyy-MM-dd'),
    };
  }, [view, referenceKey]);

  const { data, isLoading } = useCalendarOverview(calendarRange);

  const events = data?.events ?? [];
  const tasks = tasksData?.pages.flatMap((p) => p.data) ?? [];

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
  const todayEvents = useMemo(
    () => eventsByDay.get(todayKey) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventsByDay, todayKey]
  );

  const rangeLabel = formatRangeLabel(view, reference);
  const summary = getEventSummary(events);

  // Tasks with due dates, deduplicated
  const plannerTasks = useMemo(() => {
    const doneKeys = new Set<string>();
    for (const task of tasks) {
      if (task.dueDate && task.status === 'DONE') {
        const rootId = task.parentTaskId ?? task.id;
        const dateStr = format(new Date(task.dueDate), 'yyyy-MM-dd');
        doneKeys.add(`${rootId}_${dateStr}`);
      }
    }

    const seen = new Set<string>();
    return tasks.filter((task: TaskDTO) => {
      if (!task.dueDate || task.status === 'CANCELLED') return false;
      if (seen.has(task.id)) return false;

      const rootId = task.parentTaskId ?? task.id;
      const dateStr = format(new Date(task.dueDate), 'yyyy-MM-dd');

      if (task.status !== 'DONE' && doneKeys.has(`${rootId}_${dateStr}`)) {
        return false;
      }

      seen.add(task.id);
      return true;
    });
  }, [tasks]);

  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    for (const key of eventsByDay.keys()) set.add(key);
    for (const task of plannerTasks) {
      if (task.dueDate) set.add(format(new Date(task.dueDate), 'yyyy-MM-dd'));
    }
    return set;
  }, [eventsByDay, plannerTasks]);

  const tasksForDay = useCallback(
    (date: Date) =>
      plannerTasks
        .filter((task: TaskDTO) => task.dueDate && isSameDay(new Date(task.dueDate), date))
        .sort((a: TaskDTO, b: TaskDTO) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
    [plannerTasks]
  );

  const todaysTasks = useMemo(() => tasksForDay(new Date()), [tasksForDay]);
  const todaysDone = todaysTasks.filter((t) => t.status === 'DONE').length;
  const todaysTotal = todaysTasks.length;

  const weekDays = useMemo(() => getWeekDays(new Date()), []);
  const weekTasks = useMemo(() => weekDays.flatMap((d) => tasksForDay(d)), [tasksForDay, weekDays]);
  const weekDone = weekTasks.filter((t) => t.status === 'DONE').length;
  const weekInProgress = weekTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const weekTodo = weekTasks.filter((t) => t.status === 'TODO').length;
  const weekRate = weekTasks.length > 0 ? Math.round((weekDone / weekTasks.length) * 100) : 0;

  // Upcoming items for the left rail.
  // Uses plannerTasks (all tasks, not scoped to current view) for tasks,
  // and events only for FOCUS_SESSION (to avoid duplicating TASK_DUE which comes from tasks).
  const upcomingItems = useMemo(() => {
    const now = new Date();
    const horizon = endOfDay(addDays(now, 7));
    const seen = new Set<string>();
    const fromTasks = plannerTasks
      .filter((t) => t.dueDate && new Date(t.dueDate) >= startOfDay(now) && new Date(t.dueDate) <= horizon)
      .filter((t) => {
        const key = `task-${t.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((t) => ({ id: `task-${t.id}`, title: t.title, date: new Date(t.dueDate!), kind: 'Task' as const }));
    const fromFocusEvents = events
      .filter(
        (e: CalendarEventDTO) =>
          e.type === 'FOCUS_SESSION' && new Date(e.startAt) >= startOfDay(now) && new Date(e.startAt) <= horizon
      )
      .filter((e: CalendarEventDTO) => {
        const key = `event-${e.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e: CalendarEventDTO) => ({
        id: `event-${e.id}`,
        title: e.title,
        date: new Date(e.startAt),
        kind: EVENT_META[e.type].label,
      }));
    return [...fromTasks, ...fromFocusEvents].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }, [plannerTasks, events]);

  const navigatePeriod = (direction: -1 | 1) => {
    setReference((current) => {
      if (view === 'day') return addDays(current, direction);
      if (view === 'week') return addDays(current, direction * 7);
      if (view === 'month') return addMonths(current, direction);
      return addDays(current, direction * 14);
    });
  };

  const initialLoaded = useRef(false);
  if (!initialLoaded.current) {
    if (isLoading) return <LoadingScreen />;
    initialLoaded.current = true;
  }

  const jumpToToday = () => {
    const today = new Date();
    setReference(today);
    setMiniRef(today);
    setSelectedDate(today);
    setView('day');
  };

  const viewTabs = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ] satisfies { id: CalendarView; label: string }[];

  const motionTransition = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const;

  const handleSelectDate = (day: Date) => {
    setReference(day);
    setMiniRef(day);
    setView('day');
  };

  return (
    <div className="w-full px-3.5 pt-3.5 pb-6 sm:px-0 sm:pt-0 sm:pb-8">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4">
        {/* Header */}
        <motion.div variants={itemVariants}>
          <CalendarHero
            view={view}
            setView={setView}
            onJumpToday={jumpToToday}
            onNewMenuOpen={() => setNewMenuOpen((o) => !o)}
            newMenuOpen={newMenuOpen}
            setNewMenuOpen={setNewMenuOpen}
            summary={summary}
            todaysTasks={todaysTasks}
            todaysDone={todaysDone}
            weekRate={weekRate}
            navigate={navigate}
          />
        </motion.div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] xl:grid-cols-[230px_1fr_270px] gap-4 items-start">
          {/* LEFT RAIL */}
          <LeftRail
            miniRef={miniRef}
            setMiniRef={setMiniRef}
            reference={reference}
            datesWithTasks={datesWithTasks}
            onSelectDate={handleSelectDate}
            upcomingItems={upcomingItems}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            onSync={handleSync}
          />

          {/* MAIN COLUMN */}
          <motion.div variants={itemVariants} className="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
            {isLoading ? (
              <div
                className="flex items-center justify-center py-16 rounded-2xl border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw size={22} className="text-text-muted animate-spin" />
                  <p className="text-sm font-bold text-text-muted">Loading calendar data...</p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {view === 'day' && (
                  <motion.div
                    key="day"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={motionTransition}
                    className="flex flex-col gap-4"
                  >
                    <CalendarMainSection
                      view="day"
                      data={data}
                      summary={summary}
                      weekRate={weekRate}
                      rangeLabel={rangeLabel}
                      events={events}
                      reference={reference}
                      referenceEvents={referenceEvents}
                      eventsByDay={eventsByDay}
                      navigatePeriod={navigatePeriod}
                      setSelectedDate={setSelectedDate}
                      tasksForDay={tasksForDay}
                      updateTask={updateTask}
                    />
                  </motion.div>
                )}
                {view === 'week' && (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={motionTransition}
                    className="flex flex-col gap-4"
                  >
                    <CalendarMainSection
                      view="week"
                      data={data}
                      summary={summary}
                      weekRate={weekRate}
                      rangeLabel={rangeLabel}
                      events={events}
                      reference={reference}
                      referenceEvents={referenceEvents}
                      eventsByDay={eventsByDay}
                      navigatePeriod={navigatePeriod}
                      setSelectedDate={setSelectedDate}
                      tasksForDay={tasksForDay}
                      updateTask={updateTask}
                    />
                  </motion.div>
                )}
                {view === 'month' && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={motionTransition}
                    className="flex flex-col gap-4"
                  >
                    <CalendarMainSection
                      view="month"
                      data={data}
                      summary={summary}
                      weekRate={weekRate}
                      rangeLabel={rangeLabel}
                      events={events}
                      reference={reference}
                      referenceEvents={referenceEvents}
                      eventsByDay={eventsByDay}
                      navigatePeriod={navigatePeriod}
                      setSelectedDate={setSelectedDate}
                      tasksForDay={tasksForDay}
                      updateTask={updateTask}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>

          {/* RIGHT RAIL */}
          <RightRail
            todaysDone={todaysDone}
            todaysTotal={todaysTotal}
            todaysTasks={todaysTasks}
            todayEvents={todayEvents}
            updateTask={updateTask}
            weekTasks={weekTasks}
            weekDone={weekDone}
            weekInProgress={weekInProgress}
            weekTodo={weekTodo}
            weekRate={weekRate}
            navigate={navigate}
          />
        </div>
      </motion.div>

      <Modal
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}
        maxWidth="max-w-2xl"
      >
        {selectedDate && (
          <DayDetailModal
            day={selectedDate}
            events={eventsByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? []}
            tasks={tasksForDay(selectedDate)}
            updateTask={updateTask}
          />
        )}
      </Modal>
    </div>
  );
}

/* ====== Calendar Hero — shared prop type ====== */

type CalendarHeroProps = {
  view: CalendarView;
  setView: (v: CalendarView) => void;
  onJumpToday: () => void;
  onNewMenuOpen: () => void;
  newMenuOpen: boolean;
  setNewMenuOpen: (fn: (v: boolean) => boolean) => void;
  summary: { tasks: number; focus: number };
  todaysTasks: TaskDTO[];
  todaysDone: number;
  weekRate: number;
  navigate: ReturnType<typeof useNavigate>;
};

/* ── Mobile hero (< md) — illustrated calendar design ── */

function CalendarHeroMobile({
  view,
  setView,
  onJumpToday,
  summary,
  todaysTasks,
  todaysDone,
  weekRate,
  onNewMenuOpen,
  newMenuOpen,
  setNewMenuOpen,
  navigate,
}: CalendarHeroProps) {
  const todaysTotal = todaysTasks.length;
  const today = new Date();
  const monthYear = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
  const dayOfMonth = today.getDate();
  const isDark = useDarkMode();

  const viewTabs = [
    { id: 'day' as CalendarView, label: 'Day' },
    { id: 'week' as CalendarView, label: 'Week' },
    { id: 'month' as CalendarView, label: 'Month' },
  ];

  const stats = [
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
          <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      value: `${todaysDone}/${todaysTotal}`,
      label: 'Done today',
      bg: isDark ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.08)',
      border: isDark ? 'rgba(34,197,94,0.30)' : 'rgba(34,197,94,0.2)',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <line x1="8" y1="6" x2="21" y2="6" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="12" x2="21" y2="12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="18" x2="21" y2="18" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="3.5" cy="6" r="1.5" fill="#6366f1" />
          <circle cx="3.5" cy="12" r="1.5" fill="#6366f1" />
          <circle cx="3.5" cy="18" r="1.5" fill="#6366f1" />
        </svg>
      ),
      value: todaysTotal,
      label: 'Scheduled',
      bg: isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)',
      border: isDark ? 'rgba(99,102,241,0.30)' : 'rgba(99,102,241,0.2)',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="#3b82f6" />
        </svg>
      ),
      value: summary.focus,
      label: 'Focus session',
      bg: isDark ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.08)',
      border: isDark ? 'rgba(59,130,246,0.30)' : 'rgba(59,130,246,0.2)',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" fill="none" />
        </svg>
      ),
      value: `${weekRate}%`,
      label: 'This week',
      bg: isDark ? 'rgba(245,158,11,0.14)' : 'rgba(245,158,11,0.08)',
      border: isDark ? 'rgba(245,158,11,0.30)' : 'rgba(245,158,11,0.2)',
    },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* ── Illustrated hero banner ── */}
      <div
        className="relative w-full rounded-t-2xl"
        style={{
          background: isDark
            ? 'linear-gradient(135deg,#202a47 0%,#1c2542 60%,#18213a 100%)'
            : 'linear-gradient(135deg,#f8f6ff 0%,#eee9ff 100%)',
          minHeight: 180,
        }}
      >
        {/* Decorative glows */}
        <div
          className="absolute top-0 right-16 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: isDark ? 'rgba(113,96,246,0.18)' : 'rgba(201,192,255,0.35)', filter: 'blur(28px)' }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-8 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: isDark ? 'rgba(40,180,130,0.14)' : 'rgba(217,243,236,0.45)', filter: 'blur(22px)' }}
          aria-hidden="true"
        />

        {/* Leaves bottom-left */}
        <svg className="absolute bottom-0 left-2 pointer-events-none" width="52" height="72" viewBox="0 0 80 100" fill="none" aria-hidden="true">
          <path d="M20 80C4 59 8 34 30 21C36 43 34 65 20 80Z" fill="#A8DCCB" />
          <path d="M29 83C32 54 50 35 72 34C68 58 52 78 29 83Z" fill="#7BC7B0" />
          <path d="M18 78C28 63 41 50 55 42" stroke="#5BAE98" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        {/* Content row: text + SVG illustration */}
        <div className="relative z-10 flex items-start justify-between px-4 pt-5 pb-2">
          {/* Left: text */}
          <div className="flex-1 min-w-0 pr-2">
            <div
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{ background: isDark ? 'rgba(113,96,246,0.18)' : 'rgba(99,102,241,0.12)', color: isDark ? '#a78bfa' : '#6353f4' }}
            >
              <CalendarDays size={9} /> TIME PLANNER
            </div>
            <h1 className="text-[18px] font-black leading-tight whitespace-nowrap mt-4" style={{ color: isDark ? '#f1f5fb' : '#1e1a3f' }}>
              Your day at a <span style={{ color: isDark ? '#a78bfa' : '#5b4cf5' }}>glance</span>
            </h1>
            <p className="text-[11px] mt-1.5 leading-snug" style={{ color: isDark ? 'rgba(226,232,248,0.6)' : 'rgba(55,50,92,0.60)' }}>
              Stay on track with your<br />tasks, events and focus time.
            </p>
          </div>

          {/* Right: calendar + clock illustration */}
          <div className="shrink-0 relative" style={{ width: 168, height: 160 }}>
            <svg width="168" height="160" viewBox="20 20 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" overflow="visible">
              <defs>
                <linearGradient id="ch-paper" x1="100" y1="70" x2="270" y2="250" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="1" stopColor="#F5F3FF" />
                </linearGradient>
                <linearGradient id="ch-purple" x1="120" y1="40" x2="260" y2="160" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8D7BFF" />
                  <stop offset="1" stopColor="#6353F4" />
                </linearGradient>
                <filter id="ch-ss" x="-30%" y="-30%" width="160%" height="170%">
                  <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#5043C7" floodOpacity=".14" />
                </filter>
                <filter id="ch-cs" x="-30%" y="-30%" width="160%" height="170%">
                  <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#5043C7" floodOpacity=".13" />
                </filter>
                <clipPath id="ch-cc">
                  <rect x="115" y="72" width="177" height="176" rx="15" />
                </clipPath>
              </defs>

              {/* Calendar body */}
              <g filter="url(#ch-ss)">
                <rect x="108" y="57" width="191" height="193" rx="18" fill="url(#ch-paper)" />
                <path d="M108 75C108 65 116 57 126 57H281C291 57 299 65 299 75V103H108V75Z" fill="url(#ch-purple)" />
                {/* Rings */}
                <g fill="none" stroke="#6857EA" strokeWidth="8" strokeLinecap="round">
                  <path d="M139 42V72" /><path d="M180 42V72" /><path d="M221 42V72" /><path d="M262 42V72" />
                </g>
                <g fill="none" stroke="#A59BFF" strokeWidth="3.5" strokeLinecap="round">
                  <path d="M139 43C132 33 139 26 147 32C153 36 151 45 145 49" />
                  <path d="M180 43C173 33 180 26 188 32C194 36 192 45 186 49" />
                  <path d="M221 43C214 33 221 26 229 32C235 36 233 45 227 49" />
                  <path d="M262 43C255 33 262 26 270 32C276 36 274 45 268 49" />
                </g>
                {/* Month label */}
                <text x="203" y="88" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="14" fontWeight="700" letterSpacing="1" fill="#FFFFFF">{monthYear}</text>
                {/* Week labels */}
                <g fontFamily="Inter,Arial,sans-serif" fontSize="8" fontWeight="700" fill="#9B94B9" textAnchor="middle">
                  {['M','T','W','T','F','S','S'].map((l, i) => (
                    <text key={i} x={129 + i * 27} y="121">{l}</text>
                  ))}
                </g>
                {/* Calendar cells */}
                <g clipPath="url(#ch-cc)">
                  {[130, 158, 186, 214].map((row) =>
                    [119, 146, 173, 200, 227, 254, 281].map((col) => (
                      <rect key={`${row}-${col}`} x={col} y={row} width="20" height="20" rx="5" fill="#F0EEFF" />
                    ))
                  )}
                  {/* Highlighted today */}
                  <rect x="227" y="158" width="20" height="20" rx="5" fill="#7160F5" />
                  <text x="237" y="172" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="9" fontWeight="800" fill="#FFFFFF">{dayOfMonth}</text>
                  {/* Event dots */}
                  <circle cx="156" cy="167" r="3" fill="#48CFA3" />
                  <circle cx="183" cy="195" r="3" fill="#7160F5" />
                  <circle cx="210" cy="195" r="3" fill="#7160F5" />
                  <circle cx="264" cy="223" r="3" fill="#48A7FF" />
                </g>
              </g>

              {/* Sticky note */}
              <g filter="url(#ch-cs)">
                <rect x="294" y="66" width="82" height="77" rx="9" fill="#FFF3D5" transform="rotate(-5 294 66)" />
                {['Plan','Focus','Achieve'].map((t, i) => (
                  <text key={t} x="336" y={91 + i * 17} textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="11" fontWeight="700" fill="#37325C" transform={`rotate(-5 336 ${91 + i * 17})`}>{t}</text>
                ))}
                <path d="M319 130L351 127" stroke="#7867F5" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Clock */}
              <g filter="url(#ch-cs)">
                <circle cx="313" cy="218" r="46" fill="#FFFFFF" />
                <circle cx="313" cy="218" r="38" fill="#F5F2FF" stroke="#DDD8FF" strokeWidth="2" />
                <g stroke="#A39BC8" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M313 182V187" /><path d="M347 218H342" /><path d="M313 254V249" /><path d="M279 218H284" />
                </g>
                <path d="M313 218V197" stroke="#6252E9" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M313 218L329 226" stroke="#6252E9" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="313" cy="218" r="4.5" fill="#6252E9" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Stat chips row ── */}
      <div className="grid grid-cols-4 gap-2 px-3 pt-3 pb-2" style={{ background: 'var(--color-surface)' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-xl py-2 px-1"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            {s.icon}
            <span className="text-[12px] font-black leading-none" style={{ color: 'var(--color-text-primary)' }}>
              {s.value}
            </span>
            <span className="text-[9px] font-medium text-center leading-tight" style={{ color: 'var(--color-text-muted)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── View tabs + Today button ── */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        {/* Segmented view tabs */}
        <div
          className="flex flex-1 items-center rounded-xl p-0.5"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          {viewTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex-1 rounded-lg py-1.5 text-xs font-bold transition-all active:scale-95"
              style={
                view === id
                  ? { background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', boxShadow: '0 2px 6px rgba(99,102,241,0.28)' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Today shortcut */}
        <button
          type="button"
          onClick={onJumpToday}
          className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all active:scale-95"
          style={{
            background: 'var(--color-surface-raised)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <CalendarDays size={12} style={{ color: '#6366f1' }} />
          Today
        </button>
      </div>
    </div>
  );
}

/* ====== Calendar Hero — entry point (conditionally renders desktop or mobile) ====== */

function CalendarHero(props: CalendarHeroProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  if (isMobile) return <CalendarHeroMobile {...props} />;
  return <CalendarHeroDesktop {...props} />;
}

/* ====== Calendar Hero Desktop (md+) ====== */

function CalendarHeroDesktop({
  view,
  setView,
  onJumpToday,
  onNewMenuOpen,
  newMenuOpen,
  setNewMenuOpen,
  summary,
  todaysTasks,
  todaysDone,
  weekRate,
  navigate,
}: CalendarHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 55, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 55, damping: 18 });
  const blob1X = useTransform(springX, [0, 1], ['-5%', '5%']);
  const blob1Y = useTransform(springY, [0, 1], ['-5%', '5%']);
  const blob2X = useTransform(springX, [0, 1], ['5%', '-5%']);
  const blob2Y = useTransform(springY, [0, 1], ['5%', '-5%']);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };
  const onMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const todaysTotal = todaysTasks.length;
  const todayPct = todaysTotal > 0 ? Math.round((todaysDone / todaysTotal) * 100) : 0;

  const chips = [
    {
      icon: <CheckCircle2 size={12} />,
      value: todaysDone,
      label: 'done today',
      color: 'var(--color-success)',
      bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
    },
    {
      icon: <ListTodo size={12} />,
      value: todaysTotal,
      label: 'scheduled',
      color: 'var(--color-accent)',
      bg: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
    },
    {
      icon: <Clock3 size={12} />,
      value: summary.focus,
      label: 'focus sessions',
      color: 'var(--color-info, #3b82f6)',
      bg: 'color-mix(in srgb, var(--color-info, #3b82f6) 10%, transparent)',
    },
    {
      icon: <Zap size={12} />,
      value: `${weekRate}%`,
      label: 'week rate',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.10)',
    },
  ];

  const viewTabs = [
    { id: 'day' as CalendarView, label: 'Day', icon: <LayoutList size={12} /> },
    { id: 'week' as CalendarView, label: 'Week', icon: <CalendarDays size={12} /> },
    { id: 'month' as CalendarView, label: 'Month', icon: <Clock3 size={12} /> },
  ];

  return (
    <motion.div
      ref={heroRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative rounded-2xl"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Clipped background layer — keeps blobs inside the rounded border without clipping the dropdown */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Ambient blob 1 */}
        <motion.div
          style={{ x: blob1X, y: blob1Y }}
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full"
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        </motion.div>

        {/* Ambient blob 2 */}
        <motion.div
          style={{ x: blob2X, y: blob2Y }}
          className="absolute -bottom-16 right-0 h-[320px] w-[320px] rounded-full"
          animate={{ scale: [1, 1.09, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--color-info, #3b82f6) 8%, transparent), transparent 70%)',
              filter: 'blur(44px)',
            }}
          />
        </motion.div>

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex flex-col gap-5 px-4 pt-6 pb-5 sm:px-6 xl:px-8">
        {/* Row 1: Eyebrow + headline + subtitle */}
        <div className="flex flex-col gap-1">
          {/* Eyebrow badge */}
          <div
            className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <motion.span
              animate={{ rotate: [0, 12, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <CalendarDays size={11} />
            </motion.span>
            Time Planner
          </div>

          {/* Headline */}
          <h1
            className="mt-2 font-black tracking-tight"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', lineHeight: 1.1, color: 'var(--color-text-primary)' }}
          >
            Your <span style={{ color: 'var(--color-accent)' }}>Calendar.</span>
          </h1>

          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {todaysTotal > 0
              ? `${todaysDone} of ${todaysTotal} task${todaysTotal !== 1 ? 's' : ''} done today · ${todayPct}% complete`
              : 'Plan your time. Stay on top of every commitment.'}
          </p>
        </div>

        {/* Row 2: Stat chips + controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stat chips */}
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <div
                key={chip.label}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.color}22` }}
              >
                {chip.icon}
                <span style={{ color: 'var(--color-text-primary)' }}>{chip.value}</span>
                <span>{chip.label}</span>
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Today button */}
          <button
            type="button"
            onClick={onJumpToday}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:shadow-sm"
            style={{
              background: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Today
          </button>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 rounded-2xl border p-1"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            {viewTabs.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className="relative flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition-all"
                style={
                  view === id
                    ? { background: 'linear-gradient(135deg, var(--color-accent), #818CF8)', color: 'white' }
                    : { color: 'var(--color-text-muted)' }
                }
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* New dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={onNewMenuOpen}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Plus size={14} /> New <ChevronDown size={12} />
            </button>
            {newMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-36 rounded-xl border shadow-lg z-20 overflow-hidden"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                {[
                  { label: 'Task', to: '/tasks' },
                  { label: 'Focus', to: '/focus' },
                  { label: 'Habit', to: '/habits' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setNewMenuOpen(() => false);
                      navigate(item.to);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ====== Left Rail ====== */

interface LeftRailProps {
  miniRef: Date;
  setMiniRef: (d: Date) => void;
  reference: Date;
  datesWithTasks: Set<string>;
  onSelectDate: (d: Date) => void;
  upcomingItems: { id: string; title: string; date: Date; kind: string }[];
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onSync: () => void;
}

const LeftRail = memo(function LeftRail({
  miniRef,
  setMiniRef,
  reference,
  datesWithTasks,
  onSelectDate,
  upcomingItems,
  lastSyncedAt,
  isSyncing,
  onSync,
}: LeftRailProps) {
  const { itemVariants } = usePageVariants();
  const syncLabel = lastSyncedAt ? `Last sync ${format(new Date(lastSyncedAt), 'h:mm a')}` : 'Not synced yet';

  return (
    <motion.div variants={itemVariants} className="order-2 lg:order-1 flex flex-col gap-4">
      <div className="hidden lg:block">
        <MiniCalendar
          miniRef={miniRef}
          setMiniRef={setMiniRef}
          reference={reference}
          datesWithTasks={datesWithTasks}
          onSelectDate={onSelectDate}
        />
      </div>
      <Card variant="default" className="p-3">
        <h4 className="text-xs font-bold text-text-primary mb-2">Upcoming This Week</h4>
        {upcomingItems.length === 0 ? (
          <p className="text-[11px] text-text-muted font-semibold py-2">Nothing coming up.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {upcomingItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: 'var(--color-accent)' }}
                />
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
            <p className="text-[10px] text-text-muted font-semibold truncate">{syncLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={`text-text-muted shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </Card>
    </motion.div>
  );
});

/* ====== Right Rail ====== */

interface RightRailProps {
  todaysDone: number;
  todaysTotal: number;
  todaysTasks: TaskDTO[];
  todayEvents: CalendarEventDTO[];
  updateTask: ReturnType<typeof useUpdateTask>;
  weekTasks: TaskDTO[];
  weekDone: number;
  weekInProgress: number;
  weekTodo: number;
  weekRate: number;
  navigate: ReturnType<typeof useNavigate>;
}

const RightRail = memo(function RightRail({
  todaysDone,
  todaysTotal,
  todaysTasks,
  todayEvents,
  updateTask,
  weekTasks,
  weekDone,
  weekInProgress,
  weekTodo,
  weekRate,
  navigate,
}: RightRailProps) {
  const { itemVariants } = usePageVariants();
  return (
    <motion.div variants={itemVariants} className="order-3 flex flex-col gap-4">
      <Card variant="default" className="p-3.5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Today</p>
            <p className="text-xs font-extrabold text-text-primary">{format(new Date(), 'EEE, MMM d')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RingProgress
            value={todaysTotal > 0 ? (todaysDone / todaysTotal) * 100 : 0}
            size={64}
            strokeWidth={7}
            color="var(--color-accent)"
          >
            <span className="text-xs font-black text-text-primary">
              {todaysDone}/{todaysTotal}
            </span>
          </RingProgress>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-text-primary">Daily Progress</p>
            <p className="text-[11px] text-text-muted font-semibold">
              {todaysTotal === 0
                ? 'Nothing due today'
                : todaysDone === todaysTotal
                  ? "You're all done!"
                  : "You're doing great!"}
            </p>
          </div>
        </div>
      </Card>
      <Card variant="default" className="p-3.5">
        <h4 className="text-xs font-bold text-text-primary mb-3">Week Progress</h4>
        <div className="grid grid-cols-4 gap-2">
          <MiniRing
            value={weekTasks.length ? (weekDone / weekTasks.length) * 100 : 0}
            color="var(--color-success)"
            label="Done"
            count={weekDone}
          />
          <MiniRing
            value={weekTasks.length ? (weekInProgress / weekTasks.length) * 100 : 0}
            color="var(--color-warning, #f59e0b)"
            label="Active"
            count={weekInProgress}
          />
          <MiniRing
            value={weekTasks.length ? (weekTodo / weekTasks.length) * 100 : 0}
            color="var(--color-info, #3b82f6)"
            label="To do"
            count={weekTodo}
          />
          <MiniRing value={weekRate} color="var(--color-accent)" label="Rate" count={`${weekRate}%`} />
        </div>
      </Card>
      <Card variant="default" className="p-3.5">
        <h4 className="text-xs font-bold text-text-primary mb-2.5">Quick Add</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Task', icon: <CheckSquare size={16} />, to: '/tasks' },
            { label: 'Focus', icon: <Timer size={16} />, to: '/focus' },
            { label: 'Habit', icon: <Sparkles size={16} />, to: '/habits' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-colors hover:shadow-sm"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-primary)',
              }}
            >
              {item.icon}
              <span className="text-[9px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
});

/* ====== Main Section ====== */

function CalendarMainSection({
  view,
  data,
  summary,
  weekRate,
  rangeLabel,
  events,
  reference,
  referenceEvents,
  eventsByDay,
  navigatePeriod,
  setSelectedDate,
  tasksForDay,
  updateTask,
}: {
  view: CalendarView;
  data: any;
  summary: { tasks: number; focus: number };
  weekRate: number;
  rangeLabel: string;
  events: CalendarEventDTO[];
  reference: Date;
  referenceEvents: CalendarEventDTO[];
  eventsByDay: Map<string, CalendarEventDTO[]>;
  navigatePeriod: (d: -1 | 1) => void;
  setSelectedDate: (d: Date | null) => void;
  tasksForDay: (d: Date) => TaskDTO[];
  updateTask: any;
}) {
  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CalendarDays size={16} />}
          iconBg="color-mix(in srgb, var(--color-accent) 14%, transparent)"
          iconColor="var(--color-accent)"
          label="Total Events"
          value={data?.meta.totalEvents ?? 0}
          sub="in current range"
          subColor="var(--color-success)"
        />
        <StatCard
          icon={<ListTodo size={16} />}
          iconBg="color-mix(in srgb, var(--color-info, #3b82f6) 14%, transparent)"
          iconColor="var(--color-info, #3b82f6)"
          label="Tasks Due"
          value={summary.tasks}
          sub="in range"
          subColor="var(--color-text-muted)"
        />
        <StatCard
          icon={<Clock3 size={16} />}
          iconBg="color-mix(in srgb, var(--color-success) 14%, transparent)"
          iconColor="var(--color-success)"
          label="Focus Sessions"
          value={summary.focus}
          sub="in range"
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
          <CalendarDayAgenda
            day={reference}
            events={referenceEvents}
            tasks={tasksForDay(reference)}
            updateTask={updateTask}
            onPickDay={setSelectedDate}
          />
        </Card>
      )}
      {view === 'week' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {getWeekDays(reference).map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            const dayTasks = tasksForDay(day);
            const summaryForDay = getEventSummary(dayEvents);
            const today = isSameDay(day, new Date());
            const doneCount = dayTasks.filter((t) => t.status === 'DONE').length;
            const totalCount = dayTasks.length;
            return (
              <button
                type="button"
                key={dayKey}
                onClick={() => setSelectedDate(day)}
                className="text-left rounded-xl border p-2.5 transition-all hover:shadow-md"
                style={{
                  background: today
                    ? 'color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))'
                    : 'var(--color-surface)',
                  borderColor: today ? 'var(--color-accent-border)' : 'var(--color-border)',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                      {format(day, 'EEE')}
                    </div>
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
                {/* Task progress bar */}
                {totalCount > 0 && (
                  <div
                    className="w-full h-1 rounded-full overflow-hidden mb-1.5"
                    style={{ background: 'var(--color-border-subtle)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(doneCount / totalCount) * 100}%`, background: 'var(--color-success)' }}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <EventChip key={event.id} event={event} compact />
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] font-semibold text-text-muted">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {view === 'month' && (
        <div className="w-full overflow-hidden">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 w-full">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-muted py-0.5 sm:py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full">
            {getMonthDays(reference).map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(dayKey) ?? [];
              const dayTasks = tasksForDay(day);
              const inMonth = isSameMonth(day, reference);
              const today = isSameDay(day, new Date());
              const doneCount = dayTasks.filter((t) => t.status === 'DONE').length;
              const totalCount = dayTasks.length;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => inMonth && setSelectedDate(day)}
                  className="text-left rounded-xl border p-1 sm:p-2 min-h-[46px] sm:min-h-[92px] transition-all flex flex-col justify-between overflow-hidden"
                  style={{
                    background: today
                      ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))'
                      : inMonth
                        ? 'var(--color-surface)'
                        : 'var(--color-surface-raised)',
                    borderColor: today ? 'var(--color-accent)' : 'var(--color-border)',
                    opacity: inMonth ? 1 : 0.4,
                    cursor: inMonth ? 'pointer' : 'default',
                  }}
                >
                  <div className="flex items-center justify-between gap-0.5">
                    <span
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-[10px] font-black flex items-center justify-center"
                      style={{
                        background: today ? 'var(--gradient-accent)' : 'transparent',
                        color: today ? 'var(--color-text-onaccent)' : 'var(--color-text-primary)',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {totalCount > 0 && (
                      <span className="hidden sm:inline text-[8px] font-bold text-text-muted">
                        {doneCount}/{totalCount}
                      </span>
                    )}
                  </div>

                  {/* Mobile compact indicator dots */}
                  <div className="flex sm:hidden items-center gap-0.5 mt-auto flex-wrap">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: EVENT_META[event.type].accent }}
                      />
                    ))}
                    {totalCount > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: 'var(--color-accent)' }}
                      />
                    )}
                  </div>

                  {/* Desktop event chips */}
                  <div className="hidden sm:block space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <EventChip key={event.id} event={event} compact />
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] font-semibold text-text-muted">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ====== Day Detail Modal ====== */

function DayDetailModal({
  day,
  events,
  tasks,
  updateTask,
}: {
  day: Date;
  events: CalendarEventDTO[];
  tasks: TaskDTO[];
  updateTask: any;
}) {
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const totalCount = tasks.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary + completion bar */}
      <div className="grid grid-cols-3 gap-2.5">
        <Card variant="default" className="p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wide text-text-muted">Tasks</div>
          <div className="mt-0.5 text-lg font-black text-accent">{totalCount}</div>
        </Card>
        <Card variant="default" className="p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wide text-text-muted">Done</div>
          <div className="mt-0.5 text-lg font-black text-success">{doneCount}</div>
        </Card>
        <Card variant="default" className="p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wide text-text-muted">Events</div>
          <div className="mt-0.5 text-lg font-black text-info">{events.length}</div>
        </Card>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${completionPct}%`,
                background: completionPct === 100 ? 'var(--color-success)' : 'var(--color-accent)',
              }}
            />
          </div>
          <span className="text-[10px] font-extrabold" style={{ color: 'var(--color-accent)' }}>
            {completionPct}%
          </span>
        </div>
      )}

      {/* Events section */}
      {events.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold text-text-primary mb-2 uppercase tracking-wide">Events</h4>
          <div className="space-y-1.5">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2.5 p-2 rounded-xl border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: EVENT_META[event.type].bg, color: EVENT_META[event.type].accent }}
                >
                  {event.type === 'TASK_DUE' ? <CheckSquare size={12} /> : <Timer size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-text-primary truncate">{event.title}</p>
                  {(event.allDay || event.metadata?.durationMin) && (
                    <p className="text-[9px] text-text-muted font-semibold">
                      {event.allDay && 'All day'}
                      {event.metadata?.durationMin && ` · ${event.metadata.durationMin} min`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks section */}
      {tasks.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold text-text-primary mb-2 uppercase tracking-wide">Tasks</h4>
          <div className="space-y-1">
            {tasks.map((task, index) => (
              <AgendaTaskRow
                key={task.id}
                task={task}
                isLast={index === tasks.length - 1}
                onToggle={() =>
                  updateTask.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 && tasks.length === 0 && (
        <div
          className="py-8 text-center rounded-xl border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
        >
          <Circle size={24} className="mx-auto text-text-muted mb-2" />
          <p className="text-xs font-bold text-text-primary">Nothing scheduled here</p>
          <p className="text-[10px] text-text-muted mt-1">This day is available for planning.</p>
        </div>
      )}
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
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeWidth={strokeWidth}
        />
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

function MiniRing({
  value,
  color,
  label,
  count,
}: {
  value: number;
  color: string;
  label: string;
  count: React.ReactNode;
}) {
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
  datesWithTasks,
  onSelectDate,
}: {
  miniRef: Date;
  setMiniRef: (d: Date) => void;
  reference: Date;
  datesWithTasks: Set<string>;
  onSelectDate: (d: Date) => void;
}) {
  const days = getMonthDays(miniRef);
  return (
    <Card variant="default" className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-text-primary">{format(miniRef, 'MMMM yyyy')}</p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMiniRef(addMonths(miniRef, -1))}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-secondary"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => setMiniRef(addMonths(miniRef, 1))}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-secondary"
          >
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
          const dayKey = format(day, 'yyyy-MM-dd');
          const hasTasks = datesWithTasks.has(dayKey);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className="w-full aspect-square flex flex-col items-center justify-center text-[10px] font-bold rounded-lg mx-auto relative"
              style={{
                color: !inMonth
                  ? 'var(--color-text-muted)'
                  : isReference
                    ? '#fff'
                    : today
                      ? 'var(--color-accent)'
                      : 'var(--color-text-primary)',
                background: isReference
                  ? 'var(--gradient-accent)'
                  : today
                    ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                    : 'transparent',
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              {format(day, 'd')}
              {hasTasks && inMonth && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: 'var(--color-accent)' }}
                />
              )}
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
      className={[
        'flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left',
        compact ? 'px-1.5 py-1' : 'px-2.5 py-2',
      ].join(' ')}
      style={{ background: meta.bg, borderColor: 'color-mix(in srgb, ' + meta.accent + ' 20%, var(--color-border))' }}
    >
      {event.type === 'TASK_DUE' ? (
        <CheckSquare size={10} style={{ color: meta.accent }} />
      ) : (
        <Timer size={10} style={{ color: meta.accent }} />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-text-primary truncate">{event.title}</div>
        {!compact && (
          <div className="text-[9px] font-semibold text-text-muted truncate">
            {meta.label} · {timeLabel}
          </div>
        )}
      </div>
      {!compact && <span className="text-[9px] font-bold text-text-muted whitespace-nowrap">{timeLabel}</span>}
    </div>
  );
}

function CalendarDayAgenda({
  day,
  events,
  tasks,
  updateTask,
  onPickDay,
}: {
  day: Date;
  events: CalendarEventDTO[];
  tasks: TaskDTO[];
  updateTask: any;
  onPickDay?: (day: Date) => void;
}) {
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const totalCount = tasks.length;
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

      {/* Task progress bar */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-border-subtle)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${(doneCount / totalCount) * 100}%`, background: 'var(--color-success)' }}
            />
          </div>
          <span className="text-[10px] font-bold text-text-muted">
            {doneCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Events</h4>
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-2 p-2 rounded-lg border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: EVENT_META[event.type].bg, color: EVENT_META[event.type].accent }}
              >
                {event.type === 'TASK_DUE' ? <CheckSquare size={10} /> : <Timer size={10} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-text-primary truncate">{event.title}</p>
                {event.allDay && (
                  <p className="text-[8px] text-text-muted font-semibold">All day</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Tasks</h4>
          {tasks.map((task, index) => (
            <AgendaTaskRow
              key={task.id}
              task={task}
              isLast={index === tasks.length - 1}
              onToggle={() =>
                updateTask.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })
              }
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 && tasks.length === 0 && (
        <div
          className="py-6 text-center rounded-xl border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
        >
          <Circle size={20} className="mx-auto text-text-muted mb-1.5" />
          <p className="text-[11px] font-bold text-text-primary">Nothing scheduled here</p>
          <p className="text-[9px] text-text-muted mt-0.5">This day is available for planning.</p>
        </div>
      )}
    </div>
  );
}

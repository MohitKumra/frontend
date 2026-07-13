import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addMonths } from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutList,
  Timer,
  CheckSquare,
  Circle,
  Sparkles,
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
import type { CalendarEventDTO } from '../types';

type CalendarView = 'day' | 'week' | 'month' | 'agenda';

const EVENT_META = {
  TASK_DUE: {
    label: 'Task',
    accent: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  },
  FOCUS_SESSION: {
    label: 'Focus',
    accent: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
  },
} as const;

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
      return `Agenda starting ${format(reference, 'MMM d, yyyy')}`;
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

export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('month');
  const [reference, setReference] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const range = getRange(view, reference);
  const calendarRange = useMemo(
    () => ({
      from: format(range.from, 'yyyy-MM-dd'),
      to: format(range.to, 'yyyy-MM-dd'),
    }),
    [range.from, range.to],
  );

  const { data, isLoading } = useCalendarOverview(calendarRange);

  const events = data?.events ?? [];
  const referenceKey = format(reference, 'yyyy-MM-dd');

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

  const rangeLabel = formatRangeLabel(view, reference);
  const summary = getEventSummary(events);

  const navigatePeriod = (direction: -1 | 1) => {
    setReference((current) => {
      if (view === 'day') return addDays(current, direction);
      if (view === 'week') return addDays(current, direction * 7);
      if (view === 'month') return addMonths(current, direction);
      return addDays(current, direction * 14);
    });
  };

  if (isLoading) return <LoadingScreen />;

  const viewTabs = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'agenda', label: 'Agenda' },
  ] satisfies { id: CalendarView; label: string }[];

  const jumpToToday = () => {
    const today = new Date();
    setReference(today);
    setSelectedDate(today);
    setView('day');
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-6">
      <PageHeader
        icon={<CalendarDays size={20} />}
        title="Calendar"
        subtitle="A unified view of tasks, focus sessions, and deadlines"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={jumpToToday}
              className="px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:shadow-sm"
              style={{
                background: 'var(--color-surface-raised)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              Today
            </button>
            <TabBar
              tabs={viewTabs}
              activeTab={view}
              onTabChange={(tab) => setView(tab as CalendarView)}
              variant="pill"
            />
          </div>
        }
      />

      <div
        className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border"
        style={{
          background: 'var(--color-surface-raised)',
          borderColor: 'var(--color-border)',
        }}
      >
        <button
          type="button"
          onClick={() => navigatePeriod(-1)}
          className="p-2 sm:p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center min-w-0">
          <p className="text-sm sm:text-base md:text-lg font-extrabold text-text-primary truncate">
            {rangeLabel}
          </p>
          <p className="text-[11px] sm:text-xs font-semibold text-text-muted mt-1">
            {data?.meta.totalEvents ?? 0} events in range
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigatePeriod(1)}
          className="p-2 sm:p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card variant="default" className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Events</div>
          <div className="mt-2 text-2xl font-black text-text-primary">{data?.meta.totalEvents ?? 0}</div>
        </Card>
        <Card variant="default" className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Task Deadlines</div>
          <div className="mt-2 text-2xl font-black text-accent">{summary.tasks}</div>
        </Card>
        <Card variant="default" className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Focus Sessions</div>
          <div className="mt-2 text-2xl font-black text-success">{summary.focus}</div>
        </Card>
        <Card variant="default" className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Calendar Range</div>
          <div className="mt-2 text-sm font-bold text-text-primary">{format(calendarRange.from, 'MMM d')} - {format(calendarRange.to, 'MMM d')}</div>
        </Card>
      </div>

      {view === 'day' && (
        <Card variant="default" className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Day View</h3>
              <p className="text-xs text-text-muted mt-1">Everything scheduled for the selected day</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(reference)}
              className="text-xs font-bold px-3 py-2 rounded-xl border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              Open agenda
            </button>
          </div>
          <CalendarDayAgenda day={reference} events={referenceEvents} onPickDay={setSelectedDate} />
        </Card>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
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
                className="text-left rounded-2xl border p-3 sm:p-4 transition-all hover:shadow-md"
                style={{
                  background: today ? 'color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))' : 'var(--color-surface)',
                  borderColor: today ? 'var(--color-accent-border)' : 'var(--color-border)',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-lg font-black text-text-primary">{format(day, 'd')}</div>
                  </div>
                  {today && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: EVENT_META.TASK_DUE.bg, color: EVENT_META.TASK_DUE.accent }}>
                      Today
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
                    <span>Tasks</span>
                    <span>{summaryForDay.tasks}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
                    <span>Focus</span>
                    <span>{summaryForDay.focus}</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventChip key={event.id} event={event} />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[11px] font-semibold text-text-muted">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {view === 'month' && (
        <div className="overflow-x-auto no-scrollbar">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label) => (
              <div key={label} className="text-center text-[10px] font-bold uppercase tracking-wider text-text-muted py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 min-w-[760px]">
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
                  className="text-left rounded-2xl border p-3 min-h-[130px] transition-all"
                  style={{
                    background: inMonth ? 'var(--color-surface)' : 'var(--color-surface-raised)',
                    borderColor: today ? 'var(--color-accent)' : 'var(--color-border)',
                    opacity: inMonth ? 1 : 0.45,
                    cursor: inMonth ? 'pointer' : 'default',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center"
                      style={{
                        background: today ? 'var(--gradient-accent)' : 'transparent',
                        color: today ? 'var(--color-text-onaccent)' : 'var(--color-text-primary)',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-text-muted">{dayEvents.length} items</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventChip key={event.id} event={event} compact />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[11px] font-semibold text-text-muted">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === 'agenda' && (
        <Card variant="default" className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Agenda</h3>
              <p className="text-xs text-text-muted mt-1">Chronological list across the current range</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-text-muted">
              <LayoutList size={14} />
              <span>{events.length} events</span>
            </div>
          </div>

          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="py-14 text-center">
                <Sparkles size={36} className="mx-auto text-text-muted mb-3" />
                <p className="text-sm font-bold text-text-primary">No events in this range</p>
                <p className="text-xs text-text-muted mt-1">Your calendar is clear for now.</p>
              </div>
            ) : (
              events.map((event) => (
                <AgendaRow key={event.id} event={event} onClick={() => setSelectedDate(new Date(event.startAt))} />
              ))
            )}
          </div>
        </Card>
      )}

      <Modal
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}
        maxWidth="max-w-2xl"
      >
        {selectedDate && <CalendarDayAgenda day={selectedDate} events={eventsByDay.get(format(selectedDate, 'yyyy-MM-dd')) ?? []} />}
      </Modal>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate('/planner')}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:shadow-md"
          style={{ background: 'var(--gradient-accent)' }}
        >
          Open Planner
        </button>
      </div>
    </div>
  );
}

function EventChip({ event, compact = false }: { event: CalendarEventDTO; compact?: boolean }) {
  const meta = EVENT_META[event.type];
  const timeLabel = event.allDay ? 'All day' : formatTime(new Date(event.startAt));

  return (
    <div
      className={[
        'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left',
        compact ? 'px-2 py-1.5' : '',
      ].join(' ')}
      style={{
        background: meta.bg,
        borderColor: 'color-mix(in srgb, ' + meta.accent + ' 20%, var(--color-border))',
      }}
    >
      {event.type === 'TASK_DUE' ? <CheckSquare size={12} style={{ color: meta.accent }} /> : <Timer size={12} style={{ color: meta.accent }} />}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-text-primary truncate">{event.title}</div>
        {!compact && (
          <div className="text-[10px] font-semibold text-text-muted truncate">
            {meta.label} · {timeLabel}
          </div>
        )}
      </div>
      {!compact && (
        <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">{timeLabel}</span>
      )}
    </div>
  );
}

function AgendaRow({ event, onClick }: { event: CalendarEventDTO; onClick: () => void }) {
  const meta = EVENT_META[event.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all hover:shadow-sm"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{
          background: meta.bg,
          color: meta.accent,
        }}
      >
        {event.type === 'TASK_DUE' ? <CheckSquare size={18} /> : <Timer size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-text-primary truncate">{event.title}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: meta.accent, background: meta.bg }}>
            {meta.label}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1 truncate">
          {event.allDay ? formatDate(event.startAt) : `${formatDate(event.startAt)} · ${formatTime(event.startAt)}`}
          {event.metadata?.durationMin ? ` · ${event.metadata.durationMin} min` : ''}
        </p>
      </div>
      <Clock3 size={14} className="text-text-muted shrink-0" />
    </button>
  );
}

function CalendarDayAgenda({
  day,
  events,
  onPickDay,
}: {
  day: Date;
  events: CalendarEventDTO[];
  onPickDay?: (day: Date) => void;
}) {
  const summary = getEventSummary(events);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card variant="default" className="p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tasks</div>
          <div className="mt-1 text-xl font-black text-accent">{summary.tasks}</div>
        </Card>
        <Card variant="default" className="p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Focus</div>
          <div className="mt-1 text-xl font-black text-success">{summary.focus}</div>
        </Card>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
            <Circle size={30} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm font-bold text-text-primary">Nothing scheduled here</p>
            <p className="text-xs text-text-muted mt-1">This day is available for planning.</p>
          </div>
        ) : (
          events.map((event) => <AgendaRow key={event.id} event={event} onClick={() => onPickDay?.(day)} />)
        )}
      </div>
    </div>
  );
}

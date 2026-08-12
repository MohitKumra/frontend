// frontend/src/lib/taskDateUtils.ts
// Task due-date helpers that match the backend's timezone-aware day boundaries.

function normalizeTimeZone(timeZone: string | null | undefined): string {
  return timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  return new Date(`${dateKeyInTimeZone(date, timeZone)}T00:00:00.000Z`);
}

function nextDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function nextDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isTodayInTimeZone(dateStr: string | null, timeZone?: string | null): boolean {
  if (!dateStr) return false;
  const tz = normalizeTimeZone(timeZone);
  const date = new Date(dateStr);
  const todayStart = startOfDayInTimeZone(new Date(), tz);
  const tomorrowStart = nextDay(todayStart);
  return date >= todayStart && date < tomorrowStart;
}

export function isTomorrowInTimeZone(dateStr: string | null, timeZone?: string | null): boolean {
  if (!dateStr) return false;
  const tz = normalizeTimeZone(timeZone);
  const date = new Date(dateStr);
  const todayStart = startOfDayInTimeZone(new Date(), tz);
  const tomorrowStart = nextDay(todayStart);
  const dayAfterTomorrowStart = nextDay(tomorrowStart);
  return date >= tomorrowStart && date < dayAfterTomorrowStart;
}

export function isFutureTaskInTimeZone(dateStr: string | null, timeZone?: string | null): boolean {
  if (!dateStr) return false;
  const tz = normalizeTimeZone(timeZone);
  const date = new Date(dateStr);
  const todayStart = startOfDayInTimeZone(new Date(), tz);
  const tomorrowStart = nextDay(todayStart);
  return date >= tomorrowStart;
}

export function isUpcomingInTimeZone(dateStr: string | null, timeZone?: string | null): boolean {
  if (!dateStr) return false;
  const tz = normalizeTimeZone(timeZone);
  const date = new Date(dateStr);
  const todayStart = startOfDayInTimeZone(new Date(), tz);
  const tomorrowStart = nextDay(todayStart);
  const nextWeekEnd = nextDays(todayStart, 7);
  nextWeekEnd.setUTCHours(23, 59, 59, 999);
  return date >= tomorrowStart && date <= nextWeekEnd;
}

export function isOverdueInTimeZone(dueDate: string | null, status: string, timeZone?: string | null): boolean {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return false;
  const tz = normalizeTimeZone(timeZone);
  const date = new Date(dueDate);
  const todayStart = startOfDayInTimeZone(new Date(), tz);
  return date < todayStart;
}

export function formatDueDateInTimeZone(dateStr: string | null, timeZone?: string | null): string | null {
  if (!dateStr) return null;
  const tz = normalizeTimeZone(timeZone);

  if (isTodayInTimeZone(dateStr, tz)) return 'Today';
  if (isTomorrowInTimeZone(dateStr, tz)) return 'Tomorrow';

  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

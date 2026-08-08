// frontend/src/lib/dateUtils.ts
// Date formatting and manipulation helpers used across the app.
// All helpers are pure functions — no side effects.

import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

/** Format an ISO string or Date as "Mon, Jul 7" */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

/** Format an ISO string or Date as "Jul 7, 2026" */
export function formatFullDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

/** Format as "3:45 PM" */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

/** "2 hours ago" / "in 3 days" */
export function fromNow(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Get all days in the current week (Mon–Sun). */
export function getWeekDays(referenceDate = new Date()): Date[] {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

/** Get all days in the month containing referenceDate, including padding days for a full calendar grid. */
export function getMonthDays(referenceDate = new Date()): Date[] {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);

  // Get the day of week for the 1st (0 = Sunday, 1 = Monday, etc.)
  // We want the grid to start on Monday (weekStartsOn: 1)
  const startDay = monthStart.getDay();

  // Calculate days to add before the 1st to complete the first week
  // If 1st is Monday (1), we need 0 days before
  // If 1st is Sunday (0), we need 6 days before
  // If 1st is Wednesday (3), we need 2 days before (Mon, Tue)
  const daysBefore = startDay === 0 ? 6 : startDay - 1;

  // Calculate days to add after the last day to complete the last week
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want to end on Sunday (which is 0 in getDay terms)
  // If last day is Friday (5), we need 2 more days (Sat, Sun)
  // If last day is Sunday (0), we need 0 more days
  // If last day is Monday (1), we need 6 more days
  const endDay = monthEnd.getDay();
  const daysAfter = endDay === 0 ? 0 : 7 - endDay;

  // Calculate total days needed (always a multiple of 7 for complete weeks)
  const totalDays = daysBefore + monthEnd.getDate() + daysAfter;

  const days: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(monthStart);
    day.setDate(monthStart.getDate() + i - daysBefore);
    days.push(day);
  }

  return days;
}

/** Check if a date is in the same month as the reference date */
export function isSameMonth(date: Date, referenceDate: Date): boolean {
  return date.getMonth() === referenceDate.getMonth() && date.getFullYear() === referenceDate.getFullYear();
}

export {
  isToday,
  isTomorrow,
  isYesterday,
  isSameDay,
  addDays,
  subDays,
  parseISO,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
};

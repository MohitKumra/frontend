/**
 * useFocusSessions.ts
 * Fetches focus sessions from the backend API and computes
 * today's total focus time and hourly bucket distribution.
 */

import { useQuery } from '@tanstack/react-query';
import { focusApi } from '../api';
import type { FocusSessionDTO } from '../../../types';

const FOCUS_KEY = ['focus-sessions'] as const;

export function useFocusSessions() {
  return useQuery({
    queryKey: FOCUS_KEY,
    queryFn: focusApi.list,
  });
}

export interface FocusTimeData {
  /** Total focus minutes today */
  todayMinutes: number;
  /** Hourly buckets (0-23), each value = minutes focused in that hour */
  hourBuckets: number[];
  /** Hours component for display */
  hours: number;
  /** Minutes component for display */
  minutes: number;
}

/**
 * Computes focus time data from a list of focus sessions.
 * Only considers today's sessions (non-break, completed).
 */
export function computeFocusTime(sessions: FocusSessionDTO[]): FocusTimeData {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // Filter to today's completed, non-break sessions
  const todaySessions = sessions.filter((s) => {
    if (s.isBreak) return false;
    if (!s.completed) return false;
    const sessionDate = s.startedAt.split('T')[0];
    return sessionDate === todayStr;
  });

  const totalMinutes = todaySessions.reduce((sum, s) => sum + s.durationMin, 0);

  // Build hourly buckets
  const hourBuckets = new Array(24).fill(0);
  todaySessions.forEach((s) => {
    const startHour = new Date(s.startedAt).getHours();
    // Distribute duration across hours (simplified: put all minutes in start hour)
    hourBuckets[startHour] += s.durationMin;
  });

  return {
    todayMinutes: totalMinutes,
    hourBuckets,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import { useSearchParams } from 'react-router-dom';
import {
  Timer, Play, Pause, RotateCcw, Maximize2, Minimize2, X, Flame, CheckCircle2, Circle,
  ChevronDown, ChevronRight, Target, Coffee, Settings, Moon, TrendingUp, SkipBack,
  SkipForward, MoreHorizontal, Music, CalendarDays, Clock, AudioLines,
  FolderKanban,
  LucideTrendingUp,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { TabBar } from '../components/ui/TabBar';
import { Card } from '../components/ui/Card';
import { useUIStore } from '../store/uiStore';
import { TaskTimeAnalysis } from '../components/tasks/TaskTimeAnalysis';
import { JournalAmbientScene } from '../components/focus/JournalAmbientScene';
import { QuoteCard } from '../components/habits/QuoteCard';
import { getDailyQuotes } from '../data/quotes';
import { focusApi } from '../features/habits/api';
import { saveTimerState, restoreTimerState, clearTimerState } from '../lib/timerPersistence';
import { useAmbientSound } from '../hooks/useAmbientSound';
import { isSameDay } from '../lib/dateUtils';
import type { FocusSessionDTO, FocusSessionStatus, ListResponse, ProjectDTO, TaskDTO } from '../types';
import type { Quote as QuoteType } from '../data/quotes';

export type TimerMode = 'focus' | 'short_break' | 'long_break';
const MODE_ORDER: TimerMode[] = ['focus', 'short_break', 'long_break'];
const DURATIONS: Record<TimerMode, number> = {
  focus: 25, short_break: 5, long_break: 15,
};
const QUICK_DURATIONS = [25, 50, 75, 90];
const DEFAULT_GOAL_MIN = 240;
const AMBIENT_SOUNDS = ['Forest', 'Rain', 'Cafe', 'Silence'];
/** Autosave interval in seconds — flush elapsed to server every 30s */
const AUTOSAVE_INTERVAL_SEC = 30;

const getModeColors = (mode: TimerMode) => {
  switch (mode) {
    case 'focus':
      return { primary: '#6366F1', subtle: 'color-mix(in srgb, #6366F1 15%, transparent)', glow: 'color-mix(in srgb, #6366F1 25%, transparent)' };
    case 'short_break':
      return { primary: '#38BDF8', subtle: 'color-mix(in srgb, #38BDF8 15%, transparent)', glow: 'color-mix(in srgb, #38BDF8 25%, transparent)' };
    case 'long_break':
      return { primary: '#A78BFA', subtle: 'color-mix(in srgb, #A78BFA 15%, transparent)', glow: 'color-mix(in srgb, #A78BFA 25%, transparent)' };
  }
};

const TEXT_DARKEN: Record<TimerMode, number> = { focus: 15, short_break: 45, long_break: 50 };

const getStrongColor = (mode: TimerMode) => {
  const colors = getModeColors(mode);
  return `color-mix(in srgb, ${colors.primary} ${100 - TEXT_DARKEN[mode]}%, #000)`;
};

const MODE_SKY: Record<TimerMode, [string, string, string, string]> = {
  focus: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#f5f3ff'],
  short_break: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#f0f9ff'],
  long_break: ['#ede9fe', '#ddd6fe', '#c4b5fd', '#f5f3ff'],
};

const MODE_COPY: Record<TimerMode, string> = {
  focus: 'Stay focused, you got this! 💪',
  short_break: 'Stretch, breathe, recharge ☕',
  long_break: 'Take it slow, you earned it 🌿',
};

function requestFullscreen(el: HTMLElement) {
  const anyEl = el as any;
  const fn = el.requestFullscreen || anyEl.webkitRequestFullscreen || anyEl.msRequestFullscreen;
  return fn ? fn.call(el) : Promise.reject(new Error('Fullscreen API unsupported'));
}
function exitFullscreen() {
  const anyDoc = document as any;
  const fn = document.exitFullscreen || anyDoc.webkitExitFullscreen || anyDoc.msExitFullscreen;
  return fn ? fn.call(document) : Promise.resolve();
}
function isFullscreenActive() {
  const anyDoc = document as any;
  return !!(document.fullscreenElement || anyDoc.webkitFullscreenElement || anyDoc.msFullscreenElement);
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/* ───────────────────────── Progress Ring ───────────────────────── */

function ProgressRing({
  logicalSize, progress, colors, running, showKnob = true, isNight = false,
}: {
  logicalSize: number; progress: number; colors: ReturnType<typeof getModeColors>; running: boolean; showKnob?: boolean; isNight?: boolean;
}) {
  const stroke = logicalSize > 200 ? 12 : 10;
  const r = logicalSize / 2 - stroke;
  const circumference = 2 * Math.PI * r;
  const tickCount = 24;
  const clamped = Math.max(0, Math.min(1, progress));
  const knobAngle = clamped * 2 * Math.PI;
  const cx = logicalSize / 2;
  const cy = logicalSize / 2;
  const knobX = cx + r * Math.cos(knobAngle);
  const knobY = cy + r * Math.sin(knobAngle);

  return (
    <svg
      viewBox={`0 0 ${logicalSize} ${logicalSize}`}
      className="-rotate-90 w-full h-full"
      style={{ filter: running ? `drop-shadow(0 0 18px ${colors.glow})` : 'none', transition: 'filter 600ms ease' }}
    >
      <defs>
        <linearGradient id={`ring-gradient-${logicalSize}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.55" />
          <stop offset="100%" stopColor={colors.primary} stopOpacity="1" />
        </linearGradient>
      </defs>

      {Array.from({ length: tickCount }).map((_, i) => {
        const angle = (i / tickCount) * 2 * Math.PI;
        const inner = r - stroke / 2 - 4;
        const outer = r - stroke / 2 - 9;
        return (
          <line
            key={i}
            x1={cx + inner * Math.cos(angle)}
            y1={cy + inner * Math.sin(angle)}
            x2={cx + outer * Math.cos(angle)}
            y2={cy + outer * Math.sin(angle)}
            stroke={isNight ? 'rgba(255,255,255,0.3)' : 'var(--color-border-subtle)'}
            strokeWidth={1.5}
          />
        );
      })}

      <circle cx={cx} cy={cy} r={r} fill="none" stroke={isNight ? 'rgba(255,255,255,0.2)' : 'var(--color-border-subtle)'} strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={`url(#ring-gradient-${logicalSize})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
      {showKnob && clamped > 0.01 && (
        <circle cx={knobX} cy={knobY} r={stroke / 2 + 2} fill={isNight ? 'rgba(255,255,255,0.9)' : 'var(--color-surface)'} stroke={colors.primary} strokeWidth={3} />
      )}
    </svg>
  );
}

/* ───────────────────────── Mini sparkline ───────────────────────── */

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 48;
  const h = 22;
  const max = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────────────────────── Fullscreen stat card ───────────────────────── */

function FocusModeStatCard({ icon, label, value, sub, isNight = false, mode }: {
  icon: React.ReactNode; iconBg?: string; iconColor?: string; label: string; value: React.ReactNode; sub: string; isNight?: boolean; mode: TimerMode;
}) {
  const colors = getModeColors(mode);
  const modeBoost = mode === 'short_break' ? 2.2 : mode === 'long_break' ? 1.8 : 1;
  const modeBorderBoost = mode === 'short_break' ? 1.7 : mode === 'long_break' ? 1.5 : 1;
  const nightAlpha = 0.40;
  const mixBg = (pct: number) =>
    isNight ? `rgba(255,255,255,${nightAlpha})` : `color-mix(in srgb, ${colors.primary} ${Math.round(pct * modeBoost)}%, transparent)`;
  const mixBorder = (pct: number) =>
    isNight ? `rgba(255,255,255,${nightAlpha + 0.1})` : `color-mix(in srgb, ${colors.primary} ${Math.round(pct * modeBorderBoost)}%, transparent)`;
  const mixIconBg = (pct: number) =>
    isNight ? `rgba(255,255,255,${nightAlpha + 0.05})` : `color-mix(in srgb, ${colors.primary} ${Math.round(pct * modeBoost)}%, transparent)`;
  const textCap = 100 - TEXT_DARKEN[mode];
  const subCap = 100 - Math.max(0, TEXT_DARKEN[mode] - 15);
  const mixText = (pct: number) => `color-mix(in srgb, ${colors.primary} ${Math.min(textCap, pct)}%, #000)`;
  const mixSub = (pct: number) => `color-mix(in srgb, ${colors.primary} ${Math.min(subCap, pct)}%, #000)`;
  const strong = getStrongColor(mode);
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm"
      style={{
        background: mixBg(22),
        borderColor: mixBorder(35),
        backdropFilter: 'blur(4px)',
      }}
    >
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: mixIconBg(30), color: strong }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: mixText(85) }}>{label}</p>
        <p className="text-lg font-black leading-tight" style={{ color: strong }}>{value}</p>
        <p className="text-[10px] font-semibold" style={{ color: mixSub(70) }}>{sub}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Fullscreen Focus Mode ───────────────────────── */

function FocusModeFullScreen({
  mode, minutes, seconds, progress, running, selectedTaskTitle, selectedProjectTitle, quotes,
  ambientPlaying, ambientSound, onToggleAmbient,
  todayFocusCount, todayFocusTimeLabel, todayBreakCount, longestStreakDays,
  onExit, onReset, onStartPause, onSkipBack, onSkipForward,
}: {
  mode: TimerMode; minutes: string; seconds: string; progress: number; running: boolean;
  selectedTaskTitle: string | null; selectedProjectTitle: string | null; quotes: QuoteType[];
  ambientPlaying: boolean; ambientSound: string; onToggleAmbient: () => void;
  todayFocusCount: number; todayFocusTimeLabel: string; todayBreakCount: number; longestStreakDays: number;
  onExit: () => void; onReset: () => void; onStartPause: () => void;
  onSkipBack: () => void; onSkipForward: () => void;
}) {
  const colors = getModeColors(mode);
  const [statsVisible, setStatsVisible] = useState(true);
  const isNight = mode === 'long_break';

  const modeBoost = mode === 'short_break' ? 2.2 : mode === 'long_break' ? 1.8 : 1;
  const modeBorderBoost = mode === 'short_break' ? 1.7 : mode === 'long_break' ? 1.5 : 1;
  const nightAlpha = 0.40;

  const mixBg = (pct: number) =>
    isNight ? `rgba(255,255,255,${nightAlpha})` : `color-mix(in srgb, ${colors.primary} ${Math.round(pct * modeBoost)}%, transparent)`;
  const mixBorder = (pct: number) =>
    isNight ? `rgba(255,255,255,${nightAlpha + 0.1})` : `color-mix(in srgb, ${colors.primary} ${Math.round(pct * modeBorderBoost)}%, transparent)`;
  const mixIcon = (pct: number) =>
    isNight ? `rgba(255,255,255,${nightAlpha + 0.05})` : `color-mix(in srgb, ${colors.primary} ${Math.round(pct * modeBoost)}%, transparent)`;
  const textCap = 100 - TEXT_DARKEN[mode];
  const subCap = 100 - Math.max(0, TEXT_DARKEN[mode] - 15);
  const mixText = (pct: number) => `color-mix(in srgb, ${colors.primary} ${Math.min(textCap, pct)}%, #000)`;
  const mixSub = (pct: number) => `color-mix(in srgb, ${colors.primary} ${Math.min(subCap, pct)}%, #000)`;
  const strong = getStrongColor(mode);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const onStartPauseRef = useRef(onStartPause);
  const onResetRef = useRef(onReset);
  const onSkipBackRef = useRef(onSkipBack);
  const onSkipForwardRef = useRef(onSkipForward);
  useEffect(() => { onStartPauseRef.current = onStartPause; }, [onStartPause]);
  useEffect(() => { onResetRef.current = onReset; }, [onReset]);
  useEffect(() => { onSkipBackRef.current = onSkipBack; }, [onSkipBack]);
  useEffect(() => { onSkipForwardRef.current = onSkipForward; }, [onSkipForward]);

  useEffect(() => {
    if (quotes.length <= 1) return;
    const delay = Math.floor(Math.random() * 5000) + 5000;
    const timer = setTimeout(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, delay);
    return () => clearTimeout(timer);
  }, [quoteIndex, quotes.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); onStartPauseRef.current(); }
      if (e.key === 'r' || e.key === 'R') onResetRef.current();
      if (e.key === 'ArrowLeft') onSkipBackRef.current();
      if (e.key === 'ArrowRight') onSkipForwardRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return createPortal(
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'var(--color-bg)', zIndex: 9999 }}>
     <div
  className="absolute inset-0 transition-all duration-700 pointer-events-none"
  style={{
    background: `linear-gradient(180deg, ${MODE_SKY[mode][0]} 0%, ${MODE_SKY[mode][1]} 38%, ${MODE_SKY[mode][2]} 72%, ${MODE_SKY[mode][3]} 100%)`,
  }}
/>
<div
  className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
  style={{
    background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${colors.primary} 12%, transparent) 0%, transparent 70%)`,
    opacity: running ? 1 : 0.7,
  }}
/>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 sm:p-6 z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-sm font-bold border shadow-sm shrink-0"
          style={{
            background: mixBg(22),
            borderColor: mixBorder(35),
            color: mixText(90),
            backdropFilter: 'blur(4px)',
          }}
        >
          <Minimize2 size={14} className="sm:hidden" />
          <Minimize2 size={16} className="hidden sm:block" />
          <span className="hidden xs:inline">Focus Mode</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={onToggleAmbient}
            aria-label="Toggle ambient sound"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border shadow-sm shrink-0"
            style={{
              background: ambientPlaying ? mixIcon(35) : mixBg(18),
              borderColor: mixBorder(30),
              color: ambientPlaying ? '#fff' : mixText(85),
              backdropFilter: 'blur(4px)',
            }}
          >
            <Music size={14} />
          </button>
          <button
            onClick={() => setStatsVisible((v) => !v)}
            aria-label="Toggle stats panel"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border shadow-sm shrink-0"
            style={{
              background: statsVisible ? mixIcon(35) : mixBg(18),
              borderColor: mixBorder(30),
              color: statsVisible ? '#fff' : mixText(85),
              backdropFilter: 'blur(4px)',
            }}
          >
            <LucideTrendingUp size={14} />
          </button>
          <button
            onClick={onExit}
            aria-label="Exit focus mode"
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center ml-0.5 sm:ml-1 shrink-0"
            style={{ color: strong }}
          >
            <X size={18} className="sm:hidden" />
            <X size={20} className="hidden sm:block" />
          </button>
        </div>
      </div>

      {/* Left stats panel */}
      {statsVisible && (
        <div className="hidden md:flex flex-col gap-3 absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 w-60 z-10">
          <FocusModeStatCard
            icon={<Target size={18} />}
            label="Focus Sessions"
            value={todayFocusCount}
            sub="Today"
            isNight={isNight}
            mode={mode}
          />
          <FocusModeStatCard
            icon={<Flame size={18} />}
            label="Focus Time"
            value={todayFocusTimeLabel}
            sub="Today"
            isNight={isNight}
            mode={mode}
          />
          <FocusModeStatCard
            icon={<Coffee size={18} />}
            label="Breaks Taken"
            value={todayBreakCount}
            sub="Today"
            isNight={isNight}
            mode={mode}
          />
          <FocusModeStatCard
            icon={<Clock size={18} />}
            label="Longest Streak"
            value={longestStreakDays}
            sub="Days"
            isNight={isNight}
            mode={mode}
          />
        </div>
      )}

      <div className="relative h-full flex items-center justify-center px-3 sm:px-4 pointer-events-none z-10">
        <div className="flex flex-col items-center gap-4 sm:gap-8 w-full max-w-[94vw] sm:max-w-lg p-4 sm:p-8 pointer-events-auto">
          <div className="flex flex-col items-center gap-2 sm:gap-3 w-full px-2">
            <p className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-[0.25em] sm:tracking-[0.35em]" style={{ color: strong }}>
              {mode === 'focus' ? 'FOCUS' : mode === 'short_break' ? 'SHORT BREAK' : 'LONG BREAK'}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-center max-w-full break-words" style={{ color: 'var(--color-text-secondary)' }}>{MODE_COPY[mode]}</p>
            {selectedTaskTitle && mode === 'focus' && (
              <div className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-text-secondary bg-white/60 border border-white/40 max-w-[min(320px,85vw)] truncate mt-1">
                🎯 {selectedTaskTitle}
              </div>
            )}
            {selectedProjectTitle && mode === 'focus' && (
              <div className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-text-secondary bg-white/60 border border-white/40 max-w-[min(320px,85vw)] truncate mt-1">
                {selectedProjectTitle}
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center" style={{ animation: running ? 'focus-breathe 4s ease-in-out infinite' : 'none' }}>
            <div className="w-[clamp(200px,58vw,380px)] h-[clamp(200px,58vw,380px)]">
              <ProgressRing
                logicalSize={380}
                progress={progress}
                colors={colors}
                running={running}
                isNight={false}
              />
            </div>
            <div className="absolute flex flex-col items-center gap-2 sm:gap-3 select-none px-2">
              <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tabular-nums tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                {minutes}:{seconds}
              </span>
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap" style={{
                background: colors.subtle,
                color: strong
              }}>
                <Target size={11} className="sm:hidden" />
                <Target size={12} className="hidden sm:block" />
                {mode === 'focus' ? 'Focus Session' : mode === 'short_break' ? 'Short Break' : 'Long Break'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
            <button
              onClick={onSkipBack}
              aria-label="Previous mode"
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full border shadow-sm shrink-0"
              style={{
                background: mixBg(20),
                borderColor: mixBorder(35),
                color: strong,
                backdropFilter: 'blur(4px)',
              }}
            >
              <SkipBack size={14} className="sm:hidden" />
              <SkipBack size={16} className="hidden sm:block" />
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2.5 sm:py-4 rounded-full text-xs sm:text-sm font-bold border shadow-sm shrink-0"
              style={{
                background: mixBg(22),
                borderColor: mixBorder(35),
                color: mixText(90),
                backdropFilter: 'blur(4px)',
              }}
            >
              <RotateCcw size={14} className="sm:hidden" />
              <RotateCcw size={16} className="hidden sm:block" />
              Reset
            </button>

            <button
              onClick={onStartPause}
              className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-5 sm:px-10 h-11 sm:h-14 md:h-16 text-sm sm:text-base md:text-lg font-bold shadow-xl rounded-full shrink-0 border backdrop-blur-sm"
              style={{
                background: mixBg(30),
                borderColor: mixBorder(45),
                color: mixText(100),
              }}
            >
              {running ? (
                <>
                  <Pause size={17} className="sm:hidden" />
                  <Pause size={20} className="hidden sm:block" />
                  Pause
                </>
              ) : mode === 'focus' ? (
                <>
                  <Play size={17} className="sm:hidden" />
                  <Play size={20} className="hidden sm:block" />
                  <span className="hidden min-[380px]:inline">Start Focus</span>
                  <span className="min-[380px]:hidden">Start</span>
                </>
              ) : (
                <>
                  <Play size={17} className="sm:hidden" />
                  <Play size={20} className="hidden sm:block" />
                  Start
                </>
              )}
            </button>

            <button
              onClick={onSkipForward}
              aria-label="Next mode"
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full border shadow-sm shrink-0"
              style={{
                background: mixBg(20),
                borderColor: mixBorder(35),
                color: strong,
                backdropFilter: 'blur(4px)',
              }}
            >
              <SkipForward size={14} className="sm:hidden" />
              <SkipForward size={16} className="hidden sm:block" />
            </button>
          </div>

          <p className="text-[11px] sm:text-xs font-semibold text-center max-w-full break-words px-2" style={{ color: 'var(--color-text-muted)' }}>
            💡 Tip: Take short breaks to recharge. You'll come back stronger!
          </p>
        </div>

        {quotes.length > 0 && (
          <div
            className="hidden lg:block absolute bottom-[15%] right-10 max-w-[320px] p-6 rounded-2xl border shadow-lg pointer-events-auto z-10"
            style={{
              background: mixBg(22),
              borderColor: mixBorder(35),
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="relative overflow-hidden" style={{ minHeight: 100 }}>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={quoteIndex}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                  <p className="text-3xl leading-none mb-2" style={{ color: 'var(--color-accent)' }}>“</p>
                  <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{quotes[quoteIndex].quote}</p>
                  <p className="text-xs font-bold mt-3" style={{ color: 'var(--color-text-secondary)' }}>— {quotes[quoteIndex].author}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-10">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl border shadow-sm" style={{
          background: mixBg(20),
          borderColor: mixBorder(30),
          backdropFilter: 'blur(4px)',
        }}>
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0" style={{
            background: mixIcon(30),
            color: strong
          }}>
            <Music size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold truncate" style={{ color: mixText(90) }}>{ambientSound}</p>
            <p className="text-[9px] sm:text-[10px] font-semibold truncate" style={{ color: mixSub(70) }}>Concentration</p>
          </div>
          <button
            onClick={onToggleAmbient}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ color: strong }}
            aria-label={ambientPlaying ? 'Pause ambient sound' : 'Play ambient sound'}
          >
            <AudioLines size={16} />
          </button>
        </div>
      </div>

      <div className="hidden sm:block absolute bottom-6 right-6 z-10">
        <div className="px-5 py-3.5 rounded-2xl border shadow-sm" style={{
          background: mixBg(18),
          borderColor: mixBorder(30),
          backdropFilter: 'blur(4px)',
        }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: mixText(85) }}>Shortcuts</p>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1.5 rounded-md text-[10px] font-black" style={{
                background: mixIcon(30),
                color: strong
              }}>Space</kbd>
              <span className="text-[11px] font-semibold" style={{ color: mixText(85) }}>Start / Pause</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1.5 rounded-md text-[10px] font-black" style={{
                background: mixIcon(30),
                color: strong
              }}>R</kbd>
              <span className="text-[11px] font-semibold" style={{ color: mixText(85) }}>Reset</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1.5 rounded-md text-[10px] font-black" style={{
                background: mixIcon(30),
                color: strong
              }}>←→</kbd>
              <span className="text-[11px] font-semibold" style={{ color: mixText(85) }}>Switch Mode</span>
            </div>
          </div>
        </div>
      </div>

      <JournalAmbientScene mode={mode} />

      <style>{`
        @keyframes focus-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="focus-breathe"] { animation: none !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}

/* ───────────────────────── Task Selector ───────────────────────── */

function TaskSelector({
  tasks, selectedTaskId, onSelect,
}: {
  tasks: TaskDTO[]; selectedTaskId: string | null; onSelect: (taskId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all hover:border-accent/50"
        style={{
          background: 'var(--color-surface)',
          borderColor: selectedTaskId ? 'var(--color-accent)' : 'var(--color-border)',
          color: selectedTaskId ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Target size={14} className="shrink-0" style={{ color: selectedTaskId ? 'var(--color-accent)' : undefined }} />
          <span className="truncate">{selectedTask ? selectedTask.title : 'Link a task (optional)'}</span>
        </div>
        <ChevronDown size={14} className="shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl overflow-hidden"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)', zIndex: 50, maxHeight: 260, overflowY: 'auto' }}
        >
          <button onClick={() => { onSelect(null); setOpen(false); }} className="w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: 'var(--color-text-secondary)' }}>
            No task (general focus)
          </button>
          {tasks.length === 0 && <div className="px-3.5 py-2.5 text-[11px] text-text-muted">No active tasks found</div>}
          {tasks.map((task) => {
            const isActive = task.id === selectedTaskId;
            return (
              <button
                key={task.id}
                onClick={() => { onSelect(task.id); setOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-3"
                style={{ background: isActive ? 'var(--color-accent-subtle)' : undefined }}
              >
                <span className="truncate" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{task.title}</span>
                <span
                  className="shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: task.status === 'IN_PROGRESS' ? 'color-mix(in srgb, var(--color-info) 15%, transparent)' : 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
                    color: task.status === 'IN_PROGRESS' ? 'var(--color-info)' : 'var(--color-text-muted)',
                  }}
                >
                  {task.status === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectSelector({
  projects, selectedProjectId, onSelect,
}: {
  projects: ProjectDTO[]; selectedProjectId: string | null; onSelect: (projectId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all hover:border-accent/50"
        style={{
          background: 'var(--color-surface)',
          borderColor: selectedProjectId ? 'var(--color-accent)' : 'var(--color-border)',
          color: selectedProjectId ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderKanban size={14} className="shrink-0" style={{ color: selectedProjectId ? 'var(--color-accent)' : undefined }} />
          <span className="truncate">{selectedProject ? selectedProject.name : 'Link a project (optional)'}</span>
        </div>
        <ChevronDown size={14} className="shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl overflow-hidden"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)', zIndex: 50, maxHeight: 260, overflowY: 'auto' }}
        >
          <button onClick={() => { onSelect(null); setOpen(false); }} className="w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800" style={{ color: 'var(--color-text-secondary)' }}>
            No project
          </button>
          {projects.length === 0 && <div className="px-3.5 py-2.5 text-[11px] text-text-muted">No projects found</div>}
          {projects.map((project) => {
            const isActive = project.id === selectedProjectId;
            return (
              <button
                key={project.id}
                onClick={() => { onSelect(project.id); setOpen(false); }}
                className="w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-3"
                style={{ background: isActive ? 'var(--color-accent-subtle)' : undefined }}
              >
                <span className="truncate" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{project.name}</span>
                <span
                  className="shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
                    color: project.color || 'var(--color-text-muted)',
                  }}
                >
                  {project.status.replace('_', ' ')}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Small presentational cards ───────────────────────── */

function StatCard({ icon, iconBg, iconColor, label, value, sub, subColor, sparkline }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: React.ReactNode;
  sub?: string; subColor?: string; sparkline?: number[];
}) {
  return (
    <Card variant="default" className="p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted truncate">{label}</p>
          <p className="text-lg font-black text-text-primary leading-tight">{value}</p>
          {sub && <p className="text-[10px] font-semibold mt-0.5" style={{ color: subColor }}>{sub}</p>}
        </div>
        {sparkline && <Sparkline values={sparkline} color={iconColor} />}
      </div>
    </Card>
  );
}

function TodaysPlanCard({ items, onPick }: { items: { id: string; title: string; time: string; color: string }[]; onPick: (id: string) => void }) {
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={14} style={{ color: 'var(--color-accent)' }} />
        <h4 className="text-xs font-bold text-text-primary">Today's Plan</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-text-muted font-semibold py-2">Nothing due today.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button key={item.id} onClick={() => onPick(item.id)} className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-xs font-semibold text-text-primary flex-1 text-left truncate">{item.title}</span>
              <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">{item.time}</span>
              <ChevronRight size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function AmbientSoundCard({ sound, setSound, playing, onToggle }: { sound: string; setSound: (s: string) => void; playing: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Music size={14} style={{ color: 'var(--color-accent)' }} />
        <h4 className="text-xs font-bold text-text-primary">Ambient Sound</h4>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-text-secondary flex items-center gap-1">
            {sound} <ChevronDown size={12} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1.5 w-32 rounded-xl border shadow-lg z-20 overflow-hidden" style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
              {AMBIENT_SOUNDS.map((s) => (
                <button key={s} onClick={() => { setSound(s); setOpen(false); }} className="w-full text-left px-3 py-2 text-[11px] font-semibold text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onToggle} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--gradient-accent)', color: '#fff' }} aria-label="Toggle ambient sound">
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
      <div className="mt-3 h-6 flex items-end gap-0.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${20 + Math.abs(Math.sin(i * 1.3)) * 80}%`,
              background: playing ? 'var(--color-accent)' : 'var(--color-border-subtle)',
              opacity: playing ? 0.5 + (i % 3) * 0.15 : 1,
              transition: 'background 300ms',
            }}
          />
        ))}
      </div>
    </Card>
  );
}


/** Format a timestamp for the recent sessions list.
 *  Uses completedAt when available (for completed/cancelled sessions),
 *  falls back to startedAt otherwise.
 *  Shows date + time if >24h old, time-only if today/yesterday. */
function formatSessionTimestamp(s: FocusSessionDTO): string {
  const ts = s.completedAt ?? s.startedAt;
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (isToday) return time;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

function RecentSessionsCard({
  sessions, tasksById, projectsById,
}: {
  sessions: FocusSessionDTO[]; tasksById: Map<string, string>; projectsById: Map<string, string>;
}) {
  const recent = sessions.slice(0, 5);
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-text-primary">Recent Sessions</h4>
        <button className="text-[11px] font-bold text-accent hover:text-accent-hover">View all</button>
      </div>
      {recent.length === 0 ? (
        <p className="text-[11px] text-text-muted font-semibold py-2">No sessions logged yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recent.map((s) => {
            const label = s.taskId
              ? tasksById.get(s.taskId) ?? 'Task'
              : s.projectId
                ? projectsById.get(s.projectId) ?? 'Project'
                : s.isBreak
                  ? 'Break'
                  : 'Focus Session';
            return (
              <div key={s.id} className="flex items-center gap-2.5">
                {s.status === 'COMPLETED' ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} className="shrink-0" />
                ) : s.status === 'CANCELLED' ? (
                  <Circle size={16} className="text-text-muted shrink-0" />
                ) : (
                  <Circle size={16} style={{ color: 'var(--color-warning)' }} className="shrink-0" />
                )}
                <span className="text-xs font-semibold text-text-primary flex-1 truncate">{label}</span>
                <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">
                  {formatSessionTimestamp(s)}
                </span>
                <span className="text-[10px] font-bold text-text-muted whitespace-nowrap w-9 text-right">{s.durationMin}m</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ───────────────────────── Main Focus Page ───────────────────────── */

export function FocusPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<TimerMode>('focus');
  const [focusDurationMin, setFocusDurationMin] = useState(DURATIONS.focus);
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus * 60);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [ambientSound, setAmbientSound] = useState(AMBIENT_SOUNDS[0]);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  useAmbientSound(ambientSound as 'Forest' | 'Rain' | 'Cafe' | 'Silence', ambientPlaying);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const qc = useQueryClient();
  const { focusMode, setFocusMode } = useUIStore();
  const restoredRef = useRef(false);
  const completionLoggedRef = useRef(false);
  const lastLoggedElapsedRef = useRef(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { elapsedRef.current = elapsedSeconds; }, [elapsedSeconds]);

  // ─── Recovery on mount: try server-side active session first, then localStorage ───
  useEffect(() => {
    const restore = async () => {
      // Migration from old single-key storage
      try {
        const oldRaw = localStorage.getItem('focus-timer-state');
        if (oldRaw) {
          const oldState = JSON.parse(oldRaw);
          if (oldState.mode) {
            const modeKey = `focus-timer-state-${oldState.mode}`;
            if (!localStorage.getItem(modeKey)) {
              localStorage.setItem(modeKey, oldRaw);
            }
          }
          localStorage.removeItem('focus-timer-state');
        }
      } catch { /* ignore */ }

      // Try server-side recovery first
      try {
        const active = await focusApi.getActive();
        if (active) {
          // Server has an active session — restore timer based on it
          const now = Date.now();
          const sessionStart = new Date(active.startedAt).getTime();
          const elapsedFromServer = active.elapsedMin * 60; // seconds
          const plannedDurationSec = active.durationMin * 60;
          const timeSinceStart = Math.floor((now - sessionStart) / 1000);
          const totalElapsed = Math.max(elapsedFromServer, Math.min(timeSinceStart, plannedDurationSec));
          const remaining = Math.max(0, plannedDurationSec - totalElapsed);

          setMode(active.isBreak ? (active.durationMin <= 10 ? 'short_break' : 'long_break') : 'focus');
          setSessionId(active.id);
          setSecondsLeft(remaining);
          setStartedAt(active.startedAt);
          setElapsedSeconds(totalElapsed);
          setSelectedTaskId(active.taskId);
          setSelectedProjectId(active.projectId);
          lastLoggedElapsedRef.current = totalElapsed;
          elapsedRef.current = totalElapsed;
          completionLoggedRef.current = false;

          // If somehow the timer should have expired, mark it completed
          if (remaining <= 0) {
            try { await focusApi.complete(active.id); } catch { /* ignore */ }
            setSessionId(null);
            setSecondsLeft(DURATIONS.focus * 60);
            setStartedAt(null);
            setElapsedSeconds(0);
            setRunning(false);
            clearTimerState(mode);
          } else {
            setRunning(true);
          }
          restoredRef.current = true;
          return;
        }
      } catch { /* server recovery failed — fall through to localStorage */ }

      // Fallback: localStorage recovery
      const restored = restoreTimerState(mode);
      if (restored && !searchParams.get('taskId')) {
        const elapsed = Date.now() - new Date(restored.savedAt).getTime();
        const elapsedSec = Math.floor(elapsed / 1000);
        let newSecondsLeft = restored.secondsLeft;
        let newElapsedSec = restored.elapsedSeconds;

        if (restored.running) {
          newSecondsLeft = Math.max(0, restored.secondsLeft - elapsedSec);
          newElapsedSec = restored.elapsedSeconds + Math.min(elapsedSec, restored.secondsLeft);
          if (newSecondsLeft <= 0) {
            setSecondsLeft(DURATIONS.focus * 60);
            setRunning(false);
            setStartedAt(null);
            setElapsedSeconds(0);
            setSessionId(null);
            setSelectedTaskId(null);
            setSelectedProjectId(null);
            clearTimerState(mode);
            restoredRef.current = true;
            return;
          }
        }
        setSecondsLeft(newSecondsLeft);
        setRunning(restored.running);
        setStartedAt(restored.startedAt);
        setElapsedSeconds(newElapsedSec);
        setSessionId(restored.sessionId);
        setSelectedTaskId(restored.selectedTaskId);
        setSelectedProjectId(restored.selectedProjectId ?? null);
        lastLoggedElapsedRef.current = newElapsedSec;
        elapsedRef.current = newElapsedSec;
        completionLoggedRef.current = false;
      } else if (searchParams.get('taskId')) {
        setSelectedTaskId(searchParams.get('taskId'));
      } else if (searchParams.get('projectId')) {
        setSelectedProjectId(searchParams.get('projectId'));
      }
      restoredRef.current = true;
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist to localStorage ──────────────────────────────────────────
  useEffect(() => {
    if (!restoredRef.current) return;
    if (startedAt) {
      saveTimerState({ mode, secondsLeft, running, startedAt, elapsedSeconds, selectedTaskId, selectedProjectId, sessionId });
    }
  }, [mode, secondsLeft, running, startedAt, elapsedSeconds, selectedTaskId, selectedProjectId, sessionId]);

  const { data: sessions } = useQuery({
    queryKey: ['focus'],
    queryFn: () => apiClient.get<ListResponse<FocusSessionDTO>>('/focus').then((r) => r.data),
  });

  const { data: timeLogsData } = useQuery({
    queryKey: ['focus', 'time-logs'],
    queryFn: focusApi.listTimeLogs,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 'focus-active'],
    queryFn: () => apiClient.get<ListResponse<TaskDTO>>('/tasks').then((r) => r.data),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'focus-link'],
    queryFn: () => apiClient.get<ListResponse<ProjectDTO>>('/projects').then((r) => r.data),
  });

  const activeTasks = useMemo(() => (tasksData?.data ?? []).filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS'), [tasksData]);
  const allTasks = tasksData?.data ?? [];
  const selectedTask = allTasks.find((t) => t.id === selectedTaskId) ?? null;
  const tasksById = useMemo(() => new Map(allTasks.map((t) => [t.id, t.title])), [allTasks]);
  const activeProjects = useMemo(() => (projectsData?.data ?? []).filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'), [projectsData]);
  const allProjects = projectsData?.data ?? [];
  const selectedProject = allProjects.find((p) => p.id === selectedProjectId) ?? null;
  const projectsById = useMemo(() => new Map(allProjects.map((p) => [p.id, p.name])), [allProjects]);

  useEffect(() => {
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam && allProjects.length > 0 && !selectedProjectId) {
      const match = allProjects.find((p) => p.id === projectIdParam);
      if (match) setSelectedProjectId(projectIdParam);
    }
  }, [allProjects, searchParams, selectedProjectId]);

  useEffect(() => {
    if (allTasks.length > 0 && selectedTaskId) {
      const stillExists = allTasks.some((t) => t.id === selectedTaskId);
      if (!stillExists) setSelectedTaskId(null);
    }
  }, [allTasks, selectedTaskId]);

  useEffect(() => {
    if (allProjects.length > 0 && selectedProjectId) {
      const stillExists = allProjects.some((p) => p.id === selectedProjectId);
      if (!stillExists) setSelectedProjectId(null);
    }
  }, [allProjects, selectedProjectId]);

  const todaysPlanItems = useMemo(() => {
    const colors = ['var(--color-accent)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-info)'];
    return allTasks
      .filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), new Date()) && t.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
      .map((t, i) => ({
        id: t.id,
        title: t.title,
        time: new Date(t.dueDate!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        color: colors[i % colors.length],
      }));
  }, [allTasks]);

  // ─── Mutations ─────────────────────────────────────────────────────────
  const createSession = useMutation({
    mutationFn: (data: { durationMin: number; taskId?: string | null; projectId?: string | null; isBreak?: boolean }) =>
      focusApi.create(data),
    onSuccess: (session) => {
      setSessionId(session.id);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Failed to create session';
      toast.error(`Session not created: ${msg}`);
    },
  });

  const updateSession = useMutation({
    mutationFn: (data: { id: string; elapsedMin: number; status?: string }) =>
      focusApi.update(data.id, { elapsedMin: data.elapsedMin, status: data.status }),
    onError: () => {
      // Silent — autosave and pause updates are best-effort
    },
  });

  const completeSession = useMutation({
    mutationFn: (id: string) => focusApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['focus'] });
      qc.invalidateQueries({ queryKey: ['focus', 'time-logs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      clearTimerState('focus');
      clearTimerState('short_break');
      clearTimerState('long_break');
      setSessionId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Failed to save focus session';
      toast.error(`Session not saved: ${msg}`);
    },
  });

  const cancelSession = useMutation({
    mutationFn: (id: string) => focusApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['focus'] });
      qc.invalidateQueries({ queryKey: ['focus', 'time-logs'] });
      clearTimerState('focus');
      clearTimerState('short_break');
      clearTimerState('long_break');
      setSessionId(null);
    },
    onError: () => {
      // Best-effort
    },
  });

  const isBreakMode = mode === 'short_break' || mode === 'long_break';
  const isBreakModeRef = useRef(isBreakMode);
  useEffect(() => { isBreakModeRef.current = isBreakMode; }, [isBreakMode]);

  // ─── Autosave: flush elapsed to server every 30 seconds ────────────────
  useEffect(() => {
    if (!running || !sessionId) {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    autosaveTimerRef.current = setInterval(() => {
      const elapsedMin = Math.round(elapsedRef.current / 60);
      if (elapsedMin > (lastLoggedElapsedRef.current / 60)) {
        updateSession.mutate({ id: sessionId, elapsedMin });
        lastLoggedElapsedRef.current = elapsedRef.current;
      }
    }, AUTOSAVE_INTERVAL_SEC * 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [running, sessionId, updateSession]);

  // ─── Timer tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [running]);

  // ─── Completion detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!restoredRef.current) return;
    if (running && secondsLeft === 0 && startedAt && !completionLoggedRef.current) {
      completionLoggedRef.current = true;
      setRunning(false);
      if (sessionId) {
        completeSession.mutate(sessionId);
      }
      clearTimerState(mode);
    }
    if (running && secondsLeft > 0) completionLoggedRef.current = false;
  }, [running, secondsLeft, startedAt, sessionId, completeSession, mode]);

  // ─── Fullscreen exit detection ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!isFullscreenActive() && focusMode) {
        flushAndPause();
        setRunning(false);
        setFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [focusMode, setFocusMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const flushAndPause = useCallback(() => {
    if (sessionId && startedAt) {
      const elapsedMin = Math.round(elapsedRef.current / 60);
      updateSession.mutate({ id: sessionId, elapsedMin });
    }
  }, [sessionId, startedAt, updateSession]);

  // ─── beforeunload handler ──────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (running) {
        saveTimerState({ mode, secondsLeft, running: false, startedAt, elapsedSeconds, selectedTaskId, selectedProjectId, sessionId });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [running, mode, secondsLeft, startedAt, elapsedSeconds, selectedTaskId, selectedProjectId, sessionId]);

  const enterFocusMode = async () => {
    try { await requestFullscreen(document.documentElement); } catch { /* denied */ }
    setFocusMode(true);
  };
  const exitFocusMode = async () => {
    flushAndPause();
    setRunning(false);
    if (isFullscreenActive()) { try { await exitFullscreen(); } catch { /* no-op */ } }
    setFocusMode(false);
  };

  const durationForMode = (m: TimerMode) => (m === 'focus' ? focusDurationMin : DURATIONS[m]);

  const changeMode = (m: TimerMode) => {
    // Flush current session's elapsed on mode switch
    if (startedAt) {
      saveTimerState({ mode, secondsLeft, running, startedAt, elapsedSeconds, selectedTaskId, selectedProjectId, sessionId });
    }

    const targetState = restoreTimerState(m);
    if (targetState && targetState.startedAt) {
      setMode(m);
      setSecondsLeft(targetState.secondsLeft);
      setRunning(targetState.running);
      setStartedAt(targetState.startedAt);
      setElapsedSeconds(targetState.elapsedSeconds);
      setSessionId(targetState.sessionId);
      setSelectedTaskId(targetState.selectedTaskId);
      setSelectedProjectId(targetState.selectedProjectId ?? null);
    } else {
      setMode(m);
      setSecondsLeft(durationForMode(m) * 60);
      setRunning(false);
      setStartedAt(null);
      setElapsedSeconds(0);
      setSessionId(null);
      elapsedRef.current = 0;
    }
  };

  const handleQuickDuration = (min: number) => {
    setFocusDurationMin(min);
    if (mode === 'focus' && !running) setSecondsLeft(min * 60);
  };

  const applyCustomDuration = () => {
    const val = parseInt(customInput, 10);
    if (val > 0 && val <= 240) handleQuickDuration(val);
    setCustomOpen(false);
    setCustomInput('');
  };

  const handleStartPause = () => {
    if (running) {
      // Pause: flush elapsed to server, stop ticking
      flushAndPause();
      setRunning(false);
    } else {
      if (startedAt) {
        // Resuming a paused session — just restart the tick
        setRunning(true);
      } else {
        // Brand-new session: create server-side session first
        setElapsedSeconds(0);
        elapsedRef.current = 0;
        lastLoggedElapsedRef.current = 0;
        completionLoggedRef.current = false;
        const now = new Date().toISOString();
        setStartedAt(now);
        setRunning(true);
        // Create server-side session (fire and forget — will set sessionId on success)
        createSession.mutate({
          durationMin: durationForMode(mode),
          taskId: selectedTaskId,
          projectId: selectedProjectId,
          isBreak: isBreakModeRef.current,
        });
      }
    }
  };

  const handleReset = () => {
    // Cancel current session on the server
    if (sessionId && startedAt && elapsedRef.current > 0) {
      cancelSession.mutate(sessionId);
    }
    setRunning(false);
    setSecondsLeft(durationForMode(mode) * 60);
    setStartedAt(null);
    setElapsedSeconds(0);
    setSessionId(null);
    elapsedRef.current = 0;
    lastLoggedElapsedRef.current = 0;
    clearTimerState(mode);
  };

  const handleSkipForward = () => {
    const next = MODE_ORDER[(MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length];
    changeMode(next);
  };
  const handleSkipBack = () => {
    const prev = MODE_ORDER[(MODE_ORDER.indexOf(mode) - 1 + MODE_ORDER.length) % MODE_ORDER.length];
    changeMode(prev);
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  const progress = 1 - secondsLeft / (durationForMode(mode) * 60);
  const colors = getModeColors(mode);

  const allSessions = sessions?.data ?? [];
  const focusOnlySessions = allSessions.filter((s) => !s.isBreak && s.status === 'COMPLETED');
  const breakOnlySessions = allSessions.filter((s) => s.isBreak);
  const totalFocusMin = focusOnlySessions.reduce((acc, s) => acc + s.durationMin, 0);
  const totalFocusCount = focusOnlySessions.length;
  const totalBreakMin = breakOnlySessions.reduce((acc, s) => acc + s.durationMin, 0);
  const totalBreakCount = breakOnlySessions.length;

  const todaySessions = allSessions.filter((s) => isSameDay(new Date(s.startedAt), new Date()));
  const todayFocusMin = todaySessions.filter((s) => !s.isBreak && s.status === 'COMPLETED').reduce((acc, s) => acc + s.durationMin, 0)
    + (timeLogsData ?? []).filter((l) => isSameDay(new Date(l.date), new Date())).reduce((acc, l) => acc + l.durationMin, 0);
  const todayFocusCount = todaySessions.filter((s) => !s.isBreak && s.status === 'COMPLETED').length;
  const todayBreakCount = todaySessions.filter((s) => s.isBreak).length;
  const goalPct = Math.min(100, Math.round((todayFocusMin / DEFAULT_GOAL_MIN) * 100));

  const weekBars = useMemo(() => {
    const dateKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0];
    });
    const days = dateKeys.map((key, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { date: d, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), minutes: 0, key };
    });
    allSessions.forEach((s) => {
      const sd = new Date(s.startedAt); sd.setHours(0, 0, 0, 0);
      const sessionKey = sd.toISOString().split('T')[0];
      const match = days.find((d) => d.key === sessionKey);
      if (match) match.minutes += s.durationMin;
    });
    const max = Math.max(...days.map((d) => d.minutes), 1);
    return days.map((d) => ({ ...d, pct: d.minutes > 0 ? Math.round((d.minutes / max) * 100) : 0 }));
  }, [allSessions]);

  const thisWeekTotal = weekBars.reduce((acc, d) => acc + d.minutes, 0);
  const lastWeekTotal = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - 13); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setDate(end.getDate() - 7); end.setHours(23, 59, 59, 999);
    return allSessions.filter((s) => { const d = new Date(s.startedAt); return d >= start && d <= end; }).reduce((acc, s) => acc + s.durationMin, 0);
  }, [allSessions]);
  const weekDeltaMin = thisWeekTotal - lastWeekTotal;

  const longestStreakDays = useMemo(() => {
    const dayKeys = new Set(
      focusOnlySessions.map((s) => {
        const d = new Date(s.startedAt); d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    if (dayKeys.size === 0) return 0;
    const sortedDays = Array.from(dayKeys).sort((a, b) => a - b);
    let longest = 1;
    let current = 1;
    const oneDayMs = 86400000;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] === oneDayMs) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    return longest;
  }, [focusOnlySessions]);

  const focusScore = Math.max(0, Math.min(100, Math.round(goalPct * 0.8 + Math.min(todayFocusCount, 10) * 2)));
  const focusScoreLabel = focusScore >= 85 ? 'Excellent' : focusScore >= 65 ? 'Good' : focusScore >= 35 ? 'Fair' : 'Building';

  const modeTabs = [
    { id: 'focus', label: 'Focus' },
    { id: 'short_break', label: 'Short Break' },
    { id: 'long_break', label: 'Long Break' },
  ];

  return (
    <>
      {focusMode && (
        <FocusModeFullScreen
          mode={mode}
          minutes={minutes}
          seconds={seconds}
          progress={progress}
          running={running}
          selectedTaskTitle={selectedTask?.title ?? null}
          selectedProjectTitle={selectedProject?.name ?? null}
          quotes={getDailyQuotes()}
          ambientPlaying={ambientPlaying}
          ambientSound={ambientSound}
          onToggleAmbient={() => setAmbientPlaying((p) => !p)}
          todayFocusCount={todayFocusCount}
          todayFocusTimeLabel={formatDuration(todayFocusMin * 60000)}
          todayBreakCount={todayBreakCount}
          longestStreakDays={longestStreakDays}
          onExit={exitFocusMode}
          onReset={handleReset}
          onStartPause={handleStartPause}
          onSkipBack={handleSkipBack}
          onSkipForward={handleSkipForward}
        />
      )}

      <div className="w-full max-w-[1500px] mx-auto flex flex-col gap-4 sm:gap-5">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-4 sm:gap-5">
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <PageHeader icon={<Timer size={20} />} title="Focus Timer" subtitle="Stay productive using the Pomodoro technique" />
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={enterFocusMode}
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all border border-border"
              >
                <Maximize2 size={14} /> Focus Mode
              </button>
              <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all" aria-label="Settings">
                <Settings size={15} />
              </button>
              <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all" aria-label="Toggle theme">
                <Moon size={15} />
              </button>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Target size={16} />}
              iconBg="color-mix(in srgb, var(--color-accent) 14%, transparent)"
              iconColor="var(--color-accent)"
              label="Today's Focus"
              value={formatDuration(todayFocusMin * 60000)}
              sub={`of ${formatDuration(DEFAULT_GOAL_MIN * 60000)} goal`}
              subColor="var(--color-text-muted)"
            />
            <StatCard
              icon={<Flame size={16} />}
              iconBg="color-mix(in srgb, var(--color-warning) 14%, transparent)"
              iconColor="var(--color-warning)"
              label="Completed"
              value={`${todayFocusCount} sessions`}
              sub={todayBreakCount > 0 ? `${todayBreakCount} breaks today` : 'No breaks yet'}
              subColor="var(--color-success)"
            />
            <StatCard
              icon={<TrendingUp size={16} />}
              iconBg="color-mix(in srgb, var(--color-success) 14%, transparent)"
              iconColor="var(--color-success)"
              label="Focus Score"
              value={focusScore}
              sub={focusScoreLabel}
              subColor="var(--color-success)"
              sparkline={weekBars.map((d) => d.minutes)}
            />
            <StatCard
              icon={<Timer size={16} />}
              iconBg="color-mix(in srgb, var(--color-info) 14%, transparent)"
              iconColor="var(--color-info)"
              label="Total Focus"
              value={formatDuration(thisWeekTotal * 60000)}
              sub="this week"
              subColor="var(--color-text-muted)"
            />
          </motion.div>

          {/* Progress bar */}
          <motion.div variants={itemVariants} className="-mt-2 px-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${goalPct}%`, background: 'var(--gradient-accent)' }} />
            </div>
          </motion.div>

          {/* 3-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_290px] gap-4 items-start">
            {/* Left column */}
            <motion.div variants={itemVariants} className="order-2 lg:order-1 flex flex-col gap-4">
              <TodaysPlanCard items={todaysPlanItems} onPick={setSelectedTaskId} />
              <AmbientSoundCard sound={ambientSound} setSound={setAmbientSound} playing={ambientPlaying} onToggle={() => setAmbientPlaying((p) => !p)} />
              <QuoteCard quotes={getDailyQuotes()} />
            </motion.div>

            {/* Center column — timer */}
            <motion.div variants={itemVariants} className="order-1 lg:order-2 flex flex-col items-center gap-5">
              <TabBar tabs={modeTabs} activeTab={mode} onTabChange={(m) => changeMode(m as TimerMode)} variant="pill" className="w-full justify-center" />

              <div
                className="relative flex items-center justify-center my-1 p-6 sm:p-8 rounded-full transition-all duration-500"
                style={{
                  boxShadow: running ? `0 0 40px ${colors.glow}, inset 0 0 24px ${colors.glow}` : '0 10px 30px -10px rgba(0,0,0,0.08), inset 0 0 10px rgba(0,0,0,0.02)',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <button
                  onClick={handleSkipBack}
                  className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm z-10"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  aria-label="Previous mode"
                >
                  <SkipBack size={15} />
                </button>
                <div className="w-[clamp(190px,54vw,260px)] h-[clamp(190px,54vw,260px)]">
                  <ProgressRing logicalSize={260} progress={progress} colors={colors} running={running} />
                </div>
                <div className="absolute flex flex-col items-center select-none">
                  <span className="text-4xl sm:text-5xl font-black tabular-nums text-text-primary tracking-tight">{minutes}:{seconds}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-2 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: colors.subtle, color: colors.primary }}>
                    <Target size={10} /> {mode === 'focus' ? 'Focus Session' : mode.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={handleSkipForward}
                  className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm z-10"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  aria-label="Next mode"
                >
                  <SkipForward size={15} />
                </button>
              </div>

              <p className="text-xs font-semibold text-text-secondary text-center -mt-2">{MODE_COPY[mode]}</p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="w-11 h-11 flex items-center justify-center rounded-full border shadow-sm"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  aria-label="Reset timer"
                >
                  <RotateCcw size={16} />
                </button>
                <Button onClick={handleStartPause} size="lg" className="w-48 shadow-lg font-bold" leftIcon={running ? <Pause size={18} /> : <Play size={18} />}>
                  {running ? 'Pause' : mode === 'focus' ? 'Start Focus' : 'Start'}
                </Button>
              </div>

              {/* Quick Start */}
              {mode === 'focus' && (
                <Card variant="default" className="p-4 w-full">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-bold text-text-primary">Quick Start</p>
                    <button onClick={() => setCustomOpen((o) => !o)} className="text-[11px] font-bold text-accent hover:text-accent-hover">Custom ✎</button>
                  </div>
                  <p className="text-[11px] text-text-muted font-semibold mb-3">Choose a duration and get started</p>
                  {customOpen && (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Minutes"
                        className="flex-1 px-3 py-2 rounded-lg border text-xs font-semibold"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                      />
                      <button onClick={applyCustomDuration} className="px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--gradient-accent)' }}>Set</button>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_DURATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => handleQuickDuration(d)}
                        className="py-2.5 rounded-xl text-xs font-bold border transition-colors"
                        style={{
                          background: focusDurationMin === d ? 'var(--gradient-accent)' : 'var(--color-surface-raised)',
                          color: focusDurationMin === d ? '#fff' : 'var(--color-text-primary)',
                          borderColor: focusDurationMin === d ? 'transparent' : 'var(--color-border)',
                        }}
                      >
                        {d}<span className="block text-[9px] font-semibold opacity-80">min</span>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {!bannerDismissed && totalFocusCount > 0 && (
                <Card variant="default" className="p-3.5 w-full flex items-center justify-between gap-3" style={{ background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))', borderColor: 'var(--color-accent-border)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">🔥</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary">You're on a roll!</p>
                      <p className="text-[11px] text-text-muted font-semibold truncate">You've completed {todayFocusCount} sessions today. Keep going!</p>
                    </div>
                  </div>
                  <button onClick={() => setBannerDismissed(true)} className="text-text-muted hover:text-text-primary shrink-0"><X size={14} /></button>
                </Card>
              )}
            </motion.div>

            {/* Right column */}
            <motion.div variants={itemVariants} className="order-3 flex flex-col gap-4">
              <Card variant="default" className="p-4 flex flex-col gap-3">
                <TaskSelector tasks={activeTasks} selectedTaskId={selectedTaskId} onSelect={setSelectedTaskId} />
                <ProjectSelector projects={activeProjects} selectedProjectId={selectedProjectId} onSelect={setSelectedProjectId} />
                {selectedTask && (
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gradient-accent)' }}>
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/20 shrink-0">
                      <Target size={16} className="text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{selectedTask.title}</p>
                      <p className="text-[10px] text-white/80 font-semibold">Linked task</p>
                    </div>
                    <button onClick={() => setSelectedTaskId(null)} className="text-[10px] font-bold text-white px-2.5 py-1 rounded-lg bg-white/20 shrink-0">Change</button>
                  </div>
                )}
              </Card>

              <RecentSessionsCard
                sessions={[...allSessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())}
                tasksById={tasksById}
                projectsById={projectsById}
              />

              <Card variant="default" className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-text-primary">Focus Statistics</h4>
                  <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">This Week <ChevronDown size={11} /></span>
                </div>
                {allSessions.length > 0 ? (
                  <div className="flex items-stretch justify-between gap-1 h-16 mb-3">
                    {weekBars.map((d, i) => (
                      <div key={i} className="flex-1 h-full flex flex-col items-center gap-1.5 min-w-0">
                        <div className="w-full flex-1 flex items-end rounded-md overflow-hidden" style={{ background: 'var(--color-border-subtle)' }}>
                          <div className="w-full rounded-md transition-all duration-500" style={{ height: `${Math.max(d.pct, d.minutes > 0 ? 8 : 0)}%`, background: 'var(--gradient-accent)' }} title={`${d.minutes} min`} />
                        </div>
                        <span className="text-[9px] font-bold text-text-muted uppercase shrink-0">{d.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center mb-3"><p className="text-[11px] text-text-muted">No sessions yet</p></div>
                )}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <p className="text-base font-black text-text-primary">{formatDuration(thisWeekTotal * 60000)}</p>
                    <p className="text-[10px] text-text-muted font-semibold">Total Focus</p>
                  </div>
                  <p className="text-[11px] font-bold" style={{ color: weekDeltaMin >= 0 ? 'var(--color-success)' : 'var(--color-danger, #ef4444)' }}>
                    {weekDeltaMin >= 0 ? '+' : ''}{formatDuration(Math.abs(weekDeltaMin) * 60000)} vs last week
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Task Time Analysis */}
          {selectedTask && sessions && (
            <motion.div variants={itemVariants}>
              <TaskTimeAnalysis task={selectedTask} sessions={sessions.data} />
            </motion.div>
          )}

          <motion.p variants={itemVariants} className="text-center text-xs font-semibold text-text-muted pb-2">
            💡 Tip: Take short breaks to recharge. You'll come back stronger!
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}
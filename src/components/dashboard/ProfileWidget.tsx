import { useState, useEffect } from 'react';
import { Camera, Flame, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { AvatarUpload } from '../ui/AvatarUpload';
import { useAuthStore } from '../../store/authStore';
import type { AnalyticsSummaryDTO } from '../../types';

interface ProfileHeroProps {
  summary: AnalyticsSummaryDTO;
  onAvatarUpload: (file: File) => Promise<void>;
  onAvatarRemove?: () => Promise<void>;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Circular productivity gauge — compact version */
function ScoreRing({ value }: { value: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width="70" height="70" viewBox="0 0 70 70" className="-rotate-90 shrink-0">
      <circle cx="35" cy="35" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      <circle
        cx="35"
        cy="35"
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
    </svg>
  );
}

export function ProfileHero({ summary, onAvatarUpload, onAvatarRemove }: ProfileHeroProps) {
  const user = useAuthStore((s) => s.user);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  // Update the hour every minute to keep the greeting current
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const userName = user.name ?? user.email.split('@')[0];
  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const score = summary.productivityScore ?? 0;

  // Calculate today's summary
  const pendingTasks = summary.tasksTotal - summary.tasksCompleted;
  const habitsOverdue = summary.habitsTotal - summary.habitsCompletedToday;
  const hoursAvailable = Math.max(0, 8 - Math.floor(summary.focusMinutesTotal / 60));

  return (
    <>
      <Card variant="default" className="relative overflow-hidden">
        {/* Base gradient + ambient light — reduced height */}
        <div className="absolute inset-0" style={{ background: 'var(--gradient-accent)' }} />
        <div
          className="absolute -top-16 -right-12 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6">
          {/* Left: Identity + Summary */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsAvatarOpen(true)}
              className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0"
              aria-label="Update profile photo"
            >
              <div className="w-full h-full rounded-xl overflow-hidden border-3 border-white/20 bg-white/10 flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white shadow-lg">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Camera size={14} className="text-white" />
              </div>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-white/75 text-xs font-bold mb-0.5">
                <Sparkles size={11} />
                <span>{greetingForHour(currentHour)}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">{userName}</h2>

              {/* Today's Summary */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-white/80 text-xs font-bold">
                <span>Today looks {pendingTasks > 5 ? 'busy' : 'manageable'}.</span>
                <span className="text-white/60">•</span>
                <span>
                  {pendingTasks} important task{pendingTasks !== 1 ? 's' : ''}
                </span>
                {habitsOverdue > 0 && (
                  <>
                    <span className="text-white/60">•</span>
                    <span>
                      {habitsOverdue} habit{habitsOverdue !== 1 ? 's' : ''} overdue
                    </span>
                  </>
                )}
                <span className="text-white/60">•</span>
                <span>{hoursAvailable}h available</span>
              </div>
            </div>
          </div>

          {/* Right: Productivity Score */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px] flex items-center justify-center shrink-0">
              <ScoreRing value={score} />
              <span className="absolute text-base sm:text-lg font-extrabold text-white">{score}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] uppercase tracking-wider font-bold text-white/80 leading-tight">Current</p>
              <p className="text-[11px] uppercase tracking-wider font-bold text-white/80 leading-tight">Productivity</p>
              <p className="text-[10px] text-white/60 font-bold mt-0.5">{score}/100</p>
            </div>
          </div>
        </div>
      </Card>

      <AvatarUpload
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        currentAvatarUrl={user.avatarUrl}
        onUpload={onAvatarUpload}
        onRemove={onAvatarRemove}
      />
    </>
  );
}

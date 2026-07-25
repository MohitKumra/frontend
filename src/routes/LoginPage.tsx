import { LoginForm } from '../features/auth/components/LoginForm';
import { Zap, Target, Flame, CalendarDays, Trophy } from 'lucide-react';
import { Card } from '../components/ui/Card';

const featureList = [
  { icon: Target, title: 'Smart Task Workflow', desc: 'Priorities, recurrence, and dependencies that flex with your day.' },
  { icon: Flame, title: 'Habit Streaks', desc: 'Build routines with streak tracking and gentle reminders.' },
  { icon: CalendarDays, title: 'Google Calendar Sync', desc: 'Tasks and focus sessions land in your calendar automatically.' },
  { icon: Trophy, title: 'Achievements & XP', desc: 'Earn trophies and level up as you get things done.' },
];

export function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center overflow-y-auto py-4">
      {/* Ambient background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(1200px 600px at 10% -10%, var(--color-accent-subtle), transparent 60%), radial-gradient(900px 500px at 110% 110%, var(--color-accent-subtle), transparent 55%), var(--color-bg)',
        }}
      />

      {/* Split layout */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 items-stretch p-4 sm:p-6 lg:p-8 gap-0">
        {/* Left: Brand / Pitch block (desktop only) */}
        <div className="hidden lg:flex relative overflow-hidden rounded-l-[24px] p-8 xl:p-10 flex-col justify-between animate-fade-in"
          style={{
            background:
              'linear-gradient(155deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 60%, #5a1a00) 100%)',
          }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, #ffe8d0, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #ffd0a8, transparent 70%)' }}
          />

          {/* Brand mark */}
          <div className="relative z-10 flex items-center gap-3 select-none">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}
            >
              <Zap size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-lg tracking-tight">Finamite</span>
              <span className="text-white/70 text-[10px] font-medium tracking-widest uppercase">
                Personal Management System
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="relative z-10 my-6">
            <h2 className="text-white font-black text-3xl xl:text-4xl leading-[1.1] tracking-tight">
              One system for
              <br />
              everything you do.
            </h2>
            <p className="mt-3 text-white/80 text-sm leading-relaxed max-w-md">
              Tasks, habits, focus sessions, and your calendar — finally wired together so your day actually makes sense.
            </p>
          </div>

          {/* Feature bullets */}
          <ul className="relative z-10 space-y-3 max-w-md">
            {featureList.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3 animate-fade-in stagger">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.14)' }}
                >
                  <Icon size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-[13px]">{title}</p>
                  <p className="text-white/70 text-[11px] mt-0.5 leading-snug">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Footer tagline */}
          <div className="relative z-10 mt-6 pt-4 border-t border-white/15">
            <p className="text-white/60 text-[11px] leading-relaxed">
              ⓒ {new Date().getFullYear()} Finamite. Built for people who take their focus seriously.
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex items-center justify-center lg:bg-surface lg:rounded-r-[24px] lg:shadow-[0_20px_80px_-20px_rgba(0,0,0,0.25)] lg:border lg:border-border animate-scale-in"
          style={{ background: 'color-mix(in srgb, var(--color-surface) 60%, transparent)' }}
        >
          <div className="w-full max-w-sm px-6 sm:px-8 py-6 sm:py-8">
            {/* Mobile brand */}
            <div className="lg:hidden flex flex-col items-center mb-5 select-none">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-accent/15"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Zap size={22} className="text-white" />
              </div>
              <h1 className="text-xl font-black text-text-primary tracking-tight">Finamite</h1>
              <p className="text-xs text-text-muted mt-0.5 font-medium">Personal Management System</p>
            </div>

            {/* Desktop form heading */}
            <div className="hidden lg:block mb-5">
              <h1 className="text-2xl font-black text-text-primary tracking-tight">Welcome back</h1>
              <p className="text-sm text-text-muted mt-1 font-medium">
                Sign in to continue your productivity workspace.
              </p>
            </div>

            {/* Mobile heading */}
            <div className="lg:hidden mb-5 text-center">
              <h1 className="text-xl font-black text-text-primary tracking-tight">Welcome back</h1>
              <p className="text-sm text-text-muted mt-1 font-medium">
                Sign in to your productivity workspace
              </p>
            </div>

            <Card variant="glass" className="p-0 border-0 shadow-none bg-transparent">
              <LoginForm />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
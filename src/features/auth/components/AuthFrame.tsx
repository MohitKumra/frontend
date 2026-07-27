import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Circle, Flame, Heart, Sparkles, Target, Trophy, Zap } from 'lucide-react';

type AuthMode = 'login' | 'signup';

interface AuthFrameProps {
  mode: AuthMode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const features = [
  { icon: Target, title: 'Smart Task Workflow', desc: 'Priorities, recurrence & dependencies' },
  { icon: Flame, title: 'Habit Streaks', desc: 'Build routines with streak tracking' },
  { icon: CalendarDays, title: 'Calendar Sync', desc: 'Tasks land in your calendar' },
  { icon: Trophy, title: 'Achievements', desc: 'Earn trophies as you get things done' },
];

function ProductPreview() {
  return (
    <div className="auth-preview-card">
      <div className="auth-preview-shadow" />
      <div className="auth-preview-main !p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] font-black leading-none" style={{ color: 'var(--color-text-primary)' }}>Today</p>
            <p className="mt-0.5 text-[11px] font-medium leading-none" style={{ color: 'var(--color-text-muted)' }}>Mon, Jul 27</p>
          </div>
          <div
            className="flex h-6 min-w-[46px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-black text-white"
            style={{ background: 'var(--color-accent)', boxShadow: '0 6px 16px color-mix(in srgb, var(--color-accent) 40%, transparent)' }}
          >
            <Flame size={11} />
            12
          </div>
        </div>

        <div className="my-2.5 h-px" style={{ background: 'var(--color-border)' }} />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--color-accent)' }} />
            <span>Review Q3 roadmap</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--color-accent)' }} />
            <span>Sync with design team</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Circle size={14} style={{ color: 'var(--color-text-muted)' }} />
            <span>Ship onboarding flow</span>
          </div>
        </div>

        <div className="my-2.5 h-px" style={{ background: 'var(--color-border)' }} />

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Trophy size={13} />
            <span>Level 8</span>
          </div>
          <span style={{ color: 'var(--color-text-muted)' }}>740 / 1,000 XP</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-border)' }}>
          <div className="h-full w-[54%] rounded-full" style={{ background: 'var(--gradient-accent)' }} />
        </div>
      </div>
    </div>
  );
}

export function AuthFrame({ mode, title, subtitle, children }: AuthFrameProps) {
  const isSignup = mode === 'signup';

  return (
    <main className="auth-stage">
      <section className="auth-shell max-w-[75vw]">
        <div className="auth-brand-side !py-6 overflow-hidden">
          <div className="auth-stars" />
          <div className="auth-aurora" />
          <div className="auth-mountains auth-mountains-far" />
          <div className="auth-mountains auth-mountains-mid" />
          <div className="auth-mountains auth-mountains-near" />

          <div className="relative z-10 flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[8px]"
              style={{ background: 'var(--gradient-accent)', boxShadow: '0 8px 20px color-mix(in srgb, var(--color-accent) 38%, transparent)' }}
            >
              <Zap size={19} className="text-white" fill="none" />
            </div>
            <div>
              <p className="text-[16px] font-black leading-none" style={{ color: 'var(--color-text-primary)' }}>Finamite</p>
              <p
                className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'color-mix(in srgb, var(--color-text-primary) 50%, transparent)' }}
              >
                Personal Management System
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-6 max-w-[620px]">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.04em]"
              style={{
                border: '1px solid color-mix(in srgb, var(--color-text-primary) 7%, transparent)',
                background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)',
                color: 'color-mix(in srgb, var(--color-text-primary) 85%, transparent)',
              }}
            >
              <Sparkles size={11} style={{ color: 'var(--color-accent)' }} />
              Built for focus. Designed for life.
            </div>
            <h1 className="mt-3 text-[clamp(1.7rem,3vw,2.6rem)] font-black leading-[1.05]" style={{ color: 'var(--color-text-primary)' }}>
              One system.{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-info)))',
                  WebkitBackgroundClip: 'text',
                }}
              >
                Everything
              </span>{' '}
              you do.
            </h1>
            <p className="mt-2.5 max-w-[550px] text-[13px] font-medium leading-[1.4]" style={{ color: 'color-mix(in srgb, var(--color-text-primary) 85%, transparent)' }}>
              Tasks, habits, focus sessions, and your calendar - finally wired together so your day actually makes sense.
            </p>
          </div>

          <div className="relative z-10 mt-4 flex justify-center scale-[0.82] origin-top">
            <ProductPreview />
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-4 gap-3">
            {features.map(({ icon: Icon, title: featureTitle, desc }) => (
              <div key={featureTitle} className="text-center">
                <div
                  className="mx-auto flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
                    color: 'var(--color-accent)',
                    border: '1px solid color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
                  }}
                >
                  <Icon size={15} />
                </div>
                <p className="mt-1.5 text-[11px] font-black leading-tight" style={{ color: 'var(--color-text-primary)' }}>{featureTitle}</p>
                <p className="mt-0.5 text-[9px] font-medium leading-[1.3]" style={{ color: 'color-mix(in srgb, var(--color-text-primary) 55%, transparent)' }}>{desc}</p>
              </div>
            ))}
          </div>

          <p
            className="relative z-10 mt-4 flex items-center gap-1.5 text-[10px] font-medium"
            style={{ color: 'color-mix(in srgb, var(--color-text-primary) 50%, transparent)' }}
          >
            <Heart size={11} style={{ color: 'var(--color-accent)' }} />
            <span>2026 Finamite. No credit card required.</span>
          </p>
        </div>

        <div className="auth-form-side h-full overflow-y-auto">
          <div className="auth-form-inner !py-6">
            <nav className="auth-tabs" aria-label="Authentication">
              <Link to="/login" className={isSignup ? 'auth-tab' : 'auth-tab auth-tab-active'}>
                Sign In
              </Link>
              <Link to="/signup" className={isSignup ? 'auth-tab auth-tab-active' : 'auth-tab'}>
                Create Account
              </Link>
            </nav>


            <div className="mt-6 max-[720px]:mt-2">
              <h2 className="text-[22px] font-black leading-tight" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
              <p className="mt-1 text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
            </div>

            <div className="mt-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
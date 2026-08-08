import { Flame, Trophy, CheckCircle2, Circle } from 'lucide-react';

/**
 * BrandVisual — the signature element for the auth panels.
 *
 * Concept: a premium "product peek" — a floating glass card showing a
 * snapshot of a real day in the app: today's tasks, a streak badge, and
 * an XP bar. This is the corporate-SaaS convention (Linear, Notion,
 * Superhuman) because it does actual work: it shows what the product
 * feels like to use, not an abstract shape.
 *
 * Every color here is white/neutral at low opacity — no hardcoded hue —
 * so it always reads correctly against your accent gradient, whatever
 * that color is.
 */
export function BrandVisual() {
  const tasks = [
    { label: 'Review Q3 roadmap', done: true },
    { label: 'Sync with design team', done: true },
    { label: 'Ship onboarding flow', done: false, active: true },
  ];

  return (
    <div className="relative w-full max-w-[300px] mx-auto py-2" aria-hidden="true">
      <style>{`
        @keyframes fm-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(-1.3deg); }
        }
        @keyframes fm-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        @keyframes fm-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .fm-card { animation: fm-float 6s ease-in-out infinite; }
        .fm-shimmer-bar { animation: fm-shimmer 2.8s ease-in-out infinite; }
        .fm-live-dot { animation: fm-dot-pulse 1.6s ease-in-out infinite; }
      `}</style>

      {/* backing card for depth */}
      <div
        className="absolute rounded-2xl"
        style={{
          inset: 0,
          transform: 'translate(14px, 20px) rotate(3deg)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      />

      {/* main card */}
      <div
        className="fm-card relative rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,0.20)',
          boxShadow: '0 24px 60px -16px rgba(0,0,0,0.45)',
        }}
      >
        {/* header row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-semibold text-[13px] leading-none">Today</p>
            <p className="text-white/55 text-[10px] mt-1 leading-none">Mon, Jul 27</p>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
          >
            <Flame size={11} className="text-white" />
            <span className="text-white text-[11px] font-bold leading-none">12</span>
          </div>
        </div>

        <div className="h-px w-full mb-3" style={{ background: 'rgba(255,255,255,0.14)' }} />

        {/* task rows */}
        <div className="flex flex-col gap-2.5 mb-3">
          {tasks.map(({ label, done, active }) => (
            <div key={label} className="flex items-center gap-2.5">
              {done ? (
                <CheckCircle2 size={15} className="text-white/70 flex-shrink-0" />
              ) : (
                <span
                  className="relative flex-shrink-0 flex items-center justify-center"
                  style={{ width: 15, height: 15 }}
                >
                  <Circle size={15} className="text-white/50" />
                  {active && (
                    <span
                      className="fm-live-dot absolute rounded-full"
                      style={{ width: 5, height: 5, background: '#fff' }}
                    />
                  )}
                </span>
              )}
              <span
                className="text-[12px] leading-none"
                style={{
                  color: done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.92)',
                  textDecoration: done ? 'line-through' : 'none',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="h-px w-full mb-3" style={{ background: 'rgba(255,255,255,0.14)' }} />

        {/* XP progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Trophy size={12} className="text-white/80" />
              <span className="text-white/80 text-[10px] font-semibold">Level 8</span>
            </div>
            <span className="text-white/55 text-[10px]">740 / 1,000 XP</span>
          </div>
          <div
            className="relative w-full rounded-full overflow-hidden"
            style={{ height: 5, background: 'rgba(255,255,255,0.14)' }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: '74%', background: 'rgba(255,255,255,0.85)' }}
            />
            <div
              className="fm-shimmer-bar absolute inset-y-0"
              style={{
                width: '30%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

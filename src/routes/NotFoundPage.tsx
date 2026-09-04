import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, CheckSquare, Target, ArrowLeft, Sparkles } from 'lucide-react';
import { useFloatingEnabled } from '../hooks/useAnimationPrefs';
import { APP_NAME_FULL } from '../config/brand';

const quickLinks = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
  { label: 'Goals', icon: Target, to: '/goals' },
];

export function NotFoundPage() {
  const navigate = useNavigate();
  const floating = useFloatingEnabled();

  return (
    <div
      className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden px-6 py-16"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ── ambient background blobs ─────────────────────────── */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-[120px] opacity-30"
        style={{ background: 'var(--color-accent)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 w-[340px] h-[340px] rounded-full blur-[100px] opacity-20"
        style={{ background: 'var(--color-info)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
      >
        {/* ── icon badge ──────────────────────────────────────── */}
        <motion.div
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 320, damping: 22 }}
          className="relative mb-8"
        >
          {/* outer ring */}
          <div
            className="w-28 h-28 rounded-[32px] flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 14%, var(--color-surface)), var(--color-surface))',
              border: '1px solid color-mix(in srgb, var(--color-accent) 22%, var(--color-border))',
              boxShadow: '0 20px 48px color-mix(in srgb, var(--color-accent) 18%, transparent)',
            }}
          >
            <img src="/logo.svg" alt={APP_NAME_FULL} className="w-full h-full object-cover rounded-[32px]" />
          </div>

          {/* floating sparkle */}
          <motion.div
            animate={floating ? { y: [-4, 4, -4], rotate: [0, 10, 0] } : undefined}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'var(--gradient-accent)',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--color-accent) 40%, transparent)',
            }}
          >
            <Sparkles size={14} className="text-white" />
          </motion.div>
        </motion.div>

        {/* ── 404 number ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="font-black leading-none mb-4 select-none"
          style={{
            fontSize: 'clamp(5rem, 18vw, 8rem)',
            background: 'var(--gradient-accent)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </motion.div>

        {/* ── headline + body ─────────────────────────────────── */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-black mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          This page went off-track
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-sm leading-7 max-w-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Looks like this milestone doesn't exist in your workspace. Let's get you back to something productive.
        </motion.p>

        {/* ── primary CTA ─────────────────────────────────────── */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-sm font-black text-white"
          style={{
            background: 'var(--gradient-accent)',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-accent) 35%, transparent)',
          }}
        >
          <LayoutDashboard size={16} />
          Back to Dashboard
        </motion.button>

        {/* ── secondary go-back ───────────────────────────────── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
          onClick={() => navigate(-1)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={14} />
          Go back
        </motion.button>

        {/* ── quick-link chips ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
          className="mt-10 w-full"
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.22em] mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Or jump to
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {quickLinks.map(({ label, icon: Icon, to }, i) => (
              <motion.button
                key={to}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.48 + i * 0.06 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(to)}
                className="flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <Icon size={15} style={{ color: 'var(--color-accent)' }} />
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── footer label ────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-[11px] font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {APP_NAME_FULL} · Workspace not found
        </motion.p>
      </motion.div>
    </div>
  );
}

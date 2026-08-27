// frontend/src/components/BlockedOverlay.tsx
// Full-viewport overlay covering the entire app (including sidebar and modals)
// shown when the app is blocked: maintenance mode, account deactivated, or
// account banned. Renders with a very high z-index so it sits above everything.
// It is intentionally hidden on the admin portal so the team can always work.
//
// Each state has its own visual identity — they are meant to feel like three
// different rooms, not one template with a palette swap:
//   MAINTENANCE  -> "blueprint / workshop" — cyan schematic, live systems list
//   DEACTIVATED  -> "paused / archive"     -> warm sand, calm, numbered next-steps
//   BANNED       -> "restricted / alert"   -> stark red/black, siren pulse, appeal CTA

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppBlockedStore, type BlockedType } from '../store/appBlockedStore';

/* ------------------------------------------------------------------ */
/* Shared keyframes, injected once                                     */
/* ------------------------------------------------------------------ */

function OverlayStyles() {
  return (
    <style>{`
      @keyframes bo-spin-slow { to { transform: rotate(360deg); } }
      @keyframes bo-spin-reverse { to { transform: rotate(-360deg); } }
      @keyframes bo-breathe {
        0%, 100% { transform: scale(1); opacity: .85; }
        50% { transform: scale(1.14); opacity: 1; }
      }
      @keyframes bo-status-cycle {
        0%, 100% { opacity: .25; }
        50% { opacity: 1; }
      }
      @keyframes bo-pulse-ring {
        0% { transform: scale(.75); opacity: .8; }
        70% { transform: scale(1.55); opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes bo-scan {
        0% { transform: translateY(-120%); }
        100% { transform: translateY(220%); }
      }
      @keyframes bo-fade-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*="animation"] { animation: none !important; }
      }
    `}</style>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared glyph pieces                                           */
/* ------------------------------------------------------------------ */

function GearPaths() {
  const teeth = Array.from({ length: 8 });
  return (
    <g fill="currentColor">
      {teeth.map((_, i) => (
        <rect key={i} x="46" y="2" width="8" height="16" rx="2" transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="28" />
      <circle cx="50" cy="50" r="11" fill="#0B1220" />
    </g>
  );
}

function ShieldPaths() {
  return (
    <g fill="currentColor">
      <path d="M50 4 L90 20 V46 C90 74 72 92 50 98 C28 92 10 74 10 46 V20 Z" />
      <rect x="44" y="28" width="12" height="32" rx="5" fill="#111111" />
      <circle cx="50" cy="70" r="7" fill="#111111" />
    </g>
  );
}

function CornerTicks({ color }: { color: string }) {
  const base = 'absolute w-3 h-3';
  return (
    <>
      <span className={`${base} top-2 left-2 border-t border-l`} style={{ borderColor: color }} />
      <span className={`${base} top-2 right-2 border-t border-r`} style={{ borderColor: color }} />
      <span className={`${base} bottom-2 left-2 border-b border-l`} style={{ borderColor: color }} />
      <span className={`${base} bottom-2 right-2 border-b border-r`} style={{ borderColor: color }} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* MAINTENANCE — blueprint / workshop                                  */
/* ------------------------------------------------------------------ */

function MaintenanceOverlay({ message }: { message?: string | null }) {
  const systems = [
    { label: 'Bug fixing', status: 'In progress' },
    { label: 'API deployment', status: 'Queued' },
    { label: 'Cache rebuild', status: 'Queued' },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: '#0B1220',
        backgroundImage:
          'linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8"
        style={{ background: 'rgba(15,23,42,0.72)', border: '1px dashed rgba(56,189,248,0.4)', animation: 'bo-fade-up .5s ease-out' }}
      >
        <CornerTicks color="#38BDF8" />

        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full"
              style={{ animation: 'bo-spin-reverse 14s linear infinite' }}
            >
              <circle cx="50" cy="50" r="47" fill="none" stroke="#38BDF8" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="3 7" />
            </svg>
            <svg
              viewBox="0 0 100 100"
              className="w-10 h-10"
              style={{ color: '#5EEAD4', animation: 'bo-spin-slow 7s linear infinite' }}
            >
              <GearPaths />
            </svg>
          </div>
        </div>

        <p className="text-center text-[11px] font-mono tracking-[0.2em] uppercase" style={{ color: '#5EEAD4' }}>
          System status
        </p>
        <h1 className="text-center text-2xl font-bold text-white mt-2 tracking-tight">Running scheduled maintenance</h1>
        <p className="text-center text-white/60 text-sm leading-relaxed mt-3">
          We're upgrading infrastructure to make things faster and more reliable. This page will refresh automatically the moment we're
          done.
        </p>

        {message && (
          <p className="text-center text-[13px] mt-3 rounded-lg py-2 px-3" style={{ background: 'rgba(56,189,248,0.08)', color: '#BAE6FD' }}>
            {message}
          </p>
        )}

        <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">What's happening</p>
          <ul className="space-y-2.5">
            {systems.map((s, i) => (
              <li key={s.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white/80">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#5EEAD4', animation: `bo-status-cycle 1.8s ease-in-out ${i * 0.3}s infinite` }}
                  />
                  {s.label}
                </span>
                <span className="text-white/40 text-xs font-mono">{s.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-xs">
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
            style={{ animation: 'bo-spin-slow 2.2s linear infinite' }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refreshing automatically — no action needed
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DEACTIVATED — paused / archive                                      */
/* ------------------------------------------------------------------ */

function DeactivatedOverlay({ message }: { message?: string | null }) {
  const steps = [
    'Email support with the address on your account',
    'Our team reviews your case within 1–2 business days',
    "We'll email you as soon as there's a decision",
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: '#15171C' }}>
      <div
        className="w-full max-w-md rounded-3xl p-8 text-center"
        style={{ background: '#1C1F26', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', animation: 'bo-fade-up .5s ease-out' }}
      >
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full"
              style={{ animation: 'bo-spin-slow 20s linear infinite' }}
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#D9B26F"
                strokeOpacity="0.3"
                strokeWidth="1.5"
                strokeDasharray="1 9"
                strokeLinecap="round"
              />
            </svg>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(217,178,111,0.12)' }}>
              <svg viewBox="0 0 100 100" className="w-7 h-7" style={{ color: '#D9B26F' }}>
                <rect
                  x="34"
                  y="26"
                  width="13"
                  height="48"
                  rx="5"
                  fill="currentColor"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'bo-breathe 2.8s ease-in-out infinite' }}
                />
                <rect
                  x="53"
                  y="26"
                  width="13"
                  height="48"
                  rx="5"
                  fill="currentColor"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'bo-breathe 2.8s ease-in-out .35s infinite' }}
                />
              </svg>
            </div>
          </div>
        </div>

        <p className="text-[11px] font-medium tracking-[0.2em] uppercase" style={{ color: '#D9B26F' }}>
          Account paused
        </p>
        <h1 className="text-2xl font-bold text-white mt-2 tracking-tight">Your account is deactivated</h1>
        <p className="text-white/55 text-sm leading-relaxed mt-3">
          This usually happens after a long period of inactivity, a deactivation you requested, or a pause from our team while they
          look into something.
        </p>

        {message && (
          <p className="text-[13px] mt-3 rounded-lg py-2 px-3 text-left" style={{ background: 'rgba(217,178,111,0.08)', color: '#EFD9B0' }}>
            {message}
          </p>
        )}

        <div className="mt-6 text-left">
          <p className="text-[10px] uppercase tracking-widest text-white/35 mb-3">What happens next</p>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-white/75">
                <span
                  className="flex-none w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold"
                  style={{ background: 'rgba(217,178,111,0.15)', color: '#D9B26F' }}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <a
          href="mailto:support@yourapp.com"
          className="inline-flex items-center justify-center gap-2 mt-7 w-full rounded-xl py-3 text-sm font-semibold transition-transform hover:scale-[1.02]"
          style={{ background: '#D9B26F', color: '#1C1710' }}
        >
          Contact support
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BANNED — restricted / alert                                         */
/* ------------------------------------------------------------------ */

function BannedOverlay({ message }: { message?: string | null }) {
  const reasons = ['Terms of service violation', 'Repeated policy breaches', 'Fraudulent activity'];
  const [refId] = useState(() => `BAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden" style={{ background: '#0A0A0A' }}>
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          height: '40%',
          background: 'linear-gradient(180deg, transparent, rgba(239,68,68,0.25), transparent)',
          animation: 'bo-scan 5s linear infinite',
        }}
      />
      <div
        className="relative w-full max-w-md rounded-sm p-8 text-center"
        style={{ background: '#111111', border: '2px solid #EF4444', animation: 'bo-fade-up .5s ease-out' }}
      >
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full" style={{ border: '2px solid #EF4444', animation: 'bo-pulse-ring 1.8s ease-out infinite' }} />
            <span
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid #EF4444', animation: 'bo-pulse-ring 1.8s ease-out .6s infinite' }}
            />
            <svg viewBox="0 0 100 100" className="w-11 h-11" style={{ color: '#EF4444' }}>
              <ShieldPaths />
            </svg>
          </div>
        </div>

        <p className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: '#EF4444' }}>
          Access restricted
        </p>
        <h1 className="text-2xl font-extrabold text-white mt-2 tracking-tight">This account has been banned</h1>
        <p className="text-white/55 text-sm leading-relaxed mt-3">
          Access was permanently removed for violating our terms of service. Check the email we sent for the full explanation.
        </p>

        {message && (
          <p className="text-[13px] mt-3 rounded py-2 px-3" style={{ background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {reasons.map((r) => (
            <span key={r} className="text-[11px] px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5' }}>
              {r}
            </span>
          ))}
        </div>

        <div
          className="mt-6 flex items-center justify-center gap-2 rounded py-2.5 px-3 font-mono text-xs"
          style={{ background: '#000', border: '1px solid #262626', color: '#9CA3AF' }}
        >
          Reference ID
          <span className="text-white/70">{refId}</span>
        </div>

        <a
          href="mailto:appeals@yourapp.com"
          className="inline-flex items-center justify-center w-full mt-6 rounded-sm py-3 text-sm font-bold uppercase tracking-wide transition-transform hover:scale-[1.02]"
          style={{ background: '#EF4444', color: '#0A0A0A' }}
        >
          Submit an appeal
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */

export function BlockedOverlay() {
  const { pathname } = useLocation();
  const type = useAppBlockedStore((s) => s.type);
  const message = useAppBlockedStore((s) => s.message);

  // Never cover the admin portal — it stays fully usable even during maintenance.
  if (pathname.startsWith('/admin')) return null;

  if (!type) return null;

  return (
    <>
      <OverlayStyles />
      {type === 'MAINTENANCE' && <MaintenanceOverlay message={message} />}
      {type === 'DEACTIVATED' && <DeactivatedOverlay message={message} />}
      {type === 'BANNED' && <BannedOverlay message={message} />}
    </>
  );
}
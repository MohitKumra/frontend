import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

async function completeGoogleSession(): Promise<{ accessToken: string; user: any }> {
  const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // ── Path 1: URL fragment path (mobile) ──────────────────────────────────
  // Tokens passed via #accessToken=xxx&refreshToken=yyy by the backend redirect.
  // Fragment (#) is used instead of query params (?) because fragments are never
  // sent to servers, avoiding Referer header leaks and server log exposure.
  const hash = window.location.hash.replace(/^#/, '');
  const hashParams = new URLSearchParams(hash);
  const accessTokenFromHash = hashParams.get('accessToken');

  if (accessTokenFromHash) {
    // Clear the fragment from the URL immediately — removes it from address bar & history
    window.history.replaceState(null, '', window.location.pathname);

    const meResponse = await fetch(`${VITE_BACKEND_URL}/auth/me`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessTokenFromHash}`,
      },
    });

    if (!meResponse.ok) {
      const payload = await meResponse.json().catch(() => null);
      throw new Error(payload?.error?.message ?? 'Google sign-in could not load your account.');
    }

    const user = await meResponse.json();
    return { accessToken: accessTokenFromHash, user };
  }

  // ── Path 2: Cookie-based path (desktop) ─────────────────────────────────
  // Existing flow: backend set the refreshToken cookie, we exchange it for an access token.
  const refreshResponse = await fetch(`${VITE_BACKEND_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!refreshResponse.ok) {
    const payload = await refreshResponse.json().catch(() => null);
    throw new Error(payload?.error?.message ?? 'Google sign-in could not be completed.');
  }

  const refreshData = await refreshResponse.json() as { accessToken: string };

  const meResponse = await fetch(`${VITE_BACKEND_URL}/auth/me`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${refreshData.accessToken}`,
    },
  });

  if (!meResponse.ok) {
    const payload = await meResponse.json().catch(() => null);
    throw new Error(payload?.error?.message ?? 'Google sign-in could not load your account.');
  }

  const user = await meResponse.json();
  return { accessToken: refreshData.accessToken, user };
}

export function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [message, setMessage] = useState('Finalizing Google sign in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const result = await completeGoogleSession();
        if (!active) return;
        setAuth(result.accessToken, result.user);
        setMessage('Signed in successfully');
        setTimeout(() => navigate('/', { replace: true }), 600);
      } catch (err) {
        if (!active) return;
        const fallback = (err as { message?: string })?.message ?? 'Google sign-in could not be completed.';
        setError(fallback);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [navigate, setAuth]);

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at top right, var(--color-accent-subtle), var(--color-bg))' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg shadow-accent/15"
            style={{ background: 'var(--gradient-accent)' }}
          >
            {error ? <CheckCircle2 size={28} className="text-white" /> : <Sparkles size={28} className="text-white" />}
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Google sign-in</h1>
          <p className="text-sm text-text-muted mt-1.5 font-medium">{error ?? message}</p>
        </div>

        <div className="mt-8 rounded-2xl border p-6 bg-surface shadow-xl text-center">
          {error ? (
            <div className="space-y-3">
              <div className="text-sm text-danger font-semibold leading-relaxed">{error}</div>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:shadow-sm"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Back to login
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-accent animate-spin" />
              <p className="text-sm font-semibold text-text-primary">Please wait while we bring your session online.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
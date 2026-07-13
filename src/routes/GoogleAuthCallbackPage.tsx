import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { authApi } from '../features/auth/api';
import { useAuthStore } from '../store/authStore';

export function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [message, setMessage] = useState('Finalizing Google sign in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function completeGoogleLogin() {
      try {
        const refreshed = await authApi.refresh();
        const user = await authApi.getMe();
        if (!active) return;
        setAuth(refreshed.accessToken, user);
        setMessage('Signed in successfully');
        setTimeout(() => navigate('/', { replace: true }), 600);
      } catch (err) {
        if (!active) return;
        setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Google sign-in could not be completed.');
      }
    }

    void completeGoogleLogin();
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
            <div className="text-sm text-danger font-semibold leading-relaxed">{error}</div>
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

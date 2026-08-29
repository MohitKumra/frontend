import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';
import { useGoogleSignInPopup } from '../hooks/useGoogleOAuthPopup';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const login = useLogin();
  const googleOAuth = useGoogleSignInPopup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  const handleGoogleSignIn = () => {
    googleOAuth.open();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
      {login.error && (
        <div
          className="rounded-[10px] border p-2.5 text-[13px] font-semibold"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
            background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            color: 'var(--color-danger)',
          }}
        >
          {(login.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
            ?.message ?? 'Login failed. Please try again.'}
        </div>
      )}

      <div className="auth-field">
        <Mail size={19} className="auth-field-icon" />
        <input
          id="login-email"
          aria-label="Email"
          className="auth-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <Lock size={19} className="auth-field-icon" />
        <input
          id="login-password"
          aria-label="Password"
          className="auth-input"
          type={showPass ? 'text' : 'password'}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPass((v) => !v)}
          className="auth-field-action"
          aria-label={showPass ? 'Hide password' : 'Show password'}
        >
          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="-mt-1 flex justify-end">
        <Link
          to="/forgot-password"
          className="text-[12px] font-bold transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-accent)' }}
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        className="auth-primary-button flex w-full items-center justify-center"
        disabled={login.isPending}
      >
        {login.isPending ? (
          <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <>
            Sign In
            <ArrowRight size={20} className="absolute right-6" />
          </>
        )}
      </button>

      <div className="auth-divider my-1">Or continue with</div>

      <button
        type="button"
        className="auth-secondary-button flex w-full items-center justify-center gap-3"
        onClick={handleGoogleSignIn}
        disabled={googleOAuth.isGoogleLoading || login.isPending}
      >
        {googleOAuth.isGoogleLoading ? (
          <span className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-text-secondary)' }} />
        ) : (
          <svg viewBox="0 0 24 24" className="w-4 h-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
        )}
        {googleOAuth.isGoogleLoading ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <div className="text-center">
        <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-bold transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}
          >
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-[10px] font-medium leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          By signing in, you agree to our{' '}
          <Link
            to="/terms"
            className="font-bold transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            to="/privacy"
            className="font-bold transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

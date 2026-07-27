import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLogin } from '../hooks/useAuth';
import { authApi } from '../api';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  const handleGoogleSignIn = async () => {
    try {
      const { url } = await authApi.googleStart('signin', `${import.meta.env.VITE_APP_BASE_URL}/google/callback` || 'http://localhost:5173/google/callback');
      window.location.href = url;
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Google sign-in is not available right now.');
    }
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
          {(login.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Login failed. Please try again.'}
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

      <button type="submit" className="auth-primary-button flex w-full items-center justify-center" disabled={login.isPending}>
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
      >
        <span className="text-[19px] font-black" style={{ color: '#4285f4' }}>G</span>
        Continue with Google
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
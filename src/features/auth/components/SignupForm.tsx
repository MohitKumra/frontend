import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSignup } from '../hooks/useAuth';
import { authApi } from '../api';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const signup = useSignup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast.error('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    signup.mutate({ email, password, name: name || undefined });
  };

  const handleGoogleSignUp = async () => {
    try {
      const { url } = await authApi.googleStart('signin', '/google/callback');
      window.location.href = url;
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Google sign-up is not available right now.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
      {signup.error && (
        <div className="rounded-[10px] border border-red-400/25 bg-red-500/10 p-2.5 text-[13px] font-semibold text-red-500">
          {(signup.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Signup failed. Please try again.'}
        </div>
      )}

      <div className="auth-field">
        <User size={19} className="auth-field-icon" />
        <input
          id="signup-name"
          aria-label="Full name"
          className="auth-input"
          type="text"
          placeholder="Full name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div className="auth-field">
        <Mail size={19} className="auth-field-icon" />
        <input
          id="signup-email"
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
          id="signup-password"
          aria-label="Password"
          className="auth-input"
          type={showPass ? 'text' : 'password'}
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
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
      <label className="-mt-1 flex cursor-pointer select-none items-start gap-2.5">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-0.5 h-[16px] w-[16px] cursor-pointer rounded-[4px] border border-slate-500 bg-transparent"
          style={{ accentColor: 'var(--color-accent)' }}
        />
        <span className="text-[13px] font-medium leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
          I agree to the{' '}
          <Link to="/terms" className="font-bold transition-opacity hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="font-bold transition-opacity hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button type="submit" className="auth-primary-button flex w-full items-center justify-center" disabled={signup.isPending}>
        {signup.isPending ? (
          <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <>
            Create Account
            <ArrowRight size={20} className="absolute right-6" />
          </>
        )}
      </button>

      <div className="auth-divider my-1">Or continue with</div>

      <button
        type="button"
        className="auth-secondary-button flex w-full items-center justify-center gap-3"
        onClick={() => {
          if (!agreeTerms) {
            toast.error('Please accept the Terms and Privacy Policy first.');
            return;
          }
          handleGoogleSignUp();
        }}
      >
        <span className="text-[19px] font-black text-[#4285f4]">G</span>
        Continue with Google
      </button>

      <p className="text-center text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" className="font-bold transition-opacity hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
          Sign in
        </Link>
      </p>
    </form>
  );
} 